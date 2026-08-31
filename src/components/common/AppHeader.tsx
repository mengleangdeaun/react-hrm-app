import React from 'react';
import {
    View,
    TouchableOpacity,
    StyleSheet,
    Platform,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { ArrowLeft, X } from 'lucide-react-native';
import { useAppTheme } from '../../context/ThemeContext';
import { lightTheme, darkTheme } from '../../styles/theme';
import { AppText } from '../AppText';

export interface HeaderAction {
    icon: React.ReactNode;
    onPress: () => void;
    accessibilityLabel?: string;
    badge?: number | string | boolean;
}

export interface AppHeaderProps {
    title: string;
    subtitle?: string;
    onBack?: () => void;
    onClose?: () => void;
    rightActions?: HeaderAction[];
    style?: any;
    titleAlign?: 'left' | 'center';
    showBorder?: boolean;
}

export const HeaderIconButton: React.FC<{
    icon: React.ReactNode;
    onPress: () => void;
    accessibilityLabel?: string;
    style?: any;
    badge?: number | string | boolean;
}> = ({ icon, onPress, accessibilityLabel, style, badge }) => {
    const { isDark } = useAppTheme();
    const theme = isDark ? darkTheme : lightTheme;

    const handlePress = () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
        onPress();
    };

    const hasBadge = badge !== undefined && badge !== false && badge !== 0;

    return (
        <TouchableOpacity
            onPress={handlePress}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel={accessibilityLabel}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            style={[
                styles.iconButton,
                {
                    backgroundColor: isDark ? 'rgba(255, 255, 255, 0.07)' : 'rgba(0, 0, 0, 0.04)',
                    borderColor: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.06)',
                },
                style,
            ]}
        >
            {icon}
            {hasBadge && (
                <View
                    style={[
                        styles.badgeContainer,
                        { borderColor: theme.colors.background },
                    ]}
                >
                    {typeof badge === 'number' || typeof badge === 'string' ? (
                        <AppText style={styles.badgeText}>
                            {typeof badge === 'number' && badge > 9 ? '9+' : badge}
                        </AppText>
                    ) : (
                        <View style={styles.badgeDot} />
                    )}
                </View>
            )}
        </TouchableOpacity>
    );
};

export const AppHeader: React.FC<AppHeaderProps> = ({
    title,
    subtitle,
    onBack,
    onClose,
    rightActions = [],
    style,
    titleAlign = 'left',
    showBorder = false,
}) => {
    const { isDark } = useAppTheme();
    const theme = isDark ? darkTheme : lightTheme;

    const hasLeftAction = !!onBack || !!onClose;
    const isCentered = titleAlign === 'center';

    return (
        <View
            style={[
                styles.headerContainer,
                {
                    backgroundColor: theme.colors.background,
                    borderBottomColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.06)',
                    borderBottomWidth: showBorder ? StyleSheet.hairlineWidth : 0,
                },
                style,
            ]}
        >
            {/* Left Action Slot */}
            {hasLeftAction ? (
                <View style={styles.leftSlot}>
                    {onBack && (
                        <HeaderIconButton
                            icon={<ArrowLeft color={theme.colors.textPrimary} size={19} />}
                            onPress={onBack}
                            accessibilityLabel="Go back"
                        />
                    )}
                    {onClose && !onBack && (
                        <HeaderIconButton
                            icon={<X color={theme.colors.textPrimary} size={19} />}
                            onPress={onClose}
                            accessibilityLabel="Close"
                        />
                    )}
                </View>
            ) : isCentered ? (
                <View style={styles.placeholderBox} />
            ) : null}

            {/* Title & Subtitle */}
            <View
                style={[
                    styles.titleContainer,
                    isCentered && styles.titleCentered,
                    !hasLeftAction && !isCentered && styles.titleNoLeft,
                ]}
            >
                <AppText
                    variant="h2"
                    weight="bold"
                    color="primary"
                    numberOfLines={2}
                    style={isCentered ? styles.centerText : undefined}
                >
                    {title}
                </AppText>
                {subtitle && (
                    <AppText
                        variant="caption"
                        color="secondary"
                        numberOfLines={1}
                        style={isCentered ? styles.centerText : undefined}
                    >
                        {subtitle}
                    </AppText>
                )}
            </View>

            {/* Right Actions Slot */}
            <View style={styles.rightSlot}>
                {rightActions.map((action, idx) => (
                    <HeaderIconButton
                        key={idx}
                        icon={action.icon}
                        onPress={action.onPress}
                        accessibilityLabel={action.accessibilityLabel}
                        badge={action.badge}
                        style={idx > 0 && { marginLeft: 8 }}
                    />
                ))}
                {rightActions.length === 0 && isCentered && hasLeftAction && (
                    <View style={styles.placeholderBox} />
                )}
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    headerContainer: {
        minHeight: 52,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingVertical: 6,
        zIndex: 10,
    },
    leftSlot: {
        flexDirection: 'row',
        alignItems: 'center',
        marginRight: 10,
    },
    titleContainer: {
        flex: 1,
        justifyContent: 'center',
        paddingVertical: 2,
    },
    titleCentered: {
        alignItems: 'center',
        paddingHorizontal: 10,
    },
    titleNoLeft: {
        paddingLeft: 0,
    },
    centerText: {
        textAlign: 'center',
    },
    rightSlot: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'flex-end',
        minWidth: 38,
    },
    iconButton: {
        width: 38,
        height: 38,
        borderRadius: 12,
        borderWidth: StyleSheet.hairlineWidth,
        justifyContent: 'center',
        alignItems: 'center',
        position: 'relative',
    },
    badgeContainer: {
        position: 'absolute',
        top: -4,
        right: -4,
        minWidth: 17,
        height: 17,
        borderRadius: 8.5,
        backgroundColor: '#EF4444',
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 3,
        borderWidth: 1.5,
        zIndex: 10,
    },
    badgeText: {
        fontSize: 9,
        fontWeight: '800',
        color: '#FFFFFF',
        textAlign: 'center',
        lineHeight: 11,
    },
    badgeDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: '#EF4444',
    },
    placeholderBox: {
        width: 38,
        height: 38,
    },
});

