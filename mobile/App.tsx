// Copyright (c) 2024-2026 Pramod Singh Manyal. All rights reserved.
// Unauthorized copying, modification, or distribution of this file,
// via any medium, is strictly prohibited. Proprietary and confidential.
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import LoginScreen from './screens/LoginScreen';
import DashboardScreen from './screens/DashboardScreen';
import CoursesScreen from './screens/CoursesScreen';
import LessonsScreen from './screens/LessonsScreen';
import LessonDetailScreen from './screens/LessonDetailScreen';
import GradesScreen from './screens/GradesScreen';
import AssignmentsScreen from './screens/AssignmentsScreen';
import TakeAssessmentScreen from './screens/TakeAssessmentScreen';
import AssessmentResultsScreen from './screens/AssessmentResultsScreen';
import TakeQuizScreen from './screens/TakeQuizScreen';
import AiTutorScreen from './screens/AiTutorScreen';
import OfflineScreen from './screens/OfflineScreen';
import ProfileScreen from './screens/ProfileScreen';
import FeesScreen from './screens/FeesScreen';
import MessagingScreen from './screens/MessagingScreen';
import ParentAttendanceScreen from './screens/ParentAttendanceScreen';
import ParentGradesScreen from './screens/ParentGradesScreen';
import TeacherAttendanceScreen from './screens/TeacherAttendanceScreen';
import TeacherGradingScreen from './screens/TeacherGradingScreen';
import GradeSubmissionScreen from './screens/GradeSubmissionScreen';
import TeacherAssessmentsScreen from './screens/TeacherAssessmentsScreen';
import CreateAssessmentScreen from './screens/CreateAssessmentScreen';
import ManageQuestionsScreen from './screens/ManageQuestionsScreen';
import LibraryScreen from './screens/LibraryScreen';
import ProgressScreen from './screens/ProgressScreen';
import ProjectsListScreen from './screens/ProjectsListScreen';
import ProjectDetailScreen from './screens/ProjectDetailScreen';
import ParentProjectsScreen from './screens/ParentProjectsScreen';
import {
  NoticeBoardScreen,
  ParentChildrenScreen,
  ParentDashboardScreen,
  ParentFeesScreen,
  TeacherStudentsScreen,
  TeacherDashboardScreen,
  TimetableScreen,
} from './screens/role-dashboard-screens';
import {
  clearTokens,
  getAuthToken,
  getCurrentUser,
  saveCurrentUser,
  User,
  usersAPI,
} from './lib/api';
import { Colors } from './constants/theme';
import { configureNotificationBehavior, registerForPushNotificationsAsync } from './lib/notifications';

const RootStack = createNativeStackNavigator();
const InnerStack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

function tabIcon(name: string, focused: boolean) {
  const icons: Record<string, [string, string]> = {
    Home: ['🏠', '🏡'],
    Courses: ['📚', '📖'],
    Grades: ['📊', '📈'],
    Assignments: ['📝', '✏️'],
    Fees: ['💳', '💰'],
    Messages: ['💬', '🗨️'],
    Timetable: ['🗓️', '📆'],
    People: ['👥', '🧑‍🤝‍🧑'],
    Children: ['👶', '🧒'],
    Notices: ['📢', '📣'],
    Offline: ['📥', '💾'],
    Profile: ['👤', '🧑'],
    Tutor: ['🧠', '✨'],
    Attendance: ['📅', '🗒️'],
    Grading: ['✍️', '🖊️'],
    Assessments: ['📋', '🗂️'],
    Library: ['📙', '📘'],
    Progress: ['🏆', '🥇'],
    Projects: ['📂', '📁'],
  };

  const [inactive, active] = icons[name] || ['⚪', '🔵'];
  return focused ? active : inactive;
}

function commonTabOptions(routeName: string) {
  const RNText = require('react-native').Text;
  return {
    headerShown: false,
    tabBarStyle: {
      backgroundColor: '#fff',
      borderTopColor: Colors.gray200,
      borderTopWidth: 1,
      height: 68,
      paddingBottom: 10,
      paddingTop: 6,
    },
    tabBarActiveTintColor: Colors.primary,
    tabBarInactiveTintColor: Colors.gray400,
    tabBarLabelStyle: { fontSize: 11, fontWeight: '600' as const },
    tabBarIcon: ({ focused }: { focused: boolean }) => (
      <RNText style={{ fontSize: 21 }}>{tabIcon(routeName, focused)}</RNText>
    ),
  };
}

function DashboardStackNavigator() {
  return (
    <InnerStack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: Colors.primary },
        headerTintColor: '#fff',
        headerTitleStyle: { fontWeight: '800', fontSize: 18 },
      }}
    >
      <InnerStack.Screen name="DashHome" component={DashboardScreen} options={{ headerShown: false }} />
      <InnerStack.Screen name="Lessons" component={LessonsScreen} options={{ title: 'Lessons' }} />
      <InnerStack.Screen name="LessonDetail" component={LessonDetailScreen} options={{ title: 'Lesson Detail' }} />
      <InnerStack.Screen name="TakeQuiz" component={TakeQuizScreen} options={{ title: 'Quiz' }} />
    </InnerStack.Navigator>
  );
}

function AssignmentsStackNavigator() {
  return (
    <InnerStack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: Colors.primary },
        headerTintColor: '#fff',
        headerTitleStyle: { fontWeight: '800', fontSize: 18 },
      }}
    >
      <InnerStack.Screen name="AssignmentsList" component={AssignmentsScreen} options={{ headerShown: false }} />
      <InnerStack.Screen name="TakeAssessment" component={TakeAssessmentScreen} options={{ title: 'Assessment' }} />
      <InnerStack.Screen name="AssessmentResults" component={AssessmentResultsScreen} options={{ title: 'Result' }} />
    </InnerStack.Navigator>
  );
}

function ProjectsStackNavigator({ role }: { role: 'student' | 'teacher' }) {
  return (
    <InnerStack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: Colors.primary },
        headerTintColor: '#fff',
        headerTitleStyle: { fontWeight: '800', fontSize: 18 },
      }}
    >
      <InnerStack.Screen name="ProjectsList" options={{ title: 'Projects' }}>
        {(props) => <ProjectsListScreen {...props} role={role} />}
      </InnerStack.Screen>
      <InnerStack.Screen
        name="ProjectDetail"
        component={ProjectDetailScreen}
        options={{ title: 'Project' }}
      />
    </InnerStack.Navigator>
  );
}

function ParentProjectsStackNavigator() {
  return (
    <InnerStack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: Colors.primary },
        headerTintColor: '#fff',
        headerTitleStyle: { fontWeight: '800', fontSize: 18 },
      }}
    >
      <InnerStack.Screen
        name="ParentProjectsList"
        component={ParentProjectsScreen}
        options={{ title: 'Projects' }}
      />
      <InnerStack.Screen
        name="ProjectDetail"
        component={ProjectDetailScreen}
        options={{ title: 'Project' }}
      />
    </InnerStack.Navigator>
  );
}

function CoursesStackNavigator() {
  return (
    <InnerStack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: Colors.primary },
        headerTintColor: '#fff',
        headerTitleStyle: { fontWeight: '800', fontSize: 18 },
      }}
    >
      <InnerStack.Screen name="CoursesList" component={CoursesScreen} options={{ title: 'My Subjects' }} />
      <InnerStack.Screen name="Lessons" component={LessonsScreen} options={{ title: 'Lessons' }} />
      <InnerStack.Screen name="LessonDetail" component={LessonDetailScreen} options={{ title: 'Lesson Detail' }} />
      <InnerStack.Screen name="TakeQuiz" component={TakeQuizScreen} options={{ title: 'Quiz' }} />
    </InnerStack.Navigator>
  );
}

function TeacherAssessmentsStackNavigator() {
  return (
    <InnerStack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: Colors.primary },
        headerTintColor: '#fff',
        headerTitleStyle: { fontWeight: '800', fontSize: 18 },
      }}
    >
      <InnerStack.Screen name="AssessmentsList" component={TeacherAssessmentsScreen} options={{ headerShown: false }} />
      <InnerStack.Screen name="CreateAssessment" component={CreateAssessmentScreen} options={{ title: 'New Assessment' }} />
      <InnerStack.Screen name="ManageQuestions" component={ManageQuestionsScreen} options={{ title: 'Questions' }} />
    </InnerStack.Navigator>
  );
}

function TeacherGradingStackNavigator() {
  return (
    <InnerStack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: Colors.primary },
        headerTintColor: '#fff',
        headerTitleStyle: { fontWeight: '800', fontSize: 18 },
      }}
    >
      <InnerStack.Screen name="GradingList" component={TeacherGradingScreen} options={{ headerShown: false }} />
      <InnerStack.Screen name="GradeSubmission" component={GradeSubmissionScreen} options={{ title: 'Grade Submission' }} />
    </InnerStack.Navigator>
  );
}

function StudentProfileStack({
  user,
  onLogout,
  onUserUpdated,
}: {
  user: User;
  onLogout: () => void;
  onUserUpdated: (user: User) => void;
}) {
  return (
    <InnerStack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: Colors.primary },
        headerTintColor: '#fff',
        headerTitleStyle: { fontWeight: '800', fontSize: 18 },
      }}
    >
      <InnerStack.Screen name="ProfileHome" options={{ headerShown: false }}>
        {() => <ProfileScreen user={user} onLogout={onLogout} onUserUpdated={onUserUpdated} />}
      </InnerStack.Screen>
      <InnerStack.Screen
        name="Offline"
        component={OfflineScreen}
        options={{ title: 'Offline Downloads' }}
        initialParams={{ browseRoute: 'Courses' }}
      />
    </InnerStack.Navigator>
  );
}

function StudentTabs({
  user,
  onLogout,
  onUserUpdated,
}: {
  user: User;
  onLogout: () => void;
  onUserUpdated: (user: User) => void;
}) {
  return (
    <Tab.Navigator screenOptions={({ route }) => commonTabOptions(route.name)}>
      <Tab.Screen name="Home" component={DashboardStackNavigator} />
      <Tab.Screen name="Courses" component={CoursesStackNavigator} />
      <Tab.Screen name="Grades" component={GradesScreen} />
      <Tab.Screen name="Fees" component={FeesScreen} />
      <Tab.Screen name="Assignments" component={AssignmentsStackNavigator} />
      {user.tenant_features?.projects !== false && (
        <Tab.Screen name="Projects">
          {() => <ProjectsStackNavigator role="student" />}
        </Tab.Screen>
      )}
      <Tab.Screen name="Progress" component={ProgressScreen} />
      <Tab.Screen name="Library" component={LibraryScreen} />
      <Tab.Screen name="Tutor" component={AiTutorScreen} options={{ title: 'AI Tutor' }} />
      <Tab.Screen name="Notices">
        {() => <NoticeBoardScreen role="student" />}
      </Tab.Screen>
      <Tab.Screen name="Timetable">
        {() => <TimetableScreen role="student" />}
      </Tab.Screen>
      <Tab.Screen name="Messages" component={MessagingScreen} />
      <Tab.Screen name="Profile">
        {() => <StudentProfileStack user={user} onLogout={onLogout} onUserUpdated={onUserUpdated} />}
      </Tab.Screen>
    </Tab.Navigator>
  );
}

function TeacherTabs({
  user,
  onLogout,
  onUserUpdated,
}: {
  user: User;
  onLogout: () => void;
  onUserUpdated: (user: User) => void;
}) {
  return (
    <Tab.Navigator screenOptions={({ route }) => commonTabOptions(route.name)}>
      <Tab.Screen name="Home" component={TeacherDashboardScreen} />
      <Tab.Screen name="People" component={TeacherStudentsScreen} />
      <Tab.Screen name="Attendance" component={TeacherAttendanceScreen} />
      <Tab.Screen name="Assessments" component={TeacherAssessmentsStackNavigator} />
      {user.tenant_features?.projects !== false && (
        <Tab.Screen name="Projects">
          {() => <ProjectsStackNavigator role="teacher" />}
        </Tab.Screen>
      )}
      <Tab.Screen name="Grading" component={TeacherGradingStackNavigator} />
      <Tab.Screen name="Timetable">
        {() => <TimetableScreen role="teacher" />}
      </Tab.Screen>
      <Tab.Screen name="Notices">
        {() => <NoticeBoardScreen role="teacher" />}
      </Tab.Screen>
      <Tab.Screen name="Messages" component={MessagingScreen} />
      <Tab.Screen name="Offline" component={OfflineScreen} />
      <Tab.Screen name="Profile">
        {() => <ProfileScreen user={user} onLogout={onLogout} onUserUpdated={onUserUpdated} />}
      </Tab.Screen>
    </Tab.Navigator>
  );
}

function ParentTabs({
  user,
  onLogout,
  onUserUpdated,
}: {
  user: User;
  onLogout: () => void;
  onUserUpdated: (user: User) => void;
}) {
  return (
    <Tab.Navigator screenOptions={({ route }) => commonTabOptions(route.name)}>
      <Tab.Screen name="Home" component={ParentDashboardScreen} />
      <Tab.Screen name="Children" component={ParentChildrenScreen} />
      <Tab.Screen name="Attendance" component={ParentAttendanceScreen} />
      <Tab.Screen name="Grades" component={ParentGradesScreen} />
      {user.tenant_features?.projects !== false && (
        <Tab.Screen name="Projects" component={ParentProjectsStackNavigator} />
      )}
      <Tab.Screen name="Fees" component={ParentFeesScreen} />
      <Tab.Screen name="Notices">
        {() => <NoticeBoardScreen role="parent" />}
      </Tab.Screen>
      <Tab.Screen name="Timetable">
        {() => <TimetableScreen role="parent" />}
      </Tab.Screen>
      <Tab.Screen name="Messages" component={MessagingScreen} />
      <Tab.Screen name="Offline" component={OfflineScreen} />
      <Tab.Screen name="Profile">
        {() => <ProfileScreen user={user} onLogout={onLogout} onUserUpdated={onUserUpdated} />}
      </Tab.Screen>
    </Tab.Navigator>
  );
}

function RoleTabs({
  user,
  onLogout,
  onUserUpdated,
}: {
  user: User;
  onLogout: () => void;
  onUserUpdated: (user: User) => void;
}) {
  const role = user.role;

  if (role === 'teacher') {
    return <TeacherTabs user={user} onLogout={onLogout} onUserUpdated={onUserUpdated} />;
  }

  if (role === 'parent') {
    return <ParentTabs user={user} onLogout={onLogout} onUserUpdated={onUserUpdated} />;
  }

  return <StudentTabs user={user} onLogout={onLogout} onUserUpdated={onUserUpdated} />;
}

// ─── Root App ─────────────────────────────────────────────────
// Configure foreground notification behaviour once at module load.
configureNotificationBehavior();

export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [checking, setChecking] = useState(true);

  const checkAuth = useCallback(async () => {
    setChecking(true);

    const token = await getAuthToken();
    if (!token) {
      setIsAuthenticated(false);
      setCurrentUser(null);
      setChecking(false);
      return;
    }

    const storedUser = await getCurrentUser();
    const isAdminRole = (user: User | null) =>
      !!user && (user.role === 'admin' || user.role === 'staff' || user.role === 'saas_admin');

    if (storedUser && isAdminRole(storedUser)) {
      // Admin roles are web-only; clear any legacy cached session.
      await clearTokens();
      setIsAuthenticated(false);
      setCurrentUser(null);
      setChecking(false);
      return;
    }

    if (storedUser) {
      // Immediately unblock UI with cached session while we refresh profile in background.
      setCurrentUser(storedUser);
      setIsAuthenticated(true);
      setChecking(false);
    }

    try {
      const freshUser = await usersAPI.getMe();
      if (isAdminRole(freshUser)) {
        await clearTokens();
        setIsAuthenticated(false);
        setCurrentUser(null);
        return;
      }
      await saveCurrentUser(freshUser);
      setCurrentUser(freshUser);
      setIsAuthenticated(true);
      // Register for push notifications after a confirmed authenticated session.
      registerForPushNotificationsAsync().catch(() => {});
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message.toLowerCase() : '';
      const authError =
        message.includes('401') ||
        message.includes('403') ||
        message.includes('unauthorized') ||
        message.includes('forbidden') ||
        message.includes('token');

      if (!storedUser || authError) {
        await clearTokens();
        setIsAuthenticated(false);
        setCurrentUser(null);
      }
      // For network/timeout errors with cached user, keep the session visible.
    } finally {
      setChecking(false);
    }
  }, []);

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  const handleLogout = useCallback(async () => {
    await clearTokens();
    setIsAuthenticated(false);
    setCurrentUser(null);
  }, []);

  const handleLoginSuccess = useCallback((user: User) => {
    setCurrentUser(user);
    setIsAuthenticated(true);
  }, []);

  const handleUserUpdated = useCallback((user: User) => {
    setCurrentUser(user);
  }, []);

  const appContent = useMemo(() => {
    if (checking) {
      return (
        <View style={styles.loadingWrap}>
          <ActivityIndicator color="#fff" size="large" />
          <Text style={styles.loadingBrand}>Preparing workspace...</Text>
        </View>
      );
    }

    if (isAuthenticated && currentUser) {
      return <RoleTabs user={currentUser} onLogout={handleLogout} onUserUpdated={handleUserUpdated} />;
    }

    return (
      <RootStack.Navigator screenOptions={{ headerShown: false }}>
        <RootStack.Screen name="Login">
          {() => <LoginScreen onLoginSuccess={handleLoginSuccess} />}
        </RootStack.Screen>
      </RootStack.Navigator>
    );
  }, [checking, isAuthenticated, currentUser, handleLoginSuccess, handleLogout, handleUserUpdated]);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <StatusBar barStyle="light-content" backgroundColor={Colors.primary} />
        <NavigationContainer>{appContent}</NavigationContainer>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  loadingWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primary,
  },
  loadingBrand: {
    marginTop: 10,
    color: 'rgba(255,255,255,0.95)',
    fontWeight: '700',
  },
});
