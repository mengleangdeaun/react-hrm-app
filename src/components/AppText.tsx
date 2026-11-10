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

// High-speed LRU-bounded cache for Khmer script detection on strings
const khmerStringCache = new Map<string, boolean>();
const MAX_KHMER_CACHE = 400;

function fastCheckKhmer(text?: any): boolean {
    if (typeof text === 'string') {
        if (!text) return false;
        const cached = khmerStringCache.get(text);
        if (cached !== undefined) return cached;
        const result = hasKhmerText(text);
        if (khmerStringCache.size >= MAX_KHMER_CACHE) {
            khmerStringCache.clear();
        }
        khmerStringCache.set(text, result);
        return result;
    }
    return hasKhmerText(text);
}

/**
 * Cap for the OS accessibility font scale. The system setting is still honoured (up to +30%), but
 * the "Largest" Android/iOS settings (up to 2x-3x) no longer clip text inside fixed-height
 * buttons, tabs and cards. Pass `maxFontSizeMultiplier` explicitly to override per element.
 */
const MAX_SYSTEM_FONT_SCALE = 1.3;

// Static memoized cache for standard base style allocations (eliminates Hermes GC sweeps)
const baseStyleCache = new Map<string, any>();

const AppTextComponent: React.FC<AppTextProps> = ({
    variant = 'body',
    weight,
    color = 'primary',
    align,
    isKhmer: explicitIsKhmer,
    style,
    children,
    maxFontSizeMultiplier = MAX_SYSTEM_FONT_SCALE,
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
        : fastCheckKhmer(children);

    const resolvedFontFamily = resolveFontFamily(resolvedWeight, isKhmer);

    // 3. Computed Typography Metrics
    const effectiveScale = fontSizeScale || 1.0;
    const resolvedAlign = align || 'auto';

    // 4. Resolve Unistyles Native Color Class
    const colorKey = (color && `color_${color}` in styles)
        ? (styles as any)[`color_${color}`]
        : styles.color_primary;

    // Fast-path: When no custom inline style override is provided (standard case for >80% of text elements)
    if (!style) {
        const cacheKey = `${safeVariant}_${resolvedWeight}_${isKhmer ? 'kh' : 'en'}_${effectiveScale}_${resolvedAlign}`;
        let cachedBase = baseStyleCache.get(cacheKey);
        if (!cachedBase) {
            const baseFontSize = token.fontSize;
            const scaledFontSize = Math.round(baseFontSize * effectiveScale);
            const baseLineHeight = token.lineHeight;
            const scaledLineHeight = Math.round(baseLineHeight * effectiveScale);
            const resolvedLetterSpacing = isKhmer ? 0 : token.letterSpacing;

            cachedBase = Object.freeze({
                fontFamily: resolvedFontFamily,
                fontSize: scaledFontSize,
                lineHeight: scaledLineHeight,
                letterSpacing: resolvedLetterSpacing,
                textAlign: resolvedAlign,
                ...(Platform.OS === 'android' ? { includeFontPadding: false } : {}),
            });
            baseStyleCache.set(cacheKey, cachedBase);
        }

        return (
            <RNText style={[cachedBase, colorKey]} maxFontSizeMultiplier={maxFontSizeMultiplier} {...props}>
                {children}
            </RNText>
        );
    }

    // Dynamic path: Handle specific custom style overrides
    const flattenedStyle: any = Array.isArray(style) ? RNStyleSheet.flatten(style) : style;
    const baseFontSize = token.fontSize;
    const scaledFontSize = Math.round(baseFontSize * effectiveScale);
    const finalFontSize = flattenedStyle.fontSize
        ? Math.round(flattenedStyle.fontSize * effectiveScale)
        : scaledFontSize;

    let computedLineHeight: number;
    if (flattenedStyle.lineHeight) {
        computedLineHeight = Math.round(flattenedStyle.lineHeight * effectiveScale);
    } else if (flattenedStyle.fontSize) {
        computedLineHeight = Math.max(
            Math.round(finalFontSize * 1.4),
            finalFontSize + 6
        );
    } else {
        computedLineHeight = Math.round(token.lineHeight * effectiveScale);
    }

    let resolvedLetterSpacing: number | undefined;
    if (flattenedStyle.letterSpacing !== undefined) {
        resolvedLetterSpacing = flattenedStyle.letterSpacing;
    } else if (isKhmer) {
        resolvedLetterSpacing = 0;
    } else {
        resolvedLetterSpacing = token.letterSpacing;
    }

    const computedBaseStyle: any = {
        fontFamily: flattenedStyle.fontFamily || resolvedFontFamily,
        fontSize: finalFontSize,
        lineHeight: computedLineHeight,
        letterSpacing: resolvedLetterSpacing,
        textAlign: align || flattenedStyle.textAlign || 'auto',
        ...(Platform.OS === 'android' ? { includeFontPadding: false } : {}),
    };

    // Order matters. `style` keeps its theme-reactive colours/layout, then the computed metrics go
    // LAST: they already incorporate the caller's fontSize/lineHeight, scaled by the in-app text
    // size setting. With `style` last, its raw fontSize silently undid that scaling.
    return (
        <RNText
            style={[colorKey, style, computedBaseStyle]}
            maxFontSizeMultiplier={maxFontSizeMultiplier}
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
