import React from 'react';
import { View, Text, StyleSheet, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export interface AvatarProps {
  userId: string;
  name: string;
  avatarUrl?: string | null;
  size?: number;
}

const AVATAR_COLORS = [
  '#ef4444', // red-500
  '#f97316', // orange-500
  '#f59e0b', // amber-500
  '#10b981', // emerald-500
  '#06b6d4', // cyan-500
  '#3b82f6', // blue-500
  '#6366f1', // indigo-500
  '#8b5cf6', // violet-500
  '#d946ef', // fuchsia-500
  '#f43f5e', // rose-500
];

function getAvatarColor(userId: string): string {
  let hash = 0;
  for (let i = 0; i < userId.length; i++) {
    hash = userId.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % AVATAR_COLORS.length;
  return AVATAR_COLORS[index];
}

export function Avatar({ userId, name, avatarUrl, size = 100 }: AvatarProps) {
  if (avatarUrl && avatarUrl.startsWith('icon:')) {
    const [, iconName, iconColor] = avatarUrl.split(':');
    return (
      <View
        testID="avatar-container"
        style={[
          styles.container,
          {
            backgroundColor: iconColor,
            width: size,
            height: size,
            borderRadius: size / 2,
          }
        ]}
      >
        <Ionicons name={iconName as any} size={size * 0.6} color="#ffffff" testID="avatar-icon" />
      </View>
    );
  }

  if (avatarUrl) {
    return (
      <Image
        testID="avatar-image"
        source={{ uri: avatarUrl }}
        style={[
          styles.image,
          {
            width: size,
            height: size,
            borderRadius: size / 2,
          }
        ]}
      />
    );
  }

  const initial = name ? name.charAt(0).toUpperCase() : '?';
  const backgroundColor = getAvatarColor(userId);

  return (
    <View 
      testID="avatar-container" 
      style={[
        styles.container, 
        { 
          backgroundColor,
          width: size,
          height: size,
          borderRadius: size / 2,
        }
      ]}
    >
      <Text style={[styles.text, { fontSize: size * 0.4 }]}>{initial}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  image: {
    resizeMode: 'cover',
  },
  text: {
    color: '#ffffff',
    fontWeight: 'bold',
  },
});
