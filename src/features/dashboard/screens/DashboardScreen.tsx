import React from 'react';
import { View } from 'react-native';
import { AppShell } from '../../../components/common/AppShell';
import { DashboardSkeleton } from '../../../components/common/Skeletons';
import { useAppTheme } from '../../../context/ThemeContext';
import { useDashboardData } from '../hooks/useDashboardData';
import { DashboardHeader } from '../components/DashboardHeader';
import { TopBannerAlert } from '../components/TopBannerAlert';
import { ShiftClockCard } from '../components/ShiftClockCard';
import { QuickActionsGrid } from '../components/QuickActionsGrid';
import { AnnouncementSection } from '../components/AnnouncementSection';
import { CelebrationBanner } from '../components/CelebrationBanner';

export const DashboardScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
    const { toggleTheme } = useAppTheme();
    const {
        isLoading,
        isFetching,
        onRefresh,
        displayName,
        avatarUrl,
        showAvatarImage,
        setAvatarLoadError,
        getGreeting,
        unreadNotifications,
        topBannerAnnouncement,
        handleDismissTopBanner,
        todayDisplayDate,
        locale,
        timelineNodes,
        isSplitShift,
        out1,
        in2,
        out2,
        proactiveStatus,
        shiftPhase,
        quickActions,
        announcements,
        celebration,
    } = useDashboardData();

    // Fixed & Sticky Header Block (Placed outside the scroll container)
    const fixedHeaderBlock = (
        <View style={{ zIndex: 10 }}>
            {topBannerAnnouncement && (
                <TopBannerAlert
                    announcement={topBannerAnnouncement}
                    onView={(id) => navigation.navigate('AnnouncementDetail', { id })}
                    onDismiss={handleDismissTopBanner}
                />
            )}
            <DashboardHeader
                displayName={displayName}
                avatarUrl={avatarUrl}
                showAvatarImage={showAvatarImage}
                greeting={getGreeting()}
                unreadNotifications={unreadNotifications}
                onToggleTheme={toggleTheme}
                onNotificationsPress={() => navigation.navigate('Notifications')}
                onAvatarError={() => setAvatarLoadError(true)}
            />
        </View>
    );

    return (
        <AppShell
            showHeader={false}
            subHeader={fixedHeaderBlock}
            hasTabBar={true}
            refreshing={isFetching && !isLoading}
            onRefresh={onRefresh}
        >
            {isLoading ? (
                <DashboardSkeleton />
            ) : (
                <>
                    {/* Digital Clock & Geofenced Attendance Status Card */}
                    <ShiftClockCard
                        todayDisplayDate={todayDisplayDate}
                        locale={locale}
                        timelineNodes={timelineNodes}
                        isSplitShift={isSplitShift}
                        out1={out1}
                        in2={in2}
                        out2={out2}
                        proactiveStatus={proactiveStatus}
                        shiftPhase={shiftPhase}
                        onScanPress={() => navigation.navigate('ScanTab')}
                    />

                    {/* Dynamic Quick Access Menu */}
                    <QuickActionsGrid
                        actions={quickActions}
                        onActionPress={(route) => navigation.navigate(route)}
                    />

                    {/* Company Announcements Feed */}
                    <AnnouncementSection
                        announcements={announcements}
                        locale={locale}
                        onAnnouncementPress={(id) => navigation.navigate('AnnouncementDetail', { id })}
                    />

                    {/* Celebrations Banner */}
                    <CelebrationBanner
                        celebration={celebration}
                        onPress={() => navigation.navigate('WishesInbox')}
                    />
                </>
            )}
        </AppShell>
    );
};
