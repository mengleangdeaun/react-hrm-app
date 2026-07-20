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
import { ArrowLeft, BellRing, Award, AlertCircle } from 'lucide-react-native';

const MOCK_NOTICES = [
    {
        id: 1,
        subordinate_name: 'Alex Rivera',
        type: 'appreciation',
        message: 'Outstanding leadership and customer support on Q2 project delivery.',
        date: '2026-07-18',
    },
    {
        id: 2,
        subordinate_name: 'Michael Chang',
        type: 'warning',
        message: 'Notice regarding unexcused tardiness on 3 consecutive days.',
        date: '2026-07-14',
    },
];

export const SubordinateNoticesScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
    return (
        <SafeAreaView style={styles.safeArea}>
            <StatusBar barStyle="light-content" backgroundColor="#0F172A" />
            <ScrollView style={styles.container} contentContainerStyle={styles.content}>
                <View style={styles.topBar}>
                    <TouchableOpacity style={styles.iconCircle} onPress={() => navigation.goBack()}>
                        <ArrowLeft color="#F8FAFC" size={20} />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>Subordinate Notices Timeline</Text>
                    <View style={{ width: 40 }} />
                </View>

                {MOCK_NOTICES.map((item) => {
                    const isAppreciation = item.type === 'appreciation';
                    return (
                        <View key={item.id} style={styles.card}>
                            <View style={styles.cardHeader}>
                                {isAppreciation ? (
                                    <Award color="#10B981" size={20} />
                                ) : (
                                    <AlertCircle color="#F59E0B" size={20} />
                                )}
                                <View style={styles.headerInfo}>
                                    <Text style={styles.nameText}>{item.subordinate_name}</Text>
                                    <Text style={styles.dateText}>{item.date}</Text>
                                </View>
                                <View
                                    style={[
                                        styles.badge,
                                        isAppreciation ? styles.badgeSuccess : styles.badgeWarning,
                                    ]}
                                >
                                    <Text
                                        style={[
                                            styles.badgeText,
                                            { color: isAppreciation ? '#10B981' : '#F59E0B' },
                                        ]}
                                    >
                                        {item.type.toUpperCase()}
                                    </Text>
                                </View>
                            </View>
                            <Text style={styles.messageText}>{item.message}</Text>
                        </View>
                    );
                })}
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
    card: { backgroundColor: '#1E293B', borderRadius: 18, padding: 16, marginBottom: 14, borderWidth: 1, borderColor: '#334155' },
    cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12 },
    headerInfo: { flex: 1 },
    nameText: { color: '#F8FAFC', fontSize: 15, fontWeight: '700' },
    dateText: { color: '#64748B', fontSize: 12, marginTop: 2 },
    badge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
    badgeSuccess: { backgroundColor: '#10B98115' },
    badgeWarning: { backgroundColor: '#F59E0B15' },
    badgeText: { fontSize: 10, fontWeight: '800' },
    messageText: { color: '#94A3B8', fontSize: 13, lineHeight: 18 },
});
