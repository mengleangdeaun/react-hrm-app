import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
    View,
    TextInput,
    TouchableOpacity,
    Alert,
    ScrollView,
    ActivityIndicator,
    Modal,
    Platform,
    useWindowDimensions,
    Image,
    Animated,
    PanResponder,
    Easing,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppText as Text } from '../../components/AppText';
import { StyleSheet, useUnistyles } from 'react-native-unistyles';
import { useQueryClient } from '@tanstack/react-query';
import * as ImagePicker from 'expo-image-picker';
import { Image as ExpoImage } from 'expo-image';
import * as Location from 'expo-location';
import { activityApi, OFFICIAL_ACTIVITY_TYPES } from '../../api/activity';
import {
    optimizeImageForUpload,
    optimizeImagesBatch,
    cleanupTempImages,
    formatFileSize,
} from '../../utils/imageOptimizer';
import { reverseGeocodeLocation } from '../../utils/reverseGeocode';
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
    RotateCw,
} from 'lucide-react-native';
import { useTranslation } from '../../context/LanguageContext';

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

export const CreateActivityScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
    const insets = useSafeAreaInsets();
    const { width: screenWidth, height: screenHeight } = useWindowDimensions();
    const { isDark } = useAppTheme();
    const { t } = useTranslation();
    const { theme } = useUnistyles();
    const styles = stylesheet;
    const queryClient = useQueryClient();

    // Wizard Step
    const [currentStep, setCurrentStep] = useState<number>(1);

    // Form Data
    const [selectedCategory, setSelectedCategory] = useState<string>('');
    const [attachments, setAttachments] = useState<{
        id?: string;
        uri: string;
        name?: string;
        type?: string;
        size?: number;
        width?: number;
        height?: number;
    }[]>([]);
    const [comment, setComment] = useState<string>('');

    // GPS Location
    const [location, setLocation] = useState<{ lat?: number; lng?: number; address?: string } | null>(null);
    const [isLocating, setIsLocating] = useState<boolean>(false);
    const [isOptimizing, setIsOptimizing] = useState<boolean>(false);
    const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
    const [submittingStatus, setSubmittingStatus] = useState<string>('');
    const [previewModalImage, setPreviewModalImage] = useState<string | null>(null);

    const modalTranslateY = useRef(new Animated.Value(0)).current;

    const closePreviewModal = useCallback(() => {
        Animated.timing(modalTranslateY, {
            toValue: screenHeight,
            duration: 220,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: true,
        }).start(() => {
            setPreviewModalImage(null);
            modalTranslateY.setValue(0);
        });
    }, [screenHeight, modalTranslateY]);

    const panResponder = useRef(
        PanResponder.create({
            onStartShouldSetPanResponder: () => false,
            onMoveShouldSetPanResponder: (_: any, gestureState: any) => {
                return gestureState.dy > 6 && Math.abs(gestureState.dy) > Math.abs(gestureState.dx) * 1.3;
            },
            onPanResponderMove: (_: any, gestureState: any) => {
                if (gestureState.dy > 0) {
                    modalTranslateY.setValue(gestureState.dy);
                }
            },
            onPanResponderRelease: (_: any, gestureState: any) => {
                if (gestureState.dy > 90 || gestureState.vy > 0.5) {
                    closePreviewModal();
                } else {
                    Animated.spring(modalTranslateY, {
                        toValue: 0,
                        friction: 8,
                        tension: 45,
                        useNativeDriver: true,
                    }).start();
                }
            },
            onPanResponderTerminate: () => {
                Animated.spring(modalTranslateY, {
                    toValue: 0,
                    friction: 8,
                    tension: 45,
                    useNativeDriver: true,
                }).start();
            },
        })
    ).current;

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

            // Resolve human-readable address via OpenStreetMap Nominatim / Native Geocoder
            // GUARANTEE: Never stores raw lat/lng numbers as the location name string!
            const resolvedName = await reverseGeocodeLocation(latitude, longitude);

            setLocation({
                lat: latitude,
                lng: longitude,
                address: resolvedName,
            });
        } catch (err) {
            console.warn('Location capture error:', err);
            setLocation({ address: t('gps_loc_unavailable', 'GPS Location unavailable') });
        } finally {
            setIsLocating(false);
        }
    };

    const takePhoto = async () => {
        try {
            const permission = await ImagePicker.requestCameraPermissionsAsync();
            if (!permission.granted) {
                Alert.alert(
                    t('permission_required', 'Permission Required'),
                    t('camera_access_photo_proof', 'Camera access is required to take photo proof.')
                );
                return;
            }

            const result = await ImagePicker.launchCameraAsync({
                quality: 0.85,
                allowsEditing: false,
            });

            if (!result.canceled && result.assets && result.assets.length > 0) {
                const asset = result.assets[0];
                const ext = asset.uri.split('.').pop()?.toLowerCase() || 'jpg';
                const cleanExt = ext === 'png' ? 'png' : 'jpg';
                const tempId = `photo_${Date.now()}`;
                const initialItem = {
                    id: tempId,
                    uri: asset.uri,
                    name: asset.fileName || `${tempId}.${cleanExt}`,
                    type: asset.mimeType || `image/${cleanExt}`,
                    size: asset.fileSize,
                    width: asset.width,
                    height: asset.height,
                };

                // 1. Immediately show thumbnail to user!
                setAttachments((prev) => [...prev, initialItem]);

                // 2. Compress image in background and update item
                setIsOptimizing(true);
                try {
                    const opt = await optimizeImageForUpload(
                        asset.uri,
                        1280,
                        0.70,
                        asset.width && asset.height ? { width: asset.width, height: asset.height } : undefined
                    );
                    setAttachments((prev) =>
                        prev.map((item: any) =>
                            item.id === tempId || item.uri === asset.uri
                                ? {
                                      ...item,
                                      uri: opt.uri,
                                      name: opt.name,
                                      type: opt.type,
                                      size: opt.size,
                                      width: opt.width,
                                      height: opt.height,
                                  }
                                : item
                        )
                    );
                } catch (e) {
                    console.warn('Image optimization error (retaining original):', e);
                } finally {
                    setIsOptimizing(false);
                }
            }
        } catch (err) {
            console.warn('Camera capture error:', err);
            setIsOptimizing(false);
        }
    };

    const pickImage = async () => {
        try {
            const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
            if (status !== 'granted') {
                Alert.alert(
                    t('permission_required', 'Permission Required'),
                    t('gallery_permission_desc', 'Photo library permission is required to attach photos.')
                );
                return;
            }

            const result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ['images'],
                allowsMultipleSelection: true,
                quality: 0.85,
            });

            if (!result.canceled && result.assets && result.assets.length > 0) {
                const newItems = result.assets.map((asset: any, idx: number) => {
                    const ext = asset.uri.split('.').pop()?.toLowerCase() || 'jpg';
                    const cleanExt = ext === 'png' ? 'png' : 'jpg';
                    const tempId = `gallery_${Date.now()}_${idx}`;
                    return {
                        id: tempId,
                        uri: asset.uri,
                        name: asset.fileName || `${tempId}.${cleanExt}`,
                        type: asset.mimeType || `image/${cleanExt}`,
                        size: asset.fileSize,
                        width: asset.width,
                        height: asset.height,
                    };
                });

                // 1. Immediately show thumbnails to user!
                setAttachments((prev) => [...prev, ...newItems]);

                // 2. Compress images in background and update items
                setIsOptimizing(true);
                try {
                    const toOptimize = newItems.map((item: any) => ({
                        uri: item.uri,
                        name: item.name,
                        type: item.type,
                        width: item.width,
                        height: item.height,
                    }));

                    const optimizedList = await optimizeImagesBatch(toOptimize);
                    setAttachments((prev) =>
                        prev.map((item: any) => {
                            const matchIndex = newItems.findIndex((n: any) => n.id === item.id || n.uri === item.uri);
                            if (matchIndex !== -1 && optimizedList[matchIndex]) {
                                const opt = optimizedList[matchIndex];
                                return {
                                    ...item,
                                    uri: opt.uri,
                                    name: opt.name,
                                    type: opt.type,
                                    size: opt.size,
                                    width: opt.width,
                                    height: opt.height,
                                };
                            }
                            return item;
                        })
                    );
                } catch (e) {
                    console.warn('Batch optimize error, retaining raw assets:', e);
                } finally {
                    setIsOptimizing(false);
                }
            }
        } catch (err) {
            console.warn('Gallery pick error:', err);
            setIsOptimizing(false);
        }
    };

    const removeAttachment = (index: number) => {
        setAttachments((prev) => prev.filter((_: any, i: number) => i !== index));
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
        setSubmittingStatus(t('optimizing_photos', 'Verifying photo compression...'));
        let optimizedToCleanup: string[] = [];

        try {
            // 1. Ensure all images are compressed before upload
            const optimized = await optimizeImagesBatch(
                attachments,
                (curr, total) => {
                    setSubmittingStatus(
                        t('optimizing_photo_count', `Optimizing photo ${curr} of ${total}...`)
                    );
                }
            );
            optimizedToCleanup = optimized.map((o) => o.uri);

            // 2. Submit optimized payload with human-readable location name
            setSubmittingStatus(t('uploading_activity', 'Uploading activity report...'));

            const safeLocationName = location?.address &&
                !location.address.includes('unavailable') &&
                !location.address.includes('denied')
                    ? location.address
                    : undefined;

            await activityApi.submitActivity({
                activity_type: selectedCategory,
                comment,
                latitude: location?.lat,
                longitude: location?.lng,
                location_name: safeLocationName,
                attachments: optimized,
            });

            await queryClient.invalidateQueries({ queryKey: ['activities'] });

            // 3. Purge temp cache files
            cleanupTempImages(optimizedToCleanup).catch(() => {});

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
            setSubmittingStatus('');
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
                <Text style={styles.stepProgressText}>
                    {t('step_x_of_y', `Step ${currentStep} of 3`, { step: currentStep, total: 3, current: currentStep })}
                </Text>
                <Text style={styles.stepPhaseText}>
                    {currentStep === 1
                        ? t('step_type', 'Type')
                        : currentStep === 2
                        ? t('step_photos', 'Photos')
                        : t('step_finalize', 'Finalize')}
                </Text>
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
                                        <CatIcon
                                            color={isSelected ? '#FFFFFF' : theme.colors.textSecondary}
                                            size={22}
                                            strokeWidth={2}
                                        />
                                    </View>
                                    <Text
                                        style={[styles.gridCardLabel, isSelected && styles.gridCardLabelSelected]}
                                        numberOfLines={2}
                                    >
                                        {cat.label}
                                    </Text>
                                    {isSelected && (
                                        <View style={styles.gridCheckBadge}>
                                            <Check color="#FFFFFF" size={12} strokeWidth={2.5} />
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
                            <View style={styles.previewHeaderRow}>
                                <Text style={styles.previewTitle}>
                                    {t('attached_photos_count', `Attached Photos (${attachments.length})`)}
                                </Text>
                                {isOptimizing && (
                                    <View style={styles.optimizingBadge}>
                                        <ActivityIndicator size="small" color={theme.colors.primary} />
                                        <Text style={styles.optimizingBadgeText}>{t('compressing', 'Compressing...')}</Text>
                                    </View>
                                )}
                            </View>
                            <View style={styles.thumbnailGrid}>
                                {attachments.map((item: any, index: number) => (
                                    <View key={item.id || `${item.uri}-${index}`} style={styles.thumbnailWrapper}>
                                        <TouchableOpacity
                                            style={styles.thumbnailTouch}
                                            activeOpacity={0.85}
                                            onPress={() => {
                                                modalTranslateY.setValue(0);
                                                setPreviewModalImage(item.uri);
                                            }}
                                        >
                                            <Image
                                                source={{ uri: item.uri }}
                                                style={styles.thumbnailImg}
                                                resizeMode="cover"
                                            />
                                        </TouchableOpacity>

                                        {item.size ? (
                                            <View style={styles.thumbnailSizeBadge} pointerEvents="none">
                                                <Text style={styles.thumbnailSizeText}>{formatFileSize(item.size)}</Text>
                                            </View>
                                        ) : null}

                                        <TouchableOpacity
                                            style={styles.removeBtn}
                                            onPress={() => removeAttachment(index)}
                                            activeOpacity={0.8}
                                            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                                            accessibilityLabel="Remove photo"
                                        >
                                            <X color="#FFFFFF" size={12} strokeWidth={2.5} />
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
                            style={[styles.nextBtnFlex, (attachments.length === 0 || isOptimizing) && styles.nextBtnDisabled]}
                            disabled={attachments.length === 0 || isOptimizing}
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
                        <View style={styles.locationIconBox}>
                            <MapPin color={theme.colors.primary} size={18} />
                        </View>
                        <View style={styles.locationTextGroup}>
                            <Text style={styles.locationCardTitle}>{t('verified_location_tag', 'Verified Location Tag')}</Text>
                            <Text style={styles.locationCardSub} numberOfLines={2}>
                                {isLocating
                                    ? t('resolving_gps_coords', 'Resolving GPS location...')
                                    : location?.address || t('location_tagged', 'Location Tagged')}
                            </Text>
                        </View>
                        <TouchableOpacity
                            style={styles.locationRefreshBtn}
                            onPress={captureGpsLocation}
                            disabled={isLocating}
                            activeOpacity={0.7}
                            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                            accessibilityLabel="Refresh GPS location"
                        >
                            {isLocating ? (
                                <ActivityIndicator size="small" color={theme.colors.primary} />
                            ) : (
                                <RotateCw color={theme.colors.textSecondary} size={15} />
                            )}
                        </TouchableOpacity>
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
                                <View style={styles.submittingStatusRow}>
                                    <ActivityIndicator color="#FFFFFF" size="small" />
                                    <Text style={styles.submittingStatusText} numberOfLines={1}>
                                        {submittingStatus || t('submitting', 'Submitting...')}
                                    </Text>
                                </View>
                            ) : (
                                <Text style={styles.submitBtnText}>{t('submit_activity', 'Submit Activity')}</Text>
                            )}
                        </TouchableOpacity>
                    </View>
                </View>
            )}

            {/* Thumbnail Preview Modal */}
            <Modal
                visible={Boolean(previewModalImage)}
                transparent
                animationType="fade"
                onRequestClose={closePreviewModal}
            >
                <View style={styles.previewModalOverlay}>
                    {/* Native-accelerated Backdrop Fade */}
                    <Animated.View
                        style={[
                            StyleSheet.absoluteFillObject,
                            {
                                backgroundColor: '#000000',
                                opacity: modalTranslateY.interpolate({
                                    inputRange: [0, 220],
                                    outputRange: [0.96, 0.25],
                                    extrapolate: 'clamp',
                                }),
                            },
                        ]}
                        pointerEvents="none"
                    />

                    <Animated.View
                        {...panResponder.panHandlers}
                        style={{
                            flex: 1,
                            width: '100%',
                            justifyContent: 'center',
                            alignItems: 'center',
                            transform: [
                                { translateY: modalTranslateY },
                                {
                                    scale: modalTranslateY.interpolate({
                                        inputRange: [0, 240],
                                        outputRange: [1, 0.90],
                                        extrapolate: 'clamp',
                                    }),
                                },
                            ],
                        }}
                    >
                        {/* Top Bar: Close Button (Top-Right) */}
                        <View style={[styles.previewModalTopBar, { top: Math.max(48, insets.top + 10) }]}>
                            <View />
                            <TouchableOpacity
                                style={styles.previewModalCloseBtn}
                                onPress={closePreviewModal}
                                activeOpacity={0.8}
                                accessibilityLabel="Close photo preview"
                            >
                                <X color="#FFFFFF" size={20} strokeWidth={2.5} />
                            </TouchableOpacity>
                        </View>

                        {previewModalImage && (
                            <Image
                                source={{ uri: previewModalImage }}
                                style={{ width: screenWidth, height: Math.round(screenHeight * 0.72) }}
                                resizeMode="contain"
                            />
                        )}

                        {/* Bottom Close Button - Near Thumb (Aligned to Right) */}
                        <View style={[styles.previewModalBottomBar, { bottom: Math.max(28, insets.bottom + 12) }]}>
                            <TouchableOpacity
                                style={styles.previewModalBottomCloseBtn}
                                onPress={closePreviewModal}
                                activeOpacity={0.8}
                                accessibilityLabel="Close photo preview"
                            >
                                <X color="#FFFFFF" size={17} strokeWidth={2.5} />
                                <Text style={styles.previewModalBottomCloseText}>{t('close', 'Close')}</Text>
                            </TouchableOpacity>
                        </View>
                    </Animated.View>
                </View>
            </Modal>
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
    stepPhaseText: {
        fontSize: 12,
        fontWeight: '600',
        color: theme.colors.textSecondary,
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
    previewHeaderRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: theme.spacing.sm,
    },
    previewTitle: {
        fontSize: 12,
        fontWeight: '700',
        color: theme.colors.textSecondary,
    },
    optimizingBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: theme.colors.surfaceSubtle,
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: theme.borderRadius.full,
        borderWidth: 1,
        borderColor: theme.colors.border,
        gap: 6,
    },
    optimizingBadgeText: {
        fontSize: 11,
        fontWeight: '700',
        color: theme.colors.primary,
    },
    thumbnailGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: theme.spacing.md,
    },
    thumbnailWrapper: {
        position: 'relative',
        width: 80,
        height: 80,
        borderRadius: theme.borderRadius.md,
        backgroundColor: theme.colors.surfaceSubtle,
    },
    thumbnailTouch: {
        width: 80,
        height: 80,
        borderRadius: theme.borderRadius.md,
        overflow: 'hidden',
    },
    thumbnailImg: {
        width: 80,
        height: 80,
        borderRadius: theme.borderRadius.md,
        backgroundColor: theme.colors.surfaceSubtle,
        borderWidth: 1,
        borderColor: theme.colors.border,
    },
    thumbnailSizeBadge: {
        position: 'absolute',
        bottom: 4,
        left: 4,
        right: 4,
        backgroundColor: 'rgba(0, 0, 0, 0.65)',
        borderRadius: 4,
        paddingVertical: 2,
        paddingHorizontal: 4,
        alignItems: 'center',
    },
    thumbnailSizeText: {
        fontSize: 9,
        fontWeight: '700',
        color: '#FFFFFF',
    },
    removeBtn: {
        position: 'absolute',
        top: -6,
        right: -6,
        width: 22,
        height: 22,
        borderRadius: theme.borderRadius.full,
        backgroundColor: theme.colors.status.danger,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1.5,
        borderColor: theme.colors.surface,
        zIndex: 10,
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
    },
    locationIconBox: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: theme.colors.surfaceSubtle,
        borderWidth: 1,
        borderColor: theme.colors.border,
        justifyContent: 'center',
        alignItems: 'center',
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
    locationRefreshBtn: {
        width: 34,
        height: 34,
        borderRadius: 17,
        backgroundColor: theme.colors.surfaceSubtle,
        borderWidth: 1,
        borderColor: theme.colors.border,
        justifyContent: 'center',
        alignItems: 'center',
    },
    previewModalOverlay: {
        flex: 1,
        backgroundColor: '#000000',
        justifyContent: 'center',
        alignItems: 'center',
    },
    previewModalTopBar: {
        position: 'absolute',
        left: 20,
        right: 20,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        zIndex: 50,
    },
    previewModalCloseBtn: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: 'rgba(255, 255, 255, 0.2)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    previewModalBottomBar: {
        position: 'absolute',
        right: 20,
        flexDirection: 'row',
        alignItems: 'center',
        zIndex: 50,
    },
    previewModalBottomCloseBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(255, 255, 255, 0.22)',
        paddingHorizontal: theme.spacing.lg,
        paddingVertical: theme.spacing.sm + 4,
        borderRadius: theme.borderRadius.full,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.25)',
    },
    previewModalBottomCloseText: {
        color: '#FFFFFF',
        fontSize: 13,
        fontWeight: '700',
        marginLeft: 6,
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
        marginBottom: theme.spacing.md,
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
    },
    nextBtnFlex: {
        flex: 1,
        backgroundColor: theme.colors.primary,
        height: 48,
        borderRadius: theme.borderRadius.md,
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
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
        marginBottom: 0,
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
    },
    gridCardTileSelected: {
        borderColor: theme.colors.primary,
        backgroundColor: theme.colors.primarySubtle,
    },
    gridIconBg: {
        width: 48,
        height: 48,
        borderRadius: theme.borderRadius.md,
        backgroundColor: theme.colors.surfaceSubtle,
        borderWidth: 1,
        borderColor: theme.colors.border,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: theme.spacing.sm,
    },
    gridIconBgSelected: {
        backgroundColor: theme.colors.primary,
        borderColor: theme.colors.primary,
    },
    gridCardLabel: {
        fontSize: 12,
        fontWeight: '600',
        color: theme.colors.textPrimary,
        textAlign: 'center',
        paddingHorizontal: 4,
    },
    gridCardLabelSelected: {
        color: theme.colors.primary,
        fontWeight: '700',
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
    submittingStatusRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
    },
    submittingStatusText: {
        color: '#FFFFFF',
        fontSize: 13,
        fontWeight: '700',
    },
}));
