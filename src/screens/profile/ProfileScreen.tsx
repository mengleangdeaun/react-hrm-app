import React, { useState } from 'react';
import {
    View,
    ScrollView,
    TouchableOpacity,
    StatusBar,
    Alert,
    ActivityIndicator,
    Image,
    RefreshControl,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StyleSheet, useUnistyles } from 'react-native-unistyles';
import * as ImagePicker from 'expo-image-picker';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../../context/AuthContext';
import { useAppTheme } from '../../context/ThemeContext';
import { useTranslation } from '../../context/LanguageContext';
import { profileApi, ProfileData } from '../../api/profile';
import { AppText as Text } from '../../components/AppText';
import { AppShell } from '../../components/common/AppShell';
import { AppHeader, HeaderIconButton } from '../../components/common/AppHeader';
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
    Send,
    Clock,
    Cake,
} from 'lucide-react-native';

import { formatDateDisplay } from '../../utils/dateTime';

const formatDate = (dateStr: string | null | undefined): string => {
    return formatDateDisplay(dateStr, 'short', 'N/A');
};

export const ProfileScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
    const insets = useSafeAreaInsets();
    const { user, logout } = useAuth();
    const { isDark, toggleTheme, primaryColor } = useAppTheme();
    const { t } = useTranslation();
    const { theme } = useUnistyles();
    const styles = stylesheet;
    const queryClient = useQueryClient();
    const [avatarLoadError, setAvatarLoadError] = useState(false);

    // Query with 10-minute cache & robust response unwrapping
    const { data: profileData, isFetching, refetch } = useQuery<ProfileData>({
        queryKey: ['profile'],
        queryFn: async () => {
            const res = await profileApi.getProfile();
            return res?.data?.employee || res?.employee || res?.data || res;
        },
        staleTime: 1000 * 60 * 10,
        placeholderData: user
            ? ({
                  id: user.id,
                  full_name: user.name,
                  employee_id: user.employee_code,
                  email: user.email,
                  profile_image_url: user.avatar || undefined,
                  department: user.department,
                  designation: user.position,
              } as any)
            : undefined,
    });

    // Avatar upload mutation
    const uploadAvatarMutation = useMutation({
        mutationFn: (uri: string) => profileApi.uploadAvatar(uri),
        onSuccess: (res, uri) => {
            Alert.alert(t('success', 'Success!'), t('avatar_updated', 'Profile photo updated successfully.'));
            const newUrl = res?.profile_image_url || res?.profile_image || uri;
            queryClient.setQueryData(['profile'], (oldData: any) => ({
                ...(oldData || {}),
                profile_image_url: newUrl,
                profile_image: newUrl,
            }));
        },
        onError: (err: any) => {
            Alert.alert(t('error', 'Upload Error'), err?.message || 'Failed to update avatar.');
        },
    });

    const handlePickAvatar = async () => {
        const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (!permission.granted) {
            Alert.alert(t('access_required', 'Permission Required'), 'Photo gallery access is required to change profile avatar.');
            return;
        }

        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ['images'],
            allowsEditing: true,
            aspect: [1, 1],
            quality: 0.8,
        });

        if (!result.canceled && result.assets && result.assets.length > 0) {
            uploadAvatarMutation.mutate(result.assets[0].uri);
        }
    };

    const handleLogoutConfirm = () => {
        Alert.alert(t('sign_out', 'Sign Out'), 'Are you sure you want to sign out of your HR account?', [
            { text: t('cancel', 'Cancel'), style: 'cancel' },
            { text: t('sign_out', 'Sign Out'), style: 'destructive', onPress: logout },
        ]);
    };

    const emp: any = profileData || user;
    const displayName = emp?.full_name || emp?.name || user?.name || 'Employee';
    const displayCode = emp?.employee_id || emp?.code || user?.employee_code || 'EMP-001';

    const designationName =
        typeof emp?.designation === 'object'
            ? emp?.designation?.name
            : String(emp?.designation || user?.position || 'Staff');

    const deptName =
        typeof emp?.department === 'object'
            ? emp?.department?.name
            : String(emp?.department || user?.department || 'General');

    const branchName =
        typeof emp?.branch === 'object'
            ? emp?.branch?.name
            : String(emp?.branch || 'Headquarters');

    const lineManagerName =
        typeof emp?.line_manager === 'object'
            ? (emp?.line_manager?.name || emp?.line_manager?.full_name || 'HR Supervisor')
            : String(emp?.line_manager || 'HR Supervisor');

    const rawAvatarUrl = emp?.profile_image_url || emp?.profile_image || emp?.avatar;
    const avatarUrl = typeof rawAvatarUrl === 'string' && rawAvatarUrl.trim().length > 0 && rawAvatarUrl !== 'null' && rawAvatarUrl !== 'undefined'
        ? rawAvatarUrl.trim()
        : null;
    const showAvatarImage = !!avatarUrl && !avatarLoadError;
    const isUploadingAvatar = uploadAvatarMutation.isPending;

    const handleRefresh = async () => {
        setAvatarLoadError(false);
        await queryClient.invalidateQueries({ queryKey: ['profile'] });
        refetch();
    };

    const headerRight = (
        <View style={styles.headerRightRow}>
            <HeaderIconButton
                icon={isDark ? (
                    <Sun color={theme.colors.textSecondary} size={18} />
                ) : (
                    <Moon color={theme.colors.textSecondary} size={18} />
                )}
                onPress={toggleTheme}
                accessibilityLabel="Toggle theme"
            />
            <HeaderIconButton
                icon={<Settings color={theme.colors.textSecondary} size={18} />}
                onPress={() => navigation.navigate('Settings')}
                accessibilityLabel="App Settings"
                style={{ marginLeft: 6 }}
            />
        </View>
    );

    return (
        <AppShell
            title={t('my_profile', 'My Profile')}
            headerRight={headerRight}
            refreshing={isFetching}
            onRefresh={handleRefresh}
            hasTabBar={true}
        >
            {/* Hero Profile Card */}
            <View style={styles.heroCard}>
                <View style={styles.avatarWrapper}>
                    {showAvatarImage ? (
                        <Image
                            source={{ uri: avatarUrl! }}
                            style={styles.avatarImg}
                            onError={() => setAvatarLoadError(true)}
                        />
                    ) : (
                        <View style={styles.avatarFallback}>
                            <Text style={styles.avatarFallbackText}>
                                {displayName ? displayName.charAt(0).toUpperCase() : 'U'}
                            </Text>
                        </View>
                    )}

                    <TouchableOpacity
                        style={[styles.cameraBadge, { backgroundColor: primaryColor }]}
                        onPress={handlePickAvatar}
                        disabled={isUploadingAvatar}
                        activeOpacity={0.8}
                    >
                        {isUploadingAvatar ? (
                            <ActivityIndicator size="small" color={theme.colors.onPrimary} />
                        ) : (
                            <Camera color={theme.colors.onPrimary} size={13} />
                        )}
                    </TouchableOpacity>
                </View>

                <Text variant="h1" style={styles.displayName}>{displayName}</Text>
                <Text style={styles.designationText}>{designationName}</Text>

                <View style={styles.badgeRow}>
                    <View style={styles.codeBadge}>
                        <Text style={styles.codeBadgeText}>{displayCode}</Text>
                    </View>
                </View>
            </View>

            {/* Employment Info Section */}
            <Text style={styles.sectionHeaderTitle}>{t('employment_information', 'Employment Information')}</Text>
            <View style={styles.infoCard}>
                <View style={styles.infoRow}>
                    <View style={styles.iconBox}>
                        <Building2 color={theme.colors.textSecondary} size={18} />
                    </View>
                    <View style={styles.infoTextGroup}>
                        <Text style={styles.infoLabel}>{t('department', 'Department')}</Text>
                        <Text style={styles.infoValue}>{deptName}</Text>
                    </View>
                </View>

                <View style={styles.divider} />

                <View style={styles.infoRow}>
                    <View style={styles.iconBox}>
                        <MapPin color={theme.colors.textSecondary} size={18} />
                    </View>
                    <View style={styles.infoTextGroup}>
                        <Text style={styles.infoLabel}>{t('branch_office', 'Branch Office')}</Text>
                        <Text style={styles.infoValue}>{branchName}</Text>
                    </View>
                </View>

                <View style={styles.divider} />

                <View style={styles.infoRow}>
                    <View style={styles.iconBox}>
                        <UserCheck color={theme.colors.textSecondary} size={18} />
                    </View>
                    <View style={styles.infoTextGroup}>
                        <Text style={styles.infoLabel}>{t('line_manager', 'Line Manager')}</Text>
                        <Text style={styles.infoValue}>{lineManagerName}</Text>
                    </View>
                </View>

                <View style={styles.divider} />

                <View style={styles.infoRow}>
                    <View style={styles.iconBox}>
                        <Calendar color={theme.colors.textSecondary} size={18} />
                    </View>
                    <View style={styles.infoTextGroup}>
                        <Text style={styles.infoLabel}>{t('date_of_joining', 'Date of Joining')}</Text>
                        <Text style={styles.infoValue}>{formatDate(emp?.date_of_joining)}</Text>
                    </View>
                </View>

                {emp?.working_period && (
                    <>
                        <View style={styles.divider} />
                        <View style={styles.infoRow}>
                            <View style={styles.iconBox}>
                                <Clock color={theme.colors.textSecondary} size={18} />
                            </View>
                            <View style={styles.infoTextGroup}>
                                <Text style={styles.infoLabel}>{t('length_of_service', 'Length of Service')}</Text>
                                <Text style={styles.infoValue}>{emp.working_period}</Text>
                            </View>
                        </View>
                    </>
                )}
            </View>

            {/* Contact & Personal Information Section */}
            <Text style={styles.sectionHeaderTitle}>{t('contact_credentials', 'Contact & Credentials')}</Text>
            <View style={styles.infoCard}>
                <View style={styles.infoRow}>
                    <View style={styles.iconBox}>
                        <Mail color={theme.colors.textSecondary} size={18} />
                    </View>
                    <View style={styles.infoTextGroup}>
                        <Text style={styles.infoLabel}>{t('email_address', 'Email Address')}</Text>
                        <Text style={styles.infoValue}>{emp?.email || user?.email || 'N/A'}</Text>
                    </View>
                </View>

                {emp?.phone && (
                    <>
                        <View style={styles.divider} />
                        <View style={styles.infoRow}>
                            <View style={styles.iconBox}>
                                <Phone color={theme.colors.textSecondary} size={18} />
                            </View>
                            <View style={styles.infoTextGroup}>
                                <Text style={styles.infoLabel}>{t('phone_number', 'Phone Number')}</Text>
                                <Text style={styles.infoValue}>{emp.phone}</Text>
                            </View>
                        </View>
                    </>
                )}

                {emp?.date_of_birth && (
                    <>
                        <View style={styles.divider} />
                        <View style={styles.infoRow}>
                            <View style={styles.iconBox}>
                                <Cake color={theme.colors.textSecondary} size={18} />
                            </View>
                            <View style={styles.infoTextGroup}>
                                <Text style={styles.infoLabel}>{t('date_of_birth', 'Date of Birth')}</Text>
                                <Text style={styles.infoValue}>{formatDate(emp.date_of_birth)}</Text>
                            </View>
                        </View>
                    </>
                )}

                <View style={styles.divider} />

                <View style={styles.infoRow}>
                    <View style={styles.iconBox}>
                        <Send color={theme.colors.textSecondary} size={18} />
                    </View>
                    <View style={styles.infoTextGroup}>
                        <Text style={styles.infoLabel}>{t('telegram_linked_account', 'Telegram Linked Account')}</Text>
                        <Text style={styles.infoValue}>
                            {emp?.telegram_user_id ? `${t('linked', 'Linked')} (ID: ${emp.telegram_user_id})` : t('not_linked', 'Not Linked')}
                        </Text>
                    </View>
                </View>
            </View>

            {/* Security Sign-Out Button */}
            <TouchableOpacity style={styles.logoutBtn} onPress={handleLogoutConfirm} activeOpacity={0.85}>
                <LogOut color={theme.colors.status.danger} size={18} />
                <Text style={styles.logoutBtnText}>{t('sign_out_account', 'Sign Out of Account')}</Text>
            </TouchableOpacity>
        </AppShell>
    );
};

const stylesheet = StyleSheet.create((theme) => ({
    safeArea: {
        flex: 1,
        backgroundColor: theme.colors.background,
    },
    headerRightRow: {
        flexDirection: 'row',
        alignItems: 'center',
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
        letterSpacing: -0.3,
    },
    headerActions: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: theme.spacing.xs + 4,
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
    container: {
        flex: 1,
    },
    scrollContent: {
        flexGrow: 1,
        paddingHorizontal: theme.spacing.md + 4,
        paddingBottom: theme.spacing.lg,
    },
    heroCard: {
        backgroundColor: theme.colors.surface,
        borderRadius: theme.borderRadius.lg,
        padding: theme.spacing.lg,
        alignItems: 'center',
        marginBottom: theme.spacing.lg,
        borderWidth: 1,
        borderColor: theme.colors.border,
        ...theme.shadows.sm,
    },
    avatarWrapper: {
        position: 'relative',
        marginBottom: theme.spacing.md,
    },
    avatarImg: {
        width: 88,
        height: 88,
        borderRadius: 44,
        borderWidth: 3,
        borderColor: theme.colors.surfaceSubtle,
    },
    avatarFallback: {
        width: 88,
        height: 88,
        borderRadius: 44,
        backgroundColor: theme.colors.surfaceSubtle,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: theme.colors.border,
    },
    avatarFallbackText: {
        color: theme.colors.textPrimary,
        fontSize: 34,
        fontWeight: '800',
    },
    cameraBadge: {
        position: 'absolute',
        bottom: 0,
        right: 0,
        width: 28,
        height: 28,
        borderRadius: 14,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 2,
        borderColor: theme.colors.surface,
    },
    displayName: {
        fontSize: 20,
        lineHeight: 28,
        fontWeight: '800',
        color: theme.colors.textPrimary,
        textAlign: 'center',
        letterSpacing: -0.2,
        paddingBottom: 2,
    },
    designationText: {
        fontSize: 13,
        fontWeight: '500',
        color: theme.colors.textSecondary,
        marginTop: 2,
        marginBottom: theme.spacing.md,
        textAlign: 'center',
    },
    badgeRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: theme.spacing.xs + 4,
    },
    codeBadge: {
        backgroundColor: theme.colors.surfaceSubtle,
        paddingHorizontal: theme.spacing.md,
        paddingVertical: theme.spacing.xs,
        borderRadius: theme.borderRadius.sm,
        borderWidth: 1,
        borderColor: theme.colors.border,
    },
    codeBadgeText: {
        color: theme.colors.textPrimary,
        fontSize: 11,
        fontWeight: '700',
        letterSpacing: 0.5,
    },
    sectionHeaderTitle: {
        fontSize: 13,
        fontWeight: '700',
        textTransform: 'uppercase',
        letterSpacing: 0.6,
        color: theme.colors.textSecondary,
        marginBottom: theme.spacing.xs + 2,
        marginLeft: theme.spacing.xs,
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
        paddingVertical: theme.spacing.xs,
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
    infoTextGroup: {
        flex: 1,
        marginLeft: theme.spacing.md,
    },
    infoLabel: {
        fontSize: 11,
        fontWeight: '500',
        color: theme.colors.textSecondary,
    },
    infoValue: {
        fontSize: 14,
        fontWeight: '600',
        color: theme.colors.textPrimary,
        marginTop: 1,
    },
    divider: {
        height: 1,
        backgroundColor: theme.colors.border,
        marginVertical: theme.spacing.xs + 2,
    },
    logoutBtn: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: theme.colors.status.dangerSubtle,
        borderWidth: 1,
        borderColor: theme.colors.status.dangerBorder,
        minHeight: 48,
        paddingVertical: 12,
        borderRadius: theme.borderRadius.lg,
        marginTop: theme.spacing.xs,
    },
    logoutBtnText: {
        color: theme.colors.status.danger,
        fontWeight: '700',
        fontSize: 14,
        marginLeft: theme.spacing.sm,
    },
}));
