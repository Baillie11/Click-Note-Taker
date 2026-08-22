import React from 'react';
import { ActivityIndicator, View, StyleSheet } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Text } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useAuth } from '../context/AuthContext';
import { RootStackParamList, MainTabParamList } from '../types';
import { COLORS, MIN_BOTTOM_SAFE_AREA } from '../constants';

// Auth Screens
import { PinSetupScreen } from '../screens/auth/PinSetupScreen';
import { UnlockScreen } from '../screens/auth/UnlockScreen';

// Main Screens
import { ClientsScreen } from '../screens/main/ClientsScreen';
import { ClientDetailScreen } from '../screens/main/ClientDetailScreen';
import { NoteEditorScreen } from '../screens/main/NoteEditorScreen';
import { SettingsScreen } from '../screens/main/SettingsScreen';
import { PayEstimateScreen } from '../screens/main/PayEstimateScreen';
import { IncidentReportsListScreen } from '../screens/main/IncidentReportsListScreen';
import { IncidentReportEditorScreen } from '../screens/main/IncidentReportEditorScreen';

const Stack = createNativeStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator<MainTabParamList>();

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

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  return (
    <NavigationContainer>
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
