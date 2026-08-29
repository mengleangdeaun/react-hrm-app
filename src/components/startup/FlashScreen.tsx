import React, { useEffect, useRef } from 'react';
import {
    View,
    Image,
    StyleSheet,
    Animated,
    StatusBar,
    Platform,
} from 'react-native';
import { AppText } from '../AppText';
import { ENV } from '../../config/env';

interface FlashScreenProps {
    onReady?: () => void;
}

export const FlashScreen: React.FC<FlashScreenProps> = ({ onReady }) => {
    const opacityAnim = useRef(new Animated.Value(0)).current;
    const scaleAnim = useRef(new Animated.Value(0.96)).current;

    useEffect(() => {
        // Notify root that the React Native FlashScreen is mounted and ready
        if (onReady) {
            onReady();
        }

        // Fast, subtle micro-transition
        Animated.parallel([
            Animated.timing(opacityAnim, {
                toValue: 1,
                duration: 200,
                useNativeDriver: true,
            }),
            Animated.timing(scaleAnim, {
                toValue: 1,
                duration: 250,
                useNativeDriver: true,
            }),
        ]).start();
    }, [onReady, opacityAnim, scaleAnim]);

    return (
        <View style={styles.container}>
            <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

            <Animated.View
                style={[
                    styles.content,
                    {
                        opacity: opacityAnim,
                        transform: [{ scale: scaleAnim }],
                    },
                ]}
            >
                {/* Branded App Icon in Light Mode Container */}
                <View style={styles.logoContainer}>
                    <Image
                        source={require('../../../assets/icon.png')}
                        style={styles.logo}
                        resizeMode="contain"
                    />
                </View>

                {/* Brand Title */}
                <AppText style={styles.title} weight="bold">
                    {ENV.APP_NAME || 'SCCG Mobile App'}
                </AppText>

                {/* Enterprise Subtitle */}
                <AppText style={styles.subtitle} variant="caption">
                    Enterprise Workspace Suite
                </AppText>
            </Animated.View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#FFFFFF',
        justifyContent: 'center',
        alignItems: 'center',
    },
    content: {
        alignItems: 'center',
        justifyContent: 'center',
        gap: 12,
    },
    logoContainer: {
        marginBottom: 6,
        ...Platform.select({
            ios: {
                shadowColor: '#000000',
                shadowOffset: { width: 0, height: 6 },
                shadowOpacity: 0.08,
                shadowRadius: 12,
            },
            android: {
                elevation: 4,
            },
        }),
    },
    logo: {
        width: 88,
        height: 88,
        borderRadius: 20,
    },
    title: {
        color: '#0F172A',
        fontSize: 22,
        letterSpacing: -0.3,
        textAlign: 'center',
    },
    subtitle: {
        color: '#64748B',
        fontSize: 13,
        letterSpacing: 0.6,
        textTransform: 'uppercase',
        textAlign: 'center',
    },
});
