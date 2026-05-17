import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { LoginScreen } from '../screens/LoginScreen';
import { RegisterScreen } from '../screens/RegisterScreen';
import { ProfileScreen } from '../screens/ProfileScreen';
import { supabase } from '../lib/supabase';

// Mock vector icons to avoid expo-font loading issues in Jest
jest.mock('@expo/vector-icons', () => {
  const React = require('react');
  const { View } = require('react-native');
  return {
    Ionicons: (props: any) => <View {...props} testID="mock-ionicons" />,
    MaterialCommunityIcons: (props: any) => <View {...props} testID="mock-material-icons" />,
  };
});

// Mock Supabase client
jest.mock('../lib/supabase', () => ({
  supabase: {
    auth: {
      signInWithPassword: jest.fn(),
      signUp: jest.fn(),
      getUser: jest.fn(),
    },
  },
}));

const Stack = createNativeStackNavigator();

function TestApp() {
  return (
    <NavigationContainer>
      <Stack.Navigator>
        <Stack.Screen name="Login" component={LoginScreen} />
        <Stack.Screen name="Register" component={RegisterScreen} />
        <Stack.Screen name="Profile" component={ProfileScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}

describe('Auth Flow', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('allows a user to register', async () => {
    (supabase.auth.signUp as jest.Mock).mockResolvedValue({
      data: { user: { id: 'user123', email: 'new@example.com' } },
      error: null,
    });

    const { getByPlaceholderText, getByText } = render(<TestApp />);

    // Start at Login, navigate to Register
    fireEvent.press(getByText('Sign Up'));

    // Verify we are on Register screen
    expect(getByText('Join the Course')).toBeTruthy();

    // Fill in the registration form
    fireEvent.changeText(getByPlaceholderText('Full Name'), 'New User');
    fireEvent.changeText(getByPlaceholderText('Email'), 'new@example.com');
    fireEvent.changeText(getByPlaceholderText('Password'), 'password123');

    // Tap Sign Up
    fireEvent.press(getByText('Sign Up'));

    // Verify Supabase signUp was called correctly
    expect(supabase.auth.signUp).toHaveBeenCalledWith({
      email: 'new@example.com',
      password: 'password123',
      options: {
        data: {
          full_name: 'New User',
        },
      },
    });
  });

  it('allows a user to log in and see their profile', async () => {
    // Setup mock to simulate successful login
    (supabase.auth.signInWithPassword as jest.Mock).mockResolvedValue({
      data: { user: { id: 'user123', email: 'test@example.com' } },
      error: null,
    });

    const { getByPlaceholderText, getByText, queryByText } = render(<TestApp />);

    // Initial state: We should be on the Login screen
    expect(getByText('Welcome Back')).toBeTruthy();

    // Fill in the form
    fireEvent.changeText(getByPlaceholderText('Email'), 'test@example.com');
    fireEvent.changeText(getByPlaceholderText('Password'), 'password123');

    // Tap Login
    fireEvent.press(getByText('Log In'));

    // Verify Supabase was called correctly
    expect(supabase.auth.signInWithPassword).toHaveBeenCalledWith({
      email: 'test@example.com',
      password: 'password123',
    });

    // Wait for navigation to Profile screen
    await waitFor(() => {
      expect(getByText('Lucas')).toBeTruthy(); // Checking for Profile name from design
      expect(queryByText('Welcome Back')).toBeNull();
    });
  });
});
