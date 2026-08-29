import React from 'react';
import {
    View,
    ScrollView,
    StatusBar,
    StyleSheet,
    RefreshControl,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAppTheme } from '../../context/ThemeContext';
import { lightTheme, darkTheme } from '../../styles/theme';
import { OfflineBanner } from './OfflineBanner';
import { AppHeader } from './AppHeader';

interface AppShellProps {
    children: React.ReactNode;
    title?: string;
    subtitle?: string;
    onBack?: () => void;
    onClose?: () => void;
    headerRight?: React.ReactNode;
    subHeader?: React.ReactNode;
    scrollable?: boolean;
    refreshing?: boolean;
    onRefresh?: () => void;
    style?: any;
    contentContainerStyle?: any;
    showHeader?: boolean;
    includeTopInset?: boolean;
    includeBottomInset?: boolean;
    onScroll?: (event: any) => void;
    scrollEventThrottle?: number;
}

export const AppShell: React.FC<AppShellProps> = ({
    children,
    title,
    subtitle,
    onBack,
    onClose,
    headerRight,
    subHeader,
    scrollable = true,
    refreshing = false,
    onRefresh,
    style,
    contentContainerStyle,
    showHeader = true,
    includeTopInset = true,
    includeBottomInset = true,
    onScroll,
    scrollEventThrottle = 16,
}) => {
    const insets = useSafeAreaInsets();
    const { isDark } = useAppTheme();
    const theme = isDark ? darkTheme : lightTheme;

    const hasHeader = showHeader && (title || onBack || onClose || headerRight);
    const topInset = includeTopInset ? insets.top : 0;
    const bottomInset = includeBottomInset ? insets.bottom : 0;

    return (
        <View style={[styles.safeArea, { paddingTop: topInset, backgroundColor: theme.colors.background }, style]}>
            <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor={theme.colors.background} />

            <OfflineBanner />

            {hasHeader && (
                <View style={styles.headerWrapper}>
                    {title || onBack || onClose ? (
                        <AppHeader
                            title={title || ''}
                            subtitle={subtitle}
                            onBack={onBack}
                            onClose={onClose}
                            rightActions={[]}
                        />
                    ) : null}
                    {headerRight && <View style={styles.customHeaderRight}>{headerRight}</View>}
                </View>
            )}

            {subHeader && <View style={styles.subHeaderContainer}>{subHeader}</View>}

            {scrollable ? (
                <ScrollView
                    style={styles.scrollContainer}
                    contentContainerStyle={[
                        styles.scrollContent,
                        { paddingBottom: Math.max(32, bottomInset + 16) },
                        contentContainerStyle,
                    ]}
                    onScroll={onScroll}
                    scrollEventThrottle={scrollEventThrottle}
                    refreshControl={
                        onRefresh ? (
                            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.colors.brand} />
                        ) : undefined
                    }
                >
                    {children}
                </ScrollView>
            ) : (
                <View style={[styles.fixedContainer, { paddingBottom: bottomInset }, contentContainerStyle]}>
                    {children}
                </View>
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    safeArea: {
        flex: 1,
    },
    headerWrapper: {
        position: 'relative',
    },
    customHeaderRight: {
        position: 'absolute',
        right: 16,
        top: 7,
        zIndex: 20,
    },
    subHeaderContainer: {
        zIndex: 10,
    },
    scrollContainer: {
        flex: 1,
    },
    scrollContent: {
        flexGrow: 1,
        paddingHorizontal: 16,
        paddingTop: 12,
        paddingBottom: 32,
    },
    fixedContainer: {
        flex: 1,
        paddingHorizontal: 16,
    },
});
