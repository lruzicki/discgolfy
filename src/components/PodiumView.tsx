import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { COLORS } from '../theme';
import { MaterialCommunityIcons } from '@expo/vector-icons';

import { Avatar } from './Avatar';

interface PlayerRanking {
  id: string;
  display_name: string;
  avatar_url?: string | null;
  value: number | string;
  subValue?: string;
}

interface PodiumViewProps {
  players: PlayerRanking[];
  activeFilter?: 'avg_diff' | 'best_score' | 'longest_throw' | 'longest_putt' | 'most_rounds' | 'total_strokes';
}

function formatPodiumValue(
  value: number | string,
  activeFilter?: 'avg_diff' | 'best_score' | 'longest_throw' | 'longest_putt' | 'most_rounds' | 'total_strokes'
) {
  if (activeFilter === 'avg_diff') {
    const numericValue = Number(value);
    if (numericValue === 0) return 'E';
    const formatted = Math.abs(numericValue).toFixed(2);
    return numericValue > 0 ? `+${formatted}` : `-${formatted}`;
  }

  if (typeof value === 'string') return value;
  return value === 0 ? 'E' : (value > 0 ? `+${value}` : value);
}

export const PodiumView: React.FC<PodiumViewProps> = ({ players, activeFilter }) => {
  const top3 = players.slice(0, 3);
  
  // Reorder for podium: [2nd, 1st, 3rd]
  const orderedPodium = [];
  if (top3[1]) orderedPodium.push({ ...top3[1], rank: 2, index: 1 });
  if (top3[0]) orderedPodium.push({ ...top3[0], rank: 1, index: 0 });
  if (top3[2]) orderedPodium.push({ ...top3[2], rank: 3, index: 2 });

  const renderPedestal = (player: any) => {
    const isFirst = player.rank === 1;
    const height = isFirst ? 140 : (player.rank === 2 ? 100 : 80);
    
    return (
      <View key={player.id} style={styles.podiumColumn} testID={`podium-item-${player.index}`}>
        <View style={styles.playerInfo}>
          <View style={[styles.avatarContainer, isFirst && styles.firstAvatar]}>
            <Avatar userId={player.id} name={player.display_name} avatarUrl={player.avatar_url} size={isFirst ? 60 : 50} />
            {isFirst && (
              <View style={styles.crown}>
                <MaterialCommunityIcons name="crown" size={24} color="#FFD700" />
              </View>
            )}
          </View>
          <Text style={styles.name} numberOfLines={1}>{player.display_name}</Text>
          <Text style={[styles.score, isFirst && styles.firstScore]}>
            {formatPodiumValue(player.value, activeFilter)}
          </Text>
        </View>
        
        <View style={[
          styles.pedestal, 
          { height },
          isFirst && styles.firstPedestal,
          player.rank === 2 && styles.secondPedestal,
          player.rank === 3 && styles.thirdPedestal,
        ]}>
          <Text style={styles.rankNumber}>{player.rank}</Text>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container} testID="podium-container">
      {orderedPodium.map(renderPedestal)}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'flex-end',
    paddingTop: 40,
    paddingBottom: 24,
    gap: 12,
    marginHorizontal: 16,
  },
  podiumColumn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  playerInfo: {
    alignItems: 'center',
    marginBottom: 12,
  },
  avatarContainer: {
    position: 'relative',
    marginBottom: 8,
  },
  firstAvatar: {
    transform: [{ scale: 1.2 }],
  },
  crown: {
    position: 'absolute',
    top: -22,
    alignSelf: 'center',
  },
  name: {
    color: COLORS.text,
    fontSize: 12,
    fontWeight: '700',
    textAlign: 'center',
    maxWidth: 90,
  },
  score: {
    color: COLORS.textSecondary,
    fontSize: 14,
    fontWeight: '800',
    marginTop: 2,
  },
  firstScore: {
    color: COLORS.primary,
    fontSize: 16,
  },
  pedestal: {
    width: '100%',
    backgroundColor: COLORS.surface,
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.borderDark,
    borderBottomWidth: 0,
  },
  firstPedestal: {
    backgroundColor: 'rgba(144, 202, 249, 0.15)',
    borderColor: COLORS.primary,
    height: 140,
  },
  secondPedestal: {
    height: 100,
  },
  thirdPedestal: {
    height: 80,
  },
  rankNumber: {
    color: COLORS.textMuted,
    fontSize: 32,
    fontWeight: '900',
    opacity: 0.3,
  },
});
