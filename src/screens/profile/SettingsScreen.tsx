import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    ScrollView,
    TouchableOpacity,
    SafeAreaView,
    StatusBar,
    Switch,
    Alert,
    Modal,
    TextInput,
    ActivityIndicator,
} from 'react-native';
import { StyleSheet, useUnistyles } from 'react-native-unistyles';
import * as Camera from 'expo-camera';
import * as Location from 'expo-location';
import { useAuth } from '../../context/AuthContext';
import { useAppTheme } from '../../context/ThemeContext';
import { getDeviceId } from '../../utils/device';
import { profileApi } from '../../api/profile';
import {
    ArrowLeft,
    Globe,
    Fingerprint,
    Moon,
    Sun,
    Trash2,
    Info,
    Smartphone,
    Shield,
    Camera as CameraIcon,
    MapPin,
    Send,
    MessageSquare,
    CheckCircle2,
    X,
    Star,
} from 'lucide-react-native';

export const SettingsScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
    const { isDark, toggleTheme } = useAppTheme();
    const { theme } = useUnistyles();
    const styles = stylesheet;

    const { isBiometricAvailable } = useAuth();
    const [biometricsEnabled, setBiometricsEnabled] = useState(true);
    const [language, setLanguage] = useState<'en' | 'kh'>('en');

    // Hardware Device ID
    const [deviceId, setDeviceId] = useState<string>('Loading...');

    // Permissions State
    const [cameraPermissionGranted, setCameraPermissionGranted] = useState<boolean>(false);
    const [locationPermissionGranted, setLocationPermissionGranted] = useState<boolean>(false);
    const [permissionsModalVisible, setPermissionsModalVisible] = useState<boolean>(false);

    // Feedback Modal State
    const [feedbackModalVisible, setFeedbackModalVisible] = useState<boolean>(false);
    const [feedbackCategory, setFeedbackCategory] = useState<'bug_report' | 'feature_request' | 'general'>('bug_report');
    const [feedbackRating, setFeedbackRating] = useState<number>(5);
    const [feedbackComment, setFeedbackComment] = useState<string>('');
    const [isSubmittingFeedback, setIsSubmittingFeedback] = useState<boolean>(false);

    useEffect(() => {
        initSettings();
    }, []);

    const initSettings = async () => {
        const devId = await getDeviceId();
        setDeviceId(devId);

        // Check Camera & Location permissions
        const cam = await Camera.Camera.getCameraPermissionsAsync();
        setCameraPermissionGranted(cam.granted);

        const loc = await Location.getForegroundPermissionsAsync();
        setLocationPermissionGranted(loc.granted);
    };

    const handleRequestCamera = async () => {
        const res = await Camera.Camera.requestCameraPermissionsAsync();
        setCameraPermissionGranted(res.granted);
    };

    const handleRequestLocation = async () => {
        const res = await Location.requestForegroundPermissionsAsync();
        setLocationPermissionGranted(res.granted);
    };

    const handleClearCache = () => {
        Alert.alert('Clear Offline Cache', 'All offline attendance logs and cached announcements cleared.', [
            { text: 'OK' },
        ]);
    };

    const handleSubmitFeedback = async () => {
        if (!feedbackComment.trim()) {
            Alert.alert('Required', 'Please enter your feedback comments.');
            return;
        }

        setIsSubmittingFeedback(true);
        try {
            await profileApi.submitFeedback({
                category: feedbackCategory,
                rating: feedbackRating,
                comment: feedbackComment,
            });
            Alert.alert('Feedback Received', 'Thank you! Your feedback has been sent to our development team.');
            setFeedbackModalVisible(false);
            setFeedbackComment('');
        } catch (err: any) {
            Alert.alert('Error', err?.message || 'Failed to submit feedback.');
        } finally {
            setIsSubmittingFeedback(false);
        }
    };

    return (
        <SafeAreaView style={styles.safeArea}>
            <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />

            {/* Navigation Header */}
            <View style={styles.topBar}>
                <TouchableOpacity style={styles.iconCircle} onPress={() => navigation.goBack()} activeOpacity={0.7}>
                    <ArrowLeft color={theme.colors.textPrimary} size={20} />
                </TouchableOpacity>

                <Text style={styles.headerTitle}>App Settings</Text>

                <View style={{ width: 40 }} />
            </View>

            <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
                {/* Security & Hardware Device Section */}
                <Text style={styles.sectionHeaderTitle}>Security & Hardware Device</Text>
                <View style={styles.card}>
                    <View style={styles.row}>
                        <View style={styles.rowInfo}>
                            <Smartphone color={theme.colors.primary} size={20} />
                            <View style={styles.textFlex}>
                                <Text style={styles.rowTitle}>Registered Hardware Device</Text>
                                <Text style={styles.rowSub} numberOfLines={1}>
                                    ID: {deviceId}
                                </Text>
                            </View>
                        </View>
                        <View style={styles.boundBadge}>
                            <CheckCircle2 color={theme.colors.status.success} size={12} />
                            <Text style={styles.boundBadgeText}>BOUND</Text>
                        </View>
                    </View>

                    {isBiometricAvailable && (
                        <>
                            <View style={styles.divider} />
                            <View style={styles.row}>
                                <View style={styles.rowInfo}>
                                    <Fingerprint color={theme.colors.status.success} size={20} />
                                    <View style={styles.textFlex}>
                                        <Text style={styles.rowTitle}>Biometric Lock</Text>
                                        <Text style={styles.rowSub}>Sign in via Face ID / Touch ID</Text>
                                    </View>
                                </View>
                                <Switch
                                    value={biometricsEnabled}
                                    onValueChange={setBiometricsEnabled}
                                    trackColor={{ false: theme.colors.border, true: theme.colors.primary }}
                                />
                            </View>
                        </>
                    )}
                </View>

                {/* Appearance & Language Section */}
                <Text style={styles.sectionHeaderTitle}>Appearance & Preferences</Text>
                <View style={styles.card}>
                    <View style={styles.row}>
                        <View style={styles.rowInfo}>
                            {isDark ? <Moon color="#8B5CF6" size={20} /> : <Sun color="#F59E0B" size={20} />}
                            <View style={styles.textFlex}>
                                <Text style={styles.rowTitle}>Dark Mode Theme</Text>
                                <Text style={styles.rowSub}>High-contrast dark UI theme</Text>
                            </View>
                        </View>
                        <Switch
                            value={isDark}
                            onValueChange={toggleTheme}
                            trackColor={{ false: theme.colors.border, true: theme.colors.primary }}
                        />
                    </View>

                    <View style={styles.divider} />

                    <View style={styles.row}>
                        <View style={styles.rowInfo}>
                            <Globe color={theme.colors.primary} size={20} />
                            <View style={styles.textFlex}>
                                <Text style={styles.rowTitle}>App Language</Text>
                                <Text style={styles.rowSub}>
                                    Current: {language === 'en' ? 'English' : 'Khmer (ភាសាខ្មែរ)'}
                                </Text>
                            </View>
                        </View>
                        <TouchableOpacity
                            onPress={() => setLanguage(language === 'en' ? 'kh' : 'en')}
                            style={styles.langBtn}
                        >
                            <Text style={styles.langBtnText}>
                                {language === 'en' ? 'Switch to ខ្មែរ' : 'Switch to EN'}
                            </Text>
                        </TouchableOpacity>
                    </View>
                </View>

                {/* System Access & Feedback Section */}
                <Text style={styles.sectionHeaderTitle}>System & Diagnostics</Text>
                <View style={styles.card}>
                    <TouchableOpacity
                        style={styles.row}
                        onPress={() => setPermissionsModalVisible(true)}
                        activeOpacity={0.8}
                    >
                        <View style={styles.rowInfo}>
                            <Shield color={theme.colors.primary} size={20} />
                            <View style={styles.textFlex}>
                                <Text style={styles.rowTitle}>System Permissions Access</Text>
                                <Text style={styles.rowSub}>Manage Camera, GPS Location & Telegram Link</Text>
                            </View>
                        </View>
                    </TouchableOpacity>

                    <View style={styles.divider} />

                    <TouchableOpacity
                        style={styles.row}
                        onPress={() => setFeedbackModalVisible(true)}
                        activeOpacity={0.8}
                    >
                        <View style={styles.rowInfo}>
                            <MessageSquare color={theme.colors.status.success} size={20} />
                            <View style={styles.textFlex}>
                                <Text style={styles.rowTitle}>In-App Feedback & Bug Reports</Text>
                                <Text style={styles.rowSub}>Send app suggestions to development team</Text>
                            </View>
                        </View>
                    </TouchableOpacity>

                    <View style={styles.divider} />

                    <TouchableOpacity style={styles.row} onPress={handleClearCache} activeOpacity={0.8}>
                        <View style={styles.rowInfo}>
                            <Trash2 color={theme.colors.status.danger} size={20} />
                            <View style={styles.textFlex}>
                                <Text style={styles.rowTitle}>Clear Offline Storage</Text>
                                <Text style={styles.rowSub}>Purge local cache and temporary files</Text>
                            </View>
                        </View>
                    </TouchableOpacity>
                </View>

                {/* App Version Footer */}
                <View style={styles.footerInfo}>
                    <Info color={theme.colors.textSecondary} size={16} />
                    <Text style={styles.footerText}>S-Cool HRMS Mobile • Version 2.4.0 (Expo SDK 52 Unistyles v3)</Text>
                </View>
            </ScrollView>

            {/* System Permissions Sheet Modal */}
            <Modal visible={permissionsModalVisible} transparent animationType="fade">
                <TouchableOpacity
                    style={styles.modalOverlay}
                    activeOpacity={1}
                    onPress={() => setPermissionsModalVisible(false)}
                >
                    <View style={styles.modalSheet}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>System Permissions</Text>
                            <TouchableOpacity onPress={() => setPermissionsModalVisible(false)}>
                                <X color={theme.colors.textPrimary} size={20} />
                            </TouchableOpacity>
                        </View>

                        {/* Camera Permission */}
                        <View style={styles.permRow}>
                            <View style={styles.rowInfo}>
                                <CameraIcon color={theme.colors.primary} size={20} />
                                <View style={styles.textFlex}>
                                    <Text style={styles.permTitle}>Camera Access</Text>
                                    <Text style={styles.permSub}>Required for QR attendance clock-in & photos</Text>
                                </View>
                            </View>
                            <TouchableOpacity style={styles.permActionBtn} onPress={handleRequestCamera}>
                                <Text style={styles.permActionText}>
                                    {cameraPermissionGranted ? 'Granted' : 'Grant'}
                                </Text>
                            </TouchableOpacity>
                        </View>

                        {/* GPS Location Permission */}
                        <View style={styles.permRow}>
                            <View style={styles.rowInfo}>
                                <MapPin color={theme.colors.status.warning} size={20} />
                                <View style={styles.textFlex}>
                                    <Text style={styles.permTitle}>GPS Geofence Location</Text>
                                    <Text style={styles.permSub}>Required to verify branch clock-in radius</Text>
                                </View>
                            </View>
                            <TouchableOpacity style={styles.permActionBtn} onPress={handleRequestLocation}>
                                <Text style={styles.permActionText}>
                                    {locationPermissionGranted ? 'Granted' : 'Grant'}
                                </Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </TouchableOpacity>
            </Modal>

            {/* In-App Feedback Drawer Modal */}
            <Modal visible={feedbackModalVisible} transparent animationType="fade">
                <TouchableOpacity
                    style={styles.modalOverlay}
                    activeOpacity={1}
                    onPress={() => setFeedbackModalVisible(false)}
                >
                    <View style={styles.modalSheet}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>In-App Feedback</Text>
                            <TouchableOpacity onPress={() => setFeedbackModalVisible(false)}>
                                <X color={theme.colors.textPrimary} size={20} />
                            </TouchableOpacity>
                        </View>

                        {/* Category Buttons */}
                        <Text style={styles.modalLabel}>Category</Text>
                        <View style={styles.categoryRow}>
                            {(['bug_report', 'feature_request', 'general'] as const).map((cat) => (
                                <TouchableOpacity
                                    key={cat}
                                    style={[
                                        styles.categoryBtn,
                                        feedbackCategory === cat && styles.categoryBtnSelected,
                                    ]}
                                    onPress={() => setFeedbackCategory(cat)}
                                >
                                    <Text
                                        style={[
                                            styles.categoryBtnText,
                                            feedbackCategory === cat && styles.categoryBtnTextSelected,
                                        ]}
                                    >
                                        {cat.replace('_', ' ').toUpperCase()}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </View>

                        {/* Star Rating */}
                        <Text style={styles.modalLabel}>Rating</Text>
                        <View style={styles.starsRow}>
                            {[1, 2, 3, 4, 5].map((star) => (
                                <TouchableOpacity key={star} onPress={() => setFeedbackRating(star)}>
                                    <Star
                                        color="#F59E0B"
                                        fill={star <= feedbackRating ? '#F59E0B' : 'transparent'}
                                        size={24}
                                    />
                                </TouchableOpacity>
                            ))}
                        </View>

                        {/* Comment Input */}
                        <Text style={styles.modalLabel}>Comments / Details</Text>
                        <TextInput
                            style={styles.textArea}
                            value={feedbackComment}
                            onChangeText={setFeedbackComment}
                            placeholder="Share your app feedback or report issues..."
                            placeholderTextColor={theme.colors.textSecondary}
                            multiline
                            numberOfLines={4}
                        />

                        <TouchableOpacity
                            style={styles.submitBtn}
                            onPress={handleSubmitFeedback}
                            disabled={isSubmittingFeedback}
                        >
                            {isSubmittingFeedback ? (
                                <ActivityIndicator color="#FFFFFF" />
                            ) : (
                                <Text style={styles.submitBtnText}>Submit Feedback</Text>
                            )}
                        </TouchableOpacity>
                    </View>
                </TouchableOpacity>
            </Modal>
        </SafeAreaView>
    );
};

const stylesheet = StyleSheet.create((theme) => ({
    safeArea: {
        flex: 1,
        backgroundColor: theme.colors.background,
    },
    topBar: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: theme.spacing.md + 4,
        paddingVertical: theme.spacing.md,
    },
    iconCircle: {
        width: 40,
        height: 40,
        borderRadius: theme.borderRadius.md,
        backgroundColor: theme.colors.surfaceSubtle,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: theme.colors.border,
    },
    headerTitle: {
        color: theme.colors.textPrimary,
        fontSize: 18,
        fontWeight: '700',
    },
    container: {
        flex: 1,
    },
    scrollContent: {
        paddingHorizontal: theme.spacing.md + 4,
        paddingBottom: theme.spacing.xl,
    },
    sectionHeaderTitle: {
        fontSize: 15,
        fontWeight: '700',
        color: theme.colors.textPrimary,
        marginBottom: theme.spacing.sm,
        marginTop: theme.spacing.xs,
    },
    card: {
        backgroundColor: theme.colors.surface,
        borderRadius: theme.borderRadius.lg,
        padding: theme.spacing.md,
        marginBottom: theme.spacing.lg,
        borderWidth: 1,
        borderColor: theme.colors.border,
        ...theme.shadows.sm,
    },
    row: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: theme.spacing.xs + 2,
    },
    rowInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
        marginRight: theme.spacing.sm,
    },
    textFlex: {
        flex: 1,
        marginLeft: theme.spacing.md,
    },
    rowTitle: {
        fontSize: 14,
        fontWeight: '700',
        color: theme.colors.textPrimary,
    },
    rowSub: {
        fontSize: 11,
        color: theme.colors.textSecondary,
        marginTop: 2,
    },
    boundBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(16, 185, 129, 0.1)',
        paddingHorizontal: theme.spacing.sm,
        paddingVertical: 2,
        borderRadius: theme.borderRadius.full,
    },
    boundBadgeText: {
        fontSize: 10,
        fontWeight: '800',
        color: theme.colors.status.success,
        marginLeft: 4,
    },
    langBtn: {
        backgroundColor: 'rgba(37, 99, 235, 0.1)',
        paddingHorizontal: theme.spacing.sm + 4,
        paddingVertical: theme.spacing.xs + 2,
        borderRadius: theme.borderRadius.md,
    },
    langBtnText: {
        fontSize: 12,
        fontWeight: '700',
        color: theme.colors.primary,
    },
    divider: {
        height: 1,
        backgroundColor: theme.colors.border,
        marginVertical: theme.spacing.xs + 2,
    },
    footerInfo: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        gap: theme.spacing.xs,
        marginTop: theme.spacing.md,
    },
    footerText: {
        fontSize: 11,
        color: theme.colors.textSecondary,
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'flex-end',
    },
    modalSheet: {
        backgroundColor: theme.colors.surface,
        borderTopLeftRadius: theme.borderRadius.lg + 4,
        borderTopRightRadius: theme.borderRadius.lg + 4,
        padding: theme.spacing.lg,
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: theme.spacing.md,
    },
    modalTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: theme.colors.textPrimary,
    },
    permRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: theme.spacing.md,
        borderBottomWidth: 1,
        borderBottomColor: theme.colors.border,
    },
    permTitle: {
        fontSize: 14,
        fontWeight: '700',
        color: theme.colors.textPrimary,
    },
    permSub: {
        fontSize: 11,
        color: theme.colors.textSecondary,
        marginTop: 2,
    },
    permActionBtn: {
        backgroundColor: 'rgba(37, 99, 235, 0.1)',
        paddingHorizontal: theme.spacing.md,
        paddingVertical: theme.spacing.xs + 2,
        borderRadius: theme.borderRadius.md,
    },
    permActionText: {
        fontSize: 12,
        fontWeight: '700',
        color: theme.colors.primary,
    },
    modalLabel: {
        fontSize: 12,
        fontWeight: '700',
        color: theme.colors.textSecondary,
        textTransform: 'uppercase',
        marginBottom: theme.spacing.xs,
        marginTop: theme.spacing.sm,
    },
    categoryRow: {
        flexDirection: 'row',
        gap: theme.spacing.xs + 2,
        marginBottom: theme.spacing.sm,
    },
    categoryBtn: {
        flex: 1,
        paddingVertical: theme.spacing.xs + 2,
        alignItems: 'center',
        backgroundColor: theme.colors.surfaceSubtle,
        borderRadius: theme.borderRadius.md,
        borderWidth: 1,
        borderColor: theme.colors.border,
    },
    categoryBtnSelected: {
        backgroundColor: theme.colors.primary,
        borderColor: theme.colors.primary,
    },
    categoryBtnText: {
        fontSize: 10,
        fontWeight: '700',
        color: theme.colors.textSecondary,
    },
    categoryBtnTextSelected: {
        color: '#FFFFFF',
    },
    starsRow: {
        flexDirection: 'row',
        gap: theme.spacing.sm,
        marginBottom: theme.spacing.sm,
    },
    textArea: {
        backgroundColor: theme.colors.surfaceSubtle,
        borderRadius: theme.borderRadius.md,
        borderWidth: 1,
        borderColor: theme.colors.border,
        color: theme.colors.textPrimary,
        padding: theme.spacing.md,
        height: 90,
        textAlignVertical: 'top',
        marginBottom: theme.spacing.lg,
    },
    submitBtn: {
        backgroundColor: theme.colors.primary,
        height: 48,
        borderRadius: theme.borderRadius.md,
        justifyContent: 'center',
        alignItems: 'center',
        ...theme.shadows.sm,
    },
    submitBtnText: {
        color: '#FFFFFF',
        fontWeight: '700',
        fontSize: 15,
    },
}));
