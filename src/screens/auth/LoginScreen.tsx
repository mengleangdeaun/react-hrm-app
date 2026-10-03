import React, { useState, useRef } from 'react';
import {
    View,
    TouchableOpacity,
    Alert,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    StatusBar,
    StyleSheet,
} from 'react-native';
import { Image } from 'expo-image';
import * as Haptics from 'expo-haptics';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useUnistyles } from 'react-native-unistyles';
import {
    Lock,
    Mail,
    QrCode,
    Fingerprint,
    LogIn,
    ArrowLeft,
    Sun,
    Moon,
    Globe,
    Eye,
    EyeOff,
} from 'lucide-react-native';
import { useAuth } from '../../context/AuthContext';
import { useAppTheme } from '../../context/ThemeContext';
import { useTranslation } from '../../context/LanguageContext';
import { AppText } from '../../components/AppText';
import { AppButton } from '../../components/common/AppButton';
import { AppInput } from '../../components/common/AppInput';
import { ENV } from '../../config/env';

export const LoginScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
    const { login, loginWithBiometrics, isBiometricAvailable, isLoading } = useAuth();
    const { isDark, toggleTheme } = useAppTheme();
    const { t, locale, setLocale } = useTranslation();
    const { theme } = useUnistyles();
    const insets = useSafeAreaInsets();
    const scrollViewRef = useRef<any>(null);

    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);

    const toggleLanguage = () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
        setLocale(locale === 'en' ? 'kh' : 'en');
    };

    const handleThemeToggle = () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
        toggleTheme();
    };

    const handleBack = () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
        if (navigation.canGoBack()) {
            navigation.goBack();
        } else {
            navigation.reset({ index: 0, routes: [{ name: 'Welcome' }] });
        }
    };

    const handleLogin = async (forceOption: any = false) => {
        const force = typeof forceOption === 'boolean' ? forceOption : false;
        if (!email.trim() || !password) {
            Alert.alert(
                t('required', 'Required'),
                t('enter_email_password', 'Please enter both email and password')
            );
            return;
        }

        try {
            await login({ email: email.trim(), password }, force);
        } catch (error: any) {
            const errorMsg = error?.message || t('login_error_occurred', 'An error occurred during login.');
            if (error?.code === 'DEVICE_MISMATCH') {
                const promptText = errorMsg + '\n\n' + t('device_transfer_prompt', 'Would you like to transfer your account to this device?');
                if (Platform.OS === 'web') {
                    if (window.confirm('Device Transfer Required\n\n' + promptText)) {
                        handleLogin(true);
                    }
                } else {
                    Alert.alert(
                        t('device_transfer_required', 'Device Transfer Required'),
                        promptText,
                        [
                            { text: t('cancel', 'Cancel'), style: 'cancel' },
                            {
                                text: t('transfer_account', 'Transfer Account'),
                                style: 'destructive',
                                onPress: () => handleLogin(true),
                            },
                        ]
                    );
                }
            } else if (error?.code === 'DEVICE_TAKEN') {
                if (Platform.OS === 'web') {
                    window.alert('Security Error:\n' + errorMsg);
                } else {
                    Alert.alert(t('security_error', 'Security Error'), errorMsg);
                }
            } else {
                if (Platform.OS === 'web') {
                    window.alert('Login Failed:\n' + errorMsg);
                } else {
                    Alert.alert(t('login_failed', 'Login Failed'), errorMsg);
                }
            }
        }
    };

    const handleBiometricAuth = async () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
        const success = await loginWithBiometrics();
        if (!success) {
            Alert.alert(
                t('biometric_login', 'Biometric Login'),
                t('biometric_failed', 'Biometric authentication failed or credentials not saved.')
            );
        }
    };

    const handleQrLogin = () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
        navigation.navigate('QrLogin');
    };

    return (
        <SafeAreaView edges={['top', 'left', 'right']} {...({ style: [styles.safeArea, { backgroundColor: theme.colors.background }] } as any)}>
            <StatusBar
                barStyle={isDark ? 'light-content' : 'dark-content'}
                backgroundColor={theme.colors.background}
            />

            {/* ── Top Utility Header (Fixed at top) ── */}
            <View style={styles.topBar}>
                <TouchableOpacity
                    style={[
                        styles.iconButton,
                        {
                            backgroundColor: theme.colors.surface,
                            borderColor: theme.colors.border,
                        },
                    ]}
                    onPress={handleBack}
                    activeOpacity={0.7}
                    accessibilityRole="button"
                    accessibilityLabel="Go back"
                >
                    <ArrowLeft size={18} color={theme.colors.textPrimary} />
                </TouchableOpacity>

                <View style={styles.topRight}>
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
                        accessibilityRole="button"
                        accessibilityLabel="Change language"
                    >
                        <Globe size={15} color={theme.colors.textPrimary} />
                        <AppText style={[styles.utilityButtonText, { color: theme.colors.textPrimary }]}>
                            {locale === 'en' ? 'ភាសាខ្មែរ' : 'English'}
                        </AppText>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={[
                            styles.iconButton,
                            {
                                backgroundColor: theme.colors.surface,
                                borderColor: theme.colors.border,
                            },
                        ]}
                        onPress={handleThemeToggle}
                        activeOpacity={0.7}
                        accessibilityRole="button"
                        accessibilityLabel="Toggle theme"
                    >
                        {isDark ? (
                            <Sun size={18} color="#FBBF24" />
                        ) : (
                            <Moon size={18} color="#6366F1" />
                        )}
                    </TouchableOpacity>
                </View>
            </View>

            <KeyboardAvoidingView
                style={styles.keyboardContainer}
                behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                keyboardVerticalOffset={Platform.OS === 'ios' ? insets.top + 10 : 0}
            >
                <ScrollView
                    ref={scrollViewRef}
                    contentContainerStyle={styles.scrollContent}
                    keyboardShouldPersistTaps="handled"
                    keyboardDismissMode="on-drag"
                    showsVerticalScrollIndicator={false}
                    bounces={false}
                >
                    {/* ── Hero / Branding Section ─────────────────────────────── */}
                    <View style={styles.brandContainer}>
                        <View
                            style={[
                                styles.logoContainer,
                                {
                                    backgroundColor: theme.colors.surface,
                                    borderColor: theme.colors.border,
                                },
                            ]}
                        >
                            <Image
                                source={require('../../../assets/icon.png')}
                                style={styles.logoImage}
                                contentFit="contain"
                                transition={200}
                            />
                        </View>

                        <View
                            style={[
                                styles.brandBadge,
                                {
                                    backgroundColor: isDark
                                        ? 'rgba(223, 0, 0, 0.15)'
                                        : 'rgba(223, 0, 0, 0.08)',
                                },
                            ]}
                        >
                            <AppText
                                style={[
                                    styles.brandTitle,
                                    { color: theme.colors.brand },
                                ]}
                            >
                                {ENV.APP_NAME || 'SCCG HRM'}
                            </AppText>
                        </View>

                        <AppText style={[styles.welcomeTitle, { color: theme.colors.textPrimary }]}>
                            {t('welcome_back', 'Welcome Back')}
                        </AppText>
                        <AppText style={[styles.welcomeSubtitle, { color: theme.colors.textSecondary }]}>
                            {t('employee_self_service', 'Employee Self-Service Portal')}
                        </AppText>
                    </View>

                    {/* ── Login Form Card ─────────────────────────────────────── */}
                    <View
                        style={[
                            styles.card,
                            {
                                backgroundColor: theme.colors.surface,
                                borderColor: theme.colors.border,
                            },
                        ]}
                    >
                        {/* Employee Email Input */}
                        <AppInput
                            label={t('employee_email', 'Employee Email')}
                            value={email}
                            onChangeText={setEmail}
                            placeholder={t('employee_email', 'Employee Email')}
                            placeholderTextColor={theme.colors.textSecondary}
                            keyboardType="email-address"
                            autoCapitalize="none"
                            autoCorrect={false}
                            icon={<Mail color={theme.colors.textSecondary} size={18} />}
                            containerStyle={styles.inputSpacing}
                        />

                        {/* Password Input */}
                        <AppInput
                            label={t('password', 'Password')}
                            value={password}
                            onChangeText={setPassword}
                            placeholder={t('password', 'Password')}
                            placeholderTextColor={theme.colors.textSecondary}
                            secureTextEntry={!showPassword}
                            autoCapitalize="none"
                            autoCorrect={false}
                            icon={<Lock color={theme.colors.textSecondary} size={18} />}
                            rightAction={
                                <TouchableOpacity
                                    onPress={() => {
                                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
                                        setShowPassword(!showPassword);
                                    }}
                                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                                    activeOpacity={0.7}
                                    accessibilityRole="button"
                                    accessibilityLabel={showPassword ? t('hide_password', 'Hide Password') : t('show_password', 'Show Password')}
                                >
                                    {showPassword ? (
                                        <EyeOff color={theme.colors.textSecondary} size={18} />
                                    ) : (
                                        <Eye color={theme.colors.textSecondary} size={18} />
                                    )}
                                </TouchableOpacity>
                            }
                            containerStyle={styles.passwordSpacing}
                        />

                        {/* Submit Button */}
                        <AppButton
                            title={t('sign_in', 'Sign In')}
                            icon={<LogIn color="#FFFFFF" size={18} />}
                            onPress={() => handleLogin(false)}
                            loading={isLoading}
                            disabled={isLoading}
                            size="lg"
                            variant="primary"
                        />

                        {/* Visual Divider */}
                        <View style={styles.dividerRow}>
                            <View style={[styles.dividerLine, { backgroundColor: theme.colors.border }]} />
                            <AppText variant="caption" color="secondary" style={styles.dividerText}>
                                {t('or_continue_with', 'or continue with')}
                            </AppText>
                            <View style={[styles.dividerLine, { backgroundColor: theme.colors.border }]} />
                        </View>

                        {/* Quick Access Action Buttons */}
                        <View style={styles.quickAccessRow}>
                            <TouchableOpacity
                                style={[
                                    styles.quickActionButton,
                                    {
                                        backgroundColor: theme.colors.surfaceSubtle,
                                        borderColor: theme.colors.border,
                                    },
                                ]}
                                onPress={handleQrLogin}
                                activeOpacity={0.75}
                                accessibilityRole="button"
                                accessibilityLabel={t('scan_qr_login', 'Scan QR Code')}
                            >
                                <View
                                    style={[
                                        styles.quickActionIconWrap,
                                        {
                                            backgroundColor: isDark
                                                ? 'rgba(223, 0, 0, 0.16)'
                                                : 'rgba(223, 0, 0, 0.08)',
                                        },
                                    ]}
                                >
                                    <QrCode color={theme.colors.brand} size={17} />
                                </View>
                                <AppText style={[styles.quickActionText, { color: theme.colors.textPrimary }]}>
                                    {t('scan_qr_login', 'Scan QR Code')}
                                </AppText>
                            </TouchableOpacity>

                            {isBiometricAvailable && (
                                <TouchableOpacity
                                    style={[
                                        styles.quickActionButton,
                                        {
                                            backgroundColor: theme.colors.surfaceSubtle,
                                            borderColor: theme.colors.border,
                                        },
                                    ]}
                                    onPress={handleBiometricAuth}
                                    activeOpacity={0.75}
                                    accessibilityRole="button"
                                    accessibilityLabel={t('biometrics', 'Biometrics')}
                                >
                                    <View
                                        style={[
                                            styles.quickActionIconWrap,
                                            {
                                                backgroundColor: isDark
                                                    ? 'rgba(16, 185, 129, 0.16)'
                                                    : 'rgba(16, 185, 129, 0.08)',
                                            },
                                        ]}
                                    >
                                        <Fingerprint color="#10B981" size={17} />
                                    </View>
                                    <AppText style={[styles.quickActionText, { color: theme.colors.textPrimary }]}>
                                        {t('biometrics', 'Biometrics')}
                                    </AppText>
                                </TouchableOpacity>
                            )}
                        </View>
                    </View>
                </ScrollView>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    safeArea: {
        flex: 1,
    },
    keyboardContainer: {
        flex: 1,
    },
    topBar: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingTop: 8,
        paddingBottom: 8,
        zIndex: 10,
    },
    topRight: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    utilityButton: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 12,
        paddingVertical: 7,
        borderRadius: 20,
        borderWidth: 1,
        gap: 6,
    },
    utilityButtonText: {
        fontSize: 12.5,
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
    scrollContent: {
        flexGrow: 1,
        paddingHorizontal: 20,
        paddingTop: 6,
        paddingBottom: 40,
    },
    brandContainer: {
        alignItems: 'center',
        marginTop: 8,
        marginBottom: 20,
    },
    logoContainer: {
        width: 82,
        height: 82,
        borderRadius: 24,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 12,
        borderWidth: 1,
        ...Platform.select({
            ios: {
                shadowColor: '#000000',
                shadowOffset: { width: 0, height: 6 },
                shadowOpacity: 0.08,
                shadowRadius: 12,
            },
            android: {
                elevation: 4,
            },
        }),
    },
    logoImage: {
        width: 70,
        height: 70,
        borderRadius: 18,
    },
    brandBadge: {
        paddingHorizontal: 10,
        paddingVertical: 3,
        borderRadius: 12,
        marginBottom: 8,
    },
    brandTitle: {
        fontSize: 12,
        fontWeight: '800',
        letterSpacing: 0.6,
        textTransform: 'uppercase',
    },
    welcomeTitle: {
        fontSize: 24,
        fontWeight: '800',
        textAlign: 'center',
        letterSpacing: -0.4,
        marginBottom: 4,
    },
    welcomeSubtitle: {
        fontSize: 13.5,
        textAlign: 'center',
        fontWeight: '500',
    },
    card: {
        borderRadius: 22,
        padding: 18,
        borderWidth: 1,
        gap: 12,
        ...Platform.select({
            ios: {
                shadowColor: '#000000',
                shadowOffset: { width: 0, height: 8 },
                shadowOpacity: 0.06,
                shadowRadius: 16,
            },
            android: {
                elevation: 3,
            },
        }),
    },
    inputSpacing: {
        marginBottom: 2,
    },
    passwordSpacing: {
        marginBottom: 6,
    },
    dividerRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        marginVertical: 4,
    },
    dividerLine: {
        flex: 1,
        height: StyleSheet.hairlineWidth,
    },
    dividerText: {
        fontSize: 12,
        fontWeight: '500',
    },
    quickAccessRow: {
        flexDirection: 'row',
        gap: 10,
        marginTop: 2,
    },
    quickActionButton: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: 48,
        paddingVertical: 10,
        paddingHorizontal: 12,
        borderRadius: 14,
        borderWidth: 1,
        gap: 8,
    },
    quickActionIconWrap: {
        width: 28,
        height: 28,
        borderRadius: 8,
        alignItems: 'center',
        justifyContent: 'center',
    },
    quickActionText: {
        fontSize: 12.5,
        fontWeight: '600',
    },
});