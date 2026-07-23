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
        borderWidth: 1,
        borderColor: 'rgba(150, 150, 150, 0.15)',
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
