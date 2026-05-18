import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  TextInput,
  ActivityIndicator,
  Alert,
  Image,
  ScrollView,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { COLORS } from '../theme';
import { supabase } from '../lib/supabase';
import { useMatchStore } from '../store/useMatchStore';
import { useNavigation } from '@react-navigation/native';
import { PlayButton } from '../components/PlayButton';

interface Player {
  id: string;
  display_name: string;
  avatar_url: string | null;
  is_guest: boolean;
  auth_id?: string;
  created_by_auth_id?: string;
}

export function SelectPlayersScreen() {
  const navigation = useNavigation<any>();
  const { layoutId, setMatchId } = useMatchStore();
  
  const [search, setSearch] = useState('');
  const [friends, setFriends] = useState<Player[]>([]);
  const [guests, setGuests] = useState<Player[]>([]);
  const [selectedPlayers, setSelectedPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState(true);
  const [starting, setStarting] = useState(false);
  const [currentUserProfile, setCurrentUserProfile] = useState<Player | null>(null);
  
  // Guest Creation Modal State
  const [isGuestModalVisible, setIsGuestModalVisible] = useState(false);
  const [newGuestName, setNewGuestName] = useState('');
  const [isCreatingGuest, setIsCreatingGuest] = useState(false);

  useEffect(() => {
    fetchInitialData();
  }, []);

  const fetchInitialData = async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // 1. Fetch Current User Profile
      let { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('auth_id', user.id)
        .maybeSingle();

      if (profileError) throw profileError;

      // If no profile exists, create one (this handles cases where trigger didn't run or isn't set up)
      if (!profile) {
        console.log('No profile found, creating one...');
        const { data: newProfile, error: insertError } = await supabase
          .from('profiles')
          .insert({
            auth_id: user.id,
            display_name: user.email?.split('@')[0] || 'Player',
            is_guest: false
          })
          .select()
          .maybeSingle();
        
        if (insertError) {
          console.error('Failed to create profile:', insertError);
        } else {
          profile = newProfile;
        }
      }

      if (profile) {
        setCurrentUserProfile(profile);
        setSelectedPlayers([profile]); // Default selection
      } else {
        console.warn('No profile found for current user even after attempt to create');
      }

      // 2. Fetch Guests created by this user
      const { data: userGuests } = await supabase
        .from('profiles')
        .select('*')
        .eq('created_by_auth_id', user.id)
        .eq('is_guest', true)
        .order('display_name', { ascending: true });

      setGuests(userGuests || []);

      // 3. Fetch some friends (for now just all non-guest profiles except current user)
      const { data: otherProfiles } = await supabase
        .from('profiles')
        .select('*')
        .eq('is_guest', false)
        .neq('auth_id', user.id)
        .limit(10);

      setFriends(otherProfiles || []);

    } catch (error: any) {
      console.error('fetchInitialData error:', error);
      Alert.alert('Error', error.message || 'Failed to load profiles');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = async (text: string) => {
    setSearch(text);
    if (text.length < 2) {
      if (text.length === 0) fetchInitialData();
      return;
    }

    try {
      const { data } = await supabase
        .from('profiles')
        .select('*')
        .ilike('display_name', `%${text}%`)
        .limit(10);
      
      if (data) {
        // Filter out current user and guests that are not mine
        const results = data.filter(p => 
          p.id !== currentUserProfile?.id && 
          (!p.is_guest || p.created_by_auth_id === currentUserProfile?.auth_id)
        );
        setFriends(results.filter(p => !p.is_guest));
        setGuests(results.filter(p => p.is_guest));
      }
    } catch (error) {
      console.error(error);
    }
  };

  const togglePlayer = (player: Player) => {
    setSelectedPlayers(prev => {
      const isSelected = prev.find(p => p.id === player.id);
      if (isSelected) {
        if (player.id === currentUserProfile?.id) return prev; // Cannot deselect self
        return prev.filter(p => p.id !== player.id);
      }
      if (prev.length >= 4) {
        Alert.alert('Squad Full', 'Max 4 players per match.');
        return prev;
      }
      return [...prev, player];
    });
  };

  const handleCreateGuest = async () => {
    if (!newGuestName.trim()) return;
    
    try {
      setIsCreatingGuest(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('profiles')
        .insert({
          display_name: newGuestName.trim(),
          is_guest: true,
          created_by_auth_id: user.id
        })
        .select()
        .single();
      
      if (error) throw error;
      
      setGuests(prev => [data, ...prev]);
      togglePlayer(data);
      setNewGuestName('');
      setIsGuestModalVisible(false);
    } catch (error: any) {
      Alert.alert('Error', error.message);
    } finally {
      setIsCreatingGuest(false);
    }
  };

  const handleStartMatch = async () => {
    if (selectedPlayers.length === 0) {
      Alert.alert('No Players', 'Please select at least one player.');
      return;
    }

    try {
      setStarting(true);
      
      // Get the session explicitly
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      if (sessionError) throw sessionError;
      
      const user = session?.user;
      if (!user) {
        Alert.alert('Error', 'Session expired. Please log in again.');
        navigation.navigate('Login');
        return;
      }

      // Ensure we have the profile (either from state or fetch it now)
      let profile = currentUserProfile;
      if (!profile) {
        const { data } = await supabase
          .from('profiles')
          .select('*')
          .eq('auth_id', user.id)
          .maybeSingle();
        profile = data;
      }

      if (!profile) throw new Error('Could not find your player profile');

      // 1. Create Match record
      const { data: match, error: matchError } = await supabase
        .from('matches')
        .insert({
          layout_id: layoutId,
          created_by: profile.id,
          status: 'active'
        })
        .select()
        .single();

      if (matchError) throw matchError;

      // 2. Add Match Players
      const matchPlayers = selectedPlayers.map(p => ({
        match_id: match.id,
        player_id: p.id
      }));

      const { error: playersError } = await supabase
        .from('match_players')
        .insert(matchPlayers);

      if (playersError) throw playersError;

      // 3. Update Store & Navigate
      setMatchId(match.id);
      navigation.navigate('ActiveMatch');

    } catch (error: any) {
      console.error('handleStartMatch error:', error);
      Alert.alert('Error', error.message || 'Failed to start match');
    } finally {
      setStarting(false);
    }
  };

  const renderPlayerItem = ({ item }: { item: Player }) => {
    const isSelected = !!selectedPlayers.find(p => p.id === item.id);
    const isMe = item.id === currentUserProfile?.id;

    return (
      <TouchableOpacity 
        style={[
          styles.playerItem, 
          isSelected && styles.playerItemSelected,
          isMe && styles.meItem
        ]}
        onPress={() => togglePlayer(item)}
      >
        <View style={styles.playerAvatarContainer}>
          {item.avatar_url ? (
            <Image source={{ uri: item.avatar_url }} style={styles.avatar} />
          ) : (
            <View style={[styles.avatarPlaceholder, isMe && styles.meAvatarPlaceholder]}>
              <Text style={styles.avatarText}>{item.display_name[0]}</Text>
            </View>
          )}
        </View>

        <View style={styles.playerInfo}>
          <Text style={[styles.playerName, isSelected && styles.playerNameSelected]} numberOfLines={1}>
            {item.display_name} {isMe && '(Ty)'}
          </Text>
          {item.is_guest && (
            <View style={styles.guestBadge}>
              <Text style={styles.guestBadgeText}>GUEST</Text>
            </View>
          )}
        </View>

        <View style={styles.selectionIndicator}>
          {isSelected ? (
            <Ionicons name="checkmark-circle" size={26} color={COLORS.primary} />
          ) : (
            <View style={styles.unselectedCircle} />
          )}
        </View>
      </TouchableOpacity>
    );
  };

  const displayList = loading ? [] : (currentUserProfile ? [currentUserProfile, ...friends, ...guests] : [...friends, ...guests]);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="chevron-back" size={28} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.title}>Squad</Text>
        <View style={{ width: 28 }} />
      </View>

      <View style={styles.searchSection}>
        <View style={styles.searchBar}>
          <Ionicons name="search" size={20} color={COLORS.textSecondary} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search friends..."
            placeholderTextColor={COLORS.textMuted}
            value={search}
            onChangeText={handleSearch}
          />
        </View>
      </View>

      <FlatList
        data={displayList}
        keyExtractor={(item) => item.id}
        renderItem={renderPlayerItem}
        numColumns={1}
        contentContainerStyle={styles.listContent}
        ListHeaderComponent={
          <>
            <View style={styles.selectionSummary}>
              <Text style={styles.sectionTitle}>SELECTED ({selectedPlayers.length}/4)</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.selectedRow}>
                {selectedPlayers.map(p => (
                  <TouchableOpacity 
                    key={p.id} 
                    onPress={() => togglePlayer(p)} 
                    style={styles.selectedAvatar}
                    disabled={p.id === currentUserProfile?.id}
                  >
                    <View style={[styles.avatarPlaceholderSmall, p.id === currentUserProfile?.id && { backgroundColor: COLORS.primary }]}>
                      <Text style={styles.avatarTextSmall}>{p.display_name[0]}</Text>
                    </View>
                    {p.id !== currentUserProfile?.id && (
                      <View style={styles.removeBadge}>
                        <Ionicons name="close" size={10} color="#FFF" />
                      </View>
                    )}
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>SUGGESTED</Text>
              <TouchableOpacity onPress={() => setIsGuestModalVisible(true)} style={styles.addGuestBtn}>
                <Ionicons name="person-add-outline" size={16} color={COLORS.primary} />
                <Text style={styles.addGuestText}>ADD GUEST</Text>
              </TouchableOpacity>
            </View>
          </>
        }
        ListEmptyComponent={
          loading ? (
            <ActivityIndicator size="large" color={COLORS.primary} style={{ marginTop: 40 }} />
          ) : (
            <Text style={styles.emptyText}>No players found</Text>
          )
        }
      />

      {/* Guest Modal */}
      <Modal
        visible={isGuestModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setIsGuestModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>New Guest</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="Guest Name"
              placeholderTextColor={COLORS.textMuted}
              value={newGuestName}
              onChangeText={setNewGuestName}
              autoFocus
            />
            <View style={styles.modalButtons}>
              <TouchableOpacity 
                style={[styles.modalBtn, styles.modalBtnSecondary]} 
                onPress={() => setIsGuestModalVisible(false)}
              >
                <Text style={styles.modalBtnTextSecondary}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.modalBtn, styles.modalBtnPrimary]} 
                onPress={handleCreateGuest}
                disabled={isCreatingGuest || !newGuestName.trim()}
              >
                {isCreatingGuest ? (
                  <ActivityIndicator size="small" color={COLORS.onPrimary} />
                ) : (
                  <Text style={styles.modalBtnTextPrimary}>Create</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <View style={styles.footer}>
        <PlayButton 
          onPress={handleStartMatch} 
          loading={starting} 
          disabled={selectedPlayers.length === 0} 
        />
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
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.text,
  },
  searchSection: {
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: COLORS.borderDark,
  },
  searchInput: {
    flex: 1,
    marginLeft: 8,
    color: COLORS.text,
    fontSize: 16,
  },
  listContent: {
    paddingHorizontal: 12,
    paddingBottom: 120,
  },
  columnWrapper: {
    justifyContent: 'space-between',
  },
  selectionSummary: {
    paddingHorizontal: 8,
    marginBottom: 24,
  },
  selectedRow: {
    marginTop: 12,
    flexDirection: 'row',
  },
  selectedAvatar: {
    marginRight: 12,
    position: 'relative',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 8,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.textSecondary,
    letterSpacing: 1,
  },
  addGuestBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  addGuestText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.primary,
  },
  playerItem: {
    flexDirection: 'row',
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    padding: 12,
    alignItems: 'center',
    marginBottom: 12,
    borderWidth: 1.5,
    borderColor: 'transparent',
  },
  playerItemSelected: {
    borderColor: COLORS.primary,
    backgroundColor: 'rgba(57, 255, 20, 0.05)',
  },
  meItem: {
    backgroundColor: 'rgba(57, 255, 20, 0.02)',
  },
  playerAvatarContainer: {
    marginRight: 16,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
  },
  avatarPlaceholder: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: COLORS.borderDark,
    justifyContent: 'center',
    alignItems: 'center',
  },
  meAvatarPlaceholder: {
    backgroundColor: COLORS.primary,
  },
  avatarPlaceholderSmall: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: COLORS.borderDark,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    color: COLORS.text,
    fontSize: 20,
    fontWeight: '700',
  },
  avatarTextSmall: {
    color: COLORS.onPrimary,
    fontSize: 18,
    fontWeight: '700',
  },
  playerInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  playerName: {
    color: COLORS.text,
    fontSize: 16,
    fontWeight: '600',
  },
  playerNameSelected: {
    color: COLORS.primary,
    fontWeight: '700',
  },
  guestBadge: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(160, 160, 160, 0.2)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginTop: 4,
  },
  guestBadgeText: {
    fontSize: 8,
    fontWeight: '800',
    color: COLORS.textSecondary,
  },
  selectionIndicator: {
    marginLeft: 12,
  },
  unselectedCircle: {
    width: 26,
    height: 26,
    borderRadius: 13,
    borderWidth: 2,
    borderColor: COLORS.borderDark,
  },
  removeBadge: {
    position: 'absolute',
    top: -2,
    right: -2,
    backgroundColor: '#FF5252',
    width: 16,
    height: 16,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: COLORS.background,
  },
  emptyText: {
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginTop: 40,
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 20,
    paddingBottom: 40,
    backgroundColor: COLORS.background,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    width: '100%',
    backgroundColor: COLORS.surface,
    borderRadius: 20,
    padding: 24,
    borderWidth: 1,
    borderColor: COLORS.borderDark,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 20,
  },
  modalInput: {
    backgroundColor: COLORS.background,
    borderRadius: 12,
    padding: 16,
    color: COLORS.text,
    fontSize: 16,
    borderWidth: 1,
    borderColor: COLORS.borderDark,
    marginBottom: 24,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  modalBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  modalBtnPrimary: {
    backgroundColor: COLORS.primary,
  },
  modalBtnSecondary: {
    backgroundColor: COLORS.borderDark,
  },
  modalBtnTextPrimary: {
    color: COLORS.onPrimary,
    fontWeight: '700',
    fontSize: 16,
  },
  modalBtnTextSecondary: {
    color: COLORS.text,
    fontWeight: '600',
    fontSize: 16,
  },
});
