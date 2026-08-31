import React, { useState, useRef } from 'react';
import {
    View,
    TextInput,
    TouchableOpacity,
    ActivityIndicator,
    Alert,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    Image,
    StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useUnistyles } from 'react-native-unistyles';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';
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
import { ENV } from '../../config/env';

export const LoginScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
    const { login, loginWithBiometrics, isBiometricAvailable, isLoading } = useAuth();
    const { isDark, toggleTheme } = useAppTheme();
    const { t, locale, setLocale } = useTranslation();
    const { theme } = useUnistyles();
    const scrollViewRef = useRef<any>(null);

    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);

    const toggleLanguage = () => {
        setLocale(locale === 'en' ? 'kh' : 'en');
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
        const success = await loginWithBiometrics();
        if (!success) {
            Alert.alert(
                t('biometric_login', 'Biometric Login'),
                t('biometric_failed', 'Biometric authentication failed or credentials not saved.')
            );
        }
    };

    return (
        <SafeAreaView {...({ style: [{ flex: 1, backgroundColor: theme.colors.background }] } as any)}>
            <StatusBar
                barStyle={isDark ? 'light-content' : 'dark-content'}
                backgroundColor={theme.colors.background}
            />

            <KeyboardAvoidingView
                style={{ flex: 1 }}
                behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            >
                {/* ── Top Utility Header (Parity with Welcome & Onboarding) ── */}
                <View style={styles.topBar}>
                    {/* Back Button */}
                    <TouchableOpacity
                        style={[
                            styles.iconButton,
                            {
                                backgroundColor: theme.colors.surface,
                                borderColor: theme.colors.border,
                            },
                        ]}
                        onPress={() => {
                            if (navigation.canGoBack()) {
                                navigation.goBack();
                            } else {
                                navigation.reset({ index: 0, routes: [{ name: 'Welcome' }] });
                            }
                        }}
                        activeOpacity={0.7}
                    >
                        <ArrowLeft size={18} color={theme.colors.textPrimary} />
                    </TouchableOpacity>

                    {/* Right Utilities (Language + Theme) */}
                    <View style={styles.topRight}>
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
                    </View>
                </View>

                <ScrollView
                    ref={scrollViewRef}
                    contentContainerStyle={styles.scrollContent}
                    keyboardShouldPersistTaps="handled"
                    keyboardDismissMode="on-drag"
                    automaticallyAdjustKeyboardInsets={Platform.OS === 'ios'}
                    showsVerticalScrollIndicator={false}
                    bounces={false}
                >
                    {/* ── Hero / Branding Section ─────────────────────────────── */}
                    <Animated.View entering={FadeInDown.duration(600).delay(100)} style={styles.brandContainer}>
                        <View style={styles.logoContainer}>
                            <Image
                                source={require('../../../assets/icon.png')}
                                style={styles.logoImage}
                                resizeMode="contain"
                            />
                        </View>
                        <AppText style={[styles.brandTitle, { color: theme.colors.textPrimary }]}>
                            {ENV.APP_NAME || 'SCCG Mobile App'}
                        </AppText>
                        <AppText style={[styles.welcomeTitle, { color: theme.colors.textPrimary }]}>
                            {t('welcome_back', 'Welcome Back')}
                        </AppText>
                        <AppText style={[styles.welcomeSubtitle, { color: theme.colors.textSecondary }]}>
                            {t('employee_self_service', 'Employee Self-Service Portal')}
                        </AppText>
                    </Animated.View>

                    {/* ── Login Form Card ─────────────────────────────────────── */}
                    <Animated.View
                        entering={FadeInUp.duration(650).delay(200)}
                        style={[
                            styles.card,
                            {
                                backgroundColor: theme.colors.surface,
                                borderColor: theme.colors.border,
                            },
                        ]}
                    >
                        {/* Employee Email Input */}
                        <View style={styles.inputGroup}>
                            <AppText variant="caption" weight="medium" style={{ color: theme.colors.textSecondary, marginBottom: 6 }}>
                                {t('employee_email', 'Employee Email')}
                            </AppText>
                            <View
                                style={[
                                    styles.inputWrapper,
                                    {
                                        backgroundColor: theme.colors.background,
                                        borderColor: theme.colors.border,
                                    },
                                ]}
                            >
                                <Mail color={theme.colors.textSecondary} size={18} style={styles.inputIcon} />
                                <TextInput
                                    style={[styles.input, { color: theme.colors.textPrimary }]}
                                    placeholder={t('employee_email', 'Employee Email')}
                                    placeholderTextColor={theme.colors.textSecondary}
                                    value={email}
                                    onChangeText={setEmail}
                                    keyboardType="email-address"
                                    autoCapitalize="none"
                                    autoCorrect={false}
                                />
                            </View>
                        </View>

                        {/* Password Input */}
                        <View style={styles.inputGroup}>
                            <AppText variant="caption" weight="medium" style={{ color: theme.colors.textSecondary, marginBottom: 6 }}>
                                {t('password', 'Password')}
                            </AppText>
                            <View
                                style={[
                                    styles.inputWrapper,
                                    {
                                        backgroundColor: theme.colors.background,
                                        borderColor: theme.colors.border,
                                    },
                                ]}
                            >
                                <Lock color={theme.colors.textSecondary} size={18} style={styles.inputIcon} />
                                <TextInput
                                    style={[styles.input, { color: theme.colors.textPrimary }]}
                                    placeholder={t('password', 'Password')}
                                    placeholderTextColor={theme.colors.textSecondary}
                                    value={password}
                                    onChangeText={setPassword}
                                    secureTextEntry={!showPassword}
                                    autoCapitalize="none"
                                />
                                <TouchableOpacity
                                    onPress={() => setShowPassword(!showPassword)}
                                    style={styles.eyeButton}
                                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                                    activeOpacity={0.7}
                                >
                                    {showPassword ? (
                                        <EyeOff color={theme.colors.textSecondary} size={18} />
                                    ) : (
                                        <Eye color={theme.colors.textSecondary} size={18} />
                                    )}
                                </TouchableOpacity>
                            </View>
                        </View>

                        {/* Submit Button (Unified Brand Color) */}
                        <TouchableOpacity
                            style={[
                                styles.submitButton,
                                { backgroundColor: theme.colors.primary },
                            ]}
                            onPress={() => handleLogin(false)}
                            disabled={isLoading}
                            activeOpacity={0.85}
                        >
                            {isLoading ? (
                                <ActivityIndicator color="#FFFFFF" />
                            ) : (
                                <View style={styles.submitContent}>
                                    <LogIn color="#FFFFFF" size={18} />
                                    <AppText style={styles.submitText} weight="bold">
                                        {t('sign_in', 'Sign In')}
                                    </AppText>
                                </View>
                            )}
                        </TouchableOpacity>

                        {/* Quick Access Action Buttons */}
                        <View style={styles.quickAccessRow}>
                            <TouchableOpacity
                                style={[
                                    styles.quickActionButton,
                                    {
                                        backgroundColor: isDark ? '#1E2433' : '#F8FAFC',
                                        borderColor: theme.colors.border,
                                    },
                                ]}
                                onPress={() => navigation.navigate('QrLogin')}
                                activeOpacity={0.75}
                            >
                                <QrCode color={theme.colors.primary} size={18} />
                                <AppText style={[styles.quickActionText, { color: theme.colors.textPrimary }]}>
                                    {t('scan_qr_login', 'Scan QR Code')}
                                </AppText>
                            </TouchableOpacity>

                            {isBiometricAvailable && (
                                <TouchableOpacity
                                    style={[
                                        styles.quickActionButton,
                                        {
                                            backgroundColor: isDark ? '#1E2433' : '#F8FAFC',
                                            borderColor: theme.colors.border,
                                        },
                                    ]}
                                    onPress={handleBiometricAuth}
                                    activeOpacity={0.75}
                                >
                                    <Fingerprint color="#10B981" size={18} />
                                    <AppText style={[styles.quickActionText, { color: theme.colors.textPrimary }]}>
                                        {t('biometrics', 'Biometrics')}
                                    </AppText>
                                </TouchableOpacity>
                            )}
                        </View>
                    </Animated.View>
                </ScrollView>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
};

const styles = {
    topBar: {
        flexDirection: 'row' as const,
        justifyContent: 'space-between' as const,
        alignItems: 'center' as const,
        paddingHorizontal: 24,
        paddingTop: 8,
        paddingBottom: 8,
    },
    topRight: {
        flexDirection: 'row' as const,
        alignItems: 'center' as const,
        gap: 8,
    },
    utilityButton: {
        flexDirection: 'row' as const,
        alignItems: 'center' as const,
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 20,
        borderWidth: 1,
        gap: 6,
    },
    utilityButtonText: {
        fontSize: 13,
        fontWeight: '600' as const,
    },
    iconButton: {
        width: 38,
        height: 38,
        borderRadius: 19,
        borderWidth: 1,
        justifyContent: 'center' as const,
        alignItems: 'center' as const,
    },
    scrollContent: {
        flexGrow: 1,
        paddingHorizontal: 24,
        paddingTop: 12,
        paddingBottom: 48,
        justifyContent: 'center' as const,
    },
    brandContainer: {
        alignItems: 'center' as const,
        marginBottom: 16,
    },
    logoContainer: {
        alignItems: 'center' as const,
        justifyContent: 'center' as const,
        marginBottom: 10,
        ...Platform.select({
            ios: {
                shadowColor: '#000000',
                shadowOffset: { width: 0, height: 6 },
                shadowOpacity: 0.1,
                shadowRadius: 10,
            },
            android: {
                elevation: 4,
            },
        }),
    },
    logoImage: {
        width: 80,
        height: 80,
        borderRadius: 20,
    },
    brandTitle: {
        fontSize: 18,
        fontWeight: '800' as const,
        letterSpacing: -0.3,
        marginBottom: 4,
    },
    welcomeTitle: {
        fontSize: 23,
        fontWeight: '800' as const,
        textAlign: 'center' as const,
        marginBottom: 4,
    },
    welcomeSubtitle: {
        fontSize: 13,
        textAlign: 'center' as const,
    },
    card: {
        borderRadius: 20,
        padding: 20,
        borderWidth: 1,
        gap: 16,
        ...Platform.select({
            ios: {
                shadowColor: '#000000',
                shadowOffset: { width: 0, height: 8 },
                shadowOpacity: 0.08,
                shadowRadius: 16,
            },
            android: {
                elevation: 3,
            },
        }),
    },
    inputGroup: {
        width: '100%' as const,
    },
    inputWrapper: {
        flexDirection: 'row' as const,
        alignItems: 'center' as const,
        borderRadius: 14,
        paddingHorizontal: 14,
        minHeight: 50,
        borderWidth: 1,
    },
    inputIcon: {
        marginRight: 10,
    },
    input: {
        flex: 1,
        fontSize: 15,
        paddingVertical: 10,
    },
    eyeButton: {
        padding: 4,
    },
    submitButton: {
        flexDirection: 'row' as const,
        alignItems: 'center' as const,
        justifyContent: 'center' as const,
        minHeight: 50,
        paddingVertical: 12,
        borderRadius: 14,
        marginTop: 4,
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
    submitContent: {
        flexDirection: 'row' as const,
        alignItems: 'center' as const,
        gap: 8,
    },
    submitText: {
        color: '#FFFFFF',
        fontSize: 16,
    },
    quickAccessRow: {
        flexDirection: 'row' as const,
        gap: 10,
        marginTop: 4,
    },
    quickActionButton: {
        flex: 1,
        flexDirection: 'row' as const,
        alignItems: 'center' as const,
        justifyContent: 'center' as const,
        minHeight: 46,
        paddingVertical: 10,
        paddingHorizontal: 12,
        borderRadius: 12,
        borderWidth: 1,
        gap: 8,
    },
    quickActionText: {
        fontSize: 13,
        fontWeight: '600' as const,
    },
};
