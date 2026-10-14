import React, { useState } from 'react';
import {
    View,
    TextInput,
} from 'react-native';
import { StyleSheet, useUnistyles } from 'react-native-unistyles';
import { AppText } from '../AppText';
import { resolveFontFamily, hasKhmerText } from '../../styles/typography';

export interface AppInputProps {
    label?: string;
    value?: string;
    onChangeText?: (text: string) => void;
    placeholder?: string;
    placeholderTextColor?: string;
    secureTextEntry?: boolean;
    multiline?: boolean;
    numberOfLines?: number;
    keyboardType?: any;
    autoCapitalize?: any;
    autoCorrect?: boolean;
    editable?: boolean;
    error?: string | null;
    helperText?: string;
    icon?: React.ReactNode;
    rightAction?: React.ReactNode;
    containerStyle?: any;
    inputStyle?: any;
    labelStyle?: any;
    style?: any;
    onFocus?: (e: any) => void;
    onBlur?: (e: any) => void;
}

export const AppInput: React.FC<AppInputProps> = ({
    label,
    value,
    onChangeText,
    placeholder,
    placeholderTextColor,
    secureTextEntry,
    multiline = false,
    numberOfLines = 1,
    keyboardType,
    autoCapitalize,
    autoCorrect,
    editable = true,
    error,
    helperText,
    icon,
    rightAction,
    containerStyle,
    inputStyle,
    labelStyle,
    style,
    onFocus,
    onBlur,
}) => {
    const { theme } = useUnistyles();
    const styles = stylesheet;
    const [isFocused, setIsFocused] = useState(false);

    const hasError = !!error;
    const inputHeight = multiline ? Math.max(48, numberOfLines * 24 + 20) : 48;

    const isKhmer = hasKhmerText(value) || hasKhmerText(placeholder);
    const inputFontFamily = resolveFontFamily('regular', isKhmer);

    return (
        <View style={[styles.container, containerStyle]}>
            {label && (
                <AppText
                    variant="label"
                    color="secondary"
                    style={[styles.label, labelStyle]}
                >
                    {label}
                </AppText>
            )}

            <View
                style={[
                    styles.inputWrapper,
                    hasError && styles.inputWrapperError,
                    isFocused && !hasError && styles.inputWrapperFocused,
                    {
                        minHeight: inputHeight,
                        alignItems: multiline ? 'flex-start' : 'center',
                        paddingVertical: multiline ? 10 : 6,
                    },
                ]}
            >
                {icon && <View style={[styles.iconContainer, multiline && { paddingTop: 2 }]}>{icon}</View>}

                <TextInput
                    style={[
                        styles.input,
                        {
                            fontFamily: inputFontFamily,
                            textAlignVertical: multiline ? 'top' : 'center',
                        },
                        inputStyle,
                        style,
                    ]}
                    value={value}
                    onChangeText={onChangeText}
                    placeholder={placeholder}
                    placeholderTextColor={placeholderTextColor || theme.colors.textDisabled}
                    secureTextEntry={secureTextEntry}
                    multiline={multiline}
                    numberOfLines={numberOfLines}
                    keyboardType={keyboardType}
                    autoCapitalize={autoCapitalize}
                    autoCorrect={autoCorrect}
                    editable={editable}
                    accessibilityLabel={label || placeholder || 'Input'}
                    accessibilityState={{ disabled: !editable }}
                    accessibilityInvalid={hasError}
                    onFocus={(e: any) => {
                        setIsFocused(true);
                        onFocus?.(e);
                    }}
                    onBlur={(e: any) => {
                        setIsFocused(false);
                        onBlur?.(e);
                    }}
                />

                {rightAction && <View style={styles.rightActionContainer}>{rightAction}</View>}
            </View>

            {hasError ? (
                <AppText variant="caption" color="error" style={styles.errorText} accessibilityLiveRegion="polite">
                    {error}
                </AppText>
            ) : helperText ? (
                <AppText variant="caption" color="secondary" style={styles.helperText}>
                    {helperText}
                </AppText>
            ) : null}
        </View>
    );
};

const stylesheet = StyleSheet.create((theme) => ({
    container: {
        marginBottom: 14,
        width: '100%',
    },
    label: {
        marginBottom: 6,
    },
    inputWrapper: {
        flexDirection: 'row',
        borderRadius: 12,
        borderWidth: 1,
        backgroundColor: theme.colors.surface,
        borderColor: theme.colors.border,
        paddingHorizontal: 12,
    },
    inputWrapperFocused: {
        borderColor: theme.colors.brand,
        borderWidth: 1.5,
    },
    inputWrapperError: {
        borderColor: theme.colors.status.danger,
        borderWidth: 1,
    },
    iconContainer: {
        marginRight: 10,
        justifyContent: 'center',
        alignItems: 'center',
    },
    input: {
        flex: 1,
        fontSize: 14,
        color: theme.colors.textPrimary,
        paddingVertical: 2,
    },
    rightActionContainer: {
        marginLeft: 8,
        justifyContent: 'center',
        alignItems: 'center',
    },
    errorText: {
        marginTop: 4,
        marginLeft: 2,
    },
    helperText: {
        marginTop: 4,
        marginLeft: 2,
    },
}));
