import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  SafeAreaView,
  ActivityIndicator,
} from 'react-native';
import { supabase } from '../lib/supabase';
import { COLORS } from '../theme';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useIsFocused } from '@react-navigation/native';

interface Disc {
  id: string;
  name: string;
  color_rgba: string;
  speed: number;
  glide: number;
  turn: number;
  fade: number;
  weight_g: number;
  archived_at: string | null;
}

export function BagScreen() {
  const navigation = useNavigation<any>();
  const isFocused = useIsFocused();
  const [discs, setDiscs] = useState<Disc[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isFocused) {
      fetchDiscs();
    }
  }, [isFocused]);

  const fetchDiscs = async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Get profile id for the auth user
      const { data: profile } = await supabase
        .from('profiles')
        .select('id')
        .eq('auth_id', user.id)
        .single();

      if (!profile) return;

      const { data, error } = await supabase
        .from('discs')
        .select('*')
        .eq('player_id', profile.id)
        .is('archived_at', null)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setDiscs(data || []);
    } catch (error) {
      console.error('Error fetching discs:', error);
    } finally {
      setLoading(false);
    }
  };

  const renderDisc = ({ item }: { item: Disc }) => (
    <View style={styles.discCard}>
      <View style={[styles.colorIndicator, { backgroundColor: item.color_rgba || COLORS.primary }]} />
      <View style={styles.discInfo}>
        <Text style={styles.discName}>{item.name}</Text>
        <Text style={styles.discStats}>
          {item.speed} | {item.glide} | {item.turn} | {item.fade} • {item.weight_g}g
        </Text>
      </View>
      <TouchableOpacity onPress={() => navigation.navigate('AddEditDisc', { disc: item })}>
        <Ionicons name="ellipsis-vertical" size={20} color={COLORS.textSecondary} />
      </TouchableOpacity>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>My Bag</Text>
        <TouchableOpacity style={styles.addButton} onPress={() => navigation.navigate('AddEditDisc')}>
          <Ionicons name="add" size={24} color="#FFF" />
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      ) : (
        <FlatList
          data={discs}
          keyExtractor={(item) => item.id}
          renderItem={renderDisc}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>Your bag is empty.</Text>
              <Text style={styles.emptySubtext}>Add your first disc to start tracking throws.</Text>
            </View>
          }
        />
      )}
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
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
  },
  title: {
    fontSize: 32,
    fontWeight: '700',
    color: COLORS.text,
  },
  addButton: {
    backgroundColor: COLORS.primary,
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContent: {
    padding: 20,
  },
  discCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    borderWidth: 1,
    borderColor: COLORS.borderLight || '#2A2A2A',
  },
  colorIndicator: {
    width: 12,
    height: 40,
    borderRadius: 6,
    marginRight: 16,
  },
  discInfo: {
    flex: 1,
  },
  discName: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 4,
  },
  discStats: {
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContainer: {
    marginTop: 100,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 20,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 16,
    color: COLORS.textSecondary,
    textAlign: 'center',
  },
});
