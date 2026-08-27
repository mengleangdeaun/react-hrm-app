import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { WelcomeScreen } from '../screens/welcome/WelcomeScreen';
import { OnboardingScreen } from '../screens/onboarding/OnboardingScreen';
import { LoginScreen } from '../screens/auth/LoginScreen';
import { QrLoginScreen } from '../screens/auth/QrLoginScreen';

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
            <Stack.Screen name="Onboarding" component={OnboardingScreen} />
            <Stack.Screen name="Login" component={LoginScreen} />
            <Stack.Screen name="QrLogin" component={QrLoginScreen} />
        </Stack.Navigator>
    );
}

