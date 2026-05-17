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
  const { setCourse, setLayout } = useMatchStore();

  useEffect(() => {
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

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <StatusBar barStyle="light-content" />
      
      <View style={styles.header}>
        <TouchableOpacity>
          <Ionicons name="menu" size={28} color={COLORS.textLight} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>DiscGolf Pro</Text>
        <TouchableOpacity>
          <Ionicons name="close" size={28} color={COLORS.textLight} />
        </TouchableOpacity>
      </View>

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
          </View>
        )}
      </ScrollView>

      <View style={styles.bottomNav}>
        <TouchableOpacity style={styles.navItem}>
          <Ionicons name="compass-outline" size={24} color={COLORS.primary} />
          <Text style={[styles.navText, { color: COLORS.primary }]}>Courses</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.navItem}>
          <Ionicons name="play-circle-outline" size={24} color={COLORS.textSecondary} />
          <Text style={styles.navText}>Play</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.navItem}>
          <Ionicons name="podium-outline" size={24} color={COLORS.textSecondary} />
          <Text style={styles.navText}>Leaderboard</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.navItem} onPress={() => navigation.navigate('Login')}>
          <Ionicons name="person-outline" size={24} color={COLORS.textSecondary} />
          <Text style={styles.navText}>Profile</Text>
        </TouchableOpacity>
      </View>
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
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderLight,
  },
  headerTitle: {
    color: COLORS.primary,
    fontSize: 20,
    fontWeight: '700',
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
  bottomNav: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    backgroundColor: '#1C1C1E',
    paddingVertical: 12,
    paddingBottom: 24, // iOS safe area padding
    borderTopWidth: 1,
    borderTopColor: COLORS.borderLight,
  },
  navItem: {
    alignItems: 'center',
    gap: 4,
  },
  navText: {
    color: COLORS.textSecondary,
    fontSize: 11,
    fontWeight: '500',
  },
});
