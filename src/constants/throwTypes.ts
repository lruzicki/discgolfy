export const THROW_TYPES = ['shot', 'putt'] as const;

export type ThrowType = (typeof THROW_TYPES)[number];
