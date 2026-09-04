import React, { useState, useEffect } from 'react';
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
import * as Haptics from 'expo-haptics';
import {
    QrCode,
    LogIn,
    ArrowRight,
    Sun,
    Moon,
    Globe,
    Check,
} from 'lucide-react-native';
import { useAppTheme } from '../../context/ThemeContext';
import { useTranslation } from '../../context/LanguageContext';
import { useAuth } from '../../context/AuthContext';
import { AppText } from '../../components/AppText';
import { LegalDocumentSheet } from '../../components/common/LegalDocumentSheet';
import { getLegalTermsAccepted, setLegalTermsAccepted } from '../../utils/storage';
import { ENV } from '../../config/env';

export const WelcomeScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
    const { isDark, toggleTheme } = useAppTheme();
    const { theme } = useUnistyles();
    const { t, locale, setLocale } = useTranslation();
    const { hasCompletedOnboarding } = useAuth();

    // Legal consent states
    const [isTermsAccepted, setIsTermsAccepted] = useState<boolean>(false);
    const [legalSheetType, setLegalSheetType] = useState<'privacy' | 'terms' | null>(null);
    const [validationError, setValidationError] = useState<boolean>(false);

    useEffect(() => {
        let isMounted = true;
        getLegalTermsAccepted().then((status) => {
            if (isMounted && status.accepted) {
                setIsTermsAccepted(true);
            }
        });
        return () => {
            isMounted = false;
        };
    }, []);

    const toggleTermsAcceptance = () => {
        Haptics.selectionAsync().catch(() => {});
        const nextVal = !isTermsAccepted;
        setIsTermsAccepted(nextVal);
        setLegalTermsAccepted(nextVal).catch(() => {});
        if (nextVal) {
            setValidationError(false);
        }
    };

    const handleAcceptFromSheet = () => {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
        setIsTermsAccepted(true);
        setValidationError(false);
        setLegalTermsAccepted(true).catch(() => {});
    };

    const validateLegalConsent = (): boolean => {
        if (!isTermsAccepted) {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => {});
            setValidationError(true);
            return false;
        }
        return true;
    };

    const handleGetStarted = () => {
        if (!validateLegalConsent()) return;

        if (!hasCompletedOnboarding) {
            navigation.navigate('Onboarding');
        } else {
            navigation.navigate('Login');
        }
    };

    const handleSignIn = () => {
        if (!validateLegalConsent()) return;
        navigation.navigate('Login');
    };

    const handleQrLogin = () => {
        if (!validateLegalConsent()) return;
        navigation.navigate('QrLogin');
    };

    const toggleLanguage = () => {
        setLocale(locale === 'en' ? 'kh' : 'en');
    };

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
                        style={styles.logoContainer}
                    >
                        <Image
                            source={require('../../../assets/icon.png')}
                            style={styles.logoImage}
                            resizeMode="contain"
                        />
                    </Animated.View>

                    <Animated.View entering={FadeInDown.duration(700).delay(300)} style={styles.brandTitleContainer}>
                        <AppText style={[styles.brandTitle, { color: theme.colors.textPrimary }]}>
                            {ENV.APP_NAME || 'SCCG Mobile App'}
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
                </View>

                {/* Action Buttons Section */}
                <Animated.View entering={FadeInUp.duration(700).delay(500)} style={styles.actionsSection}>
                    {/* Legal Confirmation Checkbox & Links Row */}
                    <View style={styles.legalContainer}>
                        <View style={styles.legalCheckboxRow}>
                            <TouchableOpacity
                                onPress={toggleTermsAcceptance}
                                activeOpacity={0.75}
                                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                                accessibilityRole="checkbox"
                                accessibilityState={{ checked: isTermsAccepted }}
                                accessibilityLabel={t('legal_agree_prefix')}
                            >
                                <View
                                    style={[
                                        styles.checkbox,
                                        {
                                            borderColor: validationError
                                                ? theme.colors.status.danger
                                                : isTermsAccepted
                                                ? theme.colors.primary
                                                : theme.colors.borderStrong,
                                            backgroundColor: isTermsAccepted
                                                ? theme.colors.primary
                                                : isDark
                                                ? '#1F2430'
                                                : '#FFFFFF',
                                        },
                                    ]}
                                >
                                    {isTermsAccepted && (
                                        <Check size={13} color="#FFFFFF" strokeWidth={3} />
                                    )}
                                </View>
                            </TouchableOpacity>

                            <View style={styles.legalTextContainer}>
                                <AppText style={[styles.legalText, { color: theme.colors.textSecondary }]}>
                                    <AppText onPress={toggleTermsAcceptance}>
                                        {t('legal_agree_prefix', 'I have read and agree to the')}{' '}
                                    </AppText>
                                    <AppText
                                        style={[styles.legalLink, { color: theme.colors.primary }]}
                                        onPress={() => setLegalSheetType('terms')}
                                    >
                                        {t('terms_of_service', 'Terms of Service')}
                                    </AppText>
                                    <AppText onPress={toggleTermsAcceptance}>
                                        {' '}{t('legal_agree_and', 'and')}{' '}
                                    </AppText>
                                    <AppText
                                        style={[styles.legalLink, { color: theme.colors.primary }]}
                                        onPress={() => setLegalSheetType('privacy')}
                                    >
                                        {t('privacy_policy', 'Privacy Policy')}
                                    </AppText>
                                    <AppText onPress={toggleTermsAcceptance}>
                                        .
                                    </AppText>
                                </AppText>
                            </View>
                        </View>

                        {/* Inline Error Notice */}
                        {validationError && (
                            <Animated.View entering={FadeInDown.duration(200)} style={styles.validationNotice}>
                                <AppText style={[styles.validationText, { color: theme.colors.status.danger }]}>
                                    {t('legal_terms_required', 'Please agree to the Terms of Service & Privacy Policy to continue.')}
                                </AppText>
                            </Animated.View>
                        )}
                    </View>

                    {/* Primary Button */}
                    <TouchableOpacity
                        style={[
                            styles.primaryButton,
                            { backgroundColor: theme.colors.primary, shadowColor: theme.colors.brand },
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

            {/* Native BottomSheet for Legal Documents */}
            <LegalDocumentSheet
                visible={legalSheetType !== null}
                onClose={() => setLegalSheetType(null)}
                type={legalSheetType || 'privacy'}
                onAccept={handleAcceptFromSheet}
                acceptButtonText={t('legal_terms_acknowledged', 'Acknowledged & Agreed')}
            />
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
        paddingHorizontal: 16,
        paddingTop: 12,
        paddingBottom: 24,
    },
    topBar: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
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
        paddingVertical: 12,
    },
    logoContainer: {
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 18,
        ...Platform.select({
            ios: {
                shadowColor: '#000000',
                shadowOffset: { width: 0, height: 6 },
                shadowOpacity: 0.12,
                shadowRadius: 10,
            },
            android: {
                elevation: 4,
            },
        }),
    },
    logoImage: {
        width: 100,
        height: 100,
        borderRadius: 22,
    },
    brandTitleContainer: {
        alignItems: 'center',
        marginBottom: 14,
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
        lineHeight: 34,
        marginBottom: 12,
    },
    heroSubtitle: {
        fontSize: 14,
        lineHeight: 22,
        textAlign: 'center',
        paddingHorizontal: 16,
    },
    actionsSection: {
        width: '100%',
        gap: 12,
        marginTop: 20,
    },
    primaryButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: 52,
        paddingVertical: 12,
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
        minHeight: 50,
        paddingVertical: 12,
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
        paddingVertical: 10,
        minHeight: 40,
        gap: 6,
    },
    qrButtonText: {
        fontSize: 13,
        fontWeight: '500',
    },
    legalContainer: {
        width: '100%',
        marginBottom: 4,
    },
    legalCheckboxRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 4,
        gap: 10,
    },
    checkbox: {
        width: 20,
        height: 20,
        borderRadius: 6,
        borderWidth: 1.5,
        justifyContent: 'center',
        alignItems: 'center',
        flexShrink: 0,
    },
    legalTextContainer: {
        flex: 1,
    },
    legalText: {
        fontSize: 12.5,
        lineHeight: 18,
    },
    legalLink: {
        fontWeight: '700',
        textDecorationLine: 'underline',
    },
    validationNotice: {
        marginTop: 6,
        paddingHorizontal: 4,
    },
    validationText: {
        fontSize: 12,
        fontWeight: '600',
        lineHeight: 16,
    },
});
