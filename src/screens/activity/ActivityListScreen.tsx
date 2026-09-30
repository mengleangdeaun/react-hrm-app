import React, { useState, useEffect, useRef, useCallback, useMemo, memo } from 'react';
import {
    View,
    ScrollView,
    RefreshControl,
    TouchableOpacity,
    Modal,
    Platform,
    Linking,
    Alert,
    ActivityIndicator,
    useWindowDimensions,
    Animated,
    PanResponder,
    Easing,
} from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { Image } from 'expo-image';
import * as FileSystem from 'expo-file-system/legacy';
import * as MediaLibrary from 'expo-media-library/legacy';
import * as Sharing from 'expo-sharing';
import * as Haptics from 'expo-haptics';
import { AppText as Text } from '../../components/AppText';
import { StyleSheet, useUnistyles } from 'react-native-unistyles';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
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

export const HERO_IMAGE_HEIGHT = 200;

export const normalizeActivityImageUrl = (rawUrl?: string): string => {
    if (!rawUrl || typeof rawUrl !== 'string') return '';
    const trimmed = rawUrl.trim();
    if (!trimmed) return '';

    // If it's already an absolute URL (e.g. Cloudflare R2: https://pub-xxx.r2.dev/... or http://...)
    if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
        // Rewrite loopback addresses from local dev Laravel (127.0.0.1 or localhost)
        // so that Android emulators and devices reach the backend host correctly
        if (trimmed.includes('127.0.0.1') || trimmed.includes('localhost')) {
            const apiBase = ENV.API_URL.replace(/\/api\/?$/, '');
            const pathAndQuery = trimmed.replace(/^https?:\/\/[^/]+/, '');
            return `${apiBase}${pathAndQuery}`;
        }
        return trimmed;
    }

    // Relative path (from storage/ or activities/)
    const cleanPath = trimmed.startsWith('/') ? trimmed.substring(1) : trimmed;
    const storagePath = cleanPath.startsWith('storage/') ? cleanPath : `storage/${cleanPath}`;
    const baseUrl = ENV.API_URL.replace(/\/api\/?$/, '');
    return `${baseUrl}/${storagePath}`;
};

export const getDisplayImageUrls = (item: ActivityItem): string[] => {
    // 1. Prefer resolved Cloudflare R2 / public URLs provided by the backend
    const resolvedUrls: string[] = [];

    if (Array.isArray(item.attachment_urls) && item.attachment_urls.length > 0) {
        resolvedUrls.push(...item.attachment_urls);
    }
    if (item.photo_url && !resolvedUrls.includes(item.photo_url)) {
        resolvedUrls.push(item.photo_url);
    }

    if (resolvedUrls.length > 0) {
        return resolvedUrls.map((u) => normalizeActivityImageUrl(u)).filter(Boolean);
    }

    // 2. Fallback only if backend didn't provide pre-resolved URLs
    const fallbackList: any[] = [];
    if (Array.isArray(item.attachments) && item.attachments.length > 0) {
        item.attachments.forEach((a) => {
            if (typeof a === 'string') fallbackList.push(a);
            else if (a && typeof a === 'object' && (a as any).uri) fallbackList.push((a as any).uri);
        });
    } else if (typeof item.attachments === 'string') {
        try {
            const parsed = JSON.parse(item.attachments);
            if (Array.isArray(parsed)) fallbackList.push(...parsed);
            else if (typeof parsed === 'string') fallbackList.push(parsed);
        } catch {
            fallbackList.push(item.attachments);
        }
    }

    if (item.photo_path && !fallbackList.includes(item.photo_path)) {
        fallbackList.push(item.photo_path);
    }

    const seen = new Set<string>();
    const result: string[] = [];

    for (const raw of fallbackList) {
        const normalized = normalizeActivityImageUrl(raw);
        if (normalized && !seen.has(normalized)) {
            seen.add(normalized);
            result.push(normalized);
        }
    }

    return result;
};

interface ActivityCardProps {
    item: ActivityItem;
    cardImageWidth: number;
    savingUrl: string | null;
    onSaveImage: (url: string) => void;
    onPreviewImage?: (url: string) => void;
    onPreviewImages?: (images: string[], initialIndex: number) => void;
    theme: any;
    styles: any;
    t: (key: string, fallback?: string) => string;
}

const ActivityCard = memo(({
    item,
    cardImageWidth,
    savingUrl,
    onSaveImage,
    onPreviewImage,
    onPreviewImages,
    theme,
    styles,
    t,
}: ActivityCardProps) => {
    const displayImages = getDisplayImageUrls(item);
    const [activeImgIndex, setActiveImgIndex] = useState(0);
    const [containerWidth, setContainerWidth] = useState(cardImageWidth);
    const [imgLoadErrors, setImgLoadErrors] = useState<Record<number, boolean>>({});

    const handleScroll = useCallback((e: any) => {
        const offset = e.nativeEvent?.contentOffset?.x ?? 0;
        const viewWidth = e.nativeEvent?.layoutMeasurement?.width || containerWidth || cardImageWidth;
        if (viewWidth > 0 && displayImages.length > 0) {
            const idx = Math.min(
                Math.max(Math.round(offset / viewWidth), 0),
                displayImages.length - 1
            );
            if (idx !== activeImgIndex) {
                setActiveImgIndex(idx);
            }
        }
    }, [containerWidth, cardImageWidth, displayImages.length, activeImgIndex]);

    const dateFormatted = item.submitted_at || item.activity_date
        ? `${formatDateDisplay(item.submitted_at || item.activity_date, 'dayMonth')} • ${formatTimeDisplay(item.submitted_at || item.activity_date)}`
        : 'Recent';

    const CatIcon = CATEGORY_ICONS[item.activity_type] || ActivityIcon;

    const statusConfig = useMemo(() => {
        const status = item.status || 'submitted';
        switch (status) {
            case 'approved':
                return {
                    bg: 'rgba(16, 185, 129, 0.12)',
                    border: 'rgba(16, 185, 129, 0.28)',
                    text: theme.colors.status.success,
                    label: t('approved', 'APPROVED'),
                    Icon: CheckCircle2,
                };
            case 'rejected':
                return {
                    bg: 'rgba(220, 38, 38, 0.12)',
                    border: 'rgba(220, 38, 38, 0.28)',
                    text: theme.colors.status.danger,
                    label: t('rejected', 'REJECTED'),
                    Icon: AlertCircle,
                };
            default:
                return {
                    bg: 'rgba(245, 158, 11, 0.12)',
                    border: 'rgba(245, 158, 11, 0.28)',
                    text: '#F59E0B',
                    label: t('submitted', 'SUBMITTED'),
                    Icon: Clock,
                };
        }
    }, [item.status, theme, t]);

    const StatusIcon = statusConfig.Icon;

    return (
        <View style={styles.card}>
            {/* 1. Hero Image Banner (Full Card Width) */}
            <View
                style={styles.heroImageContainer}
                onLayout={(e: any) => {
                    const w = Math.round(e.nativeEvent.layout.width);
                    if (w > 0 && Math.abs(w - containerWidth) > 1) {
                        setContainerWidth(w);
                    }
                }}
            >
                {displayImages.length > 0 ? (
                    <ScrollView
                        horizontal
                        pagingEnabled
                        showsHorizontalScrollIndicator={false}
                        scrollEventThrottle={16}
                        onScroll={handleScroll}
                        onMomentumScrollEnd={handleScroll}
                        onScrollEndDrag={handleScroll}
                        style={[styles.heroScrollView, { height: HERO_IMAGE_HEIGHT }]}
                    >
                        {displayImages.map((imgUri, idx) => (
                            <TouchableOpacity
                                key={`${imgUri}-${idx}`}
                                activeOpacity={0.9}
                                onPress={() => {
                                    if (onPreviewImages) {
                                        onPreviewImages(displayImages, idx);
                                    } else {
                                        onPreviewImage?.(imgUri);
                                    }
                                }}
                                style={{ width: containerWidth, height: HERO_IMAGE_HEIGHT }}
                            >
                                {imgLoadErrors[idx] ? (
                                    <View style={[styles.heroPlaceholder, { width: containerWidth, height: HERO_IMAGE_HEIGHT }]}>
                                        <ActivityIcon color={theme.colors.textSecondary} size={32} />
                                        <Text style={styles.heroPlaceholderText}>{t('image_load_failed', 'Image Preview Unavailable')}</Text>
                                    </View>
                                ) : (
                                    <Image
                                        source={{ uri: imgUri }}
                                        style={[styles.heroImage, { width: containerWidth, height: HERO_IMAGE_HEIGHT }]}
                                        contentFit="cover"
                                        cachePolicy="memory-disk"
                                        transition={200}
                                        onError={() => setImgLoadErrors((prev) => ({ ...prev, [idx]: true }))}
                                    />
                                )}
                            </TouchableOpacity>
                        ))}
                    </ScrollView>
                ) : (
                    <View style={styles.heroPlaceholder}>
                        <ActivityIcon color={theme.colors.textSecondary} size={32} />
                        <Text style={styles.heroPlaceholderText}>{t('no_photo_attached', 'No Photo Attached')}</Text>
                    </View>
                )}

                {/* Status Badge Overlay (Top Right) */}
                <View
                    style={[
                        styles.statusBadgeOverlay,
                        {
                            backgroundColor: statusConfig.bg,
                            borderColor: statusConfig.border,
                        },
                    ]}
                >
                    <StatusIcon color={statusConfig.text} size={11} strokeWidth={2.5} />
                    <Text style={[styles.statusBadgeText, { color: statusConfig.text }]}>
                        {statusConfig.label}
                    </Text>
                </View>

                {/* Photos Count Badge Overlay (Top Left) */}
                {displayImages.length > 1 && (
                    <View style={styles.photoCountBadgeOverlay}>
                        <Text style={styles.photoCountBadgeText}>
                            {activeImgIndex + 1}/{displayImages.length} {t('photos', 'Photos')}
                        </Text>
                    </View>
                )}

                {/* Save to Photos Download Button Overlay (Bottom Left) */}
                {displayImages.length > 0 && (
                    <TouchableOpacity
                        style={[
                            styles.saveBtnOverlay,
                            savingUrl === (displayImages[activeImgIndex] || displayImages[0]) && { opacity: 0.8 },
                        ]}
                        onPress={() => onSaveImage(displayImages[activeImgIndex] || displayImages[0])}
                        disabled={savingUrl === (displayImages[activeImgIndex] || displayImages[0])}
                        activeOpacity={0.8}
                        accessibilityLabel={t('save_to_gallery', 'Save to Gallery')}
                    >
                        {savingUrl === (displayImages[activeImgIndex] || displayImages[0]) ? (
                            <ActivityIndicator color="#FFFFFF" size="small" style={{ transform: [{ scale: 0.75 }] }} />
                        ) : (
                            <Download color="#FFFFFF" size={13} />
                        )}
                        <Text style={styles.saveBtnOverlayText}>
                            {savingUrl === (displayImages[activeImgIndex] || displayImages[0]) ? t('saving', 'Saving...') : t('save', 'Save')}
                        </Text>
                    </TouchableOpacity>
                )}
            </View>

            {/* 2. Card Content Body */}
            <View style={styles.cardBody}>
                {/* Header Row: Category Badge & Formatted Date/Time */}
                <View style={styles.cardHeaderRow}>
                    <View style={styles.categoryBadge}>
                        <CatIcon color={theme.colors.primary} size={13} strokeWidth={2.2} />
                        <Text style={styles.categoryBadgeText}>
                            {item.activity_type || t('activity', 'Activity')}
                        </Text>
                    </View>

                    <View style={styles.dateGroup}>
                        <Clock color={theme.colors.textSecondary} size={12} />
                        <Text style={styles.dateText}>{dateFormatted}</Text>
                    </View>
                </View>

                {/* Verified Location Tag Row */}
                {item.location_name ? (
                    <View style={styles.locationCardBox}>
                        <View style={styles.locationPinWrapper}>
                            <MapPin color={theme.colors.primary} size={13} strokeWidth={2.2} />
                        </View>
                        <Text style={styles.locationText} numberOfLines={2}>
                            {item.location_name}
                        </Text>
                    </View>
                ) : null}

                {/* Activity Comment / Notes */}
                {item.comment ? (
                    <View style={styles.commentContainer}>
                        <Text style={styles.cardComment}>{item.comment}</Text>
                    </View>
                ) : null}

                {/* Manager Supervisor Remark */}
                {item.status === 'rejected' && item.admin_note ? (
                    <View style={styles.adminNoteBox}>
                        <View style={styles.adminNoteHeader}>
                            <AlertCircle color={theme.colors.status.danger} size={13} strokeWidth={2.2} />
                            <Text style={styles.adminNoteTitle}>{t('supervisor_remark', 'Supervisor Remark')}:</Text>
                        </View>
                        <Text style={styles.adminNoteText}>{item.admin_note}</Text>
                    </View>
                ) : null}
            </View>
        </View>
    );
});

export const ActivityListScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
    const insets = useSafeAreaInsets();
    const { isDark, primaryColor } = useAppTheme();
    const { t } = useTranslation();
    const { theme } = useUnistyles();
    const { width: screenWidth, height: screenHeight } = useWindowDimensions();
    const cardImageWidth = Math.max(screenWidth - 32, 280);
    const modalImageWidth = screenWidth;
    const modalImageHeight = Math.round(screenHeight * 0.72);
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

    const [previewModalData, setPreviewModalData] = useState<{ images: string[]; initialIndex: number } | null>(null);
    const [previewActiveIndex, setPreviewActiveIndex] = useState<number>(0);
    const [modalLoading, setModalLoading] = useState<Record<number, boolean>>({});
    const [modalError, setModalError] = useState<Record<number, boolean>>({});

    const modalTranslateY = useRef(new Animated.Value(0)).current;

    const closePreviewModal = useCallback(() => {
        Animated.timing(modalTranslateY, {
            toValue: screenHeight,
            duration: 220,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: true,
        }).start(() => {
            setPreviewModalData(null);
            modalTranslateY.setValue(0);
        });
    }, [screenHeight, modalTranslateY]);

    const panResponder = useRef(
        PanResponder.create({
            onStartShouldSetPanResponder: () => false,
            onMoveShouldSetPanResponder: (_: any, gestureState: any) => {
                // Respond to downward drag when vertical drag dominates over horizontal
                return gestureState.dy > 6 && Math.abs(gestureState.dy) > Math.abs(gestureState.dx) * 1.3;
            },
            onPanResponderMove: (_: any, gestureState: any) => {
                if (gestureState.dy > 0) {
                    modalTranslateY.setValue(gestureState.dy);
                }
            },
            onPanResponderRelease: (_: any, gestureState: any) => {
                if (gestureState.dy > 90 || gestureState.vy > 0.5) {
                    closePreviewModal();
                } else {
                    Animated.spring(modalTranslateY, {
                        toValue: 0,
                        friction: 8,
                        tension: 45,
                        useNativeDriver: true,
                    }).start();
                }
            },
            onPanResponderTerminate: () => {
                Animated.spring(modalTranslateY, {
                    toValue: 0,
                    friction: 8,
                    tension: 45,
                    useNativeDriver: true,
                }).start();
            },
        })
    ).current;

    const handleOpenPreview = useCallback((images: string[], initialIndex: number) => {
        modalTranslateY.setValue(0);
        setPreviewModalData({ images, initialIndex });
        setPreviewActiveIndex(initialIndex);
        setModalLoading({});
        setModalError({});
    }, [modalTranslateY]);

    const renderItem = useCallback(
        ({ item }: { item: ActivityItem }) => (
            <ActivityCard
                item={item}
                cardImageWidth={cardImageWidth}
                savingUrl={savingUrl}
                onSaveImage={handleSaveImage}
                onPreviewImage={(url) => handleOpenPreview([url], 0)}
                onPreviewImages={handleOpenPreview}
                theme={theme}
                styles={styles}
                t={t}
            />
        ),
        [cardImageWidth, savingUrl, handleSaveImage, handleOpenPreview, theme, styles, t]
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

    const listHeader = (
        <View style={selectedMonth !== currentMonthStr ? styles.listHeaderActive : styles.listHeaderSpacer}>
            {selectedMonth !== currentMonthStr && (
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
            )}
        </View>
    );

    const emptyStateComponent = (
        isLoading ? (
            <ActivityListSkeleton />
        ) : (
            <View style={styles.emptyContainer}>
                <EmptyState
                    icon={<FileText color={theme.colors.textSecondary} size={36} />}
                    title={t('no_activities_recorded', 'No Activities Recorded')}
                    description={t('no_activities_desc', 'You have not logged any work activities for this period yet.')}
                    actionTitle={t('log_new_activity', 'Log New Activity')}
                    onAction={() => navigation.navigate('CreateActivity')}
                />
            </View>
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
            <FlashList
                data={isLoading ? [] : activities}
                keyExtractor={keyExtractor}
                renderItem={renderItem}
                estimatedItemSize={380}
                contentContainerStyle={[styles.scrollContent, { paddingBottom: Math.max(16, insets.bottom + 8) }]}
                showsVerticalScrollIndicator={false}
                ListHeaderComponent={listHeader}
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
                <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    style={styles.monthPillsRow}
                    contentContainerStyle={styles.monthPillsContent}
                >
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
                </View>

                <View style={styles.categoryChipGrid}>
                    {FILTER_CATEGORIES.map((cat) => {
                        const isSel = draftCategory === cat.id;
                        const CatIcon = CATEGORY_ICONS[cat.id] || MoreHorizontal;

                        return (
                            <TouchableOpacity
                                key={cat.id}
                                style={[
                                    styles.categoryChip,
                                    isSel
                                        ? { backgroundColor: primaryColor, borderColor: primaryColor }
                                        : { backgroundColor: theme.colors.surfaceSubtle, borderColor: theme.colors.border },
                                ]}
                                onPress={() => {
                                    setDraftCategory(cat.id);
                                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
                                }}
                                activeOpacity={0.75}
                            >
                                <CatIcon
                                    color={isSel ? '#FFFFFF' : theme.colors.textSecondary}
                                    size={14}
                                />
                                <Text
                                    style={[
                                        styles.categoryChipLabel,
                                        { color: isSel ? '#FFFFFF' : theme.colors.textPrimary },
                                    ]}
                                    numberOfLines={1}
                                >
                                    {cat.label}
                                </Text>

                            </TouchableOpacity>
                        );
                    })}
                </View>
            </AppBottomSheet>

            {/* Fullscreen Photo Preview Modal */}
            <Modal
                visible={Boolean(previewModalData && previewModalData.images.length > 0)}
                transparent
                animationType="fade"
                onRequestClose={closePreviewModal}
            >
                <View style={styles.previewModalOverlay}>
                    {/* Native-accelerated Backdrop Fade */}
                    <Animated.View
                        style={[
                            StyleSheet.absoluteFillObject,
                            {
                                backgroundColor: '#000000',
                                opacity: modalTranslateY.interpolate({
                                    inputRange: [0, 220],
                                    outputRange: [0.96, 0.25],
                                    extrapolate: 'clamp',
                                }),
                            },
                        ]}
                        pointerEvents="none"
                    />

                    <Animated.View
                        {...panResponder.panHandlers}
                        style={{
                            flex: 1,
                            width: '100%',
                            justifyContent: 'center',
                            alignItems: 'center',
                            transform: [
                                { translateY: modalTranslateY },
                                {
                                    scale: modalTranslateY.interpolate({
                                        inputRange: [0, 240],
                                        outputRange: [1, 0.90],
                                        extrapolate: 'clamp',
                                    }),
                                },
                            ],
                        }}
                    >
                        {/* Top Bar: Counter Pill & Close Button */}
                        <View style={[styles.previewModalTopBar, { top: Math.max(48, insets.top + 10) }]}>
                            {previewModalData && previewModalData.images.length > 1 ? (
                                <View style={styles.previewModalCounterPill}>
                                    <Text style={styles.previewModalCounterText}>
                                        {previewActiveIndex + 1} / {previewModalData.images.length}
                                    </Text>
                                </View>
                            ) : (
                                <View />
                            )}

                            <TouchableOpacity
                                style={styles.previewModalCloseBtn}
                                onPress={closePreviewModal}
                                activeOpacity={0.8}
                                accessibilityLabel="Close photo preview"
                            >
                                <X color="#FFFFFF" size={20} strokeWidth={2.5} />
                            </TouchableOpacity>
                        </View>

                        {/* Image Viewer Carousel */}
                        {previewModalData && (
                            <ScrollView
                                horizontal
                                pagingEnabled
                                showsHorizontalScrollIndicator={false}
                                scrollEventThrottle={16}
                                contentOffset={{ x: previewModalData.initialIndex * screenWidth, y: 0 }}
                                style={{ width: screenWidth, height: modalImageHeight }}
                                onScroll={(e: any) => {
                                    const offset = e.nativeEvent?.contentOffset?.x ?? 0;
                                    const viewWidth = e.nativeEvent?.layoutMeasurement?.width || screenWidth;
                                    if (viewWidth > 0 && previewModalData) {
                                        const idx = Math.min(
                                            Math.max(Math.round(offset / viewWidth), 0),
                                            previewModalData.images.length - 1
                                        );
                                        if (idx !== previewActiveIndex) {
                                            setPreviewActiveIndex(idx);
                                        }
                                    }
                                }}
                                onMomentumScrollEnd={(e: any) => {
                                    const offset = e.nativeEvent?.contentOffset?.x ?? 0;
                                    const viewWidth = e.nativeEvent?.layoutMeasurement?.width || screenWidth;
                                    if (viewWidth > 0 && previewModalData) {
                                        const idx = Math.min(
                                            Math.max(Math.round(offset / viewWidth), 0),
                                            previewModalData.images.length - 1
                                        );
                                        setPreviewActiveIndex(idx);
                                    }
                                }}
                                onScrollEndDrag={(e: any) => {
                                    const offset = e.nativeEvent?.contentOffset?.x ?? 0;
                                    const viewWidth = e.nativeEvent?.layoutMeasurement?.width || screenWidth;
                                    if (viewWidth > 0 && previewModalData) {
                                        const idx = Math.min(
                                            Math.max(Math.round(offset / viewWidth), 0),
                                            previewModalData.images.length - 1
                                        );
                                        setPreviewActiveIndex(idx);
                                    }
                                }}
                            >
                                {previewModalData.images.map((imgUri, idx) => (
                                    <View
                                        key={`modal-${imgUri}-${idx}`}
                                        style={[styles.previewModalImageWrapper, { width: screenWidth, height: modalImageHeight }]}
                                    >
                                        {modalLoading[idx] !== false && (
                                            <View style={styles.previewModalCenter}>
                                                <ActivityIndicator size="large" color="#FFFFFF" />
                                            </View>
                                        )}

                                        {modalError[idx] ? (
                                            <View style={styles.previewModalCenter}>
                                                <AlertCircle color={theme.colors.status.danger} size={40} />
                                                <Text style={styles.previewModalErrorText}>
                                                    {t('image_load_failed', 'Unable to load photo preview')}
                                                </Text>
                                            </View>
                                        ) : (
                                            <Image
                                                source={{ uri: imgUri }}
                                                style={{ width: screenWidth, height: modalImageHeight }}
                                                contentFit="contain"
                                                cachePolicy="memory-disk"
                                                transition={200}
                                                onLoadStart={() => setModalLoading((p) => ({ ...p, [idx]: true }))}
                                                onLoad={() => setModalLoading((p) => ({ ...p, [idx]: false }))}
                                                onError={() => {
                                                    setModalLoading((p) => ({ ...p, [idx]: false }));
                                                    setModalError((p) => ({ ...p, [idx]: true }));
                                                }}
                                            />
                                        )}
                                    </View>
                                ))}
                            </ScrollView>
                        )}

                        {/* Bottom Action Bar (Save on Left, Close on Right - Near Thumb) */}
                        <View style={[styles.previewModalBottomBar, { bottom: Math.max(28, insets.bottom + 12) }]}>
                            {previewModalData && previewModalData.images[previewActiveIndex] && (
                                <TouchableOpacity
                                    style={[
                                        styles.previewModalSaveBtn,
                                        savingUrl === previewModalData.images[previewActiveIndex] && { opacity: 0.8 },
                                    ]}
                                    onPress={() => handleSaveImage(previewModalData.images[previewActiveIndex])}
                                    disabled={savingUrl === previewModalData.images[previewActiveIndex]}
                                    activeOpacity={0.85}
                                >
                                    {savingUrl === previewModalData.images[previewActiveIndex] ? (
                                        <ActivityIndicator color="#FFFFFF" size="small" />
                                    ) : (
                                        <Download color="#FFFFFF" size={15} />
                                    )}
                                    <Text style={styles.previewModalSaveText}>
                                        {savingUrl === previewModalData.images[previewActiveIndex]
                                            ? t('saving', 'Saving...')
                                            : t('save_to_gallery', 'Save')}
                                    </Text>
                                </TouchableOpacity>
                            )}

                            <TouchableOpacity
                                style={styles.previewModalBottomCloseBtn}
                                onPress={closePreviewModal}
                                activeOpacity={0.8}
                                accessibilityLabel="Close photo preview"
                            >
                                <X color="#FFFFFF" size={17} strokeWidth={2.5} />
                                <Text style={styles.previewModalBottomCloseText}>{t('close', 'Close')}</Text>
                            </TouchableOpacity>
                        </View>
                    </Animated.View>
                </View>
            </Modal>
        </AppShell>
    );
};

const stylesheet = StyleSheet.create((theme) => ({
    scrollContent: {
        flexGrow: 1,
        paddingTop: theme.spacing.md,
        paddingBottom: theme.spacing.lg,
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
    listHeaderSpacer: {
        height: theme.spacing.screenGutter,
    },
    listHeaderActive: {
        paddingTop: theme.spacing.screenGutter,
    },
    activeMonthChip: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: theme.colors.primary,
        paddingHorizontal: theme.spacing.md,
        paddingVertical: theme.spacing.xs + 4,
        borderRadius: theme.borderRadius.full,
        alignSelf: 'flex-start',
        marginHorizontal: theme.spacing.screenGutter,
        marginBottom: theme.spacing.md,
        gap: 8,
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
        marginHorizontal: -20,
    },
    monthPillsContent: {
        paddingHorizontal: 20,
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
        marginTop: 0,
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
        paddingTop: theme.spacing.md,
        paddingBottom: theme.spacing.xxl,
        paddingHorizontal: theme.spacing.screenGutter,
        alignSelf: 'stretch',
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
        marginHorizontal: theme.spacing.screenGutter,
        marginBottom: theme.spacing.md + 4,
        borderWidth: 1,
        borderColor: theme.colors.border,
        overflow: 'hidden',
    },
    heroImageContainer: {
        width: '100%',
        height: HERO_IMAGE_HEIGHT,
        backgroundColor: theme.colors.surfaceSubtle,
        position: 'relative',
        overflow: 'hidden',
    },
    heroScrollView: {
        width: '100%',
        height: HERO_IMAGE_HEIGHT,
    },
    heroImage: {
        width: '100%',
        height: HERO_IMAGE_HEIGHT,
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
        gap: 5,
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
        gap: 5,
    },
    saveBtnOverlayText: {
        color: '#FFFFFF',
        fontSize: 11,
        fontWeight: '700',
        marginLeft: 2,
    },
    cardBody: {
        padding: theme.spacing.md,
    },
    cardHeaderRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: theme.spacing.sm + 2,
    },
    categoryBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: theme.colors.surfaceSubtle,
        paddingHorizontal: theme.spacing.sm + 2,
        paddingVertical: theme.spacing.xs,
        borderRadius: theme.borderRadius.full,
        borderWidth: 1,
        borderColor: theme.colors.border,
        gap: 6,
    },
    categoryBadgeText: {
        fontSize: 12,
        fontWeight: '700',
        color: theme.colors.primary,
        marginLeft: 2,
    },
    statusBadgeText: {
        fontSize: 11,
        fontWeight: '800',
        marginLeft: 4,
    },
    locationCardBox: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        backgroundColor: theme.colors.surfaceSubtle,
        paddingHorizontal: theme.spacing.sm + 2,
        paddingVertical: 7,
        borderRadius: theme.borderRadius.md,
        borderWidth: 1,
        borderColor: theme.colors.border,
        marginBottom: theme.spacing.sm + 2,
        gap: 8,
    },
    locationPinWrapper: {
        marginTop: 2,
        justifyContent: 'center',
        alignItems: 'center',
    },
    locationText: {
        flex: 1,
        fontSize: 12,
        color: theme.colors.textSecondary,
        fontWeight: '500',
        lineHeight: 17,
        marginLeft: 2,
    },
    commentContainer: {
        paddingVertical: 2,
        marginBottom: theme.spacing.xs,
    },
    cardComment: {
        fontSize: 13.5,
        color: theme.colors.textPrimary,
        lineHeight: 20,
        fontWeight: '400',
    },
    dateGroup: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 5,
    },
    dateText: {
        fontSize: 11,
        color: theme.colors.textSecondary,
        marginLeft: 3,
        fontWeight: '600',
    },
    adminNoteBox: {
        marginTop: theme.spacing.sm + 2,
        padding: theme.spacing.sm + 2,
        backgroundColor: theme.colors.surfaceSubtle,
        borderRadius: theme.borderRadius.md,
        borderLeftWidth: 3,
        borderLeftColor: theme.colors.status.danger,
    },
    adminNoteHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        marginBottom: 4,
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
    categoryChipGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
        marginBottom: theme.spacing.md,
    },
    categoryChip: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        paddingHorizontal: 12,
        paddingVertical: 9,
        borderRadius: theme.borderRadius.full,
        borderWidth: 1,
    },
    categoryChipLabel: {
        fontSize: 13,
        fontWeight: '600',
        flexShrink: 1,
    },
    applyFilterBtn: {
        backgroundColor: theme.colors.primary,
        height: 52,
        borderRadius: 16,
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: 0,
        width: '100%',
    },
    applyFilterBtnText: {
        color: '#FFFFFF',
        fontSize: 15,
        fontWeight: '700',
    },
    previewModalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.94)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    previewModalTopBar: {
        position: 'absolute',
        left: 20,
        right: 20,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        zIndex: 50,
    },
    previewModalCounterPill: {
        backgroundColor: 'rgba(0, 0, 0, 0.65)',
        paddingHorizontal: theme.spacing.sm + 4,
        paddingVertical: 5,
        borderRadius: theme.borderRadius.full,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.2)',
    },
    previewModalCounterText: {
        color: '#FFFFFF',
        fontSize: 12,
        fontWeight: '700',
    },
    previewModalCloseBtn: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: 'rgba(255, 255, 255, 0.2)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    previewModalImageWrapper: {
        justifyContent: 'center',
        alignItems: 'center',
        overflow: 'hidden',
    },
    previewModalCenter: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: theme.spacing.xl,
    },
    previewModalErrorText: {
        color: '#FFFFFF',
        fontSize: 14,
        fontWeight: '600',
        textAlign: 'center',
        marginTop: theme.spacing.sm,
    },
    previewModalBottomBar: {
        position: 'absolute',
        alignSelf: 'center',
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        zIndex: 50,
    },
    previewModalBottomCloseBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(255, 255, 255, 0.22)',
        paddingHorizontal: theme.spacing.md + 2,
        paddingVertical: theme.spacing.sm + 4,
        borderRadius: theme.borderRadius.full,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.25)',
    },
    previewModalBottomCloseText: {
        color: '#FFFFFF',
        fontSize: 13,
        fontWeight: '700',
        marginLeft: 6,
    },
    previewModalSaveBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: theme.colors.primary,
        paddingHorizontal: theme.spacing.lg,
        paddingVertical: theme.spacing.sm + 4,
        borderRadius: theme.borderRadius.full,
    },
    previewModalSaveText: {
        color: '#FFFFFF',
        fontSize: 13,
        fontWeight: '700',
        marginLeft: 6,
    },
}));
