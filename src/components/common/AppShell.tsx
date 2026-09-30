import React from 'react';
import {
    View,
    ScrollView,
    StatusBar,
    StyleSheet,
    RefreshControl,
    KeyboardAvoidingView,
    Platform,
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
    footer?: React.ReactNode;
    scrollable?: boolean;
    refreshing?: boolean;
    onRefresh?: () => void;
    style?: any;
    contentContainerStyle?: any;
    showHeader?: boolean;
    includeTopInset?: boolean;
    includeBottomInset?: boolean;
    hasTabBar?: boolean;
    onScroll?: (event: any) => void;
    scrollEventThrottle?: number;
    keyboardAvoiding?: boolean;
    keyboardVerticalOffset?: number;
}

export const AppShell: React.FC<AppShellProps> = ({
    children,
    title,
    subtitle,
    onBack,
    onClose,
    headerRight,
    subHeader,
    footer,
    scrollable = true,
    refreshing = false,
    onRefresh,
    style,
    contentContainerStyle,
    showHeader = true,
    includeTopInset = true,
    includeBottomInset = true,
    hasTabBar = false,
    onScroll,
    scrollEventThrottle = 16,
    keyboardAvoiding = true,
    keyboardVerticalOffset,
}) => {
    const insets = useSafeAreaInsets();
    const { isDark } = useAppTheme();
    const theme = isDark ? darkTheme : lightTheme;

    const hasHeader = showHeader && (title || onBack || onClose || headerRight);
    const topInset = includeTopInset ? insets.top : 0;
    const bottomInset = includeBottomInset ? (hasTabBar ? 0 : insets.bottom) : 0;

    const defaultOffset = Platform.OS === 'ios' ? (hasHeader ? 12 : 0) : 0;
    const verticalOffset = keyboardVerticalOffset !== undefined ? keyboardVerticalOffset : defaultOffset;

    const footerBottomPadding = Math.max(insets.bottom, Platform.OS === 'ios' ? 16 : 12) + (Platform.OS === 'ios' ? 12 : 16);

    const renderContent = () => {
        if (scrollable) {
            return (
                <ScrollView
                    style={styles.scrollContainer}
                    contentContainerStyle={[
                        styles.scrollContent,
                        {
                            paddingBottom: footer
                                ? 100
                                : (hasTabBar ? 16 : Math.max(20, bottomInset + 16)),
                        },
                        contentContainerStyle,
                    ]}
                    keyboardShouldPersistTaps="handled"
                    keyboardDismissMode="on-drag"
                    automaticallyAdjustKeyboardInsets={Platform.OS === 'ios'}
                    showsVerticalScrollIndicator={false}
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
            );
        }

        return (
            <View style={[styles.fixedContainer, contentContainerStyle]}>
                {children}
            </View>
        );
    };

    const renderBody = () => (
        <>
            {renderContent()}
            {footer && (
                <View
                    style={[
                        styles.fixedFooter,
                        {
                            backgroundColor: theme.colors.background,
                            borderTopColor: theme.colors.border,
                            paddingBottom: footerBottomPadding,
                        },
                    ]}
                >
                    {footer}
                </View>
            )}
        </>
    );

    return (
        <View style={[styles.safeArea, { paddingTop: topInset, backgroundColor: theme.colors.background }, style]}>
            <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor={theme.colors.background} />

            <OfflineBanner />

            {hasHeader && (
                <View style={styles.headerWrapper}>
                    <AppHeader
                        title={title || ''}
                        subtitle={subtitle}
                        onBack={onBack}
                        onClose={onClose}
                        headerRight={headerRight}
                    />
                </View>
            )}

            {subHeader && <View style={styles.subHeaderContainer}>{subHeader}</View>}

            {keyboardAvoiding ? (
                <KeyboardAvoidingView
                    style={styles.keyboardAvoidingContainer}
                    behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                    keyboardVerticalOffset={verticalOffset}
                >
                    {renderBody()}
                </KeyboardAvoidingView>
            ) : (
                renderBody()
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
    subHeaderContainer: {
        zIndex: 10,
    },
    keyboardAvoidingContainer: {
        flex: 1,
    },
    scrollContainer: {
        flex: 1,
    },
    scrollContent: {
        flexGrow: 1,
        paddingHorizontal: 16,
        paddingTop: 12,
        paddingBottom: 24,
    },
    fixedContainer: {
        flex: 1,
    },
    fixedFooter: {
        borderTopWidth: 1,
        paddingHorizontal: 16,
        paddingTop: 12,
        width: '100%',
    },
});
