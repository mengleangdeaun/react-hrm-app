import { apiClient } from './client';

export interface QuizItem {
    id: number;
    ulid?: string;
    token: string;
    status: 'available' | 'in_progress' | 'passed' | 'failed' | 'completed';
    score?: number | null;
    started_at?: string | null;
    completed_at?: string | null;
    quiz: {
        id: number;
        title: string;
        description: string;
        duration: number; // in seconds
        passing_percentage: number;
        points: number;
        difficulty?: string;
        total_questions?: number;
    };
}

export interface QuestionOption {
    id: number | string;
    option_text: string;
}

export interface QuizQuestion {
    id: number;
    question_text: string;
    question_type: 'single_choice' | 'multiple_choice' | 'essay';
    points: number;
    options: QuestionOption[];
}

export interface QuizExamData {
    test_ulid: string;
    status: string;
    started_at?: string;
    quiz: {
        title: string;
        duration: number;
        questions: QuizQuestion[];
    };
}

export interface QuizAnswerPayload {
    question_id: number;
    selected_options?: (number | string)[];
    text_answer?: string;
}

export const quizApi = {
    /**
     * Fetch all assigned training tests & quizzes for employee
     */
    getAssignedQuizzes: async () => {
        const response = await apiClient.get('/employee-app/quizzes');
        return response.data;
    },

    /**
     * Fetch quiz questions (Anti-cheating masked)
     */
    getQuizQuestions: async (token: string) => {
        const response = await apiClient.get(`/employee-app/quizzes/${token}`);
        return response.data;
    },

    /**
     * Start exam timer
     */
    startQuiz: async (token: string) => {
        const response = await apiClient.post(`/employee-app/quizzes/${token}/start`);
        return response.data;
    },

    /**
     * Submit answers and auto-grade
     */
    submitQuiz: async (token: string, answers: QuizAnswerPayload[]) => {
        const response = await apiClient.post(`/employee-app/quizzes/${token}/submit`, { answers });
        return response.data;
    },

    /**
     * Fetch detailed score result breakdown
     */
    getQuizResult: async (token: string) => {
        const response = await apiClient.get(`/employee-app/quizzes/${token}/result`);
        return response.data;
    },
};
