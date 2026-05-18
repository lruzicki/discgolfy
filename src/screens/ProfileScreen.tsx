import React from 'react';
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity, ScrollView, Image, Alert } from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { COLORS } from '../theme';
import { supabase } from '../lib/supabase';
import { useMatchStore } from '../store/useMatchStore';

export function ProfileScreen({ route, navigation }: any) {
  const { name, email } = route.params || {};
  const displayName = name || 'Lucas';
  const matchId = useMatchStore(state => state.matchId);

  const handleSignOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      Alert.alert('Error', error.message);
    }
  };

  const handlePlayPress = () => {
    if (matchId) {
      navigation.navigate('ActiveMatch');
    } else {
      navigation.navigate('SelectCourse');
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Profile Header */}
        <View style={styles.profileHeader}>
          <View style={styles.avatarContainer}>
            <Image 
              source={{ uri: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?q=80&w=200&auto=format&fit=crop' }} 
              style={styles.avatar} 
            />
            <View style={styles.onlineBadge} />
          </View>
          <Text style={styles.name}>{displayName}</Text>
          <Text style={styles.title}>Touring Professional</Text>
        </View>

        {/* Stats Grid */}
        <View style={styles.statsGrid}>
          <View style={styles.statCardHalf}>
            <View style={styles.statHeader}>
              <MaterialCommunityIcons name="history" size={16} color={COLORS.textSecondary} />
              <Text style={styles.statLabel}>ROUNDS PLAYED</Text>
            </View>
            <Text style={styles.statValue}>85</Text>
          </View>
          <View style={styles.statCardHalf}>
            <View style={styles.statHeader}>
              <Ionicons name="trending-up" size={16} color={COLORS.textSecondary} />
              <Text style={styles.statLabel}>AVG. SCORE</Text>
            </View>
            <Text style={[styles.statValue, { color: COLORS.success }]}>-3</Text>
          </View>
        </View>

        <View style={styles.statCardFull}>
          <View style={styles.statHeader}>
            <Ionicons name="trophy-outline" size={16} color={COLORS.textSecondary} />
            <Text style={styles.statLabel}>BEST HOLE</Text>
          </View>
          <View style={styles.bestHoleRow}>
            <Text style={styles.statValue}>Ace</Text>
            <Text style={styles.bestHoleSubtext}>(Hole 7)</Text>
          </View>
        </View>

        <View style={[styles.statCardFull, styles.rowCard]}>
          <View style={styles.statHeader}>
            <Ionicons name="disc-outline" size={16} color={COLORS.textSecondary} />
            <Text style={styles.statLabel}>TOTAL THROWS</Text>
          </View>
          <Text style={styles.statValue}>4,560</Text>
        </View>

        <View style={styles.actionGrid}>
          <TouchableOpacity style={styles.actionButton} onPress={() => navigation.navigate('Bag')}>
            <Ionicons name="bag-handle-outline" size={20} color={COLORS.textSecondary} />
            <Text style={styles.actionText}>BAG</Text>
            <Ionicons name="chevron-forward" size={20} color={COLORS.textSecondary} style={styles.actionArrow} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionButton}>
            <MaterialCommunityIcons name="history" size={20} color={COLORS.textSecondary} />
            <Text style={styles.actionText}>HISTORY</Text>
            <Ionicons name="chevron-forward" size={20} color={COLORS.textSecondary} style={styles.actionArrow} />
          </TouchableOpacity>
        </View>

        {/* Recent Performance */}
        <Text style={styles.sectionTitle}>Recent Performance</Text>
        <View style={styles.chartPlaceholder}>
          <Text style={{ color: COLORS.textMuted, textAlign: 'center' }}>Chart Placeholder</Text>
        </View>

        {/* Logout Button */}
        <TouchableOpacity style={styles.logoutButton} onPress={handleSignOut}>
          <Ionicons name="log-out-outline" size={20} color="#FF5252" />
          <Text style={styles.logoutText}>Log Out</Text>
        </TouchableOpacity>

      </ScrollView>

      {/* Bottom Navigation */}
      <View style={styles.bottomNav}>
        <TouchableOpacity style={styles.navItem} onPress={handlePlayPress}>
          <Ionicons name="play-circle-outline" size={24} color={COLORS.textSecondary} />
          <Text style={styles.navText}>PLAY</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.navItem}>
          <Ionicons name="podium-outline" size={24} color={COLORS.textSecondary} />
          <Text style={styles.navText}>LEADERBOARD</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.navItem}>
          <Ionicons name="person" size={24} color={COLORS.primary} />
          <Text style={[styles.navText, { color: COLORS.primary }]}>PROFILE</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  profileHeader: {
    alignItems: 'center',
    marginBottom: 32,
  },
  avatarContainer: {
    position: 'relative',
    marginBottom: 16,
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 2,
    borderColor: COLORS.borderDark,
  },
  onlineBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 24,
    height: 24,
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    borderWidth: 3,
    borderColor: COLORS.background,
  },
  name: {
    color: COLORS.text,
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  title: {
    color: COLORS.primary,
    fontSize: 14,
  },
  statsGrid: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
  },
  statCardHalf: {
    flex: 1,
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    padding: 16,
  },
  statCardFull: {
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  rowCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  statHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  statLabel: {
    color: COLORS.textSecondary,
    fontSize: 10,
    fontWeight: '600',
    letterSpacing: 1,
  },
  statValue: {
    color: COLORS.text,
    fontSize: 28,
    fontWeight: 'bold',
  },
  bestHoleRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 8,
  },
  bestHoleSubtext: {
    color: COLORS.primary,
    fontSize: 14,
  },
  actionGrid: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 32,
  },
  actionButton: {
    flex: 1,
    backgroundColor: COLORS.surface,
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
  },
  actionText: {
    color: COLORS.text,
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 1,
    marginLeft: 8,
    flex: 1,
  },
  actionArrow: {
    marginLeft: 'auto',
  },
  sectionTitle: {
    color: COLORS.text,
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 16,
  },
  chartPlaceholder: {
    height: 150,
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 32,
    padding: 16,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 82, 82, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255, 82, 82, 0.2)',
  },
  logoutText: {
    color: '#FF5252',
    fontSize: 16,
    fontWeight: '600',
  },
  bottomNav: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    backgroundColor: '#1C1C1E', // specific off-black for nav
    paddingVertical: 12,
    paddingBottom: 24,
    borderTopWidth: 1,
    borderTopColor: COLORS.borderLight,
  },
  navItem: {
    alignItems: 'center',
    gap: 4,
  },
  navText: {
    color: COLORS.textSecondary,
    fontSize: 10,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
});
