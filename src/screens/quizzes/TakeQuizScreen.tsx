import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
    View,
    ScrollView,
    TouchableOpacity,
    StatusBar,
    Alert,
    ActivityIndicator,
    TextInput,
    AppState,
    Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StyleSheet, useUnistyles } from 'react-native-unistyles';
import { quizApi, QuizQuestion, QuizAnswerPayload } from '../../api/quiz';
import { useAppTheme } from '../../context/ThemeContext';
import { useTranslation } from '../../context/LanguageContext';
import { AppText as Text } from '../../components/AppText';
import { AppHeader, HeaderIconButton } from '../../components/common/AppHeader';
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
    ShieldAlert,
    HelpCircle,
    Award,
    FileText,
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
    const insets = useSafeAreaInsets();
    const styles = stylesheet;

    const { token, quizId } = route.params || {};

    const [testData, setTestData] = useState<any>(null);
    const [questions, setQuestions] = useState<QuizQuestion[]>([]);
    const [quizTitle, setQuizTitle] = useState<string>('Training Assessment');
    const [quizDuration, setQuizDuration] = useState<number>(900); // 15 mins default
    const [passingPct, setPassingPct] = useState<number>(70);
    const [totalPoints, setTotalPoints] = useState<number>(100);

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
    const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const answersRef = useRef<QuizAnswerPayload[]>([]);
    const lastWarningTimeRef = useRef<number>(0);
    const questionScrollRef = useRef<any>(null);

    useEffect(() => {
        answersRef.current = answers;
    }, [answers]);

    useEffect(() => {
        loadQuiz();
    }, [token, quizId]);

    // Auto-scroll question selector strip when index changes
    useEffect(() => {
        if (questionScrollRef.current && questions.length > 0) {
            questionScrollRef.current.scrollTo({
                x: Math.max(0, currentIdx * 48 - 100),
                animated: true,
            });
        }
    }, [currentIdx, questions.length]);

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
                    const qPassing = res.quiz?.passing_percentage || 70;
                    const qPoints = res.quiz?.points || 100;

                    setQuizTitle(qTitle);
                    setQuizDuration(qDuration);
                    setQuestions(qQuestions);
                    setPassingPct(qPassing);
                    setTotalPoints(qPoints);

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
                        if (Platform.OS === 'web') {
                            window.alert(`Focus Lock Warning: Please do not leave the app or switch screens during the test. (Attempt ${next} of 3).`);
                        } else {
                            Alert.alert(
                                'Focus Lock Warning',
                                `Focus Violation: Please do not leave the app or switch screens during the test. (Attempt ${next} of 3).`
                            );
                        }
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
                    const exists = currentSelected.includes(optionId) || currentSelected.includes(Number(optionId));
                    const updated = exists
                        ? currentSelected.filter((id) => id !== optionId && id !== Number(optionId))
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

    const normalizePayloadAnswers = (rawAnswers: QuizAnswerPayload[]): QuizAnswerPayload[] => {
        return rawAnswers.map((a) => ({
            question_id: Number(a.question_id),
            selected_options: (a.selected_options || []).map((opt) => (isNaN(Number(opt)) ? opt : Number(opt))),
            text_answer: a.text_answer || '',
        }));
    };

    const handleAutoSubmit = async (reasonMessage: string) => {
        if (submitting || completed) return;
        setSubmitting(true);
        if (timerRef.current) clearInterval(timerRef.current);

        try {
            const raw = (answersRef.current && answersRef.current.length > 0) ? answersRef.current : answers;
            const finalAnswers = normalizePayloadAnswers(raw);
            const res = await quizApi.submitQuiz(token!, finalAnswers).catch(() => null);
            setCompleted(true);
            if (Platform.OS === 'web') {
                window.alert(reasonMessage);
            } else {
                Alert.alert('Quiz Submitted', reasonMessage);
            }
            navigation.replace('QuizResult', { token, score: res?.score, passed: res?.passed, quizTitle });
        } catch (err) {
            console.warn('Auto-submit failed:', err);
            setCompleted(true);
            navigation.replace('QuizList');
        } finally {
            setSubmitting(false);
        }
    };

    // Calculate answered status for a given question
    const isQuestionAnswered = (qId: number, qType: string) => {
        const ans = answers.find((a) => a.question_id === qId);
        if (!ans) return false;
        if (qType === 'essay' || (qType as string) === 'text') {
            return Boolean(ans.text_answer && ans.text_answer.trim().length > 0);
        }
        return Boolean(ans.selected_options && ans.selected_options.length > 0);
    };

    const answeredCount = useMemo(() => {
        return questions.filter((q) => isQuestionAnswered(q.id, q.question_type)).length;
    }, [questions, answers]);

    const handleManualSubmitConfirm = () => {
        const totalCount = questions.length;
        const unansweredCount = totalCount - answeredCount;

        const message =
            unansweredCount > 0
                ? t(
                      'confirm_submit_with_unanswered',
                      `You have answered ${answeredCount} of ${totalCount} questions (${unansweredCount} unanswered). Are you sure you want to submit?`
                  )
                : t(
                      'confirm_submit_all_answered',
                      `You have answered all ${totalCount} questions. Are you sure you want to submit your assessment?`
                  );

        if (Platform.OS === 'web') {
            if (window.confirm(message)) {
                submitManual();
            }
            return;
        }

        Alert.alert(
            t('confirm_submit_title', 'Submit Assessment'),
            message,
            [
                { text: t('cancel', 'Cancel'), style: 'cancel' },
                { text: t('submit', 'Submit Assessment'), onPress: submitManual },
            ]
        );
    };

    const submitManual = async () => {
        if (submitting) return;
        setSubmitting(true);
        if (timerRef.current) clearInterval(timerRef.current);

        try {
            const raw = (answersRef.current && answersRef.current.length > 0) ? answersRef.current : answers;
            const finalAnswers = normalizePayloadAnswers(raw);
            const res = await quizApi.submitQuiz(token!, finalAnswers);
            setCompleted(true);
            navigation.replace('QuizResult', {
                token,
                score: res?.score ?? 0,
                passed: !!res?.passed,
                quizTitle,
            });
        } catch (err: any) {
            const errorMsg =
                err?.response?.data?.message ||
                err?.message ||
                t('submit_failed', 'Failed to submit quiz.');

            if (Platform.OS === 'web') {
                window.alert(`Error: ${errorMsg}`);
            } else {
                Alert.alert(t('error', 'Error'), errorMsg);
            }
        } finally {
            setSubmitting(false);
        }
    };

    const handleHeaderBack = () => {
        if (started && !completed) {
            const leaveMsg = t(
                'leave_quiz_warning',
                'Are you sure you want to leave? Your exam timer will continue running in the background.'
            );

            if (Platform.OS === 'web') {
                if (window.confirm(leaveMsg)) {
                    navigation.goBack();
                }
                return;
            }

            Alert.alert(
                t('leave_quiz_title', 'Leave Assessment?'),
                leaveMsg,
                [
                    { text: t('cancel', 'Stay in Quiz'), style: 'cancel' },
                    { text: t('leave', 'Leave Quiz'), style: 'destructive', onPress: () => navigation.goBack() },
                ]
            );
        } else {
            navigation.goBack();
        }
    };

    if (loading && !testData) {
        return (
            <View style={[styles.safeArea, { paddingTop: insets.top }]}>
                <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color={primaryColor} />
                    <Text style={styles.loadingText}>{t('loading_quiz', 'Preparing assessment environment...')}</Text>
                </View>
            </View>
        );
    }

    const currentQuestion = questions[currentIdx];
    const currentAnsObj = answers.find((a) => a.question_id === currentQuestion?.id);

    // Initial Instructions / Agreement Screen
    if (!started) {
        return (
            <View style={[styles.safeArea, { paddingTop: insets.top }]}>
                <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />

                {/* Standard Native Header Bar */}
                <AppHeader
                    title={t('assessment_overview', 'Assessment Overview')}
                    onBack={() => navigation.goBack()}
                />

                <ScrollView
                    style={styles.container}
                    contentContainerStyle={styles.scrollContent}
                    showsVerticalScrollIndicator={false}
                >
                    <View style={styles.termsWrapper}>
                        {/* Lock Icon Box */}
                        <View style={[styles.lockIconBox, { backgroundColor: `${primaryColor}15` }]}>
                            <Lock color={primaryColor} size={30} />
                        </View>

                        <Text style={styles.termsQuizTitle}>{quizTitle}</Text>
                        <Text style={[styles.termsSubTitle, { color: primaryColor }]}>
                            {t('ready_to_start', 'Assessment Test Ready')}
                        </Text>

                        {/* Quiz Quick Stats Grid */}
                        <View style={styles.statsGrid}>
                            <View style={styles.statBox}>
                                <Clock color={primaryColor} size={16} />
                                <Text style={styles.statValue}>
                                    {Math.round((quizDuration || 0) / 60)} {t('mins', 'Mins')}
                                </Text>
                                <Text style={styles.statLabel}>{t('duration', 'Duration')}</Text>
                            </View>

                            <View style={styles.statBox}>
                                <FileText color={primaryColor} size={16} />
                                <Text style={styles.statValue}>{questions.length || 0}</Text>
                                <Text style={styles.statLabel}>{t('questions', 'Questions')}</Text>
                            </View>

                            <View style={styles.statBox}>
                                <Award color={primaryColor} size={16} />
                                <Text style={styles.statValue}>{totalPoints} {t('pts', 'Pts')}</Text>
                                <Text style={styles.statLabel}>{t('pass_rate', `${passingPct}% Pass`)}</Text>
                            </View>
                        </View>

                        {/* Instructions & Proctoring Rules Card */}
                        <View style={styles.instructionsCard}>
                            <View style={styles.instructionsHeaderRow}>
                                <ShieldAlert color={primaryColor} size={18} />
                                <Text style={styles.instructionsHeaderTitle}>
                                    {t('test_instructions', 'Important Test Rules & Policies')}
                                </Text>
                            </View>

                            <View style={styles.ruleItem}>
                                <View style={[styles.ruleDot, { backgroundColor: primaryColor }]} />
                                <View style={styles.ruleTextContainer}>
                                    <Text style={styles.ruleTitle}>
                                        {t('time_limit_title', 'Time Limit')}
                                    </Text>
                                    <Text style={styles.ruleText}>
                                        {t('duration_detail', `You will have ${Math.round((quizDuration || 0) / 60)} minutes to complete all questions. Auto-submission occurs when time expires.`)}
                                    </Text>
                                </View>
                            </View>

                            <View style={styles.ruleItem}>
                                <View style={[styles.ruleDot, { backgroundColor: theme.colors.status.danger }]} />
                                <View style={styles.ruleTextContainer}>
                                    <Text style={[styles.ruleTitle, styles.ruleTitleDanger]}>
                                        {t('focus_lock_title', 'Focus Lock (Anti-Cheat)')}
                                    </Text>
                                    <Text style={styles.ruleText}>
                                        {t('proctoring_tab_rule', 'Do not minimize or switch out of the app. 3 focus violations will immediately submit your test.')}
                                    </Text>
                                </View>
                            </View>

                            <View style={styles.ruleItem}>
                                <View style={[styles.ruleDot, { backgroundColor: theme.colors.status.warning }]} />
                                <View style={styles.ruleTextContainer}>
                                    <Text style={[styles.ruleTitle, styles.ruleTitleWarning]}>
                                        {t('inactivity_timer_title', 'Inactivity Timer')}
                                    </Text>
                                    <Text style={styles.ruleText}>
                                        {t('proctoring_idle_rule', 'If no interaction is detected for 3 minutes, the assessment will auto-submit.')}
                                    </Text>
                                </View>
                            </View>

                            <View style={styles.ruleItem}>
                                <View style={[styles.ruleDot, { backgroundColor: primaryColor }]} />
                                <View style={styles.ruleTextContainer}>
                                    <Text style={styles.ruleTitle}>
                                        {t('navigation_title', 'Question Navigation')}
                                    </Text>
                                    <Text style={styles.ruleText}>
                                        {t('navigation_detail', 'You can freely review and jump between questions before submitting.')}
                                    </Text>
                                </View>
                            </View>
                        </View>

                        {/* Action Buttons */}
                        <TouchableOpacity
                            style={[styles.primaryActionBtn, { backgroundColor: primaryColor }]}
                            activeOpacity={0.85}
                            onPress={handleStartTest}
                        >
                            <Text style={styles.primaryActionBtnText}>
                                {t('accept_and_start', 'I Agree & Start Assessment')}
                            </Text>
                            <ChevronRight color="#FFFFFF" size={18} />
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
            </View>
        );
    }

    // Determine timer state styling (warning under 3 mins, critical danger under 1 min)
    const isCriticalTime = timeLeft !== null && timeLeft <= 60;
    const isWarningTime = timeLeft !== null && timeLeft > 60 && timeLeft <= 180;

    return (
        <View style={[styles.safeArea, { paddingTop: insets.top }]}>
            <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />

            {/* Exam Header */}
            <View style={styles.topBar}>
                <HeaderIconButton
                    icon={<ArrowLeft color={theme.colors.textPrimary} size={19} />}
                    onPress={handleHeaderBack}
                    accessibilityLabel="Leave quiz"
                />

                {/* Live Countdown Timer Badge */}
                <View
                    style={[
                        styles.timerBadge,
                        isCriticalTime && styles.timerBadgeCritical,
                        isWarningTime && styles.timerBadgeWarning,
                    ]}
                >
                    <Clock
                        color={
                            isCriticalTime
                                ? theme.colors.status.danger
                                : isWarningTime
                                ? theme.colors.status.warning
                                : primaryColor
                        }
                        size={14}
                    />
                    <Text
                        style={[
                            styles.timerText,
                            isCriticalTime && styles.timerTextCritical,
                            isWarningTime && styles.timerTextWarning,
                        ]}
                    >
                        {timeLeft !== null ? formatTimer(timeLeft) : '00:00'}
                    </Text>
                </View>

                {/* Focus Violation Indicator */}
                {tabSwitchCount > 0 ? (
                    <View style={styles.violationBadge}>
                        <AlertTriangle color={theme.colors.status.danger} size={13} />
                        <Text style={styles.violationText}>{tabSwitchCount}/3</Text>
                    </View>
                ) : (
                    <View style={styles.answeredBadge}>
                        <CheckCircle2 color={theme.colors.status.success} size={13} />
                        <Text style={styles.answeredBadgeText}>
                            {answeredCount}/{questions.length}
                        </Text>
                    </View>
                )}
            </View>

            {/* Horizontal Question Jump Selector Strip */}
            {questions.length > 0 && (
                <View style={styles.questionStripContainer}>
                    <ScrollView
                        ref={questionScrollRef}
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        contentContainerStyle={styles.questionStripScroll}
                    >
                        {questions.map((q, idx) => {
                            const isCurrent = currentIdx === idx;
                            const isAnswered = isQuestionAnswered(q.id, q.question_type);

                            return (
                                <TouchableOpacity
                                    key={q.id || idx}
                                    style={[
                                        styles.questionPill,
                                        isAnswered && styles.questionPillAnswered,
                                        isCurrent && styles.questionPillActive,
                                        isCurrent && { borderColor: primaryColor, backgroundColor: isDark ? `${primaryColor}25` : `${primaryColor}15` },
                                    ]}
                                    onPress={() => {
                                        resetIdleTimer();
                                        setCurrentIdx(idx);
                                    }}
                                    activeOpacity={0.8}
                                >
                                    <Text
                                        style={[
                                            styles.questionPillText,
                                            isAnswered && styles.questionPillTextAnswered,
                                            isCurrent && styles.questionPillTextActive,
                                            isCurrent && { color: primaryColor },
                                        ]}
                                    >
                                        {idx + 1}
                                    </Text>
                                    {isAnswered && !isCurrent && (
                                        <View style={[styles.answeredDot, { backgroundColor: theme.colors.status.success }]} />
                                    )}
                                </TouchableOpacity>
                            );
                        })}
                    </ScrollView>
                </View>
            )}

            <ScrollView
                style={styles.container}
                contentContainerStyle={styles.scrollContent}
                onTouchStart={resetIdleTimer}
                showsVerticalScrollIndicator={false}
            >
                {questions.length === 0 ? (
                    <View style={styles.emptyCard}>
                        <HelpCircle color={theme.colors.textSecondary} size={36} />
                        <Text style={styles.emptyTitle}>{t('no_questions', 'No Questions Found')}</Text>
                        <Text style={styles.emptySubtitle}>
                            {t('no_questions_desc', 'This assessment does not have any questions available.')}
                        </Text>
                    </View>
                ) : (
                    <>
                        {/* Progress Bar & Status Meta */}
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
                                            {currentQuestion.question_type === 'multiple_choice'
                                                ? t('multiple_choice', 'MULTIPLE CHOICE')
                                                : (currentQuestion.question_type as string) === 'essay' || (currentQuestion.question_type as string) === 'text'
                                                ? t('essay_text', 'SHORT ESSAY')
                                                : t('single_choice', 'SINGLE CHOICE')}
                                        </Text>
                                    </View>

                                    <View style={styles.pointsBadge}>
                                        <Text style={styles.pointsBadgeText}>
                                            {currentQuestion.points || 10} {t('pts', 'pts')}
                                        </Text>
                                    </View>
                                </View>

                                <Text style={styles.questionText}>{currentQuestion.question_text}</Text>

                                {/* Multiple Choice Hint */}
                                {currentQuestion.question_type === 'multiple_choice' && (
                                    <View style={styles.multipleHintBox}>
                                        <Info color={primaryColor} size={13} />
                                        <Text style={[styles.multipleHintText, { color: primaryColor }]}>
                                            {t('select_all_that_apply', 'Select all options that apply')}
                                        </Text>
                                    </View>
                                )}

                                {/* Options Input Area */}
                                {(currentQuestion.question_type as string) === 'essay' ||
                                (currentQuestion.question_type as string) === 'text' ? (
                                    <View style={styles.essayWrapper}>
                                        <TextInput
                                            style={styles.textArea}
                                            multiline
                                            numberOfLines={6}
                                            placeholder={t('type_answer_here', 'Type your response here...')}
                                            placeholderTextColor={theme.colors.textDisabled}
                                            value={currentAnsObj?.text_answer || ''}
                                            onChangeText={(txt: string) =>
                                                handleTextAnswerChange(currentQuestion.id, txt)
                                            }
                                        />
                                        <Text style={styles.charCountText}>
                                            {(currentAnsObj?.text_answer || '').length} {t('characters', 'chars')}
                                        </Text>
                                    </View>
                                ) : (
                                    <View style={styles.optionsList}>
                                        {currentQuestion.options?.map((opt, idx) => {
                                            const selectedArr = currentAnsObj?.selected_options || [];
                                            const isSelected =
                                                selectedArr.includes(opt.id) ||
                                                selectedArr.includes(Number(opt.id)) ||
                                                selectedArr.includes(String(opt.id));
                                            const isMultiple =
                                                currentQuestion.question_type === 'multiple_choice';

                                            return (
                                                <TouchableOpacity
                                                    key={opt.id || idx}
                                                    style={[
                                                        styles.optionCard,
                                                        isSelected && styles.optionCardSelected,
                                                        isSelected && {
                                                            borderColor: primaryColor,
                                                            backgroundColor: isDark
                                                                ? `${primaryColor}18`
                                                                : `${primaryColor}0C`,
                                                        },
                                                    ]}
                                                    onPress={() =>
                                                        handleOptionToggle(
                                                            currentQuestion.id,
                                                            opt.id,
                                                            currentQuestion.question_type
                                                        )
                                                    }
                                                    activeOpacity={0.85}
                                                >
                                                    {/* Letter / Checkbox Circle or Square */}
                                                    <View
                                                        style={[
                                                            styles.optIndicator,
                                                            isMultiple && styles.optIndicatorSquare,
                                                            isSelected && {
                                                                backgroundColor: primaryColor,
                                                                borderColor: primaryColor,
                                                            },
                                                        ]}
                                                    >
                                                        {isSelected ? (
                                                            <Check color="#FFFFFF" size={13} strokeWidth={3} />
                                                        ) : (
                                                            <Text style={styles.optLetterText}>
                                                                {String.fromCharCode(65 + idx)}
                                                            </Text>
                                                        )}
                                                    </View>

                                                    <Text
                                                        style={[
                                                            styles.optionText,
                                                            isSelected && styles.optionTextSelected,
                                                            isSelected && isDark && styles.optionTextSelectedDark,
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

            {/* Navigation Footer Bar */}
            <View style={[styles.footerBar, { paddingBottom: Math.max(theme.spacing.md, insets.bottom) }]}>
                <TouchableOpacity
                    style={[styles.navBtn, currentIdx === 0 && styles.navBtnDisabled]}
                    disabled={currentIdx === 0}
                    onPress={() => {
                        resetIdleTimer();
                        setCurrentIdx((prev) => Math.max(0, prev - 1));
                    }}
                    activeOpacity={0.7}
                >
                    <ChevronLeft
                        color={currentIdx === 0 ? theme.colors.textDisabled : theme.colors.textPrimary}
                        size={18}
                    />
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
                        style={[styles.primaryNavBtn, styles.submitNavBtn]}
                        onPress={handleManualSubmitConfirm}
                        disabled={submitting}
                        activeOpacity={0.85}
                    >
                        {submitting ? (
                            <ActivityIndicator size="small" color="#FFFFFF" />
                        ) : (
                            <>
                                <CheckCircle2 color="#FFFFFF" size={17} />
                                <Text style={styles.primaryNavBtnText}>{t('submit_quiz', 'Submit Exam')}</Text>
                            </>
                        )}
                    </TouchableOpacity>
                )}
            </View>
        </View>
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
        justifyContent: 'space-between',
        paddingHorizontal: theme.spacing.md,
        paddingVertical: theme.spacing.sm + 4,
        backgroundColor: theme.colors.background,
    },
    topBarSpacer: {
        width: 38,
    },
    iconCircle: {
        width: 38,
        height: 38,
        borderRadius: theme.borderRadius.md,
        backgroundColor: theme.colors.surface,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: theme.colors.border,
    },
    headerTitle: {
        color: theme.colors.textPrimary,
        fontSize: 17,
        fontWeight: '700',
    },
    timerBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: theme.colors.surface,
        paddingHorizontal: theme.spacing.md,
        paddingVertical: 6,
        borderRadius: theme.borderRadius.full,
        borderWidth: 1,
        borderColor: theme.colors.border,
        gap: 6,
    },
    timerBadgeWarning: {
        backgroundColor: 'rgba(245, 158, 11, 0.12)',
        borderColor: 'rgba(245, 158, 11, 0.35)',
    },
    timerBadgeCritical: {
        backgroundColor: 'rgba(220, 38, 38, 0.12)',
        borderColor: 'rgba(220, 38, 38, 0.4)',
    },
    timerText: {
        fontSize: 13,
        fontWeight: '800',
        color: theme.colors.textPrimary,
    },
    timerTextWarning: {
        color: theme.colors.status.warning,
    },
    timerTextCritical: {
        color: theme.colors.status.danger,
    },
    violationBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: theme.colors.status.dangerSubtle,
        paddingHorizontal: theme.spacing.sm + 2,
        paddingVertical: 6,
        borderRadius: theme.borderRadius.full,
        borderWidth: 1,
        borderColor: theme.colors.status.dangerBorder,
        gap: 4,
    },
    violationText: {
        fontSize: 12,
        fontWeight: '800',
        color: theme.colors.status.danger,
    },
    answeredBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: theme.colors.status.successSubtle,
        paddingHorizontal: theme.spacing.sm + 2,
        paddingVertical: 6,
        borderRadius: theme.borderRadius.full,
        borderWidth: 1,
        borderColor: theme.colors.status.successBorder,
        gap: 4,
    },
    answeredBadgeText: {
        fontSize: 12,
        fontWeight: '800',
        color: theme.colors.status.success,
    },
    questionStripContainer: {
        backgroundColor: theme.colors.surface,
        borderBottomWidth: 1,
        borderBottomColor: theme.colors.border,
        paddingVertical: theme.spacing.sm + 2,
    },
    questionStripScroll: {
        paddingHorizontal: theme.spacing.md,
        gap: theme.spacing.sm,
        alignItems: 'center',
    },
    questionPill: {
        width: 38,
        height: 38,
        borderRadius: theme.borderRadius.md,
        backgroundColor: theme.colors.surfaceSubtle,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: theme.colors.border,
        position: 'relative',
    },
    questionPillActive: {
        borderWidth: 2,
    },
    questionPillAnswered: {
        backgroundColor: theme.colors.surface,
        borderColor: theme.colors.borderStrong,
    },
    questionPillText: {
        fontSize: 13,
        fontWeight: '700',
        color: theme.colors.textSecondary,
    },
    questionPillTextAnswered: {
        color: theme.colors.textPrimary,
    },
    questionPillTextActive: {
        fontWeight: '800',
    },
    answeredDot: {
        position: 'absolute',
        top: 4,
        right: 4,
        width: 5,
        height: 5,
        borderRadius: 2.5,
    },
    container: {
        flex: 1,
    },
    scrollContent: {
        flexGrow: 1,
        paddingHorizontal: theme.spacing.md,
        paddingTop: theme.spacing.md,
        paddingBottom: theme.spacing.lg,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: theme.spacing.lg,
        gap: theme.spacing.md,
    },
    loadingText: {
        fontSize: 13,
        fontWeight: '600',
        color: theme.colors.textSecondary,
        textAlign: 'center',
    },
    termsWrapper: {
        alignItems: 'center',
        paddingTop: theme.spacing.sm,
    },
    lockIconBox: {
        width: 68,
        height: 68,
        borderRadius: theme.borderRadius.lg,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: theme.spacing.md,
    },
    termsQuizTitle: {
        fontSize: 20,
        fontWeight: '800',
        color: theme.colors.textPrimary,
        textAlign: 'center',
        letterSpacing: -0.3,
    },
    termsSubTitle: {
        fontSize: 12,
        fontWeight: '800',
        textTransform: 'uppercase',
        letterSpacing: 1,
        marginTop: 6,
        marginBottom: theme.spacing.lg,
    },
    statsGrid: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        width: '100%',
        gap: theme.spacing.sm + 2,
        marginBottom: theme.spacing.lg,
    },
    statBox: {
        flex: 1,
        backgroundColor: theme.colors.surface,
        borderRadius: theme.borderRadius.md,
        paddingVertical: theme.spacing.md,
        paddingHorizontal: theme.spacing.sm,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: theme.colors.border,
        gap: 4,
        ...theme.shadows.sm,
    },
    statValue: {
        fontSize: 14,
        fontWeight: '800',
        color: theme.colors.textPrimary,
        marginTop: 2,
    },
    statLabel: {
        fontSize: 10,
        fontWeight: '700',
        color: theme.colors.textSecondary,
        textTransform: 'uppercase',
        letterSpacing: 0.3,
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
        marginBottom: theme.spacing.md + 2,
        paddingBottom: theme.spacing.sm,
        borderBottomWidth: 1,
        borderBottomColor: theme.colors.border,
    },
    instructionsHeaderTitle: {
        fontSize: 13,
        fontWeight: '800',
        color: theme.colors.textPrimary,
    },
    ruleItem: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: 10,
        marginBottom: theme.spacing.md,
    },
    ruleDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        marginTop: 5,
    },
    ruleTextContainer: {
        flex: 1,
        gap: 2,
    },
    ruleTitle: {
        fontSize: 13,
        fontWeight: '700',
        color: theme.colors.textPrimary,
    },
    ruleTitleDanger: {
        color: theme.colors.status.danger,
    },
    ruleTitleWarning: {
        color: theme.colors.status.warning,
    },
    ruleText: {
        fontSize: 12,
        color: theme.colors.textSecondary,
        lineHeight: 18,
    },
    primaryActionBtn: {
        width: '100%',
        height: 50,
        borderRadius: theme.borderRadius.md,
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        gap: 6,
        marginBottom: theme.spacing.sm + 4,
        ...theme.shadows.sm,
    },
    primaryActionBtnText: {
        color: '#FFFFFF',
        fontSize: 14,
        fontWeight: '800',
        letterSpacing: 0.2,
    },
    outlineActionBtn: {
        width: '100%',
        height: 48,
        borderRadius: theme.borderRadius.md,
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: theme.colors.border,
        backgroundColor: theme.colors.surface,
    },
    outlineActionBtnText: {
        color: theme.colors.textPrimary,
        fontSize: 13,
        fontWeight: '700',
    },
    progressSection: {
        marginBottom: theme.spacing.md,
    },
    progressTextRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
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
        padding: theme.spacing.xxl,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: theme.colors.border,
        gap: theme.spacing.sm,
    },
    emptyTitle: {
        fontSize: 16,
        fontWeight: '700',
        color: theme.colors.textPrimary,
    },
    emptySubtitle: {
        fontSize: 13,
        color: theme.colors.textSecondary,
        textAlign: 'center',
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
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: theme.spacing.md,
    },
    typeBadge: {
        backgroundColor: theme.colors.surfaceSubtle,
        paddingHorizontal: theme.spacing.sm + 2,
        paddingVertical: 4,
        borderRadius: theme.borderRadius.sm,
        borderWidth: 1,
        borderColor: theme.colors.border,
    },
    typeBadgeText: {
        fontSize: 10,
        fontWeight: '800',
        color: theme.colors.textSecondary,
        letterSpacing: 0.5,
    },
    pointsBadge: {
        backgroundColor: theme.colors.surfaceSubtle,
        paddingHorizontal: theme.spacing.sm + 2,
        paddingVertical: 4,
        borderRadius: theme.borderRadius.sm,
        borderWidth: 1,
        borderColor: theme.colors.border,
    },
    pointsBadgeText: {
        fontSize: 11,
        fontWeight: '800',
        color: theme.colors.textSecondary,
    },
    questionText: {
        fontSize: 16,
        fontWeight: '700',
        color: theme.colors.textPrimary,
        lineHeight: 23,
        marginBottom: theme.spacing.md,
    },
    multipleHintBox: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        marginBottom: theme.spacing.md,
    },
    multipleHintText: {
        fontSize: 12,
        fontWeight: '700',
    },
    essayWrapper: {
        gap: theme.spacing.xs + 2,
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
        minHeight: 130,
    },
    charCountText: {
        fontSize: 11,
        fontWeight: '600',
        color: theme.colors.textDisabled,
        alignSelf: 'flex-end',
    },
    optionsList: {
        gap: theme.spacing.sm + 2,
    },
    optionCard: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: theme.spacing.md,
        borderRadius: theme.borderRadius.md,
        borderWidth: 1.2,
        borderColor: theme.colors.border,
        backgroundColor: theme.colors.surface,
    },
    optionCardSelected: {
        borderWidth: 1.5,
    },
    optIndicator: {
        width: 28,
        height: 28,
        borderRadius: 14,
        borderWidth: 1.5,
        borderColor: theme.colors.borderStrong,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: theme.spacing.md,
        backgroundColor: theme.colors.surfaceSubtle,
    },
    optIndicatorSquare: {
        borderRadius: theme.borderRadius.sm,
    },
    optLetterText: {
        fontSize: 12,
        fontWeight: '800',
        color: theme.colors.textSecondary,
    },
    optionText: {
        fontSize: 14,
        fontWeight: '600',
        color: theme.colors.textSecondary,
        flex: 1,
        lineHeight: 20,
    },
    optionTextSelected: {
        fontWeight: '700',
        color: theme.colors.textPrimary,
    },
    optionTextSelectedDark: {
        color: '#FFFFFF',
    },
    footerBar: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundColor: theme.colors.surface,
        borderTopWidth: 1,
        borderTopColor: theme.colors.border,
        paddingHorizontal: theme.spacing.md + 4,
        paddingTop: theme.spacing.md,
    },
    navBtn: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        gap: 6,
        paddingHorizontal: theme.spacing.lg,
        minHeight: 46,
        paddingVertical: 8,
        borderRadius: theme.borderRadius.md,
        borderWidth: 1,
        borderColor: theme.colors.border,
        backgroundColor: theme.colors.surface,
    },
    navBtnDisabled: {
        opacity: 0.45,
    },
    navBtnText: {
        fontSize: 13,
        fontWeight: '700',
        color: theme.colors.textPrimary,
    },
    navBtnTextDisabled: {
        color: theme.colors.textDisabled,
    },
    primaryNavBtn: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        gap: 6,
        paddingHorizontal: theme.spacing.xl,
        minHeight: 46,
        paddingVertical: 8,
        borderRadius: theme.borderRadius.md,
    },
    submitNavBtn: {
        backgroundColor: theme.colors.status.success,
    },
    primaryNavBtnText: {
        fontSize: 13,
        fontWeight: '800',
        color: '#FFFFFF',
    },
}));
