import React from 'react';
import { View, TouchableOpacity } from 'react-native';
import { Gift, ChevronRight } from 'lucide-react-native';
import { StyleSheet } from 'react-native-unistyles';
import { AppText as Text } from '../../../components/AppText';
import { useTranslation } from '../../../context/LanguageContext';
import { CelebrationItem } from '../types';

interface CelebrationBannerProps {
    celebration: CelebrationItem | null;
    onPress: () => void;
}

export const CelebrationBanner: React.FC<CelebrationBannerProps> = ({
    celebration,
    onPress,
}) => {
    const { t } = useTranslation();
    const styles = stylesheet;

    if (!celebration) return null;

    return (
        <TouchableOpacity
            style={styles.celebrationCard}
            onPress={onPress}
            activeOpacity={0.8}
        >
            <Gift color="#EC4899" size={26} />
            <View style={styles.celebrationTextGroup}>
                <Text style={styles.celebrationTitle}>
                    {celebration.message || celebration.title || celebration.milestone || t('work_celebration', 'Work Celebration!')}
                </Text>
                <Text style={styles.celebrationSubtitle}>
                    {t('tap_send_view_wishes', 'Tap to send or view celebratory wishes 🎉')}
                </Text>
            </View>
            <ChevronRight color="#EC4899" size={18} />
        </TouchableOpacity>
    );
};

const stylesheet = StyleSheet.create((theme) => ({
    celebrationCard: {
        backgroundColor: 'rgba(236, 72, 153, 0.1)',
        borderRadius: theme.borderRadius.lg,
        padding: theme.spacing.cardPadding,
        flexDirection: 'row',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: 'rgba(236, 72, 153, 0.2)',
        marginBottom: theme.spacing.lg,
    },
    celebrationTextGroup: {
        flex: 1,
        marginLeft: theme.spacing.sm + 4,
    },
    celebrationTitle: {
        fontSize: 14,
        fontWeight: '700',
        color: '#DB2777',
    },
    celebrationSubtitle: {
        fontSize: 12,
        color: theme.colors.textSecondary,
        marginTop: 2,
    },
}));
