// Copyright (c) 2024-2026 Pramod Singh Manyal. All rights reserved.
// Unauthorized copying, modification, or distribution of this file,
// via any medium, is strictly prohibited. Proprietary and confidential.
/**
 * Expo Push Notification registration.
 *
 * Call registerForPushNotificationsAsync() once after the user logs in.
 * It requests permission, gets the Expo push token, and POSTs it to the
 * backend so the server can send targeted pushes via the Expo Push API.
 */
import { Platform } from 'react-native';
import { getAuthToken } from './api';

const API_BASE = (process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:8000/api').replace(/\/+$/, '');

/**
 * Register the device for Expo push notifications.
 * Safe to call multiple times — silently no-ops if already registered or if
 * permissions are denied.
 */
export async function registerForPushNotificationsAsync(): Promise<string | null> {
    // Dynamic imports keep this tree-shakeable when Expo Notifications is not installed.
    let Notifications: typeof import('expo-notifications');
    let Device: typeof import('expo-device');
    try {
        Notifications = await import('expo-notifications');
        Device = await import('expo-device');
    } catch {
        // expo-notifications not installed — skip silently.
        return null;
    }

    // Push tokens only work on physical devices (not simulators).
    if (!Device.isDevice) {
        console.log('[Push] Skipping push registration — running on simulator.');
        return null;
    }

    // Android: create a default notification channel.
    if (Platform.OS === 'android') {
        await Notifications.setNotificationChannelAsync('default', {
            name: 'default',
            importance: Notifications.AndroidImportance.MAX,
            vibrationPattern: [0, 250, 250, 250],
            lightColor: '#7C3AED',
        });
    }

    // Request permission.
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
    }
    if (finalStatus !== 'granted') {
        console.log('[Push] Permission denied — push notifications disabled.');
        return null;
    }

    // Get the Expo push token.
    const tokenData = await Notifications.getExpoPushTokenAsync();
    const token = tokenData.data;
    console.log('[Push] Expo push token:', token);

    // Register with the backend.
    await registerTokenWithBackend(token);
    return token;
}

async function registerTokenWithBackend(token: string): Promise<void> {
    const authToken = await getAuthToken();
    if (!authToken) return;

    try {
        const res = await fetch(`${API_BASE}/users/users/push-token/`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${authToken}`,
            },
            body: JSON.stringify({ token }),
        });
        if (!res.ok) {
            console.warn('[Push] Token registration failed:', res.status);
        }
    } catch (err) {
        console.warn('[Push] Token registration error:', err);
    }
}

/**
 * Configure how notifications behave when the app is in the foreground.
 * Call once at app startup (e.g., in App.tsx root component).
 */
export function configureNotificationBehavior() {
    try {
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const Notifications = require('expo-notifications');
        Notifications.setNotificationHandler({
            handleNotification: async () => ({
                shouldShowAlert: true,
                shouldPlaySound: true,
                shouldSetBadge: true,
            }),
        });
    } catch {
        // expo-notifications not available — skip.
    }
}
