# 📱 Mobile App Development Guide
## E-Learning Platform — Android & iOS

## Overview of Options

| Approach | Android | iOS | Code Sharing | Difficulty | Best For |
|----------|---------|-----|--------------|------------|---------|
| **PWA (Already Done)** | ✅ Chrome | ✅ Safari | 100% | Easy | Rural/No install |
| **React Native + Expo** | ✅ | ✅ | ~70% shared logic | Medium | Best choice |
| **Capacitor (wrap web app)** | ✅ | ✅ | 100% | Easy | Quick publish |
| **Flutter** | ✅ | ✅ | 0% (rewrite) | Hard | Best native perf |
| **Kotlin/Swift** | ✅/❌ | ❌/✅ | 0% (rewrite) | Hard | Platform-specific |

---

## 🏆 Recommended: Option A — React Native + Expo

> Best balance of code reuse, native performance, and developer experience.

### Why Expo?
- Build Android APK + iOS IPA from **one codebase**
- Share all API calls (`lib/api.ts`) directly
- Share business logic and hooks
- Over-the-air (OTA) updates — no re-publishing to stores
- **Expo Go** app for instant testing without a Mac/Xcode

---

## Option A Setup: React Native + Expo

### Prerequisites

```bash
# Install Node.js (already have it)
# Install Expo CLI globally
npm install -g expo-cli eas-cli

# For Android: Install Android Studio
# https://developer.android.com/studio

# For iOS: Need a Mac with Xcode 14+
# https://developer.apple.com/xcode/
```

### Step 1: Create the Mobile Project

```bash
# Navigate to your project root
cd /Users/pramodsinghmanyal/Desktop/E-LearningWebApp

# Create new Expo app
npx create-expo-app mobile --template blank-typescript

cd mobile
```

### Step 2: Install Key Dependencies

```bash
# Navigation
npx expo install @react-navigation/native @react-navigation/stack
npx expo install react-native-screens react-native-safe-area-context

# Storage (equivalent to localStorage)
npx expo install @react-native-async-storage/async-storage

# Secure token storage (instead of localStorage for tokens)
npx expo install expo-secure-store

# Network info (offline detection)
npx expo install @react-native-community/netinfo

# HTTP client (same as web)
npm install axios

# Push notifications
npx expo install expo-notifications expo-device

# PDF viewing
npx expo install expo-file-system expo-sharing

# Video player
npx expo install expo-av

# App updates (OTA)
npx expo install expo-updates
```

### Step 3: Recommended Folder Structure

```
mobile/
├── app/                     # Screens (mirrors your Next.js app/ folder)
│   ├── (auth)/
│   │   ├── login.tsx
│   │   └── register.tsx
│   ├── student/
│   │   ├── index.tsx        # Dashboard
│   │   ├── courses.tsx
│   │   ├── offline.tsx      # Offline content viewer
│   │   └── profile.tsx
│   └── _layout.tsx
├── components/              # Shared components
├── hooks/
│   ├── use-offline.ts       # Similar to your web hook
│   └── use-auth.ts
├── lib/
│   └── api.ts               # COPY from frontend/lib/api.ts (mostly works!)
├── assets/
└── app.json
```

### Step 4: Share Your API Client

Your existing `frontend/lib/api.ts` is mostly portable! Copy it and make these small changes:

```typescript
// mobile/lib/api.ts
import * as SecureStore from 'expo-secure-store';

// CHANGE: Use SecureStore instead of localStorage
async function getAuthToken(): Promise<string | null> {
  return await SecureStore.getItemAsync('access_token');
}

// CHANGE: Use fetch (React Native has it built in)
// KEEP: All your existing type definitions (User, Lesson, etc.)
// KEEP: All your existing API methods (academicAPI, usersAPI, etc.)
```

### Step 5: Offline with AsyncStorage

```typescript
// mobile/hooks/use-offline.ts
import NetInfo from '@react-native-community/netinfo';
import AsyncStorage from '@react-native-async-storage/async-storage';

export function useOffline() {
  const [isOnline, setIsOnline] = useState(true);
  const [connectionType, setConnectionType] = useState<string>('unknown');

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener(state => {
      setIsOnline(state.isConnected ?? true);
      setConnectionType(state.type); // 'wifi' | 'cellular' | 'none'
    });
    return unsubscribe;
  }, []);

  return { isOnline, connectionType };
}

// Save lesson for offline
export async function saveOfflineLesson(lesson: OfflineLesson) {
  const existing = await AsyncStorage.getItem('offline_lessons');
  const lessons = existing ? JSON.parse(existing) : [];
  await AsyncStorage.setItem(
    'offline_lessons',
    JSON.stringify([...lessons.filter((l: any) => l.id !== lesson.id), lesson])
  );
}
```

### Step 6: Sample Screen (Student Dashboard)

```tsx
// mobile/app/student/index.tsx
import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { academicAPI } from '../../lib/api';
import { useOffline } from '../../hooks/use-offline';

export default function StudentDashboard() {
  const { isOnline } = useOffline();
  const [courses, setCourses] = useState([]);

  useEffect(() => {
    if (isOnline) {
      loadData();
    } else {
      loadOfflineData();
    }
  }, [isOnline]);

  return (
    <ScrollView style={styles.container}>
      {!isOnline && (
        <View style={styles.offlineBanner}>
          <Text style={styles.offlineText}>📴 Offline Mode — Showing saved content</Text>
        </View>
      )}
      {/* Same content as your web dashboard */}
    </ScrollView>
  );
}
```

### Step 7: Run the App

```bash
cd mobile

# Start development server
npx expo start

# Then:
# Press 'a' → Open on Android emulator
# Press 'i' → Open on iOS simulator (Mac only)
# Scan QR code → Open in Expo Go app on your phone (EASIEST!)
```

---

## Option B: Capacitor (Wrap Your Next.js App — Fastest)

> Converts your existing web app into a native app with minimal code changes.

### Why Capacitor?
- ✅ Reuse 100% of your existing Next.js code
- ✅ Access native APIs (camera, storage, push notifications)
- ✅ Publish to Play Store and App Store
- ⚠️ Performance slightly below true native

### Setup

```bash
cd /Users/pramodsinghmanyal/Desktop/E-LearningWebApp/frontend

# Install Capacitor
npm install @capacitor/core @capacitor/cli
npm install @capacitor/android @capacitor/ios
npm install @capacitor/preferences  # Native storage
npm install @capacitor/network      # Offline detection
npm install @capacitor/push-notifications

# Initialize Capacitor
npx cap init "E-Learning Portal" "com.yourschool.elearning"

# Build your Next.js app first
npm run build

# Add platforms
npx cap add android
npx cap add ios  # Mac only

# Copy web build to native projects
npx cap copy

# Open in Android Studio / Xcode
npx cap open android
npx cap open ios
```

### Update `next.config.ts` for Capacitor

```typescript
// frontend/next.config.ts
const nextConfig: NextConfig = {
  output: 'export',  // Change from 'standalone' to 'export' for Capacitor
  trailingSlash: true,
  images: {
    unoptimized: true,  // Required for static export
  },
};
```

### Capacitor: Offline Storage

```typescript
// Replace localStorage with Capacitor Preferences
import { Preferences } from '@capacitor/preferences';

// Instead of: localStorage.setItem('key', value)
await Preferences.set({ key: 'offline_lessons', value: JSON.stringify(data) });

// Instead of: localStorage.getItem('key')
const { value } = await Preferences.get({ key: 'offline_lessons' });
```

---

## 📦 Publishing to Stores

### Android (Google Play Store)

```bash
# Using Expo (Option A)
eas build --platform android --profile production
# This generates an .aab file ready for Play Store

# Using Capacitor (Option B)
npx cap open android
# In Android Studio: Build → Generate Signed Bundle/APK
```

**Play Store Requirements:**
- Google Developer Account: **$25 one-time fee**
- Screenshots (phone + tablet)
- App icon (512x512 PNG)
- Privacy policy URL
- Target API level 33+

### iOS (Apple App Store)

```bash
# Using Expo (Option A) — Requires Apple Developer Account
eas build --platform ios --profile production

# Using Capacitor (Option B) — Requires Mac + Xcode
npx cap open ios
# In Xcode: Product → Archive → Distribute App
```

**App Store Requirements:**
- Apple Developer Account: **$99/year**
- Mac with Xcode
- iOS screenshots (multiple sizes)
- App Review (takes 1-3 days)

---

## 🔔 Push Notifications Setup

### Expo Push Notifications

```typescript
// mobile/lib/notifications.ts
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';

export async function registerForPushNotifications() {
  if (!Device.isDevice) return null;
  
  const { status } = await Notifications.requestPermissionsAsync();
  if (status !== 'granted') return null;
  
  const token = await Notifications.getExpoPushTokenAsync();
  
  // Send this token to your Django backend!
  await apiRequest('/notifications/register-push/', {
    method: 'POST',
    body: JSON.stringify({ token: token.data, platform: 'expo' })
  });
  
  return token.data;
}
```

### Django Backend: Send Push Notifications

```python
# backend/notifications/push.py
import requests

def send_push_notification(token, title, body, data=None):
    """Send notification via Expo Push API (free!)"""
    message = {
        'to': token,
        'title': title,
        'body': body,
        'data': data or {},
        'sound': 'default',
    }
    requests.post(
        'https://exp.host/--/api/v2/push/send',
        json=message,
        headers={'Content-Type': 'application/json'}
    )

# Usage: Notify student of new notice
send_push_notification(
    student.push_token,
    'New Notice 📢',
    'School exam timetable has been published',
    {'route': '/student/notices'}
)
```

---

## 🌍 Rural Area Optimizations (Mobile-Specific)

### 1. Background Download (React Native)

```typescript
import * as FileSystem from 'expo-file-system';
import * as BackgroundFetch from 'expo-background-fetch';

// Download lesson PDF in background
export async function downloadPDF(url: string, lessonId: string) {
  const filename = `lesson_${lessonId}.pdf`;
  const path = `${FileSystem.documentDirectory}${filename}`;
  
  const { uri } = await FileSystem.downloadAsync(url, path);
  return uri; // Local file path, works offline!
}
```

### 2. SMS Notifications for 2G Users

```python
# backend/notifications/sms.py
# For truly rural users without smartphones
def send_sms(phone_number, message):
    # Use local Nepali provider like Sparrow SMS
    import requests
    requests.post('https://api.sparrowsms.com/v2/sms/', json={
        'token': 'YOUR_SPARROW_TOKEN',
        'from': 'ELearn',
        'to': phone_number,
        'text': message
    })
```

### 3. Low-Bandwidth Image Loading

```tsx
// In your React Native screens
import { Image } from 'expo-image';  // Better caching than React Native's built-in

<Image
  source={{ uri: imageUrl }}
  placeholder={blurHashPlaceholder}
  contentFit="cover"
  cachePolicy="disk"    // Cache to disk for offline
  recyclingKey={lessonId}
/>
```

### 4. App Size Optimization

```json
// mobile/app.json
{
  "expo": {
    "android": {
      "enableSplitBinaryApk": true,  // Smaller download per device
      "config": {
        "enableMultiDex": true
      }
    }
  }
}
```

---

## 🚀 Quick Start Recommendation

### Fastest Path (This Week):

```bash
# 1. Build and publish as PWA (Already Done! ✅)
#    Share the URL — users install via browser

# 2. For Android APK (No Play Store, direct install):
cd /Users/pramodsinghmanyal/Desktop/E-LearningWebApp/frontend
npm install -g bubblewrap
bubblewrap init --manifest https://yourdomain.com/manifest.json
bubblewrap build
# → Generates elearning.apk ready to share via WhatsApp/Telegram!
```

### Best Long-term Path (Next Month):

```bash
# Create React Native + Expo app
cd /Users/pramodsinghmanyal/Desktop/E-LearningWebApp
npx create-expo-app mobile --template tabs
cd mobile

# Copy your API client
cp ../frontend/lib/api.ts ./lib/api.ts

# Start building screens
npx expo start
```

---

## 📊 Comparison Summary

| | PWA | Capacitor | React Native |
|-|-----|-----------|--------------|
| **Setup Time** | Done! ✅ | 1-2 days | 1-2 weeks |
| **Code Reuse** | 100% | 100% | 60-70% |
| **Performance** | Good | Good | Excellent |
| **Offline Support** | ✅ (done) | ✅ | ✅ |
| **Push Notifications** | Limited | ✅ | ✅ |
| **Play Store** | ✅ (TWA) | ✅ | ✅ |
| **App Store** | Limited | ✅ | ✅ |
| **Cost** | Free | Free | Free |
| **Update Speed** | Instant | Re-deploy | OTA (Expo) |
| **Rural Friendly** | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐⭐ |

---

## Files to Create

```
E-LearningWebApp/
├── frontend/          ← Your web app (existing)
│   └── public/
│       ├── sw.js      ← Service worker (done ✅)
│       └── manifest.json ← PWA manifest (done ✅)
├── mobile/            ← React Native app (new)
│   ├── app/           ← Screens
│   ├── lib/
│   │   └── api.ts     ← Copy from frontend/lib/api.ts
│   ├── hooks/
│   │   └── use-offline.ts
│   └── app.json
└── backend/           ← Django API (existing, shared by both)
```
