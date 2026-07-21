# E-Learning Mobile App (React Native + Expo)

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- Expo Go app installed on your phone ([Android](https://play.google.com/store/apps/details?id=host.exp.exponent) | [iOS](https://apps.apple.com/app/expo-go/id982107779))

### 1. Configure API URL

Find your computer's local IP address:
```bash
# macOS
ifconfig | grep "inet " | grep -v 127.0.0.1

# Windows
ipconfig | findstr "IPv4"
```

Edit `.env`:
```
EXPO_PUBLIC_API_URL=http://YOUR_LOCAL_IP:8000/api
```

Also start your Django backend:
```bash
cd ../backend
python manage.py runserver 0.0.0.0:8000
```

### 2. Start the App

```bash
cd mobile
npm start
```

Then:
- **Press `a`** → Open on Android emulator
- **Press `i`** → Open on iOS simulator (Mac only)
- **Scan QR code** → Open in Expo Go on your phone ← **Easiest!**

---

## 📁 Project Structure

```
mobile/
├── App.tsx                  # Root navigation (Login → Tabs)
├── screens/
│   ├── LoginScreen.tsx      # Beautiful login with school code
│   ├── DashboardScreen.tsx  # Student home with stats
│   ├── CoursesScreen.tsx    # Subjects grid
│   ├── LessonsScreen.tsx    # Chapter-grouped lessons + download
│   ├── GradesScreen.tsx     # Results + attendance
│   └── OfflineScreen.tsx    # Downloaded content browser
├── components/
│   └── OfflineBanner.tsx    # Auto offline/slow detection banner
├── hooks/
│   └── use-offline.ts       # Network status + offline storage
├── lib/
│   └── api.ts               # Shared API client (mirrors web)
├── constants/
│   └── theme.ts             # Colors, typography, spacing
├── .env                     # API URL configuration
└── eas.json                 # Build configuration
```

---

## 📱 Features

| Feature | Status |
|---------|--------|
| Login with school code | ✅ |
| Student dashboard | ✅ |
| Subject list with progress | ✅ |
| Lessons by chapter | ✅ |
| Download lessons offline | ✅ |
| Offline content browser | ✅ |
| Grades & results | ✅ |
| Attendance tracking | ✅ |
| Network status detection | ✅ |
| Offline/slow banner | ✅ |
| 2G/3G/4G detection | ✅ |

---

## 🏗️ Build APK / IPA

### Development Test APK (no account needed)
```bash
npm install -g eas-cli
eas login
eas build --platform android --profile development
```

### Production for Play Store
```bash
# First: Set up EAS account at expo.dev
eas build --platform android --profile production

# Then submit:
eas submit --platform android
```

### Production for App Store (Mac required)
```bash
eas build --platform ios --profile production
eas submit --platform ios
```

---

## 🌐 Backend Configuration

The mobile app connects to the same Django backend as the web app.

**For local development on a physical device:**
1. Backend must run on `0.0.0.0:8000` (not `127.0.0.1`)
2. Set `ALLOWED_HOSTS = ['*']` in `settings/base.py` for dev
3. Both phone and computer must be on the **same Wi-Fi network**

**For production:**
Set `EXPO_PUBLIC_API_URL=https://your-deployed-backend.com/api`
