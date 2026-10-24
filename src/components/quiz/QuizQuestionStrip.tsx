import React from 'react';
import { View, ScrollView, Pressable } from 'react-native';
import { AppText as Text } from '../AppText';
import { QuizQuestion } from '../../api/quiz';

export interface QuizQuestionStripProps {
    questions: QuizQuestion[];
    currentIdx: number;
    isQuestionAnswered: (questionId: number, questionType?: string) => boolean;
    onSelectQuestion: (idx: number) => void;
    questionScrollRef: React.RefObject<any>;
    primaryColor: string;
    isDark: boolean;
    styles: any;
    theme: any;
}

export const QuizQuestionStrip: React.FC<QuizQuestionStripProps> = React.memo(({
    questions,
    currentIdx,
    isQuestionAnswered,
    onSelectQuestion,
    questionScrollRef,
    primaryColor,
    isDark,
    styles,
    theme,
}) => {
    if (!questions || questions.length === 0) return null;

    return (
        <View style={styles.questionStripContainer}>
            <ScrollView
                ref={questionScrollRef as any}
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.questionStripScroll}
            >
                {questions.map((q, idx) => {
                    const isCurrent = currentIdx === idx;
                    const isAnswered = isQuestionAnswered(q.id, q.question_type);

                    return (
                        <Pressable
                            key={q.id || idx}
                            style={({ pressed }: { pressed: boolean }) => [
                                styles.questionPill,
                                isAnswered && styles.questionPillAnswered,
                                isCurrent && styles.questionPillActive,
                                isCurrent && {
                                    borderColor: primaryColor,
                                    backgroundColor: isDark ? `${primaryColor}25` : `${primaryColor}15`,
                                },
                                pressed && { opacity: 0.8 },
                            ]}
                            onPress={() => onSelectQuestion(idx)}
                            accessibilityRole="button"
                            accessibilityLabel={`Go to question ${idx + 1}`}
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
                        </Pressable>
                    );
                })}
            </ScrollView>
        </View>
    );
});
