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

export function ModeratorCourseDetailsScreen({ route, navigation }: any) {
  const { courseId, courseName } = route.params;
  
  const [layouts, setLayouts] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  const [newLayoutName, setNewLayoutName] = useState('');
  const [selectedCloneLayoutId, setSelectedCloneLayoutId] = useState<string | null>(null);

  useEffect(() => {
    fetchLayouts();
  }, [courseId]);

  const fetchLayouts = async () => {
    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('layouts')
        .select('*')
        .eq('course_id', courseId)
        .order('name');
      if (error) throw error;
      
      const fetchedLayouts = data || [];
      setLayouts(fetchedLayouts);
      
      // Auto-select the first layout for cloning to make UX easier
      if (fetchedLayouts.length > 0 && !selectedCloneLayoutId) {
        setSelectedCloneLayoutId(fetchedLayouts[0].id);
      }
    } catch (err: any) {
      Alert.alert('Error', err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddLayout = async () => {
    if (!newLayoutName.trim()) {
      Alert.alert('Error', 'Please provide a layout name.');
      return;
    }

    try {
      // 1. Fetch holes from the cloned layout if one is selected
      let holesToClone: any[] = [];
      if (selectedCloneLayoutId) {
        const { data: sourceHoles, error: holesError } = await supabase
          .from('holes')
          .select('*')
          .eq('layout_id', selectedCloneLayoutId)
          .order('hole_number');
        
        if (holesError) throw holesError;
        holesToClone = sourceHoles || [];
      }

      // 2. Insert the new layout
      const { data: newLayoutData, error: layoutError } = await supabase
        .from('layouts')
        .insert({
          course_id: courseId,
          name: newLayoutName.trim(),
          hole_count: holesToClone.length,
        })
        .select();

      if (layoutError) throw layoutError;
      
      const newLayoutId = newLayoutData?.[0]?.id;

      // 3. Insert the cloned holes into the new layout
      if (holesToClone.length > 0 && newLayoutId) {
        const holesPayload = holesToClone.map(h => ({
          layout_id: newLayoutId,
          hole_number: h.hole_number,
          par: h.par,
          distance_m: h.distance_m,
          tee_latitude: h.tee_latitude,
          tee_longitude: h.tee_longitude,
          basket_latitude: h.basket_latitude,
          basket_longitude: h.basket_longitude,
        }));

        const { error: insertHolesError } = await supabase
          .from('holes')
          .insert(holesPayload);

        if (insertHolesError) throw insertHolesError;
      }
      
      setNewLayoutName('');
      await fetchLayouts();
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
        <Text style={styles.title}>{courseName}</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.addCard}>
          <Text style={styles.addCardTitle}>Add New Layout</Text>
          <TextInput
            placeholder="New Layout Name"
            placeholderTextColor={COLORS.textSecondary}
            style={styles.input}
            value={newLayoutName}
            onChangeText={setNewLayoutName}
          />
          
          {layouts.length > 0 && (
            <View style={styles.cloneSection}>
              <Text style={styles.cloneLabel}>Clone holes from:</Text>
              <View style={styles.cloneOptions}>
                <TouchableOpacity 
                  style={[styles.cloneOption, selectedCloneLayoutId === null && styles.cloneOptionSelected]}
                  onPress={() => setSelectedCloneLayoutId(null)}
                >
                  <Text style={[styles.cloneOptionText, selectedCloneLayoutId === null && styles.cloneOptionTextSelected]}>None (Empty)</Text>
                </TouchableOpacity>
                {layouts.map(layout => (
                  <TouchableOpacity 
                    key={layout.id}
                    style={[styles.cloneOption, selectedCloneLayoutId === layout.id && styles.cloneOptionSelected]}
                    onPress={() => setSelectedCloneLayoutId(layout.id)}
                  >
                    <Text style={[styles.cloneOptionText, selectedCloneLayoutId === layout.id && styles.cloneOptionTextSelected]}>
                      {layout.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}

          <TouchableOpacity style={styles.addButton} onPress={handleAddLayout}>
            <Text style={styles.addButtonText}>Add Layout</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.sectionTitle}>EXISTING LAYOUTS</Text>
        
        {isLoading ? (
          <ActivityIndicator size="large" color={COLORS.primary} style={{ marginTop: 20 }} />
        ) : layouts.length === 0 ? (
          <Text style={{ color: COLORS.textSecondary }}>No layouts available.</Text>
        ) : (
          layouts.map(layout => (
            <TouchableOpacity
              key={layout.id}
              style={styles.layoutItem}
              onPress={() => navigation.navigate('ModeratorLayoutDetails', { layoutId: layout.id, layoutName: layout.name, courseId })}
            >
              <View>
                <Text style={styles.layoutName}>{layout.name}</Text>
                <Text style={styles.layoutHoles}>{layout.hole_count} holes</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={COLORS.textSecondary} />
            </TouchableOpacity>
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
  addCard: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
  },
  addCardTitle: {
    color: COLORS.text,
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 16,
  },
  input: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    color: COLORS.text,
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
  },
  cloneSection: {
    marginBottom: 16,
  },
  cloneLabel: {
    color: COLORS.textSecondary,
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 8,
  },
  cloneOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  cloneOption: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  cloneOptionSelected: {
    borderColor: COLORS.primary,
    backgroundColor: 'rgba(57, 255, 20, 0.1)',
  },
  cloneOptionText: {
    color: COLORS.textSecondary,
    fontSize: 14,
  },
  cloneOptionTextSelected: {
    color: COLORS.primary,
    fontWeight: '600',
  },
  addButton: {
    backgroundColor: COLORS.primary,
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  addButtonText: {
    color: COLORS.background,
    fontWeight: '700',
  },
  sectionTitle: {
    color: COLORS.textSecondary,
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1,
    marginBottom: 16,
  },
  layoutItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(255,255,255,0.05)',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
  },
  layoutName: {
    color: COLORS.text,
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  layoutHoles: {
    color: COLORS.textSecondary,
    fontSize: 14,
  },
});
