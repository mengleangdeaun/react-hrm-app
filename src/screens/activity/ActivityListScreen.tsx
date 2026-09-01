import React, { useState, useEffect, useRef, useCallback, memo } from 'react';
import {
    View,
    ScrollView,
    FlatList,
    RefreshControl,
    TouchableOpacity,
    Modal,
    Platform,
    Linking,
    Alert,
    ActivityIndicator,
    useWindowDimensions,
} from 'react-native';
import { Image } from 'expo-image';
import * as FileSystem from 'expo-file-system/legacy';
import * as MediaLibrary from 'expo-media-library';
import * as Sharing from 'expo-sharing';
import * as Haptics from 'expo-haptics';
import { AppText as Text } from '../../components/AppText';
import { StyleSheet, useUnistyles } from 'react-native-unistyles';
import { format, formatDateDisplay, formatTimeDisplay } from '../../utils/dateTime';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { activityApi, ActivityItem, OFFICIAL_ACTIVITY_TYPES } from '../../api/activity';
import { useAppTheme } from '../../context/ThemeContext';
import { AppShell } from '../../components/common/AppShell';
import { HeaderIconButton } from '../../components/common/AppHeader';
import { ActivityListSkeleton } from '../../components/common/Skeletons';
import { EmptyState } from '../../components/common/EmptyState';
import { AppBottomSheet } from '../../components/common/AppBottomSheet';
import { ENV } from '../../config/env';
import {
    Plus,
    Activity as ActivityIcon,
    Calendar,
    MapPin,
    Filter,
    X,
    Check,
    CheckCircle2,
    Clock,
    AlertCircle,
    FileText,
    Download,
    Layers,
    Building2,
    MessageSquare,
    Package,
    Wrench,
    GraduationCap,
    Headset,
    MoreHorizontal,
} from 'lucide-react-native';

const CATEGORY_ICONS: Record<string, any> = {
    all: Layers,
    'Sale Outdoor': MapPin,
    'Site Visit': Building2,
    'Meeting / Discussion': MessageSquare,
    'Delivery / Collection': Package,
    'On-Site Service': Wrench,
    'Training': GraduationCap,
    'Support': Headset,
    'Other': MoreHorizontal,
};

import { useTranslation } from '../../context/LanguageContext';

export const ActivityListScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
    const { isDark, primaryColor } = useAppTheme();
    const { t } = useTranslation();
    const { theme } = useUnistyles();
    const { width: screenWidth } = useWindowDimensions();
    const cardImageWidth = Math.max(screenWidth - 32, 280);
    const styles = stylesheet;
    const queryClient = useQueryClient();

    const FILTER_CATEGORIES = [
        { id: 'all', label: t('all_categories', 'All Categories') },
        ...OFFICIAL_ACTIVITY_TYPES.map((type) => ({ id: type.id, label: type.label })),
    ];

    const TAB_ITEMS = [
        { id: 'all', label: t('all', 'All') },
        ...OFFICIAL_ACTIVITY_TYPES.map((type) => ({ id: type.id, label: type.label })),
    ];

    // Applied Filters
    const currentMonthStr = format(new Date(), 'yyyy-MM');
    const [selectedCategory, setSelectedCategory] = useState<string>('all');
    const [selectedMonth, setSelectedMonth] = useState<string>(currentMonthStr);

    // Modal Draft Filters (committed only on Apply Filter)
    const [draftCategory, setDraftCategory] = useState<string>('all');
    const [draftMonth, setDraftMonth] = useState<string>(currentMonthStr);
    const [filterModalVisible, setFilterModalVisible] = useState<boolean>(false);
    const [savingUrl, setSavingUrl] = useState<string | null>(null);

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

    const onRefresh = useCallback(async () => {
        await queryClient.invalidateQueries({ queryKey: ['activities'] });
    }, [queryClient]);

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
        return `${formatDateDisplay(rawStr, 'dayMonth')} • ${formatTimeDisplay(rawStr)}`;
    };

    const handleSaveImage = async (url: string) => {
        if (!url) return;
        if (savingUrl) return;

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
                if (typeof window !== 'undefined') {
                    window.open(url, '_blank');
                }
            }
            return;
        }

        try {
            setSavingUrl(url);

            // 1. Request Media Library permissions
            const { status } = await MediaLibrary.requestPermissionsAsync();

            // 2. Determine file extension and destination
            const rawExt = url.split('.').pop()?.split('?')[0]?.toLowerCase();
            const fileExt = rawExt && ['jpg', 'jpeg', 'png', 'webp'].includes(rawExt) ? rawExt : 'jpg';
            const filename = `activity_${Date.now()}.${fileExt}`;
            const localUri = `${FileSystem.cacheDirectory}${filename}`;

            // 3. Download the image file into local cache
            const downloadRes = await FileSystem.downloadAsync(url, localUri);

            if (status === 'granted') {
                // 4. Save directly into device Photos / Gallery
                await MediaLibrary.saveToLibraryAsync(downloadRes.uri);
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                Alert.alert(
                    t('photo_saved_title', 'Photo Saved'),
                    t('photo_saved_desc', 'The activity photo has been saved to your device Photo Gallery.')
                );
            } else {
                // Fallback: If direct gallery permission is restricted, offer native share/save sheet
                if (await Sharing.isAvailableAsync()) {
                    await Sharing.shareAsync(downloadRes.uri, {
                        mimeType: `image/${fileExt === 'png' ? 'png' : 'jpeg'}`,
                        dialogTitle: t('save_activity_photo', 'Save Activity Photo'),
                    });
                } else {
                    Alert.alert(
                        t('permission_needed', 'Permission Required'),
                        t('photo_permission_denied_desc', 'Please grant Photo Library permissions in device Settings to save photos directly.')
                    );
                }
            }
        } catch (error: any) {
            console.warn('Failed to save image:', error);
            Alert.alert(
                t('save_failed', 'Save Failed'),
                t('save_photo_error_desc', 'Could not save photo to your gallery. Please try again.')
            );
        } finally {
            setSavingUrl(null);
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
        if (!typeStr) return t('activity', 'Activity');
        return typeStr;
    };

    const getStatusStyle = (status: string) => {
        switch (status) {
            case 'approved':
                return {
                    bg: 'rgba(16, 185, 129, 0.1)',
                    border: 'rgba(16, 185, 129, 0.2)',
                    text: theme.colors.status.success,
                    label: t('approved', 'APPROVED'),
                    Icon: CheckCircle2,
                };
            case 'rejected':
                return {
                    bg: 'rgba(239, 68, 68, 0.1)',
                    border: 'rgba(239, 68, 68, 0.2)',
                    text: theme.colors.status.danger,
                    label: t('rejected', 'REJECTED'),
                    Icon: AlertCircle,
                };
            default:
                return {
                    bg: 'rgba(245, 158, 11, 0.1)',
                    border: 'rgba(245, 158, 11, 0.2)',
                    text: '#F59E0B',
                    label: t('submitted', 'SUBMITTED'),
                    Icon: Clock,
                };
        }
    };

    const headerRight = (
        <View style={styles.headerRightGroup}>
            <HeaderIconButton
                icon={
                    <Filter
                        color={
                            selectedCategory !== 'all' || selectedMonth !== currentMonthStr
                                ? theme.colors.brand
                                : theme.colors.textPrimary
                        }
                        size={18}
                    />
                }
                onPress={openFilterModal}
                accessibilityLabel="Filter activities"
            />

            <HeaderIconButton
                icon={<Plus color={theme.colors.brand} size={20} />}
                onPress={() => navigation.navigate('CreateActivity')}
                accessibilityLabel="Create activity"
                style={{ marginLeft: 8 }}
            />
        </View>
    );

    const keyExtractor = useCallback((item: ActivityItem) => String(item.id), []);

    const renderItem = useCallback(
        ({ item }: { item: ActivityItem }) => {
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
                                        contentFit="cover"
                                        cachePolicy="memory-disk"
                                        transition={200}
                                    />
                                ))}
                            </ScrollView>
                        ) : (
                            <View style={styles.heroPlaceholder}>
                                <ActivityIcon color={theme.colors.textSecondary} size={32} />
                                <Text style={styles.heroPlaceholderText}>{t('no_photo_attached', 'No Photo Attached')}</Text>
                            </View>
                        )}

                        {/* Photos Count Badge Overlay (Top Left) */}
                        {displayImages.length > 1 && (
                            <View style={styles.photoCountBadgeOverlay}>
                                <Text style={styles.photoCountBadgeText}>{displayImages.length} {t('photos', 'Photos')}</Text>
                            </View>
                        )}

                        {/* Save to Photos Download Button Overlay (Bottom Left) */}
                        {displayImages.length > 0 && (
                            <TouchableOpacity
                                style={[
                                    styles.saveBtnOverlay,
                                    savingUrl === displayImages[0] && { opacity: 0.8 },
                                ]}
                                onPress={() => handleSaveImage(displayImages[0])}
                                disabled={savingUrl === displayImages[0]}
                                activeOpacity={0.8}
                                accessibilityLabel={t('save_to_gallery', 'Save to Gallery')}
                            >
                                {savingUrl === displayImages[0] ? (
                                    <ActivityIndicator color="#FFFFFF" size="small" style={{ transform: [{ scale: 0.75 }] }} />
                                ) : (
                                    <Download color="#FFFFFF" size={13} />
                                )}
                                <Text style={styles.saveBtnOverlayText}>
                                    {savingUrl === displayImages[0] ? t('saving', 'Saving...') : t('save', 'Save')}
                                </Text>
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
        },
        [styles, theme, cardImageWidth, savingUrl, t]
    );

    const subHeader = (
        <View style={styles.tabBarContainer}>
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
        </View>
    );

    const activeMonthHeader = (
        selectedMonth !== currentMonthStr ? (
            <View style={styles.activeMonthChip}>
                <Clock color="#FFFFFF" size={14} />
                <Text style={styles.activeMonthChipText}>
                    {formatDateDisplay(selectedMonth + '-01', 'monthYear')}
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
        ) : null
    );

    const emptyStateComponent = (
        isLoading ? (
            <ActivityListSkeleton />
        ) : (
            <EmptyState
                icon={<FileText color={theme.colors.textSecondary} size={36} />}
                title={t('no_activities_recorded', 'No Activities Recorded')}
                description={t('no_activities_desc', 'You have not logged any work activities for this period yet.')}
                actionTitle={t('log_new_activity', 'Log New Activity')}
                onAction={() => navigation.navigate('CreateActivity')}
            />
        )
    );

    return (
        <AppShell
            title={t('activity_log', 'Activity Log')}
            onBack={() => navigation.goBack()}
            headerRight={headerRight}
            subHeader={subHeader}
            scrollable={false}
        >
            <FlatList
                data={isLoading ? [] : activities}
                keyExtractor={keyExtractor}
                renderItem={renderItem}
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
                ListHeaderComponent={activeMonthHeader}
                ListEmptyComponent={emptyStateComponent}
                refreshControl={
                    <RefreshControl
                        refreshing={isFetching && !isLoading}
                        onRefresh={onRefresh}
                        tintColor={theme.colors.brand}
                    />
                }
            />

            {/* Filter Bottom Sheet Modal */}
            <AppBottomSheet
                visible={filterModalVisible}
                onClose={() => setFilterModalVisible(false)}
                title={t('filter_activities', 'Filter Activities')}
                headerRight={
                    (draftCategory !== 'all' || draftMonth !== currentMonthStr) ? (
                        <TouchableOpacity onPress={handleResetFilters} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                            <Text style={styles.resetBtnText}>{t('reset_all', 'Reset All')}</Text>
                        </TouchableOpacity>
                    ) : undefined
                }
                footer={
                    <TouchableOpacity
                        style={styles.applyFilterBtn}
                        onPress={handleApplyFilters}
                        activeOpacity={0.85}
                    >
                        <Text style={styles.applyFilterBtnText}>{t('apply_filter', 'Apply Filter')}</Text>
                    </TouchableOpacity>
                }
            >
                {/* 1. Review Month Picker */}
                <Text style={styles.filterSectionLabel}>{t('review_month', 'Review Month')}</Text>
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
                <View style={styles.filterSectionHeaderRow}>
                    <Text style={styles.filterSectionLabel}>{t('activity_category', 'Activity Category')}</Text>
                    {draftCategory !== 'all' && (
                        <Text style={[styles.filterActiveBadgeText, { color: primaryColor }]}>
                            {FILTER_CATEGORIES.find((c) => c.id === draftCategory)?.label}
                        </Text>
                    )}
                </View>

                <View style={styles.categoryGroupContainer}>
                    {FILTER_CATEGORIES.map((cat, index) => {
                        const isSel = draftCategory === cat.id;
                        const CatIcon = CATEGORY_ICONS[cat.id] || MoreHorizontal;
                        const isLast = index === FILTER_CATEGORIES.length - 1;

                        return (
                            <TouchableOpacity
                                key={cat.id}
                                style={[
                                    styles.categoryRow,
                                    isSel && { backgroundColor: `${primaryColor}14` },
                                    !isLast && !isSel && styles.categoryRowBorder,
                                ]}
                                onPress={() => {
                                    setDraftCategory(cat.id);
                                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
                                }}
                                activeOpacity={0.7}
                            >
                                <View
                                    style={[
                                        styles.categoryIconCircle,
                                        {
                                            backgroundColor: isSel
                                                ? primaryColor
                                                : theme.colors.surface,
                                            borderColor: isSel ? primaryColor : theme.colors.border,
                                        },
                                    ]}
                                >
                                    <CatIcon
                                        color={isSel ? '#FFFFFF' : theme.colors.textSecondary}
                                        size={17}
                                    />
                                </View>

                                <Text
                                    style={[
                                        styles.categoryLabel,
                                        isSel && [styles.categoryLabelSelected, { color: primaryColor }],
                                    ]}
                                >
                                    {cat.label}
                                </Text>

                                <View style={styles.trailingContainer}>
                                    {isSel ? (
                                        <View
                                            style={[
                                                styles.selectedCheckBadge,
                                                {
                                                    backgroundColor: primaryColor,
                                                    borderColor: primaryColor,
                                                },
                                            ]}
                                        >
                                            <Check color="#FFFFFF" size={13} strokeWidth={3} />
                                        </View>
                                    ) : (
                                        <View style={styles.unselectedIndicator} />
                                    )}
                                </View>
                            </TouchableOpacity>
                        );
                    })}
                </View>
            </AppBottomSheet>
        </AppShell>
    );
};

const stylesheet = StyleSheet.create((theme) => ({
    scrollContent: {
        paddingHorizontal: theme.spacing.md,
        paddingBottom: theme.spacing.xl,
    },
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
    filterSectionHeaderRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: theme.spacing.xs + 4,
        marginTop: theme.spacing.sm,
    },
    filterActiveBadgeText: {
        fontSize: 12,
        fontWeight: '700',
    },
    filterSectionLabel: {
        fontSize: 12,
        fontWeight: '700',
        color: theme.colors.textSecondary,
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    categoryGroupContainer: {
        backgroundColor: theme.colors.surfaceSubtle,
        borderRadius: theme.borderRadius.lg,
        borderWidth: 1,
        borderColor: theme.colors.border,
        overflow: 'hidden',
        marginBottom: theme.spacing.md,
    },
    categoryRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 12,
        paddingHorizontal: 14,
        backgroundColor: 'transparent',
    },
    categoryRowBorder: {
        borderBottomWidth: 1,
        borderBottomColor: theme.colors.border,
    },
    categoryIconCircle: {
        width: 34,
        height: 34,
        borderRadius: 17,
        borderWidth: 1,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    categoryLabel: {
        flex: 1,
        fontSize: 14,
        fontWeight: '600',
        color: theme.colors.textPrimary,
    },
    categoryLabelSelected: {
        fontWeight: '800',
    },
    trailingContainer: {
        marginLeft: 8,
        alignItems: 'center',
        justifyContent: 'center',
    },
    selectedCheckBadge: {
        width: 22,
        height: 22,
        borderRadius: 11,
        borderWidth: 1.5,
        alignItems: 'center',
        justifyContent: 'center',
    },
    unselectedIndicator: {
        width: 20,
        height: 20,
        borderRadius: 10,
        borderWidth: 1.5,
        borderColor: theme.colors.border,
    },
}));
