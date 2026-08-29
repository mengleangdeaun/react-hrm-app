import React from 'react';
import { View, TouchableOpacity, StyleSheet } from 'react-native';
import { AppText as Text } from '../components/AppText';
import { createBottomTabNavigator, type BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { getFocusedRouteNameFromRoute } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import {
    Home,
    CalendarDays,
    QrCode,
    Bell,
    User,
} from 'lucide-react-native';

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
import { OnboardingScreen } from '../screens/onboarding/OnboardingScreen';

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
            <Stack.Screen name="OnboardingTour" component={OnboardingScreen} />
        </Stack.Navigator>
    );
}

import { useTranslation } from '../context/LanguageContext';

const TAB_CONFIGS: Record<string, { key: string; fallback: string; icon: any; isHero?: boolean }> = {
    HomeTab: {
        key: 'nav_home',
        fallback: 'Home',
        icon: Home,
    },
    CalendarTab: {
        key: 'calendar',
        fallback: 'Calendar',
        icon: CalendarDays,
    },
    ScanTab: {
        key: 'scan',
        fallback: 'Scan',
        icon: QrCode,
        isHero: true,
    },
    NotiTab: {
        key: 'nav_notices',
        fallback: 'Notices',
        icon: Bell,
    },
    ProfileTab: {
        key: 'nav_profile',
        fallback: 'Profile',
        icon: User,
    },
};

function CustomTabBar({ state, descriptors, navigation }: any) {
    const insets = useSafeAreaInsets();
    const { isDark } = useAppTheme();
    const { t } = useTranslation();
    const theme = isDark ? darkTheme : lightTheme;

    const backgroundColor = theme.colors.surface;
    const borderTopColor = isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.06)';
    const activeColor = theme.colors.brand;
    const inactiveColor = theme.colors.textSecondary;

    const bottomPadding = insets.bottom > 0 ? insets.bottom : 8;
    const containerHeight = 56 + bottomPadding;

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

    if (isSubScreenActive) {
        return null;
    }

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
                const isFocused = state.index === index;
                const config = TAB_CONFIGS[route.name] || {
                    key: route.name,
                    fallback: route.name,
                    icon: Home,
                };
                const tabLabel = t(config.key, config.fallback);
                const IconComponent = config.icon;

                const onPress = () => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
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

                // Elevated Hero Button for Center Scan Tab
                if (config.isHero) {
                    return (
                        <TouchableOpacity
                            key={route.key}
                            accessibilityRole="button"
                            accessibilityState={isFocused ? { selected: true } : {}}
                            onPress={onPress}
                            onLongPress={onLongPress}
                            style={styles.heroTabButton}
                            activeOpacity={0.85}
                        >
                            <View
                                style={[
                                    styles.heroIconCircle,
                                    {
                                        backgroundColor: activeColor,
                                        shadowColor: activeColor,
                                    },
                                ]}
                            >
                                <IconComponent color="#FFFFFF" size={22} strokeWidth={2.4} />
                            </View>
                            <Text
                                variant="nav"
                                weight="bold"
                                style={[
                                    styles.heroTabLabel,
                                    { color: isFocused ? activeColor : inactiveColor },
                                ]}
                            >
                                {tabLabel}
                            </Text>
                        </TouchableOpacity>
                    );
                }

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
                        <View style={styles.tabIconWrapper}>
                            <IconComponent
                                size={21}
                                color={isFocused ? activeColor : inactiveColor}
                                strokeWidth={isFocused ? 2.3 : 1.8}
                            />
                        </View>
                        <Text
                            variant="nav"
                            weight={isFocused ? 'bold' : 'medium'}
                            style={[
                                styles.tabLabel,
                                {
                                    color: isFocused ? activeColor : inactiveColor,
                                },
                            ]}
                            numberOfLines={1}
                        >
                            {tabLabel}
                        </Text>
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
        borderTopWidth: StyleSheet.hairlineWidth,
        elevation: 8,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -2 },
        shadowOpacity: 0.04,
        shadowRadius: 6,
        alignItems: 'center',
    },
    tabButton: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        height: '100%',
        paddingTop: 4,
    },
    tabIconWrapper: {
        height: 26,
        justifyContent: 'center',
        alignItems: 'center',
    },
    tabLabel: {
        fontSize: 10,
        marginTop: 2,
    },
    heroTabButton: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: -16,
    },
    heroIconCircle: {
        width: 48,
        height: 48,
        borderRadius: 24,
        justifyContent: 'center',
        alignItems: 'center',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.35,
        shadowRadius: 8,
        elevation: 6,
    },
    heroTabLabel: {
        fontSize: 10,
        marginTop: 4,
    },
});
