import React from 'react';
import { fireEvent, render, waitFor } from '@testing-library/react-native';
import { SelectCourseScreen } from '../screens/SelectCourseScreen';

jest.mock('@expo/vector-icons', () => ({
  Ionicons: 'Ionicons',
  MaterialCommunityIcons: 'MaterialCommunityIcons',
  Feather: 'Feather',
}));

let mockIsModerator = false;
const mockInsert = jest.fn(async (payload: any) => ({ data: [{ id: 'layout-new', ...payload }], error: null }));
const mockUpdateEq = jest.fn(async () => ({ error: null }));
const mockUpdate = jest.fn(() => ({ eq: mockUpdateEq }));
const mockDeleteEq = jest.fn(async () => ({ error: null }));
const mockDelete = jest.fn(() => ({ eq: mockDeleteEq }));
const mockHoleInsert = jest.fn(async () => ({ data: [{ id: 'h2' }], error: null }));

jest.mock('../lib/supabase', () => ({
  supabase: {
    auth: {
      getUser: jest.fn(async () => ({ data: { user: { id: 'auth-1' } }, error: null })),
    },
    from: jest.fn((table: string) => {
      if (table === 'courses') {
        return { select: jest.fn(async () => ({ data: [{ id: 'c1', name: 'Park', location: 'Gdańsk' }], error: null })) };
      }
      if (table === 'layouts') {
        return {
          select: jest.fn(() => ({ eq: jest.fn(async () => ({ data: [{ id: 'l1', course_id: 'c1', name: 'Base Layout', hole_count: 1 }], error: null })) })),
          insert: mockInsert,
        };
      }
      if (table === 'holes') {
        return {
          select: jest.fn(() => ({ eq: jest.fn(async () => ({ data: [{ id: 'h1', layout_id: 'l1', hole_number: 1, par: 3, tee_latitude: 1, tee_longitude: 2, basket_latitude: 3, basket_longitude: 4 }], error: null })) })),
          update: mockUpdate,
          insert: mockHoleInsert,
          delete: mockDelete,
        };
      }
      if (table === 'profiles') {
        return {
          select: jest.fn(() => ({ eq: jest.fn(() => ({ single: jest.fn(async () => ({ data: { id: 'p1', is_moderator: mockIsModerator }, error: null })) })) })),
        };
      }
      return { select: jest.fn(async () => ({ data: [], error: null })) };
    }),
  },
}));

describe('ModeratorLayoutManagementFlow', () => {
  const mockNavigation = { navigate: jest.fn() };

  beforeEach(() => {
    jest.clearAllMocks();
    mockIsModerator = false;
  });

  it('hides moderator controls for non-moderator users', async () => {
    const { findByText, queryByText } = render(<SelectCourseScreen navigation={mockNavigation} />);
    await findByText('Park');

    expect(queryByText('Manage Layouts')).toBeNull();
    expect(queryByText('Add Layout')).toBeNull();
  });

  it('lets moderators create a layout and edit hole fields', async () => {
    mockIsModerator = true;
    const { findByText, findByPlaceholderText, getByText } = render(<SelectCourseScreen navigation={mockNavigation} />);

    await findByText('Manage Layouts');
    fireEvent.changeText(await findByPlaceholderText('New layout name'), 'Pro Layout');
    fireEvent.press(getByText('Add Layout'));

    await waitFor(() => {
      expect(mockInsert).toHaveBeenCalledWith({ course_id: 'c1', name: 'Pro Layout', hole_count: 0 });
    });

    fireEvent.changeText(await findByPlaceholderText('Par'), '4');
    fireEvent.changeText(await findByPlaceholderText('Tee lat'), '54.1');
    fireEvent.press(getByText('Save Hole'));

    await waitFor(() => {
      expect(mockUpdateEq).toHaveBeenCalledWith('id', 'h1');
    });

    fireEvent.press(getByText('Add Hole'));
    await waitFor(() => {
      expect(mockHoleInsert).toHaveBeenCalled();
    });

    fireEvent.press(getByText('Remove Hole'));
    await waitFor(() => {
      expect(mockDeleteEq).toHaveBeenCalledWith('id', 'h1');
    });
  });
});
