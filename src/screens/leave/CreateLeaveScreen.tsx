import React, { useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TextInput,
    TouchableOpacity,
    ScrollView,
    SafeAreaView,
    StatusBar,
    Alert,
} from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import { ArrowLeft, Calendar, FilePlus, Paperclip } from 'lucide-react-native';

export const CreateLeaveScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
    const [leaveType, setLeaveType] = useState<'annual' | 'sick' | 'casual'>('annual');
    const [startDate, setStartDate] = useState('2026-08-01');
    const [endDate, setEndDate] = useState('2026-08-02');
    const [reason, setReason] = useState('');
    const [attachment, setAttachment] = useState<any>(null);

    const pickDocument = async () => {
        try {
            const result = await DocumentPicker.getDocumentAsync({
                type: ['application/pdf', 'image/*'],
            });
            if (!result.canceled && result.assets && result.assets.length > 0) {
                setAttachment(result.assets[0]);
            }
        } catch (e) {
            console.error('Picker error', e);
        }
    };

    const handleSubmit = () => {
        if (!reason) {
            Alert.alert('Required', 'Please enter a reason for your leave request.');
            return;
        }

        Alert.alert('Success', 'Your leave request has been submitted for approval.', [
            { text: 'OK', onPress: () => navigation.goBack() },
        ]);
    };

    return (
        <SafeAreaView style={styles.safeArea}>
            <StatusBar barStyle="light-content" backgroundColor="#0F172A" />
            <ScrollView style={styles.container} contentContainerStyle={styles.content}>
                {/* Top Bar */}
                <View style={styles.topBar}>
                    <TouchableOpacity style={styles.iconCircle} onPress={() => navigation.goBack()}>
                        <ArrowLeft color="#F8FAFC" size={20} />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>Apply for Leave</Text>
                    <View style={{ width: 40 }} />
                </View>

                {/* Leave Type Selector */}
                <Text style={styles.label}>Select Leave Type</Text>
                <View style={styles.typeRow}>
                    {(['annual', 'sick', 'casual'] as const).map((type) => (
                        <TouchableOpacity
                            key={type}
                            style={[styles.typeCard, leaveType === type && styles.typeCardActive]}
                            onPress={() => setLeaveType(type)}
                        >
                            <Text style={[styles.typeText, leaveType === type && styles.typeTextActive]}>
                                {type.toUpperCase()}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </View>

                {/* Date Inputs */}
                <View style={styles.dateRow}>
                    <View style={styles.dateBox}>
                        <Text style={styles.label}>Start Date</Text>
                        <TextInput
                            style={styles.input}
                            value={startDate}
                            onChangeText={setStartDate}
                            placeholder="YYYY-MM-DD"
                            placeholderTextColor="#64748B"
                        />
                    </View>
                    <View style={styles.dateBox}>
                        <Text style={styles.label}>End Date</Text>
                        <TextInput
                            style={styles.input}
                            value={endDate}
                            onChangeText={setEndDate}
                            placeholder="YYYY-MM-DD"
                            placeholderTextColor="#64748B"
                        />
                    </View>
                </View>

                {/* Reason Text Area */}
                <Text style={styles.label}>Reason for Leave</Text>
                <TextInput
                    style={[styles.input, styles.textArea]}
                    value={reason}
                    onChangeText={setReason}
                    placeholder="Provide details about your leave request..."
                    placeholderTextColor="#64748B"
                    multiline
                    numberOfLines={4}
                />

                {/* Document Attachment Picker */}
                <Text style={styles.label}>Attachment (Doctor note / Proof optional)</Text>
                <TouchableOpacity style={styles.attachBtn} onPress={pickDocument}>
                    <Paperclip color="#3B82F6" size={20} />
                    <Text style={styles.attachBtnText}>
                        {attachment ? attachment.name : 'Upload Document or Photo'}
                    </Text>
                </TouchableOpacity>

                {/* Submit Button */}
                <TouchableOpacity style={styles.submitBtn} onPress={handleSubmit}>
                    <Text style={styles.submitBtnText}>Submit Leave Request</Text>
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
    typeRow: { flexDirection: 'row', gap: 10, marginBottom: 8 },
    typeCard: { flex: 1, paddingVertical: 12, alignItems: 'center', backgroundColor: '#1E293B', borderRadius: 12, borderWidth: 1, borderColor: '#334155' },
    typeCardActive: { backgroundColor: '#2563EB', borderColor: '#2563EB' },
    typeText: { color: '#94A3B8', fontWeight: '700', fontSize: 12 },
    typeTextActive: { color: '#FFFFFF' },
    dateRow: { flexDirection: 'row', gap: 12 },
    dateBox: { flex: 1 },
    input: { backgroundColor: '#1E293B', borderRadius: 12, borderWidth: 1, borderColor: '#334155', color: '#F8FAFC', paddingHorizontal: 14, height: 48, fontSize: 14 },
    textArea: { height: 100, textAlignVertical: 'top', paddingTop: 12 },
    attachBtn: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: '#1E293B', borderRadius: 12, padding: 14, borderWidth: 1, borderColor: '#334155', borderStyle: 'dashed' },
    attachBtnText: { color: '#3B82F6', fontSize: 14, fontWeight: '600' },
    submitBtn: { backgroundColor: '#2563EB', height: 52, borderRadius: 14, justifyContent: 'center', alignItems: 'center', marginTop: 28 },
    submitBtnText: { color: '#FFFFFF', fontSize: 16, fontWeight: '700' },
});
