import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { COLORS } from '../theme';
import { supabase } from '../lib/supabase';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';

interface MatchEntry {
  id: string;
  date_played: string;
  layout_name: string;
  course_name: string;
  creator_name: string;
  player_count: number;
  top_score: number | null;
  players: {
    display_name: string;
    total_score: number | null;
  }[];
}

export function LeaderboardScreen() {
  const navigation = useNavigation<any>();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [matches, setMatches] = useState<MatchEntry[]>([]);

  useEffect(() => {
    fetchLeaderboard();
  }, []);

  const fetchLeaderboard = async () => {
    try {
      setLoading(true);
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
          profiles:created_by ( display_name ),
          match_players (
            total_score,
            profiles:player_id ( display_name )
          )
        `)
        .eq('status', 'completed')
        .order('date_played', { ascending: false })
        .limit(20);

      if (error) throw error;

      const formattedMatches: MatchEntry[] = (data || []).map((m: any) => ({
        id: m.id,
        date_played: m.date_played,
        layout_name: m.layouts?.name || 'Unknown Layout',
        course_name: m.layouts?.courses?.name || 'Unknown Course',
        creator_name: m.profiles?.display_name || 'Unknown',
        player_count: m.match_players?.length || 0,
        top_score: m.match_players?.length > 0 
          ? Math.min(...m.match_players.map((p: any) => p.total_score || Infinity)) 
          : null,
        players: (m.match_players || []).map((p: any) => ({
          display_name: p.profiles?.display_name || 'Guest',
          total_score: p.total_score
        }))
      }));

      setMatches(formattedMatches);
    } catch (error: any) {
      console.error('Error fetching leaderboard:', error);
      Alert.alert('Error', 'Failed to load global board.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchLeaderboard();
  };

  const renderMatch = ({ item }: { item: MatchEntry }) => (
    <View style={styles.matchCard}>
      <View style={styles.matchHeader}>
        <View style={styles.courseInfo}>
          <Text style={styles.courseName}>{item.course_name}</Text>
          <Text style={styles.layoutName}>{item.layout_name}</Text>
        </View>
        <Text style={styles.matchDate}>
          {new Date(item.date_played).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
        </Text>
      </View>

      <View style={styles.playerList}>
        {item.players.slice(0, 3).map((p, i) => (
          <View key={i} style={styles.playerRow}>
            <Text style={styles.playerName} numberOfLines={1}>{p.display_name}</Text>
            <Text style={styles.playerScore}>{p.total_score || '-'}</Text>
          </View>
        ))}
        {item.player_count > 3 && (
          <Text style={styles.morePlayers}>+ {item.player_count - 3} more players</Text>
        )}
      </View>

      <View style={styles.matchFooter}>
        <View style={styles.creatorInfo}>
          <MaterialCommunityIcons name="account-edit-outline" size={14} color={COLORS.textSecondary} />
          <Text style={styles.creatorName}>Hosted by {item.creator_name}</Text>
        </View>
        <TouchableOpacity 
          style={styles.viewBtn}
          onPress={() => navigation.navigate('MatchSummary', { matchId: item.id })}
        >
          <Text style={styles.viewBtnText}>VIEW ROUND</Text>
          <Ionicons name="chevron-forward" size={14} color={COLORS.primary} />
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <View style={styles.header}>
        <Text style={styles.title}>Global Board</Text>
        <Text style={styles.subTitle}>Recently completed matches</Text>
      </View>

      {loading && !refreshing ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      ) : (
        <FlatList
          data={matches}
          keyExtractor={(item) => item.id}
          renderItem={renderMatch}
          contentContainerStyle={styles.listContent}
          refreshing={refreshing}
          onRefresh={onRefresh}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <MaterialCommunityIcons name="trophy-outline" size={64} color={COLORS.borderDark} />
              <Text style={styles.emptyText}>No completed matches yet.</Text>
              <Text style={styles.emptySubtext}>Be the first to finish a round!</Text>
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
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 16,
  },
  title: {
    fontSize: 32,
    fontWeight: '800',
    color: COLORS.text,
    letterSpacing: -0.5,
  },
  subTitle: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginTop: 4,
    fontWeight: '500',
  },
  listContent: {
    padding: 16,
    paddingBottom: 100,
  },
  matchCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 20,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: COLORS.borderDark,
  },
  matchHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  courseInfo: {
    flex: 1,
    marginRight: 12,
  },
  courseName: {
    color: COLORS.text,
    fontSize: 18,
    fontWeight: '700',
  },
  layoutName: {
    color: COLORS.primary,
    fontSize: 12,
    fontWeight: '600',
    marginTop: 2,
  },
  matchDate: {
    color: COLORS.textSecondary,
    fontSize: 12,
    fontWeight: '600',
  },
  playerList: {
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
  },
  playerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
  },
  playerName: {
    color: COLORS.text,
    fontSize: 14,
    fontWeight: '500',
    flex: 1,
  },
  playerScore: {
    color: COLORS.text,
    fontSize: 14,
    fontWeight: '700',
    fontFamily: 'JetBrains Mono',
  },
  morePlayers: {
    color: COLORS.textSecondary,
    fontSize: 11,
    marginTop: 4,
    fontStyle: 'italic',
  },
  matchFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  creatorInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  creatorName: {
    color: COLORS.textSecondary,
    fontSize: 12,
  },
  viewBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  viewBtnText: {
    color: COLORS.primary,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContainer: {
    marginTop: 100,
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  emptyText: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.text,
    marginTop: 20,
    textAlign: 'center',
  },
  emptySubtext: {
    fontSize: 15,
    color: COLORS.textSecondary,
    marginTop: 8,
    textAlign: 'center',
  },
});
