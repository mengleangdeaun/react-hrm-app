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
    bordered?: boolean;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
    icon,
    title,
    description,
    actionTitle,
    onAction,
    style,
    bordered = false,
}) => {
    const { isDark } = useAppTheme();
    const theme = isDark ? darkTheme : lightTheme;

    return (
        <View
            style={[
                styles.container,
                {
                    backgroundColor: bordered ? theme.colors.surface : 'transparent',
                    borderColor: bordered ? theme.colors.border : 'transparent',
                    borderWidth: bordered ? 1 : 0,
                },
                style,
            ]}
        >
            <View style={[styles.iconWrapper, { backgroundColor: isDark ? 'rgba(255, 255, 255, 0.06)' : theme.colors.surfaceSubtle }]}>
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
        alignSelf: 'stretch',
        borderRadius: 20,
        paddingVertical: 28,
        paddingHorizontal: 20,
        alignItems: 'center',
        justifyContent: 'center',
        marginVertical: 4,
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
