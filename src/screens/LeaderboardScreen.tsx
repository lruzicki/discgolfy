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

interface ThrowEntry {
  id: string;
  distance_m: number;
  display_name: string;
  disc_name: string;
  course_name: string;
  date: string;
}

type Tab = 'rounds' | 'throws' | 'players';

export function LeaderboardScreen() {
  const navigation = useNavigation<any>();
  const [activeTab, setActiveTab] = useState<Tab>('rounds');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [matches, setMatches] = useState<MatchEntry[]>([]);
  const [topThrows, setTopThrows] = useState<ThrowEntry[]>([]);

  useEffect(() => {
    fetchData();
  }, [activeTab]);

  const fetchData = async () => {
    setLoading(true);
    if (activeTab === 'rounds') await fetchLeaderboard();
    else if (activeTab === 'throws') await fetchTopThrows();
    setLoading(false);
    setRefreshing(false);
  };

  const fetchTopThrows = async () => {
    try {
      const { data, error } = await supabase
        .from('throws')
        .select(`
          id,
          distance_m,
          created_at,
          profiles:player_id ( display_name ),
          discs:disc_id ( name ),
          matches (
            layouts (
              courses ( name )
            )
          )
        `)
        .not('distance_m', 'is', null)
        .order('distance_m', { ascending: false })
        .limit(20);

      if (error) throw error;

      const formatted: ThrowEntry[] = (data || []).map((t: any) => ({
        id: t.id,
        distance_m: t.distance_m,
        display_name: t.profiles?.display_name || 'Unknown',
        disc_name: t.discs?.name || 'Unknown Disc',
        course_name: t.matches?.layouts?.courses?.name || 'Unknown Course',
        date: t.created_at
      }));

      setTopThrows(formatted);
    } catch (error: any) {
      console.error('Error fetching throws:', error);
    }
  };

  const fetchLeaderboard = async () => {
    try {
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
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchData();
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

  const renderThrow = ({ item, index }: { item: ThrowEntry, index: number }) => (
    <View style={styles.throwCard}>
      <View style={[styles.rankBadge, index === 0 && styles.rankGold, index === 1 && styles.rankSilver, index === 2 && styles.rankBronze]}>
        <Text style={styles.rankText}>{index + 1}</Text>
      </View>
      <View style={styles.throwInfo}>
        <Text style={styles.throwPlayer}>{item.display_name}</Text>
        <Text style={styles.throwSubtext}>{item.disc_name} • {item.course_name}</Text>
      </View>
      <View style={styles.throwValue}>
        <Text style={styles.distanceValue}>{item.distance_m}</Text>
        <Text style={styles.unitText}>m</Text>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <View style={styles.header}>
        <Text style={styles.title}>Leaderboard</Text>
        <View style={styles.tabBar}>
          <TouchableOpacity 
            style={[styles.tab, activeTab === 'rounds' && styles.activeTab]} 
            onPress={() => setActiveTab('rounds')}
          >
            <Text style={[styles.tabText, activeTab === 'rounds' && styles.activeTabText]}>Rounds</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.tab, activeTab === 'throws' && styles.activeTab]} 
            onPress={() => setActiveTab('throws')}
          >
            <Text style={[styles.tabText, activeTab === 'throws' && styles.activeTabText]}>Top Throws</Text>
          </TouchableOpacity>
        </View>
      </View>

      {loading && !refreshing ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      ) : (
        <FlatList
          data={activeTab === 'rounds' ? matches : topThrows}
          keyExtractor={(item) => item.id}
          renderItem={activeTab === 'rounds' ? renderMatch : renderThrow as any}
          contentContainerStyle={styles.listContent}
          refreshing={refreshing}
          onRefresh={onRefresh}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <MaterialCommunityIcons 
                name={activeTab === 'rounds' ? "trophy-outline" : "arrow-up-right-bold"} 
                size={64} 
                color={COLORS.borderDark} 
              />
              <Text style={styles.emptyText}>No data available yet.</Text>
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
    paddingBottom: 8,
  },
  title: {
    fontSize: 32,
    fontWeight: '800',
    color: COLORS.text,
    letterSpacing: -0.5,
    marginBottom: 16,
  },
  tabBar: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 8,
  },
  tab: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.borderDark,
  },
  activeTab: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  tabText: {
    color: COLORS.textSecondary,
    fontSize: 14,
    fontWeight: '700',
  },
  activeTabText: {
    color: COLORS.onPrimary,
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
  throwCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: COLORS.borderDark,
  },
  rankBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: COLORS.borderDark,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  rankGold: { backgroundColor: '#FFD700' },
  rankSilver: { backgroundColor: '#C0C0C0' },
  rankBronze: { backgroundColor: '#CD7F32' },
  rankText: {
    color: '#000',
    fontSize: 14,
    fontWeight: '800',
  },
  throwInfo: {
    flex: 1,
  },
  throwPlayer: {
    color: COLORS.text,
    fontSize: 16,
    fontWeight: '700',
  },
  throwSubtext: {
    color: COLORS.textSecondary,
    fontSize: 12,
    marginTop: 2,
  },
  throwValue: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 2,
  },
  distanceValue: {
    color: COLORS.primary,
    fontSize: 24,
    fontWeight: '800',
    fontFamily: 'JetBrains Mono',
  },
  unitText: {
    color: COLORS.textSecondary,
    fontSize: 12,
    fontWeight: '600',
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
});
