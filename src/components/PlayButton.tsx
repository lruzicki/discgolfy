import React from 'react';
import { TouchableOpacity, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../theme';

interface PlayButtonProps {
  onPress: () => void;
  title?: string;
  loading?: boolean;
  disabled?: boolean;
}

export function PlayButton({ 
  onPress, 
  title = 'Graj', 
  loading = false, 
  disabled = false 
}: PlayButtonProps) {
  return (
    <TouchableOpacity 
      style={[styles.playButton, (disabled || loading) && styles.disabledButton]} 
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.8}
    >
      {loading ? (
        <ActivityIndicator color={COLORS.onPrimary} />
      ) : (
        <>
          <Text style={styles.playButtonText}>{title}</Text>
          <Ionicons name="play" size={18} color={COLORS.onPrimary} />
        </>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  playButton: {
    backgroundColor: COLORS.primary,
    borderRadius: 30,
    paddingVertical: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  disabledButton: {
    opacity: 0.6,
  },
  playButtonText: {
    color: COLORS.onPrimary,
    fontSize: 18,
    fontWeight: '700',
  },
});
