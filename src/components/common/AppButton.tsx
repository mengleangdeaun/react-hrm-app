import React from 'react';
import {
    Pressable,
    ActivityIndicator,
    View,
} from 'react-native';
import { StyleSheet } from 'react-native-unistyles';
import * as Haptics from 'expo-haptics';
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

const sizeStylesMap = {
    sm: { minHeight: 36, paddingVertical: 6, paddingHorizontal: 12, borderRadius: 10, fontSize: 12 },
    md: { minHeight: 44, paddingVertical: 10, paddingHorizontal: 16, borderRadius: 12, fontSize: 14 },
    lg: { minHeight: 52, paddingVertical: 12, paddingHorizontal: 20, borderRadius: 16, fontSize: 15 },
} as const;

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
    const styles = stylesheet;

    const handlePress = () => {
        if (disabled || loading) return;
        if (enableHaptics) {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
        }
        onPress();
    };

    const sizeStyles = sizeStylesMap[size] || sizeStylesMap.lg;
    const variantStyle = disabled ? styles.disabled : (styles[`variant_${variant}`] || styles.variant_primary);
    const textVariantStyle = disabled ? styles.text_disabled : (styles[`text_${variant}`] || styles.text_primary);

    return (
        <Pressable
            onPress={handlePress}
            disabled={disabled || loading}
            accessibilityRole="button"
            accessibilityLabel={accessibilityLabel || title}
            accessibilityState={{ disabled: disabled || loading, busy: loading }}
            style={({ pressed }: { pressed: boolean }) => [
                styles.baseButton,
                variantStyle,
                {
                    minHeight: sizeStyles.minHeight,
                    paddingVertical: sizeStyles.paddingVertical,
                    paddingHorizontal: sizeStyles.paddingHorizontal,
                    borderRadius: sizeStyles.borderRadius,
                    width: fullWidth ? '100%' : 'auto',
                    opacity: disabled ? 0.6 : (pressed ? 0.85 : 1),
                },
                style,
            ]}
        >
            {loading ? (
                <ActivityIndicator color={textVariantStyle.color || '#FFFFFF'} size="small" />
            ) : (
                <View style={styles.contentRow}>
                    {icon && iconPosition === 'left' && <View style={styles.iconLeft}>{icon}</View>}
                    <AppText
                        variant="button"
                        style={[
                            textVariantStyle,
                            {
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

const stylesheet = StyleSheet.create((theme) => ({
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
    variant_primary: {
        backgroundColor: theme.colors.brand,
        borderColor: 'transparent',
    },
    variant_secondary: {
        backgroundColor: theme.colors.surfaceSubtle,
        borderColor: 'transparent',
    },
    variant_outline: {
        backgroundColor: 'transparent',
        borderWidth: 1,
        borderColor: (theme.colors as any).borderStrong || theme.colors.border,
    },
    variant_ghost: {
        backgroundColor: 'transparent',
        borderColor: 'transparent',
    },
    variant_destructive: {
        backgroundColor: theme.colors.status.danger,
        borderColor: 'transparent',
    },
    disabled: {
        backgroundColor: theme.colors.disabled,
        borderColor: 'transparent',
    },
    text_primary: {
        color: '#FFFFFF',
    },
    text_secondary: {
        color: theme.colors.textPrimary,
    },
    text_outline: {
        color: theme.colors.textPrimary,
    },
    text_ghost: {
        color: theme.colors.brand,
    },
    text_destructive: {
        color: '#FFFFFF',
    },
    text_disabled: {
        color: theme.colors.textDisabled,
    },
}));

