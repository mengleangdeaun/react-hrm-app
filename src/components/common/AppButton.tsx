import React from 'react';
import {
    Pressable,
    ActivityIndicator,
    StyleSheet,
    View,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { useAppTheme } from '../../context/ThemeContext';
import { lightTheme, darkTheme } from '../../styles/theme';
import { AppText } from '../AppText';

export interface AppButtonProps {
    title: string;
    onPress: () => void;
    variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'destructive';
    size?: 'sm' | 'md' | 'lg';
    icon?: React.ReactNode;
    iconPosition?: 'left' | 'right';
    loading?: boolean;
    disabled?: boolean;
    style?: any;
    textStyle?: any;
    enableHaptics?: boolean;
    fullWidth?: boolean;
    accessibilityLabel?: string;
}

export const AppButton: React.FC<AppButtonProps> = ({
    title,
    onPress,
    variant = 'primary',
    size = 'lg',
    icon,
    iconPosition = 'left',
    loading = false,
    disabled = false,
    style,
    textStyle,
    enableHaptics = true,
    fullWidth = true,
    accessibilityLabel,
}) => {
    const { isDark } = useAppTheme();
    const theme = isDark ? darkTheme : lightTheme;

    const handlePress = () => {
        if (disabled || loading) return;
        if (enableHaptics) {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
        }
        onPress();
    };

    const sizeStyles = {
        sm: { minHeight: 36, paddingVertical: 6, paddingHorizontal: 12, borderRadius: 10, fontSize: 12 },
        md: { minHeight: 44, paddingVertical: 10, paddingHorizontal: 16, borderRadius: 12, fontSize: 14 },
        lg: { minHeight: 50, paddingVertical: 12, paddingHorizontal: 20, borderRadius: 14, fontSize: 15 },
    }[size];

    let backgroundColor: string = theme.colors.brand;
    let textColor: string = '#FFFFFF';
    let borderWidth: number = 0;
    let borderColor: string = 'transparent';

    if (variant === 'secondary') {
        backgroundColor = theme.colors.surfaceSubtle;
        textColor = theme.colors.textPrimary;
    } else if (variant === 'outline') {
        backgroundColor = 'transparent';
        textColor = theme.colors.textPrimary;
        borderWidth = 1.5;
        borderColor = theme.colors.border;
    } else if (variant === 'ghost') {
        backgroundColor = 'transparent';
        textColor = theme.colors.brand;
    } else if (variant === 'destructive') {
        backgroundColor = theme.colors.status.danger;
        textColor = '#FFFFFF';
    }

    if (disabled) {
        backgroundColor = isDark ? 'rgba(255, 255, 255, 0.08)' : '#E2E8F0';
        textColor = isDark ? 'rgba(255, 255, 255, 0.3)' : '#94A3B8';
        borderColor = 'transparent';
    }

    return (
        <Pressable
            onPress={handlePress}
            disabled={disabled || loading}
            accessibilityRole="button"
            accessibilityLabel={accessibilityLabel || title}
            accessibilityState={{ disabled: disabled || loading, busy: loading }}
            style={({ pressed }: { pressed: boolean }) => [
                styles.baseButton,
                {
                    minHeight: sizeStyles.minHeight,
                    paddingVertical: sizeStyles.paddingVertical,
                    paddingHorizontal: sizeStyles.paddingHorizontal,
                    borderRadius: sizeStyles.borderRadius,
                    backgroundColor,
                    borderWidth,
                    borderColor,
                    width: fullWidth ? '100%' : 'auto',
                    opacity: disabled ? 0.6 : (pressed ? 0.85 : 1),
                },
                style,
            ]}
        >
            {loading ? (
                <ActivityIndicator color={textColor} size="small" />
            ) : (
                <View style={styles.contentRow}>
                    {icon && iconPosition === 'left' && <View style={styles.iconLeft}>{icon}</View>}
                    <AppText
                        variant="button"
                        style={[
                            {
                                color: textColor,
                                fontSize: sizeStyles.fontSize,
                                flexShrink: 1,
                                textAlign: 'center',
                            },
                            textStyle,
                        ]}
                    >
                        {title}
                    </AppText>
                    {icon && iconPosition === 'right' && <View style={styles.iconRight}>{icon}</View>}
                </View>
            )}
        </Pressable>
    );
};

const styles = StyleSheet.create({
    baseButton: {
        justifyContent: 'center',
        alignItems: 'center',
        flexDirection: 'row',
    },
    contentRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 1,
    },
    iconLeft: {
        marginRight: 8,
    },
    iconRight: {
        marginLeft: 8,
    },
});
