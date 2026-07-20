import React, { useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    SafeAreaView,
    StatusBar,
    Switch,
    Alert,
} from 'react-native';
import { ArrowLeft, Globe, Fingerprint, Moon, Trash2, Info } from 'lucide-react-native';
import { useAuth } from '../../context/AuthContext';

export const SettingsScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
    const { isBiometricAvailable } = useAuth();
    const [biometricsEnabled, setBiometricsEnabled] = useState(true);
    const [darkMode, setDarkMode] = useState(true);
    const [notificationsEnabled, setNotificationsEnabled] = useState(true);
    const [language, setLanguage] = useState('English');

    const handleClearCache = () => {
        Alert.alert('Clear Cache', 'Offline attendance logs and temporary cache cleared.', [
            { text: 'OK' },
        ]);
    };

    return (
        <SafeAreaView style={styles.safeArea}>
            <StatusBar barStyle="light-content" backgroundColor="#0F172A" />
            <ScrollView style={styles.container} contentContainerStyle={styles.content}>
                <View style={styles.topBar}>
                    <TouchableOpacity style={styles.iconCircle} onPress={() => navigation.goBack()}>
                        <ArrowLeft color="#F8FAFC" size={20} />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>Application Settings</Text>
                    <View style={{ width: 40 }} />
                </View>

                {/* Preference Options */}
                <Text style={styles.sectionHeader}>Security & Login</Text>
                <View style={styles.card}>
                    {isBiometricAvailable && (
                        <View style={styles.row}>
                            <View style={styles.rowInfo}>
                                <Fingerprint color="#10B981" size={20} />
                                <View>
                                    <Text style={styles.rowTitle}>Biometric Authentication</Text>
                                    <Text style={styles.rowSub}>Use Face ID / Touch ID to sign in</Text>
                                </View>
                            </View>
                            <Switch
                                value={biometricsEnabled}
                                onValueChange={setBiometricsEnabled}
                                trackColor={{ false: '#334155', true: '#2563EB' }}
                            />
                        </View>
                    )}
                </View>

                <Text style={styles.sectionHeader}>App Preferences</Text>
                <View style={styles.card}>
                    <View style={styles.row}>
                        <View style={styles.rowInfo}>
                            <Globe color="#3B82F6" size={20} />
                            <View>
                                <Text style={styles.rowTitle}>App Language</Text>
                                <Text style={styles.rowSub}>Current: {language}</Text>
                            </View>
                        </View>
                        <TouchableOpacity
                            onPress={() =>
                                setLanguage(language === 'English' ? 'Khmer (ភាសាខ្មែរ)' : 'English')
                            }
                        >
                            <Text style={styles.changeText}>Change</Text>
                        </TouchableOpacity>
                    </View>

                    <View style={styles.divider} />

                    <View style={styles.row}>
                        <View style={styles.rowInfo}>
                            <Moon color="#8B5CF6" size={20} />
                            <View>
                                <Text style={styles.rowTitle}>Dark Mode Theme</Text>
                                <Text style={styles.rowSub}>High contrast sleek theme</Text>
                            </View>
                        </View>
                        <Switch
                            value={darkMode}
                            onValueChange={setDarkMode}
                            trackColor={{ false: '#334155', true: '#2563EB' }}
                        />
                    </View>
                </View>

                <Text style={styles.sectionHeader}>Storage & System</Text>
                <View style={styles.card}>
                    <TouchableOpacity style={styles.row} onPress={handleClearCache}>
                        <View style={styles.rowInfo}>
                            <Trash2 color="#EF4444" size={20} />
                            <View>
                                <Text style={styles.rowTitle}>Clear Offline Cache</Text>
                                <Text style={styles.rowSub}>Reset offline storage data</Text>
                            </View>
                        </View>
                    </TouchableOpacity>
                </View>

                <View style={styles.footerInfo}>
                    <Info color="#64748B" size={16} />
                    <Text style={styles.footerText}>S-Cool HRMS Mobile • Version 1.0.0 (Expo SDK 57)</Text>
                </View>
            </ScrollView>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    safeArea: { flex: 1, backgroundColor: '#0F172A' },
    container: { flex: 1 },
    content: { padding: 20 },
    topBar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
    iconCircle: { width: 40, height: 40, borderRadius: 12, backgroundColor: '#1E293B', justifyContent: 'center', alignItems: 'center' },
    headerTitle: { color: '#F8FAFC', fontSize: 18, fontWeight: '700' },
    sectionHeader: { color: '#F8FAFC', fontSize: 15, fontWeight: '700', marginBottom: 10, marginTop: 8 },
    card: { backgroundColor: '#1E293B', borderRadius: 18, padding: 16, marginBottom: 20, borderWidth: 1, borderColor: '#334155' },
    row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 4 },
    rowInfo: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
    rowTitle: { color: '#F8FAFC', fontSize: 15, fontWeight: '700' },
    rowSub: { color: '#64748B', fontSize: 12, marginTop: 2 },
    changeText: { color: '#3B82F6', fontSize: 13, fontWeight: '700' },
    divider: { height: 1, backgroundColor: '#334155', marginVertical: 12 },
    footerInfo: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 6, marginTop: 24 },
    footerText: { color: '#64748B', fontSize: 12 },
});
