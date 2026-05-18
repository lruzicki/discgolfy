import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
  AppState,
  Modal,
  FlatList,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { COLORS } from '../theme';
import { supabase } from '../lib/supabase';
import { useMatchStore } from '../store/useMatchStore';
import { useNavigation } from '@react-navigation/native';
import * as Location from 'expo-location';
import { calculateDistance } from '../lib/utils';

interface Player {
  id: string;
  display_name: string;
}

interface Hole {
  id: string;
  hole_number: number;
  par: number;
  distance_m: number;
}

interface Disc {
  id: string;
  name: string;
  color_rgba: string;
}

interface PendingThrow {
  startLat: number;
  startLng: number;
}

interface ThrowRecord {
  id: string;
  throw_number: number;
  distance_m: number;
  disc_id: string | null;
  discs?: {
    name: string;
    color_rgba: string;
  } | null;
}

export function ActiveMatchScreen() {
  const navigation = useNavigation<any>();
  const appState = useRef(AppState.currentState);
  
  const { 
    matchId, 
    layoutId, 
    activeHoleIndex, 
    setActiveHoleIndex,
    scores,
    incrementScore,
    decrementScore,
    setScore,
    triggerSync,
    isSyncing
  } = useMatchStore();

  const [players, setPlayers] = useState<Player[]>([]);
  const [holes, setHoles] = useState<Hole[]>([]);
  const [loading, setLoading] = useState(true);
  const [discs, setDiscs] = useState<Disc[]>([]);
  const [pendingThrow, setPendingThrow] = useState<PendingThrow | null>(null);
  const [isDiscModalVisible, setIsDiscModalVisible] = useState(false);
  const [tempEndCoords, setTempEndCoords] = useState<{lat: number, lng: number} | null>(null);
  const [recordedThrows, setRecordedThrows] = useState<ThrowRecord[]>([]);

  useEffect(() => {
    if (!matchId) {
      navigation.navigate('SelectCourse');
      return;
    }
    fetchMatchData();
    fetchDiscs();

    // Listen for app state changes to trigger sync
    const subscription = AppState.addEventListener('change', nextAppState => {
      if (appState.current.match(/active/) && nextAppState === 'background') {
        triggerSync();
      }
      appState.current = nextAppState;
    });

    return () => subscription.remove();
  }, []);

  const fetchThrowsForHole = async () => {
    const currentHole = holes[activeHoleIndex];
    if (!currentHole || !matchId) return;
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      
      const { data: profile } = await supabase
        .from('profiles')
        .select('id')
        .eq('auth_id', user.id)
        .single();
      if (!profile) return;

      const { data, error } = await supabase
        .from('throws')
        .select(`
          id,
          throw_number,
          distance_m,
          disc_id,
          discs (
            name,
            color_rgba
          )
        `)
        .eq('match_id', matchId)
        .eq('hole_id', currentHole.id)
        .eq('player_id', profile.id)
        .order('throw_number', { ascending: true });

      if (error) throw error;
      
      // Need to type cast data because Supabase returns discs as an array or object depending on relation
      // In this case it's one-to-one (belongs to), so it's a single object or null.
      const formattedData: ThrowRecord[] = (data || []).map((t: any) => ({
        id: t.id,
        throw_number: t.throw_number,
        distance_m: t.distance_m,
        disc_id: t.disc_id,
        discs: t.discs as { name: string; color_rgba: string } | null,
      }));
      
      setRecordedThrows(formattedData);
    } catch (error) {
      console.error('Error fetching throws:', error);
    }
  };

  useEffect(() => {
    if (holes.length > 0) {
      fetchThrowsForHole();
    }
  }, [activeHoleIndex, holes, matchId]);

  const fetchMatchData = async () => {
    try {
      setLoading(true);
      
      const { data: holeData, error: holeError } = await supabase
        .from('holes')
        .select('*')
        .eq('layout_id', layoutId)
        .order('hole_number', { ascending: true });

      if (holeError) throw holeError;
      setHoles(holeData || []);

      const { data: playerData, error: playerError } = await supabase
        .from('match_players')
        .select(`
          player_id,
          profiles (
            id,
            display_name
          )
        `)
        .eq('match_id', matchId);

      if (playerError) throw playerError;
      
      const mappedPlayers = (playerData || []).map((p: any) => ({
        id: p.profiles.id,
        display_name: p.profiles.display_name
      }));
      setPlayers(mappedPlayers);

    } catch (error: any) {
      Alert.alert('Error', error.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchDiscs = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profile } = await supabase
        .from('profiles')
        .select('id')
        .eq('auth_id', user.id)
        .single();

      if (!profile) return;

      const { data } = await supabase
        .from('discs')
        .select('id, name, color_rgba')
        .eq('player_id', profile.id)
        .is('archived_at', null);
      
      setDiscs(data || []);
    } catch (error) {
      console.error('Error fetching discs:', error);
    }
  };

  const currentHole = holes[activeHoleIndex];

  const handleStartThrow = async () => {
    try {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'Location permission is required to track throws.');
        return;
      }

      const location = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
      setPendingThrow({
        startLat: location.coords.latitude,
        startLng: location.coords.longitude,
      });
      Alert.alert('Throw Started', 'GPS position recorded. Walk to your disc and tap "Mark End".');
    } catch (error: any) {
      Alert.alert('Error', 'Failed to get location: ' + error.message);
    }
  };

  const handleEndThrow = async () => {
    if (!pendingThrow) return;

    try {
      const location = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
      setTempEndCoords({
        lat: location.coords.latitude,
        lng: location.coords.longitude,
      });
      setIsDiscModalVisible(true);
    } catch (error: any) {
      Alert.alert('Error', 'Failed to get location: ' + error.message);
    }
  };

  const finalizeThrow = async (discId: string | null) => {
    if (!pendingThrow || !tempEndCoords || !currentHole) return;

    try {
      const distance = calculateDistance(
        pendingThrow.startLat,
        pendingThrow.startLng,
        tempEndCoords.lat,
        tempEndCoords.lng
      );

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profile } = await supabase
        .from('profiles')
        .select('id')
        .eq('auth_id', user.id)
        .single();

      if (!profile) return;

      const { count } = await supabase
        .from('throws')
        .select('*', { count: 'exact', head: true })
        .eq('match_id', matchId)
        .eq('player_id', profile.id)
        .eq('hole_id', currentHole.id);

      const throwNumber = (count || 0) + 1;

      const { error } = await supabase
        .from('throws')
        .insert({
          match_id: matchId,
          player_id: profile.id,
          hole_id: currentHole.id,
          disc_id: discId,
          throw_number: throwNumber,
          start_lat: pendingThrow.startLat,
          start_lng: pendingThrow.startLng,
          end_lat: tempEndCoords.lat,
          end_lng: tempEndCoords.lng,
          distance_m: distance,
        });

      if (error) throw error;

      Alert.alert('Success', `Throw tracked: ${distance}m`);
      setPendingThrow(null);
      setTempEndCoords(null);
      setIsDiscModalVisible(false);
      
      incrementScore(currentHole.id, profile.id, currentHole.par);
      fetchThrowsForHole();
      
    } catch (error: any) {
      Alert.alert('Error', error.message);
    }
  };

  const handleNextHole = () => {
    if (activeHoleIndex < holes.length - 1) {
      triggerSync();
      setActiveHoleIndex(activeHoleIndex + 1);
    }
  };

  const handlePrevHole = () => {
    if (activeHoleIndex > 0) {
      triggerSync();
      setActiveHoleIndex(activeHoleIndex - 1);
    }
  };

  const handleSkipHole = (playerId: string) => {
    setScore(currentHole.id, playerId, null);
  };

  const handleFinishMatch = async () => {
    try {
      setLoading(true);
      
      // 1. Force final sync
      await triggerSync();

      // 2. Fetch all scores for this match to calculate totals
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

      // 3. Update total scores for each player
      const playerTotals = players.map(player => {
        const playerScores = (scoresData || []).filter(s => s.player_id === player.id);
        const totalScore = playerScores.reduce((acc, curr) => acc + (curr.strokes || 0), 0);
        return {
          player_id: player.id,
          total_score: totalScore
        };
      });

      for (const total of playerTotals) {
        const { error: updateError } = await supabase
          .from('match_players')
          .update({ total_score: total.total_score })
          .eq('match_id', matchId)
          .eq('player_id', total.player_id);
        
        if (updateError) throw updateError;
      }

      // 4. Mark match as completed
      const { error: matchError } = await supabase
        .from('matches')
        .update({ status: 'completed' })
        .eq('id', matchId);

      if (matchError) throw matchError;

      // 5. Navigate to Summary
      navigation.navigate('MatchSummary');

    } catch (error: any) {
      Alert.alert('Error', 'Failed to finish match: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  if (loading || !currentHole) {
    return (
      <SafeAreaView style={styles.container}>
        <ActivityIndicator size="large" color={COLORS.primary} style={{ marginTop: 100 }} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="close" size={28} color={COLORS.text} />
        </TouchableOpacity>
        <View style={styles.syncIndicator}>
          {isSyncing && <ActivityIndicator size="small" color={COLORS.primary} />}
          <Text style={styles.headerTitle}>Hole {currentHole.hole_number}</Text>
        </View>
        <TouchableOpacity onPress={() => triggerSync()}>
          <Ionicons name="cloud-upload-outline" size={24} color={isSyncing ? COLORS.primary : COLORS.textSecondary} />
        </TouchableOpacity>
      </View>

      <View style={styles.holeInfoBar}>
        <View style={styles.holeStat}>
          <Text style={styles.holeStatLabel}>PAR</Text>
          <Text style={styles.holeStatValue}>{currentHole.par}</Text>
        </View>
        <View style={styles.holeStat}>
          <Text style={styles.holeStatLabel}>DIST</Text>
          <Text style={styles.holeStatValue}>{currentHole.distance_m}m</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {players.map(player => {
          const strokes = scores[currentHole.id]?.[player.id];
          const isSkipped = strokes === null;
          const scoreDiff = strokes ? strokes - currentHole.par : 0;
          const scoreDiffText = scoreDiff === 0 ? 'E' : (scoreDiff > 0 ? `+${scoreDiff}` : scoreDiff);

          return (
            <View key={player.id} style={styles.playerCard}>
              <View style={styles.playerInfo}>
                <Text style={styles.playerName}>{player.display_name}</Text>
                {!isSkipped && strokes !== undefined && (
                  <Text style={[
                    styles.scoreDiff,
                    scoreDiff < 0 && styles.scoreUnder,
                    scoreDiff > 0 && styles.scoreOver
                  ]}>
                    {scoreDiffText}
                  </Text>
                )}
              </View>

              <View style={styles.scoreControl}>
                {isSkipped ? (
                  <TouchableOpacity 
                    style={styles.skippedButton} 
                    onPress={() => incrementScore(currentHole.id, player.id, currentHole.par)}
                  >
                    <Text style={styles.skippedText}>SKIPPED</Text>
                  </TouchableOpacity>
                ) : (
                  <>
                    <TouchableOpacity 
                      style={styles.scoreBtn}
                      onLongPress={() => handleSkipHole(player.id)}
                      onPress={() => decrementScore(currentHole.id, player.id, currentHole.par)}
                    >
                      <Ionicons name="remove" size={32} color={COLORS.text} />
                    </TouchableOpacity>

                    <View style={styles.scoreValueContainer}>
                      <Text style={styles.scoreValue}>{strokes || '-'}</Text>
                    </View>

                    <TouchableOpacity 
                      style={[styles.scoreBtn, styles.scoreBtnPrimary]}
                      onPress={() => incrementScore(currentHole.id, player.id, currentHole.par)}
                    >
                      <Ionicons name="add" size={32} color={COLORS.onPrimary} />
                    </TouchableOpacity>
                  </>
                )}
              </View>
            </View>
          );
        })}

        {/* Throw Tracking Section */}
        <View style={styles.throwSection}>
          <Text style={styles.sectionTitle}>GPS THROW TRACKING</Text>
          
          {recordedThrows.length > 0 && (
            <View style={styles.recordedThrowsList}>
              {recordedThrows.map((t) => (
                <View key={t.id} style={styles.recordedThrowItem}>
                  <View style={styles.recordedThrowLeft}>
                    <Text style={styles.throwNumberText}>#{t.throw_number}</Text>
                    {t.discs && (
                      <View style={styles.throwDiscInfo}>
                        <View style={[styles.smallDiscColor, { backgroundColor: t.discs.color_rgba || COLORS.primary }]} />
                        <Text style={styles.throwDiscName}>{t.discs.name}</Text>
                      </View>
                    )}
                  </View>
                  <Text style={styles.throwDistance}>{t.distance_m}m</Text>
                </View>
              ))}
            </View>
          )}

          {!pendingThrow ? (
            <TouchableOpacity style={styles.trackButton} onPress={handleStartThrow}>
              <MaterialCommunityIcons name="map-marker-distance" size={24} color={COLORS.onPrimary} />
              <Text style={styles.trackButtonText}>MARK START</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity style={[styles.trackButton, styles.trackButtonEnd]} onPress={handleEndThrow}>
              <MaterialCommunityIcons name="map-marker-check" size={24} color={COLORS.onPrimary} />
              <Text style={styles.trackButtonText}>MARK END</Text>
            </TouchableOpacity>
          )}
        </View>
      </ScrollView>

      {/* Disc Modal */}
      <Modal visible={isDiscModalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Select Disc</Text>
            <FlatList
              data={discs}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => (
                <TouchableOpacity 
                  style={styles.discItem} 
                  onPress={() => finalizeThrow(item.id)}
                >
                  <View style={[styles.discColor, { backgroundColor: item.color_rgba || COLORS.primary }]} />
                  <Text style={styles.discName}>{item.name}</Text>
                </TouchableOpacity>
              )}
              ListEmptyComponent={
                <TouchableOpacity style={styles.discItem} onPress={() => finalizeThrow(null)}>
                  <Text style={styles.discName}>No discs in bag (Track without disc)</Text>
                </TouchableOpacity>
              }
            />
            <TouchableOpacity style={styles.modalClose} onPress={() => setIsDiscModalVisible(false)}>
              <Text style={styles.modalCloseText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <View style={styles.footer}>
        <TouchableOpacity 
          style={[styles.navBtn, activeHoleIndex === 0 && styles.navBtnDisabled]} 
          onPress={handlePrevHole}
          disabled={activeHoleIndex === 0}
        >
          <Ionicons name="chevron-back" size={24} color={activeHoleIndex === 0 ? COLORS.textMuted : COLORS.text} />
        </TouchableOpacity>

        <View style={styles.holeDots}>
          {holes.map((h, i) => (
            <View 
              key={h.id} 
              style={[
                styles.holeDot, 
                i === activeHoleIndex && styles.holeDotActive,
                i < activeHoleIndex && styles.holeDotDone
              ]} 
            />
          ))}
        </View>

        {activeHoleIndex === holes.length - 1 ? (
          <TouchableOpacity 
            style={[styles.navBtn, styles.finishBtn]}
            onPress={handleFinishMatch}
          >
            <Text style={styles.finishBtnText}>FINISH</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity style={styles.navBtn} onPress={handleNextHole}>
            <Ionicons name="chevron-forward" size={24} color={COLORS.text} />
          </TouchableOpacity>
        )}
      </View>
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
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  headerTitle: {
    color: COLORS.text,
    fontSize: 20,
    fontWeight: '700',
    marginLeft: 8,
  },
  syncIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  holeInfoBar: {
    flexDirection: 'row',
    backgroundColor: COLORS.surface,
    paddingVertical: 12,
    marginHorizontal: 20,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.borderDark,
    marginBottom: 16,
  },
  holeStat: {
    flex: 1,
    alignItems: 'center',
    borderRightWidth: 1,
    borderRightColor: COLORS.borderDark,
  },
  holeStatLabel: {
    color: COLORS.textSecondary,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1,
  },
  holeStatValue: {
    color: COLORS.text,
    fontSize: 18,
    fontWeight: '800',
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 150,
  },
  playerCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    padding: 20,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: COLORS.borderDark,
  },
  playerInfo: {
    flex: 1,
  },
  playerName: {
    color: COLORS.text,
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 4,
  },
  scoreDiff: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.textSecondary,
  },
  scoreUnder: {
    color: COLORS.success,
  },
  scoreOver: {
    color: '#FF5252',
  },
  scoreControl: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  scoreBtn: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: COLORS.borderDark,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scoreBtnPrimary: {
    backgroundColor: COLORS.primary,
  },
  scoreValueContainer: {
    width: 40,
    alignItems: 'center',
  },
  scoreValue: {
    color: COLORS.text,
    fontSize: 28,
    fontWeight: '800',
  },
  skippedButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: 'rgba(160, 160, 160, 0.1)',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.borderDark,
  },
  skippedText: {
    color: COLORS.textMuted,
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 1,
  },
  throwSection: {
    marginTop: 24,
    padding: 20,
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.borderDark,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.textSecondary,
    letterSpacing: 1,
    marginBottom: 16,
  },
  recordedThrowsList: {
    marginBottom: 16,
  },
  recordedThrowItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderDark,
  },
  recordedThrowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  throwNumberText: {
    fontSize: 16,
    fontWeight: '800',
    color: COLORS.textSecondary,
    width: 30,
  },
  throwDiscInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(255,255,255,0.05)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  smallDiscColor: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  throwDiscName: {
    color: COLORS.text,
    fontSize: 14,
    fontWeight: '600',
  },
  throwDistance: {
    fontSize: 18,
    fontWeight: '800',
    color: COLORS.primary,
  },
  trackButton: {
    flexDirection: 'row',
    backgroundColor: COLORS.primary,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  trackButtonEnd: {
    backgroundColor: COLORS.success,
  },
  trackButtonText: {
    color: COLORS.onPrimary,
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: 1,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: COLORS.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    maxHeight: '80%',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 20,
  },
  discItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderDark,
  },
  discColor: {
    width: 24,
    height: 24,
    borderRadius: 12,
    marginRight: 16,
  },
  discName: {
    fontSize: 18,
    color: COLORS.text,
  },
  modalClose: {
    marginTop: 20,
    alignItems: 'center',
    padding: 16,
  },
  modalCloseText: {
    color: COLORS.textSecondary,
    fontSize: 16,
    fontWeight: '600',
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: COLORS.background,
    paddingHorizontal: 20,
    paddingBottom: 40,
    paddingTop: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: COLORS.borderDark,
  },
  navBtn: {
    width: 50,
    height: 50,
    justifyContent: 'center',
    alignItems: 'center',
  },
  navBtnDisabled: {
    opacity: 0.3,
  },
  finishBtn: {
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    width: 80,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  finishBtnText: {
    color: COLORS.onPrimary,
    fontWeight: '800',
    fontSize: 14,
  },
  holeDots: {
    flexDirection: 'row',
    gap: 6,
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 20,
    flexWrap: 'wrap',
  },
  holeDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: COLORS.borderDark,
  },
  holeDotActive: {
    backgroundColor: COLORS.primary,
    width: 12,
    height: 6,
  },
  holeDotDone: {
    backgroundColor: COLORS.textSecondary,
  },
});
