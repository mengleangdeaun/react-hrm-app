import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    SafeAreaView,
    StatusBar,
    Alert,
    ScrollView,
} from 'react-native';
import { ArrowLeft, Clock, CheckCircle } from 'lucide-react-native';

const MOCK_QUESTIONS = [
    {
        id: 1,
        question_text: 'What should you do if you receive an unexpected email asking to verify your work credentials?',
        options: [
            { id: 'A', text: 'Click the link immediately and update password' },
            { id: 'B', text: 'Report the suspicious email to IT Security team' },
            { id: 'C', text: 'Forward it to all colleagues' },
            { id: 'D', text: 'Ignore and delete without reporting' },
        ],
        correct: 'B',
    },
    {
        id: 2,
        question_text: 'How often should employees change their primary work system passwords?',
        options: [
            { id: 'A', text: 'Every 90 days or when compromised' },
            { id: 'B', text: 'Never' },
            { id: 'C', text: 'Every 5 years' },
            { id: 'D', text: 'Only when leaving the company' },
        ],
        correct: 'A',
    },
];

export const TakeQuizScreen: React.FC<{ route: any; navigation: any }> = ({
    route,
    navigation,
}) => {
    const { token } = route.params || {};
    const [currentIdx, setCurrentIdx] = useState(0);
    const [selectedAnswers, setSelectedAnswers] = useState<{ [key: number]: string }>({});
    const [timeLeftSeconds, setTimeLeftSeconds] = useState(900); // 15 mins

    useEffect(() => {
        const timer = setInterval(() => {
            setTimeLeftSeconds((prev) => (prev > 0 ? prev - 1 : 0));
        }, 1000);
        return () => clearInterval(timer);
    }, []);

    const formatTimer = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    };

    const currentQuestion = MOCK_QUESTIONS[currentIdx];

    const handleSelectOption = (optId: string) => {
        setSelectedAnswers({ ...selectedAnswers, [currentQuestion.id]: optId });
    };

    const handleSubmitQuiz = () => {
        Alert.alert('Submit Assessment', 'Are you sure you want to submit your answers?', [
            { text: 'Cancel', style: 'cancel' },
            {
                text: 'Submit Now',
                onPress: () => navigation.navigate('QuizResult', { token }),
            },
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
                    <View style={styles.timerBadge}>
                        <Clock color="#F59E0B" size={16} />
                        <Text style={styles.timerText}>{formatTimer(timeLeftSeconds)}</Text>
                    </View>
                    <View style={{ width: 40 }} />
                </View>

                {/* Progress Indicator */}
                <View style={styles.progressRow}>
                    <Text style={styles.progressText}>
                        Question {currentIdx + 1} of {MOCK_QUESTIONS.length}
                    </Text>
                    <View style={styles.progressBarBg}>
                        <View
                            style={[
                                styles.progressBarFill,
                                { width: `${((currentIdx + 1) / MOCK_QUESTIONS.length) * 100}%` },
                            ]}
                        />
                    </View>
                </View>

                {/* Question Box */}
                <View style={styles.questionCard}>
                    <Text style={styles.questionText}>{currentQuestion.question_text}</Text>

                    {/* Options */}
                    <View style={styles.optionsList}>
                        {currentQuestion.options.map((opt) => {
                            const isSelected = selectedAnswers[currentQuestion.id] === opt.id;
                            return (
                                <TouchableOpacity
                                    key={opt.id}
                                    style={[styles.optionCard, isSelected && styles.optionCardSelected]}
                                    onPress={() => handleSelectOption(opt.id)}
                                >
                                    <View style={[styles.optBadge, isSelected && styles.optBadgeSelected]}>
                                        <Text style={[styles.optBadgeText, isSelected && styles.optBadgeTextSelected]}>
                                            {opt.id}
                                        </Text>
                                    </View>
                                    <Text style={[styles.optionText, isSelected && styles.optionTextSelected]}>
                                        {opt.text}
                                    </Text>
                                </TouchableOpacity>
                            );
                        })}
                    </View>
                </View>

                {/* Footer Navigation Controls */}
                <View style={styles.navRow}>
                    {currentIdx > 0 && (
                        <TouchableOpacity
                            style={styles.navBtnPrev}
                            onPress={() => setCurrentIdx(currentIdx - 1)}
                        >
                            <Text style={styles.navBtnPrevText}>Previous</Text>
                        </TouchableOpacity>
                    )}

                    {currentIdx < MOCK_QUESTIONS.length - 1 ? (
                        <TouchableOpacity
                            style={styles.navBtnNext}
                            onPress={() => setCurrentIdx(currentIdx + 1)}
                        >
                            <Text style={styles.navBtnNextText}>Next Question</Text>
                        </TouchableOpacity>
                    ) : (
                        <TouchableOpacity style={styles.submitBtn} onPress={handleSubmitQuiz}>
                            <Text style={styles.submitBtnText}>Submit Quiz</Text>
                        </TouchableOpacity>
                    )}
                </View>
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
    timerBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#F59E0B15', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 10 },
    timerText: { color: '#F59E0B', fontWeight: '800', fontSize: 14 },
    progressRow: { marginBottom: 20 },
    progressText: { color: '#94A3B8', fontSize: 13, fontWeight: '600', marginBottom: 6 },
    progressBarBg: { height: 6, backgroundColor: '#1E293B', borderRadius: 3, overflow: 'hidden' },
    progressBarFill: { height: '100%', backgroundColor: '#8B5CF6' },
    questionCard: { backgroundColor: '#1E293B', borderRadius: 20, padding: 20, marginBottom: 24, borderWidth: 1, borderColor: '#334155' },
    questionText: { color: '#F8FAFC', fontSize: 17, fontWeight: '700', lineHeight: 24, marginBottom: 20 },
    optionsList: { gap: 12 },
    optionCard: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: '#0F172A', borderRadius: 14, padding: 14, borderWidth: 1, borderColor: '#334155' },
    optionCardSelected: { borderColor: '#8B5CF6', backgroundColor: '#8B5CF615' },
    optBadge: { width: 32, height: 32, borderRadius: 10, backgroundColor: '#1E293B', justifyContent: 'center', alignItems: 'center' },
    optBadgeSelected: { backgroundColor: '#8B5CF6' },
    optBadgeText: { color: '#94A3B8', fontWeight: '800', fontSize: 13 },
    optBadgeTextSelected: { color: '#FFFFFF' },
    optionText: { color: '#CBD5E1', fontSize: 14, flex: 1 },
    optionTextSelected: { color: '#F8FAFC', fontWeight: '700' },
    navRow: { flexDirection: 'row', gap: 12 },
    navBtnPrev: { flex: 1, height: 48, backgroundColor: '#1E293B', borderRadius: 12, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: '#334155' },
    navBtnPrevText: { color: '#94A3B8', fontWeight: '700' },
    navBtnNext: { flex: 1, height: 48, backgroundColor: '#8B5CF6', borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
    navBtnNextText: { color: '#FFFFFF', fontWeight: '700' },
    submitBtn: { flex: 1, height: 48, backgroundColor: '#10B981', borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
    submitBtnText: { color: '#FFFFFF', fontWeight: '700' },
});
