import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    FlatList,
    TouchableOpacity,
    SafeAreaView,
    StatusBar,
    ActivityIndicator,
    RefreshControl,
} from 'react-native';
import { Calendar, CheckCircle2, AlertTriangle, ArrowDownLeft, ArrowUpRight, Sun, Moon } from 'lucide-react-native';
import { useAppTheme } from '../../context/ThemeContext';
import { apiClient } from '../../api/client';

interface RealAttendanceRecord {
    id: number;
    date: string;
    clock_in: string | null;
    clock_out: string | null;
    status: string;
    working_hours: string;
}

export const HistoryScreen: React.FC = () => {
    const { isDark, toggleTheme } = useAppTheme();
    const [selectedFilter, setSelectedFilter] = useState<'all' | 'on_time' | 'late'>('all');
    const [historyLogs, setHistoryLogs] = useState<RealAttendanceRecord[]>([]);
    const [isLoading, setIsLoading] = useState<boolean>(true);
    const [refreshing, setRefreshing] = useState<boolean>(false);

    useEffect(() => {
        fetchHistory();
    }, []);

    const fetchHistory = async () => {
        try {
            const response = await apiClient.get('/employee-app/history');
            const data = response.data;
            const records: RealAttendanceRecord[] = Array.isArray(data)
                ? data
                : Array.isArray(data?.records)
                ? data.records
                : Array.isArray(data?.data)
                ? data.data
                : [];

            setHistoryLogs(records);
        } catch (error) {
            console.warn('Failed to fetch real attendance history:', error);
        } finally {
            setIsLoading(false);
            setRefreshing(false);
        }
    };

    const onRefresh = () => {
        setRefreshing(true);
        fetchHistory();
    };

    const filteredLogs = historyLogs.filter((log) => {
        if (selectedFilter === 'all') return true;
        if (selectedFilter === 'on_time') return log.status === 'on_time' || log.status === 'present';
        if (selectedFilter === 'late') return log.status === 'late';
        return true;
    });

    const renderItem = ({ item }: { item: RealAttendanceRecord }) => {
        const isOnTime = item.status === 'on_time' || item.status === 'present';
        return (
            <View className="bg-white dark:bg-slate-900 rounded-2xl p-4 mb-3 border border-slate-200 dark:border-slate-800 shadow-md">
                <View className="flex-row justify-between items-center mb-3">
                    <View className="flex-row items-center space-x-2">
                        <Calendar color="#2563EB" size={16} />
                        <Text className="text-sm font-bold text-slate-900 dark:text-slate-100 ml-1.5">{item.date}</Text>
                    </View>
                    <View
                        className={`flex-row items-center px-2.5 py-1 rounded-full ${
                            isOnTime ? 'bg-emerald-500/10' : 'bg-amber-500/10'
                        }`}
                    >
                        {isOnTime ? (
                            <CheckCircle2 color="#10B981" size={12} />
                        ) : (
                            <AlertTriangle color="#F59E0B" size={12} />
                        )}
                        <Text
                            className={`text-[11px] font-bold ml-1 ${
                                isOnTime ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400'
                            }`}
                        >
                            {(item.status || 'PRESENT').replace('_', ' ').toUpperCase()}
                        </Text>
                    </View>
                </View>

                <View className="flex-row bg-slate-100 dark:bg-slate-950 rounded-xl p-3 mb-3">
                    <View className="flex-1 space-y-1">
                        <View className="flex-row items-center">
                            <ArrowDownLeft color="#10B981" size={16} />
                            <Text className="text-xs text-slate-500 dark:text-slate-400 ml-1">Clock In</Text>
                        </View>
                        <Text className="text-base font-bold text-slate-900 dark:text-slate-100">{item.clock_in || '--:--'}</Text>
                    </View>

                    <View className="w-[1px] bg-slate-200 dark:bg-slate-800 mx-3" />

                    <View className="flex-1 space-y-1">
                        <View className="flex-row items-center">
                            <ArrowUpRight color="#EF4444" size={16} />
                            <Text className="text-xs text-slate-500 dark:text-slate-400 ml-1">Clock Out</Text>
                        </View>
                        <Text className="text-base font-bold text-slate-900 dark:text-slate-100">{item.clock_out || 'Active'}</Text>
                    </View>
                </View>

                <View className="flex-row justify-between items-center pt-2 border-t border-slate-100 dark:border-slate-800">
                    <Text className="text-xs text-slate-500 dark:text-slate-400">Working Duration:</Text>
                    <Text className="text-xs font-bold text-blue-600 dark:text-sky-400">{item.working_hours || 'N/A'}</Text>
                </View>
            </View>
        );
    };

    return (
        <SafeAreaView className="flex-1 bg-slate-50 dark:bg-slate-950">
            <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />
            <View className="flex-1 px-5 py-4">
                {/* Header */}
                <View className="flex-row justify-between items-center mb-4">
                    <Text className="text-2xl font-extrabold text-slate-900 dark:text-slate-100">Attendance History</Text>
                    <TouchableOpacity
                        onPress={toggleTheme}
                        className="p-2.5 bg-slate-200 dark:bg-slate-800 rounded-xl border border-slate-300 dark:border-slate-700"
                    >
                        {isDark ? <Sun color="#F59E0B" size={18} /> : <Moon color="#2563EB" size={18} />}
                    </TouchableOpacity>
                </View>

                {/* Filter Tabs */}
                <View className="flex-row space-x-2 mb-4">
                    <TouchableOpacity
                        className={`px-3.5 py-2 rounded-xl border ${
                            selectedFilter === 'all'
                                ? 'bg-blue-600 border-blue-600'
                                : 'bg-slate-200 dark:bg-slate-900 border-slate-300 dark:border-slate-800'
                        }`}
                        onPress={() => setSelectedFilter('all')}
                    >
                        <Text
                            className={`text-xs font-semibold ${
                                selectedFilter === 'all' ? 'text-white' : 'text-slate-600 dark:text-slate-400'
                            }`}
                        >
                            All Logs
                        </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        className={`px-3.5 py-2 rounded-xl border ml-2 ${
                            selectedFilter === 'on_time'
                                ? 'bg-blue-600 border-blue-600'
                                : 'bg-slate-200 dark:bg-slate-900 border-slate-300 dark:border-slate-800'
                        }`}
                        onPress={() => setSelectedFilter('on_time')}
                    >
                        <Text
                            className={`text-xs font-semibold ${
                                selectedFilter === 'on_time' ? 'text-white' : 'text-slate-600 dark:text-slate-400'
                            }`}
                        >
                            On Time
                        </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        className={`px-3.5 py-2 rounded-xl border ml-2 ${
                            selectedFilter === 'late'
                                ? 'bg-blue-600 border-blue-600'
                                : 'bg-slate-200 dark:bg-slate-900 border-slate-300 dark:border-slate-800'
                        }`}
                        onPress={() => setSelectedFilter('late')}
                    >
                        <Text
                            className={`text-xs font-semibold ${
                                selectedFilter === 'late' ? 'text-white' : 'text-slate-600 dark:text-slate-400'
                            }`}
                        >
                            Late Punches
                        </Text>
                    </TouchableOpacity>
                </View>

                {isLoading ? (
                    <View className="flex-1 justify-center items-center">
                        <ActivityIndicator size="large" color="#2563EB" />
                    </View>
                ) : filteredLogs.length === 0 ? (
                    <View className="flex-1 justify-center items-center">
                        <Text className="text-sm text-slate-500 dark:text-slate-400">No attendance history records found.</Text>
                    </View>
                ) : (
                    <FlatList
                        data={filteredLogs}
                        keyExtractor={(item: RealAttendanceRecord) => item.id?.toString() || item.date}
                        renderItem={renderItem}
                        contentContainerStyle={{ paddingBottom: 24 }}
                        showsVerticalScrollIndicator={false}
                        refreshControl={
                            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#2563EB" />
                        }
                    />
                )}
            </View>
        </SafeAreaView>
    );
};
