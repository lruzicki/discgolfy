import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { COLORS } from '../theme';
import { Avatar } from './Avatar';

interface Hole {
  id: string;
  hole_number: number;
  par: number;
}

interface Player {
  id: string;
  display_name: string;
  avatar_url?: string | null;
}

interface ScorecardViewProps {
  holes: Hole[];
  players: Player[];
  scores: Record<string, Record<string, number | null>>;
  showLeaderboard?: boolean;
  unplayableHoleIds?: string[];
}

export const ScorecardView = ({ holes, players, scores, showLeaderboard = true, unplayableHoleIds = [] }: ScorecardViewProps) => {
  const unplayableHoleIdSet = new Set(unplayableHoleIds);
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
    if (diff === null || diff === 0) return {};
    
    // Eagle or better
    if (diff <= -2) return { backgroundColor: '#FFD700', color: '#000' };
    // Birdie
    if (diff === -1) return { backgroundColor: 'rgba(57, 255, 20, 0.2)', color: COLORS.success };
    // Bogey
    if (diff === 1) return { backgroundColor: 'rgba(255, 82, 82, 0.1)', color: '#FF5252' };
    // Double Bogey+
    return { backgroundColor: 'rgba(255, 82, 82, 0.2)', color: '#FF5252' };
  };

  return (
    <View style={styles.container}>
      {showLeaderboard && (
        <View style={styles.leaderboardSection}>
          <Text style={styles.leaderboardTitle}>ROUND LEADERBOARD</Text>
          {leaderboard.map((p, idx) => (
            <View key={p.id} style={styles.leaderboardPlayerRow}>
              <View style={styles.leaderboardRankBadge}>
                <Text style={styles.leaderboardRankBadgeText}>{idx + 1}</Text>
              </View>
              
              <View style={styles.avatarWrapper}>
                <Avatar userId={p.id} name={p.display_name} avatarUrl={p.avatar_url} size={40} />
              </View>

              <View style={styles.leaderboardInfo}>
                <Text style={styles.leaderboardPlayerName}>{p.display_name}</Text>
                <Text style={styles.leaderboardPlayerStatus}>
                  Round summary
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
      )}

      <Text style={[styles.leaderboardTitle, { marginTop: 12, marginBottom: 16 }]}>SCORECARD DETAILS</Text>
      {chunks.map((chunk, chunkIdx) => (
        <View key={chunkIdx} style={styles.summaryTable}>
          {/* Header Row: Hole Numbers */}
          <View style={styles.summaryRow}>
            <View style={[styles.summaryCell, styles.summaryCellSticky]} testID="summary-cell-sticky">
              <Text style={styles.summaryLabel}>HOLE</Text>
            </View>
            {chunk.map(h => (
              <View
                key={h.id}
                testID={`summary-cell-hole-${h.id}`}
                style={[
                  styles.summaryCell,
                  unplayableHoleIdSet.has(h.id) && styles.unplayableSummaryCell,
                ]}
              >
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
                const isUnplayable = unplayableHoleIdSet.has(h.id);
                return (
                  <View key={h.id} style={[styles.summaryCell, scoreStyle, isUnplayable && styles.unplayableSummaryCell]}>
                    <Text style={[
                      styles.summaryValue,
                      scoreStyle.color ? { color: scoreStyle.color } : { color: '#FFF' }
                    ]}>
                      {isUnplayable ? 'X' : (strokes || '-')}
                    </Text>
                  </View>
                );
              })}
            </View>
          ))}
        </View>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingBottom: 40,
  },
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
  avatarWrapper: {
    marginRight: 14,
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
});
