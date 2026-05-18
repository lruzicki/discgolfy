import React, { useEffect, useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { LoginScreen } from './src/screens/LoginScreen';
import { RegisterScreen } from './src/screens/RegisterScreen';
import { ProfileScreen } from './src/screens/ProfileScreen';
import { SelectCourseScreen } from './src/screens/SelectCourseScreen';
import { SelectPlayersScreen } from './src/screens/SelectPlayersScreen';
import { ActiveMatchScreen } from './src/screens/ActiveMatchScreen';
import { BagScreen } from './src/screens/BagScreen';
import { AddEditDiscScreen } from './src/screens/AddEditDiscScreen';
import { MatchSummaryScreen } from './src/screens/MatchSummaryScreen';
import { supabase } from './src/lib/supabase';
import { Session } from '@supabase/supabase-js';
import { StatusBar, ActivityIndicator, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { COLORS } from './src/theme';

const Stack = createNativeStackNavigator();

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
            // Authenticated Stack
            <>
              <Stack.Screen name="SelectCourse" component={SelectCourseScreen} />
              <Stack.Screen name="SelectPlayers" component={SelectPlayersScreen} />
              <Stack.Screen name="ActiveMatch" component={ActiveMatchScreen} />
              <Stack.Screen name="Bag" component={BagScreen} />
              <Stack.Screen name="AddEditDisc" component={AddEditDiscScreen} />
              <Stack.Screen name="MatchSummary" component={MatchSummaryScreen} />
              <Stack.Screen 
                name="Profile" 
                component={ProfileScreen} 
                initialParams={{ email: session.user.email }}
              />
            </>
          ) : (
            // Auth Stack
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
