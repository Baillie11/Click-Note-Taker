import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { RouteProp, useFocusEffect, useNavigation, useRoute } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import * as Clipboard from 'expo-clipboard';
import { COLORS, MIN_BOTTOM_SAFE_AREA, SPACING, TYPOGRAPHY } from '../../constants';
import { getNoteById, updateNote } from '../../database';
import { Note, RootStackParamList } from '../../types';
import { requestReportDrafts } from '../../services/reportAssistant';
import { activeReportQuestions, parseReportState, reportProgress, ReportAssistantState, ReportQuestion } from '../../utils/reportQuestions';

type ScreenRoute = RouteProp<RootStackParamList, 'ReportAssistant'>;
type Navigation = NativeStackNavigationProp<RootStackParamList>;

export function ReportAssistantScreen() {
  const route = useRoute<ScreenRoute>();
  const navigation = useNavigation<Navigation>();
  const insets = useSafeAreaInsets();
  const [note, setNote] = useState<Note | null>(null);
  const [state, setState] = useState<ReportAssistantState>({ statuses: {}, decisions: {} });
  const [index, setIndex] = useState(0);
  const [isDrafting, setIsDrafting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const load = useCallback(async () => {
    const loaded = await getNoteById(route.params.noteId);
    if (!loaded) return Alert.alert('Note not found', 'This shift note could not be opened.');
    setNote(loaded);
    setState(parseReportState(loaded.reportAssistantState));
  }, [route.params.noteId]);

  useFocusEffect(useCallback(() => { load(); }, [load]));
  const questions = useMemo(() => note ? activeReportQuestions(note, state) : [], [note, state]);
  const question = questions[Math.min(index, Math.max(questions.length - 1, 0))];
  const progress = note ? reportProgress(note, state) : { confirmed: 0, total: 0, complete: false };

  useEffect(() => { if (index >= questions.length) setIndex(Math.max(questions.length - 1, 0)); }, [index, questions.length]);

  const persist = async (nextNote: Note, nextState: ReportAssistantState) => {
    setNote(nextNote);
    setState(nextState);
    await updateNote(nextNote.id, { ...nextNote, reportAssistantState: JSON.stringify(nextState) });
  };

  const answerText = question ? (question.id === 'shift-times'
    ? `${new Date(note!.timeIn).toLocaleString()} to ${note!.timeOut ? new Date(note!.timeOut).toLocaleString() : 'Not finished'}`
    : String(note?.[question.field] || '')) : '';

  const updateText = (text: string) => {
    if (!note || !question || question.id === 'shift-times') return;
    setNote({ ...note, [question.field]: text });
    setState({ ...state, statuses: { ...state.statuses, [question.id]: 'unanswered' } });
  };

  const chooseDecision = async (value: string) => {
    if (!note || !question) return;
    const nextState = {
      ...state,
      decisions: { ...state.decisions, [question.id]: value },
      statuses: { ...state.statuses, [question.id]: 'confirmed' as const },
    };
    await persist(note, nextState);
  };

  const confirmCurrent = async () => {
    if (!note || !question) return;
    if (!answerText.trim() || (question.id === 'shift-times' && !note.timeOut)) {
      return Alert.alert('Answer required', question.id === 'shift-times' ? 'Finish the shift or add a Time Out before confirming.' : 'Add an answer before confirming it.');
    }
    setIsSaving(true);
    try {
      await persist(note, { ...state, statuses: { ...state.statuses, [question.id]: 'confirmed' } });
      if (index < questions.length - 1) setIndex(index + 1);
    } finally { setIsSaving(false); }
  };

  const draftWithAi = async () => {
    if (!note) return;
    setIsDrafting(true);
    try {
      const draftable = questions.filter(item => item.kind === 'text' && item.id !== 'shift-times');
      const drafts = await requestReportDrafts(note, draftable);
      let nextNote = { ...note };
      const statuses = { ...state.statuses };
      drafts.forEach(draft => {
        const target = draftable.find(item => item.id === draft.questionId);
        if (target && draft.answer.trim()) {
          nextNote = { ...nextNote, [target.field]: draft.answer.trim() };
          statuses[target.id] = 'drafted';
        }
      });
      await persist(nextNote, { ...state, statuses, generatedAt: new Date().toISOString() });
      Alert.alert('Drafts ready', 'Review every draft against what actually happened, then confirm each response.');
    } catch (error) {
      Alert.alert('AI assistance unavailable', error instanceof Error ? error.message : 'Continue manually and try again later.');
    } finally { setIsDrafting(false); }
  };

  const copyCurrent = async () => {
    const value = question?.kind === 'text' ? answerText : state.decisions[question?.id || ''];
    if (!value?.trim()) return Alert.alert('Nothing to copy', 'Add or select an answer first.');
    await Clipboard.setStringAsync(value);
    Alert.alert('Copied', `${question?.title} is ready to paste.`);
  };

  const finish = async () => {
    if (!note) return;
    const latest = reportProgress(note, state);
    if (!latest.complete) return Alert.alert('Review not complete', `${latest.total - latest.confirmed} required response${latest.total - latest.confirmed === 1 ? '' : 's'} still need confirmation.`);
    await updateNote(note.id, { status: 'completed', reportAssistantState: JSON.stringify(state) });
    Alert.alert('Report complete', 'Every required response has been reviewed. You can now copy answers into your reporting app.', [{ text: 'Done', onPress: () => navigation.goBack() }]);
  };

  if (!note || !question) return <SafeAreaView style={styles.container}><ActivityIndicator style={styles.loader} color={COLORS.primary} /></SafeAreaView>;
  const status = state.statuses[question.id] || 'unanswered';
  const choices = question.kind === 'yes_no_na' ? ['Yes', 'No', 'N/A'] : ['Yes', 'No'];

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}><Text style={styles.headerAction}>Back</Text></TouchableOpacity>
          <Text style={styles.headerTitle}>Report Assistant</Text>
          <Text style={styles.counter}>{index + 1}/{questions.length}</Text>
        </View>
        <View style={styles.progressTrack}><View style={[styles.progressFill, { width: `${progress.total ? (progress.confirmed / progress.total) * 100 : 0}%` }]} /></View>
        <ScrollView contentContainerStyle={[styles.content, { paddingBottom: Math.max(insets.bottom, MIN_BOTTOM_SAFE_AREA) + SPACING.xl }]} keyboardShouldPersistTaps="handled">
          <View style={styles.summaryRow}>
            <Text style={styles.progressText}>{progress.confirmed} of {progress.total} confirmed</Text>
            <TouchableOpacity style={styles.aiButton} onPress={draftWithAi} disabled={isDrafting}>
              <Text style={styles.aiButtonText}>{isDrafting ? 'Drafting...' : 'Improve with AI'}</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.questionPanel}>
            <View style={styles.questionHeader}>
              <Text style={styles.questionTitle}>{question.title}</Text>
              <Text style={[styles.status, status === 'confirmed' ? styles.confirmed : status === 'drafted' ? styles.drafted : styles.unanswered]}>{status === 'confirmed' ? 'Confirmed' : status === 'drafted' ? 'AI draft' : 'Needs answer'}</Text>
            </View>
            <Text style={styles.prompt}>{question.prompt}</Text>
            {question.kind === 'text' ? (
              <>
                <TextInput style={[styles.input, question.id === 'shift-times' && styles.readOnly]} value={answerText} onChangeText={updateText} onBlur={() => persist(note, state).catch(() => Alert.alert('Save failed', 'This answer could not be saved. Please try again.'))} editable={question.id !== 'shift-times'} multiline textAlignVertical="top" placeholder="Add factual details from this shift" placeholderTextColor={COLORS.textMuted} />
                {question.id === 'shift-times' && <TouchableOpacity onPress={() => navigation.goBack()}><Text style={styles.editLink}>Edit times in shift note</Text></TouchableOpacity>}
              </>
            ) : (
              <View style={styles.choiceRow}>{choices.map(choice => <TouchableOpacity key={choice} style={[styles.choice, state.decisions[question.id] === choice && styles.choiceSelected]} onPress={() => chooseDecision(choice)}><Text style={[styles.choiceText, state.decisions[question.id] === choice && styles.choiceTextSelected]}>{choice}</Text></TouchableOpacity>)}</View>
            )}
            <Text style={styles.reviewNotice}>AI drafts must be checked against your observations. The app will not invent a Yes or No response.</Text>
          </View>
          <View style={styles.actionRow}>
            <TouchableOpacity style={styles.secondaryButton} onPress={copyCurrent}><Text style={styles.secondaryText}>Copy answer</Text></TouchableOpacity>
            {question.kind === 'text' && <TouchableOpacity style={styles.primaryButton} onPress={confirmCurrent} disabled={isSaving}><Text style={styles.primaryText}>{isSaving ? 'Saving...' : 'Confirm & next'}</Text></TouchableOpacity>}
          </View>
          <View style={styles.navigationRow}>
            <TouchableOpacity disabled={index === 0} onPress={() => setIndex(Math.max(0, index - 1))}><Text style={[styles.navText, index === 0 && styles.disabled]}>Previous</Text></TouchableOpacity>
            <TouchableOpacity disabled={index >= questions.length - 1} onPress={() => setIndex(Math.min(questions.length - 1, index + 1))}><Text style={[styles.navText, index >= questions.length - 1 && styles.disabled]}>Next</Text></TouchableOpacity>
          </View>
          <TouchableOpacity style={[styles.finishButton, !progress.complete && styles.finishDisabled]} onPress={finish}><Text style={styles.finishText}>Complete End-of-Shift Report</Text></TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background }, loader: { flex: 1 },
  header: { height: 60, paddingHorizontal: SPACING.md, backgroundColor: COLORS.surface, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderBottomWidth: 1, borderBottomColor: COLORS.border },
  headerAction: { color: COLORS.primary, fontSize: TYPOGRAPHY.fontSizeBase, fontWeight: '600' }, headerTitle: { color: COLORS.text, fontSize: TYPOGRAPHY.fontSizeLarge, fontWeight: '700' }, counter: { color: COLORS.textLight, minWidth: 42, textAlign: 'right' },
  progressTrack: { height: 5, backgroundColor: COLORS.border }, progressFill: { height: 5, backgroundColor: COLORS.secondary },
  content: { padding: SPACING.md }, summaryRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: SPACING.md }, progressText: { color: COLORS.textLight, fontWeight: '600' },
  aiButton: { backgroundColor: COLORS.primary, borderRadius: 8, paddingHorizontal: SPACING.md, paddingVertical: SPACING.sm }, aiButtonText: { color: COLORS.surface, fontWeight: '700' },
  questionPanel: { backgroundColor: COLORS.surface, borderWidth: 2, borderColor: COLORS.primaryLight, borderRadius: 8, padding: SPACING.md }, questionHeader: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: SPACING.sm },
  questionTitle: { flex: 1, fontSize: TYPOGRAPHY.fontSizeLarge, color: COLORS.primaryDark, fontWeight: '700' }, status: { fontSize: TYPOGRAPHY.fontSizeSmall, fontWeight: '700', paddingHorizontal: SPACING.sm, paddingVertical: SPACING.xs, borderRadius: 6 }, confirmed: { color: COLORS.success, backgroundColor: '#E6FFFA' }, drafted: { color: COLORS.warning, backgroundColor: '#FFFAF0' }, unanswered: { color: COLORS.error, backgroundColor: '#FFF5F5' },
  prompt: { color: COLORS.text, fontSize: TYPOGRAPHY.fontSizeBase, lineHeight: 24, marginVertical: SPACING.md }, input: { minHeight: 180, borderWidth: 1, borderColor: COLORS.border, borderRadius: 8, backgroundColor: COLORS.background, color: COLORS.text, fontSize: TYPOGRAPHY.fontSizeBase, lineHeight: 24, padding: SPACING.md }, readOnly: { minHeight: 90, color: COLORS.textLight }, editLink: { color: COLORS.primary, fontWeight: '600', marginTop: SPACING.sm },
  choiceRow: { flexDirection: 'row', gap: SPACING.sm }, choice: { flex: 1, borderWidth: 1, borderColor: COLORS.primary, borderRadius: 8, paddingVertical: SPACING.md, alignItems: 'center' }, choiceSelected: { backgroundColor: COLORS.primary }, choiceText: { color: COLORS.primary, fontWeight: '700' }, choiceTextSelected: { color: COLORS.surface },
  reviewNotice: { color: COLORS.textLight, fontSize: TYPOGRAPHY.fontSizeSmall, lineHeight: 18, marginTop: SPACING.md }, actionRow: { flexDirection: 'row', gap: SPACING.sm, marginTop: SPACING.md }, secondaryButton: { flex: 1, borderWidth: 1, borderColor: COLORS.primary, borderRadius: 8, padding: SPACING.md, alignItems: 'center' }, secondaryText: { color: COLORS.primary, fontWeight: '700' }, primaryButton: { flex: 1, backgroundColor: COLORS.secondary, borderRadius: 8, padding: SPACING.md, alignItems: 'center' }, primaryText: { color: COLORS.surface, fontWeight: '700' },
  navigationRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: SPACING.lg }, navText: { color: COLORS.primary, fontWeight: '700' }, disabled: { color: COLORS.disabled }, finishButton: { backgroundColor: COLORS.secondary, borderRadius: 8, padding: SPACING.md, alignItems: 'center' }, finishDisabled: { backgroundColor: COLORS.textMuted }, finishText: { color: COLORS.surface, fontWeight: '700', fontSize: TYPOGRAPHY.fontSizeBase },
});
