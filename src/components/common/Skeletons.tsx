import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Skeleton } from './Skeleton';

export const LeaveListSkeleton: React.FC = () => {
    return (
        <View style={styles.container}>
            {/* Header Section Placeholder */}
            <Skeleton.Text lines={1} height={14} style={{ width: '40%', marginBottom: 12 }} />

            {/* Leave Balances Carousel Placeholder */}
            <View style={styles.rowGrid}>
                <Skeleton.Box width="48%" height={90} borderRadius={12} />
                <Skeleton.Box width="48%" height={90} borderRadius={12} />
            </View>

            {/* List Header Placeholder */}
            <Skeleton.Text lines={1} height={14} style={{ width: '50%', marginTop: 24, marginBottom: 12 }} />

            {/* Leave Request Cards Placeholders */}
            {Array.from({ length: 3 }).map((_, index) => (
                <View key={index} style={styles.cardPlaceholder}>
                    <View style={styles.cardHeaderRow}>
                        <Skeleton width={120} height={16} />
                        <Skeleton width={70} height={20} borderRadius={10} />
                    </View>
                    <Skeleton.Text lines={2} height={12} gap={6} style={{ marginTop: 12 }} />
                </View>
            ))}
        </View>
    );
};

export const DashboardSkeleton: React.FC = () => {
    return (
        <View style={styles.container}>
            {/* User Greeting Header */}
            <View style={styles.userHeaderRow}>
                <Skeleton.Circle size={48} />
                <View style={{ marginLeft: 12, flex: 1 }}>
                    <Skeleton width={100} height={12} />
                    <Skeleton width={160} height={18} style={{ marginTop: 6 }} />
                </View>
                <Skeleton.Circle size={36} />
            </View>

            {/* Clock Card Placeholder */}
            <View style={[styles.cardPlaceholder, { marginTop: 20 }]}>
                <Skeleton.Text lines={1} height={14} style={{ width: '35%', alignSelf: 'center' }} />
                <Skeleton width={180} height={36} style={{ alignSelf: 'center', marginVertical: 14 }} />
                <View style={styles.rowGrid}>
                    <Skeleton width="45%" height={30} />
                    <Skeleton width="45%" height={30} />
                </View>
                <Skeleton.Box height={48} borderRadius={12} style={{ marginTop: 16 }} />
            </View>

            {/* Quick Actions Grid Placeholder */}
            <Skeleton.Text lines={1} height={14} style={{ width: '40%', marginTop: 24, marginBottom: 12 }} />
            <View style={styles.rowGrid}>
                {Array.from({ length: 4 }).map((_, i) => (
                    <Skeleton.Box key={i} width="23%" height={70} borderRadius={12} />
                ))}
            </View>
        </View>
    );
};

export const ListSkeleton: React.FC<{ count?: number }> = ({ count = 4 }) => {
    return (
        <View style={styles.container}>
            {Array.from({ length: count }).map((_, i) => (
                <View key={i} style={styles.cardPlaceholder}>
                    <View style={styles.cardHeaderRow}>
                        <Skeleton.Circle size={36} />
                        <View style={{ flex: 1, marginLeft: 12 }}>
                            <Skeleton width="70%" height={14} />
                            <Skeleton width="40%" height={10} style={{ marginTop: 6 }} />
                        </View>
                    </View>
                </View>
            ))}
        </View>
    );
};

export const CreateLeaveSkeleton: React.FC = () => {
    return (
        <View style={styles.container}>
            {/* Category Header */}
            <Skeleton.Text lines={1} height={14} style={{ width: '40%', marginBottom: 12 }} />

            {/* Leave Balances Carousel Placeholder */}
            <View style={{ flexDirection: 'row', gap: 12, marginBottom: 24 }}>
                <Skeleton.Box width={160} height={90} borderRadius={16} />
                <Skeleton.Box width={160} height={90} borderRadius={16} />
            </View>

            {/* Duration Mode Header */}
            <Skeleton.Text lines={1} height={14} style={{ width: '35%', marginBottom: 12 }} />

            {/* Duration Pill Switcher Placeholder */}
            <View style={{ flexDirection: 'row', gap: 8, marginBottom: 24 }}>
                <Skeleton.Box width={80} height={36} borderRadius={18} />
                <Skeleton.Box width={75} height={36} borderRadius={18} />
                <Skeleton.Box width={85} height={36} borderRadius={18} />
                <Skeleton.Box width={80} height={36} borderRadius={18} />
            </View>

            {/* Form Section Cards Placeholders */}
            <Skeleton.Box width="100%" height={110} borderRadius={16} style={{ marginBottom: 16 }} />
            <Skeleton.Box width="100%" height={120} borderRadius={16} style={{ marginBottom: 16 }} />
            <Skeleton.Box width="100%" height={60} borderRadius={16} style={{ marginBottom: 24 }} />

            {/* Submit Button Placeholder */}
            <Skeleton.Box width="100%" height={48} borderRadius={12} />
        </View>
    );
};

export function ActivityListSkeleton() {
    return (
        <View style={styles.container}>
            {[1, 2, 3].map((i) => (
                <View key={i} style={styles.cardPlaceholder}>
                    <View style={styles.cardHeaderRow}>
                        <Skeleton.Box width={130} height={24} borderRadius={12} />
                        <Skeleton.Box width={80} height={20} borderRadius={10} />
                    </View>
                    <Skeleton.Text lines={2} height={14} gap={8} style={{ marginTop: 12, marginBottom: 14 }} />
                    <View style={styles.cardHeaderRow}>
                        <Skeleton.Box width={120} height={14} borderRadius={4} />
                        <Skeleton.Box width={90} height={14} borderRadius={4} />
                    </View>
                </View>
            ))}
        </View>
    );
}

export function NotificationListSkeleton() {
    return (
        <View style={styles.container}>
            {[1, 2, 3, 4].map((i) => (
                <View key={i} style={styles.cardPlaceholder}>
                    <View style={styles.cardHeaderRow}>
                        <Skeleton.Box width={36} height={36} borderRadius={12} />
                        <View style={{ flex: 1, marginLeft: 12 }}>
                            <Skeleton.Box width="65%" height={16} borderRadius={4} />
                            <Skeleton.Box width="35%" height={10} borderRadius={4} style={{ marginTop: 6 }} />
                        </View>
                    </View>
                    <Skeleton.Text lines={2} height={12} gap={6} style={{ marginTop: 12 }} />
                </View>
            ))}
        </View>
    );
}

export function AttendanceHistorySkeleton() {
    return (
        <View style={styles.container}>
            {[1, 2, 3].map((i) => (
                <View key={i} style={styles.attendanceCardPlaceholder}>
                    <View style={styles.cardHeaderRow}>
                        <Skeleton.Box width={160} height={16} borderRadius={6} />
                        <Skeleton.Box width={70} height={18} borderRadius={9} />
                    </View>
                    <Skeleton.Box width="100%" height={54} borderRadius={10} style={{ marginTop: 12 }} />
                    <Skeleton.Box width="100%" height={22} borderRadius={11} style={{ marginTop: 8 }} />
                    <Skeleton.Box width="100%" height={54} borderRadius={10} style={{ marginTop: 8 }} />
                    <View style={[styles.cardHeaderRow, { marginTop: 12 }]}>
                        <Skeleton.Box width={80} height={18} borderRadius={6} />
                        <Skeleton.Box width={95} height={14} borderRadius={4} />
                    </View>
                </View>
            ))}
        </View>
    );
}

export function QuizListSkeleton() {
    return (
        <View style={styles.container}>
            {[1, 2, 3].map((i) => (
                <View key={i} style={styles.cardPlaceholder}>
                    <View style={styles.cardHeaderRow}>
                        <Skeleton.Box width={40} height={40} borderRadius={16} />
                        <View style={{ flex: 1, marginLeft: 12 }}>
                            <Skeleton.Box width="70%" height={16} borderRadius={4} />
                            <Skeleton.Box width="30%" height={10} borderRadius={4} style={{ marginTop: 6 }} />
                        </View>
                    </View>
                    <Skeleton.Box width="100%" height={46} borderRadius={12} style={{ marginTop: 14 }} />
                    <Skeleton.Box width="100%" height={44} borderRadius={12} style={{ marginTop: 12 }} />
                </View>
            ))}
        </View>
    );
}

export function DayOffSkeleton() {
    return (
        <View style={styles.container}>
            {/* Top Tabs Placeholder */}
            <View style={{ flexDirection: 'row', gap: 12, marginBottom: 16 }}>
                <Skeleton.Box width="48%" height={40} borderRadius={10} />
                <Skeleton.Box width="48%" height={40} borderRadius={10} />
            </View>

            {/* Schedule Card Placeholder */}
            <View style={styles.attendanceCardPlaceholder}>
                <View style={styles.cardHeaderRow}>
                    <Skeleton.Box width={140} height={18} borderRadius={6} />
                    <Skeleton.Box width={80} height={14} borderRadius={4} />
                </View>
                {/* 7-day grid placeholder */}
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 16 }}>
                    {Array.from({ length: 7 }).map((_, idx) => (
                        <Skeleton.Box key={idx} width="12%" height={48} borderRadius={10} />
                    ))}
                </View>
            </View>

            {/* Request History Section Header */}
            <Skeleton.Text lines={1} height={14} style={{ width: '40%', marginVertical: 14 }} />

            {/* Request History Card Placeholders */}
            {[1, 2].map((i) => (
                <View key={i} style={styles.cardPlaceholder}>
                    <View style={styles.cardHeaderRow}>
                        <Skeleton.Box width={110} height={16} borderRadius={6} />
                        <Skeleton.Box width={70} height={20} borderRadius={10} />
                    </View>
                    <Skeleton.Text lines={2} height={12} gap={6} style={{ marginTop: 12 }} />
                </View>
            ))}
        </View>
    );
}

export function ScheduleCalendarSkeleton() {
    return (
        <View style={styles.container}>
            {/* Month Header Nav Placeholder */}
            <View style={[styles.cardHeaderRow, { marginBottom: 16 }]}>
                <Skeleton.Box width={150} height={24} borderRadius={6} />
                <View style={{ flexDirection: 'row', gap: 8 }}>
                    <Skeleton.Box width={36} height={36} borderRadius={10} />
                    <Skeleton.Box width={36} height={36} borderRadius={10} />
                </View>
            </View>

            {/* Calendar Grid Box Placeholder */}
            <View style={styles.attendanceCardPlaceholder}>
                {/* Day Names Row */}
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 }}>
                    {Array.from({ length: 7 }).map((_, idx) => (
                        <Skeleton.Box key={idx} width="12%" height={16} borderRadius={4} />
                    ))}
                </View>
                {/* 5 Weeks of Calendar Day Cells */}
                {Array.from({ length: 5 }).map((_, wIdx) => (
                    <View key={wIdx} style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}>
                        {Array.from({ length: 7 }).map((_, dIdx) => (
                            <Skeleton.Box key={dIdx} width="12%" height={38} borderRadius={8} />
                        ))}
                    </View>
                ))}
            </View>

            {/* Selected Day Event Placeholder */}
            <View style={[styles.cardPlaceholder, { marginTop: 12 }]}>
                <Skeleton.Box width="60%" height={18} borderRadius={6} />
                <Skeleton.Text lines={2} height={12} gap={6} style={{ marginTop: 10 }} />
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        paddingTop: 8,
    },
    rowGrid: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    cardPlaceholder: {
        padding: 16,
        borderRadius: 12,
        marginBottom: 12,
    },
    attendanceCardPlaceholder: {
        padding: 16,
        borderRadius: 16,
        marginBottom: 16,
        borderWidth: 1,
        borderColor: 'rgba(148, 163, 184, 0.15)',
    },
    cardHeaderRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    userHeaderRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
});
