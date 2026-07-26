import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    Alert,
    ActivityIndicator,
    ScrollView,
    Platform,
} from 'react-native';
import { StyleSheet, useUnistyles } from 'react-native-unistyles';
import * as DocumentPicker from 'expo-document-picker';
import { leaveApi, LeaveBalance } from '../../api/leave';
import { useAppTheme } from '../../context/ThemeContext';
import { AppShell } from '../../components/common/AppShell';
import { CreateLeaveSkeleton } from '../../components/common/Skeletons';
import {
    Calendar,
    Paperclip,
    Clock,
    Check,
    FileText,
    UploadCloud,
    X,
    Plus,
    History,
} from 'lucide-react-native';
import { format, differenceInCalendarDays, parseISO } from 'date-fns';

const DURATION_TYPES = [
    { id: 'full_day', label: 'Full Day' },
    { id: 'first_half', label: 'Morning' },
    { id: 'second_half', label: 'Afternoon' },
    { id: 'multi_day', label: 'Multi-Day' },
    { id: 'custom_time', label: 'Custom Hours' },
];

export const CreateLeaveScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
    const { isDark } = useAppTheme();
    const { theme } = useUnistyles();
    const styles = stylesheet;

    const [isLoading, setIsLoading] = useState(true);
    const [balances, setBalances] = useState<LeaveBalance[]>([]);
    const [selectedLeaveTypeId, setSelectedLeaveTypeId] = useState<number>(1);
    const [durationType, setDurationType] = useState<string>('full_day');

    const todayStr = format(new Date(), 'yyyy-MM-dd');
    const [startDate, setStartDate] = useState(todayStr);
    const [endDate, setEndDate] = useState(todayStr);
    const [startTime, setStartTime] = useState('08:00');
    const [endTime, setEndTime] = useState('12:00');
    const [reason, setReason] = useState('');
    const [attachment, setAttachment] = useState<any>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        loadBalances();
    }, []);

    const loadBalances = async () => {
        try {
            setIsLoading(true);
            const res = await leaveApi.getMyBalances();
            if (Array.isArray(res)) setBalances(res);
            else if (Array.isArray(res?.balances)) setBalances(res.balances);
        } catch (e) {
            setBalances([
                { id: 1, remaining_days: 13, allocated_days: 18, used_days: 4, pending_days: 1, leave_type: { id: 1, name: 'Annual Leave' } },
                { id: 2, remaining_days: 7, allocated_days: 7, used_days: 0, pending_days: 0, leave_type: { id: 2, name: 'Sick Leave' } },
                { id: 3, remaining_days: 3, allocated_days: 3, used_days: 0, pending_days: 0, leave_type: { id: 3, name: 'Special Leave' } },
            ]);
        } finally {
            setIsLoading(false);
        }
    };

    const pickDocument = async () => {
        try {
            const result = await DocumentPicker.getDocumentAsync({
                type: ['application/pdf', 'image/*'],
            });
            if (!result.canceled && result.assets && result.assets.length > 0) {
                setAttachment(result.assets[0]);
            }
        } catch (e) {
            console.error('Picker error', e);
        }
    };

    const calculateTotalDuration = () => {
        if (durationType === 'full_day') return '1 Day';
        if (durationType === 'first_half' || durationType === 'second_half') return '0.5 Day';
        if (durationType === 'custom_time') return 'Custom Time';
        if (durationType === 'multi_day') {
            try {
                const start = parseISO(startDate);
                const end = parseISO(endDate);
                const diff = differenceInCalendarDays(end, start) + 1;
                if (isNaN(diff) || diff <= 0) return '1 Day';
                return `${diff} ${diff > 1 ? 'Days' : 'Day'}`;
            } catch (e) {
                return '1 Day';
            }
        }
        return '1 Day';
    };

    const handleSubmit = async () => {
        if (!reason.trim()) {
            Alert.alert('Reason Required', 'Please provide a clear reason for your leave request.');
            return;
        }

        setIsSubmitting(true);
        try {
            const attachmentsArr = attachment ? [{ uri: attachment.uri, name: attachment.name }] : [];
            await leaveApi.submitLeaveRequest({
                leave_type_id: selectedLeaveTypeId,
                duration_type: durationType,
                start_date: startDate,
                end_date: durationType === 'full_day' || durationType === 'first_half' || durationType === 'second_half' ? startDate : endDate,
                start_time: durationType === 'custom_time' ? startTime : undefined,
                end_time: durationType === 'custom_time' ? endTime : undefined,
                reason,
                attachments: attachmentsArr,
            });

            if (Platform.OS === 'web') {
                window.alert('Application Submitted: Your leave request has been submitted to your line manager for review.');
                navigation.navigate('LeaveList');
            } else {
                Alert.alert('Application Submitted', 'Your leave request has been submitted to your line manager for review.', [
                    { text: 'OK', onPress: () => navigation.navigate('LeaveList') },
                ]);
            }
        } catch (err: any) {
            Alert.alert('Submission Error', err?.message || 'Failed to submit leave request.');
        } finally {
            setIsSubmitting(false);
        }
    };

    const headerRight = (
        <TouchableOpacity
            style={styles.headerIconBtnSubtle}
            onPress={() => navigation.navigate('LeaveList')}
            activeOpacity={0.8}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
            <History color={theme.colors.primary} size={20} />
        </TouchableOpacity>
    );

    return (
        <AppShell title="Apply Leave" onBack={() => navigation.goBack()} headerRight={headerRight}>
            {isLoading ? (
                <CreateLeaveSkeleton />
            ) : (
                <>
                    {/* 1. Leave Category Selector (Matches Leave Balances carousel style) */}
                    <Text style={styles.sectionTitle}>Select Leave Category</Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.balanceCarousel}>
                        {balances.map((b) => {
                            const lType = b.leave_type || (b as any).leaveType;
                            const typeId = typeof lType === 'object' ? lType.id : b.id;
                            const typeName = typeof lType === 'object' ? lType.name : String(lType || 'Leave');
                            const remDays = b.remaining_days ?? (b as any).balance ?? (b as any).remaining ?? 0;
                            const usedDays = b.used_days ?? (b as any).total_taken ?? (b as any).taken ?? 0;
                            const allocDays = b.allocated_days ?? (b as any).total_accrued ?? (b as any).allowed ?? 0;
                            const isSelected = selectedLeaveTypeId === typeId;

                            return (
                                <TouchableOpacity
                                    key={typeId}
                                    style={[styles.balanceCard, isSelected && styles.balanceCardSelected]}
                                    onPress={() => setSelectedLeaveTypeId(typeId)}
                                    activeOpacity={0.85}
                                >
                                    <View style={styles.cardHeader}>
                                        <Text style={[styles.balanceType, isSelected && styles.balanceTypeSelected]}>
                                            {typeName}
                                        </Text>
                                        {isSelected && (
                                            <View style={styles.selectedCheckBadge}>
                                                <Check color="#FFFFFF" size={10} />
                                            </View>
                                        )}
                                    </View>
                                    <Text style={styles.balanceRemaining}>{remDays} Days</Text>
                                    <Text style={styles.balanceSub}>
                                        Used {usedDays} of {allocDays} days
                                    </Text>
                                </TouchableOpacity>
                            );
                        })}
                    </ScrollView>

                    {/* 2. Duration Type Switcher (Horizontal Scrollable Pills) */}
                    <Text style={styles.sectionTitle}>Duration Mode</Text>
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
                                    onPress={() => setDurationType(dt.id)}
                                    activeOpacity={0.8}
                                >
                                    <Text style={[styles.durationPillText, isSelected && styles.durationPillTextActive]}>
                                        {dt.label}
                                    </Text>
                                </TouchableOpacity>
                            );
                        })}
                    </ScrollView>

            {/* 3. Leave Schedule Card (Matches Request Card style) */}
            <View style={styles.cardSection}>
                <View style={styles.cardHeader}>
                    <View style={styles.typeGroup}>
                        <Calendar color={theme.colors.primary} size={16} />
                        <Text style={styles.cardHeaderTitle}>Leave Schedule</Text>
                    </View>
                    <View style={styles.durationPill}>
                        <Text style={styles.durationPillText}>{calculateTotalDuration()}</Text>
                    </View>
                </View>

                <View style={styles.dateRow}>
                    <View style={styles.dateField}>
                        <Text style={styles.inputLabel}>Start Date</Text>
                        <TextInput
                            style={styles.input}
                            value={startDate}
                            onChangeText={setStartDate}
                            placeholder="YYYY-MM-DD"
                            placeholderTextColor={theme.colors.textSecondary}
                        />
                    </View>

                    {durationType === 'multi_day' && (
                        <View style={styles.dateField}>
                            <Text style={styles.inputLabel}>End Date</Text>
                            <TextInput
                                style={styles.input}
                                value={endDate}
                                onChangeText={setEndDate}
                                placeholder="YYYY-MM-DD"
                                placeholderTextColor={theme.colors.textSecondary}
                            />
                        </View>
                    )}
                </View>

                {durationType === 'custom_time' && (
                    <View style={[styles.dateRow, { marginTop: 10 }]}>
                        <View style={styles.dateField}>
                            <Text style={styles.inputLabel}>Start Time</Text>
                            <TextInput
                                style={styles.input}
                                value={startTime}
                                onChangeText={setStartTime}
                                placeholder="HH:mm"
                                placeholderTextColor={theme.colors.textSecondary}
                            />
                        </View>
                        <View style={styles.dateField}>
                            <Text style={styles.inputLabel}>End Time</Text>
                            <TextInput
                                style={styles.input}
                                value={endTime}
                                onChangeText={setEndTime}
                                placeholder="HH:mm"
                                placeholderTextColor={theme.colors.textSecondary}
                            />
                        </View>
                    </View>
                )}
            </View>

            {/* 4. Reason Application Card */}
            <View style={styles.cardSection}>
                <View style={styles.cardHeader}>
                    <View style={styles.typeGroup}>
                        <FileText color={theme.colors.primary} size={16} />
                        <Text style={styles.cardHeaderTitle}>Reason for Application</Text>
                    </View>
                </View>
                <TextInput
                    style={[styles.input, styles.textArea]}
                    value={reason}
                    onChangeText={setReason}
                    placeholder="Describe clear reason for leave application..."
                    placeholderTextColor={theme.colors.textSecondary}
                    multiline
                    numberOfLines={4}
                />
            </View>

            {/* 5. Document Attachment Card */}
            <View style={styles.cardSection}>
                <View style={styles.cardHeader}>
                    <View style={styles.typeGroup}>
                        <Paperclip color={theme.colors.primary} size={16} />
                        <Text style={styles.cardHeaderTitle}>Proof / Supporting Document</Text>
                    </View>
                </View>

                {attachment ? (
                    <View style={styles.attachedCard}>
                        <View style={styles.attachedLeft}>
                            <FileText color={theme.colors.primary} size={18} />
                            <Text style={styles.attachedName} numberOfLines={1}>
                                {attachment.name}
                            </Text>
                        </View>
                        <TouchableOpacity onPress={() => setAttachment(null)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                            <X color={theme.colors.status.danger} size={18} />
                        </TouchableOpacity>
                    </View>
                ) : (
                    <TouchableOpacity style={styles.attachBox} onPress={pickDocument} activeOpacity={0.8}>
                        <Paperclip color={theme.colors.primary} size={18} />
                        <Text style={styles.attachBoxText}>Upload Medical Certificate or Proof</Text>
                    </TouchableOpacity>
                )}
            </View>

            {/* Submit Button (Matches LeaveListScreen primary action button) */}
            <TouchableOpacity
                style={styles.submitBtn}
                onPress={handleSubmit}
                disabled={isSubmitting}
                activeOpacity={0.85}
            >
                {isSubmitting ? (
                    <ActivityIndicator color="#FFFFFF" />
                ) : (
                    <Text style={styles.submitBtnText}>Submit Leave Application</Text>
                )}
            </TouchableOpacity>
                </>
            )}
        </AppShell>
    );
};

const stylesheet = StyleSheet.create((theme) => ({
    sectionTitle: {
        fontSize: 15,
        fontWeight: '700',
        color: theme.colors.textPrimary,
        marginTop: theme.spacing.sm,
        marginBottom: theme.spacing.xs + 2,
    },
    balanceCarousel: {
        flexDirection: 'row',
        marginBottom: theme.spacing.lg,
    },
    balanceCard: {
        backgroundColor: theme.colors.surface,
        borderRadius: theme.borderRadius.lg,
        padding: theme.spacing.md,
        marginRight: theme.spacing.md,
        width: 160,
        borderWidth: 1.5,
        borderColor: theme.colors.border,
    },
    balanceCardSelected: {
        borderColor: theme.colors.primary,
        backgroundColor: theme.colors.surface,
        ...theme.shadows.sm,
    },
    cardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: theme.spacing.xs,
    },
    balanceType: {
        fontSize: 12,
        fontWeight: '700',
        color: theme.colors.textSecondary,
    },
    balanceTypeSelected: {
        color: theme.colors.primary,
    },
    selectedCheckBadge: {
        width: 16,
        height: 16,
        borderRadius: 8,
        backgroundColor: theme.colors.primary,
        justifyContent: 'center',
        alignItems: 'center',
    },
    balanceRemaining: {
        fontSize: 22,
        fontWeight: '900',
        color: theme.colors.primary,
        marginVertical: 4,
    },
    balanceSub: {
        fontSize: 11,
        color: theme.colors.textSecondary,
    },
    durationScrollView: {
        marginBottom: theme.spacing.lg,
    },
    durationScrollContent: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: theme.spacing.xs + 2,
        paddingVertical: 2,
    },
    durationPillBtn: {
        paddingHorizontal: theme.spacing.md,
        paddingVertical: theme.spacing.xs + 4,
        backgroundColor: theme.colors.surfaceSubtle,
        borderRadius: theme.borderRadius.full,
        borderWidth: 1,
        borderColor: theme.colors.border,
    },
    durationPillBtnActive: {
        backgroundColor: theme.colors.surface,
        borderColor: theme.colors.primary,
        ...theme.shadows.sm,
    },
    durationPillText: {
        fontSize: 12,
        fontWeight: '600',
        color: theme.colors.textSecondary,
    },
    durationPillTextActive: {
        fontWeight: '700',
        color: theme.colors.primary,
    },
    cardSection: {
        backgroundColor: theme.colors.surface,
        borderRadius: theme.borderRadius.lg,
        padding: theme.spacing.md,
        marginBottom: theme.spacing.md,
    },
    typeGroup: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    cardHeaderTitle: {
        fontSize: 13,
        fontWeight: '700',
        color: theme.colors.textPrimary,
        marginLeft: theme.spacing.xs + 2,
    },
    durationPill: {
        backgroundColor: theme.colors.surfaceSubtle,
        paddingHorizontal: theme.spacing.sm + 2,
        paddingVertical: 3,
        borderRadius: theme.borderRadius.full,
    },
    dateRow: {
        flexDirection: 'row',
        gap: theme.spacing.md,
    },
    dateField: {
        flex: 1,
    },
    inputLabel: {
        fontSize: 12,
        fontWeight: '600',
        color: theme.colors.textSecondary,
        marginBottom: 4,
    },
    input: {
        backgroundColor: theme.colors.surfaceSubtle,
        borderRadius: theme.borderRadius.md,
        borderWidth: 1,
        borderColor: theme.colors.border,
        color: theme.colors.textPrimary,
        paddingHorizontal: theme.spacing.md,
        height: 44,
        fontSize: 13,
    },
    textArea: {
        height: 90,
        textAlignVertical: 'top',
        paddingTop: theme.spacing.sm + 2,
    },
    attachBox: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: theme.colors.surfaceSubtle,
        borderRadius: theme.borderRadius.md,
        padding: theme.spacing.md,
        borderWidth: 1,
        borderColor: theme.colors.border,
        borderStyle: 'dashed',
    },
    attachBoxText: {
        fontSize: 13,
        fontWeight: '600',
        color: theme.colors.primary,
        marginLeft: theme.spacing.sm,
    },
    attachedCard: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundColor: theme.colors.surfaceSubtle,
        borderRadius: theme.borderRadius.md,
        padding: theme.spacing.md,
        borderWidth: 1,
        borderColor: theme.colors.border,
    },
    attachedLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
        gap: theme.spacing.sm,
    },
    attachedName: {
        fontSize: 13,
        fontWeight: '700',
        color: theme.colors.textPrimary,
        flex: 1,
    },
    submitBtn: {
        backgroundColor: theme.colors.primary,
        height: 48,
        borderRadius: theme.borderRadius.md,
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: theme.spacing.sm,
        marginBottom: theme.spacing.xl,
        ...theme.shadows.sm,
    },
    submitBtnText: {
        color: '#FFFFFF',
        fontWeight: '700',
        fontSize: 15,
    },
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
}));


