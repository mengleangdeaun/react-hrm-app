import React, { useState, useEffect, useRef } from 'react';
import {
    View,
    ScrollView,
    TouchableOpacity,
    SafeAreaView,
    StatusBar,
    Alert,
    ActivityIndicator,
    TextInput,
    AppState,
} from 'react-native';
import { StyleSheet, useUnistyles } from 'react-native-unistyles';
import { quizApi, QuizQuestion, QuizAnswerPayload } from '../../api/quiz';
import { useAppTheme } from '../../context/ThemeContext';
import { useTranslation } from '../../context/LanguageContext';
import { AppText as Text } from '../../components/AppText';
import {
    ArrowLeft,
    Clock,
    Lock,
    Info,
    ChevronLeft,
    ChevronRight,
    Check,
    AlertTriangle,
    CheckCircle2,
} from 'lucide-react-native';

const formatTimer = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
};

export const TakeQuizScreen: React.FC<{ route: any; navigation: any }> = ({
    route,
    navigation,
}) => {
    const { isDark, primaryColor } = useAppTheme();
    const { t } = useTranslation();
    const { theme } = useUnistyles();
    const styles = stylesheet;

    const { token, quizId } = route.params || {};

    const [testData, setTestData] = useState<any>(null);
    const [questions, setQuestions] = useState<QuizQuestion[]>([]);
    const [quizTitle, setQuizTitle] = useState<string>('Training Assessment');
    const [quizDuration, setQuizDuration] = useState<number>(900); // 15 mins default

    // States
    const [started, setStarted] = useState<boolean>(false);
    const [completed, setCompleted] = useState<boolean>(false);
    const [loading, setLoading] = useState<boolean>(true);
    const [submitting, setSubmitting] = useState<boolean>(false);

    // Question & Answers state
    const [currentIdx, setCurrentIdx] = useState<number>(0);
    const [answers, setAnswers] = useState<QuizAnswerPayload[]>([]);

    // Proctoring states
    const [timeLeft, setTimeLeft] = useState<number | null>(null);
    const [idleSeconds, setIdleSeconds] = useState<number>(180);
    const [tabSwitchCount, setTabSwitchCount] = useState<number>(0);

    // Refs for timer callbacks
    const timerRef = useRef<NodeJS.Timeout | null>(null);
    const answersRef = useRef<QuizAnswerPayload[]>([]);
    const lastWarningTimeRef = useRef<number>(0);

    useEffect(() => {
        answersRef.current = answers;
    }, [answers]);

    useEffect(() => {
        loadQuiz();
    }, [token, quizId]);

    const loadQuiz = async () => {
        try {
            setLoading(true);
            if (token) {
                const res = await quizApi.getQuizQuestions(token).catch(() => null);
                if (res) {
                    setTestData(res);
                    const qTitle = res.quiz?.title || 'Training Assessment';
                    const qDuration = res.quiz?.duration || 900;
                    const qQuestions = res.quiz?.questions || [];

                    setQuizTitle(qTitle);
                    setQuizDuration(qDuration);
                    setQuestions(qQuestions);

                    // Initialize answers state
                    const initial = qQuestions.map((q: any) => ({
                        question_id: q.id,
                        selected_options: [],
                        text_answer: '',
                    }));
                    setAnswers(initial);

                    if (res.started_at) {
                        setStarted(true);
                        const startTime = new Date(res.started_at).getTime();
                        const elapsed = Math.floor((Date.now() - startTime) / 1000);
                        const remaining = qDuration - elapsed;
                        setTimeLeft(remaining > 0 ? remaining : 0);
                    } else {
                        setTimeLeft(qDuration);
                    }
                }
            }
        } catch (err) {
            console.warn('Failed to load quiz details:', err);
        } finally {
            setLoading(false);
        }
    };

    // Overall & Inactivity Timer Interval
    useEffect(() => {
        if (!started || completed) return;

        timerRef.current = setInterval(() => {
            // Decrement overall quiz duration
            setTimeLeft((prev) => {
                if (prev === null) return null;
                if (prev <= 1) {
                    clearInterval(timerRef.current!);
                    handleAutoSubmit('Time is up! Your quiz has been submitted automatically.');
                    return 0;
                }
                return prev - 1;
            });

            // Decrement inactivity timer
            setIdleSeconds((prev) => {
                if (prev <= 1) {
                    clearInterval(timerRef.current!);
                    handleAutoSubmit('Test submitted automatically due to 3 minutes of inactivity.');
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);

        return () => {
            if (timerRef.current) clearInterval(timerRef.current);
        };
    }, [started, completed]);

    // AppState Focus-Lock Proctoring (App Switch Listener)
    useEffect(() => {
        if (!started || completed) return;

        const handleAppStateChange = (nextAppState: string) => {
            if (nextAppState === 'background' || nextAppState === 'inactive') {
                const now = Date.now();
                if (now - lastWarningTimeRef.current < 3000) return;
                lastWarningTimeRef.current = now;

                setTabSwitchCount((prev) => {
                    const next = prev + 1;
                    if (next >= 3) {
                        handleAutoSubmit('Test submitted automatically due to focus violation (left app 3 times).');
                        return next;
                    } else {
                        Alert.alert(
                            'Focus Lock Warning',
                            `Focus Violation: Please do not leave the app or switch screens during the test. (Attempt ${next} of 3).`
                        );
                        return next;
                    }
                });
            }
        };

        const subscription = AppState.addEventListener('change', handleAppStateChange);
        return () => subscription.remove();
    }, [started, completed]);

    const resetIdleTimer = () => {
        setIdleSeconds(180);
    };

    const handleStartTest = async () => {
        if (!token) return;
        try {
            setLoading(true);
            await quizApi.startQuiz(token).catch(() => null);
            setStarted(true);
            setTimeLeft(quizDuration);
        } catch (err) {
            console.warn('Failed to start quiz session:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleOptionToggle = (questionId: number, optionId: number | string, qType: string) => {
        resetIdleTimer();
        setAnswers((prev) =>
            prev.map((ans) => {
                if (ans.question_id !== questionId) return ans;
                const currentSelected = ans.selected_options || [];

                if (qType === 'single_choice' || qType === 'single') {
                    return { ...ans, selected_options: [optionId] };
                } else {
                    const exists = currentSelected.includes(optionId);
                    const updated = exists
                        ? currentSelected.filter((id) => id !== optionId)
                        : [...currentSelected, optionId];
                    return { ...ans, selected_options: updated };
                }
            })
        );
    };

    const handleTextAnswerChange = (questionId: number, text: string) => {
        resetIdleTimer();
        setAnswers((prev) =>
            prev.map((ans) => {
                if (ans.question_id !== questionId) return ans;
                return { ...ans, text_answer: text };
            })
        );
    };

    const handleAutoSubmit = async (reasonMessage: string) => {
        if (submitting || completed) return;
        setSubmitting(true);
        if (timerRef.current) clearInterval(timerRef.current);

        try {
            const finalAnswers = answersRef.current || answers;
            const res = await quizApi.submitQuiz(token!, finalAnswers).catch(() => null);
            setCompleted(true);
            Alert.alert('Quiz Submitted', reasonMessage);
            navigation.navigate('QuizResult', { token, score: res?.score, passed: res?.passed, quizTitle });
        } catch (err) {
            console.warn('Auto-submit failed:', err);
            setCompleted(true);
            navigation.navigate('QuizList');
        } finally {
            setSubmitting(false);
        }
    };

    const handleManualSubmitConfirm = () => {
        Alert.alert(
            t('confirm_submit_title', 'Submit Assessment'),
            t('confirm_submit_quiz', 'Are you sure you want to submit your answers?'),
            [
                { text: t('cancel', 'Cancel'), style: 'cancel' },
                { text: t('submit', 'Submit Exam'), onPress: submitManual },
            ]
        );
    };

    const submitManual = async () => {
        setSubmitting(true);
        if (timerRef.current) clearInterval(timerRef.current);

        try {
            const res = await quizApi.submitQuiz(token!, answers);
            setCompleted(true);
            navigation.navigate('QuizResult', {
                token,
                score: res?.score ?? 0,
                passed: !!res?.passed,
                quizTitle,
            });
        } catch (err: any) {
            Alert.alert(t('error', 'Error'), err?.message || t('submit_failed', 'Failed to submit quiz.'));
        } finally {
            setSubmitting(false);
        }
    };

    const handleHeaderBack = () => {
        if (started && !completed) {
            Alert.alert(
                t('leave_quiz_title', 'Leave Assessment?'),
                t('leave_quiz_warning', 'Are you sure you want to leave? Your exam timer will continue running in the background.'),
                [
                    { text: t('cancel', 'Stay'), style: 'cancel' },
                    { text: t('leave', 'Leave'), style: 'destructive', onPress: () => navigation.goBack() },
                ]
            );
        } else {
            navigation.goBack();
        }
    };

    if (loading && !testData) {
        return (
            <SafeAreaView style={styles.safeArea}>
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color={primaryColor} />
                </View>
            </SafeAreaView>
        );
    }

    const currentQuestion = questions[currentIdx];
    const currentAnsObj = answers.find((a) => a.question_id === currentQuestion?.id);

    // Initial Instructions / Agreement Screen
    if (!started) {
        return (
            <SafeAreaView style={styles.safeArea}>
                <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />

                <View style={styles.topBar}>
                    <TouchableOpacity style={styles.iconCircle} onPress={() => navigation.goBack()} activeOpacity={0.7}>
                        <ArrowLeft color={theme.colors.textPrimary} size={19} />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>{t('assessment', 'Assessment')}</Text>
                    <View style={{ width: 38 }} />
                </View>

                <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
                    <View style={styles.termsWrapper}>
                        <View style={[styles.lockIconBox, { backgroundColor: `${primaryColor}15` }]}>
                            <Lock color={primaryColor} size={32} />
                        </View>

                        <Text style={styles.termsQuizTitle}>{quizTitle}</Text>
                        <Text style={[styles.termsSubTitle, { color: primaryColor }]}>
                            {t('ready_to_start', 'Assessment Test Ready')}
                        </Text>

                        {/* Instructions Card */}
                        <View style={styles.instructionsCard}>
                            <View style={styles.instructionsHeaderRow}>
                                <Info color={primaryColor} size={16} />
                                <Text style={styles.instructionsHeaderTitle}>
                                    {t('test_instructions', 'Test Instructions & Terms')}
                                </Text>
                            </View>

                            <View style={styles.ruleItem}>
                                <View style={[styles.ruleDot, { backgroundColor: primaryColor }]} />
                                <Text style={styles.ruleText}>
                                    {t('duration_detail', `Total duration: ${Math.round((quizDuration || 0) / 60)} mins.`)}
                                </Text>
                            </View>

                            <View style={styles.ruleItem}>
                                <View style={[styles.ruleDot, { backgroundColor: theme.colors.status.danger }]} />
                                <Text style={[styles.ruleText, { color: theme.colors.status.danger, fontWeight: '700' }]}>
                                    {t('proctoring_tab_rule', 'Focus Lock: Do not leave or minimize the app. 3 violations will auto-submit the quiz.')}
                                </Text>
                            </View>

                            <View style={styles.ruleItem}>
                                <View style={[styles.ruleDot, { backgroundColor: '#F59E0B' }]} />
                                <Text style={[styles.ruleText, { color: '#F59E0B', fontWeight: '700' }]}>
                                    {t('proctoring_idle_rule', 'Inactivity Timer: If you do not touch the screen for 3 minutes, the test will submit automatically.')}
                                </Text>
                            </View>

                            <View style={styles.ruleItem}>
                                <View style={[styles.ruleDot, { backgroundColor: primaryColor }]} />
                                <Text style={styles.ruleText}>
                                    {t('proctoring_interaction_rule', 'Anti-cheat policies are enforced during your assessment session.')}
                                </Text>
                            </View>
                        </View>

                        {/* Agree & Start Action Buttons */}
                        <TouchableOpacity
                            style={[styles.primaryActionBtn, { backgroundColor: primaryColor }]}
                            activeOpacity={0.85}
                            onPress={handleStartTest}
                        >
                            <Text style={styles.primaryActionBtnText}>
                                {t('accept_and_start', 'I Agree, Start Quiz')}
                            </Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={styles.outlineActionBtn}
                            activeOpacity={0.85}
                            onPress={() => navigation.goBack()}
                        >
                            <Text style={styles.outlineActionBtnText}>{t('decline', 'Go Back')}</Text>
                        </TouchableOpacity>
                    </View>
                </ScrollView>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={styles.safeArea}>
            <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />

            {/* Exam Header */}
            <View style={styles.topBar}>
                <TouchableOpacity style={styles.iconCircle} onPress={handleHeaderBack} activeOpacity={0.7}>
                    <ArrowLeft color={theme.colors.textPrimary} size={19} />
                </TouchableOpacity>

                {/* Clock Badge */}
                <View style={styles.timerBadge}>
                    <Clock color="#F59E0B" size={15} />
                    <Text style={styles.timerText}>
                        {timeLeft !== null ? formatTimer(timeLeft) : '00:00'}
                    </Text>
                </View>

                {/* Violations Pill */}
                {tabSwitchCount > 0 ? (
                    <View style={styles.violationBadge}>
                        <AlertTriangle color={theme.colors.status.danger} size={13} />
                        <Text style={styles.violationText}>{tabSwitchCount}/3</Text>
                    </View>
                ) : (
                    <View style={{ width: 38 }} />
                )}
            </View>

            <ScrollView
                style={styles.container}
                contentContainerStyle={styles.scrollContent}
                onTouchStart={resetIdleTimer}
            >
                {questions.length === 0 ? (
                    <View style={styles.emptyCard}>
                        <Text style={styles.emptyTitle}>{t('no_questions', 'No Questions Found')}</Text>
                    </View>
                ) : (
                    <>
                        {/* Progress Bar & Counter */}
                        <View style={styles.progressSection}>
                            <View style={styles.progressTextRow}>
                                <Text style={styles.progressCounterText}>
                                    {t('question_count', `Question ${currentIdx + 1} of ${questions.length}`)}
                                </Text>
                                <Text style={styles.progressPctText}>
                                    {Math.round(((currentIdx + 1) / questions.length) * 100)}%
                                </Text>
                            </View>

                            <View style={styles.progressBarBg}>
                                <View
                                    style={[
                                        styles.progressBarFill,
                                        {
                                            width: `${((currentIdx + 1) / questions.length) * 100}%`,
                                            backgroundColor: primaryColor,
                                        },
                                    ]}
                                />
                            </View>
                        </View>

                        {/* Current Question Card */}
                        {currentQuestion && (
                            <View style={styles.questionCard}>
                                <View style={styles.qHeaderRow}>
                                    <View style={styles.typeBadge}>
                                        <Text style={styles.typeBadgeText}>
                                            {(currentQuestion.question_type || 'single_choice').toUpperCase()}
                                        </Text>
                                    </View>

                                    <Text style={styles.pointsBadgeText}>
                                        {currentQuestion.points || 10} {t('pts', 'pts')}
                                    </Text>
                                </View>

                                <Text style={styles.questionText}>{currentQuestion.question_text}</Text>

                                {/* Options Input Area */}
                                {(String(currentQuestion.question_type) === 'essay' || String(currentQuestion.question_type) === 'text') ? (
                                    <TextInput
                                        style={styles.textArea}
                                        multiline
                                        numberOfLines={5}
                                        placeholder={t('type_answer_here', 'Type your essay response here...')}
                                        placeholderTextColor={theme.colors.textSecondary}
                                        value={currentAnsObj?.text_answer || ''}
                                        onChangeText={(txt: string) => handleTextAnswerChange(currentQuestion.id, txt)}
                                    />
                                ) : (
                                    <View style={styles.optionsList}>
                                        {currentQuestion.options?.map((opt, idx) => {
                                            const selectedArr = currentAnsObj?.selected_options || [];
                                            const isSelected = selectedArr.includes(opt.id) || selectedArr.includes(Number(opt.id));

                                            return (
                                                <TouchableOpacity
                                                    key={opt.id || idx}
                                                    style={[
                                                        styles.optionCard,
                                                        isSelected && [
                                                            styles.optionCardSelected,
                                                            { borderColor: primaryColor, backgroundColor: `${primaryColor}0C` },
                                                        ],
                                                    ]}
                                                    onPress={() => handleOptionToggle(currentQuestion.id, opt.id, currentQuestion.question_type)}
                                                    activeOpacity={0.85}
                                                >
                                                    <View
                                                        style={[
                                                            styles.optCircle,
                                                            isSelected && { backgroundColor: primaryColor, borderColor: primaryColor },
                                                        ]}
                                                    >
                                                        {isSelected ? (
                                                            <Check color="#FFFFFF" size={12} />
                                                        ) : (
                                                            <Text style={styles.optLetterText}>
                                                                {String.fromCharCode(65 + idx)}
                                                            </Text>
                                                        )}
                                                    </View>
                                                    <Text
                                                        style={[
                                                            styles.optionText,
                                                            isSelected && { color: primaryColor, fontWeight: '700' },
                                                        ]}
                                                    >
                                                        {opt.option_text}
                                                    </Text>
                                                </TouchableOpacity>
                                            );
                                        })}
                                    </View>
                                )}
                            </View>
                        )}
                    </>
                )}
            </ScrollView>

            {/* Navigation Footer */}
            <View style={styles.footerBar}>
                <TouchableOpacity
                    style={[styles.navBtn, currentIdx === 0 && styles.navBtnDisabled]}
                    disabled={currentIdx === 0}
                    onPress={() => {
                        resetIdleTimer();
                        setCurrentIdx((prev) => Math.max(0, prev - 1));
                    }}
                    activeOpacity={0.7}
                >
                    <ChevronLeft color={currentIdx === 0 ? theme.colors.textSecondary : theme.colors.textPrimary} size={18} />
                    <Text style={[styles.navBtnText, currentIdx === 0 && styles.navBtnTextDisabled]}>
                        {t('previous', 'Previous')}
                    </Text>
                </TouchableOpacity>

                {currentIdx < questions.length - 1 ? (
                    <TouchableOpacity
                        style={[styles.primaryNavBtn, { backgroundColor: primaryColor }]}
                        onPress={() => {
                            resetIdleTimer();
                            setCurrentIdx((prev) => Math.min(questions.length - 1, prev + 1));
                        }}
                        activeOpacity={0.85}
                    >
                        <Text style={styles.primaryNavBtnText}>{t('next', 'Next')}</Text>
                        <ChevronRight color="#FFFFFF" size={18} />
                    </TouchableOpacity>
                ) : (
                    <TouchableOpacity
                        style={[styles.primaryNavBtn, { backgroundColor: theme.colors.status.success }]}
                        onPress={handleManualSubmitConfirm}
                        disabled={submitting}
                        activeOpacity={0.85}
                    >
                        <CheckCircle2 color="#FFFFFF" size={18} />
                        <Text style={styles.primaryNavBtnText}>{t('submit_quiz', 'Submit Quiz')}</Text>
                    </TouchableOpacity>
                )}
            </View>
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
        alignItems: 'center',
        paddingHorizontal: theme.spacing.md + 4,
        paddingVertical: theme.spacing.md,
    },
    iconCircle: {
        width: 38,
        height: 38,
        borderRadius: theme.borderRadius.md,
        backgroundColor: theme.colors.surface,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: theme.colors.border,
    },
    headerTitle: {
        color: theme.colors.textPrimary,
        fontSize: 18,
        fontWeight: '700',
    },
    timerBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(245, 158, 11, 0.12)',
        paddingHorizontal: theme.spacing.md,
        paddingVertical: 6,
        borderRadius: theme.borderRadius.full,
        borderWidth: 1,
        borderColor: 'rgba(245, 158, 11, 0.3)',
        gap: 6,
    },
    timerText: {
        fontSize: 13,
        fontWeight: '800',
        color: '#D97706',
    },
    violationBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(239, 68, 68, 0.1)',
        paddingHorizontal: theme.spacing.sm + 2,
        paddingVertical: 5,
        borderRadius: theme.borderRadius.full,
        borderWidth: 1,
        borderColor: 'rgba(239, 68, 68, 0.25)',
        gap: 4,
    },
    violationText: {
        fontSize: 11,
        fontWeight: '800',
        color: '#EF4444',
    },
    container: {
        flex: 1,
    },
    scrollContent: {
        paddingHorizontal: theme.spacing.md + 4,
        paddingTop: theme.spacing.md,
        paddingBottom: theme.spacing.xl,
    },
    loadingContainer: {
        flex: 1,
        alignItems: 'center',
        paddingVertical: theme.spacing.xxl,
    },
    termsWrapper: {
        paddingTop: theme.spacing.md,
        alignItems: 'center',
    },
    lockIconBox: {
        width: 64,
        height: 64,
        borderRadius: theme.borderRadius.lg,
        alignItems: 'center',
        marginBottom: theme.spacing.md,
    },
    termsQuizTitle: {
        fontSize: 20,
        fontWeight: '800',
        color: theme.colors.textPrimary,
        textAlign: 'center',
        textTransform: 'uppercase',
    },
    termsSubTitle: {
        fontSize: 11,
        fontWeight: '800',
        textTransform: 'uppercase',
        letterSpacing: 1,
        marginTop: 4,
        marginBottom: theme.spacing.lg,
    },
    instructionsCard: {
        backgroundColor: theme.colors.surface,
        borderRadius: theme.borderRadius.lg,
        padding: theme.spacing.lg,
        borderWidth: 1,
        borderColor: theme.colors.border,
        width: '100%',
        marginBottom: theme.spacing.xl,
        ...theme.shadows.sm,
    },
    instructionsHeaderRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginBottom: theme.spacing.md,
    },
    instructionsHeaderTitle: {
        fontSize: 12,
        fontWeight: '800',
        textTransform: 'uppercase',
        letterSpacing: 0.5,
        color: theme.colors.textSecondary,
    },
    ruleItem: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: 8,
        marginBottom: theme.spacing.sm + 4,
    },
    ruleDot: {
        width: 6,
        height: 6,
        borderRadius: 3,
        marginTop: 6,
    },
    ruleText: {
        fontSize: 13,
        color: theme.colors.textPrimary,
        lineHeight: 18,
        flex: 1,
    },
    primaryActionBtn: {
        width: '100%',
        height: 50,
        borderRadius: theme.borderRadius.lg,
        alignItems: 'center',
        marginBottom: theme.spacing.sm + 4,
    },
    primaryActionBtnText: {
        color: '#FFFFFF',
        fontSize: 14,
        fontWeight: '800',
    },
    outlineActionBtn: {
        width: '100%',
        height: 48,
        borderRadius: theme.borderRadius.lg,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: theme.colors.border,
        backgroundColor: theme.colors.surface,
    },
    outlineActionBtnText: {
        color: theme.colors.textPrimary,
        fontSize: 13,
        fontWeight: '800',
    },
    progressSection: {
        marginBottom: theme.spacing.md,
    },
    progressTextRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: theme.spacing.xs + 2,
    },
    progressCounterText: {
        fontSize: 13,
        fontWeight: '800',
        color: theme.colors.textPrimary,
    },
    progressPctText: {
        fontSize: 12,
        fontWeight: '700',
        color: theme.colors.textSecondary,
    },
    progressBarBg: {
        height: 6,
        backgroundColor: theme.colors.surfaceSubtle,
        borderRadius: 3,
        overflow: 'hidden',
    },
    progressBarFill: {
        height: '100%',
        borderRadius: 3,
    },
    emptyCard: {
        backgroundColor: theme.colors.surface,
        borderRadius: theme.borderRadius.lg,
        padding: theme.spacing.xl,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: theme.colors.border,
    },
    emptyTitle: {
        fontSize: 15,
        fontWeight: '700',
        color: theme.colors.textPrimary,
    },
    questionCard: {
        backgroundColor: theme.colors.surface,
        borderRadius: theme.borderRadius.lg,
        padding: theme.spacing.lg,
        borderWidth: 1,
        borderColor: theme.colors.border,
        ...theme.shadows.sm,
    },
    qHeaderRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: theme.spacing.md,
    },
    typeBadge: {
        backgroundColor: theme.colors.surfaceSubtle,
        paddingHorizontal: theme.spacing.sm,
        paddingVertical: 3,
        borderRadius: theme.borderRadius.sm,
        borderWidth: 1,
        borderColor: theme.colors.border,
    },
    typeBadgeText: {
        fontSize: 10,
        fontWeight: '800',
        color: theme.colors.textSecondary,
    },
    pointsBadgeText: {
        fontSize: 12,
        fontWeight: '800',
        color: theme.colors.textSecondary,
    },
    questionText: {
        fontSize: 16,
        fontWeight: '800',
        color: theme.colors.textPrimary,
        lineHeight: 22,
        marginBottom: theme.spacing.lg,
    },
    textArea: {
        backgroundColor: theme.colors.surfaceSubtle,
        borderRadius: theme.borderRadius.md,
        padding: theme.spacing.md,
        borderWidth: 1,
        borderColor: theme.colors.border,
        color: theme.colors.textPrimary,
        fontSize: 14,
        textAlignVertical: 'top',
        minHeight: 120,
    },
    optionsList: {
        gap: theme.spacing.sm + 2,
    },
    optionCard: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: theme.spacing.md,
        borderRadius: theme.borderRadius.lg,
        borderWidth: 1,
        borderColor: theme.colors.border,
        backgroundColor: theme.colors.surface,
    },
    optionCardSelected: {
        borderWidth: 1.5,
    },
    optCircle: {
        width: 28,
        height: 28,
        borderRadius: 14,
        borderWidth: 1,
        borderColor: theme.colors.border,
        alignItems: 'center',
        marginRight: theme.spacing.sm + 2,
        backgroundColor: theme.colors.surfaceSubtle,
    },
    optLetterText: {
        fontSize: 12,
        fontWeight: '800',
        color: theme.colors.textSecondary,
    },
    optionText: {
        fontSize: 14,
        fontWeight: '600',
        color: theme.colors.textPrimary,
        flex: 1,
    },
    footerBar: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: theme.colors.surface,
        borderTopWidth: 1,
        borderTopColor: theme.colors.border,
        paddingHorizontal: theme.spacing.md + 4,
        paddingVertical: theme.spacing.md,
    },
    navBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        paddingHorizontal: theme.spacing.md,
        paddingVertical: theme.spacing.sm,
        borderRadius: theme.borderRadius.md,
        borderWidth: 1,
        borderColor: theme.colors.border,
    },
    navBtnDisabled: {
        opacity: 0.5,
    },
    navBtnText: {
        fontSize: 13,
        fontWeight: '700',
        color: theme.colors.textPrimary,
    },
    navBtnTextDisabled: {
        color: theme.colors.textSecondary,
    },
    primaryNavBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        paddingHorizontal: theme.spacing.lg,
        paddingVertical: theme.spacing.sm + 2,
        borderRadius: theme.borderRadius.md,
    },
    primaryNavBtnText: {
        fontSize: 13,
        fontWeight: '800',
        color: '#FFFFFF',
    },
}));
