import React, { useEffect, useMemo, useState } from 'react';
import {
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import * as Location from 'expo-location';
import { WebView } from 'react-native-webview';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../theme';

type PickMode = 'tee' | 'basket';

interface HoleDraft {
  tee_latitude?: number | string | null;
  tee_longitude?: number | string | null;
  basket_latitude?: number | string | null;
  basket_longitude?: number | string | null;
}

interface HoleMapEditorProps {
  draft: HoleDraft;
  pickMode: PickMode;
  onPickModeChange: (mode: PickMode) => void;
  onCoordinateChange: (field: keyof HoleDraft, value: string) => void;
  onMapPick: (mode: PickMode, latitude: number, longitude: number) => void;
  manualVisible: boolean;
  onToggleManual: () => void;
  testIDPrefix: string;
}

const DEFAULT_CENTER = {
  latitude: 54.352,
  longitude: 18.6466,
};

function toNumber(value: number | string | null | undefined): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.trim().length > 0) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function formatCoordinate(value: number | string | null | undefined) {
  const numeric = toNumber(value);
  return numeric === null ? 'Not set' : numeric.toFixed(4);
}

function buildMapHtml({
  center,
  teeLatitude,
  teeLongitude,
  basketLatitude,
  basketLongitude,
  userLatitude,
  userLongitude,
  pickMode,
}: {
  center: { latitude: number; longitude: number };
  teeLatitude: number | null;
  teeLongitude: number | null;
  basketLatitude: number | null;
  basketLongitude: number | null;
  userLatitude: number | null;
  userLongitude: number | null;
  pickMode: PickMode;
}) {
  const payload = JSON.stringify({
    center,
    tee: teeLatitude !== null && teeLongitude !== null ? { lat: teeLatitude, lng: teeLongitude } : null,
    basket:
      basketLatitude !== null && basketLongitude !== null ? { lat: basketLatitude, lng: basketLongitude } : null,
    user: userLatitude !== null && userLongitude !== null ? { lat: userLatitude, lng: userLongitude } : null,
    pickMode,
  });

  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
        <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
        <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
        <style>
          html, body, #map { height: 100%; margin: 0; padding: 0; background: #0f1419; }
          body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; }
          .leaflet-control-attribution { display: none; }
          .pick-badge {
            position: absolute;
            top: 10px;
            left: 10px;
            z-index: 1000;
            background: rgba(10, 15, 20, 0.92);
            color: white;
            padding: 6px 10px;
            border-radius: 999px;
            font-size: 12px;
            font-weight: 700;
            letter-spacing: 0.2px;
            border: 1px solid rgba(255,255,255,0.08);
          }
        </style>
      </head>
      <body>
        <div class="pick-badge" id="pick-badge"></div>
        <div id="map"></div>
        <script>
          const state = ${payload};
          const map = L.map('map', { zoomControl: true, attributionControl: false });
          L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            maxZoom: 20,
          }).addTo(map);

          const teeIcon = L.divIcon({
            className: 'tee-marker',
            html: "<div style='background:#FFC857;color:#111;width:22px;height:22px;border-radius:11px;border:2px solid white;display:flex;align-items:center;justify-content:center;font-weight:800;font-size:10px;'>T</div>",
            iconSize: [22, 22],
            iconAnchor: [11, 11],
          });

          const basketIcon = L.divIcon({
            className: 'basket-marker',
            html: "<div style='background:#39FF14;color:#111;width:22px;height:22px;border-radius:11px;border:2px solid white;display:flex;align-items:center;justify-content:center;font-weight:800;font-size:10px;'>B</div>",
            iconSize: [22, 22],
            iconAnchor: [11, 11],
          });

          const userIcon = L.divIcon({
            className: 'user-marker',
            html: "<div style='background:#3B82F6;color:white;width:18px;height:18px;border-radius:9px;border:2px solid white;box-shadow:0 0 0 6px rgba(59,130,246,0.18);'></div>",
            iconSize: [18, 18],
            iconAnchor: [9, 9],
          });

          document.getElementById('pick-badge').textContent =
            state.pickMode === 'tee' ? 'Picking tee' : 'Picking basket';

          const points = [];
          if (state.tee) points.push([state.tee.lat, state.tee.lng]);
          if (state.basket) points.push([state.basket.lat, state.basket.lng]);
          if (state.user) points.push([state.user.lat, state.user.lng]);

          if (points.length === 0) {
            map.setView([state.center.latitude, state.center.longitude], 16);
          } else if (points.length === 1) {
            map.setView(points[0], 17);
          } else {
            map.fitBounds(points, { padding: [36, 36] });
          }

          if (state.tee) {
            L.marker([state.tee.lat, state.tee.lng], { icon: teeIcon }).addTo(map);
          }

          if (state.basket) {
            L.marker([state.basket.lat, state.basket.lng], { icon: basketIcon }).addTo(map);
          }

          if (state.user) {
            L.marker([state.user.lat, state.user.lng], { icon: userIcon }).addTo(map);
          }

          if (state.tee && state.basket) {
            L.polyline(
              [
                [state.tee.lat, state.tee.lng],
                [state.basket.lat, state.basket.lng],
              ],
              { color: '#39FF14', weight: 3, opacity: 0.85 }
            ).addTo(map);
          }

          map.on('click', function(event) {
            const message = JSON.stringify({
              type: 'pick',
              latitude: event.latlng.lat,
              longitude: event.latlng.lng,
            });
            window.ReactNativeWebView.postMessage(message);
          });
        </script>
      </body>
    </html>
  `;
}

function getMapCenter(draft: HoleDraft) {
  const teeLatitude = toNumber(draft.tee_latitude);
  const teeLongitude = toNumber(draft.tee_longitude);
  const basketLatitude = toNumber(draft.basket_latitude);
  const basketLongitude = toNumber(draft.basket_longitude);

  if (teeLatitude !== null && teeLongitude !== null) {
    return { latitude: teeLatitude, longitude: teeLongitude };
  }

  if (basketLatitude !== null && basketLongitude !== null) {
    return { latitude: basketLatitude, longitude: basketLongitude };
  }

  return DEFAULT_CENTER;
}

export function HoleMapEditor({
  draft,
  pickMode,
  onPickModeChange,
  onCoordinateChange,
  onMapPick,
  manualVisible,
  onToggleManual,
  testIDPrefix,
}: HoleMapEditorProps) {
  const [isFullscreenVisible, setIsFullscreenVisible] = useState(false);
  const [userLocation, setUserLocation] = useState<{ latitude: number; longitude: number } | null>(null);

  const teeLatitude = toNumber(draft.tee_latitude);
  const teeLongitude = toNumber(draft.tee_longitude);
  const basketLatitude = toNumber(draft.basket_latitude);
  const basketLongitude = toNumber(draft.basket_longitude);
  const center = useMemo(() => getMapCenter(draft), [draft]);

  useEffect(() => {
    let isActive = true;
    let subscription: Location.LocationSubscription | null = null;

    async function watchUserLocation() {
      if (!isFullscreenVisible) {
        return;
      }

      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        return;
      }

      const current = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      if (isActive) {
        setUserLocation({
          latitude: current.coords.latitude,
          longitude: current.coords.longitude,
        });
      }

      subscription = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.Balanced,
          distanceInterval: 5,
          timeInterval: 3000,
        },
        (location) => {
          if (!isActive) {
            return;
          }

          setUserLocation({
            latitude: location.coords.latitude,
            longitude: location.coords.longitude,
          });
        }
      );
    }

    watchUserLocation();

    return () => {
      isActive = false;
      if (subscription) {
        subscription.remove();
      }
    };
  }, [isFullscreenVisible]);

  const mapHtml = useMemo(
    () =>
      buildMapHtml({
        center,
        teeLatitude,
        teeLongitude,
        basketLatitude,
        basketLongitude,
        userLatitude: userLocation?.latitude ?? null,
        userLongitude: userLocation?.longitude ?? null,
        pickMode,
      }),
    [
      basketLatitude,
      basketLongitude,
      center,
      pickMode,
      teeLatitude,
      teeLongitude,
      userLocation?.latitude,
      userLocation?.longitude,
    ]
  );

  const mapKey = `${pickMode}:${teeLatitude ?? 'x'}:${teeLongitude ?? 'x'}:${basketLatitude ?? 'x'}:${basketLongitude ?? 'x'}:${userLocation?.latitude ?? 'u'}:${userLocation?.longitude ?? 'u'}`;

  return (
    <View style={styles.card}>
      <View style={styles.modeRow}>
        <TouchableOpacity
          onPress={() => onPickModeChange('tee')}
          style={[styles.modeButton, pickMode === 'tee' && styles.modeButtonActive]}
        >
          <Text style={[styles.modeButtonText, pickMode === 'tee' && styles.modeButtonTextActive]}>
            Tee
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => onPickModeChange('basket')}
          style={[styles.modeButton, pickMode === 'basket' && styles.modeButtonActive]}
        >
          <Text style={[styles.modeButtonText, pickMode === 'basket' && styles.modeButtonTextActive]}>
            Basket
          </Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.helpText}>
        Podglad pokazuje tee i basket. Otworz pelny ekran, zeby przesuwac mape, zoomowac i stawiac marker bez walki ze scrollowaniem ekranu.
      </Text>

      <Pressable style={styles.mapFrame} onPress={() => setIsFullscreenVisible(true)}>
        <WebView
          key={`${mapKey}:preview`}
          testID={`${testIDPrefix}-preview-map`}
          source={{ html: mapHtml }}
          originWhitelist={['*']}
          javaScriptEnabled
          domStorageEnabled
          scrollEnabled={false}
          setSupportMultipleWindows={false}
          style={styles.map}
          pointerEvents="none"
        />
        <View style={styles.previewOverlay}>
          <Ionicons name="expand-outline" size={18} color={COLORS.text} />
          <Text style={styles.previewOverlayText}>Open fullscreen map</Text>
        </View>
      </Pressable>

      <TouchableOpacity
        style={styles.primaryButton}
        onPress={() => setIsFullscreenVisible(true)}
      >
        <Text style={styles.primaryButtonText}>Open Fullscreen Map</Text>
      </TouchableOpacity>

      <View style={styles.summaryRow}>
        <View style={styles.summaryPill}>
          <Ionicons name="flag-outline" size={14} color="#FFC857" />
          <Text style={styles.summaryText}>Tee {formatCoordinate(teeLatitude)}, {formatCoordinate(teeLongitude)}</Text>
        </View>
        <View style={styles.summaryPill}>
          <Ionicons name="golf-outline" size={14} color={COLORS.primary} />
          <Text style={styles.summaryText}>
            Basket {formatCoordinate(basketLatitude)}, {formatCoordinate(basketLongitude)}
          </Text>
        </View>
        <View style={styles.summaryPill}>
          <Ionicons name="locate-outline" size={14} color="#3B82F6" />
          <Text style={styles.summaryText}>
            You {userLocation ? `${userLocation.latitude.toFixed(4)}, ${userLocation.longitude.toFixed(4)}` : 'Location hidden until fullscreen opens'}
          </Text>
        </View>
      </View>

      <TouchableOpacity
        testID={`${testIDPrefix}-manual-toggle`}
        style={styles.manualToggle}
        onPress={onToggleManual}
      >
        <Text style={styles.manualToggleText}>
          {manualVisible ? 'Hide manual coordinates' : 'Manual coordinate correction'}
        </Text>
      </TouchableOpacity>

      {manualVisible ? (
        <View style={styles.manualGrid}>
          <View style={styles.column}>
            <Text style={styles.inputLabel}>Tee latitude</Text>
            <TextInput
              placeholder="Tee latitude"
              placeholderTextColor={COLORS.textSecondary}
              style={styles.input}
              value={draft.tee_latitude !== null && draft.tee_latitude !== undefined ? String(draft.tee_latitude) : ''}
              onChangeText={(value) => onCoordinateChange('tee_latitude', value)}
              keyboardType="numeric"
            />
            <Text style={styles.inputLabel}>Tee longitude</Text>
            <TextInput
              placeholder="Tee longitude"
              placeholderTextColor={COLORS.textSecondary}
              style={styles.input}
              value={draft.tee_longitude !== null && draft.tee_longitude !== undefined ? String(draft.tee_longitude) : ''}
              onChangeText={(value) => onCoordinateChange('tee_longitude', value)}
              keyboardType="numeric"
            />
          </View>
          <View style={styles.column}>
            <Text style={styles.inputLabel}>Basket latitude</Text>
            <TextInput
              placeholder="Basket latitude"
              placeholderTextColor={COLORS.textSecondary}
              style={styles.input}
              value={
                draft.basket_latitude !== null && draft.basket_latitude !== undefined
                  ? String(draft.basket_latitude)
                  : ''
              }
              onChangeText={(value) => onCoordinateChange('basket_latitude', value)}
              keyboardType="numeric"
            />
            <Text style={styles.inputLabel}>Basket longitude</Text>
            <TextInput
              placeholder="Basket longitude"
              placeholderTextColor={COLORS.textSecondary}
              style={styles.input}
              value={
                draft.basket_longitude !== null && draft.basket_longitude !== undefined
                  ? String(draft.basket_longitude)
                  : ''
              }
              onChangeText={(value) => onCoordinateChange('basket_longitude', value)}
              keyboardType="numeric"
            />
          </View>
        </View>
      ) : null}

      <Modal visible={isFullscreenVisible} animationType="slide" onRequestClose={() => setIsFullscreenVisible(false)}>
        <View style={styles.modalRoot}>
          <View style={styles.modalHeader}>
            <View style={styles.modalHeaderText}>
              <Text style={styles.modalTitle}>Fullscreen Hole Map</Text>
              <Text style={styles.modalSubtitle}>
                Tap map to place the {pickMode === 'tee' ? 'tee' : 'basket'} marker. Blue dot is your current location.
              </Text>
            </View>
            <TouchableOpacity onPress={() => setIsFullscreenVisible(false)} style={styles.closeButton}>
              <Ionicons name="close" size={22} color={COLORS.text} />
            </TouchableOpacity>
          </View>

          <View style={styles.modalModeRow}>
            <TouchableOpacity
              onPress={() => onPickModeChange('tee')}
              style={[styles.modeButton, pickMode === 'tee' && styles.modeButtonActive]}
            >
              <Text style={[styles.modeButtonText, pickMode === 'tee' && styles.modeButtonTextActive]}>
                Tee
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => onPickModeChange('basket')}
              style={[styles.modeButton, pickMode === 'basket' && styles.modeButtonActive]}
            >
              <Text style={[styles.modeButtonText, pickMode === 'basket' && styles.modeButtonTextActive]}>
                Basket
              </Text>
            </TouchableOpacity>
          </View>

          <View style={styles.modalMapFrame}>
            <WebView
              key={`${mapKey}:fullscreen`}
              testID={`${testIDPrefix}-map`}
              source={{ html: mapHtml }}
              originWhitelist={['*']}
              javaScriptEnabled
              domStorageEnabled
              scrollEnabled={false}
              setSupportMultipleWindows={false}
              style={styles.modalMap}
              onMessage={(event) => {
                try {
                  const payload = JSON.parse(event.nativeEvent.data);
                  if (payload?.type !== 'pick') return;
                  if (!Number.isFinite(payload.latitude) || !Number.isFinite(payload.longitude)) return;
                  onMapPick(pickMode, payload.latitude, payload.longitude);
                } catch {
                  // Ignore malformed map events.
                }
              }}
            />
          </View>

          <View style={styles.modalFooter}>
            <Text style={styles.modalFooterText}>Pinch to zoom. Drag to pan. Tap to place marker.</Text>
            <TouchableOpacity style={styles.primaryButton} onPress={() => setIsFullscreenVisible(false)}>
              <Text style={styles.primaryButtonText}>Done</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.borderDark,
    padding: 14,
    gap: 12,
  },
  modeRow: {
    flexDirection: 'row',
    gap: 8,
  },
  modalModeRow: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 18,
    paddingBottom: 12,
  },
  modeButton: {
    flex: 1,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: COLORS.borderDark,
    paddingVertical: 10,
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.04)',
  },
  modeButtonActive: {
    borderColor: COLORS.primary,
    backgroundColor: 'rgba(144, 202, 249, 0.14)',
  },
  modeButtonText: {
    color: COLORS.textSecondary,
    fontWeight: '600',
  },
  modeButtonTextActive: {
    color: COLORS.text,
  },
  helpText: {
    color: COLORS.textSecondary,
    lineHeight: 18,
  },
  mapFrame: {
    borderRadius: 10,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: COLORS.borderDark,
    position: 'relative',
  },
  map: {
    height: 220,
    backgroundColor: '#10161D',
  },
  previewOverlay: {
    position: 'absolute',
    right: 12,
    bottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(10, 15, 20, 0.92)',
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  previewOverlayText: {
    color: COLORS.text,
    fontWeight: '600',
  },
  primaryButton: {
    backgroundColor: COLORS.primary,
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
  },
  primaryButtonText: {
    color: '#081018',
    fontWeight: '700',
  },
  summaryRow: {
    gap: 8,
  },
  summaryPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 9,
  },
  summaryText: {
    color: COLORS.text,
    flexShrink: 1,
  },
  manualToggle: {
    alignSelf: 'flex-start',
    paddingVertical: 6,
  },
  manualToggleText: {
    color: COLORS.primary,
    fontWeight: '600',
  },
  manualGrid: {
    flexDirection: 'row',
    gap: 10,
  },
  column: {
    flex: 1,
    gap: 8,
  },
  inputLabel: {
    color: COLORS.textSecondary,
    fontSize: 12,
    fontWeight: '600',
  },
  input: {
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.borderDark,
    color: COLORS.text,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  modalRoot: {
    flex: 1,
    backgroundColor: COLORS.background,
    paddingTop: 18,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
    paddingHorizontal: 18,
    paddingBottom: 12,
  },
  modalHeaderText: {
    flex: 1,
    gap: 4,
  },
  modalTitle: {
    color: COLORS.text,
    fontSize: 22,
    fontWeight: '700',
  },
  modalSubtitle: {
    color: COLORS.textSecondary,
    lineHeight: 18,
  },
  closeButton: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: COLORS.borderDark,
    padding: 10,
  },
  modalMapFrame: {
    flex: 1,
    marginHorizontal: 18,
    marginBottom: 18,
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: COLORS.borderDark,
  },
  modalMap: {
    flex: 1,
    backgroundColor: '#10161D',
  },
  modalFooter: {
    paddingHorizontal: 18,
    paddingBottom: 18,
    gap: 12,
  },
  modalFooterText: {
    color: COLORS.textSecondary,
    textAlign: 'center',
  },
});
