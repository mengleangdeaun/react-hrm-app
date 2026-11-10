import React from 'react';
import { View, Pressable, Platform } from 'react-native';
import { StyleSheet, useUnistyles } from 'react-native-unistyles';
import { AppText as Text } from '../components/AppText';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { getFocusedRouteNameFromRoute } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import * as Haptics from 'expo-haptics';
import {
    Home,
    CalendarDays,
    QrCode,
    Bell,
    User,
    Coffee,
    Moon,
    Sun,
    CheckCircle2,
} from 'lucide-react-native';

import { useAttendanceGuard } from '../hooks/useAttendanceGuard';
import { useTranslation } from '../context/LanguageContext';
import { apiClient } from '../api/client';
import { queryKeys } from '../api/queryKeys';

// Screens
// Only the first screen of each tab is imported eagerly. Everything else is resolved through
// `getComponent`, so its module (and its imports) is evaluated the first time the user opens it
// instead of during app start. On 2-3 GB Android devices this removes most of the JS work
// between the splash screen and the first interactive dashboard frame.
import { DashboardScreen } from '../features/dashboard/screens/DashboardScreen';

const lazyScreens = {
    ScanAttendance: () => require('../features/attendance/screens/ScanAttendanceScreen').ScanAttendanceScreen,
    History: () => require('../features/attendance/screens/HistoryScreen').HistoryScreen,
    ScheduleCalendar: () => require('../features/calendar/screens/ScheduleCalendarScreen').ScheduleCalendarScreen,
    Profile: () => require('../features/profile/screens/ProfileScreen').ProfileScreen,
    Settings: () => require('../features/profile/screens/SettingsScreen').SettingsScreen,
    LeaveList: () => require('../features/leave/screens/LeaveListScreen').LeaveListScreen,
    CreateLeave: () => require('../features/leave/screens/CreateLeaveScreen').CreateLeaveScreen,
    DayOff: () => require('../features/leave/screens/DayOffScreen').DayOffScreen,
    ActivityList: () => require('../features/activity/screens/ActivityListScreen').ActivityListScreen,
    CreateActivity: () => require('../features/activity/screens/CreateActivityScreen').CreateActivityScreen,
    SubordinateNotices: () => require('../features/notices/screens/SubordinateNoticesScreen').SubordinateNoticesScreen,
    Feedback: () => require('../features/notices/screens/FeedbackScreen').FeedbackScreen,
    NotificationList: () => require('../features/notifications/screens/NotificationListScreen').NotificationListScreen,
    AnnouncementDetail: () => require('../features/notifications/screens/AnnouncementDetailScreen').AnnouncementDetailScreen,
    CelebrationWish: () => require('../features/celebrations/screens/CelebrationWishScreen').CelebrationWishScreen,
    WishesInbox: () => require('../features/celebrations/screens/WishesInboxScreen').WishesInboxScreen,
    QuizList: () => require('../features/quizzes/screens/QuizListScreen').QuizListScreen,
    TakeQuiz: () => require('../features/quizzes/screens/TakeQuizScreen').TakeQuizScreen,
    QuizResult: () => require('../features/quizzes/screens/QuizResultScreen').QuizResultScreen,
    Onboarding: () => require('../screens/onboarding/OnboardingScreen').OnboardingScreen,
} as const;

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

/**
 * `freezeOnBlur` stops React from re-rendering screens that are covered by another screen or sit
 * in a background tab (query refetches, 30s clock ticks, theme changes), which is where most
 * wasted work happened on slow CPUs. State is preserved; rendering resumes on focus.
 */
function useStackScreenOptions() {
    const { theme } = useUnistyles();
    return React.useMemo(
        () => ({
            headerShown: false,
            freezeOnBlur: true,
            contentStyle: { backgroundColor: theme.colors.background },
        }),
        [theme.colors.background]
    );
}

function DashboardStack() {
    const screenOptions = useStackScreenOptions();
    return (
        <Stack.Navigator screenOptions={screenOptions}>
            <Stack.Screen name="DashboardMain" component={DashboardScreen} />
            <Stack.Screen name="History" getComponent={lazyScreens.History} />
            <Stack.Screen name="LeaveList" getComponent={lazyScreens.LeaveList} />
            <Stack.Screen name="CreateLeave" getComponent={lazyScreens.CreateLeave} />
            <Stack.Screen name="DayOff" getComponent={lazyScreens.DayOff} />
            <Stack.Screen name="ActivityList" getComponent={lazyScreens.ActivityList} />
            <Stack.Screen name="CreateActivity" getComponent={lazyScreens.CreateActivity} />
            <Stack.Screen name="SubordinateNotices" getComponent={lazyScreens.SubordinateNotices} />
            <Stack.Screen name="Feedback" getComponent={lazyScreens.Feedback} />
            <Stack.Screen name="Notifications" getComponent={lazyScreens.NotificationList} />
            <Stack.Screen name="AnnouncementDetail" getComponent={lazyScreens.AnnouncementDetail} />
            <Stack.Screen name="CelebrationWish" getComponent={lazyScreens.CelebrationWish} />
            <Stack.Screen name="WishesInbox" getComponent={lazyScreens.WishesInbox} />
            <Stack.Screen name="QuizList" getComponent={lazyScreens.QuizList} />
            <Stack.Screen name="TakeQuiz" getComponent={lazyScreens.TakeQuiz} />
            <Stack.Screen name="QuizResult" getComponent={lazyScreens.QuizResult} />
        </Stack.Navigator>
    );
}

function CalendarStack() {
    const screenOptions = useStackScreenOptions();
    return (
        <Stack.Navigator screenOptions={screenOptions}>
            <Stack.Screen name="ScheduleCalendarMain" getComponent={lazyScreens.ScheduleCalendar} />
            <Stack.Screen name="CreateLeave" getComponent={lazyScreens.CreateLeave} />
            <Stack.Screen name="LeaveList" getComponent={lazyScreens.LeaveList} />
        </Stack.Navigator>
    );
}

function NotificationStack() {
    const screenOptions = useStackScreenOptions();
    return (
        <Stack.Navigator screenOptions={screenOptions}>
            <Stack.Screen name="NotificationList" getComponent={lazyScreens.NotificationList} />
            <Stack.Screen name="AnnouncementDetail" getComponent={lazyScreens.AnnouncementDetail} />
            <Stack.Screen name="LeaveList" getComponent={lazyScreens.LeaveList} />
            <Stack.Screen name="CreateLeave" getComponent={lazyScreens.CreateLeave} />
            <Stack.Screen name="WishesInbox" getComponent={lazyScreens.WishesInbox} />
            <Stack.Screen name="CelebrationWish" getComponent={lazyScreens.CelebrationWish} />
            <Stack.Screen name="QuizList" getComponent={lazyScreens.QuizList} />
            <Stack.Screen name="TakeQuiz" getComponent={lazyScreens.TakeQuiz} />
            <Stack.Screen name="QuizResult" getComponent={lazyScreens.QuizResult} />
        </Stack.Navigator>
    );
}

function ProfileStack() {
    const screenOptions = useStackScreenOptions();
    return (
        <Stack.Navigator screenOptions={screenOptions}>
            <Stack.Screen name="ProfileMain" getComponent={lazyScreens.Profile} />
            <Stack.Screen name="Settings" getComponent={lazyScreens.Settings} />
            <Stack.Screen name="OnboardingTour" getComponent={lazyScreens.Onboarding} />
            <Stack.Screen name="AppTour" getComponent={lazyScreens.Onboarding} />
        </Stack.Navigator>
    );
}

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
    const { theme } = useUnistyles();
    const styles = stylesheet;
    const { t } = useTranslation();
    const { shiftPhase, isSplitShift } = useAttendanceGuard();

    // Fetch unread count for badge parity
    const { data: bootstrapData } = useQuery({
        queryKey: queryKeys.dashboard.bootstrap,
        queryFn: async () => {
            const res = await apiClient.get('/employee-app/bootstrap');
            return res.data;
        },
        staleTime: 1000 * 60 * 5,
    });

    const unreadCount = typeof (bootstrapData?.notifications?.unread_count ?? bootstrapData?.unread_notifications_count) === 'number'
        ? (bootstrapData?.notifications?.unread_count ?? bootstrapData?.unread_notifications_count)
        : 0;

    const activeColor = theme.colors.brand;
    const inactiveColor = theme.colors.textSecondary;

    // Generous bottom clearance above navigation bars across iOS & Android
    const bottomPadding = Math.max(insets.bottom, Platform.OS === 'ios' ? 16 : 12) + (Platform.OS === 'ios' ? 6 : 8);
    const containerHeight = 52 + bottomPadding;

    const activeRoute = state.routes[state.index];
    const activeSubRouteName = getFocusedRouteNameFromRoute(activeRoute);

    // Immersive full-screen camera canvas on ScanTab (no colliding bottom tab bar)
    if (activeRoute?.name === 'ScanTab') {
        return null;
    }

    const mainTabScreens = [
        'DashboardMain',
        'ScheduleCalendarMain',
        'ScheduleCalendarScreen',
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

                // Elevated Hero Center Button
                if (config.isHero) {
                    let HeroIcon = IconComponent;
                    let dynamicHeroLabel = tabLabel;
                    let heroColor: string = activeColor;

                    if (shiftPhase === 'session1') {
                        HeroIcon = isSplitShift ? Coffee : Moon;
                        dynamicHeroLabel = isSplitShift ? t('lunch', 'Lunch') : t('clock_out', 'Out');
                        heroColor = activeColor;
                    } else if (shiftPhase === 'break') {
                        HeroIcon = Sun;
                        dynamicHeroLabel = t('back_in', 'Back');
                        heroColor = theme.colors.solid.warning;
                    } else if (shiftPhase === 'session2') {
                        HeroIcon = Moon;
                        dynamicHeroLabel = t('clock_out', 'Out');
                        heroColor = activeColor;
                    } else if (shiftPhase === 'done') {
                        HeroIcon = CheckCircle2;
                        dynamicHeroLabel = t('completed', 'Done');
                        heroColor = theme.colors.solid.success;
                    }

                    return (
                        <Pressable
                            key={route.key}
                            accessibilityRole="button"
                            accessibilityLabel={dynamicHeroLabel}
                            accessibilityState={isFocused ? { selected: true } : {}}
                            onPress={onPress}
                            onLongPress={onLongPress}
                            style={({ pressed }: { pressed: boolean }) => [
                                styles.heroTabButton,
                                pressed && { opacity: 0.85, transform: [{ scale: 0.96 }] },
                            ]}
                        >
                            <View
                                style={[
                                    styles.heroIconCircle,
                                    {
                                        backgroundColor: heroColor,
                                        shadowColor: heroColor,
                                    },
                                ]}
                            >
                                <HeroIcon color={theme.colors.onSolid} size={24} strokeWidth={2.4} />
                            </View>
                            <Text
                                variant="nav"
                                weight="bold"
                                style={[
                                    styles.heroTabLabel,
                                    { color: isFocused ? heroColor : inactiveColor },
                                ]}
                            >
                                {dynamicHeroLabel}
                            </Text>
                        </Pressable>
                    );
                }

                const showBadge = route.name === 'NotiTab' && unreadCount > 0;

                return (
                    <Pressable
                        key={route.key}
                        accessibilityRole="tab"
                        accessibilityLabel={showBadge ? `${tabLabel}, ${unreadCount}` : tabLabel}
                        accessibilityState={isFocused ? { selected: true } : {}}
                        onPress={onPress}
                        onLongPress={onLongPress}
                        style={({ pressed }: { pressed: boolean }) => [
                            styles.tabButton,
                            pressed && { opacity: 0.7 },
                        ]}
                    >
                        <View style={styles.tabIconWrapper}>
                            <IconComponent
                                size={21}
                                color={isFocused ? activeColor : inactiveColor}
                                strokeWidth={isFocused ? 2.3 : 1.8}
                            />
                            {showBadge && (
                                <View style={styles.badge}>
                                    <Text style={styles.badgeText}>
                                        {unreadCount > 9 ? '9+' : unreadCount}
                                    </Text>
                                </View>
                            )}
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
                    </Pressable>
                );
            })}
        </View>
    );
}

const MemoizedCustomTabBar = React.memo(CustomTabBar);

const renderTabBar = (props: any) => <MemoizedCustomTabBar {...props} />;

export function MainTabNavigator() {
    const { theme } = useUnistyles();
    return (
        <Tab.Navigator
            tabBar={renderTabBar}
            screenOptions={{
                headerShown: false,
                freezeOnBlur: true,
                sceneStyle: { backgroundColor: theme.colors.background },
            }}
        >
            <Tab.Screen name="HomeTab" component={DashboardStack} />
            <Tab.Screen name="CalendarTab" component={CalendarStack} />
            <Tab.Screen
                name="ScanTab"
                getComponent={lazyScreens.ScanAttendance}
                options={{
                    tabBarStyle: { display: 'none' },
                    // Never frozen: the screen must always get its blur render so the camera is released
                    freezeOnBlur: false,
                }}
            />
            <Tab.Screen name="NotiTab" component={NotificationStack} />
            <Tab.Screen name="ProfileTab" component={ProfileStack} />
        </Tab.Navigator>
    );
}

const stylesheet = StyleSheet.create((theme) => ({
    tabBarContainer: {
        flexDirection: 'row',
        backgroundColor: theme.colors.surface,
        borderTopWidth: 1,
        borderTopColor: theme.colors.border,
        alignItems: 'center',
        ...Platform.select({
            ios: {
                shadowColor: theme.colors.shadow,
                shadowOffset: { width: 0, height: -2 },
                shadowOpacity: 0.05,
                shadowRadius: 5,
            },
            android: {
                elevation: 8,
            },
        }),
    },
    tabButton: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        height: '100%',
        paddingTop: 6,
    },
    tabIconWrapper: {
        height: 26,
        justifyContent: 'center',
        alignItems: 'center',
        position: 'relative',
    },
    badge: {
        position: 'absolute',
        top: -3,
        right: -8,
        minWidth: 16,
        height: 16,
        borderRadius: 8,
        backgroundColor: theme.colors.solid.danger,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 3,
        borderWidth: 1.5,
        borderColor: theme.colors.surface,
    },
    badgeText: {
        color: theme.colors.onSolid,
        fontSize: 9,
        fontWeight: '800',
        lineHeight: 11,
    },
    tabLabel: {
        fontSize: 10.5,
        marginTop: 3,
        includeFontPadding: false,
    },
    heroTabButton: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: -18,
    },
    heroIconCircle: {
        width: 52,
        height: 52,
        borderRadius: 26,
        justifyContent: 'center',
        alignItems: 'center',
        ...Platform.select({
            ios: {
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.28,
                shadowRadius: 6,
            },
            android: {
                elevation: 4,
            },
        }),
    },
    heroTabLabel: {
        fontSize: 10.5,
        marginTop: 4,
        includeFontPadding: false,
    },
}));