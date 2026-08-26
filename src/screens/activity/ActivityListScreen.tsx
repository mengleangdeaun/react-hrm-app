import React, { useState, useEffect, useRef } from 'react';
import {
    View,
    Text,
    ScrollView,
    TouchableOpacity,
    Image,
    Modal,
    Platform,
    Linking,
    Alert,
    Animated,
    useWindowDimensions,
} from 'react-native';
import { StyleSheet, useUnistyles } from 'react-native-unistyles';
import { format, parseISO, isValid } from 'date-fns';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { activityApi, ActivityItem, OFFICIAL_ACTIVITY_TYPES } from '../../api/activity';
import { useAppTheme } from '../../context/ThemeContext';
import { AppShell } from '../../components/common/AppShell';
import { ActivityListSkeleton } from '../../components/common/Skeletons';
import { ENV } from '../../config/env';
import {
    Plus,
    Activity as ActivityIcon,
    Calendar,
    MapPin,
    Filter,
    X,
    CheckCircle2,
    Clock,
    AlertCircle,
    FileText,
    Download,
} from 'lucide-react-native';

const FILTER_CATEGORIES = [
    { id: 'all', label: 'All Categories' },
    ...OFFICIAL_ACTIVITY_TYPES.map((t) => ({ id: t.id, label: t.label })),
];

export const ActivityListScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
    const { isDark } = useAppTheme();
    const { theme } = useUnistyles();
    const { width: screenWidth } = useWindowDimensions();
    const cardImageWidth = Math.max(screenWidth - 32, 280);
    const styles = stylesheet;
    const queryClient = useQueryClient();

    // Applied Filters
    const currentMonthStr = format(new Date(), 'yyyy-MM');
    const [selectedCategory, setSelectedCategory] = useState<string>('all');
    const [selectedMonth, setSelectedMonth] = useState<string>(currentMonthStr);

    // Modal Draft Filters (committed only on Apply Filter)
    const [draftCategory, setDraftCategory] = useState<string>('all');
    const [draftMonth, setDraftMonth] = useState<string>(currentMonthStr);
    const [filterModalVisible, setFilterModalVisible] = useState<boolean>(false);

    // 5-Minute In-Memory Caching for Activities
    const {
        data: activities = [],
        isLoading,
        isFetching,
    } = useQuery<ActivityItem[]>({
        queryKey: ['activities', selectedMonth, selectedCategory],
        queryFn: async () => {
            const params: any = { month: selectedMonth };
            if (selectedCategory !== 'all') {
                params.activity_type = selectedCategory;
            }
            const res = await activityApi.getActivities(params);
            return res?.data || res?.activities || (Array.isArray(res) ? res : []);
        },
        staleTime: 1000 * 60 * 5, // 5 minutes cache
    });

    const onRefresh = async () => {
        await queryClient.invalidateQueries({ queryKey: ['activities'] });
    };

    // Smart Animated Tab Bar Scroll Hide/Show State
    const tabBarAnim = useRef(new Animated.Value(1)).current;
    const isTabBarHiddenRef = useRef<boolean>(false);
    const lastScrollY = useRef<number>(0);

    const handleScroll = (event: any) => {
        const currentY = event?.nativeEvent?.contentOffset?.y || 0;
        const diff = currentY - lastScrollY.current;

        if (Math.abs(diff) < 8) return;

        if (currentY <= 20) {
            if (isTabBarHiddenRef.current) {
                isTabBarHiddenRef.current = false;
                Animated.timing(tabBarAnim, {
                    toValue: 1,
                    duration: 220,
                    useNativeDriver: false,
                }).start();
            }
        } else if (diff > 12) {
            // Scroll down -> hide smoothly
            if (!isTabBarHiddenRef.current) {
                isTabBarHiddenRef.current = true;
                Animated.timing(tabBarAnim, {
                    toValue: 0,
                    duration: 220,
                    useNativeDriver: false,
                }).start();
            }
        } else if (diff < -12) {
            // Scroll up -> show smoothly
            if (isTabBarHiddenRef.current) {
                isTabBarHiddenRef.current = false;
                Animated.timing(tabBarAnim, {
                    toValue: 1,
                    duration: 220,
                    useNativeDriver: false,
                }).start();
            }
        }

        lastScrollY.current = currentY;
    };

    const openFilterModal = () => {
        setDraftCategory(selectedCategory);
        setDraftMonth(selectedMonth);
        setFilterModalVisible(true);
    };

    const handleApplyFilters = () => {
        setSelectedCategory(draftCategory);
        setSelectedMonth(draftMonth);
        setFilterModalVisible(false);
    };

    const handleResetFilters = () => {
        setDraftCategory('all');
        setDraftMonth(currentMonthStr);
        setSelectedCategory('all');
        setSelectedMonth(currentMonthStr);
        setFilterModalVisible(false);
    };

    const getMonthOptions = () => {
        const months = [];
        const now = new Date();
        for (let i = 0; i < 6; i++) {
            const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
            const value = format(d, 'yyyy-MM');
            const label = format(d, 'MMMM yyyy');
            months.push({ value, label });
        }
        return months;
    };

    const formatActivityDateTime = (rawStr?: string) => {
        if (!rawStr) return 'Recent';
        try {
            const dateObj = parseISO(rawStr);
            if (!isValid(dateObj)) {
                const parsed = new Date(rawStr);
                if (isNaN(parsed.getTime())) return rawStr;
                return format(parsed, 'EEE, dd MMM • hh:mm a');
            }
            return format(dateObj, 'EEE, dd MMM • hh:mm a');
        } catch (e) {
            return rawStr;
        }
    };

    const handleSaveImage = (url: string) => {
        if (!url) return;
        if (Platform.OS === 'web') {
            try {
                const a = document.createElement('a');
                a.href = url;
                a.download = `activity_photo_${Date.now()}.jpg`;
                a.target = '_blank';
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
            } catch (e) {
                window.open(url, '_blank');
            }
        } else {
            Linking.openURL(url).catch(() => {
                Alert.alert('Unable to open image link');
            });
        }
    };

    const getDisplayImageUrls = (item: ActivityItem): string[] => {
        let urls: string[] = [];

        if (Array.isArray(item.attachment_urls) && item.attachment_urls.length > 0) {
            urls = item.attachment_urls;
        } else if (item.photo_url) {
            urls = [item.photo_url];
        } else if (Array.isArray(item.attachments) && item.attachments.length > 0) {
            urls = item.attachments;
        } else if (item.photo_path) {
            urls = [item.photo_path];
        }

        return urls
            .map((u) => {
                if (!u) return '';
                if (u.startsWith('http://') || u.startsWith('https://')) return u;
                const cleanPath = u.startsWith('/') ? u.substring(1) : u;
                const storagePath = cleanPath.startsWith('storage/') ? cleanPath : `storage/${cleanPath}`;
                const baseUrl = ENV.API_URL.replace(/\/api\/?$/, '');
                return `${baseUrl}/${storagePath}`;
            })
            .filter(Boolean);
    };

    const formatCategoryName = (typeStr: string) => {
        if (!typeStr) return 'Activity';
        return typeStr;
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

    const headerRight = (
        <View style={styles.headerRightGroup}>
            <TouchableOpacity
                style={styles.headerIconBtnSubtle}
                onPress={openFilterModal}
                activeOpacity={0.8}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
                <Filter color={(selectedCategory !== 'all' || selectedMonth !== currentMonthStr) ? theme.colors.primary : theme.colors.textPrimary} size={18} />
            </TouchableOpacity>

            <TouchableOpacity
                style={styles.headerIconBtn}
                onPress={() => navigation.navigate('CreateActivity')}
                activeOpacity={0.8}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
                <Plus color="#FFFFFF" size={20} />
            </TouchableOpacity>
        </View>
    );

    const TAB_ITEMS = [
        { id: 'all', label: 'All' },
        ...OFFICIAL_ACTIVITY_TYPES.map((t) => ({ id: t.id, label: t.label })),
    ];

    const subHeader = (
        <Animated.View
            style={[
                styles.tabBarContainer,
                {
                    opacity: tabBarAnim,
                    height: tabBarAnim.interpolate({
                        inputRange: [0, 1],
                        outputRange: [0, 44],
                    }),
                    marginBottom: tabBarAnim.interpolate({
                        inputRange: [0, 1],
                        outputRange: [0, 16],
                    }),
                    transform: [
                        {
                            translateY: tabBarAnim.interpolate({
                                inputRange: [0, 1],
                                outputRange: [-10, 0],
                            }),
                        },
                    ],
                },
            ]}
        >
            <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.tabBarScrollContent}
            >
                {TAB_ITEMS.map((tab) => {
                    const isActive = selectedCategory === tab.id;
                    return (
                        <TouchableOpacity
                            key={tab.id}
                            style={[styles.tabItem, isActive && styles.tabItemActive]}
                            onPress={() => setSelectedCategory(tab.id)}
                            activeOpacity={0.8}
                        >
                            <Text style={[styles.tabItemText, isActive && styles.tabItemTextActive]}>
                                {tab.label}
                            </Text>
                            {isActive && <View style={styles.tabIndicator} />}
                        </TouchableOpacity>
                    );
                })}
            </ScrollView>
        </Animated.View>
    );

    return (
        <AppShell
            title="Activity Log"
            onBack={() => navigation.goBack()}
            headerRight={headerRight}
            subHeader={subHeader}
            refreshing={isFetching && !isLoading}
            onRefresh={onRefresh}
            onScroll={handleScroll}
            scrollEventThrottle={16}
        >

            {/* Active Month Filter Chip */}
            {selectedMonth !== currentMonthStr && (
                <View style={styles.activeMonthChip}>
                    <Clock color="#FFFFFF" size={14} />
                    <Text style={styles.activeMonthChipText}>
                        {format(parseISO(selectedMonth + '-01'), 'MMMM yyyy')}
                    </Text>
                    <TouchableOpacity
                        onPress={() => setSelectedMonth(currentMonthStr)}
                        style={styles.activeMonthCloseBtn}
                        activeOpacity={0.7}
                        hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                    >
                        <X color="#FFFFFF" size={12} />
                    </TouchableOpacity>
                </View>
            )}

            {isLoading ? (
                <ActivityListSkeleton />
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
                    const displayImages = getDisplayImageUrls(item);

                    return (
                        <View key={item.id} style={styles.card}>
                            {/* 1. Hero Image Banner (Full Card Width) */}
                            <View style={styles.heroImageContainer}>
                                {displayImages.length > 0 ? (
                                    <ScrollView
                                        horizontal
                                        pagingEnabled
                                        showsHorizontalScrollIndicator={false}
                                        style={styles.heroScrollView}
                                    >
                                        {displayImages.map((imgUri, idx) => (
                                            <Image
                                                key={idx}
                                                source={{ uri: imgUri }}
                                                style={[styles.heroImage, { width: cardImageWidth }]}
                                                resizeMode="cover"
                                            />
                                        ))}
                                    </ScrollView>
                                ) : (
                                    <View style={styles.heroPlaceholder}>
                                        <ActivityIcon color={theme.colors.textSecondary} size={32} />
                                        <Text style={styles.heroPlaceholderText}>No Photo Attached</Text>
                                    </View>
                                )}

                                {/* Photos Count Badge Overlay (Top Left) */}
                                {displayImages.length > 1 && (
                                    <View style={styles.photoCountBadgeOverlay}>
                                        <Text style={styles.photoCountBadgeText}>{displayImages.length} Photos</Text>
                                    </View>
                                )}

                                {/* Save to Photos Download Button Overlay (Bottom Left) */}
                                {displayImages.length > 0 && (
                                    <TouchableOpacity
                                        style={styles.saveBtnOverlay}
                                        onPress={() => handleSaveImage(displayImages[0])}
                                        activeOpacity={0.8}
                                    >
                                        <Download color="#FFFFFF" size={13} />
                                        <Text style={styles.saveBtnOverlayText}>Save</Text>
                                    </TouchableOpacity>
                                )}
                            </View>

                            {/* 2. Card Content Body */}
                            <View style={styles.cardBody}>
                                {/* Header Row: Category Badge & Formatted Date/Time */}
                                <View style={styles.cardHeaderRow}>
                                    <View style={styles.categoryBadge}>
                                        <ActivityIcon color={theme.colors.primary} size={13} />
                                        <Text style={styles.categoryBadgeText}>
                                            {formatCategoryName(item.activity_type)}
                                        </Text>
                                    </View>

                                    <View style={styles.dateGroup}>
                                        <Clock color={theme.colors.textSecondary} size={12} />
                                        <Text style={styles.dateText}>
                                            {formatActivityDateTime(item.submitted_at || item.activity_date)}
                                        </Text>
                                    </View>
                                </View>

                                {/* Activity Comment / Notes */}
                                {item.comment ? (
                                    <Text style={styles.cardComment}>{item.comment}</Text>
                                ) : null}

                                {/* Manager Supervisor Remark */}
                                {item.status === 'rejected' && item.admin_note ? (
                                    <View style={styles.adminNoteBox}>
                                        <Text style={styles.adminNoteTitle}>Supervisor Remark:</Text>
                                        <Text style={styles.adminNoteText}>{item.admin_note}</Text>
                                    </View>
                                ) : null}
                            </View>
                        </View>
                    );
                })
            )}

            {/* Filter Bottom Sheet Modal */}
            <Modal visible={filterModalVisible} transparent animationType="fade">
                <TouchableOpacity
                    style={styles.modalOverlay}
                    activeOpacity={1}
                    onPress={() => setFilterModalVisible(false)}
                >
                    <TouchableOpacity activeOpacity={1} style={styles.modalSheet}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>Filter Activities</Text>
                            {(draftCategory !== 'all' || draftMonth !== currentMonthStr) ? (
                                <TouchableOpacity onPress={handleResetFilters}>
                                    <Text style={styles.resetBtnText}>Reset All</Text>
                                </TouchableOpacity>
                            ) : (
                                <TouchableOpacity onPress={() => setFilterModalVisible(false)}>
                                    <X color={theme.colors.textPrimary} size={20} />
                                </TouchableOpacity>
                            )}
                        </View>

                        {/* 1. Review Month Picker */}
                        <Text style={styles.filterSectionLabel}>Review Month</Text>
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.monthPillsRow}>
                            {getMonthOptions().map((m) => {
                                const isSel = draftMonth === m.value;
                                return (
                                    <TouchableOpacity
                                        key={m.value}
                                        style={[styles.monthPill, isSel && styles.monthPillSelected]}
                                        onPress={() => setDraftMonth(m.value)}
                                        activeOpacity={0.8}
                                    >
                                        <Text style={[styles.monthPillText, isSel && styles.monthPillTextSelected]}>
                                            {m.label}
                                        </Text>
                                    </TouchableOpacity>
                                );
                            })}
                        </ScrollView>

                        {/* 2. Category Selection */}
                        <Text style={styles.filterSectionLabel}>Activity Category</Text>
                        <ScrollView style={{ maxHeight: 220 }}>
                            {FILTER_CATEGORIES.map((cat) => (
                                <TouchableOpacity
                                    key={cat.id}
                                    style={[
                                        styles.filterOption,
                                        draftCategory === cat.id && styles.filterOptionSelected,
                                    ]}
                                    onPress={() => setDraftCategory(cat.id)}
                                >
                                    <Text
                                        style={[
                                            styles.filterOptionText,
                                            draftCategory === cat.id && styles.filterOptionTextSelected,
                                        ]}
                                    >
                                        {cat.label}
                                    </Text>
                                    {draftCategory === cat.id && (
                                        <CheckCircle2 color={theme.colors.primary} size={18} />
                                    )}
                                </TouchableOpacity>
                            ))}
                        </ScrollView>

                        <TouchableOpacity
                            style={styles.applyFilterBtn}
                            onPress={handleApplyFilters}
                            activeOpacity={0.85}
                        >
                            <Text style={styles.applyFilterBtnText}>Apply Filter</Text>
                        </TouchableOpacity>
                    </TouchableOpacity>
                </TouchableOpacity>
            </Modal>
        </AppShell>
    );
};

const stylesheet = StyleSheet.create((theme) => ({
    headerRightGroup: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: theme.spacing.xs + 2,
    },
    headerIconBtnSubtle: {
        width: 36,
        height: 36,
        borderRadius: theme.borderRadius.full,
        backgroundColor: theme.colors.surfaceSubtle,
        borderWidth: 1,
        borderColor: theme.colors.border,
        justifyContent: 'center',
        alignItems: 'center',
    },
    headerIconBtn: {
        width: 36,
        height: 36,
        borderRadius: theme.borderRadius.full,
        backgroundColor: theme.colors.primary,
        justifyContent: 'center',
        alignItems: 'center',
        ...theme.shadows.sm,
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
        position: 'relative',
    },
    tabItemActive: {},
    tabItemText: {
        fontSize: 12,
        fontWeight: '700',
        color: theme.colors.textSecondary,
        textTransform: 'uppercase',
        letterSpacing: 0.4,
    },
    filterOptionTextSelected: {
        color: theme.colors.primary,
        fontWeight: '700',
    },
    activeMonthChip: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: theme.colors.primary,
        paddingHorizontal: theme.spacing.md,
        paddingVertical: theme.spacing.xs + 4,
        borderRadius: theme.borderRadius.full,
        alignSelf: 'flex-start',
        marginBottom: theme.spacing.md,
        gap: 8,
        ...theme.shadows.sm,
    },
    activeMonthChipText: {
        color: '#FFFFFF',
        fontSize: 13,
        fontWeight: '700',
    },
    activeMonthCloseBtn: {
        backgroundColor: 'rgba(255, 255, 255, 0.25)',
        width: 22,
        height: 22,
        borderRadius: 11,
        justifyContent: 'center',
        alignItems: 'center',
        marginLeft: 4,
    },
    resetBtnText: {
        fontSize: 12,
        fontWeight: '700',
        color: theme.colors.status.danger,
        textTransform: 'uppercase',
    },
    monthPillsRow: {
        flexDirection: 'row',
        marginBottom: theme.spacing.md,
    },
    monthPill: {
        paddingHorizontal: theme.spacing.md,
        paddingVertical: theme.spacing.xs + 4,
        borderRadius: theme.borderRadius.full,
        backgroundColor: theme.colors.surfaceSubtle,
        borderWidth: 1,
        borderColor: theme.colors.border,
        marginRight: theme.spacing.xs + 2,
    },
    monthPillSelected: {
        backgroundColor: theme.colors.primary,
        borderColor: theme.colors.primary,
    },
    monthPillText: {
        fontSize: 12,
        fontWeight: '600',
        color: theme.colors.textPrimary,
    },
    monthPillTextSelected: {
        color: '#FFFFFF',
        fontWeight: '700',
    },
    applyFilterBtn: {
        backgroundColor: theme.colors.primary,
        height: 48,
        borderRadius: theme.borderRadius.md,
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: theme.spacing.md,
        ...theme.shadows.sm,
    },
    applyFilterBtnText: {
        color: '#FFFFFF',
        fontSize: 14,
        fontWeight: '700',
    },
    tabItemTextActive: {
        color: theme.colors.primary,
        fontWeight: '800',
    },
    tabIndicator: {
        position: 'absolute',
        bottom: 0,
        left: theme.spacing.md,
        right: theme.spacing.md,
        height: 2.5,
        backgroundColor: theme.colors.primary,
    },
    activeFilterRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundColor: theme.colors.surfaceSubtle,
        paddingHorizontal: theme.spacing.md,
        paddingVertical: theme.spacing.sm,
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
        borderRadius: theme.borderRadius.lg + 4,
        marginBottom: theme.spacing.lg,
        borderWidth: 1,
        borderColor: theme.colors.border,
        overflow: 'hidden',
        ...theme.shadows.sm,
    },
    heroImageContainer: {
        width: '100%',
        height: 200,
        backgroundColor: theme.colors.surfaceSubtle,
        position: 'relative',
    },
    heroScrollView: {
        width: '100%',
        height: '100%',
    },
    heroImage: {
        height: '100%',
    },
    heroPlaceholder: {
        width: '100%',
        height: '100%',
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: theme.colors.surfaceSubtle,
    },
    heroPlaceholderText: {
        fontSize: 12,
        color: theme.colors.textSecondary,
        marginTop: 6,
        fontWeight: '600',
    },
    statusBadgeOverlay: {
        position: 'absolute',
        top: 12,
        right: 12,
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: theme.spacing.sm + 2,
        paddingVertical: 4,
        borderRadius: theme.borderRadius.full,
        borderWidth: 1,
        zIndex: 10,
    },
    photoCountBadgeOverlay: {
        position: 'absolute',
        top: 12,
        left: 12,
        backgroundColor: 'rgba(0, 0, 0, 0.55)',
        paddingHorizontal: theme.spacing.sm + 2,
        paddingVertical: 4,
        borderRadius: theme.borderRadius.md,
        zIndex: 10,
    },
    photoCountBadgeText: {
        color: '#FFFFFF',
        fontSize: 11,
        fontWeight: '700',
    },
    saveBtnOverlay: {
        position: 'absolute',
        bottom: 12,
        left: 12,
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(0, 0, 0, 0.65)',
        paddingHorizontal: theme.spacing.sm + 4,
        paddingVertical: 5,
        borderRadius: theme.borderRadius.full,
        zIndex: 10,
    },
    saveBtnOverlayText: {
        color: '#FFFFFF',
        fontSize: 11,
        fontWeight: '700',
        marginLeft: 4,
    },
    cardBody: {
        padding: theme.spacing.md,
    },
    cardHeaderRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: theme.spacing.sm,
    },
    categoryBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: theme.colors.surfaceSubtle,
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
    statusBadgeText: {
        fontSize: 11,
        fontWeight: '800',
        marginLeft: 4,
    },
    cardComment: {
        fontSize: 13,
        color: theme.colors.textPrimary,
        lineHeight: 19,
        marginBottom: theme.spacing.xs + 2,
        fontWeight: '500',
    },
    locationCardBox: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: theme.colors.surfaceSubtle,
        paddingHorizontal: theme.spacing.sm + 2,
        paddingVertical: theme.spacing.xs + 2,
        borderRadius: theme.borderRadius.md,
        marginTop: theme.spacing.xs,
        borderWidth: 1,
        borderColor: theme.colors.border,
    },
    locationText: {
        fontSize: 12,
        color: theme.colors.textSecondary,
        marginLeft: 6,
        fontWeight: '600',
    },
    dateGroup: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    dateText: {
        fontSize: 11,
        color: theme.colors.textSecondary,
        marginLeft: 4,
        fontWeight: '600',
    },
    adminNoteBox: {
        marginTop: theme.spacing.sm,
        padding: theme.spacing.sm + 2,
        backgroundColor: theme.colors.surfaceSubtle,
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

}));
