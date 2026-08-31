import React, { useState, useEffect } from 'react';
import {
    View,
    StyleSheet,
    TouchableOpacity,
    Alert,
    ScrollView,
    Image,
} from 'react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as Haptics from 'expo-haptics';
import * as ImagePicker from 'expo-image-picker';
import { AppText as Text } from '../../components/AppText';
import {
    Gift,
    Heart,
    Send,
    Cake,
    Sparkles,
    Check,
    CheckCircle2,
    ChevronRight,
    Camera,
    X,
    Image as ImageIcon,
    User,
} from 'lucide-react-native';
import { useAppTheme } from '../../context/ThemeContext';
import { lightTheme, darkTheme } from '../../styles/theme';
import { AppShell } from '../../components/common/AppShell';
import { AppCard } from '../../components/common/AppCard';
import { AppInput } from '../../components/common/AppInput';
import { AppButton } from '../../components/common/AppButton';
import { EmptyState } from '../../components/common/EmptyState';
import { ListSkeleton } from '../../components/common/Skeletons';
import { useTranslation } from '../../context/LanguageContext';
import { celebrationApi, CelebrantItem } from '../../api/celebration';

const BIRTHDAY_PRESETS = [
    'Wishing you a very Happy Birthday! May your day be filled with joy and success! 🎂🎉',
    'Happy Birthday! Wishing you good health, happiness, and great achievements ahead! 🎈✨',
    'Warmest birthday wishes! Hope you have a fantastic celebration! 🎁🍰',
];

const ANNIVERSARY_PRESETS = [
    'Congratulations on your Work Anniversary! Thank you for your continued dedication! 🎊🌟',
    'Happy Work Anniversary! Proud and grateful to work alongside you! 🏆🚀',
    'Wishing you continued growth and success on your milestone anniversary! 🥂👏',
];

const getInitials = (name?: string) => {
    if (!name) return 'HR';
    const parts = name.trim().split(' ').filter(Boolean);
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
};

const getAvatarUrl = (c?: CelebrantItem | null) => {
    if (!c) return null;
    const raw = c.profile_image_url || (c as any).profile_image || (c as any).avatar;
    if (typeof raw === 'string' && raw.trim().length > 0 && raw !== 'null' && raw !== 'undefined') {
        return raw.trim();
    }
    return null;
};

export const CelebrationWishScreen: React.FC<{ navigation: any; route: any }> = ({
    navigation,
    route,
}) => {
    const { isDark, primaryColor } = useAppTheme();
    const { t } = useTranslation();
    const theme = isDark ? darkTheme : lightTheme;
    const queryClient = useQueryClient();

    const paramCelebrant: CelebrantItem | undefined = route?.params?.celebrant;

    // Fetch active celebrants for today
    const {
        data: celebrants = [],
        isLoading: isCelebrantsLoading,
    } = useQuery<CelebrantItem[]>({
        queryKey: ['celebrations'],
        queryFn: celebrationApi.getCelebrations,
    });

    const [selectedCelebrant, setSelectedCelebrant] = useState<CelebrantItem | null>(
        paramCelebrant || null
    );
    const [wishText, setWishText] = useState('');
    const [selectedImage, setSelectedImage] = useState<any | null>(null);
    const [sentCelebrantIds, setSentCelebrantIds] = useState<string[]>([]);
    const [avatarErrors, setAvatarErrors] = useState<Record<string, boolean>>({});

    useEffect(() => {
        if (!selectedCelebrant && celebrants.length > 0) {
            setSelectedCelebrant(celebrants[0]);
        }
    }, [celebrants, selectedCelebrant]);

    const isAlreadySent = selectedCelebrant
        ? sentCelebrantIds.includes(String(selectedCelebrant.id))
        : false;

    // Send Wish Mutation
    const sendMutation = useMutation({
        mutationFn: celebrationApi.sendWish,
        onSuccess: () => {
            if (selectedCelebrant) {
                setSentCelebrantIds((prev) => [...new Set([...prev, String(selectedCelebrant.id)])]);
            }
            queryClient.invalidateQueries({ queryKey: ['celebrations'] });
            queryClient.invalidateQueries({ queryKey: ['myWishes'] });
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            Alert.alert(
                t('wish_sent', 'Wish Sent! 🎉'),
                t('wish_sent_desc', 'Your celebratory wish has been delivered to your colleague.'),
                [{ text: t('ok', 'OK'), onPress: () => navigation.goBack() }]
            );
        },
        onError: (err: any) => {
            const msg =
                err?.response?.data?.message ||
                err?.response?.data?.errors?.receiver_id?.[0] ||
                '';

            if (msg.toLowerCase().includes('already sent')) {
                if (selectedCelebrant) {
                    setSentCelebrantIds((prev) => [...new Set([...prev, String(selectedCelebrant.id)])]);
                }
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
                Alert.alert(
                    t('wish_already_sent', 'Wish Already Sent! 🎊'),
                    t('wish_already_sent_desc', 'You have already sent your warm wishes to this colleague for this celebration today.')
                );
                return;
            }

            Alert.alert(t('error', 'Error'), msg || t('failed_send_wish', 'Failed to send celebratory wish. Please try again.'));
        },
    });

    const handlePickImage = async () => {
        if (isAlreadySent) return;

        try {
            const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
            if (!permission.granted) {
                Alert.alert(
                    t('permission_required', 'Permission Required'),
                    t('photo_permission_needed', 'Please allow access to your photos to attach an image.')
                );
                return;
            }

            const result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ['images'],
                allowsEditing: true,
                quality: 0.8,
            });

            if (!result.canceled && result.assets && result.assets.length > 0) {
                setSelectedImage(result.assets[0]);
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
            }
        } catch (error) {
            console.error('Error picking celebration wish image:', error);
        }
    };

    const handleSend = () => {
        if (isAlreadySent) {
            Alert.alert(
                t('wish_already_sent', 'Wish Already Sent! 🎊'),
                t('wish_already_sent_desc', 'You have already sent your warm wishes to this colleague for this celebration today.')
            );
            return;
        }

        if (!selectedCelebrant) {
            Alert.alert(t('required', 'Required'), t('please_select_celebrant', 'Please select a colleague to send wishes to.'));
            return;
        }

        if (!wishText.trim() && !selectedImage) {
            Alert.alert(t('required', 'Required'), t('please_write_wish_message', 'Please write a wish message or attach a card.'));
            return;
        }

        sendMutation.mutate({
            receiver_id: String(selectedCelebrant.id),
            type: selectedCelebrant.type || 'birthday',
            message: wishText.trim(),
            image: selectedImage,
        });
    };

    const isBirthday = selectedCelebrant?.type === 'birthday';
    const presets = isBirthday ? BIRTHDAY_PRESETS : ANNIVERSARY_PRESETS;
    const heroAvatarUrl = getAvatarUrl(selectedCelebrant);

    return (
        <AppShell title={t('send_celebration_wish', 'Send Celebration Wish')} onBack={() => navigation.goBack()}>
            {isCelebrantsLoading ? (
                <ListSkeleton count={2} />
            ) : celebrants.length === 0 && !selectedCelebrant ? (
                <EmptyState
                    icon={<Gift color={theme.colors.textSecondary} size={36} />}
                    title={t('no_celebrants_today', 'No Celebrations Today')}
                    description={t('no_celebrants_today_desc', 'There are no colleagues celebrating a birthday or work anniversary today.')}
                    actionTitle={t('view_received_wishes_inbox', 'View My Received Wishes')}
                    onAction={() => navigation.navigate('WishesInbox')}
                />
            ) : (
                <>
                    {/* Celebrant Selector Row if multiple celebrants */}
                    {celebrants.length > 1 && (
                        <View style={styles.selectorSection}>
                            <Text style={[styles.selectorLabel, { color: theme.colors.textSecondary }]}>
                                {t('select_colleague', 'Celebrating Colleagues Today:')}
                            </Text>
                            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.celebrantsScroll}>
                                {celebrants.map((c) => {
                                    const isSelected = selectedCelebrant?.id === c.id;
                                    const cSent = sentCelebrantIds.includes(String(c.id));
                                    const cAvatarUrl = getAvatarUrl(c);
                                    const hasAvatarError = !!avatarErrors[String(c.id)];

                                    return (
                                        <TouchableOpacity
                                            key={c.id}
                                            style={[
                                                styles.celebrantChip,
                                                {
                                                    backgroundColor: isSelected ? primaryColor : theme.colors.surface,
                                                    borderColor: isSelected ? primaryColor : theme.colors.border,
                                                },
                                            ]}
                                            onPress={() => setSelectedCelebrant(c)}
                                            activeOpacity={0.8}
                                        >
                                            {/* Mini Avatar or Fallback Initials */}
                                            {cAvatarUrl && !hasAvatarError ? (
                                                <Image
                                                    source={{ uri: cAvatarUrl }}
                                                    style={styles.chipAvatar}
                                                    onError={() => {
                                                        setAvatarErrors((prev) => ({ ...prev, [String(c.id)]: true }));
                                                    }}
                                                />
                                            ) : (
                                                <View
                                                    style={[
                                                        styles.chipAvatarFallback,
                                                        {
                                                            backgroundColor: isSelected
                                                                ? 'rgba(255, 255, 255, 0.25)'
                                                                : c.type === 'birthday'
                                                                ? theme.colors.status.pinkSubtle
                                                                : theme.colors.status.purpleSubtle,
                                                        },
                                                    ]}
                                                >
                                                    <Text
                                                        style={[
                                                            styles.chipAvatarText,
                                                            {
                                                                color: isSelected
                                                                    ? '#FFFFFF'
                                                                    : c.type === 'birthday'
                                                                    ? theme.colors.status.pink
                                                                    : theme.colors.status.purple,
                                                            },
                                                        ]}
                                                    >
                                                        {getInitials(c.name)}
                                                    </Text>
                                                </View>
                                            )}

                                            <Text
                                                style={[
                                                    styles.celebrantChipText,
                                                    { color: isSelected ? '#FFFFFF' : theme.colors.textPrimary },
                                                ]}
                                            >
                                                {c.name}
                                            </Text>

                                            {cSent && (
                                                <View
                                                    style={[
                                                        styles.chipCheckmarkBadge,
                                                        {
                                                            backgroundColor: isSelected
                                                                ? '#FFFFFF'
                                                                : theme.colors.status.successSubtle,
                                                        },
                                                    ]}
                                                >
                                                    <Check
                                                        color={isSelected ? primaryColor : theme.colors.status.success}
                                                        size={11}
                                                    />
                                                </View>
                                            )}
                                        </TouchableOpacity>
                                    );
                                })}
                            </ScrollView>
                        </View>
                    )}

                    {/* Celebrant Hero Card with Full Profile Avatar */}
                    {selectedCelebrant && (
                        <AppCard variant="surface" style={styles.heroCard}>
                            <View style={styles.heroAvatarContainer}>
                                <View
                                    style={[
                                        styles.heroAvatarRing,
                                        {
                                            borderColor: isBirthday
                                                ? theme.colors.status.pink
                                                : theme.colors.status.purple,
                                            backgroundColor: isBirthday
                                                ? theme.colors.status.pinkSubtle
                                                : theme.colors.status.purpleSubtle,
                                        },
                                    ]}
                                >
                                    {heroAvatarUrl && !avatarErrors[String(selectedCelebrant.id)] ? (
                                        <Image
                                            source={{ uri: heroAvatarUrl }}
                                            style={styles.heroAvatarImage}
                                            onError={() => {
                                                setAvatarErrors((prev) => ({
                                                    ...prev,
                                                    [String(selectedCelebrant.id)]: true,
                                                }));
                                            }}
                                        />
                                    ) : (
                                        <View
                                            style={[
                                                styles.heroAvatarFallback,
                                                {
                                                    backgroundColor: isBirthday
                                                        ? theme.colors.status.pinkSubtle
                                                        : theme.colors.status.purpleSubtle,
                                                },
                                            ]}
                                        >
                                            <Text
                                                style={[
                                                    styles.heroAvatarFallbackText,
                                                    {
                                                        color: isBirthday
                                                            ? theme.colors.status.pink
                                                            : theme.colors.status.purple,
                                                    },
                                                ]}
                                            >
                                                {getInitials(selectedCelebrant.name)}
                                            </Text>
                                        </View>
                                    )}

                                    {/* Floating Celebration Badge on bottom-right of avatar */}
                                    <View
                                        style={[
                                            styles.heroEventBadge,
                                            {
                                                backgroundColor: isBirthday
                                                    ? theme.colors.status.pink
                                                    : theme.colors.status.purple,
                                                borderColor: theme.colors.surface,
                                            },
                                        ]}
                                    >
                                        {isBirthday ? (
                                            <Cake color="#FFFFFF" size={13} />
                                        ) : (
                                            <Sparkles color="#FFFFFF" size={13} />
                                        )}
                                    </View>
                                </View>
                            </View>

                            <Text style={[styles.title, { color: theme.colors.textPrimary }]}>
                                {isBirthday
                                    ? t('happy_birthday_celebration', `Happy Birthday, ${selectedCelebrant.name}! 🎂`)
                                    : t('happy_anniversary_celebration', `Happy Work Anniversary, ${selectedCelebrant.name}! 🎊`)}
                            </Text>
                            <Text style={[styles.subtitle, { color: theme.colors.textSecondary }]}>
                                {selectedCelebrant.designation || selectedCelebrant.department || t('valued_team_member', 'Valued Team Member')}
                                {selectedCelebrant.milestone ? ` • ${selectedCelebrant.milestone}` : ''}
                            </Text>
                        </AppCard>
                    )}

                    {/* Wish Compose Card */}
                    <AppCard variant="surface" style={styles.composeCard}>
                        {/* Already Sent Banner */}
                        {isAlreadySent && (
                            <View
                                style={[
                                    styles.alreadySentBanner,
                                    {
                                        backgroundColor: theme.colors.status.successSubtle,
                                        borderColor: theme.colors.status.successBorder,
                                    },
                                ]}
                            >
                                <CheckCircle2 color={theme.colors.status.success} size={18} />
                                <Text
                                    style={[
                                        styles.alreadySentBannerText,
                                        { color: theme.colors.status.success },
                                    ]}
                                >
                                    {t(
                                        'already_sent_banner',
                                        'You have already sent a wish to this colleague today. Thank you for spreading joy! 🎊'
                                    )}
                                </Text>
                            </View>
                        )}

                        {/* Quick Presets */}
                        {!isAlreadySent && (
                            <>
                                <Text style={[styles.presetHeaderLabel, { color: theme.colors.textSecondary }]}>
                                    {t('quick_wishes', 'Quick Greetings:')}
                                </Text>
                                <View style={styles.presetsGrid}>
                                    {presets.map((preset, pIdx) => (
                                        <TouchableOpacity
                                            key={pIdx}
                                            style={[
                                                styles.presetChip,
                                                {
                                                    backgroundColor: theme.colors.surfaceSubtle,
                                                    borderColor: wishText === preset ? primaryColor : theme.colors.border,
                                                },
                                            ]}
                                            onPress={() => {
                                                setWishText(preset);
                                                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
                                            }}
                                            activeOpacity={0.75}
                                        >
                                            <Text style={[styles.presetText, { color: theme.colors.textPrimary }]} numberOfLines={2}>
                                                {preset}
                                            </Text>
                                        </TouchableOpacity>
                                    ))}
                                </View>
                            </>
                        )}

                        <AppInput
                            label={t('your_wish_message', 'Your Wish Message')}
                            value={wishText}
                            onChangeText={setWishText}
                            editable={!isAlreadySent && !sendMutation.isPending}
                            placeholder={
                                isAlreadySent
                                    ? t('wish_delivered_placeholder', 'Your wish has already been delivered.')
                                    : isBirthday
                                    ? t('birthday_wish_placeholder', 'Wishing you a wonderful birthday filled with joy and success! 🎂🎉')
                                    : t('anniversary_wish_placeholder', 'Congratulations on your work anniversary! Thank you for your dedication! 🎊')
                            }
                            multiline
                            numberOfLines={4}
                        />

                        {/* Optional Attached Image Thumbnail */}
                        {!isAlreadySent && (
                            selectedImage ? (
                                <View style={styles.imagePreviewWrapper}>
                                    <Image source={{ uri: selectedImage.uri }} style={styles.imagePreview} />
                                    <TouchableOpacity
                                        style={styles.imageRemoveBtn}
                                        onPress={() => setSelectedImage(null)}
                                        activeOpacity={0.8}
                                    >
                                        <X color="#FFFFFF" size={14} />
                                    </TouchableOpacity>
                                </View>
                            ) : (
                                <TouchableOpacity
                                    style={[
                                        styles.attachImageBtn,
                                        {
                                            backgroundColor: theme.colors.surfaceSubtle,
                                            borderColor: theme.colors.border,
                                        },
                                    ]}
                                    onPress={handlePickImage}
                                    activeOpacity={0.8}
                                >
                                    <ImageIcon color={primaryColor} size={18} />
                                    <Text style={[styles.attachImageText, { color: primaryColor }]}>
                                        {t('attach_card_photo', 'Attach Celebration Photo or Card')}
                                    </Text>
                                </TouchableOpacity>
                            )
                        )}

                        <View style={styles.btnWrapper}>
                            <AppButton
                                title={
                                    isAlreadySent
                                        ? t('wish_already_sent_btn', 'Wish Already Sent ✓')
                                        : t('send_wish', 'Send Wish')
                                }
                                onPress={handleSend}
                                loading={sendMutation.isPending}
                                disabled={sendMutation.isPending || isAlreadySent}
                                variant={isAlreadySent ? 'outline' : 'primary'}
                                icon={
                                    isAlreadySent ? (
                                        <Check color={theme.colors.status.success} size={18} />
                                    ) : (
                                        <Send color="#FFFFFF" size={18} />
                                    )
                                }
                            />
                        </View>

                        <TouchableOpacity
                            style={styles.inboxBtn}
                            onPress={() => navigation.navigate('WishesInbox')}
                            activeOpacity={0.75}
                        >
                            <Heart color={theme.colors.status.pink} size={16} />
                            <Text style={[styles.inboxBtnText, { color: theme.colors.status.pink }]}>
                                {t('view_received_wishes_inbox', 'View My Received Wishes')}
                            </Text>
                            <ChevronRight color={theme.colors.status.pink} size={14} />
                        </TouchableOpacity>
                    </AppCard>
                </>
            )}
        </AppShell>
    );
};

const styles = StyleSheet.create({
    selectorSection: {
        marginBottom: 12,
    },
    selectorLabel: {
        fontSize: 12,
        fontWeight: '700',
        marginBottom: 8,
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    celebrantsScroll: {
        flexDirection: 'row',
    },
    celebrantChip: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        paddingLeft: 4,
        paddingRight: 12,
        paddingVertical: 4,
        borderRadius: 9999,
        borderWidth: 1,
        marginRight: 8,
    },
    chipAvatar: {
        width: 24,
        height: 24,
        borderRadius: 12,
    },
    chipAvatarFallback: {
        width: 24,
        height: 24,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
    },
    chipAvatarText: {
        fontSize: 10,
        fontWeight: '800',
    },
    celebrantChipText: {
        fontSize: 13,
        fontWeight: '700',
    },
    chipCheckmarkBadge: {
        width: 16,
        height: 16,
        borderRadius: 8,
        alignItems: 'center',
        justifyContent: 'center',
        marginLeft: -2,
    },
    heroCard: {
        alignItems: 'center',
        paddingVertical: 20,
        paddingHorizontal: 16,
        marginBottom: 12,
    },
    heroAvatarContainer: {
        marginBottom: 12,
        alignItems: 'center',
        justifyContent: 'center',
    },
    heroAvatarRing: {
        width: 76,
        height: 76,
        borderRadius: 38,
        borderWidth: 2.5,
        padding: 3,
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
    },
    heroAvatarImage: {
        width: '100%',
        height: '100%',
        borderRadius: 35,
    },
    heroAvatarFallback: {
        width: '100%',
        height: '100%',
        borderRadius: 35,
        alignItems: 'center',
        justifyContent: 'center',
    },
    heroAvatarFallbackText: {
        fontSize: 24,
        fontWeight: '900',
        letterSpacing: 0.5,
    },
    heroEventBadge: {
        position: 'absolute',
        bottom: -2,
        right: -2,
        width: 26,
        height: 26,
        borderRadius: 13,
        borderWidth: 2,
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.15,
        shadowRadius: 3,
        elevation: 3,
    },
    title: {
        fontSize: 17,
        fontWeight: '800',
        textAlign: 'center',
    },
    subtitle: {
        fontSize: 13,
        textAlign: 'center',
        marginTop: 4,
        lineHeight: 18,
    },
    composeCard: {
        marginBottom: 16,
    },
    alreadySentBanner: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        padding: 12,
        borderRadius: 12,
        borderWidth: 1,
        marginBottom: 14,
    },
    alreadySentBannerText: {
        flex: 1,
        fontSize: 13,
        lineHeight: 18,
        fontWeight: '600',
    },
    presetHeaderLabel: {
        fontSize: 11,
        fontWeight: '700',
        textTransform: 'uppercase',
        letterSpacing: 0.5,
        marginBottom: 6,
    },
    presetsGrid: {
        gap: 6,
        marginBottom: 12,
    },
    presetChip: {
        borderRadius: 10,
        borderWidth: 1,
        paddingHorizontal: 10,
        paddingVertical: 8,
    },
    presetText: {
        fontSize: 12,
        lineHeight: 16,
    },
    attachImageBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        borderRadius: 12,
        borderWidth: 1,
        borderStyle: 'dashed',
        paddingVertical: 12,
        marginTop: 4,
        marginBottom: 12,
    },
    attachImageText: {
        fontSize: 13,
        fontWeight: '600',
    },
    imagePreviewWrapper: {
        position: 'relative',
        width: 100,
        height: 100,
        borderRadius: 12,
        overflow: 'hidden',
        marginTop: 4,
        marginBottom: 12,
    },
    imagePreview: {
        width: '100%',
        height: '100%',
        borderRadius: 12,
    },
    imageRemoveBtn: {
        position: 'absolute',
        top: 6,
        right: 6,
        width: 24,
        height: 24,
        borderRadius: 12,
        backgroundColor: 'rgba(0,0,0,0.65)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    btnWrapper: {
        marginTop: 6,
        marginBottom: 12,
    },
    inboxBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 10,
        gap: 6,
    },
    inboxBtnText: {
        fontSize: 13,
        fontWeight: '700',
    },
});
