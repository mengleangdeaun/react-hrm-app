import React from 'react';
import { View, StyleSheet } from 'react-native';
import { useAppTheme } from '../../context/ThemeContext';
import { lightTheme, darkTheme } from '../../styles/theme';
import { AppButton } from './AppButton';
import { AppText } from '../AppText';

export interface EmptyStateProps {
    icon: React.ReactNode;
    title: string;
    description?: string;
    actionTitle?: string;
    onAction?: () => void;
    style?: any;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
    icon,
    title,
    description,
    actionTitle,
    onAction,
    style,
}) => {
    const { isDark } = useAppTheme();
    const theme = isDark ? darkTheme : lightTheme;

    return (
        <View
            style={[
                styles.container,
                {
                    backgroundColor: theme.colors.surface,
                    borderColor: theme.colors.border,
                },
                style,
            ]}
        >
            <View style={[styles.iconWrapper, { backgroundColor: theme.colors.surfaceSubtle }]}>
                {icon}
            </View>

            <AppText variant="h3" color="primary" align="center" style={styles.title}>
                {title}
            </AppText>

            {description && (
                <AppText variant="bodySmall" color="secondary" align="center" style={styles.description}>
                    {description}
                </AppText>
            )}

            {actionTitle && onAction && (
                <View style={styles.actionWrapper}>
                    <AppButton
                        title={actionTitle}
                        onPress={onAction}
                        size="md"
                        fullWidth={false}
                    />
                </View>
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        width: '100%',
        borderRadius: 20,
        borderWidth: 1,
        paddingVertical: 32,
        paddingHorizontal: 24,
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 0,
        marginBottom: 16,
    },
    iconWrapper: {
        width: 64,
        height: 64,
        borderRadius: 20,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 16,
    },
    title: {
        marginBottom: 6,
    },
    description: {
        maxWidth: 280,
    },
    actionWrapper: {
        marginTop: 18,
    },
});
