import React, { useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    SafeAreaView,
    StatusBar,
} from 'react-native';
import { Calendar as CalendarIcon, Clock, ChevronLeft, ChevronRight } from 'lucide-react-native';

export const ScheduleCalendarScreen: React.FC = () => {
    const [currentMonth, setCurrentMonth] = useState('July 2026');

    return (
        <SafeAreaView style={styles.safeArea}>
            <StatusBar barStyle="light-content" backgroundColor="#0F172A" />
            <ScrollView style={styles.container} contentContainerStyle={styles.content}>
                <Text style={styles.title}>Work Schedule & Shift Calendar</Text>

                {/* Month Navigation */}
                <View style={styles.monthHeader}>
                    <TouchableOpacity style={styles.navBtn}>
                        <ChevronLeft color="#F8FAFC" size={20} />
                    </TouchableOpacity>
                    <Text style={styles.monthTitle}>{currentMonth}</Text>
                    <TouchableOpacity style={styles.navBtn}>
                        <ChevronRight color="#F8FAFC" size={20} />
                    </TouchableOpacity>
                </View>

                {/* Shift Card Details */}
                <View style={styles.shiftCard}>
                    <View style={styles.shiftHeader}>
                        <Clock color="#3B82F6" size={20} />
                        <Text style={styles.shiftTitle}>Standard Day Shift</Text>
                    </View>
                    <Text style={styles.shiftTime}>08:30 AM - 05:30 PM (Mon - Fri)</Text>
                    <Text style={styles.shiftSub}>Break time: 12:00 PM - 01:00 PM</Text>
                </View>

                {/* Upcoming Holidays & Events */}
                <Text style={styles.sectionHeader}>Upcoming Holidays & Observances</Text>

                <View style={styles.eventCard}>
                    <View style={styles.eventDateBadge}>
                        <Text style={styles.eventDay}>24</Text>
                        <Text style={styles.eventMonth}>JUL</Text>
                    </View>
                    <View style={styles.eventInfo}>
                        <Text style={styles.eventTitle}>King's Birthday Holiday</Text>
                        <Text style={styles.eventSub}>Official Company Holiday • Paid Day Off</Text>
                    </View>
                </View>

                <View style={styles.eventCard}>
                    <View style={[styles.eventDateBadge, { backgroundColor: '#10B98120' }]}>
                        <Text style={[styles.eventDay, { color: '#10B981' }]}>31</Text>
                        <Text style={[styles.eventMonth, { color: '#10B981' }]}>JUL</Text>
                    </View>
                    <View style={styles.eventInfo}>
                        <Text style={styles.eventTitle}>Monthly Team Building</Text>
                        <Text style={styles.eventSub}>03:00 PM - 06:00 PM • Main Lounge</Text>
                    </View>
                </View>
            </ScrollView>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    safeArea: { flex: 1, backgroundColor: '#0F172A' },
    container: { flex: 1 },
    content: { padding: 20 },
    title: { color: '#F8FAFC', fontSize: 22, fontWeight: '800', marginBottom: 20 },
    monthHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundColor: '#1E293B',
        borderRadius: 16,
        padding: 12,
        marginBottom: 20,
        borderWidth: 1,
        borderColor: '#334155',
    },
    monthTitle: { color: '#F8FAFC', fontSize: 16, fontWeight: '700' },
    navBtn: { padding: 6, borderRadius: 8, backgroundColor: '#0F172A' },
    shiftCard: {
        backgroundColor: '#1E293B',
        borderRadius: 18,
        padding: 16,
        borderWidth: 1,
        borderColor: '#334155',
        marginBottom: 24,
    },
    shiftHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
    shiftTitle: { color: '#F8FAFC', fontSize: 16, fontWeight: '700' },
    shiftTime: { color: '#3B82F6', fontSize: 15, fontWeight: '700', marginBottom: 4 },
    shiftSub: { color: '#94A3B8', fontSize: 13 },
    sectionHeader: { color: '#F8FAFC', fontSize: 17, fontWeight: '700', marginBottom: 14 },
    eventCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#1E293B',
        borderRadius: 16,
        padding: 14,
        marginBottom: 12,
        gap: 14,
        borderWidth: 1,
        borderColor: '#334155',
    },
    eventDateBadge: {
        width: 50,
        height: 50,
        borderRadius: 14,
        backgroundColor: '#3B82F620',
        justifyContent: 'center',
        alignItems: 'center',
    },
    eventDay: { color: '#3B82F6', fontSize: 18, fontWeight: '800' },
    eventMonth: { color: '#3B82F6', fontSize: 10, fontWeight: '800' },
    eventInfo: { flex: 1 },
    eventTitle: { color: '#F8FAFC', fontSize: 15, fontWeight: '700' },
    eventSub: { color: '#94A3B8', fontSize: 12, marginTop: 2 },
});
