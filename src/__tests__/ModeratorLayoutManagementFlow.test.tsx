import React from 'react';
import { fireEvent, render, waitFor } from '@testing-library/react-native';
import { SelectCourseScreen } from '../screens/SelectCourseScreen';
import { ModeratorCoursesScreen } from '../screens/ModeratorCoursesScreen';
import { ModeratorCourseDetailsScreen } from '../screens/ModeratorCourseDetailsScreen';
import { ModeratorLayoutDetailsScreen } from '../screens/ModeratorLayoutDetailsScreen';

jest.mock('@expo/vector-icons', () => ({
  Ionicons: 'Ionicons',
  MaterialCommunityIcons: 'MaterialCommunityIcons',
  Feather: 'Feather',
}));

let mockIsModerator = false;
const mockCourseInsert = jest.fn(async (payload: any) => ({ data: [{ id: 'course-new', ...payload }], error: null }));
const mockLayoutInsert = jest.fn(async (payload: any) => ({ data: [{ id: 'layout-new', ...payload }], error: null }));
const mockHolesInsert = jest.fn(async () => ({ error: null }));
const mockHolesUpdateEq = jest.fn(async () => ({ error: null }));
const mockHolesUpdate = jest.fn(() => ({ eq: mockHolesUpdateEq }));
const mockHolesDeleteEq = jest.fn(async () => ({ error: null }));
const mockHolesDelete = jest.fn(() => ({ eq: mockHolesDeleteEq }));
const mockHolesSelect = jest.fn(async () => ({ 
  data: [{ id: 'h1', hole_number: 1, par: 3, tee_latitude: 1, tee_longitude: 2, basket_latitude: 3, basket_longitude: 4 }], 
  error: null 
}));

jest.mock('../lib/supabase', () => ({
  supabase: {
    auth: {
      getUser: jest.fn(async () => ({ data: { user: { id: 'auth-1' } }, error: null })),
    },
    from: jest.fn((table: string) => {
      if (table === 'courses') {
        return { 
          select: jest.fn(() => ({
            order: jest.fn(async () => ({ data: [{ id: 'c1', name: 'Park', location: 'Gdańsk' }], error: null }))
          })),
          insert: mockCourseInsert
        };
      }
      if (table === 'layouts') {
        return {
          select: jest.fn(() => ({ 
            eq: jest.fn(() => ({
              order: jest.fn(async () => ({ data: [{ id: 'l1', course_id: 'c1', name: 'Base Layout', hole_count: 1 }], error: null }))
            }))
          })),
          insert: jest.fn((payload) => ({
            select: jest.fn(async () => mockLayoutInsert(payload))
          }))
        };
      }
      if (table === 'holes') {
        return {
          select: jest.fn(() => ({ 
            eq: jest.fn(() => ({
              order: jest.fn(() => mockHolesSelect())
            }))
          })),
          insert: mockHolesInsert,
          update: mockHolesUpdate,
          delete: mockHolesDelete
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
  const mockNavigation = { navigate: jest.fn(), goBack: jest.fn() };

  beforeEach(() => {
    jest.clearAllMocks();
    mockIsModerator = false;
  });

  describe('Entry Point', () => {
    it('hides moderator entry point for non-moderator users', async () => {
      const { findByText, queryByTestId } = render(<SelectCourseScreen navigation={mockNavigation} />);
      await findByText('Park');

      expect(queryByTestId('moderator-entry-button')).toBeNull();
    });

    it('shows moderator entry point for moderators and navigates to ModeratorCourses', async () => {
      mockIsModerator = true;
      const { findByText, findByTestId } = render(<SelectCourseScreen navigation={mockNavigation} />);
      await findByText('Park');

      const button = await findByTestId('moderator-entry-button');
      fireEvent.press(button);

      expect(mockNavigation.navigate).toHaveBeenCalledWith('ModeratorCourses');
    });
  });

  describe('ModeratorCoursesScreen', () => {
    it('displays list of courses and navigates to details', async () => {
      const { findByText } = render(<ModeratorCoursesScreen navigation={mockNavigation} />);
      
      const course = await findByText('Park');
      fireEvent.press(course);

      expect(mockNavigation.navigate).toHaveBeenCalledWith('ModeratorCourseDetails', { courseId: 'c1', courseName: 'Park' });
    });

    it('allows adding a new course', async () => {
      const { findByText, findByPlaceholderText } = render(<ModeratorCoursesScreen navigation={mockNavigation} />);
      await findByText('Park');

      fireEvent.changeText(await findByPlaceholderText('New Course Name'), 'Forest');
      fireEvent.changeText(await findByPlaceholderText('Location'), 'Warsaw');
      fireEvent.press(await findByText('Add Course'));

      await waitFor(() => {
        expect(mockCourseInsert).toHaveBeenCalledWith({ name: 'Forest', location: 'Warsaw' });
      });
    });
  });

  describe('ModeratorCourseDetailsScreen', () => {
    const route = { params: { courseId: 'c1', courseName: 'Park' } };

    it('displays list of layouts and navigates to layout details', async () => {
      const { findAllByText } = render(<ModeratorCourseDetailsScreen navigation={mockNavigation} route={route} />);
      
      const elements = await findAllByText('Base Layout');
      fireEvent.press(elements[1]);

      expect(mockNavigation.navigate).toHaveBeenCalledWith('ModeratorLayoutDetails', { layoutId: 'l1', layoutName: 'Base Layout', courseId: 'c1' });
    });

    it('allows adding a new layout and clones holes if selected', async () => {
      const { findAllByText, findByText, findByPlaceholderText } = render(<ModeratorCourseDetailsScreen navigation={mockNavigation} route={route} />);
      await findAllByText('Base Layout');

      fireEvent.changeText(await findByPlaceholderText('New Layout Name'), 'Pro Layout');
      fireEvent.press(await findByText('Add Layout'));

      await waitFor(() => {
        expect(mockLayoutInsert).toHaveBeenCalledWith({ course_id: 'c1', name: 'Pro Layout', hole_count: 1 });
      });

      // Verify that new holes were inserted
      expect(mockHolesInsert).toHaveBeenCalledWith([{
        layout_id: 'layout-new',
        hole_number: 1,
        par: 3,
        tee_latitude: 1,
        tee_longitude: 2,
        basket_latitude: 3,
        basket_longitude: 4
      }]);
    });
  });

  describe('ModeratorLayoutDetailsScreen', () => {
    const route = { params: { layoutId: 'l1', layoutName: 'Base Layout', courseId: 'c1' } };

    it('displays holes and allows adding a new hole', async () => {
      const { findByText } = render(<ModeratorLayoutDetailsScreen navigation={mockNavigation} route={route} />);
      
      await findByText('Hole 1');
      fireEvent.press(await findByText('Add Hole'));

      await waitFor(() => {
        expect(mockHolesInsert).toHaveBeenCalledWith({
          layout_id: 'l1',
          hole_number: 2, // next hole number
          par: 3,
        });
      });
    });

    it('allows editing and deleting an existing hole', async () => {
      const { findByText, findAllByPlaceholderText } = render(<ModeratorLayoutDetailsScreen navigation={mockNavigation} route={route} />);
      
      await findByText('Hole 1');
      
      const pars = await findAllByPlaceholderText('Par');
      fireEvent.changeText(pars[0], '4');
      fireEvent.press(await findByText('Save'));

      await waitFor(() => {
        expect(mockHolesUpdateEq).toHaveBeenCalledWith('id', 'h1');
      });

      fireEvent.press(await findByText('Delete'));

      await waitFor(() => {
        expect(mockHolesDeleteEq).toHaveBeenCalledWith('id', 'h1');
      });
    });
  });
});
