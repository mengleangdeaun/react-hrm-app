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
import { useAuth } from '../../context/AuthContext';
import { useAppTheme } from '../../context/ThemeContext';
import { Lock, Mail, QrCode, Fingerprint, LogIn, Moon, Sun } from 'lucide-react-native';

export const LoginScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
    const { login, loginWithBiometrics, isBiometricAvailable, isLoading } = useAuth();
    const { isDark, toggleTheme } = useAppTheme();
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

    const iconColor = isDark ? '#94A3B8' : '#64748B';
    const placeholderColor = isDark ? '#64748B' : '#94A3B8';

    return (
        <KeyboardAvoidingView
            className="flex-1 bg-slate-50 dark:bg-slate-950"
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
            <ScrollView contentContainerStyle={{ flexGrow: 1 }} className="px-6 py-10 justify-center">
                {/* Theme Switcher Header Button */}
                <View className="flex-row justify-end mb-4">
                    <TouchableOpacity
                        onPress={toggleTheme}
                        className="p-3 bg-slate-200 dark:bg-slate-800 rounded-full border border-slate-300 dark:border-slate-700 active:opacity-70"
                    >
                        {isDark ? <Sun color="#F59E0B" size={20} /> : <Moon color="#2563EB" size={20} />}
                    </TouchableOpacity>
                </View>

                {/* Branding Header */}
                <View className="items-center mb-8">
                    <View className="w-20 h-20 bg-blue-600 rounded-3xl justify-center items-center mb-4 shadow-lg shadow-blue-500/40">
                        <Text className="text-white font-black text-2xl tracking-widest">HRMS</Text>
                    </View>
                    <Text className="text-3xl font-extrabold text-slate-900 dark:text-slate-100 mb-2 text-center">
                        Welcome Back
                    </Text>
                    <Text className="text-base text-slate-500 dark:text-slate-400 text-center">
                        Employee Self-Service Portal
                    </Text>
                </View>

                {/* Login Mode Segmented Toggle */}
                <View className="flex-row bg-slate-200/80 dark:bg-slate-900 p-1.5 rounded-2xl mb-6 border border-slate-300/80 dark:border-slate-800">
                    <TouchableOpacity
                        className={`flex-1 py-3 items-center rounded-xl transition-all ${
                            loginMode === 'password' ? 'bg-blue-600 shadow-md' : 'bg-transparent'
                        }`}
                        onPress={() => setLoginMode('password')}
                    >
                        <Text
                            className={`font-semibold text-sm ${
                                loginMode === 'password' ? 'text-white' : 'text-slate-600 dark:text-slate-400'
                            }`}
                        >
                            Password
                        </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        className={`flex-1 py-3 items-center rounded-xl transition-all ${
                            loginMode === 'pin' ? 'bg-blue-600 shadow-md' : 'bg-transparent'
                        }`}
                        onPress={() => setLoginMode('pin')}
                    >
                        <Text
                            className={`font-semibold text-sm ${
                                loginMode === 'pin' ? 'text-white' : 'text-slate-600 dark:text-slate-400'
                            }`}
                        >
                            4-Digit PIN
                        </Text>
                    </TouchableOpacity>
                </View>

                {/* Form Fields Card */}
                <View className="bg-white dark:bg-slate-900/90 rounded-3xl p-6 border border-slate-200 dark:border-slate-800 shadow-xl dark:shadow-2xl">
                    {loginMode === 'password' ? (
                        <>
                            <View className="flex-row items-center bg-slate-100/80 dark:bg-slate-950 rounded-xl px-4 mb-4 border border-slate-200 dark:border-slate-800 h-14">
                                <Mail color={iconColor} size={20} className="mr-3" />
                                <TextInput
                                    className="flex-1 text-slate-900 dark:text-slate-100 text-base"
                                    placeholder="Employee Email"
                                    placeholderTextColor={placeholderColor}
                                    value={email}
                                    onChangeText={setEmail}
                                    keyboardType="email-address"
                                    autoCapitalize="none"
                                />
                            </View>

                            <View className="flex-row items-center bg-slate-100/80 dark:bg-slate-950 rounded-xl px-4 mb-4 border border-slate-200 dark:border-slate-800 h-14">
                                <Lock color={iconColor} size={20} className="mr-3" />
                                <TextInput
                                    className="flex-1 text-slate-900 dark:text-slate-100 text-base"
                                    placeholder="Password"
                                    placeholderTextColor={placeholderColor}
                                    value={password}
                                    onChangeText={setPassword}
                                    secureTextEntry
                                />
                            </View>
                        </>
                    ) : (
                        <View className="flex-row items-center bg-slate-100/80 dark:bg-slate-950 rounded-xl px-4 mb-4 border border-slate-200 dark:border-slate-800 h-14">
                            <Lock color={iconColor} size={20} className="mr-3" />
                            <TextInput
                                className="flex-1 text-slate-900 dark:text-slate-100 text-base"
                                placeholder="Enter 4-Digit Security PIN"
                                placeholderTextColor={placeholderColor}
                                value={pin}
                                onChangeText={setPin}
                                keyboardType="number-pad"
                                maxLength={4}
                                secureTextEntry
                            />
                        </View>
                    )}

                    {/* Primary Login Button */}
                    <TouchableOpacity
                        className="bg-blue-600 hover:bg-blue-700 h-14 rounded-xl justify-center items-center mt-2 shadow-lg shadow-blue-500/30 active:opacity-90"
                        onPress={handleLogin}
                        disabled={isLoading}
                    >
                        {isLoading ? (
                            <ActivityIndicator color="#FFFFFF" />
                        ) : (
                            <View className="flex-row items-center space-x-2">
                                <LogIn color="#FFFFFF" size={20} />
                                <Text className="text-white text-base font-bold ml-2">Sign In</Text>
                            </View>
                        )}
                    </TouchableOpacity>

                    {/* Quick Access Actions Footer */}
                    <View className="flex-row justify-around mt-6 pt-5 border-t border-slate-200 dark:border-slate-800">
                        <TouchableOpacity
                            className="flex-row items-center space-x-2 p-2 active:opacity-70"
                            onPress={() => navigation.navigate('QrLogin')}
                        >
                            <QrCode color={isDark ? '#38BDF8' : '#2563EB'} size={22} />
                            <Text className="text-blue-600 dark:text-sky-400 font-semibold text-xs ml-1.5">QR Login</Text>
                        </TouchableOpacity>

                        {isBiometricAvailable && (
                            <TouchableOpacity
                                className="flex-row items-center space-x-2 p-2 active:opacity-70"
                                onPress={handleBiometricAuth}
                            >
                                <Fingerprint color="#10B981" size={22} />
                                <Text className="text-emerald-600 dark:text-emerald-400 font-semibold text-xs ml-1.5">Biometric Auth</Text>
                            </TouchableOpacity>
                        )}
                    </View>
                </View>
            </ScrollView>
        </KeyboardAvoidingView>
    );
};
