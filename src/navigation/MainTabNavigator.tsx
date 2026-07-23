import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { createBottomTabNavigator, type BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { getFocusedRouteNameFromRoute } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAppTheme } from '../context/ThemeContext';
import { lightTheme, darkTheme } from '../styles/theme';

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

const TAB_CONFIGS: Record<string, { label: string; icon: keyof typeof Ionicons.glyphMap; focusedIcon: keyof typeof Ionicons.glyphMap }> = {
    HomeTab: { label: 'Home', icon: 'home-outline', focusedIcon: 'home' },
    CalendarTab: { label: 'Calendar', icon: 'calendar-outline', focusedIcon: 'calendar' },
    ScanTab: { label: 'Scan', icon: 'qr-code-outline', focusedIcon: 'qr-code' },
    NotiTab: { label: 'Noti', icon: 'notifications-outline', focusedIcon: 'notifications' },
    ProfileTab: { label: 'Profile', icon: 'person-outline', focusedIcon: 'person' },
};

function CustomTabBar({ state, descriptors, navigation }: any) {
    const insets = useSafeAreaInsets();
    const { isDark } = useAppTheme();
    const theme = isDark ? darkTheme : lightTheme;

    const backgroundColor = theme.colors.surface;
    const borderTopColor = theme.colors.border;
    const activeColor = theme.colors.primary;
    const inactiveColor = theme.colors.textSecondary;

    const bottomPadding = insets.bottom > 0 ? insets.bottom : 6;
    const containerHeight = 54 + bottomPadding;

    const activeRoute = state.routes[state.index];
    const activeSubRouteName = getFocusedRouteNameFromRoute(activeRoute);

    const mainTabScreens = [
        'DashboardMain',
        'ScheduleCalendarScreen',
        'ScanAttendanceScreen',
        'NotificationList',
        'ProfileMain',
    ];
    const isSubScreenActive = activeSubRouteName ? !mainTabScreens.includes(activeSubRouteName) : false;

    return (
        <View
            style={[
                styles.tabBarContainer,
                {
                    backgroundColor,
                    borderTopColor,
                    height: containerHeight,
                    paddingBottom: bottomPadding,
                },
            ]}
        >
            {state.routes.map((route: any, index: number) => {
                const isFocused = state.index === index && !isSubScreenActive;
                const config = TAB_CONFIGS[route.name] || {
                    label: route.name,
                    icon: 'square-outline',
                    focusedIcon: 'square',
                };

                const onPress = () => {
                    const event = navigation.emit({
                        type: 'tabPress',
                        target: route.key,
                        canPreventDefault: true,
                    });

                    if (!event.defaultPrevented) {
                        navigation.navigate(route.name);
                    }
                };

                const onLongPress = () => {
                    navigation.emit({
                        type: 'tabLongPress',
                        target: route.key,
                    });
                };

                return (
                    <TouchableOpacity
                        key={route.key}
                        accessibilityRole="button"
                        accessibilityState={isFocused ? { selected: true } : {}}
                        onPress={onPress}
                        onLongPress={onLongPress}
                        style={styles.tabButton}
                        activeOpacity={0.7}
                    >
                        {/* Red Active Indicator Bar Flush at Top (y = 0) */}
                        {isFocused && (
                            <View style={[styles.activeIndicator, { backgroundColor: activeColor }]} />
                        )}

                        <View style={styles.tabContent}>
                            <Ionicons
                                name={isFocused ? config.focusedIcon : config.icon}
                                size={22}
                                color={isFocused ? activeColor : inactiveColor}
                            />
                            <Text
                                style={[
                                    styles.tabLabel,
                                    { color: isFocused ? activeColor : inactiveColor },
                                ]}
                                numberOfLines={1}
                            >
                                {config.label}
                            </Text>
                        </View>
                    </TouchableOpacity>
                );
            })}
        </View>
    );
}

export function MainTabNavigator() {
    return (
        <Tab.Navigator
            tabBar={(props: any) => <CustomTabBar {...props} />}
            screenOptions={{
                headerShown: false,
            }}
        >
            <Tab.Screen name="HomeTab" component={DashboardStack} />
            <Tab.Screen name="CalendarTab" component={ScheduleCalendarScreen} />
            <Tab.Screen name="ScanTab" component={ScanAttendanceScreen} />
            <Tab.Screen name="NotiTab" component={NotificationStack} />
            <Tab.Screen name="ProfileTab" component={ProfileStack} />
        </Tab.Navigator>
    );
}

const styles = StyleSheet.create({
    tabBarContainer: {
        flexDirection: 'row',
        borderTopWidth: 1,
        elevation: 0,
    },
    tabButton: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'flex-start',
        position: 'relative',
        height: '100%',
    },
    activeIndicator: {
        position: 'absolute',
        top: 0,
        width: 32,
        height: 3,
        borderRadius: 0,
        zIndex: 10,
    },
    tabContent: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingTop: 8,
    },
    tabLabel: {
        fontSize: 11,
        fontWeight: '600',
        marginTop: 4,
    },
});
