import React, { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { Footer } from '../../components/Footer';
import { getAllClients, getCompletedNotesBetween } from '../../database';
import { Client, EmploymentType, PayPeriodFrequency, PaySettings } from '../../types';
import { COLORS, SPACING, TYPOGRAPHY } from '../../constants';
import { estimatePay, getCurrentPayPeriod, getDerivedPayRates } from '../../utils/payEstimate';
import { DEFAULT_PAY_SETTINGS, getPaySettings, savePaySettings } from '../../utils/paySettings';
import { formatAustralianDate, formatAustralianTime } from '../../utils/dateTime';

const FREQUENCIES: Array<{ value: PayPeriodFrequency; label: string }> = [
  { value: 'weekly', label: 'Weekly' },
  { value: 'fortnightly', label: 'Fortnightly' },
  { value: 'monthly', label: 'Monthly' },
];

const EMPLOYMENT_TYPES: Array<{ value: EmploymentType; label: string }> = [
  { value: 'casual', label: 'Casual' },
  { value: 'partTime', label: 'Part-time' },
  { value: 'fullTime', label: 'Full-time' },
];

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function money(value: number): string {
  return value.toLocaleString('en-AU', { style: 'currency', currency: 'AUD' });
}

function hours(value: number): string {
  return `${value.toFixed(2)} hrs`;
}

function dayLabel(value: string): string {
  return new Date(value).toLocaleDateString('en-AU', {
    weekday: 'long',
    day: 'numeric',
    month: 'short',
  });
}

export function PayEstimateScreen() {
  const [settings, setSettings] = useState<PaySettings>(DEFAULT_PAY_SETTINGS);
  const [rateInput, setRateInput] = useState('');
  const [periodOffset, setPeriodOffset] = useState(0);
  const [clients, setClients] = useState<Record<string, Client>>({});
  const [notes, setNotes] = useState<Awaited<ReturnType<typeof getCompletedNotesBetween>>>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const period = useMemo(
    () => getCurrentPayPeriod(settings.payPeriodFrequency, settings.weekStartsOn, periodOffset),
    [settings.payPeriodFrequency, settings.weekStartsOn, periodOffset]
  );
  const estimate = useMemo(() => estimatePay(notes, settings, clients), [notes, settings, clients]);
  const derivedRates = useMemo(() => getDerivedPayRates(settings), [settings]);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      const saved = await getPaySettings();
      setSettings(saved);
      setRateInput(saved.hourlyRate ? saved.hourlyRate.toFixed(2) : '');
      const currentPeriod = getCurrentPayPeriod(saved.payPeriodFrequency, saved.weekStartsOn, periodOffset);
      const [allClients, completedNotes] = await Promise.all([
        getAllClients(),
        getCompletedNotesBetween(currentPeriod.start.toISOString(), currentPeriod.end.toISOString()),
      ]);
      setClients(Object.fromEntries(allClients.map(client => [client.id, client])));
      setNotes(completedNotes);
    } catch (error) {
      console.error('Error loading pay estimate:', error);
      Alert.alert('Unable to calculate', 'The pay estimate could not be loaded.');
    } finally {
      setIsLoading(false);
    }
  }, [periodOffset]);

  useFocusEffect(useCallback(() => { loadData(); }, [loadData]));

  const updateSetting = <K extends keyof PaySettings>(key: K, value: PaySettings[K]) => {
    setSettings(previous => ({ ...previous, [key]: value }));
    if (key === 'payPeriodFrequency' || key === 'weekStartsOn') setPeriodOffset(0);
  };

  const handleSave = async () => {
    const hourlyRate = Number(rateInput.replace(',', '.'));
    if (!Number.isFinite(hourlyRate) || hourlyRate <= 0) {
      Alert.alert('Hourly rate required', 'Enter the ordinary hourly rate shown on your payslip.');
      return;
    }
    try {
      setIsSaving(true);
      const next = { ...settings, hourlyRate };
      await savePaySettings(next);
      setSettings(next);
      const nextPeriod = getCurrentPayPeriod(next.payPeriodFrequency, next.weekStartsOn, periodOffset);
      setNotes(await getCompletedNotesBetween(nextPeriod.start.toISOString(), nextPeriod.end.toISOString()));
      Alert.alert('Pay settings saved', 'The estimate has been recalculated.');
    } finally {
      setIsSaving(false);
    }
  };

  const togglePublicHoliday = async (noteId: string) => {
    const exists = settings.publicHolidayNoteIds.includes(noteId);
    const next = {
      ...settings,
      publicHolidayNoteIds: exists
        ? settings.publicHolidayNoteIds.filter(id => id !== noteId)
        : [...settings.publicHolidayNoteIds, noteId],
    };
    setSettings(next);
    await savePaySettings(next);
  };

  const changePeriod = (delta: number) => setPeriodOffset(previous => previous + delta);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Pay Estimate</Text>
      </View>

      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ScrollView style={styles.content} keyboardShouldPersistTaps="handled">
          <View style={styles.notice}>
            <Text style={styles.noticeTitle}>Estimate only</Text>
            <Text style={styles.noticeText}>
              Uses completed shift-note times and common SCHADS penalties. Check your payslip, employment agreement and Fair Work information before relying on the result.
            </Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Pay Settings</Text>
            <Text style={styles.label}>Ordinary hourly rate</Text>
            <TextInput
              style={styles.input}
              value={rateInput}
              onChangeText={setRateInput}
              keyboardType="decimal-pad"
              placeholder="0.00"
              placeholderTextColor={COLORS.textMuted}
            />
            <Text style={styles.helper}>Enter the Monday-Friday ordinary rate shown on the payslip. If it already includes casual loading, leave the toggle below on.</Text>

            <Text style={styles.label}>Employment type</Text>
            <View style={styles.segmentedRow}>
              {EMPLOYMENT_TYPES.map(item => (
                <TouchableOpacity
                  key={item.value}
                  style={[styles.segment, settings.employmentType === item.value && styles.segmentActive]}
                  onPress={() => updateSetting('employmentType', item.value)}
                >
                  <Text style={[styles.segmentText, settings.employmentType === item.value && styles.segmentTextActive]}>{item.label}</Text>
                </TouchableOpacity>
              ))}
            </View>

            {settings.employmentType === 'casual' && (
              <View style={styles.switchRow}>
                <View style={styles.switchCopy}>
                  <Text style={styles.switchLabel}>Rate includes casual loading</Text>
                  <Text style={styles.helper}>Turn on when the entered weekday rate already includes the 25% casual loading.</Text>
                </View>
                <Switch
                  value={settings.rateIncludesCasualLoading}
                  onValueChange={value => updateSetting('rateIncludesCasualLoading', value)}
                  trackColor={{ false: COLORS.border, true: COLORS.primary }}
                />
              </View>
            )}

            <View style={styles.ratePreview}>
              <Text style={styles.ratePreviewTitle}>Calculated hourly rates</Text>
              <View style={styles.ratePreviewRow}><Text style={styles.ratePreviewLabel}>Weekday</Text><Text style={styles.ratePreviewValue}>{money(derivedRates.ordinary)}</Text></View>
              <View style={styles.ratePreviewRow}><Text style={styles.ratePreviewLabel}>Saturday</Text><Text style={styles.ratePreviewValue}>{money(derivedRates.saturday)}</Text></View>
              <View style={styles.ratePreviewRow}><Text style={styles.ratePreviewLabel}>Sunday</Text><Text style={styles.ratePreviewValue}>{money(derivedRates.sunday)}</Text></View>
            </View>

            {settings.employmentType !== 'fullTime' && (
              <>
                <Text style={styles.label}>Minimum paid shift</Text>
                <View style={styles.segmentedRow}>
                  {[2, 3].map(value => (
                    <TouchableOpacity
                      key={value}
                      style={[styles.segment, settings.minimumPaidHours === value && styles.segmentActive]}
                      onPress={() => updateSetting('minimumPaidHours', value)}
                    >
                      <Text style={[styles.segmentText, settings.minimumPaidHours === value && styles.segmentTextActive]}>{value} hours</Text>
                    </TouchableOpacity>
                  ))}
                </View>
                <Text style={styles.helper}>Defaults to your employer's 3-hour minimum. SCHADS minimums vary by service stream.</Text>
              </>
            )}

            <Text style={styles.label}>Pay frequency</Text>
            <View style={styles.segmentedRow}>
              {FREQUENCIES.map(item => (
                <TouchableOpacity
                  key={item.value}
                  style={[styles.segment, settings.payPeriodFrequency === item.value && styles.segmentActive]}
                  onPress={() => updateSetting('payPeriodFrequency', item.value)}
                >
                  <Text style={[styles.segmentText, settings.payPeriodFrequency === item.value && styles.segmentTextActive]}>{item.label}</Text>
                </TouchableOpacity>
              ))}
            </View>

            {settings.payPeriodFrequency !== 'monthly' && (
              <>
                <Text style={styles.label}>Working week starts</Text>
                <View style={styles.weekdayRow}>
                  {WEEKDAYS.map((day, index) => (
                    <TouchableOpacity
                      key={day}
                      style={[styles.weekdayButton, settings.weekStartsOn === index && styles.weekdayButtonActive]}
                      onPress={() => updateSetting('weekStartsOn', index)}
                    >
                      <Text style={[styles.weekdayText, settings.weekStartsOn === index && styles.weekdayTextActive]}>{day}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
                <Text style={styles.helper}>The period begins at 12:00 am and ends at midnight on the final day.</Text>
              </>
            )}

            <View style={styles.switchRow}>
              <View style={styles.switchCopy}>
                <Text style={styles.switchLabel}>Claim tax-free threshold</Text>
                <Text style={styles.helper}>Used for the ATO PAYG withholding estimate.</Text>
              </View>
              <Switch
                value={settings.claimsTaxFreeThreshold}
                onValueChange={value => updateSetting('claimsTaxFreeThreshold', value)}
                trackColor={{ false: COLORS.border, true: COLORS.primary }}
              />
            </View>

            <TouchableOpacity style={styles.saveButton} onPress={handleSave} disabled={isSaving}>
              <Text style={styles.saveButtonText}>{isSaving ? 'Saving...' : 'Save and Recalculate'}</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.periodBand}>
            <TouchableOpacity style={styles.periodArrow} onPress={() => changePeriod(-1)} accessibilityLabel="Previous pay period">
              <Text style={styles.periodArrowText}>‹</Text>
            </TouchableOpacity>
            <View style={styles.periodCopy}>
              <Text style={styles.periodTitle}>Pay Period</Text>
              <Text style={styles.periodDates}>{formatAustralianDate(period.start.toISOString())} - {formatAustralianDate(new Date(period.end.getTime() - 1).toISOString())}</Text>
            </View>
            <TouchableOpacity style={styles.periodArrow} onPress={() => changePeriod(1)} accessibilityLabel="Next pay period">
              <Text style={styles.periodArrowText}>›</Text>
            </TouchableOpacity>
          </View>

          {isLoading ? (
            <ActivityIndicator color={COLORS.primary} size="large" style={styles.loading} />
          ) : (
            <>
              <View style={styles.summaryGrid}>
                <View style={styles.summaryItem}><Text style={styles.summaryLabel}>Hours</Text><Text style={styles.summaryValue}>{hours(estimate.hours)}</Text></View>
                <View style={styles.summaryItem}><Text style={styles.summaryLabel}>Gross</Text><Text style={styles.summaryValue}>{money(estimate.gross)}</Text></View>
                <View style={styles.summaryItem}><Text style={styles.summaryLabel}>Est. PAYG</Text><Text style={styles.summaryValue}>{money(estimate.tax)}</Text></View>
                <View style={[styles.summaryItem, styles.netItem]}><Text style={styles.summaryLabel}>Est. Take-home</Text><Text style={styles.netValue}>{money(estimate.net)}</Text></View>
                <View style={styles.summaryItem}><Text style={styles.summaryLabel}>Super (12%)</Text><Text style={styles.summaryValue}>{money(estimate.superannuation)}</Text></View>
              </View>

              <Text style={styles.listTitle}>Daily Totals</Text>
              <View style={styles.dailyTotals}>
                {estimate.days.map(day => (
                  <View key={day.date} style={styles.dailyRow}>
                    <View style={styles.dailyCopy}>
                      <Text style={styles.dailyDay}>{dayLabel(day.date)}</Text>
                      <Text style={styles.dailyHours}>
                        {hours(day.hours)} · {day.shiftCount} shift{day.shiftCount === 1 ? '' : 's'}
                      </Text>
                    </View>
                    <Text style={styles.dailyGross}>{money(day.gross)}</Text>
                  </View>
                ))}
              </View>

              <Text style={styles.listTitle}>Completed Shifts ({estimate.shifts.length})</Text>
              {estimate.shifts.length === 0 ? (
                <Text style={styles.emptyText}>No completed shift notes were found in this pay period.</Text>
              ) : estimate.shifts.map(shift => (
                <View key={shift.note.id} style={styles.shiftRow}>
                  <View style={styles.shiftMain}>
                    <Text style={styles.shiftClient}>{clients[shift.note.clientId]?.fullName || 'Client'}</Text>
                    <Text style={styles.shiftTime}>
                      {formatAustralianDate(shift.paidStart)} · {formatAustralianTime(shift.paidStart)}-{formatAustralianTime(shift.paidEnd)}
                    </Text>
                    <Text style={shift.usesScheduledShift ? styles.scheduleSource : styles.fallbackSource}>
                      {shift.usesScheduledShift ? 'Scheduled shift time' : 'Recorded time (no matching client shift)'}
                    </Text>
                    <Text style={styles.shiftRate}>{shift.rateLabel} · {hours(shift.hours)} · {money(shift.rate)}/hr</Text>
                    {shift.minimumApplied && <Text style={styles.minimumLabel}>{settings.minimumPaidHours}-hour minimum applied</Text>}
                    <TouchableOpacity style={styles.holidayToggle} onPress={() => togglePublicHoliday(shift.note.id)} accessibilityRole="checkbox" accessibilityState={{ checked: shift.isPublicHoliday }}>
                      <View style={[styles.checkbox, shift.isPublicHoliday && styles.checkboxChecked]}>{shift.isPublicHoliday && <Text style={styles.checkmark}>✓</Text>}</View>
                      <Text style={styles.holidayText}>Public holiday</Text>
                    </TouchableOpacity>
                  </View>
                  <Text style={styles.shiftGross}>{money(shift.gross)}</Text>
                </View>
              ))}
            </>
          )}

          <View style={styles.limitsBox}>
            <Text style={styles.limitsTitle}>Not included automatically</Text>
            <Text style={styles.limitsText}>Travel, mileage, expenses, broken-shift and sleepover allowances, overtime, unpaid breaks, salary packaging, HELP/STSL and individual workplace agreements. PAYG and super estimates only use earnings included above.</Text>
          </View>
          <View style={styles.spacer} />
        </ScrollView>
      </KeyboardAvoidingView>
      <Footer />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  container: { flex: 1, backgroundColor: COLORS.background },
  header: { padding: SPACING.md, backgroundColor: COLORS.surface, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  headerTitle: { fontSize: TYPOGRAPHY.fontSizeXLarge, fontWeight: '700', color: COLORS.primary, textAlign: 'center' },
  content: { flex: 1, padding: SPACING.md },
  notice: { backgroundColor: '#FFF8E1', borderLeftWidth: 4, borderLeftColor: '#D69E2E', padding: SPACING.md, marginBottom: SPACING.md },
  noticeTitle: { fontWeight: '700', color: '#975A16', marginBottom: SPACING.xs },
  noticeText: { fontSize: TYPOGRAPHY.fontSizeSmall, lineHeight: 18, color: COLORS.text },
  section: { backgroundColor: COLORS.surface, borderRadius: 8, padding: SPACING.md, marginBottom: SPACING.md },
  sectionTitle: { fontSize: TYPOGRAPHY.fontSizeMedium, fontWeight: '700', color: COLORS.text, marginBottom: SPACING.md },
  label: { fontSize: TYPOGRAPHY.fontSizeSmall, fontWeight: '700', color: COLORS.textLight, marginTop: SPACING.sm, marginBottom: SPACING.xs },
  input: { backgroundColor: COLORS.background, borderWidth: 1, borderColor: COLORS.border, borderRadius: 8, padding: SPACING.sm, fontSize: TYPOGRAPHY.fontSizeBase, color: COLORS.text },
  segmentedRow: { flexDirection: 'row', gap: SPACING.xs, marginBottom: SPACING.sm },
  segment: { flex: 1, minHeight: 42, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: COLORS.border, borderRadius: 6, paddingHorizontal: SPACING.xs },
  segmentActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  segmentText: { fontSize: TYPOGRAPHY.fontSizeSmall, color: COLORS.text, textAlign: 'center' },
  segmentTextActive: { color: COLORS.surface, fontWeight: '700' },
  switchRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: SPACING.sm },
  switchCopy: { flex: 1, marginRight: SPACING.md },
  switchLabel: { fontSize: TYPOGRAPHY.fontSizeBase, fontWeight: '600', color: COLORS.text },
  helper: { fontSize: TYPOGRAPHY.fontSizeSmall, color: COLORS.textMuted, lineHeight: 17, marginTop: 2 },
  ratePreview: { backgroundColor: COLORS.background, borderRadius: 6, padding: SPACING.sm, marginVertical: SPACING.sm },
  ratePreviewTitle: { fontSize: TYPOGRAPHY.fontSizeSmall, color: COLORS.textLight, fontWeight: '700', marginBottom: SPACING.xs },
  ratePreviewRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 2 },
  ratePreviewLabel: { fontSize: TYPOGRAPHY.fontSizeSmall, color: COLORS.textLight },
  ratePreviewValue: { fontSize: TYPOGRAPHY.fontSizeSmall, color: COLORS.text, fontWeight: '700' },
  weekdayRow: { flexDirection: 'row', gap: 3 },
  weekdayButton: { flex: 1, height: 38, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: COLORS.border, borderRadius: 6 },
  weekdayButtonActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  weekdayText: { fontSize: 11, color: COLORS.text },
  weekdayTextActive: { color: COLORS.surface, fontWeight: '700' },
  saveButton: { backgroundColor: COLORS.primary, padding: SPACING.md, alignItems: 'center', borderRadius: 8, marginTop: SPACING.md },
  saveButtonText: { color: COLORS.surface, fontWeight: '700', fontSize: TYPOGRAPHY.fontSizeBase },
  periodBand: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.primaryDark, marginHorizontal: -SPACING.md, paddingVertical: SPACING.sm, paddingHorizontal: SPACING.md },
  periodArrow: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  periodArrowText: { color: COLORS.surface, fontSize: 32 },
  periodCopy: { flex: 1, alignItems: 'center' },
  periodTitle: { color: COLORS.surface, fontWeight: '700' },
  periodDates: { color: '#D9E6F2', fontSize: TYPOGRAPHY.fontSizeSmall, marginTop: 2 },
  loading: { marginVertical: SPACING.xl },
  summaryGrid: { flexDirection: 'row', flexWrap: 'wrap', backgroundColor: COLORS.surface, marginHorizontal: -SPACING.md, marginBottom: SPACING.lg },
  summaryItem: { width: '50%', padding: SPACING.md, borderBottomWidth: 1, borderRightWidth: 1, borderColor: COLORS.border },
  netItem: { backgroundColor: '#F0FFF4' },
  summaryLabel: { fontSize: TYPOGRAPHY.fontSizeSmall, color: COLORS.textLight },
  summaryValue: { fontSize: TYPOGRAPHY.fontSizeLarge, color: COLORS.text, fontWeight: '700', marginTop: SPACING.xs },
  netValue: { fontSize: TYPOGRAPHY.fontSizeLarge, color: '#276749', fontWeight: '700', marginTop: SPACING.xs },
  listTitle: { fontSize: TYPOGRAPHY.fontSizeMedium, fontWeight: '700', color: COLORS.text, marginBottom: SPACING.sm },
  dailyTotals: { backgroundColor: COLORS.surface, marginBottom: SPACING.lg, borderWidth: 1, borderColor: COLORS.border, borderRadius: 8, overflow: 'hidden' },
  dailyRow: { minHeight: 64, flexDirection: 'row', alignItems: 'center', paddingHorizontal: SPACING.md, paddingVertical: SPACING.sm, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: COLORS.border },
  dailyCopy: { flex: 1, marginRight: SPACING.sm },
  dailyDay: { fontSize: TYPOGRAPHY.fontSizeBase, color: COLORS.text, fontWeight: '700' },
  dailyHours: { fontSize: TYPOGRAPHY.fontSizeSmall, color: COLORS.textLight, marginTop: 2 },
  dailyGross: { fontSize: TYPOGRAPHY.fontSizeBase, color: COLORS.primary, fontWeight: '700' },
  emptyText: { color: COLORS.textMuted, textAlign: 'center', paddingVertical: SPACING.xl },
  shiftRow: { flexDirection: 'row', backgroundColor: COLORS.surface, borderBottomWidth: 1, borderBottomColor: COLORS.border, padding: SPACING.md },
  shiftMain: { flex: 1, marginRight: SPACING.sm },
  shiftClient: { fontSize: TYPOGRAPHY.fontSizeBase, fontWeight: '700', color: COLORS.text },
  shiftTime: { fontSize: TYPOGRAPHY.fontSizeSmall, color: COLORS.textLight, marginTop: 2 },
  scheduleSource: { fontSize: TYPOGRAPHY.fontSizeSmall, color: '#276749', fontWeight: '600', marginTop: 2 },
  fallbackSource: { fontSize: TYPOGRAPHY.fontSizeSmall, color: '#975A16', fontWeight: '600', marginTop: 2 },
  shiftRate: { fontSize: TYPOGRAPHY.fontSizeSmall, color: COLORS.primary, marginTop: SPACING.xs },
  minimumLabel: { fontSize: TYPOGRAPHY.fontSizeSmall, color: '#975A16', fontWeight: '700', marginTop: 2 },
  shiftGross: { fontSize: TYPOGRAPHY.fontSizeBase, color: COLORS.text, fontWeight: '700' },
  holidayToggle: { flexDirection: 'row', alignItems: 'center', marginTop: SPACING.sm, alignSelf: 'flex-start' },
  checkbox: { width: 20, height: 20, borderWidth: 1, borderColor: COLORS.border, borderRadius: 4, alignItems: 'center', justifyContent: 'center', marginRight: SPACING.xs },
  checkboxChecked: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  checkmark: { color: COLORS.surface, fontSize: 13, fontWeight: '700' },
  holidayText: { fontSize: TYPOGRAPHY.fontSizeSmall, color: COLORS.textLight },
  limitsBox: { marginTop: SPACING.lg, borderTopWidth: 1, borderTopColor: COLORS.border, paddingTop: SPACING.md },
  limitsTitle: { fontSize: TYPOGRAPHY.fontSizeSmall, fontWeight: '700', color: COLORS.textLight },
  limitsText: { fontSize: TYPOGRAPHY.fontSizeSmall, color: COLORS.textMuted, lineHeight: 18, marginTop: SPACING.xs },
  spacer: { height: SPACING.xxl },
});
