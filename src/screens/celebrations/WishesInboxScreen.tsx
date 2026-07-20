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
import { ArrowLeft, Heart } from 'lucide-react-native';

const MOCK_WISHES = [
    {
        id: 1,
        sender_name: 'David Vance',
        message: 'Happy Work Anniversary John! Thank you for 3 years of great contribution to our engineering team!',
        date: 'Jul 10, 2026',
    },
    {
        id: 2,
        sender_name: 'Elena Rostova',
        message: 'Cheers to another fantastic year at S-Cool HRMS! Keep shining!',
        date: 'Jul 10, 2026',
    },
];

export const WishesInboxScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
    return (
        <SafeAreaView style={styles.safeArea}>
            <StatusBar barStyle="light-content" backgroundColor="#0F172A" />
            <ScrollView style={styles.container} contentContainerStyle={styles.content}>
                <View style={styles.topBar}>
                    <TouchableOpacity style={styles.iconCircle} onPress={() => navigation.goBack()}>
                        <ArrowLeft color="#F8FAFC" size={20} />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>Received Celebration Wishes</Text>
                    <View style={{ width: 40 }} />
                </View>

                {MOCK_WISHES.map((item) => (
                    <View key={item.id} style={styles.card}>
                        <View style={styles.cardHeader}>
                            <Heart color="#EC4899" size={18} />
                            <Text style={styles.senderName}>{item.sender_name}</Text>
                        </View>
                        <Text style={styles.messageText}>{item.message}</Text>
                        <Text style={styles.dateText}>{item.date}</Text>
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
    card: { backgroundColor: '#1E293B', borderRadius: 18, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: '#334155' },
    cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
    senderName: { color: '#F8FAFC', fontSize: 15, fontWeight: '700' },
    messageText: { color: '#94A3B8', fontSize: 13, lineHeight: 18, marginBottom: 10 },
    dateText: { color: '#64748B', fontSize: 11 },
});
