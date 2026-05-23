import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { SelectCourseScreen } from '../screens/SelectCourseScreen';
import { useMatchStore } from '../store/useMatchStore';
import { supabase } from '../lib/supabase';

// Mock @expo/vector-icons
jest.mock('@expo/vector-icons', () => ({
  Ionicons: 'Ionicons',
  MaterialCommunityIcons: 'MaterialCommunityIcons',
  Feather: 'Feather',
}));

// Mock supabase
jest.mock('../lib/supabase', () => ({
  supabase: {
    auth: {
      getUser: jest.fn(() => Promise.resolve({ data: { user: null }, error: null })),
    },
    from: jest.fn((table) => {
      if (table === 'courses') {
        return {
          select: jest.fn(() => ({
            order: jest.fn(() => Promise.resolve({
              data: [
                { id: '1', name: 'Park Reagana', location: 'Gdańsk' },
                { id: '2', name: 'Jaśkowa', location: 'Gdańsk' },
                { id: '3', name: 'Na Zboczu', location: 'Gdańsk' },
              ],
              error: null,
            })),
          })),
        };
      }
      if (table === 'profiles') {
        return {
          select: jest.fn(() => ({
            eq: jest.fn(() => ({
              single: jest.fn(() => Promise.resolve({ data: { is_moderator: false }, error: null })),
            })),
          })),
        };
      }
      if (table === 'layouts') {
        return {
          select: jest.fn(() => ({
            eq: jest.fn((column, value) => Promise.resolve({
              data: [
                { id: `l1_${value}`, course_id: value, name: '9 Dołków', hole_count: 9 },
                { id: `l2_${value}`, course_id: value, name: '18 Dołków', hole_count: 18 },
              ],
              error: null,
            })),
          })),
        };
      }
      return {
        select: jest.fn(() => Promise.resolve({ data: [], error: null })),
      };
    }),
  },
}));

// Mock navigation
const mockNavigation = {
  navigate: jest.fn(),
};

describe('SelectCourseFlow', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useMatchStore.setState({
      courseId: '',
      layoutId: '',
    });
  });

  it('allows changing the selected layout via dropdown and passes it to the store', async () => {
    const { findByText, getByText, queryByText } = render(
      <SelectCourseScreen navigation={mockNavigation} />
    );

    // Wait for the first course's layouts to load
    await findByText('9 Dołków');

    // Default layout should be the first one
    expect(getByText('9 Dołków')).toBeTruthy();

    // Click the dropdown to show layouts
    const dropdownText = getByText('9 Dołków');
    fireEvent.press(dropdownText);

    // Ensure options are visible
    const option18 = await findByText('18 Dołków');
    
    // Select the 18 holes layout
    fireEvent.press(option18);

    // Dropdown should now show 18 Dołków
    // (There might be multiple texts, but we know it should be selected)
    expect(queryByText('18 Dołków')).toBeTruthy();

    // Play button
    const playButton = getByText('Graj');
    fireEvent.press(playButton);

    // Verify store was updated correctly
    const state = useMatchStore.getState();
    expect(state.courseId).toBe('1');
    expect(state.layoutId).toBe('l2_1');
    expect(mockNavigation.navigate).toHaveBeenCalledWith('SelectPlayers');
  });

  it('fetches courses from Supabase and allows selecting one while keeping others visible', async () => {
    const { findByText, getByText, getAllByText, queryByText } = render(
      <SelectCourseScreen navigation={mockNavigation} />
    );

    // Should fetch and display courses
    await findByText('Park Reagana');
    await findByText('Jaśkowa');
    const course3 = await findByText('Na Zboczu');

    // Select course 3
    fireEvent.press(course3);

    // Wait for layouts to load and show Graj button for course 3
    const playButton = await findByText('Graj');
    
    // VERIFY: Course 1 and 2 are still visible in the list
    expect(getByText('Park Reagana')).toBeTruthy();
    expect(getByText('Jaśkowa')).toBeTruthy();
    expect(getByText('Na Zboczu')).toBeTruthy();

    // Select course 2
    const course2 = getByText('Jaśkowa');
    fireEvent.press(course2);

    // Wait for layouts to load for course 2
    await findByText('Graj');

    // VERIFY: Course 1 and 3 are still visible in the list
    expect(getByText('Park Reagana')).toBeTruthy();
    expect(getByText('Na Zboczu')).toBeTruthy();

    // Verify that ONLY one 'Graj' button is rendered
    const playButtons = getAllByText('Graj');
    expect(playButtons.length).toBe(1);
    
    // Check for some detail that should be in the header
    // Use regex to match text that is concatenated in the UI
    expect(getAllByText(/Gdańsk/).length).toBe(3);
  });
});
