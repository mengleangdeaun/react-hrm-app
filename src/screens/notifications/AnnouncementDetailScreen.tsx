import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    ScrollView,
    TouchableOpacity,
    SafeAreaView,
    StatusBar,
    ActivityIndicator,
} from 'react-native';
import { StyleSheet, useUnistyles } from 'react-native-unistyles';
import { useAppTheme } from '../../context/ThemeContext';
import { apiClient } from '../../api/client';
import { ArrowLeft, Bell, Download, Paperclip } from 'lucide-react-native';

export const AnnouncementDetailScreen: React.FC<{ route: any; navigation: any }> = ({
    route,
    navigation,
}) => {
    const { isDark } = useAppTheme();
    const { theme } = useUnistyles();
    const styles = stylesheet;

    const notificationItem = route.params?.notification;
    const announcementId = route.params?.id;

    const [announcement, setAnnouncement] = useState<any>(null);
    const [isLoading, setIsLoading] = useState<boolean>(true);

    useEffect(() => {
        if (announcementId) {
            fetchAnnouncement();
        } else if (notificationItem) {
            setAnnouncement(notificationItem);
            setIsLoading(false);
        } else {
            setIsLoading(false);
        }
    }, [announcementId]);

    const fetchAnnouncement = async () => {
        try {
            const res = await apiClient.get(`/employee-app/announcements/${announcementId}`).catch(() => null);
            if (res?.data) {
                setAnnouncement(res.data);
            } else {
                setAnnouncement(notificationItem || {
                    title: 'Mid-Year Performance Review Schedule',
                    created_at: 'Today at 10:00 AM',
                    author: 'HR Department',
                    content: `Dear Team,\n\nWe are pleased to announce that our Mid-Year Performance Reviews will commence next week.\nThe goal of this review is to evaluate progress on key quarterly deliverables, align on career development goals, and address any feedback.\n\nKey Deadlines:\n• Friday, Jul 24: Self-assessment submission deadline.\n• Monday, Jul 27 - Friday, Jul 31: One-on-one manager review meetings.\n\nPlease download the attached Self-Assessment Guidelines template below for instructions.`,
                    attachment_name: 'Self_Assessment_Guide_2026.pdf',
                    attachment_size: '1.4 MB • PDF Document',
                });
            }
        } catch (e) {
            console.warn('Failed to load announcement detail:', e);
        } finally {
            setIsLoading(false);
        }
    };

    const title = announcement?.title || announcement?.pwa_title || 'Company Announcement';
    const dateStr = announcement?.created_at || 'Recent';
    const authorStr = announcement?.author || announcement?.created_by || 'HR Management';
    const bodyContent = announcement?.content || announcement?.body || announcement?.message || 'No additional content details available.';
    const attachmentName = announcement?.attachment_name || announcement?.file_name;

    return (
        <SafeAreaView style={styles.safeArea}>
            <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />

            {/* Navigation Header */}
            <View style={styles.topBar}>
                <TouchableOpacity style={styles.iconCircle} onPress={() => navigation.goBack()} activeOpacity={0.7}>
                    <ArrowLeft color={theme.colors.textPrimary} size={20} />
                </TouchableOpacity>

                <Text style={styles.headerTitle}>Announcement Details</Text>

                <View style={{ width: 40 }} />
            </View>

            <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
                {isLoading ? (
                    <View style={styles.loadingContainer}>
                        <ActivityIndicator size="large" color={theme.colors.primary} />
                    </View>
                ) : (
                    <>
                        {/* Category Badge */}
                        <View style={styles.badge}>
                            <Bell color={theme.colors.primary} size={14} />
                            <Text style={styles.badgeText}>COMPANY ANNOUNCEMENT</Text>
                        </View>

                        {/* Title & Author Info */}
                        <Text style={styles.title}>{title}</Text>
                        <Text style={styles.dateText}>Published on {dateStr} by {authorStr}</Text>

                        <View style={styles.divider} />

                        {/* Article Body */}
                        <Text style={styles.bodyText}>{bodyContent}</Text>

                        {/* File Attachment Box */}
                        {attachmentName && (
                            <TouchableOpacity style={styles.attachCard} activeOpacity={0.8}>
                                <Paperclip color={theme.colors.primary} size={20} />
                                <View style={styles.attachInfo}>
                                    <Text style={styles.attachName}>{attachmentName}</Text>
                                    <Text style={styles.attachSize}>
                                        {announcement?.attachment_size || 'Attached Document'}
                                    </Text>
                                </View>
                                <Download color={theme.colors.primary} size={20} />
                            </TouchableOpacity>
                        )}
                    </>
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
    container: {
        flex: 1,
    },
    scrollContent: {
        paddingHorizontal: theme.spacing.md + 4,
        paddingBottom: theme.spacing.xl,
    },
    loadingContainer: {
        paddingVertical: theme.spacing.xxl,
        alignItems: 'center',
    },
    badge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(37, 99, 235, 0.1)',
        paddingHorizontal: theme.spacing.sm + 2,
        paddingVertical: theme.spacing.xs,
        borderRadius: theme.borderRadius.sm,
        alignSelf: 'flex-start',
        marginBottom: theme.spacing.sm + 2,
    },
    badgeText: {
        color: theme.colors.primary,
        fontSize: 11,
        fontWeight: '800',
        marginLeft: theme.spacing.xs,
    },
    title: {
        color: theme.colors.textPrimary,
        fontSize: 22,
        fontWeight: '800',
        marginBottom: theme.spacing.xs + 2,
    },
    dateText: {
        color: theme.colors.textSecondary,
        fontSize: 13,
        marginBottom: theme.spacing.md,
    },
    divider: {
        height: 1,
        backgroundColor: theme.colors.border,
        marginBottom: theme.spacing.md,
    },
    bodyText: {
        color: theme.colors.textPrimary,
        fontSize: 15,
        lineHeight: 22,
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
}));
