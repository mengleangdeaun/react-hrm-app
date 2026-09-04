import React, { useState, useEffect } from 'react';
import {
    View,
    ScrollView,
    TouchableOpacity,
    StatusBar,
    ActivityIndicator,
    Image,
    Modal,
    Alert,
    Linking,
    useWindowDimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StyleSheet, useUnistyles } from 'react-native-unistyles';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { format, parseISO, isValid, formatDateDisplay, formatTimeDisplay } from '../../utils/dateTime';
import { useAppTheme } from '../../context/ThemeContext';
import { useTranslation } from '../../context/LanguageContext';
import { apiClient } from '../../api/client';
import { notificationApi } from '../../api/notification';
import { AppText as Text } from '../../components/AppText';
import { AppHeader } from '../../components/common/AppHeader';
import { AppMarkdown } from '../../components/common/AppMarkdown';
import {
    ArrowLeft,
    Download,
    Paperclip,
    Calendar,
    Eye,
    Info,
    CheckCircle2,
    AlertTriangle,
    AlertOctagon,
    Trash2,
    X,
    Sparkles,
} from 'lucide-react-native';

const cleanHtml = (htmlStr?: string) => {
    if (!htmlStr) return '';
    return htmlStr
        .replace(/<p[^>]*>/gi, '')
        .replace(/<\/p>/gi, '\n\n')
        .replace(/<br\s*\/?>/gi, '\n')
        .replace(/<li[^>]*>/gi, '• ')
        .replace(/<\/li>/gi, '\n')
        .replace(/<[^>]*>?/gm, '')
        .replace(/&nbsp;/gi, ' ')
        .replace(/&amp;/gi, '&')
        .replace(/&lt;/gi, '<')
        .replace(/&gt;/gi, '>')
        .replace(/&quot;/gi, '"')
        .replace(/&#39;/gi, "'")
        .replace(/\n{3,}/g, '\n\n')
        .trim();
};

const formatAnnouncementDate = (rawStr?: string) => {
    if (!rawStr) return 'Recent';
    return `${formatDateDisplay(rawStr, 'short')} • ${formatTimeDisplay(rawStr)}`;
};

import { AppShell } from '../../components/common/AppShell';
import { HeaderIconButton } from '../../components/common/AppHeader';

export const AnnouncementDetailScreen: React.FC<{ route: any; navigation: any }> = ({
    route,
    navigation,
}) => {
    const { isDark, primaryColor } = useAppTheme();
    const { t } = useTranslation();
    const { theme } = useUnistyles();
    const { width: screenWidth } = useWindowDimensions();
    const styles = stylesheet;
    const queryClient = useQueryClient();

    const announcementId = route.params?.id;
    const notificationId = route.params?.notificationId;
    const notificationItem = route.params?.notification;

    const [imagePreviewVisible, setImagePreviewVisible] = useState<boolean>(false);
    const [previewImageUrl, setPreviewImageUrl] = useState<string | null>(null);

    // 10-minute React Query Caching for Announcement Detail
    const { data: announcementData, isLoading: isLoadingQuery } = useQuery({
        queryKey: ['announcementDetail', announcementId || notificationId],
        queryFn: async () => {
            if (!announcementId) return notificationItem;
            try {
                const res = await apiClient.get(`/employee-app/announcements/${announcementId}`);
                return res?.data || res;
            } catch (err) {
                console.warn('Failed to fetch announcement detail, fallback to notification payload:', err);
                return notificationItem;
            }
        },
        enabled: !!announcementId || !!notificationItem,
        staleTime: 1000 * 60 * 10, // 10 minutes cache
        placeholderData: notificationItem,
    });

    useEffect(() => {
        // Mark as read on backend & update React Query cache if coming from notification
        if (notificationId) {
            notificationApi.markAsRead(notificationId).catch(() => null);
            queryClient.setQueryData<any[]>(['notificationsList'], (old) =>
                (old || []).map((n) => (n.id === notificationId ? { ...n, read_at: new Date().toISOString() } : n))
            );
        }
    }, [notificationId]);

    const handleDeleteNotification = () => {
        const targetId = notificationId || notificationItem?.id;
        if (!targetId) return;

        Alert.alert(
            t('confirm_delete', 'Delete Notification'),
            t('delete_all_confirmation', 'Are you sure you want to delete this notification?'),
            [
                { text: t('cancel', 'Cancel'), style: 'cancel' },
                {
                    text: t('confirm_delete', 'Delete'),
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            await notificationApi.deleteNotification(targetId);
                            queryClient.invalidateQueries({ queryKey: ['notificationsList'] });
                            navigation.goBack();
                        } catch (err) {
                            console.warn('Failed to delete notification', err);
                        }
                    },
                },
            ]
        );
    };

    const handleOpenAttachment = (url?: string) => {
        if (!url) return;
        Linking.openURL(url).catch(() => {
            Alert.alert(t('error', 'Error'), t('unable_open_attachment', 'Unable to open attachment link.'));
        });
    };

    const announcement = announcementData || notificationItem;
    const isLoading = isLoadingQuery && !announcement;

    const rawTitle = announcement?.title || notificationItem?.title;
    const translatedTitle = rawTitle ? t(rawTitle, rawTitle, notificationItem?.data || announcement?.data) : '';
    const title = cleanHtml(translatedTitle) || t('company_announcement', 'Company Announcement');
    const dateStr = formatAnnouncementDate(announcement?.published_at || announcement?.created_at || notificationItem?.created_at);
    const typeStr = (announcement?.type || notificationItem?.type || 'info').toLowerCase();
    const shortDesc = cleanHtml(announcement?.short_description);
    const rawUnprocessedBody = announcement?.content || announcement?.body || announcement?.message || notificationItem?.message || '';
    const rawBody = (notificationItem?.data || announcement?.data)
        ? t(rawUnprocessedBody, rawUnprocessedBody, notificationItem?.data || announcement?.data)
        : rawUnprocessedBody;
    const bodyContent = cleanHtml(rawBody);
    const featuredImageUrl = announcement?.featured_image_url || announcement?.image_url;
    const viewsCount = announcement?.views_count;
    const isFeatured = announcement?.is_featured;

    const attachmentName = announcement?.attachment_name || announcement?.file_name;
    const attachmentUrl = announcement?.attachment_url || announcement?.file_url;

    const getTypeIcon = () => {
        if (typeStr.includes('warning')) return <AlertTriangle color={theme.colors.status.warning} size={14} />;
        if (typeStr.includes('danger') || typeStr.includes('alert')) return <AlertOctagon color={theme.colors.status.danger} size={14} />;
        if (typeStr.includes('success')) return <CheckCircle2 color={theme.colors.status.success} size={14} />;
        return <Info color={primaryColor} size={14} />;
    };

    const headerRight = (notificationId || notificationItem?.id) ? (
        <HeaderIconButton
            icon={<Trash2 color={theme.colors.status.danger} size={18} />}
            onPress={handleDeleteNotification}
            accessibilityLabel="Delete notification"
        />
    ) : undefined;

    return (
        <AppShell
            title={t('tab_announcement', 'Announcement Details')}
            onBack={() => navigation.goBack()}
            headerRight={headerRight}
        >
            {isLoading ? (
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color={primaryColor} />
                </View>
            ) : (
                <>
                    {/* Hero Featured Image Banner */}
                    {featuredImageUrl && (
                        <TouchableOpacity
                            style={styles.heroImageWrapper}
                            activeOpacity={0.9}
                            onPress={() => {
                                setPreviewImageUrl(featuredImageUrl);
                                setImagePreviewVisible(true);
                            }}
                        >
                            <Image source={{ uri: featuredImageUrl }} style={styles.heroImage} resizeMode="cover" />
                        </TouchableOpacity>
                    )}

                    {/* Category & Featured Badge Row */}
                    <View style={styles.badgeRow}>
                        <View style={styles.typeBadge}>
                            {getTypeIcon()}
                            <Text style={styles.typeBadgeText}>{typeStr.toUpperCase()}</Text>
                        </View>

                        {isFeatured && (
                            <View style={styles.featuredBadge}>
                                <Sparkles color="#D97706" size={13} />
                                <Text style={styles.featuredBadgeText}>{t('featured', 'FEATURED')}</Text>
                            </View>
                        )}
                    </View>

                    {/* Title */}
                    <Text style={styles.title}>{title}</Text>

                    {/* Metadata Row */}
                    <View style={styles.metaRow}>
                        <View style={styles.metaItem}>
                            <Calendar color={primaryColor} size={14} />
                            <Text style={styles.metaText}>{dateStr}</Text>
                        </View>

                        {viewsCount !== undefined && viewsCount > 0 && (
                            <View style={styles.metaItem}>
                                <Eye color={theme.colors.status.success} size={14} />
                                <Text style={styles.metaText}>{viewsCount} {t('views', 'views')}</Text>
                            </View>
                        )}
                    </View>

                    <View style={styles.divider} />

                    {/* Short Description Highlight Callout Box */}
                    {shortDesc ? (
                        <View style={[styles.shortDescCard, { borderLeftColor: primaryColor }]}>
                            <Text style={styles.shortDescText}>{shortDesc}</Text>
                        </View>
                    ) : null}

                    {/* Main Article Body */}
                    <AppMarkdown content={rawBody} />

                    {/* PWA Custom Action Button */}
                    {announcement?.has_pwa_action && announcement?.pwa_action_url && (
                        <TouchableOpacity
                            style={[styles.pwaActionBtn, { backgroundColor: primaryColor }]}
                            activeOpacity={0.85}
                            onPress={() => {
                                Linking.openURL(announcement.pwa_action_url).catch(() => {
                                    Alert.alert(t('error', 'Error'), t('unable_open_link', 'Unable to open link.'));
                                });
                            }}
                        >
                            <Text style={styles.pwaActionBtnText}>
                                {announcement.pwa_action_label || t('read_more', 'Read More')}
                            </Text>
                        </TouchableOpacity>
                    )}

                    {/* Attachments Section */}
                    {Array.isArray(announcement?.attachments_with_urls) && announcement.attachments_with_urls.length > 0 ? (
                        <View style={styles.attachmentsSection}>
                            <View style={styles.attachmentsHeader}>
                                <Paperclip color={theme.colors.textSecondary} size={16} />
                                <Text style={styles.attachmentsTitle}>
                                    {t('attachments', 'Attachments')} ({announcement.attachments_with_urls.length})
                                </Text>
                            </View>
                            <View style={styles.attachmentsList}>
                                {announcement.attachments_with_urls.map((file: any, fIdx: number) => (
                                    <TouchableOpacity
                                        key={fIdx}
                                        style={styles.attachCard}
                                        activeOpacity={0.8}
                                        onPress={() => handleOpenAttachment(file.url)}
                                    >
                                        <View style={styles.attachIconBox}>
                                            <Paperclip color={primaryColor} size={18} />
                                        </View>
                                        <View style={styles.attachInfo}>
                                            <Text style={styles.attachName} numberOfLines={1}>{file.name}</Text>
                                            <Text style={styles.attachSize}>
                                                {file.size ? `${(file.size / 1024).toFixed(1)} KB` : ''} • {file.type || 'FILE'}
                                            </Text>
                                        </View>
                                        <Download color={primaryColor} size={18} />
                                    </TouchableOpacity>
                                ))}
                            </View>
                        </View>
                    ) : attachmentName ? (
                        <TouchableOpacity
                            style={styles.attachCard}
                            activeOpacity={0.8}
                            onPress={() => handleOpenAttachment(attachmentUrl)}
                        >
                            <View style={styles.attachIconBox}>
                                <Paperclip color={primaryColor} size={18} />
                            </View>
                            <View style={styles.attachInfo}>
                                <Text style={styles.attachName}>{attachmentName}</Text>
                                <Text style={styles.attachSize}>
                                    {announcement?.attachment_size || t('attached_document', 'Attached Document')}
                                </Text>
                            </View>
                            <Download color={primaryColor} size={18} />
                        </TouchableOpacity>
                    ) : null}
                </>
            )}

            {/* Fullscreen Image Preview Modal */}
            {previewImageUrl && (
                <Modal
                    visible={!!previewImageUrl}
                    transparent={true}
                    animationType="fade"
                    onRequestClose={() => setPreviewImageUrl(null)}
                >
                    <View style={styles.imageModalOverlay}>
                        <TouchableOpacity
                            style={styles.imageModalCloseBtn}
                            onPress={() => setPreviewImageUrl(null)}
                            activeOpacity={0.8}
                        >
                            <X color="#FFFFFF" size={24} />
                        </TouchableOpacity>
                        <Image
                            source={{ uri: previewImageUrl }}
                            style={{ width: screenWidth, height: '80%' }}
                            resizeMode="contain"
                        />
                    </View>
                </Modal>
            )}
        </AppShell>
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
    container: {
        flex: 1,
    },
    scrollContent: {
        flexGrow: 1,
        paddingHorizontal: theme.spacing.md + 4,
        paddingBottom: theme.spacing.xl + 40,
    },
    loadingContainer: {
        paddingVertical: theme.spacing.xxl,
        alignItems: 'center',
    },
    heroImageWrapper: {
        width: '100%',
        height: 200,
        borderRadius: theme.borderRadius.lg,
        overflow: 'hidden',
        marginBottom: theme.spacing.md,
        borderWidth: 1,
        borderColor: theme.colors.border,
    },
    heroImage: {
        width: '100%',
        height: '100%',
    },
    badgeRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: theme.spacing.xs + 4,
        marginBottom: theme.spacing.sm,
    },
    typeBadge: {
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
    typeBadgeText: {
        fontSize: 11,
        fontWeight: '800',
        color: theme.colors.textPrimary,
    },
    featuredBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(217, 119, 6, 0.12)',
        paddingHorizontal: theme.spacing.sm + 2,
        paddingVertical: theme.spacing.xs,
        borderRadius: theme.borderRadius.full,
        borderWidth: 1,
        borderColor: 'rgba(217, 119, 6, 0.25)',
        gap: 4,
    },
    featuredBadgeText: {
        fontSize: 11,
        fontWeight: '800',
        color: '#D97706',
    },
    title: {
        fontSize: 22,
        fontWeight: '800',
        color: theme.colors.textPrimary,
        lineHeight: 28,
        marginBottom: theme.spacing.xs + 4,
    },
    metaRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        alignItems: 'center',
        gap: theme.spacing.md,
        marginBottom: theme.spacing.md,
    },
    metaItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    metaText: {
        fontSize: 12,
        fontWeight: '600',
        color: theme.colors.textSecondary,
    },
    divider: {
        height: 1,
        backgroundColor: theme.colors.border,
        marginBottom: theme.spacing.md,
    },
    shortDescCard: {
        backgroundColor: theme.colors.surfaceSubtle,
        borderLeftWidth: 4,
        borderRadius: theme.borderRadius.md,
        padding: theme.spacing.md,
        marginBottom: theme.spacing.md,
    },
    shortDescText: {
        fontSize: 14,
        fontWeight: '600',
        lineHeight: 20,
        color: theme.colors.textPrimary,
    },
    bodyText: {
        fontSize: 15,
        lineHeight: 24,
        fontWeight: '400',
        color: theme.colors.textPrimary,
        marginBottom: theme.spacing.xl,
    },
    attachCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: theme.colors.surface,
        padding: theme.spacing.md,
        borderRadius: theme.borderRadius.lg,
        borderWidth: 1,
        borderColor: theme.colors.border,
        ...theme.shadows.sm,
    },
    attachIconBox: {
        width: 36,
        height: 36,
        borderRadius: theme.borderRadius.md,
        backgroundColor: theme.colors.surfaceSubtle,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: theme.colors.border,
    },
    attachInfo: {
        flex: 1,
        marginLeft: theme.spacing.sm + 2,
    },
    attachName: {
        color: theme.colors.textPrimary,
        fontSize: 14,
        fontWeight: '700',
    },
    attachSize: {
        color: theme.colors.textSecondary,
        fontSize: 12,
        marginTop: 2,
    },
    imageModalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.9)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    imageModalCloseBtn: {
        position: 'absolute',
        top: 40,
        right: 20,
        zIndex: 10,
        padding: 8,
    },
    pwaActionBtn: {
        height: 48,
        borderRadius: theme.borderRadius.md,
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: theme.spacing.lg,
        marginBottom: theme.spacing.md,
        ...theme.shadows.md,
    },
    pwaActionBtnText: {
        color: '#FFFFFF',
        fontSize: 13,
        fontWeight: '800',
        textTransform: 'uppercase',
        letterSpacing: 0.8,
    },
    attachmentsSection: {
        marginTop: theme.spacing.lg,
        paddingTop: theme.spacing.md,
        borderTopWidth: 1,
        borderTopColor: theme.colors.border,
    },
    attachmentsHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        marginBottom: theme.spacing.sm,
    },
    attachmentsTitle: {
        fontSize: 11,
        fontWeight: '800',
        textTransform: 'uppercase',
        letterSpacing: 0.8,
        color: theme.colors.textSecondary,
    },
    attachmentsList: {
        gap: theme.spacing.sm,
    },
}));
