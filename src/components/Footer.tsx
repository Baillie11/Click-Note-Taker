import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { APP_TAGLINE, COLORS, TYPOGRAPHY, SPACING } from '../constants';
import { openCompanyWebsite } from '../utils/links';

interface FooterProps {
  showTagline?: boolean;
}

export function Footer({ showTagline = true }: FooterProps) {
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.container, { paddingBottom: Math.max(insets.bottom, SPACING.sm) }]}>
      {showTagline && (
        <TouchableOpacity onPress={openCompanyWebsite} activeOpacity={0.7}>
          <Text style={styles.tagline}>{APP_TAGLINE}</Text>
          <Text style={styles.link}>clickecommerce.com.au</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.md,
    backgroundColor: COLORS.background,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  tagline: {
    fontSize: TYPOGRAPHY.fontSizeSmall,
    color: COLORS.textMuted,
    textAlign: 'center',
  },
  link: {
    fontSize: TYPOGRAPHY.fontSizeSmall,
    color: COLORS.primary,
    textAlign: 'center',
    textDecorationLine: 'underline',
  },
});
