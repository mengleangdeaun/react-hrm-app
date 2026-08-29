import React, { useState } from 'react';
import {
    View,
    StyleSheet,
    TouchableOpacity,
    Alert,
} from 'react-native';
import { AppText as Text } from '../../components/AppText';
import { Gift, Heart, Send } from 'lucide-react-native';
import { useAppTheme } from '../../context/ThemeContext';
import { lightTheme, darkTheme } from '../../styles/theme';
import { AppShell } from '../../components/common/AppShell';
import { AppCard } from '../../components/common/AppCard';
import { AppInput } from '../../components/common/AppInput';
import { AppButton } from '../../components/common/AppButton';

import { useTranslation } from '../../context/LanguageContext';

export const CelebrationWishScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
    const { isDark } = useAppTheme();
    const { t } = useTranslation();
    const theme = isDark ? darkTheme : lightTheme;

    const [wishText, setWishText] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleSend = () => {
        if (!wishText.trim()) {
            Alert.alert(t('required', 'Required'), t('please_write_wish_message', 'Please write a wish message.'));
            return;
        }

        setIsSubmitting(true);
        setTimeout(() => {
            setIsSubmitting(false);
            Alert.alert(
                t('wish_sent', 'Wish Sent! 🎉'),
                t('wish_sent_desc', 'Your celebratory wish has been delivered to your colleague.'),
                [{ text: t('ok', 'OK'), onPress: () => navigation.goBack() }]
            );
        }, 500);
    };

    return (
        <AppShell title={t('send_celebration_wish', 'Send Celebration Wish')} onBack={() => navigation.goBack()}>
            <AppCard variant="surface" style={styles.heroCard}>
                <View style={[styles.giftIconCircle, { backgroundColor: 'rgba(236, 72, 153, 0.12)' }]}>
                    <Gift color="#EC4899" size={32} />
                </View>
                <Text style={[styles.title, { color: theme.colors.textPrimary }]}>
                    {t('happy_celebration', 'Happy Celebration! 🎂')}
                </Text>
                <Text style={[styles.subtitle, { color: theme.colors.textSecondary }]}>
                    {t('happy_celebration_desc', 'Send your colleague warm birthday or milestone wishes today.')}
                </Text>
            </AppCard>

            <AppCard variant="surface">
                <AppInput
                    label={t('your_wish_message', 'Your Wish Message')}
                    value={wishText}
                    onChangeText={setWishText}
                    placeholder={t('wish_placeholder', 'Wishing you a wonderful celebration filled with joy and success! 🎉')}
                    multiline
                    numberOfLines={4}
                />

                <View style={styles.btnWrapper}>
                    <AppButton
                        title={t('send_wish', 'Send Wish')}
                        onPress={handleSend}
                        loading={isSubmitting}
                        icon={<Send color="#FFFFFF" size={18} />}
                    />
                </View>

                <TouchableOpacity
                    style={styles.inboxBtn}
                    onPress={() => navigation.navigate('WishesInbox')}
                    activeOpacity={0.75}
                >
                    <Heart color="#EC4899" size={16} />
                    <Text style={styles.inboxBtnText}>{t('view_received_wishes_inbox', 'View My Received Wishes Inbox')}</Text>
                </TouchableOpacity>
            </AppCard>
        </AppShell>
    );
};

const styles = StyleSheet.create({
    heroCard: {
        alignItems: 'center',
        paddingVertical: 24,
        paddingHorizontal: 16,
        marginBottom: 14,
    },
    giftIconCircle: {
        width: 64,
        height: 64,
        borderRadius: 22,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 12,
    },
    title: {
        fontSize: 18,
        fontWeight: '800',
        textAlign: 'center',
    },
    subtitle: {
        fontSize: 13,
        textAlign: 'center',
        marginTop: 4,
        lineHeight: 18,
    },
    btnWrapper: {
        marginTop: 8,
    },
    inboxBtn: {
        flexDirection: 'row',
        gap: 6,
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: 16,
        paddingVertical: 8,
    },
    inboxBtnText: {
        color: '#EC4899',
        fontSize: 13,
        fontWeight: '700',
    },
});
