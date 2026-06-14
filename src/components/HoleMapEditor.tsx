import React, { useMemo } from 'react';
import { StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import MapView, { Marker, Polyline, Region } from 'react-native-maps';
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

const DEFAULT_REGION: Region = {
  latitude: 54.352,
  longitude: 18.6466,
  latitudeDelta: 0.01,
  longitudeDelta: 0.01,
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

function buildRegion(draft: HoleDraft): Region {
  const points = [
    {
      latitude: toNumber(draft.tee_latitude),
      longitude: toNumber(draft.tee_longitude),
    },
    {
      latitude: toNumber(draft.basket_latitude),
      longitude: toNumber(draft.basket_longitude),
    },
  ].filter(
    (point): point is { latitude: number; longitude: number } =>
      point.latitude !== null && point.longitude !== null
  );

  if (points.length === 0) return DEFAULT_REGION;
  if (points.length === 1) {
    return {
      latitude: points[0].latitude,
      longitude: points[0].longitude,
      latitudeDelta: 0.004,
      longitudeDelta: 0.004,
    };
  }

  const latitudes = points.map((point) => point.latitude);
  const longitudes = points.map((point) => point.longitude);
  const minLat = Math.min(...latitudes);
  const maxLat = Math.max(...latitudes);
  const minLng = Math.min(...longitudes);
  const maxLng = Math.max(...longitudes);

  return {
    latitude: (minLat + maxLat) / 2,
    longitude: (minLng + maxLng) / 2,
    latitudeDelta: Math.max(Math.abs(maxLat - minLat) * 2.2, 0.004),
    longitudeDelta: Math.max(Math.abs(maxLng - minLng) * 2.2, 0.004),
  };
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
  const teeLatitude = toNumber(draft.tee_latitude);
  const teeLongitude = toNumber(draft.tee_longitude);
  const basketLatitude = toNumber(draft.basket_latitude);
  const basketLongitude = toNumber(draft.basket_longitude);
  const region = useMemo(() => buildRegion(draft), [draft]);

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
        Tap the map to place the {pickMode === 'tee' ? 'tee' : 'basket'} marker.
      </Text>

      <MapView
        testID={`${testIDPrefix}-map`}
        style={styles.map}
        initialRegion={region}
        region={region}
        onPress={(event) => {
          const { latitude, longitude } = event.nativeEvent.coordinate;
          onMapPick(pickMode, latitude, longitude);
        }}
      >
        {teeLatitude !== null && teeLongitude !== null ? (
          <Marker
            testID={`${testIDPrefix}-tee-marker`}
            coordinate={{ latitude: teeLatitude, longitude: teeLongitude }}
            pinColor="#FFC857"
          />
        ) : null}
        {basketLatitude !== null && basketLongitude !== null ? (
          <Marker
            testID={`${testIDPrefix}-basket-marker`}
            coordinate={{ latitude: basketLatitude, longitude: basketLongitude }}
            pinColor={COLORS.primaryDark}
          />
        ) : null}
        {teeLatitude !== null &&
        teeLongitude !== null &&
        basketLatitude !== null &&
        basketLongitude !== null ? (
          <Polyline
            testID={`${testIDPrefix}-hole-line`}
            coordinates={[
              { latitude: teeLatitude, longitude: teeLongitude },
              { latitude: basketLatitude, longitude: basketLongitude },
            ]}
            strokeColor={COLORS.primary}
            strokeWidth={3}
          />
        ) : null}
      </MapView>

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
  modeButton: {
    flex: 1,
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1,
    borderColor: COLORS.borderDark,
  },
  modeButtonActive: {
    backgroundColor: 'rgba(144, 202, 249, 0.16)',
    borderColor: COLORS.primary,
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
    fontSize: 13,
  },
  map: {
    width: '100%',
    height: 220,
    borderRadius: 8,
  },
  summaryRow: {
    gap: 8,
  },
  summaryPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  summaryText: {
    color: COLORS.textLight,
    fontSize: 13,
  },
  manualToggle: {
    alignSelf: 'flex-start',
    paddingVertical: 4,
  },
  manualToggleText: {
    color: COLORS.primary,
    fontWeight: '600',
  },
  manualGrid: {
    flexDirection: 'row',
    gap: 12,
  },
  column: {
    flex: 1,
  },
  inputLabel: {
    color: COLORS.textSecondary,
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 6,
  },
  input: {
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.borderDark,
    color: COLORS.text,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 10,
  },
});
