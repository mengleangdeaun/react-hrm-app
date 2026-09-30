import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
    View,
    TextInput,
    TouchableOpacity,
    Alert,
    ActivityIndicator,
    ScrollView,
    Platform,
} from 'react-native';
import { AppText as Text } from '../../components/AppText';
import { StyleSheet, useUnistyles } from 'react-native-unistyles';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import * as Haptics from 'expo-haptics';
import { leaveApi, LeaveBalance } from '../../api/leave';
import { useAppTheme } from '../../context/ThemeContext';
import { AppShell } from '../../components/common/AppShell';
import { AppButton } from '../../components/common/AppButton';
import { HeaderIconButton } from '../../components/common/AppHeader';
import { CreateLeaveSkeleton } from '../../components/common/Skeletons';
import { NativeDatePickerField } from '../../components/common/NativeDatePickerField';
import { NativeTimePickerField } from '../../components/common/NativeTimePickerField';
import { AppBottomSheet } from '../../components/common/AppBottomSheet';
import {
    Paperclip,
    Check,
    X,
    History,
    AlertCircle,
    Camera,
    Image as ImageIcon,
    FileText,
} from 'lucide-react-native';
import {
    getTodayDateString,
    isDateRangeValid,
    calculateInclusiveDays,
} from '../../utils/dateTime';
import { useTranslation } from '../../context/LanguageContext';

export interface AttachmentItem {
    uri: string;
    name: string;
    type?: string;
    size?: number;
}

export const CreateLeaveScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
    const { isDark } = useAppTheme();
    const { t } = useTranslation();
    const { theme } = useUnistyles();
    const styles = stylesheet;
    const queryClient = useQueryClient();

    // Enterprise Typography Tabs - Disciplined, Clean, No Toy Icons
    const DURATION_TYPES = useMemo(() => [
        { id: 'full_day', label: t('full_day', 'Full Day') },
        { id: 'first_half', label: t('morning', 'Morning') },
        { id: 'second_half', label: t('afternoon', 'Afternoon') },
        { id: 'multi_day', label: t('multi_day', 'Multi-Day') },
        { id: 'custom_time', label: t('custom_hours', 'Custom Hours') },
    ], [t]);

    const { data: balances = [], isLoading } = useQuery<LeaveBalance[]>({
        queryKey: ['leaveBalances'],
        queryFn: async () => {
            const res = await leaveApi.getMyBalances().catch(() => null);
            if (Array.isArray(res)) return res;
            if (Array.isArray(res?.balances)) return res.balances;
            return [];
        },
        staleTime: 1000 * 60 * 5,
    });

    const [selectedLeaveTypeId, setSelectedLeaveTypeId] = useState<number | null>(null);
    const [durationType, setDurationType] = useState<string>('full_day');

    const todayStr = getTodayDateString();
    const [startDate, setStartDate] = useState(todayStr);
    const [endDate, setEndDate] = useState(todayStr);
    const [startTime, setStartTime] = useState('08:00');
    const [endTime, setEndTime] = useState('12:00');
    const [reason, setReason] = useState('');
    const [reasonTouched, setReasonTouched] = useState(false);
    const [attachment, setAttachment] = useState<AttachmentItem | null>(null);
    const [attachModalVisible, setAttachModalVisible] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Dynamic Category Sync: Select first available leave type when balances load
    useEffect(() => {
        if (balances.length > 0) {
            const hasCurrent = balances.some((b) => {
                const lType = b.leave_type || (b as any).leaveType;
                const typeId = typeof lType === 'object' ? lType?.id : b.id;
                return typeId === selectedLeaveTypeId;
            });

            if (!hasCurrent) {
                const first = balances[0];
                const firstLType = first.leave_type || (first as any).leaveType;
                const firstId = typeof firstLType === 'object' ? firstLType?.id : first.id;
                setSelectedLeaveTypeId(firstId);
            }
        }
    }, [balances, selectedLeaveTypeId]);

    const handleStartDateChange = (newStart: string) => {
        setStartDate(newStart);
        if (endDate < newStart) {
            setEndDate(newStart);
        }
    };

    // Calculate elapsed hours for custom_time
    const calculateCustomHours = useCallback((start: string, end: string): number => {
        const [sh, sm] = start.split(':').map(Number);
        const [eh, em] = end.split(':').map(Number);
        if (isNaN(sh) || isNaN(sm) || isNaN(eh) || isNaN(em)) return 0;
        const diffMinutes = (eh * 60 + em) - (sh * 60 + sm);
        return Math.max(0, Math.round((diffMinutes / 60) * 10) / 10);
    }, []);

    // Requested Days Count for Balance Check
    const requestedDays = useMemo(() => {
        if (durationType === 'full_day') return 1;
        if (durationType === 'first_half' || durationType === 'second_half') return 0.5;
        if (durationType === 'multi_day') return calculateInclusiveDays(startDate, endDate);
        if (durationType === 'custom_time') {
            const hrs = calculateCustomHours(startTime, endTime);
            return Math.min(1, Math.round((hrs / 8) * 10) / 10);
        }
        return 1;
    }, [durationType, startDate, endDate, startTime, endTime, calculateCustomHours]);

    const calculateTotalDurationDisplay = () => {
        if (durationType === 'full_day') return `1 ${t('day', 'Day')}`;
        if (durationType === 'first_half' || durationType === 'second_half') return `0.5 ${t('day', 'Day')}`;
        if (durationType === 'custom_time') {
            const hours = calculateCustomHours(startTime, endTime);
            if (hours <= 0) return t('invalid_time_range', 'Invalid Range');
            return `${hours} ${hours === 1 ? t('hour', 'Hour') : t('hours', 'Hours')}`;
        }
        if (durationType === 'multi_day') {
            const days = calculateInclusiveDays(startDate, endDate);
            return `${days} ${days > 1 ? t('days', 'Days') : t('day', 'Day')}`;
        }
        return `1 ${t('day', 'Day')}`;
    };

    // Active Balance Info & Over-Balance Warning
    const selectedBalance = useMemo(() => {
        return balances.find((b) => {
            const lType = b.leave_type || (b as any).leaveType;
            const typeId = typeof lType === 'object' ? lType?.id : b.id;
            return typeId === selectedLeaveTypeId;
        });
    }, [balances, selectedLeaveTypeId]);

    const remainingDays = useMemo(() => {
        if (!selectedBalance) return null;
        const rem = selectedBalance.remaining_days ?? (selectedBalance as any).balance ?? 0;
        return typeof rem === 'number' ? rem : parseFloat(rem) || 0;
    }, [selectedBalance]);

    const isOverBalance = remainingDays !== null && requestedDays > remainingDays;

    // Attachments Handling
    const handleSelectedFile = (asset: any) => {
        if (asset.size && asset.size > 10 * 1024 * 1024) {
            Alert.alert(
                t('file_too_large', 'File Too Large'),
                t('file_size_limit_10mb', 'The selected file exceeds the 10 MB limit. Please select a smaller file.')
            );
            return;
        }

        setAttachment({
            uri: asset.uri,
            name: asset.name || asset.fileName || 'attachment.jpg',
            type: asset.mimeType || asset.type || 'image/jpeg',
            size: asset.size,
        });
        setAttachModalVisible(false);
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    };

    const pickFromCamera = async () => {
        try {
            const { status } = await ImagePicker.requestCameraPermissionsAsync();
            if (status !== 'granted') {
                Alert.alert(
                    t('permission_required', 'Permission Required'),
                    t('camera_perm_desc', 'Camera permission is required to photograph your document.')
                );
                return;
            }

            const result = await ImagePicker.launchCameraAsync({
                mediaTypes: ['images'],
                quality: 0.85,
            });

            if (!result.canceled && result.assets && result.assets.length > 0) {
                handleSelectedFile(result.assets[0]);
            }
        } catch (e) {
            console.warn('Camera picker error', e);
        }
    };

    const pickFromGallery = async () => {
        try {
            const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
            if (status !== 'granted') {
                Alert.alert(
                    t('permission_required', 'Permission Required'),
                    t('gallery_perm_desc', 'Photo library permission is required to select photos.')
                );
                return;
            }

            const result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ['images'],
                quality: 0.85,
            });

            if (!result.canceled && result.assets && result.assets.length > 0) {
                handleSelectedFile(result.assets[0]);
            }
        } catch (e) {
            console.warn('Gallery picker error', e);
        }
    };

    const pickFromDocument = async () => {
        try {
            const result = await DocumentPicker.getDocumentAsync({
                type: ['application/pdf', 'image/*'],
                copyToCacheDirectory: true,
            });

            if (!result.canceled && result.assets && result.assets.length > 0) {
                handleSelectedFile(result.assets[0]);
            }
        } catch (e) {
            console.warn('Document picker error', e);
        }
    };

    const formatFileSize = (bytes?: number) => {
        if (!bytes || bytes <= 0) return '';
        if (bytes < 1024) return `${bytes} B`;
        if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
        return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    };

    const getFileBadge = (name?: string, type?: string) => {
        if (type?.includes('pdf') || name?.toLowerCase().endsWith('.pdf')) return 'PDF';
        if (type?.includes('image') || /\.(jpg|jpeg|png|webp|heic)$/i.test(name || '')) return 'IMG';
        return 'DOC';
    };

    // Submission Handler
    const doSubmit = async () => {
        if (!selectedLeaveTypeId) {
            Alert.alert(t('category_required', 'Category Required'), t('select_leave_category_alert', 'Please select a leave category.'));
            return;
        }

        if (!reason.trim()) {
            Alert.alert(t('reason_required', 'Reason Required'), t('provide_reason_desc', 'Please provide a clear reason for your leave request.'));
            return;
        }

        if (durationType === 'multi_day' && !isDateRangeValid(startDate, endDate)) {
            Alert.alert(t('invalid_date_range', 'Invalid Date Range'), t('start_must_before_end', 'Start date cannot be after end date.'));
            return;
        }

        if (durationType === 'custom_time' && startTime >= endTime) {
            Alert.alert(t('invalid_time_range', 'Invalid Time Range'), t('start_time_must_before_end', 'Start time must be before end time.'));
            return;
        }

        setIsSubmitting(true);
        try {
            // Fix: Include custom_time in single-day end_date normalization
            const isSingleDay =
                durationType === 'full_day' ||
                durationType === 'first_half' ||
                durationType === 'second_half' ||
                durationType === 'custom_time';

            const finalEndDate = isSingleDay ? startDate : endDate;

            // Fix: Preserve exact MIME type for PDF/image uploads
            const attachmentsArr = attachment
                ? [
                      {
                          uri: attachment.uri,
                          name: attachment.name,
                          type: attachment.type || 'image/jpeg',
                      },
                  ]
                : [];

            await leaveApi.submitLeaveRequest({
                leave_type_id: selectedLeaveTypeId,
                duration_type: durationType,
                start_date: startDate,
                end_date: finalEndDate,
                start_time: durationType === 'custom_time' ? startTime : undefined,
                end_time: durationType === 'custom_time' ? endTime : undefined,
                reason: reason.trim(),
                attachments: attachmentsArr,
            });

            // Cache Invalidation
            await Promise.all([
                queryClient.invalidateQueries({ queryKey: ['leaveBalances'] }),
                queryClient.invalidateQueries({ queryKey: ['leaveRequests'] }),
                queryClient.invalidateQueries({ queryKey: ['dashboardBootstrap'] }),
            ]);

            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});

            if (Platform.OS === 'web') {
                window.alert(t('application_submitted_msg', 'Your leave request has been submitted to your line manager for review.'));
                navigation.replace('LeaveList');
            } else {
                Alert.alert(
                    t('application_submitted', 'Application Submitted'),
                    t('leave_submitted_mgr', 'Your leave request has been submitted to your line manager for review.'),
                    [{ text: t('ok', 'OK'), onPress: () => navigation.replace('LeaveList') }]
                );
            }
        } catch (err: any) {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});
            Alert.alert(
                t('submission_error', 'Submission Error'),
                err?.response?.data?.message || err?.message || t('fail_submit_leave', 'Failed to submit leave request.')
            );
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleSubmit = () => {
        if (!reason.trim()) {
            setReasonTouched(true);
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => {});
            Alert.alert(
                t('reason_required', 'Reason Required'),
                t('provide_reason_desc', 'Please provide a clear reason for your leave request.')
            );
            return;
        }

        if (isOverBalance) {
            Alert.alert(
                t('insufficient_balance', 'Insufficient Leave Balance'),
                t(
                    'insufficient_balance_confirm',
                    'You are requesting {{req}} days, but have {{rem}} days remaining. Do you wish to proceed?',
                    { req: requestedDays, rem: remainingDays }
                ),
                [
                    { text: t('cancel', 'Cancel'), style: 'cancel' },
                    { text: t('proceed', 'Proceed'), onPress: doSubmit },
                ]
            );
            return;
        }

        doSubmit();
    };

    const headerRight = (
        <HeaderIconButton
            icon={<History color={theme.colors.brand} size={20} />}
            onPress={() => navigation.navigate('LeaveList')}
            accessibilityLabel="Leave applications history"
        />
    );

    return (
        <AppShell
            title={t('apply_leave', 'Apply Leave')}
            onBack={() => navigation.goBack()}
            headerRight={headerRight}
            footer={
                !isLoading ? (
                    <AppButton
                        title={t('submit_leave_application', 'Submit Leave Application')}
                        onPress={handleSubmit}
                        loading={isSubmitting}
                        disabled={!reason.trim() || isSubmitting}
                        size="lg"
                    />
                ) : undefined
            }
        >
            {isLoading ? (
                <CreateLeaveSkeleton />
            ) : (
                <View style={styles.container}>
                    {/* 1. Leave Category Section */}
                    <Text style={styles.sectionTitle}>{t('select_leave_category', 'Select Leave Category')}</Text>

                    {balances.length === 0 ? (
                        <View style={styles.emptyBalancesCard}>
                            <AlertCircle size={18} color={theme.colors.textSecondary} />
                            <Text style={styles.emptyBalancesText}>
                                {t('no_leave_categories_available', 'No leave categories configured for your profile.')}
                            </Text>
                        </View>
                    ) : (
                        <ScrollView
                            horizontal
                            showsHorizontalScrollIndicator={false}
                            style={styles.balanceCarousel}
                            contentContainerStyle={styles.balanceCarouselContent}
                        >
                            {balances.map((b) => {
                                const lType = b.leave_type || (b as any).leaveType;
                                const typeId = typeof lType === 'object' ? lType?.id : b.id;
                                const typeName = typeof lType === 'object' ? lType?.name : String(lType || 'Leave');
                                const remDays = b.remaining_days ?? (b as any).balance ?? (b as any).remaining ?? 0;
                                const usedDays = b.used_days ?? (b as any).total_taken ?? (b as any).taken ?? 0;
                                const allocDays = b.allocated_days ?? (b as any).total_accrued ?? (b as any).allowed ?? 0;
                                const isSelected = selectedLeaveTypeId === typeId;

                                return (
                                    <TouchableOpacity
                                        key={typeId}
                                        style={[styles.balanceCard, isSelected && styles.balanceCardSelected]}
                                        onPress={() => {
                                            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
                                            setSelectedLeaveTypeId(typeId);
                                        }}
                                        activeOpacity={0.85}
                                    >
                                        <View style={styles.balanceCardHeader}>
                                            <Text style={[styles.balanceType, isSelected && styles.balanceTypeSelected]} numberOfLines={1}>
                                                {typeName}
                                            </Text>
                                            {isSelected ? (
                                                <View style={styles.selectedCheckBadge}>
                                                    <Check color="#FFFFFF" size={10} strokeWidth={3} />
                                                </View>
                                            ) : (
                                                <View style={styles.unselectedRadio} />
                                            )}
                                        </View>
                                        <Text style={[styles.balanceRemaining, isSelected && styles.balanceRemainingSelected]}>
                                            {remDays} <Text style={styles.balanceUnit}>{t('days', 'Days')}</Text>
                                        </Text>
                                        <Text style={styles.balanceSub}>
                                            {t('used_days_of_total', 'Used {{used}} of {{total}} days', {
                                                used: usedDays,
                                                total: allocDays,
                                            })}
                                        </Text>
                                    </TouchableOpacity>
                                );
                            })}
                        </ScrollView>
                    )}

                    {/* 2. Duration Type Switcher (Enterprise Typographic Pills) */}
                    <Text style={styles.sectionTitle}>{t('duration_mode', 'Duration Mode')}</Text>
                    <ScrollView
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        style={styles.durationScrollView}
                        contentContainerStyle={styles.durationScrollContent}
                    >
                        {DURATION_TYPES.map((dt) => {
                            const isSelected = durationType === dt.id;
                            return (
                                <TouchableOpacity
                                    key={dt.id}
                                    style={[styles.durationPillBtn, isSelected && styles.durationPillBtnActive]}
                                    onPress={() => {
                                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
                                        setDurationType(dt.id);
                                    }}
                                    activeOpacity={0.8}
                                >
                                    <Text style={[styles.durationPillText, isSelected && styles.durationPillTextActive]}>
                                        {dt.label}
                                    </Text>
                                </TouchableOpacity>
                            );
                        })}
                    </ScrollView>

                    {/* 3. Leave Schedule Card (Clean Header, Stacked Full-Width Date Selectors) */}
                    <View style={styles.cardSection}>
                        <View style={styles.cardHeaderRow}>
                            <Text style={styles.cardHeaderTitle}>{t('leave_schedule', 'Leave Schedule')}</Text>
                            <View style={styles.durationSummaryPill}>
                                <Text style={styles.durationSummaryPillText}>{calculateTotalDurationDisplay()}</Text>
                            </View>
                        </View>

                        {/* Date Inputs: Stacked full-width inputs to prevent UI breakage */}
                        {durationType === 'multi_day' ? (
                            <View style={styles.stackedDatesContainer}>
                                <NativeDatePickerField
                                    label={t('start_date', 'Start Date')}
                                    value={startDate}
                                    onChange={handleStartDateChange}
                                />

                                {/* Enterprise Date Range Duration Bridge */}
                                <View style={styles.dateConnectorRow}>
                                    <View style={styles.connectorLine} />
                                    <View style={styles.connectorBadge}>
                                        <Text style={styles.connectorText}>
                                            {calculateInclusiveDays(startDate, endDate)}{' '}
                                            {calculateInclusiveDays(startDate, endDate) === 1
                                                ? t('day', 'Day')
                                                : t('days', 'Days')}{' '}
                                            {t('selected', 'selected')}
                                        </Text>
                                    </View>
                                    <View style={styles.connectorLine} />
                                </View>

                                <NativeDatePickerField
                                    label={t('end_date', 'End Date')}
                                    value={endDate}
                                    onChange={setEndDate}
                                    minDate={startDate}
                                />
                            </View>
                        ) : durationType === 'custom_time' ? (
                            <View style={styles.stackedDatesContainer}>
                                <NativeDatePickerField
                                    label={t('date', 'Date')}
                                    value={startDate}
                                    onChange={handleStartDateChange}
                                />
                                <View style={styles.timeRow}>
                                    <View style={styles.timeField}>
                                        <NativeTimePickerField
                                            label={t('start_time', 'Start Time')}
                                            value={startTime}
                                            onChange={setStartTime}
                                        />
                                    </View>
                                    <View style={styles.timeField}>
                                        <NativeTimePickerField
                                            label={t('end_time', 'End Time')}
                                            value={endTime}
                                            onChange={setEndTime}
                                        />
                                    </View>
                                </View>
                            </View>
                        ) : (
                            <View style={styles.stackedDatesContainer}>
                                <NativeDatePickerField
                                    label={t('date', 'Date')}
                                    value={startDate}
                                    onChange={handleStartDateChange}
                                />
                            </View>
                        )}

                        {/* Balance Warning Banner */}
                        {isOverBalance && (
                            <View style={styles.balanceWarningBanner}>
                                <AlertCircle size={15} color="#D97706" />
                                <Text style={styles.balanceWarningText}>
                                    {t(
                                        'exceeds_balance_warning',
                                        'Request exceeds remaining balance ({{rem}} days left). Submission will be subject to approval.',
                                        { rem: remainingDays }
                                    )}
                                </Text>
                            </View>
                        )}
                    </View>

                    {/* 4. Reason Application Card */}
                    <View style={styles.cardSection}>
                        <View style={styles.inputHeader}>
                            <Text style={styles.cardHeaderTitle}>
                                {t('reason_for_application', 'Reason for Application')}
                                <Text style={styles.requiredAsterisk}> *</Text>
                            </Text>
                            <Text style={[styles.charCounter, reason.length >= 280 && styles.charCounterWarning]}>
                                {reason.length} / 300
                            </Text>
                        </View>
                        <TextInput
                            style={[
                                styles.input,
                                styles.textArea,
                                reasonTouched && !reason.trim() && styles.inputError,
                            ]}
                            value={reason}
                            onChangeText={(text: string) => {
                                setReason(text);
                                if (text.trim() && reasonTouched) {
                                    setReasonTouched(false);
                                }
                            }}
                            onBlur={() => {
                                if (!reason.trim()) {
                                    setReasonTouched(true);
                                }
                            }}
                            placeholder={t('describe_reason_placeholder', 'Describe clear reason for leave application...')}
                            placeholderTextColor={theme.colors.textDisabled}
                            multiline
                            numberOfLines={4}
                            maxLength={300}
                        />
                        {reasonTouched && !reason.trim() && (
                            <Text style={styles.fieldErrorText}>
                                {t('reason_required_error', 'Reason is required before submitting your application.')}
                            </Text>
                        )}
                    </View>

                    {/* 5. Document Attachment Card */}
                    <View style={styles.cardSection}>
                        <View style={styles.cardHeaderRow}>
                            <Text style={styles.cardHeaderTitle}>{t('proof_document', 'Supporting Document (Optional)')}</Text>
                        </View>

                        {attachment ? (
                            <View style={styles.attachedCard}>
                                <View style={styles.attachedLeft}>
                                    <View style={styles.attachedFileBadge}>
                                        <Text style={styles.attachedFileBadgeText}>
                                            {getFileBadge(attachment.name, attachment.type)}
                                        </Text>
                                    </View>
                                    <View style={styles.attachedDetails}>
                                        <Text style={styles.attachedName} numberOfLines={1}>
                                            {attachment.name}
                                        </Text>
                                        {Boolean(attachment.size) && (
                                            <Text style={styles.attachedMeta}>
                                                {formatFileSize(attachment.size)}
                                            </Text>
                                        )}
                                    </View>
                                </View>
                                <TouchableOpacity
                                    onPress={() => {
                                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
                                        setAttachment(null);
                                    }}
                                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                                    style={styles.attachedRemoveBtn}
                                    accessibilityLabel="Remove attached document"
                                >
                                    <X color={theme.colors.status.danger} size={18} />
                                </TouchableOpacity>
                            </View>
                        ) : (
                            <TouchableOpacity
                                style={styles.attachBox}
                                onPress={() => {
                                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
                                    setAttachModalVisible(true);
                                }}
                                activeOpacity={0.8}
                            >
                                <Paperclip color={theme.colors.brand} size={18} />
                                <Text style={styles.attachBoxText}>
                                    {t('upload_cert_proof', 'Attach Certificate, Photo or Document')}
                                </Text>
                            </TouchableOpacity>
                        )}
                    </View>
                </View>
            )}

            {/* Document Source Picker Bottom Sheet */}
            <AppBottomSheet
                visible={attachModalVisible}
                onClose={() => setAttachModalVisible(false)}
                title={t('attach_supporting_document', 'Attach Supporting Document')}
                subtitle={t('select_attachment_source', 'Choose how you want to add your document')}
            >
                <View style={styles.attachOptionsContainer}>
                    <TouchableOpacity
                        style={styles.attachOptionRow}
                        onPress={pickFromCamera}
                        activeOpacity={0.7}
                    >
                        <View style={[styles.attachOptionIconCircle, { backgroundColor: 'rgba(16, 185, 129, 0.12)' }]}>
                            <Camera size={22} color="#10B981" />
                        </View>
                        <View style={styles.attachOptionTextCol}>
                            <Text style={styles.attachOptionTitle}>{t('take_photo', 'Take Photo')}</Text>
                            <Text style={styles.attachOptionDesc}>
                                {t('take_photo_desc', 'Use camera to snap medical certificate')}
                            </Text>
                        </View>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={styles.attachOptionRow}
                        onPress={pickFromGallery}
                        activeOpacity={0.7}
                    >
                        <View style={[styles.attachOptionIconCircle, { backgroundColor: 'rgba(59, 130, 246, 0.12)' }]}>
                            <ImageIcon size={22} color="#3B82F6" />
                        </View>
                        <View style={styles.attachOptionTextCol}>
                            <Text style={styles.attachOptionTitle}>{t('choose_from_gallery', 'Choose from Photos')}</Text>
                            <Text style={styles.attachOptionDesc}>
                                {t('choose_from_gallery_desc', 'Select existing image or screenshot')}
                            </Text>
                        </View>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={styles.attachOptionRow}
                        onPress={pickFromDocument}
                        activeOpacity={0.7}
                    >
                        <View style={[styles.attachOptionIconCircle, { backgroundColor: 'rgba(239, 68, 68, 0.12)' }]}>
                            <FileText size={22} color="#EF4444" />
                        </View>
                        <View style={styles.attachOptionTextCol}>
                            <Text style={styles.attachOptionTitle}>{t('browse_documents', 'Browse Documents')}</Text>
                            <Text style={styles.attachOptionDesc}>
                                {t('browse_documents_desc', 'Select PDF or document up to 10MB')}
                            </Text>
                        </View>
                    </TouchableOpacity>
                </View>
            </AppBottomSheet>
        </AppShell>
    );
};

const stylesheet = StyleSheet.create((theme) => ({
    container: {
        paddingBottom: 24,
    },
    sectionTitle: {
        fontSize: 13.5,
        fontWeight: '700',
        color: theme.colors.textPrimary,
        marginTop: theme.spacing.sm,
        marginBottom: theme.spacing.xs + 2,
        letterSpacing: 0.1,
    },
    balanceCarousel: {
        marginBottom: theme.spacing.md + 2,
    },
    balanceCarouselContent: {
        paddingRight: theme.spacing.md,
    },
    balanceCard: {
        backgroundColor: theme.colors.surface,
        borderRadius: 16,
        padding: 14,
        marginRight: 12,
        width: 168,
        borderWidth: 1.5,
        borderColor: theme.colors.border,
    },
    balanceCardSelected: {
        borderColor: theme.colors.brand,
        borderWidth: 1.5,
        backgroundColor: theme.colors.brandSubtle,
    },
    balanceCardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 6,
    },
    balanceType: {
        fontSize: 12.5,
        fontWeight: '700',
        color: theme.colors.textSecondary,
        flex: 1,
        marginRight: 6,
    },
    balanceTypeSelected: {
        color: theme.colors.brand,
    },
    selectedCheckBadge: {
        width: 18,
        height: 18,
        borderRadius: 9,
        backgroundColor: theme.colors.brand,
        justifyContent: 'center',
        alignItems: 'center',
    },
    unselectedRadio: {
        width: 14,
        height: 14,
        borderRadius: 7,
        borderWidth: 1.5,
        borderColor: theme.colors.borderStrong,
    },
    balanceRemaining: {
        fontSize: 22,
        fontWeight: '900',
        color: theme.colors.textPrimary,
        marginVertical: 2,
    },
    balanceRemainingSelected: {
        color: theme.colors.brand,
    },
    balanceUnit: {
        fontSize: 12,
        fontWeight: '600',
        color: theme.colors.textSecondary,
    },
    balanceSub: {
        fontSize: 11,
        color: theme.colors.textSecondary,
        marginTop: 2,
    },
    emptyBalancesCard: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        backgroundColor: theme.colors.surfaceSubtle,
        borderRadius: 12,
        padding: 14,
        marginBottom: theme.spacing.md,
        borderWidth: 1,
        borderColor: theme.colors.border,
    },
    emptyBalancesText: {
        fontSize: 12.5,
        color: theme.colors.textSecondary,
        flex: 1,
    },
    durationScrollView: {
        marginBottom: theme.spacing.md + 2,
    },
    durationScrollContent: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        paddingVertical: 2,
        paddingRight: theme.spacing.md,
    },
    durationPillBtn: {
        paddingHorizontal: 16,
        paddingVertical: 8,
        backgroundColor: theme.colors.surfaceSubtle,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: theme.colors.border,
    },
    durationPillBtnActive: {
        backgroundColor: theme.colors.brand,
        borderColor: theme.colors.brand,
    },
    durationPillText: {
        fontSize: 13,
        fontWeight: '600',
        color: theme.colors.textSecondary,
    },
    durationPillTextActive: {
        fontWeight: '700',
        color: '#FFFFFF',
    },
    cardSection: {
        backgroundColor: theme.colors.surface,
        borderRadius: 16,
        padding: 16,
        marginBottom: 14,
        borderWidth: 1,
        borderColor: theme.colors.border,
    },
    cardHeaderRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 14,
    },
    cardHeaderTitle: {
        fontSize: 14,
        fontWeight: '700',
        color: theme.colors.textPrimary,
        letterSpacing: 0.1,
    },
    durationSummaryPill: {
        backgroundColor: theme.colors.brandSubtle,
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: 'rgba(223, 0, 0, 0.15)',
    },
    durationSummaryPillText: {
        fontSize: 12,
        fontWeight: '700',
        color: theme.colors.brand,
    },
    stackedDatesContainer: {
        width: '100%',
    },
    dateConnectorRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginVertical: 10,
        gap: 10,
    },
    connectorLine: {
        flex: 1,
        height: 1,
        backgroundColor: theme.colors.border,
    },
    connectorBadge: {
        paddingHorizontal: 12,
        paddingVertical: 4,
        borderRadius: 12,
        backgroundColor: theme.colors.surfaceSubtle,
        borderWidth: 1,
        borderColor: theme.colors.border,
    },
    connectorText: {
        fontSize: 11.5,
        fontWeight: '600',
        color: theme.colors.textSecondary,
        letterSpacing: 0.1,
    },
    timeRow: {
        flexDirection: 'row',
        gap: 12,
        marginTop: 12,
    },
    timeField: {
        flex: 1,
    },
    balanceWarningBanner: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        backgroundColor: 'rgba(245, 158, 11, 0.10)',
        borderWidth: 1,
        borderColor: 'rgba(245, 158, 11, 0.30)',
        borderRadius: 10,
        paddingHorizontal: 12,
        paddingVertical: 9,
        marginTop: 14,
    },
    balanceWarningText: {
        fontSize: 12,
        color: '#D97706',
        flex: 1,
        lineHeight: 16,
        fontWeight: '500',
    },
    inputHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 10,
    },
    requiredAsterisk: {
        color: theme.colors.status.danger,
        fontWeight: '700',
    },
    charCounter: {
        fontSize: 11.5,
        fontWeight: '600',
        color: theme.colors.textSecondary,
    },
    charCounterWarning: {
        color: '#D97706',
    },
    input: {
        backgroundColor: theme.colors.surfaceSubtle,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: theme.colors.border,
        color: theme.colors.textPrimary,
        paddingHorizontal: 14,
        fontSize: 13.5,
    },
    inputError: {
        borderColor: theme.colors.status.danger,
    },
    fieldErrorText: {
        fontSize: 12,
        color: theme.colors.status.danger,
        marginTop: 6,
        fontWeight: '500',
    },
    textArea: {
        height: 96,
        textAlignVertical: 'top',
        paddingTop: 10,
        paddingBottom: 10,
    },
    attachBox: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        backgroundColor: theme.colors.surfaceSubtle,
        borderRadius: 12,
        padding: 14,
        borderWidth: 1.5,
        borderColor: theme.colors.border,
        borderStyle: 'dashed',
    },
    attachBoxText: {
        fontSize: 13,
        fontWeight: '600',
        color: theme.colors.brand,
    },
    attachedCard: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundColor: theme.colors.surfaceSubtle,
        borderRadius: 12,
        padding: 12,
        borderWidth: 1,
        borderColor: theme.colors.border,
    },
    attachedLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
        gap: 10,
        marginRight: 8,
    },
    attachedFileBadge: {
        paddingHorizontal: 7,
        paddingVertical: 4,
        borderRadius: 6,
        backgroundColor: theme.colors.brand,
    },
    attachedFileBadgeText: {
        color: '#FFFFFF',
        fontSize: 10,
        fontWeight: '800',
        letterSpacing: 0.5,
    },
    attachedDetails: {
        flex: 1,
    },
    attachedName: {
        fontSize: 13,
        fontWeight: '700',
        color: theme.colors.textPrimary,
    },
    attachedMeta: {
        fontSize: 11,
        color: theme.colors.textSecondary,
        marginTop: 2,
    },
    attachedRemoveBtn: {
        padding: 4,
    },
    attachOptionsContainer: {
        paddingTop: 8,
        paddingBottom: 16,
        gap: 10,
    },
    attachOptionRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 14,
        backgroundColor: theme.colors.surfaceSubtle,
        padding: 14,
        borderRadius: 14,
        borderWidth: 1,
        borderColor: theme.colors.border,
    },
    attachOptionIconCircle: {
        width: 44,
        height: 44,
        borderRadius: 22,
        justifyContent: 'center',
        alignItems: 'center',
    },
    attachOptionTextCol: {
        flex: 1,
    },
    attachOptionTitle: {
        fontSize: 14,
        fontWeight: '700',
        color: theme.colors.textPrimary,
        marginBottom: 2,
    },
    attachOptionDesc: {
        fontSize: 12,
        color: theme.colors.textSecondary,
    },
}));
