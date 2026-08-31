import React, { useState, useMemo } from 'react';
import {
    View,
    TouchableOpacity,
    StyleSheet,
} from 'react-native';
import { AppText as Text } from '../AppText';
import { AppBottomSheet } from './AppBottomSheet';
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
import {
    format,
    addDays,
    startOfMonth,
    endOfMonth,
    startOfWeek,
    endOfWeek,
    eachDayOfInterval,
    isSameMonth,
    isSameDay,
    isToday,
    addMonths,
    subMonths,
    parseDateOnly,
    formatDateOnly,
    formatDateDisplay,
} from '../../utils/dateTime';

export interface NativeDatePickerFieldProps {
    label?: string;
    value: string; // YYYY-MM-DD
    onChange: (dateStr: string) => void;
    minDate?: string; // YYYY-MM-DD
    maxDate?: string; // YYYY-MM-DD
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
    const parsedInitial = useMemo(() => (value ? parseDateOnly(value) : new Date()), [value]);
    const [selectedDate, setSelectedDate] = useState<Date>(parsedInitial);
    const [viewMonth, setViewMonth] = useState<Date>(() => startOfMonth(parsedInitial));

    const formattedDisplay = value ? formatDateDisplay(value, 'full') : 'Select Date';

    const handleOpen = () => {
        const d = value ? parseDateOnly(value) : new Date();
        setSelectedDate(d);
        setViewMonth(startOfMonth(d));
        setModalVisible(true);
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    };

    const handleConfirm = () => {
        const dateStr = formatDateOnly(selectedDate);
        onChange(dateStr);
        setModalVisible(false);
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    };

    const handleQuickSelect = (d: Date) => {
        const dateStr = formatDateOnly(d);
        if (minDate && dateStr < minDate) return;
        if (maxDate && dateStr > maxDate) return;

        setSelectedDate(d);
        setViewMonth(startOfMonth(d));
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    };

    // Calendar generation for modal view
    const calendarDays = useMemo(() => {
        const monthStart = startOfMonth(viewMonth);
        const monthEnd = endOfMonth(monthStart);
        const startDate = startOfWeek(monthStart, { weekStartsOn: 1 });
        const endDate = endOfWeek(monthEnd, { weekStartsOn: 1 });
        return eachDayOfInterval({ start: startDate, end: endDate });
    }, [viewMonth]);

    const isDateDisabled = (date: Date): boolean => {
        const dateStr = formatDateOnly(date);
        if (minDate && dateStr < minDate) return true;
        if (maxDate && dateStr > maxDate) return true;
        return false;
    };

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
                accessibilityRole="button"
                accessibilityLabel={`${label || 'Select Date'}: ${formattedDisplay}`}
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
            <AppBottomSheet
                visible={modalVisible}
                onClose={() => setModalVisible(false)}
                title={label || 'Select Date'}
                footer={
                    <TouchableOpacity
                        onPress={handleConfirm}
                        style={[styles.confirmBtn, { backgroundColor: theme.colors.primary }]}
                        activeOpacity={0.8}
                    >
                        <Text style={styles.confirmBtnText}>
                            Select {formatDateDisplay(selectedDate, 'standard')}
                        </Text>
                    </TouchableOpacity>
                }
            >
                {/* Quick Presets */}
                <View style={styles.presetsRow}>
                    <TouchableOpacity
                        onPress={() => handleQuickSelect(new Date())}
                        disabled={isDateDisabled(new Date())}
                        style={[
                            styles.presetChip,
                            { backgroundColor: theme.colors.surfaceSubtle },
                            isDateDisabled(new Date()) && { opacity: 0.4 },
                        ]}
                    >
                        <Text style={[styles.presetText, { color: theme.colors.textPrimary }]}>Today</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        onPress={() => handleQuickSelect(addDays(new Date(), 1))}
                        disabled={isDateDisabled(addDays(new Date(), 1))}
                        style={[
                            styles.presetChip,
                            { backgroundColor: theme.colors.surfaceSubtle },
                            isDateDisabled(addDays(new Date(), 1)) && { opacity: 0.4 },
                        ]}
                    >
                        <Text style={[styles.presetText, { color: theme.colors.textPrimary }]}>Tomorrow</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        onPress={() => handleQuickSelect(addDays(new Date(), 7))}
                        disabled={isDateDisabled(addDays(new Date(), 7))}
                        style={[
                            styles.presetChip,
                            { backgroundColor: theme.colors.surfaceSubtle },
                            isDateDisabled(addDays(new Date(), 7)) && { opacity: 0.4 },
                        ]}
                    >
                        <Text style={[styles.presetText, { color: theme.colors.textPrimary }]}>+1 Week</Text>
                    </TouchableOpacity>
                </View>

                {/* Month Switcher Header */}
                <View style={styles.monthNavRow}>
                    <TouchableOpacity
                        onPress={() => setViewMonth((prev) => subMonths(prev, 1))}
                        style={[styles.navBtn, { backgroundColor: theme.colors.surfaceSubtle }]}
                        accessibilityRole="button"
                        accessibilityLabel="Previous month"
                    >
                        <ChevronLeft color={theme.colors.textPrimary} size={18} />
                    </TouchableOpacity>
                    <Text style={[styles.monthNavTitle, { color: theme.colors.textPrimary }]}>
                        {format(viewMonth, 'MMMM yyyy')}
                    </Text>
                    <TouchableOpacity
                        onPress={() => setViewMonth((prev) => addMonths(prev, 1))}
                        style={[styles.navBtn, { backgroundColor: theme.colors.surfaceSubtle }]}
                        accessibilityRole="button"
                        accessibilityLabel="Next month"
                    >
                        <ChevronRight color={theme.colors.textPrimary} size={18} />
                    </TouchableOpacity>
                </View>

                {/* Weekday Labels (Mon - Sun) */}
                <View style={styles.weekdaysRow}>
                    {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((w, idx) => (
                        <View key={idx} style={styles.weekdayCol}>
                            <Text style={[styles.weekdayText, { color: theme.colors.textSecondary }]}>
                                {w}
                            </Text>
                        </View>
                    ))}
                </View>

                {/* Calendar Grid */}
                <View style={styles.calendarGrid}>
                    {calendarDays.map((d) => {
                        const isCurrentMonth = isSameMonth(d, viewMonth);
                        const isSelected = isSameDay(d, selectedDate);
                        const isCurrentDay = isToday(d);
                        const disabled = isDateDisabled(d);

                        return (
                            <View key={d.toISOString()} style={styles.dayCellCol}>
                                <TouchableOpacity
                                    disabled={disabled}
                                    onPress={() => {
                                        setSelectedDate(d);
                                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
                                    }}
                                    accessibilityRole="button"
                                    accessibilityLabel={`${format(d, 'MMMM d, yyyy')}${isSelected ? ', selected' : ''}${isCurrentDay ? ', today' : ''}${disabled ? ', disabled' : ''}`}
                                    accessibilityState={{ selected: isSelected, disabled }}
                                    style={[
                                        styles.dayCell,
                                        isSelected && {
                                            backgroundColor: theme.colors.primary,
                                        },
                                        !isSelected && isCurrentDay && {
                                            borderWidth: 1.5,
                                            borderColor: theme.colors.primary,
                                            backgroundColor: isDark ? 'rgba(255, 255, 255, 0.08)' : theme.colors.surfaceSubtle,
                                        },
                                        disabled && {
                                            opacity: 0.25,
                                        },
                                    ]}
                                >
                                    <Text
                                        style={[
                                            styles.dayText,
                                            {
                                                color: isSelected
                                                    ? '#FFFFFF'
                                                    : disabled
                                                    ? theme.colors.textDisabled
                                                    : !isCurrentMonth
                                                    ? theme.colors.textDisabled
                                                    : isCurrentDay
                                                    ? theme.colors.primary
                                                    : theme.colors.textPrimary,
                                                fontWeight: isSelected || isCurrentDay ? '700' : '500',
                                            },
                                        ]}
                                    >
                                        {format(d, 'd')}
                                    </Text>
                                </TouchableOpacity>
                            </View>
                        );
                    })}
                </View>
            </AppBottomSheet>
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
        width: 36,
        height: 36,
        borderRadius: 10,
        justifyContent: 'center',
        alignItems: 'center',
    },
    weekdaysRow: {
        flexDirection: 'row',
        marginBottom: 6,
    },
    weekdayCol: {
        width: '14.285%',
        alignItems: 'center',
        justifyContent: 'center',
    },
    weekdayText: {
        textAlign: 'center',
        fontSize: 11,
        fontWeight: '700',
    },
    calendarGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        marginBottom: 16,
    },
    dayCellCol: {
        width: '14.285%',
        aspectRatio: 1,
        padding: 2,
        justifyContent: 'center',
        alignItems: 'center',
    },
    dayCell: {
        width: '100%',
        height: '100%',
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
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
