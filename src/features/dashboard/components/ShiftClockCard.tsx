import React from 'react';
import { View, TouchableOpacity } from 'react-native';
import {
    Clock,
    Check,
    AlertTriangle,
    QrCode,
    Coffee,
    Moon,
    Sun,
    CheckCircle2,
} from 'lucide-react-native';
import { StyleSheet, useUnistyles } from 'react-native-unistyles';
import { AppText as Text } from '../../../components/AppText';
import { DigitalClock } from '../../../components/dashboard/DigitalClock';
import { formatDateDisplay } from '../../../utils/dateTime';
import { useTranslation } from '../../../context/LanguageContext';
import { ProactiveGuardStatus } from '../../../hooks/useAttendanceGuard';
import { TimelineNode } from '../types';

interface ShiftClockCardProps {
    todayDisplayDate: Date;
    locale: string;
    timelineNodes: TimelineNode[];
    isSplitShift: boolean;
    out1: string | null;
    in2: string | null;
    out2: string | null;
    proactiveStatus: ProactiveGuardStatus | null;
    shiftPhase: string;
    onScanPress: () => void;
}

export const ShiftClockCard: React.FC<ShiftClockCardProps> = ({
    todayDisplayDate,
    locale,
    timelineNodes,
    isSplitShift,
    out1,
    in2,
    out2,
    proactiveStatus,
    shiftPhase,
    onScanPress,
}) => {
    const { t } = useTranslation();
    const { theme } = useUnistyles();
    const styles = stylesheet;

    const timelineActiveWidth = isSplitShift
        ? out2
            ? '75%'
            : in2
            ? '50%'
            : out1
            ? '25%'
            : '0%'
        : (out2 || out1)
        ? '50%'
        : '0%';

    return (
        <View style={styles.clockCard}>
            <DigitalClock style={styles.digitalClockText} />

            {/* Date subtitle */}
            <View style={styles.clockHeader}>
                <Clock color={theme.colors.primary} size={14} />
                <Text style={styles.dateText}>
                    {formatDateDisplay(todayDisplayDate, 'full', 'N/A', locale)}
                </Text>
            </View>

            {/* Timeline Nodes */}
            <View style={styles.timelineContainer}>
                <View
                    style={[
                        styles.timelineTrackBackground,
                        isSplitShift ? styles.timelineTrackSplit : styles.timelineTrackContinuous,
                    ]}
                />
                <View
                    style={[
                        styles.timelineTrackActive,
                        isSplitShift ? styles.timelineTrackSplit : styles.timelineTrackContinuous,
                        { width: timelineActiveWidth },
                    ]}
                />

                <View style={styles.timelineNodesRow}>
                    {timelineNodes.map((node) => (
                        <View key={node.key} style={styles.timelineNodeCol}>
                            <View
                                style={[
                                    styles.nodeCircle,
                                    node.active && styles.nodeCircleActive,
                                    node.isCurrent && styles.nodeCircleCurrent,
                                ]}
                            >
                                {node.active ? (
                                    <Check color="#FFFFFF" size={13} strokeWidth={3} />
                                ) : (
                                    <View
                                        style={[
                                            styles.nodeDot,
                                            node.isCurrent && styles.nodeDotCurrent,
                                        ]}
                                    />
                                )}
                            </View>
                            <Text
                                style={[
                                    styles.nodeLabel,
                                    node.active && styles.nodeLabelActive,
                                    node.isCurrent && styles.nodeLabelCurrent,
                                ]}
                            >
                                {node.label}
                            </Text>
                            <Text
                                style={[
                                    styles.nodeTime,
                                    node.active && styles.nodeTimeActive,
                                ]}
                            >
                                {node.time || '--:--'}
                            </Text>
                        </View>
                    ))}
                </View>
            </View>

            {/* Proactive Guard Notice if Late Arrival or Early Departure Detected */}
            {proactiveStatus?.require_reason && shiftPhase !== 'done' && (
                <View style={styles.proactiveWarningBox}>
                    <AlertTriangle color="#D97706" size={14} />
                    <Text style={styles.proactiveWarningText}>
                        {proactiveStatus.type === 'late'
                            ? `${t('late_warning', 'Late arrival')} (~${proactiveStatus.minutes}m). ${t('reason_required_prior_scan', 'Reason required before scanning.')}`
                            : `${t('early_warning', 'Early departure')} (~${proactiveStatus.minutes}m). ${t('reason_required_prior_scan', 'Reason required before scanning.')}`}
                    </Text>
                </View>
            )}

            {/* Contextual Smart Action Button */}
            <TouchableOpacity
                style={[
                    styles.clockButton,
                    shiftPhase === 'done' && styles.clockButtonDone,
                    shiftPhase === 'break' && styles.clockButtonBreak,
                ]}
                onPress={onScanPress}
                activeOpacity={0.85}
            >
                {shiftPhase === 'ready' && <QrCode color="#FFFFFF" size={20} />}
                {shiftPhase === 'session1' && (isSplitShift ? <Coffee color="#FFFFFF" size={20} /> : <Moon color="#FFFFFF" size={20} />)}
                {shiftPhase === 'break' && <Sun color="#FFFFFF" size={20} />}
                {shiftPhase === 'session2' && <Moon color="#FFFFFF" size={20} />}
                {shiftPhase === 'done' && <CheckCircle2 color="#FFFFFF" size={20} />}
                <Text style={styles.clockButtonText}>
                    {shiftPhase === 'ready'
                        ? t('scan_clock_in_now', 'Scan Clock In Now')
                        : shiftPhase === 'session1'
                        ? isSplitShift
                            ? t('scan_lunch_out', 'Scan Lunch Out')
                            : t('scan_clock_out', 'Scan Clock Out')
                        : shiftPhase === 'break'
                        ? t('scan_afternoon_in', 'Scan Afternoon In')
                        : shiftPhase === 'session2'
                        ? t('scan_clock_out', 'Scan Clock Out')
                        : t('shift_completed', 'Shift Completed')}
                </Text>
            </TouchableOpacity>
        </View>
    );
};

const stylesheet = StyleSheet.create((theme) => ({
    clockCard: {
        backgroundColor: theme.colors.surface,
        borderRadius: theme.borderRadius.lg,
        padding: theme.spacing.cardPadding,
        marginBottom: theme.spacing.lg,
        borderWidth: 0.5,
        borderColor: (theme.colors as any).borderSubtle || theme.colors.border,
    },
    clockHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: theme.spacing.md,
    },
    digitalClockText: {
        fontSize: 34,
        fontWeight: '800',
        color: theme.colors.textPrimary,
        letterSpacing: 1.5,
        textAlign: 'center',
        marginBottom: 4,
    },
    dateText: {
        fontSize: 12,
        color: theme.colors.textSecondary,
        marginLeft: 6,
        fontWeight: '500',
    },
    timelineContainer: {
        position: 'relative',
        marginVertical: theme.spacing.md,
        paddingHorizontal: 8,
    },
    timelineTrackBackground: {
        position: 'absolute',
        top: 14,
        height: 3,
        backgroundColor: theme.colors.border,
        borderRadius: 2,
    },
    timelineTrackActive: {
        position: 'absolute',
        top: 14,
        height: 3,
        backgroundColor: theme.colors.status.success,
        borderRadius: 2,
    },
    timelineTrackSplit: {
        left: '12%',
        right: '12%',
    },
    timelineTrackContinuous: {
        left: '25%',
        right: '25%',
    },
    timelineNodesRow: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        alignItems: 'flex-start',
    },
    timelineNodeCol: {
        alignItems: 'center',
        minWidth: 56,
    },
    nodeCircle: {
        width: 26,
        height: 26,
        borderRadius: 13,
        backgroundColor: theme.colors.surface,
        borderWidth: 2,
        borderColor: theme.colors.border,
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 2,
        marginBottom: 6,
    },
    nodeCircleActive: {
        backgroundColor: theme.colors.status.success,
        borderColor: theme.colors.status.success,
    },
    nodeCircleCurrent: {
        borderColor: theme.colors.primary,
        backgroundColor: theme.colors.surface,
    },
    nodeDot: {
        width: 6,
        height: 6,
        borderRadius: 3,
        backgroundColor: theme.colors.border,
    },
    nodeDotCurrent: {
        backgroundColor: theme.colors.primary,
        width: 8,
        height: 8,
        borderRadius: 4,
    },
    nodeLabel: {
        fontSize: 11,
        color: theme.colors.textSecondary,
        fontWeight: '500',
        marginBottom: 2,
    },
    nodeLabelActive: {
        color: theme.colors.textPrimary,
        fontWeight: '600',
    },
    nodeLabelCurrent: {
        color: theme.colors.primary,
        fontWeight: '700',
    },
    nodeTime: {
        fontSize: 10,
        color: theme.colors.textSecondary,
        fontWeight: '400',
    },
    nodeTimeActive: {
        color: theme.colors.status.success,
        fontWeight: '600',
    },
    proactiveWarningBox: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FEF3C7',
        paddingHorizontal: theme.spacing.sm + 4,
        paddingVertical: theme.spacing.xs + 2,
        borderRadius: theme.borderRadius.md,
        marginBottom: theme.spacing.md,
        gap: 6,
    },
    proactiveWarningText: {
        fontSize: 11,
        color: '#92400E',
        fontWeight: '600',
        flex: 1,
    },
    clockButton: {
        backgroundColor: theme.colors.primary,
        borderRadius: theme.borderRadius.md,
        paddingVertical: 14,
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        gap: 8,
    },
    clockButtonDone: {
        backgroundColor: theme.colors.status.success,
    },
    clockButtonBreak: {
        backgroundColor: '#F59E0B',
    },
    clockButtonText: {
        color: '#FFFFFF',
        fontSize: 15,
        fontWeight: '700',
    },
}));
