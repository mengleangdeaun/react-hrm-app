import React, { useState } from 'react';
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    ActivityIndicator,
    Alert,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
} from 'react-native';
import { createStyleSheet, useStyles } from 'react-native-unistyles';
import { useAuth } from '../../context/AuthContext';
import { useAppTheme } from '../../context/ThemeContext';
import { Lock, Mail, QrCode, Fingerprint, LogIn, Moon, Sun } from 'lucide-react-native';

export const LoginScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
    const { login, loginWithBiometrics, isBiometricAvailable, isLoading } = useAuth();
    const { isDark, toggleTheme } = useAppTheme();
    const { styles, theme } = useStyles(stylesheet);

    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loginMode, setLoginMode] = useState<'password' | 'pin'>('password');
    const [pin, setPin] = useState('');

    const handleLogin = async () => {
        if (loginMode === 'password' && (!email || !password)) {
            Alert.alert('Required', 'Please enter both email and password');
            return;
        }
        if (loginMode === 'pin' && pin.length < 4) {
            Alert.alert('Required', 'Please enter your 4-digit PIN');
            return;
        }

        try {
            if (loginMode === 'password') {
                await login({ email, password });
            } else {
                await login({ pin });
            }
        } catch (error: any) {
            Alert.alert('Login Failed', error?.message || 'Invalid credentials. Please try again.');
        }
    };

    const handleBiometricAuth = async () => {
        const success = await loginWithBiometrics();
        if (!success) {
            Alert.alert('Biometric Login', 'Biometric authentication failed or credentials not saved.');
        }
    };

    return (
        <KeyboardAvoidingView
            style={styles.keyboardContainer}
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
            <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
                {/* Header Actions */}
                <View style={styles.headerRow}>
                    <TouchableOpacity
                        onPress={toggleTheme}
                        style={styles.themeIconButton}
                        activeOpacity={0.7}
                    >
                        {isDark ? <Sun color="#F59E0B" size={20} /> : <Moon color="#2563EB" size={20} />}
                    </TouchableOpacity>
                </View>

                {/* Hero / Branding Section */}
                <View style={styles.brandContainer}>
                    <View style={styles.logoBadge}>
                        <Text style={styles.logoText}>HRMS</Text>
                    </View>
                    <Text style={styles.welcomeTitle}>Welcome Back</Text>
                    <Text style={styles.welcomeSubtitle}>Employee Self-Service Portal</Text>
                </View>

                {/* Login Mode Segmented Control */}
                <View style={styles.segmentedContainer}>
                    <TouchableOpacity
                        style={[styles.segmentButton, loginMode === 'password' && styles.segmentButtonActive]}
                        onPress={() => setLoginMode('password')}
                        activeOpacity={0.8}
                    >
                        <Text style={[styles.segmentText, loginMode === 'password' && styles.segmentTextActive]}>
                            Password
                        </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={[styles.segmentButton, loginMode === 'pin' && styles.segmentButtonActive]}
                        onPress={() => setLoginMode('pin')}
                        activeOpacity={0.8}
                    >
                        <Text style={[styles.segmentText, loginMode === 'pin' && styles.segmentTextActive]}>
                            4-Digit PIN
                        </Text>
                    </TouchableOpacity>
                </View>

                {/* Login Form Card */}
                <View style={styles.card}>
                    {loginMode === 'password' ? (
                        <>
                            <View style={styles.inputWrapper}>
                                <Mail color={theme.colors.textMuted} size={20} style={styles.inputIcon} />
                                <TextInput
                                    style={styles.input}
                                    placeholder="Employee Email"
                                    placeholderTextColor={theme.colors.textMuted}
                                    value={email}
                                    onChangeText={setEmail}
                                    keyboardType="email-address"
                                    autoCapitalize="none"
                                />
                            </View>

                            <View style={styles.inputWrapper}>
                                <Lock color={theme.colors.textMuted} size={20} style={styles.inputIcon} />
                                <TextInput
                                    style={styles.input}
                                    placeholder="Password"
                                    placeholderTextColor={theme.colors.textMuted}
                                    value={password}
                                    onChangeText={setPassword}
                                    secureTextEntry
                                />
                            </View>
                        </>
                    ) : (
                        <View style={styles.inputWrapper}>
                            <Lock color={theme.colors.textMuted} size={20} style={styles.inputIcon} />
                            <TextInput
                                style={styles.input}
                                placeholder="Enter 4-Digit Security PIN"
                                placeholderTextColor={theme.colors.textMuted}
                                value={pin}
                                onChangeText={setPin}
                                keyboardType="number-pad"
                                maxLength={4}
                                secureTextEntry
                            />
                        </View>
                    )}

                    {/* Submit Button */}
                    <TouchableOpacity
                        style={styles.submitButton}
                        onPress={handleLogin}
                        disabled={isLoading}
                        activeOpacity={0.85}
                    >
                        {isLoading ? (
                            <ActivityIndicator color="#FFFFFF" />
                        ) : (
                            <View style={styles.submitContent}>
                                <LogIn color="#FFFFFF" size={20} />
                                <Text style={styles.submitText}>Sign In</Text>
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
                            <Text style={styles.quickActionText}>QR Code Login</Text>
                        </TouchableOpacity>

                        {isBiometricAvailable && (
                            <TouchableOpacity
                                style={styles.quickActionButton}
                                onPress={handleBiometricAuth}
                                activeOpacity={0.7}
                            >
                                <Fingerprint color={theme.colors.success} size={20} />
                                <Text style={[styles.quickActionText, { color: theme.colors.success }]}>
                                    Biometrics
                                </Text>
                            </TouchableOpacity>
                        )}
                    </View>
                </View>
            </ScrollView>
        </KeyboardAvoidingView>
    );
};

const stylesheet = createStyleSheet((theme) => ({
    keyboardContainer: {
        flex: 1,
        backgroundColor: theme.colors.background,
    },
    scrollContent: {
        flexGrow: 1,
        paddingHorizontal: theme.spacing.lg,
        paddingVertical: theme.spacing.xl,
        justifyContent: 'center',
    },
    headerRow: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
        marginBottom: theme.spacing.md,
    },
    themeIconButton: {
        padding: theme.spacing.sm + 4,
        backgroundColor: theme.colors.surfaceSecondary,
        borderRadius: theme.borderRadius.full,
        borderWidth: 1,
        borderColor: theme.colors.border,
    },
    brandContainer: {
        alignItems: 'center',
        marginBottom: theme.spacing.lg,
    },
    logoBadge: {
        width: 76,
        height: 76,
        backgroundColor: theme.colors.primary,
        borderRadius: theme.borderRadius.lg + 4,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: theme.spacing.md,
        ...theme.shadows.md,
    },
    logoText: {
        color: '#FFFFFF',
        fontWeight: '900',
        fontSize: 22,
        letterSpacing: 2,
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
        backgroundColor: theme.colors.surfaceSecondary,
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
        ...theme.shadows.md,
    },
    inputWrapper: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: theme.colors.background,
        borderRadius: theme.borderRadius.md,
        paddingHorizontal: theme.spacing.md,
        height: 52,
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
    },
    submitButton: {
        backgroundColor: theme.colors.primary,
        height: 52,
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
