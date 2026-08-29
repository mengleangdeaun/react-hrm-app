import React, { useState, useEffect } from 'react';
import {
    View,
    ScrollView,
    TouchableOpacity,
    StatusBar,
    Switch,
    Alert,
    Modal,
    RefreshControl,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StyleSheet, useUnistyles } from 'react-native-unistyles';
import * as Camera from 'expo-camera';
import * as Location from 'expo-location';
import * as Notifications from 'expo-notifications';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../../context/AuthContext';
import { useAppTheme, FontSizeScaleId } from '../../context/ThemeContext';
import { useTranslation } from '../../context/LanguageContext';
import { getDeviceId } from '../../utils/device';
import { profileApi, UserPreferences, PwaInfo } from '../../api/profile';
import { AppText as Text } from '../../components/AppText';
import { AppFeedbackSheet } from '../../components/AppFeedbackSheet';
import { LegalDocumentSheet } from '../../components/common/LegalDocumentSheet';
import { AppShell } from '../../components/common/AppShell';
import { AppHeader } from '../../components/common/AppHeader';
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
    MessageSquare,
    CheckCircle2,
    X,
    Bell,
    Type,
    FileText,
    Lock,
    Sparkles,
} from 'lucide-react-native';

const FONT_SIZES = [
    { id: 'small', labelKey: 'small', fallback: 'Small' },
    { id: 'medium', labelKey: 'medium', fallback: 'Medium' },
    { id: 'large', labelKey: 'large', fallback: 'Large' },
] as const;

export const SettingsScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
    const insets = useSafeAreaInsets();
    const { isDark, toggleTheme, primaryColor, setFontScale, fontSizeId } = useAppTheme();
    const { locale, setLocale, t } = useTranslation();
    const { theme } = useUnistyles();
    const styles = stylesheet;
    const queryClient = useQueryClient();

    const { isBiometricAvailable } = useAuth();
    const [biometricsEnabled, setBiometricsEnabled] = useState(true);
    const [deviceId, setDeviceId] = useState<string>('Loading...');

    // Permissions State
    const [cameraPermissionGranted, setCameraPermissionGranted] = useState<boolean>(false);
    const [locationPermissionGranted, setLocationPermissionGranted] = useState<boolean>(false);
    const [notificationsPermissionGranted, setNotificationsPermissionGranted] = useState<boolean>(false);
    const [permissionsModalVisible, setPermissionsModalVisible] = useState<boolean>(false);

    // Legal Modals State
    const [policyModalVisible, setPolicyModalVisible] = useState<boolean>(false);
    const [termsModalVisible, setTermsModalVisible] = useState<boolean>(false);

    // Feedback Sheet State
    const [feedbackModalVisible, setFeedbackModalVisible] = useState<boolean>(false);

    // React Query: Fetch Preferences
    const { data: prefs, isFetching: isFetchingPrefs } = useQuery<UserPreferences>({
        queryKey: ['userPreferences'],
        queryFn: async () => {
            const res = await profileApi.getPreferences();
            return res?.data || res;
        },
        staleTime: 1000 * 60 * 10,
    });

    // React Query: Fetch PWA Info (App Version, Privacy Policy, Terms)
    const { data: pwaInfo } = useQuery<PwaInfo>({
        queryKey: ['pwaInfo'],
        queryFn: async () => {
            const res = await profileApi.getPwaInfo();
            return res?.data || res;
        },
        staleTime: 1000 * 60 * 30,
    });

    // Update Preferences Mutation
    const updatePrefMutation = useMutation({
        mutationFn: (newPrefs: Partial<UserPreferences>) =>
            profileApi.updatePreferences({ ...(prefs || {}), ...newPrefs }),
        onMutate: async (newPrefs) => {
            await queryClient.cancelQueries({ queryKey: ['userPreferences'] });
            const previousPrefs = queryClient.getQueryData<UserPreferences>(['userPreferences']);
            queryClient.setQueryData(['userPreferences'], (old: any) => ({
                ...(old || {}),
                ...newPrefs,
            }));
            return { previousPrefs };
        },
        onError: (_err, _newPrefs, context) => {
            if (context?.previousPrefs) {
                queryClient.setQueryData(['userPreferences'], context.previousPrefs);
            }
            Alert.alert(t('error', 'Error'), t('sync_failed', 'Failed to sync preferences. Please try again.'));
        },
        onSettled: () => {
            queryClient.invalidateQueries({ queryKey: ['userPreferences'] });
        },
    });

    useEffect(() => {
        initSettings();
    }, []);

    // Sync initial preferences from server when fetched
    useEffect(() => {
        if (prefs) {
            if (prefs.locale && (prefs.locale === 'en' || prefs.locale === 'kh') && prefs.locale !== locale) {
                setLocale(prefs.locale as any);
            }
            if (prefs.font_size && prefs.font_size !== fontSizeId) {
                setFontScale(prefs.font_size as FontSizeScaleId);
            }
        }
    }, [prefs]);

    const initSettings = async () => {
        const devId = await getDeviceId();
        setDeviceId(devId);

        // Check Permissions
        const cam = await Camera.Camera.getCameraPermissionsAsync();
        setCameraPermissionGranted(cam.granted);

        const loc = await Location.getForegroundPermissionsAsync();
        setLocationPermissionGranted(loc.granted);

        const notif = await Notifications.getPermissionsAsync();
        setNotificationsPermissionGranted(notif.granted);
    };

    const handleToggleDarkMode = (val: boolean) => {
        if (val !== isDark) {
            toggleTheme();
        }
        updatePrefMutation.mutate({ dark_mode: val });
    };

    const handleSelectLanguage = (lang: 'en' | 'kh') => {
        setLocale(lang);
        updatePrefMutation.mutate({ locale: lang, language: lang });
    };

    const handleSelectFontSize = (size: FontSizeScaleId) => {
        setFontScale(size);
        updatePrefMutation.mutate({ font_size: size });
    };

    const handleToggleNotifications = async (val: boolean) => {
        if (val) {
            const res = await Notifications.requestPermissionsAsync();
            setNotificationsPermissionGranted(res.granted);
        }
        updatePrefMutation.mutate({ notifications_enabled: val });
    };

    const handleRequestCamera = async () => {
        const res = await Camera.Camera.requestCameraPermissionsAsync();
        setCameraPermissionGranted(res.granted);
        updatePrefMutation.mutate({ camera_enabled: res.granted });
    };

    const handleRequestLocation = async () => {
        const res = await Location.requestForegroundPermissionsAsync();
        setLocationPermissionGranted(res.granted);
        updatePrefMutation.mutate({ location_enabled: res.granted });
    };

    const handleRequestNotifications = async () => {
        const res = await Notifications.requestPermissionsAsync();
        setNotificationsPermissionGranted(res.granted);
        updatePrefMutation.mutate({ notifications_enabled: res.granted });
    };

    const handleClearStorageCache = () => {
        Alert.alert(
            t('clear_cache_title', 'Clear Offline Cache'),
            t('clear_cache_desc', 'This will clear cached attendance records, query caches, and local images. You will stay logged in.'),
            [
                {
                    text: t('clear', 'Clear Now'),
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            await queryClient.clear();
                            Alert.alert(t('cleared', 'Cache Cleared'), t('cache_cleared_msg', 'Application storage cache has been wiped successfully.'));
                        } catch (err) {
                            console.warn('Failed to clear offline cache:', err);
                        }
                    },
                },
                { text: t('cancel', 'Cancel'), style: 'cancel' },
            ]
        );
    };

    const handleClearCache = handleClearStorageCache;

    const currentLanguage = locale;
    const currentFontSize = fontSizeId;
    const isDarkModeActive = prefs?.dark_mode !== undefined ? prefs.dark_mode : isDark;

    return (
        <AppShell
            title={t('settings', 'App Settings')}
            onBack={() => navigation.goBack()}
            refreshing={isFetchingPrefs}
            onRefresh={() => queryClient.invalidateQueries({ queryKey: ['userPreferences'] })}
        >
                {/* 1. Appearance & Customization Section */}
                <Text style={styles.sectionHeaderTitle}>{t('appearance_theme', 'Appearance & Theme')}</Text>
                <View style={styles.card}>
                    {/* Dark Mode */}
                    <View style={styles.row}>
                        <View style={styles.rowInfo}>
                            <View style={styles.iconBox}>
                                {isDark ? (
                                    <Moon color={theme.colors.textSecondary} size={18} />
                                ) : (
                                    <Sun color={theme.colors.textSecondary} size={18} />
                                )}
                            </View>
                            <View style={styles.textFlex}>
                                <Text style={styles.rowTitle}>{t('dark_mode', 'Dark Mode')}</Text>
                                <Text style={styles.rowSub}>{t('appearance', 'High-contrast dark UI theme')}</Text>
                            </View>
                        </View>
                        <Switch
                            value={isDarkModeActive}
                            onValueChange={handleToggleDarkMode}
                            trackColor={{ false: theme.colors.border, true: primaryColor }}
                        />
                    </View>

                    <View style={styles.divider} />

                    {/* Language Selection */}
                    <View style={styles.rowColumn}>
                        <View style={styles.rowInfo}>
                            <View style={styles.iconBox}>
                                <Globe color={theme.colors.textSecondary} size={18} />
                            </View>
                            <View style={styles.textFlex}>
                                <Text style={styles.rowTitle}>{t('language', 'App Language')}</Text>
                                <Text style={styles.rowSub}>{t('select_language', 'Select display language')}</Text>
                            </View>
                        </View>
                        <View style={styles.optionRow}>
                            <TouchableOpacity
                                style={[
                                    styles.pillBtn,
                                    currentLanguage === 'en' && { backgroundColor: primaryColor, borderColor: primaryColor },
                                ]}
                                onPress={() => handleSelectLanguage('en')}
                            >
                                <Text
                                    style={[
                                        styles.pillBtnText,
                                        currentLanguage === 'en' && styles.pillBtnTextActive,
                                    ]}
                                >
                                    {t('english', 'English')}
                                </Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[
                                    styles.pillBtn,
                                    currentLanguage === 'kh' && { backgroundColor: primaryColor, borderColor: primaryColor },
                                ]}
                                onPress={() => handleSelectLanguage('kh')}
                            >
                                <Text
                                    style={[
                                        styles.pillBtnText,
                                        currentLanguage === 'kh' && styles.pillBtnTextActive,
                                    ]}
                                >
                                    {t('khmer', 'ភាសាខ្មែរ')}
                                </Text>
                            </TouchableOpacity>
                        </View>
                    </View>

                    <View style={styles.divider} />

                    {/* Typography Font Size */}
                    <View style={styles.rowColumn}>
                        <View style={styles.rowInfo}>
                            <View style={styles.iconBox}>
                                <Type color={theme.colors.textSecondary} size={18} />
                            </View>
                            <View style={styles.textFlex}>
                                <Text style={styles.rowTitle}>{t('font_size', 'Text Font Size')}</Text>
                                <Text style={styles.rowSub}>{t('scale', 'Adjust content scale')}</Text>
                            </View>
                        </View>
                        <View style={styles.optionRow}>
                            {FONT_SIZES.map((f) => {
                                const isActive = currentFontSize === f.id;
                                return (
                                    <TouchableOpacity
                                        key={f.id}
                                        style={[
                                            styles.pillBtn,
                                            isActive && { backgroundColor: primaryColor, borderColor: primaryColor },
                                        ]}
                                        onPress={() => handleSelectFontSize(f.id as FontSizeScaleId)}
                                    >
                                        <Text
                                            style={[
                                                styles.pillBtnText,
                                                isActive && styles.pillBtnTextActive,
                                            ]}
                                        >
                                            {t(f.labelKey, f.fallback)}
                                        </Text>
                                    </TouchableOpacity>
                                );
                            })}
                        </View>
                    </View>
                </View>

                {/* 2. Security & Hardware Device Section */}
                <Text style={styles.sectionHeaderTitle}>{t('security_hardware', 'Security & Hardware')}</Text>
                <View style={styles.card}>
                    {/* Hardware Binding */}
                    <View style={styles.row}>
                        <View style={styles.rowInfo}>
                            <View style={styles.iconBox}>
                                <Smartphone color={theme.colors.textSecondary} size={18} />
                            </View>
                            <View style={styles.textFlex}>
                                <Text style={styles.rowTitle}>{t('registered_hardware_device', 'Registered Hardware Device')}</Text>
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

                    {/* Biometric Lock */}
                    {isBiometricAvailable && (
                        <>
                            <View style={styles.divider} />
                            <View style={styles.row}>
                                <View style={styles.rowInfo}>
                                    <View style={styles.iconBox}>
                                        <Fingerprint color={theme.colors.textSecondary} size={18} />
                                    </View>
                                    <View style={styles.textFlex}>
                                        <Text style={styles.rowTitle}>{t('biometric_lock', 'Biometric Lock')}</Text>
                                        <Text style={styles.rowSub}>{t('access_account', 'Authenticate with Face ID / Touch ID')}</Text>
                                    </View>
                                </View>
                                <Switch
                                    value={biometricsEnabled}
                                    onValueChange={setBiometricsEnabled}
                                    trackColor={{ false: theme.colors.border, true: primaryColor }}
                                />
                            </View>
                        </>
                    )}

                    <View style={styles.divider} />

                    {/* Push Notifications Toggle */}
                    <View style={styles.row}>
                        <View style={styles.rowInfo}>
                            <View style={styles.iconBox}>
                                <Bell color={theme.colors.textSecondary} size={18} />
                            </View>
                            <View style={styles.textFlex}>
                                <Text style={styles.rowTitle}>{t('push_notifications', 'Push Notifications')}</Text>
                                <Text style={styles.rowSub}>{t('activity_attendance_alerts', 'Attendance alerts & announcements')}</Text>
                            </View>
                        </View>
                        <Switch
                            value={prefs?.notifications_enabled ?? notificationsPermissionGranted}
                            onValueChange={handleToggleNotifications}
                            trackColor={{ false: theme.colors.border, true: primaryColor }}
                        />
                    </View>
                </View>

                {/* 3. System Access & Diagnostics */}
                <Text style={styles.sectionHeaderTitle}>{t('system_diagnostics', 'System & Diagnostics')}</Text>
                <View style={styles.card}>
                    {/* System Permissions Trigger */}
                    <TouchableOpacity
                        style={styles.row}
                        onPress={() => setPermissionsModalVisible(true)}
                        activeOpacity={0.8}
                    >
                        <View style={styles.rowInfo}>
                            <View style={styles.iconBox}>
                                <Shield color={theme.colors.textSecondary} size={18} />
                            </View>
                            <View style={styles.textFlex}>
                                <Text style={styles.rowTitle}>{t('system_permissions_access', 'System Permissions Access')}</Text>
                                <Text style={styles.rowSub}>{t('permission_hint', 'Camera, GPS Geofence & Notification grants')}</Text>
                            </View>
                        </View>
                    </TouchableOpacity>

                    <View style={styles.divider} />

                    {/* Feedback Drawer Trigger */}
                    <TouchableOpacity
                        style={styles.row}
                        onPress={() => setFeedbackModalVisible(true)}
                        activeOpacity={0.8}
                    >
                        <View style={styles.rowInfo}>
                            <View style={styles.iconBox}>
                                <MessageSquare color={theme.colors.textSecondary} size={18} />
                            </View>
                            <View style={styles.textFlex}>
                                <Text style={styles.rowTitle}>{t('in_app_feedback', 'In-App Feedback & Bug Reports')}</Text>
                                <Text style={styles.rowSub}>{t('help_us_description', 'Send app suggestions to development team')}</Text>
                            </View>
                        </View>
                    </TouchableOpacity>

                    <View style={styles.divider} />

                    {/* App Tour Trigger */}
                    <TouchableOpacity
                        style={styles.row}
                        onPress={() => navigation.navigate('AppTour', { isReviewMode: true })}
                        activeOpacity={0.8}
                    >
                        <View style={styles.rowInfo}>
                            <View style={styles.iconBox}>
                                <Sparkles color={theme.colors.textSecondary} size={18} />
                            </View>
                            <View style={styles.textFlex}>
                                <Text style={styles.rowTitle}>{t('app_tour', 'App Tour & Feature Guide')}</Text>
                                <Text style={styles.rowSub}>{t('app_tour_desc', 'Revisit the app overview and key features')}</Text>
                            </View>
                        </View>
                    </TouchableOpacity>

                    <View style={styles.divider} />

                    {/* Clear Storage */}
                    <TouchableOpacity style={styles.row} onPress={handleClearCache} activeOpacity={0.8}>
                        <View style={styles.rowInfo}>
                            <View style={styles.iconBox}>
                                <Trash2 color={theme.colors.status.danger} size={18} />
                            </View>
                            <View style={styles.textFlex}>
                                <Text style={[styles.rowTitle, { color: theme.colors.status.danger }]}>
                                    {t('clear_offline_storage', 'Clear Offline Storage')}
                                </Text>
                                <Text style={styles.rowSub}>{t('decouple_warning', 'Purge offline cache & temporary data')}</Text>
                            </View>
                        </View>
                    </TouchableOpacity>
                </View>

                {/* 4. Legal & About Section */}
                <Text style={styles.sectionHeaderTitle}>{t('legal_information', 'Legal & Information')}</Text>
                <View style={styles.card}>
                    <TouchableOpacity
                        style={styles.row}
                        onPress={() => setPolicyModalVisible(true)}
                        activeOpacity={0.8}
                    >
                        <View style={styles.rowInfo}>
                            <View style={styles.iconBox}>
                                <Lock color={theme.colors.textSecondary} size={18} />
                            </View>
                            <View style={styles.textFlex}>
                                <Text style={styles.rowTitle}>{t('privacy_policy', 'Privacy Policy')}</Text>
                                <Text style={styles.rowSub}>{t('read_details', 'View data privacy terms')}</Text>
                            </View>
                        </View>
                    </TouchableOpacity>

                    <View style={styles.divider} />

                    <TouchableOpacity
                        style={styles.row}
                        onPress={() => setTermsModalVisible(true)}
                        activeOpacity={0.8}
                    >
                        <View style={styles.rowInfo}>
                            <View style={styles.iconBox}>
                                <FileText color={theme.colors.textSecondary} size={18} />
                            </View>
                            <View style={styles.textFlex}>
                                <Text style={styles.rowTitle}>{t('terms_of_service', 'Terms of Service')}</Text>
                                <Text style={styles.rowSub}>{t('read_details', 'View mobile service agreement')}</Text>
                            </View>
                        </View>
                    </TouchableOpacity>
                </View>

                {/* Footer App Version Info */}
                <View style={styles.footerInfo}>
                    <Info color={theme.colors.textSecondary} size={15} />
                    <Text style={styles.footerText}>
                        SCCG APP • {t('version', 'Version')} {pwaInfo?.version || '1.1.1'}
                    </Text>
                </View>

            {/* Native Bottom Sheet App Feedback */}
            <AppFeedbackSheet
                visible={feedbackModalVisible}
                onClose={() => setFeedbackModalVisible(false)}
            />

            {/* System Permissions Sheet Modal */}
            {permissionsModalVisible && (
                <Modal visible={permissionsModalVisible} transparent animationType="fade">
                    <TouchableOpacity
                        style={styles.modalOverlay}
                        activeOpacity={1}
                        onPress={() => setPermissionsModalVisible(false)}
                    >
                        <View style={styles.modalSheet}>
                            <View style={styles.modalHeader}>
                                <Text style={styles.modalTitle}>{t('system_access_grants', 'System Access Grants')}</Text>
                                <TouchableOpacity onPress={() => setPermissionsModalVisible(false)}>
                                    <X color={theme.colors.textPrimary} size={20} />
                                </TouchableOpacity>
                            </View>

                            {/* Camera Permission */}
                            <View style={styles.permRow}>
                                <View style={styles.rowInfo}>
                                    <View style={styles.iconBox}>
                                        <CameraIcon color={theme.colors.textSecondary} size={18} />
                                    </View>
                                    <View style={styles.textFlex}>
                                        <Text style={styles.permTitle}>{t('camera_access', 'Camera Access')}</Text>
                                        <Text style={styles.permSub}>{t('align_qr_within_frame', 'Required for QR attendance clock-in')}</Text>
                                    </View>
                                </View>
                                <TouchableOpacity style={styles.permActionBtn} onPress={handleRequestCamera}>
                                    <Text style={styles.permActionText}>
                                        {cameraPermissionGranted ? t('granted', 'Granted') : t('grant', 'Grant')}
                                    </Text>
                                </TouchableOpacity>
                            </View>

                            {/* GPS Location Permission */}
                            <View style={styles.permRow}>
                                <View style={styles.rowInfo}>
                                    <View style={styles.iconBox}>
                                        <MapPin color={theme.colors.textSecondary} size={18} />
                                    </View>
                                    <View style={styles.textFlex}>
                                        <Text style={styles.permTitle}>{t('gps_geofence_location', 'GPS Geofence Location')}</Text>
                                        <Text style={styles.permSub}>{t('enable_gps_desc', 'Required to verify office clock-in radius')}</Text>
                                    </View>
                                </View>
                                <TouchableOpacity style={styles.permActionBtn} onPress={handleRequestLocation}>
                                    <Text style={styles.permActionText}>
                                        {locationPermissionGranted ? t('granted', 'Granted') : t('grant', 'Grant')}
                                    </Text>
                                </TouchableOpacity>
                            </View>

                            {/* Notifications Permission */}
                            <View style={styles.permRow}>
                                <View style={styles.rowInfo}>
                                    <View style={styles.iconBox}>
                                        <Bell color={theme.colors.textSecondary} size={18} />
                                    </View>
                                    <View style={styles.textFlex}>
                                        <Text style={styles.permTitle}>{t('push_notifications', 'Push Notifications')}</Text>
                                        <Text style={styles.permSub}>{t('activity_attendance_alerts', 'Receive attendance reminders & announcements')}</Text>
                                    </View>
                                </View>
                                <TouchableOpacity style={styles.permActionBtn} onPress={handleRequestNotifications}>
                                    <Text style={styles.permActionText}>
                                        {notificationsPermissionGranted ? t('granted', 'Granted') : t('grant', 'Grant')}
                                    </Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    </TouchableOpacity>
                </Modal>
            )}

            {/* Native Privacy Policy Bottom Sheet */}
            <LegalDocumentSheet
                visible={policyModalVisible}
                onClose={() => setPolicyModalVisible(false)}
                type="privacy"
                customContent={pwaInfo?.privacy_policy}
            />

            {/* Native Terms of Service Bottom Sheet */}
            <LegalDocumentSheet
                visible={termsModalVisible}
                onClose={() => setTermsModalVisible(false)}
                type="terms"
                customContent={pwaInfo?.terms_of_service}
            />
        </AppShell>
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
        width: 38,
        height: 38,
        borderRadius: theme.borderRadius.md,
        backgroundColor: theme.colors.surface,
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
        flexGrow: 1,
        paddingHorizontal: theme.spacing.md + 4,
        paddingBottom: theme.spacing.xl + 40,
    },
    sectionHeaderTitle: {
        fontSize: 13,
        fontWeight: '700',
        textTransform: 'uppercase',
        letterSpacing: 0.6,
        color: theme.colors.textSecondary,
        marginBottom: theme.spacing.xs + 2,
        marginLeft: theme.spacing.xs,
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
    rowColumn: {
        flexDirection: 'column',
        paddingVertical: theme.spacing.xs + 2,
    },
    rowInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
        marginRight: theme.spacing.sm,
    },
    iconBox: {
        width: 36,
        height: 36,
        borderRadius: theme.borderRadius.md,
        backgroundColor: theme.colors.surfaceSubtle,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: theme.colors.border,
    },
    textFlex: {
        flex: 1,
        marginLeft: theme.spacing.md,
    },
    rowTitle: {
        fontSize: 14,
        fontWeight: '600',
        color: theme.colors.textPrimary,
    },
    rowSub: {
        fontSize: 11,
        fontWeight: '500',
        color: theme.colors.textSecondary,
        marginTop: 1,
    },
    optionRow: {
        flexDirection: 'row',
        gap: theme.spacing.xs + 4,
        marginTop: theme.spacing.sm,
        marginLeft: 48,
    },
    fontGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: theme.spacing.xs + 4,
        marginTop: theme.spacing.sm,
        marginLeft: 48,
    },
    pillBtn: {
        paddingHorizontal: theme.spacing.md,
        paddingVertical: theme.spacing.xs + 2,
        borderRadius: theme.borderRadius.md,
        backgroundColor: theme.colors.surfaceSubtle,
        borderWidth: 1,
        borderColor: theme.colors.border,
    },
    pillBtnText: {
        fontSize: 12,
        fontWeight: '600',
        color: theme.colors.textSecondary,
    },
    pillBtnTextActive: {
        color: theme.colors.onPrimary,
        fontWeight: '700',
    },
    colorSwatchRow: {
        flexDirection: 'row',
        gap: theme.spacing.xs + 6,
        marginTop: theme.spacing.sm,
        marginLeft: 48,
    },
    colorSwatch: {
        width: 28,
        height: 28,
        borderRadius: 14,
        justifyContent: 'center',
        alignItems: 'center',
    },
    colorSwatchActive: {
        borderWidth: 2,
        borderColor: theme.colors.textPrimary,
    },
    boundBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: theme.colors.status.successSubtle,
        paddingHorizontal: theme.spacing.sm + 2,
        paddingVertical: 3,
        borderRadius: theme.borderRadius.sm,
        borderWidth: 1,
        borderColor: theme.colors.status.successBorder,
    },
    boundBadgeText: {
        fontSize: 10,
        fontWeight: '800',
        color: theme.colors.status.success,
        marginLeft: 4,
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
        marginTop: theme.spacing.xs,
    },
    footerText: {
        fontSize: 11,
        fontWeight: '500',
        color: theme.colors.textSecondary,
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'flex-end',
    },
    modalSheet: {
        backgroundColor: theme.colors.surface,
        borderTopLeftRadius: theme.borderRadius.lg,
        borderTopRightRadius: theme.borderRadius.lg,
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
        paddingVertical: theme.spacing.sm + 2,
        borderBottomWidth: 1,
        borderBottomColor: theme.colors.border,
    },
    permTitle: {
        fontSize: 14,
        fontWeight: '600',
        color: theme.colors.textPrimary,
    },
    permSub: {
        fontSize: 11,
        color: theme.colors.textSecondary,
        marginTop: 2,
    },
    permActionBtn: {
        backgroundColor: theme.colors.surfaceSubtle,
        paddingHorizontal: theme.spacing.md,
        paddingVertical: theme.spacing.xs + 2,
        borderRadius: theme.borderRadius.md,
        borderWidth: 1,
        borderColor: theme.colors.border,
    },
    permActionText: {
        fontSize: 12,
        fontWeight: '700',
        color: theme.colors.textPrimary,
    },
    legalBodyText: {
        fontSize: 13,
        lineHeight: 20,
        color: theme.colors.textSecondary,
        paddingVertical: theme.spacing.md,
    },
}));
