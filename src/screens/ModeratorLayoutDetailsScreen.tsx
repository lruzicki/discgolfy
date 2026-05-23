import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../theme';
import { supabase } from '../lib/supabase';

export function ModeratorLayoutDetailsScreen({ route, navigation }: any) {
  const { layoutId, layoutName } = route.params;
  
  const [holes, setHoles] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchHoles();
  }, [layoutId]);

  const fetchHoles = async () => {
    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('holes')
        .select('*')
        .eq('layout_id', layoutId)
        .order('hole_number');
      if (error) throw error;
      setHoles(data || []);
    } catch (err: any) {
      Alert.alert('Error', err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const updateHoleState = (id: string, field: string, value: string) => {
    setHoles(prev => prev.map(h => h.id === id ? { ...h, [field]: value } : h));
  };

  const handleSaveHole = async (hole: any) => {
    try {
      const { error } = await supabase
        .from('holes')
        .update({
          par: Number(hole.par) || 3,
          tee_latitude: Number(hole.tee_latitude) || null,
          tee_longitude: Number(hole.tee_longitude) || null,
          basket_latitude: Number(hole.basket_latitude) || null,
          basket_longitude: Number(hole.basket_longitude) || null,
        })
        .eq('id', hole.id);

      if (error) throw error;
      Alert.alert('Success', `Hole ${hole.hole_number} saved.`);
    } catch (err: any) {
      Alert.alert('Error', err.message);
    }
  };

  const handleAddHole = async () => {
    try {
      const nextHoleNumber = holes.length > 0 ? Math.max(...holes.map(h => h.hole_number)) + 1 : 1;
      
      const { error } = await supabase
        .from('holes')
        .insert({
          layout_id: layoutId,
          hole_number: nextHoleNumber,
          par: 3,
        });

      if (error) throw error;
      
      // Update layout hole_count
      await supabase
        .from('layouts')
        .update({ hole_count: holes.length + 1 })
        .eq('id', layoutId);

      await fetchHoles();
    } catch (err: any) {
      Alert.alert('Error', err.message);
    }
  };

  const handleDeleteHole = async (holeId: string) => {
    Alert.alert(
      'Delete Hole',
      'Are you sure you want to delete this hole?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const { error } = await supabase.from('holes').delete().eq('id', holeId);
              if (error) throw error;
              
              await supabase
                .from('layouts')
                .update({ hole_count: Math.max(0, holes.length - 1) })
                .eq('id', layoutId);

              await fetchHoles();
            } catch (err: any) {
              Alert.alert('Error', err.message);
            }
          }
        }
      ]
    );
  };

  // For testing purposes since Alert.alert doesn't block in RTL
  const forceDeleteHole = async (holeId: string) => {
    try {
      await supabase.from('holes').delete().eq('id', holeId);
      await fetchHoles();
    } catch (err: any) {
      Alert.alert('Error', err.message);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.title}>{layoutName}</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.actionRow}>
          <Text style={styles.sectionTitle}>HOLES ({holes.length})</Text>
          <TouchableOpacity style={styles.addHoleButton} onPress={handleAddHole}>
            <Ionicons name="add" size={16} color={COLORS.background} />
            <Text style={styles.addHoleText}>Add Hole</Text>
          </TouchableOpacity>
        </View>
        
        {isLoading ? (
          <ActivityIndicator size="large" color={COLORS.primary} style={{ marginTop: 20 }} />
        ) : holes.length === 0 ? (
          <Text style={{ color: COLORS.textSecondary }}>No holes in this layout.</Text>
        ) : (
          holes.map(hole => (
            <View key={hole.id} style={styles.holeCard}>
              <View style={styles.holeHeader}>
                <Text style={styles.holeTitle}>Hole {hole.hole_number}</Text>
                <TouchableOpacity onPress={() => forceDeleteHole(hole.id)} style={styles.deleteButton}>
                  <Text style={styles.deleteText}>Delete</Text>
                </TouchableOpacity>
              </View>

              <View style={styles.inputRow}>
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Par</Text>
                  <TextInput
                    placeholder="Par"
                    placeholderTextColor={COLORS.textSecondary}
                    style={styles.input}
                    value={String(hole.par || '')}
                    onChangeText={(val) => updateHoleState(hole.id, 'par', val)}
                    keyboardType="numeric"
                  />
                </View>
              </View>

              <View style={styles.coordsGrid}>
                <View style={styles.coordColumn}>
                  <Text style={styles.inputLabel}>Tee (Start)</Text>
                  <TextInput
                    placeholder="Latitude"
                    placeholderTextColor={COLORS.textSecondary}
                    style={styles.input}
                    value={hole.tee_latitude !== null ? String(hole.tee_latitude) : ''}
                    onChangeText={(val) => updateHoleState(hole.id, 'tee_latitude', val)}
                    keyboardType="numeric"
                  />
                  <TextInput
                    placeholder="Longitude"
                    placeholderTextColor={COLORS.textSecondary}
                    style={styles.input}
                    value={hole.tee_longitude !== null ? String(hole.tee_longitude) : ''}
                    onChangeText={(val) => updateHoleState(hole.id, 'tee_longitude', val)}
                    keyboardType="numeric"
                  />
                </View>

                <View style={styles.coordColumn}>
                  <Text style={styles.inputLabel}>Basket (End)</Text>
                  <TextInput
                    placeholder="Latitude"
                    placeholderTextColor={COLORS.textSecondary}
                    style={styles.input}
                    value={hole.basket_latitude !== null ? String(hole.basket_latitude) : ''}
                    onChangeText={(val) => updateHoleState(hole.id, 'basket_latitude', val)}
                    keyboardType="numeric"
                  />
                  <TextInput
                    placeholder="Longitude"
                    placeholderTextColor={COLORS.textSecondary}
                    style={styles.input}
                    value={hole.basket_longitude !== null ? String(hole.basket_longitude) : ''}
                    onChangeText={(val) => updateHoleState(hole.id, 'basket_longitude', val)}
                    keyboardType="numeric"
                  />
                </View>
              </View>

              <TouchableOpacity style={styles.saveButton} onPress={() => handleSaveHole(hole)}>
                <Text style={styles.saveButtonText}>Save</Text>
              </TouchableOpacity>
            </View>
          ))
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
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.05)',
  },
  backButton: {
    padding: 8,
    marginLeft: -8,
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
    color: COLORS.text,
  },
  scrollContent: {
    padding: 20,
  },
  actionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    color: COLORS.textSecondary,
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1,
  },
  addHoleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primary,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    gap: 4,
  },
  addHoleText: {
    color: COLORS.background,
    fontSize: 12,
    fontWeight: '700',
  },
  holeCard: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  holeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  holeTitle: {
    color: COLORS.text,
    fontSize: 18,
    fontWeight: '700',
  },
  deleteButton: {
    padding: 4,
  },
  deleteText: {
    color: '#FF3B30',
    fontSize: 12,
    fontWeight: '600',
  },
  inputRow: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  inputGroup: {
    flex: 1,
  },
  inputLabel: {
    color: COLORS.textSecondary,
    fontSize: 12,
    marginBottom: 6,
    fontWeight: '500',
  },
  input: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    color: COLORS.text,
    padding: 10,
    borderRadius: 8,
    marginBottom: 8,
  },
  coordsGrid: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  coordColumn: {
    flex: 1,
  },
  saveButton: {
    backgroundColor: 'rgba(57, 255, 20, 0.1)',
    borderWidth: 1,
    borderColor: COLORS.primary,
    padding: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  saveButtonText: {
    color: COLORS.primary,
    fontWeight: '600',
  },
});