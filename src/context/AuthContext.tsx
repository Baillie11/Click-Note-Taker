import React, { createContext, useContext, useState, useEffect, useCallback, useRef, ReactNode } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import { isPinConfigured } from '../utils/pin';
import { isWithinGracePeriod, storeLastActiveTime } from '../utils/biometrics';
import { getEmergencyLockRemainingMs } from '../utils/emergencyLock';
import { AuthState } from '../types';

interface AuthContextType extends AuthState {
  setAuthenticated: (value: boolean) => void;
  setPinSet: (value: boolean) => void;
  checkAuthState: () => Promise<void>;
  handleAppStateChange: (nextAppState: AppStateStatus) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isPinSet, setIsPinSet] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const appStateRef = useRef<AppStateStatus>(AppState.currentState);

  const checkAuthState = useCallback(async () => {
    try {
      setIsLoading(true);
      const pinConfigured = await isPinConfigured();
      setIsPinSet(pinConfigured);
      
      // Check grace period
      if (pinConfigured) {
        const emergencyLockRemaining = await getEmergencyLockRemainingMs();
        const withinGrace = emergencyLockRemaining > 0 ? false : await isWithinGracePeriod();
        setIsAuthenticated(withinGrace && emergencyLockRemaining === 0);
      } else {
        setIsAuthenticated(false);
      }
    } catch (error) {
      console.error('Error checking auth state:', error);
      setIsAuthenticated(false);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const handleAppStateChange = useCallback(async (nextAppState: AppStateStatus) => {
    const previousAppState = appStateRef.current;
    appStateRef.current = nextAppState;

    if (nextAppState === 'active' && previousAppState === 'background') {
      // Only lock after a real background transition. Android can report
      // `inactive` while a permission dialog is visible.
      const emergencyLockRemaining = await getEmergencyLockRemainingMs();
      const withinGrace = emergencyLockRemaining > 0 ? false : await isWithinGracePeriod();
      if ((emergencyLockRemaining > 0 || !withinGrace) && isPinSet) {
        setIsAuthenticated(false);
      }
    } else if (nextAppState === 'background') {
      // App going to background - store last active time
      if (isAuthenticated) {
        await storeLastActiveTime();
      }
    }
  }, [isAuthenticated, isPinSet]);

  useEffect(() => {
    checkAuthState();
  }, [checkAuthState]);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', handleAppStateChange);
    return () => {
      subscription.remove();
    };
  }, [handleAppStateChange]);

  const setAuthenticated = useCallback((value: boolean) => {
    setIsAuthenticated(value);
    if (value) {
      storeLastActiveTime();
    }
  }, []);

  const setPinSet = useCallback((value: boolean) => {
    setIsPinSet(value);
  }, []);

  return (
    <AuthContext.Provider
      value={{
        isAuthenticated,
        isPinSet,
        isLoading,
        setAuthenticated,
        setPinSet,
        checkAuthState,
        handleAppStateChange,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
