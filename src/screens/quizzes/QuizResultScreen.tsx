import React from 'react';
import {
    View,
    ScrollView,
    TouchableOpacity,
    StatusBar,
    ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StyleSheet, useUnistyles } from 'react-native-unistyles';
import { useQuery } from '@tanstack/react-query';
import { format, parseISO, isValid } from 'date-fns';
import { quizApi } from '../../api/quiz';
import { useAppTheme } from '../../context/ThemeContext';
import { useTranslation } from '../../context/LanguageContext';
import { AppText as Text } from '../../components/AppText';
import { AppHeader } from '../../components/common/AppHeader';
import {
    ArrowLeft,
    Check,
    X,
} from 'lucide-react-native';

const formatResultDate = (rawStr?: string) => {
    if (!rawStr) return 'Recent';
    try {
        const d = parseISO(rawStr);
        if (!isValid(d)) return rawStr;
        return format(d, 'MMM d, yyyy');
    } catch {
        return rawStr;
    }
};

import { AppShell } from '../../components/common/AppShell';

export const QuizResultScreen: React.FC<{ route: any; navigation: any }> = ({
    route,
    navigation,
}) => {
    const { isDark, primaryColor } = useAppTheme();
    const { t } = useTranslation();
    const { theme } = useUnistyles();
    const styles = stylesheet;

    const { token, quizData: paramQuizData } = route.params || {};

    // 10-minute React Query Caching for Quiz Result Breakdown
    const { data: resultData, isLoading } = useQuery({
        queryKey: ['quizResult', token],
        queryFn: async () => {
            if (!token) return paramQuizData || null;
            const res = await quizApi.getQuizResult(token).catch(() => null);
            return res || paramQuizData || null;
        },
        enabled: !!token || !!paramQuizData,
        staleTime: 1000 * 60 * 10, // 10 minutes cache
        placeholderData: paramQuizData,
    });

    const test = resultData?.test;
    const quiz = resultData?.quiz;
    const snap = test?.quiz_snapshot;

    const quizTitle = snap?.title ?? quiz?.title ?? paramQuizData?.quiz?.title ?? 'Training Assessment';
    const maxPoints = snap?.points ?? quiz?.points ?? paramQuizData?.quiz?.points ?? 100;
    const passingPct = snap?.passing_percentage ?? quiz?.passing_percentage ?? paramQuizData?.quiz?.passing_percentage ?? 70;
    const questions = snap?.questions ?? quiz?.questions ?? [];

    const userScore = test?.score ?? paramQuizData?.score ?? 0;
    const passingPoints = maxPoints * (passingPct / 100);
    const isPassed = userScore !== null && userScore >= passingPoints;
    const scorePct = Math.round(((userScore ?? 0) / (maxPoints || 1)) * 100);
    const completedDate = formatResultDate(test?.completed_at || test?.created_at || paramQuizData?.completed_at);

    return (
        <AppShell
            title={t('quiz_result', 'Quiz Result')}
            onBack={() => navigation.navigate('QuizList')}
        >
            {isLoading && !resultData ? (
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color={primaryColor} />
                </View>
            ) : (
                <>
                    {/* Score Circle Card */}
                    <View style={styles.scoreCard}>
                        <Text style={styles.quizTitle} numberOfLines={2}>
                            {quizTitle}
                        </Text>
                        <Text style={styles.completedDateText}>
                            {t('completed_on', 'Completed On')}: {completedDate}
                        </Text>

                        <View
                            style={[
                                styles.scoreCircle,
                                isPassed ? styles.scoreCirclePassed : styles.scoreCircleFailed,
                            ]}
                        >
                            <Text
                                style={[
                                    styles.scorePctText,
                                    isPassed ? styles.scorePctPassed : styles.scorePctFailed,
                                ]}
                            >
                                {scorePct}%
                            </Text>
                            <Text style={styles.scoreSubText}>
                                {userScore} / {maxPoints} {t('points', 'Points')}
                            </Text>
                        </View>

                        <View
                            style={[
                                styles.statusBadge,
                                isPassed ? styles.statusBadgePassed : styles.statusBadgeFailed,
                            ]}
                        >
                            <Text
                                style={[
                                    styles.statusBadgeText,
                                    isPassed ? styles.statusBadgePassedText : styles.statusBadgeFailedText,
                                ]}
                            >
                                {isPassed ? t('passed', 'PASSED') : t('failed', 'FAILED')}
                            </Text>
                        </View>
                    </View>

                    {/* Detailed Feedback Breakdown Section */}
                    <Text style={styles.sectionHeader}>{t('detailed_feedback', 'DETAILED FEEDBACK')}</Text>

                    {questions.length === 0 ? (
                        <View style={styles.noQuestionsCard}>
                            <Text style={styles.noQuestionsText}>
                                {t('no_questions_feedback', 'Detailed option breakdown is not available for this session.')}
                            </Text>
                        </View>
                    ) : (
                        questions.map((question: any, idx: number) => {
                            const answer = test?.answers?.find((ans: any) => ans.question_id === question.id);
                            let isAnswerCorrect = false;

                            if (question.question_type !== 'text' && question.question_type !== 'essay') {
                                const correctOptionIds = question.options
                                    ?.filter((o: any) => o.is_correct)
                                    .map((o: any) => Number(o.id)) || [];
                                const selectedOptionIds = (answer?.selected_options || []).map(Number);

                                correctOptionIds.sort((a: number, b: number) => a - b);
                                selectedOptionIds.sort((a: number, b: number) => a - b);

                                isAnswerCorrect =
                                    correctOptionIds.length > 0 &&
                                    JSON.stringify(correctOptionIds) === JSON.stringify(selectedOptionIds);
                            }

                            return (
                                <View key={question.id || idx} style={styles.questionCard}>
                                    <View style={styles.questionHeaderRow}>
                                        <View style={styles.qNumTag}>
                                            <Text style={styles.qNumTagText}>
                                                Q{idx + 1} • {question.question_type || 'choice'}
                                            </Text>
                                        </View>

                                        {question.question_type !== 'text' && question.question_type !== 'essay' && (
                                            <View
                                                style={[
                                                    styles.correctBadge,
                                                    isAnswerCorrect ? styles.correctBadgeSuccess : styles.correctBadgeDanger,
                                                ]}
                                            >
                                                {isAnswerCorrect ? (
                                                    <Check color="#10B981" size={12} />
                                                ) : (
                                                    <X color="#EF4444" size={12} />
                                                )}
                                                <Text
                                                    style={[
                                                        styles.correctBadgeText,
                                                        isAnswerCorrect ? styles.correctBadgeSuccessText : styles.correctBadgeDangerText,
                                                    ]}
                                                >
                                                    {isAnswerCorrect ? t('correct', 'CORRECT') : t('incorrect', 'INCORRECT')}
                                                </Text>
                                            </View>
                                        )}
                                    </View>

                                    {/* Question Text */}
                                    <Text style={styles.questionText}>{question.question_text}</Text>

                                    {/* Essay/Text Answer Display */}
                                    {(question.question_type === 'text' || question.question_type === 'essay') ? (
                                        <View style={styles.essayAnswerBox}>
                                            <Text style={styles.essayAnswerText}>
                                                {answer?.text_answer || t('no_answer_submitted', 'No answer submitted')}
                                            </Text>
                                        </View>
                                    ) : (
                                        /* Options Choice Breakdown */
                                        <View style={styles.optionsList}>
                                            {question.options?.map((opt: any) => {
                                                const isSelected = answer?.selected_options
                                                    ?.map(Number)
                                                    .includes(Number(opt.id));
                                                const isCorrectOpt = Boolean(opt.is_correct);

                                                const isCorrectSelected = isSelected && isCorrectOpt;
                                                const isWrongSelected = isSelected && !isCorrectOpt;
                                                const isMissedCorrect = !isSelected && isCorrectOpt;

                                                return (
                                                    <View
                                                        key={opt.id}
                                                        style={[
                                                            styles.optItem,
                                                            isCorrectSelected && styles.optItemCorrectSelected,
                                                            isWrongSelected && styles.optItemWrongSelected,
                                                            isMissedCorrect && styles.optItemMissedCorrect,
                                                        ]}
                                                    >
                                                        <Text
                                                            style={[
                                                                styles.optText,
                                                                isCorrectSelected && styles.optItemCorrectSelectedText,
                                                                isWrongSelected && styles.optItemWrongSelectedText,
                                                                isMissedCorrect && styles.optItemMissedCorrectText,
                                                            ]}
                                                        >
                                                            {opt.option_text}
                                                        </Text>
                                                        <View style={styles.optBadgeGroup}>
                                                            {isSelected && (
                                                                <Text
                                                                    style={[
                                                                        styles.optPill,
                                                                        isCorrectSelected && styles.optItemCorrectSelectedText,
                                                                        isWrongSelected && styles.optItemWrongSelectedText,
                                                                    ]}
                                                                >
                                                                    {t('your_choice', 'CHOSEN')}
                                                                </Text>
                                                            )}
                                                            {isCorrectOpt && (
                                                                <Text style={[styles.optPill, { opacity: 0.8 }]}>
                                                                    ({t('correct_answer', 'Correct')})
                                                                </Text>
                                                            )}
                                                        </View>
                                                    </View>
                                                );
                                            })}
                                        </View>
                                    )}
                                </View>
                            );
                        })
                    )}

                    {/* Back to List Primary Button */}
                    <TouchableOpacity
                        style={[styles.backBtn, { backgroundColor: primaryColor }]}
                        activeOpacity={0.85}
                        onPress={() => navigation.navigate('QuizList')}
                    >
                        <Text style={styles.backBtnText}>{t('back_to_list', 'Back to Quizzes')}</Text>
                    </TouchableOpacity>
                </>
            )}
        </AppShell>
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
        fontSize: 18,
        fontWeight: '700',
    },
    container: {
        flex: 1,
    },
    scrollContent: {
        flexGrow: 1,
        paddingHorizontal: theme.spacing.md + 4,
        paddingTop: theme.spacing.md,
        paddingBottom: theme.spacing.xl + 40,
    },
    loadingContainer: {
        paddingVertical: theme.spacing.xxl,
        alignItems: 'center',
    },
    scoreCard: {
        backgroundColor: theme.colors.surface,
        borderRadius: theme.borderRadius.lg,
        padding: theme.spacing.lg,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: theme.colors.border,
        marginBottom: theme.spacing.lg,
        ...theme.shadows.sm,
    },
    quizTitle: {
        fontSize: 17,
        fontWeight: '800',
        color: theme.colors.textPrimary,
        textAlign: 'center',
        textTransform: 'uppercase',
    },
    completedDateText: {
        fontSize: 11,
        fontWeight: '600',
        color: theme.colors.textSecondary,
        marginTop: 4,
        marginBottom: theme.spacing.md,
    },
    scoreCircle: {
        width: 124,
        height: 124,
        borderRadius: 62,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 4,
        marginBottom: theme.spacing.md,
    },
    scoreCirclePassed: {
        borderColor: '#10B981',
        backgroundColor: 'rgba(16, 185, 129, 0.08)',
    },
    scoreCircleFailed: {
        borderColor: '#EF4444',
        backgroundColor: 'rgba(239, 68, 68, 0.08)',
    },
    scorePctText: {
        fontSize: 32,
        fontWeight: '900',
    },
    scorePctPassed: {
        color: '#10B981',
    },
    scorePctFailed: {
        color: '#EF4444',
    },
    scoreSubText: {
        fontSize: 11,
        fontWeight: '700',
        color: theme.colors.textSecondary,
        marginTop: 2,
    },
    statusBadge: {
        paddingHorizontal: theme.spacing.md,
        paddingVertical: 5,
        borderRadius: theme.borderRadius.full,
        borderWidth: 1,
    },
    statusBadgePassed: {
        backgroundColor: 'rgba(16, 185, 129, 0.1)',
        borderColor: 'rgba(16, 185, 129, 0.25)',
    },
    statusBadgePassedText: {
        color: '#10B981',
    },
    statusBadgeFailed: {
        backgroundColor: 'rgba(239, 68, 68, 0.1)',
        borderColor: 'rgba(239, 68, 68, 0.25)',
    },
    statusBadgeFailedText: {
        color: '#EF4444',
    },
    statusBadgeText: {
        fontSize: 11,
        fontWeight: '900',
        letterSpacing: 0.8,
    },
    sectionHeader: {
        fontSize: 11,
        fontWeight: '800',
        textTransform: 'uppercase',
        letterSpacing: 0.8,
        color: theme.colors.textSecondary,
        marginBottom: theme.spacing.xs + 4,
        marginLeft: 4,
    },
    noQuestionsCard: {
        backgroundColor: theme.colors.surface,
        borderRadius: theme.borderRadius.lg,
        padding: theme.spacing.lg,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: theme.colors.border,
        marginBottom: theme.spacing.md,
    },
    noQuestionsText: {
        fontSize: 13,
        color: theme.colors.textSecondary,
        textAlign: 'center',
    },
    questionCard: {
        backgroundColor: theme.colors.surface,
        borderRadius: theme.borderRadius.lg,
        padding: theme.spacing.md,
        marginBottom: theme.spacing.md,
        borderWidth: 1,
        borderColor: theme.colors.border,
        ...theme.shadows.sm,
    },
    questionHeaderRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: theme.spacing.xs + 4,
    },
    qNumTag: {
        backgroundColor: theme.colors.surfaceSubtle,
        paddingHorizontal: theme.spacing.sm,
        paddingVertical: 3,
        borderRadius: theme.borderRadius.sm,
        borderWidth: 1,
        borderColor: theme.colors.border,
    },
    qNumTagText: {
        fontSize: 10,
        fontWeight: '800',
        color: theme.colors.textSecondary,
        textTransform: 'uppercase',
    },
    correctBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        paddingHorizontal: theme.spacing.sm,
        paddingVertical: 3,
        borderRadius: theme.borderRadius.full,
        borderWidth: 1,
    },
    correctBadgeSuccess: {
        backgroundColor: 'rgba(16, 185, 129, 0.1)',
        borderColor: 'rgba(16, 185, 129, 0.25)',
    },
    correctBadgeSuccessText: {
        color: '#10B981',
    },
    correctBadgeDanger: {
        backgroundColor: 'rgba(239, 68, 68, 0.1)',
        borderColor: 'rgba(239, 68, 68, 0.25)',
    },
    correctBadgeDangerText: {
        color: '#EF4444',
    },
    correctBadgeText: {
        fontSize: 9,
        fontWeight: '900',
        letterSpacing: 0.5,
    },
    questionText: {
        fontSize: 14,
        fontWeight: '700',
        color: theme.colors.textPrimary,
        lineHeight: 20,
        marginBottom: theme.spacing.sm + 2,
    },
    essayAnswerBox: {
        backgroundColor: theme.colors.surfaceSubtle,
        borderRadius: theme.borderRadius.md,
        padding: theme.spacing.md,
        borderWidth: 1,
        borderColor: theme.colors.border,
    },
    essayAnswerText: {
        fontSize: 13,
        fontStyle: 'italic',
        color: theme.colors.textPrimary,
        lineHeight: 18,
    },
    optionsList: {
        gap: theme.spacing.xs + 4,
    },
    optItem: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: theme.spacing.md,
        borderRadius: theme.borderRadius.md,
        borderWidth: 1,
        backgroundColor: theme.colors.surface,
        borderColor: theme.colors.border,
    },
    optItemCorrectSelected: {
        backgroundColor: 'rgba(16, 185, 129, 0.08)',
        borderColor: '#10B981',
    },
    optItemCorrectSelectedText: {
        color: '#10B981',
        fontWeight: '700',
    },
    optItemWrongSelected: {
        backgroundColor: 'rgba(239, 68, 68, 0.08)',
        borderColor: '#EF4444',
    },
    optItemWrongSelectedText: {
        color: '#EF4444',
        fontWeight: '700',
    },
    optItemMissedCorrect: {
        backgroundColor: 'rgba(16, 185, 129, 0.04)',
        borderColor: '#10B981',
        borderStyle: 'dashed',
    },
    optItemMissedCorrectText: {
        color: '#10B981',
        fontWeight: '700',
    },
    optText: {
        fontSize: 13,
        color: theme.colors.textSecondary,
        flex: 1,
    },
    optBadgeGroup: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        marginLeft: 8,
    },
    optPill: {
        fontSize: 9,
        fontWeight: '900',
        textTransform: 'uppercase',
        color: theme.colors.textSecondary,
    },
    backBtn: {
        minHeight: 48,
        paddingVertical: 12,
        borderRadius: theme.borderRadius.md,
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: theme.spacing.md,
    },
    backBtnText: {
        color: '#FFFFFF',
        fontSize: 14,
        fontWeight: '800',
    },
}));
