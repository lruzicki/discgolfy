import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity, ScrollView, ActivityIndicator } from 'react-native';
import { COLORS } from '../theme';
import { useMatchStore } from '../store/useMatchStore';
import { useNavigation, useIsFocused } from '@react-navigation/native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { supabase } from '../lib/supabase';

interface ActiveMatch {
  id: string;
  date_played: string;
  layout_name: string;
  course_name: string;
  player_count: number;
}

export function PlayScreen() {
  const navigation = useNavigation<any>();
  const isFocused = useIsFocused();
  const { setMatchId } = useMatchStore();
  
  const [loading, setLoading] = useState(true);
  const [activeMatches, setActiveMatches] = useState<ActiveMatch[]>([]);

  useEffect(() => {
    if (isFocused) {
      fetchActiveMatches();
    }
  }, [isFocused]);

  const fetchActiveMatches = async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profile } = await supabase
        .from('profiles')
        .select('id')
        .eq('auth_id', user.id)
        .single();

      if (!profile) return;

      const { data, error } = await supabase
        .from('matches')
        .select(`
          id,
          date_played,
          status,
          layouts (
            name,
            courses ( name )
          ),
          match_players ( count )
        `)
        .eq('created_by', profile.id)
        .eq('status', 'active')
        .order('date_played', { ascending: false });

      if (error) throw error;

      const formatted: ActiveMatch[] = (data || []).map((m: any) => ({
        id: m.id,
        date_played: m.date_played,
        layout_name: m.layouts?.name || 'Unknown',
        course_name: m.layouts?.courses?.name || 'Unknown',
        player_count: m.match_players?.[0]?.count || 0,
      }));

      setActiveMatches(formatted);
    } catch (error) {
      console.error('Error fetching active matches:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleResumeMatch = (match: ActiveMatch) => {
    setMatchId(match.id);
    navigation.navigate('ActiveMatch');
  };

  const renderActiveMatch = (match: ActiveMatch) => (
    <TouchableOpacity key={match.id} style={styles.matchCard} onPress={() => handleResumeMatch(match)}>
      <View style={styles.matchIcon}>
        <MaterialCommunityIcons name="play-circle" size={28} color={COLORS.primary} />
      </View>
      <View style={styles.matchInfo}>
        <Text style={styles.matchCourse}>{match.course_name}</Text>
        <Text style={styles.matchLayout}>{match.layout_name} • {match.player_count} Players</Text>
      </View>
      <Ionicons name="chevron-forward" size={20} color={COLORS.textSecondary} />
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Play</Text>
      </View>
      
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {activeMatches.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>ACTIVE ROUNDS</Text>
            {activeMatches.map(renderActiveMatch)}
          </View>
        )}

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>NEW ROUND</Text>
          <TouchableOpacity 
            style={styles.mainActionCard} 
            onPress={() => navigation.navigate('SelectCourse')}
          >
            <View style={styles.actionIconContainer}>
              <MaterialCommunityIcons name="plus-circle" size={48} color={COLORS.primary} />
            </View>
            <View style={styles.actionContent}>
              <Text style={styles.actionTitle}>Start New Match</Text>
              <Text style={styles.actionSubtext}>Choose a course and invite friends</Text>
            </View>
            <Ionicons name="chevron-forward" size={24} color={COLORS.textSecondary} />
          </TouchableOpacity>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>QUICK ACTIONS</Text>
          <View style={styles.quickRow}>
            <TouchableOpacity 
              style={styles.quickCard} 
              onPress={() => navigation.navigate('SelectCourse')}
            >
              <Ionicons name="map-outline" size={24} color={COLORS.primary} />
              <Text style={styles.quickText}>Courses</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.quickCard} 
              onPress={() => navigation.navigate('Profile', { screen: 'ProfileHome' })}
            >
              <Ionicons name="history" size={24} color={COLORS.primary} />
              <Text style={styles.quickText}>History</Text>
            </TouchableOpacity>
          </View>
        </View>

        {loading && activeMatches.length === 0 && (
          <ActivityIndicator size="small" color={COLORS.primary} style={{ marginTop: 20 }} />
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
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 10,
  },
  title: {
    fontSize: 34,
    fontWeight: '800',
    color: COLORS.text,
    letterSpacing: -0.5,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 100,
  },
  section: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: COLORS.textSecondary,
    letterSpacing: 1.5,
    marginBottom: 16,
    paddingHorizontal: 4,
  },
  matchCard: {
    flexDirection: 'row',
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    marginBottom: 12,
    borderWidth: 1,
    borderColor: COLORS.borderDark,
  },
  matchIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: 'rgba(144, 202, 249, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  matchInfo: {
    flex: 1,
  },
  matchCourse: {
    color: COLORS.text,
    fontSize: 16,
    fontWeight: '700',
  },
  matchLayout: {
    color: COLORS.textSecondary,
    fontSize: 13,
    marginTop: 2,
  },
  mainActionCard: {
    flexDirection: 'row',
    backgroundColor: COLORS.surface,
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.borderDark,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 5,
  },
  actionIconContainer: {
    marginRight: 20,
  },
  actionContent: {
    flex: 1,
  },
  actionTitle: {
    color: COLORS.text,
    fontSize: 20,
    fontWeight: '800',
  },
  actionSubtext: {
    color: COLORS.textSecondary,
    fontSize: 14,
    marginTop: 4,
  },
  quickRow: {
    flexDirection: 'row',
    gap: 12,
  },
  quickCard: {
    flex: 1,
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: COLORS.borderDark,
    gap: 8,
  },
  quickText: {
    color: COLORS.text,
    fontSize: 14,
    fontWeight: '700',
  },
});
