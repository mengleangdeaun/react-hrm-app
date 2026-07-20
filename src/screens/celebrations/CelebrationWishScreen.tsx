import React, { useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TextInput,
    TouchableOpacity,
    SafeAreaView,
    StatusBar,
    Alert,
    ScrollView,
} from 'react-native';
import { ArrowLeft, Gift, Heart, Send } from 'lucide-react-native';

export const CelebrationWishScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
    const [wishText, setWishText] = useState('');

    const handleSend = () => {
        if (!wishText) {
            Alert.alert('Required', 'Please write a wish message.');
            return;
        }
        Alert.alert('Wish Sent! 🎉', 'Your birthday wish has been delivered to Sarah Jenkins.', [
            { text: 'OK', onPress: () => navigation.goBack() },
        ]);
    };

    return (
        <SafeAreaView style={styles.safeArea}>
            <StatusBar barStyle="light-content" backgroundColor="#0F172A" />
            <ScrollView style={styles.container} contentContainerStyle={styles.content}>
                <View style={styles.topBar}>
                    <TouchableOpacity style={styles.iconCircle} onPress={() => navigation.goBack()}>
                        <ArrowLeft color="#F8FAFC" size={20} />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>Send Celebration Wish</Text>
                    <View style={{ width: 40 }} />
                </View>

                <View style={styles.cardHeader}>
                    <View style={styles.giftIconCircle}>
                        <Gift color="#EC4899" size={36} />
                    </View>
                    <Text style={styles.title}>Happy Birthday, Sarah! 🎂</Text>
                    <Text style={styles.subtitle}>Send your colleague warm birthday wishes today.</Text>
                </View>

                <Text style={styles.label}>Your Wish Message</Text>
                <TextInput
                    style={[styles.input, styles.textArea]}
                    value={wishText}
                    onChangeText={setWishText}
                    placeholder="Wishing you a wonderful birthday filled with joy and success! 🎉"
                    placeholderTextColor="#64748B"
                    multiline
                    numberOfLines={4}
                />

                <TouchableOpacity style={styles.submitBtn} onPress={handleSend}>
                    <Send color="#FFFFFF" size={18} />
                    <Text style={styles.submitBtnText}>Send Wish</Text>
                </TouchableOpacity>

                <TouchableOpacity
                    style={styles.inboxBtn}
                    onPress={() => navigation.navigate('WishesInbox')}
                >
                    <Heart color="#EC4899" size={18} />
                    <Text style={styles.inboxBtnText}>View My Received Wishes Inbox</Text>
                </TouchableOpacity>
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
    cardHeader: { alignItems: 'center', backgroundColor: '#1E293B', borderRadius: 24, padding: 24, marginBottom: 24, borderWidth: 1, borderColor: '#334155' },
    giftIconCircle: { width: 70, height: 70, borderRadius: 24, backgroundColor: '#EC489920', justifyContent: 'center', alignItems: 'center', marginBottom: 16 },
    title: { color: '#F8FAFC', fontSize: 20, fontWeight: '800', textAlign: 'center' },
    subtitle: { color: '#94A3B8', fontSize: 13, textAlign: 'center', marginTop: 6 },
    label: { color: '#94A3B8', fontSize: 13, fontWeight: '600', marginBottom: 8 },
    input: { backgroundColor: '#1E293B', borderRadius: 12, borderWidth: 1, borderColor: '#334155', color: '#F8FAFC', paddingHorizontal: 14, fontSize: 14 },
    textArea: { height: 110, textAlignVertical: 'top', paddingTop: 12 },
    submitBtn: { flexDirection: 'row', gap: 8, backgroundColor: '#EC4899', height: 52, borderRadius: 14, justifyContent: 'center', alignItems: 'center', marginTop: 24 },
    submitBtnText: { color: '#FFFFFF', fontSize: 16, fontWeight: '700' },
    inboxBtn: { flexDirection: 'row', gap: 8, justifyContent: 'center', alignItems: 'center', marginTop: 20, padding: 12 },
    inboxBtnText: { color: '#EC4899', fontSize: 14, fontWeight: '600' },
});
