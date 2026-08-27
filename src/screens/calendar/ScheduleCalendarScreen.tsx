import React, { useState, useMemo, useEffect } from 'react';
import {
    View,
    StyleSheet,
    TouchableOpacity,
    ActivityIndicator,
} from 'react-native';
import { AppText as Text } from '../../components/AppText';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
    format,
    startOfMonth,
    addMonths,
    subMonths,
    isSameMonth,
    parseISO,
    startOfDay,
} from 'date-fns';
import {
    Clock,
    ChevronLeft,
    ChevronRight,
    CalendarPlus,
    CalendarCheck,
    CalendarOff,
    PartyPopper,
    Coffee,
    Calendar as CalendarIcon,
    AlertCircle,
} from 'lucide-react-native';
import { useAppTheme } from '../../context/ThemeContext';
import { lightTheme, darkTheme } from '../../styles/theme';
import { AppShell } from '../../components/common/AppShell';
import { HeaderIconButton } from '../../components/common/AppHeader';
import { calendarApi } from '../../api/calendar';
import { MonthCalendarGrid } from '../../components/calendar/MonthCalendarGrid';

export const ScheduleCalendarScreen: React.FC<{ navigation?: any }> = ({ navigation }) => {
    const { isDark } = useAppTheme();
    const theme = isDark ? darkTheme : lightTheme;
    const queryClient = useQueryClient();

    // Month & Date Selection State
    const [currentMonth, setCurrentMonth] = useState<Date>(() => startOfMonth(new Date()));
    const [selectedDate, setSelectedDate] = useState<Date | null>(() => startOfDay(new Date()));
    const [activeTab, setActiveTab] = useState<'workday' | 'holiday' | 'leave' | 'day_off'>('workday');

    const monthNumber = currentMonth.getMonth() + 1;
    const yearNumber = currentMonth.getFullYear();

    // Query Calendar Data
    const { data, isLoading, isRefetching, refetch } = useQuery({
        queryKey: ['calendarData', yearNumber, monthNumber],
        queryFn: () => calendarApi.getCalendarData(monthNumber, yearNumber),
        staleTime: 5 * 60 * 1000,
    });

    // Prefetch Adjacent Months for Zero-Latency Navigation
    useEffect(() => {
        const prev = subMonths(currentMonth, 1);
        queryClient.prefetchQuery({
            queryKey: ['calendarData', prev.getFullYear(), prev.getMonth() + 1],
            queryFn: () => calendarApi.getCalendarData(prev.getMonth() + 1, prev.getFullYear()),
            staleTime: 5 * 60 * 1000,
        });

        const next = addMonths(currentMonth, 1);
        queryClient.prefetchQuery({
            queryKey: ['calendarData', next.getFullYear(), next.getMonth() + 1],
            queryFn: () => calendarApi.getCalendarData(next.getMonth() + 1, next.getFullYear()),
            staleTime: 5 * 60 * 1000,
        });
    }, [currentMonth, queryClient]);

    // Format Time Utility
    const formatTime = (timeString?: string | null) => {
        if (!timeString) return '--:--';
        if (timeString.includes(':') && timeString.length <= 8) return timeString.substring(0, 5);
        try {
            const d = new Date(timeString);
            if (isNaN(d.getTime())) return timeString;
            return format(d, 'hh:mm a');
        } catch {
            return timeString;
        }
    };

    // Calculate Monthly Stats
    const stats = useMemo(() => {
        const attendanceCount = data?.attendance?.length || 0;
        const holidayCount = data?.holidays?.length || 0;
        const leaveCount = data?.leaves?.filter((l) => l.status === 'approved').length || 0;

        let dayOffCount = 0;
        const year = currentMonth.getFullYear();
        const month = currentMonth.getMonth();
        const daysInMonth = new Date(year, month + 1, 0).getDate();

        for (let day = 1; day <= daysInMonth; day++) {
            const date = new Date(year, month, day);
            const dayName = format(date, 'eeee').toLowerCase();
            const dateStr = format(date, 'yyyy-MM-dd');

            let isAssignedDayOff = false;
            if (data?.day_offs && data.day_offs.length > 0) {
                isAssignedDayOff = data.day_offs.some((d) => {
                    const start = d.effective_from;
                    const end = d.effective_to;
                    const isInRange = dateStr >= start && (!end || dateStr <= end);
                    if (!isInRange) return false;

                    if (d.frequency === 'specific_dates') {
                        return (d.specific_dates || []).includes(dateStr);
                    }
                    if (d.frequency === 'monthly') {
                        const days = (d.days_off || []).map((dn) => dn.toLowerCase());
                        if (!days.includes(dayName)) return false;

                        const weekOfMonth = Math.ceil(day / 7);
                        const isLastWeek = new Date(year, month, day + 7).getMonth() !== month;
                        const weeks = d.weeks_of_month || [];
                        return weeks.includes(weekOfMonth) || (weeks.includes(5) && isLastWeek);
                    }
                    const days = (d.days_off || []).map((dn) => dn.toLowerCase());
                    return days.includes(dayName);
                });
            }

            if (isAssignedDayOff) {
                dayOffCount++;
            } else if (data?.working_days) {
                const shiftDay = Array.isArray(data.working_days)
                    ? data.working_days[date.getDay()]
                    : data.working_days[dayName];
                if (shiftDay && shiftDay.is_working === false) {
                    dayOffCount++;
                }
            }
        }

        return {
            attendance: attendanceCount,
            holidays: holidayCount,
            leaves: leaveCount,
            dayOffs: dayOffCount,
        };
    }, [data, currentMonth]);

    const isCurrentMonthActive = isSameMonth(currentMonth, new Date());

    const handlePrevMonth = () => {
        setCurrentMonth((prev) => subMonths(prev, 1));
    };

    const handleNextMonth = () => {
        setCurrentMonth((prev) => addMonths(prev, 1));
    };

    const handleGoToday = () => {
        const today = new Date();
        setCurrentMonth(startOfMonth(today));
        setSelectedDate(startOfDay(today));
    };

    return (
        <AppShell
            title="My Calendar"
            refreshing={isRefetching}
            onRefresh={refetch}
            headerRight={
                <HeaderIconButton
                    icon={<CalendarPlus color={theme.colors.brand} size={20} />}
                    onPress={() => navigation?.navigate('CreateLeave')}
                    accessibilityLabel="Apply for leave"
                />
            }
        >
            {/* 1. Month Switcher Bar */}
            <View style={[styles.monthHeaderRow, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
                <TouchableOpacity onPress={handlePrevMonth} style={[styles.navBtn, { backgroundColor: theme.colors.surfaceSubtle }]} activeOpacity={0.7}>
                    <ChevronLeft color={theme.colors.textPrimary} size={20} />
                </TouchableOpacity>

                <View style={styles.monthTitleWrapper}>
                    <Text style={[styles.monthTitle, { color: theme.colors.textPrimary }]}>
                        {format(currentMonth, 'MMMM yyyy')}
                    </Text>
                    {!isCurrentMonthActive && (
                        <TouchableOpacity onPress={handleGoToday} style={[styles.todayBadge, { backgroundColor: theme.colors.primarySubtle }]}>
                            <Text style={[styles.todayBadgeText, { color: theme.colors.primary }]}>Today</Text>
                        </TouchableOpacity>
                    )}
                </View>

                <TouchableOpacity onPress={handleNextMonth} style={[styles.navBtn, { backgroundColor: theme.colors.surfaceSubtle }]} activeOpacity={0.7}>
                    <ChevronRight color={theme.colors.textPrimary} size={20} />
                </TouchableOpacity>
            </View>

            {/* 2. Monthly Summary Stats Row */}
            <View style={styles.statsRow}>
                <View style={[styles.statCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
                    <View style={[styles.statIconBadge, { backgroundColor: 'rgba(16, 185, 129, 0.12)' }]}>
                        <CalendarCheck color="#10B981" size={18} />
                    </View>
                    <View>
                        <Text style={[styles.statValue, { color: theme.colors.textPrimary }]}>{stats.attendance}</Text>
                        <Text style={[styles.statLabel, { color: theme.colors.textSecondary }]}>Present</Text>
                    </View>
                </View>

                <View style={[styles.statCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
                    <View style={[styles.statIconBadge, { backgroundColor: 'rgba(245, 158, 11, 0.12)' }]}>
                        <PartyPopper color="#F59E0B" size={18} />
                    </View>
                    <View>
                        <Text style={[styles.statValue, { color: theme.colors.textPrimary }]}>{stats.holidays}</Text>
                        <Text style={[styles.statLabel, { color: theme.colors.textSecondary }]}>Holidays</Text>
                    </View>
                </View>

                <View style={[styles.statCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
                    <View style={[styles.statIconBadge, { backgroundColor: 'rgba(139, 92, 246, 0.12)' }]}>
                        <CalendarPlus color="#8B5CF6" size={18} />
                    </View>
                    <View>
                        <Text style={[styles.statValue, { color: theme.colors.textPrimary }]}>{stats.leaves}</Text>
                        <Text style={[styles.statLabel, { color: theme.colors.textSecondary }]}>Leaves</Text>
                    </View>
                </View>

                <View style={[styles.statCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
                    <View style={[styles.statIconBadge, { backgroundColor: 'rgba(244, 63, 94, 0.12)' }]}>
                        <CalendarOff color="#F43F5E" size={18} />
                    </View>
                    <View>
                        <Text style={[styles.statValue, { color: theme.colors.textPrimary }]}>{stats.dayOffs}</Text>
                        <Text style={[styles.statLabel, { color: theme.colors.textSecondary }]}>Day Off</Text>
                    </View>
                </View>
            </View>

            {/* 3. Interactive Monthly Calendar Grid */}
            <MonthCalendarGrid
                currentMonth={currentMonth}
                selectedDate={selectedDate}
                onSelectDate={(date) => setSelectedDate(date)}
                data={data}
            />

            {/* 4. Agenda Tab Switcher */}
            <View style={[styles.tabBar, { backgroundColor: theme.colors.surfaceSubtle, borderColor: theme.colors.border }]}>
                <TouchableOpacity
                    onPress={() => setActiveTab('workday')}
                    style={[styles.tabItem, activeTab === 'workday' && { backgroundColor: theme.colors.surface }]}
                    activeOpacity={0.7}
                >
                    <Clock color={activeTab === 'workday' ? theme.colors.primary : theme.colors.textSecondary} size={14} />
                    <Text style={[styles.tabLabel, { color: activeTab === 'workday' ? theme.colors.textPrimary : theme.colors.textSecondary }]}>
                        Workday
                    </Text>
                </TouchableOpacity>

                <TouchableOpacity
                    onPress={() => setActiveTab('holiday')}
                    style={[styles.tabItem, activeTab === 'holiday' && { backgroundColor: theme.colors.surface }]}
                    activeOpacity={0.7}
                >
                    <PartyPopper color={activeTab === 'holiday' ? theme.colors.primary : theme.colors.textSecondary} size={14} />
                    <Text style={[styles.tabLabel, { color: activeTab === 'holiday' ? theme.colors.textPrimary : theme.colors.textSecondary }]}>
                        Holidays
                    </Text>
                </TouchableOpacity>

                <TouchableOpacity
                    onPress={() => setActiveTab('leave')}
                    style={[styles.tabItem, activeTab === 'leave' && { backgroundColor: theme.colors.surface }]}
                    activeOpacity={0.7}
                >
                    <CalendarPlus color={activeTab === 'leave' ? theme.colors.primary : theme.colors.textSecondary} size={14} />
                    <Text style={[styles.tabLabel, { color: activeTab === 'leave' ? theme.colors.textPrimary : theme.colors.textSecondary }]}>
                        Leaves
                    </Text>
                </TouchableOpacity>

                <TouchableOpacity
                    onPress={() => setActiveTab('day_off')}
                    style={[styles.tabItem, activeTab === 'day_off' && { backgroundColor: theme.colors.surface }]}
                    activeOpacity={0.7}
                >
                    <CalendarOff color={activeTab === 'day_off' ? theme.colors.primary : theme.colors.textSecondary} size={14} />
                    <Text style={[styles.tabLabel, { color: activeTab === 'day_off' ? theme.colors.textPrimary : theme.colors.textSecondary }]}>
                        Day Off
                    </Text>
                </TouchableOpacity>
            </View>

            {/* 5. Agenda Tab Content View */}
            {isLoading && !data ? (
                <View style={styles.loadingWrapper}>
                    <ActivityIndicator color={theme.colors.primary} size="large" />
                    <Text style={[styles.loadingText, { color: theme.colors.textSecondary }]}>Loading calendar details...</Text>
                </View>
            ) : (
                <View style={styles.tabContentContainer}>
                    {/* TAB 1: WORKDAY SCHEDULE */}
                    {activeTab === 'workday' && (
                        <View style={styles.tabSection}>
                            {data?.working_shift && (
                                <View style={[styles.shiftBanner, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
                                    <View style={styles.shiftHeader}>
                                        <Clock color={theme.colors.primary} size={18} />
                                        <Text style={[styles.shiftName, { color: theme.colors.textPrimary }]}>
                                            {data.working_shift.name || 'Assigned Shift'}
                                        </Text>
                                    </View>
                                    <Text style={[styles.shiftHours, { color: theme.colors.primary }]}>
                                        {formatTime(data.working_shift.start_time)} — {formatTime(data.working_shift.end_time)}
                                    </Text>
                                    <Text style={[styles.shiftType, { color: theme.colors.textSecondary }]}>
                                        Type: {data.working_shift.shift_type?.toUpperCase() || 'STANDARD'}
                                    </Text>
                                </View>
                            )}

                            <Text style={[styles.subSectionTitle, { color: theme.colors.textPrimary }]}>Weekly Schedule</Text>
                            {(['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'] as const).map((dayName) => {
                                const isTodayDay = format(new Date(), 'eeee').toLowerCase() === dayName;
                                const shiftDay = data?.working_days
                                    ? Array.isArray(data.working_days)
                                        ? data.working_days[['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'].indexOf(dayName)]
                                        : data.working_days[dayName]
                                    : null;

                                const isWorking = shiftDay?.is_working !== false;

                                return (
                                    <View
                                        key={dayName}
                                        style={[
                                            styles.dayScheduleCard,
                                            {
                                                backgroundColor: theme.colors.surface,
                                                borderColor: isTodayDay ? theme.colors.primary : theme.colors.border,
                                            },
                                        ]}
                                    >
                                        <View style={styles.dayScheduleHeader}>
                                            <View style={styles.dayTitleRow}>
                                                <Text style={[styles.dayScheduleName, { color: isTodayDay ? theme.colors.primary : theme.colors.textPrimary }]}>
                                                    {dayName.toUpperCase()}
                                                </Text>
                                                {isTodayDay && (
                                                    <View style={[styles.miniTodayBadge, { backgroundColor: theme.colors.primary }]}>
                                                        <Text style={styles.miniTodayText}>TODAY</Text>
                                                    </View>
                                                )}
                                            </View>
                                            <View
                                                style={[
                                                    styles.statusPill,
                                                    {
                                                        backgroundColor: isWorking
                                                            ? 'rgba(37, 99, 235, 0.1)'
                                                            : 'rgba(244, 63, 94, 0.1)',
                                                    },
                                                ]}
                                            >
                                                <Text
                                                    style={[
                                                        styles.statusPillText,
                                                        { color: isWorking ? '#2563EB' : '#F43F5E' },
                                                    ]}
                                                >
                                                    {isWorking ? 'REQUIRED' : 'DAY OFF'}
                                                </Text>
                                            </View>
                                        </View>

                                        {isWorking ? (
                                            <View style={styles.dayScheduleHoursRow}>
                                                <View>
                                                    <Text style={[styles.hoursLabel, { color: theme.colors.textSecondary }]}>HOURS</Text>
                                                    <Text style={[styles.hoursValue, { color: theme.colors.textPrimary }]}>
                                                        {formatTime(shiftDay?.start_time || data?.working_shift?.start_time)} — {formatTime(shiftDay?.end_time || data?.working_shift?.end_time)}
                                                    </Text>
                                                </View>
                                                {shiftDay?.has_break && (
                                                    <View style={styles.breakCol}>
                                                        <Text style={[styles.hoursLabel, { color: theme.colors.textSecondary }]}>BREAK</Text>
                                                        <Text style={[styles.breakValue, { color: theme.colors.textSecondary }]}>
                                                            {formatTime(shiftDay.break_start)} — {formatTime(shiftDay.break_end)}
                                                        </Text>
                                                    </View>
                                                )}
                                            </View>
                                        ) : (
                                            <Text style={[styles.noHoursText, { color: theme.colors.textSecondary }]}>
                                                No working hours scheduled.
                                            </Text>
                                        )}
                                    </View>
                                );
                            })}
                        </View>
                    )}

                    {/* TAB 2: HOLIDAYS */}
                    {activeTab === 'holiday' && (
                        <View style={styles.tabSection}>
                            {(!data?.holidays || data.holidays.length === 0) ? (
                                <View style={[styles.emptyCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
                                    <PartyPopper color={theme.colors.textDisabled} size={36} />
                                    <Text style={[styles.emptyTitle, { color: theme.colors.textPrimary }]}>No Holidays</Text>
                                    <Text style={[styles.emptySubtitle, { color: theme.colors.textSecondary }]}>
                                        There are no official public or company holidays scheduled in {format(currentMonth, 'MMMM yyyy')}.
                                    </Text>
                                </View>
                            ) : (
                                data.holidays.map((h) => (
                                    <View key={h.id} style={[styles.itemCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
                                        <View style={[styles.itemDateBadge, { backgroundColor: 'rgba(245, 158, 11, 0.12)' }]}>
                                            <Text style={[styles.itemDateDay, { color: '#F59E0B' }]}>
                                                {format(parseISO(h.start_date), 'dd')}
                                            </Text>
                                            <Text style={[styles.itemDateMonth, { color: '#F59E0B' }]}>
                                                {format(parseISO(h.start_date), 'MMM')}
                                            </Text>
                                        </View>
                                        <View style={styles.itemInfo}>
                                            <Text style={[styles.itemTitle, { color: theme.colors.textPrimary }]}>{h.title}</Text>
                                            <Text style={[styles.itemRange, { color: theme.colors.textSecondary }]}>
                                                {format(parseISO(h.start_date), 'MMM dd')}
                                                {h.end_date !== h.start_date ? ` — ${format(parseISO(h.end_date), 'MMM dd, yyyy')}` : `, ${format(parseISO(h.start_date), 'yyyy')}`}
                                            </Text>
                                            {h.description && (
                                                <Text style={[styles.itemDescription, { color: theme.colors.textSecondary }]}>
                                                    {h.description}
                                                </Text>
                                            )}
                                        </View>
                                    </View>
                                ))
                            )}
                        </View>
                    )}

                    {/* TAB 3: LEAVES */}
                    {activeTab === 'leave' && (
                        <View style={styles.tabSection}>
                            {(!data?.leaves || data.leaves.length === 0) ? (
                                <View style={[styles.emptyCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
                                    <CalendarPlus color={theme.colors.textDisabled} size={36} />
                                    <Text style={[styles.emptyTitle, { color: theme.colors.textPrimary }]}>No Leave Records</Text>
                                    <Text style={[styles.emptySubtitle, { color: theme.colors.textSecondary }]}>
                                        You have not taken or submitted any leaves during this month.
                                    </Text>
                                    <TouchableOpacity
                                        onPress={() => navigation?.navigate('CreateLeave')}
                                        style={[styles.emptyActionBtn, { backgroundColor: theme.colors.primary }]}
                                    >
                                        <Text style={styles.emptyActionBtnText}>Apply Leave</Text>
                                    </TouchableOpacity>
                                </View>
                            ) : (
                                data.leaves.map((l) => (
                                    <View key={l.id} style={[styles.itemCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
                                        <View style={[styles.itemDateBadge, { backgroundColor: 'rgba(139, 92, 246, 0.12)' }]}>
                                            <Text style={[styles.itemDateDay, { color: '#8B5CF6' }]}>
                                                {format(parseISO(l.start_date), 'dd')}
                                            </Text>
                                            <Text style={[styles.itemDateMonth, { color: '#8B5CF6' }]}>
                                                {format(parseISO(l.start_date), 'MMM')}
                                            </Text>
                                        </View>
                                        <View style={styles.itemInfo}>
                                            <View style={styles.itemTitleStatusRow}>
                                                <Text style={[styles.itemTitle, { color: theme.colors.textPrimary }]}>
                                                    {l.leave_type?.name || 'Leave Request'}
                                                </Text>
                                                <View
                                                    style={[
                                                        styles.statusPill,
                                                        {
                                                            backgroundColor:
                                                                l.status === 'approved'
                                                                    ? 'rgba(16, 185, 129, 0.12)'
                                                                    : 'rgba(245, 158, 11, 0.12)',
                                                        },
                                                    ]}
                                                >
                                                    <Text
                                                        style={[
                                                            styles.statusPillText,
                                                            { color: l.status === 'approved' ? '#10B981' : '#F59E0B' },
                                                        ]}
                                                    >
                                                        {l.status.toUpperCase()}
                                                    </Text>
                                                </View>
                                            </View>
                                            <Text style={[styles.itemRange, { color: theme.colors.textSecondary }]}>
                                                {format(parseISO(l.start_date), 'MMM dd')}
                                                {l.end_date !== l.start_date ? ` — ${format(parseISO(l.end_date), 'MMM dd')}` : ''}
                                            </Text>
                                            {l.reason && (
                                                <Text style={[styles.itemDescription, { color: theme.colors.textSecondary }]}>
                                                    "{l.reason}"
                                                </Text>
                                            )}
                                        </View>
                                    </View>
                                ))
                            )}
                        </View>
                    )}

                    {/* TAB 4: DAY OFF ASSIGNMENTS */}
                    {activeTab === 'day_off' && (
                        <View style={styles.tabSection}>
                            {(!data?.day_offs || data.day_offs.length === 0) ? (
                                <View style={[styles.emptyCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
                                    <Coffee color={theme.colors.textDisabled} size={36} />
                                    <Text style={[styles.emptyTitle, { color: theme.colors.textPrimary }]}>Standard Rest Days</Text>
                                    <Text style={[styles.emptySubtitle, { color: theme.colors.textSecondary }]}>
                                        You follow the standard working shift days with no custom override assignments.
                                    </Text>
                                </View>
                            ) : (
                                data.day_offs.map((d) => (
                                    <View key={d.id} style={[styles.itemCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
                                        <View style={[styles.itemDateBadge, { backgroundColor: 'rgba(244, 63, 94, 0.12)' }]}>
                                            <CalendarOff color="#F43F5E" size={22} />
                                        </View>
                                        <View style={styles.itemInfo}>
                                            <Text style={[styles.itemTitle, { color: theme.colors.textPrimary }]}>
                                                {d.days_off ? d.days_off.map((day) => day.toUpperCase()).join(', ') : 'Custom Day Off'}
                                            </Text>
                                            <Text style={[styles.itemRange, { color: theme.colors.textSecondary }]}>
                                                Frequency: {d.frequency.toUpperCase()} • Effective: {format(parseISO(d.effective_from), 'MMM dd, yyyy')}
                                                {d.effective_to ? ` — ${format(parseISO(d.effective_to), 'MMM dd, yyyy')}` : ' (Ongoing)'}
                                            </Text>
                                            {d.reason && (
                                                <Text style={[styles.itemDescription, { color: theme.colors.textSecondary }]}>
                                                    "{d.reason}"
                                                </Text>
                                            )}
                                        </View>
                                    </View>
                                ))
                            )}
                        </View>
                    )}
                </View>
            )}
        </AppShell>
    );
};

const styles = StyleSheet.create({
    headerActionBtn: {
        width: 38,
        height: 38,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
    },
    monthHeaderRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 10,
        paddingHorizontal: 14,
        borderRadius: 16,
        borderWidth: 1,
        marginBottom: 12,
    },
    monthTitleWrapper: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    monthTitle: {
        fontSize: 16,
        fontWeight: '700',
    },
    todayBadge: {
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 8,
    },
    todayBadgeText: {
        fontSize: 11,
        fontWeight: '700',
    },
    navBtn: {
        width: 34,
        height: 34,
        borderRadius: 10,
        justifyContent: 'center',
        alignItems: 'center',
    },
    statsRow: {
        flexDirection: 'row',
        gap: 8,
        marginBottom: 12,
    },
    statCard: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        padding: 8,
        borderRadius: 14,
        borderWidth: 1,
        gap: 6,
    },
    statIconBadge: {
        width: 32,
        height: 32,
        borderRadius: 9,
        justifyContent: 'center',
        alignItems: 'center',
    },
    statValue: {
        fontSize: 14,
        fontWeight: '800',
        lineHeight: 17,
    },
    statLabel: {
        fontSize: 9,
        fontWeight: '600',
        textTransform: 'uppercase',
    },
    tabBar: {
        flexDirection: 'row',
        borderRadius: 14,
        padding: 4,
        marginTop: 14,
        marginBottom: 12,
        borderWidth: 1,
    },
    tabItem: {
        flex: 1,
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        paddingVertical: 8,
        borderRadius: 10,
        gap: 4,
    },
    tabLabel: {
        fontSize: 11,
        fontWeight: '700',
    },
    tabContentContainer: {
        marginTop: 4,
        paddingBottom: 24,
    },
    tabSection: {
        gap: 10,
    },
    shiftBanner: {
        padding: 14,
        borderRadius: 16,
        borderWidth: 1,
        marginBottom: 4,
    },
    shiftHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginBottom: 4,
    },
    shiftName: {
        fontSize: 15,
        fontWeight: '700',
    },
    shiftHours: {
        fontSize: 16,
        fontWeight: '800',
        marginBottom: 2,
    },
    shiftType: {
        fontSize: 11,
        fontWeight: '600',
    },
    subSectionTitle: {
        fontSize: 13,
        fontWeight: '700',
        textTransform: 'uppercase',
        letterSpacing: 0.5,
        marginTop: 6,
        marginBottom: 2,
    },
    dayScheduleCard: {
        padding: 12,
        borderRadius: 14,
        borderWidth: 1,
    },
    dayScheduleHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 6,
    },
    dayTitleRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    dayScheduleName: {
        fontSize: 12,
        fontWeight: '800',
        letterSpacing: 0.5,
    },
    miniTodayBadge: {
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 4,
    },
    miniTodayText: {
        color: '#FFFFFF',
        fontSize: 8,
        fontWeight: '800',
    },
    statusPill: {
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 6,
    },
    statusPillText: {
        fontSize: 9,
        fontWeight: '800',
    },
    dayScheduleHoursRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    hoursLabel: {
        fontSize: 9,
        fontWeight: '700',
        marginBottom: 2,
    },
    hoursValue: {
        fontSize: 13,
        fontWeight: '700',
    },
    breakCol: {
        alignItems: 'flex-end',
    },
    breakValue: {
        fontSize: 11,
        fontWeight: '600',
    },
    noHoursText: {
        fontSize: 11,
        fontStyle: 'italic',
    },
    itemCard: {
        flexDirection: 'row',
        padding: 12,
        borderRadius: 16,
        borderWidth: 1,
        alignItems: 'center',
        gap: 12,
    },
    itemDateBadge: {
        width: 44,
        height: 44,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
    },
    itemDateDay: {
        fontSize: 16,
        fontWeight: '800',
        lineHeight: 18,
    },
    itemDateMonth: {
        fontSize: 9,
        fontWeight: '800',
        textTransform: 'uppercase',
    },
    itemInfo: {
        flex: 1,
    },
    itemTitleStatusRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    itemTitle: {
        fontSize: 14,
        fontWeight: '700',
    },
    itemRange: {
        fontSize: 11,
        fontWeight: '500',
        marginTop: 2,
    },
    itemDescription: {
        fontSize: 11,
        fontStyle: 'italic',
        marginTop: 4,
    },
    emptyCard: {
        padding: 28,
        borderRadius: 18,
        borderWidth: 1,
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
    },
    emptyTitle: {
        fontSize: 15,
        fontWeight: '700',
        marginTop: 4,
    },
    emptySubtitle: {
        fontSize: 12,
        textAlign: 'center',
        lineHeight: 17,
    },
    emptyActionBtn: {
        marginTop: 10,
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 10,
    },
    emptyActionBtnText: {
        color: '#FFFFFF',
        fontSize: 12,
        fontWeight: '700',
    },
    loadingWrapper: {
        padding: 40,
        alignItems: 'center',
        gap: 12,
    },
    loadingText: {
        fontSize: 12,
        fontWeight: '600',
    },
});
