import React from 'react';
import {
    View,
    Text,
    ScrollView,
    TouchableOpacity,
    StatusBar,
    StyleSheet,
    RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft } from 'lucide-react-native';
import { useAppTheme } from '../../context/ThemeContext';
import { lightTheme, darkTheme } from '../../styles/theme';
import { OfflineBanner } from './OfflineBanner';

interface AppShellProps {
    children: React.ReactNode;
    title?: string;
    onBack?: () => void;
    headerRight?: React.ReactNode;
    subHeader?: React.ReactNode;
    scrollable?: boolean;
    refreshing?: boolean;
    onRefresh?: () => void;
    style?: any;
    contentContainerStyle?: any;
    showHeader?: boolean;
    onScroll?: (event: any) => void;
    scrollEventThrottle?: number;
}

export const AppShell: React.FC<AppShellProps> = ({
    children,
    title,
    onBack,
    headerRight,
    subHeader,
    scrollable = true,
    refreshing = false,
    onRefresh,
    style,
    contentContainerStyle,
    showHeader = true,
    onScroll,
    scrollEventThrottle = 16,
}) => {
    const { isDark } = useAppTheme();
    const theme = isDark ? darkTheme : lightTheme;

    const hasHeader = showHeader && (title || onBack || headerRight);

    return (
        <SafeAreaView {...({ style: [styles.safeArea, { backgroundColor: theme.colors.background }, style] } as any)}>
            <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor={theme.colors.background} />

            <OfflineBanner />

            {hasHeader && (
                <View style={styles.headerRow}>
                    <View style={styles.headerLeft}>
                        {onBack && (
                            <TouchableOpacity
                                style={[styles.backButton, { backgroundColor: theme.colors.surfaceSubtle, borderColor: theme.colors.border }]}
                                onPress={onBack}
                                activeOpacity={0.7}
                            >
                                <ArrowLeft color={theme.colors.textPrimary} size={18} />
                            </TouchableOpacity>
                        )}
                        {title && (
                            <Text style={[styles.headerTitle, { color: theme.colors.textPrimary }]} numberOfLines={1}>
                                {title}
                            </Text>
                        )}
                    </View>
                    {headerRight && <View style={styles.headerRight}>{headerRight}</View>}
                </View>
            )}

            {subHeader && <View style={styles.subHeaderContainer}>{subHeader}</View>}

            {scrollable ? (
                <ScrollView
                    style={styles.scrollContainer}
                    contentContainerStyle={[styles.scrollContent, contentContainerStyle]}
                    onScroll={onScroll}
                    scrollEventThrottle={scrollEventThrottle}
                    refreshControl={
                        onRefresh ? (
                            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.colors.primary} />
                        ) : undefined
                    }
                >
                    {children}
                </ScrollView>
            ) : (
                <View style={[styles.fixedContainer, contentContainerStyle]}>{children}</View>
            )}
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    safeArea: {
        flex: 1,
    },
    headerRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingVertical: 12,
    },
    headerLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
    },
    backButton: {
        width: 36,
        height: 36,
        borderRadius: 50,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
        borderWidth: 1,
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: '700',
        flex: 1,
    },
    headerRight: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    subHeaderContainer: {
        zIndex: 10,
    },
    scrollContainer: {
        flex: 1,
    },
    scrollContent: {
        paddingHorizontal: 16,
        paddingBottom: 24,
    },
    fixedContainer: {
        flex: 1,
        paddingHorizontal: 16,
    },
});
