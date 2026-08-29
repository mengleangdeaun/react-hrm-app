import React, { useState } from 'react';
import {
    View,
    ScrollView,
    TouchableOpacity,
    StatusBar,
    RefreshControl,
    Alert,
    SafeAreaView,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StyleSheet, useUnistyles } from 'react-native-unistyles';
import { isToday, isYesterday, isThisWeek, parseISO, isValid, format } from 'date-fns';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { notificationApi, NotificationItem, CelebrantItem } from '../../api/notification';
import { useAppTheme } from '../../context/ThemeContext';
import { useTranslation } from '../../context/LanguageContext';
import { AppText as Text } from '../../components/AppText';
import { AppShell } from '../../components/common/AppShell';
import { AppHeader, HeaderIconButton } from '../../components/common/AppHeader';
import { NotificationListSkeleton } from '../../components/common/Skeletons';
import {
    Bell,
    ChevronRight,
    ArrowLeft,
    CheckCheck,
    Trash2,
    Calendar,
    Gift,
    AlertTriangle,
    Info,
    PartyPopper,
} from 'lucide-react-native';

const CATEGORY_FILTERS = [
    { id: 'all', labelKey: 'tab_all', fallback: 'All' },
    { id: 'leave', labelKey: 'tab_leave', fallback: 'Leave' },
    { id: 'system', labelKey: 'tab_system', fallback: 'System' },
    { id: 'celebration', labelKey: 'tab_birthday', fallback: 'Celebrations' },
    { id: 'others', labelKey: 'tab_other', fallback: 'Others' },
];

export interface GroupedNotifications {
    titleKey: string;
    fallbackTitle: string;
    data: NotificationItem[];
}

export const groupNotificationsByDate = (items: NotificationItem[]): GroupedNotifications[] => {
    const todayItems: NotificationItem[] = [];
    const yesterdayItems: NotificationItem[] = [];
    const thisWeekItems: NotificationItem[] = [];
    const olderItems: NotificationItem[] = [];

    items.forEach((item) => {
        if (!item.created_at) {
            todayItems.push(item);
            return;
        }
        try {
            const d = parseISO(item.created_at);
            if (!isValid(d)) {
                olderItems.push(item);
            } else if (isToday(d)) {
                todayItems.push(item);
            } else if (isYesterday(d)) {
                yesterdayItems.push(item);
            } else if (isThisWeek(d, { weekStartsOn: 1 })) {
                thisWeekItems.push(item);
            } else {
                olderItems.push(item);
            }
        } catch {
            olderItems.push(item);
        }
    });

    const groups: GroupedNotifications[] = [];
    if (todayItems.length > 0) groups.push({ titleKey: 'today', fallbackTitle: 'Today', data: todayItems });
    if (yesterdayItems.length > 0) groups.push({ titleKey: 'yesterday', fallbackTitle: 'Yesterday', data: yesterdayItems });
    if (thisWeekItems.length > 0) groups.push({ titleKey: 'this_week', fallbackTitle: 'This Week', data: thisWeekItems });
    if (olderItems.length > 0) groups.push({ titleKey: 'earlier', fallbackTitle: 'Earlier', data: olderItems });
    return groups;
};

const formatNotificationTime = (rawStr: string | null | undefined): string => {
    if (!rawStr) return '';
    try {
        const d = parseISO(rawStr);
        if (!isValid(d)) return rawStr;
        return format(d, 'hh:mm a');
    } catch {
        return rawStr;
    }
};

export const NotificationListScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
    const insets = useSafeAreaInsets();
    const { isDark, primaryColor } = useAppTheme();
    const { t } = useTranslation();
    const { theme } = useUnistyles();
    const styles = stylesheet;
    const queryClient = useQueryClient();

    const [selectedCategory, setSelectedCategory] = useState<string>('all');
    const [refreshing, setRefreshing] = useState<boolean>(false);

    // 10-minute React Query Caching for Notifications
    const { data: notifications = [], isLoading: isLoadingNotifs, isFetching: isFetchingNotifs } = useQuery<NotificationItem[]>({
        queryKey: ['notificationsList'],
        queryFn: async () => {
            const notifRes = await notificationApi.getNotifications();
            const list = Array.isArray(notifRes) ? notifRes : Array.isArray(notifRes?.data) ? notifRes.data : [];
            return list;
        },
        staleTime: 1000 * 60 * 10, // 10 minutes cache
    });

    // 10-minute React Query Caching for Team Celebrations
    const { data: celebrations = [] } = useQuery<CelebrantItem[]>({
        queryKey: ['celebrationsList'],
        queryFn: async () => {
            const celebRes = await notificationApi.getCelebrations();
            return Array.isArray(celebRes) ? celebRes : [];
        },
        staleTime: 1000 * 60 * 10, // 10 minutes cache
    });

    // Optimistic Mutation: Mark All Read
    const markAllReadMutation = useMutation({
        mutationFn: () => notificationApi.markAllAsRead(),
        onMutate: async () => {
            await queryClient.cancelQueries({ queryKey: ['notificationsList'] });
            const previous = queryClient.getQueryData<NotificationItem[]>(['notificationsList']);
            const nowIso = new Date().toISOString();
            queryClient.setQueryData<NotificationItem[]>(['notificationsList'], (old) =>
                (old || []).map((n) => ({ ...n, read_at: n.read_at || nowIso }))
            );
            return { previous };
        },
        onError: (_err, _vars, context) => {
            if (context?.previous) {
                queryClient.setQueryData(['notificationsList'], context.previous);
            }
        },
        onSettled: () => {
            queryClient.invalidateQueries({ queryKey: ['notificationsList'] });
        },
    });

    // Optimistic Mutation: Delete Single Notification
    const deleteMutation = useMutation({
        mutationFn: (id: string | number) => notificationApi.deleteNotification(id),
        onMutate: async (id) => {
            await queryClient.cancelQueries({ queryKey: ['notificationsList'] });
            const previous = queryClient.getQueryData<NotificationItem[]>(['notificationsList']);
            queryClient.setQueryData<NotificationItem[]>(['notificationsList'], (old) =>
                (old || []).filter((n) => n.id !== id)
            );
            return { previous };
        },
        onError: (_err, _vars, context) => {
            if (context?.previous) {
                queryClient.setQueryData(['notificationsList'], context.previous);
            }
        },
        onSettled: () => {
            queryClient.invalidateQueries({ queryKey: ['notificationsList'] });
        },
    });

    // Optimistic Mutation: Clear All Notifications
    const deleteAllMutation = useMutation({
        mutationFn: () => notificationApi.deleteAllNotifications(),
        onMutate: async () => {
            await queryClient.cancelQueries({ queryKey: ['notificationsList'] });
            const previous = queryClient.getQueryData<NotificationItem[]>(['notificationsList']);
            queryClient.setQueryData<NotificationItem[]>(['notificationsList'], []);
            return { previous };
        },
        onError: (_err, _vars, context) => {
            if (context?.previous) {
                queryClient.setQueryData(['notificationsList'], context.previous);
            }
        },
        onSettled: () => {
            queryClient.invalidateQueries({ queryKey: ['notificationsList'] });
        },
    });

    const onRefresh = async () => {
        setRefreshing(true);
        await Promise.all([
            queryClient.invalidateQueries({ queryKey: ['notificationsList'] }),
            queryClient.invalidateQueries({ queryKey: ['celebrationsList'] }),
        ]);
        setRefreshing(false);
    };

    const handleMarkAllRead = () => {
        markAllReadMutation.mutate();
    };

    const handleClearAll = () => {
        Alert.alert(
            t('confirm_delete_all', 'Clear Notifications'),
            t('delete_all_confirmation', 'Are you sure you want to delete all notifications?'),
            [
                { text: t('cancel', 'Cancel'), style: 'cancel' },
                {
                    text: t('confirm_delete', 'Clear All'),
                    style: 'destructive',
                    onPress: () => deleteAllMutation.mutate(),
                },
            ]
        );
    };

    const handleItemPress = (item: NotificationItem) => {
        if (!item.read_at) {
            notificationApi.markAsRead(item.id).catch(() => null);
            queryClient.setQueryData<NotificationItem[]>(['notificationsList'], (old) =>
                (old || []).map((n) => (n.id === item.id ? { ...n, read_at: new Date().toISOString() } : n))
            );
        }

        const type = (item.type || '').toLowerCase();
        const dataType = (item.data?.type || '').toLowerCase();
        const isQuiz = type.includes('quiz') || dataType.includes('quiz');

        if (isQuiz) {
            const quizId = item.data?.quiz_id || item.data?.target_id || item.data?.id;
            if (quizId) {
                navigation.navigate('TakeQuiz', { quizId });
            } else {
                navigation.navigate('QuizList');
            }
        } else if (type.includes('leave')) {
            navigation.navigate('LeaveList');
        } else if (type.includes('celebration')) {
            navigation.navigate('WishesInbox');
        } else {
            // Target integer Announcement ID resolution to prevent 404
            const targetAnnouncementId =
                item.announcement_id ||
                item.data?.announcement_id ||
                item.data?.id ||
                (typeof item.id === 'number' ? item.id : null);

            navigation.navigate('AnnouncementDetail', {
                id: targetAnnouncementId,
                notificationId: item.id,
                notification: item,
            });
        }
    };

    const handleDeleteItem = (id: string | number) => {
        deleteMutation.mutate(id);
    };

    const filteredNotifications = notifications.filter((item) => {
        if (selectedCategory === 'all') return true;
        const tStr = (item.type || '').toLowerCase();
        if (selectedCategory === 'others' || selectedCategory === 'other' || selectedCategory === 'system') {
            const isAnnouncement = tStr.includes('announcement');
            const isLeave = tStr.includes('leave');
            const isCelebration = tStr.includes('celebration');
            return !isAnnouncement && !isLeave && !isCelebration;
        }
        return tStr.includes(selectedCategory);
    });

    const groupedData = groupNotificationsByDate(filteredNotifications);

    const getCategoryIcon = (typeStr: string) => {
        const tStr = (typeStr || '').toLowerCase();
        if (tStr.includes('leave')) return <Calendar color={primaryColor} size={18} />;
        if (tStr.includes('celebration')) return <Gift color="#EC4899" size={18} />;
        if (tStr.includes('system') || tStr.includes('alert') || tStr.includes('quiz')) return <AlertTriangle color={theme.colors.status.warning} size={18} />;
        return <Bell color={primaryColor} size={18} />;
    };

    const headerRight = (
        <View style={styles.headerRightRow}>
            <HeaderIconButton
                icon={<CheckCheck color={theme.colors.brand} size={18} />}
                onPress={handleMarkAllRead}
                accessibilityLabel="Mark all read"
            />
            <HeaderIconButton
                icon={<Trash2 color={theme.colors.status.danger} size={18} />}
                onPress={handleClearAll}
                accessibilityLabel="Clear all notifications"
                style={{ marginLeft: 6 }}
            />
        </View>
    );

    const subHeader = (
        <View style={styles.tabBarContainer}>
            <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.tabBarScrollContent}
            >
                {CATEGORY_FILTERS.map((cat) => {
                    const isActive = selectedCategory === cat.id;
                    return (
                        <TouchableOpacity
                            key={cat.id}
                            style={styles.tabItem}
                            onPress={() => setSelectedCategory(cat.id)}
                            activeOpacity={0.8}
                        >
                            <Text
                                style={[
                                    styles.tabLabel,
                                    isActive && { color: primaryColor, fontWeight: '800' },
                                ]}
                            >
                                {t(cat.labelKey, cat.fallback)}
                            </Text>
                            {isActive && <View style={[styles.tabIndicator, { backgroundColor: primaryColor }]} />}
                        </TouchableOpacity>
                    );
                })}
            </ScrollView>
        </View>
    );

    return (
        <AppShell
            title={t('noti', 'Notifications Center')}
            onBack={navigation.canGoBack() ? () => navigation.goBack() : undefined}
            headerRight={headerRight}
            subHeader={subHeader}
            refreshing={refreshing || isFetchingNotifs}
            onRefresh={onRefresh}
        >
            {/* Team Celebration Banner Header */}
            {celebrations.length > 0 && (
                <TouchableOpacity
                    style={styles.celebrationBanner}
                    onPress={() => navigation.navigate('WishesInbox')}
                    activeOpacity={0.85}
                >
                    <PartyPopper color="#EC4899" size={24} />
                    <View style={styles.celebrationBannerText}>
                        <Text style={styles.celebrationTitle}>
                            {celebrations.length} {t('team_celebration', 'Team Celebration')}{celebrations.length > 1 ? 's' : ''} {t('today', 'Today')}! 🎉
                        </Text>
                        <Text style={styles.celebrationSub}>
                            {celebrations.map((c) => c.name).join(', ')} • {t('open_my_wishes', 'Send wishes')}
                        </Text>
                    </View>
                    <ChevronRight color="#EC4899" size={18} />
                </TouchableOpacity>
            )}

            {/* Notifications List Grouped by Date */}
            {isLoadingNotifs ? (
                <NotificationListSkeleton />
            ) : filteredNotifications.length === 0 ? (
                <View style={styles.emptyCard}>
                    <Bell color={theme.colors.textSecondary} size={44} />
                    <Text style={styles.emptyTitle}>{t('nothing_here_yet', 'No Notifications')}</Text>
                    <Text style={styles.emptySub}>
                        {t('everything_up_to_date', 'You are all caught up! No active notifications found.')}
                    </Text>
                </View>
            ) : (
                groupedData.map((group) => (
                    <View key={group.titleKey} style={styles.dateGroupWrapper}>
                        {/* Sticky Date Section Header */}
                        <Text style={styles.dateSectionHeader}>
                            {t(group.titleKey, group.fallbackTitle)}
                        </Text>

                        {group.data.map((item) => {
                            const isUnread = !item.read_at;
                            return (
                                <TouchableOpacity
                                    key={item.id}
                                    style={[
                                        styles.card,
                                        isUnread && [
                                            styles.unreadCard,
                                            { borderColor: primaryColor, backgroundColor: `${primaryColor}08` },
                                        ],
                                    ]}
                                    onPress={() => handleItemPress(item)}
                                    activeOpacity={0.8}
                                >
                                    <View style={styles.cardHeader}>
                                        <View style={styles.iconBg}>{getCategoryIcon(item.type)}</View>

                                        <View style={styles.headerTextGroup}>
                                            <Text style={[styles.cardTitle, isUnread && styles.unreadCardTitle]} numberOfLines={1}>
                                                {item.title}
                                            </Text>
                                            <Text style={styles.cardDate}>
                                                {formatNotificationTime(item.created_at)}
                                            </Text>
                                        </View>

                                        {isUnread && <View style={[styles.unreadDot, { backgroundColor: primaryColor }]} />}
                                    </View>

                                    <Text style={styles.cardMessage} numberOfLines={2}>
                                        {item.message}
                                    </Text>

                                    <View style={styles.cardFooter}>
                                        <TouchableOpacity
                                            style={styles.deleteBtn}
                                            onPress={() => handleDeleteItem(item.id)}
                                            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                                        >
                                            <Trash2 color={theme.colors.textSecondary} size={14} />
                                        </TouchableOpacity>
                                        <ChevronRight color={theme.colors.textSecondary} size={16} />
                                    </View>
                                </TouchableOpacity>
                            );
                        })}
                    </View>
                ))
            )}
        </AppShell>
    );
};

const stylesheet = StyleSheet.create((theme) => ({
    safeArea: {
        flex: 1,
        backgroundColor: theme.colors.background,
    },
    headerRightRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    topBar: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: theme.spacing.md + 4,
        paddingVertical: theme.spacing.md,
    },
    iconCircle: {
        width: 38,
        height: 38,
        borderRadius: theme.borderRadius.md,
        backgroundColor: theme.colors.surface,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: theme.colors.border,
    },
    headerTitle: {
        color: theme.colors.textPrimary,
        fontSize: 18,
        fontWeight: '700',
    },
    headerActions: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: theme.spacing.xs + 4,
    },
    tabBarContainer: {
        backgroundColor: theme.colors.surface,
        borderBottomWidth: 1,
        borderBottomColor: theme.colors.border,
        overflow: 'hidden',
    },
    tabBarScrollContent: {
        paddingHorizontal: theme.spacing.sm,
        flexDirection: 'row',
        alignItems: 'center',
    },
    tabItem: {
        paddingHorizontal: theme.spacing.md,
        paddingVertical: theme.spacing.sm + 4,
        alignItems: 'center',
        position: 'relative',
    },
    tabLabel: {
        fontSize: 13,
        fontWeight: '700',
        color: theme.colors.textSecondary,
        textTransform: 'uppercase',
        letterSpacing: 0.4,
    },
    tabIndicator: {
        position: 'absolute',
        bottom: 0,
        left: 16,
        right: 16,
        height: 3,
        borderTopLeftRadius: 3,
        borderTopRightRadius: 3,
    },
    container: {
        flex: 1,
    },
    scrollContent: {
        flexGrow: 1,
        paddingHorizontal: theme.spacing.md + 4,
        paddingTop: theme.spacing.md,
        paddingBottom: theme.spacing.xl + 40,
    },
    celebrationBanner: {
        backgroundColor: 'rgba(236, 72, 153, 0.1)',
        borderRadius: theme.borderRadius.lg,
        padding: theme.spacing.md,
        flexDirection: 'row',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: 'rgba(236, 72, 153, 0.25)',
        marginBottom: theme.spacing.md,
    },
    celebrationBannerText: {
        flex: 1,
        marginLeft: theme.spacing.sm + 2,
    },
    celebrationTitle: {
        fontSize: 14,
        fontWeight: '700',
        color: '#DB2777',
    },
    celebrationSub: {
        fontSize: 12,
        color: theme.colors.textSecondary,
        marginTop: 2,
    },
    dateGroupWrapper: {
        marginBottom: theme.spacing.sm,
    },
    dateSectionHeader: {
        fontSize: 11,
        fontWeight: '800',
        textTransform: 'uppercase',
        letterSpacing: 0.8,
        color: theme.colors.textSecondary,
        marginBottom: theme.spacing.xs + 2,
        marginLeft: theme.spacing.xs,
        marginTop: theme.spacing.xs,
    },
    emptyCard: {
        backgroundColor: theme.colors.surface,
        borderRadius: theme.borderRadius.lg,
        padding: theme.spacing.xl,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: theme.colors.border,
        marginTop: theme.spacing.md,
    },
    emptyTitle: {
        fontSize: 16,
        fontWeight: '700',
        color: theme.colors.textPrimary,
        marginTop: theme.spacing.md,
    },
    emptySub: {
        fontSize: 12,
        color: theme.colors.textSecondary,
        marginTop: 2,
        textAlign: 'center',
    },
    card: {
        backgroundColor: theme.colors.surface,
        borderRadius: theme.borderRadius.lg,
        padding: theme.spacing.md,
        marginBottom: theme.spacing.sm + 4,
        borderWidth: 1,
        borderColor: theme.colors.border,
        ...theme.shadows.sm,
    },
    unreadCard: {
        borderWidth: 1,
    },
    cardHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: theme.spacing.xs + 2,
    },
    iconBg: {
        width: 36,
        height: 36,
        borderRadius: theme.borderRadius.md,
        backgroundColor: theme.colors.surfaceSubtle,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: theme.colors.border,
    },
    headerTextGroup: {
        flex: 1,
        marginLeft: theme.spacing.sm + 2,
    },
    cardTitle: {
        fontSize: 14,
        fontWeight: '600',
        color: theme.colors.textPrimary,
    },
    unreadCardTitle: {
        fontWeight: '800',
    },
    cardDate: {
        fontSize: 11,
        color: theme.colors.textSecondary,
        marginTop: 1,
    },
    unreadDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
    },
    cardMessage: {
        fontSize: 13,
        color: theme.colors.textSecondary,
        lineHeight: 18,
        marginBottom: theme.spacing.sm,
    },
    cardFooter: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingTop: theme.spacing.xs,
        borderTopWidth: 1,
        borderTopColor: theme.colors.border,
    },
    deleteBtn: {
        padding: 4,
    },
}));
