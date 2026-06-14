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

interface PlayableHole {
  id: string;
  hole_number: number;
  par: number;
  distance_m?: number | null;
  tee_latitude?: number | null;
  tee_longitude?: number | null;
  basket_latitude?: number | null;
  basket_longitude?: number | null;
}

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

interface LayoutHole {
  id: string;
  layout_id: string;
  course_hole_id: string;
  position: number;
}

type PickMode = 'tee' | 'basket';

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

export function ModeratorLayoutDetailsScreen({ route, navigation }: any) {
  const { layoutId, layoutName, courseId } = route.params;

  const [layoutTitle, setLayoutTitle] = useState(layoutName);
  const [layoutTitleDraft, setLayoutTitleDraft] = useState(layoutName);
  const [holes, setHoles] = useState<PlayableHole[]>([]);
  const [courseHoles, setCourseHoles] = useState<CourseHole[]>([]);
  const [layoutHoles, setLayoutHoles] = useState<LayoutHole[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [selectedCourseHoleId, setSelectedCourseHoleId] = useState<string | null>(null);
  const [pickMode, setPickMode] = useState<PickMode>('tee');
  const [manualCoordinatesOpen, setManualCoordinatesOpen] = useState(false);
  const [coordinateDrafts, setCoordinateDrafts] = useState<Record<string, Partial<CourseHole>>>({});

  useEffect(() => {
    fetchLayoutEditor();
  }, [layoutId, courseId]);

  const sortedLayoutHoles = useMemo(
    () => [...layoutHoles].sort((first, second) => first.position - second.position),
    [layoutHoles]
  );
  const includedCourseHoleIds = new Set(layoutHoles.map((layoutHole) => layoutHole.course_hole_id));
  const layoutHoleByCourseHoleId = new Map(layoutHoles.map((layoutHole) => [layoutHole.course_hole_id, layoutHole]));

  const includedCourseHoles = sortedLayoutHoles
    .map((layoutHole) => courseHoles.find((hole) => hole.id === layoutHole.course_hole_id))
    .filter(Boolean) as CourseHole[];
  const availableCourseHoles = courseHoles.filter((hole) => !includedCourseHoleIds.has(hole.id));

  const selectedCourseHole = useMemo(() => {
    if (!selectedCourseHoleId) return null;
    return courseHoles.find((hole) => hole.id === selectedCourseHoleId) || null;
  }, [courseHoles, selectedCourseHoleId]);

  const selectedDraft = selectedCourseHole
    ? {
        ...selectedCourseHole,
        ...(coordinateDrafts[selectedCourseHole.id] || {}),
      }
    : null;

  const fetchLayoutEditor = async () => {
    try {
      setIsLoading(true);
      const { data: holeData, error: holeError } = await supabase
        .from('holes')
        .select('*')
        .eq('layout_id', layoutId)
        .order('hole_number');
      if (holeError) throw holeError;
      setHoles(holeData || []);

      if (courseId) {
        const { data: courseHoleData, error: courseHoleError } = await supabase
          .from('course_holes')
          .select('*')
          .eq('course_id', courseId)
          .order('name');
        if (courseHoleError) throw courseHoleError;

        const layoutHoleQuery: any = supabase.from('layout_holes');
        if (typeof layoutHoleQuery.select !== 'function') {
          throw new Error('Layout hole query unavailable.');
        }
        const selection = layoutHoleQuery.select('*');
        if (typeof selection.eq !== 'function') {
          throw new Error('Layout hole filter unavailable.');
        }
        const { data: layoutHoleData, error: layoutHoleError } = await selection.eq('layout_id', layoutId);
        if (layoutHoleError) throw layoutHoleError;

        const nextCourseHoles = courseHoleData || [];
        const nextLayoutHoles = (layoutHoleData || []) as LayoutHole[];

        setCourseHoles(nextCourseHoles);
        setLayoutHoles(nextLayoutHoles);

        const availableIds = new Set(nextCourseHoles.map((hole) => hole.id));
        const preferredId = nextLayoutHoles
          .sort((first, second) => first.position - second.position)
          .find((layoutHole) => availableIds.has(layoutHole.course_hole_id))?.course_hole_id;

        setSelectedCourseHoleId((current) => {
          if (current && availableIds.has(current)) return current;
          return preferredId || nextCourseHoles[0]?.id || null;
        });
      }
    } catch (err: any) {
      Alert.alert('Error', err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const updateDraft = (courseHoleId: string, field: keyof CourseHole, value: string) => {
    setCoordinateDrafts((prev) => {
      const current = courseHoles.find((hole) => hole.id === courseHoleId) || {};
      return {
        ...prev,
        [courseHoleId]: {
          ...current,
          ...prev[courseHoleId],
          [field]: value,
        },
      };
    });
  };

  const handleMapPick = (mode: PickMode, latitude: number, longitude: number) => {
    if (!selectedCourseHole) return;

    setCoordinateDrafts((prev) => ({
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

  const handleSaveLayoutName = async () => {
    const nextName = layoutTitleDraft.trim();
    if (!nextName) {
      Alert.alert('Error', 'Please provide a layout name.');
      return;
    }

    try {
      const { error } = await supabase.from('layouts').update({ name: nextName }).eq('id', layoutId);
      if (error) throw error;
      setLayoutTitle(nextName);
      Alert.alert('Saved', 'Layout name updated.');
    } catch (err: any) {
      Alert.alert('Error', err.message);
    }
  };

  const handleAddHole = async () => {
    try {
      const nextHoleNumber = holes.length > 0 ? Math.max(...holes.map((hole) => hole.hole_number)) + 1 : 1;
      const { error } = await supabase.from('holes').insert({
        layout_id: layoutId,
        hole_number: nextHoleNumber,
        par: 3,
      });
      if (error) throw error;

      await supabase.from('layouts').update({ hole_count: holes.length + 1 }).eq('id', layoutId);
      await fetchLayoutEditor();
    } catch (err: any) {
      Alert.alert('Error', err.message);
    }
  };

  const handleDeleteHole = async (holeId: string) => {
    try {
      const { error } = await supabase.from('holes').delete().eq('id', holeId);
      if (error) throw error;

      await supabase
        .from('layouts')
        .update({ hole_count: Math.max(0, holes.length - 1) })
        .eq('id', layoutId);
      await fetchLayoutEditor();
    } catch (err: any) {
      Alert.alert('Error', err.message);
    }
  };

  const handleSavePlayableHole = async (hole: PlayableHole) => {
    try {
      const payload = {
        par: toNullableNumber(hole.par) || 3,
        distance_m: toNullableNumber(hole.distance_m),
        tee_latitude: toNullableNumber(hole.tee_latitude),
        tee_longitude: toNullableNumber(hole.tee_longitude),
        basket_latitude: toNullableNumber(hole.basket_latitude),
        basket_longitude: toNullableNumber(hole.basket_longitude),
      };

      const { error } = await supabase.from('holes').update(payload).eq('id', hole.id);
      if (error) throw error;

      Alert.alert('Saved', `Layout hole ${hole.hole_number} updated.`);
      await fetchLayoutEditor();
    } catch (err: any) {
      Alert.alert('Error', err.message);
    }
  };

  const handleAddCourseHoleToLayout = async (courseHole: CourseHole) => {
    try {
      const nextPosition = layoutHoles.length > 0 ? Math.max(...layoutHoles.map((hole) => hole.position)) + 1 : 1;
      const { error } = await supabase.from('layout_holes').insert({
        layout_id: layoutId,
        course_hole_id: courseHole.id,
        position: nextPosition,
      });
      if (error) throw error;

      const { error: playableError } = await supabase.from('holes').insert({
        layout_id: layoutId,
        hole_number: nextPosition,
        par: courseHole.par,
        distance_m: courseHole.distance_m || null,
        tee_latitude: courseHole.tee_latitude || null,
        tee_longitude: courseHole.tee_longitude || null,
        basket_latitude: courseHole.basket_latitude || null,
        basket_longitude: courseHole.basket_longitude || null,
      });
      if (playableError) throw playableError;

      await supabase.from('layouts').update({ hole_count: layoutHoles.length + 1 }).eq('id', layoutId);
      await fetchLayoutEditor();
      setSelectedCourseHoleId(courseHole.id);
    } catch (err: any) {
      Alert.alert('Error', err.message);
    }
  };

  const handleMoveLayoutHole = async (courseHoleId: string, direction: -1 | 1) => {
    const current = layoutHoleByCourseHoleId.get(courseHoleId);
    if (!current) return;

    const currentIndex = sortedLayoutHoles.findIndex((layoutHole) => layoutHole.id === current.id);
    const swapWith = sortedLayoutHoles[currentIndex + direction];
    if (!swapWith) return;

    const currentPlayableHole = holes.find((hole) => hole.hole_number === current.position);
    const swapPlayableHole = holes.find((hole) => hole.hole_number === swapWith.position);

    try {
      await supabase.from('layout_holes').update({ position: swapWith.position }).eq('id', current.id);
      await supabase.from('layout_holes').update({ position: current.position }).eq('id', swapWith.id);

      if (currentPlayableHole && swapPlayableHole) {
        await supabase.from('holes').update({ hole_number: swapWith.position }).eq('id', currentPlayableHole.id);
        await supabase.from('holes').update({ hole_number: current.position }).eq('id', swapPlayableHole.id);
      }

      await fetchLayoutEditor();
    } catch (err: any) {
      Alert.alert('Error', err.message);
    }
  };

  const handleRemoveCourseHoleFromLayout = async (courseHoleId: string) => {
    const current = layoutHoleByCourseHoleId.get(courseHoleId);
    if (!current) return;

    const playableHole = holes.find((hole) => hole.hole_number === current.position);
    const trailingLayoutHoles = sortedLayoutHoles.filter((layoutHole) => layoutHole.position > current.position);
    const trailingPlayableHoles = holes.filter((hole) => hole.hole_number > current.position);

    try {
      await supabase.from('layout_holes').delete().eq('id', current.id);
      if (playableHole) {
        await supabase.from('holes').delete().eq('id', playableHole.id);
      }

      for (const layoutHole of trailingLayoutHoles) {
        await supabase.from('layout_holes').update({ position: layoutHole.position - 1 }).eq('id', layoutHole.id);
      }
      for (const hole of trailingPlayableHoles) {
        await supabase.from('holes').update({ hole_number: hole.hole_number - 1 }).eq('id', hole.id);
      }

      await supabase.from('layouts').update({ hole_count: Math.max(0, layoutHoles.length - 1) }).eq('id', layoutId);
      await fetchLayoutEditor();
    } catch (err: any) {
      Alert.alert('Error', err.message);
    }
  };

  const handleSaveSelectedCourseHole = async () => {
    if (!selectedCourseHole || !selectedDraft) return;
    const layoutHole = layoutHoleByCourseHoleId.get(selectedCourseHole.id);

    const payload = {
      name: String(selectedDraft.name || '').trim() || selectedCourseHole.name,
      par: toNullableNumber(selectedDraft.par) || 3,
      distance_m: toNullableNumber(selectedDraft.distance_m),
      tee_latitude: toNullableNumber(selectedDraft.tee_latitude),
      tee_longitude: toNullableNumber(selectedDraft.tee_longitude),
      basket_latitude: toNullableNumber(selectedDraft.basket_latitude),
      basket_longitude: toNullableNumber(selectedDraft.basket_longitude),
    };

    try {
      const { error } = await supabase.from('course_holes').update(payload).eq('id', selectedCourseHole.id);
      if (error) throw error;

      if (layoutHole) {
        const playableHole = holes.find((hole) => hole.hole_number === layoutHole.position);
        if (playableHole) {
          await supabase
            .from('holes')
            .update({
              par: payload.par,
              distance_m: payload.distance_m,
              tee_latitude: payload.tee_latitude,
              tee_longitude: payload.tee_longitude,
              basket_latitude: payload.basket_latitude,
              basket_longitude: payload.basket_longitude,
            })
            .eq('id', playableHole.id);
        }
      }

      setCoordinateDrafts((prev) => {
        const next = { ...prev };
        delete next[selectedCourseHole.id];
        return next;
      });
      await fetchLayoutEditor();
      Alert.alert('Saved', `${payload.name} updated.`);
    } catch (err: any) {
      Alert.alert('Error', err.message);
    }
  };

  const updatePlayableHole = (holeId: string, field: keyof PlayableHole, value: string) => {
    setHoles((prev) => prev.map((hole) => (hole.id === holeId ? { ...hole, [field]: value } : hole)));
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={COLORS.text} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.eyebrow}>LAYOUT EDITOR</Text>
          <Text style={styles.title}>{layoutTitle}</Text>
        </View>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {isLoading ? (
          <ActivityIndicator size="large" color={COLORS.primary} style={styles.loader} />
        ) : (
          <>
            <View style={styles.editorCard}>
              <Text style={styles.sectionTitle}>LAYOUT DETAILS</Text>
              <TextInput
                placeholder="Layout name"
                placeholderTextColor={COLORS.textSecondary}
                style={styles.input}
                value={layoutTitleDraft}
                onChangeText={setLayoutTitleDraft}
              />
              <View style={styles.summaryRow}>
                <View style={styles.summaryBadge}>
                  <Text style={styles.summaryBadgeText}>{sortedLayoutHoles.length} selected holes</Text>
                </View>
                <TouchableOpacity style={styles.primaryButtonCompact} onPress={handleSaveLayoutName}>
                  <Text style={styles.primaryButtonText}>Save Name</Text>
                </TouchableOpacity>
              </View>
            </View>

            {selectedDraft ? (
              <View style={styles.editorCard}>
                <Text style={styles.sectionTitle}>MAP EDITOR</Text>
                <Text style={styles.sectionBody}>
                  Pick one included Course Hole and place the tee and basket markers on the map.
                </Text>

                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.holeChipRow}>
                  {includedCourseHoles.map((hole) => {
                    const selected = hole.id === selectedCourseHoleId;
                    const layoutHole = layoutHoleByCourseHoleId.get(hole.id);
                    return (
                      <TouchableOpacity
                        key={hole.id}
                        testID={`layout-hole-chip-${hole.id}`}
                        style={[styles.holeChip, selected && styles.holeChipActive]}
                        onPress={() => setSelectedCourseHoleId(hole.id)}
                      >
                        <Text style={[styles.holeChipTitle, selected && styles.holeChipTitleActive]}>{hole.name}</Text>
                        <Text style={[styles.holeChipMeta, selected && styles.holeChipMetaActive]}>
                          #{layoutHole?.position ?? '-'} • Par {hole.par}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>

                <View style={styles.inlineFields}>
                  <TextInput
                    placeholder="Hole Name"
                    placeholderTextColor={COLORS.textSecondary}
                    style={[styles.input, styles.inlineInput]}
                    value={String(selectedDraft.name || '')}
                    onChangeText={(value) => updateDraft(selectedDraft.id!, 'name', value)}
                  />
                  <TextInput
                    placeholder="Par"
                    placeholderTextColor={COLORS.textSecondary}
                    style={[styles.input, styles.inlineInputSmall]}
                    value={String(selectedDraft.par ?? '')}
                    onChangeText={(value) => updateDraft(selectedDraft.id!, 'par', value)}
                    keyboardType="numeric"
                  />
                </View>
                <TextInput
                  placeholder="Distance (m)"
                  placeholderTextColor={COLORS.textSecondary}
                  style={styles.input}
                  value={selectedDraft.distance_m !== null && selectedDraft.distance_m !== undefined ? String(selectedDraft.distance_m) : ''}
                  onChangeText={(value) => updateDraft(selectedDraft.id!, 'distance_m', value)}
                  keyboardType="numeric"
                />

                <HoleMapEditor
                  draft={selectedDraft}
                  pickMode={pickMode}
                  onPickModeChange={setPickMode}
                  onCoordinateChange={(field, value) => updateDraft(selectedDraft.id!, field as keyof CourseHole, value)}
                  onMapPick={handleMapPick}
                  manualVisible={manualCoordinatesOpen}
                  onToggleManual={() => setManualCoordinatesOpen((current) => !current)}
                  testIDPrefix={`hole-map-picker-${selectedDraft.id}`}
                />

                <TouchableOpacity style={styles.primaryButton} onPress={handleSaveSelectedCourseHole}>
                  <Text style={styles.primaryButtonText}>Save Course Hole Coordinates</Text>
                </TouchableOpacity>
              </View>
            ) : null}

            <View style={styles.sectionBlock}>
              <View style={styles.blockHeader}>
                <Text style={styles.sectionTitle}>INCLUDED HOLES</Text>
                <View style={styles.summaryBadge}>
                  <Text style={styles.summaryBadgeText}>{sortedLayoutHoles.length} in layout</Text>
                </View>
              </View>
              {includedCourseHoles.length === 0 ? (
                <Text style={styles.emptyText}>No Course Holes selected yet.</Text>
              ) : (
                includedCourseHoles.map((courseHole) => {
                  const layoutHole = layoutHoleByCourseHoleId.get(courseHole.id)!;
                  return (
                    <View key={courseHole.id} style={styles.listCard}>
                      <TouchableOpacity
                        style={styles.listCardTextWrap}
                        onPress={() => setSelectedCourseHoleId(courseHole.id)}
                      >
                        <Text style={styles.listCardTitle}>{courseHole.name}</Text>
                        <Text style={styles.listCardMeta}>Included #{layoutHole.position}</Text>
                      </TouchableOpacity>
                      <View style={styles.actionPillRow}>
                        <TouchableOpacity
                          onPress={() => handleMoveLayoutHole(courseHole.id, -1)}
                          style={styles.actionPill}
                        >
                          <Text style={styles.actionPillText}>Up</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          onPress={() => handleMoveLayoutHole(courseHole.id, 1)}
                          style={styles.actionPill}
                        >
                          <Text style={styles.actionPillText}>Down</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          onPress={() => handleRemoveCourseHoleFromLayout(courseHole.id)}
                          style={[styles.actionPill, styles.dangerPill]}
                        >
                          <Text style={styles.actionPillText}>Remove</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  );
                })
              )}
            </View>

            <View style={styles.sectionBlock}>
              <Text style={styles.sectionTitle}>AVAILABLE COURSE HOLES</Text>
              {availableCourseHoles.length === 0 ? (
                <Text style={styles.emptyText}>Everything in the Course Hole pool is already used in this layout.</Text>
              ) : (
                availableCourseHoles.map((courseHole) => (
                  <View key={courseHole.id} style={styles.listCard}>
                    <View style={styles.listCardTextWrap}>
                      <Text style={styles.listCardTitle}>{courseHole.name}</Text>
                      <Text style={styles.listCardMeta}>Excluded • Par {courseHole.par}</Text>
                    </View>
                    <TouchableOpacity
                      onPress={() => handleAddCourseHoleToLayout(courseHole)}
                      style={styles.primaryButtonCompact}
                    >
                      <Text style={styles.primaryButtonText}>Add to Layout</Text>
                    </TouchableOpacity>
                  </View>
                ))
              )}
            </View>

            <View style={styles.sectionBlock}>
              <View style={styles.blockHeader}>
                <Text style={styles.sectionTitle}>PLAYABLE HOLES</Text>
                <TouchableOpacity style={styles.primaryButtonCompact} onPress={handleAddHole}>
                  <Text style={styles.primaryButtonText}>Add Hole</Text>
                </TouchableOpacity>
              </View>
              <Text style={styles.sectionBody}>
                These are the actual playable `holes` rows used by Matches today. Keep them aligned with the selected Course Holes.
              </Text>

              {holes.length === 0 ? (
                <Text style={styles.emptyText}>No playable holes in this layout.</Text>
              ) : (
                holes.map((hole) => (
                  <View key={hole.id} style={styles.editorCard}>
                    <View style={styles.blockHeader}>
                      <View>
                        <Text style={styles.listCardTitle}>Layout Hole {hole.hole_number}</Text>
                        <Text style={styles.listCardMeta}>Direct playable fallback editor</Text>
                      </View>
                      <TouchableOpacity onPress={() => handleDeleteHole(hole.id)} style={[styles.actionPill, styles.dangerPill]}>
                        <Text style={styles.actionPillText}>Delete</Text>
                      </TouchableOpacity>
                    </View>

                    <View style={styles.inlineFields}>
                      <TextInput
                        placeholder="Par"
                        placeholderTextColor={COLORS.textSecondary}
                        style={[styles.input, styles.inlineInputSmall]}
                        value={String(hole.par || '')}
                        onChangeText={(value) => updatePlayableHole(hole.id, 'par', value)}
                        keyboardType="numeric"
                      />
                      <TextInput
                        placeholder="Distance (m)"
                        placeholderTextColor={COLORS.textSecondary}
                        style={[styles.input, styles.inlineInput]}
                        value={hole.distance_m !== null && hole.distance_m !== undefined ? String(hole.distance_m) : ''}
                        onChangeText={(value) => updatePlayableHole(hole.id, 'distance_m', value)}
                        keyboardType="numeric"
                      />
                    </View>

                    <TouchableOpacity style={styles.primaryButton} onPress={() => handleSavePlayableHole(hole)}>
                      <Text style={styles.primaryButtonText}>Save</Text>
                    </TouchableOpacity>
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
    gap: 18,
  },
  loader: {
    marginTop: 40,
  },
  editorCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.borderDark,
    padding: 14,
    gap: 12,
  },
  sectionBlock: {
    gap: 12,
  },
  blockHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
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
  inlineInputSmall: {
    width: 90,
  },
  primaryButton: {
    backgroundColor: COLORS.primary,
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
  },
  primaryButtonCompact: {
    backgroundColor: COLORS.primary,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 9,
    alignItems: 'center',
  },
  primaryButtonText: {
    color: COLORS.background,
    fontWeight: '800',
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
  },
  summaryBadge: {
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1,
    borderColor: COLORS.borderDark,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  summaryBadgeText: {
    color: COLORS.textSecondary,
    fontWeight: '600',
  },
  emptyText: {
    color: COLORS.textSecondary,
  },
  holeChipRow: {
    gap: 10,
    paddingVertical: 2,
  },
  holeChip: {
    minWidth: 130,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: COLORS.background,
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
  listCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.borderDark,
    padding: 14,
    gap: 12,
  },
  listCardTextWrap: {
    flex: 1,
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
  actionPillRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  actionPill: {
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1,
    borderColor: COLORS.borderDark,
  },
  dangerPill: {
    borderColor: '#8B4141',
    backgroundColor: 'rgba(255, 82, 82, 0.08)',
  },
  actionPillText: {
    color: COLORS.text,
    fontWeight: '600',
  },
});
