import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../../context/AuthContext';
import { verifyPin } from '../../utils/pin';
import {
  authenticateWithBiometrics,
  isBiometricsEnabled,
  checkBiometricCapability,
  getBiometricTypeName,
} from '../../utils/biometrics';
import { openCompanyWebsite } from '../../utils/links';
import { APP_NAME, APP_TAGLINE, COLORS, TYPOGRAPHY, SPACING } from '../../constants';

export function UnlockScreen() {
  const { setAuthenticated } = useAuth();
  const [pin, setPin] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [attempts, setAttempts] = useState(0);
  const [biometricsAvailable, setBiometricsAvailable] = useState(false);
  const [biometricTypeName, setBiometricTypeName] = useState('Biometrics');

  useEffect(() => {
    checkAndTriggerBiometrics();
  }, []);

  const checkAndTriggerBiometrics = async () => {
    try {
      const capability = await checkBiometricCapability();
      const enabled = await isBiometricsEnabled();
      
      if (capability.available && capability.enrolled && enabled) {
        setBiometricsAvailable(true);
        setBiometricTypeName(getBiometricTypeName(capability.biometricType));
        
        // Auto-trigger biometric authentication
        handleBiometricAuth();
      }
    } catch (error) {
      console.error('Error checking biometrics:', error);
    }
  };

  const handlePinChange = (value: string) => {
    const sanitized = value.replace(/[^0-9]/g, '').slice(0, 6);
    setPin(sanitized);
  };

  const handleUnlock = async () => {
    if (pin.length < 4) {
      Alert.alert('Invalid PIN', 'Please enter your PIN (4-6 digits)');
      return;
    }

    setIsLoading(true);
    try {
      const isValid = await verifyPin(pin);
      if (isValid) {
        setAuthenticated(true);
      } else {
        const newAttempts = attempts + 1;
        setAttempts(newAttempts);
        setPin('');
        
        if (newAttempts >= 5) {
          Alert.alert(
            'Too Many Attempts',
            'You have entered an incorrect PIN too many times. Please try again later.',
            [{ text: 'OK' }]
          );
        } else {
          Alert.alert('Incorrect PIN', `Please try again. ${5 - newAttempts} attempts remaining.`);
        }
      }
    } catch (error) {
      console.error('Error verifying PIN:', error);
      Alert.alert('Error', 'Failed to verify PIN. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleBiometricAuth = async () => {
    try {
      const success = await authenticateWithBiometrics();
      if (success) {
        setAuthenticated(true);
      }
    } catch (error) {
      console.error('Biometric auth error:', error);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.content}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.header}>
            <Text style={styles.appName}>{APP_NAME}</Text>
            <TouchableOpacity onPress={openCompanyWebsite} activeOpacity={0.7}>
              <Text style={styles.tagline}>{APP_TAGLINE}</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.form}>
            <Text style={styles.title}>Welcome Back</Text>
            <Text style={styles.subtitle}>Enter your PIN to unlock</Text>

            <TextInput
              style={styles.input}
              value={pin}
              onChangeText={handlePinChange}
              keyboardType="numeric"
              secureTextEntry
              maxLength={6}
              placeholder="Enter PIN"
              placeholderTextColor={COLORS.textMuted}
              autoFocus
              onSubmitEditing={handleUnlock}
            />

            <View style={styles.pinIndicator}>
              {[...Array(6)].map((_, index) => (
                <View
                  key={index}
                  style={[
                    styles.pinDot,
                    index < pin.length && styles.pinDotFilled,
                  ]}
                />
              ))}
            </View>

            <TouchableOpacity
              style={[styles.button, pin.length < 4 && styles.buttonDisabled]}
              onPress={handleUnlock}
              disabled={pin.length < 4 || isLoading || attempts >= 5}
            >
              <Text style={styles.buttonText}>
                {isLoading ? 'Verifying...' : 'Unlock'}
              </Text>
            </TouchableOpacity>

            {biometricsAvailable && (
              <TouchableOpacity
                style={styles.biometricButton}
                onPress={handleBiometricAuth}
              >
                <Text style={styles.biometricButtonText}>
                  Use {biometricTypeName}
                </Text>
              </TouchableOpacity>
            )}
          </View>

          <View style={styles.footer}>
            <Text style={styles.footerText}>
              Your notes are protected with PIN security
            </Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: SPACING.lg,
    paddingBottom: SPACING.md,
  },
  header: {
    alignItems: 'center',
    paddingTop: SPACING.lg,
    paddingBottom: SPACING.md,
  },
  appName: {
    fontSize: TYPOGRAPHY.fontSizeTitle,
    fontWeight: '700',
    color: COLORS.primary,
  },
  tagline: {
    fontSize: TYPOGRAPHY.fontSizeBase,
    color: COLORS.textLight,
    marginTop: SPACING.xs,
  },
  form: {
    alignItems: 'center',
    paddingTop: SPACING.md,
  },
  title: {
    fontSize: TYPOGRAPHY.fontSizeXLarge,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: SPACING.sm,
  },
  subtitle: {
    fontSize: TYPOGRAPHY.fontSizeBase,
    color: COLORS.textLight,
    textAlign: 'center',
    marginBottom: SPACING.lg,
  },
  input: {
    width: '100%',
    maxWidth: 200,
    height: 56,
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: COLORS.border,
    fontSize: TYPOGRAPHY.fontSizeXLarge,
    textAlign: 'center',
    letterSpacing: 8,
    color: COLORS.text,
  },
  pinIndicator: {
    flexDirection: 'row',
    gap: SPACING.sm,
    marginTop: SPACING.md,
    marginBottom: SPACING.lg,
  },
  pinDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: COLORS.border,
  },
  pinDotFilled: {
    backgroundColor: COLORS.primary,
  },
  button: {
    width: '100%',
    maxWidth: 300,
    height: 56,
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonDisabled: {
    backgroundColor: COLORS.disabled,
  },
  buttonText: {
    fontSize: TYPOGRAPHY.fontSizeMedium,
    fontWeight: '600',
    color: COLORS.surface,
  },
  biometricButton: {
    marginTop: SPACING.lg,
    padding: SPACING.md,
  },
  biometricButtonText: {
    fontSize: TYPOGRAPHY.fontSizeBase,
    color: COLORS.primary,
    fontWeight: '500',
  },
  footer: {
    paddingVertical: SPACING.md,
    alignItems: 'center',
  },
  footerText: {
    fontSize: TYPOGRAPHY.fontSizeSmall,
    color: COLORS.textMuted,
    textAlign: 'center',
  },
});
