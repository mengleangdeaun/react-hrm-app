import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    ScrollView,
    SafeAreaView,
    StatusBar,
    Alert,
    ActivityIndicator,
} from 'react-native';
import { StyleSheet, useUnistyles } from 'react-native-unistyles';
import * as DocumentPicker from 'expo-document-picker';
import { leaveApi, LeaveBalance } from '../../api/leave';
import { useAppTheme } from '../../context/ThemeContext';
import { ArrowLeft, Calendar, Paperclip, Clock, Check, FileText } from 'lucide-react-native';
import { format } from 'date-fns';

const DURATION_TYPES = [
    { id: 'full_day', label: 'Full Day', desc: 'Single full working day' },
    { id: 'first_half', label: 'Morning (1st Half)', desc: 'Morning session only' },
    { id: 'second_half', label: 'Afternoon (2nd Half)', desc: 'Afternoon session only' },
    { id: 'multi_day', label: 'Multi-Day', desc: 'Multiple consecutive days' },
    { id: 'custom_time', label: 'Custom Hours', desc: 'Specific hourly timeframe' },
];

export const CreateLeaveScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
    const { isDark } = useAppTheme();
    const { theme } = useUnistyles();
    const styles = stylesheet;

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
            const res = await leaveApi.getMyBalances();
            if (Array.isArray(res)) setBalances(res);
            else if (Array.isArray(res?.balances)) setBalances(res.balances);
        } catch (e) {
            setBalances([
                { id: 1, remaining_days: 13, allocated_days: 18, used_days: 4, pending_days: 1, leave_type: { id: 1, name: 'Annual Leave' } },
                { id: 2, remaining_days: 7, allocated_days: 7, used_days: 0, pending_days: 0, leave_type: { id: 2, name: 'Sick Leave' } },
                { id: 3, remaining_days: 3, allocated_days: 3, used_days: 0, pending_days: 0, leave_type: { id: 3, name: 'Special Leave' } },
            ]);
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

            Alert.alert('Application Submitted', 'Your leave request has been submitted to your line manager for review.', [
                { text: 'OK', onPress: () => navigation.goBack() },
            ]);
        } catch (err: any) {
            Alert.alert('Submission Error', err?.message || 'Failed to submit leave request.');
        } finally {
            setIsSubmitting(false);
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
                <Text style={styles.headerTitle}>Apply for Leave</Text>
                <View style={{ width: 40 }} />
            </View>

            <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
                {/* 1. Leave Category Selector */}
                <Text style={styles.sectionLabel}>Select Leave Category</Text>
                <View style={styles.typeGrid}>
                    {balances.map((b) => {
                        const typeId = typeof b.leave_type === 'object' ? b.leave_type.id : b.id;
                        const typeName = typeof b.leave_type === 'object' ? b.leave_type.name : String(b.leave_type || 'Leave');
                        const isSelected = selectedLeaveTypeId === typeId;

                        return (
                            <TouchableOpacity
                                key={typeId}
                                style={[styles.typeTile, isSelected && styles.typeTileSelected]}
                                onPress={() => setSelectedLeaveTypeId(typeId)}
                                activeOpacity={0.8}
                            >
                                <View style={styles.typeTileTop}>
                                    <Text style={[styles.typeTileName, isSelected && styles.typeTileNameSelected]}>
                                        {typeName}
                                    </Text>
                                    {isSelected && <Check color={theme.colors.primary} size={16} />}
                                </View>
                                <Text style={styles.typeTileBalance}>{b.remaining_days} Days Rem.</Text>
                            </TouchableOpacity>
                        );
                    })}
                </View>

                {/* 2. Duration Type Selector */}
                <Text style={styles.sectionLabel}>Duration Mode</Text>
                <View style={styles.durationOptions}>
                    {DURATION_TYPES.map((dt) => {
                        const isSelected = durationType === dt.id;
                        return (
                            <TouchableOpacity
                                key={dt.id}
                                style={[styles.durationTile, isSelected && styles.durationTileSelected]}
                                onPress={() => setDurationType(dt.id)}
                                activeOpacity={0.8}
                            >
                                <Text style={[styles.durationLabel, isSelected && styles.durationLabelSelected]}>
                                    {dt.label}
                                </Text>
                                <Text style={styles.durationDesc}>{dt.desc}</Text>
                            </TouchableOpacity>
                        );
                    })}
                </View>

                {/* 3. Dates & Times */}
                <Text style={styles.sectionLabel}>Leave Schedule</Text>
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
                    <View style={styles.dateRow}>
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

                {/* 4. Reason Text Area */}
                <Text style={styles.sectionLabel}>Reason for Application</Text>
                <TextInput
                    style={[styles.input, styles.textArea]}
                    value={reason}
                    onChangeText={setReason}
                    placeholder="Describe reason for leave application..."
                    placeholderTextColor={theme.colors.textSecondary}
                    multiline
                    numberOfLines={4}
                />

                {/* 5. Document Attachment */}
                <Text style={styles.sectionLabel}>Proof / Supporting Document (Optional)</Text>
                <TouchableOpacity style={styles.attachBox} onPress={pickDocument} activeOpacity={0.8}>
                    <Paperclip color={theme.colors.primary} size={20} />
                    <Text style={styles.attachBoxText}>
                        {attachment ? attachment.name : 'Upload Medical Certificate or Proof'}
                    </Text>
                </TouchableOpacity>

                {/* Submit Button */}
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
    container: {
        flex: 1,
    },
    scrollContent: {
        paddingHorizontal: theme.spacing.md + 4,
        paddingBottom: theme.spacing.xl,
    },
    sectionLabel: {
        fontSize: 13,
        fontWeight: '700',
        color: theme.colors.textSecondary,
        textTransform: 'uppercase',
        marginTop: theme.spacing.md,
        marginBottom: theme.spacing.xs + 2,
    },
    typeGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: theme.spacing.sm,
    },
    typeTile: {
        width: '48%',
        backgroundColor: theme.colors.surface,
        borderRadius: theme.borderRadius.lg,
        padding: theme.spacing.md,
        borderWidth: 1,
        borderColor: theme.colors.border,
        ...theme.shadows.sm,
    },
    typeTileSelected: {
        borderColor: theme.colors.primary,
        backgroundColor: 'rgba(37, 99, 235, 0.05)',
    },
    typeTileTop: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 4,
    },
    typeTileName: {
        fontSize: 13,
        fontWeight: '700',
        color: theme.colors.textPrimary,
    },
    typeTileNameSelected: {
        color: theme.colors.primary,
    },
    typeTileBalance: {
        fontSize: 11,
        color: theme.colors.textSecondary,
    },
    durationOptions: {
        gap: theme.spacing.xs + 2,
    },
    durationTile: {
        backgroundColor: theme.colors.surface,
        borderRadius: theme.borderRadius.md,
        padding: theme.spacing.sm + 4,
        borderWidth: 1,
        borderColor: theme.colors.border,
    },
    durationTileSelected: {
        borderColor: theme.colors.primary,
        backgroundColor: 'rgba(37, 99, 235, 0.05)',
    },
    durationLabel: {
        fontSize: 14,
        fontWeight: '700',
        color: theme.colors.textPrimary,
    },
    durationLabelSelected: {
        color: theme.colors.primary,
    },
    durationDesc: {
        fontSize: 11,
        color: theme.colors.textSecondary,
        marginTop: 2,
    },
    dateRow: {
        flexDirection: 'row',
        gap: theme.spacing.md,
        marginBottom: theme.spacing.sm,
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
        backgroundColor: theme.colors.surface,
        borderRadius: theme.borderRadius.md,
        borderWidth: 1,
        borderColor: theme.colors.border,
        color: theme.colors.textPrimary,
        paddingHorizontal: theme.spacing.md,
        height: 48,
        fontSize: 14,
    },
    textArea: {
        height: 100,
        textAlignVertical: 'top',
        paddingTop: theme.spacing.md,
    },
    attachBox: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: theme.colors.surface,
        borderRadius: theme.borderRadius.md,
        padding: theme.spacing.md,
        borderWidth: 1.5,
        borderColor: theme.colors.border,
        borderStyle: 'dashed',
        marginBottom: theme.spacing.xl,
    },
    attachBoxText: {
        fontSize: 13,
        fontWeight: '600',
        color: theme.colors.primary,
        marginLeft: theme.spacing.sm,
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
