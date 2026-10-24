import React, { useState, useEffect } from 'react';
import {
    View,
    Pressable,
    StatusBar,
    Image,
    Platform,
    ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StyleSheet, useUnistyles } from 'react-native-unistyles';

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
    const styles = stylesheet;
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
        <SafeAreaView {...({ style: styles.container } as any)}>
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
                <View style={styles.topBar}>
                    {/* Language Switcher */}
                    <Pressable
                        style={({ pressed }: { pressed: boolean }) => [
                            styles.utilityButton,
                            pressed && styles.buttonPressed,
                        ]}
                        onPress={toggleLanguage}
                        accessibilityRole="button"
                        accessibilityLabel="Switch language"
                    >
                        <Globe size={16} color={theme.colors.textPrimary} />
                        <AppText style={styles.utilityButtonText}>
                            {locale === 'en' ? 'ភាសាខ្មែរ' : 'English'}
                        </AppText>
                    </Pressable>

                    {/* Theme Mode Switcher */}
                    <Pressable
                        style={({ pressed }: { pressed: boolean }) => [
                            styles.iconButton,
                            pressed && styles.buttonPressed,
                        ]}
                        onPress={toggleTheme}
                        accessibilityRole="button"
                        accessibilityLabel="Toggle dark/light theme"
                    >
                        {isDark ? (
                            <Sun size={18} color="#FBBF24" />
                        ) : (
                            <Moon size={18} color="#6366F1" />
                        )}
                    </Pressable>
                </View>

                {/* Hero / Brand Section */}
                <View style={styles.heroSection}>
                    <View style={styles.logoContainer}>
                        <Image
                            source={require('../../../assets/icon.png')}
                            style={styles.logoImage}
                            resizeMode="contain"
                        />
                    </View>

                    <View style={styles.brandTitleContainer}>
                        <AppText style={styles.brandTitle}>
                            {ENV.APP_NAME || 'SCCG Mobile App'}
                        </AppText>
                    </View>

                    <View>
                        <AppText style={styles.heroHeadline}>
                            {t('welcome_title')}
                        </AppText>
                        <AppText style={styles.heroSubtitle}>
                            {t('welcome_subtitle')}
                        </AppText>
                    </View>
                </View>

                {/* Action Buttons Section */}
                <View style={styles.actionsSection}>
                    {/* Legal Confirmation Checkbox & Links Row */}
                    <View style={styles.legalContainer}>
                        <View style={styles.legalCheckboxRow}>
                            <Pressable
                                onPress={toggleTermsAcceptance}
                                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                                accessibilityRole="checkbox"
                                accessibilityState={{ checked: isTermsAccepted }}
                                accessibilityLabel={t('legal_agree_prefix')}
                            >
                                <View
                                    style={[
                                        styles.checkbox,
                                        isTermsAccepted && styles.checkboxChecked,
                                        validationError && styles.checkboxError,
                                    ]}
                                >
                                    {isTermsAccepted && (
                                        <Check size={13} color="#FFFFFF" strokeWidth={3} />
                                    )}
                                </View>
                            </Pressable>

                            <View style={styles.legalTextContainer}>
                                <AppText style={styles.legalText}>
                                    <AppText onPress={toggleTermsAcceptance}>
                                        {t('legal_agree_prefix', 'I have read and agree to the')}{' '}
                                    </AppText>
                                    <AppText
                                        style={styles.legalLink}
                                        onPress={() => setLegalSheetType('terms')}
                                    >
                                        {t('terms_of_service', 'Terms of Service')}
                                    </AppText>
                                    <AppText onPress={toggleTermsAcceptance}>
                                        {' '}{t('legal_agree_and', 'and')}{' '}
                                    </AppText>
                                    <AppText
                                        style={styles.legalLink}
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
                            <View style={styles.validationNotice}>
                                <AppText style={styles.validationText}>
                                    {t('legal_terms_required', 'Please agree to the Terms of Service & Privacy Policy to continue.')}
                                </AppText>
                            </View>
                        )}
                    </View>

                    {/* Primary Button */}
                    <Pressable
                        style={({ pressed }: { pressed: boolean }) => [
                            styles.primaryButton,
                            pressed && styles.primaryButtonPressed,
                        ]}
                        onPress={handleGetStarted}
                        accessibilityRole="button"
                    >
                        <AppText style={styles.primaryButtonText}>
                            {t('get_started')}
                        </AppText>
                        <ArrowRight size={18} color={theme.colors.onPrimary} />
                    </Pressable>

                    {/* Secondary Button (Sign In) */}
                    <Pressable
                        style={({ pressed }: { pressed: boolean }) => [
                            styles.secondaryButton,
                            pressed && styles.buttonPressed,
                        ]}
                        onPress={handleSignIn}
                        accessibilityRole="button"
                    >
                        <LogIn size={18} color={theme.colors.textPrimary} />
                        <AppText style={styles.secondaryButtonText}>
                            {t('sign_in')}
                        </AppText>
                    </Pressable>

                    {/* QR Code Quick Login */}
                    <Pressable
                        style={({ pressed }: { pressed: boolean }) => [
                            styles.qrButton,
                            pressed && { opacity: 0.6 },
                        ]}
                        onPress={handleQrLogin}
                        accessibilityRole="button"
                    >
                        <QrCode size={16} color={theme.colors.textSecondary} />
                        <AppText style={styles.qrButtonText}>
                            {t('scan_qr_login')}
                        </AppText>
                    </Pressable>
                </View>
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

const stylesheet = StyleSheet.create((theme) => ({
    container: {
        flex: 1,
        backgroundColor: theme.colors.background,
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
        backgroundColor: theme.colors.surface,
        borderColor: theme.colors.border,
        gap: 6,
    },
    utilityButtonText: {
        fontSize: 13,
        fontWeight: '600',
        color: theme.colors.textPrimary,
    },
    iconButton: {
        width: 38,
        height: 38,
        borderRadius: 19,
        borderWidth: 1,
        backgroundColor: theme.colors.surface,
        borderColor: theme.colors.border,
        justifyContent: 'center',
        alignItems: 'center',
    },
    buttonPressed: {
        opacity: 0.75,
        transform: [{ scale: 0.98 }],
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
        color: theme.colors.textPrimary,
    },
    heroHeadline: {
        fontSize: 26,
        fontWeight: '800',
        textAlign: 'center',
        lineHeight: 34,
        marginBottom: 12,
        color: theme.colors.textPrimary,
    },
    heroSubtitle: {
        fontSize: 14,
        lineHeight: 22,
        textAlign: 'center',
        paddingHorizontal: 16,
        color: theme.colors.textSecondary,
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
        backgroundColor: theme.colors.primary,
        gap: 8,
        ...Platform.select({
            ios: {
                shadowColor: theme.colors.brand,
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.28,
                shadowRadius: 8,
            },
            android: {
                elevation: 4,
            },
        }),
    },
    primaryButtonPressed: {
        opacity: 0.9,
        transform: [{ scale: 0.99 }],
    },
    primaryButtonText: {
        fontSize: 16,
        fontWeight: '700',
        color: theme.colors.onPrimary,
    },
    secondaryButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: 50,
        paddingVertical: 12,
        borderRadius: 14,
        borderWidth: 1,
        backgroundColor: theme.colors.surface,
        borderColor: theme.colors.border,
        gap: 8,
    },
    secondaryButtonText: {
        fontSize: 15,
        fontWeight: '600',
        color: theme.colors.textPrimary,
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
        color: theme.colors.textSecondary,
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
        borderColor: theme.colors.borderStrong,
        backgroundColor: theme.colors.surface,
        justifyContent: 'center',
        alignItems: 'center',
        flexShrink: 0,
    },
    checkboxChecked: {
        borderColor: theme.colors.primary,
        backgroundColor: theme.colors.primary,
    },
    checkboxError: {
        borderColor: theme.colors.status.danger,
    },
    legalTextContainer: {
        flex: 1,
    },
    legalText: {
        fontSize: 12.5,
        lineHeight: 18,
        color: theme.colors.textSecondary,
    },
    legalLink: {
        fontWeight: '700',
        textDecorationLine: 'underline',
        color: theme.colors.primary,
    },
    validationNotice: {
        marginTop: 6,
        paddingHorizontal: 4,
    },
    validationText: {
        fontSize: 12,
        fontWeight: '600',
        lineHeight: 16,
        color: theme.colors.status.danger,
    },
}));
