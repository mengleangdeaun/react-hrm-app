import React, { useState, useCallback, useMemo } from 'react';
import {
    View,
    ScrollView,
    SectionList,
    TouchableOpacity,
    RefreshControl,
    Alert,
} from 'react-native';
import { StyleSheet, useUnistyles } from 'react-native-unistyles';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { isToday, isYesterday, isThisWeek, isSameMonth, subMonths, parseISO, isValid, formatRelativeTime } from '../../utils/dateTime';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { notificationApi, NotificationItem, CelebrantItem } from '../../api/notification';
import { useAppTheme } from '../../context/ThemeContext';
import { useTranslation } from '../../context/LanguageContext';
import { AppText as Text } from '../../components/AppText';
import { AppShell } from '../../components/common/AppShell';
import { HeaderIconButton } from '../../components/common/AppHeader';
import { NotificationListSkeleton } from '../../components/common/Skeletons';
import { EmptyState } from '../../components/common/EmptyState';
import { CelebrationNotificationHeader } from '../../components/notifications/CelebrationNotificationHeader';
import {
    Bell,
    CheckCheck,
    Trash2,
    Calendar,
    Cake,
    PartyPopper,
    Megaphone,
} from 'lucide-react-native';

const CATEGORY_FILTERS = [
    { id: 'all', labelKey: 'tab_all', fallback: 'All' },
    { id: 'announcement', labelKey: 'tab_announcement', fallback: 'Announcement' },
    { id: 'leave', labelKey: 'tab_leave', fallback: 'Leave' },
    { id: 'birthday', labelKey: 'tab_birthday', fallback: 'Birthday' },
    { id: 'anniversary', labelKey: 'tab_anniversary', fallback: 'Anniversary' },
    { id: 'other', labelKey: 'tab_other', fallback: 'Other' },
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
    const thisMonthItems: NotificationItem[] = [];
    const lastMonthItems: NotificationItem[] = [];
    const olderItems: NotificationItem[] = [];

    const now = new Date();
    const prevMonth = subMonths(now, 1);

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
            } else if (isSameMonth(d, now)) {
                thisMonthItems.push(item);
            } else if (isSameMonth(d, prevMonth)) {
                lastMonthItems.push(item);
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
    if (thisMonthItems.length > 0) groups.push({ titleKey: 'this_month', fallbackTitle: 'This Month', data: thisMonthItems });
    if (lastMonthItems.length > 0) groups.push({ titleKey: 'last_month', fallbackTitle: 'Last Month', data: lastMonthItems });
    if (olderItems.length > 0) groups.push({ titleKey: 'earlier', fallbackTitle: 'Earlier', data: olderItems });
    return groups;
};

const getNotifData = (item: NotificationItem): Record<string, any> => {
    const d = item.data;
    if (!d) return {};
    if (typeof d === 'string') {
        try {
            return JSON.parse(d);
        } catch {
            return {};
        }
    }
    if (d.data && typeof d.data === 'object') {
        return d.data;
    }
    return d;
};

const getNotificationCategory = (item: NotificationItem): string => {
    const data = getNotifData(item);
    const typeStr = (item.type || '').toLowerCase();
    const dataTypeStr = (data?.type || '').toLowerCase();
    const dataCatStr = (data?.category || '').toLowerCase();

    if (
        dataCatStr === 'celebration' ||
        dataTypeStr === 'birthday' ||
        dataTypeStr === 'anniversary' ||
        typeStr.includes('birthday') ||
        typeStr.includes('anniversary')
    ) {
        if (dataTypeStr === 'birthday' || typeStr.includes('birthday')) return 'birthday';
        if (dataTypeStr === 'anniversary' || typeStr.includes('anniversary')) return 'anniversary';
        return 'birthday';
    }

    if (typeStr === 'announcement' || typeStr.includes('announcement') || dataTypeStr === 'announcement') {
        return 'announcement';
    }
    if (typeStr.includes('leave') || dataTypeStr.includes('leave')) {
        return 'leave';
    }

    return 'other';
};

export const NotificationListScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
    const insets = useSafeAreaInsets();
    const { primaryColor } = useAppTheme();
    const { t, locale } = useTranslation();
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
        staleTime: 1000 * 60 * 10,
    });

    // 10-minute React Query Caching for Team Celebrations
    const { data: celebrations = [] } = useQuery<CelebrantItem[]>({
        queryKey: ['celebrationsList'],
        queryFn: async () => {
            const celebRes = await notificationApi.getCelebrations();
            return Array.isArray(celebRes) ? celebRes : [];
        },
        staleTime: 1000 * 60 * 10,
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

        const data = getNotifData(item);
        const type = (item.type || '').toLowerCase();
        const dataType = (data?.type || '').toLowerCase();
        const isQuiz = type.includes('quiz') || dataType.includes('quiz');
        const category = getNotificationCategory(item);

        if (isQuiz) {
            const quizId = data?.quiz_id || data?.target_id || data?.id;
            if (quizId) {
                navigation.navigate('TakeQuiz', { quizId });
            } else {
                navigation.navigate('QuizList');
            }
        } else if (category === 'leave') {
            navigation.navigate('LeaveList');
        } else if (category === 'birthday' || category === 'anniversary' || type.includes('celebration')) {
            const celebrantId = data?.celebrant_id || data?.employee_id || data?.user_id;
            if (celebrantId) {
                navigation.navigate('CelebrationWish', {
                    id: celebrantId,
                    celebrantId,
                    type: category === 'anniversary' ? 'anniversary' : 'birthday',
                });
            } else {
                navigation.navigate('CelebrationWish');
            }
        } else {
            const targetAnnouncementId =
                item.announcement_id ||
                data?.announcement_id ||
                data?.id ||
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

    const renderNotificationText = useCallback(
        (text?: string, data?: any) => {
            if (!text) return '';
            const d = getNotifData({ data } as any);
            const placeholders = d?.placeholders || {};
            const finalPlaceholders = { ...placeholders };
            if (Array.isArray(placeholders.days)) {
                finalPlaceholders.days = placeholders.days
                    .map((dName: string) => t(dName.toLowerCase(), dName))
                    .join(', ');
            }
            return t(text, text, { ...d, ...finalPlaceholders });
        },
        [t]
    );

    const filteredNotifications = useMemo(() => {
        if (selectedCategory === 'all') return notifications;
        return notifications.filter((item) => getNotificationCategory(item) === selectedCategory);
    }, [notifications, selectedCategory]);

    const groupedData = useMemo(() => groupNotificationsByDate(filteredNotifications), [filteredNotifications]);

    const getCategoryConfig = useCallback(
        (category: string) => {
            switch (category) {
                case 'leave':
                    return {
                        icon: <Calendar color={theme.colors.status.info} size={18} />,
                        bg: theme.colors.status.infoSubtle,
                        border: theme.colors.status.infoBorder,
                    };
                case 'birthday':
                    return {
                        icon: <Cake color="#EC4899" size={18} />,
                        bg: theme.colors.status.pinkSubtle,
                        border: theme.colors.status.pinkBorder,
                    };
                case 'anniversary':
                    return {
                        icon: <PartyPopper color="#F59E0B" size={18} />,
                        bg: theme.colors.status.warningSubtle,
                        border: theme.colors.status.warningBorder,
                    };
                case 'announcement':
                    return {
                        icon: <Megaphone color={theme.colors.brand} size={18} />,
                        bg: theme.colors.brandSubtle,
                        border: 'rgba(223, 0, 0, 0.2)',
                    };
                default:
                    return {
                        icon: <Bell color={theme.colors.brand} size={18} />,
                        bg: theme.colors.brandSubtle,
                        border: 'rgba(223, 0, 0, 0.2)',
                    };
            }
        },
        [theme]
    );

    const hasBirthdayToday = celebrations.some((c) => c.type === 'birthday');
    const hasAnniversaryToday = celebrations.some(
        (c) => c.type === 'anniversary' || (c.type as string) === 'work_anniversary'
    );

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
                style={{ marginLeft: 8 }}
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
                    const showBirthdayDot = cat.id === 'birthday' && hasBirthdayToday;
                    const showAnniversaryDot = cat.id === 'anniversary' && hasAnniversaryToday;

                    return (
                        <TouchableOpacity
                            key={cat.id}
                            style={[
                                styles.tabItem,
                                isActive
                                    ? { backgroundColor: theme.colors.brand, borderColor: theme.colors.brand }
                                    : { backgroundColor: theme.colors.surfaceSubtle, borderColor: theme.colors.border },
                            ]}
                            onPress={() => setSelectedCategory(cat.id)}
                            activeOpacity={0.7}
                        >
                            <View style={styles.tabLabelRow}>
                                <Text
                                    style={[
                                        styles.tabLabel,
                                        { color: isActive ? '#FFFFFF' : theme.colors.textSecondary },
                                        isActive && { fontWeight: '700' },
                                    ]}
                                >
                                    {t(cat.labelKey, cat.fallback)}
                                </Text>

                                {/* Smart Indicator Dot for Celebrations */}
                                {showBirthdayDot && (
                                    <View style={[styles.smartDot, { backgroundColor: isActive ? '#FFFFFF' : '#EC4899' }]} />
                                )}
                                {showAnniversaryDot && (
                                    <View style={[styles.smartDot, { backgroundColor: isActive ? '#FFFFFF' : '#F59E0B' }]} />
                                )}
                            </View>
                        </TouchableOpacity>
                    );
                })}
            </ScrollView>
        </View>
    );

    const keyExtractor = useCallback((item: NotificationItem) => String(item.id), []);

    const renderItem = useCallback(
        ({ item }: { item: NotificationItem }) => {
            const isUnread = !item.read_at;
            const itemCat = getNotificationCategory(item);
            const catConfig = getCategoryConfig(itemCat);
            const relativeDate = formatRelativeTime(item.created_at, locale);
            const titleText = renderNotificationText(item.title, item.data);
            const messageText = renderNotificationText(item.message, item.data);

            return (
                <TouchableOpacity
                    style={[
                        styles.card,
                        isUnread && styles.unreadCard,
                    ]}
                    onPress={() => handleItemPress(item)}
                    activeOpacity={0.7}
                >
                    <View style={styles.cardRow}>
                        {/* Left Column: Icon + Timeline Timestamp */}
                        <View style={styles.leftCol}>
                            <View style={[styles.iconBg, { backgroundColor: catConfig.bg, borderColor: catConfig.border }]}>
                                {catConfig.icon}
                            </View>
                            <Text style={styles.dateUnderIcon} numberOfLines={2}>
                                {relativeDate}
                            </Text>
                        </View>

                        {/* Right Column: Title, Actions & Message */}
                        <View style={styles.contentCol}>
                            <View style={styles.cardTitleRow}>
                                <View style={styles.titleWithBadge}>
                                    <Text style={[styles.cardTitle, isUnread && styles.unreadCardTitle]} numberOfLines={1}>
                                        {titleText}
                                    </Text>
                                    {isUnread && (
                                        <View style={[styles.unreadBadge, { backgroundColor: theme.colors.brand }]}>
                                            <Text style={styles.unreadBadgeText}>{t('new_badge', 'NEW')}</Text>
                                        </View>
                                    )}
                                </View>

                                <TouchableOpacity
                                    style={styles.deleteBtn}
                                    onPress={() => handleDeleteItem(item.id)}
                                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                                    accessibilityLabel="Delete notification"
                                >
                                    <Trash2 color={theme.colors.textMuted} size={15} />
                                </TouchableOpacity>
                            </View>

                            {messageText ? (
                                <Text
                                    style={[
                                        styles.cardMessage,
                                        isUnread ? { color: theme.colors.textPrimary } : { color: theme.colors.textSecondary },
                                    ]}
                                    numberOfLines={2}
                                >
                                    {messageText}
                                </Text>
                            ) : null}
                        </View>
                    </View>
                </TouchableOpacity>
            );
        },
        [theme, styles, locale, renderNotificationText, getCategoryConfig]
    );

    const renderSectionHeader = useCallback(
        ({ section: { titleKey, fallbackTitle } }: any) => (
            <Text style={styles.dateSectionHeader}>
                {t(titleKey, fallbackTitle)}
            </Text>
        ),
        [styles, t]
    );

    const celebrationHeader = (
        <CelebrationNotificationHeader
            activeTab={selectedCategory}
            celebrants={celebrations}
            loading={isLoadingNotifs}
            onCelebrantPress={(person) =>
                navigation.navigate('CelebrationWish', {
                    celebrant: person,
                    id: person.id,
                    celebrantId: person.id,
                    type: person.type,
                })
            }
        />
    );

    const emptyStateComponent = (
        isLoadingNotifs ? (
            <NotificationListSkeleton />
        ) : (
            <View style={styles.emptyContainer}>
                <EmptyState
                    icon={<Bell color={theme.colors.textSecondary} size={36} />}
                    title={t('nothing_here_yet', 'No Notifications')}
                    description={t('everything_up_to_date', 'You are all caught up! No active notifications found.')}
                />
            </View>
        )
    );

    return (
        <AppShell
            title={t('notification', 'Notifications')}
            onBack={navigation.canGoBack() ? () => navigation.goBack() : undefined}
            headerRight={headerRight}
            subHeader={subHeader}
            scrollable={false}
            hasTabBar={!navigation.canGoBack()}
        >
            <SectionList
                sections={isLoadingNotifs ? [] : groupedData}
                keyExtractor={keyExtractor}
                renderItem={renderItem}
                renderSectionHeader={renderSectionHeader}
                contentContainerStyle={[
                    styles.scrollContent,
                    { paddingBottom: !navigation.canGoBack() ? 16 : Math.max(16, insets.bottom + 12) },
                ]}
                stickySectionHeadersEnabled={false}
                showsVerticalScrollIndicator={false}
                ListHeaderComponent={celebrationHeader}
                ListEmptyComponent={emptyStateComponent}
                refreshControl={
                    <RefreshControl
                        refreshing={refreshing || isFetchingNotifs}
                        onRefresh={onRefresh}
                        tintColor={primaryColor}
                    />
                }
            />
        </AppShell>
    );
};

const stylesheet = StyleSheet.create((theme) => ({
    scrollContent: {
        flexGrow: 1,
        paddingHorizontal: theme.spacing.screenGutter,
        paddingTop: theme.spacing.screenGutter,
        paddingBottom: theme.spacing.lg,
    },
    emptyContainer: {
        paddingVertical: 40,
        width: '100%',
        alignItems: 'center',
        justifyContent: 'center',
    },
    headerRightRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    tabBarContainer: {
        backgroundColor: theme.colors.surface,
        borderBottomWidth: 1,
        borderBottomColor: theme.colors.border,
        overflow: 'hidden',
    },
    tabBarScrollContent: {
        paddingHorizontal: theme.spacing.screenGutter,
        paddingVertical: 10,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    tabItem: {
        paddingHorizontal: 12,
        paddingVertical: 8,
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: 20,
        borderWidth: 1,
    },
    tabLabelRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 5,
    },
    tabLabel: {
        fontSize: 12,
        fontWeight: '600',
        letterSpacing: 0.2,
    },
    smartDot: {
        width: 6,
        height: 6,
        borderRadius: 3,
    },
    dateSectionHeader: {
        fontSize: 11,
        fontWeight: '700',
        textTransform: 'uppercase',
        letterSpacing: 0.6,
        color: theme.colors.textSecondary,
        marginBottom: 8,
        marginTop: 14,
    },
    card: {
        backgroundColor: theme.colors.surface,
        borderRadius: 16,
        marginBottom: 10,
        borderWidth: 1,
        borderColor: theme.colors.border,
        paddingVertical: 14,
        paddingHorizontal: 14,
    },
    unreadCard: {
        borderColor: 'rgba(223, 0, 0, 0.28)',
        backgroundColor: theme.colors.surface,
    },
    cardRow: {
        flexDirection: 'row',
        alignItems: 'flex-start',
    },
    leftCol: {
        width: 46,
        alignItems: 'center',
        marginRight: 10,
    },
    iconBg: {
        width: 38,
        height: 38,
        borderRadius: 11,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
    },
    dateUnderIcon: {
        fontSize: 9.5,
        fontWeight: '700',
        color: theme.colors.textMuted,
        marginTop: 4,
        textAlign: 'center',
        letterSpacing: -0.1,
    },
    contentCol: {
        flex: 1,
        minWidth: 0,
        paddingTop: 1,
    },
    cardTitleRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 3,
    },
    titleWithBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        flex: 1,
        marginRight: 8,
    },
    cardTitle: {
        fontSize: 13.5,
        fontWeight: '600',
        color: theme.colors.textPrimary,
        flexShrink: 1,
    },
    unreadCardTitle: {
        fontWeight: '700',
    },
    unreadBadge: {
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 10,
        alignItems: 'center',
        justifyContent: 'center',
    },
    unreadBadgeText: {
        color: '#FFFFFF',
        fontSize: 8.5,
        fontWeight: '900',
        letterSpacing: 0.5,
    },
    cardMessage: {
        fontSize: 12.5,
        color: theme.colors.textSecondary,
        lineHeight: 18,
    },
    deleteBtn: {
        padding: 4,
        justifyContent: 'center',
        alignItems: 'center',
        borderRadius: 8,
    },
}));
