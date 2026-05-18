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
import { WebView } from 'react-native-webview';
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
  tee_latitude: number;
  tee_longitude: number;
  basket_latitude: number;
  basket_longitude: number;
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

const SummaryView = ({ holes, players, scores }: { holes: Hole[], players: Player[], scores: any }) => {
  const chunks = [];
  for (let i = 0; i < holes.length; i += 9) {
    chunks.push(holes.slice(i, i + 9));
  }

  // Calculate total scores for leaderboard
  const leaderboard = players.map(player => {
    let totalStrokes = 0;
    let totalPar = 0;
    holes.forEach(h => {
      const s = scores[h.id]?.[player.id];
      if (s) {
        totalStrokes += s;
        totalPar += h.par;
      }
    });
    return {
      ...player,
      totalStrokes,
      totalPar,
      diff: totalStrokes - totalPar
    };
  }).sort((a, b) => a.diff - b.diff);

  const getScoreStyle = (diff: number | null) => {
    if (diff === null || diff === 0 || diff === -1 || diff === -2) return {};
    
    if (diff === 1) return { backgroundColor: '#E3F2FD', color: '#0D47A1' };
    if (diff === 2) return { backgroundColor: '#90CAF9', color: '#0D47A1' };
    if (diff === 3) return { backgroundColor: '#42A5F5', color: '#FFFFFF' };
    return { backgroundColor: '#1E88E5', color: '#FFFFFF' };
  };

  return (
    <ScrollView style={styles.summaryContainer} contentContainerStyle={{ paddingBottom: 40 }}>
      {/* Total Leaderboard Section */}
      <View style={styles.leaderboardSection}>
        <Text style={styles.leaderboardTitle}>ROUND LEADERBOARD</Text>
        {leaderboard.map((p, idx) => (
          <View key={p.id} style={styles.leaderboardPlayerRow}>
            <View style={styles.leaderboardRankBadge}>
              <Text style={styles.leaderboardRankBadgeText}>{idx + 1}</Text>
            </View>
            
            <View style={styles.leaderboardAvatar}>
              <Text style={styles.leaderboardAvatarText}>{p.display_name[0]}</Text>
            </View>

            <View style={styles.leaderboardInfo}>
              <Text style={styles.leaderboardPlayerName}>{p.display_name}</Text>
              <Text style={styles.leaderboardPlayerStatus}>
                Round in progress
              </Text>
            </View>

            <View style={styles.leaderboardScoreContainer}>
              <Text style={styles.leaderboardTotalStrokes}>{p.totalStrokes}</Text>
              <View style={[
                styles.leaderboardDiffBadge,
                p.diff < 0 && styles.scoreUnderBg,
                p.diff > 0 && styles.scoreOverBg,
                p.diff === 0 && styles.scoreEvenBg
              ]}>
                <Text style={[
                  styles.leaderboardDiffText,
                  p.diff < 0 && styles.scoreUnderText,
                  p.diff > 0 && styles.scoreOverText,
                  p.diff === 0 && styles.scoreEvenText
                ]}>
                  {p.diff === 0 ? 'E' : (p.diff > 0 ? `+${p.diff}` : p.diff)}
                </Text>
              </View>
            </View>
          </View>
        ))}
      </View>

      <Text style={[styles.leaderboardTitle, { marginTop: 12, marginBottom: 16 }]}>SCORECARD DETAILS</Text>
      {chunks.map((chunk, chunkIdx) => (
        <View key={chunkIdx} style={styles.summaryTable}>
          {/* Header Row: Hole Numbers */}
          <View style={styles.summaryRow}>
            <View style={[styles.summaryCell, styles.summaryCellSticky]}>
              <Text style={styles.summaryLabel}>HOLE</Text>
            </View>
            {chunk.map(h => (
              <View key={h.id} style={styles.summaryCell}>
                <Text style={styles.summaryHoleNum}>{h.hole_number}</Text>
              </View>
            ))}
          </View>
          {/* Par Row */}
          <View style={styles.summaryRow}>
            <View style={[styles.summaryCell, styles.summaryCellSticky]}>
              <Text style={styles.summaryLabel}>PAR</Text>
            </View>
            {chunk.map(h => (
              <View key={h.id} style={styles.summaryCell}>
                <Text style={styles.summaryPar}>{h.par}</Text>
              </View>
            ))}
          </View>
          {/* Player Rows */}
          {players.map(player => (
            <View key={player.id} style={styles.summaryRow}>
              <View style={[styles.summaryCell, styles.summaryCellSticky]}>
                <Text style={styles.summaryPlayerName} numberOfLines={1}>{player.display_name}</Text>
              </View>
              {chunk.map(h => {
                const strokes = scores[h.id]?.[player.id];
                const diff = strokes ? strokes - h.par : null;
                const scoreStyle = getScoreStyle(diff);
                return (
                  <View key={h.id} style={[styles.summaryCell, scoreStyle]}>
                    <Text style={[
                      styles.summaryValue,
                      scoreStyle.color ? { color: scoreStyle.color } : { color: '#FFF' }
                    ]}>
                      {strokes || '-'}
                    </Text>
                  </View>
                );
              })}
            </View>
          ))}
        </View>
      ))}
    </ScrollView>
  );
};

const MapComponent = ({ hole, isRecording, playerPos, throwStart }: { 
  hole: Hole | null, 
  isRecording: boolean,
  playerPos: { lat: number, lng: number } | null,
  throwStart: { lat: number, lng: number } | null
}) => {
  const [isSatellite, setIsSatellite] = useState(true);

  if (!hole) return null;

  const teeLat = Number(hole.tee_latitude);
  const teeLng = Number(hole.tee_longitude);
  const basketLat = Number(hole.basket_latitude);
  const basketLng = Number(hole.basket_longitude);

  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
        <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
        <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
        <style>
          body { margin: 0; padding: 0; background: #000; font-family: -apple-system, system-ui, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; }
          #map { height: 100vh; width: 100vw; }
          ${!isSatellite ? '.leaflet-tile-pane { filter: invert(100%) hue-rotate(180deg) brightness(95%) contrast(90%); }' : ''}
          .recording-badge {
            position: absolute;
            top: 12px;
            left: 50%;
            transform: translateX(-50%);
            background: rgba(255, 82, 82, 0.9);
            color: white;
            padding: 4px 12px;
            border-radius: 20px;
            font-size: 10px;
            font-weight: 800;
            z-index: 1000;
            display: ${isRecording ? 'flex' : 'none'};
            align-items: center;
            gap: 6px;
            box-shadow: 0 2px 8px rgba(0,0,0,0.4);
            letter-spacing: 0.5px;
          }
          .dot {
            width: 6px;
            height: 6px;
            background: white;
            border-radius: 3px;
            animation: pulse 1s infinite;
          }
          @keyframes pulse {
            0% { opacity: 1; transform: scale(1); }
            50% { opacity: 0.5; transform: scale(0.8); }
            100% { opacity: 1; transform: scale(1); }
          }
          .player-marker {
            width: 14px;
            height: 14px;
            background: #2196F3;
            border: 2px solid white;
            border-radius: 50%;
            box-shadow: 0 0 10px rgba(33, 150, 243, 0.5);
          }
        </style>
      </head>
      <body>
        <div class="recording-badge">
          <div class="dot"></div>
          RECORDING THROW...
        </div>
        <div id="map"></div>
        <script>
          const map = L.map('map', {
            zoomControl: false,
            attributionControl: false
          });
          
          const osm = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png');
          const satellite = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}');

          if (${isSatellite}) {
            satellite.addTo(map);
          } else {
            osm.addTo(map);
          }

          const tee = [${teeLat}, ${teeLng}];
          const basket = [${basketLat}, ${basketLng}];

          const teeIcon = L.divIcon({
            className: 'custom-div-icon',
            html: "<div style='background-color:#FFC107;width:20px;height:20px;border-radius:10px;border:2px solid white;display:flex;align-items:center;justify-content:center;color:black;font-weight:bold;font-size:10px;'>T</div>",
            iconSize: [20, 20],
            iconAnchor: [10, 10]
          });

          const basketIcon = L.divIcon({
            className: 'custom-div-icon',
            html: "<div style='background-color:#E64A19;width:20px;height:20px;border-radius:10px;border:2px solid white;display:flex;align-items:center;justify-content:center;color:white;font-weight:bold;font-size:10px;'>B</div>",
            iconSize: [20, 20],
            iconAnchor: [10, 10]
          });

          L.marker(tee, {icon: teeIcon}).addTo(map);
          L.marker(basket, {icon: basketIcon}).addTo(map);

          // Hole line
          const holeLine = L.polyline([tee, basket], {
            color: '${isSatellite ? '#FFF' : COLORS.primary}',
            weight: 2,
            dashArray: '5, 10',
            opacity: 0.5
          }).addTo(map);

          // Player Marker
          let playerMarker;
          if (${!!playerPos}) {
            const playerIcon = L.divIcon({
              className: 'player-marker'
            });
            playerMarker = L.marker([${playerPos?.lat || 0}, ${playerPos?.lng || 0}], {icon: playerIcon}).addTo(map);
          }

          // Throw Line
          if (${!!throwStart && !!playerPos}) {
            L.polyline([[${throwStart?.lat || 0}, ${throwStart?.lng || 0}], [${playerPos?.lat || 0}, ${playerPos?.lng || 0}]], {
              color: '#FF5252',
              weight: 4,
              dashArray: '1, 6'
            }).addTo(map);
          }

          const bounds = L.latLngBounds([tee, basket]);
          if (${!!playerPos}) bounds.extend([${playerPos?.lat || 0}, ${playerPos?.lng || 0}]);
          
          map.fitBounds(bounds, { padding: [40, 40] });
        </script>
      </body>
    </html>
  `;

  return (
    <View style={styles.mapContainer}>
      <WebView 
        key={isSatellite ? 'sat' : 'osm'}
        originWhitelist={['*']}
        source={{ html }}
        style={styles.map}
        scrollEnabled={false}
      />
      <TouchableOpacity 
        style={styles.mapToggle} 
        onPress={() => setIsSatellite(!isSatellite)}
      >
        <MaterialCommunityIcons 
          name={isSatellite ? "map-outline" : "earth"} 
          size={20} 
          color="#FFF" 
        />
      </TouchableOpacity>
    </View>
  );
};

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
  const [activeNavItemIndex, setActiveNavItemIndex] = useState(0);
  const [isThrowHistoryVisible, setIsThrowHistoryVisible] = useState(false);
  const [playerPos, setPlayerPos] = useState<{lat: number, lng: number} | null>(null);

  useEffect(() => {
    let locationWatcher: any;

    const startLocationTracking = async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') return;

      locationWatcher = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.High,
          distanceInterval: 1,
        },
        (location) => {
          setPlayerPos({
            lat: location.coords.latitude,
            lng: location.coords.longitude,
          });
        }
      );
    };

    startLocationTracking();

    return () => {
      if (locationWatcher) {
        locationWatcher.remove();
      }
    };
  }, []);

  const navItems: any[] = [];
  holes.forEach((hole, idx) => {
    navItems.push({ type: 'hole', data: hole, holeIndex: idx });
    if (hole.hole_number === 9 && holes.length > 9) {
      navItems.push({ type: 'summary', title: 'SUM', start: 0, end: 8 });
    }
  });
  if (holes.length > 0) {
    navItems.push({ type: 'summary', title: 'SUM', start: 0, end: holes.length - 1 });
  }

  const activeItem = navItems[activeNavItemIndex] || (holes.length > 0 ? { type: 'hole', data: holes[activeHoleIndex], holeIndex: activeHoleIndex } : null);
  const currentHole = activeItem?.type === 'hole' ? activeItem.data : null;

  useEffect(() => {
    if (!matchId) {
      navigation.navigate('SelectCourse');
      return;
    }
    fetchMatchData();
    fetchDiscs();

    const subscription = AppState.addEventListener('change', nextAppState => {
      if (appState.current.match(/active/) && nextAppState === 'background') {
        triggerSync();
      }
      appState.current = nextAppState;
    });

    return () => subscription.remove();
  }, []);

  const fetchThrowsForHole = async () => {
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
    if (holes.length > 0 && activeItem?.type === 'hole') {
      fetchThrowsForHole();
      setActiveHoleIndex(activeItem.holeIndex);
    }
  }, [activeNavItemIndex, holes, matchId]);

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
          profiles ( id, display_name )
        `)
        .eq('match_id', matchId);

      if (playerError) throw playerError;
      
      const mappedPlayers = (playerData || []).map((p: any) => ({
        id: p.profiles.id,
        display_name: p.profiles.display_name
      }));
      setPlayers(mappedPlayers);

      if (!holeData || holeData.length === 0) {
        Alert.alert('Error', 'No holes found for this layout.');
      }
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to load match data');
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

  const handleStartThrow = async () => {
    try {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'Location permission is required.');
        return;
      }
      const location = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
      setPendingThrow({
        startLat: location.coords.latitude,
        startLng: location.coords.longitude,
      });
      Alert.alert('Measurement Started', 'Walk to your disc and tap the check icon.');
    } catch (error: any) {
      Alert.alert('Error', error.message);
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
      Alert.alert('Error', error.message);
    }
  };

  const finalizeThrow = async (discId: string | null) => {
    if (!pendingThrow || !tempEndCoords || !currentHole) return;
    try {
      const distance = calculateDistance(
        pendingThrow.startLat, pendingThrow.startLng,
        tempEndCoords.lat, tempEndCoords.lng
      );
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data: profile } = await supabase.from('profiles').select('id').eq('auth_id', user.id).single();
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
      setPendingThrow(null);
      setTempEndCoords(null);
      setIsDiscModalVisible(false);
      incrementScore(currentHole.id, profile.id, currentHole.par);
      fetchThrowsForHole();
    } catch (error: any) {
      Alert.alert('Error', error.message);
    }
  };

  const handleFinishMatch = async () => {
    try {
      setLoading(true);
      await triggerSync();
      const { data: scoresData } = await supabase.from('scores').select('strokes, player_id').eq('match_id', matchId);
      const playerTotals = players.map(player => {
        const total = (scoresData || []).filter(s => s.player_id === player.id).reduce((acc, curr) => acc + (curr.strokes || 0), 0);
        return { player_id: player.id, total_score: total };
      });
      for (const total of playerTotals) {
        await supabase.from('match_players').update({ total_score: total.total_score }).eq('match_id', matchId).eq('player_id', total.player_id);
      }
      await supabase.from('matches').update({ status: 'completed' }).eq('id', matchId);
      navigation.navigate('MatchSummary');
    } catch (error: any) {
      Alert.alert('Error', error.message);
    } finally {
      setLoading(false);
    }
  };

  if (loading || (activeItem?.type === 'hole' && !currentHole)) {
    return (
      <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
        <ActivityIndicator size="large" color={COLORS.primary} style={{ marginTop: 100 }} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <View style={styles.header}>
        <View style={styles.headerInfo}>
          <Text style={styles.headerHoleText}>
            {activeItem?.type === 'hole' ? `Hole ${currentHole?.hole_number}` : activeItem?.title}
          </Text>
          {activeItem?.type === 'hole' && currentHole && (
            <View style={styles.headerMeta}>
              <Text style={styles.headerMetaText}>{currentHole.distance_m}m</Text>
              <View style={styles.headerMetaDivider} />
              <Text style={styles.headerMetaText}>PAR {currentHole.par}</Text>
            </View>
          )}
        </View>
      </View>

      {activeItem?.type === 'hole' && currentHole ? (
        <>
          <MapComponent 
            hole={currentHole} 
            isRecording={!!pendingThrow} 
            playerPos={playerPos}
            throwStart={pendingThrow ? { lat: pendingThrow.startLat, lng: pendingThrow.startLng } : null}
          />

          <View style={styles.scorecardContainer}>
            <View style={styles.scorecardHeader}>
              <Text style={styles.scorecardTitle}>Scorecard</Text>
              <View style={styles.scorecardIcons}>
                <TouchableOpacity 
                  style={[styles.iconBtn, pendingThrow && { backgroundColor: COLORS.primary }]} 
                  onPress={!pendingThrow ? handleStartThrow : handleEndThrow}
                >
                  <MaterialCommunityIcons 
                    name={!pendingThrow ? "ruler" : "stop-circle"} 
                    size={22} 
                    color={pendingThrow ? COLORS.onPrimary : COLORS.textSecondary} 
                  />
                </TouchableOpacity>
                <TouchableOpacity 
                  style={styles.iconBtn}
                  onPress={() => setIsThrowHistoryVisible(true)}
                >
                  <MaterialCommunityIcons name="history" size={22} color={COLORS.textSecondary} />
                </TouchableOpacity>
              </View>
            </View>

            <ScrollView contentContainerStyle={styles.scrollContent}>
              {players.map(player => {
                const strokes = scores[currentHole.id]?.[player.id];
                const scoreDiff = strokes ? strokes - currentHole.par : 0;
                const scoreDiffText = scoreDiff === 0 ? 'E' : (scoreDiff > 0 ? `+${scoreDiff}` : scoreDiff);

                return (
                  <View key={player.id} style={styles.playerRow}>
                    <View style={styles.playerMain}>
                      <View style={styles.playerAvatar}>
                        <Text style={styles.avatarTextSmall}>{player.display_name[0]}</Text>
                      </View>
                      <View style={styles.playerNameContainer}>
                        <Text style={styles.playerNameText}>{player.display_name}</Text>
                        <Text style={[
                          styles.playerScoreStatus,
                          scoreDiff < 0 && styles.scoreUnder,
                          scoreDiff > 0 && styles.scoreOver
                        ]}>
                          {scoreDiffText} ({strokes || 0})
                        </Text>
                      </View>
                    </View>

                    <View style={styles.scoreControls}>
                      <TouchableOpacity 
                        style={styles.controlBtn}
                        onPress={() => decrementScore(currentHole.id, player.id, currentHole.par)}
                      >
                        <Ionicons name="remove" size={24} color={COLORS.text} />
                      </TouchableOpacity>
                      
                      <View style={styles.currentScoreContainer}>
                        <Text style={styles.currentScoreText}>{strokes || '-'}</Text>
                      </View>

                      <TouchableOpacity 
                        style={[styles.controlBtn, styles.controlBtnAdd]}
                        onPress={() => incrementScore(currentHole.id, player.id, currentHole.par)}
                      >
                        <Ionicons name="add" size={24} color={COLORS.onPrimary} />
                      </TouchableOpacity>
                    </View>
                  </View>
                );
              })}
            </ScrollView>
          </View>
        </>
      ) : activeItem?.type === 'summary' ? (
        <View style={styles.summaryContent}>
          <SummaryView holes={holes.slice(activeItem.start, activeItem.end + 1)} players={players} scores={scores} />
        </View>
      ) : null}

      <View style={styles.holeNav}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.holeNavContent}>
          {navItems.map((item, i) => (
            <TouchableOpacity 
              key={i} 
              style={[styles.holeNavItem, i === activeNavItemIndex && styles.holeNavItemActive]}
              onPress={() => {
                triggerSync();
                setActiveNavItemIndex(i);
              }}
            >
              <Text style={[styles.holeNavText, i === activeNavItemIndex && styles.holeNavTextActive]}>
                {item.type === 'hole' ? item.data.hole_number : item.title}
              </Text>
              {i === activeNavItemIndex && <View style={styles.activeHoleIndicator} />}
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      <Modal visible={isThrowHistoryVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Throw History</Text>
              <TouchableOpacity onPress={() => setIsThrowHistoryVisible(false)}>
                <Ionicons name="close" size={24} color={COLORS.textSecondary} />
              </TouchableOpacity>
            </View>
            <Text style={styles.modalSubTitle}>Current Hole: {currentHole?.hole_number}</Text>
            
            <FlatList
              data={recordedThrows}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => (
                <View style={styles.historyItem}>
                  <View style={styles.historyRank}>
                    <Text style={styles.historyRankText}>{item.throw_number}</Text>
                  </View>
                  <View style={styles.historyInfo}>
                    <Text style={styles.historyDiscName}>
                      {item.discs?.name || 'Unknown Disc'}
                    </Text>
                    {item.discs?.color_rgba && (
                      <View style={[styles.historyDiscColor, { backgroundColor: item.discs.color_rgba }]} />
                    )}
                  </View>
                  <Text style={styles.historyDistance}>{Math.round(item.distance_m)}m</Text>
                </View>
              )}
              ListEmptyComponent={
                <View style={styles.emptyHistory}>
                  <MaterialCommunityIcons name="history" size={48} color={COLORS.borderDark} />
                  <Text style={styles.emptyHistoryText}>No throws recorded for this hole.</Text>
                </View>
              }
              contentContainerStyle={{ paddingBottom: 20 }}
            />
          </View>
        </View>
      </Modal>

      <Modal visible={isDiscModalVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Select Disc</Text>
            <FlatList
              data={discs}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => (
                <TouchableOpacity style={styles.discItem} onPress={() => finalizeThrow(item.id)}>
                  <View style={[styles.discColor, { backgroundColor: item.color_rgba || COLORS.primary }]} />
                  <Text style={styles.discName}>{item.name}</Text>
                </TouchableOpacity>
              )}
              ListHeaderComponent={
                <>
                  <TouchableOpacity 
                    style={[styles.discItem, { borderBottomColor: COLORS.primary, borderBottomWidth: 1, marginBottom: 8 }]} 
                    onPress={() => {
                      setIsDiscModalVisible(false);
                      navigation.navigate('Profile', { screen: 'AddEditDisc' });
                    }}
                  >
                    <View style={[styles.discColor, { backgroundColor: COLORS.primary, justifyContent: 'center', alignItems: 'center' }]}>
                      <Ionicons name="add" size={14} color={COLORS.onPrimary} />
                    </View>
                    <Text style={[styles.discName, { color: COLORS.primary, fontWeight: '700' }]}>Add New Disc</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.discItem} onPress={() => finalizeThrow(null)}>
                    <View style={[styles.discColor, { backgroundColor: '#555' }]} />
                    <Text style={styles.discName}>Unknown Disc</Text>
                  </TouchableOpacity>
                </>
              }
            />
            <TouchableOpacity style={styles.modalClose} onPress={() => setIsDiscModalVisible(false)}>
              <Text style={styles.modalCloseText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <View style={styles.finishBar}>
        <TouchableOpacity style={styles.finishMatchBtn} onPress={handleFinishMatch}>
          <Text style={styles.finishMatchText}>FINISH ROUND</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  header: { paddingVertical: 12, alignItems: 'center' },
  headerHoleText: { color: '#90CAF9', fontSize: 18, fontWeight: '500', marginBottom: 4 },
  headerMeta: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  headerMetaText: { color: '#90CAF9', fontSize: 16, opacity: 0.8 },
  headerMetaDivider: { width: 1, height: 14, backgroundColor: 'rgba(144, 202, 249, 0.3)' },
  mapContainer: { height: 200, backgroundColor: '#111', overflow: 'hidden' },
  map: { flex: 1 },
  scorecardContainer: { flex: 1, backgroundColor: '#151517', borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingTop: 16, marginTop: -20 },
  scorecardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingBottom: 16 },
  scorecardTitle: { color: '#FFF', fontSize: 18, fontWeight: '600' },
  scorecardIcons: { flexDirection: 'row', gap: 8 },
  iconBtn: { width: 40, height: 40, borderRadius: 10, backgroundColor: 'rgba(255,255,255,0.06)', justifyContent: 'center', alignItems: 'center' },
  scrollContent: { paddingHorizontal: 20, paddingBottom: 120 },
  playerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.04)' },
  playerMain: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  playerAvatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(144, 202, 249, 0.15)', justifyContent: 'center', alignItems: 'center' },
  playerNameContainer: { justifyContent: 'center' },
  playerNameText: { color: '#FFF', fontSize: 15, fontWeight: '500' },
  playerScoreStatus: { fontSize: 12, color: 'rgba(255,255,255,0.5)', marginTop: 2 },
  scoreControls: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  controlBtn: { width: 34, height: 36, borderRadius: 10, backgroundColor: 'rgba(255,255,255,0.08)', justifyContent: 'center', alignItems: 'center' },
  controlBtnAdd: { backgroundColor: COLORS.primary },
  currentScoreContainer: { width: 18, alignItems: 'center' },
  currentScoreText: { color: '#FFF', fontSize: 17, fontWeight: '600' },
  scoreUnder: { color: COLORS.success },
  scoreOver: { color: '#FF5252' },
  holeNav: { backgroundColor: '#151517', paddingVertical: 10, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.04)' },
  holeNavContent: { paddingHorizontal: 20, alignItems: 'center', gap: 20 },
  holeNavItem: { paddingHorizontal: 4, alignItems: 'center', position: 'relative' },
  holeNavText: { color: 'rgba(255,255,255,0.4)', fontSize: 15, fontWeight: '500' },
  holeNavTextActive: { color: '#90CAF9', fontWeight: '700' },
  activeHoleIndicator: { position: 'absolute', bottom: -6, width: '100%', height: 2, backgroundColor: '#90CAF9', borderRadius: 1 },
  finishBar: { backgroundColor: '#151517', paddingHorizontal: 20, paddingBottom: 10, paddingTop: 10, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.04)' },
  finishMatchBtn: { paddingVertical: 12, alignItems: 'center', backgroundColor: 'rgba(144, 202, 249, 0.1)', borderRadius: 12 },
  finishMatchText: { color: COLORS.primary, fontSize: 13, fontWeight: '700', letterSpacing: 0.5 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.85)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: '#1C1C1E', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, maxHeight: '80%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  modalTitle: { color: '#FFF', fontSize: 19, fontWeight: '600' },
  modalSubTitle: { color: COLORS.textSecondary, fontSize: 13, marginBottom: 20 },
  historyItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.05)',
  },
  historyRank: {
    width: 24,
    height: 24,
    borderRadius: 6,
    backgroundColor: COLORS.borderDark,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  historyRankText: {
    color: COLORS.textSecondary,
    fontSize: 12,
    fontWeight: '800',
  },
  historyInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  historyDiscName: {
    color: '#FFF',
    fontSize: 15,
    fontWeight: '500',
  },
  historyDiscColor: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  historyDistance: {
    color: COLORS.primary,
    fontSize: 17,
    fontWeight: '800',
  },
  emptyHistory: {
    paddingVertical: 40,
    alignItems: 'center',
    gap: 12,
  },
  emptyHistoryText: {
    color: COLORS.textSecondary,
    fontSize: 14,
    textAlign: 'center',
  },
  discItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.05)' },
  discColor: { width: 18, height: 18, borderRadius: 9, marginRight: 12 },
  discName: { color: '#FFF', fontSize: 16 },
  modalClose: { marginTop: 16, alignItems: 'center', paddingVertical: 12 },
  modalCloseText: { color: 'rgba(255,255,255,0.5)', fontSize: 15 },
  avatarTextSmall: { color: '#90CAF9', fontSize: 13, fontWeight: '700' },
  // Summary Styles
  summaryContent: { flex: 1, backgroundColor: COLORS.background },
  summaryContainer: { flex: 1, padding: 16 },
  leaderboardSection: {
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: COLORS.borderDark,
  },
  leaderboardTitle: {
    color: COLORS.textSecondary,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.5,
    marginBottom: 20,
    paddingHorizontal: 4,
  },
  leaderboardPlayerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.04)',
  },
  leaderboardRankBadge: {
    width: 20,
    alignItems: 'center',
    marginRight: 10,
  },
  leaderboardRankBadgeText: {
    color: COLORS.textSecondary,
    fontSize: 12,
    fontWeight: '800',
    opacity: 0.5,
  },
  leaderboardAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(144, 202, 249, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
    borderWidth: 1,
    borderColor: 'rgba(144, 202, 249, 0.2)',
  },
  leaderboardAvatarText: {
    color: '#90CAF9',
    fontSize: 16,
    fontWeight: '700',
  },
  leaderboardInfo: {
    flex: 1,
  },
  leaderboardPlayerName: {
    color: COLORS.text,
    fontSize: 16,
    fontWeight: '700',
  },
  leaderboardPlayerStatus: {
    color: COLORS.textSecondary,
    fontSize: 11,
    marginTop: 2,
    opacity: 0.6,
  },
  leaderboardScoreContainer: {
    alignItems: 'flex-end',
    gap: 4,
  },
  leaderboardTotalStrokes: {
    color: COLORS.text,
    fontSize: 18,
    fontWeight: '800',
    fontFamily: 'JetBrains Mono',
  },
  leaderboardDiffBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    minWidth: 32,
    alignItems: 'center',
  },
  leaderboardDiffText: {
    fontSize: 10,
    fontWeight: '900',
  },
  scoreUnderBg: { backgroundColor: 'rgba(57, 255, 20, 0.15)' },
  scoreUnderText: { color: COLORS.success },
  scoreOverBg: { backgroundColor: 'rgba(255, 82, 82, 0.15)' },
  scoreOverText: { color: '#FF5252' },
  scoreEvenBg: { backgroundColor: 'rgba(255, 255, 255, 0.08)' },
  scoreEvenText: { color: COLORS.textSecondary },
  summaryTable: { backgroundColor: 'transparent', marginBottom: 24 },
  summaryRow: { flexDirection: 'row', marginBottom: 2 },
  summaryCell: { flex: 1, minWidth: 36, height: 36, alignItems: 'center', justifyContent: 'center', borderRadius: 4, marginHorizontal: 1 },
  summaryCellSticky: { minWidth: 100, flex: 0, alignItems: 'flex-start', paddingHorizontal: 4, backgroundColor: 'transparent', marginRight: 8 },
  summaryLabel: { color: 'rgba(255,255,255,0.3)', fontSize: 10, fontWeight: '800', letterSpacing: 1 },
  summaryValue: { fontSize: 16, fontWeight: '800', fontFamily: 'JetBrains Mono' },
  summaryHoleNum: { color: 'rgba(255,255,255,0.6)', fontSize: 14, fontWeight: '700' },
  summaryPar: { color: 'rgba(255,255,255,0.4)', fontSize: 14, fontWeight: '400' },
  summaryPlayerName: { color: '#FFF', fontSize: 14, fontWeight: '700' },
  // Map Toggle
  mapToggle: { position: 'absolute', bottom: 12, right: 12, width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)' },
});
