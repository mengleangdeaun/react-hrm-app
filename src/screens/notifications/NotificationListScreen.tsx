import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    ScrollView,
    TouchableOpacity,
    SafeAreaView,
    StatusBar,
    ActivityIndicator,
    RefreshControl,
    Alert,
    Image,
} from 'react-native';
import { StyleSheet, useUnistyles } from 'react-native-unistyles';
import { notificationApi, NotificationItem, CelebrantItem } from '../../api/notification';
import { useAppTheme } from '../../context/ThemeContext';
import {
    Bell,
    ChevronRight,
    ArrowLeft,
    CheckCheck,
    Trash2,
    Gift,
    Calendar,
    AlertTriangle,
    Info,
    PartyPopper,
} from 'lucide-react-native';

const CATEGORY_FILTERS = [
    { id: 'all', label: 'All Alerts' },
    { id: 'announcement', label: 'Announcements' },
    { id: 'leave', label: 'Leave Updates' },
    { id: 'celebration', label: 'Celebrations' },
    { id: 'system', label: 'System' },
];

export const NotificationListScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
    const { isDark } = useAppTheme();
    const { theme } = useUnistyles();
    const styles = stylesheet;

    const [selectedCategory, setSelectedCategory] = useState<string>('all');
    const [notifications, setNotifications] = useState<NotificationItem[]>([]);
    const [celebrations, setCelebrations] = useState<CelebrantItem[]>([]);
    const [isLoading, setIsLoading] = useState<boolean>(true);
    const [refreshing, setRefreshing] = useState<boolean>(false);

    useEffect(() => {
        loadData();
    }, [selectedCategory]);

    const loadData = async () => {
        try {
            setIsLoading(true);

            // Fetch active team celebrations
            const celebRes = await notificationApi.getCelebrations().catch(() => []);
            if (Array.isArray(celebRes)) setCelebrations(celebRes);

            // Fetch notifications
            const notifRes = await notificationApi.getNotifications().catch(() => null);
            const list = Array.isArray(notifRes) ? notifRes : Array.isArray(notifRes?.data) ? notifRes.data : [];

            setNotifications(list);
        } catch (error) {
            console.warn('Failed to load notifications:', error);
            // Fallback demo data
            setNotifications([
                {
                    id: '101',
                    type: 'announcement',
                    title: 'Mid-Year Performance Review Schedule',
                    message: 'All department reviews will be conducted starting next Monday. Please submit self-assessments.',
                    read_at: null,
                    created_at: '10:00 AM',
                },
                {
                    id: '102',
                    type: 'leave',
                    title: 'Leave Request Approved',
                    message: 'Your Annual leave application for Aug 10 - Aug 12 has been approved by HR Manager.',
                    read_at: '2026-07-21T15:30:00Z',
                    created_at: 'Yesterday',
                },
                {
                    id: '103',
                    type: 'celebration',
                    title: 'Happy Birthday Alex Smith! 🎉',
                    message: 'Wish Alex Smith a very Happy Birthday today!',
                    read_at: null,
                    created_at: 'Jul 21',
                },
            ]);
        } finally {
            setIsLoading(false);
            setRefreshing(false);
        }
    };

    const onRefresh = () => {
        setRefreshing(true);
        loadData();
    };

    const handleMarkAllRead = async () => {
        try {
            await notificationApi.markAllAsRead();
            setNotifications((prev) => prev.map((item) => ({ ...item, read_at: new Date().toISOString() })));
        } catch (err) {
            console.warn('Failed to mark all as read', err);
        }
    };

    const handleClearAll = () => {
        Alert.alert('Clear All Notifications', 'Are you sure you want to delete all notifications?', [
            { text: 'Cancel', style: 'cancel' },
            {
                text: 'Clear All',
                style: 'destructive',
                onPress: async () => {
                    try {
                        await notificationApi.deleteAllNotifications();
                        setNotifications([]);
                    } catch (err) {
                        console.warn('Failed to clear notifications', err);
                    }
                },
            },
        ]);
    };

    const handleItemPress = async (item: NotificationItem) => {
        if (!item.read_at) {
            notificationApi.markAsRead(item.id).catch(() => null);
            setNotifications((prev) =>
                prev.map((n) => (n.id === item.id ? { ...n, read_at: new Date().toISOString() } : n))
            );
        }

        const type = (item.type || '').toLowerCase();
        if (type.includes('leave')) {
            navigation.navigate('LeaveList');
        } else if (type.includes('celebration')) {
            navigation.navigate('WishesInbox');
        } else {
            navigation.navigate('AnnouncementDetail', { id: item.id, notification: item });
        }
    };

    const handleDeleteItem = async (id: string | number) => {
        try {
            await notificationApi.deleteNotification(id);
            setNotifications((prev) => prev.filter((n) => n.id !== id));
        } catch (err) {
            console.warn('Delete failed', err);
        }
    };

    const filteredNotifications = notifications.filter((item) => {
        if (selectedCategory === 'all') return true;
        const t = (item.type || '').toLowerCase();
        return t.includes(selectedCategory);
    });

    const getCategoryIcon = (typeStr: string) => {
        const t = (typeStr || '').toLowerCase();
        if (t.includes('leave')) return <Calendar color={theme.colors.primary} size={18} />;
        if (t.includes('celebration')) return <Gift color="#EC4899" size={18} />;
        if (t.includes('system') || t.includes('alert')) return <AlertTriangle color="#F59E0B" size={18} />;
        return <Bell color={theme.colors.primary} size={18} />;
    };

    return (
        <SafeAreaView style={styles.safeArea}>
            <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />

            {/* Navigation Header */}
            <View style={styles.topBar}>
                <TouchableOpacity style={styles.iconCircle} onPress={() => navigation.goBack()} activeOpacity={0.7}>
                    <ArrowLeft color={theme.colors.textPrimary} size={20} />
                </TouchableOpacity>

                <Text style={styles.headerTitle}>Notifications Center</Text>

                <View style={styles.headerActions}>
                    <TouchableOpacity style={styles.iconCircle} onPress={handleMarkAllRead} activeOpacity={0.7}>
                        <CheckCheck color={theme.colors.primary} size={18} />
                    </TouchableOpacity>

                    <TouchableOpacity style={styles.iconCircle} onPress={handleClearAll} activeOpacity={0.7}>
                        <Trash2 color={theme.colors.status.danger} size={18} />
                    </TouchableOpacity>
                </View>
            </View>

            <ScrollView
                style={styles.container}
                contentContainerStyle={styles.scrollContent}
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.colors.primary} />
                }
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
                                {celebrations.length} Team Celebration{celebrations.length > 1 ? 's' : ''} Today! 🎉
                            </Text>
                            <Text style={styles.celebrationSub}>
                                {celebrations.map((c) => c.name).join(', ')} • Send wishes
                            </Text>
                        </View>
                        <ChevronRight color="#EC4899" size={18} />
                    </TouchableOpacity>
                )}

                {/* Category Filter Chips */}
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterBar}>
                    {CATEGORY_FILTERS.map((cat) => (
                        <TouchableOpacity
                            key={cat.id}
                            style={[
                                styles.filterChip,
                                selectedCategory === cat.id && styles.filterChipActive,
                            ]}
                            onPress={() => setSelectedCategory(cat.id)}
                            activeOpacity={0.8}
                        >
                            <Text
                                style={[
                                    styles.filterChipText,
                                    selectedCategory === cat.id && styles.filterChipTextActive,
                                ]}
                            >
                                {cat.label}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </ScrollView>

                {/* Notifications List */}
                {isLoading ? (
                    <View style={styles.loadingContainer}>
                        <ActivityIndicator size="large" color={theme.colors.primary} />
                    </View>
                ) : filteredNotifications.length === 0 ? (
                    <View style={styles.emptyCard}>
                        <Bell color={theme.colors.textSecondary} size={44} />
                        <Text style={styles.emptyTitle}>No Notifications</Text>
                        <Text style={styles.emptySub}>You are all caught up! No active notifications found.</Text>
                    </View>
                ) : (
                    filteredNotifications.map((item) => {
                        const isUnread = !item.read_at;
                        return (
                            <TouchableOpacity
                                key={item.id}
                                style={[styles.card, isUnread && styles.unreadCard]}
                                onPress={() => handleItemPress(item)}
                                activeOpacity={0.8}
                            >
                                <View style={styles.cardHeader}>
                                    <View style={styles.iconBg}>{getCategoryIcon(item.type)}</View>

                                    <View style={styles.headerTextGroup}>
                                        <Text style={[styles.cardTitle, isUnread && styles.unreadCardTitle]} numberOfLines={1}>
                                            {item.title}
                                        </Text>
                                        <Text style={styles.cardDate}>{item.created_at || 'Recent'}</Text>
                                    </View>

                                    {isUnread && <View style={styles.unreadDot} />}
                                </View>

                                <Text style={styles.cardMessage} numberOfLines={2}>
                                    {item.message}
                                </Text>

                                <View style={styles.cardFooter}>
                                    <TouchableOpacity
                                        style={styles.deleteBtn}
                                        onPress={() => handleDeleteItem(item.id)}
                                    >
                                        <Trash2 color={theme.colors.textSecondary} size={14} />
                                    </TouchableOpacity>
                                    <ChevronRight color={theme.colors.textSecondary} size={16} />
                                </View>
                            </TouchableOpacity>
                        );
                    })
                )}
            </ScrollView>
        </SafeAreaView>
    );
};

const stylesheet = StyleSheet.create((theme) => ({
    safeArea: {
        flex: 1,
        backgroundColor: theme.colors.background,
    },
    topBar: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: theme.spacing.md + 4,
        paddingVertical: theme.spacing.md,
    },
    iconCircle: {
        width: 40,
        height: 40,
        borderRadius: theme.borderRadius.md,
        backgroundColor: theme.colors.surfaceSubtle,
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
        gap: theme.spacing.xs + 2,
    },
    container: {
        flex: 1,
    },
    scrollContent: {
        paddingHorizontal: theme.spacing.md + 4,
        paddingBottom: theme.spacing.xl,
    },
    celebrationBanner: {
        backgroundColor: 'rgba(236, 72, 153, 0.1)',
        borderRadius: theme.borderRadius.lg,
        padding: theme.spacing.md,
        flexDirection: 'row',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: 'rgba(236, 72, 153, 0.2)',
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
    filterBar: {
        flexDirection: 'row',
        marginBottom: theme.spacing.md,
    },
    filterChip: {
        paddingHorizontal: theme.spacing.md,
        paddingVertical: theme.spacing.xs + 2,
        borderRadius: theme.borderRadius.md,
        backgroundColor: theme.colors.surfaceSubtle,
        borderWidth: 1,
        borderColor: theme.colors.border,
        marginRight: theme.spacing.xs + 2,
    },
    filterChipActive: {
        backgroundColor: theme.colors.primary,
        borderColor: theme.colors.primary,
    },
    filterChipText: {
        fontSize: 12,
        fontWeight: '600',
        color: theme.colors.textSecondary,
    },
    filterChipTextActive: {
        color: '#FFFFFF',
    },
    loadingContainer: {
        paddingVertical: theme.spacing.xxl,
        alignItems: 'center',
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
    },
    card: {
        backgroundColor: theme.colors.surface,
        borderRadius: theme.borderRadius.lg,
        padding: theme.spacing.md,
        marginBottom: theme.spacing.md,
        borderWidth: 1,
        borderColor: theme.colors.border,
        ...theme.shadows.sm,
    },
    unreadCard: {
        borderColor: theme.colors.primary,
        backgroundColor: 'rgba(37, 99, 235, 0.03)',
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
    },
    headerTextGroup: {
        flex: 1,
        marginLeft: theme.spacing.sm,
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
        backgroundColor: theme.colors.primary,
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
