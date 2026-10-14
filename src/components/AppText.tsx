import React from 'react';
import { Text as RNText, StyleSheet as RNStyleSheet, Platform } from 'react-native';
import { StyleSheet } from 'react-native-unistyles';
import { useFontSize } from '../context/ThemeContext';
import { useTranslation } from '../context/LanguageContext';
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

const AppTextComponent: React.FC<AppTextProps> = ({
    variant = 'body',
    weight,
    color = 'primary',
    align,
    isKhmer: explicitIsKhmer,
    style,
    children,
    ...props
}) => {
    // Only subscribe to font scale, NOT theme changes (eliminates ~150 JS re-renders per screen on theme toggle)
    const { fontSizeScale } = useFontSize();
    const styles = stylesheet;

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

    // 2. Script-Aware Detection (Short-circuit to eliminate regex on Khmer locale)
    const isKhmer = explicitIsKhmer !== undefined
        ? explicitIsKhmer
        : activeLocale === 'kh'
        ? true
        : hasKhmerText(children);

    const resolvedFontFamily = resolveFontFamily(resolvedWeight, isKhmer);

    // 3. Computed Typography Metrics
    const effectiveScale = fontSizeScale || 1.0;
    const baseFontSize = token.fontSize;
    const scaledFontSize = Math.round(baseFontSize * effectiveScale);
    const baseLineHeight = token.lineHeight;
    const scaledLineHeight = Math.round(baseLineHeight * effectiveScale);

    const flattenedStyle: any = Array.isArray(style) ? RNStyleSheet.flatten(style) : (style || {});
    const finalFontSize = flattenedStyle.fontSize
        ? Math.round(flattenedStyle.fontSize * effectiveScale)
        : scaledFontSize;

    // 4. Unified Line Height: Rock-solid stability between English and Khmer
    let computedLineHeight: number;
    if (flattenedStyle.lineHeight) {
        computedLineHeight = Math.round(flattenedStyle.lineHeight * effectiveScale);
    } else if (flattenedStyle.fontSize) {
        computedLineHeight = Math.max(
            Math.round(finalFontSize * 1.4),
            finalFontSize + 6
        );
    } else {
        computedLineHeight = scaledLineHeight;
    }

    // 5. Letter Spacing Normalization
    let resolvedLetterSpacing: number | undefined;
    if (flattenedStyle.letterSpacing !== undefined) {
        resolvedLetterSpacing = flattenedStyle.letterSpacing;
    } else if (isKhmer) {
        resolvedLetterSpacing = 0;
    } else {
        resolvedLetterSpacing = token.letterSpacing;
    }

    // 6. Resolve Unistyles Native Color Class
    const colorKey = (color && `color_${color}` in styles)
        ? (styles as any)[`color_${color}`]
        : styles.color_primary;

    const computedBaseStyle: any = {
        fontFamily: flattenedStyle.fontFamily || resolvedFontFamily,
        fontSize: finalFontSize,
        lineHeight: computedLineHeight,
        letterSpacing: resolvedLetterSpacing,
        textAlign: align || flattenedStyle.textAlign || 'auto',
        ...(Platform.OS === 'android' ? { includeFontPadding: false } : {}),
    };

    return (
        <RNText
            style={[computedBaseStyle, colorKey, style]}
            {...props}
        >
            {children}
        </RNText>
    );
};

const stylesheet = StyleSheet.create((theme) => ({
    color_primary: {
        color: theme.colors.textPrimary,
    },
    color_secondary: {
        color: theme.colors.textSecondary,
    },
    color_muted: {
        color: theme.colors.textMuted,
    },
    color_brand: {
        color: theme.colors.brand,
    },
    color_inverse: {
        color: '#FFFFFF',
    },
    color_success: {
        color: theme.colors.status.success,
    },
    color_warning: {
        color: theme.colors.status.warning,
    },
    color_error: {
        color: theme.colors.status.danger,
    },
    color_info: {
        color: theme.colors.status.info,
    },
}));

export const AppText = React.memo(AppTextComponent);

