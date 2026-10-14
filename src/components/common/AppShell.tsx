import React from 'react';
import {
    View,
    ScrollView,
    StatusBar,
    RefreshControl,
    KeyboardAvoidingView,
    Platform,
} from 'react-native';
import { StyleSheet, useUnistyles } from 'react-native-unistyles';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
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
    const { theme } = useUnistyles();
    const styles = stylesheet;

    const hasHeader = showHeader && (title || onBack || onClose || headerRight);
    const topInset = includeTopInset ? insets.top : 0;
    const bottomInset = includeBottomInset ? (hasTabBar ? 0 : insets.bottom) : 0;

    const defaultOffset = Platform.OS === 'ios' ? (hasHeader ? 12 : 0) : 0;
    const verticalOffset = keyboardVerticalOffset !== undefined ? keyboardVerticalOffset : defaultOffset;

    const footerBottomPadding = Math.max(insets.bottom, Platform.OS === 'ios' ? 16 : 12) + (Platform.OS === 'ios' ? 12 : 16);

    const isDark = theme.colors.background === '#121212';

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
        <View style={[styles.safeArea, { paddingTop: topInset }, style]}>
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

            {keyboardAvoiding && !scrollable ? (
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

const stylesheet = StyleSheet.create((theme) => ({
    safeArea: {
        flex: 1,
        backgroundColor: theme.colors.background,
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
        paddingHorizontal: theme.spacing.screenGutter,
        paddingTop: 12,
        paddingBottom: 24,
    },
    fixedContainer: {
        flex: 1,
    },
    fixedFooter: {
        backgroundColor: theme.colors.background,
        borderTopWidth: 1,
        borderTopColor: theme.colors.border,
        paddingHorizontal: 16,
        paddingTop: 12,
        width: '100%',
    },
}));

