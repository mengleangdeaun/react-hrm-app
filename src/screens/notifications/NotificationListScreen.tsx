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
import { isToday, isYesterday, isThisWeek, parseISO, isValid, formatRelativeTime } from '../../utils/dateTime';
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
    ChevronRight,
    CheckCheck,
    Trash2,
    Calendar,
    Cake,
    PartyPopper,
    AlertTriangle,
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

    const getCategoryIcon = (category: string) => {
        if (category === 'leave') return <Calendar color={primaryColor} size={18} />;
        if (category === 'birthday') return <Cake color="#EC4899" size={18} />;
        if (category === 'anniversary') return <PartyPopper color="#F59E0B" size={18} />;
        if (category === 'announcement') return <Megaphone color={primaryColor} size={18} />;
        return <Bell color={primaryColor} size={18} />;
    };

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
                    const showBirthdayDot = cat.id === 'birthday' && hasBirthdayToday;
                    const showAnniversaryDot = cat.id === 'anniversary' && hasAnniversaryToday;

                    return (
                        <TouchableOpacity
                            key={cat.id}
                            style={[
                                styles.tabItem,
                                isActive && { backgroundColor: primaryColor },
                            ]}
                            onPress={() => setSelectedCategory(cat.id)}
                            activeOpacity={0.8}
                        >
                            <View style={styles.tabLabelRow}>
                                <Text
                                    style={[
                                        styles.tabLabel,
                                        isActive && { color: '#FFFFFF', fontWeight: '800' },
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
            const relativeDate = formatRelativeTime(item.created_at, locale);
            const titleText = renderNotificationText(item.title, item.data);
            const messageText = renderNotificationText(item.message, item.data);

            return (
                <TouchableOpacity
                    style={[
                        styles.card,
                        isUnread && [
                            styles.unreadCard,
                            { borderColor: `${primaryColor}35`, backgroundColor: `${primaryColor}0C` },
                        ],
                    ]}
                    onPress={() => handleItemPress(item)}
                    activeOpacity={0.8}
                >
                    {/* Bold left accent bar — instantly signals unread */}
                    {isUnread && <View style={[styles.unreadAccentBar, { backgroundColor: primaryColor }]} />}

                    <View style={styles.cardInner}>
                        <View style={styles.cardHeader}>
                            <View style={[
                                styles.iconBg,
                                isUnread && { backgroundColor: `${primaryColor}18`, borderColor: `${primaryColor}35` },
                            ]}>
                                {getCategoryIcon(itemCat)}
                            </View>

                            <View style={styles.headerTextGroup}>
                                <Text style={[styles.cardTitle, isUnread && styles.unreadCardTitle]} numberOfLines={1}>
                                    {titleText}
                                </Text>
                                <Text style={styles.cardDate}>{relativeDate}</Text>
                            </View>

                            {isUnread && (
                                <View style={[styles.unreadBadge, { backgroundColor: primaryColor }]}>
                                    <Text style={styles.unreadBadgeText}>NEW</Text>
                                </View>
                            )}
                        </View>

                        <Text
                            style={[
                                styles.cardMessage,
                                isUnread && { color: theme.colors.textPrimary, opacity: 0.8 },
                            ]}
                            numberOfLines={2}
                        >
                            {messageText}
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
                    </View>
                </TouchableOpacity>
            );
        },
        [primaryColor, theme, styles, locale, renderNotificationText]
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
            title={t('noti', 'Notifications')}
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
        paddingTop: theme.spacing.md,
        paddingBottom: theme.spacing.lg,
    },
    emptyContainer: {
        paddingTop: theme.spacing.xl,
        paddingBottom: theme.spacing.xxl,
        width: '100%',
        alignItems: 'center',
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
        paddingHorizontal: theme.spacing.md,
        paddingVertical: theme.spacing.xs + 2,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    tabItem: {
        paddingHorizontal: theme.spacing.md,
        paddingVertical: theme.spacing.xs + 3,
        alignItems: 'center',
        borderRadius: 20,
    },
    tabLabelRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 5,
    },
    tabLabel: {
        fontSize: 12,
        fontWeight: '700',
        color: theme.colors.textSecondary,
        textTransform: 'uppercase',
        letterSpacing: 0.4,
    },
    smartDot: {
        width: 6,
        height: 6,
        borderRadius: 3,
    },
    dateSectionHeader: {
        fontSize: 11,
        fontWeight: '800',
        textTransform: 'uppercase',
        letterSpacing: 0.8,
        color: theme.colors.textSecondary,
        marginBottom: theme.spacing.xs + 2,
        marginTop: theme.spacing.xs,
    },
    card: {
        backgroundColor: theme.colors.surface,
        borderRadius: theme.borderRadius.lg,
        marginBottom: theme.spacing.sm + 4,
        borderWidth: 1,
        borderColor: theme.colors.border,
        overflow: 'hidden',
        ...theme.shadows.sm,
    },
    unreadCard: {
        borderWidth: 1.5,
    },
    unreadAccentBar: {
        position: 'absolute',
        top: 0,
        left: 0,
        bottom: 0,
        width: 4,
    },
    cardInner: {
        padding: theme.spacing.md,
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
    unreadBadge: {
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 20,
        alignItems: 'center',
        justifyContent: 'center',
        marginLeft: 6,
    },
    unreadBadgeText: {
        color: '#FFFFFF',
        fontSize: 9,
        fontWeight: '900',
        letterSpacing: 0.8,
        textTransform: 'uppercase',
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
