import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    ScrollView,
    TouchableOpacity,
    SafeAreaView,
    StatusBar,
    ActivityIndicator,
    RefreshControl,
} from 'react-native';
import { StyleSheet, useUnistyles } from 'react-native-unistyles';
import { quizApi, QuizItem } from '../../api/quiz';
import { useAppTheme } from '../../context/ThemeContext';
import {
    Award,
    Clock,
    ArrowLeft,
    ChevronRight,
    CheckCircle2,
    XCircle,
    Play,
    BookOpen,
    Sun,
    Moon,
} from 'lucide-react-native';

const STATUS_FILTERS = [
    { id: 'all', label: 'All Quizzes' },
    { id: 'available', label: 'Available' },
    { id: 'in_progress', label: 'In Progress' },
    { id: 'passed', label: 'Passed' },
    { id: 'failed', label: 'Failed' },
];

export const QuizListScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
    const { isDark, toggleTheme } = useAppTheme();
    const { theme } = useUnistyles();
    const styles = stylesheet;

    const [selectedStatus, setSelectedStatus] = useState<string>('all');
    const [quizzes, setQuizzes] = useState<QuizItem[]>([]);
    const [isLoading, setIsLoading] = useState<boolean>(true);
    const [refreshing, setRefreshing] = useState<boolean>(false);

    useEffect(() => {
        loadQuizzes();
    }, [selectedStatus]);

    const loadQuizzes = async () => {
        try {
            setIsLoading(true);
            const res = await quizApi.getAssignedQuizzes().catch(() => null);
            const list = Array.isArray(res?.data) ? res.data : Array.isArray(res) ? res : [];
            setQuizzes(list);
        } catch (error) {
            console.warn('Failed to load quizzes:', error);
            // Fallback demo quizzes
            setQuizzes([
                {
                    id: 104,
                    token: 'qz_token_cyber_2026',
                    status: 'available',
                    quiz: {
                        id: 12,
                        title: 'Q3 Cybersecurity & Data Privacy Orientation',
                        description: 'Mandatory annual training on data protection, phishing detection, and password policy.',
                        duration: 900,
                        passing_percentage: 75,
                        points: 100,
                        total_questions: 10,
                    },
                },
                {
                    id: 105,
                    token: 'qz_token_hr_policy',
                    status: 'passed',
                    score: 90,
                    quiz: {
                        id: 13,
                        title: 'Company Culture & HR Policies',
                        description: 'Overview of employee handbook, leave policies, and workplace code of conduct.',
                        duration: 600,
                        passing_percentage: 70,
                        points: 100,
                        total_questions: 8,
                    },
                },
            ]);
        } finally {
            setIsLoading(false);
            setRefreshing(false);
        }
    };

    const onRefresh = () => {
        setRefreshing(true);
        loadQuizzes();
    };

    const filteredQuizzes = quizzes.filter((item) => {
        if (selectedStatus === 'all') return true;
        return (item.status || '').toLowerCase() === selectedStatus;
    });

    const getStatusBadge = (status: string, score?: number | null) => {
        const s = (status || '').toLowerCase();
        if (s === 'passed') {
            return {
                bg: 'rgba(16, 185, 129, 0.1)',
                border: 'rgba(16, 185, 129, 0.2)',
                color: theme.colors.status.success,
                label: `PASSED (${score ?? 0}%)`,
                Icon: CheckCircle2,
            };
        }
        if (s === 'failed') {
            return {
                bg: 'rgba(239, 68, 68, 0.1)',
                border: 'rgba(239, 68, 68, 0.2)',
                color: theme.colors.status.danger,
                label: `FAILED (${score ?? 0}%)`,
                Icon: XCircle,
            };
        }
        if (s === 'in_progress') {
            return {
                bg: 'rgba(245, 158, 11, 0.1)',
                border: 'rgba(245, 158, 11, 0.2)',
                color: '#F59E0B',
                label: 'IN PROGRESS',
                Icon: Clock,
            };
        }
        return {
            bg: 'rgba(37, 99, 235, 0.1)',
            border: 'rgba(37, 99, 235, 0.2)',
            color: theme.colors.primary,
            label: 'AVAILABLE',
            Icon: Play,
        };
    };

    return (
        <SafeAreaView style={styles.safeArea}>
            <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />

            {/* Header */}
            <View style={styles.topBar}>
                <TouchableOpacity style={styles.iconCircle} onPress={() => navigation.goBack()} activeOpacity={0.7}>
                    <ArrowLeft color={theme.colors.textPrimary} size={20} />
                </TouchableOpacity>

                <Text style={styles.headerTitle}>Assigned Training Quizzes</Text>

                <TouchableOpacity onPress={toggleTheme} style={styles.iconCircle} activeOpacity={0.7}>
                    {isDark ? <Sun color="#F59E0B" size={18} /> : <Moon color="#2563EB" size={18} />}
                </TouchableOpacity>
            </View>

            <ScrollView
                style={styles.container}
                contentContainerStyle={styles.scrollContent}
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.colors.primary} />
                }
            >
                {/* Status Filter Chips */}
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterBar}>
                    {STATUS_FILTERS.map((cat) => (
                        <TouchableOpacity
                            key={cat.id}
                            style={[
                                styles.filterChip,
                                selectedStatus === cat.id && styles.filterChipActive,
                            ]}
                            onPress={() => setSelectedStatus(cat.id)}
                            activeOpacity={0.8}
                        >
                            <Text
                                style={[
                                    styles.filterChipText,
                                    selectedStatus === cat.id && styles.filterChipTextActive,
                                ]}
                            >
                                {cat.label}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </ScrollView>

                {isLoading ? (
                    <View style={styles.loadingContainer}>
                        <ActivityIndicator size="large" color={theme.colors.primary} />
                    </View>
                ) : filteredQuizzes.length === 0 ? (
                    <View style={styles.emptyCard}>
                        <BookOpen color={theme.colors.textSecondary} size={44} />
                        <Text style={styles.emptyTitle}>No Quizzes Assigned</Text>
                        <Text style={styles.emptySub}>No training assessments match your selected filter.</Text>
                    </View>
                ) : (
                    filteredQuizzes.map((item) => {
                        const statusObj = getStatusBadge(item.status, item.score);
                        const StatusIcon = statusObj.Icon;
                        const durationMins = Math.round((item.quiz?.duration || 600) / 60);

                        return (
                            <TouchableOpacity
                                key={item.id}
                                style={styles.card}
                                onPress={() => {
                                    if (item.status === 'passed' || item.status === 'failed') {
                                        navigation.navigate('QuizResult', { token: item.token, quizData: item });
                                    } else {
                                        navigation.navigate('TakeQuiz', { token: item.token, quizData: item });
                                    }
                                }}
                                activeOpacity={0.8}
                            >
                                <View style={styles.cardHeader}>
                                    <View style={styles.iconBg}>
                                        <Award color="#8B5CF6" size={20} />
                                    </View>
                                    <Text style={styles.cardTitle} numberOfLines={1}>
                                        {item.quiz?.title || 'Training Assessment'}
                                    </Text>
                                </View>

                                <Text style={styles.cardDesc} numberOfLines={2}>
                                    {item.quiz?.description || 'No training description provided.'}
                                </Text>

                                <View style={styles.infoRow}>
                                    <Clock color={theme.colors.textSecondary} size={13} />
                                    <Text style={styles.infoText}>
                                        {durationMins} Mins • Pass {item.quiz?.passing_percentage || 70}%
                                    </Text>
                                </View>

                                <View style={styles.cardFooter}>
                                    <View style={[styles.statusBadge, { backgroundColor: statusObj.bg, borderColor: statusObj.border }]}>
                                        <StatusIcon color={statusObj.color} size={12} />
                                        <Text style={[styles.statusBadgeText, { color: statusObj.color }]}>
                                            {statusObj.label}
                                        </Text>
                                    </View>

                                    <View style={styles.actionBtn}>
                                        <Text style={styles.actionBtnText}>
                                            {item.status === 'passed' || item.status === 'failed' ? 'View Results' : 'Start Exam'}
                                        </Text>
                                        <ChevronRight color={theme.colors.primary} size={14} />
                                    </View>
                                </View>
                            </TouchableOpacity>
                        );
                    })
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
    headerTitle: {
        color: theme.colors.textPrimary,
        fontSize: 18,
        fontWeight: '700',
    },
    container: {
        flex: 1,
    },
    scrollContent: {
        paddingHorizontal: theme.spacing.md + 4,
        paddingBottom: theme.spacing.xl,
    },
    filterBar: {
        flexDirection: 'row',
        marginBottom: theme.spacing.md,
    },
    filterChip: {
        paddingHorizontal: theme.spacing.md,
        paddingVertical: theme.spacing.xs + 2,
        borderRadius: theme.borderRadius.md,
        backgroundColor: theme.colors.surfaceSubtle,
        borderWidth: 1,
        borderColor: theme.colors.border,
        marginRight: theme.spacing.xs + 2,
    },
    filterChipActive: {
        backgroundColor: theme.colors.primary,
        borderColor: theme.colors.primary,
    },
    filterChipText: {
        fontSize: 12,
        fontWeight: '600',
        color: theme.colors.textSecondary,
    },
    filterChipTextActive: {
        color: '#FFFFFF',
    },
    loadingContainer: {
        paddingVertical: theme.spacing.xxl,
        alignItems: 'center',
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
        marginBottom: theme.spacing.xs,
    },
    iconBg: {
        width: 36,
        height: 36,
        borderRadius: theme.borderRadius.md,
        backgroundColor: 'rgba(139, 92, 246, 0.1)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    cardTitle: {
        fontSize: 15,
        fontWeight: '700',
        color: theme.colors.textPrimary,
        flex: 1,
        marginLeft: theme.spacing.sm,
    },
    cardDesc: {
        fontSize: 13,
        color: theme.colors.textSecondary,
        lineHeight: 18,
        marginBottom: theme.spacing.sm,
    },
    infoRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: theme.spacing.sm,
    },
    infoText: {
        fontSize: 12,
        color: theme.colors.textSecondary,
        marginLeft: 4,
    },
    cardFooter: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingTop: theme.spacing.xs + 2,
        borderTopWidth: 1,
        borderTopColor: theme.colors.border,
    },
    statusBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: theme.spacing.sm,
        paddingVertical: 2,
        borderRadius: theme.borderRadius.full,
        borderWidth: 1,
    },
    statusBadgeText: {
        fontSize: 10,
        fontWeight: '800',
        marginLeft: 4,
    },
    actionBtn: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    actionBtnText: {
        fontSize: 12,
        fontWeight: '700',
        color: theme.colors.primary,
        marginRight: 2,
    },
}));
