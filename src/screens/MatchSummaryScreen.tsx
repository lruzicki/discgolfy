import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
  Modal,
  Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { COLORS } from '../theme';
import { supabase } from '../lib/supabase';
import { useMatchStore } from '../store/useMatchStore';
import { useNavigation, useRoute } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SUPPORT_CTA, SUPPORT_MESSAGE, SUPPORT_URL } from '../constants/support';

interface PlayerScore {
  id: string;
  display_name: string;
  total_strokes: number;
  total_par: number;
}

interface PossibleScoreRow {
  id: string;
  display_name: string;
  actual_strokes: number;
  event_count: number;
  adjusted_strokes: number;
  adjusted_diff: number;
}

const buildPlayerScores = (playerData: any[], scoresData: any[]): PlayerScore[] => {
  return (playerData || []).map((p: any) => {
    const playedScores = (scoresData || []).filter(
      s => s.player_id === p.player_id && s.strokes !== null
    );
    const totalStrokes = playedScores.reduce((acc, curr) => acc + (curr.strokes || 0), 0);
    const totalPar = playedScores.reduce((acc, curr) => acc + (curr.holes?.par || 0), 0);

    return {
      id: p.player_id,
      display_name: p.profiles.display_name,
      total_strokes: totalStrokes,
      total_par: totalPar,
    };
  });
};

const formatDiff = (diff: number) => {
  if (diff === 0) return 'E';
  return diff > 0 ? `+${diff}` : `${diff}`;
};

export function MatchSummaryScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { matchId, resetMatch } = useMatchStore();
  const routeMatchId = route.params?.matchId;
  const summaryMatchId = routeMatchId ?? matchId;
  const isViewingHistorical = routeMatchId != null;
  const [loading, setLoading] = useState(true);
  const [playerScores, setPlayerScores] = useState<PlayerScore[]>([]);
  const [possibleScores, setPossibleScores] = useState<PossibleScoreRow[]>([]);
  const [courseInfo, setCourseInfo] = useState<any>(null);
  const [holesData, setHolesData] = useState<any[]>([]);
  const [scoresMap, setScoresMap] = useState<Record<string, Record<string, number | null>>>({});
  const [isCreator, setIsCreator] = useState(false);
  const [authUserId, setAuthUserId] = useState<string | null>(null);
  const [isSupportVisible, setIsSupportVisible] = useState(false);
  const [hasCheckedSupport, setHasCheckedSupport] = useState(false);

  useEffect(() => {
    fetchSummaryData();
  }, []);

  useEffect(() => {
    if (loading || isViewingHistorical || hasCheckedSupport || !authUserId) return;
    checkSupportPrompt();
  }, [loading, isViewingHistorical, hasCheckedSupport, authUserId]);

  const supportShownKey = authUserId ? `support_prompt_shown_v1:${authUserId}` : null;
  const supportDismissedKey = authUserId ? `support_prompt_dismissed_v1:${authUserId}` : null;

  const checkSupportPrompt = async () => {
    if (!supportShownKey || !supportDismissedKey) return;
    try {
      const [shown, dismissed] = await Promise.all([
        AsyncStorage.getItem(supportShownKey),
        AsyncStorage.getItem(supportDismissedKey),
      ]);
      if (shown !== 'true' && dismissed !== 'true') {
        setIsSupportVisible(true);
      }
    } finally {
      setHasCheckedSupport(true);
    }
  };

  const closeSupportPrompt = async (dontShowAgain: boolean) => {
    if (!supportShownKey || !supportDismissedKey) {
      setIsSupportVisible(false);
      return;
    }
    setIsSupportVisible(false);
    await AsyncStorage.setItem(supportShownKey, 'true');
    if (dontShowAgain) {
      await AsyncStorage.setItem(supportDismissedKey, 'true');
    }
  };

  const handleOpenSupport = async () => {
    try {
      await Linking.openURL(SUPPORT_URL);
    } catch {
      Alert.alert('Unable to open link', SUPPORT_URL);
    }
  };

  const fetchSummaryData = async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');
      setAuthUserId(user.id);

      const { data: profile } = await supabase
        .from('profiles')
        .select('id')
        .eq('auth_id', user.id)
        .single();
      
      // 1. Fetch Match, Layout and Course info
      const { data: matchData, error: matchError } = await supabase
        .from('matches')
        .select(`
          id,
          date_played,
          created_by,
          layouts (
            name,
            hole_count,
            courses (
              name,
              location
            ),
            holes (
              id,
              hole_number,
              par
            )
          )
        `)
        .eq('id', summaryMatchId)
        .single();

      if (matchError) throw matchError;
      setCourseInfo(matchData);
      setIsCreator(profile?.id === matchData.created_by);

      const layoutObj = Array.isArray(matchData.layouts) ? matchData.layouts[0] : matchData.layouts;
      const fetchedHoles = (layoutObj?.holes || []).sort((a: any, b: any) => a.hole_number - b.hole_number);
      setHolesData(fetchedHoles);

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
        .eq('match_id', summaryMatchId);

      if (scoresError) throw scoresError;

      const sMap: Record<string, Record<string, number | null>> = {};
      (scoresData || []).forEach((s: any) => {
        if (!sMap[s.hole_id]) sMap[s.hole_id] = {};
        sMap[s.hole_id][s.player_id] = s.strokes;
      });
      setScoresMap(sMap);

      // 3. Fetch players
      const { data: playerData, error: playerError } = await supabase
        .from('match_players')
        .select(`
          player_id,
          profiles (
            display_name
          )
        `)
        .eq('match_id', summaryMatchId);

      if (playerError) throw playerError;

      const { data: throwEventsData, error: throwEventsError } = await supabase
        .from('throw_events')
        .select('player_id')
        .eq('match_id', summaryMatchId);

      if (throwEventsError) throw throwEventsError;

      // 4. Calculate totals
      const players = buildPlayerScores(playerData || [], scoresData || []);
      const sortedPlayers = players.sort((a, b) => (a.total_strokes - a.total_par) - (b.total_strokes - b.total_par));
      setPlayerScores(sortedPlayers);

      const eventCountsByPlayerId = (throwEventsData || []).reduce((acc: Record<string, number>, event: any) => {
        const playerId = event.player_id;
        if (!playerId) return acc;
        acc[playerId] = (acc[playerId] || 0) + 1;
        return acc;
      }, {});

      const possibleScoreRows = sortedPlayers
        .map((player) => {
          const eventCount = eventCountsByPlayerId[player.id] || 0;
          const adjustedStrokes = player.total_strokes - eventCount;
          return {
            id: player.id,
            display_name: player.display_name,
            actual_strokes: player.total_strokes,
            event_count: eventCount,
            adjusted_strokes: adjustedStrokes,
            adjusted_diff: adjustedStrokes - player.total_par,
          };
        })
        .filter((row) => row.event_count > 0);

      setPossibleScores(possibleScoreRows);

    } catch (error: any) {
      Alert.alert('Error', error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDone = () => {
    resetMatch();
    // Navigate to Play tab instead of Profile to make starting a new match easier
    navigation.navigate('Play', { screen: 'PlayHome' });
  };

  const handleStartNew = () => {
    resetMatch();
    navigation.navigate('Play', { screen: 'SelectCourse' });
  };

  const handleDelete = async () => {
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
                .eq('id', summaryMatchId);
              
              if (error) throw error;
              
              resetMatch();
              navigation.navigate('Profile', { screen: 'ProfileHome' });
            } catch (error: any) {
              Alert.alert('Error', error.message || 'Failed to delete match');
            }
          }
        }
      ]
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
        <ActivityIndicator size="large" color={COLORS.primary} style={{ marginTop: 100 }} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <MaterialCommunityIcons name="trophy-variant" size={60} color={COLORS.primary} style={{ marginBottom: 12 }} />
          <Text style={styles.title}>Final Results</Text>
          <Text style={styles.date}>
            {new Date(courseInfo?.date_played).toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </Text>
        </View>

        <View style={styles.courseCard}>
          <Text style={styles.courseName}>{courseInfo?.layouts?.courses?.name}</Text>
          <Text style={styles.layoutName}>{courseInfo?.layouts?.name} • {courseInfo?.layouts?.hole_count} Holes</Text>
        </View>

        <Text style={styles.sectionTitle}>FINAL LEADERBOARD</Text>
        {playerScores.map((player, index) => {
          const scoreDiff = player.total_strokes - player.total_par;
          const scoreDiffText = formatDiff(scoreDiff);
          
          return (
            <View key={player.id} style={[styles.playerRow, index === 0 && styles.winnerRow]}>
              <View style={[styles.rankContainer, index === 0 && styles.winnerRank]}>
                {index === 0 ? (
                  <MaterialCommunityIcons name="crown" size={14} color="#000" />
                ) : (
                  <Text style={styles.rankText}>{index + 1}</Text>
                )}
              </View>
              <Text style={styles.playerName}>{player.display_name}</Text>
              <View style={styles.scoreContainer}>
                <Text style={styles.totalStrokes}>{player.total_strokes}</Text>
                <View style={[
                  styles.diffBadge,
                  scoreDiff < 0 && styles.scoreUnderBg,
                  scoreDiff > 0 && styles.scoreOverBg,
                  scoreDiff === 0 && styles.scoreEvenBg
                ]}>
                  <Text style={[
                    styles.diffText,
                    scoreDiff < 0 && styles.scoreUnderText,
                    scoreDiff > 0 && styles.scoreOverText,
                    scoreDiff === 0 && styles.scoreEvenText
                  ]}>
                    {scoreDiffText}
                  </Text>
                </View>
              </View>
            </View>
          );
        })}

        {possibleScores.length > 0 && (
          <View style={styles.possibleScoreSection}>
            <Text style={styles.sectionTitle}>Possible Score</Text>
            <View style={styles.possibleScoreHeaderRow}>
              <Text style={[styles.possibleScoreCell, styles.possibleScorePlayerCell]}>Player</Text>
              <Text style={styles.possibleScoreCell}>Actual</Text>
              <Text style={styles.possibleScoreCell}>Events</Text>
              <Text style={styles.possibleScoreCell}>Adjusted</Text>
              <Text style={styles.possibleScoreCell}>Adj Diff</Text>
            </View>
            {possibleScores.map((row) => (
              <View key={row.id} style={styles.possibleScoreRow}>
                <Text style={[styles.possibleScoreCell, styles.possibleScorePlayerCell]}>{row.display_name}</Text>
                <Text style={styles.possibleScoreCell}>{row.actual_strokes}</Text>
                <Text style={styles.possibleScoreCell}>{row.event_count}</Text>
                <Text style={styles.possibleScoreCell}>{row.adjusted_strokes}</Text>
                <Text style={styles.possibleScoreCell}>{formatDiff(row.adjusted_diff)}</Text>
              </View>
            ))}
          </View>
        )}

        <View style={styles.actionSection}>
          {!isViewingHistorical ? (
            <>
              <TouchableOpacity style={styles.doneBtn} onPress={handleStartNew}>
                <Ionicons name="play-skip-forward" size={20} color={COLORS.onPrimary} style={{ marginRight: 8 }} />
                <Text style={styles.doneBtnText}>PLAY AGAIN</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.secondaryBtn} onPress={handleDone}>
                <Text style={styles.secondaryBtnText}>BACK TO HUB</Text>
              </TouchableOpacity>
            </>
          ) : (
            <TouchableOpacity style={styles.secondaryBtn} onPress={() => navigation.goBack()}>
              <Ionicons name="arrow-back" size={20} color={COLORS.text} style={{ marginRight: 8 }} />
              <Text style={styles.secondaryBtnText}>BACK TO FEED</Text>
            </TouchableOpacity>
          )}

          {isCreator && (
            <TouchableOpacity style={styles.deleteBtn} onPress={handleDelete}>
              <Ionicons name="trash-outline" size={16} color="#FF5252" />
              <Text style={styles.deleteBtnText}>DELETE MATCH</Text>
            </TouchableOpacity>
          )}
        </View>
      </ScrollView>

      <Modal visible={isSupportVisible} transparent animationType="fade">
        <View style={styles.supportOverlay}>
          <View style={styles.supportModal}>
            <Text style={styles.supportTitle}>Keep Discgolfy Free</Text>
            <Text style={styles.supportBody}>{SUPPORT_MESSAGE}</Text>
            <TouchableOpacity style={styles.supportPrimaryBtn} onPress={handleOpenSupport}>
              <Text style={styles.supportPrimaryBtnText}>{SUPPORT_CTA}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.supportSecondaryBtn} onPress={() => closeSupportPrompt(false)}>
              <Text style={styles.supportSecondaryBtnText}>Maybe later</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.supportSecondaryBtn} onPress={() => closeSupportPrompt(true)}>
              <Text style={styles.supportSecondaryBtnText}>Don't show again</Text>
            </TouchableOpacity>
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
    borderRadius: 16,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: COLORS.borderDark,
  },
  winnerRow: {
    borderColor: COLORS.primary,
    backgroundColor: 'rgba(144, 202, 249, 0.05)',
    borderWidth: 1.5,
  },
  rankContainer: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: COLORS.borderDark,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  winnerRank: {
    backgroundColor: COLORS.primary,
  },
  rankText: {
    color: COLORS.textSecondary,
    fontSize: 12,
    fontWeight: '800',
  },
  playerName: {
    flex: 1,
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.text,
  },
  scoreContainer: {
    alignItems: 'flex-end',
    gap: 4,
  },
  totalStrokes: {
    fontSize: 20,
    fontWeight: '800',
    color: COLORS.text,
    fontFamily: 'JetBrains Mono',
  },
  diffBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    minWidth: 36,
    alignItems: 'center',
  },
  diffText: {
    fontSize: 11,
    fontWeight: '900',
  },
  scoreUnderBg: { backgroundColor: 'rgba(57, 255, 20, 0.15)' },
  scoreUnderText: { color: COLORS.success },
  scoreOverBg: { backgroundColor: 'rgba(255, 82, 82, 0.15)' },
  scoreOverText: { color: '#FF5252' },
  scoreEvenBg: { backgroundColor: 'rgba(255, 255, 255, 0.08)' },
  scoreEvenText: { color: COLORS.textSecondary },
  possibleScoreSection: {
    marginTop: 24,
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.borderDark,
    padding: 16,
  },
  possibleScoreHeaderRow: {
    flexDirection: 'row',
    marginBottom: 10,
  },
  possibleScoreRow: {
    flexDirection: 'row',
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: COLORS.borderDark,
  },
  possibleScoreCell: {
    flex: 1,
    color: COLORS.text,
    fontSize: 12,
    fontWeight: '700',
    textAlign: 'center',
    fontFamily: 'JetBrains Mono',
  },
  possibleScorePlayerCell: {
    flex: 1.6,
    textAlign: 'left',
    fontFamily: undefined,
  },
  summaryTable: { backgroundColor: 'transparent', marginBottom: 24 },
  summaryRow: { flexDirection: 'row', marginBottom: 2 },
  summaryCell: { flex: 1, height: 36, alignItems: 'center', justifyContent: 'center', borderRadius: 4, marginHorizontal: 1 },
  summaryCellSticky: { flex: 2.5, alignItems: 'flex-start', paddingHorizontal: 4, backgroundColor: 'transparent', marginRight: 8 },
  summaryLabel: { color: 'rgba(255,255,255,0.3)', fontSize: 10, fontWeight: '800', letterSpacing: 1 },
  summaryValue: { fontSize: 16, fontWeight: '800', fontFamily: 'JetBrains Mono' },
  summaryHoleNum: { color: 'rgba(255,255,255,0.6)', fontSize: 14, fontWeight: '700' },
  summaryPar: { color: 'rgba(255,255,255,0.4)', fontSize: 14, fontWeight: '400' },
  summaryPlayerName: { color: '#FFF', fontSize: 14, fontWeight: '700' },
  unplayableSummaryCell: { backgroundColor: 'rgba(255, 82, 82, 0.1)', opacity: 0.5 },
  actionSection: {
    marginTop: 32,
    gap: 12,
  },
  doneBtn: {
    backgroundColor: COLORS.primary,
    paddingVertical: 18,
    borderRadius: 16,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  doneBtnText: {
    color: COLORS.onPrimary,
    fontSize: 16,
    fontWeight: '900',
    letterSpacing: 1,
  },
  secondaryBtn: {
    backgroundColor: COLORS.surface,
    paddingVertical: 18,
    borderRadius: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.borderDark,
  },
  secondaryBtnText: {
    color: COLORS.text,
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  deleteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 16,
    padding: 12,
    gap: 6,
  },
  deleteBtnText: {
    color: '#FF5252',
    fontSize: 13,
    fontWeight: '700',
    opacity: 0.8,
  },
  supportOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.65)',
    justifyContent: 'center',
    padding: 24,
  },
  supportModal: {
    backgroundColor: COLORS.surface,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: COLORS.borderDark,
    padding: 18,
  },
  supportTitle: {
    color: COLORS.text,
    fontSize: 18,
    fontWeight: '800',
    marginBottom: 8,
  },
  supportBody: {
    color: COLORS.textSecondary,
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 14,
  },
  supportPrimaryBtn: {
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
    marginBottom: 10,
  },
  supportPrimaryBtnText: {
    color: COLORS.onPrimary,
    fontSize: 14,
    fontWeight: '800',
  },
  supportSecondaryBtn: {
    alignItems: 'center',
    paddingVertical: 10,
  },
  supportSecondaryBtnText: {
    color: COLORS.textSecondary,
    fontSize: 13,
    fontWeight: '700',
  },
});
