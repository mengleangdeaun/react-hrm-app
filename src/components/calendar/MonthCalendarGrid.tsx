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
} from 'date-fns';
import { useAppTheme } from '../../context/ThemeContext';
import { useTranslation } from '../../context/LanguageContext';
import { lightTheme, darkTheme } from '../../styles/theme';
import { CalendarMonthData } from '../../api/calendar';

interface MonthCalendarGridProps {
    currentMonth: Date;
    selectedDate: Date | null;
    onSelectDate: (date: Date) => void;
    data?: CalendarMonthData;
}

const WEEKDAYS = [
    { key: 'weekday_mon', fallback: 'Mon' },
    { key: 'weekday_tue', fallback: 'Tue' },
    { key: 'weekday_wed', fallback: 'Wed' },
    { key: 'weekday_thu', fallback: 'Thu' },
    { key: 'weekday_fri', fallback: 'Fri' },
    { key: 'weekday_sat', fallback: 'Sat' },
    { key: 'weekday_sun', fallback: 'Sun' },
];

export const MonthCalendarGrid: React.FC<MonthCalendarGridProps> = ({
    currentMonth,
    selectedDate,
    onSelectDate,
    data,
}) => {
    const { isDark } = useAppTheme();
    const { t } = useTranslation();
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
                    <Text key={day.key} style={[styles.weekdayLabel, { color: theme.colors.textSecondary }]}>
                        {t(day.key, day.fallback)}
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
                                styles.dayCellWrapper,
                            ]}
                            onPress={() => onSelectDate(date)}
                            activeOpacity={0.7}
                        >
                            <View
                                style={[
                                    styles.dayCellInner,
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
                            </View>
                        </TouchableOpacity>
                    );
                })}
            </View>

            {/* Legend Bar */}
            <View style={[styles.legendRow, { borderTopColor: theme.colors.border }]}>
                <View style={styles.legendItem}>
                    <View style={[styles.legendDot, { backgroundColor: '#F43F5E' }]} />
                    <Text style={[styles.legendText, { color: theme.colors.textSecondary }]}>{t('day_off', 'Day Off')}</Text>
                </View>
                <View style={styles.legendItem}>
                    <View style={[styles.legendDot, { backgroundColor: '#10B981' }]} />
                    <Text style={[styles.legendText, { color: theme.colors.textSecondary }]}>{t('present', 'Present')}</Text>
                </View>
                <View style={styles.legendItem}>
                    <View style={[styles.legendDot, { backgroundColor: '#F59E0B' }]} />
                    <Text style={[styles.legendText, { color: theme.colors.textSecondary }]}>{t('holiday', 'Holiday')}</Text>
                </View>
                <View style={styles.legendItem}>
                    <View style={[styles.legendDot, { backgroundColor: '#8B5CF6' }]} />
                    <Text style={[styles.legendText, { color: theme.colors.textSecondary }]}>{t('leave', 'Leave')}</Text>
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
        paddingHorizontal: 8,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 6,
        elevation: 2,
    },
    weekdaysRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 8,
    },
    weekdayLabel: {
        width: '14.28%',
        textAlign: 'center',
        fontSize: 11,
        fontWeight: '700',
        textTransform: 'uppercase',
        letterSpacing: 0.4,
    },
    daysGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
    },
    dayCellWrapper: {
        width: '14.28%',
        aspectRatio: 1,
        padding: 2,
        justifyContent: 'center',
        alignItems: 'center',
    },
    dayCellInner: {
        width: '100%',
        height: '100%',
        justifyContent: 'center',
        alignItems: 'center',
    },
    dayText: {
        fontSize: 13,
    },
    dotsRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 2.5,
        height: 5,
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
        gap: 5,
    },
    legendDot: {
        width: 7,
        height: 7,
        borderRadius: 4,
    },
    legendText: {
        fontSize: 10,
        fontWeight: '600',
        textTransform: 'uppercase',
        letterSpacing: 0.3,
    },
});
