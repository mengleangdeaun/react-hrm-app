import React from 'react';
import {
    View,
    StyleSheet,
    Image,
} from 'react-native';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { AppText as Text } from '../../components/AppText';
import { Heart, Gift, Cake, Sparkles } from 'lucide-react-native';
import { useAppTheme } from '../../context/ThemeContext';
import { lightTheme, darkTheme } from '../../styles/theme';
import { AppShell } from '../../components/common/AppShell';
import { AppCard } from '../../components/common/AppCard';
import { EmptyState } from '../../components/common/EmptyState';
import { ListSkeleton } from '../../components/common/Skeletons';
import { useTranslation } from '../../context/LanguageContext';
import { celebrationApi, WishItem } from '../../api/celebration';
import { formatDateDisplay } from '../../utils/dateTime';

export const WishesInboxScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
    const { isDark } = useAppTheme();
    const { t } = useTranslation();
    const theme = isDark ? darkTheme : lightTheme;
    const queryClient = useQueryClient();

    const {
        data: wishes = [],
        isLoading,
        isFetching,
        refetch,
    } = useQuery<WishItem[]>({
        queryKey: ['myWishes'],
        queryFn: celebrationApi.getMyWishes,
    });

    const handleRefresh = async () => {
        await queryClient.invalidateQueries({ queryKey: ['myWishes'] });
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
                    const dateFormatted = formatDateDisplay(item.created_at, 'dayMonth');

                    return (
                        <AppCard key={item.id} variant="surface" style={styles.card}>
                            <View style={styles.cardHeader}>
                                {senderAvatar ? (
                                    <Image source={{ uri: senderAvatar }} style={styles.avatar} />
                                ) : (
                                    <View style={[styles.avatarFallback, { backgroundColor: isBirthday ? theme.colors.status.pinkSubtle : theme.colors.status.purpleSubtle }]}>
                                        <Text style={[styles.avatarFallbackText, { color: isBirthday ? theme.colors.status.pink : theme.colors.status.purple }]}>
                                            {senderName.charAt(0).toUpperCase()}
                                        </Text>
                                    </View>
                                )}

                                <View style={styles.senderWrapper}>
                                    <Text style={[styles.senderName, { color: theme.colors.textPrimary }]}>
                                        {senderName}
                                    </Text>
                                    <Text style={[styles.dateText, { color: theme.colors.textSecondary }]}>
                                        {dateFormatted}
                                    </Text>
                                </View>

                                <View
                                    style={[
                                        styles.typePill,
                                        {
                                            backgroundColor: isBirthday ? theme.colors.status.pinkSubtle : theme.colors.status.purpleSubtle,
                                            borderColor: isBirthday ? theme.colors.status.pinkBorder : theme.colors.status.purpleBorder,
                                        },
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
                                            { color: isBirthday ? theme.colors.status.pink : theme.colors.status.purple },
                                        ]}
                                    >
                                        {isBirthday ? t('birthday', 'Birthday') : t('anniversary', 'Anniversary')}
                                    </Text>
                                </View>
                            </View>

                            <Text style={[styles.messageText, { color: theme.colors.textPrimary }]}>
                                "{item.message}"
                            </Text>
                        </AppCard>
                    );
                })
            )}
        </AppShell>
    );
};

const styles = StyleSheet.create({
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
        justifyContent: 'center',
        alignItems: 'center',
    },
    avatarFallbackText: {
        fontSize: 14,
        fontWeight: '800',
    },
    senderWrapper: {
        flex: 1,
    },
    senderName: {
        fontSize: 14,
        fontWeight: '700',
    },
    dateText: {
        fontSize: 11,
        marginTop: 1,
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
    typePillText: {
        fontSize: 10,
        fontWeight: '700',
        textTransform: 'uppercase',
    },
    messageText: {
        fontSize: 13,
        lineHeight: 20,
        fontStyle: 'italic',
    },
});
