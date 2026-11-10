import React, { useEffect } from 'react';
import { Animated, View, StyleSheet } from 'react-native';
import { useAppTheme } from '../../context/ThemeContext';
import { lightTheme, darkTheme } from '../../styles/theme';

interface SkeletonProps {
    width?: number | string;
    height?: number | string;
    borderRadius?: number;
    style?: any;
}

/**
 * One shared pulse drives every skeleton on screen.
 *
 * A loading screen renders 20-40 placeholders; giving each its own looping animation meant 20-40
 * concurrent native animations (and placeholders pulsing out of phase). The loop runs only while
 * at least one skeleton is mounted.
 */
const sharedPulse = new Animated.Value(0.35);
let sharedPulseLoop: ReturnType<typeof Animated.loop> | null = null;
let mountedSkeletons = 0;

function retainSharedPulse() {
    mountedSkeletons += 1;
    if (mountedSkeletons === 1) {
        sharedPulseLoop = Animated.loop(
            Animated.sequence([
                Animated.timing(sharedPulse, { toValue: 0.8, duration: 750, useNativeDriver: true }),
                Animated.timing(sharedPulse, { toValue: 0.35, duration: 750, useNativeDriver: true }),
            ])
        );
        sharedPulseLoop.start();
    }
}

function releaseSharedPulse() {
    mountedSkeletons = Math.max(0, mountedSkeletons - 1);
    if (mountedSkeletons === 0 && sharedPulseLoop) {
        sharedPulseLoop.stop();
        sharedPulseLoop = null;
        sharedPulse.setValue(0.35);
    }
}

export const Skeleton: React.FC<SkeletonProps> & {
    Box: React.FC<SkeletonProps>;
    Circle: React.FC<{ size?: number; style?: any }>;
    Text: React.FC<{ lines?: number; height?: number; gap?: number; style?: any }>;
} = ({ width = '100%', height = 20, borderRadius, style }) => {
    const { isDark } = useAppTheme();
    const theme = isDark ? darkTheme : lightTheme;
    const pulseAnim = sharedPulse;

    useEffect(() => {
        retainSharedPulse();
        return releaseSharedPulse;
    }, []);

    const backgroundColor = isDark ? darkTheme.colors.surfaceSecondary : '#E2E8F0';
    const computedRadius = borderRadius ?? theme.borderRadius.md;

    return (
        <Animated.View
            style={[
                styles.skeletonBase,
                {
                    width,
                    height,
                    borderRadius: computedRadius,
                    backgroundColor,
                    opacity: pulseAnim,
                },
                style,
            ]}
        />
    );
};

Skeleton.Box = ({ width = '100%', height = 100, borderRadius, style }) => (
    <Skeleton width={width} height={height} borderRadius={borderRadius} style={style} />
);

Skeleton.Circle = ({ size = 48, style }) => (
    <Skeleton width={size} height={size} borderRadius={size / 2} style={style} />
);

Skeleton.Text = ({ lines = 2, height = 12, gap = 8, style }) => (
    <View style={style}>
        {Array.from({ length: lines }).map((_, i) => (
            <Skeleton
                key={i}
                width={i === lines - 1 && lines > 1 ? '60%' : '100%'}
                height={height}
                style={{ marginBottom: i === lines - 1 ? 0 : gap }}
            />
        ))}
    </View>
);

const styles = StyleSheet.create({
    skeletonBase: {
        overflow: 'hidden',
    },
});
