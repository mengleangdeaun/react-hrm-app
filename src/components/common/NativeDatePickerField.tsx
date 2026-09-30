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
} from 'lucide-react-native';
import { useAppTheme } from '../../context/ThemeContext';
import { lightTheme, darkTheme } from '../../styles/theme';
import {
    format,
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
    DateDisplayVariant,
} from '../../utils/dateTime';

export interface NativeDatePickerFieldProps {
    label?: string;
    value: string; // YYYY-MM-DD
    onChange: (dateStr: string) => void;
    minDate?: string; // YYYY-MM-DD
    maxDate?: string; // YYYY-MM-DD
    containerStyle?: any;
    error?: string;
    displayVariant?: DateDisplayVariant;
    placeholder?: string;
    isClearable?: boolean;
}

export const NativeDatePickerField: React.FC<NativeDatePickerFieldProps> = ({
    label,
    value,
    onChange,
    minDate,
    maxDate,
    containerStyle,
    error,
    displayVariant = 'standard',
    placeholder = 'Select Date',
    isClearable = false,
}) => {
    const { isDark } = useAppTheme();
    const theme = isDark ? darkTheme : lightTheme;

    const [modalVisible, setModalVisible] = useState(false);

    // Selected Date inside modal
    const parsedInitial = useMemo(() => {
        let d = value ? parseDateOnly(value) : new Date();
        const dStr = formatDateOnly(d);
        if (minDate && dStr < minDate) {
            d = parseDateOnly(minDate);
        }
        if (maxDate && dStr > maxDate) {
            d = parseDateOnly(maxDate);
        }
        return d;
    }, [value, minDate, maxDate]);

    const [selectedDate, setSelectedDate] = useState<Date>(parsedInitial);
    const [viewMonth, setViewMonth] = useState<Date>(() => startOfMonth(parsedInitial));

    const formattedDisplay = value
        ? formatDateDisplay(value, displayVariant)
        : placeholder;

    const handleOpen = () => {
        let d = value ? parseDateOnly(value) : new Date();
        const dStr = formatDateOnly(d);
        if (minDate && dStr < minDate) {
            d = parseDateOnly(minDate);
        }
        if (maxDate && dStr > maxDate) {
            d = parseDateOnly(maxDate);
        }
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
                accessibilityLabel={`${label || placeholder}: ${formattedDisplay}`}
                style={[
                    styles.fieldWrapper,
                    {
                        backgroundColor: theme.colors.surface,
                        borderColor: error ? theme.colors.status.danger : theme.colors.border,
                    },
                ]}
            >
                <View style={styles.fieldContent}>
                    <View style={styles.iconContainer}>
                        <CalendarIcon color={theme.colors.brand} size={18} />
                    </View>
                    <Text
                        numberOfLines={1}
                        style={[
                            styles.fieldText,
                            {
                                color: value ? theme.colors.textPrimary : theme.colors.textDisabled,
                            },
                        ]}
                    >
                        {formattedDisplay}
                    </Text>
                </View>

                {isClearable && Boolean(value) && (
                    <TouchableOpacity
                        onPress={() => {
                            onChange('');
                            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
                        }}
                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                        style={styles.clearBtn}
                        accessibilityLabel="Clear date"
                    >
                        <X size={15} color={theme.colors.textSecondary} />
                    </TouchableOpacity>
                )}
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
                        style={[styles.confirmBtn, { backgroundColor: theme.colors.brand }]}
                        activeOpacity={0.85}
                    >
                        <Text style={styles.confirmBtnText}>
                            Select {formatDateDisplay(selectedDate, 'standard')}
                        </Text>
                    </TouchableOpacity>
                }
            >
                {/* Month Switcher Header */}
                <View style={styles.monthNavRow}>
                    <TouchableOpacity
                        onPress={() => setViewMonth((prev) => subMonths(prev, 1))}
                        style={[styles.navBtn, { backgroundColor: theme.colors.surfaceSubtle }]}
                        accessibilityRole="button"
                        accessibilityLabel="Previous month"
                        activeOpacity={0.7}
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
                        activeOpacity={0.7}
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
                                            backgroundColor: theme.colors.brand,
                                        },
                                        !isSelected && isCurrentDay && {
                                            borderWidth: 1.5,
                                            borderColor: theme.colors.brand,
                                            backgroundColor: isDark ? 'rgba(255, 255, 255, 0.08)' : theme.colors.brandSubtle,
                                        },
                                        disabled && {
                                            opacity: 0.25,
                                        },
                                    ]}
                                >
                                    <Text
                                        style={[
                                            styles.dayCellText,
                                            {
                                                color: isSelected
                                                    ? '#FFFFFF'
                                                    : disabled
                                                    ? theme.colors.textDisabled
                                                    : !isCurrentMonth
                                                    ? theme.colors.textDisabled
                                                    : isCurrentDay
                                                    ? theme.colors.brand
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
        justifyContent: 'space-between',
        height: 50,
        borderRadius: 14,
        borderWidth: 1.5,
        paddingHorizontal: 12,
    },
    fieldContent: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
        marginRight: 6,
    },
    iconContainer: {
        marginRight: 10,
    },
    clearBtn: {
        padding: 4,
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
    monthNavRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12,
    },
    monthNavTitle: {
        fontSize: 15,
        fontWeight: '800',
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
        marginBottom: 8,
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
        textAlign: 'center',
    },
    confirmBtn: {
        height: 52,
        borderRadius: 16,
        justifyContent: 'center',
        alignItems: 'center',
        width: '100%',
    },
    confirmBtnText: {
        color: '#FFFFFF',
        fontSize: 15,
        fontWeight: '700',
    },
});
