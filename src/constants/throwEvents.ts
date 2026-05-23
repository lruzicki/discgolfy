export const THROW_EVENT_TYPES = ['tree', 'water', 'ob', 'hit_person'] as const;

export type ThrowEventType = (typeof THROW_EVENT_TYPES)[number];
