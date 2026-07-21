import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    ScrollView,
    TouchableOpacity,
    SafeAreaView,
    StatusBar,
    RefreshControl,
    ActivityIndicator,
} from 'react-native';
import { useAuth } from '../../context/AuthContext';
import { useAppTheme } from '../../context/ThemeContext';
import { apiClient } from '../../api/client';
import {
    QrCode,
    Calendar,
    FileText,
    Activity,
    Bell,
    Gift,
    Award,
    Clock,
    ChevronRight,
    CheckCircle2,
    XCircle,
    Sun,
    Moon,
} from 'lucide-react-native';
import { format } from 'date-fns';

export const DashboardScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
    const { user } = useAuth();
    const { isDark, toggleTheme } = useAppTheme();
    const [currentTime, setCurrentTime] = useState(new Date());
    const [isLoading, setIsLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    const [isClockedIn, setIsClockedIn] = useState(false);
    const [clockInTime, setClockInTime] = useState<string | null>(null);
    const [shiftName, setShiftName] = useState<string>('Standard Shift');
    const [announcements, setAnnouncements] = useState<any[]>([]);
    const [celebration, setCelebration] = useState<any>(null);
    const [unreadNotifications, setUnreadNotifications] = useState(0);

    useEffect(() => {
        const timer = setInterval(() => setCurrentTime(new Date()), 1000);
        return () => clearInterval(timer);
    }, []);

    useEffect(() => {
        fetchDashboardData();
    }, []);

    const fetchDashboardData = async () => {
        try {
            const response = await apiClient.get('/employee-app/bootstrap');
            const data = response.data;

            if (data?.todayShiftMerged?.attendance_today) {
                const att = data.todayShiftMerged.attendance_today;
                setIsClockedIn(!!att.in1 && !att.out1);
                setClockInTime(att.in1 ? att.in1.substring(0, 5) : null);
            } else {
                setIsClockedIn(false);
                setClockInTime(null);
            }

            if (data?.todayShiftMerged?.shift?.name) {
                setShiftName(data.todayShiftMerged.shift.name);
            }

            if (Array.isArray(data?.announcements)) {
                setAnnouncements(data.announcements);
            }

            if (data?.celebrations) {
                setCelebration(data.celebrations);
            }

            if (typeof data?.unread_notifications_count === 'number') {
                setUnreadNotifications(data.unread_notifications_count);
            }
        } catch (error) {
            console.warn('Dashboard fetch fallback error:', error);
        } finally {
            setIsLoading(false);
            setRefreshing(false);
        }
    };

    const onRefresh = () => {
        setRefreshing(true);
        fetchDashboardData();
    };

    return (
        <SafeAreaView className="flex-1 bg-gray-100 dark:bg-slate-950">
            <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />
            <ScrollView
                className="flex-1 px-5 py-4"
                contentContainerStyle={{ paddingBottom: 32 }}
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#2563EB" />
                }
            >
                {/* User Header & Theme Switcher */}
                <View className="flex-row justify-between items-center mb-6">
                    <View className="flex-row items-center space-x-3">
                        <View className="w-12 h-12 rounded-2xl bg-blue-600 justify-center items-center shadow-md shadow-blue-500/30">
                            <Text className="text-xl font-extrabold">
                                {user?.name ? user.name.charAt(0).toUpperCase() : 'E'}
                            </Text>
                        </View>
                        <View className="ml-3">
                            <Text className="text-xs">Welcome back,</Text>
                            <Text className="text-lg font-bold text-slate-900 dark:text-slate-100">{user?.name || 'Employee'}</Text>
                            <Text className="text-xs text-slate-500 dark:text-slate-400">{user?.position || 'Staff'} • {shiftName}</Text>
                        </View>
                    </View>

                    <View className="flex-row items-center space-x-2">
                        <TouchableOpacity
                            onPress={toggleTheme}
                            className="p-2.5 bg-slate-200 dark:bg-slate-800 rounded-xl border border-slate-300 dark:border-slate-700 active:opacity-70 mr-2"
                        >
                            {isDark ? <Sun color="#F59E0B" size={20} /> : <Moon color="#2563EB" size={20} />}
                        </TouchableOpacity>

                        <TouchableOpacity
                            className="w-11 h-11 rounded-xl bg-slate-200 dark:bg-slate-800 justify-center items-center border border-slate-300 dark:border-slate-700 relative"
                            onPress={() => navigation.navigate('Notifications')}
                        >
                            <Bell color={isDark ? '#F8FAFC' : '#1E293B'} size={20} />
                            {unreadNotifications > 0 && (
                                <View className="absolute top-2 right-2 w-2.5 h-2.5 rounded-full bg-red-500" />
                            )}
                        </TouchableOpacity>
                    </View>
                </View>

                {/* Digital Clock & Real Attendance Status Card */}
                <View className="bg-white dark:bg-slate-900 rounded-3xl p-6 mb-6 border">
                    <View className="flex-row justify-between items-center mb-3">
                        <View className="flex-row items-center">
                            <Clock color="#2563EB" size={16} />
                            <Text className="text-xs font-semibold text-slate-600 dark:text-slate-400 ml-1.5">
                                {format(currentTime, 'EEEE, dd MMM yyyy')}
                            </Text>
                        </View>
                        <View
                            className={`flex-row items-center px-2.5 py-1 rounded-full ${
                                isClockedIn ? 'bg-emerald-500/10' : 'bg-red-500/10'
                            }`}
                        >
                            {isClockedIn ? (
                                <CheckCircle2 color="#10B981" size={13} />
                            ) : (
                                <XCircle color="#EF4444" size={13} />
                            )}
                            <Text
                                className={`text-xs font-bold ml-1 ${
                                    isClockedIn ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'
                                }`}
                            >
                                {isClockedIn ? 'CLOCKED IN' : 'NOT CLOCKED IN'}
                            </Text>
                        </View>
                    </View>

                    <Text className="text-3xl font-black text-slate-900 dark:text-slate-100 tracking-wider my-1">
                        {format(currentTime, 'hh:mm:ss a')}
                    </Text>

                    {isClockedIn && clockInTime && (
                        <Text className="text-xs font-medium text-emerald-600 dark:text-emerald-400 mb-4">
                            Punched in today at {clockInTime}
                        </Text>
                    )}

                    <TouchableOpacity
                        className="bg-blue-600 hover:bg-blue-700 h-13 rounded-2xl flex-row justify-center items-center mt-3 shadow-lg shadow-blue-500/30 active:opacity-90 py-3.5"
                        onPress={() => navigation.navigate('ScanTab')}
                    >
                        <QrCode color="#FFFFFF" size={20} />
                        <Text className="text-white font-bold text-base ml-2">
                            {isClockedIn ? 'Clock Out / QR Scan' : 'Clock In Now'}
                        </Text>
                    </TouchableOpacity>
                </View>

                {/* Quick Actions Grid */}
                <Text className="text-base font-bold text-slate-900 dark:text-slate-100 mb-3">Quick Actions</Text>
                <View className="flex-row flex-wrap justify-between mb-6">
                    <TouchableOpacity
                        className="w-[48%] bg-white dark:bg-slate-900 rounded-2xl p-4 mb-3 border border-slate-200 dark:border-slate-800 shadow-md active:opacity-80"
                        onPress={() => navigation.navigate('LeaveList')}
                    >
                        <View className="w-11 h-11 rounded-xl bg-blue-500/10 justify-center items-center mb-3">
                            <Calendar color="#2563EB" size={22} />
                        </View>
                        <Text className="text-sm font-bold text-slate-900 dark:text-slate-100">Leave Requests</Text>
                        <Text className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Apply & Balances</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        className="w-[48%] bg-white dark:bg-slate-900 rounded-2xl p-4 mb-3 border border-slate-200 dark:border-slate-800 shadow-md active:opacity-80"
                        onPress={() => navigation.navigate('ActivityList')}
                    >
                        <View className="w-11 h-11 rounded-xl bg-emerald-500/10 justify-center items-center mb-3">
                            <Activity color="#10B981" size={22} />
                        </View>
                        <Text className="text-sm font-bold text-slate-900 dark:text-slate-100">Activity Log</Text>
                        <Text className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Log Daily Tasks</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        className="w-[48%] bg-white dark:bg-slate-900 rounded-2xl p-4 mb-3 border border-slate-200 dark:border-slate-800 shadow-md active:opacity-80"
                        onPress={() => navigation.navigate('SubordinateNotices')}
                    >
                        <View className="w-11 h-11 rounded-xl bg-amber-500/10 justify-center items-center mb-3">
                            <FileText color="#F59E0B" size={22} />
                        </View>
                        <Text className="text-sm font-bold text-slate-900 dark:text-slate-100">Team Notices</Text>
                        <Text className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Subordinate Feed</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        className="w-[48%] bg-white dark:bg-slate-900 rounded-2xl p-4 mb-3 border border-slate-200 dark:border-slate-800 shadow-md active:opacity-80"
                        onPress={() => navigation.navigate('QuizList')}
                    >
                        <View className="w-11 h-11 rounded-xl bg-purple-500/10 justify-center items-center mb-3">
                            <Award color="#8B5CF6" size={22} />
                        </View>
                        <Text className="text-sm font-bold text-slate-900 dark:text-slate-100">Quizzes</Text>
                        <Text className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Training & Tests</Text>
                    </TouchableOpacity>
                </View>

                {/* Real Company Announcements Feed */}
                {announcements.length > 0 && (
                    <View className="mb-6">
                        <View className="flex-row justify-between items-center mb-3">
                            <View className="flex-row items-center">
                                <Bell color="#2563EB" size={18} />
                                <Text className="text-base font-bold text-slate-900 dark:text-slate-100 ml-1.5">
                                    Company Announcements
                                </Text>
                            </View>
                        </View>

                        {announcements.slice(0, 2).map((item) => (
                            <TouchableOpacity
                                key={item.id || item.title}
                                className="bg-white dark:bg-slate-900 rounded-2xl p-4 mb-3 border border-slate-200 dark:border-slate-800 shadow-md"
                                onPress={() => navigation.navigate('AnnouncementDetail', { id: item.id })}
                            >
                                <Text className="text-sm font-bold text-slate-900 dark:text-slate-100 mb-1">
                                    {item.title}
                                </Text>
                                <Text className="text-xs text-slate-500 dark:text-slate-400 mb-2" numberOfLines={2}>
                                    {item.summary || item.content || item.description || 'No description available'}
                                </Text>
                                <View className="flex-row justify-between items-center pt-2 border-t border-slate-100 dark:border-slate-800">
                                    <Text className="text-[11px] text-slate-400">{item.created_at || 'Recent'}</Text>
                                    <ChevronRight color="#94A3B8" size={16} />
                                </View>
                            </TouchableOpacity>
                        ))}
                    </View>
                )}

                {/* Celebrations Banner */}
                {celebration && (
                    <TouchableOpacity
                        className="bg-pink-500/10 rounded-2xl p-4 flex-row items-center border border-pink-500/20 mb-6"
                        onPress={() => navigation.navigate('CelebrationWish', { id: celebration.id })}
                    >
                        <Gift color="#EC4899" size={26} />
                        <View className="flex-1 ml-3">
                            <Text className="text-sm font-bold text-pink-600 dark:text-pink-400">
                                {celebration.title || celebration.milestone || 'Work Celebration!'}
                            </Text>
                            <Text className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                                Tap to send a congratulatory wish 🎉
                            </Text>
                        </View>
                        <ChevronRight color="#EC4899" size={18} />
                    </TouchableOpacity>
                )}
            </ScrollView>
        </SafeAreaView>
    );
};
