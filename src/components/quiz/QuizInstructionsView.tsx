import React from 'react';
import { View, ScrollView, Pressable, StatusBar } from 'react-native';
import {
    Lock,
    Clock,
    FileText,
    Award,
    ShieldAlert,
    ChevronRight,
} from 'lucide-react-native';
import { AppText as Text } from '../AppText';
import { AppHeader } from '../common/AppHeader';

export interface QuizInstructionsViewProps {
    quizTitle: string;
    quizDuration?: number;
    questionsCount: number;
    totalPoints: number;
    passingPct: number;
    primaryColor: string;
    isDark: boolean;
    insetsTop: number;
    onStart: () => void;
    onDecline: () => void;
    styles: any;
    theme: any;
    t: (key: string, fallback?: string) => string;
}

export const QuizInstructionsView: React.FC<QuizInstructionsViewProps> = React.memo(({
    quizTitle,
    quizDuration,
    questionsCount,
    totalPoints,
    passingPct,
    primaryColor,
    isDark,
    insetsTop,
    onStart,
    onDecline,
    styles,
    theme,
    t,
}) => {
    return (
        <View style={[styles.safeArea, { paddingTop: insetsTop }]}>
            <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />

            {/* Standard Native Header Bar */}
            <AppHeader
                title={t('assessment_overview', 'Assessment Overview')}
                onBack={onDecline}
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
                            <Text style={styles.statValue}>{questionsCount}</Text>
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
                    <Pressable
                        style={({ pressed }: { pressed: boolean }) => [
                            styles.primaryActionBtn,
                            { backgroundColor: primaryColor },
                            pressed && { opacity: 0.9, transform: [{ scale: 0.99 }] },
                        ]}
                        onPress={onStart}
                        accessibilityRole="button"
                    >
                        <Text style={styles.primaryActionBtnText}>
                            {t('accept_and_start', 'I Agree & Start Assessment')}
                        </Text>
                        <ChevronRight color="#FFFFFF" size={18} />
                    </Pressable>

                    <Pressable
                        style={({ pressed }: { pressed: boolean }) => [
                            styles.outlineActionBtn,
                            pressed && { opacity: 0.75 },
                        ]}
                        onPress={onDecline}
                        accessibilityRole="button"
                    >
                        <Text style={styles.outlineActionBtnText}>{t('decline', 'Go Back')}</Text>
                    </Pressable>
                </View>
            </ScrollView>
        </View>
    );
});
