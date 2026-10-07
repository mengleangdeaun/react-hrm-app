import React from 'react';
import { View, TouchableOpacity } from 'react-native';
import { Bell, ChevronRight } from 'lucide-react-native';
import { StyleSheet, useUnistyles } from 'react-native-unistyles';
import { AppText as Text } from '../../../components/AppText';
import { formatRelativeTime } from '../../../utils/dateTime';
import { useTranslation } from '../../../context/LanguageContext';
import { AnnouncementItem } from '../types';

interface AnnouncementSectionProps {
    announcements: AnnouncementItem[];
    locale: string;
    onAnnouncementPress: (id: string | number) => void;
}

export const AnnouncementSection: React.FC<AnnouncementSectionProps> = ({
    announcements,
    locale,
    onAnnouncementPress,
}) => {
    const { t } = useTranslation();
    const { theme } = useUnistyles();
    const styles = stylesheet;

    if (!announcements || announcements.length === 0) return null;

    return (
        <View style={styles.sectionContainer}>
            <View style={styles.sectionHeaderRow}>
                <View style={styles.rowCentered}>
                    <Bell color={theme.colors.primary} size={18} />
                    <Text style={styles.sectionHeaderTitle}>
                        {t('company_announcements', 'Company Announcements')}
                    </Text>
                </View>
            </View>

            {announcements.slice(0, 3).map((item) => (
                <TouchableOpacity
                    key={item.id || item.title}
                    style={styles.announcementCard}
                    onPress={() => onAnnouncementPress(item.id)}
                    activeOpacity={0.8}
                >
                    <Text style={styles.announcementTitle}>
                        {item.title || item.pwa_title}
                    </Text>
                    <Text style={styles.announcementSummary} numberOfLines={2}>
                        {item.summary || item.content || item.description || t('tap_to_view_announcement', 'Tap to view announcement details.')}
                    </Text>
                    <View style={styles.announcementFooter}>
                        <Text style={styles.announcementDate}>
                            {item.created_at ? formatRelativeTime(item.created_at, locale, t('company_news', 'Company News')) : t('company_news', 'Company News')}
                        </Text>
                        <ChevronRight color={theme.colors.textSecondary} size={16} />
                    </View>
                </TouchableOpacity>
            ))}
        </View>
    );
};

const stylesheet = StyleSheet.create((theme) => ({
    sectionContainer: {
        marginBottom: theme.spacing.lg,
    },
    sectionHeaderRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: theme.spacing.sm + 2,
    },
    rowCentered: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    sectionHeaderTitle: {
        fontSize: 16,
        fontWeight: '700',
        color: theme.colors.textPrimary,
        marginLeft: theme.spacing.xs + 2,
    },
    announcementCard: {
        backgroundColor: theme.colors.surface,
        borderRadius: theme.borderRadius.lg,
        padding: theme.spacing.cardPadding,
        marginBottom: theme.spacing.sm + 2,
        borderWidth: 0.5,
        borderColor: (theme.colors as any).borderSubtle || theme.colors.border,
    },
    announcementTitle: {
        fontSize: 14,
        fontWeight: '700',
        color: theme.colors.textPrimary,
        marginBottom: 4,
    },
    announcementSummary: {
        fontSize: 12,
        color: theme.colors.textSecondary,
        marginBottom: theme.spacing.sm,
    },
    announcementFooter: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingTop: theme.spacing.xs + 2,
        borderTopWidth: 1,
        borderTopColor: theme.colors.border,
    },
    announcementDate: {
        fontSize: 11,
        color: theme.colors.textSecondary,
    },
}));
