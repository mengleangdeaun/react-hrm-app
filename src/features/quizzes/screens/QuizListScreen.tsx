import React, { useState, useCallback, useMemo, memo } from 'react';
import {
    View,
    RefreshControl,
    Pressable,
} from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { StyleSheet, useUnistyles } from 'react-native-unistyles';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { formatDateDisplay } from '../../../utils/dateTime';
import { quizApi, QuizItem } from '../../../api/quiz';
import { useAppTheme } from '../../../context/ThemeContext';
import { useTranslation } from '../../../context/LanguageContext';
import { AppText as Text } from '../../../components/AppText';
import { QuizListSkeleton } from '../../../components/common/Skeletons';
import { EmptyState } from '../../../components/common/EmptyState';
import { AppCard } from '../../../components/common/AppCard';
import { AppButton } from '../../../components/common/AppButton';
import { StatusBadge } from '../../../components/common/StatusBadge';
import { queryKeys } from '../../../api/queryKeys';
import {
    Award,
    Clock,
    ChevronRight,
    Book,
    CheckCheck,
    HelpCircle,
    AlertTriangle,
} from 'lucide-react-native';
import { AppShell } from '../../../components/common/AppShell';

const QUIZ_TABS = [
    { id: 'active', labelKey: 'active', fallback: 'Active' },
    { id: 'history', labelKey: 'history', fallback: 'History' },
] as const;

type QuizTabId = (typeof QUIZ_TABS)[number]['id'];

const formatQuizDate = (rawStr?: string) => {
    return formatDateDisplay(rawStr, 'short', 'Recent');
};

interface ActiveQuizCardProps {
    item: QuizItem;
    primaryColor: string;
    onStart: (item: QuizItem) => void;
    t: (key: string, fallback?: string) => string;
    styles: any;
}

const ActiveQuizCard = memo(({ item, primaryColor, onStart, t, styles }: ActiveQuizCardProps) => {
    const durationMins = item.quiz?.duration ? Math.round(item.quiz.duration / 60) : null;
    return (
        <AppCard style={styles.card}>
            <View style={styles.cardHeader}>
                <View style={styles.iconBgPrimary}>
                    <Book color={primaryColor} size={20} />
                </View>
                <Text style={styles.cardTitle} numberOfLines={1}>
                    {item.quiz?.title || 'Training Assessment'}
                </Text>
            </View>

            {/* Duration & Points Grid Box */}
            <View style={styles.infoGrid}>
                <View style={styles.infoGridItem}>
                    <Clock color={primaryColor} size={15} />
                    <Text style={styles.infoGridText}>
                        {durationMins ? `${durationMins} Mins` : t('no_limit', 'No Limit')}
                    </Text>
                </View>
                <View style={styles.infoGridItem}>
                    <CheckCheck color={primaryColor} size={15} />
                    <Text style={styles.infoGridText}>
                        {item.quiz?.points ?? 100} {t('points', 'Points')}
                    </Text>
                </View>
            </View>

            <AppButton
                title={t('start_assessment', 'Start Assessment')}
                onPress={() => onStart(item)}
                icon={<ChevronRight color="#FFFFFF" size={16} />}
                iconPosition="right"
                fullWidth
            />
        </AppCard>
    );
});

interface HistoryQuizCardProps {
    item: QuizItem;
    theme: any;
    onViewResult: (item: QuizItem) => void;
    t: (key: string, fallback?: string) => string;
    styles: any;
}

const HistoryQuizCard = memo(({ item, theme, onViewResult, t, styles }: HistoryQuizCardProps) => {
    const snap = item.quiz_snapshot;
    const maxPoints = snap?.points ?? item.quiz?.points ?? 100;
    const passingPct = snap?.passing_percentage ?? item.quiz?.passing_percentage ?? 70;
    const quizTitle = snap?.title ?? item.quiz?.title ?? 'Training Assessment';
    const passingPoints = maxPoints * (passingPct / 100);
    const isPassed = item.score !== null && item.score !== undefined && item.score >= passingPoints;
    const scorePct = Math.round(((item.score ?? 0) / (maxPoints || 1)) * 100);
    const dateStr = formatQuizDate(item.completed_at || item.created_at);

    return (
        <AppCard style={styles.card}>
            <View style={styles.cardHeader}>
                <View style={styles.iconBgIndigo}>
                    <Award color={theme.colors.status.purple} size={20} />
                </View>
                <View style={styles.headerTextGroup}>
                    <Text style={styles.cardTitle} numberOfLines={1}>
                        {quizTitle}
                    </Text>
                    <Text style={styles.cardDate}>{dateStr}</Text>
                </View>

                <StatusBadge
                    status={isPassed ? 'approved' : 'rejected'}
                    label={isPassed ? t('passed', 'Passed') : t('failed', 'Failed')}
                    size="sm"
                />
            </View>

            {/* Score Box */}
            <View style={styles.scoreRow}>
                <Text style={styles.scoreLabel}>{t('score', 'Score')}</Text>
                <Text
                    style={[
                        styles.scoreValue,
                        { color: isPassed ? theme.colors.status.success : theme.colors.status.danger },
                    ]}
                >
                    {item.score ?? 0} / {maxPoints} ({scorePct}%)
                </Text>
            </View>

            <AppButton
                title={t('view_feedback', 'View Feedback')}
                variant="secondary"
                onPress={() => onViewResult(item)}
                icon={<ChevronRight color={theme.colors.textPrimary} size={16} />}
                iconPosition="right"
                fullWidth
            />
        </AppCard>
    );
});

export const QuizListScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
    const { primaryColor } = useAppTheme();
    const { t } = useTranslation();
    const { theme } = useUnistyles();
    const styles = stylesheet;
    const queryClient = useQueryClient();

    const [activeTab, setActiveTab] = useState<QuizTabId>('active');

    // 10-minute React Query Caching for Quizzes
    const {
        data: quizzes = [],
        isLoading,
        isFetching,
        isError,
        error,
        refetch,
    } = useQuery<QuizItem[]>({
        queryKey: queryKeys.quizzes.list,
        queryFn: async () => {
            const res = await quizApi.getAssignedQuizzes();
            const list = Array.isArray(res?.data) ? res.data : Array.isArray(res) ? res : [];
            return list;
        },
        staleTime: 1000 * 60 * 10,
    });

    const onRefresh = useCallback(async () => {
        await queryClient.invalidateQueries({ queryKey: queryKeys.quizzes.all });
        refetch();
    }, [queryClient, refetch]);

    const activeQuizzes = useMemo(
        () => quizzes.filter((q) => q.status === 'in_progress' || q.status === 'available'),
        [quizzes]
    );

    const historyQuizzes = useMemo(
        () => quizzes.filter((q) => q.status === 'completed' || q.status === 'timed_out' || q.status === 'passed' || q.status === 'failed'),
        [quizzes]
    );

    const handleStartQuiz = useCallback((item: QuizItem) => {
        navigation.navigate('TakeQuiz', { quizId: item.quiz?.id || item.id, token: item.token });
    }, [navigation]);

    const handleViewResult = useCallback((item: QuizItem) => {
        navigation.navigate('QuizResult', { token: item.token, quizData: item });
    }, [navigation]);

    const renderItem = useCallback(
        ({ item }: { item: QuizItem }) => {
            if (activeTab === 'active') {
                return (
                    <ActiveQuizCard
                        item={item}
                        primaryColor={primaryColor}
                        onStart={handleStartQuiz}
                        t={t}
                        styles={styles}
                    />
                );
            }
            return (
                <HistoryQuizCard
                    item={item}
                    theme={theme}
                    onViewResult={handleViewResult}
                    t={t}
                    styles={styles}
                />
            );
        },
        [activeTab, primaryColor, handleStartQuiz, handleViewResult, t, theme, styles]
    );

    const keyExtractor = useCallback((item: QuizItem) => String(item.id), []);

    const emptyComponent = useCallback(() => {
        if (isLoading) {
            return <QuizListSkeleton />;
        }
        if (isError) {
            return (
                <EmptyState
                    icon={<AlertTriangle color={theme.colors.status.danger} size={36} />}
                    title={t('failed_to_load_quizzes', 'Failed to Load Assessments')}
                    description={
                        error instanceof Error
                            ? error.message
                            : t('network_error_retry', 'Please check your connection and try again.')
                    }
                    actionTitle={t('retry', 'Retry')}
                    onAction={() => refetch()}
                />
            );
        }
        if (activeTab === 'active') {
            return (
                <EmptyState
                    icon={<HelpCircle color={theme.colors.textSecondary} size={36} />}
                    title={t('no_active_quizzes', 'No active quizzes')}
                    description={t('no_active_quizzes_desc', 'You do not have any pending assessment tests assigned at the moment.')}
                />
            );
        }
        return (
            <EmptyState
                icon={<Award color={theme.colors.textSecondary} size={36} />}
                title={t('no_history_yet', 'No history yet')}
                description={t('quizzes_history_empty_desc', 'Completed quizzes will be listed here with scores and detailed reviews.')}
            />
        );
    }, [isLoading, isError, error, activeTab, theme, t, refetch]);

    const subHeader = (
        <View style={styles.tabBarContainer}>
            <View style={styles.tabBarRow}>
                {QUIZ_TABS.map((tab) => {
                    const isActive = activeTab === tab.id;
                    const count = tab.id === 'active' ? activeQuizzes.length : historyQuizzes.length;
                    return (
                        <Pressable
                            key={tab.id}
                            style={styles.tabItem}
                            onPress={() => setActiveTab(tab.id)}
                            accessibilityRole="tab"
                            accessibilityState={{ selected: isActive }}
                        >
                            <Text
                                style={[
                                    styles.tabText,
                                    isActive && { color: primaryColor, fontWeight: '800' },
                                ]}
                            >
                                {t(tab.labelKey, tab.fallback)} ({count})
                            </Text>
                            {isActive && <View style={[styles.tabIndicator, { backgroundColor: primaryColor }]} />}
                        </Pressable>
                    );
                })}
            </View>
        </View>
    );

    const currentData = activeTab === 'active' ? activeQuizzes : historyQuizzes;

    return (
        <AppShell
            title={t('quizzes', 'Quizzes')}
            onBack={() => navigation.goBack()}
            subHeader={subHeader}
            scrollable={false}
        >
            <View style={styles.container}>
                <FlashList
                    data={isLoading || isError ? [] : currentData}
                    renderItem={renderItem}
                    keyExtractor={keyExtractor}
                    estimatedItemSize={175}
                    ListEmptyComponent={emptyComponent}
                    showsVerticalScrollIndicator={false}
                    contentContainerStyle={styles.listContent}
                    refreshControl={
                        <RefreshControl
                            refreshing={isFetching && !isLoading}
                            onRefresh={onRefresh}
                            tintColor={theme.colors.brand}
                        />
                    }
                />
            </View>
        </AppShell>
    );
};

const stylesheet = StyleSheet.create((theme) => ({
    container: {
        flex: 1,
    },
    listContent: {
        paddingHorizontal: theme.spacing.md + 4,
        paddingTop: theme.spacing.md,
        paddingBottom: theme.spacing.lg + 16,
    },
    tabBarContainer: {
        backgroundColor: theme.colors.surface,
        borderBottomWidth: 1,
        borderBottomColor: theme.colors.border,
        paddingHorizontal: theme.spacing.md + 4,
    },
    tabBarRow: {
        flexDirection: 'row',
        gap: theme.spacing.lg,
    },
    tabItem: {
        paddingVertical: theme.spacing.md,
        position: 'relative',
    },
    tabText: {
        fontSize: 14,
        color: theme.colors.textSecondary,
    },
    tabIndicator: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        height: 3,
        backgroundColor: theme.colors.brand,
        borderTopLeftRadius: 3,
        borderTopRightRadius: 3,
    },
    card: {
        backgroundColor: theme.colors.surface,
        borderRadius: theme.borderRadius.lg,
        padding: theme.spacing.cardPadding,
        marginBottom: theme.spacing.md,
        borderWidth: 1,
        borderColor: theme.colors.border,
    },
    cardHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: theme.spacing.sm + 2,
    },
    iconBgPrimary: {
        width: 40,
        height: 40,
        borderRadius: theme.borderRadius.md,
        backgroundColor: theme.colors.surfaceSubtle,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: theme.colors.border,
    },
    iconBgIndigo: {
        width: 40,
        height: 40,
        borderRadius: theme.borderRadius.md,
        backgroundColor: theme.colors.status.purpleSubtle,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: theme.colors.status.purpleBorder,
    },
    headerTextGroup: {
        flex: 1,
        marginLeft: theme.spacing.sm + 2,
    },
    cardTitle: {
        fontSize: 15,
        fontWeight: '800',
        color: theme.colors.textPrimary,
        flex: 1,
        marginLeft: theme.spacing.sm + 2,
    },
    cardDate: {
        fontSize: 11,
        fontWeight: '600',
        color: theme.colors.textSecondary,
        marginTop: 2,
    },
    infoGrid: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundColor: theme.colors.surfaceSubtle,
        borderRadius: theme.borderRadius.md,
        padding: theme.spacing.md,
        marginBottom: theme.spacing.md,
        borderWidth: 1,
        borderColor: theme.colors.border,
    },
    infoGridItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    infoGridText: {
        fontSize: 13,
        fontWeight: '600',
        color: theme.colors.textSecondary,
    },
    scoreRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundColor: theme.colors.surfaceSubtle,
        borderRadius: theme.borderRadius.md,
        padding: theme.spacing.md,
        marginBottom: theme.spacing.md,
        borderWidth: 1,
        borderColor: theme.colors.border,
    },
    scoreLabel: {
        fontSize: 13,
        fontWeight: '600',
        color: theme.colors.textSecondary,
    },
    scoreValue: {
        fontSize: 14,
        fontWeight: '800',
    },
}));
