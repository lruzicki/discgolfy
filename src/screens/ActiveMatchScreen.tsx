import React, { useState, useEffect, useMemo, useRef } from 'react';
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
import { useFocusEffect, useNavigation, useRoute } from '@react-navigation/native';
import { WebView } from 'react-native-webview';
import * as Location from 'expo-location';
import { calculateDistance } from '../lib/utils';
import { ThrowEventType } from '../constants/throwEvents';
import { ThrowType } from '../constants/throwTypes';

import { Avatar } from '../components/Avatar';
import { ScorecardView } from '../components/ScorecardView';

interface Player {
  id: string;
  display_name: string;
  avatar_url?: string | null;
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

interface MeasuredThrowResult {
  distance: number;
  start: { lat: number; lng: number };
  end: { lat: number; lng: number };
}

type CompletedThrowLine = Pick<MeasuredThrowResult, 'start' | 'end'>;

interface ThrowRecord {
  id: string;
  throw_number: number;
  distance_m: number;
  disc_id: string | null;
  throw_type?: ThrowType | null;
  discs?: {
    name: string;
    color_rgba: string;
  } | null;
}

const MATCH_MAP_HTML = `
  <!DOCTYPE html>
  <html>
    <head>
      <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
      <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
      <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
      <style>
        body { margin: 0; padding: 0; background: #000; font-family: -apple-system, system-ui, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; }
        #map { height: 100vh; width: 100vw; }
        body:not(.satellite) .leaflet-tile-pane { filter: invert(100%) hue-rotate(180deg) brightness(95%) contrast(90%); }
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
          display: none;
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
    <body class="satellite">
      <div class="recording-badge">
        <div class="dot"></div>
        RECORDING THROW...
      </div>
      <div id="map"></div>
      <script>
        window.setMapState = function(nextState) {
          window.pendingMapState = nextState;
          if (window.applyMapState) {
            window.applyMapState(nextState);
          }
        };

        const map = L.map('map', {
          zoomControl: false,
          attributionControl: false
        });

        const osm = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png');
        const satellite = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}');

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

        const playerIcon = L.divIcon({ className: 'player-marker' });

        let teeMarker;
        let basketMarker;
        let holeLine;
        let playerMarker;
        let throwLine;
        let currentLayer;

        function hasPoint(point) {
          return point && Number.isFinite(point.lat) && Number.isFinite(point.lng);
        }

        function setLayer(layer) {
          if (currentLayer === layer) return;
          if (currentLayer) map.removeLayer(currentLayer);
          currentLayer = layer;
          currentLayer.addTo(map);
        }

        function setMarker(marker, point, icon) {
          const latLng = [point.lat, point.lng];
          if (!marker) return L.marker(latLng, { icon }).addTo(map);
          marker.setLatLng(latLng);
          return marker;
        }

        function removeLayer(layer) {
          if (layer) map.removeLayer(layer);
          return null;
        }

        window.applyMapState = function(state) {
          if (!state || !hasPoint(state.tee) || !hasPoint(state.basket)) return;

          document.body.classList.toggle('satellite', !!state.isSatellite);
          document.querySelector('.recording-badge').style.display = state.isRecording ? 'flex' : 'none';
          setLayer(state.isSatellite ? satellite : osm);

          teeMarker = setMarker(teeMarker, state.tee, teeIcon);
          basketMarker = setMarker(basketMarker, state.basket, basketIcon);

          const linePoints = [[state.tee.lat, state.tee.lng], [state.basket.lat, state.basket.lng]];
          if (!holeLine) {
            holeLine = L.polyline(linePoints, {
              color: state.isSatellite ? '#FFF' : state.primaryColor,
              weight: 2,
              dashArray: '5, 10',
              opacity: 0.5
            }).addTo(map);
          } else {
            holeLine.setLatLngs(linePoints);
            holeLine.setStyle({ color: state.isSatellite ? '#FFF' : state.primaryColor });
          }

          if (hasPoint(state.playerPos)) {
            playerMarker = setMarker(playerMarker, state.playerPos, playerIcon);
          } else {
            playerMarker = removeLayer(playerMarker);
          }

          const throwEnd = hasPoint(state.throwEnd) ? state.throwEnd : state.playerPos;
          if (hasPoint(state.throwStart) && hasPoint(throwEnd)) {
            const throwPoints = [[state.throwStart.lat, state.throwStart.lng], [throwEnd.lat, throwEnd.lng]];
            if (!throwLine) {
              throwLine = L.polyline(throwPoints, {
                color: '#FF5252',
                weight: 4,
                dashArray: '1, 6'
              }).addTo(map);
            } else {
              throwLine.setLatLngs(throwPoints);
            }
          } else {
            throwLine = removeLayer(throwLine);
          }

          const bounds = L.latLngBounds(linePoints);
          if (hasPoint(state.playerPos)) bounds.extend([state.playerPos.lat, state.playerPos.lng]);
          if (hasPoint(state.throwStart)) bounds.extend([state.throwStart.lat, state.throwStart.lng]);
          if (hasPoint(state.throwEnd)) bounds.extend([state.throwEnd.lat, state.throwEnd.lng]);
          map.fitBounds(bounds, { padding: [40, 40] });
        };

        if (window.pendingMapState) {
          window.applyMapState(window.pendingMapState);
        }
      </script>
    </body>
  </html>
`;

const MapComponent = ({ hole, isRecording, playerPos, throwStart, throwEnd }: { 
  hole: Hole | null, 
  isRecording: boolean,
  playerPos: { lat: number, lng: number } | null,
  throwStart: { lat: number, lng: number } | null,
  throwEnd?: { lat: number, lng: number } | null
}) => {
  const [isSatellite, setIsSatellite] = useState(true);
  const mapRef = useRef<any>(null);
  const webViewSource = useMemo(() => ({ html: MATCH_MAP_HTML }), []);

  const teeLat = hole ? Number(hole.tee_latitude) : 0;
  const teeLng = hole ? Number(hole.tee_longitude) : 0;
  const basketLat = hole ? Number(hole.basket_latitude) : 0;
  const basketLng = hole ? Number(hole.basket_longitude) : 0;

  const mapState = useMemo(() => ({
    isSatellite,
    isRecording,
    primaryColor: COLORS.primary,
    tee: { lat: teeLat, lng: teeLng },
    basket: { lat: basketLat, lng: basketLng },
    playerPos,
    throwStart,
    throwEnd,
  }), [basketLat, basketLng, isRecording, isSatellite, playerPos, teeLat, teeLng, throwEnd, throwStart]);

  const updateMapScript = useMemo(() => {
    if (!hole) return '';
    return `window.setMapState(${JSON.stringify(mapState)}); true;`;
  }, [hole, mapState]);

  useEffect(() => {
    if (!updateMapScript) return;
    mapRef.current?.injectJavaScript(updateMapScript);
  }, [updateMapScript]);

  if (!hole) return null;

  return (
    <View style={styles.mapContainer}>
      <WebView 
        ref={mapRef}
        testID="match-map-webview"
        originWhitelist={['*']}
        source={webViewSource}
        style={styles.map}
        scrollEnabled={false}
        onLoadEnd={() => mapRef.current?.injectJavaScript(updateMapScript)}
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
  const route = useRoute<any>();
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
    hydrateScores,
    applyRemoteScore,
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
  const [selectedThrowType, setSelectedThrowType] = useState<ThrowType | null>(null);
  const [playerPos, setPlayerPos] = useState<{lat: number, lng: number} | null>(null);
  const [measuredThrowResult, setMeasuredThrowResult] = useState<MeasuredThrowResult | null>(null);
  const [completedThrowLine, setCompletedThrowLine] = useState<CompletedThrowLine | null>(null);
  const [isCreator, setIsCreator] = useState(true);
  const [isEventActionsVisible, setIsEventActionsVisible] = useState(false);
  const [holeEvents, setHoleEvents] = useState<Record<string, number>>({});
  const [unplayableScoreSnapshots, setUnplayableScoreSnapshots] = useState<Record<string, Record<string, number | null | undefined>>>({});
  const [unplayableHoleIds, setUnplayableHoleIds] = useState<string[]>([]);
  const isSchemaCacheMissing = (error: any, key: string) =>
    Boolean(error?.message && error.message.toLowerCase().includes('schema cache') && error.message.includes(key));

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
    if (!matchId || !layoutId) {
      setLoading(false);
      navigation.navigate('SelectCourse');
      return;
    }
    fetchMatchData();
    fetchDiscs();

    const subscription = AppState.addEventListener('change', nextAppState => {
      if (isCreator && appState.current.match(/active/) && nextAppState === 'background') {
        triggerSync();
      }
      appState.current = nextAppState;
    });

    return () => subscription.remove();
  }, [matchId, layoutId, isCreator]);

  useEffect(() => {
    if (!matchId) return;

    const channel = supabase
      .channel(`match-scores:${matchId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'scores',
          filter: `match_id=eq.${matchId}`,
        },
        (payload: any) => {
          if (!payload?.new?.hole_id || !payload?.new?.player_id) return;
          applyRemoteScore({
            hole_id: payload.new.hole_id,
            player_id: payload.new.player_id,
            strokes: payload.new.strokes ?? null,
          });
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [applyRemoteScore, matchId]);

  useFocusEffect(
    React.useCallback(() => {
      if (!route.params?.returnToDiscPicker) return;

      if (route.params.pendingThrow) {
        setPendingThrow(route.params.pendingThrow);
      }
      if (route.params.tempEndCoords) {
        setTempEndCoords(route.params.tempEndCoords);
      }

      setIsDiscModalVisible(true);
      fetchDiscs();
      navigation.setParams({
        returnToDiscPicker: undefined,
        pendingThrow: undefined,
        tempEndCoords: undefined,
      });
    }, [route.params, navigation])
  );

  const fetchThrowsForHole = async () => {
    if (!isCreator || !currentHole || !matchId) return;
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || !user.id) return;
      
      const { data: profile } = await supabase
        .from('profiles')
        .select('id')
        .eq('auth_id', user.id)
        .single();
      if (!profile || !profile.id) return;

      let data: any[] | null = null;
      const withThrowType = await supabase
        .from('throws')
        .select(`
          id,
          throw_number,
          distance_m,
          throw_type,
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

      if (withThrowType.error && isSchemaCacheMissing(withThrowType.error, 'throw_type')) {
        const legacyResult = await supabase
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
        if (legacyResult.error) throw legacyResult.error;
        data = legacyResult.data || [];
      } else {
        if (withThrowType.error) throw withThrowType.error;
        data = withThrowType.data || [];
      }
      
      const formattedData: ThrowRecord[] = (data || []).map((t: any) => ({
        id: t.id,
        throw_number: t.throw_number,
        distance_m: t.distance_m,
        throw_type: t.throw_type,
        disc_id: t.disc_id,
        discs: t.discs as { name: string; color_rgba: string } | null,
      }));
      
    setRecordedThrows(formattedData);
    fetchEventsForHole();
  } catch (error) {
    console.error('Error fetching throws:', error);
  }
};

const fetchEventsForHole = async () => {
  if (!isCreator || !currentHole || !matchId) return;
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user || !user.id) return;
    
    const { data: profile } = await supabase
      .from('profiles')
      .select('id')
      .eq('auth_id', user.id)
      .single();
    if (!profile || !profile.id) return;

    let eventsQuery: any = supabase.from('throw_events');
    if (typeof eventsQuery.select !== 'function') return;
    eventsQuery = eventsQuery.select('event_type');
    if (typeof eventsQuery.eq !== 'function') return;
    eventsQuery = eventsQuery.eq('match_id', matchId);
    if (typeof eventsQuery.eq !== 'function') return;
    eventsQuery = eventsQuery.eq('hole_id', currentHole.id);
    if (typeof eventsQuery.eq !== 'function') return;
    eventsQuery = eventsQuery.eq('player_id', profile.id);
    if (typeof (eventsQuery as any).then !== 'function') return;

    const { data, error } = await (eventsQuery as any);

    if (error) throw error;

    const counts: Record<string, number> = {};
    (data || []).forEach((e: any) => {
      counts[e.event_type] = (counts[e.event_type] || 0) + 1;
    });
    setHoleEvents(counts);
  } catch (error) {
    console.error('Error fetching events:', error);
  }
};

  useEffect(() => {
    if (holes.length > 0 && activeItem?.type === 'hole') {
      fetchThrowsForHole();
      setActiveHoleIndex(activeItem.holeIndex);
    }
  }, [activeNavItemIndex, holes, matchId]);

  const fetchMatchData = async () => {
    if (!layoutId || !matchId) {
      console.warn('fetchMatchData called with empty layoutId or matchId');
      return;
    }
    try {
      setLoading(true);
      let currentProfileId: string | null = null;
      const { data: { user } } = await supabase.auth.getUser();
      if (user?.id) {
        const profileQuery = supabase
          .from('profiles')
          .select('id')
          .eq('auth_id', user.id);
        if (typeof (profileQuery as any).single === 'function') {
          const profileResult = await (profileQuery as any).single();
          currentProfileId = profileResult.data?.id ?? null;
        }
      }

      let matchOwnerId: string | null = null;
      let matchStatus: string | null = null;
      if (currentProfileId) {
        const matchQuery = supabase
          .from('matches')
          .select('created_by, status')
          .eq('id', matchId);
        if (typeof (matchQuery as any).single === 'function') {
          const { data: matchData, error: matchError } = await (matchQuery as any).single();
          if (matchError) throw matchError;
          matchOwnerId = matchData?.created_by ?? null;
          matchStatus = matchData?.status ?? null;
          setIsCreator(matchOwnerId === currentProfileId);
        }
      } else {
        setIsCreator(true);
      }

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
          profiles ( id, display_name, avatar_url )
        `)
        .eq('match_id', matchId);

      if (playerError) throw playerError;
      
      const mappedPlayers = (playerData || []).map((p: any) => ({
        id: p.profiles.id,
        display_name: p.profiles.display_name,
        avatar_url: p.profiles.avatar_url
      }));
      setPlayers(mappedPlayers);

      const currentPlayerCanWatch = !currentProfileId
        || matchOwnerId === currentProfileId
        || mappedPlayers.some((player) => player.id === currentProfileId);

      if (matchStatus === 'active' && !currentPlayerCanWatch) {
        Alert.alert('Access denied', 'Only Match participants can watch this active Match.');
        navigation.navigate('Play');
        return;
      }

      const { data: scoreData, error: scoreError } = await supabase
        .from('scores')
        .select('hole_id, player_id, strokes')
        .eq('match_id', matchId);

      if (scoreError) throw scoreError;
      hydrateScores(scoreData || []);

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
      if (!user || !user.id) return;
      const profileQuery = supabase
        .from('profiles')
        .select('id')
        .eq('auth_id', user.id);
      if (typeof (profileQuery as any).single !== 'function') return;
      const { data: profile } = await (profileQuery as any).single();
      if (!profile || !profile.id) return;

      let discsQuery: any = supabase.from('discs');
      if (typeof discsQuery.select !== 'function') return;
      discsQuery = discsQuery.select('id, name, color_rgba');
      if (typeof discsQuery.eq !== 'function') return;
      discsQuery = discsQuery.eq('player_id', profile.id);
      if (typeof discsQuery.is !== 'function') return;
      discsQuery = discsQuery.is('archived_at', null);
      if (typeof (discsQuery as any).then !== 'function') return;

      const { data } = await (discsQuery as any);
      setDiscs(data || []);
    } catch (error) {
      console.error('Error fetching discs:', error);
    }
  };

  const handleStartThrow = async () => {
    if (!isCreator) return;
    try {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'Location permission is required.');
        return;
      }
      const location = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
      setMeasuredThrowResult(null);
      setCompletedThrowLine(null);
      setPendingThrow({
        startLat: location.coords.latitude,
        startLng: location.coords.longitude,
      });
    } catch (error: any) {
      Alert.alert('Error', error.message);
    }
  };

  const handleEndThrow = async () => {
    if (!isCreator) return;
    if (!pendingThrow) return;
    try {
      const location = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
      setTempEndCoords({
        lat: location.coords.latitude,
        lng: location.coords.longitude,
      });
      setSelectedThrowType(null);
      setIsDiscModalVisible(true);
    } catch (error: any) {
      Alert.alert('Error', error.message);
    }
  };

  const recordMeasuredThrow = async (discId: string | null) => {
    if (!isCreator) return;
    if (!pendingThrow || !tempEndCoords || !currentHole) return;
    if (!selectedThrowType) {
      Alert.alert('Throw Type Required', 'Choose Shot or Putt before saving.');
      return;
    }
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
          throw_type: selectedThrowType,
        });

      if (error) {
        if (!isSchemaCacheMissing(error, 'throw_type')) throw error;
        const legacyInsert = await supabase
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
        if (legacyInsert.error) throw legacyInsert.error;
      }
      const completedLine = {
        start: { lat: pendingThrow.startLat, lng: pendingThrow.startLng },
        end: { lat: tempEndCoords.lat, lng: tempEndCoords.lng },
      };
      setCompletedThrowLine(completedLine);
      setMeasuredThrowResult({ distance, ...completedLine });
      setPendingThrow(null);
      setTempEndCoords(null);
      setSelectedThrowType(null);
      setIsDiscModalVisible(false);
      fetchThrowsForHole();
    } catch (error: any) {
      Alert.alert('Error', error.message);
    }
  };

  const recordThrowEvent = async (eventType: ThrowEventType) => {
    if (!isCreator) return;
    if (!currentHole || !matchId) return;
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data: profile } = await supabase.from('profiles').select('id').eq('auth_id', user.id).single();
      if (!profile) return;

      const currentCount = holeEvents[eventType] || 0;

      if (currentCount > 0) {
        // Toggle off: Delete ONE event of this type
        const { data: existingEvents } = await supabase
          .from('throw_events')
          .select('id')
          .eq('match_id', matchId)
          .eq('player_id', profile.id)
          .eq('hole_id', currentHole.id)
          .eq('event_type', eventType)
          .limit(1);

        if (existingEvents && existingEvents.length > 0) {
          const { error: deleteError } = await supabase
            .from('throw_events')
            .delete()
            .eq('id', existingEvents[0].id);
          
          if (deleteError) throw deleteError;
          
          setHoleEvents(prev => ({
            ...prev,
            [eventType]: Math.max(0, (prev[eventType] || 1) - 1)
          }));
        }
      } else {
        // Toggle on: Add event
        const { error } = await supabase
          .from('throw_events')
          .insert({
            match_id: matchId,
            player_id: profile.id,
            hole_id: currentHole.id,
            event_type: eventType,
          });

        if (error) {
          if (!isSchemaCacheMissing(error, 'throw_event')) throw error;
        }

        setHoleEvents(prev => ({
          ...prev,
          [eventType]: (prev[eventType] || 0) + 1
        }));
      }
    } catch (error: any) {
      Alert.alert('Error', error.message);
    }
  };

  const hasUnplayedPlayableHoles = () => {
    if (players.length === 0 || holes.length === 0) return false;

    return holes.some((hole) => {
      const holeScores = scores[hole.id] || {};
      const isUnplayableToday = unplayableHoleIds.includes(hole.id);

      if (isUnplayableToday) return false;

      return players.some((player) => holeScores[player.id] === null || holeScores[player.id] === undefined);
    });
  };

  const finishMatch = async () => {
    if (!isCreator) return;
    try {
      setLoading(true);
      await triggerSync();
      const { data: scoresData, error: scoresError } = await supabase
        .from('scores')
        .select('strokes, player_id')
        .eq('match_id', matchId);
      if (scoresError) throw scoresError;

      const playerTotals = players.map(player => {
        const total = (scoresData || []).filter(s => s.player_id === player.id).reduce((acc, curr) => acc + (curr.strokes || 0), 0);
        return { player_id: player.id, total_score: total };
      });
      for (const total of playerTotals) {
        const { error: playerUpdateError } = await supabase
          .from('match_players')
          .update({ total_score: total.total_score })
          .eq('match_id', matchId)
          .eq('player_id', total.player_id);
        if (playerUpdateError) throw playerUpdateError;
      }
      const { error: matchUpdateError } = await supabase
        .from('matches')
        .update({ status: 'completed' })
        .eq('id', matchId);
      if (matchUpdateError) throw matchUpdateError;

      navigation.navigate('MatchSummary');
    } catch (error: any) {
      Alert.alert('Error', error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleFinishMatch = () => {
    if (!isCreator) return;
    if (hasUnplayedPlayableHoles()) {
      Alert.alert(
        'Finish round?',
        'Warning: not all holes have scores. Finish this round anyway?',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Finish Round', style: 'destructive', onPress: finishMatch },
        ],
      );
      return;
    }

    finishMatch();
  };

  const markCurrentHoleUnplayable = async () => {
    if (!isCreator) return;
    if (!currentHole || players.length === 0) return;
    const holeScores = scores[currentHole.id] || {};
    const isCurrentlyUnplayable = unplayableHoleIds.includes(currentHole.id);
    if (isCurrentlyUnplayable) {
      const snapshot = unplayableScoreSnapshots[currentHole.id] || {};
      players.forEach((player) => {
        const previousValue = snapshot[player.id];
        setScore(currentHole.id, player.id, previousValue === undefined ? null : previousValue);
      });
      setUnplayableHoleIds((prev) => prev.filter((holeId) => holeId !== currentHole.id));
      setUnplayableScoreSnapshots((prev) => {
        const next = { ...prev };
        delete next[currentHole.id];
        return next;
      });
    } else {
      const snapshot: Record<string, number | null | undefined> = {};
      players.forEach((player) => {
        snapshot[player.id] = holeScores[player.id];
        setScore(currentHole.id, player.id, null);
      });
      setUnplayableHoleIds((prev) => (prev.includes(currentHole.id) ? prev : [...prev, currentHole.id]));
      setUnplayableScoreSnapshots((prev) => ({ ...prev, [currentHole.id]: snapshot }));
    }
    await triggerSync();
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
            throwStart={pendingThrow ? { lat: pendingThrow.startLat, lng: pendingThrow.startLng } : completedThrowLine?.start || null}
            throwEnd={pendingThrow ? null : completedThrowLine?.end || null}
          />

          <View style={styles.scorecardContainer}>
            <View style={styles.scorecardHeader}>
              <Text style={styles.scorecardTitle}>Scorecard</Text>
              {isCreator ? (
                <View style={styles.scorecardIcons}>
                  <TouchableOpacity
                    style={styles.iconBtn}
                    accessibilityLabel="Mark hole unplayable today"
                    onPress={markCurrentHoleUnplayable}
                  >
                    <MaterialCommunityIcons name="close-octagon-outline" size={22} color={COLORS.textSecondary} />
                  </TouchableOpacity>
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
                  <TouchableOpacity
                    style={[styles.iconBtn, isEventActionsVisible && { backgroundColor: COLORS.primary }]}
                    accessibilityLabel="Open throw events"
                    onPress={() => setIsEventActionsVisible((current) => !current)}
                  >
                    <MaterialCommunityIcons
                      name="alert-circle-outline"
                      size={22}
                      color={isEventActionsVisible ? COLORS.onPrimary : COLORS.textSecondary}
                    />
                  </TouchableOpacity>
                </View>
              ) : (
                <Text style={styles.watchModeText}>Watching live</Text>
              )}
            </View>

            {isCreator && isEventActionsVisible && (
              <View style={styles.throwEventActions}>
                <TouchableOpacity
                  style={[styles.throwEventAction, (holeEvents['tree'] || 0) > 0 && { backgroundColor: '#2E7D32' }]}
                  accessibilityLabel="Record tree event"
                  onPress={() => recordThrowEvent('tree')}
                >
                  <MaterialCommunityIcons 
                    name="tree" 
                    size={18} 
                    color={(holeEvents['tree'] || 0) > 0 ? '#FFF' : '#2E7D32'} 
                  />
                  {(holeEvents['tree'] || 0) > 1 && (
                    <View style={styles.eventBadge}><Text style={styles.eventBadgeText}>{holeEvents['tree']}</Text></View>
                  )}
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.throwEventAction, (holeEvents['water'] || 0) > 0 && { backgroundColor: '#1E88E5' }]}
                  accessibilityLabel="Record water event"
                  onPress={() => recordThrowEvent('water')}
                >
                  <MaterialCommunityIcons 
                    name="waves" 
                    size={18} 
                    color={(holeEvents['water'] || 0) > 0 ? '#FFF' : '#1E88E5'} 
                  />
                  {(holeEvents['water'] || 0) > 1 && (
                    <View style={styles.eventBadge}><Text style={styles.eventBadgeText}>{holeEvents['water']}</Text></View>
                  )}
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.throwEventAction, (holeEvents['ob'] || 0) > 0 && { backgroundColor: '#FF7043' }]}
                  accessibilityLabel="Record ob event"
                  onPress={() => recordThrowEvent('ob')}
                >
                  <MaterialCommunityIcons 
                    name="alert-octagon-outline" 
                    size={18} 
                    color={(holeEvents['ob'] || 0) > 0 ? '#FFF' : '#FF7043'} 
                  />
                  {(holeEvents['ob'] || 0) > 1 && (
                    <View style={styles.eventBadge}><Text style={styles.eventBadgeText}>{holeEvents['ob']}</Text></View>
                  )}
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.throwEventAction, (holeEvents['hit_person'] || 0) > 0 && { backgroundColor: '#EF5350' }]}
                  accessibilityLabel="Record hit person event"
                  onPress={() => recordThrowEvent('hit_person')}
                >
                  <MaterialCommunityIcons 
                    name="account-alert-outline" 
                    size={18} 
                    color={(holeEvents['hit_person'] || 0) > 0 ? '#FFF' : '#EF5350'} 
                  />
                  {(holeEvents['hit_person'] || 0) > 1 && (
                    <View style={styles.eventBadge}><Text style={styles.eventBadgeText}>{holeEvents['hit_person']}</Text></View>
                  )}
                </TouchableOpacity>
              </View>
            )}

            <ScrollView contentContainerStyle={styles.scrollContent}>
              {players.map(player => {
                const strokes = scores[currentHole.id]?.[player.id];
                const isHoleUnplayable = unplayableHoleIds.includes(currentHole.id);
                const scoreDiff = strokes !== null && strokes !== undefined ? strokes - currentHole.par : null;
                const scoreDiffText = scoreDiff === null ? '-' : scoreDiff === 0 ? 'E' : (scoreDiff > 0 ? `+${scoreDiff}` : scoreDiff);

                return (
                  <View key={player.id} style={[styles.playerRow, isHoleUnplayable && styles.unplayableRow]}>
                    <View style={styles.playerMain}>
                      <Avatar userId={player.id} name={player.display_name} avatarUrl={player.avatar_url} size={40} />
                      <View style={styles.playerNameContainer}>
                        <Text style={styles.playerNameText}>{player.display_name}</Text>
                        {isHoleUnplayable ? (
                          <Text style={[styles.playerScoreStatus, styles.unplayableStatusText]}>UNPLAYABLE</Text>
                        ) : (
                          <Text style={[
                            styles.playerScoreStatus,
                            scoreDiff !== null && scoreDiff < 0 && styles.scoreUnder,
                            scoreDiff !== null && scoreDiff > 0 && styles.scoreOver
                          ]}>
                            {scoreDiff === null ? 'Not played' : `${scoreDiffText} (${strokes})`}
                          </Text>
                        )}
                      </View>
                    </View>

                    {isCreator ? (
                      <View style={styles.scoreControls}>
                      <TouchableOpacity 
                        style={styles.controlBtn}
                        accessibilityLabel={`Decrease ${player.display_name} score for hole ${currentHole.hole_number}`}
                        disabled={isHoleUnplayable}
                        onPress={() => decrementScore(currentHole.id, player.id, currentHole.par)}
                      >
                        <Ionicons name="remove" size={24} color={COLORS.text} />
                      </TouchableOpacity>
                      
                      <View style={styles.currentScoreContainer}>
                        <Text style={styles.currentScoreText}>{strokes || '-'}</Text>
                      </View>

                      <TouchableOpacity 
                        style={[styles.controlBtn, styles.controlBtnAdd]}
                        accessibilityLabel={`Increase ${player.display_name} score for hole ${currentHole.hole_number}`}
                        disabled={isHoleUnplayable}
                        onPress={() => incrementScore(currentHole.id, player.id, currentHole.par)}
                      >
                        <Ionicons name="add" size={24} color={COLORS.onPrimary} />
                      </TouchableOpacity>
                    </View>
                    ) : (
                      <View style={styles.readOnlyScoreContainer}>
                        <Text style={styles.currentScoreText}>{strokes || '-'}</Text>
                      </View>
                    )}
                  </View>
                );
              })}
            </ScrollView>
          </View>
        </>
      ) : activeItem?.type === 'summary' ? (
        <ScrollView style={styles.summaryContent}>
          <ScorecardView 
            holes={holes.slice(activeItem.start, activeItem.end + 1)} 
            players={players} 
            scores={scores} 
            unplayableHoleIds={unplayableHoleIds}
          />
        </ScrollView>
      ) : null}

      <View style={styles.holeNav}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.holeNavContent}>
          {navItems.map((item, i) => (
            <TouchableOpacity 
              key={i} 
              style={[styles.holeNavItem, i === activeNavItemIndex && styles.holeNavItemActive]}
              onPress={() => {
                if (isCreator) triggerSync();
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

      <Modal visible={isCreator && isThrowHistoryVisible} transparent animationType="slide">
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
                    <Text style={styles.historyThrowType}>{(item.throw_type || 'shot').toUpperCase()}</Text>
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

      <Modal visible={isCreator && isDiscModalVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Select Disc</Text>
            <View style={styles.throwTypeSelector}>
              <TouchableOpacity
                style={[styles.throwTypeOption, selectedThrowType === 'shot' && styles.throwTypeOptionActive]}
                onPress={() => setSelectedThrowType('shot')}
              >
                <Text style={[styles.throwTypeOptionText, selectedThrowType === 'shot' && styles.throwTypeOptionTextActive]}>Shot</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.throwTypeOption, selectedThrowType === 'putt' && styles.throwTypeOptionActive]}
                onPress={() => setSelectedThrowType('putt')}
              >
                <Text style={[styles.throwTypeOptionText, selectedThrowType === 'putt' && styles.throwTypeOptionTextActive]}>Putt</Text>
              </TouchableOpacity>
            </View>
            {!selectedThrowType && <Text style={styles.throwTypeHint}>Select throw type to enable save.</Text>}
            <FlatList
              data={discs}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => (
                <TouchableOpacity style={[styles.discItem, !selectedThrowType && styles.discItemDisabled]} disabled={!selectedThrowType} onPress={() => recordMeasuredThrow(item.id)}>
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
                      navigation.navigate('Profile', {
                        screen: 'AddEditDisc',
                        params: {
                          returnToActiveMatchDiscPicker: true,
                          pendingThrow,
                          tempEndCoords,
                        },
                      });
                    }}
                  >
                    <View style={[styles.discColor, { backgroundColor: COLORS.primary, justifyContent: 'center', alignItems: 'center' }]}>
                      <Ionicons name="add" size={14} color={COLORS.onPrimary} />
                    </View>
                    <Text style={[styles.discName, { color: COLORS.primary, fontWeight: '700' }]}>Add New Disc</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={[styles.discItem, !selectedThrowType && styles.discItemDisabled]} disabled={!selectedThrowType} onPress={() => recordMeasuredThrow(null)}>
                    <View style={[styles.discColor, { backgroundColor: '#555' }]} />
                    <Text style={styles.discName}>Unknown Disc</Text>
                  </TouchableOpacity>
                </>
              }
            />
            <TouchableOpacity style={styles.modalClose} onPress={() => {
              setSelectedThrowType(null);
              setIsDiscModalVisible(false);
            }}>
              <Text style={styles.modalCloseText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <Modal visible={!!measuredThrowResult} transparent animationType="fade">
        <View style={styles.resultModalOverlay}>
          <View style={styles.resultModalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Throw measured</Text>
              <TouchableOpacity
                accessibilityLabel="Close measured throw result"
                onPress={() => setMeasuredThrowResult(null)}
              >
                <Ionicons name="close" size={24} color={COLORS.textSecondary} />
              </TouchableOpacity>
            </View>
            <Text style={styles.resultDistance}>{measuredThrowResult?.distance}m</Text>
          </View>
        </View>
      </Modal>

      {isCreator && (
        <View style={styles.finishBar}>
          <TouchableOpacity style={styles.finishMatchBtn} onPress={handleFinishMatch}>
            <Text style={styles.finishMatchText}>FINISH ROUND</Text>
          </TouchableOpacity>
        </View>
      )}
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
  watchModeText: { color: COLORS.textSecondary, fontSize: 13, fontWeight: '700' },
  iconBtn: { width: 40, height: 40, borderRadius: 10, backgroundColor: 'rgba(255,255,255,0.06)', justifyContent: 'center', alignItems: 'center' },
  throwEventActions: { flexDirection: 'row', gap: 8, paddingHorizontal: 20, paddingBottom: 12 },
  throwEventAction: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: 'rgba(255,255,255,0.08)',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  eventBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: '#FFF',
    borderRadius: 8,
    width: 16,
    height: 16,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.1)',
  },
  eventBadgeText: {
    color: '#000',
    fontSize: 9,
    fontWeight: '900',
  },
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
  readOnlyScoreContainer: { minWidth: 34, height: 36, justifyContent: 'center', alignItems: 'center' },
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
  resultModalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.65)', justifyContent: 'center', padding: 24 },
  resultModalContent: { backgroundColor: '#1C1C1E', borderRadius: 16, padding: 24, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)' },
  resultDistance: { color: COLORS.primary, fontSize: 44, fontWeight: '800', marginTop: 16, textAlign: 'center' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  modalTitle: { color: '#FFF', fontSize: 19, fontWeight: '600' },
  modalSubTitle: { color: COLORS.textSecondary, fontSize: 13, marginBottom: 20 },
  throwTypeSelector: { flexDirection: 'row', gap: 10, marginTop: 12, marginBottom: 8 },
  throwTypeOption: { flex: 1, borderRadius: 10, borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)', paddingVertical: 10, alignItems: 'center' },
  throwTypeOptionActive: { borderColor: COLORS.primary, backgroundColor: 'rgba(33,150,243,0.2)' },
  throwTypeOptionText: { color: COLORS.textSecondary, fontWeight: '600' },
  throwTypeOptionTextActive: { color: COLORS.onPrimary },
  throwTypeHint: { color: COLORS.textSecondary, fontSize: 12, marginBottom: 8 },
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
  historyThrowType: {
    color: COLORS.textSecondary,
    fontSize: 11,
    fontWeight: '700',
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
  discItemDisabled: { opacity: 0.45 },
  discColor: { width: 18, height: 18, borderRadius: 9, marginRight: 12 },
  discName: { color: '#FFF', fontSize: 16 },
  modalClose: { marginTop: 16, alignItems: 'center', paddingVertical: 12 },
  modalCloseText: { color: 'rgba(255,255,255,0.5)', fontSize: 15 },
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
  summaryCell: { flex: 1, height: 36, alignItems: 'center', justifyContent: 'center', borderRadius: 4, marginHorizontal: 1 },
  unplayableSummaryCell: { backgroundColor: 'rgba(255,112,67,0.22)', borderWidth: 1, borderColor: 'rgba(255,112,67,0.5)' },
  summaryCellSticky: { flex: 2, alignItems: 'flex-start', paddingHorizontal: 4, backgroundColor: 'transparent', marginRight: 8 },

  summaryLabel: { color: 'rgba(255,255,255,0.3)', fontSize: 10, fontWeight: '800', letterSpacing: 1 },
  summaryValue: { fontSize: 16, fontWeight: '800', fontFamily: 'JetBrains Mono' },
  summaryHoleNum: { color: 'rgba(255,255,255,0.6)', fontSize: 14, fontWeight: '700' },
  summaryPar: { color: 'rgba(255,255,255,0.4)', fontSize: 14, fontWeight: '400' },
  summaryPlayerName: { color: '#FFF', fontSize: 14, fontWeight: '700' },
  unplayableRow: { borderWidth: 1, borderColor: 'rgba(255,112,67,0.45)', borderRadius: 14 },
  unplayableStatusText: { color: '#FFAB91', fontWeight: '800' },
  // Map Toggle
  mapToggle: { position: 'absolute', bottom: 12, right: 12, width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)' },
});
