/**
 * HRMS Typography Engine
 * English: Inter (Regular, Medium, SemiBold, Bold)
 * Khmer: InterKhmerLooped (Regular, Medium, SemiBold, Bold)
 */

export type FontWeightVariant = 'regular' | 'medium' | 'semibold' | 'bold';

export type TypographyVariant =
    | 'display'
    | 'h1'
    | 'h2'
    | 'h3'
    | 'body'
    | 'bodyMedium'
    | 'bodySmall'
    | 'label'
    | 'caption'
    | 'button'
    | 'nav'
    | 'numeric';

export interface TypographyToken {
    fontSize: number;
    lineHeight: number;
    /**
     * @deprecated Preserved for backwards compatibility. Unified with lineHeight to prevent cross-language layout shifts.
     */
    khmerLineHeight: number;
    weight: FontWeightVariant;
    letterSpacing?: number;
}

/**
 * Harmonized Typography Tokens:
 * Unified line heights guarantee that elements (buttons, cards, headers, tabs)
 * maintain an identical, rock-solid bounding box when switching between English and Khmer.
 */
export const TYPOGRAPHY_TOKENS: Record<TypographyVariant, TypographyToken> = {
    display: {
        fontSize: 28,
        lineHeight: 38,
        khmerLineHeight: 38,
        weight: 'bold',
        letterSpacing: -0.4,
    },
    h1: {
        fontSize: 22,
        lineHeight: 32,
        khmerLineHeight: 32,
        weight: 'bold',
        letterSpacing: -0.2,
    },
    h2: {
        fontSize: 18,
        lineHeight: 28,
        khmerLineHeight: 28,
        weight: 'bold',
        letterSpacing: 0,
    },
    h3: {
        fontSize: 16,
        lineHeight: 24,
        khmerLineHeight: 24,
        weight: 'semibold',
        letterSpacing: 0,
    },
    body: {
        fontSize: 14,
        lineHeight: 22,
        khmerLineHeight: 22,
        weight: 'regular',
        letterSpacing: 0,
    },
    bodyMedium: {
        fontSize: 14,
        lineHeight: 22,
        khmerLineHeight: 22,
        weight: 'medium',
        letterSpacing: 0,
    },
    bodySmall: {
        fontSize: 13,
        lineHeight: 20,
        khmerLineHeight: 20,
        weight: 'regular',
        letterSpacing: 0,
    },
    label: {
        fontSize: 12,
        lineHeight: 18,
        khmerLineHeight: 18,
        weight: 'semibold',
        letterSpacing: 0.2,
    },
    caption: {
        fontSize: 11,
        lineHeight: 16,
        khmerLineHeight: 16,
        weight: 'regular',
        letterSpacing: 0,
    },
    button: {
        fontSize: 15,
        lineHeight: 22,
        khmerLineHeight: 22,
        weight: 'bold',
        letterSpacing: 0.2,
    },
    nav: {
        fontSize: 10,
        lineHeight: 14,
        khmerLineHeight: 14,
        weight: 'semibold',
        letterSpacing: 0.2,
    },
    numeric: {
        fontSize: 16,
        lineHeight: 22,
        khmerLineHeight: 22,
        weight: 'bold',
        letterSpacing: 0.4,
    },
};

/**
 * Fast regex checking for Khmer Unicode range:
 * \u1780-\u17FF (Khmer block)
 * \u19E0-\u19FF (Khmer symbols block)
 */
const KHMER_REGEX = /[\u1780-\u17FF\u19E0-\u19FF]/;

/**
 * Recursively inspects text, arrays, numbers, and nested React elements
 * to reliably identify whether Khmer characters are present.
 */
export function hasKhmerText(text?: any): boolean {
    if (typeof text === 'string') {
        return KHMER_REGEX.test(text);
    }
    if (typeof text === 'number') {
        return false;
    }
    if (Array.isArray(text)) {
        return text.some((child) => hasKhmerText(child));
    }
    if (text && typeof text === 'object' && text.props && text.props.children) {
        return hasKhmerText(text.props.children);
    }
    return false;
}

/**
 * Resolves PostScript font family based on language and weight
 */
export function resolveFontFamily(
    weight: FontWeightVariant = 'regular',
    isKhmer: boolean = false
): string {
    if (isKhmer) {
        switch (weight) {
            case 'bold':
                return 'InterKhmerLooped-Bold';
            case 'semibold':
                return 'InterKhmerLooped-SemiBold';
            case 'medium':
                return 'InterKhmerLooped-Medium';
            case 'regular':
            default:
                return 'InterKhmerLooped-Regular';
        }
    }

    switch (weight) {
        case 'bold':
            return 'Inter-Bold';
        case 'semibold':
            return 'Inter-SemiBold';
        case 'medium':
            return 'Inter-Medium';
        case 'regular':
        default:
            return 'Inter-Regular';
    }
}
