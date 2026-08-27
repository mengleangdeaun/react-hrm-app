import React from 'react';
import {
    View,
    TouchableOpacity,
    StatusBar,
    StyleSheet,
    Image,
    Platform,
    ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useUnistyles } from 'react-native-unistyles';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';
import {
    QrCode,
    LogIn,
    ArrowRight,
    Sun,
    Moon,
    MapPin,
    Calendar,
    Bell,
    Sparkles,
    Globe,
} from 'lucide-react-native';
import { useAppTheme } from '../../context/ThemeContext';
import { useTranslation } from '../../context/LanguageContext';
import { useAuth } from '../../context/AuthContext';
import { AppText } from '../../components/AppText';
import { ENV } from '../../config/env';

export const WelcomeScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
    const { isDark, toggleTheme } = useAppTheme();
    const { theme } = useUnistyles();
    const { t, locale, setLocale } = useTranslation();
    const { hasCompletedOnboarding } = useAuth();

    const handleGetStarted = () => {
        if (!hasCompletedOnboarding) {
            navigation.navigate('Onboarding');
        } else {
            navigation.navigate('Login');
        }
    };

    const handleSignIn = () => {
        navigation.navigate('Login');
    };

    const handleQrLogin = () => {
        navigation.navigate('QrLogin');
    };

    const toggleLanguage = () => {
        setLocale(locale === 'en' ? 'kh' : 'en');
    };

    const features = [
        { icon: MapPin, text: 'Smart Attendance' },
        { icon: Calendar, text: 'Leave Management' },
        { icon: Bell, text: 'Instant Notices' },
    ];

    return (
        <SafeAreaView {...({ style: [styles.container, { backgroundColor: theme.colors.background }] } as any)}>
            <StatusBar
                barStyle={isDark ? 'light-content' : 'dark-content'}
                backgroundColor={theme.colors.background}
            />

            <ScrollView
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
                bounces={false}
            >
                {/* Top Utility Bar */}
                <Animated.View entering={FadeInDown.duration(600).delay(100)} style={styles.topBar}>
                    {/* Language Switcher */}
                    <TouchableOpacity
                        style={[
                            styles.utilityButton,
                            {
                                backgroundColor: theme.colors.surface,
                                borderColor: theme.colors.border,
                            },
                        ]}
                        onPress={toggleLanguage}
                        activeOpacity={0.7}
                    >
                        <Globe size={16} color={theme.colors.textPrimary} />
                        <AppText style={[styles.utilityButtonText, { color: theme.colors.textPrimary }]}>
                            {locale === 'en' ? 'ភាសាខ្មែរ' : 'English'}
                        </AppText>
                    </TouchableOpacity>

                    {/* Theme Mode Switcher */}
                    <TouchableOpacity
                        style={[
                            styles.iconButton,
                            {
                                backgroundColor: theme.colors.surface,
                                borderColor: theme.colors.border,
                            },
                        ]}
                        onPress={toggleTheme}
                        activeOpacity={0.7}
                    >
                        {isDark ? (
                            <Sun size={18} color="#FBBF24" />
                        ) : (
                            <Moon size={18} color="#6366F1" />
                        )}
                    </TouchableOpacity>
                </Animated.View>

                {/* Hero / Brand Section */}
                <View style={styles.heroSection}>
                    <Animated.View
                        entering={FadeInDown.duration(700).delay(200)}
                        style={[
                            styles.logoContainer,
                            {
                                backgroundColor: isDark ? 'rgba(255, 51, 51, 0.12)' : 'rgba(223, 0, 0, 0.08)',
                                borderColor: isDark ? 'rgba(255, 51, 51, 0.25)' : 'rgba(223, 0, 0, 0.2)',
                            },
                        ]}
                    >
                        <Image
                            source={require('../../../assets/icon.png')}
                            style={styles.logoImage}
                            resizeMode="contain"
                        />
                    </Animated.View>

                    <Animated.View entering={FadeInDown.duration(700).delay(300)} style={styles.brandTitleContainer}>
                        <View style={styles.badgeRow}>
                            <Sparkles size={13} color={theme.colors.primary} />
                            <AppText style={[styles.badgeText, { color: theme.colors.primary }]}>
                                Enterprise Suite
                            </AppText>
                        </View>
                        <AppText style={[styles.brandTitle, { color: theme.colors.textPrimary }]}>
                            {ENV.APP_NAME || 'HRMS Portal'}
                        </AppText>
                    </Animated.View>

                    <Animated.View entering={FadeInDown.duration(700).delay(400)}>
                        <AppText style={[styles.heroHeadline, { color: theme.colors.textPrimary }]}>
                            {t('welcome_title')}
                        </AppText>
                        <AppText style={[styles.heroSubtitle, { color: theme.colors.textSecondary }]}>
                            {t('welcome_subtitle')}
                        </AppText>
                    </Animated.View>

                    {/* Highlights Badges */}
                    <Animated.View entering={FadeInDown.duration(700).delay(500)} style={styles.featuresRow}>
                        {features.map((feat, idx) => {
                            const IconComponent = feat.icon;
                            return (
                                <View
                                    key={idx}
                                    style={[
                                        styles.featurePill,
                                        {
                                            backgroundColor: theme.colors.surface,
                                            borderColor: theme.colors.border,
                                        },
                                    ]}
                                >
                                    <IconComponent size={14} color={theme.colors.primary} />
                                    <AppText style={[styles.featurePillText, { color: theme.colors.textSecondary }]}>
                                        {feat.text}
                                    </AppText>
                                </View>
                            );
                        })}
                    </Animated.View>
                </View>

                {/* Action Buttons Section */}
                <Animated.View entering={FadeInUp.duration(700).delay(600)} style={styles.actionsSection}>
                    {/* Primary Button */}
                    <TouchableOpacity
                        style={[
                            styles.primaryButton,
                            { backgroundColor: theme.colors.primary },
                        ]}
                        onPress={handleGetStarted}
                        activeOpacity={0.85}
                    >
                        <AppText style={[styles.primaryButtonText, { color: theme.colors.onPrimary }]}>
                            {t('get_started')}
                        </AppText>
                        <ArrowRight size={18} color={theme.colors.onPrimary} />
                    </TouchableOpacity>

                    {/* Secondary Button (Sign In) */}
                    <TouchableOpacity
                        style={[
                            styles.secondaryButton,
                            {
                                backgroundColor: theme.colors.surface,
                                borderColor: theme.colors.border,
                            },
                        ]}
                        onPress={handleSignIn}
                        activeOpacity={0.75}
                    >
                        <LogIn size={18} color={theme.colors.textPrimary} />
                        <AppText style={[styles.secondaryButtonText, { color: theme.colors.textPrimary }]}>
                            {t('sign_in')}
                        </AppText>
                    </TouchableOpacity>

                    {/* QR Code Quick Login */}
                    <TouchableOpacity
                        style={styles.qrButton}
                        onPress={handleQrLogin}
                        activeOpacity={0.7}
                    >
                        <QrCode size={16} color={theme.colors.textSecondary} />
                        <AppText style={[styles.qrButtonText, { color: theme.colors.textSecondary }]}>
                            {t('scan_qr_login')}
                        </AppText>
                    </TouchableOpacity>
                </Animated.View>
            </ScrollView>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    scrollContent: {
        flexGrow: 1,
        justifyContent: 'space-between',
        paddingHorizontal: 24,
        paddingTop: 12,
        paddingBottom: 24,
    },
    topBar: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 20,
    },
    utilityButton: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 20,
        borderWidth: 1,
        gap: 6,
    },
    utilityButtonText: {
        fontSize: 13,
        fontWeight: '600',
    },
    iconButton: {
        width: 38,
        height: 38,
        borderRadius: 19,
        borderWidth: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    heroSection: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 16,
    },
    logoContainer: {
        width: 88,
        height: 88,
        borderRadius: 24,
        borderWidth: 1,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 16,
        ...Platform.select({
            ios: {
                shadowColor: '#DF0000',
                shadowOffset: { width: 0, height: 6 },
                shadowOpacity: 0.15,
                shadowRadius: 10,
            },
            android: {
                elevation: 4,
            },
        }),
    },
    logoImage: {
        width: 60,
        height: 60,
        borderRadius: 14,
    },
    brandTitleContainer: {
        alignItems: 'center',
        marginBottom: 12,
    },
    badgeRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        marginBottom: 4,
    },
    badgeText: {
        fontSize: 12,
        fontWeight: '700',
        textTransform: 'uppercase',
        letterSpacing: 0.8,
    },
    brandTitle: {
        fontSize: 22,
        fontWeight: '800',
        letterSpacing: -0.3,
    },
    heroHeadline: {
        fontSize: 26,
        fontWeight: '800',
        textAlign: 'center',
        lineHeight: 32,
        marginBottom: 10,
    },
    heroSubtitle: {
        fontSize: 14,
        lineHeight: 21,
        textAlign: 'center',
        paddingHorizontal: 12,
        marginBottom: 20,
    },
    featuresRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'center',
        gap: 8,
        marginTop: 6,
    },
    featurePill: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 12,
        paddingVertical: 7,
        borderRadius: 16,
        borderWidth: 1,
        gap: 6,
    },
    featurePillText: {
        fontSize: 12,
        fontWeight: '600',
    },
    actionsSection: {
        width: '100%',
        gap: 12,
        marginTop: 24,
    },
    primaryButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        height: 52,
        borderRadius: 14,
        gap: 8,
        ...Platform.select({
            ios: {
                shadowColor: '#DF0000',
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.25,
                shadowRadius: 8,
            },
            android: {
                elevation: 3,
            },
        }),
    },
    primaryButtonText: {
        fontSize: 16,
        fontWeight: '700',
    },
    secondaryButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        height: 50,
        borderRadius: 14,
        borderWidth: 1,
        gap: 8,
    },
    secondaryButtonText: {
        fontSize: 15,
        fontWeight: '600',
    },
    qrButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 8,
        gap: 6,
    },
    qrButtonText: {
        fontSize: 13,
        fontWeight: '500',
    },
});
