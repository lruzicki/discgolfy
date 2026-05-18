import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { COLORS } from '../theme';
import { MaterialCommunityIcons } from '@expo/vector-icons';

interface PlayerRanking {
  id: string;
  display_name: string;
  avg_diff: number;
  rounds_played: number;
  best_score: number;
}

interface PodiumViewProps {
  players: PlayerRanking[];
}

export const PodiumView: React.FC<PodiumViewProps> = ({ players }) => {
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
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{player.display_name.charAt(0).toUpperCase()}</Text>
            </View>
            {isFirst && (
              <View style={styles.crown}>
                <MaterialCommunityIcons name="crown" size={24} color="#FFD700" />
              </View>
            )}
          </View>
          <Text style={styles.name} numberOfLines={1}>{player.display_name}</Text>
          <Text style={[styles.score, isFirst && styles.firstScore]}>
            {typeof player.value === 'string' ? player.value : 
              (player.value === 0 ? 'E' : (player.value > 0 ? `+${player.value}` : player.value))}
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
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: COLORS.surfaceLight,
    borderWidth: 2,
    borderColor: COLORS.borderDark,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    color: COLORS.text,
    fontSize: 20,
    fontWeight: '800',
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
