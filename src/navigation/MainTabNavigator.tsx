import React from 'react';
import { View, StyleSheet } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LayoutDashboard, QrCode, Calendar, Bell, User as UserIcon } from 'lucide-react-native';
import { useAppTheme } from '../context/ThemeContext';

// Screens
import { DashboardScreen } from '../screens/dashboard/DashboardScreen';
import { ScanAttendanceScreen } from '../screens/attendance/ScanAttendanceScreen';
import { HistoryScreen } from '../screens/attendance/HistoryScreen';
import { ScheduleCalendarScreen } from '../screens/calendar/ScheduleCalendarScreen';
import { ProfileScreen } from '../screens/profile/ProfileScreen';
import { SettingsScreen } from '../screens/profile/SettingsScreen';
import { LeaveListScreen } from '../screens/leave/LeaveListScreen';
import { CreateLeaveScreen } from '../screens/leave/CreateLeaveScreen';
import { DayOffScreen } from '../screens/leave/DayOffScreen';
import { ActivityListScreen } from '../screens/activity/ActivityListScreen';
import { CreateActivityScreen } from '../screens/activity/CreateActivityScreen';
import { SubordinateNoticesScreen } from '../screens/notices/SubordinateNoticesScreen';
import { FeedbackScreen } from '../screens/notices/FeedbackScreen';
import { NotificationListScreen } from '../screens/notifications/NotificationListScreen';
import { AnnouncementDetailScreen } from '../screens/notifications/AnnouncementDetailScreen';
import { CelebrationWishScreen } from '../screens/celebrations/CelebrationWishScreen';
import { WishesInboxScreen } from '../screens/celebrations/WishesInboxScreen';
import { QuizListScreen } from '../screens/quizzes/QuizListScreen';
import { TakeQuizScreen } from '../screens/quizzes/TakeQuizScreen';
import { QuizResultScreen } from '../screens/quizzes/QuizResultScreen';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

function DashboardStack() {
    return (
        <Stack.Navigator screenOptions={{ headerShown: false }}>
            <Stack.Screen name="DashboardMain" component={DashboardScreen} />
            <Stack.Screen name="History" component={HistoryScreen} />
            <Stack.Screen name="LeaveList" component={LeaveListScreen} />
            <Stack.Screen name="CreateLeave" component={CreateLeaveScreen} />
            <Stack.Screen name="DayOff" component={DayOffScreen} />
            <Stack.Screen name="ActivityList" component={ActivityListScreen} />
            <Stack.Screen name="CreateActivity" component={CreateActivityScreen} />
            <Stack.Screen name="SubordinateNotices" component={SubordinateNoticesScreen} />
            <Stack.Screen name="Feedback" component={FeedbackScreen} />
            <Stack.Screen name="Notifications" component={NotificationListScreen} />
            <Stack.Screen name="AnnouncementDetail" component={AnnouncementDetailScreen} />
            <Stack.Screen name="CelebrationWish" component={CelebrationWishScreen} />
            <Stack.Screen name="WishesInbox" component={WishesInboxScreen} />
            <Stack.Screen name="QuizList" component={QuizListScreen} />
            <Stack.Screen name="TakeQuiz" component={TakeQuizScreen} />
            <Stack.Screen name="QuizResult" component={QuizResultScreen} />
        </Stack.Navigator>
    );
}

function NotificationStack() {
    return (
        <Stack.Navigator screenOptions={{ headerShown: false }}>
            <Stack.Screen name="NotificationList" component={NotificationListScreen} />
            <Stack.Screen name="AnnouncementDetail" component={AnnouncementDetailScreen} />
        </Stack.Navigator>
    );
}

function ProfileStack() {
    return (
        <Stack.Navigator screenOptions={{ headerShown: false }}>
            <Stack.Screen name="ProfileMain" component={ProfileScreen} />
            <Stack.Screen name="Settings" component={SettingsScreen} />
        </Stack.Navigator>
    );
}

interface TabIconProps {
    Icon: any;
    focused: boolean;
    color: string;
    size: number;
    topBarColor: string;
    scanBgInactive: string;
    isScan?: boolean;
}

function TabIconWithTopBar({
    Icon,
    focused,
    color,
    size,
    topBarColor,
    scanBgInactive,
    isScan = false,
}: TabIconProps) {
    return (
        <View style={styles.iconWrapper}>
            {focused && <View style={[styles.activeTopIndicator, { backgroundColor: topBarColor }]} />}
            {isScan ? (
                <View
                    style={[
                        styles.scanIconContainer,
                        { backgroundColor: focused ? topBarColor : scanBgInactive },
                    ]}
                >
                    <Icon color={focused ? '#FFFFFF' : color} size={size} />
                </View>
            ) : (
                <Icon color={color} size={size} />
            )}
        </View>
    );
}

export function MainTabNavigator() {
    const insets = useSafeAreaInsets();
    const { isDark } = useAppTheme();

    const backgroundColor = isDark ? '#0F172A' : '#FFFFFF';
    const borderTopColor = isDark ? '#1E293B' : '#E2E8F0';
    const activeTintColor = isDark ? '#3B82F6' : '#2563EB';
    const inactiveTintColor = isDark ? '#94A3B8' : '#64748B';
    const scanBgInactive = isDark ? '#1E293B' : '#F1F5F9';

    const tabHeight = 58 + (insets.bottom > 0 ? insets.bottom : 8);

    return (
        <Tab.Navigator
            screenOptions={{
                headerShown: false,
                tabBarActiveTintColor: activeTintColor,
                tabBarInactiveTintColor: inactiveTintColor,
                tabBarStyle: {
                    backgroundColor,
                    borderTopColor,
                    borderTopWidth: 1,
                    height: tabHeight,
                    paddingTop: 4,
                    paddingBottom: insets.bottom > 0 ? insets.bottom : 8,
                    elevation: 0,
                    shadowColor: '#000000',
                    shadowOffset: { width: 0, height: -1 },
                    shadowOpacity: isDark ? 0.08 : 0.03,
                    shadowRadius: 2,
                },
                tabBarItemStyle: {
                    paddingTop: 4,
                    paddingBottom: 2,
                },
                tabBarLabelStyle: {
                    fontSize: 11,
                    fontWeight: '600',
                    marginTop: 3,
                    marginBottom: 2,
                },
            }}
        >
            <Tab.Screen
                name="HomeTab"
                component={DashboardStack}
                options={{
                    tabBarLabel: 'Home',
                    tabBarIcon: ({ color, focused, size }) => (
                        <TabIconWithTopBar
                            Icon={LayoutDashboard}
                            focused={focused}
                            color={color}
                            size={size}
                            topBarColor={activeTintColor}
                            scanBgInactive={scanBgInactive}
                        />
                    ),
                }}
            />
            <Tab.Screen
                name="CalendarTab"
                component={ScheduleCalendarScreen}
                options={{
                    tabBarLabel: 'Calendar',
                    tabBarIcon: ({ color, focused, size }) => (
                        <TabIconWithTopBar
                            Icon={Calendar}
                            focused={focused}
                            color={color}
                            size={size}
                            topBarColor={activeTintColor}
                            scanBgInactive={scanBgInactive}
                        />
                    ),
                }}
            />
            <Tab.Screen
                name="ScanTab"
                component={ScanAttendanceScreen}
                options={{
                    tabBarLabel: 'Scan',
                    tabBarIcon: ({ color, focused, size }) => (
                        <TabIconWithTopBar
                            Icon={QrCode}
                            focused={focused}
                            color={color}
                            size={size}
                            topBarColor={activeTintColor}
                            scanBgInactive={scanBgInactive}
                            isScan
                        />
                    ),
                }}
            />
            <Tab.Screen
                name="NotiTab"
                component={NotificationStack}
                options={{
                    tabBarLabel: 'Noti',
                    tabBarIcon: ({ color, focused, size }) => (
                        <TabIconWithTopBar
                            Icon={Bell}
                            focused={focused}
                            color={color}
                            size={size}
                            topBarColor={activeTintColor}
                            scanBgInactive={scanBgInactive}
                        />
                    ),
                }}
            />
            <Tab.Screen
                name="ProfileTab"
                component={ProfileStack}
                options={{
                    tabBarLabel: 'Profile',
                    tabBarIcon: ({ color, focused, size }) => (
                        <TabIconWithTopBar
                            Icon={UserIcon}
                            focused={focused}
                            color={color}
                            size={size}
                            topBarColor={activeTintColor}
                            scanBgInactive={scanBgInactive}
                        />
                    ),
                }}
            />
        </Tab.Navigator>
    );
}

const styles = StyleSheet.create({
    iconWrapper: {
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
    },
    activeTopIndicator: {
        position: 'absolute',
        top: -8,
        width: 30,
        height: 3,
        borderBottomLeftRadius: 3,
        borderBottomRightRadius: 3,
    },
    scanIconContainer: {
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 10,
    },
});
