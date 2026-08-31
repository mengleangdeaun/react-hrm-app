import React, { useState, useEffect } from 'react';
import {
    View,
    TextInput,
    TouchableOpacity,
    Alert,
    Image,
    ScrollView,
    ActivityIndicator,
} from 'react-native';
import { AppText as Text } from '../../components/AppText';
import { StyleSheet, useUnistyles } from 'react-native-unistyles';
import { useQueryClient } from '@tanstack/react-query';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import { activityApi, OFFICIAL_ACTIVITY_TYPES } from '../../api/activity';
import { useAppTheme } from '../../context/ThemeContext';
import { AppShell } from '../../components/common/AppShell';
import { HeaderIconButton } from '../../components/common/AppHeader';
import {
    Camera,
    Image as ImageIcon,
    MapPin,
    Check,
    X,
    Wrench,
    Package,
    Building2,
    MessageSquare,
    GraduationCap,
    Headset,
    MoreHorizontal,
    ChevronRight,
    History,
} from 'lucide-react-native';

import { Platform } from 'react-native';

const CATEGORY_ICONS: Record<string, any> = {
    'Sale Outdoor': MapPin,
    'Site Visit': Building2,
    'Meeting / Discussion': MessageSquare,
    'Delivery / Collection': Package,
    'On-Site Service': Wrench,
    'Training': GraduationCap,
    'Support': Headset,
    'Other': MoreHorizontal,
};

import { useTranslation } from '../../context/LanguageContext';

export const CreateActivityScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
    const { isDark } = useAppTheme();
    const { t } = useTranslation();
    const { theme } = useUnistyles();
    const styles = stylesheet;
    const queryClient = useQueryClient();

    // Wizard Step
    const [currentStep, setCurrentStep] = useState<number>(1);

    // Form Data
    const [selectedCategory, setSelectedCategory] = useState<string>('');
    const [attachments, setAttachments] = useState<{ uri: string; name?: string; type?: string }[]>([]);
    const [comment, setComment] = useState<string>('');

    // GPS Location
    const [location, setLocation] = useState<{ lat?: number; lng?: number; address?: string } | null>(null);
    const [isLocating, setIsLocating] = useState<boolean>(false);
    const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

    useEffect(() => {
        captureGpsLocation();
    }, []);

    const captureGpsLocation = async () => {
        setIsLocating(true);
        try {
            const { status } = await Location.requestForegroundPermissionsAsync();
            if (status !== 'granted') {
                setLocation({ address: t('loc_permission_denied', 'Location permission denied') });
                return;
            }

            const currentLoc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
            const { latitude, longitude } = currentLoc.coords;

            let addressName = `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`;
            try {
                const [reversed] = await Location.reverseGeocodeAsync({ latitude, longitude });
                if (reversed) {
                    const parts = [reversed.name, reversed.street, reversed.subregion || reversed.city].filter(Boolean);
                    if (parts.length > 0) addressName = parts.join(', ');
                }
            } catch (e) {
                // Fallback coordinates
            }

            setLocation({
                lat: latitude,
                lng: longitude,
                address: addressName,
            });
        } catch (err) {
            console.warn('Location capture error:', err);
            setLocation({ address: t('gps_loc_unavailable', 'GPS Location unavailable') });
        } finally {
            setIsLocating(false);
        }
    };

    const takePhoto = async () => {
        const permission = await ImagePicker.requestCameraPermissionsAsync();
        if (!permission.granted) {
            Alert.alert(t('permission_required', 'Permission Required'), t('camera_access_photo_proof', 'Camera access is required to take photo proof.'));
            return;
        }

        const result = await ImagePicker.launchCameraAsync({
            quality: 0.8,
            allowsEditing: false,
        });

        if (!result.canceled && result.assets && result.assets.length > 0) {
            const asset = result.assets[0];
            const ext = asset.uri.split('.').pop()?.toLowerCase() || 'jpg';
            const cleanExt = ext === 'png' ? 'png' : 'jpg';
            const name = asset.fileName || `photo_${Date.now()}.${cleanExt}`;
            const type = asset.mimeType || `image/${cleanExt}`;

            setAttachments((prev) => [...prev, { uri: asset.uri, name, type }]);
        }
    };

    const pickImage = async () => {
        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ['images'],
            allowsMultipleSelection: true,
            quality: 0.8,
        });

        if (!result.canceled && result.assets) {
            const newAssets = result.assets.map((asset: any, idx: number) => {
                const ext = asset.uri.split('.').pop()?.toLowerCase() || 'jpg';
                const cleanExt = ext === 'png' ? 'png' : 'jpg';
                const name = asset.fileName || `photo_${Date.now()}_${idx}.${cleanExt}`;
                const type = asset.mimeType || `image/${cleanExt}`;
                return { uri: asset.uri, name, type };
            });
            setAttachments((prev) => [...prev, ...newAssets]);
        }
    };

    const removeAttachment = (index: number) => {
        setAttachments((prev) => prev.filter((_, i) => i !== index));
    };

    const handleSubmit = async () => {
        if (!selectedCategory) {
            Alert.alert(t('required', 'Required'), t('select_activity_category', 'Please select an activity category.'));
            return;
        }
        if (attachments.length === 0) {
            Alert.alert(t('photo_proof_required', 'Photo Proof Required'), t('attach_photo_proof_alert', 'Please attach at least 1 photo for activity proof.'));
            return;
        }

        setIsSubmitting(true);
        try {
            await activityApi.submitActivity({
                activity_type: selectedCategory,
                comment,
                latitude: location?.lat,
                longitude: location?.lng,
                location_name: location?.address,
                attachments,
            });

            await queryClient.invalidateQueries({ queryKey: ['activities'] });

            if (Platform.OS === 'web') {
                window.alert(t('activity_submitted_msg', 'Activity Submitted: Your work log entry has been submitted.'));
                navigation.replace('ActivityList');
            } else {
                Alert.alert(t('activity_submitted', 'Activity Submitted'), t('work_log_submitted_desc', 'Your work log entry has been submitted.'), [
                    { text: t('ok', 'OK'), onPress: () => navigation.replace('ActivityList') },
                ]);
            }
        } catch (error: any) {
            Alert.alert(t('submission_error', 'Submission Error'), error?.message || t('fail_submit_activity', 'Failed to submit activity report.'));
        } finally {
            setIsSubmitting(false);
        }
    };

    const headerRight = (
        <HeaderIconButton
            icon={<History color={theme.colors.brand} size={20} />}
            onPress={() => navigation.replace('ActivityList')}
            accessibilityLabel="Activity history"
        />
    );

    return (
        <AppShell title={t('log_activity', 'Log Activity')} onBack={() => navigation.goBack()} headerRight={headerRight}>
            {/* Step Progress Bar */}
            <View style={styles.stepHeaderRow}>
                <Text style={styles.stepProgressText}>{t('step_x_of_y', `Step ${currentStep} of 3`)}</Text>
            </View>
            <View style={styles.progressBarBg}>
                <View style={[styles.progressBarFill, { width: `${(currentStep / 3) * 100}%` }]} />
            </View>

            {/* STEP 1: Select Category (2-Column Grid Layout) */}
            {currentStep === 1 && (
                <View>
                    <Text style={styles.stepTitle}>{t('step_1_title', '1. Select Activity Type')}</Text>
                    <Text style={styles.stepSubtitle}>{t('step_1_subtitle', 'Choose the category that best describes your task.')}</Text>

                    <View style={styles.gridContainer}>
                        {OFFICIAL_ACTIVITY_TYPES.map((cat) => {
                            const CatIcon = CATEGORY_ICONS[cat.id] || MoreHorizontal;
                            const isSelected = selectedCategory === cat.id;
                            return (
                                <TouchableOpacity
                                    key={cat.id}
                                    style={[styles.gridCardTile, isSelected && styles.gridCardTileSelected]}
                                    onPress={() => setSelectedCategory(cat.id)}
                                    activeOpacity={0.8}
                                >
                                    <View style={[styles.gridIconBg, isSelected && styles.gridIconBgSelected]}>
                                        <CatIcon color={isSelected ? '#FFFFFF' : theme.colors.primary} size={22} />
                                    </View>
                                    <Text
                                        style={[styles.gridCardLabel, isSelected && styles.gridCardLabelSelected]}
                                        numberOfLines={2}
                                    >
                                        {cat.label}
                                    </Text>
                                    {isSelected && (
                                        <View style={styles.gridCheckBadge}>
                                            <Check color="#FFFFFF" size={12} />
                                        </View>
                                    )}
                                </TouchableOpacity>
                            );
                        })}
                    </View>

                    <TouchableOpacity
                        style={[styles.nextBtn, !selectedCategory && styles.nextBtnDisabled]}
                        disabled={!selectedCategory}
                        onPress={() => setCurrentStep(2)}
                        activeOpacity={0.85}
                    >
                        <Text style={styles.nextBtnText}>{t('continue_to_photo_proof', 'Continue to Photo Proof')}</Text>
                        <ChevronRight color="#FFFFFF" size={18} />
                    </TouchableOpacity>
                </View>
            )}

            {/* STEP 2: Photo Proof Capture */}
            {currentStep === 2 && (
                <View>
                    <Text style={styles.stepTitle}>{t('step_2_title', '2. Attach Photo Proof')}</Text>
                    <Text style={styles.stepSubtitle}>{t('step_2_subtitle', 'Capture or upload photos to verify your activity.')}</Text>

                    <View style={styles.photoPickerRow}>
                        <TouchableOpacity style={styles.pickerTile} onPress={takePhoto} activeOpacity={0.8}>
                            <Camera color={theme.colors.primary} size={28} />
                            <Text style={styles.pickerTileText}>{t('take_camera_photo', 'Take Camera Photo')}</Text>
                        </TouchableOpacity>

                        <TouchableOpacity style={styles.pickerTile} onPress={pickImage} activeOpacity={0.8}>
                            <ImageIcon color={theme.colors.status.success} size={28} />
                            <Text style={styles.pickerTileText}>{t('choose_from_gallery', 'Choose from Gallery')}</Text>
                        </TouchableOpacity>
                    </View>

                    {/* Thumbnail Grid */}
                    {attachments.length > 0 && (
                        <View style={styles.previewSection}>
                            <Text style={styles.previewTitle}>{t('attached_photos_count', `Attached Photos (${attachments.length})`)}</Text>
                            <View style={styles.thumbnailGrid}>
                                {attachments.map((item, index) => (
                                    <View key={index} style={styles.thumbnailWrapper}>
                                        <Image source={{ uri: item.uri }} style={styles.thumbnailImg} />
                                        <TouchableOpacity
                                            style={styles.removeBtn}
                                            onPress={() => removeAttachment(index)}
                                        >
                                            <X color="#FFFFFF" size={12} />
                                        </TouchableOpacity>
                                    </View>
                                ))}
                            </View>
                        </View>
                    )}

                    <View style={styles.btnRow}>
                        <TouchableOpacity
                            style={styles.backStepBtn}
                            onPress={() => setCurrentStep(1)}
                            activeOpacity={0.8}
                        >
                            <Text style={styles.backStepBtnText}>{t('back', 'Back')}</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={[styles.nextBtnFlex, attachments.length === 0 && styles.nextBtnDisabled]}
                            disabled={attachments.length === 0}
                            onPress={() => setCurrentStep(3)}
                            activeOpacity={0.85}
                        >
                            <Text style={styles.nextBtnText}>{t('continue_to_notes', 'Continue to Notes')}</Text>
                            <ChevronRight color="#FFFFFF" size={18} />
                        </TouchableOpacity>
                    </View>
                </View>
            )}

            {/* STEP 3: Notes & Location Tagging */}
            {currentStep === 3 && (
                <View>
                    <Text style={styles.stepTitle}>{t('step_3_title', '3. Location & Activity Notes')}</Text>
                    <Text style={styles.stepSubtitle}>{t('step_3_subtitle', 'Review GPS location tag and add descriptive notes.')}</Text>

                    {/* GPS Tagged Location Banner */}
                    <View style={styles.locationCard}>
                        <MapPin color={theme.colors.primary} size={20} />
                        <View style={styles.locationTextGroup}>
                            <Text style={styles.locationCardTitle}>{t('verified_location_tag', 'Verified Location Tag')}</Text>
                            <Text style={styles.locationCardSub} numberOfLines={2}>
                                {isLocating ? t('resolving_gps_coords', 'Resolving GPS coordinates...') : location?.address || t('location_tagged', 'Location Tagged')}
                            </Text>
                        </View>
                        {isLocating && <ActivityIndicator size="small" color={theme.colors.primary} />}
                    </View>

                    {/* Notes / Comment Text Input */}
                    <Text style={styles.inputLabel}>{t('activity_notes_details', 'Activity Notes / Details')}</Text>
                    <TextInput
                        style={[styles.input, styles.textArea]}
                        value={comment}
                        onChangeText={setComment}
                        placeholder={t('describe_work_placeholder', 'Describe work completed, client feedback, or tasks performed...')}
                        placeholderTextColor={theme.colors.textSecondary}
                        multiline
                        numberOfLines={4}
                    />

                    <View style={styles.btnRow}>
                        <TouchableOpacity
                            style={styles.backStepBtn}
                            onPress={() => setCurrentStep(2)}
                            activeOpacity={0.8}
                        >
                            <Text style={styles.backStepBtnText}>{t('back', 'Back')}</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={styles.submitBtnFlex}
                            onPress={handleSubmit}
                            disabled={isSubmitting}
                            activeOpacity={0.85}
                        >
                            {isSubmitting ? (
                                <ActivityIndicator color="#FFFFFF" />
                            ) : (
                                <Text style={styles.submitBtnText}>{t('submit_activity', 'Submit Activity')}</Text>
                            )}
                        </TouchableOpacity>
                    </View>
                </View>
            )}
        </AppShell>
    );
};

const stylesheet = StyleSheet.create((theme) => ({
    headerIconBtnSubtle: {
        width: 36,
        height: 36,
        borderRadius: theme.borderRadius.full,
        backgroundColor: theme.colors.surfaceSubtle,
        borderWidth: 1,
        borderColor: theme.colors.border,
        justifyContent: 'center',
        alignItems: 'center',
    },
    stepHeaderRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 6,
    },
    stepProgressText: {
        fontSize: 12,
        fontWeight: '700',
        color: theme.colors.primary,
    },
    progressBarBg: {
        height: 4,
        backgroundColor: theme.colors.surfaceSubtle,
        borderRadius: theme.borderRadius.full,
        marginBottom: theme.spacing.lg,
        overflow: 'hidden',
    },
    progressBarFill: {
        height: '100%',
        backgroundColor: theme.colors.primary,
        borderRadius: theme.borderRadius.full,
    },
    stepTitle: {
        fontSize: 17,
        fontWeight: '800',
        color: theme.colors.textPrimary,
        marginBottom: 2,
    },
    stepSubtitle: {
        fontSize: 12,
        color: theme.colors.textSecondary,
        marginBottom: theme.spacing.md,
    },
    categoryTile: {
        backgroundColor: theme.colors.surface,
        borderRadius: theme.borderRadius.lg,
        padding: theme.spacing.md,
        marginBottom: theme.spacing.sm + 2,
        flexDirection: 'row',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: theme.colors.border,
        ...theme.shadows.sm,
    },
    categoryTileSelected: {
        borderColor: theme.colors.primary,
        backgroundColor: theme.colors.surfaceSubtle,
    },
    categoryIconBg: {
        width: 40,
        height: 40,
        borderRadius: theme.borderRadius.md,
        backgroundColor: theme.colors.surfaceSubtle,
        justifyContent: 'center',
        alignItems: 'center',
    },
    categoryIconBgSelected: {
        backgroundColor: theme.colors.primary,
    },
    categoryTextGroup: {
        flex: 1,
        marginLeft: theme.spacing.sm + 2,
    },
    categoryLabel: {
        fontSize: 14,
        fontWeight: '700',
        color: theme.colors.textPrimary,
    },
    categoryLabelSelected: {
        color: theme.colors.primary,
    },
    categoryDesc: {
        fontSize: 11,
        color: theme.colors.textSecondary,
        marginTop: 1,
    },
    checkBadge: {
        width: 20,
        height: 20,
        borderRadius: theme.borderRadius.full,
        backgroundColor: theme.colors.primary,
        justifyContent: 'center',
        alignItems: 'center',
    },
    photoPickerRow: {
        flexDirection: 'row',
        gap: theme.spacing.md,
        marginBottom: theme.spacing.lg,
    },
    pickerTile: {
        flex: 1,
        backgroundColor: theme.colors.surface,
        borderRadius: theme.borderRadius.lg,
        padding: theme.spacing.lg,
        alignItems: 'center',
        borderWidth: 1.5,
        borderColor: theme.colors.border,
        borderStyle: 'dashed',
        ...theme.shadows.sm,
    },
    pickerTileText: {
        color: theme.colors.textPrimary,
        fontSize: 12,
        fontWeight: '700',
        marginTop: theme.spacing.sm,
        textAlign: 'center',
    },
    previewSection: {
        marginBottom: theme.spacing.lg,
    },
    previewTitle: {
        fontSize: 12,
        fontWeight: '700',
        color: theme.colors.textSecondary,
        marginBottom: theme.spacing.sm,
    },
    thumbnailGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: theme.spacing.sm + 2,
    },
    thumbnailWrapper: {
        position: 'relative',
    },
    thumbnailImg: {
        width: 76,
        height: 76,
        borderRadius: theme.borderRadius.md,
    },
    removeBtn: {
        position: 'absolute',
        top: -6,
        right: -6,
        width: 20,
        height: 20,
        borderRadius: theme.borderRadius.full,
        backgroundColor: theme.colors.status.danger,
        justifyContent: 'center',
        alignItems: 'center',
    },
    locationCard: {
        backgroundColor: theme.colors.surface,
        borderRadius: theme.borderRadius.lg,
        padding: theme.spacing.md,
        flexDirection: 'row',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: theme.colors.border,
        marginBottom: theme.spacing.md,
        ...theme.shadows.sm,
    },
    locationTextGroup: {
        flex: 1,
        marginLeft: theme.spacing.sm + 2,
    },
    locationCardTitle: {
        fontSize: 11,
        fontWeight: '700',
        color: theme.colors.textSecondary,
        textTransform: 'uppercase',
    },
    locationCardSub: {
        fontSize: 13,
        fontWeight: '600',
        color: theme.colors.textPrimary,
        marginTop: 2,
    },
    inputLabel: {
        fontSize: 12,
        fontWeight: '700',
        color: theme.colors.textSecondary,
        marginBottom: theme.spacing.xs + 2,
    },
    input: {
        backgroundColor: theme.colors.surface,
        borderRadius: theme.borderRadius.md,
        borderWidth: 1,
        borderColor: theme.colors.border,
        color: theme.colors.textPrimary,
        paddingHorizontal: theme.spacing.md,
        fontSize: 13,
    },
    textArea: {
        height: 100,
        textAlignVertical: 'top',
        paddingTop: theme.spacing.md,
        marginBottom: theme.spacing.lg,
    },
    btnRow: {
        flexDirection: 'row',
        gap: theme.spacing.md,
        marginTop: theme.spacing.sm,
    },
    backStepBtn: {
        backgroundColor: theme.colors.surfaceSubtle,
        height: 48,
        paddingHorizontal: theme.spacing.lg,
        borderRadius: theme.borderRadius.md,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: theme.colors.border,
    },
    backStepBtnText: {
        color: theme.colors.textPrimary,
        fontWeight: '700',
        fontSize: 14,
    },
    nextBtn: {
        backgroundColor: theme.colors.primary,
        height: 48,
        borderRadius: theme.borderRadius.md,
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: theme.spacing.sm,
        ...theme.shadows.sm,
    },
    nextBtnFlex: {
        flex: 1,
        backgroundColor: theme.colors.primary,
        height: 48,
        borderRadius: theme.borderRadius.md,
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        ...theme.shadows.sm,
    },
    nextBtnDisabled: {
        opacity: 0.5,
    },
    nextBtnText: {
        color: '#FFFFFF',
        fontWeight: '700',
        fontSize: 14,
        marginRight: theme.spacing.xs,
    },
    submitBtnFlex: {
        flex: 1,
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
    gridContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
        marginBottom: theme.spacing.sm,
    },
    gridCardTile: {
        width: '48%',
        backgroundColor: theme.colors.surface,
        borderRadius: theme.borderRadius.lg,
        paddingVertical: theme.spacing.lg,
        paddingHorizontal: theme.spacing.xs,
        marginBottom: theme.spacing.md,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1.5,
        borderColor: theme.colors.border,
        position: 'relative',
        ...theme.shadows.sm,
    },
    gridCardTileSelected: {
        borderColor: theme.colors.primary,
        backgroundColor: theme.colors.surfaceSubtle,
        ...theme.shadows.md,
    },
    gridIconBg: {
        width: 48,
        height: 48,
        borderRadius: theme.borderRadius.md,
        backgroundColor: theme.colors.surfaceSubtle,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: theme.spacing.sm,
    },
    gridIconBgSelected: {
        backgroundColor: theme.colors.primary,
    },
    gridCardLabel: {
        fontSize: 12,
        fontWeight: '700',
        color: theme.colors.textPrimary,
        textAlign: 'center',
        paddingHorizontal: 2,
    },
    gridCardLabelSelected: {
        color: theme.colors.primary,
        fontWeight: '800',
    },
    gridCheckBadge: {
        position: 'absolute',
        top: 8,
        right: 8,
        width: 20,
        height: 20,
        borderRadius: theme.borderRadius.full,
        backgroundColor: theme.colors.primary,
        justifyContent: 'center',
        alignItems: 'center',
    },
}));
