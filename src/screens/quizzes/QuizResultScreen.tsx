import React from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    SafeAreaView,
    StatusBar,
    ScrollView,
} from 'react-native';
import { Award, CheckCircle2, XCircle, ArrowLeft } from 'lucide-react-native';

export const QuizResultScreen: React.FC<{ route: any; navigation: any }> = ({
    route,
    navigation,
}) => {
    return (
        <SafeAreaView style={styles.safeArea}>
            <StatusBar barStyle="light-content" backgroundColor="#0F172A" />
            <ScrollView style={styles.container} contentContainerStyle={styles.content}>
                <View style={styles.topBar}>
                    <TouchableOpacity style={styles.iconCircle} onPress={() => navigation.navigate('QuizList')}>
                        <ArrowLeft color="#F8FAFC" size={20} />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>Assessment Result</Text>
                    <View style={{ width: 40 }} />
                </View>

                {/* Score Circle */}
                <View style={styles.scoreCard}>
                    <View style={styles.scoreCircle}>
                        <Text style={styles.scoreValue}>90%</Text>
                        <Text style={styles.scoreSub}>PASSED</Text>
                    </View>
                    <Text style={styles.quizTitle}>Cybersecurity & Data Privacy Basics 2026</Text>
                    <Text style={styles.congratsText}>Great job! You passed the assessment.</Text>
                </View>

                {/* Breakdown Stats */}
                <View style={styles.statsRow}>
                    <View style={styles.statBox}>
                        <CheckCircle2 color="#10B981" size={22} />
                        <Text style={styles.statVal}>9 / 10</Text>
                        <Text style={styles.statLabel}>Correct Answers</Text>
                    </View>
                    <View style={styles.statBox}>
                        <XCircle color="#EF4444" size={22} />
                        <Text style={styles.statVal}>1 / 10</Text>
                        <Text style={styles.statLabel}>Incorrect</Text>
                    </View>
                </View>

                <TouchableOpacity
                    style={styles.doneBtn}
                    onPress={() => navigation.navigate('HomeTab')}
                >
                    <Text style={styles.doneBtnText}>Back to Dashboard</Text>
                </TouchableOpacity>
            </ScrollView>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    safeArea: { flex: 1, backgroundColor: '#0F172A' },
    container: { flex: 1 },
    content: { padding: 20 },
    topBar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
    iconCircle: { width: 40, height: 40, borderRadius: 12, backgroundColor: '#1E293B', justifyContent: 'center', alignItems: 'center' },
    headerTitle: { color: '#F8FAFC', fontSize: 18, fontWeight: '700' },
    scoreCard: { backgroundColor: '#1E293B', borderRadius: 24, padding: 24, alignItems: 'center', marginBottom: 20, borderWidth: 1, borderColor: '#334155' },
    scoreCircle: { width: 120, height: 120, borderRadius: 60, backgroundColor: '#10B98115', borderBottomWidth: 4, borderColor: '#10B981', justifyContent: 'center', alignItems: 'center', marginBottom: 16 },
    scoreValue: { color: '#10B981', fontSize: 32, fontWeight: '900' },
    scoreSub: { color: '#10B981', fontSize: 11, fontWeight: '800', letterSpacing: 1 },
    quizTitle: { color: '#F8FAFC', fontSize: 17, fontWeight: '700', textAlign: 'center', marginBottom: 6 },
    congratsText: { color: '#94A3B8', fontSize: 13 },
    statsRow: { flexDirection: 'row', gap: 12, marginBottom: 28 },
    statBox: { flex: 1, backgroundColor: '#1E293B', borderRadius: 16, padding: 16, alignItems: 'center', gap: 6, borderWidth: 1, borderColor: '#334155' },
    statVal: { color: '#F8FAFC', fontSize: 18, fontWeight: '800' },
    statLabel: { color: '#64748B', fontSize: 12 },
    doneBtn: { backgroundColor: '#2563EB', height: 52, borderRadius: 14, justifyContent: 'center', alignItems: 'center' },
    doneBtnText: { color: '#FFFFFF', fontSize: 16, fontWeight: '700' },
});
