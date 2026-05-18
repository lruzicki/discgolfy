import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { COLORS } from '../theme';
import { supabase } from '../lib/supabase';
import { useMatchStore } from '../store/useMatchStore';
import { useNavigation, useRoute } from '@react-navigation/native';

interface PlayerScore {
  id: string;
  display_name: string;
  total_strokes: number;
  total_par: number;
}

export function MatchSummaryScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { matchId, resetMatch } = useMatchStore();
  const [loading, setLoading] = useState(true);
  const [playerScores, setPlayerScores] = useState<PlayerScore[]>([]);
  const [courseInfo, setCourseInfo] = useState<any>(null);

  useEffect(() => {
    fetchSummaryData();
  }, []);

  const fetchSummaryData = async () => {
    try {
      setLoading(true);
      
      // 1. Fetch Match, Layout and Course info
      const { data: matchData, error: matchError } = await supabase
        .from('matches')
        .select(`
          id,
          date_played,
          layouts (
            name,
            hole_count,
            courses (
              name,
              location
            )
          )
        `)
        .eq('id', matchId)
        .single();

      if (matchError) throw matchError;
      setCourseInfo(matchData);

      // 2. Fetch all scores for this match
      const { data: scoresData, error: scoresError } = await supabase
        .from('scores')
        .select(`
          strokes,
          player_id,
          hole_id,
          holes (
            par
          )
        `)
        .eq('match_id', matchId);

      if (scoresError) throw scoresError;

      // 3. Fetch players
      const { data: playerData, error: playerError } = await supabase
        .from('match_players')
        .select(`
          player_id,
          profiles (
            display_name
          )
        `)
        .eq('match_id', matchId);

      if (playerError) throw playerError;

      // 4. Calculate totals
      const players = (playerData || []).map((p: any) => {
        const playerScores = (scoresData || []).filter(s => s.player_id === p.player_id);
        const totalStrokes = playerScores.reduce((acc, curr) => acc + (curr.strokes || 0), 0);
        const totalPar = playerScores.reduce((acc, curr) => acc + (curr.holes?.par || 0), 0);
        
        return {
          id: p.player_id,
          display_name: p.profiles.display_name,
          total_strokes: totalStrokes,
          total_par: totalPar
        };
      });

      setPlayerScores(players.sort((a, b) => (a.total_strokes - a.total_par) - (b.total_strokes - b.total_par)));

    } catch (error: any) {
      Alert.alert('Error', error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDone = () => {
    resetMatch();
    navigation.navigate('Profile');
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <ActivityIndicator size="large" color={COLORS.primary} style={{ marginTop: 100 }} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <Text style={styles.title}>Match Summary</Text>
          <Text style={styles.date}>
            {new Date(courseInfo?.date_played).toLocaleDateString()}
          </Text>
        </View>

        <View style={styles.courseCard}>
          <Text style={styles.courseName}>{courseInfo?.layouts?.courses?.name}</Text>
          <Text style={styles.layoutName}>{courseInfo?.layouts?.name} • {courseInfo?.layouts?.hole_count} Holes</Text>
        </View>

        <Text style={styles.sectionTitle}>LEADERBOARD</Text>
        {playerScores.map((player, index) => {
          const scoreDiff = player.total_strokes - player.total_par;
          const scoreDiffText = scoreDiff === 0 ? 'E' : (scoreDiff > 0 ? `+${scoreDiff}` : scoreDiff);
          
          return (
            <View key={player.id} style={styles.playerRow}>
              <View style={styles.rankContainer}>
                <Text style={styles.rankText}>{index + 1}</Text>
              </View>
              <Text style={styles.playerName}>{player.display_name}</Text>
              <View style={styles.scoreContainer}>
                <Text style={styles.totalStrokes}>{player.total_strokes}</Text>
                <Text style={[
                  styles.scoreDiff,
                  scoreDiff < 0 && styles.scoreUnder,
                  scoreDiff > 0 && styles.scoreOver
                ]}>
                  ({scoreDiffText})
                </Text>
              </View>
            </View>
          );
        })}

        <TouchableOpacity style={styles.doneBtn} onPress={handleDone}>
          <Text style={styles.doneBtnText}>BACK TO PROFILE</Text>
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
  scrollContent: {
    padding: 24,
  },
  header: {
    marginBottom: 32,
    alignItems: 'center',
  },
  title: {
    fontSize: 32,
    fontWeight: '800',
    color: COLORS.primary,
    marginBottom: 8,
  },
  date: {
    fontSize: 16,
    color: COLORS.textSecondary,
  },
  courseCard: {
    backgroundColor: COLORS.surface,
    padding: 20,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.borderDark,
    marginBottom: 32,
  },
  courseName: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 4,
  },
  layoutName: {
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: COLORS.textSecondary,
    letterSpacing: 2,
    marginBottom: 16,
  },
  playerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    padding: 16,
    borderRadius: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: COLORS.borderDark,
  },
  rankContainer: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: COLORS.borderDark,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  rankText: {
    color: COLORS.textSecondary,
    fontSize: 12,
    fontWeight: '700',
  },
  playerName: {
    flex: 1,
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.text,
  },
  scoreContainer: {
    alignItems: 'flex-end',
  },
  totalStrokes: {
    fontSize: 18,
    fontWeight: '800',
    color: COLORS.text,
  },
  scoreDiff: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.textSecondary,
  },
  scoreUnder: {
    color: COLORS.success,
  },
  scoreOver: {
    color: '#FF5252',
  },
  doneBtn: {
    backgroundColor: COLORS.primary,
    paddingVertical: 18,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 40,
  },
  doneBtnText: {
    color: COLORS.onPrimary,
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: 1,
  },
});
