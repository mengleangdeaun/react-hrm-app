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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AppText as Text } from '../../components/AppText';
import { StyleSheet, useUnistyles } from 'react-native-unistyles';
import { useAuth } from '../../context/AuthContext';
import { useTranslation } from '../../context/LanguageContext';
import { Lock, Mail, QrCode, Fingerprint, LogIn } from 'lucide-react-native';

export const LoginScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
    const { login, loginWithBiometrics, isBiometricAvailable, isLoading } = useAuth();
    const { t } = useTranslation();
    const { theme } = useUnistyles();
    const styles = stylesheet;
    const scrollViewRef = useRef<any>(null);

    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loginMode, setLoginMode] = useState<'password' | 'pin'>('password');
    const [pin, setPin] = useState('');

    const handleInputFocus = () => {
        setTimeout(() => {
            scrollViewRef.current?.scrollToEnd({ animated: true });
        }, 120);
    };

    const handleLogin = async (forceOption: any = false) => {
        const force = typeof forceOption === 'boolean' ? forceOption : false;
        if (loginMode === 'password' && (!email || !password)) {
            Alert.alert(t('required', 'Required'), t('enter_email_password', 'Please enter both email and password'));
            return;
        }
        if (loginMode === 'pin' && pin.length < 4) {
            Alert.alert(t('required', 'Required'), t('enter_4digit_pin', 'Please enter your 4-digit PIN'));
            return;
        }

        try {
            if (loginMode === 'password') {
                await login({ email, password }, force);
            } else {
                await login({ pin }, force);
            }
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
            Alert.alert(t('biometric_login', 'Biometric Login'), t('biometric_failed', 'Biometric authentication failed or credentials not saved.'));
        }
    };

    return (
        <SafeAreaView {...({ edges: ['top', 'bottom'], style: { flex: 1, backgroundColor: theme.colors.background } } as any)}>
            <KeyboardAvoidingView
                style={styles.keyboardContainer}
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
            >
                <ScrollView
                    ref={scrollViewRef}
                    contentContainerStyle={styles.scrollContent}
                    keyboardShouldPersistTaps="handled"
                    showsVerticalScrollIndicator={false}
                    bounces={false}
                >
                    {/* Hero / Branding Section */}
                    <View style={styles.brandContainer}>
                        <View style={styles.logoContainer}>
                            <Image
                                source={require('../../../assets/icon.png')}
                                style={styles.logoImage}
                                resizeMode="contain"
                            />
                        </View>
                        <Text style={styles.welcomeTitle}>{t('welcome_back', 'Welcome Back')}</Text>
                        <Text style={styles.welcomeSubtitle}>{t('employee_self_service', 'Employee Self-Service Portal')}</Text>
                    </View>

                    {/* Login Mode Segmented Control */}
                    <View style={styles.segmentedContainer}>
                        <TouchableOpacity
                            style={[styles.segmentButton, loginMode === 'password' && styles.segmentButtonActive]}
                            onPress={() => setLoginMode('password')}
                            activeOpacity={0.8}
                        >
                            <Text style={[styles.segmentText, loginMode === 'password' && styles.segmentTextActive]}>
                                {t('password', 'Password')}
                            </Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={[styles.segmentButton, loginMode === 'pin' && styles.segmentButtonActive]}
                            onPress={() => setLoginMode('pin')}
                            activeOpacity={0.8}
                        >
                            <Text style={[styles.segmentText, loginMode === 'pin' && styles.segmentTextActive]}>
                                {t('pin_mode_tab', '4-Digit PIN')}
                            </Text>
                        </TouchableOpacity>
                    </View>

                    {/* Login Form Card */}
                    <View style={styles.card}>
                        {loginMode === 'password' ? (
                            <>
                                <View style={styles.inputWrapper}>
                                    <Mail color={theme.colors.textSecondary} size={20} style={styles.inputIcon} />
                                    <TextInput
                                        style={styles.input}
                                        placeholder={t('employee_email', 'Employee Email')}
                                        placeholderTextColor={theme.colors.textSecondary}
                                        value={email}
                                        onChangeText={setEmail}
                                        onFocus={handleInputFocus}
                                        keyboardType="email-address"
                                        autoCapitalize="none"
                                    />
                                </View>

                                <View style={styles.inputWrapper}>
                                    <Lock color={theme.colors.textSecondary} size={20} style={styles.inputIcon} />
                                    <TextInput
                                        style={styles.input}
                                        placeholder={t('password', 'Password')}
                                        placeholderTextColor={theme.colors.textSecondary}
                                        value={password}
                                        onChangeText={setPassword}
                                        onFocus={handleInputFocus}
                                        secureTextEntry
                                    />
                                </View>
                            </>
                        ) : (
                            <View style={styles.inputWrapper}>
                                <Lock color={theme.colors.textSecondary} size={20} style={styles.inputIcon} />
                                <TextInput
                                    style={styles.input}
                                    placeholder={t('enter_4digit_pin', 'Enter 4-Digit Security PIN')}
                                    placeholderTextColor={theme.colors.textSecondary}
                                    value={pin}
                                    onChangeText={setPin}
                                    onFocus={handleInputFocus}
                                    keyboardType="number-pad"
                                    maxLength={4}
                                    secureTextEntry
                                />
                            </View>
                        )}

                    {/* Submit Button */}
                    <TouchableOpacity
                        style={styles.submitButton}
                        onPress={() => handleLogin(false)}
                        disabled={isLoading}
                        activeOpacity={0.85}
                    >
                        {isLoading ? (
                            <ActivityIndicator color="#FFFFFF" />
                        ) : (
                            <View style={styles.submitContent}>
                                <LogIn color="#FFFFFF" size={20} />
                                <Text style={styles.submitText}>{t('sign_in', 'Sign In')}</Text>
                            </View>
                        )}
                    </TouchableOpacity>

                    {/* Quick Login Options */}
                    <View style={styles.quickAccessRow}>
                        <TouchableOpacity
                            style={styles.quickActionButton}
                            onPress={() => navigation.navigate('QrLogin')}
                            activeOpacity={0.7}
                        >
                            <QrCode color={theme.colors.primary} size={20} />
                            <Text style={styles.quickActionText}>{t('scan_qr_login', 'QR Code Login')}</Text>
                        </TouchableOpacity>

                        {isBiometricAvailable && (
                            <TouchableOpacity
                                style={styles.quickActionButton}
                                onPress={handleBiometricAuth}
                                activeOpacity={0.7}
                            >
                                <Fingerprint color={theme.colors.status.success} size={20} />
                                <Text style={[styles.quickActionText, { color: theme.colors.status.success }]}>
                                    {t('biometrics', 'Biometrics')}
                                </Text>
                            </TouchableOpacity>
                        )}
                    </View>
                </View>
            </ScrollView>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
};

const stylesheet = StyleSheet.create((theme) => ({
    keyboardContainer: {
        flex: 1,
        backgroundColor: theme.colors.background,
    },
    scrollContent: {
        flexGrow: 1,
        paddingHorizontal: theme.spacing.lg,
        paddingTop: theme.spacing.xl,
        paddingBottom: theme.spacing.xxl + 48,
        justifyContent: 'center',
    },
    brandContainer: {
        alignItems: 'center',
        marginBottom: theme.spacing.lg,
    },
    logoContainer: {
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: theme.spacing.md,
    },
    logoImage: {
        width: 68,
        height: 68,
        borderRadius: 16,
    },
    welcomeTitle: {
        fontSize: 28,
        fontWeight: '800',
        color: theme.colors.textPrimary,
        marginBottom: theme.spacing.xs,
        textAlign: 'center',
    },
    welcomeSubtitle: {
        fontSize: 14,
        color: theme.colors.textSecondary,
        textAlign: 'center',
    },
    segmentedContainer: {
        flexDirection: 'row',
        backgroundColor: theme.colors.surfaceSubtle,
        padding: theme.spacing.xs,
        borderRadius: theme.borderRadius.lg,
        marginBottom: theme.spacing.lg,
        borderWidth: 1,
        borderColor: theme.colors.border,
    },
    segmentButton: {
        flex: 1,
        paddingVertical: theme.spacing.sm + 2,
        alignItems: 'center',
        borderRadius: theme.borderRadius.md,
    },
    segmentButtonActive: {
        backgroundColor: theme.colors.primary,
        ...theme.shadows.sm,
    },
    segmentText: {
        fontSize: 14,
        fontWeight: '600',
        color: theme.colors.textSecondary,
    },
    segmentTextActive: {
        color: '#FFFFFF',
    },
    card: {
        backgroundColor: theme.colors.surface,
        borderRadius: theme.borderRadius.lg + 4,
        padding: theme.spacing.lg,
        borderWidth: 1,
        borderColor: theme.colors.border,
        ...theme.shadows.sm,
    },
    inputWrapper: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: theme.colors.background,
        borderRadius: theme.borderRadius.md,
        paddingHorizontal: theme.spacing.md,
        minHeight: 52,
        paddingVertical: 4,
        marginBottom: theme.spacing.md,
        borderWidth: 1,
        borderColor: theme.colors.border,
    },
    inputIcon: {
        marginRight: theme.spacing.sm + 2,
    },
    input: {
        flex: 1,
        color: theme.colors.textPrimary,
        fontSize: 15,
        paddingVertical: 4,
    },
    submitButton: {
        backgroundColor: theme.colors.primary,
        minHeight: 52,
        paddingVertical: 12,
        borderRadius: theme.borderRadius.md,
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: theme.spacing.xs,
        ...theme.shadows.sm,
    },
    submitContent: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    submitText: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: '700',
        marginLeft: theme.spacing.sm,
    },
    quickAccessRow: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        marginTop: theme.spacing.lg,
        paddingTop: theme.spacing.md,
        borderTopWidth: 1,
        borderTopColor: theme.colors.border,
    },
    quickActionButton: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: theme.spacing.xs,
    },
    quickActionText: {
        color: theme.colors.primary,
        fontSize: 13,
        fontWeight: '600',
        marginLeft: theme.spacing.xs + 2,
    },
}));
