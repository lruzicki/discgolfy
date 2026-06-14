import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Image, Alert, ActivityIndicator, Modal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { Svg, Path, Defs, LinearGradient, Stop, Circle } from 'react-native-svg';
import { COLORS } from '../theme';
import { supabase } from '../lib/supabase';
import { buildProfileStats } from '../services/profileStats';
import { Avatar } from '../components/Avatar';
import * as Location from 'expo-location';
import { calculateDistance } from '../lib/utils';

function RecentPerformanceChart({ data }: { data: { label: string, diff: number }[] }) {
  if (data.length === 0) return null;

  const chartHeight = 150;
  // Use a percentage-based or flexible width if possible, but for simplicity let's use a fixed one that fits
  const chartWidth = 300; 
  const padding = 20;
  
  // We want to map: 
  // -8 -> top
  // +4 -> bottom (to leave room for +2 label)
  const topValue = -8;
  const bottomValue = 4;
  const range = bottomValue - topValue;

  const getY = (val: number) => {
    const clampedVal = Math.max(topValue, Math.min(bottomValue, val));
    return padding + ((clampedVal - topValue) / range) * (chartHeight - 2 * padding);
  };

  const getX = (index: number) => {
    if (data.length <= 1) return chartWidth / 2;
    return padding + (index / (data.length - 1)) * (chartWidth - 2 * padding);
  };

  const points = data.map((d, i) => ({ x: getX(i), y: getY(d.diff) }));
  
  const linePath = points.length > 0 
    ? `M ${points[0].x},${points[0].y} ${points.slice(1).map(p => `L ${p.x},${p.y}`).join(' ')}`
    : '';
    
  const areaPath = points.length > 0
    ? `${linePath} L ${points[points.length - 1].x},${chartHeight} L ${points[0].x},${chartHeight} Z`
    : '';

  return (
    <View style={styles.chartWrapper}>
      <View style={styles.yAxis}>
        <Text style={styles.yAxisLabel}>-8</Text>
        <Text style={styles.yAxisLabel}>-4</Text>
        <Text style={styles.yAxisLabel}>E</Text>
        <Text style={styles.yAxisLabel}>+2</Text>
      </View>
      <View style={styles.svgContainer}>
        <Svg height={chartHeight} width={chartWidth}>
          <Defs>
            <LinearGradient id="grad" x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0" stopColor={COLORS.primary} stopOpacity="0.4" />
              <Stop offset="1" stopColor={COLORS.primary} stopOpacity="0" />
            </LinearGradient>
          </Defs>
          <Path d={areaPath} fill="url(#grad)" />
          <Path d={linePath} fill="none" stroke={COLORS.primary} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
          {points.map((p, i) => (
            <Circle key={i} cx={p.x} cy={p.y} r="4" fill={COLORS.background} stroke={COLORS.primary} strokeWidth="2" />
          ))}
        </Svg>
      </View>
    </View>
  );
}

export function ProfileScreen({ route, navigation }: any) {
  const [displayName, setDisplayName] = useState('Player');
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [profileId, setProfileId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    roundsPlayed: 0,
    avgScore: 0,
    bestHole: 'N/A',
    bestHoleInfo: '',
    totalThrows: 0,
    longestThrow: 0,
    bestRound: 'N/A',
    birdies: 0,
    eagles: 0,
    treeHits: 0,
    waterHits: 0,
    obHits: 0,
    hitPeople: 0,
  });
  const [recentPerformance, setRecentPerformance] = useState<{label: string, diff: number}[]>([]);
  const [isMeasureModalVisible, setIsMeasureModalVisible] = useState(false);
  const [standaloneThrowStart, setStandaloneThrowStart] = useState<{ lat: number; lng: number } | null>(null);
  const [standaloneThrowDistance, setStandaloneThrowDistance] = useState<number | null>(null);
  const isSchemaCacheMissing = (error: any, key: string) =>
    Boolean(error?.message && error.message.toLowerCase().includes('schema cache') && error.message.includes(key));

  useFocusEffect(
    React.useCallback(() => {
      fetchProfileData();
    }, [])
  );

  const fetchProfileData = async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profile } = await supabase
        .from('profiles')
        .select('id, display_name, avatar_url')
        .eq('auth_id', user.id)
        .single();

      if (!profile) return;
      setDisplayName(profile.display_name);
      setAvatarUrl(profile.avatar_url);
      setProfileId(profile.id);

      // 1. Fetch Rounds Played
      const { count: roundsCount } = await supabase
        .from('match_players')
        .select('match_id, matches!inner(status)', { count: 'exact', head: true })
        .eq('player_id', profile.id)
        .eq('matches.status', 'completed');

      // 2. Fetch Longest Throw
      let throwData: any[] = [];
      const throwsWithTypeResult = await supabase
        .from('throws')
        .select('distance_m, matches!inner(status)')
        .eq('player_id', profile.id)
        .eq('matches.status', 'completed')
        .order('distance_m', { ascending: false })
        .limit(1);
      if (throwsWithTypeResult.error) throw throwsWithTypeResult.error;
      throwData = throwsWithTypeResult.data || [];

      // 3. Fetch Best Round & Recent Rounds
      const { data: bestRoundData } = await supabase
        .from('match_players')
        .select(`
          total_score,
          matches!inner (
            status,
            date_played,
            layouts (
              holes ( par )
            )
          )
        `)
        .eq('player_id', profile.id)
        .eq('matches.status', 'completed')
        .not('total_score', 'is', null);

      // 4. Fetch All Scores for counts and performance
      const { data: scoresData } = await supabase
        .from('scores')
        .select(`
          match_id,
          strokes,
          created_at,
          holes ( par, hole_number ),
          matches!inner ( status, date_played )
        `)
        .eq('player_id', profile.id)
        .eq('matches.status', 'completed')
        .not('strokes', 'is', null)
        .order('created_at', { ascending: false });

      let throwEventData: any[] = [];
      const throwEventsResult = await supabase
        .from('throw_events')
        .select('event_type, matches!inner(status)')
        .eq('player_id', profile.id)
        .eq('matches.status', 'completed');
      if (throwEventsResult.error) {
        if (!isSchemaCacheMissing(throwEventsResult.error, 'throw_event')) {
          throw throwEventsResult.error;
        }
      } else {
        throwEventData = throwEventsResult.data || [];
      }

      const nextStats = buildProfileStats({
        roundsCount: roundsCount || 0,
        bestRoundData: (bestRoundData || []) as any[],
        scoresData: (scoresData || []) as any[],
        throwData: throwData as any[],
        throwEventData,
      });

      setStats({
        roundsPlayed: nextStats.roundsPlayed,
        avgScore: nextStats.avgScore,
        bestHole: nextStats.bestHole,
        bestHoleInfo: nextStats.bestHoleInfo,
        totalThrows: nextStats.totalThrows,
        longestThrow: nextStats.longestThrow,
        bestRound: nextStats.bestRound,
        birdies: nextStats.birdies,
        eagles: nextStats.eagles,
        treeHits: nextStats.treeHits,
        waterHits: nextStats.waterHits,
        obHits: nextStats.obHits,
        hitPeople: nextStats.hitPeople,
      });
      setRecentPerformance(nextStats.recentPerformance);

    } catch (error) {
      console.error('Error fetching profile data:', error);
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

  const openStandaloneMeasure = () => {
    setStandaloneThrowStart(null);
    setStandaloneThrowDistance(null);
    setIsMeasureModalVisible(true);
  };

  const startStandaloneMeasure = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'Location permission is required.');
        return;
      }

      const location = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
      setStandaloneThrowStart({
        lat: location.coords.latitude,
        lng: location.coords.longitude,
      });
      setStandaloneThrowDistance(null);
    } catch (error: any) {
      Alert.alert('Error', error.message);
    }
  };

  const finishStandaloneMeasure = async () => {
    if (!standaloneThrowStart) return;

    try {
      const location = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
      const distance = calculateDistance(
        standaloneThrowStart.lat,
        standaloneThrowStart.lng,
        location.coords.latitude,
        location.coords.longitude,
      );
      setStandaloneThrowDistance(distance);
    } catch (error: any) {
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
      <View style={styles.header}>
        <View style={{ width: 32 }} />
        <Text style={styles.headerTitle}>Profile</Text>
        <TouchableOpacity style={styles.settingsButton} onPress={() => navigation.navigate('EditProfile')}>
          <Ionicons name="settings-outline" size={24} color={COLORS.text} />
        </TouchableOpacity>
      </View>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Profile Header */}
        <View style={styles.profileHeader}>
          <View style={styles.avatarContainer}>
            {profileId ? (
              <Avatar userId={profileId} name={displayName} avatarUrl={avatarUrl} size={100} />
            ) : (
              <Image 
                source={{ uri: avatarUrl || 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?q=80&w=200&auto=format&fit=crop' }} 
                style={styles.avatar} 
              />
            )}
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
              <Text style={styles.statLabel}>AVG / HOLE</Text>
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
              <MaterialCommunityIcons name="bird" size={16} color={COLORS.success} />
              <Text style={styles.statLabel}>BIRDIES</Text>
            </View>
            <Text style={styles.statValue}>{stats.birdies}</Text>
          </View>
          <View style={styles.statCardHalf}>
            <View style={styles.statHeader}>
              <MaterialCommunityIcons name="crown-outline" size={16} color="#FFD700" />
              <Text style={styles.statLabel}>EAGLES+</Text>
            </View>
            <Text style={styles.statValue}>{stats.eagles}</Text>
          </View>
        </View>

        <View style={styles.statsGrid}>
          <View style={styles.statCardQuarter}>
            <View style={styles.statHeader}>
              <MaterialCommunityIcons name="tree" size={16} color="#2E7D32" />
              <Text style={styles.statLabel}>TREE</Text>
            </View>
            <Text style={styles.statValue}>{stats.treeHits}</Text>
          </View>
          <View style={styles.statCardQuarter}>
            <View style={styles.statHeader}>
              <MaterialCommunityIcons name="waves" size={16} color="#1E88E5" />
              <Text style={styles.statLabel}>WATER</Text>
            </View>
            <Text style={styles.statValue}>{stats.waterHits}</Text>
          </View>
          <View style={styles.statCardQuarter}>
            <View style={styles.statHeader}>
              <MaterialCommunityIcons name="alert-octagon-outline" size={16} color="#FF7043" />
              <Text style={styles.statLabel}>OB</Text>
            </View>
            <Text style={styles.statValue}>{stats.obHits}</Text>
          </View>
          <View style={styles.statCardQuarter}>
            <View style={styles.statHeader}>
              <MaterialCommunityIcons name="account-alert-outline" size={16} color="#EF5350" />
              <Text style={styles.statLabel}>HIT PERSON</Text>
            </View>
            <Text style={styles.statValue}>{stats.hitPeople}</Text>
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
          <TouchableOpacity style={styles.actionButton} onPress={openStandaloneMeasure}>
            <MaterialCommunityIcons name="ruler" size={20} color={COLORS.textSecondary} />
            <Text style={styles.actionText}>MEASURE THROW</Text>
            <Ionicons name="chevron-forward" size={20} color={COLORS.textSecondary} style={styles.actionArrow} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionButton} onPress={() => navigation.navigate('LongestThrows')}>
            <MaterialCommunityIcons name="arrow-up-right-bold" size={20} color={COLORS.textSecondary} />
            <Text style={styles.actionText}>LONGEST THROWS</Text>
            <Ionicons name="chevron-forward" size={20} color={COLORS.textSecondary} style={styles.actionArrow} />
          </TouchableOpacity>
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
        <View style={styles.performanceContainer}>
          {recentPerformance.length > 0 ? (
            <RecentPerformanceChart data={recentPerformance} />
          ) : (
            <Text style={styles.emptyPerformance}>No recent round data available.</Text>
          )}
          <View style={styles.performanceFooter}>
            <Text style={styles.performanceSubtext}>
              Avg. Recent Diff: {
                recentPerformance.length > 0 
                  ? (recentPerformance.reduce((acc, curr) => acc + curr.diff, 0) / recentPerformance.length).toFixed(1)
                  : 'N/A'
              }
            </Text>
          </View>
        </View>

        {/* Logout Button */}
        <TouchableOpacity style={styles.logoutButton} onPress={handleSignOut}>
          <Ionicons name="log-out-outline" size={20} color="#FF5252" />
          <Text style={styles.logoutText}>Log Out</Text>
        </TouchableOpacity>

      </ScrollView>

      <Modal visible={isMeasureModalVisible} transparent animationType="fade">
        <View style={styles.measureOverlay}>
          <View style={styles.measureContent}>
            <View style={styles.measureHeader}>
              <Text style={styles.measureTitle}>
                {standaloneThrowDistance === null ? 'Measure throw' : 'Throw measured'}
              </Text>
              <TouchableOpacity
                accessibilityLabel="Close standalone throw result"
                onPress={() => setIsMeasureModalVisible(false)}
              >
                <Ionicons name="close" size={24} color={COLORS.textSecondary} />
              </TouchableOpacity>
            </View>

            {standaloneThrowDistance !== null ? (
              <Text style={styles.measureDistance}>{standaloneThrowDistance}m</Text>
            ) : (
              <View style={styles.measureActions}>
                <TouchableOpacity
                  style={[styles.measureActionButton, standaloneThrowStart && styles.measureActionButtonMuted]}
                  onPress={startStandaloneMeasure}
                >
                  <MaterialCommunityIcons name="map-marker-radius-outline" size={20} color={COLORS.onPrimary} />
                  <Text style={styles.measureActionText}>START</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.measureActionButton, !standaloneThrowStart && styles.measureActionButtonDisabled]}
                  disabled={!standaloneThrowStart}
                  onPress={finishStandaloneMeasure}
                >
                  <MaterialCommunityIcons name="flag-checkered" size={20} color={COLORS.onPrimary} />
                  <Text style={styles.measureActionText}>FINISH</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </View>
      </Modal>
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
    backgroundColor: COLORS.background,
  },
  headerTitle: {
    color: COLORS.text,
    fontSize: 18,
    fontWeight: '700',
  },
  settingsButton: {
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
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
  statCardQuarter: {
    flex: 1,
    minWidth: 0,
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    padding: 12,
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
  performanceContainer: {
    backgroundColor: '#1C1C1E',
    borderRadius: 16,
    padding: 16,
    marginBottom: 24,
  },
  chartWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingRight: 10,
  },
  yAxis: {
    justifyContent: 'space-between',
    height: 110, // Matches chart internal padding area roughly
    paddingVertical: 10,
    marginRight: 10,
  },
  yAxisLabel: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: 10,
    fontWeight: '600',
    width: 20,
    textAlign: 'right',
  },
  svgContainer: {
    flex: 1,
  },
  performanceFooter: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
  },
  performanceSubtext: {
    color: COLORS.primary,
    fontSize: 14,
    fontWeight: '600',
  },
  emptyPerformance: {
    color: COLORS.textMuted,
    textAlign: 'center',
    paddingVertical: 40,
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
  measureOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    padding: 24,
  },
  measureContent: {
    backgroundColor: '#1C1C1E',
    borderRadius: 16,
    padding: 24,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  measureHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 18,
  },
  measureTitle: {
    color: COLORS.text,
    fontSize: 19,
    fontWeight: '700',
  },
  measureActions: {
    flexDirection: 'row',
    gap: 12,
  },
  measureActionButton: {
    flex: 1,
    minHeight: 48,
    borderRadius: 12,
    backgroundColor: COLORS.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  measureActionButtonMuted: {
    backgroundColor: COLORS.borderDark,
  },
  measureActionButtonDisabled: {
    opacity: 0.45,
  },
  measureActionText: {
    color: COLORS.onPrimary,
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  measureDistance: {
    color: COLORS.primary,
    fontSize: 44,
    fontWeight: '800',
    textAlign: 'center',
  },
  centered: {
    justifyContent: 'center',
    alignItems: 'center',
  },
});
