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
import { ArrowLeft, Bell, Download, Paperclip } from 'lucide-react-native';

export const AnnouncementDetailScreen: React.FC<{ route: any; navigation: any }> = ({
    route,
    navigation,
}) => {
    return (
        <SafeAreaView style={styles.safeArea}>
            <StatusBar barStyle="light-content" backgroundColor="#0F172A" />
            <ScrollView style={styles.container} contentContainerStyle={styles.content}>
                <View style={styles.topBar}>
                    <TouchableOpacity style={styles.iconCircle} onPress={() => navigation.goBack()}>
                        <ArrowLeft color="#F8FAFC" size={20} />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>Announcement Details</Text>
                    <View style={{ width: 40 }} />
                </View>

                <View style={styles.badge}>
                    <Bell color="#3B82F6" size={14} />
                    <Text style={styles.badgeText}>COMPANY ANNOUNCEMENT</Text>
                </View>

                <Text style={styles.title}>Mid-Year Performance Review Schedule</Text>
                <Text style={styles.dateText}>Published on Today at 10:00 AM by HR Department</Text>

                <View style={styles.divider} />

                <Text style={styles.bodyText}>
                    Dear Team,{"\n\n"}
                    We are pleased to announce that our Mid-Year Performance Reviews will commence next week.
                    The goal of this review is to evaluate progress on key quarterly deliverables, align on career development goals, and address any feedback.
                    {"\n\n"}
                    Key Deadlines:{"\n"}
                    • Friday, Jul 24: Self-assessment submission deadline.{"\n"}
                    • Monday, Jul 27 - Friday, Jul 31: One-on-one manager review meetings.
                    {"\n\n"}
                    Please download the attached Self-Assessment Guidelines template below for instructions.
                </Text>

                <TouchableOpacity style={styles.attachCard}>
                    <Paperclip color="#3B82F6" size={20} />
                    <View style={styles.attachInfo}>
                        <Text style={styles.attachName}>Self_Assessment_Guide_2026.pdf</Text>
                        <Text style={styles.attachSize}>1.4 MB • PDF Document</Text>
                    </View>
                    <Download color="#3B82F6" size={20} />
                </TouchableOpacity>
            </ScrollView>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    safeArea: { flex: 1, backgroundColor: '#0F172A' },
    container: { flex: 1 },
    content: { padding: 20 },
    topBar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
    iconCircle: { width: 40, height: 40, borderRadius: 12, backgroundColor: '#1E293B', justifyContent: 'center', alignItems: 'center' },
    headerTitle: { color: '#F8FAFC', fontSize: 18, fontWeight: '700' },
    badge: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#3B82F615', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, alignSelf: 'flex-start', marginBottom: 12 },
    badgeText: { color: '#3B82F6', fontSize: 11, fontWeight: '800' },
    title: { color: '#F8FAFC', fontSize: 22, fontWeight: '800', marginBottom: 8 },
    dateText: { color: '#64748B', fontSize: 13, marginBottom: 16 },
    divider: { height: 1, backgroundColor: '#334155', marginBottom: 16 },
    bodyText: { color: '#CBD5E1', fontSize: 15, lineHeight: 22, marginBottom: 24 },
    attachCard: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: '#1E293B', padding: 14, borderRadius: 16, borderWidth: 1, borderColor: '#334155' },
    attachInfo: { flex: 1 },
    attachName: { color: '#F8FAFC', fontSize: 14, fontWeight: '700' },
    attachSize: { color: '#64748B', fontSize: 12, marginTop: 2 },
});
