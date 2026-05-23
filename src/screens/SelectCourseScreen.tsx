import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  ScrollView,
  StatusBar,
  ActivityIndicator,
  TextInput,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons, Feather } from '@expo/vector-icons';
import { COLORS } from '../theme';
import { useMatchStore } from '../store/useMatchStore';
import { supabase } from '../lib/supabase';
import { PlayButton } from '../components/PlayButton';

// Sub-component for a single Course item to isolate state and rendering
function CourseItem({ 
  course, 
  isSelected, 
  onSelect, 
  layouts, 
  isLoadingLayouts, 
  selectedLayoutId, 
  onSelectLayout,
  onPlay 
}: any) {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  // Try to find layouts for this specific course to get hole count
  const courseLayouts = layouts.filter((l: any) => l.course_id === course.id);
  const holesCount = courseLayouts.length > 0 ? courseLayouts[0].hole_count : 18;
  const estTime = holesCount > 9 ? '1h 45m' : '45m';
  const placeholderImage = 'https://images.unsplash.com/photo-1519331379826-f10be5486c6f?q=80&w=600&auto=format&fit=crop';

  return (
    <View style={[styles.courseCard, isSelected && styles.courseCardSelected]}>
      {/* Header - Always Visible */}
      <TouchableOpacity
        style={styles.courseCardHeader}
        onPress={() => onSelect(course.id)}
        activeOpacity={0.7}
      >
        <Image 
          source={{ uri: placeholderImage }} 
          style={styles.courseImage} 
          resizeMode="cover"
        />
        
        <View style={styles.courseInfo}>
          <Text style={styles.courseName} numberOfLines={1}>{course.name}</Text>
          
          <Text style={styles.courseMetaText}>
            {course.location} • <MaterialCommunityIcons name="golf-tee" size={12} color={COLORS.textSecondary} /> {holesCount}
          </Text>
          
          <View style={styles.courseMetaRow}>
            <Feather name="clock" size={12} color={COLORS.textSecondary} />
            <Text style={styles.courseMetaTextTime}>Est. {estTime}</Text>
          </View>
        </View>

        <View style={styles.courseActionIcon}>
          <Ionicons 
            name={isSelected ? "checkmark-circle" : "chevron-down"} 
            size={24} 
            color={isSelected ? COLORS.primary : COLORS.textSecondary} 
          />
        </View>
      </TouchableOpacity>

      {/* Expanded Content - Only for Selected Course */}
      {isSelected && (
        <View style={styles.expandedContent}>
          <View style={styles.divider} />
          <Text style={styles.selectLayoutLabel}>SELECT LAYOUT</Text>
          
          {isLoadingLayouts ? (
            <ActivityIndicator size="small" color={COLORS.primary} style={{ marginVertical: 20 }} />
          ) : courseLayouts.length > 0 ? (
            <View>
              <TouchableOpacity 
                style={[styles.dropdownSelector, isDropdownOpen && styles.dropdownSelectorOpen]} 
                activeOpacity={0.8}
                onPress={() => setIsDropdownOpen(!isDropdownOpen)}
              >
                <Text style={styles.dropdownText}>
                  {courseLayouts.find((l: any) => l.id === selectedLayoutId)?.name || courseLayouts[0].name}
                </Text>
                <Ionicons name="git-commit-outline" size={20} color={COLORS.textSecondary} style={{ transform: [{ rotate: isDropdownOpen ? '-90deg' : '90deg' }] }} />
              </TouchableOpacity>

              {isDropdownOpen && (
                <View style={styles.dropdownList}>
                  {courseLayouts.map((l: any) => (
                    <TouchableOpacity
                      key={l.id}
                      style={[styles.dropdownItem, l.id === selectedLayoutId && styles.dropdownItemSelected]}
                      onPress={() => {
                        onSelectLayout(l.id);
                        setIsDropdownOpen(false);
                      }}
                    >
                      <Text style={[styles.dropdownItemText, l.id === selectedLayoutId && styles.dropdownItemTextSelected]}>
                        {l.name}
                      </Text>
                      <Text style={styles.dropdownItemHoles}>{l.hole_count} holes</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}

              <PlayButton onPress={onPlay} />
            </View>
          ) : (
            <Text style={[styles.errorText, { fontSize: 14, marginTop: 10 }]}>No layouts available.</Text>
          )}
        </View>
      )}
    </View>
  );
}

export function SelectCourseScreen({ navigation }: any) {
  const [courses, setCourses] = useState<any[]>([]);
  const [layouts, setLayouts] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingLayouts, setIsLoadingLayouts] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedCourseId, setSelectedCourseId] = useState<string | null>(null);
  const [selectedLayoutId, setSelectedLayoutId] = useState<string | null>(null);
  const [isModerator, setIsModerator] = useState(false);
  const [newLayoutName, setNewLayoutName] = useState('');
  const [editableHole, setEditableHole] = useState<any | null>(null);
  const { setCourse, setLayout } = useMatchStore();

  useEffect(() => {
    fetchModeratorStatus();
    fetchCourses();
  }, []);

  useEffect(() => {
    if (selectedCourseId) {
      const existingLayouts = layouts.filter(l => l.course_id === selectedCourseId);
      if (existingLayouts.length === 0) {
        fetchLayouts(selectedCourseId);
      } else {
        setSelectedLayoutId(existingLayouts[0].id);
      }
    }
  }, [selectedCourseId]);

  useEffect(() => {
    if (isModerator && selectedLayoutId) {
      fetchEditableHole(selectedLayoutId);
    }
  }, [isModerator, selectedLayoutId]);

  const fetchModeratorStatus = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data } = await supabase
      .from('profiles')
      .select('is_moderator')
      .eq('auth_id', user.id)
      .single();

    setIsModerator(Boolean(data?.is_moderator));
  };

  const fetchCourses = async () => {
    try {
      setIsLoading(true);
      const { data, error } = await supabase.from('courses').select('*');
      if (error) throw error;
      setCourses(data || []);
      if (data && data.length > 0 && !selectedCourseId) {
        setSelectedCourseId(data[0].id);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchLayouts = async (courseId: string) => {
    try {
      setIsLoadingLayouts(true);
      const { data, error } = await supabase.from('layouts').select('*').eq('course_id', courseId);
      if (error) throw error;
      const newLayouts = data || [];
      setLayouts(prev => {
        const other = prev.filter(l => l.course_id !== courseId);
        return [...other, ...newLayouts];
      });
      if (newLayouts.length > 0) {
        setSelectedLayoutId(newLayouts[0].id);
      }
    } catch (err: any) {
      console.error(err);
    } finally {
      setIsLoadingLayouts(false);
    }
  };

  const handlePlay = () => {
    if (selectedCourseId && selectedLayoutId) {
      setCourse(selectedCourseId);
      setLayout(selectedLayoutId); 
      navigation.navigate('SelectPlayers');
    }
  };

  const handlePlayNav = () => {
    const matchId = useMatchStore.getState().matchId;
    if (matchId) {
      navigation.navigate('ActiveMatch');
    }
  };

  const addLayout = async () => {
    if (!selectedCourseId || !newLayoutName.trim()) return;

    const { error } = await supabase.from('layouts').insert({
      course_id: selectedCourseId,
      name: newLayoutName.trim(),
      hole_count: 0,
    });
    if (error) {
      Alert.alert('Error', error.message);
      return;
    }
    setNewLayoutName('');
    await fetchLayouts(selectedCourseId);
  };

  const fetchEditableHole = async (layoutId: string) => {
    const { data } = await supabase
      .from('holes')
      .select('id, layout_id, hole_number, par, tee_latitude, tee_longitude, basket_latitude, basket_longitude')
      .eq('layout_id', layoutId);

    setEditableHole(data && data.length > 0 ? data[0] : null);
  };

  const saveHole = async () => {
    if (!editableHole?.id) return;

    const { error } = await supabase
      .from('holes')
      .update({
        par: Number(editableHole.par),
        tee_latitude: Number(editableHole.tee_latitude),
        tee_longitude: Number(editableHole.tee_longitude),
        basket_latitude: Number(editableHole.basket_latitude),
        basket_longitude: Number(editableHole.basket_longitude),
      })
      .eq('id', editableHole.id);

    if (error) {
      Alert.alert('Error', error.message);
    }
  };

  const addHoleToLayout = async () => {
    if (!selectedLayoutId) return;
    const nextHoleNumber = editableHole?.hole_number ? Number(editableHole.hole_number) + 1 : 1;
    const { error } = await supabase.from('holes').insert({
      layout_id: selectedLayoutId,
      hole_number: nextHoleNumber,
      par: 3,
      tee_latitude: 0,
      tee_longitude: 0,
      basket_latitude: 0,
      basket_longitude: 0,
    });
    if (error) {
      Alert.alert('Error', error.message);
      return;
    }
    await fetchEditableHole(selectedLayoutId);
  };

  const removeEditableHole = async () => {
    if (!editableHole?.id || !selectedLayoutId) return;
    const { error } = await supabase.from('holes').delete().eq('id', editableHole.id);
    if (error) {
      Alert.alert('Error', error.message);
      return;
    }
    await fetchEditableHole(selectedLayoutId);
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <StatusBar barStyle="light-content" />
      
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Text style={styles.pageTitle}>Select Course</Text>

        {isLoading ? (
          <ActivityIndicator size="large" color={COLORS.primary} style={{ marginTop: 40 }} />
        ) : error ? (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>{error}</Text>
            <TouchableOpacity style={styles.retryButton} onPress={fetchCourses}>
              <Text style={styles.retryButtonText}>Retry</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.courseList}>
            {courses.map((course) => (
              <CourseItem
                key={course.id}
                course={course}
                isSelected={selectedCourseId === course.id}
                onSelect={setSelectedCourseId}
                layouts={layouts}
                isLoadingLayouts={isLoadingLayouts && selectedCourseId === course.id}
                selectedLayoutId={selectedLayoutId}
                onSelectLayout={setSelectedLayoutId}
                onPlay={handlePlay}
              />
            ))}
            {isModerator && selectedCourseId && (
              <View style={styles.moderatorCard}>
                <Text style={styles.selectLayoutLabel}>Manage Layouts</Text>
                <TextInput
                  placeholder="New layout name"
                  placeholderTextColor={COLORS.textSecondary}
                  style={styles.moderatorInput}
                  value={newLayoutName}
                  onChangeText={setNewLayoutName}
                />
                <TouchableOpacity style={styles.moderatorButton} onPress={addLayout}>
                  <Text style={styles.moderatorButtonText}>Add Layout</Text>
                </TouchableOpacity>
                {editableHole && (
                  <View style={styles.holeEditor}>
                    <TextInput
                      placeholder="Par"
                      placeholderTextColor={COLORS.textSecondary}
                      style={styles.moderatorInput}
                      value={String(editableHole.par ?? '')}
                      onChangeText={(value) => setEditableHole((prev: any) => ({ ...prev, par: value }))}
                    />
                    <TextInput
                      placeholder="Tee lat"
                      placeholderTextColor={COLORS.textSecondary}
                      style={styles.moderatorInput}
                      value={String(editableHole.tee_latitude ?? '')}
                      onChangeText={(value) => setEditableHole((prev: any) => ({ ...prev, tee_latitude: value }))}
                    />
                    <TouchableOpacity style={styles.moderatorButton} onPress={saveHole}>
                      <Text style={styles.moderatorButtonText}>Save Hole</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.moderatorButton} onPress={addHoleToLayout}>
                      <Text style={styles.moderatorButtonText}>Add Hole</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.moderatorDangerButton} onPress={removeEditableHole}>
                      <Text style={styles.moderatorDangerButtonText}>Remove Hole</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            )}
          </View>
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
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  pageTitle: {
    color: COLORS.text,
    fontSize: 32,
    fontWeight: '700',
    marginBottom: 24,
  },
  errorContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
    marginTop: 40,
  },
  errorText: {
    color: '#FF5252',
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 20,
  },
  retryButton: {
    backgroundColor: COLORS.surface,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
  },
  retryButtonText: {
    color: COLORS.primary,
    fontSize: 16,
    fontWeight: '600',
  },
  courseList: {
    gap: 16,
  },
  courseCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 16,
    borderWidth: 1.5,
    borderColor: 'transparent',
  },
  courseCardSelected: {
    borderColor: COLORS.primary,
  },
  courseCardHeader: {
    flexDirection: 'row',
    height: 100,
  },
  courseImage: {
    width: 100,
    height: 100,
    backgroundColor: COLORS.borderDark,
  },
  courseInfo: {
    flex: 1,
    padding: 12,
    justifyContent: 'center',
  },
  courseName: {
    color: COLORS.text,
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  courseMetaText: {
    color: COLORS.textSecondary,
    fontSize: 12,
    marginBottom: 4,
  },
  courseMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  courseMetaTextTime: {
    color: COLORS.textLight,
    fontSize: 12,
  },
  courseActionIcon: {
    padding: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  expandedContent: {
    padding: 16,
    paddingTop: 0,
  },
  divider: {
    height: 1,
    backgroundColor: COLORS.borderDark,
    marginBottom: 16,
  },
  selectLayoutLabel: {
    color: COLORS.textSecondary,
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 1,
    marginBottom: 8,
  },
  dropdownSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#1A1A1C',
    borderWidth: 1,
    borderColor: COLORS.borderDark,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    marginBottom: 16,
  },
  dropdownSelectorOpen: {
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
    marginBottom: 0,
  },
  dropdownList: {
    backgroundColor: '#1A1A1C',
    borderWidth: 1,
    borderTopWidth: 0,
    borderColor: COLORS.borderDark,
    borderBottomLeftRadius: 12,
    borderBottomRightRadius: 12,
    marginBottom: 16,
    overflow: 'hidden',
  },
  dropdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderTopWidth: 1,
    borderTopColor: COLORS.borderDark,
  },
  dropdownItemSelected: {
    backgroundColor: 'rgba(57, 255, 20, 0.1)', // Primary color with 10% opacity
  },
  dropdownItemText: {
    color: COLORS.textLight,
    fontSize: 16,
  },
  dropdownItemTextSelected: {
    color: COLORS.primary,
    fontWeight: '600',
  },
  dropdownItemHoles: {
    color: COLORS.textSecondary,
    fontSize: 12,
  },
  dropdownText: {
    color: COLORS.text,
    fontSize: 16,
  },
  moderatorCard: {
    marginTop: 12,
    backgroundColor: '#22242A',
    borderRadius: 14,
    padding: 12,
  },
  moderatorInput: {
    borderWidth: 1,
    borderColor: '#3A3D45',
    borderRadius: 10,
    color: COLORS.text,
    paddingHorizontal: 10,
    paddingVertical: 8,
    marginTop: 8,
  },
  moderatorButton: {
    marginTop: 8,
    backgroundColor: COLORS.primary,
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: 'center',
  },
  moderatorButtonText: {
    color: '#111',
    fontWeight: '700',
  },
  holeEditor: {
    marginTop: 8,
  },
  moderatorDangerButton: {
    marginTop: 8,
    backgroundColor: '#4A1F24',
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#A33B47',
  },
  moderatorDangerButtonText: {
    color: '#FF8D99',
    fontWeight: '700',
  },
});
