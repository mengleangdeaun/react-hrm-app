import React, { useMemo } from 'react';
import { View, TouchableOpacity, StyleSheet } from 'react-native';
import { AppText as Text } from '../AppText';
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
    parseISO,
    startOfDay,
} from 'date-fns';
import { useAppTheme } from '../../context/ThemeContext';
import { lightTheme, darkTheme } from '../../styles/theme';
import { CalendarMonthData } from '../../api/calendar';

interface MonthCalendarGridProps {
    currentMonth: Date;
    selectedDate: Date | null;
    onSelectDate: (date: Date) => void;
    data?: CalendarMonthData;
}

const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

export const MonthCalendarGrid: React.FC<MonthCalendarGridProps> = ({
    currentMonth,
    selectedDate,
    onSelectDate,
    data,
}) => {
    const { isDark } = useAppTheme();
    const theme = isDark ? darkTheme : lightTheme;

    // Generate grid calendar days (Monday - Sunday)
    const calendarDays = useMemo(() => {
        const monthStart = startOfMonth(currentMonth);
        const monthEnd = endOfMonth(monthStart);
        const startDate = startOfWeek(monthStart, { weekStartsOn: 1 });
        const endDate = endOfWeek(monthEnd, { weekStartsOn: 1 });

        return eachDayOfInterval({ start: startDate, end: endDate });
    }, [currentMonth]);

    // Check Day Status Helper
    const getDayStatuses = (date: Date) => {
        const dateStr = format(date, 'yyyy-MM-dd');
        const dayName = format(date, 'eeee').toLowerCase();

        // 1. Attendance
        const isAttended = (data?.attendance || []).some((a) => a.date === dateStr);

        // 2. Holiday
        const isHoliday = (data?.holidays || []).some(
            (h) => dateStr >= h.start_date && dateStr <= h.end_date
        );

        // 3. Leave
        const isLeave = (data?.leaves || []).some(
            (l) => (l.status === 'approved' || l.status === 'pending') && dateStr >= l.start_date && dateStr <= l.end_date
        );

        // 4. Day Off
        let isDayOff = false;
        if (data?.day_offs && data.day_offs.length > 0) {
            const activeAssignment = data.day_offs.find((d) => {
                const from = d.effective_from;
                const to = d.effective_to;
                return dateStr >= from && (!to || dateStr <= to);
            });

            if (activeAssignment) {
                if (activeAssignment.frequency === 'specific_dates') {
                    isDayOff = (activeAssignment.specific_dates || []).includes(dateStr);
                } else if (activeAssignment.frequency === 'monthly') {
                    const daysOffList = (activeAssignment.days_off || []).map((dn) => dn.toLowerCase());
                    if (daysOffList.includes(dayName)) {
                        const weekOfMonth = Math.ceil(date.getDate() / 7);
                        const isLastWeek = new Date(date.getFullYear(), date.getMonth(), date.getDate() + 7).getMonth() !== date.getMonth();
                        const weeks = activeAssignment.weeks_of_month || [];
                        isDayOff = weeks.includes(weekOfMonth) || (weeks.includes(5) && isLastWeek);
                    }
                } else {
                    const daysOffList = (activeAssignment.days_off || []).map((dn) => dn.toLowerCase());
                    isDayOff = daysOffList.includes(dayName);
                }
            }
        }

        // Check fallback weekly working shift if not overridden
        if (!isDayOff && data?.working_days) {
            const shiftDay = Array.isArray(data.working_days)
                ? data.working_days[date.getDay()]
                : data.working_days[dayName];
            if (shiftDay && shiftDay.is_working === false) {
                isDayOff = true;
            }
        }

        return { isAttended, isHoliday, isLeave, isDayOff };
    };

    return (
        <View style={[styles.container, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
            {/* Weekdays Header */}
            <View style={styles.weekdaysRow}>
                {WEEKDAYS.map((day) => (
                    <Text key={day} style={[styles.weekdayLabel, { color: theme.colors.textSecondary }]}>
                        {day}
                    </Text>
                ))}
            </View>

            {/* Dates Grid */}
            <View style={styles.daysGrid}>
                {calendarDays.map((date) => {
                    const isCurrentMonth = isSameMonth(date, currentMonth);
                    const isSelected = selectedDate ? isSameDay(date, selectedDate) : false;
                    const isCurrentDay = isToday(date);
                    const { isAttended, isHoliday, isLeave, isDayOff } = getDayStatuses(date);

                    return (
                        <TouchableOpacity
                            key={date.toISOString()}
                            style={[
                                styles.dayCell,
                                isSelected && {
                                    backgroundColor: theme.colors.primary,
                                    borderRadius: 12,
                                },
                                !isSelected && isCurrentDay && {
                                    backgroundColor: isDark ? 'rgba(255, 255, 255, 0.08)' : theme.colors.surfaceSubtle,
                                    borderRadius: 12,
                                    borderWidth: 1,
                                    borderColor: theme.colors.primary,
                                },
                            ]}
                            onPress={() => onSelectDate(date)}
                            activeOpacity={0.7}
                        >
                            <Text
                                style={[
                                    styles.dayText,
                                    {
                                        color: isSelected
                                            ? '#FFFFFF'
                                            : !isCurrentMonth
                                            ? theme.colors.textDisabled
                                            : isCurrentDay
                                            ? theme.colors.primary
                                            : theme.colors.textPrimary,
                                        fontWeight: isSelected || isCurrentDay ? '700' : '500',
                                    },
                                ]}
                            >
                                {format(date, 'd')}
                            </Text>

                            {/* Status Indicator Dots */}
                            <View style={styles.dotsRow}>
                                {isAttended && (
                                    <View
                                        style={[
                                            styles.dot,
                                            { backgroundColor: isSelected ? '#FFFFFF' : '#10B981' },
                                        ]}
                                    />
                                )}
                                {isHoliday && (
                                    <View
                                        style={[
                                            styles.dot,
                                            { backgroundColor: isSelected ? '#FEF08A' : '#F59E0B' },
                                        ]}
                                    />
                                )}
                                {isLeave && (
                                    <View
                                        style={[
                                            styles.dot,
                                            { backgroundColor: isSelected ? '#E9D5FF' : '#8B5CF6' },
                                        ]}
                                    />
                                )}
                                {isDayOff && !isHoliday && (
                                    <View
                                        style={[
                                            styles.dot,
                                            { backgroundColor: isSelected ? '#FECDD3' : '#F43F5E' },
                                        ]}
                                    />
                                )}
                            </View>
                        </TouchableOpacity>
                    );
                })}
            </View>

            {/* Legend Bar */}
            <View style={[styles.legendRow, { borderTopColor: theme.colors.border }]}>
                <View style={styles.legendItem}>
                    <View style={[styles.legendDot, { backgroundColor: '#F43F5E' }]} />
                    <Text style={[styles.legendText, { color: theme.colors.textSecondary }]}>Day Off</Text>
                </View>
                <View style={styles.legendItem}>
                    <View style={[styles.legendDot, { backgroundColor: '#10B981' }]} />
                    <Text style={[styles.legendText, { color: theme.colors.textSecondary }]}>Present</Text>
                </View>
                <View style={styles.legendItem}>
                    <View style={[styles.legendDot, { backgroundColor: '#F59E0B' }]} />
                    <Text style={[styles.legendText, { color: theme.colors.textSecondary }]}>Holiday</Text>
                </View>
                <View style={styles.legendItem}>
                    <View style={[styles.legendDot, { backgroundColor: '#8B5CF6' }]} />
                    <Text style={[styles.legendText, { color: theme.colors.textSecondary }]}>Leave</Text>
                </View>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        borderRadius: 20,
        borderWidth: 1,
        overflow: 'hidden',
        paddingVertical: 12,
        paddingHorizontal: 10,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 6,
        elevation: 2,
    },
    weekdaysRow: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        marginBottom: 8,
        paddingHorizontal: 2,
    },
    weekdayLabel: {
        width: 40,
        textAlign: 'center',
        fontSize: 11,
        fontWeight: '700',
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    daysGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'space-around',
    },
    dayCell: {
        width: 42,
        height: 46,
        justifyContent: 'center',
        alignItems: 'center',
        marginVertical: 2,
    },
    dayText: {
        fontSize: 14,
    },
    dotsRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 3,
        height: 6,
        marginTop: 2,
    },
    dot: {
        width: 4,
        height: 4,
        borderRadius: 2,
    },
    legendRow: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        alignItems: 'center',
        paddingTop: 12,
        marginTop: 8,
        borderTopWidth: 1,
    },
    legendItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    legendDot: {
        width: 7,
        height: 7,
        borderRadius: 4,
    },
    legendText: {
        fontSize: 11,
        fontWeight: '600',
        textTransform: 'uppercase',
        letterSpacing: 0.3,
    },
});
