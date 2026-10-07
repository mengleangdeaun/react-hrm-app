import React from 'react';
import { View } from 'react-native';
import { Image } from 'expo-image';
import { Sun, Moon, Bell } from 'lucide-react-native';
import { StyleSheet, useUnistyles } from 'react-native-unistyles';
import { AppText as Text } from '../../../components/AppText';
import { HeaderIconButton } from '../../../components/common/AppHeader';
import { useAppTheme } from '../../../context/ThemeContext';
import { useTranslation } from '../../../context/LanguageContext';

interface DashboardHeaderProps {
    displayName: string;
    avatarUrl: string | null;
    showAvatarImage: boolean;
    greeting: string;
    unreadNotifications: number;
    onToggleTheme: () => void;
    onNotificationsPress: () => void;
    onAvatarError: () => void;
}

export const DashboardHeader: React.FC<DashboardHeaderProps> = ({
    displayName,
    avatarUrl,
    showAvatarImage,
    greeting,
    unreadNotifications,
    onToggleTheme,
    onNotificationsPress,
    onAvatarError,
}) => {
    const { isDark } = useAppTheme();
    const { t } = useTranslation();
    const { theme } = useUnistyles();
    const styles = stylesheet;

    return (
        <View style={styles.fixedHeaderWrapper}>
            <View style={styles.headerRow}>
                <View style={styles.userProfileGroup}>
                    {showAvatarImage ? (
                        <Image
                            source={{ uri: avatarUrl! }}
                            style={styles.avatarImage}
                            contentFit="cover"
                            cachePolicy="memory-disk"
                            transition={200}
                            onError={onAvatarError}
                        />
                    ) : (
                        <View style={styles.avatarFallback}>
                            <Text style={styles.avatarText}>
                                {displayName ? displayName.charAt(0).toUpperCase() : 'U'}
                            </Text>
                        </View>
                    )}
                    <View style={styles.greetingTextContainer}>
                        <Text style={styles.greetingSubtitle} numberOfLines={1}>
                            {greeting}
                        </Text>
                        <Text variant="h2" style={styles.greetingTitle} numberOfLines={1}>
                            {displayName}
                        </Text>
                    </View>
                </View>

                <View style={styles.headerActionsGroup}>
                    <HeaderIconButton
                        icon={isDark ? <Sun color="#F59E0B" size={18} /> : <Moon color="#2563EB" size={18} />}
                        onPress={onToggleTheme}
                        accessibilityLabel={t('toggle_theme', 'Toggle theme')}
                    />

                    <HeaderIconButton
                        icon={<Bell color={theme.colors.textPrimary} size={18} />}
                        onPress={onNotificationsPress}
                        accessibilityLabel={t('notifications', 'Notifications')}
                        badge={unreadNotifications > 0 ? (unreadNotifications > 9 ? '9+' : unreadNotifications) : undefined}
                        style={{ marginLeft: 8 }}
                    />
                </View>
            </View>
        </View>
    );
};

const stylesheet = StyleSheet.create((theme) => ({
    fixedHeaderWrapper: {
        backgroundColor: theme.colors.background,
        zIndex: 10,
    },
    headerRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: theme.spacing.md + 4,
        paddingTop: theme.spacing.sm,
        paddingBottom: theme.spacing.sm,
        backgroundColor: theme.colors.background,
    },
    userProfileGroup: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
        marginRight: theme.spacing.xs,
    },
    avatarImage: {
        width: 48,
        height: 48,
        borderRadius: theme.borderRadius.full,
        borderWidth: 1.5,
        borderColor: (theme.colors as any).borderSubtle || theme.colors.border,
    },
    avatarFallback: {
        width: 46,
        height: 46,
        borderRadius: theme.borderRadius.full,
        backgroundColor: theme.colors.primary,
        justifyContent: 'center',
        alignItems: 'center',
    },
    avatarText: {
        fontSize: 20,
        fontWeight: '800',
        color: '#FFFFFF',
    },
    greetingTextContainer: {
        marginLeft: theme.spacing.sm + 4,
        flex: 1,
        justifyContent: 'center',
    },
    greetingSubtitle: {
        fontSize: 12,
        color: theme.colors.textSecondary,
        fontWeight: '500',
        marginBottom: 0,
    },
    greetingTitle: {
        fontSize: 18,
        lineHeight: 26,
        fontWeight: '700',
        color: theme.colors.textPrimary,
        paddingBottom: 2,
    },
    headerActionsGroup: {
        flexDirection: 'row',
        alignItems: 'center',
    },
}));
