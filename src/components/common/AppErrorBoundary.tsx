import React from 'react';
import { View, Text, Pressable, StyleSheet, Appearance } from 'react-native';
import { telemetry } from '../../core/telemetry';

interface Props {
    children: React.ReactNode;
}

interface State {
    error: Error | null;
    /** Bumped on retry so the whole subtree remounts with fresh state. */
    resetKey: number;
}

/**
 * Last line of defence against render-time crashes.
 *
 * In a release build an uncaught render error unmounts the entire React tree and leaves the user
 * on a blank screen until they force-quit. This boundary shows a recovery screen instead.
 *
 * It deliberately depends on no context, theme engine or custom font: any of those may be the
 * thing that failed. Copy is bilingual because the saved locale is not available here.
 */
export class AppErrorBoundary extends React.Component<Props, State> {
    state: State = { error: null, resetKey: 0 };

    static getDerivedStateFromError(error: Error): Partial<State> {
        return { error };
    }

    componentDidCatch(error: Error, info: React.ErrorInfo) {
        telemetry.captureException(error, { componentStack: info.componentStack });
    }

    private handleRetry = () => {
        this.setState((prev) => ({ error: null, resetKey: prev.resetKey + 1 }));
    };

    render() {
        if (!this.state.error) {
            return <React.Fragment key={this.state.resetKey}>{this.props.children}</React.Fragment>;
        }

        const isDark = Appearance.getColorScheme() === 'dark';

        return (
            <View style={[styles.container, isDark && styles.containerDark]} accessibilityRole="alert">
                <Text style={[styles.title, isDark && styles.titleDark]}>Something went wrong</Text>
                <Text style={[styles.title, styles.titleSecondary, isDark && styles.titleDark]}>មានបញ្ហាកើតឡើង</Text>
                <Text style={[styles.message, isDark && styles.messageDark]}>
                    The app hit an unexpected error. Your saved data and pending offline records are safe.
                </Text>
                {__DEV__ ? (
                    <Text style={[styles.devDetails, isDark && styles.messageDark]} numberOfLines={6}>
                        {String(this.state.error?.message || this.state.error)}
                    </Text>
                ) : null}
                <Pressable
                    onPress={this.handleRetry}
                    accessibilityRole="button"
                    accessibilityLabel="Try again"
                    style={({ pressed }: { pressed: boolean }) => [styles.button, pressed && styles.buttonPressed]}
                >
                    <Text style={styles.buttonText}>Try again · ព្យាយាមម្តងទៀត</Text>
                </Pressable>
            </View>
        );
    }
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 32,
        backgroundColor: '#F8F9FA',
    },
    containerDark: {
        backgroundColor: '#121212',
    },
    title: {
        fontSize: 20,
        fontWeight: '700',
        color: '#111827',
        textAlign: 'center',
    },
    titleSecondary: {
        fontSize: 16,
        marginTop: 4,
    },
    titleDark: {
        color: '#F9FAFB',
    },
    message: {
        marginTop: 12,
        fontSize: 14,
        lineHeight: 21,
        color: '#6B7280',
        textAlign: 'center',
    },
    messageDark: {
        color: '#9CA3AF',
    },
    devDetails: {
        marginTop: 12,
        fontSize: 12,
        color: '#6B7280',
        textAlign: 'center',
    },
    button: {
        marginTop: 28,
        minHeight: 50,
        paddingHorizontal: 28,
        borderRadius: 16,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#DF0000',
    },
    buttonPressed: {
        opacity: 0.85,
    },
    buttonText: {
        fontSize: 15,
        fontWeight: '700',
        color: '#FFFFFF',
    },
});
