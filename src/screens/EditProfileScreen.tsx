import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, Image, Alert, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../theme';
import { supabase } from '../lib/supabase';
import { profileService } from '../services/profileService';
import * as ImagePicker from 'expo-image-picker';

export function EditProfileScreen({ navigation }: any) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [profileId, setProfileId] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [isEditingEmail, setIsEditingEmail] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [newAvatarUri, setNewAvatarUri] = useState<string | null>(null);

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      setEmail(user.email || '');
      setNewEmail(user.email || '');

      const { data: profile } = await supabase
        .from('profiles')
        .select('id, display_name, avatar_url')
        .eq('auth_id', user.id)
        .single();

      if (profile) {
        setProfileId(profile.id);
        setDisplayName(profile.display_name);
        setAvatarUrl(profile.avatar_url);
      }
    } catch (error) {
      console.error('Error fetching profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!displayName.trim()) {
      Alert.alert('Error', 'Display name cannot be empty');
      return;
    }

    try {
      setSaving(true);
      
      let finalAvatarUrl = avatarUrl;
      if (newAvatarUri) {
        const uploadResult = await profileService.uploadAvatar(profileId, newAvatarUri);
        if (uploadResult.success) {
          finalAvatarUrl = uploadResult.publicUrl || avatarUrl;
        } else {
          Alert.alert('Error', uploadResult.error || 'Failed to upload avatar');
          setSaving(false);
          return;
        }
      }

      const result = await profileService.updateProfile(profileId, {
        display_name: displayName,
        avatar_url: finalAvatarUrl || undefined
      });

      if (result.success) {
        navigation.goBack();
      } else {
        Alert.alert('Error', result.error || 'Failed to update profile');
      }
    } catch (error) {
      Alert.alert('Error', 'An unexpected error occurred');
    } finally {
      setSaving(false);
    }
  };

  const handleEmailUpdate = async () => {
    if (!newEmail.trim() || newEmail === email) {
      setIsEditingEmail(false);
      return;
    }

    try {
      setSaving(true);
      const result = await profileService.updateEmail(newEmail);
      if (result.success) {
        Alert.alert('Verification Sent', 'Please check your new email address for a confirmation link.');
        setIsEditingEmail(false);
      } else {
        Alert.alert('Error', result.error || 'Failed to update email');
      }
    } catch (error) {
      Alert.alert('Error', 'An unexpected error occurred');
    } finally {
      setSaving(false);
    }
  };

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaType.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
    });

    if (!result.canceled && result.assets && result.assets[0].uri) {
      const asset = result.assets[0];
      
      // Check file size (5MB = 5 * 1024 * 1024 bytes)
      if (asset.fileSize && asset.fileSize > 5 * 1024 * 1024) {
        Alert.alert('Image too large', 'Please select an image smaller than 5MB');
        return;
      }

      setNewAvatarUri(asset.uri);
      setAvatarUrl(asset.uri);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, styles.centered]}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="close" size={24} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Edit Profile</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.avatarSection}>
          <TouchableOpacity onPress={pickImage} testID="avatar-touchable">
            <Image 
              source={{ uri: avatarUrl || 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?q=80&w=200&auto=format&fit=crop' }} 
              style={styles.avatar} 
            />
            <View style={styles.editBadge}>
              <Ionicons name="camera" size={16} color="white" />
            </View>
          </TouchableOpacity>
        </View>

        <View style={styles.inputSection}>
          <Text style={styles.label}>DISPLAY NAME</Text>
          <TextInput
            style={styles.input}
            value={displayName}
            onChangeText={setDisplayName}
            placeholder="Enter display name"
            placeholderTextColor={COLORS.textMuted}
          />
        </View>

        <View style={styles.inputSection}>
          <View style={styles.labelRow}>
            <Text style={styles.label}>EMAIL ADDRESS</Text>
            {!isEditingEmail ? (
              <TouchableOpacity onPress={() => setIsEditingEmail(true)}>
                <Text style={styles.editLink}>Change</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity onPress={handleEmailUpdate}>
                <Text style={styles.confirmLink}>Confirm</Text>
              </TouchableOpacity>
            )}
          </View>
          <TextInput
            style={[styles.input, !isEditingEmail && styles.disabledInput]}
            value={newEmail}
            onChangeText={setNewEmail}
            editable={isEditingEmail}
            keyboardType="email-address"
            autoCapitalize="none"
          />
          <Text style={styles.inputHint}>
            {isEditingEmail 
              ? 'A confirmation email will be sent to the new address.'
              : 'Email can be updated by clicking Change.'}
          </Text>
        </View>

        <TouchableOpacity 
          style={[styles.saveButton, saving && styles.disabledButton]} 
          onPress={handleSave}
          disabled={saving}
        >
          {saving ? (
            <ActivityIndicator color="white" />
          ) : (
            <Text style={styles.saveButtonText}>Save Changes</Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderDark,
  },
  headerTitle: {
    color: COLORS.text,
    fontSize: 18,
    fontWeight: '700',
  },
  scrollContent: {
    padding: 20,
  },
  avatarSection: {
    alignItems: 'center',
    marginVertical: 32,
  },
  avatar: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 3,
    borderColor: COLORS.borderDark,
  },
  editBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: COLORS.primary,
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: COLORS.background,
  },
  inputSection: {
    marginBottom: 24,
  },
  label: {
    color: COLORS.textSecondary,
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 8,
    letterSpacing: 1,
  },
  labelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  editLink: {
    color: COLORS.primary,
    fontSize: 12,
    fontWeight: '600',
  },
  confirmLink: {
    color: COLORS.success,
    fontSize: 12,
    fontWeight: '700',
  },
  input: {
    backgroundColor: COLORS.surface,
    color: COLORS.text,
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
  },
  disabledInput: {
    color: COLORS.textMuted,
  },
  inputHint: {
    color: COLORS.textMuted,
    fontSize: 12,
    marginTop: 8,
  },
  saveButton: {
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    padding: 18,
    alignItems: 'center',
    marginTop: 16,
  },
  disabledButton: {
    opacity: 0.5,
  },
  saveButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '700',
  },
  centered: {
    justifyContent: 'center',
    alignItems: 'center',
  },
});
