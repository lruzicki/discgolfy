import { ThrowType } from '../constants/throwTypes';

export interface LongestThrowRow {
  id?: string;
  distance_m: number | null;
  created_at?: string | null;
  throw_type?: ThrowType | null;
  discs?: { name?: string | null } | null;
  holes?: {
    hole_number?: number | null;
    layouts?: {
      name?: string | null;
      courses?: { name?: string | null } | null;
    } | null;
  } | null;
  matches?: {
    status?: string | null;
    date_played?: string | null;
  } | null;
}

export interface LongestThrowItem {
  id: string;
  distance_m: number;
  discName: string;
  courseLayout: string;
  holeNumber: number | null;
  date: string;
  throwType: ThrowType | null;
}

const isCompleted = (status?: string | null) => status === 'completed';

export function buildLongestThrows(rows: LongestThrowRow[]): LongestThrowItem[] {
  return (rows || [])
    .filter((row) => isCompleted(row.matches?.status) && typeof row.distance_m === 'number')
    .sort((a, b) => (b.distance_m || 0) - (a.distance_m || 0))
    .map((row, index) => ({
      id: row.id || `${row.created_at || 'throw'}-${index}`,
      distance_m: row.distance_m as number,
      discName: row.discs?.name || 'Unknown Disc',
      courseLayout: `${row.holes?.layouts?.courses?.name || 'Unknown Course'} / ${row.holes?.layouts?.name || 'Unknown Layout'}`,
      holeNumber: row.holes?.hole_number ?? null,
      date: row.matches?.date_played || row.created_at || '',
      throwType: row.throw_type || null,
    }));
}
