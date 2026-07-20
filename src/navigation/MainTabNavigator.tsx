import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { LayoutDashboard, QrCode, Calendar, Clock, User as UserIcon } from 'lucide-react-native';

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

function ProfileStack() {
    return (
        <Stack.Navigator screenOptions={{ headerShown: false }}>
            <Stack.Screen name="ProfileMain" component={ProfileScreen} />
            <Stack.Screen name="Settings" component={SettingsScreen} />
        </Stack.Navigator>
    );
}

export function MainTabNavigator() {
    return (
        <Tab.Navigator
            screenOptions={{
                headerShown: false,
                tabBarActiveTintColor: '#2563EB',
                tabBarInactiveTintColor: '#64748B',
                tabBarStyle: {
                    backgroundColor: '#1E293B',
                    borderTopColor: '#334155',
                    height: 65,
                    paddingBottom: 10,
                    paddingTop: 8,
                },
                tabBarLabelStyle: {
                    fontSize: 12,
                    fontWeight: '600',
                },
            }}
        >
            <Tab.Screen
                name="HomeTab"
                component={DashboardStack}
                options={{
                    tabBarLabel: 'Home',
                    tabBarIcon: ({ color, size }: { color: string; size: number }) => <LayoutDashboard color={color} size={size} />,
                }}
            />
            <Tab.Screen
                name="ScanTab"
                component={ScanAttendanceScreen}
                options={{
                    tabBarLabel: 'Clock In',
                    tabBarIcon: ({ color, size }: { color: string; size: number }) => <QrCode color={color} size={size + 4} />,
                }}
            />
            <Tab.Screen
                name="HistoryTab"
                component={HistoryScreen}
                options={{
                    tabBarLabel: 'History',
                    tabBarIcon: ({ color, size }: { color: string; size: number }) => <Clock color={color} size={size} />,
                }}
            />
            <Tab.Screen
                name="CalendarTab"
                component={ScheduleCalendarScreen}
                options={{
                    tabBarLabel: 'Schedule',
                    tabBarIcon: ({ color, size }: { color: string; size: number }) => <Calendar color={color} size={size} />,
                }}
            />
            <Tab.Screen
                name="ProfileTab"
                component={ProfileStack}
                options={{
                    tabBarLabel: 'Profile',
                    tabBarIcon: ({ color, size }: { color: string; size: number }) => <UserIcon color={color} size={size} />,
                }}
            />
        </Tab.Navigator>
    );
}
