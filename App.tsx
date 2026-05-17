import React, { useEffect, useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { LoginScreen } from './src/screens/LoginScreen';
import { RegisterScreen } from './src/screens/RegisterScreen';
import { ProfileScreen } from './src/screens/ProfileScreen';
import { SelectCourseScreen } from './src/screens/SelectCourseScreen';
import { supabase } from './src/lib/supabase';
import { Session } from '@supabase/supabase-js';
import { StatusBar } from 'react-native';

const Stack = createNativeStackNavigator();

export default function App() {
  const [session, setSession] = useState<Session | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
    });

    supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });
  }, []);

  return (
    <NavigationContainer>
      <StatusBar barStyle="light-content" backgroundColor="#151517" />
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {session && session.user ? (
          // Authenticated Stack
          <>
            <Stack.Screen name="SelectCourse" component={SelectCourseScreen} />
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
        
        {/* We also allow navigating to Login from SelectCourse for dev purposes if not fully guarded */}
        <Stack.Screen name="LoginModal" component={LoginScreen} />
        <Stack.Screen name="ProfileModal" component={ProfileScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
