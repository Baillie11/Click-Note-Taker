import React, { useCallback, useEffect, useRef } from 'react';
import { ActivityIndicator, View, StyleSheet } from 'react-native';
import { AppState } from 'react-native';
import { NavigationContainer, createNavigationContainerRef } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Text } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Notifications from 'expo-notifications';

import { useAuth } from '../context/AuthContext';
import { RootStackParamList, MainTabParamList } from '../types';
import { COLORS, MIN_BOTTOM_SAFE_AREA } from '../constants';
import { getNoteById } from '../database';

// Auth Screens
import { PinSetupScreen } from '../screens/auth/PinSetupScreen';
import { UnlockScreen } from '../screens/auth/UnlockScreen';

// Main Screens
import { ClientsScreen } from '../screens/main/ClientsScreen';
import { ClientDetailScreen } from '../screens/main/ClientDetailScreen';
import { NoteEditorScreen } from '../screens/main/NoteEditorScreen';
import { ReportAssistantScreen } from '../screens/main/ReportAssistantScreen';
import { SettingsScreen } from '../screens/main/SettingsScreen';
import { PayEstimateScreen } from '../screens/main/PayEstimateScreen';
import { IncidentReportsListScreen } from '../screens/main/IncidentReportsListScreen';
import { IncidentReportEditorScreen } from '../screens/main/IncidentReportEditorScreen';

const Stack = createNativeStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator<MainTabParamList>();
const navigationRef = createNavigationContainerRef<RootStackParamList>();

function MainTabs() {
  const insets = useSafeAreaInsets();
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: COLORS.primary,
        tabBarInactiveTintColor: COLORS.textMuted,
        tabBarStyle: {
          backgroundColor: COLORS.surface,
          borderTopColor: COLORS.border,
          paddingBottom: Math.max(insets.bottom, MIN_BOTTOM_SAFE_AREA),
          paddingTop: 5,
          height: 56 + Math.max(insets.bottom, MIN_BOTTOM_SAFE_AREA),
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '500',
        },
      }}
    >
      <Tab.Screen
        name="Clients"
        component={ClientsScreen}
        options={{
          tabBarLabel: 'Clients',
          tabBarIcon: ({ color, size }) => (
            <Text style={{ fontSize: size, color }}>👥</Text>
          ),
        }}
      />
      <Tab.Screen
        name="Pay"
        component={PayEstimateScreen}
        options={{
          tabBarLabel: 'Pay',
          tabBarIcon: ({ color, size }) => (
            <Text style={{ fontSize: size, color }}>$</Text>
          ),
        }}
      />
      <Tab.Screen
        name="Settings"
        component={SettingsScreen}
        options={{
          tabBarLabel: 'Settings',
          tabBarIcon: ({ color, size }) => (
            <Text style={{ fontSize: size, color }}>⚙️</Text>
          ),
        }}
      />
    </Tab.Navigator>
  );
}

export function AppNavigator() {
  const { isAuthenticated, isPinSet, isLoading } = useAuth();
  const pendingNoteId = useRef<string | null>(null);
  const authenticatedRef = useRef(isAuthenticated);

  useEffect(() => {
    authenticatedRef.current = isAuthenticated;
  }, [isAuthenticated]);

  const openPendingNote = useCallback(async () => {
    const noteId = pendingNoteId.current;
    if (!noteId || !authenticatedRef.current || !navigationRef.isReady()) return;
    const note = await getNoteById(noteId);
    if (!note) {
      pendingNoteId.current = null;
      return;
    }
    navigationRef.navigate('NoteEditor', { clientId: note.clientId, noteId: note.id });
    pendingNoteId.current = null;
  }, []);

  useEffect(() => {
    if (isAuthenticated && pendingNoteId.current) {
      const timer = setTimeout(() => openPendingNote(), 250);
      return () => clearTimeout(timer);
    }
  }, [isAuthenticated, openPendingNote]);

  useEffect(() => {
    const handleResponse = (response: Notifications.NotificationResponse) => {
      const noteId = response.notification.request.content.data?.noteId;
      if (typeof noteId !== 'string') return;
      pendingNoteId.current = noteId;
      const timer = setTimeout(() => {
        if (AppState.currentState === 'active') openPendingNote();
      }, 400);
      return timer;
    };

    const subscription = Notifications.addNotificationResponseReceivedListener(handleResponse);
    Notifications.getLastNotificationResponseAsync()
      .then(response => {
        if (response) handleResponse(response);
        return Notifications.clearLastNotificationResponseAsync();
      })
      .catch(error => console.error('Could not handle notification link:', error));
    return () => subscription.remove();
  }, [openPendingNote]);

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  return (
    <NavigationContainer ref={navigationRef} onReady={openPendingNote}>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {!isPinSet ? (
          <Stack.Screen name="PinSetup" component={PinSetupScreen} />
        ) : !isAuthenticated ? (
          <Stack.Screen name="Unlock" component={UnlockScreen} />
        ) : (
          <>
            <Stack.Screen name="MainTabs" component={MainTabs} />
            <Stack.Screen 
              name="ClientDetail" 
              component={ClientDetailScreen}
              options={{ animation: 'slide_from_right' }}
            />
            <Stack.Screen 
              name="NoteEditor" 
              component={NoteEditorScreen}
              options={{ animation: 'slide_from_right' }}
            />
            <Stack.Screen
              name="ReportAssistant"
              component={ReportAssistantScreen}
              options={{ animation: 'slide_from_right' }}
            />
            <Stack.Screen 
              name="IncidentReportsList" 
              component={IncidentReportsListScreen}
              options={{ animation: 'slide_from_right' }}
            />
            <Stack.Screen 
              name="IncidentReportEditor" 
              component={IncidentReportEditorScreen}
              options={{ animation: 'slide_from_right' }}
            />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.background,
  },
});
