import React from 'react';
import {
    View,
    StyleSheet,
    TouchableOpacity,
    Linking,
} from 'react-native';
import { AppText as Text } from '../AppText';
import { useAppTheme } from '../../context/ThemeContext';
import { lightTheme, darkTheme } from '../../styles/theme';

interface AppMarkdownProps {
    content?: string;
    style?: any;
    paragraphStyle?: any;
    headingStyle?: any;
}

/**
 * Decode common HTML entities into native string characters
 */
const decodeHtmlEntities = (str: string): string => {
    return str
        .replace(/&nbsp;/gi, ' ')
        .replace(/&amp;/gi, '&')
        .replace(/&lt;/gi, '<')
        .replace(/&gt;/gi, '>')
        .replace(/&quot;/gi, '"')
        .replace(/&#39;/gi, "'")
        .replace(/&apos;/gi, "'")
        .replace(/&bull;/gi, '•')
        .replace(/&#8226;/gi, '•')
        .replace(/&mdash;/gi, '—')
        .replace(/&ndash;/gi, '–')
        .replace(/&copy;/gi, '©')
        .replace(/&reg;/gi, '®')
        .replace(/&#(\d+);/g, (_, dec) => String.fromCharCode(Number(dec)));
};

/**
 * Clean and normalize HTML tags to markdown / structural tokens
 */
const preprocessContent = (raw: string): string => {
    if (!raw) return '';

    let text = raw;

    // Normalize Windows line breaks
    text = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n');

    // Convert common HTML block elements to markdown equivalents
    text = text
        .replace(/<h1[^>]*>(.*?)<\/h1>/gis, '\n# $1\n')
        .replace(/<h2[^>]*>(.*?)<\/h2>/gis, '\n## $1\n')
        .replace(/<h3[^>]*>(.*?)<\/h3>/gis, '\n### $1\n')
        .replace(/<h4[^>]*>(.*?)<\/h4>/gis, '\n#### $1\n')
        .replace(/<h5[^>]*>(.*?)<\/h5>/gis, '\n##### $1\n')
        .replace(/<h6[^>]*>(.*?)<\/h6>/gis, '\n###### $1\n')
        .replace(/<blockquote[^>]*>(.*?)<\/blockquote>/gis, '\n> $1\n')
        .replace(/<li[^>]*>(.*?)<\/li>/gis, '\n• $1\n')
        .replace(/<ul[^>]*>/gis, '\n')
        .replace(/<\/ul>/gis, '\n')
        .replace(/<ol[^>]*>/gis, '\n')
        .replace(/<\/ol>/gis, '\n')
        .replace(/<p[^>]*>(.*?)<\/p>/gis, '\n$1\n')
        .replace(/<div[^>]*>(.*?)<\/div>/gis, '\n$1\n')
        .replace(/<br\s*\/?>/gis, '\n')
        .replace(/<hr\s*\/?>/gis, '\n---\n');

    // Convert inline HTML formatting to Markdown tags
    text = text
        .replace(/<strong[^>]*>(.*?)<\/strong>/gis, '**$1**')
        .replace(/<b[^>]*>(.*?)<\/b>/gis, '**$1**')
        .replace(/<em[^>]*>(.*?)<\/em>/gis, '*$1*')
        .replace(/<i[^>]*>(.*?)<\/i>/gis, '*$1*')
        .replace(/<u[^>]*>(.*?)<\/u>/gis, '__$1__')
        .replace(/<code[^>]*>(.*?)<\/code>/gis, '`$1`')
        .replace(/<a\s+[^>]*href=["']([^"']*)["'][^>]*>(.*?)<\/a>/gis, '[$2]($1)');

    // Strip any remaining unknown HTML tags (like <span>, <font>, etc.)
    text = text.replace(/<[^>]*>/g, '');

    // Decode HTML entities
    text = decodeHtmlEntities(text);

    return text;
};

interface InlineToken {
    text: string;
    bold?: boolean;
    italic?: boolean;
    underline?: boolean;
    code?: boolean;
    linkUrl?: string;
}

/**
 * Parse inline formatting: **bold**, *italic*, __underline__, `code`, [link](url)
 */
const parseInlineTokens = (rawText: string): InlineToken[] => {
    const tokens: InlineToken[] = [];
    if (!rawText) return tokens;

    // Pattern matches:
    // [text](url) -> Markdown links
    // `code` -> inline code
    // **bold** -> bold
    // *italic* or _italic_ -> italic
    // __underline__ -> underline
    const regex = /(\[.*?\]\(.*?\)|`[^`]+`|\*\*[^*]+\*\*|__[^_]+__|\*[^*]+\*|_[^_]+_)/g;
    const parts = rawText.split(regex);

    for (const part of parts) {
        if (!part) continue;

        // Link: [Link Text](https://...)
        const linkMatch = part.match(/^\[(.*?)\]\((.*?)\)$/);
        if (linkMatch) {
            tokens.push({
                text: linkMatch[1],
                linkUrl: linkMatch[2],
            });
            continue;
        }

        // Inline code: `console.log`
        if (part.startsWith('`') && part.endsWith('`') && part.length > 2) {
            tokens.push({
                text: part.slice(1, -1),
                code: true,
            });
            continue;
        }

        // Bold: **text**
        if (part.startsWith('**') && part.endsWith('**') && part.length > 4) {
            tokens.push({
                text: part.slice(2, -2),
                bold: true,
            });
            continue;
        }

        // Underline: __text__
        if (part.startsWith('__') && part.endsWith('__') && part.length > 4) {
            tokens.push({
                text: part.slice(2, -2),
                underline: true,
            });
            continue;
        }

        // Italic: *text* or _text_
        if (
            (part.startsWith('*') && part.endsWith('*') && part.length > 2) ||
            (part.startsWith('_') && part.endsWith('_') && part.length > 2)
        ) {
            tokens.push({
                text: part.slice(1, -1),
                italic: true,
            });
            continue;
        }

        // Plain text segment
        tokens.push({ text: part });
    }

    return tokens;
};

export const AppMarkdown: React.FC<AppMarkdownProps> = ({
    content,
    style,
    paragraphStyle,
    headingStyle,
}) => {
    const { isDark, primaryColor } = useAppTheme();
    const theme = isDark ? darkTheme : lightTheme;

    if (!content) return null;

    const normalized = preprocessContent(content);
    const rawLines = normalized.split('\n');

    // Group lines into blocks (combining paragraphs where appropriate)
    const blocks: { type: 'h1' | 'h2' | 'h3' | 'h4' | 'bullet' | 'number' | 'quote' | 'hr' | 'paragraph' | 'spacer'; content: string; bulletIndex?: string }[] = [];

    for (let i = 0; i < rawLines.length; i++) {
        const line = rawLines[i].trim();

        if (!line) {
            // Spacer
            if (blocks.length > 0 && blocks[blocks.length - 1].type !== 'spacer') {
                blocks.push({ type: 'spacer', content: '' });
            }
            continue;
        }

        // Heading 1
        if (line.startsWith('# ')) {
            blocks.push({ type: 'h1', content: line.slice(2).trim() });
            continue;
        }
        // Heading 2
        if (line.startsWith('## ')) {
            blocks.push({ type: 'h2', content: line.slice(3).trim() });
            continue;
        }
        // Heading 3
        if (line.startsWith('### ')) {
            blocks.push({ type: 'h3', content: line.slice(4).trim() });
            continue;
        }
        // Heading 4+
        if (line.startsWith('#### ')) {
            blocks.push({ type: 'h4', content: line.slice(5).trim() });
            continue;
        }

        // Horizontal Rule
        if (line === '---' || line === '***' || line === '___') {
            blocks.push({ type: 'hr', content: '' });
            continue;
        }

        // Blockquote
        if (line.startsWith('> ')) {
            blocks.push({ type: 'quote', content: line.slice(2).trim() });
            continue;
        }

        // Bullet point: • , - , * , + 
        if (line.startsWith('• ') || line.startsWith('- ') || line.startsWith('* ') || line.startsWith('+ ')) {
            blocks.push({ type: 'bullet', content: line.slice(2).trim() });
            continue;
        }

        // Numbered list: 1. , 2) , etc.
        const numMatch = line.match(/^(\d+[\.\)])\s+(.*)$/);
        if (numMatch) {
            blocks.push({
                type: 'number',
                bulletIndex: numMatch[1],
                content: numMatch[2].trim(),
            });
            continue;
        }

        // Regular paragraph line
        blocks.push({ type: 'paragraph', content: line });
    }

    const renderInline = (text: string, baseStyle?: any) => {
        const tokens = parseInlineTokens(text);

        return (
            <Text style={baseStyle}>
                {tokens.map((tok, idx) => {
                    if (tok.linkUrl) {
                        return (
                            <Text
                                key={idx}
                                style={[
                                    baseStyle,
                                    {
                                        color: primaryColor,
                                        textDecorationLine: 'underline',
                                        fontWeight: '600',
                                    },
                                ]}
                                onPress={() => {
                                    if (tok.linkUrl) {
                                        Linking.openURL(tok.linkUrl).catch(() => {});
                                    }
                                }}
                            >
                                {tok.text}
                            </Text>
                        );
                    }

                    if (tok.code) {
                        return (
                            <Text
                                key={idx}
                                style={[
                                    baseStyle,
                                    styles.inlineCode,
                                    {
                                        backgroundColor: theme.colors.surfaceSubtle,
                                        color: primaryColor,
                                    },
                                ]}
                            >
                                {` ${tok.text} `}
                            </Text>
                        );
                    }

                    return (
                        <Text
                            key={idx}
                            style={[
                                baseStyle,
                                tok.bold && styles.boldText,
                                tok.italic && styles.italicText,
                                tok.underline && styles.underlineText,
                            ]}
                        >
                            {tok.text}
                        </Text>
                    );
                })}
            </Text>
        );
    };

    return (
        <View style={[styles.container, style]}>
            {blocks.map((block, idx) => {
                switch (block.type) {
                    case 'spacer':
                        return <View key={idx} style={styles.spacer} />;

                    case 'h1':
                        return (
                            <View key={idx} style={styles.headingBox}>
                                <Text style={[styles.h1, { color: theme.colors.textPrimary }, headingStyle]}>
                                    {block.content}
                                </Text>
                            </View>
                        );

                    case 'h2':
                        return (
                            <View key={idx} style={styles.headingBox}>
                                <Text style={[styles.h2, { color: theme.colors.textPrimary }, headingStyle]}>
                                    {block.content}
                                </Text>
                            </View>
                        );

                    case 'h3':
                        return (
                            <View key={idx} style={styles.headingBox}>
                                <Text style={[styles.h3, { color: theme.colors.textPrimary }, headingStyle]}>
                                    {block.content}
                                </Text>
                            </View>
                        );

                    case 'h4':
                        return (
                            <View key={idx} style={styles.headingBox}>
                                <Text style={[styles.h4, { color: theme.colors.textPrimary }, headingStyle]}>
                                    {block.content}
                                </Text>
                            </View>
                        );

                    case 'hr':
                        return (
                            <View
                                key={idx}
                                style={[styles.hr, { backgroundColor: theme.colors.border }]}
                            />
                        );

                    case 'quote':
                        return (
                            <View
                                key={idx}
                                style={[
                                    styles.quoteBox,
                                    {
                                        backgroundColor: theme.colors.surfaceSubtle,
                                        borderLeftColor: primaryColor,
                                    },
                                ]}
                            >
                                {renderInline(
                                    block.content,
                                    StyleSheet.flatten([
                                        styles.quoteText,
                                        { color: theme.colors.textSecondary },
                                    ])
                                )}
                            </View>
                        );

                    case 'bullet':
                        return (
                            <View key={idx} style={styles.listRow}>
                                <Text style={[styles.bulletDot, { color: primaryColor }]}>•</Text>
                                <View style={styles.listTextWrapper}>
                                    {renderInline(
                                        block.content,
                                        StyleSheet.flatten([
                                            styles.paragraph,
                                            { color: theme.colors.textSecondary },
                                            paragraphStyle,
                                        ])
                                    )}
                                </View>
                            </View>
                        );

                    case 'number':
                        return (
                            <View key={idx} style={styles.listRow}>
                                <Text
                                    style={[
                                        styles.numberBullet,
                                        { color: primaryColor, fontWeight: '700' },
                                    ]}
                                >
                                    {block.bulletIndex}
                                </Text>
                                <View style={styles.listTextWrapper}>
                                    {renderInline(
                                        block.content,
                                        StyleSheet.flatten([
                                            styles.paragraph,
                                            { color: theme.colors.textSecondary },
                                            paragraphStyle,
                                        ])
                                    )}
                                </View>
                            </View>
                        );

                    case 'paragraph':
                    default:
                        return (
                            <View key={idx} style={styles.paragraphBox}>
                                {renderInline(
                                    block.content,
                                    StyleSheet.flatten([
                                        styles.paragraph,
                                        { color: theme.colors.textSecondary },
                                        paragraphStyle,
                                    ])
                                )}
                            </View>
                        );
                }
            })}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        width: '100%',
    },
    spacer: {
        height: 10,
    },
    headingBox: {
        marginTop: 14,
        marginBottom: 6,
    },
    h1: {
        fontSize: 18,
        fontWeight: '800',
        letterSpacing: -0.3,
        lineHeight: 24,
    },
    h2: {
        fontSize: 16,
        fontWeight: '800',
        letterSpacing: -0.2,
        lineHeight: 22,
    },
    h3: {
        fontSize: 15,
        fontWeight: '700',
        letterSpacing: -0.2,
        lineHeight: 21,
    },
    h4: {
        fontSize: 14,
        fontWeight: '700',
        lineHeight: 20,
    },
    paragraphBox: {
        marginBottom: 8,
    },
    paragraph: {
        fontSize: 13,
        lineHeight: 20,
        letterSpacing: 0.1,
    },
    listRow: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        marginBottom: 6,
        paddingLeft: 4,
    },
    bulletDot: {
        fontSize: 16,
        lineHeight: 20,
        marginRight: 8,
        fontWeight: '900',
    },
    numberBullet: {
        fontSize: 13,
        lineHeight: 20,
        marginRight: 6,
        minWidth: 18,
    },
    listTextWrapper: {
        flex: 1,
    },
    quoteBox: {
        borderLeftWidth: 3,
        borderRadius: 8,
        paddingHorizontal: 12,
        paddingVertical: 10,
        marginVertical: 8,
    },
    quoteText: {
        fontSize: 13,
        fontStyle: 'italic',
        lineHeight: 19,
    },
    hr: {
        height: 1,
        width: '100%',
        marginVertical: 12,
    },
    boldText: {
        fontWeight: '700',
    },
    italicText: {
        fontStyle: 'italic',
    },
    underlineText: {
        textDecorationLine: 'underline',
    },
    inlineCode: {
        fontFamily: 'monospace',
        fontSize: 12,
        borderRadius: 4,
    },
});
