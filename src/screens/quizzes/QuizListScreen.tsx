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
import { Award, Clock, ArrowLeft, ChevronRight, CheckCircle2 } from 'lucide-react-native';
import { Quiz } from '../../types';

const MOCK_QUIZZES: Quiz[] = [
    {
        id: 1,
        title: 'Cybersecurity & Data Privacy Basics 2026',
        description: 'Mandatory annual training on data protection, phishing detection, and password policy.',
        duration_minutes: 15,
        total_questions: 10,
        token: 'cyber-2026-token',
        is_completed: false,
    },
    {
        id: 2,
        title: 'Company Culture & HR Policies',
        description: 'Overview of employee handbook, leave policies, and workplace code of conduct.',
        duration_minutes: 10,
        total_questions: 8,
        token: 'hr-policy-token',
        is_completed: true,
        score: 90,
    },
];

export const QuizListScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
    return (
        <SafeAreaView style={styles.safeArea}>
            <StatusBar barStyle="light-content" backgroundColor="#0F172A" />
            <ScrollView style={styles.container} contentContainerStyle={styles.content}>
                <View style={styles.topBar}>
                    <TouchableOpacity style={styles.iconCircle} onPress={() => navigation.goBack()}>
                        <ArrowLeft color="#F8FAFC" size={20} />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>Assigned Quizzes & Assessments</Text>
                    <View style={{ width: 40 }} />
                </View>

                {MOCK_QUIZZES.map((quiz) => (
                    <TouchableOpacity
                        key={quiz.id}
                        style={styles.card}
                        onPress={() => {
                            if (quiz.is_completed) {
                                navigation.navigate('QuizResult', { token: quiz.token });
                            } else {
                                navigation.navigate('TakeQuiz', { token: quiz.token });
                            }
                        }}
                    >
                        <View style={styles.cardHeader}>
                            <Award color="#8B5CF6" size={22} />
                            <Text style={styles.cardTitle}>{quiz.title}</Text>
                        </View>
                        <Text style={styles.cardDesc}>{quiz.description}</Text>

                        <View style={styles.cardFooter}>
                            <View style={styles.infoRow}>
                                <Clock color="#64748B" size={14} />
                                <Text style={styles.infoText}>{quiz.duration_minutes} Mins • {quiz.total_questions} Questions</Text>
                            </View>

                            {quiz.is_completed ? (
                                <View style={styles.completedBadge}>
                                    <CheckCircle2 color="#10B981" size={14} />
                                    <Text style={styles.completedText}>Score: {quiz.score}%</Text>
                                </View>
                            ) : (
                                <View style={styles.startBtn}>
                                    <Text style={styles.startBtnText}>Start Quiz</Text>
                                    <ChevronRight color="#FFFFFF" size={14} />
                                </View>
                            )}
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
    headerTitle: { color: '#F8FAFC', fontSize: 17, fontWeight: '700' },
    card: { backgroundColor: '#1E293B', borderRadius: 18, padding: 16, marginBottom: 14, borderWidth: 1, borderColor: '#334155' },
    cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8 },
    cardTitle: { color: '#F8FAFC', fontSize: 16, fontWeight: '700', flex: 1 },
    cardDesc: { color: '#94A3B8', fontSize: 13, lineHeight: 18, marginBottom: 14 },
    cardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderTopWidth: 1, borderTopColor: '#334155', paddingTop: 10 },
    infoRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    infoText: { color: '#64748B', fontSize: 12 },
    completedBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#10B98115', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
    completedText: { color: '#10B981', fontSize: 12, fontWeight: '700' },
    startBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#8B5CF6', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 10 },
    startBtnText: { color: '#FFFFFF', fontSize: 12, fontWeight: '700' },
});
