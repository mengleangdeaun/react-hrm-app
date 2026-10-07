import React from 'react';
import { View, TouchableOpacity } from 'react-native';
import { AlertTriangle, X } from 'lucide-react-native';
import { StyleSheet } from 'react-native-unistyles';
import { AppText as Text } from '../../../components/AppText';
import { useTranslation } from '../../../context/LanguageContext';
import { AnnouncementItem } from '../types';

interface TopBannerAlertProps {
    announcement: AnnouncementItem;
    onView: (id: string | number) => void;
    onDismiss: (item: AnnouncementItem) => void;
}

export const TopBannerAlert: React.FC<TopBannerAlertProps> = ({
    announcement,
    onView,
    onDismiss,
}) => {
    const { t } = useTranslation();
    const styles = stylesheet;

    return (
        <View style={styles.topBanner}>
            <View style={styles.topBannerLeft}>
                <AlertTriangle color="#FFFFFF" size={16} />
                <Text style={styles.topBannerTitle} numberOfLines={1}>
                    {announcement.title || announcement.pwa_title}
                </Text>
            </View>
            <View style={styles.topBannerRightGroup}>
                <TouchableOpacity
                    onPress={() => onView(announcement.id)}
                    style={styles.topBannerBtn}
                    activeOpacity={0.8}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    accessibilityRole="button"
                    accessibilityLabel="View announcement"
                >
                    <Text style={styles.topBannerBtnText}>{t('view', 'View')}</Text>
                </TouchableOpacity>

                <TouchableOpacity
                    onPress={() => onDismiss(announcement)}
                    style={styles.topBannerCloseBtn}
                    activeOpacity={0.7}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                    accessibilityRole="button"
                    accessibilityLabel="Dismiss announcement banner permanently"
                >
                    <X color="#FFFFFF" size={14} />
                </TouchableOpacity>
            </View>
        </View>
    );
};

const stylesheet = StyleSheet.create((theme) => ({
    topBanner: {
        backgroundColor: '#F59E0B',
        paddingHorizontal: theme.spacing.md,
        paddingVertical: theme.spacing.xs + 2,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    topBannerLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
        marginRight: theme.spacing.xs,
    },
    topBannerTitle: {
        color: '#FFFFFF',
        fontSize: 12,
        fontWeight: '700',
        marginLeft: theme.spacing.xs,
        flex: 1,
    },
    topBannerRightGroup: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    topBannerBtn: {
        backgroundColor: 'rgba(180, 83, 9, 0.6)',
        paddingHorizontal: theme.spacing.sm + 2,
        paddingVertical: theme.spacing.xs,
        borderRadius: theme.borderRadius.sm,
    },
    topBannerBtnText: {
        color: '#FFFFFF',
        fontSize: 11,
        fontWeight: '800',
        textTransform: 'uppercase',
    },
    topBannerCloseBtn: {
        width: 26,
        height: 26,
        borderRadius: 13,
        backgroundColor: 'rgba(0, 0, 0, 0.2)',
        justifyContent: 'center',
        alignItems: 'center',
    },
}));
