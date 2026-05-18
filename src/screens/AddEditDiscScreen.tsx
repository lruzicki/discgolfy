import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  SafeAreaView,
  ScrollView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { supabase } from '../lib/supabase';
import { COLORS } from '../theme';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';

interface DiscForm {
  name: string;
  color_rgba: string;
  speed: string;
  glide: string;
  turn: string;
  fade: string;
  weight_g: string;
  max_throw_m: string;
  max_putt_m: string;
}

export function AddEditDiscScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const disc = route.params?.disc;
  const isEditing = !!disc;

  const [form, setForm] = useState<DiscForm>({
    name: disc?.name || '',
    color_rgba: disc?.color_rgba || COLORS.primary,
    speed: disc?.speed?.toString() || '0',
    glide: disc?.glide?.toString() || '0',
    turn: disc?.turn?.toString() || '0',
    fade: disc?.fade?.toString() || '0',
    weight_g: disc?.weight_g?.toString() || '175',
    max_throw_m: disc?.max_throw_m?.toString() || '0',
    max_putt_m: disc?.max_putt_m?.toString() || '0',
  });

  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!form.name) {
      Alert.alert('Error', 'Please enter a disc name.');
      return;
    }

    try {
      setSaving(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not found');

      const { data: profile } = await supabase
        .from('profiles')
        .select('id')
        .eq('auth_id', user.id)
        .single();

      if (!profile) throw new Error('Profile not found');

      const discData = {
        player_id: profile.id,
        name: form.name,
        color_rgba: form.color_rgba,
        speed: parseFloat(form.speed),
        glide: parseFloat(form.glide),
        turn: parseFloat(form.turn),
        fade: parseFloat(form.fade),
        weight_g: parseInt(form.weight_g),
        max_throw_m: parseInt(form.max_throw_m),
        max_putt_m: parseInt(form.max_putt_m),
      };

      if (isEditing) {
        const { error } = await supabase
          .from('discs')
          .update(discData)
          .eq('id', disc.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('discs')
          .insert(discData);
        if (error) throw error;
      }

      navigation.goBack();
    } catch (error: any) {
      Alert.alert('Error', error.message);
    } finally {
      setSaving(false);
    }
  };

  const handleArchive = async () => {
    Alert.alert(
      'Archive Disc',
      'Are you sure? This will remove the disc from your bag but keep it in your history.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Archive',
          style: 'destructive',
          onPress: async () => {
            try {
              setSaving(true);
              const { error } = await supabase
                .from('discs')
                .update({ archived_at: new Date().toISOString() })
                .eq('id', disc.id);
              if (error) throw error;
              navigation.goBack();
            } catch (error: any) {
              Alert.alert('Error', error.message);
            } finally {
              setSaving(false);
            }
          },
        },
      ]
    );
  };

  const InputField = ({ label, value, onChangeText, keyboardType = 'default', placeholder }: any) => (
    <View style={styles.inputContainer}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        style={styles.input}
        value={value}
        onChangeText={onChangeText}
        keyboardType={keyboardType}
        placeholder={placeholder}
        placeholderTextColor={COLORS.textMuted}
      />
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="close" size={28} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.title}>{isEditing ? 'Edit Disc' : 'Add Disc'}</Text>
        <TouchableOpacity onPress={handleSave} disabled={saving}>
          {saving ? (
            <ActivityIndicator color={COLORS.primary} />
          ) : (
            <Text style={styles.saveText}>Save</Text>
          )}
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <InputField
          label="Disc Name"
          value={form.name}
          onChangeText={(text: string) => setForm({ ...form, name: text })}
          placeholder="e.g. Destroyer"
        />

        <View style={styles.row}>
          <InputField
            label="Speed"
            value={form.speed}
            onChangeText={(text: string) => setForm({ ...form, speed: text })}
            keyboardType="numeric"
          />
          <InputField
            label="Glide"
            value={form.glide}
            onChangeText={(text: string) => setForm({ ...form, glide: text })}
            keyboardType="numeric"
          />
        </View>

        <View style={styles.row}>
          <InputField
            label="Turn"
            value={form.turn}
            onChangeText={(text: string) => setForm({ ...form, turn: text })}
            keyboardType="numeric"
          />
          <InputField
            label="Fade"
            value={form.fade}
            onChangeText={(text: string) => setForm({ ...form, fade: text })}
            keyboardType="numeric"
          />
        </View>

        <InputField
          label="Weight (g)"
          value={form.weight_g}
          onChangeText={(text: string) => setForm({ ...form, weight_g: text })}
          keyboardType="numeric"
        />

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Stats</Text>
          <InputField
            label="Max Throw (m)"
            value={form.max_throw_m}
            onChangeText={(text: string) => setForm({ ...form, max_throw_m: text })}
            keyboardType="numeric"
          />
          <InputField
            label="Max Putt (m)"
            value={form.max_putt_m}
            onChangeText={(text: string) => setForm({ ...form, max_putt_m: text })}
            keyboardType="numeric"
          />
        </View>

        {isEditing && (
          <TouchableOpacity style={styles.archiveButton} onPress={handleArchive}>
            <Text style={styles.archiveButtonText}>Archive Disc</Text>
          </TouchableOpacity>
        )}
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
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderDark,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.text,
  },
  saveText: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.primary,
  },
  scrollContent: {
    padding: 20,
  },
  inputContainer: {
    marginBottom: 20,
    flex: 1,
  },
  label: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginBottom: 8,
  },
  input: {
    backgroundColor: COLORS.surface,
    borderRadius: 8,
    padding: 12,
    color: COLORS.text,
    fontSize: 16,
    borderWidth: 1,
    borderColor: COLORS.borderDark,
  },
  row: {
    flexDirection: 'row',
    gap: 16,
  },
  section: {
    marginTop: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 16,
  },
  archiveButton: {
    marginTop: 40,
    padding: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#FF5252',
    alignItems: 'center',
    marginBottom: 40,
  },
  archiveButtonText: {
    color: '#FF5252',
    fontSize: 16,
    fontWeight: '600',
  },
});
