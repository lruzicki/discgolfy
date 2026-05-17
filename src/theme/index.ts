import { Platform } from 'react-native';

export const COLORS = {
  background: '#151517',
  surface: '#222224',
  surfaceLight: '#2A2A2C',
  borderLight: '#2A2A2A',
  borderDark: '#333333',
  primary: '#90CAF9', // Light blue (accents, active icons)
  primaryDark: '#2196F3', // Darker blue (buttons)
  onPrimary: '#0D47A1', // Dark blue text inside light blue buttons
  text: '#FFFFFF',
  textSecondary: '#A0A0A0',
  textLight: '#E0E0E0',
  textMuted: '#666666',
  success: '#4CAF50',
};

export const TYPOGRAPHY = {
  headingFont: Platform.OS === 'ios' ? 'Georgia' : 'serif',
  // In the future, we can add custom font families here after linking them
};
