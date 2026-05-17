import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  StatusBar,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons, Feather } from '@expo/vector-icons';
import { COLORS } from '../theme';

const COURSES = [
  {
    id: '1',
    name: 'Disc Golf w Parku im. R. Reagana',
    location: 'Gdańsk, Poland',
    holes: 18,
    estTime: '1h 45m',
    image: 'https://images.unsplash.com/photo-1519331379826-f10be5486c6f?q=80&w=600&auto=format&fit=crop', // park view
  },
  {
    id: '2',
    name: 'Jaśkowa Disc Golf',
    location: 'Gdańsk, Poland',
    holes: 18,
    estTime: '1h 30m',
    image: 'https://images.unsplash.com/photo-1448375240586-882707db888b?q=80&w=600&auto=format&fit=crop', // forest view
  },
  {
    id: '3',
    name: 'Disc Golf Na Zboczu',
    location: 'Gdańsk, Poland',
    holes: 9,
    estTime: '45m',
    image: 'https://images.unsplash.com/photo-1502086223501-7ea6ecd79368?q=80&w=600&auto=format&fit=crop', // landscape view
  },
];

export function SelectCourseScreen({ navigation }: any) {
  const [selectedCourseId, setSelectedCourseId] = useState<string>('2'); // Jaśkowa selected by default to match design

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" />
      
      {/* Header */}
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

        {/* Course List */}
        <View style={styles.courseList}>
          {COURSES.map((course) => {
            const isSelected = selectedCourseId === course.id;

            return (
              <TouchableOpacity
                key={course.id}
                style={[
                  styles.courseCard,
                  isSelected && styles.courseCardSelected,
                ]}
                onPress={() => setSelectedCourseId(course.id)}
                activeOpacity={0.8}
              >
                <View style={styles.courseCardHeader}>
                  <Image source={{ uri: course.image }} style={styles.courseImage} />
                  
                  <View style={styles.courseInfo}>
                    <Text style={styles.courseName}>{course.name}</Text>
                    
                    <Text style={styles.courseMetaText}>
                      {course.location} • <MaterialCommunityIcons name="golf-tee" size={12} color={COLORS.textSecondary} /> {course.holes}
                    </Text>
                    
                    <View style={styles.courseMetaRow}>
                      <Feather name="clock" size={12} color={COLORS.textSecondary} />
                      <Text style={styles.courseMetaTextTime}>Est. {course.estTime}</Text>
                    </View>
                  </View>

                  <View style={styles.courseActionIcon}>
                    {isSelected ? (
                      <Ionicons name="checkmark-circle-outline" size={24} color={COLORS.primary} />
                    ) : (
                      <Ionicons name="chevron-down" size={24} color={COLORS.textSecondary} />
                    )}
                  </View>
                </View>

                {/* Expanded Content */}
                {isSelected && (
                  <View style={styles.expandedContent}>
                    <Text style={styles.selectLayoutLabel}>SELECT LAYOUT</Text>
                    
                    <TouchableOpacity style={styles.dropdownSelector}>
                      <Text style={styles.dropdownText}>{course.holes} Dołków</Text>
                      <Ionicons name="git-commit-outline" size={20} color={COLORS.textSecondary} style={{ transform: [{ rotate: '90deg' }] }} />
                    </TouchableOpacity>

                    <TouchableOpacity style={styles.playButton} onPress={() => navigation.navigate('Profile')}>
                      <Text style={styles.playButtonText}>Graj</Text>
                      <Ionicons name="play" size={18} color={COLORS.onPrimary} />
                    </TouchableOpacity>
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
        </View>
      </ScrollView>

      {/* Bottom Navigation */}
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
    backgroundColor: COLORS.background, // Match dark background
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
    color: COLORS.primary, // Light blue text for logo
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
  courseList: {
    gap: 16,
  },
  courseCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    overflow: 'hidden',
  },
  courseCardSelected: {
    borderWidth: 1.5,
    borderColor: COLORS.primary,
  },
  courseCardHeader: {
    flexDirection: 'row',
    height: 100,
  },
  courseImage: {
    width: 100,
    height: '100%',
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
    marginBottom: 6,
    flexWrap: 'wrap',
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
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: COLORS.borderDark,
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
  dropdownText: {
    color: COLORS.text,
    fontSize: 16,
  },
  playButton: {
    backgroundColor: COLORS.primary,
    borderRadius: 30,
    paddingVertical: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  playButtonText: {
    color: COLORS.onPrimary, // Dark blue text for button
    fontSize: 18,
    fontWeight: '700',
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
