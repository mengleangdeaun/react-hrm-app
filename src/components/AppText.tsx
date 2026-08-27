import React from 'react';
import { Text as RNText, StyleSheet } from 'react-native';
import { useAppTheme } from '../context/ThemeContext';
import { lightTheme, darkTheme } from '../styles/theme';
import {
    TYPOGRAPHY_TOKENS,
    TypographyVariant,
    FontWeightVariant,
    hasKhmerText,
    resolveFontFamily,
} from '../styles/typography';

export type AppTextProps = React.ComponentProps<typeof RNText> & {
    variant?: TypographyVariant;
    weight?: FontWeightVariant;
    color?:
        | 'primary'
        | 'secondary'
        | 'muted'
        | 'brand'
        | 'inverse'
        | 'success'
        | 'warning'
        | 'error'
        | 'info';
    align?: 'auto' | 'left' | 'right' | 'center' | 'justify';
};

export const AppText: React.FC<AppTextProps> = ({
    variant = 'body',
    weight,
    color,
    align,
    style,
    children,
    ...props
}) => {
    const { isDark, fontSizeScale } = useAppTheme();
    const theme = isDark ? darkTheme : lightTheme;

    // 1. Retrieve Typography Token
    const safeVariant = (variant in TYPOGRAPHY_TOKENS ? variant : 'body') as TypographyVariant;
    const token = TYPOGRAPHY_TOKENS[safeVariant] || TYPOGRAPHY_TOKENS.body;
    const resolvedWeight = weight || token.weight;

    // 2. Script-Aware Detection
    const isKhmer = hasKhmerText(children);
    const resolvedFontFamily = resolveFontFamily(resolvedWeight, isKhmer);

    // 3. Computed Typography Metrics
    const baseFontSize = token.fontSize;
    const scaledFontSize = Math.round(baseFontSize * (fontSizeScale || 1));
    const baseLineHeight = isKhmer ? token.khmerLineHeight : token.lineHeight;
    const scaledLineHeight = Math.round(baseLineHeight * (fontSizeScale || 1));

    // 4. Color Resolution
    let resolvedColor: string = theme.colors.textPrimary;
    if (color === 'secondary') {
        resolvedColor = theme.colors.textSecondary;
    } else if (color === 'muted') {
        resolvedColor = theme.colors.textMuted;
    } else if (color === 'brand') {
        resolvedColor = theme.colors.brand;
    } else if (color === 'inverse') {
        resolvedColor = '#FFFFFF';
    } else if (color === 'success') {
        resolvedColor = theme.colors.status.success;
    } else if (color === 'warning') {
        resolvedColor = theme.colors.status.warning;
    } else if (color === 'error') {
        resolvedColor = theme.colors.status.danger;
    } else if (color === 'info') {
        resolvedColor = theme.colors.status.info;
    }

    const flattenedStyle: any = StyleSheet.flatten(style) || {};

    const finalFontSize = flattenedStyle.fontSize || scaledFontSize;

    // Calculate vertical line height with generous headroom for font ascenders/descenders (e.g. g, j, p, q, y)
    let computedLineHeight: number;
    if (flattenedStyle.lineHeight) {
        computedLineHeight = flattenedStyle.lineHeight;
    } else if (flattenedStyle.fontSize) {
        const ratio = isKhmer ? 1.45 : 1.35;
        computedLineHeight = Math.max(
            Math.round(flattenedStyle.fontSize * ratio),
            flattenedStyle.fontSize + 6
        );
    } else {
        computedLineHeight = scaledLineHeight;
    }

    const computedStyle: any = {
        fontFamily: flattenedStyle.fontFamily || resolvedFontFamily,
        fontSize: finalFontSize,
        lineHeight: computedLineHeight,
        color: flattenedStyle.color || resolvedColor,
        letterSpacing: flattenedStyle.letterSpacing !== undefined ? flattenedStyle.letterSpacing : token.letterSpacing,
        textAlign: align || flattenedStyle.textAlign || 'auto',
    };

    return (
        <RNText
            style={[computedStyle, style]}
            {...props}
        >
            {children}
        </RNText>
    );
};
