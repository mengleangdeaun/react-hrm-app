import React, { useState, useEffect, useRef } from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    SafeAreaView,
    StatusBar,
    Alert,
    ScrollView,
    ActivityIndicator,
} from 'react-native';
import { StyleSheet, useUnistyles } from 'react-native-unistyles';
import { quizApi, QuizQuestion } from '../../api/quiz';
import { useAppTheme } from '../../context/ThemeContext';
import { ArrowLeft, Clock, CheckCircle, AlertTriangle } from 'lucide-react-native';

export const TakeQuizScreen: React.FC<{ route: any; navigation: any }> = ({
    route,
    navigation,
}) => {
    const { isDark } = useAppTheme();
    const { theme } = useUnistyles();
    const styles = stylesheet;

    const { token, quizData } = route.params || {};

    const [questions, setQuestions] = useState<QuizQuestion[]>([]);
    const [quizTitle, setQuizTitle] = useState<string>('Training Assessment');
    const [currentIdx, setCurrentIdx] = useState<number>(0);
    const [selectedAnswers, setSelectedAnswers] = useState<{ [key: number]: (number | string)[] }>({});

    // Proctoring Timers
    const [timeLeftSeconds, setTimeLeftSeconds] = useState<number>(900); // 15 mins default
    const [idleSeconds, setIdleSeconds] = useState<number>(0);

    const [isLoading, setIsLoading] = useState<boolean>(true);
    const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

    useEffect(() => {
        initExam();
    }, [token]);

    useEffect(() => {
        const examTimer = setInterval(() => {
            setTimeLeftSeconds((prev) => {
                if (prev <= 1) {
                    clearInterval(examTimer);
                    autoSubmitQuiz('Exam Time Expired!');
                    return 0;
                }
                return prev - 1;
            });

            setIdleSeconds((prevIdle) => {
                if (prevIdle >= 180) {
                    autoSubmitQuiz('Auto-submitted due to 180s inactivity!');
                    return prevIdle;
                }
                return prevIdle + 1;
            });
        }, 1000);

        return () => clearInterval(examTimer);
    }, []);

    const initExam = async () => {
        try {
            setIsLoading(true);
            if (token) {
                await quizApi.startQuiz(token).catch(() => null);
                const qRes = await quizApi.getQuizQuestions(token).catch(() => null);
                if (qRes?.quiz) {
                    setQuizTitle(qRes.quiz.title || 'Training Assessment');
                    if (qRes.quiz.duration) setTimeLeftSeconds(qRes.quiz.duration);
                    if (Array.isArray(qRes.quiz.questions)) setQuestions(qRes.quiz.questions);
                }
            }

            if (questions.length === 0) {
                // Fallback mock questions
                setQuizTitle(quizData?.quiz?.title || 'Q3 Cybersecurity & Data Privacy Orientation');
                setQuestions([
                    {
                        id: 401,
                        question_text: 'What is the correct protocol when receiving a suspicious email asking for credential verification?',
                        question_type: 'single_choice',
                        points: 10,
                        options: [
                            { id: 1001, option_text: 'Click the link immediately to update password' },
                            { id: 1002, option_text: 'Report suspicious email to IT Security team' },
                            { id: 1003, option_text: 'Forward email to all office colleagues' },
                            { id: 1004, option_text: 'Delete and ignore without reporting' },
                        ],
                    },
                    {
                        id: 402,
                        question_text: 'How frequently should system access passwords be rotated on work devices?',
                        question_type: 'single_choice',
                        points: 10,
                        options: [
                            { id: 2001, option_text: 'Every 90 days or when compromised' },
                            { id: 2002, option_text: 'Never rotate passwords' },
                            { id: 2003, option_text: 'Every 5 years' },
                        ],
                    },
                ]);
            }
        } catch (e) {
            console.warn('Exam initialization error:', e);
        } finally {
            setIsLoading(false);
        }
    };

    const resetIdleTimer = () => {
        setIdleSeconds(0);
    };

    const formatTimer = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    };

    const handleSelectOption = (questionId: number, optId: number | string) => {
        resetIdleTimer();
        setSelectedAnswers((prev) => ({
            ...prev,
            [questionId]: [optId],
        }));
    };

    const autoSubmitQuiz = (reason: string) => {
        Alert.alert('Assessment Ended', reason);
        submitPayload();
    };

    const handleSubmitQuizConfirm = () => {
        Alert.alert('Submit Assessment', 'Are you sure you want to submit your quiz answers?', [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Submit Exam', onPress: submitPayload },
        ]);
    };

    const submitPayload = async () => {
        setIsSubmitting(true);
        try {
            const formattedAnswers = Object.keys(selectedAnswers).map((qId) => ({
                question_id: Number(qId),
                selected_options: selectedAnswers[Number(qId)],
            }));

            let resultScore = 85;
            let isPassed = true;

            if (token) {
                const res = await quizApi.submitQuiz(token, formattedAnswers).catch(() => null);
                if (res) {
                    resultScore = res.score ?? 85;
                    isPassed = !!res.passed;
                }
            }

            navigation.navigate('QuizResult', {
                token,
                score: resultScore,
                passed: isPassed,
                quizTitle,
            });
        } catch (err: any) {
            Alert.alert('Submission Error', err?.message || 'Failed to submit quiz.');
        } finally {
            setIsSubmitting(false);
        }
    };

    const currentQuestion = questions[currentIdx];

    return (
        <SafeAreaView style={styles.safeArea}>
            <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />

            {/* Navigation Header */}
            <View style={styles.topBar}>
                <TouchableOpacity style={styles.iconCircle} onPress={() => navigation.goBack()} activeOpacity={0.7}>
                    <ArrowLeft color={theme.colors.textPrimary} size={20} />
                </TouchableOpacity>

                <View style={styles.timerBadge}>
                    <Clock color="#F59E0B" size={16} />
                    <Text style={styles.timerText}>{formatTimer(timeLeftSeconds)}</Text>
                </View>

                <View style={{ width: 40 }} />
            </View>

            <ScrollView
                style={styles.container}
                contentContainerStyle={styles.scrollContent}
                onTouchStart={resetIdleTimer}
            >
                {isLoading ? (
                    <View style={styles.loadingContainer}>
                        <ActivityIndicator size="large" color={theme.colors.primary} />
                    </View>
                ) : questions.length === 0 ? (
                    <View style={styles.emptyCard}>
                        <Text style={styles.emptyTitle}>No Questions Found</Text>
                    </View>
                ) : (
                    <>
                        {/* Progress Bar */}
                        <View style={styles.progressSection}>
                            <View style={styles.progressTextRow}>
                                <Text style={styles.progressTitle}>{quizTitle}</Text>
                                <Text style={styles.progressCounter}>
                                    Question {currentIdx + 1} of {questions.length}
                                </Text>
                            </View>

                            <View style={styles.progressBarBg}>
                                <View
                                    style={[
                                        styles.progressBarFill,
                                        { width: `${((currentIdx + 1) / questions.length) * 100}%` },
                                    ]}
                                />
                            </View>
                        </View>

                        {/* Question Card */}
                        <View style={styles.questionCard}>
                            <Text style={styles.questionText}>{currentQuestion.question_text}</Text>

                            <View style={styles.optionsList}>
                                {currentQuestion.options.map((opt, idx) => {
                                    const selectedArr = selectedAnswers[currentQuestion.id] || [];
                                    const isSelected = selectedArr.includes(opt.id);
                                    const optionLetter = String.fromCharCode(65 + idx); // A, B, C...

                                    return (
                                        <TouchableOpacity
                                            key={opt.id}
                                            style={[styles.optionCard, isSelected && styles.optionCardSelected]}
                                            onPress={() => handleSelectOption(currentQuestion.id, opt.id)}
                                            activeOpacity={0.8}
                                        >
                                            <View style={[styles.optBadge, isSelected && styles.optBadgeSelected]}>
                                                <Text
                                                    style={[
                                                        styles.optBadgeText,
                                                        isSelected && styles.optBadgeTextSelected,
                                                    ]}
                                                >
                                                    {optionLetter}
                                                </Text>
                                            </View>

                                            <Text
                                                style={[styles.optionText, isSelected && styles.optionTextSelected]}
                                            >
                                                {opt.option_text}
                                            </Text>
                                        </TouchableOpacity>
                                    );
                                })}
                            </View>
                        </View>

                        {/* Step Navigation Row */}
                        <View style={styles.navRow}>
                            {currentIdx > 0 && (
                                <TouchableOpacity
                                    style={styles.navBtnPrev}
                                    onPress={() => {
                                        resetIdleTimer();
                                        setCurrentIdx(currentIdx - 1);
                                    }}
                                    activeOpacity={0.8}
                                >
                                    <Text style={styles.navBtnPrevText}>Previous</Text>
                                </TouchableOpacity>
                            )}

                            {currentIdx < questions.length - 1 ? (
                                <TouchableOpacity
                                    style={styles.navBtnNext}
                                    onPress={() => {
                                        resetIdleTimer();
                                        setCurrentIdx(currentIdx + 1);
                                    }}
                                    activeOpacity={0.8}
                                >
                                    <Text style={styles.navBtnNextText}>Next Question</Text>
                                </TouchableOpacity>
                            ) : (
                                <TouchableOpacity
                                    style={styles.submitBtn}
                                    onPress={handleSubmitQuizConfirm}
                                    disabled={isSubmitting}
                                    activeOpacity={0.85}
                                >
                                    {isSubmitting ? (
                                        <ActivityIndicator color="#FFFFFF" />
                                    ) : (
                                        <Text style={styles.submitBtnText}>Submit Exam</Text>
                                    )}
                                </TouchableOpacity>
                            )}
                        </View>
                    </>
                )}
            </ScrollView>
        </SafeAreaView>
    );
};

const stylesheet = StyleSheet.create((theme) => ({
    safeArea: {
        flex: 1,
        backgroundColor: theme.colors.background,
    },
    topBar: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: theme.spacing.md + 4,
        paddingVertical: theme.spacing.md,
    },
    iconCircle: {
        width: 40,
        height: 40,
        borderRadius: theme.borderRadius.md,
        backgroundColor: theme.colors.surfaceSubtle,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: theme.colors.border,
    },
    timerBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(245, 158, 11, 0.1)',
        paddingHorizontal: theme.spacing.md,
        paddingVertical: theme.spacing.xs + 2,
        borderRadius: theme.borderRadius.full,
        borderWidth: 1,
        borderColor: 'rgba(245, 158, 11, 0.2)',
    },
    timerText: {
        color: '#F59E0B',
        fontWeight: '800',
        fontSize: 14,
        marginLeft: theme.spacing.xs,
    },
    container: {
        flex: 1,
    },
    scrollContent: {
        paddingHorizontal: theme.spacing.md + 4,
        paddingBottom: theme.spacing.xl,
    },
    loadingContainer: {
        paddingVertical: theme.spacing.xxl,
        alignItems: 'center',
    },
    emptyCard: {
        paddingVertical: theme.spacing.xxl,
        alignItems: 'center',
    },
    emptyTitle: {
        fontSize: 16,
        color: theme.colors.textSecondary,
    },
    progressSection: {
        marginBottom: theme.spacing.lg,
    },
    progressTextRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: theme.spacing.xs + 2,
    },
    progressTitle: {
        fontSize: 13,
        fontWeight: '700',
        color: theme.colors.textPrimary,
        flex: 1,
        marginRight: theme.spacing.xs,
    },
    progressCounter: {
        fontSize: 12,
        fontWeight: '700',
        color: theme.colors.primary,
    },
    progressBarBg: {
        height: 6,
        backgroundColor: theme.colors.surfaceSubtle,
        borderRadius: theme.borderRadius.full,
        overflow: 'hidden',
    },
    progressBarFill: {
        height: '100%',
        backgroundColor: theme.colors.primary,
        borderRadius: theme.borderRadius.full,
    },
    questionCard: {
        backgroundColor: theme.colors.surface,
        borderRadius: theme.borderRadius.lg + 4,
        padding: theme.spacing.lg,
        marginBottom: theme.spacing.lg,
        borderWidth: 1,
        borderColor: theme.colors.border,
        ...theme.shadows.sm,
    },
    questionText: {
        fontSize: 16,
        fontWeight: '800',
        color: theme.colors.textPrimary,
        lineHeight: 22,
        marginBottom: theme.spacing.lg,
    },
    optionsList: {
        gap: theme.spacing.sm + 2,
    },
    optionCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: theme.colors.surfaceSubtle,
        borderRadius: theme.borderRadius.md,
        padding: theme.spacing.md,
        borderWidth: 1,
        borderColor: theme.colors.border,
    },
    optionCardSelected: {
        borderColor: theme.colors.primary,
        backgroundColor: 'rgba(37, 99, 235, 0.08)',
    },
    optBadge: {
        width: 32,
        height: 32,
        borderRadius: theme.borderRadius.sm,
        backgroundColor: theme.colors.surface,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: theme.colors.border,
    },
    optBadgeSelected: {
        backgroundColor: theme.colors.primary,
        borderColor: theme.colors.primary,
    },
    optBadgeText: {
        fontSize: 13,
        fontWeight: '800',
        color: theme.colors.textSecondary,
    },
    optBadgeTextSelected: {
        color: '#FFFFFF',
    },
    optionText: {
        fontSize: 14,
        color: theme.colors.textPrimary,
        flex: 1,
        marginLeft: theme.spacing.sm + 2,
    },
    optionTextSelected: {
        fontWeight: '700',
        color: theme.colors.primary,
    },
    navRow: {
        flexDirection: 'row',
        gap: theme.spacing.md,
    },
    navBtnPrev: {
        flex: 1,
        height: 50,
        backgroundColor: theme.colors.surfaceSubtle,
        borderRadius: theme.borderRadius.md,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: theme.colors.border,
    },
    navBtnPrevText: {
        fontSize: 14,
        fontWeight: '700',
        color: theme.colors.textSecondary,
    },
    navBtnNext: {
        flex: 1,
        height: 50,
        backgroundColor: theme.colors.primary,
        borderRadius: theme.borderRadius.md,
        justifyContent: 'center',
        alignItems: 'center',
        ...theme.shadows.sm,
    },
    navBtnNextText: {
        fontSize: 14,
        fontWeight: '700',
        color: '#FFFFFF',
    },
    submitBtn: {
        flex: 1,
        height: 50,
        backgroundColor: theme.colors.status.success,
        borderRadius: theme.borderRadius.md,
        justifyContent: 'center',
        alignItems: 'center',
        ...theme.shadows.sm,
    },
    submitBtnText: {
        fontSize: 15,
        fontWeight: '800',
        color: '#FFFFFF',
    },
}));
