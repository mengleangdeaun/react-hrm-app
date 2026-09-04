import React from 'react';
import { Text as RNText, StyleSheet, Platform } from 'react-native';
import { useAppTheme } from '../context/ThemeContext';
import { useTranslation } from '../context/LanguageContext';
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
    isKhmer?: boolean;
};

export const AppText: React.FC<AppTextProps> = ({
    variant = 'body',
    weight,
    color,
    align,
    isKhmer: explicitIsKhmer,
    style,
    children,
    ...props
}) => {
    const { isDark, fontSizeScale } = useAppTheme();
    const theme = isDark ? darkTheme : lightTheme;

    // Gracefully resolve active application locale without crashing if outside LanguageProvider
    let activeLocale: string | undefined;
    try {
        const langContext = useTranslation();
        activeLocale = langContext?.locale;
    } catch {
        activeLocale = undefined;
    }

    // 1. Retrieve Typography Token
    const safeVariant = (variant in TYPOGRAPHY_TOKENS ? variant : 'body') as TypographyVariant;
    const token = TYPOGRAPHY_TOKENS[safeVariant] || TYPOGRAPHY_TOKENS.body;
    const resolvedWeight = weight || token.weight;

    // 2. Script-Aware Detection
    // Detect Khmer if text explicitly contains Khmer characters, or if the app is in Khmer locale
    const hasKhmerGlyphs = hasKhmerText(children);
    const isKhmer = explicitIsKhmer !== undefined
        ? explicitIsKhmer
        : (hasKhmerGlyphs || activeLocale === 'kh');

    const resolvedFontFamily = resolveFontFamily(resolvedWeight, isKhmer);

    // 3. Computed Typography Metrics
    const baseFontSize = token.fontSize;
    const scaledFontSize = Math.round(baseFontSize * (fontSizeScale || 1));
    const baseLineHeight = token.lineHeight;
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

    // 5. Unified Line Height: Rock-solid stability between English and Khmer
    let computedLineHeight: number;
    if (flattenedStyle.lineHeight) {
        computedLineHeight = flattenedStyle.lineHeight;
    } else if (flattenedStyle.fontSize) {
        // Unified 1.4x ratio ensures ample vertical clearance for Khmer diacritics
        // while guaranteeing container heights remain 100% identical between languages.
        computedLineHeight = Math.max(
            Math.round(flattenedStyle.fontSize * 1.4),
            flattenedStyle.fontSize + 6
        );
    } else {
        computedLineHeight = scaledLineHeight;
    }

    // 6. Letter Spacing Normalization:
    // In Brahmic scripts like Khmer, letter-spacing must be 0 to prevent broken ligatures.
    let resolvedLetterSpacing: number | undefined;
    if (flattenedStyle.letterSpacing !== undefined) {
        resolvedLetterSpacing = flattenedStyle.letterSpacing;
    } else if (isKhmer) {
        resolvedLetterSpacing = 0;
    } else {
        resolvedLetterSpacing = token.letterSpacing;
    }

    const computedStyle: any = {
        fontFamily: flattenedStyle.fontFamily || resolvedFontFamily,
        fontSize: finalFontSize,
        lineHeight: computedLineHeight,
        color: flattenedStyle.color || resolvedColor,
        letterSpacing: resolvedLetterSpacing,
        textAlign: align || flattenedStyle.textAlign || 'auto',
        ...(Platform.OS === 'android' ? { includeFontPadding: false } : {}),
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
