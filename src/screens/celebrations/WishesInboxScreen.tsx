import React from 'react';
import { View } from 'react-native';
import { Image } from 'expo-image';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { AppText as Text } from '../../components/AppText';
import { Gift, Cake, Sparkles } from 'lucide-react-native';
import { StyleSheet, useUnistyles } from 'react-native-unistyles';
import { AppShell } from '../../components/common/AppShell';
import { AppCard } from '../../components/common/AppCard';
import { EmptyState } from '../../components/common/EmptyState';
import { ListSkeleton } from '../../components/common/Skeletons';
import { useTranslation } from '../../context/LanguageContext';
import { celebrationApi, WishItem } from '../../api/celebration';
import { queryKeys } from '../../api/queryKeys';
import { formatRelativeTime } from '../../utils/dateTime';

export const WishesInboxScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
    const { t, locale } = useTranslation();
    const { theme } = useUnistyles();
    const styles = stylesheet;
    const queryClient = useQueryClient();

    const {
        data: wishes = [],
        isLoading,
        isFetching,
        refetch,
    } = useQuery<WishItem[]>({
        queryKey: queryKeys.celebrations.myWishes,
        queryFn: celebrationApi.getMyWishes,
    });

    const handleRefresh = async () => {
        await queryClient.invalidateQueries({ queryKey: queryKeys.celebrations.myWishes });
        refetch();
    };

    return (
        <AppShell
            title={t('celebration_wishes', 'Celebration Wishes')}
            onBack={() => navigation.goBack()}
            refreshing={isFetching && !isLoading}
            onRefresh={handleRefresh}
        >
            {isLoading ? (
                <ListSkeleton count={3} />
            ) : wishes.length === 0 ? (
                <EmptyState
                    icon={<Gift color={theme.colors.textSecondary} size={36} />}
                    title={t('no_wishes_yet', 'No Wishes Received Yet')}
                    description={t('no_wishes_desc', 'Warm celebration wishes and milestone congratulations from your colleagues will appear here.')}
                />
            ) : (
                wishes.map((item) => {
                    const isBirthday = item.type === 'birthday';
                    const senderName = item.sender?.full_name || t('colleague', 'Colleague');
                    const senderAvatar = item.sender?.profile_image_url || item.sender?.profile_image;
                    const dateFormatted = formatRelativeTime(item.created_at, locale);
                    const attachedImg = item.image_path || (item as any).image_url;

                    return (
                        <AppCard key={item.id} variant="surface" style={styles.card}>
                            <View style={styles.cardHeader}>
                                {senderAvatar ? (
                                    <Image source={{ uri: senderAvatar }} style={styles.avatar} contentFit="cover" />
                                ) : (
                                    <View style={[styles.avatarFallback, isBirthday ? styles.avatarFallbackBirthday : styles.avatarFallbackAnniversary]}>
                                        <Text style={[styles.avatarFallbackText, isBirthday ? styles.avatarFallbackTextBirthday : styles.avatarFallbackTextAnniversary]}>
                                            {senderName.charAt(0).toUpperCase()}
                                        </Text>
                                    </View>
                                )}

                                <View style={styles.senderWrapper}>
                                    <Text style={styles.senderName}>
                                        {senderName}
                                    </Text>
                                    <Text style={styles.dateText}>
                                        {dateFormatted}
                                    </Text>
                                </View>

                                <View
                                    style={[
                                        styles.typePill,
                                        isBirthday ? styles.typePillBirthday : styles.typePillAnniversary,
                                    ]}
                                >
                                    {isBirthday ? (
                                        <Cake color={theme.colors.status.pink} size={12} />
                                    ) : (
                                        <Sparkles color={theme.colors.status.purple} size={12} />
                                    )}
                                    <Text
                                        style={[
                                            styles.typePillText,
                                            isBirthday ? styles.typePillTextBirthday : styles.typePillTextAnniversary,
                                        ]}
                                    >
                                        {isBirthday ? t('birthday', 'Birthday') : t('anniversary', 'Anniversary')}
                                    </Text>
                                </View>
                            </View>

                            <Text style={styles.messageText}>
                                "{item.message}"
                            </Text>

                            {attachedImg ? (
                                <Image
                                    source={{ uri: attachedImg }}
                                    style={styles.attachedImage}
                                    contentFit="cover"
                                />
                            ) : null}
                        </AppCard>
                    );
                })
            )}
        </AppShell>
    );
};

const stylesheet = StyleSheet.create((theme) => ({
    card: {
        marginBottom: 12,
    },
    cardHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        marginBottom: 10,
    },
    avatar: {
        width: 36,
        height: 36,
        borderRadius: 18,
    },
    avatarFallback: {
        width: 36,
        height: 36,
        borderRadius: 18,
        alignItems: 'center',
        justifyContent: 'center',
    },
    avatarFallbackBirthday: {
        backgroundColor: theme.colors.status.pinkSubtle,
    },
    avatarFallbackAnniversary: {
        backgroundColor: theme.colors.status.purpleSubtle,
    },
    avatarFallbackText: {
        fontSize: 14,
        fontWeight: '800',
    },
    avatarFallbackTextBirthday: {
        color: theme.colors.status.pink,
    },
    avatarFallbackTextAnniversary: {
        color: theme.colors.status.purple,
    },
    senderWrapper: {
        flex: 1,
    },
    senderName: {
        fontSize: 14,
        fontWeight: '700',
        color: theme.colors.textPrimary,
    },
    dateText: {
        fontSize: 11,
        marginTop: 1,
        color: theme.colors.textSecondary,
    },
    typePill: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 9999,
        borderWidth: 1,
    },
    typePillBirthday: {
        backgroundColor: theme.colors.status.pinkSubtle,
        borderColor: theme.colors.status.pinkBorder,
    },
    typePillAnniversary: {
        backgroundColor: theme.colors.status.purpleSubtle,
        borderColor: theme.colors.status.purpleBorder,
    },
    typePillText: {
        fontSize: 10,
        fontWeight: '800',
        textTransform: 'uppercase',
    },
    typePillTextBirthday: {
        color: theme.colors.status.pink,
    },
    typePillTextAnniversary: {
        color: theme.colors.status.purple,
    },
    messageText: {
        fontSize: 13,
        lineHeight: 20,
        fontStyle: 'italic',
        color: theme.colors.textPrimary,
    },
    attachedImage: {
        width: '100%',
        height: 160,
        borderRadius: 12,
        marginTop: 10,
    },
}));
