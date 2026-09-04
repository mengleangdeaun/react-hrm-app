import React, { useState, useEffect, useMemo } from 'react';
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
    PartyPopper,
    Sparkles,
    Check,
    CheckCircle2,
    ChevronRight,
    X,
    Image as ImageIcon,
} from 'lucide-react-native';
import { useAppTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import { lightTheme, darkTheme } from '../../styles/theme';
import { AppShell } from '../../components/common/AppShell';
import { AppCard } from '../../components/common/AppCard';
import { AppInput } from '../../components/common/AppInput';
import { AppButton } from '../../components/common/AppButton';
import { EmptyState } from '../../components/common/EmptyState';
import { ListSkeleton } from '../../components/common/Skeletons';
import { useTranslation } from '../../context/LanguageContext';
import { celebrationApi, CelebrantItem, WishItem } from '../../api/celebration';
import { formatRelativeTime } from '../../utils/dateTime';

const BIRTHDAY_PRESETS = [
    { key: 'wish_hbd', fallback: 'Wishing you a very Happy Birthday! May your day be filled with joy and success! 🎂🎉', emoji: '🎂' },
    { key: 'wish_blast', fallback: 'Have a blast! Happy Birthday to an amazing teammate! 🥳', emoji: '🥳' },
    { key: 'wish_best', fallback: 'Wishing you all the best on your special day! ✨', emoji: '✨' },
    { key: 'wish_special', fallback: 'Hope your day is as special as you are! 🎁', emoji: '🎁' },
    { key: 'wish_wiser', fallback: 'A year older, a year wiser! Happy Birthday! 🧠', emoji: '🧠' },
    { key: 'wish_make_wish', fallback: 'Make a wish! May all your dreams come true! 🕯️', emoji: '🕯️' },
];

const ANNIVERSARY_PRESETS = [
    { key: 'wish_happy_anniversary', fallback: 'Happy Work Anniversary! Thank you for your continued dedication! 🎊', emoji: '🎊' },
    { key: 'wish_glad_have_you', fallback: "Glad to have you on the team! Here's to many more years! 🤝", emoji: '🤝' },
    { key: 'wish_keep_work', fallback: 'Keep up the fantastic work! Proud to work with you! 🚀', emoji: '🚀' },
    { key: 'wish_cheers', fallback: 'Cheers to your milestone! Wishing you continued success! 🥂', emoji: '🥂' },
    { key: 'wish_star', fallback: "You're a rockstar! Happy Work Anniversary! ⭐", emoji: '⭐' },
    { key: 'wish_amazing_milestone', fallback: 'Congratulations on this amazing milestone! 🏆', emoji: '🏆' },
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
    const { user } = useAuth();
    const { t, locale } = useTranslation();
    const theme = isDark ? darkTheme : lightTheme;
    const queryClient = useQueryClient();

    const paramCelebrant: CelebrantItem | undefined = route?.params?.celebrant;
    const targetCelebrantId = route?.params?.id || route?.params?.celebrantId;
    const targetType = route?.params?.type;

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

    // Target celebrant lookup from list if route passed ID
    useEffect(() => {
        if (!selectedCelebrant && targetCelebrantId && celebrants.length > 0) {
            const found = celebrants.find(
                (c) => String(c.id) === String(targetCelebrantId)
            );
            if (found) {
                setSelectedCelebrant(found);
                return;
            }
        }
        if (!selectedCelebrant && celebrants.length > 0) {
            setSelectedCelebrant(celebrants[0]);
        }
    }, [celebrants, selectedCelebrant, targetCelebrantId]);

    // Check if the current user is the celebrant today (viewing self celebration)
    const isSelf = useMemo(() => {
        if (!selectedCelebrant || !user) return false;
        const selId = String(selectedCelebrant.id);
        return (
            selId === String(user.id) ||
            (user.employee_code ? selId === String(user.employee_code) : false) ||
            (user.employee_id ? selId === String(user.employee_id) : false) ||
            selId === String((user as any).user_id)
        );
    }, [selectedCelebrant, user]);

    // Received wishes query (when self view)
    const { data: myWishes = [], isLoading: isLoadingMyWishes } = useQuery<WishItem[]>({
        queryKey: ['myWishes'],
        queryFn: celebrationApi.getMyWishes,
        enabled: isSelf,
    });

    const filteredSelfWishes = useMemo(() => {
        if (!selectedCelebrant) return myWishes;
        return myWishes.filter((w) => w.type === selectedCelebrant.type);
    }, [myWishes, selectedCelebrant]);

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

    const pageTitle = isSelf
        ? isBirthday
            ? t('happy_birthday_self', 'Happy Birthday to you! 🎉')
            : t('happy_anniversary_self', 'Happy Work Anniversary! 🎊')
        : isBirthday
        ? t('birthday_title', 'Happy Birthday!')
        : t('anniversary_title', 'Happy Anniversary!');

    return (
        <AppShell title={pageTitle} onBack={() => navigation.goBack()}>
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
                                                                ? '#FDF2F8'
                                                                : '#FEF3C7',
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
                                                                    ? '#DB2777'
                                                                    : '#D97706',
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
                                            borderColor: isBirthday ? '#EC4899' : '#F59E0B',
                                            backgroundColor: isBirthday ? '#FDF2F8' : '#FEF3C7',
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
                                                    backgroundColor: isBirthday ? '#FDF2F8' : '#FEF3C7',
                                                },
                                            ]}
                                        >
                                            <Text
                                                style={[
                                                    styles.heroAvatarFallbackText,
                                                    {
                                                        color: isBirthday ? '#DB2777' : '#D97706',
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
                                                backgroundColor: isBirthday ? '#EC4899' : '#F59E0B',
                                                borderColor: theme.colors.surface,
                                            },
                                        ]}
                                    >
                                        {isBirthday ? (
                                            <Cake color="#FFFFFF" size={14} />
                                        ) : (
                                            <PartyPopper color="#FFFFFF" size={14} />
                                        )}
                                    </View>
                                </View>
                            </View>

                            <Text style={[styles.title, { color: theme.colors.textPrimary }]}>
                                {isSelf
                                    ? isBirthday
                                        ? t('birthday_status', 'Leveling up today! 🎂')
                                        : t('anniversary_status', '{{milestone}} Completed! 🎊', { milestone: selectedCelebrant.milestone || 'Milestone' })
                                    : isBirthday
                                    ? t('happy_birthday_celebration', `Happy Birthday, ${selectedCelebrant.name}! 🎂`)
                                    : t('happy_anniversary_celebration', `Happy Work Anniversary, ${selectedCelebrant.name}! 🎊`)}
                            </Text>
                            <Text style={[styles.subtitle, { color: theme.colors.textSecondary }]}>
                                {selectedCelebrant.designation || selectedCelebrant.department || t('valued_team_member', 'Valued Team Member')}
                                {selectedCelebrant.milestone ? ` • ${selectedCelebrant.milestone}` : ''}
                            </Text>
                        </AppCard>
                    )}

                    {/* Self-Celebration: Render Received Wishes From Coworkers */}
                    {isSelf ? (
                        <View style={styles.receivedSection}>
                            <View style={styles.receivedHeaderRow}>
                                <Text style={[styles.receivedSectionTitle, { color: theme.colors.textSecondary }]}>
                                    {t('wishes_received', 'Messages from Team')}
                                </Text>
                                <View style={[styles.countBadge, { backgroundColor: `${primaryColor}15` }]}>
                                    <Text style={[styles.countBadgeText, { color: primaryColor }]}>
                                        {filteredSelfWishes.length} {t('messages', 'messages')}
                                    </Text>
                                </View>
                            </View>

                            {isLoadingMyWishes ? (
                                <ListSkeleton count={2} />
                            ) : filteredSelfWishes.length === 0 ? (
                                <View style={[styles.emptyWishesBox, { borderColor: theme.colors.border }]}>
                                    <PartyPopper color={theme.colors.textSecondary} size={32} />
                                    <Text style={[styles.emptyWishesText, { color: theme.colors.textSecondary }]}>
                                        {t('no_wishes_yet', 'Wishes will appear here as soon as your team sends them!')}
                                    </Text>
                                </View>
                            ) : (
                                filteredSelfWishes.map((w) => {
                                    const senderName = w.sender?.full_name || t('colleague', 'Colleague');
                                    const senderAvatar = w.sender?.profile_image_url || w.sender?.profile_image;
                                    const relativeTime = formatRelativeTime(w.created_at, locale);
                                    const imgAttachment = w.image_path || (w as any).image_url;

                                    return (
                                        <AppCard key={w.id} variant="surface" style={styles.wishItemCard}>
                                            <View style={styles.wishSenderRow}>
                                                {senderAvatar ? (
                                                    <Image source={{ uri: senderAvatar }} style={styles.wishSenderAvatar} />
                                                ) : (
                                                    <View style={[styles.wishSenderFallback, { backgroundColor: `${primaryColor}15` }]}>
                                                        <Text style={[styles.wishSenderInitial, { color: primaryColor }]}>
                                                            {senderName.charAt(0).toUpperCase()}
                                                        </Text>
                                                    </View>
                                                )}

                                                <View style={styles.wishSenderMeta}>
                                                    <Text style={[styles.wishSenderName, { color: theme.colors.textPrimary }]}>
                                                        {senderName}
                                                    </Text>
                                                    <Text style={[styles.wishTimeText, { color: theme.colors.textSecondary }]}>
                                                        {relativeTime}
                                                    </Text>
                                                </View>
                                            </View>

                                            <Text style={[styles.wishBodyText, { color: theme.colors.textPrimary }]}>
                                                "{w.message || t('warm_wishes', 'Sent you warm wishes!')}"
                                            </Text>

                                            {imgAttachment ? (
                                                <Image
                                                    source={{ uri: imgAttachment }}
                                                    style={styles.wishAttachedImg}
                                                    resizeMode="cover"
                                                />
                                            ) : null}
                                        </AppCard>
                                    );
                                })
                            )}
                        </View>
                    ) : (
                        /* Colleague Celebration: Render Preset Chips & Compose Box */
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

                            {/* Quick Presets (PWA 6 wishes) */}
                            {!isAlreadySent && (
                                <>
                                    <Text style={[styles.presetHeaderLabel, { color: theme.colors.textSecondary }]}>
                                        {t('quick_wishes', 'Quick Greetings:')}
                                    </Text>
                                    <View style={styles.presetsGrid}>
                                        {presets.map((presetItem) => {
                                            const presetText = t(presetItem.key, presetItem.fallback);
                                            const isActive = wishText === presetText;

                                            return (
                                                <TouchableOpacity
                                                    key={presetItem.key}
                                                    style={[
                                                        styles.presetChip,
                                                        {
                                                            backgroundColor: isActive
                                                                ? `${primaryColor}15`
                                                                : theme.colors.surfaceSubtle,
                                                            borderColor: isActive ? primaryColor : theme.colors.border,
                                                        },
                                                    ]}
                                                    onPress={() => {
                                                        setWishText(presetText);
                                                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
                                                    }}
                                                    activeOpacity={0.75}
                                                >
                                                    <Text style={styles.presetEmoji}>{presetItem.emoji}</Text>
                                                    <Text
                                                        style={[
                                                            styles.presetText,
                                                            {
                                                                color: isActive ? primaryColor : theme.colors.textPrimary,
                                                                fontWeight: isActive ? '700' : '500',
                                                            },
                                                        ]}
                                                        numberOfLines={2}
                                                    >
                                                        {presetText}
                                                    </Text>
                                                    {isActive && (
                                                        <Check color={primaryColor} size={14} style={styles.presetCheck} />
                                                    )}
                                                </TouchableOpacity>
                                            );
                                        })}
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
                    )}
                </>
            )}
        </AppShell>
    );
};

const styles = StyleSheet.create({
    selectorSection: {
        marginBottom: 16,
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
        paddingVertical: 6,
        paddingHorizontal: 10,
        borderRadius: 20,
        borderWidth: 1,
        marginRight: 8,
        gap: 6,
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
        fontSize: 12,
        fontWeight: '600',
    },
    chipCheckmarkBadge: {
        width: 16,
        height: 16,
        borderRadius: 8,
        alignItems: 'center',
        justifyContent: 'center',
    },
    heroCard: {
        alignItems: 'center',
        paddingVertical: 24,
        paddingHorizontal: 16,
        marginBottom: 16,
    },
    heroAvatarContainer: {
        marginBottom: 14,
    },
    heroAvatarRing: {
        width: 88,
        height: 88,
        borderRadius: 44,
        borderWidth: 3,
        padding: 3,
        position: 'relative',
        alignItems: 'center',
        justifyContent: 'center',
    },
    heroAvatarImage: {
        width: '100%',
        height: '100%',
        borderRadius: 40,
    },
    heroAvatarFallback: {
        width: '100%',
        height: '100%',
        borderRadius: 40,
        alignItems: 'center',
        justifyContent: 'center',
    },
    heroAvatarFallbackText: {
        fontSize: 28,
        fontWeight: '900',
    },
    heroEventBadge: {
        position: 'absolute',
        bottom: -2,
        right: -2,
        width: 28,
        height: 28,
        borderRadius: 14,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 2,
    },
    title: {
        fontSize: 17,
        fontWeight: '800',
        textAlign: 'center',
        marginBottom: 4,
    },
    subtitle: {
        fontSize: 13,
        textAlign: 'center',
    },
    composeCard: {
        padding: 16,
        marginBottom: 24,
    },
    alreadySentBanner: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 12,
        borderRadius: 12,
        borderWidth: 1,
        marginBottom: 16,
        gap: 10,
    },
    alreadySentBannerText: {
        flex: 1,
        fontSize: 12,
        fontWeight: '600',
        lineHeight: 18,
    },
    presetHeaderLabel: {
        fontSize: 12,
        fontWeight: '700',
        textTransform: 'uppercase',
        letterSpacing: 0.5,
        marginBottom: 8,
    },
    presetsGrid: {
        gap: 8,
        marginBottom: 16,
    },
    presetChip: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 10,
        paddingHorizontal: 12,
        borderRadius: 12,
        borderWidth: 1,
        gap: 8,
    },
    presetEmoji: {
        fontSize: 16,
    },
    presetText: {
        fontSize: 12,
        flex: 1,
        lineHeight: 16,
    },
    presetCheck: {
        marginLeft: 4,
    },
    attachImageBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 12,
        borderRadius: 12,
        borderWidth: 1,
        borderStyle: 'dashed',
        gap: 8,
        marginTop: 10,
        marginBottom: 16,
    },
    attachImageText: {
        fontSize: 13,
        fontWeight: '600',
    },
    imagePreviewWrapper: {
        position: 'relative',
        width: 80,
        height: 80,
        borderRadius: 12,
        overflow: 'hidden',
        marginTop: 10,
        marginBottom: 16,
    },
    imagePreview: {
        width: '100%',
        height: '100%',
    },
    imageRemoveBtn: {
        position: 'absolute',
        top: 4,
        right: 4,
        width: 20,
        height: 20,
        borderRadius: 10,
        backgroundColor: 'rgba(0, 0, 0, 0.6)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    btnWrapper: {
        marginTop: 8,
    },
    inboxBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingTop: 16,
        marginTop: 12,
        borderTopWidth: 1,
        borderTopColor: 'rgba(0, 0, 0, 0.06)',
        gap: 6,
    },
    inboxBtnText: {
        fontSize: 13,
        fontWeight: '700',
    },
    receivedSection: {
        marginBottom: 24,
    },
    receivedHeaderRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 12,
    },
    receivedSectionTitle: {
        fontSize: 12,
        fontWeight: '800',
        textTransform: 'uppercase',
        letterSpacing: 0.8,
    },
    countBadge: {
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 10,
    },
    countBadgeText: {
        fontSize: 11,
        fontWeight: '800',
        textTransform: 'uppercase',
    },
    emptyWishesBox: {
        alignItems: 'center',
        justifyContent: 'center',
        padding: 32,
        borderRadius: 16,
        borderWidth: 1,
        borderStyle: 'dashed',
        gap: 12,
    },
    emptyWishesText: {
        fontSize: 13,
        textAlign: 'center',
    },
    wishItemCard: {
        padding: 14,
        marginBottom: 10,
    },
    wishSenderRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        marginBottom: 8,
    },
    wishSenderAvatar: {
        width: 36,
        height: 36,
        borderRadius: 18,
    },
    wishSenderFallback: {
        width: 36,
        height: 36,
        borderRadius: 18,
        alignItems: 'center',
        justifyContent: 'center',
    },
    wishSenderInitial: {
        fontSize: 14,
        fontWeight: '800',
    },
    wishSenderMeta: {
        flex: 1,
    },
    wishSenderName: {
        fontSize: 13,
        fontWeight: '700',
    },
    wishTimeText: {
        fontSize: 11,
        marginTop: 1,
    },
    wishBodyText: {
        fontSize: 13,
        lineHeight: 19,
        fontStyle: 'italic',
    },
    wishAttachedImg: {
        width: '100%',
        height: 160,
        borderRadius: 12,
        marginTop: 10,
    },
});
