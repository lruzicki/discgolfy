import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { COLORS } from '../theme';
import { supabase } from '../lib/supabase';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useMatchStore } from '../store/useMatchStore';

interface HistoryEntry {
  id: string;
  date_played: string;
  course_name: string;
  layout_name: string;
  total_strokes: number;
  total_par: number;
  diff: number;
}

export function MatchHistoryScreen() {
  const navigation = useNavigation<any>();
  const [loading, setLoading] = useState(true);
  const [matches, setMatches] = useState<HistoryEntry[]>([]);
  const setMatchId = useMatchStore(state => state.setMatchId);

  useEffect(() => {
    fetchHistory();
  }, []);

  const fetchHistory = async () => {
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
        .from('match_players')
        .select(`
          match_id,
          total_score,
          matches (
            id,
            date_played,
            created_by,
            layouts (
              name,
              courses ( name ),
              holes ( par )
            )
          )
        `)
        .eq('player_id', profile.id)
        .order('matches(date_played)', { ascending: false });

      if (error) throw error;

      const formatted: HistoryEntry[] = (data || []).map((entry: any) => {
        const m = entry.matches;
        const totalPar = m.layouts?.holes?.reduce((acc: number, h: any) => acc + h.par, 0) || 0;
        const totalStrokes = entry.total_score || 0;
        
        return {
          id: m.id,
          date_played: m.date_played,
          course_name: m.layouts?.courses?.name || 'Unknown',
          layout_name: m.layouts?.name || 'Unknown',
          total_strokes: totalStrokes,
          total_par: totalPar,
          diff: totalStrokes - totalPar
        };
      });

      setMatches(formatted);
    } catch (error: any) {
      console.error('Error fetching history:', error);
      Alert.alert('Error', 'Failed to load match history.');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteMatch = async (matchId: string) => {
    Alert.alert(
      'Delete Match',
      'Are you sure you want to permanently delete this match and all its data? This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Delete', 
          style: 'destructive',
          onPress: async () => {
            try {
              const { error } = await supabase
                .from('matches')
                .delete()
                .eq('id', matchId);
              
              if (error) throw error;
              
              setMatches(prev => prev.filter(m => m.id !== matchId));
            } catch (error: any) {
              Alert.alert('Error', error.message || 'Failed to delete match');
            }
          }
        }
      ]
    );
  };

  const renderEntry = ({ item }: { item: HistoryEntry }) => (
    <TouchableOpacity 
      style={styles.card}
      onPress={() => {
        navigation.navigate('MatchSummary', { matchId: item.id });
      }}
    >
      <View style={styles.cardHeader}>
        <View style={styles.dateBox}>
          <Text style={styles.dateDay}>{new Date(item.date_played).getDate()}</Text>
          <Text style={styles.dateMonth}>
            {new Date(item.date_played).toLocaleDateString(undefined, { month: 'short' }).toUpperCase()}
          </Text>
        </View>
        <View style={styles.courseInfo}>
          <Text style={styles.courseName}>{item.course_name}</Text>
          <Text style={styles.layoutName}>{item.layout_name}</Text>
        </View>
        <View style={styles.scoreBox}>
          <Text style={styles.totalStrokes}>{item.total_strokes}</Text>
          <Text style={[
            styles.scoreDiff,
            item.diff < 0 && styles.scoreUnder,
            item.diff > 0 && styles.scoreOver,
            item.diff === 0 && { color: COLORS.textSecondary }
          ]}>
            {item.diff === 0 ? 'E' : (item.diff > 0 ? `+${item.diff}` : item.diff)}
          </Text>
        </View>
        <TouchableOpacity 
          style={styles.deleteBtn} 
          onPress={() => handleDeleteMatch(item.id)}
        >
          <Ionicons name="trash-outline" size={20} color="#FF5252" />
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.title}>Match History</Text>
      </View>

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      ) : (
        <FlatList
          data={matches}
          keyExtractor={(item) => item.id}
          renderItem={renderEntry}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <MaterialCommunityIcons name="history" size={64} color={COLORS.borderDark} />
              <Text style={styles.emptyText}>No matches found.</Text>
              <Text style={styles.emptySubtext}>Complete a round to see it here.</Text>
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
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingTop: 12,
    paddingBottom: 20,
  },
  backBtn: {
    padding: 8,
    marginRight: 8,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: COLORS.text,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContent: {
    padding: 16,
    paddingBottom: 40,
  },
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: COLORS.borderDark,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dateBox: {
    width: 50,
    alignItems: 'center',
    marginRight: 16,
    paddingRight: 16,
    borderRightWidth: 1,
    borderRightColor: COLORS.borderDark,
  },
  dateDay: {
    color: COLORS.text,
    fontSize: 20,
    fontWeight: '800',
  },
  dateMonth: {
    color: COLORS.primary,
    fontSize: 10,
    fontWeight: '700',
  },
  courseInfo: {
    flex: 1,
  },
  courseName: {
    color: COLORS.text,
    fontSize: 16,
    fontWeight: '700',
  },
  layoutName: {
    color: COLORS.textSecondary,
    fontSize: 12,
    marginTop: 2,
  },
  scoreBox: {
    alignItems: 'flex-end',
  },
  totalStrokes: {
    color: COLORS.text,
    fontSize: 18,
    fontWeight: '800',
    fontFamily: 'JetBrains Mono',
  },
  scoreDiff: {
    fontSize: 12,
    fontWeight: '700',
    marginTop: 2,
  },
  scoreUnder: {
    color: COLORS.success,
  },
  scoreOver: {
    color: '#FF5252',
  },
  deleteBtn: {
    padding: 8,
    marginLeft: 8,
  },
  emptyContainer: {
    marginTop: 100,
    alignItems: 'center',
  },
  emptyText: {
    color: COLORS.text,
    fontSize: 18,
    fontWeight: '700',
    marginTop: 20,
  },
  emptySubtext: {
    color: COLORS.textSecondary,
    fontSize: 14,
    marginTop: 8,
  },
});
