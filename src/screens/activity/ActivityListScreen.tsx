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
import { Plus, Activity, Calendar, ArrowLeft } from 'lucide-react-native';

const MOCK_ACTIVITIES = [
    {
        id: 1,
        title: 'API Optimization & Database Indexing',
        description: 'Optimized response time for attendance logs endpoint from 850ms down to 120ms.',
        date: '2026-07-20 11:30 AM',
    },
    {
        id: 2,
        title: 'React Native PWA Migration Plan',
        description: 'Designed full architectural roadmap for Expo SDK 57 native mobile application.',
        date: '2026-07-19 04:15 PM',
    },
];

export const ActivityListScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
    return (
        <SafeAreaView style={styles.safeArea}>
            <StatusBar barStyle="light-content" backgroundColor="#0F172A" />
            <ScrollView style={styles.container} contentContainerStyle={styles.content}>
                <View style={styles.topBar}>
                    <TouchableOpacity style={styles.iconCircle} onPress={() => navigation.goBack()}>
                        <ArrowLeft color="#F8FAFC" size={20} />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>Daily Activity Logs</Text>
                    <TouchableOpacity
                        style={styles.addBtn}
                        onPress={() => navigation.navigate('CreateActivity')}
                    >
                        <Plus color="#FFFFFF" size={18} />
                    </TouchableOpacity>
                </View>

                {MOCK_ACTIVITIES.map((act) => (
                    <View key={act.id} style={styles.card}>
                        <View style={styles.cardHeader}>
                            <Activity color="#10B981" size={18} />
                            <Text style={styles.cardTitle}>{act.title}</Text>
                        </View>
                        <Text style={styles.cardDesc}>{act.description}</Text>
                        <View style={styles.cardFooter}>
                            <Calendar color="#64748B" size={14} />
                            <Text style={styles.dateText}>{act.date}</Text>
                        </View>
                    </View>
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
    addBtn: { width: 40, height: 40, borderRadius: 12, backgroundColor: '#2563EB', justifyContent: 'center', alignItems: 'center' },
    card: { backgroundColor: '#1E293B', borderRadius: 18, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: '#334155' },
    cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
    cardTitle: { color: '#F8FAFC', fontSize: 15, fontWeight: '700' },
    cardDesc: { color: '#94A3B8', fontSize: 13, lineHeight: 18, marginBottom: 12 },
    cardFooter: { flexDirection: 'row', alignItems: 'center', gap: 6, borderTopWidth: 1, borderTopColor: '#334155', paddingTop: 8 },
    dateText: { color: '#64748B', fontSize: 11 },
});
