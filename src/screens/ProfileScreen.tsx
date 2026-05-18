import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Image, Alert, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { COLORS } from '../theme';
import { supabase } from '../lib/supabase';

export function ProfileScreen({ route, navigation }: any) {
  const { name, email } = route.params || {};
  const displayName = name || 'Lucas';
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    roundsPlayed: 0,
    avgScore: 0,
    bestHole: 'N/A',
    bestHoleInfo: '',
    totalThrows: 0,
    longestThrow: 0,
    bestRound: 'N/A'
  });

  useEffect(() => {
    fetchProfileStats();
  }, []);

  const fetchProfileStats = async () => {
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

      // 1. Fetch Rounds Played
      const { count: roundsCount } = await supabase
        .from('match_players')
        .select('*', { count: 'exact', head: true })
        .eq('player_id', profile.id);

      // 2. Fetch Longest Throw
      const { data: throwData } = await supabase
        .from('throws')
        .select('distance_m')
        .eq('player_id', profile.id)
        .order('distance_m', { ascending: false })
        .limit(1);
      
      const longestThrow = throwData?.[0]?.distance_m || 0;

      // 3. Fetch Best Round (lowest score relative to par)
      const { data: bestRoundData } = await supabase
        .from('match_players')
        .select(`
          total_score,
          matches (
            layouts (
              hole_count,
              holes ( par )
            )
          )
        `)
        .eq('player_id', profile.id)
        .not('total_score', 'is', null);

      let bestRoundDiff = Infinity;
      if (bestRoundData && bestRoundData.length > 0) {
        bestRoundData.forEach((r: any) => {
          const totalPar = r.matches?.layouts?.holes?.reduce((acc: number, h: any) => acc + h.par, 0) || 0;
          if (totalPar > 0) {
            const diff = (r.total_score || 0) - totalPar;
            if (diff < bestRoundDiff) bestRoundDiff = diff;
          }
        });
      }

      // 4. Fetch All Scores for calculations
      const { data: scoresData } = await supabase
        .from('scores')
        .select(`
          strokes,
          holes ( par, hole_number )
        `)
        .eq('player_id', profile.id)
        .not('strokes', 'is', null);

      let totalStrokes = 0;
      let totalPar = 0;
      let bestHoleDiff = Infinity;
      let bestHoleStr = 'N/A';
      let bestHoleDetails = '';

      if (scoresData && scoresData.length > 0) {
        scoresData.forEach((s: any) => {
          totalStrokes += s.strokes;
          totalPar += s.holes.par;
          const diff = s.strokes - s.holes.par;
          
          if (diff < bestHoleDiff) {
            bestHoleDiff = diff;
            if (diff <= -3) bestHoleStr = 'Albatross+';
            else if (diff === -2) bestHoleStr = 'Eagle';
            else if (diff === -1) bestHoleStr = 'Birdie';
            else if (diff === 0) bestHoleStr = 'Par';
            else bestHoleStr = 'Bogey+';
            
            bestHoleDetails = `(Hole ${s.holes.hole_number})`;
          }
        });
      }

      setStats({
        roundsPlayed: roundsCount || 0,
        avgScore: scoresData && scoresData.length > 0 ? (totalStrokes - totalPar) / (roundsCount || 1) : 0,
        bestHole: bestHoleStr,
        bestHoleInfo: bestHoleDetails,
        totalThrows: totalStrokes,
        longestThrow,
        bestRound: bestRoundDiff === Infinity ? 'N/A' : (bestRoundDiff === 0 ? 'E' : (bestRoundDiff > 0 ? `+${bestRoundDiff}` : bestRoundDiff))
      });

    } catch (error) {
      console.error('Error fetching profile stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      Alert.alert('Error', error.message);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, styles.centered]} edges={['top', 'left', 'right']}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Profile Header */}
        <View style={styles.profileHeader}>
          <View style={styles.avatarContainer}>
            <Image 
              source={{ uri: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?q=80&w=200&auto=format&fit=crop' }} 
              style={styles.avatar} 
            />
            <View style={styles.onlineBadge} />
          </View>
          <Text style={styles.name}>{displayName}</Text>
          <Text style={styles.title}>Touring Professional</Text>
        </View>

        {/* Stats Grid */}
        <View style={styles.statsGrid}>
          <View style={styles.statCardHalf}>
            <View style={styles.statHeader}>
              <MaterialCommunityIcons name="history" size={16} color={COLORS.textSecondary} />
              <Text style={styles.statLabel}>ROUNDS</Text>
            </View>
            <Text style={styles.statValue}>{stats.roundsPlayed}</Text>
          </View>
          <View style={styles.statCardHalf}>
            <View style={styles.statHeader}>
              <Ionicons name="trending-up" size={16} color={COLORS.textSecondary} />
              <Text style={styles.statLabel}>AVG. SCORE</Text>
            </View>
            <Text style={[
              styles.statValue, 
              stats.avgScore < 0 && { color: COLORS.success },
              stats.avgScore > 0 && { color: '#FF5252' }
            ]}>
              {stats.avgScore === 0 ? 'E' : (stats.avgScore > 0 ? `+${stats.avgScore.toFixed(1)}` : stats.avgScore.toFixed(1))}
            </Text>
          </View>
        </View>

        <View style={styles.statsGrid}>
          <View style={styles.statCardHalf}>
            <View style={styles.statHeader}>
              <MaterialCommunityIcons name="arrow-up-right-bold" size={16} color={COLORS.textSecondary} />
              <Text style={styles.statLabel}>LONGEST DRIVE</Text>
            </View>
            <View style={styles.bestHoleRow}>
              <Text style={styles.statValue}>{stats.longestThrow}</Text>
              <Text style={styles.unitText}>m</Text>
            </View>
          </View>
          <View style={styles.statCardHalf}>
            <View style={styles.statHeader}>
              <Ionicons name="medal-outline" size={16} color={COLORS.textSecondary} />
              <Text style={styles.statLabel}>BEST ROUND</Text>
            </View>
            <Text style={[
              styles.statValue,
              stats.bestRound !== 'N/A' && !stats.bestRound.toString().startsWith('+') && stats.bestRound !== 'E' && { color: COLORS.success },
              stats.bestRound.toString().startsWith('+') && { color: '#FF5252' }
            ]}>
              {stats.bestRound}
            </Text>
          </View>
        </View>

        <View style={styles.statCardFull}>
          <View style={styles.statHeader}>
            <Ionicons name="trophy-outline" size={16} color={COLORS.textSecondary} />
            <Text style={styles.statLabel}>BEST HOLE</Text>
          </View>
          <View style={styles.bestHoleRow}>
            <Text style={styles.statValue}>{stats.bestHole}</Text>
            <Text style={styles.bestHoleSubtext}>{stats.bestHoleInfo}</Text>
          </View>
        </View>

        <View style={[styles.statCardFull, styles.rowCard]}>
          <View style={styles.statHeader}>
            <Ionicons name="disc-outline" size={16} color={COLORS.textSecondary} />
            <Text style={styles.statLabel}>TOTAL THROWS</Text>
          </View>
          <Text style={styles.statValue}>{stats.totalThrows.toLocaleString()}</Text>
        </View>

        <View style={styles.actionGrid}>
          <TouchableOpacity style={styles.actionButton} onPress={() => navigation.navigate('Bag')}>
            <Ionicons name="bag-handle-outline" size={20} color={COLORS.textSecondary} />
            <Text style={styles.actionText}>BAG</Text>
            <Ionicons name="chevron-forward" size={20} color={COLORS.textSecondary} style={styles.actionArrow} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionButton} onPress={() => navigation.navigate('MatchHistory')}>
            <MaterialCommunityIcons name="history" size={20} color={COLORS.textSecondary} />
            <Text style={styles.actionText}>HISTORY</Text>
            <Ionicons name="chevron-forward" size={20} color={COLORS.textSecondary} style={styles.actionArrow} />
          </TouchableOpacity>
        </View>

        {/* Recent Performance */}
        <Text style={styles.sectionTitle}>Recent Performance</Text>
        <View style={styles.chartPlaceholder}>
          <Text style={{ color: COLORS.textMuted, textAlign: 'center' }}>Chart Placeholder</Text>
        </View>

        {/* Logout Button */}
        <TouchableOpacity style={styles.logoutButton} onPress={handleSignOut}>
          <Ionicons name="log-out-outline" size={20} color="#FF5252" />
          <Text style={styles.logoutText}>Log Out</Text>
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
    padding: 20,
    paddingBottom: 40,
  },
  profileHeader: {
    alignItems: 'center',
    marginBottom: 32,
  },
  avatarContainer: {
    position: 'relative',
    marginBottom: 16,
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 2,
    borderColor: COLORS.borderDark,
  },
  onlineBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 24,
    height: 24,
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    borderWidth: 3,
    borderColor: COLORS.background,
  },
  name: {
    color: COLORS.text,
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  title: {
    color: COLORS.primary,
    fontSize: 14,
  },
  statsGrid: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
  },
  statCardHalf: {
    flex: 1,
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    padding: 16,
  },
  statCardFull: {
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  rowCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  statHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  statLabel: {
    color: COLORS.textSecondary,
    fontSize: 10,
    fontWeight: '600',
    letterSpacing: 1,
  },
  statValue: {
    color: COLORS.text,
    fontSize: 28,
    fontWeight: 'bold',
  },
  bestHoleRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 8,
  },
  bestHoleSubtext: {
    color: COLORS.primary,
    fontSize: 14,
  },
  unitText: {
    color: COLORS.textSecondary,
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 2,
  },
  actionGrid: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 32,
  },
  actionButton: {
    flex: 1,
    backgroundColor: COLORS.surface,
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
  },
  actionText: {
    color: COLORS.text,
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 1,
    marginLeft: 8,
    flex: 1,
  },
  actionArrow: {
    marginLeft: 'auto',
  },
  sectionTitle: {
    color: COLORS.text,
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 16,
  },
  chartPlaceholder: {
    height: 150,
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 32,
    padding: 16,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 82, 82, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255, 82, 82, 0.2)',
  },
  logoutText: {
    color: '#FF5252',
    fontSize: 16,
    fontWeight: '600',
  },
  centered: {
    justifyContent: 'center',
    alignItems: 'center',
  },
});
