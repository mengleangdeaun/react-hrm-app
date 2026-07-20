import React, { useEffect, useState } from 'react';
import {
    View,
    Text,
    ScrollView,
    TouchableOpacity,
    SafeAreaView,
    StatusBar,
    Alert,
    ActivityIndicator,
    Image,
} from 'react-native';
import { useAuth } from '../../context/AuthContext';
import { useAppTheme } from '../../context/ThemeContext';
import { apiClient } from '../../api/client';
import {
    Mail,
    Phone,
    Briefcase,
    Building2,
    Calendar,
    Settings,
    LogOut,
    ShieldAlert,
    Sun,
    Moon,
    MapPin,
} from 'lucide-react-native';

export const ProfileScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
    const { user, logout } = useAuth();
    const { isDark, toggleTheme } = useAppTheme();
    const [profileData, setProfileData] = useState<any>(null);
    const [isLoading, setIsLoading] = useState<boolean>(true);

    useEffect(() => {
        fetchProfile();
    }, []);

    const fetchProfile = async () => {
        try {
            const response = await apiClient.get('/employee-app/profile');
            setProfileData(response.data);
        } catch (error) {
            console.warn('Failed to fetch real profile:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleLogout = () => {
        Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Sign Out', style: 'destructive', onPress: logout },
        ]);
    };

    const emp = profileData?.employee || profileData || user;

    return (
        <SafeAreaView className="flex-1 bg-slate-50 dark:bg-slate-950">
            <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />
            <ScrollView className="flex-1 px-5 py-4" contentContainerStyle={{ paddingBottom: 32 }}>
                {/* Header */}
                <View className="flex-row justify-between items-center mb-6">
                    <Text className="text-2xl font-extrabold text-slate-900 dark:text-slate-100">Employee Profile</Text>
                    <View className="flex-row items-center space-x-2">
                        <TouchableOpacity
                            onPress={toggleTheme}
                            className="p-2.5 bg-slate-200 dark:bg-slate-800 rounded-xl border border-slate-300 dark:border-slate-700 mr-2"
                        >
                            {isDark ? <Sun color="#F59E0B" size={18} /> : <Moon color="#2563EB" size={18} />}
                        </TouchableOpacity>
                        <TouchableOpacity
                            className="w-10 h-10 rounded-xl bg-slate-200 dark:bg-slate-800 justify-center items-center border border-slate-300 dark:border-slate-700"
                            onPress={() => navigation.navigate('Settings')}
                        >
                            <Settings color={isDark ? '#F8FAFC' : '#1E293B'} size={18} />
                        </TouchableOpacity>
                    </View>
                </View>

                {isLoading ? (
                    <View className="py-12 justify-center items-center">
                        <ActivityIndicator size="large" color="#2563EB" />
                    </View>
                ) : (
                    <>
                        {/* Profile Card */}
                        <View className="bg-white dark:bg-slate-900 rounded-3xl p-6 items-center mb-6 border border-slate-200 dark:border-slate-800 shadow-xl">
                            {emp?.avatar || emp?.profile_image ? (
                                <Image
                                    source={{ uri: emp.avatar || emp.profile_image }}
                                    className="w-20 h-20 rounded-3xl mb-3"
                                />
                            ) : (
                                <View className="w-20 h-20 rounded-3xl bg-blue-600 justify-center items-center mb-3 shadow-lg shadow-blue-500/30">
                                    <Text className="text-white text-3xl font-black">
                                        {(emp?.name || emp?.full_name || 'E').charAt(0).toUpperCase()}
                                    </Text>
                                </View>
                            )}
                            <Text className="text-xl font-extrabold text-slate-900 dark:text-slate-100 text-center">
                                {emp?.name || emp?.full_name || user?.name || 'Employee'}
                            </Text>
                            <Text className="text-xs font-medium text-slate-500 dark:text-slate-400 mt-0.5 mb-3 text-center">
                                {emp?.designation?.name || emp?.position || user?.position || 'Staff'}
                            </Text>
                            <View className="bg-blue-500/10 px-3 py-1 rounded-lg">
                                <Text className="text-blue-600 dark:text-sky-400 text-xs font-bold tracking-wider">
                                    {emp?.code || emp?.employee_code || user?.employee_code || 'EMP-001'}
                                </Text>
                            </View>
                        </View>

                        {/* Employment Info */}
                        <Text className="text-base font-bold text-slate-900 dark:text-slate-100 mb-3">Employment Information</Text>
                        <View className="bg-white dark:bg-slate-900 rounded-2xl p-4 mb-6 border border-slate-200 dark:border-slate-800 shadow-md">
                            <View className="flex-row items-center py-2">
                                <Mail color="#2563EB" size={18} />
                                <View className="ml-3 flex-1">
                                    <Text className="text-[11px] text-slate-400">Email Address</Text>
                                    <Text className="text-sm font-semibold text-slate-900 dark:text-slate-100 mt-0.5">
                                        {emp?.email || user?.email || 'N/A'}
                                    </Text>
                                </View>
                            </View>

                            <View className="h-[1px] bg-slate-100 dark:bg-slate-800 my-2" />

                            <View className="flex-row items-center py-2">
                                <Building2 color="#10B981" size={18} />
                                <View className="ml-3 flex-1">
                                    <Text className="text-[11px] text-slate-400">Department</Text>
                                    <Text className="text-sm font-semibold text-slate-900 dark:text-slate-100 mt-0.5">
                                        {emp?.department?.name || emp?.department || user?.department || 'General'}
                                    </Text>
                                </View>
                            </View>

                            <View className="h-[1px] bg-slate-100 dark:bg-slate-800 my-2" />

                            <View className="flex-row items-center py-2">
                                <MapPin color="#F59E0B" size={18} />
                                <View className="ml-3 flex-1">
                                    <Text className="text-[11px] text-slate-400">Branch Office</Text>
                                    <Text className="text-sm font-semibold text-slate-900 dark:text-slate-100 mt-0.5">
                                        {emp?.branch?.name || emp?.branch || 'Headquarters'}
                                    </Text>
                                </View>
                            </View>

                            <View className="h-[1px] bg-slate-100 dark:bg-slate-800 my-2" />

                            <View className="flex-row items-center py-2">
                                <Calendar color="#8B5CF6" size={18} />
                                <View className="ml-3 flex-1">
                                    <Text className="text-[11px] text-slate-400">Date of Joining</Text>
                                    <Text className="text-sm font-semibold text-slate-900 dark:text-slate-100 mt-0.5">
                                        {emp?.date_of_joining || emp?.doj || 'N/A'}
                                    </Text>
                                </View>
                            </View>
                        </View>

                        {/* Emergency Contact */}
                        {(emp?.emergency_contact_name || emp?.phone) && (
                            <>
                                <Text className="text-base font-bold text-slate-900 dark:text-slate-100 mb-3">
                                    Contact & Emergency Info
                                </Text>
                                <View className="bg-white dark:bg-slate-900 rounded-2xl p-4 mb-6 border border-slate-200 dark:border-slate-800 shadow-md">
                                    {emp?.phone && (
                                        <View className="flex-row items-center py-2">
                                            <Phone color="#10B981" size={18} />
                                            <View className="ml-3 flex-1">
                                                <Text className="text-[11px] text-slate-400">Phone Number</Text>
                                                <Text className="text-sm font-semibold text-slate-900 dark:text-slate-100 mt-0.5">
                                                    {emp.phone}
                                                </Text>
                                            </View>
                                        </View>
                                    )}

                                    {emp?.emergency_contact_name && (
                                        <>
                                            <View className="h-[1px] bg-slate-100 dark:bg-slate-800 my-2" />
                                            <View className="flex-row items-center py-2">
                                                <ShieldAlert color="#EF4444" size={18} />
                                                <View className="ml-3 flex-1">
                                                    <Text className="text-[11px] text-slate-400">Emergency Contact</Text>
                                                    <Text className="text-sm font-semibold text-slate-900 dark:text-slate-100 mt-0.5">
                                                        {emp.emergency_contact_name} ({emp.emergency_contact_relationship || 'Contact'})
                                                    </Text>
                                                </View>
                                            </View>
                                        </>
                                    )}
                                </View>
                            </>
                        )}

                        {/* Sign Out Button */}
                        <TouchableOpacity
                            className="flex-row justify-center items-center bg-red-500/10 border border-red-500/30 h-13 rounded-2xl py-3.5 mt-2 active:opacity-80"
                            onPress={handleLogout}
                        >
                            <LogOut color="#EF4444" size={20} />
                            <Text className="text-red-500 font-bold text-base ml-2">Sign Out of Account</Text>
                        </TouchableOpacity>
                    </>
                )}
            </ScrollView>
        </SafeAreaView>
    );
};
