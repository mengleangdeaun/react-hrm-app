import React, { useState } from 'react';
import {
    View,
    ScrollView,
    TouchableOpacity,
    StatusBar,
    RefreshControl,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StyleSheet, useUnistyles } from 'react-native-unistyles';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { formatDateDisplay } from '../../utils/dateTime';
import { quizApi, QuizItem } from '../../api/quiz';
import { useAppTheme } from '../../context/ThemeContext';
import { useTranslation } from '../../context/LanguageContext';
import { AppText as Text } from '../../components/AppText';
import { QuizListSkeleton } from '../../components/common/Skeletons';
import { EmptyState } from '../../components/common/EmptyState';
import {
    Award,
    Clock,
    ArrowLeft,
    ChevronRight,
    Book,
    CheckCheck,
    HelpCircle,
} from 'lucide-react-native';

const QUIZ_TABS = [
    { id: 'active', labelKey: 'active', fallback: 'Active' },
    { id: 'history', labelKey: 'history', fallback: 'History' },
];

const formatQuizDate = (rawStr?: string) => {
    return formatDateDisplay(rawStr, 'short', 'Recent');
};

import { AppShell } from '../../components/common/AppShell';

export const QuizListScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
    const { isDark, primaryColor } = useAppTheme();
    const { t } = useTranslation();
    const { theme } = useUnistyles();
    const styles = stylesheet;
    const queryClient = useQueryClient();

    const [activeTab, setActiveTab] = useState<'active' | 'history'>('active');
    const [refreshing, setRefreshing] = useState<boolean>(false);

    // 10-minute React Query Caching for Quizzes
    const { data: quizzes = [], isLoading, isFetching } = useQuery<QuizItem[]>({
        queryKey: ['quizzesList'],
        queryFn: async () => {
            const res = await quizApi.getAssignedQuizzes().catch(() => null);
            const list = Array.isArray(res?.data) ? res.data : Array.isArray(res) ? res : [];
            return list;
        },
        staleTime: 1000 * 60 * 10, // 10 minutes memory cache
    });

    const onRefresh = async () => {
        setRefreshing(true);
        await queryClient.invalidateQueries({ queryKey: ['quizzesList'] });
        setRefreshing(false);
    };

    const activeQuizzes = quizzes.filter((q) => q.status === 'in_progress' || q.status === 'available');
    const historyQuizzes = quizzes.filter((q) => q.status === 'completed' || q.status === 'timed_out' || q.status === 'passed' || q.status === 'failed');

    const subHeader = (
        <View style={styles.tabBarContainer}>
            <View style={styles.tabBarRow}>
                {QUIZ_TABS.map((tab) => {
                    const isActive = activeTab === tab.id;
                    const count = tab.id === 'active' ? activeQuizzes.length : historyQuizzes.length;
                    return (
                        <TouchableOpacity
                            key={tab.id}
                            style={styles.tabItem}
                            onPress={() => setActiveTab(tab.id as any)}
                            activeOpacity={0.8}
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
                        </TouchableOpacity>
                    );
                })}
            </View>
        </View>
    );

    return (
        <AppShell
            title={t('quizzes', 'Quizzes')}
            onBack={() => navigation.goBack()}
            subHeader={subHeader}
            refreshing={refreshing || isFetching}
            onRefresh={onRefresh}
        >
            {isLoading ? (
                <QuizListSkeleton />
            ) : activeTab === 'active' ? (
                activeQuizzes.length === 0 ? (
                    <EmptyState
                        icon={<HelpCircle color={theme.colors.textSecondary} size={36} />}
                        title={t('no_active_quizzes', 'No active quizzes')}
                        description={t('no_active_quizzes_desc', 'You do not have any pending assessment tests assigned at the moment.')}
                    />
                ) : (
                    activeQuizzes.map((item) => {
                        const durationMins = item.quiz?.duration ? Math.round(item.quiz.duration / 60) : null;
                        return (
                            <View key={item.id} style={styles.card}>
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

                                <TouchableOpacity
                                    style={[styles.primaryActionBtn, { backgroundColor: primaryColor }]}
                                    activeOpacity={0.85}
                                    onPress={() => navigation.navigate('TakeQuiz', { quizId: item.quiz?.id || item.id, token: item.token })}
                                >
                                    <Text style={styles.primaryActionBtnText}>
                                        {t('start_assessment', 'Start Assessment')}
                                    </Text>
                                    <ChevronRight color="#FFFFFF" size={16} />
                                </TouchableOpacity>
                            </View>
                        );
                    })
                )
            ) : (
                historyQuizzes.length === 0 ? (
                    <EmptyState
                        icon={<Award color={theme.colors.textSecondary} size={36} />}
                        title={t('no_history_yet', 'No history yet')}
                        description={t('quizzes_history_empty_desc', 'Completed quizzes will be listed here with scores and detailed reviews.')}
                    />
                ) : (
                    historyQuizzes.map((item) => {
                        const snap = item.quiz_snapshot;
                        const maxPoints = snap?.points ?? item.quiz?.points ?? 100;
                        const passingPct = snap?.passing_percentage ?? item.quiz?.passing_percentage ?? 70;
                        const quizTitle = snap?.title ?? item.quiz?.title ?? 'Training Assessment';
                        const passingPoints = maxPoints * (passingPct / 100);
                        const isPassed = item.score !== null && item.score !== undefined && item.score >= passingPoints;
                        const scorePct = Math.round(((item.score ?? 0) / (maxPoints || 1)) * 100);
                        const dateStr = formatQuizDate(item.completed_at || item.created_at);

                        return (
                            <View key={item.id} style={styles.card}>
                                <View style={styles.cardHeader}>
                                    <View style={styles.iconBgIndigo}>
                                        <Award color="#8B5CF6" size={20} />
                                    </View>
                                    <View style={styles.headerTextGroup}>
                                        <Text style={styles.cardTitle} numberOfLines={1}>
                                            {quizTitle}
                                        </Text>
                                        <Text style={styles.cardDate}>{dateStr}</Text>
                                    </View>

                                    <View
                                        style={[
                                            styles.badgePill,
                                            isPassed ? styles.badgePassed : styles.badgeFailed,
                                        ]}
                                    >
                                        <Text
                                            style={[
                                                styles.badgePillText,
                                                isPassed ? styles.badgePassedText : styles.badgeFailedText,
                                            ]}
                                        >
                                            {isPassed ? t('passed', 'Passed') : t('failed', 'Failed')}
                                        </Text>
                                    </View>
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

                                <TouchableOpacity
                                    style={styles.outlineActionBtn}
                                    activeOpacity={0.85}
                                    onPress={() => navigation.navigate('QuizResult', { token: item.token, quizData: item })}
                                >
                                    <Text style={styles.outlineActionBtnText}>
                                        {t('view_feedback', 'View Feedback')}
                                    </Text>
                                    <ChevronRight color={theme.colors.textPrimary} size={16} />
                                </TouchableOpacity>
                            </View>
                        );
                    })
                )
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
    tabTextActive: {
        color: theme.colors.brand,
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
    container: {
        flex: 1,
    },
    scrollContent: {
        flexGrow: 1,
        paddingHorizontal: theme.spacing.md + 4,
        paddingTop: theme.spacing.md,
        paddingBottom: theme.spacing.xl + 40,
    },
    emptyCard: {
        backgroundColor: theme.colors.surface,
        borderRadius: theme.borderRadius.lg,
        padding: theme.spacing.xl,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: theme.colors.border,
        marginTop: theme.spacing.md,
    },
    emptyTitle: {
        fontSize: 16,
        fontWeight: '700',
        color: theme.colors.textPrimary,
        marginTop: theme.spacing.md,
    },
    emptySub: {
        fontSize: 12,
        color: theme.colors.textSecondary,
        marginTop: 2,
        textAlign: 'center',
    },
    card: {
        backgroundColor: theme.colors.surface,
        borderRadius: theme.borderRadius.lg,
        padding: theme.spacing.md,
        marginBottom: theme.spacing.md,
        borderWidth: 1,
        borderColor: theme.colors.border,
        ...theme.shadows.sm,
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
        backgroundColor: 'rgba(139, 92, 246, 0.1)',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: 'rgba(139, 92, 246, 0.2)',
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
    badgePill: {
        paddingHorizontal: theme.spacing.sm + 2,
        paddingVertical: 3,
        borderRadius: theme.borderRadius.full,
        borderWidth: 1,
    },
    badgePassed: {
        backgroundColor: theme.colors.status.successSubtle,
        borderColor: theme.colors.status.successBorder,
    },
    badgePassedText: {
        color: theme.colors.status.success,
    },
    badgeFailed: {
        backgroundColor: theme.colors.status.dangerSubtle,
        borderColor: theme.colors.status.dangerBorder,
    },
    badgeFailedText: {
        color: theme.colors.status.danger,
    },
    badgePillText: {
        fontSize: 10,
        fontWeight: '800',
        textTransform: 'uppercase',
        letterSpacing: 0.5,
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
    primaryActionBtn: {
        height: 44,
        borderRadius: theme.borderRadius.md,
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        gap: 6,
    },
    primaryActionBtnText: {
        color: '#FFFFFF',
        fontSize: 13,
        fontWeight: '800',
        letterSpacing: 0.3,
    },
    outlineActionBtn: {
        height: 44,
        borderRadius: theme.borderRadius.md,
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: theme.colors.border,
        backgroundColor: theme.colors.surface,
        gap: 6,
    },
    outlineActionBtnText: {
        color: theme.colors.textPrimary,
        fontSize: 13,
        fontWeight: '800',
        letterSpacing: 0.3,
    },
}));
