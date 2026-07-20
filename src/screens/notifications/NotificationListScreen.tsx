import React from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    SafeAreaView,
    StatusBar,
} from 'react-native';
import { Bell, ChevronRight, ArrowLeft } from 'lucide-react-native';

const MOCK_NOTIFS = [
    {
        id: 101,
        title: 'Mid-Year Performance Review Schedule',
        snippet: 'All department reviews will be conducted starting next Monday. Please submit self-assessments.',
        date: '10:00 AM',
        is_read: false,
    },
    {
        id: 102,
        title: 'Leave Application Approved',
        snippet: 'Your Annual leave application for Aug 10 - Aug 12 has been approved by HR Manager.',
        date: 'Yesterday',
        is_read: true,
    },
];

export const NotificationListScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
    return (
        <SafeAreaView style={styles.safeArea}>
            <StatusBar barStyle="light-content" backgroundColor="#0F172A" />
            <ScrollView style={styles.container} contentContainerStyle={styles.content}>
                <View style={styles.topBar}>
                    <TouchableOpacity style={styles.iconCircle} onPress={() => navigation.goBack()}>
                        <ArrowLeft color="#F8FAFC" size={20} />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>Notifications & Alerts</Text>
                    <View style={{ width: 40 }} />
                </View>

                {MOCK_NOTIFS.map((item) => (
                    <TouchableOpacity
                        key={item.id}
                        style={[styles.card, !item.is_read && styles.unreadCard]}
                        onPress={() => navigation.navigate('AnnouncementDetail', { id: item.id })}
                    >
                        <View style={styles.cardHeader}>
                            <Bell color={item.is_read ? '#64748B' : '#3B82F6'} size={18} />
                            <Text style={styles.cardTitle}>{item.title}</Text>
                        </View>
                        <Text style={styles.cardSnippet} numberOfLines={2}>
                            {item.snippet}
                        </Text>
                        <View style={styles.cardFooter}>
                            <Text style={styles.dateText}>{item.date}</Text>
                            <ChevronRight color="#94A3B8" size={16} />
                        </View>
                    </TouchableOpacity>
                ))}
            </ScrollView>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    safeArea: { flex: 1, backgroundColor: '#0F172A' },
    container: { flex: 1 },
    content: { padding: 20 },
    topBar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
    iconCircle: { width: 40, height: 40, borderRadius: 12, backgroundColor: '#1E293B', justifyContent: 'center', alignItems: 'center' },
    headerTitle: { color: '#F8FAFC', fontSize: 18, fontWeight: '700' },
    card: { backgroundColor: '#1E293B', borderRadius: 18, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: '#334155' },
    unreadCard: { borderColor: '#3B82F6', backgroundColor: '#1E293B' },
    cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8 },
    cardTitle: { color: '#F8FAFC', fontSize: 15, fontWeight: '700', flex: 1 },
    cardSnippet: { color: '#94A3B8', fontSize: 13, lineHeight: 18, marginBottom: 12 },
    cardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderTopWidth: 1, borderTopColor: '#334155', paddingTop: 8 },
    dateText: { color: '#64748B', fontSize: 12 },
});
