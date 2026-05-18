import React, { useEffect, useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { LoginScreen } from './src/screens/LoginScreen';
import { RegisterScreen } from './src/screens/RegisterScreen';
import { ProfileScreen } from './src/screens/ProfileScreen';
import { SelectCourseScreen } from './src/screens/SelectCourseScreen';
import { SelectPlayersScreen } from './src/screens/SelectPlayersScreen';
import { ActiveMatchScreen } from './src/screens/ActiveMatchScreen';
import { BagScreen } from './src/screens/BagScreen';
import { AddEditDiscScreen } from './src/screens/AddEditDiscScreen';
import { MatchSummaryScreen } from './src/screens/MatchSummaryScreen';
import { PlayScreen } from './src/screens/PlayScreen';
import { LeaderboardScreen } from './src/screens/LeaderboardScreen';
import { MatchHistoryScreen } from './src/screens/MatchHistoryScreen';
import { supabase } from './src/lib/supabase';
import { Session } from '@supabase/supabase-js';
import { StatusBar, ActivityIndicator, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { COLORS } from './src/theme';
import { Ionicons } from '@expo/vector-icons';
import { useMatchStore } from './src/store/useMatchStore';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

function PlayStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="PlayHome" component={PlayScreen} />
      <Stack.Screen name="SelectCourse" component={SelectCourseScreen} />
      <Stack.Screen name="SelectPlayers" component={SelectPlayersScreen} />
      <Stack.Screen name="ActiveMatch" component={ActiveMatchScreen} />
      <Stack.Screen name="MatchSummary" component={MatchSummaryScreen} />
    </Stack.Navigator>
  );
}

function ProfileStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="ProfileHome" component={ProfileScreen} />
      <Stack.Screen name="Bag" component={BagScreen} />
      <Stack.Screen name="AddEditDisc" component={AddEditDiscScreen} />
      <Stack.Screen name="MatchHistory" component={MatchHistoryScreen} />
    </Stack.Navigator>
  );
}

function MainTabs() {
  const matchId = useMatchStore(state => state.matchId);

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: '#1C1C1E',
          borderTopColor: 'rgba(255,255,255,0.1)',
          paddingBottom: 24,
          paddingTop: 12,
          height: 84,
        },
        tabBarActiveTintColor: COLORS.primary,
        tabBarInactiveTintColor: 'rgba(255,255,255,0.4)',
        tabBarLabelStyle: {
          fontSize: 10,
          fontWeight: '600',
          letterSpacing: 0.5,
          marginTop: 4,
        },
      }}
    >
      <Tab.Screen 
        name="Play" 
        component={PlayStack}
        options={{
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons 
              name={matchId ? (focused ? "play-circle" : "play-circle-outline") : (focused ? "disc" : "disc-outline")} 
              size={size + 4} 
              color={color} 
            />
          ),
        }}
      />
      <Tab.Screen 
        name="Leaderboard" 
        component={LeaderboardScreen}
        options={{
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons name={focused ? "podium" : "podium-outline"} size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen 
        name="Profile" 
        component={ProfileStack}
        options={{
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons name={focused ? "person" : "person-outline"} size={size} color={color} />
          ),
        }}
      />
    </Tab.Navigator>
  );
}

export default function App() {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: '#151517', justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  return (
    <SafeAreaProvider>
      <NavigationContainer>
        <StatusBar barStyle="light-content" backgroundColor="#151517" />
        <Stack.Navigator screenOptions={{ headerShown: false }}>
          {session && session.user ? (
            <Stack.Screen name="Main" component={MainTabs} />
          ) : (
            <>
              <Stack.Screen name="Login" component={LoginScreen} />
              <Stack.Screen name="Register" component={RegisterScreen} />
            </>
          )}
        </Stack.Navigator>
      </NavigationContainer>
    </SafeAreaProvider>
  );
}
