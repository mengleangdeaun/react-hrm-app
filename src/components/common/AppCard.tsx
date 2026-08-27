import React from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { useAppTheme } from '../../context/ThemeContext';
import { lightTheme, darkTheme } from '../../styles/theme';

export interface AppCardProps {
    children: React.ReactNode;
    style?: any;
    onPress?: () => void;
    variant?: 'surface' | 'subtle' | 'elevated';
    padding?: number;
    borderRadius?: number;
}

export const AppCard: React.FC<AppCardProps> = ({
    children,
    style,
    onPress,
    variant = 'surface',
    padding = 16,
    borderRadius = 16,
}) => {
    const { isDark } = useAppTheme();
    const theme = isDark ? darkTheme : lightTheme;

    let backgroundColor: string = theme.colors.surface;
    let borderWidth = 1;
    let borderColor: string = theme.colors.border;

    if (variant === 'subtle') {
        backgroundColor = theme.colors.surfaceSubtle;
        borderWidth = 0;
    } else if (variant === 'elevated') {
        backgroundColor = theme.colors.surface;
        borderColor = isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.04)';
    }

    const cardStyles = [
        styles.card,
        {
            backgroundColor,
            borderWidth,
            borderColor,
            padding,
            borderRadius,
        },
        style,
    ];

    if (onPress) {
        return (
            <TouchableOpacity
                onPress={onPress}
                activeOpacity={0.75}
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
        marginBottom: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.04,
        shadowRadius: 6,
        elevation: 1.5,
    },
});
