import React, { useState } from 'react';
import {
    View,
    TouchableOpacity,
    Modal,
    StyleSheet,
} from 'react-native';
import { AppText as Text } from '../AppText';
import {
    format,
    parseISO,
    isValid,
    addDays,
    nextMonday,
    startOfMonth,
    endOfMonth,
    startOfWeek,
    endOfWeek,
    eachDayOfInterval,
    isSameMonth,
    isSameDay,
    addMonths,
    subMonths,
} from 'date-fns';
import * as Haptics from 'expo-haptics';
import {
    Calendar as CalendarIcon,
    ChevronLeft,
    ChevronRight,
    X,
    Check,
} from 'lucide-react-native';
import { useAppTheme } from '../../context/ThemeContext';
import { lightTheme, darkTheme } from '../../styles/theme';

export interface NativeDatePickerFieldProps {
    label?: string;
    value: string; // YYYY-MM-DD
    onChange: (dateStr: string) => void;
    minDate?: string;
    maxDate?: string;
    containerStyle?: any;
    error?: string;
}

export const NativeDatePickerField: React.FC<NativeDatePickerFieldProps> = ({
    label,
    value,
    onChange,
    minDate,
    maxDate,
    containerStyle,
    error,
}) => {
    const { isDark } = useAppTheme();
    const theme = isDark ? darkTheme : lightTheme;

    const [modalVisible, setModalVisible] = useState(false);

    // Selected Date inside modal
    const parsedInitial = value && isValid(parseISO(value)) ? parseISO(value) : new Date();
    const [selectedDate, setSelectedDate] = useState<Date>(parsedInitial);
    const [viewMonth, setViewMonth] = useState<Date>(() => startOfMonth(parsedInitial));

    const formattedDisplay = value && isValid(parseISO(value))
        ? format(parseISO(value), 'EEE, dd MMM yyyy')
        : 'Select Date';

    const handleOpen = () => {
        const d = value && isValid(parseISO(value)) ? parseISO(value) : new Date();
        setSelectedDate(d);
        setViewMonth(startOfMonth(d));
        setModalVisible(true);
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    };

    const handleConfirm = () => {
        const dateStr = format(selectedDate, 'yyyy-MM-dd');
        onChange(dateStr);
        setModalVisible(false);
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    };

    const handleQuickSelect = (d: Date) => {
        setSelectedDate(d);
        setViewMonth(startOfMonth(d));
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    };

    // Calendar generation for modal view
    const monthStart = startOfMonth(viewMonth);
    const monthEnd = endOfMonth(monthStart);
    const startDate = startOfWeek(monthStart, { weekStartsOn: 1 });
    const endDate = endOfWeek(monthEnd, { weekStartsOn: 1 });
    const calendarDays = eachDayOfInterval({ start: startDate, end: endDate });

    return (
        <View style={[styles.container, containerStyle]}>
            {label && (
                <Text style={[styles.label, { color: theme.colors.textSecondary }]}>
                    {label}
                </Text>
            )}

            <TouchableOpacity
                onPress={handleOpen}
                activeOpacity={0.75}
                style={[
                    styles.fieldWrapper,
                    {
                        backgroundColor: theme.colors.surface,
                        borderColor: error ? theme.colors.status.danger : theme.colors.border,
                    },
                ]}
            >
                <View style={styles.iconContainer}>
                    <CalendarIcon color={theme.colors.primary} size={18} />
                </View>
                <Text
                    style={[
                        styles.fieldText,
                        {
                            color: value ? theme.colors.textPrimary : theme.colors.textDisabled,
                        },
                    ]}
                >
                    {formattedDisplay}
                </Text>
            </TouchableOpacity>

            {error && (
                <Text style={[styles.errorText, { color: theme.colors.status.danger }]}>
                    {error}
                </Text>
            )}

            {/* Native Calendar Picker Bottom Sheet Modal */}
            <Modal
                visible={modalVisible}
                transparent
                animationType="fade"
                onRequestClose={() => setModalVisible(false)}
            >
                <View style={styles.modalBackdrop}>
                    <TouchableOpacity
                        style={styles.backdropDismiss}
                        activeOpacity={1}
                        onPress={() => setModalVisible(false)}
                    />

                    <View style={[styles.sheetContainer, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
                        {/* Sheet Handle */}
                        <View style={styles.sheetHandle} />

                        {/* Sheet Header */}
                        <View style={styles.sheetHeader}>
                            <TouchableOpacity
                                onPress={() => setModalVisible(false)}
                                style={[styles.circleBtn, { backgroundColor: theme.colors.surfaceSubtle }]}
                            >
                                <X color={theme.colors.textPrimary} size={18} />
                            </TouchableOpacity>
                            <Text style={[styles.sheetTitle, { color: theme.colors.textPrimary }]}>
                                {label || 'Select Date'}
                            </Text>
                            <TouchableOpacity
                                onPress={handleConfirm}
                                style={[styles.circleBtn, { backgroundColor: theme.colors.primary }]}
                            >
                                <Check color="#FFFFFF" size={18} />
                            </TouchableOpacity>
                        </View>

                        {/* Quick Presets */}
                        <View style={styles.presetsRow}>
                            <TouchableOpacity
                                onPress={() => handleQuickSelect(new Date())}
                                style={[styles.presetChip, { backgroundColor: theme.colors.surfaceSubtle }]}
                            >
                                <Text style={[styles.presetText, { color: theme.colors.textPrimary }]}>Today</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                onPress={() => handleQuickSelect(addDays(new Date(), 1))}
                                style={[styles.presetChip, { backgroundColor: theme.colors.surfaceSubtle }]}
                            >
                                <Text style={[styles.presetText, { color: theme.colors.textPrimary }]}>Tomorrow</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                onPress={() => handleQuickSelect(nextMonday(new Date()))}
                                style={[styles.presetChip, { backgroundColor: theme.colors.surfaceSubtle }]}
                            >
                                <Text style={[styles.presetText, { color: theme.colors.textPrimary }]}>Next Mon</Text>
                            </TouchableOpacity>
                        </View>

                        {/* Month Switcher Header */}
                        <View style={styles.monthNavRow}>
                            <TouchableOpacity
                                onPress={() => setViewMonth((prev) => subMonths(prev, 1))}
                                style={[styles.navBtn, { backgroundColor: theme.colors.surfaceSubtle }]}
                            >
                                <ChevronLeft color={theme.colors.textPrimary} size={18} />
                            </TouchableOpacity>
                            <Text style={[styles.monthNavTitle, { color: theme.colors.textPrimary }]}>
                                {format(viewMonth, 'MMMM yyyy')}
                            </Text>
                            <TouchableOpacity
                                onPress={() => setViewMonth((prev) => addMonths(prev, 1))}
                                style={[styles.navBtn, { backgroundColor: theme.colors.surfaceSubtle }]}
                            >
                                <ChevronRight color={theme.colors.textPrimary} size={18} />
                            </TouchableOpacity>
                        </View>

                        {/* Weekday Labels */}
                        <View style={styles.weekdaysRow}>
                            {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((w, idx) => (
                                <Text key={idx} style={[styles.weekdayText, { color: theme.colors.textSecondary }]}>
                                    {w}
                                </Text>
                            ))}
                        </View>

                        {/* Calendar Grid */}
                        <View style={styles.calendarGrid}>
                            {calendarDays.map((d) => {
                                const isCurrentMonth = isSameMonth(d, viewMonth);
                                const isSelected = isSameDay(d, selectedDate);

                                return (
                                    <TouchableOpacity
                                        key={d.toISOString()}
                                        onPress={() => {
                                            setSelectedDate(d);
                                            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
                                        }}
                                        style={[
                                            styles.dayCell,
                                            isSelected && {
                                                backgroundColor: theme.colors.primary,
                                                borderRadius: 12,
                                            },
                                        ]}
                                    >
                                        <Text
                                            style={[
                                                styles.dayCellText,
                                                {
                                                    color: isSelected
                                                        ? '#FFFFFF'
                                                        : isCurrentMonth
                                                        ? theme.colors.textPrimary
                                                        : theme.colors.textDisabled,
                                                    fontWeight: isSelected ? '700' : '500',
                                                },
                                            ]}
                                        >
                                            {format(d, 'd')}
                                        </Text>
                                    </TouchableOpacity>
                                );
                            })}
                        </View>

                        {/* Confirm Button */}
                        <TouchableOpacity
                            onPress={handleConfirm}
                            style={[styles.confirmBtn, { backgroundColor: theme.colors.primary }]}
                            activeOpacity={0.8}
                        >
                            <Text style={styles.confirmBtnText}>
                                Select {format(selectedDate, 'MMM dd, yyyy')}
                            </Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        marginBottom: 14,
        width: '100%',
    },
    label: {
        fontSize: 13,
        fontWeight: '600',
        marginBottom: 6,
        letterSpacing: 0.2,
    },
    fieldWrapper: {
        flexDirection: 'row',
        alignItems: 'center',
        height: 48,
        borderRadius: 12,
        borderWidth: 1.5,
        paddingHorizontal: 12,
    },
    iconContainer: {
        marginRight: 10,
    },
    fieldText: {
        fontSize: 14,
        fontWeight: '600',
    },
    errorText: {
        fontSize: 12,
        fontWeight: '500',
        marginTop: 4,
        marginLeft: 2,
    },
    modalBackdrop: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.55)',
        justifyContent: 'flex-end',
    },
    backdropDismiss: {
        flex: 1,
    },
    sheetContainer: {
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        borderTopWidth: 1,
        paddingHorizontal: 20,
        paddingBottom: 36,
        paddingTop: 10,
    },
    sheetHandle: {
        width: 36,
        height: 4,
        borderRadius: 2,
        backgroundColor: 'rgba(150, 150, 150, 0.4)',
        alignSelf: 'center',
        marginBottom: 14,
    },
    sheetHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 14,
    },
    circleBtn: {
        width: 36,
        height: 36,
        borderRadius: 18,
        justifyContent: 'center',
        alignItems: 'center',
    },
    sheetTitle: {
        fontSize: 16,
        fontWeight: '700',
    },
    presetsRow: {
        flexDirection: 'row',
        gap: 8,
        marginBottom: 14,
    },
    presetChip: {
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 8,
    },
    presetText: {
        fontSize: 12,
        fontWeight: '600',
    },
    monthNavRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 10,
    },
    monthNavTitle: {
        fontSize: 15,
        fontWeight: '700',
    },
    navBtn: {
        width: 32,
        height: 32,
        borderRadius: 8,
        justifyContent: 'center',
        alignItems: 'center',
    },
    weekdaysRow: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        marginBottom: 6,
    },
    weekdayText: {
        width: 36,
        textAlign: 'center',
        fontSize: 11,
        fontWeight: '700',
    },
    calendarGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'space-around',
        marginBottom: 16,
    },
    dayCell: {
        width: 38,
        height: 38,
        justifyContent: 'center',
        alignItems: 'center',
        marginVertical: 2,
    },
    dayCellText: {
        fontSize: 13,
    },
    confirmBtn: {
        height: 48,
        borderRadius: 14,
        justifyContent: 'center',
        alignItems: 'center',
    },
    confirmBtnText: {
        color: '#FFFFFF',
        fontSize: 15,
        fontWeight: '700',
    },
});
