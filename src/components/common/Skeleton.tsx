import React, { useEffect, useRef } from 'react';
import { Animated, View, StyleSheet } from 'react-native';
import { useAppTheme } from '../../context/ThemeContext';
import { lightTheme, darkTheme } from '../../styles/theme';

interface SkeletonProps {
    width?: number | string;
    height?: number | string;
    borderRadius?: number;
    style?: any;
}

export const Skeleton: React.FC<SkeletonProps> & {
    Box: React.FC<SkeletonProps>;
    Circle: React.FC<{ size?: number; style?: any }>;
    Text: React.FC<{ lines?: number; height?: number; gap?: number; style?: any }>;
} = ({ width = '100%', height = 20, borderRadius, style }) => {
    const { isDark } = useAppTheme();
    const theme = isDark ? darkTheme : lightTheme;
    const pulseAnim = useRef(new Animated.Value(0.35)).current;

    useEffect(() => {
        const animation = Animated.loop(
            Animated.sequence([
                Animated.timing(pulseAnim, {
                    toValue: 0.8,
                    duration: 750,
                    useNativeDriver: true,
                }),
                Animated.timing(pulseAnim, {
                    toValue: 0.35,
                    duration: 750,
                    useNativeDriver: true,
                }),
            ])
        );
        animation.start();
        return () => animation.stop();
    }, [pulseAnim]);

    const backgroundColor = isDark ? '#1E293B' : '#E2E8F0';
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
