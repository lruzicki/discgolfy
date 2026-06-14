import { supabase } from '../lib/supabase';

interface LayoutRow {
  id: string;
  hole_count: number;
}

interface LegacyHoleRow {
  id: string;
  hole_number: number;
  par: number;
  distance_m?: number | null;
  tee_latitude?: number | null;
  tee_longitude?: number | null;
  basket_latitude?: number | null;
  basket_longitude?: number | null;
}

interface CourseHoleRow {
  id: string;
  hole_number: number;
  name: string;
  par: number;
  distance_m?: number | null;
  tee_latitude?: number | null;
  tee_longitude?: number | null;
  basket_latitude?: number | null;
  basket_longitude?: number | null;
}

interface LayoutHoleRow {
  id: string;
  layout_id: string;
  course_hole_id: string;
  position: number;
}

interface SupabaseErrorLike {
  code?: string;
  message?: string;
  details?: string;
}

type CanonicalHoleSeed = {
  hole_number: number;
  par: number;
  distance_m: number | null;
  tee_latitude: number | null;
  tee_longitude: number | null;
  basket_latitude: number | null;
  basket_longitude: number | null;
};

async function fetchLegacyLayoutHoles(layoutId: string) {
  const { data, error } = await supabase
    .from('holes')
    .select('*')
    .eq('layout_id', layoutId)
    .order('hole_number');

  if (error) {
    throw error;
  }

  return (data || []) as LegacyHoleRow[];
}

async function fetchCourseLayouts(courseId: string) {
  const { data, error } = await supabase
    .from('layouts')
    .select('id, hole_count')
    .eq('course_id', courseId)
    .order('name');

  if (error) {
    throw error;
  }

  return (data || []) as LayoutRow[];
}

async function fetchCourseHoles(courseId: string) {
  const { data, error } = await supabase
    .from('course_holes')
    .select('*')
    .eq('course_id', courseId)
    .order('hole_number');

  if (error) {
    throw error;
  }

  return (data || []) as CourseHoleRow[];
}

async function fetchLayoutHoleLinks(layoutId: string) {
  const layoutHoleQuery: any = supabase.from('layout_holes');
  if (typeof layoutHoleQuery.select !== 'function') {
    throw new Error('Layout hole query unavailable.');
  }

  const selection = layoutHoleQuery.select('*');
  if (typeof selection.eq !== 'function') {
    throw new Error('Layout hole filter unavailable.');
  }

  const { data, error } = await selection.eq('layout_id', layoutId);
  if (error) {
    throw error;
  }

  return (data || []) as LayoutHoleRow[];
}

function pickNullableNumber(...values: Array<number | null | undefined>) {
  for (const value of values) {
    if (typeof value === 'number' && Number.isFinite(value)) {
      return value;
    }
  }

  return null;
}

function buildCanonicalSeeds(legacyHolesByLayout: Map<string, LegacyHoleRow[]>) {
  const canonicalByHoleNumber = new Map<number, CanonicalHoleSeed>();

  for (const legacyHoles of legacyHolesByLayout.values()) {
    for (const hole of legacyHoles) {
      const existing = canonicalByHoleNumber.get(hole.hole_number);
      canonicalByHoleNumber.set(hole.hole_number, {
        hole_number: hole.hole_number,
        par: hole.par ?? existing?.par ?? 3,
        distance_m: pickNullableNumber(existing?.distance_m, hole.distance_m),
        tee_latitude: pickNullableNumber(existing?.tee_latitude, hole.tee_latitude),
        tee_longitude: pickNullableNumber(existing?.tee_longitude, hole.tee_longitude),
        basket_latitude: pickNullableNumber(existing?.basket_latitude, hole.basket_latitude),
        basket_longitude: pickNullableNumber(existing?.basket_longitude, hole.basket_longitude),
      });
    }
  }

  return [...canonicalByHoleNumber.values()].sort((first, second) => first.hole_number - second.hole_number);
}

function buildCourseHoleUpdate(existing: CourseHoleRow, canonical: CanonicalHoleSeed) {
  const next = {
    name: `Hole ${canonical.hole_number}`,
    par: canonical.par,
    distance_m: canonical.distance_m,
    tee_latitude: canonical.tee_latitude,
    tee_longitude: canonical.tee_longitude,
    basket_latitude: canonical.basket_latitude,
    basket_longitude: canonical.basket_longitude,
  };

  if (
    existing.name === next.name &&
    existing.par === next.par &&
    (existing.distance_m ?? null) === next.distance_m &&
    (existing.tee_latitude ?? null) === next.tee_latitude &&
    (existing.tee_longitude ?? null) === next.tee_longitude &&
    (existing.basket_latitude ?? null) === next.basket_latitude &&
    (existing.basket_longitude ?? null) === next.basket_longitude
  ) {
    return null;
  }

  return next;
}

function isUniqueViolation(error: SupabaseErrorLike | null | undefined, constraintName: string) {
  if (!error || error.code !== '23505') {
    return false;
  }

  const haystack = `${error.message || ''} ${error.details || ''}`.toLowerCase();
  return haystack.includes(constraintName.toLowerCase());
}

export async function ensureCanonicalCourseData(courseId: string, preferredLayoutId?: string | null) {
  const layouts = await fetchCourseLayouts(courseId);
  if (layouts.length === 0) {
    return;
  }

  const orderedLayouts = preferredLayoutId
    ? [
        ...layouts.filter((layout) => layout.id === preferredLayoutId),
        ...layouts.filter((layout) => layout.id !== preferredLayoutId),
      ]
    : layouts;

  const legacyHolesByLayout = new Map<string, LegacyHoleRow[]>();
  for (const layout of orderedLayouts) {
    legacyHolesByLayout.set(layout.id, await fetchLegacyLayoutHoles(layout.id));
  }

  const canonicalSeeds = buildCanonicalSeeds(legacyHolesByLayout);
  if (canonicalSeeds.length === 0) {
    return;
  }

  let courseHoles = await fetchCourseHoles(courseId);
  const courseHoleByNumber = new Map(courseHoles.map((hole) => [hole.hole_number, hole]));

  const missingCourseHoles = canonicalSeeds
    .filter((hole) => !courseHoleByNumber.has(hole.hole_number))
    .map((hole) => ({
      course_id: courseId,
      hole_number: hole.hole_number,
      name: `Hole ${hole.hole_number}`,
      par: hole.par,
      distance_m: hole.distance_m,
      tee_latitude: hole.tee_latitude,
      tee_longitude: hole.tee_longitude,
      basket_latitude: hole.basket_latitude,
      basket_longitude: hole.basket_longitude,
    }));

  if (missingCourseHoles.length > 0) {
    const insert = supabase.from('course_holes').insert(missingCourseHoles);

    if (typeof (insert as any).select === 'function') {
      const { error } = await (insert as any).select();
      if (error && !isUniqueViolation(error, 'course_holes_course_id_hole_number_key')) {
        throw error;
      }
    } else {
      const { error } = await insert;
      if (error && !isUniqueViolation(error, 'course_holes_course_id_hole_number_key')) {
        throw error;
      }
    }
  }

  courseHoles = await fetchCourseHoles(courseId);

  for (const canonical of canonicalSeeds) {
    const existing = courseHoles.find((hole) => hole.hole_number === canonical.hole_number);
    if (!existing) {
      continue;
    }

    const updatePayload = buildCourseHoleUpdate(existing, canonical);
    if (!updatePayload) {
      continue;
    }

    const { error } = await supabase.from('course_holes').update(updatePayload).eq('id', existing.id);
    if (error) {
      throw error;
    }
  }

  courseHoles = await fetchCourseHoles(courseId);
  const courseHoleIdByNumber = new Map(courseHoles.map((hole) => [hole.hole_number, hole.id]));

  for (const layout of orderedLayouts) {
    const legacyHoles = legacyHolesByLayout.get(layout.id) || [];
    if (legacyHoles.length === 0) {
      continue;
    }

    const existingLinks = await fetchLayoutHoleLinks(layout.id);
    const existingCourseHoleIds = new Set(existingLinks.map((link) => link.course_hole_id));

    const missingLinks = legacyHoles
      .map((hole) => {
        const courseHoleId = courseHoleIdByNumber.get(hole.hole_number);
        if (!courseHoleId || existingCourseHoleIds.has(courseHoleId)) {
          return null;
        }

        return {
          layout_id: layout.id,
          course_hole_id: courseHoleId,
          position: hole.hole_number,
        };
      })
      .filter(Boolean);

    if (missingLinks.length > 0) {
      const { error } = await supabase.from('layout_holes').insert(missingLinks);
      if (error && !isUniqueViolation(error, 'layout_holes_layout_id_course_hole_id_key')) {
        throw error;
      }
    }

    if (layout.hole_count !== legacyHoles.length) {
      const { error } = await supabase.from('layouts').update({ hole_count: legacyHoles.length }).eq('id', layout.id);
      if (error) {
        throw error;
      }
    }
  }
}
