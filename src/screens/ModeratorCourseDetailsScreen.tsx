import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../lib/supabase';
import { COLORS } from '../theme';
import { HoleMapEditor } from '../components/HoleMapEditor';

interface CourseHole {
  id: string;
  course_id: string;
  name: string;
  par: number;
  distance_m?: number | null;
  tee_latitude?: number | null;
  tee_longitude?: number | null;
  basket_latitude?: number | null;
  basket_longitude?: number | null;
}

interface LayoutRow {
  id: string;
  course_id: string;
  name: string;
  hole_count: number;
}

interface CourseMapRow {
  id: string;
  course_id: string;
  name: string;
  style_key: string;
}

type PickMode = 'tee' | 'basket';

const MAP_STYLE_OPTIONS = ['park', 'woods', 'open'];

function toNullableNumber(value: string | number | null | undefined) {
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : null;
  }
  if (typeof value === 'string' && value.trim().length > 0) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

export function ModeratorCourseDetailsScreen({ route, navigation }: any) {
  const { courseId, courseName } = route.params;

  const [layouts, setLayouts] = useState<LayoutRow[]>([]);
  const [courseHoles, setCourseHoles] = useState<CourseHole[]>([]);
  const [courseMaps, setCourseMaps] = useState<CourseMapRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [selectedCourseHoleId, setSelectedCourseHoleId] = useState<string | null>(null);
  const [pickMode, setPickMode] = useState<PickMode>('tee');
  const [manualCoordinatesOpen, setManualCoordinatesOpen] = useState(false);
  const [courseHoleDrafts, setCourseHoleDrafts] = useState<Record<string, Partial<CourseHole>>>({});

  const [newLayoutName, setNewLayoutName] = useState('');
  const [selectedCloneLayoutId, setSelectedCloneLayoutId] = useState<string | null>(null);

  const [newHoleName, setNewHoleName] = useState('');
  const [newHolePar, setNewHolePar] = useState('3');

  const [newMapName, setNewMapName] = useState('');
  const [newMapStyleKey, setNewMapStyleKey] = useState('park');

  useEffect(() => {
    fetchCourseManagement();
  }, [courseId]);

  const selectedCourseHole = useMemo(() => {
    if (!selectedCourseHoleId) return null;
    return courseHoles.find((hole) => hole.id === selectedCourseHoleId) || null;
  }, [courseHoles, selectedCourseHoleId]);

  const selectedCourseHoleDraft = selectedCourseHole
    ? {
        ...selectedCourseHole,
        ...(courseHoleDrafts[selectedCourseHole.id] || {}),
      }
    : null;

  const fetchCourseManagement = async () => {
    try {
      setIsLoading(true);

      const { data: layoutData, error: layoutError } = await supabase
        .from('layouts')
        .select('*')
        .eq('course_id', courseId)
        .order('name');
      if (layoutError) throw layoutError;

      const { data: holeData, error: holeError } = await supabase
        .from('course_holes')
        .select('*')
        .eq('course_id', courseId)
        .order('name');
      if (holeError) throw holeError;

      const { data: mapData, error: mapError } = await supabase
        .from('course_maps')
        .select('*')
        .eq('course_id', courseId)
        .order('name');
      if (mapError) throw mapError;

      const nextLayouts = layoutData || [];
      const nextCourseHoles = holeData || [];

      setLayouts(nextLayouts);
      setCourseHoles(nextCourseHoles);
      setCourseMaps(mapData || []);

      if (nextLayouts.length > 0 && !selectedCloneLayoutId) {
        setSelectedCloneLayoutId(nextLayouts[0].id);
      }

      if (nextCourseHoles.length > 0) {
        setSelectedCourseHoleId((current) =>
          current && nextCourseHoles.some((hole) => hole.id === current) ? current : nextCourseHoles[0].id
        );
      } else {
        setSelectedCourseHoleId(null);
      }
    } catch (err: any) {
      Alert.alert('Error', err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const updateCourseHoleDraft = (holeId: string, field: keyof CourseHole, value: string) => {
    setCourseHoleDrafts((prev) => {
      const current = courseHoles.find((hole) => hole.id === holeId) || {};
      return {
        ...prev,
        [holeId]: {
          ...current,
          ...prev[holeId],
          [field]: value,
        },
      };
    });
  };

  const handleMapPick = (mode: PickMode, latitude: number, longitude: number) => {
    if (!selectedCourseHole) return;

    setCourseHoleDrafts((prev) => ({
      ...prev,
      [selectedCourseHole.id]: {
        ...selectedCourseHole,
        ...prev[selectedCourseHole.id],
        ...(mode === 'tee'
          ? { tee_latitude: latitude, tee_longitude: longitude }
          : { basket_latitude: latitude, basket_longitude: longitude }),
      },
    }));
  };

  const syncCourseHoleToLayouts = async (courseHoleId: string, payload: Partial<CourseHole>) => {
    const layoutHolesQuery: any = supabase.from('layout_holes');
    if (typeof layoutHolesQuery.select !== 'function') return;

    const relationQuery = layoutHolesQuery.select('*');
    if (typeof relationQuery.eq !== 'function') return;
    const { data: relations, error: relationError } = await relationQuery.eq('course_hole_id', courseHoleId);
    if (relationError) throw relationError;

    for (const relation of relations || []) {
      const holesQuery: any = supabase.from('holes');
      if (typeof holesQuery.select !== 'function') continue;
      const byLayoutQuery = holesQuery.select('*');
      if (typeof byLayoutQuery.eq !== 'function') continue;
      const orderedQuery = byLayoutQuery.eq('layout_id', relation.layout_id);
      if (typeof orderedQuery.order !== 'function') continue;
      const { data: playableHoles, error: playableError } = await orderedQuery.order('hole_number');
      if (playableError) throw playableError;

      const playableHole = (playableHoles || []).find((hole: any) => hole.hole_number === relation.position);
      if (!playableHole) continue;

      const updatePayload = {
        par: toNullableNumber(payload.par as any) || 3,
        distance_m: toNullableNumber(payload.distance_m as any),
        tee_latitude: toNullableNumber(payload.tee_latitude as any),
        tee_longitude: toNullableNumber(payload.tee_longitude as any),
        basket_latitude: toNullableNumber(payload.basket_latitude as any),
        basket_longitude: toNullableNumber(payload.basket_longitude as any),
      };

      await supabase.from('holes').update(updatePayload).eq('id', playableHole.id);
    }
  };

  const handleSaveSelectedCourseHole = async () => {
    if (!selectedCourseHole || !selectedCourseHoleDraft) return;

    const name = String(selectedCourseHoleDraft.name || '').trim();
    if (!name) {
      Alert.alert('Error', 'Please provide a reusable hole name.');
      return;
    }

    const payload = {
      name,
      par: toNullableNumber(selectedCourseHoleDraft.par as any) || 3,
      distance_m: toNullableNumber(selectedCourseHoleDraft.distance_m as any),
      tee_latitude: toNullableNumber(selectedCourseHoleDraft.tee_latitude as any),
      tee_longitude: toNullableNumber(selectedCourseHoleDraft.tee_longitude as any),
      basket_latitude: toNullableNumber(selectedCourseHoleDraft.basket_latitude as any),
      basket_longitude: toNullableNumber(selectedCourseHoleDraft.basket_longitude as any),
    };

    try {
      const { error } = await supabase.from('course_holes').update(payload).eq('id', selectedCourseHole.id);
      if (error) throw error;

      await syncCourseHoleToLayouts(selectedCourseHole.id, payload);

      setCourseHoleDrafts((prev) => {
        const next = { ...prev };
        delete next[selectedCourseHole.id];
        return next;
      });
      await fetchCourseManagement();
      Alert.alert('Saved', `${payload.name} updated.`);
    } catch (err: any) {
      Alert.alert('Error', err.message);
    }
  };

  const handleAddCourseHole = async () => {
    if (!newHoleName.trim()) {
      Alert.alert('Error', 'Please provide a reusable hole name.');
      return;
    }

    try {
      const insert = supabase.from('course_holes').insert({
        course_id: courseId,
        name: newHoleName.trim(),
        par: Number(newHolePar) || 3,
      });
      const { data, error } = await insert.select();
      if (error) throw error;

      setNewHoleName('');
      setNewHolePar('3');

      const insertedId = data?.[0]?.id;
      await fetchCourseManagement();
      if (insertedId) setSelectedCourseHoleId(insertedId);
    } catch (err: any) {
      Alert.alert('Error', err.message);
    }
  };

  const handleAddMap = async () => {
    if (!newMapName.trim()) {
      Alert.alert('Error', 'Please provide a map name.');
      return;
    }

    try {
      const insert = supabase.from('course_maps').insert({
        course_id: courseId,
        name: newMapName.trim(),
        style_key: newMapStyleKey,
      });
      const { error } = await insert.select();
      if (error) throw error;

      setNewMapName('');
      setNewMapStyleKey('park');
      await fetchCourseManagement();
    } catch (err: any) {
      Alert.alert('Error', err.message);
    }
  };

  const handleAddLayout = async () => {
    if (!newLayoutName.trim()) {
      Alert.alert('Error', 'Please provide a layout name.');
      return;
    }

    try {
      let holesToClone: any[] = [];
      let layoutHoleLinksToClone: any[] = [];

      if (selectedCloneLayoutId) {
        const { data: sourceHoles, error: holesError } = await supabase
          .from('holes')
          .select('*')
          .eq('layout_id', selectedCloneLayoutId)
          .order('hole_number');
        if (holesError) throw holesError;
        holesToClone = sourceHoles || [];

        const layoutHoleQuery: any = supabase.from('layout_holes');
        if (typeof layoutHoleQuery.select === 'function') {
          const selection = layoutHoleQuery.select('*');
          if (typeof selection.eq === 'function') {
            const { data: sourceLinks, error: sourceLinksError } = await selection.eq('layout_id', selectedCloneLayoutId);
            if (sourceLinksError) throw sourceLinksError;
            layoutHoleLinksToClone = sourceLinks || [];
          }
        }
      }

      const layoutInsert = supabase.from('layouts').insert({
        course_id: courseId,
        name: newLayoutName.trim(),
        hole_count: holesToClone.length,
      });
      const { data: newLayoutData, error: layoutError } = await layoutInsert.select();
      if (layoutError) throw layoutError;

      const newLayoutId = newLayoutData?.[0]?.id;
      if (!newLayoutId) throw new Error('Failed to create layout.');

      if (holesToClone.length > 0) {
        const holesPayload = holesToClone.map((hole) => ({
          layout_id: newLayoutId,
          hole_number: hole.hole_number,
          par: hole.par,
          distance_m: hole.distance_m,
          tee_latitude: hole.tee_latitude,
          tee_longitude: hole.tee_longitude,
          basket_latitude: hole.basket_latitude,
          basket_longitude: hole.basket_longitude,
        }));
        const { error: insertHolesError } = await supabase.from('holes').insert(holesPayload);
        if (insertHolesError) throw insertHolesError;
      }

      if (layoutHoleLinksToClone.length > 0) {
        const linksPayload = layoutHoleLinksToClone.map((link) => ({
          layout_id: newLayoutId,
          course_hole_id: link.course_hole_id,
          position: link.position,
        }));
        const { error: insertLinksError } = await supabase.from('layout_holes').insert(linksPayload);
        if (insertLinksError) throw insertLinksError;
      }

      setNewLayoutName('');
      await fetchCourseManagement();
    } catch (err: any) {
      Alert.alert('Error', err.message);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={COLORS.text} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.eyebrow}>COURSE EDITOR</Text>
          <Text style={styles.title}>{courseName}</Text>
        </View>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {isLoading ? (
          <ActivityIndicator size="large" color={COLORS.primary} style={styles.loader} />
        ) : (
          <>
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>COURSE HOLE POOL</Text>
              <Text style={styles.sectionBody}>
                Reusable Course Holes are the canonical source. Layouts only choose and order them.
              </Text>

              <View style={styles.addCard}>
                <Text style={styles.cardTitle}>Add reusable hole</Text>
                <TextInput
                  placeholder="Reusable Hole Name"
                  placeholderTextColor={COLORS.textSecondary}
                  style={styles.input}
                  value={newHoleName}
                  onChangeText={setNewHoleName}
                />
                <TextInput
                  placeholder="Par"
                  placeholderTextColor={COLORS.textSecondary}
                  style={styles.input}
                  value={newHolePar}
                  onChangeText={setNewHolePar}
                  keyboardType="numeric"
                />
                <TouchableOpacity style={styles.primaryButton} onPress={handleAddCourseHole}>
                  <Text style={styles.primaryButtonText}>Add Course Hole</Text>
                </TouchableOpacity>
              </View>

              {courseHoles.length === 0 ? (
                <Text style={styles.emptyText}>No reusable course holes yet.</Text>
              ) : (
                <>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.holeChipRow}>
                    {courseHoles.map((hole) => {
                      const selected = hole.id === selectedCourseHoleId;
                      return (
                        <TouchableOpacity
                          key={hole.id}
                          testID={`course-hole-chip-${hole.id}`}
                          style={[styles.holeChip, selected && styles.holeChipActive]}
                          onPress={() => setSelectedCourseHoleId(hole.id)}
                        >
                          <Text style={[styles.holeChipTitle, selected && styles.holeChipTitleActive]}>{hole.name}</Text>
                          <Text style={[styles.holeChipMeta, selected && styles.holeChipMetaActive]}>Par {hole.par}</Text>
                        </TouchableOpacity>
                      );
                    })}
                  </ScrollView>

                  {selectedCourseHoleDraft ? (
                    <View style={styles.editorCard}>
                      <View style={styles.editorHeader}>
                        <View>
                          <Text style={styles.cardTitle}>Edit reusable hole</Text>
                          <Text style={styles.cardMeta}>Changes here are the canonical values for this Course Hole.</Text>
                        </View>
                        <View style={styles.badge}>
                          <Text style={styles.badgeText}>{selectedCourseHoleDraft.name || 'Hole'}</Text>
                        </View>
                      </View>

                      <TextInput
                        placeholder="Hole Name"
                        placeholderTextColor={COLORS.textSecondary}
                        style={styles.input}
                        value={String(selectedCourseHoleDraft.name || '')}
                        onChangeText={(value) => updateCourseHoleDraft(selectedCourseHoleDraft.id!, 'name', value)}
                      />
                      <View style={styles.inlineFields}>
                        <TextInput
                          placeholder="Par"
                          placeholderTextColor={COLORS.textSecondary}
                          style={[styles.input, styles.inlineInput]}
                          value={String(selectedCourseHoleDraft.par ?? '')}
                          onChangeText={(value) => updateCourseHoleDraft(selectedCourseHoleDraft.id!, 'par', value)}
                          keyboardType="numeric"
                        />
                        <TextInput
                          placeholder="Distance (m)"
                          placeholderTextColor={COLORS.textSecondary}
                          style={[styles.input, styles.inlineInput]}
                          value={
                            selectedCourseHoleDraft.distance_m !== null &&
                            selectedCourseHoleDraft.distance_m !== undefined
                              ? String(selectedCourseHoleDraft.distance_m)
                              : ''
                          }
                          onChangeText={(value) => updateCourseHoleDraft(selectedCourseHoleDraft.id!, 'distance_m', value)}
                          keyboardType="numeric"
                        />
                      </View>

                      <HoleMapEditor
                        draft={selectedCourseHoleDraft}
                        pickMode={pickMode}
                        onPickModeChange={setPickMode}
                        onCoordinateChange={(field, value) =>
                          updateCourseHoleDraft(selectedCourseHoleDraft.id!, field as keyof CourseHole, value)
                        }
                        onMapPick={handleMapPick}
                        manualVisible={manualCoordinatesOpen}
                        onToggleManual={() => setManualCoordinatesOpen((current) => !current)}
                        testIDPrefix={`course-hole-map-picker-${selectedCourseHoleDraft.id}`}
                      />

                      <TouchableOpacity style={styles.primaryButton} onPress={handleSaveSelectedCourseHole}>
                        <Text style={styles.primaryButtonText}>Save Course Hole</Text>
                      </TouchableOpacity>
                    </View>
                  ) : null}
                </>
              )}
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>LAYOUTS</Text>
              <Text style={styles.sectionBody}>
                Create a playable order from the Course Hole pool, then fine-tune it in the layout editor.
              </Text>

              <View style={styles.addCard}>
                <Text style={styles.cardTitle}>Add New Layout</Text>
                <TextInput
                  placeholder="New Layout Name"
                  placeholderTextColor={COLORS.textSecondary}
                  style={styles.input}
                  value={newLayoutName}
                  onChangeText={setNewLayoutName}
                />
                {layouts.length > 0 ? (
                  <>
                    <Text style={styles.fieldLabel}>Start from existing layout</Text>
                    <View style={styles.optionRow}>
                      <TouchableOpacity
                        style={[styles.optionChip, selectedCloneLayoutId === null && styles.optionChipActive]}
                        onPress={() => setSelectedCloneLayoutId(null)}
                      >
                        <Text style={[styles.optionChipText, selectedCloneLayoutId === null && styles.optionChipTextActive]}>
                          Empty
                        </Text>
                      </TouchableOpacity>
                      {layouts.map((layout) => (
                        <TouchableOpacity
                          key={layout.id}
                          style={[styles.optionChip, selectedCloneLayoutId === layout.id && styles.optionChipActive]}
                          onPress={() => setSelectedCloneLayoutId(layout.id)}
                        >
                          <Text
                            style={[
                              styles.optionChipText,
                              selectedCloneLayoutId === layout.id && styles.optionChipTextActive,
                            ]}
                          >
                            {layout.name}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </>
                ) : null}

                <TouchableOpacity style={styles.primaryButton} onPress={handleAddLayout}>
                  <Text style={styles.primaryButtonText}>Add Layout</Text>
                </TouchableOpacity>
              </View>

              {layouts.length === 0 ? (
                <Text style={styles.emptyText}>No layouts available.</Text>
              ) : (
                layouts.map((layout) => (
                  <TouchableOpacity
                    key={layout.id}
                    style={styles.listCard}
                    onPress={() =>
                      navigation.navigate('ModeratorLayoutDetails', {
                        layoutId: layout.id,
                        layoutName: layout.name,
                        courseId,
                      })
                    }
                  >
                    <View>
                      <Text style={styles.listCardTitle}>{layout.name}</Text>
                      <Text style={styles.listCardMeta}>{layout.hole_count} holes</Text>
                    </View>
                    <Ionicons name="chevron-forward" size={20} color={COLORS.textSecondary} />
                  </TouchableOpacity>
                ))
              )}
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>COURSE MAPS</Text>
              <Text style={styles.sectionBody}>
                Metadata only for now. Keep it lightweight: name and built-in style.
              </Text>

              <View style={styles.addCard}>
                <Text style={styles.cardTitle}>Add course map</Text>
                <TextInput
                  placeholder="Map Name"
                  placeholderTextColor={COLORS.textSecondary}
                  style={styles.input}
                  value={newMapName}
                  onChangeText={setNewMapName}
                />
                <View style={styles.optionRow}>
                  {MAP_STYLE_OPTIONS.map((styleKey) => (
                    <TouchableOpacity
                      key={styleKey}
                      style={[styles.optionChip, newMapStyleKey === styleKey && styles.optionChipActive]}
                      onPress={() => setNewMapStyleKey(styleKey)}
                    >
                      <Text style={[styles.optionChipText, newMapStyleKey === styleKey && styles.optionChipTextActive]}>
                        {styleKey}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
                <TouchableOpacity style={styles.primaryButton} onPress={handleAddMap}>
                  <Text style={styles.primaryButtonText}>Add Map</Text>
                </TouchableOpacity>
              </View>

              {courseMaps.length === 0 ? (
                <Text style={styles.emptyText}>No maps available.</Text>
              ) : (
                courseMaps.map((map) => (
                  <View key={map.id} style={styles.listCard}>
                    <View>
                      <Text style={styles.listCardTitle}>{map.name}</Text>
                      <Text style={styles.listCardMeta}>{map.style_key} style</Text>
                    </View>
                    <Ionicons name="map-outline" size={20} color={COLORS.textSecondary} />
                  </View>
                ))
              )}
            </View>
          </>
        )}
      </ScrollView>
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
    paddingHorizontal: 18,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.06)',
  },
  backButton: {
    padding: 8,
    marginLeft: -8,
  },
  headerCenter: {
    flex: 1,
    paddingHorizontal: 10,
  },
  eyebrow: {
    color: COLORS.textSecondary,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1,
    marginBottom: 2,
  },
  title: {
    color: COLORS.text,
    fontSize: 22,
    fontWeight: '700',
  },
  headerSpacer: {
    width: 40,
  },
  scrollContent: {
    padding: 18,
    paddingBottom: 40,
    gap: 22,
  },
  loader: {
    marginTop: 40,
  },
  section: {
    gap: 12,
  },
  sectionTitle: {
    color: COLORS.text,
    fontSize: 18,
    fontWeight: '700',
  },
  sectionBody: {
    color: COLORS.textSecondary,
    lineHeight: 20,
  },
  addCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 8,
    padding: 14,
    borderWidth: 1,
    borderColor: COLORS.borderDark,
    gap: 10,
  },
  editorCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 8,
    padding: 14,
    borderWidth: 1,
    borderColor: COLORS.borderDark,
    gap: 12,
  },
  editorHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  cardTitle: {
    color: COLORS.text,
    fontSize: 16,
    fontWeight: '700',
  },
  cardMeta: {
    color: COLORS.textSecondary,
    marginTop: 4,
    maxWidth: 220,
  },
  badge: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(144, 202, 249, 0.12)',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  badgeText: {
    color: COLORS.primary,
    fontWeight: '700',
    fontSize: 12,
  },
  input: {
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.borderDark,
    color: COLORS.text,
    paddingHorizontal: 12,
    paddingVertical: 11,
  },
  inlineFields: {
    flexDirection: 'row',
    gap: 10,
  },
  inlineInput: {
    flex: 1,
  },
  primaryButton: {
    backgroundColor: COLORS.primary,
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
  },
  primaryButtonText: {
    color: COLORS.background,
    fontWeight: '800',
  },
  emptyText: {
    color: COLORS.textSecondary,
  },
  holeChipRow: {
    gap: 10,
    paddingVertical: 2,
  },
  holeChip: {
    minWidth: 120,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.borderDark,
  },
  holeChipActive: {
    backgroundColor: 'rgba(144, 202, 249, 0.12)',
    borderColor: COLORS.primary,
  },
  holeChipTitle: {
    color: COLORS.text,
    fontWeight: '700',
    marginBottom: 4,
  },
  holeChipTitleActive: {
    color: COLORS.text,
  },
  holeChipMeta: {
    color: COLORS.textSecondary,
    fontSize: 12,
  },
  holeChipMetaActive: {
    color: COLORS.primary,
  },
  fieldLabel: {
    color: COLORS.textSecondary,
    fontWeight: '600',
  },
  optionRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  optionChip: {
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1,
    borderColor: COLORS.borderDark,
  },
  optionChipActive: {
    backgroundColor: 'rgba(144, 202, 249, 0.12)',
    borderColor: COLORS.primary,
  },
  optionChipText: {
    color: COLORS.textSecondary,
    fontWeight: '600',
  },
  optionChipTextActive: {
    color: COLORS.text,
  },
  listCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.borderDark,
    padding: 14,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  listCardTitle: {
    color: COLORS.text,
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 4,
  },
  listCardMeta: {
    color: COLORS.textSecondary,
  },
});
