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
import { ArrowLeft, MessageSquare, Send } from 'lucide-react-native';

export const FeedbackScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
    const [subject, setSubject] = useState('');
    const [message, setMessage] = useState('');
    const [isAnonymous, setIsAnonymous] = useState(false);

    const handleSubmit = () => {
        if (!message) {
            Alert.alert('Required', 'Please enter feedback details.');
            return;
        }
        Alert.alert('Feedback Submitted', 'Thank you for your feedback! HR management will review it.', [
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
                    <Text style={styles.headerTitle}>Suggestion & Feedback</Text>
                    <View style={{ width: 40 }} />
                </View>

                <Text style={styles.label}>Subject</Text>
                <TextInput
                    style={styles.input}
                    value={subject}
                    onChangeText={setSubject}
                    placeholder="e.g., Office cafeteria menu improvement"
                    placeholderTextColor="#64748B"
                />

                <Text style={styles.label}>Detailed Feedback</Text>
                <TextInput
                    style={[styles.input, styles.textArea]}
                    value={message}
                    onChangeText={setMessage}
                    placeholder="Provide your thoughts or suggestions..."
                    placeholderTextColor="#64748B"
                    multiline
                    numberOfLines={4}
                />

                <TouchableOpacity
                    style={styles.checkboxRow}
                    onPress={() => setIsAnonymous(!isAnonymous)}
                >
                    <View style={[styles.checkbox, isAnonymous && styles.checkboxActive]}>
                        {isAnonymous && <Text style={styles.checkmark}>✓</Text>}
                    </View>
                    <Text style={styles.checkboxLabel}>Submit Anonymously</Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.submitBtn} onPress={handleSubmit}>
                    <Send color="#FFFFFF" size={18} />
                    <Text style={styles.submitBtnText}>Submit Feedback</Text>
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
    checkboxRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 18 },
    checkbox: { width: 22, height: 22, borderRadius: 6, borderWidth: 2, borderColor: '#64748B', justifyContent: 'center', alignItems: 'center' },
    checkboxActive: { backgroundColor: '#2563EB', borderColor: '#2563EB' },
    checkmark: { color: '#FFFFFF', fontWeight: '800', fontSize: 12 },
    checkboxLabel: { color: '#F8FAFC', fontSize: 14, fontWeight: '600' },
    submitBtn: { flexDirection: 'row', gap: 8, backgroundColor: '#2563EB', height: 52, borderRadius: 14, justifyContent: 'center', alignItems: 'center', marginTop: 28 },
    submitBtnText: { color: '#FFFFFF', fontSize: 16, fontWeight: '700' },
});
