import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Switch,
  Alert,
  Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Footer } from '../../components/Footer';
import { 
  checkBiometricCapability, 
  getBiometricTypeName,
  isBiometricsEnabled,
  setBiometricsEnabled,
  getGracePeriodSettings,
  setGracePeriodSettings,
} from '../../utils/biometrics';
import { deletePin } from '../../utils/pin';
import { EMPTY_USER_PROFILE, getUserProfile, saveUserProfile } from '../../utils/userProfile';
import { resetAppData } from '../../utils/resetAppData';
import { getAiAccessCode, saveAiAccessCode } from '../../utils/aiAccess';
import { useAuth } from '../../context/AuthContext';
import { UserProfile } from '../../types';
import { 
  APP_NAME, 
  APP_VERSION, 
  APP_TAGLINE, 
  COMPANY_URL, 
  COLORS, 
  TYPOGRAPHY, 
  SPACING 
} from '../../constants';

export function SettingsScreen() {
  const { setAuthenticated, setPinSet } = useAuth();
  const [biometricsAvailable, setBiometricsAvailable] = useState(false);
  const [biometricTypeName, setBiometricTypeName] = useState('Biometrics');
  const [biometricsEnabled, setBiometricsEnabledState] = useState(false);
  const [gracePeriodEnabled, setGracePeriodEnabled] = useState(false);
  const [profile, setProfile] = useState<UserProfile>(EMPTY_USER_PROFILE);
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [aiAccessCode, setAiAccessCode] = useState('');

  const showProfileHint = (title: string, message: string) => {
    Alert.alert(title, message);
  };

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const capability = await checkBiometricCapability();
      setBiometricsAvailable(capability.available && capability.enrolled);
      setBiometricTypeName(getBiometricTypeName(capability.biometricType));
      
      const bioEnabled = await isBiometricsEnabled();
      setBiometricsEnabledState(bioEnabled);
      
      const graceSettings = await getGracePeriodSettings();
      setGracePeriodEnabled(graceSettings.enabled);

      const userProfile = await getUserProfile();
      setProfile(userProfile);
      setAiAccessCode(await getAiAccessCode());
    } catch (error) {
      console.error('Error loading settings:', error);
    }
  };

  const updateProfileField = (key: keyof UserProfile, value: string) => {
    setProfile(prev => ({
      ...prev,
      [key]: value,
    }));
  };

  const handleSaveProfile = async () => {
    try {
      setIsSavingProfile(true);
      await saveUserProfile(profile);
      Alert.alert('Saved', 'Your profile defaults have been saved');
    } catch (error) {
      console.error('Error saving profile:', error);
      Alert.alert('Error', 'Failed to save your profile');
    } finally {
      setIsSavingProfile(false);
    }
  };

  const handleSaveAiAccess = async () => {
    await saveAiAccessCode(aiAccessCode);
    Alert.alert('Saved', aiAccessCode.trim() ? 'AI assistance is configured on this device.' : 'AI assistance has been disconnected.');
  };

  const handleBiometricsToggle = async (value: boolean) => {
    try {
      await setBiometricsEnabled(value);
      setBiometricsEnabledState(value);
    } catch (error) {
      console.error('Error setting biometrics:', error);
      Alert.alert('Error', 'Failed to update biometrics setting');
    }
  };

  const handleGracePeriodToggle = async (value: boolean) => {
    try {
      await setGracePeriodSettings(value, 1);
      setGracePeriodEnabled(value);
    } catch (error) {
      console.error('Error setting grace period:', error);
      Alert.alert('Error', 'Failed to update grace period setting');
    }
  };

  const handleResetPin = () => {
    Alert.alert(
      'Reset PIN',
      'Are you sure you want to reset your PIN? You will be logged out and need to create a new PIN.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reset',
          style: 'destructive',
          onPress: async () => {
            try {
              await deletePin();
              setPinSet(false);
              setAuthenticated(false);
            } catch (error) {
              console.error('Error resetting PIN:', error);
              Alert.alert('Error', 'Failed to reset PIN');
            }
          },
        },
      ]
    );
  };

  const handleEraseAllData = () => {
    Alert.alert(
      'Erase All App Data',
      'This permanently deletes every client, note, recording, profile setting, and PIN from this device. This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Continue',
          style: 'destructive',
          onPress: () => Alert.alert(
            'Final Confirmation',
            'Permanently erase all Click Note Taker data now?',
            [
              { text: 'Cancel', style: 'cancel' },
              {
                text: 'Erase Everything',
                style: 'destructive',
                onPress: async () => {
                  try {
                    await resetAppData();
                    setPinSet(false);
                    setAuthenticated(false);
                  } catch (error) {
                    console.error('Error erasing app data:', error);
                    Alert.alert('Error', 'The app could not erase all data. Please try again.');
                  }
                },
              },
            ]
          ),
        },
      ]
    );
  };

  const handleOpenLink = async () => {
    try {
      await Linking.openURL(COMPANY_URL);
    } catch (error) {
      console.error('Error opening link:', error);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Settings</Text>
      </View>

      <ScrollView style={styles.content}>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Profile</Text>

          <View style={styles.field}>
            <View style={styles.fieldLabelRow}>
              <Text style={styles.fieldLabel}>Worker Name</Text>
              <TouchableOpacity
                style={styles.infoButton}
                onPress={() => showProfileHint(
                  'Worker Name',
                  'Used to automatically fill the Worker Name field on new notes and NDIS progress notes.'
                )}
              >
                <Text style={styles.infoButtonText}>i</Text>
              </TouchableOpacity>
            </View>
            <TextInput
              style={styles.fieldInput}
              value={profile.workerName}
              onChangeText={(text) => updateProfileField('workerName', text)}
              placeholder="Your full name"
              placeholderTextColor={COLORS.textMuted}
            />
          </View>

          <View style={styles.field}>
            <View style={styles.fieldLabelRow}>
              <Text style={styles.fieldLabel}>Report Signature Text</Text>
              <TouchableOpacity
                style={styles.infoButton}
                onPress={() => showProfileHint(
                  'Report Signature Text',
                  'Used to fill the Signature line on NDIS progress notes. This can be your typed name, initials, or preferred sign-off text.'
                )}
              >
                <Text style={styles.infoButtonText}>i</Text>
              </TouchableOpacity>
            </View>
            <TextInput
              style={styles.fieldInput}
              value={profile.workerSignature}
              onChangeText={(text) => updateProfileField('workerSignature', text)}
              placeholder="Typed name, initials, or sign-off"
              placeholderTextColor={COLORS.textMuted}
            />
          </View>

          <View style={styles.field}>
            <View style={styles.fieldLabelRow}>
              <Text style={styles.fieldLabel}>Role / Position</Text>
              <TouchableOpacity
                style={styles.infoButton}
                onPress={() => showProfileHint(
                  'Role / Position',
                  'Stores your job title or role for reuse in future report templates and worker details.'
                )}
              >
                <Text style={styles.infoButtonText}>i</Text>
              </TouchableOpacity>
            </View>
            <TextInput
              style={styles.fieldInput}
              value={profile.roleTitle}
              onChangeText={(text) => updateProfileField('roleTitle', text)}
              placeholder="Support Worker"
              placeholderTextColor={COLORS.textMuted}
            />
          </View>

          <View style={styles.field}>
            <View style={styles.fieldLabelRow}>
              <Text style={styles.fieldLabel}>Organisation</Text>
              <TouchableOpacity
                style={styles.infoButton}
                onPress={() => showProfileHint(
                  'Organisation',
                  'Stores the provider, employer, or business name you commonly use in notes and reports.'
                )}
              >
                <Text style={styles.infoButtonText}>i</Text>
              </TouchableOpacity>
            </View>
            <TextInput
              style={styles.fieldInput}
              value={profile.organization}
              onChangeText={(text) => updateProfileField('organization', text)}
              placeholder="Provider or business name"
              placeholderTextColor={COLORS.textMuted}
            />
          </View>

          <View style={styles.field}>
            <View style={styles.fieldLabelRow}>
              <Text style={styles.fieldLabel}>Default Location</Text>
              <TouchableOpacity
                style={styles.infoButton}
                onPress={() => showProfileHint(
                  'Default Location',
                  'Automatically fills the Location field when you create a new note. You can still change it per note.'
                )}
              >
                <Text style={styles.infoButtonText}>i</Text>
              </TouchableOpacity>
            </View>
            <TextInput
              style={styles.fieldInput}
              value={profile.defaultLocation}
              onChangeText={(text) => updateProfileField('defaultLocation', text)}
              placeholder="Common shift location"
              placeholderTextColor={COLORS.textMuted}
            />
          </View>

          <View style={styles.field}>
            <View style={styles.fieldLabelRow}>
              <Text style={styles.fieldLabel}>Provider / Employee Number</Text>
              <TouchableOpacity
                style={styles.infoButton}
                onPress={() => showProfileHint(
                  'Provider / Employee Number',
                  'Optional reference information for future templates. It is saved in your profile but is not currently inserted into progress notes.'
                )}
              >
                <Text style={styles.infoButtonText}>i</Text>
              </TouchableOpacity>
            </View>
            <TextInput
              style={styles.fieldInput}
              value={profile.providerNumber}
              onChangeText={(text) => updateProfileField('providerNumber', text)}
              placeholder="Optional reusable reference"
              placeholderTextColor={COLORS.textMuted}
            />
          </View>

          <TouchableOpacity
            style={styles.primaryButton}
            onPress={handleSaveProfile}
            disabled={isSavingProfile}
          >
            <Text style={styles.primaryButtonText}>
              {isSavingProfile ? 'Saving...' : 'Save Profile'}
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>AI Report Assistance</Text>
          <Text style={styles.infoText}>The access code connects this device to Click eCommerce's protected report assistant. It is stored securely and is not your OpenAI API key.</Text>
          <View style={[styles.field, { marginTop: SPACING.md }]}>
            <View style={styles.fieldLabelRow}>
              <Text style={styles.fieldLabel}>AI Access Code</Text>
              <TouchableOpacity style={styles.infoButton} onPress={() => showProfileHint('AI Access Code', 'A private code supplied by Click eCommerce. Client names, addresses, NDIS numbers, and profile details are not sent to the AI service.')}>
                <Text style={styles.infoButtonText}>i</Text>
              </TouchableOpacity>
            </View>
            <TextInput style={styles.fieldInput} value={aiAccessCode} onChangeText={setAiAccessCode} placeholder="Enter private access code" placeholderTextColor={COLORS.textMuted} secureTextEntry autoCapitalize="none" />
          </View>
          <TouchableOpacity style={styles.primaryButton} onPress={handleSaveAiAccess}><Text style={styles.primaryButtonText}>Save AI Access</Text></TouchableOpacity>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Security</Text>
          
          {biometricsAvailable && (
            <View style={styles.settingRow}>
              <View style={styles.settingInfo}>
                <Text style={styles.settingLabel}>Use {biometricTypeName}</Text>
                <Text style={styles.settingDescription}>
                  Unlock the app using {biometricTypeName.toLowerCase()}
                </Text>
              </View>
              <Switch
                value={biometricsEnabled}
                onValueChange={handleBiometricsToggle}
                trackColor={{ false: COLORS.border, true: COLORS.primary }}
                thumbColor={COLORS.surface}
              />
            </View>
          )}

          <View style={styles.settingRow}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingLabel}>1-Minute Grace Period</Text>
              <Text style={styles.settingDescription}>
                Stay unlocked for 1 minute after leaving the app
              </Text>
            </View>
            <Switch
              value={gracePeriodEnabled}
              onValueChange={handleGracePeriodToggle}
              trackColor={{ false: COLORS.border, true: COLORS.primary }}
              thumbColor={COLORS.surface}
            />
          </View>

          <TouchableOpacity style={styles.dangerButton} onPress={handleResetPin}>
            <Text style={styles.dangerButtonText}>Reset PIN</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>About</Text>
          
          <View style={styles.aboutItem}>
            <Text style={styles.aboutLabel}>App Name</Text>
            <Text style={styles.aboutValue}>{APP_NAME}</Text>
          </View>
          
          <View style={styles.aboutItem}>
            <Text style={styles.aboutLabel}>Version</Text>
            <Text style={styles.aboutValue}>{APP_VERSION}</Text>
          </View>
          
          <TouchableOpacity style={styles.aboutItem} onPress={handleOpenLink}>
            <Text style={styles.aboutLabel}>{APP_TAGLINE}</Text>
            <Text style={styles.linkText}>clickecommerce.com.au</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Data</Text>
          
          <View style={styles.infoBox}>
            <Text style={styles.infoText}>
              Client records remain stored locally. When you choose Improve with AI,
              the app sends only shift times, selected goals, and note content needed
              to draft answers. It excludes client names, addresses, NDIS numbers,
              and profile details. Protect your device and follow your organisation's
              privacy and record-keeping requirements.
            </Text>
          </View>

          <TouchableOpacity style={styles.dangerButton} onPress={handleEraseAllData}>
            <Text style={styles.dangerButtonText}>Erase All App Data</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.spacer} />
      </ScrollView>

      <Footer />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    padding: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    backgroundColor: COLORS.surface,
  },
  headerTitle: {
    fontSize: TYPOGRAPHY.fontSizeXLarge,
    fontWeight: '700',
    color: COLORS.primary,
    textAlign: 'center',
  },
  content: {
    flex: 1,
    padding: SPACING.md,
  },
  section: {
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    padding: SPACING.md,
    marginBottom: SPACING.md,
  },
  sectionTitle: {
    fontSize: TYPOGRAPHY.fontSizeMedium,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: SPACING.md,
  },
  field: {
    marginBottom: SPACING.md,
  },
  fieldLabel: {
    fontSize: TYPOGRAPHY.fontSizeSmall,
    fontWeight: '600',
    color: COLORS.textLight,
  },
  fieldLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.xs,
  },
  infoButton: {
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.primary + '20',
    marginLeft: SPACING.xs,
  },
  infoButtonText: {
    fontSize: TYPOGRAPHY.fontSizeSmall,
    color: COLORS.primary,
    fontWeight: '700',
  },
  fieldInput: {
    backgroundColor: COLORS.background,
    borderRadius: 8,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    fontSize: TYPOGRAPHY.fontSizeBase,
    color: COLORS.text,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  primaryButton: {
    padding: SPACING.md,
    backgroundColor: COLORS.primary,
    borderRadius: 8,
    alignItems: 'center',
  },
  primaryButtonText: {
    fontSize: TYPOGRAPHY.fontSizeBase,
    fontWeight: '600',
    color: COLORS.surface,
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: SPACING.sm,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  settingInfo: {
    flex: 1,
    marginRight: SPACING.md,
  },
  settingLabel: {
    fontSize: TYPOGRAPHY.fontSizeBase,
    fontWeight: '500',
    color: COLORS.text,
  },
  settingDescription: {
    fontSize: TYPOGRAPHY.fontSizeSmall,
    color: COLORS.textMuted,
    marginTop: 2,
  },
  dangerButton: {
    marginTop: SPACING.md,
    padding: SPACING.md,
    backgroundColor: COLORS.error + '10',
    borderRadius: 8,
    alignItems: 'center',
  },
  dangerButtonText: {
    fontSize: TYPOGRAPHY.fontSizeBase,
    fontWeight: '600',
    color: COLORS.error,
  },
  aboutItem: {
    paddingVertical: SPACING.sm,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  aboutLabel: {
    fontSize: TYPOGRAPHY.fontSizeSmall,
    color: COLORS.textMuted,
  },
  aboutValue: {
    fontSize: TYPOGRAPHY.fontSizeBase,
    color: COLORS.text,
    marginTop: 2,
  },
  linkText: {
    fontSize: TYPOGRAPHY.fontSizeBase,
    color: COLORS.primary,
    marginTop: 2,
    textDecorationLine: 'underline',
  },
  infoBox: {
    backgroundColor: COLORS.background,
    padding: SPACING.md,
    borderRadius: 8,
  },
  infoText: {
    fontSize: TYPOGRAPHY.fontSizeSmall,
    color: COLORS.textLight,
    lineHeight: 20,
  },
  spacer: {
    height: SPACING.xxl,
  },
});
