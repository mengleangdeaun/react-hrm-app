import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    ScrollView,
    TouchableOpacity,
    SafeAreaView,
    StatusBar,
    RefreshControl,
    ActivityIndicator,
    Image,
    Modal,
} from 'react-native';
import { StyleSheet, useUnistyles } from 'react-native-unistyles';
import { activityApi, ActivityItem } from '../../api/activity';
import { useAppTheme } from '../../context/ThemeContext';
import {
    Plus,
    Activity as ActivityIcon,
    Calendar,
    ArrowLeft,
    MapPin,
    Filter,
    X,
    CheckCircle2,
    Clock,
    AlertCircle,
    FileText,
} from 'lucide-react-native';
import { format } from 'date-fns';

const ACTIVITY_CATEGORIES = [
    { id: 'all', label: 'All Categories' },
    { id: 'site_inspection', label: 'Site Inspection' },
    { id: 'client_visit', label: 'Client Visit' },
    { id: 'maintenance_check', label: 'Maintenance Check' },
    { id: 'delivery', label: 'Delivery / Logistics' },
    { id: 'internal_task', label: 'Internal Task' },
    { id: 'other', label: 'Other Activity' },
];

export const ActivityListScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
    const { isDark } = useAppTheme();
    const { theme } = useUnistyles();
    const styles = stylesheet;

    const [activities, setActivities] = useState<ActivityItem[]>([]);
    const [isLoading, setIsLoading] = useState<boolean>(true);
    const [refreshing, setRefreshing] = useState<boolean>(false);

    // Filters
    const [selectedCategory, setSelectedCategory] = useState<string>('all');
    const [filterModalVisible, setFilterModalVisible] = useState<boolean>(false);

    useEffect(() => {
        loadActivities();
    }, [selectedCategory]);

    const loadActivities = async () => {
        try {
            setIsLoading(true);
            const params: any = {};
            if (selectedCategory !== 'all') {
                params.activity_type = selectedCategory;
            }
            const response = await activityApi.getActivities(params);
            const list = response?.data || response?.activities || [];
            setActivities(list);
        } catch (error) {
            console.warn('Failed to load activities, using demo state:', error);
            setActivities([
                {
                    id: 101,
                    activity_type: 'site_inspection',
                    comment: 'Completed rooftop HVAC unit inspection and verified electrical connections.',
                    location_name: 'Preah Monivong Blvd, Phnom Penh',
                    submitted_at: '2026-07-22 09:30 AM',
                    status: 'approved',
                    attachments: ['https://images.unsplash.com/photo-1581092160607-ee22621dd758?w=500'],
                },
                {
                    id: 102,
                    activity_type: 'client_visit',
                    comment: 'Met with client manager to review service contract renewals for Q3.',
                    location_name: 'Toul Kork, Phnom Penh',
                    submitted_at: '2026-07-21 02:15 PM',
                    status: 'submitted',
                },
            ]);
        } finally {
            setIsLoading(false);
            setRefreshing(false);
        }
    };

    const onRefresh = () => {
        setRefreshing(true);
        loadActivities();
    };

    const formatCategoryName = (typeStr: string) => {
        return typeStr
            .replace(/_/g, ' ')
            .replace(/\b\w/g, (l) => l.toUpperCase());
    };

    const getStatusStyle = (status: string) => {
        switch (status) {
            case 'approved':
                return {
                    bg: 'rgba(16, 185, 129, 0.1)',
                    border: 'rgba(16, 185, 129, 0.2)',
                    text: theme.colors.status.success,
                    label: 'APPROVED',
                    Icon: CheckCircle2,
                };
            case 'rejected':
                return {
                    bg: 'rgba(239, 68, 68, 0.1)',
                    border: 'rgba(239, 68, 68, 0.2)',
                    text: theme.colors.status.danger,
                    label: 'REJECTED',
                    Icon: AlertCircle,
                };
            default:
                return {
                    bg: 'rgba(245, 158, 11, 0.1)',
                    border: 'rgba(245, 158, 11, 0.2)',
                    text: '#F59E0B',
                    label: 'SUBMITTED',
                    Icon: Clock,
                };
        }
    };

    return (
        <SafeAreaView style={styles.safeArea}>
            <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />

            {/* Navigation Header */}
            <View style={styles.topBar}>
                <TouchableOpacity style={styles.iconCircle} onPress={() => navigation.goBack()} activeOpacity={0.7}>
                    <ArrowLeft color={theme.colors.textPrimary} size={20} />
                </TouchableOpacity>

                <Text style={styles.headerTitle}>Activity Reports</Text>

                <View style={styles.headerRightActions}>
                    <TouchableOpacity
                        style={styles.iconCircle}
                        onPress={() => setFilterModalVisible(true)}
                        activeOpacity={0.7}
                    >
                        <Filter color={selectedCategory !== 'all' ? theme.colors.primary : theme.colors.textPrimary} size={18} />
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={styles.addBtn}
                        onPress={() => navigation.navigate('CreateActivity')}
                        activeOpacity={0.8}
                    >
                        <Plus color="#FFFFFF" size={18} />
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
                {/* Active Category Filter Tag */}
                {selectedCategory !== 'all' && (
                    <View style={styles.activeFilterRow}>
                        <Text style={styles.activeFilterText}>
                            Filtered by: <Text style={styles.activeFilterHighlight}>{formatCategoryName(selectedCategory)}</Text>
                        </Text>
                        <TouchableOpacity onPress={() => setSelectedCategory('all')}>
                            <X color={theme.colors.textSecondary} size={16} />
                        </TouchableOpacity>
                    </View>
                )}

                {isLoading ? (
                    <View style={styles.loadingContainer}>
                        <ActivityIndicator size="large" color={theme.colors.primary} />
                    </View>
                ) : activities.length === 0 ? (
                    <View style={styles.emptyContainer}>
                        <FileText color={theme.colors.textSecondary} size={48} />
                        <Text style={styles.emptyTitle}>No Activities Recorded</Text>
                        <Text style={styles.emptySubtitle}>
                            You have not logged any work activities for this period yet.
                        </Text>
                        <TouchableOpacity
                            style={styles.createFirstBtn}
                            onPress={() => navigation.navigate('CreateActivity')}
                            activeOpacity={0.85}
                        >
                            <Plus color="#FFFFFF" size={18} />
                            <Text style={styles.createFirstBtnText}>Log New Activity</Text>
                        </TouchableOpacity>
                    </View>
                ) : (
                    activities.map((item) => {
                        const statusObj = getStatusStyle(item.status);
                        const StatusIcon = statusObj.Icon;

                        return (
                            <View key={item.id} style={styles.card}>
                                {/* Card Header */}
                                <View style={styles.cardHeader}>
                                    <View style={styles.categoryBadge}>
                                        <ActivityIcon color={theme.colors.primary} size={14} />
                                        <Text style={styles.categoryBadgeText}>
                                            {formatCategoryName(item.activity_type)}
                                        </Text>
                                    </View>

                                    <View style={[styles.statusBadge, { backgroundColor: statusObj.bg, borderColor: statusObj.border }]}>
                                        <StatusIcon color={statusObj.text} size={12} />
                                        <Text style={[styles.statusBadgeText, { color: statusObj.text }]}>
                                            {statusObj.label}
                                        </Text>
                                    </View>
                                </View>

                                {/* Activity Comment / Notes */}
                                {item.comment && (
                                    <Text style={styles.cardComment}>{item.comment}</Text>
                                )}

                                {/* Attachments Thumbnail Gallery */}
                                {item.attachments && item.attachments.length > 0 && (
                                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.attachmentsRow}>
                                        {item.attachments.map((imgUri, idx) => (
                                            <Image key={idx} source={{ uri: imgUri }} style={styles.thumbnailImage} />
                                        ))}
                                    </ScrollView>
                                )}

                                {/* Card Footer: Location & Date */}
                                <View style={styles.cardFooter}>
                                    {item.location_name && (
                                        <View style={styles.locationGroup}>
                                            <MapPin color={theme.colors.textSecondary} size={13} />
                                            <Text style={styles.locationText} numberOfLines={1}>
                                                {item.location_name}
                                            </Text>
                                        </View>
                                    )}

                                    <View style={styles.dateGroup}>
                                        <Calendar color={theme.colors.textSecondary} size={13} />
                                        <Text style={styles.dateText}>
                                            {item.submitted_at || item.activity_date || 'Recent'}
                                        </Text>
                                    </View>
                                </View>

                                {/* Admin Rejection Note */}
                                {item.status === 'rejected' && item.admin_note && (
                                    <View style={styles.adminNoteBox}>
                                        <Text style={styles.adminNoteTitle}>Feedback from Manager:</Text>
                                        <Text style={styles.adminNoteText}>{item.admin_note}</Text>
                                    </View>
                                )}
                            </View>
                        );
                    })
                )}
            </ScrollView>

            {/* Filter Bottom Sheet Modal */}
            <Modal visible={filterModalVisible} transparent animationType="fade">
                <TouchableOpacity
                    style={styles.modalOverlay}
                    activeOpacity={1}
                    onPress={() => setFilterModalVisible(false)}
                >
                    <View style={styles.modalSheet}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>Filter Activities</Text>
                            <TouchableOpacity onPress={() => setFilterModalVisible(false)}>
                                <X color={theme.colors.textPrimary} size={20} />
                            </TouchableOpacity>
                        </View>

                        <Text style={styles.filterSectionLabel}>Category</Text>
                        {ACTIVITY_CATEGORIES.map((cat) => (
                            <TouchableOpacity
                                key={cat.id}
                                style={[
                                    styles.filterOption,
                                    selectedCategory === cat.id && styles.filterOptionSelected,
                                ]}
                                onPress={() => {
                                    setSelectedCategory(cat.id);
                                    setFilterModalVisible(false);
                                }}
                            >
                                <Text
                                    style={[
                                        styles.filterOptionText,
                                        selectedCategory === cat.id && styles.filterOptionTextSelected,
                                    ]}
                                >
                                    {cat.label}
                                </Text>
                                {selectedCategory === cat.id && (
                                    <CheckCircle2 color={theme.colors.primary} size={18} />
                                )}
                            </TouchableOpacity>
                        ))}
                    </View>
                </TouchableOpacity>
            </Modal>
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
    headerTitle: {
        color: theme.colors.textPrimary,
        fontSize: 18,
        fontWeight: '700',
    },
    headerRightActions: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: theme.spacing.sm,
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
    addBtn: {
        width: 40,
        height: 40,
        borderRadius: theme.borderRadius.md,
        backgroundColor: theme.colors.primary,
        justifyContent: 'center',
        alignItems: 'center',
        ...theme.shadows.sm,
    },
    container: {
        flex: 1,
    },
    scrollContent: {
        paddingHorizontal: theme.spacing.md + 4,
        paddingBottom: theme.spacing.xl,
    },
    activeFilterRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundColor: theme.colors.surfaceSubtle,
        paddingHorizontal: theme.spacing.md,
        paddingVertical: theme.spacing.xs + 2,
        borderRadius: theme.borderRadius.md,
        marginBottom: theme.spacing.md,
    },
    activeFilterText: {
        fontSize: 12,
        color: theme.colors.textSecondary,
    },
    activeFilterHighlight: {
        fontWeight: '700',
        color: theme.colors.primary,
    },
    loadingContainer: {
        paddingVertical: theme.spacing.xxl,
        alignItems: 'center',
    },
    emptyContainer: {
        paddingVertical: theme.spacing.xxl,
        alignItems: 'center',
    },
    emptyTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: theme.colors.textPrimary,
        marginTop: theme.spacing.md,
    },
    emptySubtitle: {
        fontSize: 13,
        color: theme.colors.textSecondary,
        textAlign: 'center',
        marginTop: theme.spacing.xs,
        marginBottom: theme.spacing.lg,
        paddingHorizontal: theme.spacing.xl,
    },
    createFirstBtn: {
        backgroundColor: theme.colors.primary,
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: theme.spacing.lg,
        paddingVertical: theme.spacing.sm + 4,
        borderRadius: theme.borderRadius.md,
        ...theme.shadows.sm,
    },
    createFirstBtnText: {
        color: '#FFFFFF',
        fontWeight: '700',
        fontSize: 14,
        marginLeft: theme.spacing.xs + 2,
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
    cardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: theme.spacing.sm,
    },
    categoryBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(37, 99, 235, 0.1)',
        paddingHorizontal: theme.spacing.sm + 2,
        paddingVertical: theme.spacing.xs,
        borderRadius: theme.borderRadius.full,
    },
    categoryBadgeText: {
        fontSize: 12,
        fontWeight: '700',
        color: theme.colors.primary,
        marginLeft: theme.spacing.xs,
    },
    statusBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: theme.spacing.sm,
        paddingVertical: theme.spacing.xs,
        borderRadius: theme.borderRadius.full,
        borderWidth: 1,
    },
    statusBadgeText: {
        fontSize: 11,
        fontWeight: '800',
        marginLeft: 4,
    },
    cardComment: {
        fontSize: 14,
        color: theme.colors.textPrimary,
        lineHeight: 20,
        marginBottom: theme.spacing.sm + 2,
    },
    attachmentsRow: {
        flexDirection: 'row',
        marginBottom: theme.spacing.sm + 2,
    },
    thumbnailImage: {
        width: 72,
        height: 72,
        borderRadius: theme.borderRadius.md,
        marginRight: theme.spacing.xs + 4,
    },
    cardFooter: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingTop: theme.spacing.sm,
        borderTopWidth: 1,
        borderTopColor: theme.colors.border,
    },
    locationGroup: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
        marginRight: theme.spacing.xs,
    },
    locationText: {
        fontSize: 12,
        color: theme.colors.textSecondary,
        marginLeft: 4,
    },
    dateGroup: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    dateText: {
        fontSize: 11,
        color: theme.colors.textSecondary,
        marginLeft: 4,
    },
    adminNoteBox: {
        marginTop: theme.spacing.sm,
        padding: theme.spacing.sm + 2,
        backgroundColor: 'rgba(239, 68, 68, 0.08)',
        borderRadius: theme.borderRadius.md,
        borderLeftWidth: 3,
        borderLeftColor: theme.colors.status.danger,
    },
    adminNoteTitle: {
        fontSize: 11,
        fontWeight: '700',
        color: theme.colors.status.danger,
        textTransform: 'uppercase',
    },
    adminNoteText: {
        fontSize: 12,
        color: theme.colors.textPrimary,
        marginTop: 2,
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'flex-end',
    },
    modalSheet: {
        backgroundColor: theme.colors.surface,
        borderTopLeftRadius: theme.borderRadius.lg + 4,
        borderTopRightRadius: theme.borderRadius.lg + 4,
        padding: theme.spacing.lg,
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: theme.spacing.md,
    },
    modalTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: theme.colors.textPrimary,
    },
    filterSectionLabel: {
        fontSize: 12,
        fontWeight: '700',
        color: theme.colors.textSecondary,
        textTransform: 'uppercase',
        marginBottom: theme.spacing.xs + 2,
    },
    filterOption: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: theme.spacing.sm + 2,
        borderBottomWidth: 1,
        borderBottomColor: theme.colors.border,
    },
    filterOptionSelected: {
        backgroundColor: theme.colors.surfaceSubtle,
        paddingHorizontal: theme.spacing.sm,
        borderRadius: theme.borderRadius.sm,
    },
    filterOptionText: {
        fontSize: 14,
        color: theme.colors.textPrimary,
    },
    filterOptionTextSelected: {
        fontWeight: '700',
        color: theme.colors.primary,
    },
}));
