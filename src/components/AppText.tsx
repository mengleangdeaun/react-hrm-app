import React from 'react';
import { Text as RNText, StyleSheet } from 'react-native';
import { useAppTheme, getCleanFontFamily } from '../context/ThemeContext';

export type AppTextProps = React.ComponentProps<typeof RNText>;

export const AppText: React.FC<AppTextProps> = ({ style, children, ...props }) => {
    const { fontSizeScale, fontFamily } = useAppTheme();

    const flatStyle = (StyleSheet.flatten(style) || {}) as any;
    const fontOverrides: any = {};

    if (flatStyle.fontSize && fontSizeScale && fontSizeScale !== 1) {
        fontOverrides.fontSize = Math.round(flatStyle.fontSize * fontSizeScale);
    }

    const activeFont = getCleanFontFamily(fontFamily);
    if (activeFont && !flatStyle.fontFamily) {
        fontOverrides.fontFamily = activeFont;
    }

    const hasOverrides = Object.keys(fontOverrides).length > 0;
    const finalStyle = hasOverrides
        ? (Array.isArray(style) ? [...style, fontOverrides] : [style, fontOverrides])
        : style;

    return (
        <RNText style={finalStyle} {...props}>
            {children}
        </RNText>
    );
};
