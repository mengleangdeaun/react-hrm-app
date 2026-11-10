import React from 'react';
import { View, Pressable } from 'react-native';
import { StyleSheet } from 'react-native-unistyles';

export interface AppCardProps {
    children: React.ReactNode;
    style?: any;
    onPress?: () => void;
    variant?: 'surface' | 'subtle' | 'elevated';
    noBorder?: boolean;
    padding?: number;
    borderRadius?: number;
    accessibilityLabel?: string;
    accessibilityHint?: string;
}

export const AppCard: React.FC<AppCardProps> = ({
    children,
    style,
    onPress,
    variant = 'surface',
    noBorder = false,
    padding,
    borderRadius,
    accessibilityLabel,
    accessibilityHint,
}) => {
    const styles = stylesheet;
    const variantStyle = styles[`variant_${variant}`] || styles.variant_surface;

    const cardStyles = [
        styles.card,
        variantStyle,
        noBorder && styles.noBorder,
        padding !== undefined && { padding },
        borderRadius !== undefined && { borderRadius },
        style,
    ];

    if (onPress) {
        return (
            <Pressable
                onPress={onPress}
                accessibilityRole="button"
                accessibilityLabel={accessibilityLabel}
                accessibilityHint={accessibilityHint}
                style={({ pressed }: { pressed: boolean }) => [
                    cardStyles,
                    pressed && { opacity: 0.88, transform: [{ scale: 0.995 }] },
                ]}
            >
                {children}
            </Pressable>
        );
    }

    return <View style={cardStyles}>{children}</View>;
};

const stylesheet = StyleSheet.create((theme) => ({
    card: {
        width: '100%',
        backgroundColor: theme.colors.surface,
        borderColor: theme.colors.border,
        borderWidth: 1,
        padding: theme.spacing.cardPadding,
        borderRadius: theme.borderRadius.lg,
    },
    variant_surface: {
        backgroundColor: theme.colors.surface,
        borderColor: theme.colors.border,
    },
    variant_subtle: {
        backgroundColor: theme.colors.surfaceSubtle,
        borderColor: (theme.colors as any).borderSubtle || theme.colors.border,
    },
    variant_elevated: {
        backgroundColor: theme.colors.surface,
        borderColor: (theme.colors as any).borderSubtle || theme.colors.border,
        shadowColor: theme.colors.shadow,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.04,
        shadowRadius: 8,
        elevation: 2,
    },
    noBorder: {
        borderWidth: 0,
        borderColor: 'transparent',
    },
}));


