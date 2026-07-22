import React, { useEffect, useState } from 'react';
import {
    View,
    Text,
    ScrollView,
    TouchableOpacity,
    SafeAreaView,
    StatusBar,
    Alert,
    ActivityIndicator,
    Image,
} from 'react-native';
import { StyleSheet, useUnistyles } from 'react-native-unistyles';
import * as ImagePicker from 'expo-image-picker';
import { useAuth } from '../../context/AuthContext';
import { useAppTheme } from '../../context/ThemeContext';
import { profileApi, ProfileData } from '../../api/profile';
import {
    Mail,
    Phone,
    Building2,
    Calendar,
    Settings,
    LogOut,
    Sun,
    Moon,
    MapPin,
    UserCheck,
    Camera,
    Shield,
    Send,
    Clock,
} from 'lucide-react-native';

export const ProfileScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
    const { user, logout } = useAuth();
    const { isDark, toggleTheme } = useAppTheme();
    const { theme } = useUnistyles();
    const styles = stylesheet;

    const [profileData, setProfileData] = useState<ProfileData | null>(null);
    const [isLoading, setIsLoading] = useState<boolean>(true);
    const [isUploadingAvatar, setIsUploadingAvatar] = useState<boolean>(false);

    useEffect(() => {
        fetchProfile();
    }, []);

    const fetchProfile = async () => {
        try {
            setIsLoading(true);
            const res = await profileApi.getProfile();
            const data = res?.employee || res;
            setProfileData(data);
        } catch (error) {
            console.warn('Failed to fetch profile:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const handlePickAvatar = async () => {
        const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (!permission.granted) {
            Alert.alert('Permission Required', 'Photo gallery access is required to change profile avatar.');
            return;
        }

        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ['images'],
            allowsEditing: true,
            aspect: [1, 1],
            quality: 0.8,
        });

        if (!result.canceled && result.assets && result.assets.length > 0) {
            const uri = result.assets[0].uri;
            setIsUploadingAvatar(true);
            try {
                const res = await profileApi.uploadAvatar(uri);
                Alert.alert('Avatar Updated', 'Profile photo updated successfully.');
                setProfileData((prev: any) => ({
                    ...prev,
                    profile_image_url: res?.profile_image_url || uri,
                }));
            } catch (err: any) {
                Alert.alert('Upload Error', err?.message || 'Failed to update avatar.');
            } finally {
                setIsUploadingAvatar(false);
            }
        }
    };

    const handleLogoutConfirm = () => {
        Alert.alert('Sign Out', 'Are you sure you want to sign out of your HR account?', [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Sign Out', style: 'destructive', onPress: logout },
        ]);
    };

    const emp: any = profileData || user;
    const displayName = emp?.full_name || user?.name || 'Employee';
    const displayCode = emp?.employee_id || user?.employee_code || 'EMP-001';
    const designationName =
        typeof emp?.designation === 'object' ? emp?.designation?.name : String(emp?.designation || user?.position || 'Staff');
    const deptName = typeof emp?.department === 'object' ? emp?.department?.name : String(emp?.department || 'General');
    const branchName = typeof emp?.branch === 'object' ? emp?.branch?.name : String(emp?.branch || 'Headquarters');
    const lineManagerName = emp?.line_manager?.full_name || 'HR Supervisor';

    return (
        <SafeAreaView style={styles.safeArea}>
            <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />

            {/* Navigation Header */}
            <View style={styles.topBar}>
                <Text style={styles.headerTitle}>Employee Profile</Text>

                <View style={styles.headerActions}>
                    <TouchableOpacity onPress={toggleTheme} style={styles.iconCircle} activeOpacity={0.7}>
                        {isDark ? <Sun color="#F59E0B" size={18} /> : <Moon color="#2563EB" size={18} />}
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={styles.iconCircle}
                        onPress={() => navigation.navigate('Settings')}
                        activeOpacity={0.7}
                    >
                        <Settings color={theme.colors.textPrimary} size={18} />
                    </TouchableOpacity>
                </View>
            </View>

            <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
                {isLoading ? (
                    <View style={styles.loadingContainer}>
                        <ActivityIndicator size="large" color={theme.colors.primary} />
                    </View>
                ) : (
                    <>
                        {/* Profile Header Card */}
                        <View style={styles.profileCard}>
                            <View style={styles.avatarContainer}>
                                {emp?.profile_image_url || emp?.avatar ? (
                                    <Image
                                        source={{ uri: emp.profile_image_url || emp.avatar }}
                                        style={styles.avatarImg}
                                    />
                                ) : (
                                    <View style={styles.avatarFallback}>
                                        <Text style={styles.avatarFallbackText}>
                                            {displayName.charAt(0).toUpperCase()}
                                        </Text>
                                    </View>
                                )}

                                <TouchableOpacity
                                    style={styles.cameraBadge}
                                    onPress={handlePickAvatar}
                                    disabled={isUploadingAvatar}
                                    activeOpacity={0.8}
                                >
                                    {isUploadingAvatar ? (
                                        <ActivityIndicator size="small" color="#FFFFFF" />
                                    ) : (
                                        <Camera color="#FFFFFF" size={14} />
                                    )}
                                </TouchableOpacity>
                            </View>

                            <Text style={styles.displayName}>{displayName}</Text>
                            <Text style={styles.designationText}>{designationName}</Text>

                            <View style={styles.codeBadge}>
                                <Text style={styles.codeBadgeText}>{displayCode}</Text>
                            </View>
                        </View>

                        {/* Employment Info Section */}
                        <Text style={styles.sectionHeaderTitle}>Employment Details</Text>
                        <View style={styles.infoCard}>
                            <View style={styles.infoRow}>
                                <Building2 color={theme.colors.primary} size={18} />
                                <View style={styles.infoTextGroup}>
                                    <Text style={styles.infoLabel}>Department</Text>
                                    <Text style={styles.infoValue}>{deptName}</Text>
                                </View>
                            </View>

                            <View style={styles.divider} />

                            <View style={styles.infoRow}>
                                <MapPin color={theme.colors.status.warning} size={18} />
                                <View style={styles.infoTextGroup}>
                                    <Text style={styles.infoLabel}>Branch Office</Text>
                                    <Text style={styles.infoValue}>{branchName}</Text>
                                </View>
                            </View>

                            <View style={styles.divider} />

                            <View style={styles.infoRow}>
                                <UserCheck color={theme.colors.status.success} size={18} />
                                <View style={styles.infoTextGroup}>
                                    <Text style={styles.infoLabel}>Line Manager</Text>
                                    <Text style={styles.infoValue}>{lineManagerName}</Text>
                                </View>
                            </View>

                            <View style={styles.divider} />

                            <View style={styles.infoRow}>
                                <Calendar color="#8B5CF6" size={18} />
                                <View style={styles.infoTextGroup}>
                                    <Text style={styles.infoLabel}>Date of Joining</Text>
                                    <Text style={styles.infoValue}>{emp?.date_of_joining || 'N/A'}</Text>
                                </View>
                            </View>

                            {emp?.working_period && (
                                <>
                                    <View style={styles.divider} />
                                    <View style={styles.infoRow}>
                                        <Clock color={theme.colors.primary} size={18} />
                                        <View style={styles.infoTextGroup}>
                                            <Text style={styles.infoLabel}>Length of Service</Text>
                                            <Text style={styles.infoValue}>{emp.working_period}</Text>
                                        </View>
                                    </View>
                                </>
                            )}
                        </View>

                        {/* Contact & Account Credentials Section */}
                        <Text style={styles.sectionHeaderTitle}>Contact & Security</Text>
                        <View style={styles.infoCard}>
                            <View style={styles.infoRow}>
                                <Mail color={theme.colors.primary} size={18} />
                                <View style={styles.infoTextGroup}>
                                    <Text style={styles.infoLabel}>Email Address</Text>
                                    <Text style={styles.infoValue}>{emp?.email || user?.email || 'N/A'}</Text>
                                </View>
                            </View>

                            {emp?.phone && (
                                <>
                                    <View style={styles.divider} />
                                    <View style={styles.infoRow}>
                                        <Phone color={theme.colors.status.success} size={18} />
                                        <View style={styles.infoTextGroup}>
                                            <Text style={styles.infoLabel}>Phone Number</Text>
                                            <Text style={styles.infoValue}>{emp.phone}</Text>
                                        </View>
                                    </View>
                                </>
                            )}

                            <View style={styles.divider} />

                            <View style={styles.infoRow}>
                                <Send color="#0088cc" size={18} />
                                <View style={styles.infoTextGroup}>
                                    <Text style={styles.infoLabel}>Telegram Linked Account</Text>
                                    <Text style={styles.infoValue}>
                                        {emp?.telegram_user_id ? `Linked (ID: ${emp.telegram_user_id})` : 'Not Linked'}
                                    </Text>
                                </View>
                            </View>
                        </View>

                        {/* Security Hold-to-Logout Button */}
                        <TouchableOpacity
                            style={styles.logoutBtn}
                            onPress={handleLogoutConfirm}
                            activeOpacity={0.85}
                        >
                            <LogOut color={theme.colors.status.danger} size={20} />
                            <Text style={styles.logoutBtnText}>Sign Out of HR Account</Text>
                        </TouchableOpacity>
                    </>
                )}
            </ScrollView>
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
    headerTitle: {
        fontSize: 22,
        fontWeight: '800',
        color: theme.colors.textPrimary,
    },
    headerActions: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: theme.spacing.xs + 2,
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
    container: {
        flex: 1,
    },
    scrollContent: {
        paddingHorizontal: theme.spacing.md + 4,
        paddingBottom: theme.spacing.xl,
    },
    loadingContainer: {
        paddingVertical: theme.spacing.xxl,
        alignItems: 'center',
    },
    profileCard: {
        backgroundColor: theme.colors.surface,
        borderRadius: theme.borderRadius.lg + 4,
        padding: theme.spacing.lg,
        alignItems: 'center',
        marginBottom: theme.spacing.lg,
        borderWidth: 1,
        borderColor: theme.colors.border,
        ...theme.shadows.sm,
    },
    avatarContainer: {
        position: 'relative',
        marginBottom: theme.spacing.md,
    },
    avatarImg: {
        width: 84,
        height: 84,
        borderRadius: 42,
    },
    avatarFallback: {
        width: 84,
        height: 84,
        borderRadius: 42,
        backgroundColor: theme.colors.primary,
        justifyContent: 'center',
        alignItems: 'center',
        ...theme.shadows.sm,
    },
    avatarFallbackText: {
        color: '#FFFFFF',
        fontSize: 36,
        fontWeight: '900',
    },
    cameraBadge: {
        position: 'absolute',
        bottom: 0,
        right: 0,
        width: 28,
        height: 28,
        borderRadius: 14,
        backgroundColor: theme.colors.primary,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 2,
        borderColor: theme.colors.surface,
    },
    displayName: {
        fontSize: 20,
        fontWeight: '800',
        color: theme.colors.textPrimary,
        textAlign: 'center',
    },
    designationText: {
        fontSize: 13,
        color: theme.colors.textSecondary,
        marginTop: 2,
        marginBottom: theme.spacing.sm,
        textAlign: 'center',
    },
    codeBadge: {
        backgroundColor: 'rgba(37, 99, 235, 0.1)',
        paddingHorizontal: theme.spacing.md,
        paddingVertical: theme.spacing.xs,
        borderRadius: theme.borderRadius.md,
    },
    codeBadgeText: {
        color: theme.colors.primary,
        fontSize: 12,
        fontWeight: '800',
        letterSpacing: 0.5,
    },
    sectionHeaderTitle: {
        fontSize: 15,
        fontWeight: '700',
        color: theme.colors.textPrimary,
        marginBottom: theme.spacing.sm,
    },
    infoCard: {
        backgroundColor: theme.colors.surface,
        borderRadius: theme.borderRadius.lg,
        padding: theme.spacing.md,
        marginBottom: theme.spacing.lg,
        borderWidth: 1,
        borderColor: theme.colors.border,
        ...theme.shadows.sm,
    },
    infoRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: theme.spacing.xs + 2,
    },
    infoTextGroup: {
        flex: 1,
        marginLeft: theme.spacing.md,
    },
    infoLabel: {
        fontSize: 11,
        color: theme.colors.textSecondary,
    },
    infoValue: {
        fontSize: 14,
        fontWeight: '700',
        color: theme.colors.textPrimary,
        marginTop: 2,
    },
    divider: {
        height: 1,
        backgroundColor: theme.colors.border,
        marginVertical: theme.spacing.xs,
    },
    logoutBtn: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(239, 68, 68, 0.1)',
        borderWidth: 1,
        borderColor: 'rgba(239, 68, 68, 0.2)',
        height: 52,
        borderRadius: theme.borderRadius.lg,
        marginTop: theme.spacing.xs,
    },
    logoutBtnText: {
        color: theme.colors.status.danger,
        fontWeight: '700',
        fontSize: 15,
        marginLeft: theme.spacing.sm,
    },
}));
