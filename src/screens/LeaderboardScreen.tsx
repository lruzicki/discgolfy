import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { COLORS } from '../theme';
import { supabase } from '../lib/supabase';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { PodiumView } from '../components/PodiumView';
import { buildScoreRankings, PlayerRanking, ScoreFilterType } from '../services/scoreRankings';
import { buildLongestPuttRankings, buildLongestThrowRankings } from '../services/throwRankings';
import { Avatar } from '../components/Avatar';

type FilterType = 'avg_diff' | 'best_score' | 'longest_throw' | 'longest_putt' | 'most_rounds' | 'total_strokes';

export function LeaderboardScreen() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [rankings, setRankings] = useState<PlayerRanking[]>([]);
  const [activeFilter, setActiveFilter] = useState<FilterType>('avg_diff');
  
  const [courses, setCourses] = useState<{id: string, name: string}[]>([]);
  const [selectedCourse, setSelectedCourse] = useState<string | null>(null);
  const [coursePickerOpen, setCoursePickerOpen] = useState(false);

  useEffect(() => {
    fetchCourses();
  }, []);

  useEffect(() => {
    fetchRankings();
  }, [activeFilter, selectedCourse]);

  const fetchCourses = async () => {
    const { data, error } = await supabase.from('courses').select('id, name').order('name');
    if (data) setCourses(data);
  };

  const fetchRankings = async () => {
    setLoading(true);
    try {
      if (activeFilter === 'avg_diff' || activeFilter === 'best_score' || activeFilter === 'most_rounds' || activeFilter === 'total_strokes') {
        await fetchScoreBasedRankings();
      } else if (activeFilter === 'longest_throw') {
        await fetchThrowBasedRankings();
      } else if (activeFilter === 'longest_putt') {
        await fetchPuttRankings();
      }
    } catch (error) {
      console.error('Error fetching rankings:', error);
      Alert.alert('Error', 'Failed to load rankings.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const fetchScoreBasedRankings = async () => {
    let query = supabase
      .from('match_players')
      .select(`
        player_id,
        total_score,
        profiles ( display_name, avatar_url ),
        matches!inner (
          status,
          layout_id,
          layouts!inner (
            name,
            course_id,
            holes ( par )
          ),
          scores (
            player_id,
            strokes,
            holes ( par )
          )
        )
      `)
      .eq('matches.status', 'completed');

    if (selectedCourse) {
      query = query.eq('matches.layouts.course_id', selectedCourse);
    }

    const { data, error } = await query;
    if (error) throw error;

    setRankings(buildScoreRankings((data || []) as any[], activeFilter as ScoreFilterType));
  };

  const fetchThrowBasedRankings = async () => {
    let query = supabase
      .from('throws')
      .select(`
        player_id,
        distance_m,
        throw_type,
        profiles ( display_name, avatar_url ),
        discs ( name ),
        matches!inner (
          status,
          layout_id,
          layouts!inner ( course_id )
        )
      `)
      .eq('matches.status', 'completed')
      .not('distance_m', 'is', null);

    if (selectedCourse) {
      query = query.eq('matches.layouts.course_id', selectedCourse);
    }

    const { data, error } = await query;
    if (error) throw error;

    setRankings(buildLongestThrowRankings((data || []) as any[]));
  };

  const fetchPuttRankings = async () => {
    let query = supabase
      .from('throws')
      .select(`
        player_id,
        distance_m,
        throw_type,
        profiles ( display_name, avatar_url ),
        discs ( name ),
        matches!inner (
          status,
          layout_id,
          layouts!inner ( course_id )
        )
      `)
      .eq('matches.status', 'completed')
      .eq('throw_type', 'putt')
      .not('distance_m', 'is', null);

    if (selectedCourse) {
      query = query.eq('matches.layouts.course_id', selectedCourse);
    }

    const { data, error } = await query;
    if (error) throw error;

    setRankings(buildLongestPuttRankings((data || []) as any[]));
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchRankings();
  };

  const formatRankingValue = (value: number | string) => {
    if (activeFilter === 'avg_diff') {
      const numericValue = Number(value);
      if (numericValue === 0) return 'E';
      const formatted = Math.abs(numericValue).toFixed(2);
      return numericValue > 0 ? `+${formatted}` : `-${formatted}`;
    }

    return value === 0 ? 'E' : (typeof value === 'number' && value > 0 ? `+${value}` : value);
  };

  const renderRankingItem = ({ item, index }: { item: PlayerRanking, index: number }) => {
    // Data passed to FlatList is already sliced, so index here is 0-based for the list starting from rank 4
    const actualRank = index + 4;

    return (
      <View style={styles.rankRow}>
        <View style={styles.rankIndexContainer}>
          <Text style={styles.rankIndex}>{actualRank}</Text>
        </View>
        <View style={styles.avatarWrapper}>
          <Avatar userId={item.id} name={item.display_name} avatarUrl={item.avatar_url} size={40} />
        </View>
        <View style={styles.rankPlayerInfo}>
          <Text style={styles.playerName}>{item.display_name}</Text>
          <Text style={styles.playerSubValue}>{item.subValue}</Text>
        </View>
        <View style={styles.valueContainer}>
          <Text style={[
            styles.rankValue,
            activeFilter === 'avg_diff' && Number(item.value) < 0 && { color: COLORS.success }
          ]}>
            {formatRankingValue(item.value)}
          </Text>
        </View>
      </View>
    );
  };

  const filters: { label: string, value: FilterType, icon: any }[] = [
    { label: 'Avg / Hole', value: 'avg_diff', icon: 'calculator' },
    { label: 'Best Round', value: 'best_score', icon: 'trophy' },
    { label: 'Max Throw', value: 'longest_throw', icon: 'arrow-up-right' },
    { label: 'Max Putt', value: 'longest_putt', icon: 'target' },
    { label: 'Most Rounds', value: 'most_rounds', icon: 'mace' },
    { label: 'Total Strokes', value: 'total_strokes', icon: 'format-list-numbered' },
  ];

  const selectedCourseName = selectedCourse ? courses.find(c => c.id === selectedCourse)?.name : 'All Courses';

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <View style={styles.header}>
        <Text style={styles.title}>Rankings</Text>
        
        {/* Expandable Course Filter */}
        <View style={styles.courseFilterWrapper}>
          <TouchableOpacity 
            style={styles.coursePickerTrigger}
            onPress={() => setCoursePickerOpen(!coursePickerOpen)}
          >
            <View style={styles.coursePickerLabel}>
              <MaterialCommunityIcons name="map-marker" size={16} color={COLORS.primary} />
              <Text style={styles.coursePickerText}>{selectedCourseName}</Text>
            </View>
            <MaterialCommunityIcons 
              name={coursePickerOpen ? "chevron-up" : "chevron-down"} 
              size={20} 
              color={COLORS.textSecondary} 
            />
          </TouchableOpacity>

          {coursePickerOpen && (
            <View style={styles.courseDropdown}>
              <ScrollView style={styles.dropdownScroll} nestedScrollEnabled={true}>
                <TouchableOpacity 
                  style={[styles.dropdownItem, selectedCourse === null && styles.activeDropdownItem]}
                  onPress={() => {
                    setSelectedCourse(null);
                    setCoursePickerOpen(false);
                  }}
                >
                  <Text style={[styles.dropdownItemText, selectedCourse === null && styles.activeDropdownItemText]}>
                    All Courses
                  </Text>
                </TouchableOpacity>
                {courses.map(course => (
                  <TouchableOpacity 
                    key={course.id}
                    style={[styles.dropdownItem, selectedCourse === course.id && styles.activeDropdownItem]}
                    onPress={() => {
                      setSelectedCourse(course.id);
                      setCoursePickerOpen(false);
                    }}
                  >
                    <Text style={[styles.dropdownItemText, selectedCourse === course.id && styles.activeDropdownItemText]}>
                      {course.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          )}
        </View>

        {/* Wrapping Stat Filters */}
        <View style={styles.filterGrid}>
          {filters.map((f) => (
            <TouchableOpacity 
              key={f.value}
              style={[styles.filterTab, activeFilter === f.value && styles.activeFilterTab]}
              onPress={() => setActiveFilter(f.value)}
            >
              <MaterialCommunityIcons 
                name={f.icon} 
                size={14} 
                color={activeFilter === f.value ? COLORS.onPrimary : COLORS.textSecondary} 
              />
              <Text style={[styles.filterTabText, activeFilter === f.value && styles.activeFilterTabText]}>
                {f.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {loading && !refreshing ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      ) : (
        <FlatList
          data={rankings.slice(3)}
          keyExtractor={(item) => item.id}
          renderItem={renderRankingItem}
          ListHeaderComponent={<PodiumView players={rankings} activeFilter={activeFilter} />}
          contentContainerStyle={styles.listContent}
          refreshing={refreshing}
          onRefresh={onRefresh}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <MaterialCommunityIcons name="account-group-outline" size={64} color={COLORS.borderDark} />
              <Text style={styles.emptyText}>No rankings found.</Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    paddingTop: 20,
    paddingBottom: 8,
  },
  title: {
    fontSize: 32,
    fontWeight: '800',
    color: COLORS.text,
    letterSpacing: -0.5,
    marginBottom: 16,
    paddingHorizontal: 20,
  },
  courseFilterWrapper: {
    paddingHorizontal: 20,
    marginBottom: 16,
    zIndex: 10,
  },
  coursePickerTrigger: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: COLORS.surfaceLight,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.borderDark,
  },
  coursePickerLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  coursePickerText: {
    color: COLORS.text,
    fontSize: 14,
    fontWeight: '700',
  },
  courseDropdown: {
    position: 'absolute',
    top: '100%',
    left: 20,
    right: 20,
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    marginTop: 4,
    borderWidth: 1,
    borderColor: COLORS.borderDark,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
    maxHeight: 200,
  },
  dropdownScroll: {
    padding: 4,
  },
  dropdownItem: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  activeDropdownItem: {
    backgroundColor: 'rgba(144, 202, 249, 0.1)',
  },
  dropdownItemText: {
    color: COLORS.textSecondary,
    fontSize: 14,
    fontWeight: '600',
  },
  activeDropdownItemText: {
    color: COLORS.primary,
  },
  filterGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 20,
    gap: 8,
    marginBottom: 8,
  },
  filterTab: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 20,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.borderDark,
  },
  activeFilterTab: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  filterTabText: {
    color: COLORS.textSecondary,
    fontSize: 12,
    fontWeight: '700',
  },
  activeFilterTabText: {
    color: COLORS.onPrimary,
  },
  listContent: {
    paddingBottom: 100,
  },
  rankRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    marginHorizontal: 16,
    marginBottom: 8,
    padding: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.borderDark,
  },
  rankIndexContainer: {
    width: 30,
    alignItems: 'center',
  },
  rankIndex: {
    color: COLORS.textMuted,
    fontSize: 14,
    fontWeight: '800',
  },
  avatarWrapper: {
    marginLeft: 8,
  },
  rankPlayerInfo: {
    flex: 1,
    marginLeft: 12,
  },
  playerName: {
    color: COLORS.text,
    fontSize: 16,
    fontWeight: '700',
  },
  playerSubValue: {
    color: COLORS.textSecondary,
    fontSize: 12,
    marginTop: 2,
  },
  valueContainer: {
    alignItems: 'flex-end',
  },
  rankValue: {
    color: COLORS.text,
    fontSize: 18,
    fontWeight: '800',
    fontFamily: 'JetBrains Mono',
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContainer: {
    marginTop: 60,
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.textSecondary,
    marginTop: 16,
    textAlign: 'center',
  },
});
