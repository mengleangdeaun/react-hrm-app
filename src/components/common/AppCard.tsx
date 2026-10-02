import React, { useMemo } from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { useAppTheme } from '../../context/ThemeContext';
import { lightTheme, darkTheme } from '../../styles/theme';

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
    const { isDark } = useAppTheme();
    const theme = isDark ? darkTheme : lightTheme;

    const cardStyles = useMemo(() => {
        let backgroundColor: string = theme.colors.surface;
        const borderWidth = noBorder ? 0 : 1;
        const borderColor: string = noBorder ? 'transparent' : theme.colors.border;

        if (variant === 'subtle') {
            backgroundColor = theme.colors.surfaceSubtle;
        } else if (variant === 'elevated') {
            backgroundColor = theme.colors.surface;
        }

        return [
            styles.card,
            variant === 'elevated' && styles.cardElevated,
            {
                backgroundColor,
                borderWidth,
                borderColor,
                padding: padding !== undefined ? padding : theme.spacing.cardPadding,
                borderRadius: borderRadius !== undefined ? borderRadius : theme.borderRadius.lg,
            },
            style,
        ];
    }, [variant, noBorder, theme, padding, borderRadius, style]);

    if (onPress) {
        return (
            <TouchableOpacity
                onPress={onPress}
                activeOpacity={0.75}
                accessibilityRole="button"
                accessibilityLabel={accessibilityLabel}
                accessibilityHint={accessibilityHint}
                style={cardStyles}
            >
                {children}
            </TouchableOpacity>
        );
    }

    return <View style={cardStyles}>{children}</View>;
};

const styles = StyleSheet.create({
    card: {
        width: '100%',
    },
    cardElevated: {
        shadowColor: '#000000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.04,
        shadowRadius: 8,
        elevation: 2,
    },
});

