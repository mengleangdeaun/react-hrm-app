import React from 'react';
import { Text as RNText, StyleSheet } from 'react-native';
import { useAppTheme, getCleanFontFamily } from '../context/ThemeContext';

export type AppTextProps = React.ComponentProps<typeof RNText>;

export const AppText: React.FC<AppTextProps> = ({ style, children, ...props }) => {
    const { fontSizeScale, fontFamily } = useAppTheme();

    const flatStyle = (StyleSheet.flatten(style) || {}) as any;

    let scaledStyle: any = { ...flatStyle };

    if (flatStyle.fontSize) {
        scaledStyle.fontSize = Math.round(flatStyle.fontSize * fontSizeScale);
    }

    const activeFont = getCleanFontFamily(fontFamily);
    if (activeFont && !flatStyle.fontFamily) {
        scaledStyle.fontFamily = activeFont;
    }

    return (
        <RNText style={scaledStyle} {...props}>
            {children}
        </RNText>
    );
};
