import React from 'react';
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity } from 'react-native';
import { COLORS } from '../theme';
import { useMatchStore } from '../store/useMatchStore';
import { useNavigation } from '@react-navigation/native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';

export function PlayScreen() {
  const navigation = useNavigation<any>();
  const { matchId } = useMatchStore();

  const handleStartResume = () => {
    if (matchId) {
      navigation.navigate('ActiveMatch');
    } else {
      navigation.navigate('SelectCourse');
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Play</Text>
      </View>
      
      <View style={styles.content}>
        <TouchableOpacity style={styles.mainCard} onPress={handleStartResume}>
          <View style={styles.iconContainer}>
            <MaterialCommunityIcons 
              name={matchId ? "play-circle" : "plus-circle"} 
              size={80} 
              color={COLORS.primary} 
            />
          </View>
          <Text style={styles.cardTitle}>
            {matchId ? 'Active Round' : 'Start New Round'}
          </Text>
          <Text style={styles.cardSubtext}>
            {matchId 
              ? 'You have a match in progress. Resume to continue scoring.' 
              : 'Find a course and start tracking your game.'}
          </Text>
          <View style={styles.mainBtn}>
            <Text style={styles.mainBtnText}>
              {matchId ? 'RESUME ROUND' : 'START ROUND'}
            </Text>
          </View>
        </TouchableOpacity>

        {!matchId && (
          <View style={styles.secondaryRow}>
            <TouchableOpacity 
              style={styles.secondaryCard} 
              onPress={() => navigation.navigate('SelectCourse')}
            >
              <Ionicons name="map-outline" size={24} color={COLORS.primary} />
              <Text style={styles.secondaryText}>Courses</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.secondaryCard} 
              onPress={() => navigation.navigate('Profile', { screen: 'ProfileHome' })}
            >
              <Ionicons name="history" size={24} color={COLORS.primary} />
              <Text style={styles.secondaryText}>History</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 10,
  },
  title: {
    fontSize: 34,
    fontWeight: '800',
    color: COLORS.text,
    letterSpacing: -0.5,
  },
  content: {
    flex: 1,
    padding: 20,
    justifyContent: 'center',
  },
  mainCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 28,
    padding: 32,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.borderDark,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 10,
    marginBottom: 20,
  },
  iconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(144, 202, 249, 0.05)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  cardTitle: {
    color: COLORS.text,
    fontSize: 26,
    fontWeight: '800',
    marginBottom: 12,
  },
  cardSubtext: {
    color: COLORS.textSecondary,
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 32,
  },
  mainBtn: {
    backgroundColor: COLORS.primary,
    paddingVertical: 18,
    paddingHorizontal: 48,
    borderRadius: 16,
    width: '100%',
    alignItems: 'center',
  },
  mainBtnText: {
    color: COLORS.onPrimary,
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: 1,
  },
  secondaryRow: {
    flexDirection: 'row',
    gap: 16,
  },
  secondaryCard: {
    flex: 1,
    backgroundColor: COLORS.surface,
    borderRadius: 20,
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: COLORS.borderDark,
    gap: 10,
  },
  secondaryText: {
    color: COLORS.text,
    fontSize: 14,
    fontWeight: '700',
  },
});
