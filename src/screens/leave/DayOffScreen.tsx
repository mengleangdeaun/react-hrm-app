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
import { ArrowLeft, RefreshCw, Calendar } from 'lucide-react-native';

export const DayOffScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
    const [targetDate, setTargetDate] = useState('2026-08-05');
    const [swapEmployee, setSwapEmployee] = useState('');
    const [reason, setReason] = useState('');

    const handleSubmit = () => {
        if (!reason) {
            Alert.alert('Required', 'Please enter a reason for off-day / shift swap request.');
            return;
        }
        Alert.alert('Request Sent', 'Off-day request has been sent for manager review.', [
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
                    <Text style={styles.headerTitle}>Off-Day & Shift Swap</Text>
                    <View style={{ width: 40 }} />
                </View>

                <Text style={styles.label}>Target Off-Day Date</Text>
                <TextInput
                    style={styles.input}
                    value={targetDate}
                    onChangeText={setTargetDate}
                    placeholder="YYYY-MM-DD"
                    placeholderTextColor="#64748B"
                />

                <Text style={styles.label}>Substitute Colleague (Shift Swap Optional)</Text>
                <TextInput
                    style={styles.input}
                    value={swapEmployee}
                    onChangeText={setSwapEmployee}
                    placeholder="Enter colleague name or code"
                    placeholderTextColor="#64748B"
                />

                <Text style={styles.label}>Reason</Text>
                <TextInput
                    style={[styles.input, styles.textArea]}
                    value={reason}
                    onChangeText={setReason}
                    placeholder="Explain why you are requesting off-day / shift swap..."
                    placeholderTextColor="#64748B"
                    multiline
                    numberOfLines={4}
                />

                <TouchableOpacity style={styles.submitBtn} onPress={handleSubmit}>
                    <RefreshCw color="#FFFFFF" size={18} />
                    <Text style={styles.submitBtnText}>Submit Swap Request</Text>
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
    label: { color: '#94A3B8', fontSize: 13, fontWeight: '600', marginBottom: 8, marginTop: 14 },
    input: { backgroundColor: '#1E293B', borderRadius: 12, borderWidth: 1, borderColor: '#334155', color: '#F8FAFC', paddingHorizontal: 14, height: 48, fontSize: 14 },
    textArea: { height: 100, textAlignVertical: 'top', paddingTop: 12 },
    submitBtn: { flexDirection: 'row', gap: 8, backgroundColor: '#2563EB', height: 52, borderRadius: 14, justifyContent: 'center', alignItems: 'center', marginTop: 28 },
    submitBtnText: { color: '#FFFFFF', fontSize: 16, fontWeight: '700' },
});
