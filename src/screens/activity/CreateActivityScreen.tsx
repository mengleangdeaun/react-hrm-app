import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    SafeAreaView,
    StatusBar,
    Alert,
    Image,
    ScrollView,
    ActivityIndicator,
} from 'react-native';
import { StyleSheet, useUnistyles } from 'react-native-unistyles';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import { activityApi } from '../../api/activity';
import { useAppTheme } from '../../context/ThemeContext';
import {
    ArrowLeft,
    Camera,
    Image as ImageIcon,
    MapPin,
    Check,
    X,
    Briefcase,
    Wrench,
    Truck,
    ClipboardList,
    Users,
    ChevronRight,
} from 'lucide-react-native';

const CATEGORIES = [
    { id: 'site_inspection', label: 'Site Inspection', desc: 'Equipment or building checks', Icon: Wrench },
    { id: 'client_visit', label: 'Client Visit', desc: 'Customer meeting or sales pitch', Icon: Users },
    { id: 'maintenance_check', label: 'Maintenance Check', desc: 'Repairs or maintenance tasks', Icon: Briefcase },
    { id: 'delivery', label: 'Delivery / Logistics', desc: 'Part delivery or cargo drop-off', Icon: Truck },
    { id: 'internal_task', label: 'Internal Task', desc: 'Office task or internal work', Icon: ClipboardList },
];

export const CreateActivityScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
    const { isDark } = useAppTheme();
    const { theme } = useUnistyles();
    const styles = stylesheet;

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
                setLocation({ address: 'Location permission denied' });
                return;
            }

            const currentLoc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
            const { latitude, longitude } = currentLoc.coords;

            // Attempt reverse geocode
            let addressName = `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`;
            try {
                const [reversed] = await Location.reverseGeocodeAsync({ latitude, longitude });
                if (reversed) {
                    const parts = [reversed.name, reversed.street, reversed.subregion || reversed.city].filter(Boolean);
                    if (parts.length > 0) addressName = parts.join(', ');
                }
            } catch (e) {
                // Ignore geocode fallback
            }

            setLocation({
                lat: latitude,
                lng: longitude,
                address: addressName,
            });
        } catch (err) {
            console.warn('Location capture error:', err);
            setLocation({ address: 'GPS Location unavailable' });
        } finally {
            setIsLocating(false);
        }
    };

    const takePhoto = async () => {
        const permission = await ImagePicker.requestCameraPermissionsAsync();
        if (!permission.granted) {
            Alert.alert('Permission Required', 'Camera access is required to take photo proof.');
            return;
        }

        const result = await ImagePicker.launchCameraAsync({
            quality: 0.8,
            allowsEditing: false,
        });

        if (!result.canceled && result.assets && result.assets.length > 0) {
            const newAsset = result.assets[0];
            setAttachments((prev) => [...prev, { uri: newAsset.uri, name: newAsset.fileName || `photo_${Date.now()}.jpg` }]);
        }
    };

    const pickImage = async () => {
        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ['images'],
            allowsMultipleSelection: true,
            quality: 0.8,
        });

        if (!result.canceled && result.assets) {
            const newAssets = result.assets.map((asset: any, idx: number) => ({
                uri: asset.uri,
                name: asset.fileName || `photo_${Date.now()}_${idx}.jpg`,
            }));
            setAttachments((prev) => [...prev, ...newAssets]);
        }
    };

    const removeAttachment = (index: number) => {
        setAttachments((prev) => prev.filter((_, i) => i !== index));
    };

    const handleSubmit = async () => {
        if (!selectedCategory) {
            Alert.alert('Required', 'Please select an activity category.');
            return;
        }
        if (attachments.length === 0) {
            Alert.alert('Photo Proof Required', 'Please attach at least 1 photo for activity proof.');
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

            Alert.alert('Activity Submitted', 'Your work log entry has been submitted for supervisor review.', [
                { text: 'OK', onPress: () => navigation.goBack() },
            ]);
        } catch (error: any) {
            Alert.alert('Submission Error', error?.message || 'Failed to submit activity report. Please try again.');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <SafeAreaView style={styles.safeArea}>
            <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />

            {/* Navigation Header */}
            <View style={styles.topBar}>
                <TouchableOpacity
                    style={styles.iconCircle}
                    onPress={() => {
                        if (currentStep > 1) {
                            setCurrentStep(currentStep - 1);
                        } else {
                            navigation.goBack();
                        }
                    }}
                    activeOpacity={0.7}
                >
                    <ArrowLeft color={theme.colors.textPrimary} size={20} />
                </TouchableOpacity>

                <Text style={styles.headerTitle}>Log Daily Activity</Text>

                <View style={styles.stepCounterBadge}>
                    <Text style={styles.stepCounterText}>Step {currentStep}/3</Text>
                </View>
            </View>

            <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
                {/* Step Progress Bar */}
                <View style={styles.progressBarBg}>
                    <View style={[styles.progressBarFill, { width: `${(currentStep / 3) * 100}%` }]} />
                </View>

                {/* STEP 1: Select Category */}
                {currentStep === 1 && (
                    <View>
                        <Text style={styles.stepTitle}>1. Select Activity Type</Text>
                        <Text style={styles.stepSubtitle}>Choose the category that best describes your task.</Text>

                        {CATEGORIES.map((cat) => {
                            const CatIcon = cat.Icon;
                            const isSelected = selectedCategory === cat.id;
                            return (
                                <TouchableOpacity
                                    key={cat.id}
                                    style={[styles.categoryTile, isSelected && styles.categoryTileSelected]}
                                    onPress={() => setSelectedCategory(cat.id)}
                                    activeOpacity={0.8}
                                >
                                    <View style={[styles.categoryIconBg, isSelected && styles.categoryIconBgSelected]}>
                                        <CatIcon color={isSelected ? '#FFFFFF' : theme.colors.primary} size={22} />
                                    </View>
                                    <View style={styles.categoryTextGroup}>
                                        <Text style={[styles.categoryLabel, isSelected && styles.categoryLabelSelected]}>
                                            {cat.label}
                                        </Text>
                                        <Text style={styles.categoryDesc}>{cat.desc}</Text>
                                    </View>
                                    {isSelected && (
                                        <View style={styles.checkBadge}>
                                            <Check color="#FFFFFF" size={14} />
                                        </View>
                                    )}
                                </TouchableOpacity>
                            );
                        })}

                        <TouchableOpacity
                            style={[styles.nextBtn, !selectedCategory && styles.nextBtnDisabled]}
                            disabled={!selectedCategory}
                            onPress={() => setCurrentStep(2)}
                            activeOpacity={0.85}
                        >
                            <Text style={styles.nextBtnText}>Continue to Photo Proof</Text>
                            <ChevronRight color="#FFFFFF" size={18} />
                        </TouchableOpacity>
                    </View>
                )}

                {/* STEP 2: Photo Proof Capture */}
                {currentStep === 2 && (
                    <View>
                        <Text style={styles.stepTitle}>2. Attach Photo Proof</Text>
                        <Text style={styles.stepSubtitle}>Capture or upload photos to verify your activity.</Text>

                        <View style={styles.photoPickerRow}>
                            <TouchableOpacity style={styles.pickerTile} onPress={takePhoto} activeOpacity={0.8}>
                                <Camera color={theme.colors.primary} size={28} />
                                <Text style={styles.pickerTileText}>Take Camera Photo</Text>
                            </TouchableOpacity>

                            <TouchableOpacity style={styles.pickerTile} onPress={pickImage} activeOpacity={0.8}>
                                <ImageIcon color={theme.colors.status.success} size={28} />
                                <Text style={styles.pickerTileText}>Choose from Gallery</Text>
                            </TouchableOpacity>
                        </View>

                        {/* Thumbnail Grid */}
                        {attachments.length > 0 && (
                            <View style={styles.previewSection}>
                                <Text style={styles.previewTitle}>Attached Photos ({attachments.length})</Text>
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

                        <TouchableOpacity
                            style={[styles.nextBtn, attachments.length === 0 && styles.nextBtnDisabled]}
                            disabled={attachments.length === 0}
                            onPress={() => setCurrentStep(3)}
                            activeOpacity={0.85}
                        >
                            <Text style={styles.nextBtnText}>Continue to Notes & Location</Text>
                            <ChevronRight color="#FFFFFF" size={18} />
                        </TouchableOpacity>
                    </View>
                )}

                {/* STEP 3: Notes & Location Tagging */}
                {currentStep === 3 && (
                    <View>
                        <Text style={styles.stepTitle}>3. Location & Activity Notes</Text>
                        <Text style={styles.stepSubtitle}>Review GPS location tag and add descriptive notes.</Text>

                        {/* GPS Tagged Location Banner */}
                        <View style={styles.locationCard}>
                            <MapPin color={theme.colors.primary} size={20} />
                            <View style={styles.locationTextGroup}>
                                <Text style={styles.locationCardTitle}>Verified Location Tag</Text>
                                <Text style={styles.locationCardSub} numberOfLines={2}>
                                    {isLocating ? 'Resolving GPS coordinates...' : location?.address || 'Location Tagged'}
                                </Text>
                            </View>
                            {isLocating && <ActivityIndicator size="small" color={theme.colors.primary} />}
                        </View>

                        {/* Notes / Comment Text Input */}
                        <Text style={styles.inputLabel}>Activity Notes / Details</Text>
                        <TextInput
                            style={[styles.input, styles.textArea]}
                            value={comment}
                            onChangeText={setComment}
                            placeholder="Describe work completed, client feedback, or tasks performed..."
                            placeholderTextColor={theme.colors.textSecondary}
                            multiline
                            numberOfLines={4}
                        />

                        <TouchableOpacity
                            style={styles.submitBtn}
                            onPress={handleSubmit}
                            disabled={isSubmitting}
                            activeOpacity={0.85}
                        >
                            {isSubmitting ? (
                                <ActivityIndicator color="#FFFFFF" />
                            ) : (
                                <Text style={styles.submitBtnText}>Submit Activity Report</Text>
                            )}
                        </TouchableOpacity>
                    </View>
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
    stepCounterBadge: {
        backgroundColor: theme.colors.surfaceSubtle,
        paddingHorizontal: theme.spacing.sm + 2,
        paddingVertical: theme.spacing.xs,
        borderRadius: theme.borderRadius.full,
        borderWidth: 1,
        borderColor: theme.colors.border,
    },
    stepCounterText: {
        fontSize: 12,
        fontWeight: '700',
        color: theme.colors.primary,
    },
    container: {
        flex: 1,
    },
    scrollContent: {
        paddingHorizontal: theme.spacing.md + 4,
        paddingBottom: theme.spacing.xl,
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
        fontSize: 18,
        fontWeight: '800',
        color: theme.colors.textPrimary,
        marginBottom: 4,
    },
    stepSubtitle: {
        fontSize: 13,
        color: theme.colors.textSecondary,
        marginBottom: theme.spacing.lg,
    },
    categoryTile: {
        backgroundColor: theme.colors.surface,
        borderRadius: theme.borderRadius.lg,
        padding: theme.spacing.md,
        marginBottom: theme.spacing.md,
        flexDirection: 'row',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: theme.colors.border,
        ...theme.shadows.sm,
    },
    categoryTileSelected: {
        borderColor: theme.colors.primary,
        backgroundColor: 'rgba(37, 99, 235, 0.05)',
    },
    categoryIconBg: {
        width: 44,
        height: 44,
        borderRadius: theme.borderRadius.md,
        backgroundColor: 'rgba(37, 99, 235, 0.1)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    categoryIconBgSelected: {
        backgroundColor: theme.colors.primary,
    },
    categoryTextGroup: {
        flex: 1,
        marginLeft: theme.spacing.sm + 4,
    },
    categoryLabel: {
        fontSize: 15,
        fontWeight: '700',
        color: theme.colors.textPrimary,
    },
    categoryLabelSelected: {
        color: theme.colors.primary,
    },
    categoryDesc: {
        fontSize: 12,
        color: theme.colors.textSecondary,
        marginTop: 2,
    },
    checkBadge: {
        width: 24,
        height: 24,
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
        fontSize: 13,
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
        width: 80,
        height: 80,
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
        marginBottom: theme.spacing.lg,
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
        fontSize: 13,
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
        fontSize: 14,
    },
    textArea: {
        height: 120,
        textAlignVertical: 'top',
        paddingTop: theme.spacing.md,
        marginBottom: theme.spacing.xl,
    },
    nextBtn: {
        backgroundColor: theme.colors.primary,
        height: 52,
        borderRadius: theme.borderRadius.md,
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: theme.spacing.md,
        ...theme.shadows.sm,
    },
    nextBtnDisabled: {
        opacity: 0.5,
    },
    nextBtnText: {
        color: '#FFFFFF',
        fontWeight: '700',
        fontSize: 15,
        marginRight: theme.spacing.xs,
    },
    submitBtn: {
        backgroundColor: theme.colors.primary,
        height: 52,
        borderRadius: theme.borderRadius.md,
        justifyContent: 'center',
        alignItems: 'center',
        ...theme.shadows.sm,
    },
    submitBtnText: {
        color: '#FFFFFF',
        fontWeight: '700',
        fontSize: 16,
    },
}));
