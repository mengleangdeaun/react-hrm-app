import React from 'react';
import { View, TouchableOpacity } from 'react-native';
import { StyleSheet } from 'react-native-unistyles';
import { AppText as Text } from '../../../components/AppText';
import { useTranslation } from '../../../context/LanguageContext';
import { QuickActionItem } from '../types';

interface QuickActionsGridProps {
    actions: QuickActionItem[];
    onActionPress: (route: string) => void;
}

export const QuickActionsGrid: React.FC<QuickActionsGridProps> = ({
    actions,
    onActionPress,
}) => {
    const { t } = useTranslation();
    const styles = stylesheet;

    return (
        <>
            <Text style={styles.sectionTitle}>{t('quick_actions', 'Quick Actions')}</Text>
            <View style={styles.quickGrid}>
                {actions.map((action) => {
                    const IconComponent = action.icon;
                    return (
                        <TouchableOpacity
                            key={action.id}
                            style={styles.gridTile}
                            onPress={() => onActionPress(action.route)}
                            activeOpacity={0.8}
                        >
                            <View style={[styles.tileIconContainer, { backgroundColor: action.bgColor }]}>
                                <IconComponent color={action.iconColor} size={22} />
                            </View>
                            <Text style={styles.tileTitle}>{action.title}</Text>
                            <Text style={styles.tileSubtitle}>{action.subtitle}</Text>
                        </TouchableOpacity>
                    );
                })}
            </View>
        </>
    );
};

const stylesheet = StyleSheet.create((theme) => ({
    sectionTitle: {
        fontSize: 14,
        fontWeight: '700',
        color: theme.colors.textSecondary,
        textTransform: 'uppercase',
        letterSpacing: 0.5,
        marginBottom: theme.spacing.sm,
        marginTop: theme.spacing.xs,
    },
    quickGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
        marginBottom: theme.spacing.md,
    },
    gridTile: {
        width: '48.5%',
        backgroundColor: theme.colors.surface,
        borderRadius: theme.borderRadius.lg,
        padding: theme.spacing.cardPadding,
        marginBottom: theme.spacing.md,
        borderWidth: 0.5,
        borderColor: (theme.colors as any).borderSubtle || theme.colors.border,
    },
    tileIconContainer: {
        width: 44,
        height: 44,
        borderRadius: theme.borderRadius.md,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: theme.spacing.sm + 2,
    },
    tileTitle: {
        fontSize: 14,
        fontWeight: '700',
        color: theme.colors.textPrimary,
        marginBottom: 2,
    },
    tileSubtitle: {
        fontSize: 11,
        color: theme.colors.textSecondary,
    },
}));
