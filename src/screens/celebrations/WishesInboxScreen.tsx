import React from 'react';
import {
    View,
    StyleSheet,
} from 'react-native';
import { AppText as Text } from '../../components/AppText';
import { Heart, Gift } from 'lucide-react-native';
import { useAppTheme } from '../../context/ThemeContext';
import { lightTheme, darkTheme } from '../../styles/theme';
import { AppShell } from '../../components/common/AppShell';
import { AppCard } from '../../components/common/AppCard';

const MOCK_WISHES = [
    {
        id: 1,
        sender_name: 'David Vance',
        message: 'Happy Work Anniversary John! Thank you for 3 years of great contribution to our engineering team!',
        date: 'Jul 10, 2026',
    },
    {
        id: 2,
        sender_name: 'Elena Rostova',
        message: 'Cheers to another fantastic year at S-Cool HRMS! Keep shining!',
        date: 'Jul 10, 2026',
    },
];

import { useTranslation } from '../../context/LanguageContext';

export const WishesInboxScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
    const { isDark } = useAppTheme();
    const { t } = useTranslation();
    const theme = isDark ? darkTheme : lightTheme;

    return (
        <AppShell title={t('celebration_wishes', 'Celebration Wishes')} onBack={() => navigation.goBack()}>
            {MOCK_WISHES.map((item) => (
                <AppCard key={item.id} variant="surface" style={styles.card}>
                    <View style={styles.cardHeader}>
                        <View style={[styles.heartBadge, { backgroundColor: 'rgba(236, 72, 153, 0.12)' }]}>
                            <Heart color="#EC4899" size={16} />
                        </View>
                        <View style={styles.senderWrapper}>
                            <Text style={[styles.senderName, { color: theme.colors.textPrimary }]}>
                                {item.sender_name}
                            </Text>
                            <Text style={[styles.dateText, { color: theme.colors.textSecondary }]}>
                                {item.date}
                            </Text>
                        </View>
                    </View>
                    <Text style={[styles.messageText, { color: theme.colors.textPrimary }]}>
                        "{item.message}"
                    </Text>
                </AppCard>
            ))}
        </AppShell>
    );
};

const styles = StyleSheet.create({
    card: {
        marginBottom: 10,
    },
    cardHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        marginBottom: 8,
    },
    heartBadge: {
        width: 32,
        height: 32,
        borderRadius: 10,
        justifyContent: 'center',
        alignItems: 'center',
    },
    senderWrapper: {
        flex: 1,
    },
    senderName: {
        fontSize: 14,
        fontWeight: '700',
    },
    dateText: {
        fontSize: 11,
        marginTop: 1,
    },
    messageText: {
        fontSize: 13,
        lineHeight: 18,
        fontStyle: 'italic',
    },
});
