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
import { Calendar, Plus, Clock, CheckCircle2, XCircle, FileText, Sun, Moon } from 'lucide-react-native';
import { useAppTheme } from '../../context/ThemeContext';
import { apiClient } from '../../api/client';

export const LeaveListScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
    const { isDark, toggleTheme } = useAppTheme();
    const [isLoading, setIsLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [leaveBalances, setLeaveBalances] = useState<any[]>([]);
    const [leaveRequests, setLeaveRequests] = useState<any[]>([]);

    useEffect(() => {
        fetchLeaveData();
    }, []);

    const fetchLeaveData = async () => {
        try {
            const response = await apiClient.get('/employee-app/leave-requests');
            const data = response.data;

            if (Array.isArray(data?.balances)) {
                setLeaveBalances(data.balances);
            }
            if (Array.isArray(data?.requests?.data)) {
                setLeaveRequests(data.requests.data);
            } else if (Array.isArray(data?.requests)) {
                setLeaveRequests(data.requests);
            } else if (Array.isArray(data)) {
                setLeaveRequests(data);
            }
        } catch (error) {
            console.warn('Failed to fetch real leave data:', error);
        } finally {
            setIsLoading(false);
            setRefreshing(false);
        }
    };

    const onRefresh = () => {
        setRefreshing(true);
        fetchLeaveData();
    };

    return (
        <SafeAreaView className="flex-1 bg-slate-50 dark:bg-slate-950">
            <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />
            <ScrollView
                className="flex-1 px-5 py-4"
                contentContainerStyle={{ paddingBottom: 32 }}
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#2563EB" />
                }
            >
                {/* Header */}
                <View className="flex-row justify-between items-center mb-6">
                    <Text className="text-2xl font-extrabold text-slate-900 dark:text-slate-100">Leave Management</Text>
                    <View className="flex-row items-center space-x-2">
                        <TouchableOpacity
                            onPress={toggleTheme}
                            className="p-2.5 bg-slate-200 dark:bg-slate-800 rounded-xl border border-slate-300 dark:border-slate-700 mr-2"
                        >
                            {isDark ? <Sun color="#F59E0B" size={18} /> : <Moon color="#2563EB" size={18} />}
                        </TouchableOpacity>
                        <TouchableOpacity
                            className="flex-row items-center bg-blue-600 px-4 py-2.5 rounded-xl active:opacity-90 shadow-md shadow-blue-500/30"
                            onPress={() => navigation.navigate('CreateLeave')}
                        >
                            <Plus color="#FFFFFF" size={18} />
                            <Text className="text-white font-bold text-xs ml-1.5">Apply Leave</Text>
                        </TouchableOpacity>
                    </View>
                </View>

                {/* Balances Carousel */}
                {leaveBalances.length > 0 && (
                    <>
                        <Text className="text-base font-bold text-slate-900 dark:text-slate-100 mb-3">Leave Balances</Text>
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} className="flex-row mb-6">
                            {leaveBalances.map((item, idx) => (
                                <View
                                    key={idx}
                                    className="bg-white dark:bg-slate-900 rounded-2xl p-4 mr-3 w-40 border border-slate-200 dark:border-slate-800 shadow-md"
                                >
                                    <Text className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                                        {item.leave_type || item.type || 'Annual'}
                                    </Text>
                                    <Text className="text-2xl font-black text-blue-600 dark:text-sky-400 my-1">
                                        {item.remaining ?? item.balance ?? 0} Days
                                    </Text>
                                    <Text className="text-[11px] text-slate-400">
                                        Used {item.taken ?? 0} of {item.allowed ?? item.total ?? 0} days
                                    </Text>
                                </View>
                            ))}
                        </ScrollView>
                    </>
                )}

                {/* Leave Requests History */}
                <View className="flex-row justify-between items-center mb-3">
                    <Text className="text-base font-bold text-slate-900 dark:text-slate-100">Application History</Text>
                    <TouchableOpacity onPress={() => navigation.navigate('DayOff')}>
                        <Text className="text-xs font-semibold text-blue-600 dark:text-sky-400">Off-Day Requests</Text>
                    </TouchableOpacity>
                </View>

                {isLoading ? (
                    <View className="py-10 justify-center items-center">
                        <ActivityIndicator size="large" color="#2563EB" />
                    </View>
                ) : leaveRequests.length === 0 ? (
                    <View className="py-10 justify-center items-center bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800">
                        <Text className="text-sm text-slate-500 dark:text-slate-400">No leave applications found.</Text>
                    </View>
                ) : (
                    leaveRequests.map((req) => {
                        const statusStr = (req.status || 'pending').toLowerCase();
                        const isApproved = statusStr === 'approved';
                        const isPending = statusStr === 'pending';

                        return (
                            <View
                                key={req.id}
                                className="bg-white dark:bg-slate-900 rounded-2xl p-4 mb-3 border border-slate-200 dark:border-slate-800 shadow-md"
                            >
                                <View className="flex-row justify-between items-center mb-2">
                                    <View className="flex-row items-center space-x-2">
                                        <Calendar color="#2563EB" size={16} />
                                        <Text className="text-sm font-bold text-slate-900 dark:text-slate-100 ml-1.5">
                                            {(req.leave_type?.name || req.leave_type || 'LEAVE').toUpperCase()}
                                        </Text>
                                    </View>
                                    <View
                                        className={`px-2.5 py-1 rounded-full ${
                                            isApproved ? 'bg-emerald-500/10' : isPending ? 'bg-amber-500/10' : 'bg-red-500/10'
                                        }`}
                                    >
                                        <Text
                                            className={`text-[10px] font-bold ${
                                                isApproved
                                                    ? 'text-emerald-600 dark:text-emerald-400'
                                                    : isPending
                                                    ? 'text-amber-600 dark:text-amber-400'
                                                    : 'text-red-600 dark:text-red-400'
                                            }`}
                                        >
                                            {statusStr.toUpperCase()}
                                        </Text>
                                    </View>
                                </View>

                                <Text className="text-sm font-bold text-blue-600 dark:text-sky-400 mb-1">
                                    {req.start_date} → {req.end_date} ({req.days_count || 1} Day{req.days_count > 1 ? 's' : ''})
                                </Text>
                                <Text className="text-xs text-slate-600 dark:text-slate-400 mb-3" numberOfLines={2}>
                                    {req.reason || 'No reason specified'}
                                </Text>

                                <View className="pt-2 border-t border-slate-100 dark:border-slate-800">
                                    <Text className="text-[11px] text-slate-400">
                                        Applied on {req.created_at ? req.created_at.substring(0, 10) : 'Recent'}
                                    </Text>
                                </View>
                            </View>
                        );
                    })
                )}
            </ScrollView>
        </SafeAreaView>
    );
};
