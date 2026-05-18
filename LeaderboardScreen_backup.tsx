     1	import React, { useEffect, useState } from 'react';
     2	import {
     3	  View,
     4	  Text,
     5	  StyleSheet,
     6	  FlatList,
     7	  TouchableOpacity,
     8	  ActivityIndicator,
     9	  Alert,
    10	} from 'react-native';
    11	import { SafeAreaView } from 'react-native-safe-area-context';
    12	import { COLORS } from '../theme';
    13	import { supabase } from '../lib/supabase';
    14	import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
    15	import { useNavigation } from '@react-navigation/native';
    16	import { PodiumView } from '../components/PodiumView';
    17	
    18	interface MatchEntry {
    19	  id: string;
    20	  date_played: string;
    21	  layout_name: string;
    22	  course_name: string;
    23	  creator_name: string;
    24	  player_count: number;
    25	  top_score: number | null;
    26	  players: {
    27	    display_name: string;
    28	    total_score: number | null;
    29	  }[];
    30	}
    31	
    32	interface ThrowEntry {
    33	  id: string;
    34	  distance_m: number;
    35	  display_name: string;
    36	  disc_name: string;
    37	  course_name: string;
    38	  date: string;
    39	}
    40	
    41	interface PlayerRanking {
    42	  id: string;
    43	  display_name: string;
    44	  avg_diff: number;
    45	  rounds_played: number;
    46	  best_score: number;
    47	}
    48	
    49	type Tab = 'rounds' | 'throws' | 'players';
    50	
    51	export function LeaderboardScreen() {
    52	  const navigation = useNavigation<any>();
    53	  const [activeTab, setActiveTab] = useState<Tab>('rounds');
    54	  const [loading, setLoading] = useState(true);
    55	  const [refreshing, setRefreshing] = useState(false);
    56	  const [matches, setMatches] = useState<MatchEntry[]>([]);
    57	  const [topThrows, setTopThrows] = useState<ThrowEntry[]>([]);
    58	  const [playerRankings, setPlayerRankings] = useState<PlayerRanking[]>([]);
    59	
    60	  useEffect(() => {
    61	    fetchData();
    62	  }, [activeTab]);
    63	
    64	  const fetchData = async () => {
    65	    setLoading(true);
    66	    if (activeTab === 'rounds') await fetchLeaderboard();
    67	    else if (activeTab === 'throws') await fetchTopThrows();
    68	    else if (activeTab === 'players') await fetchPlayerRankings();
    69	    setLoading(false);
    70	    setRefreshing(false);
    71	  };
    72	
    73	  const fetchPlayerRankings = async () => {
    74	    try {
    75	      const { data, error } = await supabase
    76	        .from('match_players')
    77	        .select(`
    78	          player_id,
    79	          total_score,
    80	          profiles ( display_name ),
    81	          matches (
    82	            status,
    83	            layouts (
    84	              holes ( par )
    85	            )
    86	          )
    87	        `)
    88	        .eq('matches.status', 'completed');
    89	
    90	      if (error) throw error;
    91	
    92	      const playerMap: Record<string, { 
    93	        id: string, 
    94	        name: string, 
    95	        totalDiff: number, 
    96	        count: number,
    97	        bestDiff: number
    98	      }> = {};
    99	
   100	      (data || []).forEach((entry: any) => {
   101	        if (!entry.matches || !entry.total_score) return;
   102	        
   103	        const playerId = entry.player_id;
   104	        const totalPar = entry.matches.layouts?.holes?.reduce((acc: number, h: any) => acc + h.par, 0) || 0;
   105	        if (totalPar === 0) return;
   106	
   107	        const diff = entry.total_score - totalPar;
   108	
   109	        if (!playerMap[playerId]) {
   110	          playerMap[playerId] = {
   111	            id: playerId,
   112	            name: entry.profiles?.display_name || 'Guest',
   113	            totalDiff: 0,
   114	            count: 0,
   115	            bestDiff: Infinity
   116	          };
   117	        }
   118	
   119	        playerMap[playerId].totalDiff += diff;
   120	        playerMap[playerId].count += 1;
   121	        if (diff < playerMap[playerId].bestDiff) {
   122	          playerMap[playerId].bestDiff = diff;
   123	        }
   124	      });
   125	
   126	      const rankings: PlayerRanking[] = Object.values(playerMap)
   127	        .map(p => ({
   128	          id: p.id,
   129	          display_name: p.name,
   130	          avg_diff: p.totalDiff / p.count,
   131	          rounds_played: p.count,
   132	          best_score: p.bestDiff
   133	        }))
   134	        .sort((a, b) => a.avg_diff - b.avg_diff)
   135	        .slice(0, 20);
   136	
   137	      setPlayerRankings(rankings);
   138	    } catch (error: any) {
   139	      console.error('Error fetching player rankings:', error);
   140	    }
   141	  };
   142	
   143	  const fetchTopThrows = async () => {
   144	    try {
   145	      const { data, error } = await supabase
   146	        .from('throws')
   147	        .select(`
   148	          id,
   149	          distance_m,
   150	          created_at,
   151	          profiles:player_id ( display_name ),
   152	          discs:disc_id ( name ),
   153	          matches (
   154	            layouts (
   155	              courses ( name )
   156	            )
   157	          )
   158	        `)
   159	        .not('distance_m', 'is', null)
   160	        .order('distance_m', { ascending: false })
   161	        .limit(20);
   162	
   163	      if (error) throw error;
   164	
   165	      const formatted: ThrowEntry[] = (data || []).map((t: any) => ({
   166	        id: t.id,
   167	        distance_m: t.distance_m,
   168	        display_name: t.profiles?.display_name || 'Unknown',
   169	        disc_name: t.discs?.name || 'Unknown Disc',
   170	        course_name: t.matches?.layouts?.courses?.name || 'Unknown Course',
   171	        date: t.created_at
   172	      }));
   173	
   174	      setTopThrows(formatted);
   175	    } catch (error: any) {
   176	      console.error('Error fetching throws:', error);
   177	    }
   178	  };
   179	
   180	  const fetchLeaderboard = async () => {
   181	    try {
   182	      const { data, error } = await supabase
   183	        .from('matches')
   184	        .select(`
   185	          id,
   186	          date_played,
   187	          status,
   188	          layouts (
   189	            name,
   190	            courses ( name )
   191	          ),
   192	          profiles:created_by ( display_name ),
   193	          match_players (
   194	            total_score,
   195	            profiles:player_id ( display_name )
   196	          )
   197	        `)
   198	        .eq('status', 'completed')
   199	        .order('date_played', { ascending: false })
   200	        .limit(20);
   201	
   202	      if (error) throw error;
   203	
   204	      const formattedMatches: MatchEntry[] = (data || []).map((m: any) => ({
   205	        id: m.id,
   206	        date_played: m.date_played,
   207	        layout_name: m.layouts?.name || 'Unknown Layout',
   208	        course_name: m.layouts?.courses?.name || 'Unknown Course',
   209	        creator_name: m.profiles?.display_name || 'Unknown',
   210	        player_count: m.match_players?.length || 0,
   211	        top_score: m.match_players?.length > 0 
   212	          ? Math.min(...m.match_players.map((p: any) => p.total_score || Infinity)) 
   213	          : null,
   214	        players: (m.match_players || []).map((p: any) => ({
   215	          display_name: p.profiles?.display_name || 'Guest',
   216	          total_score: p.total_score
   217	        }))
   218	      }));
   219	
   220	      setMatches(formattedMatches);
   221	    } catch (error: any) {
   222	      console.error('Error fetching leaderboard:', error);
   223	      Alert.alert('Error', 'Failed to load global board.');
   224	    }
   225	  };
   226	
   227	  const onRefresh = () => {
   228	    setRefreshing(true);
   229	    fetchData();
   230	  };
   231	
   232	  const renderMatch = ({ item }: { item: MatchEntry }) => (
   233	    <View style={styles.matchCard}>
   234	      <View style={styles.matchHeader}>
   235	        <View style={styles.courseInfo}>
   236	          <Text style={styles.courseName}>{item.course_name}</Text>
   237	          <Text style={styles.layoutName}>{item.layout_name}</Text>
   238	        </View>
   239	        <Text style={styles.matchDate}>
   240	          {new Date(item.date_played).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
   241	        </Text>
   242	      </View>
   243	
   244	      <View style={styles.playerList}>
   245	        {item.players.slice(0, 3).map((p, i) => (
   246	          <View key={i} style={styles.playerRow}>
   247	            <Text style={styles.playerName} numberOfLines={1}>{p.display_name}</Text>
   248	            <Text style={styles.playerScore}>{p.total_score || '-'}</Text>
   249	          </View>
   250	        ))}
   251	        {item.player_count > 3 && (
   252	          <Text style={styles.morePlayers}>+ {item.player_count - 3} more players</Text>
   253	        )}
   254	      </View>
   255	
   256	      <View style={styles.matchFooter}>
   257	        <View style={styles.creatorInfo}>
   258	          <MaterialCommunityIcons name="account-edit-outline" size={14} color={COLORS.textSecondary} />
   259	          <Text style={styles.creatorName}>Hosted by {item.creator_name}</Text>
   260	        </View>
   261	        <TouchableOpacity 
   262	          style={styles.viewBtn}
   263	          onPress={() => navigation.navigate('MatchSummary', { matchId: item.id })}
   264	        >
   265	          <Text style={styles.viewBtnText}>VIEW ROUND</Text>
   266	          <Ionicons name="chevron-forward" size={14} color={COLORS.primary} />
   267	        </TouchableOpacity>
   268	      </View>
   269	    </View>
   270	  );
   271	
   272	  const renderThrow = ({ item, index }: { item: ThrowEntry, index: number }) => (
   273	    <View style={styles.throwCard}>
   274	      <View style={[styles.rankBadge, index === 0 && styles.rankGold, index === 1 && styles.rankSilver, index === 2 && styles.rankBronze]}>
   275	        <Text style={styles.rankText}>{index + 1}</Text>
   276	      </View>
   277	      <View style={styles.throwInfo}>
   278	        <Text style={styles.throwPlayer}>{item.display_name}</Text>
   279	        <Text style={styles.throwSubtext}>{item.disc_name} • {item.course_name}</Text>
   280	      </View>
   281	      <View style={styles.throwValue}>
   282	        <Text style={styles.distanceValue}>{item.distance_m}</Text>
   283	        <Text style={styles.unitText}>m</Text>
   284	      </View>
   285	    </View>
   286	  );
   287	
   288	  const renderPlayer = ({ item, index }: { item: PlayerRanking, index: number }) => (
   289	    <View style={styles.throwCard}>
   290	      <View style={[styles.rankBadge, index === 0 && styles.rankGold, index === 1 && styles.rankSilver, index === 2 && styles.rankBronze]}>
   291	        <Text style={styles.rankText}>{index + 1}</Text>
   292	      </View>
   293	      <View style={styles.throwInfo}>
   294	        <Text style={styles.throwPlayer}>{item.display_name}</Text>
   295	        <Text style={styles.throwSubtext}>{item.rounds_played} rounds • Best: {item.best_score === 0 ? 'E' : (item.best_score > 0 ? `+${item.best_score}` : item.best_score)}</Text>
   296	      </View>
   297	      <View style={styles.throwValue}>
   298	        <Text style={[
   299	          styles.distanceValue,
   300	          item.avg_diff < 0 && { color: COLORS.success },
   301	          item.avg_diff > 0 && { color: '#FF5252' }
   302	        ]}>
   303	          {item.avg_diff === 0 ? 'E' : (item.avg_diff > 0 ? `+${item.avg_diff.toFixed(1)}` : item.avg_diff.toFixed(1))}
   304	        </Text>
   305	      </View>
   306	    </View>
   307	  );
   308	
   309	  return (
   310	    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
   311	      <View style={styles.header}>
   312	        <Text style={styles.title}>Leaderboard</Text>
   313	        <View style={styles.tabBar}>
   314	          <TouchableOpacity 
   315	            style={[styles.tab, activeTab === 'rounds' && styles.activeTab]} 
   316	            onPress={() => setActiveTab('rounds')}
   317	          >
   318	            <Text style={[styles.tabText, activeTab === 'rounds' && styles.activeTabText]}>Rounds</Text>
   319	          </TouchableOpacity>
   320	          <TouchableOpacity 
   321	            style={[styles.tab, activeTab === 'throws' && styles.activeTab]} 
   322	            onPress={() => setActiveTab('throws')}
   323	          >
   324	            <Text style={[styles.tabText, activeTab === 'throws' && styles.activeTabText]}>Top Throws</Text>
   325	          </TouchableOpacity>
   326	          <TouchableOpacity 
   327	            style={[styles.tab, activeTab === 'players' && styles.activeTab]} 
   328	            onPress={() => setActiveTab('players')}
   329	          >
   330	            <Text style={[styles.tabText, activeTab === 'players' && styles.activeTabText]}>Players</Text>
   331	          </TouchableOpacity>
   332	        </View>
   333	      </View>
   334	
   335	      {loading && !refreshing ? (
   336	        <View style={styles.centered}>
   337	          <ActivityIndicator size="large" color={COLORS.primary} />
   338	        </View>
   339	      ) : (
   340	        <FlatList
   341	          data={activeTab === 'rounds' ? matches : (activeTab === 'throws' ? topThrows : playerRankings)}
   342	          keyExtractor={(item) => item.id}
   343	          renderItem={
   344	            activeTab === 'rounds' ? renderMatch : 
   345	            (activeTab === 'throws' ? renderThrow as any : renderPlayer as any)
   346	          }
   347	          ListHeaderComponent={activeTab === 'players' ? <PodiumView players={playerRankings} /> : null}
   348	          contentContainerStyle={styles.listContent}
   349	          refreshing={refreshing}
   350	          onRefresh={onRefresh}
   351	          ListEmptyComponent={
   352	            <View style={styles.emptyContainer}>
   353	              <MaterialCommunityIcons 
   354	                name={activeTab === 'rounds' ? "trophy-outline" : (activeTab === 'throws' ? "arrow-up-right-bold" : "account-group-outline")} 
   355	                size={64} 
   356	                color={COLORS.borderDark} 
   357	              />
   358	              <Text style={styles.emptyText}>No data available yet.</Text>
   359	            </View>
   360	          }
   361	        />
   362	      )}
   363	    </SafeAreaView>
   364	  );
   365	}
   366	
   367	const styles = StyleSheet.create({
   368	  container: {
   369	    flex: 1,
   370	    backgroundColor: COLORS.background,
   371	  },
   372	  header: {
   373	    paddingHorizontal: 20,
   374	    paddingTop: 20,
   375	    paddingBottom: 8,
   376	  },
   377	  title: {
   378	    fontSize: 32,
   379	    fontWeight: '800',
   380	    color: COLORS.text,
   381	    letterSpacing: -0.5,
   382	    marginBottom: 16,
   383	  },
   384	  tabBar: {
   385	    flexDirection: 'row',
   386	    gap: 12,
   387	    marginBottom: 8,
   388	  },
   389	  tab: {
   390	    paddingVertical: 8,
   391	    paddingHorizontal: 16,
   392	    borderRadius: 20,
   393	    backgroundColor: COLORS.surface,
   394	    borderWidth: 1,
   395	    borderColor: COLORS.borderDark,
   396	  },
   397	  activeTab: {
   398	    backgroundColor: COLORS.primary,
   399	    borderColor: COLORS.primary,
   400	  },
   401	  tabText: {
   402	    color: COLORS.textSecondary,
   403	    fontSize: 14,
   404	    fontWeight: '700',
   405	  },
   406	  activeTabText: {
   407	    color: COLORS.onPrimary,
   408	  },
   409	  listContent: {
   410	    padding: 16,
   411	    paddingBottom: 100,
   412	  },
   413	  matchCard: {
   414	    backgroundColor: COLORS.surface,
   415	    borderRadius: 20,
   416	    padding: 16,
   417	    marginBottom: 16,
   418	    borderWidth: 1,
   419	    borderColor: COLORS.borderDark,
   420	  },
   421	  matchHeader: {
   422	    flexDirection: 'row',
   423	    justifyContent: 'space-between',
   424	    alignItems: 'flex-start',
   425	    marginBottom: 16,
   426	  },
   427	  courseInfo: {
   428	    flex: 1,
   429	    marginRight: 12,
   430	  },
   431	  courseName: {
   432	    color: COLORS.text,
   433	    fontSize: 18,
   434	    fontWeight: '700',
   435	  },
   436	  layoutName: {
   437	    color: COLORS.primary,
   438	    fontSize: 12,
   439	    fontWeight: '600',
   440	    marginTop: 2,
   441	  },
   442	  matchDate: {
   443	    color: COLORS.textSecondary,
   444	    fontSize: 12,
   445	    fontWeight: '600',
   446	  },
   447	  playerList: {
   448	    backgroundColor: 'rgba(255,255,255,0.03)',
   449	    borderRadius: 12,
   450	    padding: 12,
   451	    marginBottom: 16,
   452	  },
   453	  playerRow: {
   454	    flexDirection: 'row',
   455	    justifyContent: 'space-between',
   456	    alignItems: 'center',
   457	    paddingVertical: 4,
   458	  },
   459	  playerName: {
   460	    color: COLORS.text,
   461	    fontSize: 14,
   462	    fontWeight: '500',
   463	    flex: 1,
   464	  },
   465	  playerScore: {
   466	    color: COLORS.text,
   467	    fontSize: 14,
   468	    fontWeight: '700',
   469	    fontFamily: 'JetBrains Mono',
   470	  },
   471	  morePlayers: {
   472	    color: COLORS.textSecondary,
   473	    fontSize: 11,
   474	    marginTop: 4,
   475	    fontStyle: 'italic',
   476	  },
   477	  matchFooter: {
   478	    flexDirection: 'row',
   479	    justifyContent: 'space-between',
   480	    alignItems: 'center',
   481	  },
   482	  creatorInfo: {
   483	    flexDirection: 'row',
   484	    alignItems: 'center',
   485	    gap: 6,
   486	  },
   487	  creatorName: {
   488	    color: COLORS.textSecondary,
   489	    fontSize: 12,
   490	  },
   491	  viewBtn: {
   492	    flexDirection: 'row',
   493	    alignItems: 'center',
   494	    gap: 4,
   495	  },
   496	  viewBtnText: {
   497	    color: COLORS.primary,
   498	    fontSize: 11,
   499	    fontWeight: '800',
   500	    letterSpacing: 0.5,
