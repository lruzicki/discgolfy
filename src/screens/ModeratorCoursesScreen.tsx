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

export function ModeratorCoursesScreen({ navigation }: any) {
  const [courses, setCourses] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [newCourseName, setNewCourseName] = useState('');
  const [newCourseLocation, setNewCourseLocation] = useState('');

  useEffect(() => {
    fetchCourses();
  }, []);

  const fetchCourses = async () => {
    try {
      setIsLoading(true);
      const { data, error } = await supabase.from('courses').select('*').order('name');
      if (error) throw error;
      setCourses(data || []);
    } catch (err: any) {
      Alert.alert('Error', err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddCourse = async () => {
    if (!newCourseName.trim() || !newCourseLocation.trim()) {
      Alert.alert('Error', 'Please provide both name and location.');
      return;
    }

    try {
      const { error } = await supabase.from('courses').insert({
        name: newCourseName.trim(),
        location: newCourseLocation.trim(),
      });
      if (error) throw error;
      
      setNewCourseName('');
      setNewCourseLocation('');
      await fetchCourses();
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
        <Text style={styles.title}>Manage Courses</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.addCard}>
          <Text style={styles.addCardTitle}>Add New Course</Text>
          <TextInput
            placeholder="New Course Name"
            placeholderTextColor={COLORS.textSecondary}
            style={styles.input}
            value={newCourseName}
            onChangeText={setNewCourseName}
          />
          <TextInput
            placeholder="Location"
            placeholderTextColor={COLORS.textSecondary}
            style={styles.input}
            value={newCourseLocation}
            onChangeText={setNewCourseLocation}
          />
          <TouchableOpacity style={styles.addButton} onPress={handleAddCourse}>
            <Text style={styles.addButtonText}>Add Course</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.sectionTitle}>EXISTING COURSES</Text>
        
        {isLoading ? (
          <ActivityIndicator size="large" color={COLORS.primary} style={{ marginTop: 20 }} />
        ) : (
          courses.map(course => (
            <TouchableOpacity
              key={course.id}
              style={styles.courseItem}
              onPress={() => navigation.navigate('ModeratorCourseDetails', { courseId: course.id, courseName: course.name })}
            >
              <View>
                <Text style={styles.courseName}>{course.name}</Text>
                <Text style={styles.courseLocation}>{course.location}</Text>
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
  courseItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(255,255,255,0.05)',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
  },
  courseName: {
    color: COLORS.text,
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  courseLocation: {
    color: COLORS.textSecondary,
    fontSize: 14,
  },
});
