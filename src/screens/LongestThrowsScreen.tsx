import React, { useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { supabase } from '../lib/supabase';
import { COLORS } from '../theme';
import { buildLongestThrows, LongestThrowItem } from '../services/longestThrows';

export function LongestThrowsScreen() {
  const navigation = useNavigation<any>();
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<LongestThrowItem[]>([]);
  const isSchemaCacheMissing = (error: any, key: string) =>
    Boolean(error?.message && error.message.toLowerCase().includes('schema cache') && error.message.includes(key));

  useEffect(() => {
    fetchLongestThrows();
  }, []);

  const fetchLongestThrows = async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profile } = await supabase
        .from('profiles')
        .select('id')
        .eq('auth_id', user.id)
        .single();

      if (!profile) return;

      const withThrowType = await supabase
        .from('throws')
        .select(`
          id,
          distance_m,
          created_at,
          throw_type,
          discs ( name ),
          holes (
            hole_number,
            layouts (
              name,
              courses ( name )
            )
          ),
          matches!inner (
            status,
            date_played
          )
        `)
        .eq('player_id', profile.id)
        .eq('matches.status', 'completed')
        .not('distance_m', 'is', null)
        .order('distance_m', { ascending: false });

      if (withThrowType.error && isSchemaCacheMissing(withThrowType.error, 'throw_type')) {
        const legacyResult = await supabase
          .from('throws')
          .select(`
            id,
            distance_m,
            created_at,
            discs ( name ),
            holes (
              hole_number,
              layouts (
                name,
                courses ( name )
              )
            ),
            matches!inner (
              status,
              date_played
            )
          `)
          .eq('player_id', profile.id)
          .eq('matches.status', 'completed')
          .not('distance_m', 'is', null)
          .order('distance_m', { ascending: false });
        if (legacyResult.error) throw legacyResult.error;
        setItems(buildLongestThrows((legacyResult.data || []) as any));
      } else {
        if (withThrowType.error) throw withThrowType.error;
        setItems(buildLongestThrows((withThrowType.data || []) as any));
      }
    } catch (error) {
      console.error('Error fetching longest throws:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.title}>Longest Throws</Text>
      </View>

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          renderItem={({ item }) => (
            <View style={styles.card}>
              <View style={styles.rowTop}>
                <Text style={styles.distance}>{Math.round(item.distance_m)}m</Text>
                {item.throwType ? <Text style={styles.type}>{item.throwType.toUpperCase()}</Text> : null}
              </View>
              <Text style={styles.meta}>{item.discName}</Text>
              <Text style={styles.meta}>{item.courseLayout}</Text>
              <Text style={styles.subMeta}>Hole {item.holeNumber ?? '-'} • {new Date(item.date).toLocaleDateString()}</Text>
            </View>
          )}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <MaterialCommunityIcons name="arrow-up-right-bold" size={56} color={COLORS.borderDark} />
              <Text style={styles.emptyText}>No measured throws yet.</Text>
              <Text style={styles.emptySubtext}>Complete a match with measured throws to populate this list.</Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingTop: 12, paddingBottom: 20 },
  backBtn: { padding: 8, marginRight: 8 },
  title: { fontSize: 28, fontWeight: '800', color: COLORS.text },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  listContent: { padding: 16, paddingBottom: 32 },
  card: {
    backgroundColor: COLORS.surface,
    borderColor: COLORS.borderDark,
    borderWidth: 1,
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
  },
  rowTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
  distance: { color: COLORS.text, fontSize: 24, fontWeight: '800' },
  type: { color: COLORS.primary, fontSize: 12, fontWeight: '700', letterSpacing: 0.8 },
  meta: { color: COLORS.text, fontSize: 14, marginBottom: 4 },
  subMeta: { color: COLORS.textSecondary, fontSize: 12 },
  emptyContainer: { paddingTop: 80, alignItems: 'center', gap: 8 },
  emptyText: { color: COLORS.text, fontSize: 16, fontWeight: '700' },
  emptySubtext: { color: COLORS.textSecondary, fontSize: 13, textAlign: 'center', paddingHorizontal: 28 },
});
