import React from 'react';
import {
    View,
    TouchableOpacity,
    Platform,
} from 'react-native';
import { StyleSheet, useUnistyles } from 'react-native-unistyles';
import * as Haptics from 'expo-haptics';
import { ArrowLeft, X } from 'lucide-react-native';
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
    headerRight?: React.ReactNode;
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
    const styles = stylesheet;

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
            style={[styles.iconButton, style]}
        >
            {icon}
            {hasBadge && (
                <View style={styles.badgeContainer}>
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
    headerRight,
    style,
    titleAlign = 'left',
    showBorder = false,
}) => {
    const { theme } = useUnistyles();
    const styles = stylesheet;

    const hasLeftAction = !!onBack || !!onClose;
    const isCentered = titleAlign === 'center';
    const hasRightContent = Boolean(headerRight || rightActions.length > 0);

    return (
        <View
            style={[
                styles.headerContainer,
                showBorder && styles.headerBorder,
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
                    hasRightContent && { marginRight: 8 },
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
            {hasRightContent ? (
                <View style={styles.rightSlot}>
                    {headerRight}
                    {rightActions.map((action, idx) => (
                        <HeaderIconButton
                            key={idx}
                            icon={action.icon}
                            onPress={action.onPress}
                            accessibilityLabel={action.accessibilityLabel}
                            badge={action.badge}
                            style={(idx > 0 || headerRight) ? { marginLeft: 8 } : undefined}
                        />
                    ))}
                </View>
            ) : isCentered && hasLeftAction ? (
                <View style={styles.placeholderBox} />
            ) : null}
        </View>
    );
};

const stylesheet = StyleSheet.create((theme) => ({
    headerContainer: {
        minHeight: 52,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingVertical: 12,
        backgroundColor: theme.colors.background,
        borderBottomColor: theme.colors.border,
        zIndex: 10,
    },
    headerBorder: {
        borderBottomWidth: 1,
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
        borderWidth: 1,
        backgroundColor: theme.colors.surfaceSubtle,
        borderColor: theme.colors.border,
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
        borderColor: theme.colors.background,
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
}));


