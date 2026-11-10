import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { WelcomeScreen } from '../screens/welcome/WelcomeScreen';

// Loaded on first navigation rather than at startup (QR login pulls in the camera module)
const getOnboardingScreen = () => require('../screens/onboarding/OnboardingScreen').OnboardingScreen;
const getLoginScreen = () => require('../screens/auth/LoginScreen').LoginScreen;
const getQrLoginScreen = () => require('../screens/auth/QrLoginScreen').QrLoginScreen;

export type AuthStackParamList = {
    Welcome: undefined;
    Onboarding: { isReviewMode?: boolean } | undefined;
    Login: undefined;
    QrLogin: undefined;
};

const Stack = createNativeStackNavigator();

export function AuthNavigator({ initialRouteName = 'Welcome' }: { initialRouteName?: keyof AuthStackParamList }) {
    return (
        <Stack.Navigator
            initialRouteName={initialRouteName}
            screenOptions={{
                headerShown: false,
                animation: 'fade_from_bottom',
            }}
        >
            <Stack.Screen name="Welcome" component={WelcomeScreen} />
            <Stack.Screen name="Onboarding" getComponent={getOnboardingScreen} />
            <Stack.Screen name="Login" getComponent={getLoginScreen} />
            <Stack.Screen name="QrLogin" getComponent={getQrLoginScreen} />
        </Stack.Navigator>
    );
}

