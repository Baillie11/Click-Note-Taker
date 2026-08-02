import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../../context/AuthContext';
import { storePin, validatePinFormat } from '../../utils/pin';
import { openCompanyWebsite } from '../../utils/links';
import { APP_NAME, APP_TAGLINE, COLORS, TYPOGRAPHY, SPACING } from '../../constants';

export function PinSetupScreen() {
  const { setAuthenticated, setPinSet } = useAuth();
  const [pin, setPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [step, setStep] = useState<'create' | 'confirm'>('create');
  const [isLoading, setIsLoading] = useState(false);

  const handlePinChange = (value: string) => {
    // Only allow digits
    const sanitized = value.replace(/[^0-9]/g, '').slice(0, 6);
    if (step === 'create') {
      setPin(sanitized);
    } else {
      setConfirmPin(sanitized);
    }
  };

  const handleContinue = async () => {
    if (step === 'create') {
      const validation = validatePinFormat(pin);
      if (!validation.valid) {
        Alert.alert('Invalid PIN', validation.error);
        return;
      }
      setStep('confirm');
      return;
    }

    // Confirm step
    if (pin !== confirmPin) {
      Alert.alert('PIN Mismatch', 'The PINs you entered do not match. Please try again.');
      setConfirmPin('');
      return;
    }

    setIsLoading(true);
    try {
      await storePin(pin);
      setPinSet(true);
      setAuthenticated(true);
    } catch (error) {
      console.error('Error storing PIN:', error);
      Alert.alert('Error', 'Failed to save PIN. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleBack = () => {
    setStep('create');
    setConfirmPin('');
  };

  const currentPin = step === 'create' ? pin : confirmPin;
  const canContinue = currentPin.length >= 4;

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.content}
      >
        <View style={styles.header}>
          <Text style={styles.appName}>{APP_NAME}</Text>
          <TouchableOpacity onPress={openCompanyWebsite} activeOpacity={0.7}>
            <Text style={styles.tagline}>{APP_TAGLINE}</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.form}>
          <Text style={styles.title}>
            {step === 'create' ? 'Create Your PIN' : 'Confirm Your PIN'}
          </Text>
          <Text style={styles.subtitle}>
            {step === 'create'
              ? 'Enter a 4-6 digit PIN to secure your notes'
              : 'Re-enter your PIN to confirm'}
          </Text>

          <TextInput
            style={styles.input}
            value={currentPin}
            onChangeText={handlePinChange}
            keyboardType="numeric"
            secureTextEntry
            maxLength={6}
            placeholder="Enter PIN"
            placeholderTextColor={COLORS.textMuted}
            autoFocus
          />

          <View style={styles.pinIndicator}>
            {[...Array(6)].map((_, index) => (
              <View
                key={index}
                style={[
                  styles.pinDot,
                  index < currentPin.length && styles.pinDotFilled,
                ]}
              />
            ))}
          </View>

          <TouchableOpacity
            style={[styles.button, !canContinue && styles.buttonDisabled]}
            onPress={handleContinue}
            disabled={!canContinue || isLoading}
          >
            <Text style={styles.buttonText}>
              {isLoading ? 'Setting up...' : step === 'create' ? 'Continue' : 'Complete Setup'}
            </Text>
          </TouchableOpacity>

          {step === 'confirm' && (
            <TouchableOpacity style={styles.backButton} onPress={handleBack}>
              <Text style={styles.backButtonText}>Back</Text>
            </TouchableOpacity>
          )}
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>
            Your PIN is stored securely on this device
          </Text>
        </View>
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
    paddingHorizontal: SPACING.lg,
  },
  header: {
    alignItems: 'center',
    paddingTop: SPACING.xxl,
    paddingBottom: SPACING.xl,
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
    flex: 1,
    alignItems: 'center',
    paddingTop: SPACING.xl,
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
    marginBottom: SPACING.xl,
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
    marginTop: SPACING.lg,
    marginBottom: SPACING.xl,
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
  backButton: {
    marginTop: SPACING.md,
    padding: SPACING.sm,
  },
  backButtonText: {
    fontSize: TYPOGRAPHY.fontSizeBase,
    color: COLORS.primary,
  },
  footer: {
    paddingVertical: SPACING.lg,
    alignItems: 'center',
  },
  footerText: {
    fontSize: TYPOGRAPHY.fontSizeSmall,
    color: COLORS.textMuted,
    textAlign: 'center',
  },
});
