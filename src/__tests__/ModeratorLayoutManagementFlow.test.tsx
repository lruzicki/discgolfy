import React from 'react';
import { fireEvent, render, waitFor } from '@testing-library/react-native';
import { SelectCourseScreen } from '../screens/SelectCourseScreen';
import { ModeratorCoursesScreen } from '../screens/ModeratorCoursesScreen';
import { ModeratorCourseDetailsScreen } from '../screens/ModeratorCourseDetailsScreen';
import { ModeratorLayoutDetailsScreen } from '../screens/ModeratorLayoutDetailsScreen';
import { Pressable, View } from 'react-native';

jest.mock('@expo/vector-icons', () => ({
  Ionicons: 'Ionicons',
  MaterialCommunityIcons: 'MaterialCommunityIcons',
  Feather: 'Feather',
}));

jest.mock('react-native-webview', () => {
  const React = require('react');
  const { Pressable, View } = require('react-native');

  return {
    WebView: ({ testID, onMessage }: any) => (
      <Pressable
        testID={testID}
        onPress={(event: any) =>
          onMessage?.({
            nativeEvent: {
              data: JSON.stringify({
                type: 'pick',
                latitude: event?.nativeEvent?.coordinate?.latitude ?? 0,
                longitude: event?.nativeEvent?.coordinate?.longitude ?? 0,
              }),
            },
          })
        }
      >
        <View />
      </Pressable>
    ),
  };
});

let mockIsModerator = false;
const mockCourseInsert = jest.fn(async (payload: any) => ({ data: [{ id: 'course-new', ...payload }], error: null }));
const mockLayoutInsert = jest.fn(async (payload: any) => ({ data: [{ id: 'layout-new', ...payload }], error: null }));
const mockHolesInsert = jest.fn(async () => ({ error: null }));
const mockHolesUpdateEq = jest.fn(async () => ({ error: null }));
const mockHolesUpdate = jest.fn(() => ({ eq: mockHolesUpdateEq }));
const mockHolesDeleteEq = jest.fn(async () => ({ error: null }));
const mockHolesDelete = jest.fn(() => ({ eq: mockHolesDeleteEq }));
const mockCourseHolesInsert = jest.fn(async (payload: any) => ({ data: [{ id: 'ch-new', ...payload }], error: null }));
const mockCourseHolesUpdateEq = jest.fn(async () => ({ error: null }));
const mockCourseHolesUpdate = jest.fn(() => ({ eq: mockCourseHolesUpdateEq }));
const mockLayoutsUpdateEq = jest.fn(async () => ({ error: null }));
const mockLayoutsUpdate = jest.fn(() => ({ eq: mockLayoutsUpdateEq }));
const mockLayoutHolesInsert = jest.fn(async () => ({ error: null }));
const mockLayoutHolesUpdateEq = jest.fn(async () => ({ error: null }));
const mockLayoutHolesUpdate = jest.fn(() => ({ eq: mockLayoutHolesUpdateEq }));
const mockLayoutHolesDeleteEq = jest.fn(async () => ({ error: null }));
const mockLayoutHolesDelete = jest.fn(() => ({ eq: mockLayoutHolesDeleteEq }));
const mockCourseMapsInsert = jest.fn(async (payload: any) => ({ data: [{ id: 'map-new', ...payload }], error: null }));
const mockHolesSelect = jest.fn(async () => ({ 
  data: [{ id: 'h1', hole_number: 1, par: 3, distance_m: 90, tee_latitude: 1, tee_longitude: 2, basket_latitude: 3, basket_longitude: 4 }], 
  error: null 
}));
const mockCourseHolesSelect = jest.fn(async () => ({
  data: [
    { id: 'ch1', course_id: 'c1', hole_number: 1, name: 'Hole 1', par: 3, distance_m: 90, tee_latitude: 1, tee_longitude: 2, basket_latitude: 3, basket_longitude: 4 },
    { id: 'ch2', course_id: 'c1', hole_number: 2, name: 'Hole 2', par: 4, distance_m: 120, tee_latitude: null, tee_longitude: null, basket_latitude: null, basket_longitude: null },
  ],
  error: null,
}));
const mockLayoutHolesSelect = jest.fn(async () => ({
  data: [
    { id: 'lh1', layout_id: 'l1', course_hole_id: 'ch1', position: 1 },
  ],
  error: null,
}));
const mockCourseMapsSelect = jest.fn(async () => ({
  data: [{ id: 'map1', course_id: 'c1', name: 'Main Park Map', style_key: 'park' }],
  error: null,
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
          update: mockLayoutsUpdate,
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
      if (table === 'course_holes') {
        return {
          select: jest.fn(() => ({
            eq: jest.fn(() => ({
              order: jest.fn(() => mockCourseHolesSelect())
            }))
          })),
          insert: jest.fn((payload) => ({
            select: jest.fn(async () => mockCourseHolesInsert(payload))
          })),
          update: mockCourseHolesUpdate,
        };
      }
      if (table === 'layout_holes') {
        return {
          select: jest.fn(() => ({
            eq: jest.fn((field: string, value: string) => {
              const all = [{ id: 'lh1', layout_id: 'l1', course_hole_id: 'ch1', position: 1 }];
              if (field === 'layout_id') {
                return Promise.resolve({ data: all.filter((row) => row.layout_id === value), error: null });
              }
              if (field === 'course_hole_id') {
                return Promise.resolve({ data: all.filter((row) => row.course_hole_id === value), error: null });
              }
              return Promise.resolve({ data: [], error: null });
            })
          })),
          insert: mockLayoutHolesInsert,
          update: mockLayoutHolesUpdate,
          delete: mockLayoutHolesDelete,
        };
      }
      if (table === 'course_maps') {
        return {
          select: jest.fn(() => ({
            eq: jest.fn(() => ({
              order: jest.fn(() => mockCourseMapsSelect())
            }))
          })),
          insert: jest.fn((payload) => ({
            select: jest.fn(async () => mockCourseMapsInsert(payload))
          })),
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
      
      const layouts = await findAllByText('Base Layout');
      fireEvent.press(layouts[layouts.length - 1]);

      expect(mockNavigation.navigate).toHaveBeenCalledWith('ModeratorLayoutDetails', { layoutId: 'l1', layoutName: 'Base Layout', courseId: 'c1' });
    });

    it('allows adding a new layout and clones holes if selected', async () => {
      const { findByText, findAllByText, findByPlaceholderText } = render(<ModeratorCourseDetailsScreen navigation={mockNavigation} route={route} />);
      await findByText('LAYOUTS');

      fireEvent.changeText(await findByPlaceholderText('New Layout Name'), 'Pro Layout');
      fireEvent.press((await findAllByText('Base Layout'))[0]);
      fireEvent.press(await findByText('Add Layout'));

      await waitFor(() => {
        expect(mockLayoutInsert).toHaveBeenCalledWith({ course_id: 'c1', name: 'Pro Layout', hole_count: 1 });
      });

      // Verify that new holes were inserted
      expect(mockHolesInsert).toHaveBeenCalledWith([{
        layout_id: 'layout-new',
        hole_number: 1,
        par: 3,
        distance_m: 90,
        tee_latitude: 1,
        tee_longitude: 2,
        basket_latitude: 3,
        basket_longitude: 4
      }]);
    });

    it('shows separate management sections and allows creating reusable course holes and metadata-only maps', async () => {
      const { findByText, findByPlaceholderText, findAllByPlaceholderText } = render(
        <ModeratorCourseDetailsScreen navigation={mockNavigation} route={route} />
      );

      await findByText('COURSE HOLE POOL');
      await findByText('LAYOUTS');
      await findByText('COURSE MAPS');
      await findByText('Main Park Map');

      fireEvent.changeText((await findAllByPlaceholderText('Hole Number'))[0], '7');
      fireEvent.changeText((await findAllByPlaceholderText('Par'))[0], '4');
      fireEvent.changeText((await findAllByPlaceholderText('Distance (m)'))[0], '110');
      fireEvent.press(await findByText('Add Course Hole'));

      await waitFor(() => {
        expect(mockCourseHolesInsert).toHaveBeenCalledWith({
          course_id: 'c1',
          hole_number: 7,
          name: 'Hole 7',
          par: 4,
          distance_m: 110,
        });
      });

      fireEvent.changeText(await findByPlaceholderText('Map Name'), 'Winter map');
      fireEvent.press(await findByText('Add Map'));

      await waitFor(() => {
        expect(mockCourseMapsInsert).toHaveBeenCalledWith({
          course_id: 'c1',
          name: 'Winter map',
          style_key: 'park',
        });
      });
    });

    it('lets the moderator edit a reusable course hole on a real map surface', async () => {
      const { findByText, findAllByPlaceholderText, findByTestId } = render(
        <ModeratorCourseDetailsScreen navigation={mockNavigation} route={route} />
      );

      await findByText('COURSE HOLE POOL');
      fireEvent.press(await findByTestId('course-hole-chip-ch1'));
      fireEvent.changeText((await findAllByPlaceholderText('Hole Number'))[1], '1');
      fireEvent.press(await findByTestId('course-hole-map-picker-ch1-map'), {
        nativeEvent: { coordinate: { latitude: 54.35, longitude: 18.65 } },
      });
      fireEvent.press(await findByText('Basket'));
      fireEvent.press(await findByTestId('course-hole-map-picker-ch1-map'), {
        nativeEvent: { coordinate: { latitude: 54.351, longitude: 18.651 } },
      });
      fireEvent.press(await findByText('Save Course Hole'));

      await waitFor(() => {
        expect(mockCourseHolesUpdate).toHaveBeenCalledWith({
          hole_number: 1,
          name: 'Hole 1',
          par: 3,
          distance_m: 90,
          tee_latitude: 54.35,
          tee_longitude: 18.65,
          basket_latitude: 54.351,
          basket_longitude: 18.651,
        });
        expect(mockCourseHolesUpdateEq).toHaveBeenCalledWith('id', 'ch1');
      });
    });
  });

  describe('ModeratorLayoutDetailsScreen', () => {
    const route = { params: { layoutId: 'l1', layoutName: 'Base Layout', courseId: 'c1' } };

    it('shows layout details without standalone playable-hole creation UI', async () => {
      const { findByText, queryByText } = render(<ModeratorLayoutDetailsScreen navigation={mockNavigation} route={route} />);
      
      await findByText('LAYOUT DETAILS');
      expect(queryByText('PLAYABLE HOLES')).toBeNull();
      expect(queryByText('Add Hole')).toBeNull();
    });

    it('shows included and excluded course holes and selects existing holes into the layout', async () => {
      const { findByText } = render(<ModeratorLayoutDetailsScreen navigation={mockNavigation} route={route} />);

      await findByText('Included #1');
      await findByText('AVAILABLE COURSE HOLES');
      await findByText('Hole 2');

      fireEvent.press(await findByText('Add to Layout'));

      await waitFor(() => {
        expect(mockLayoutHolesInsert).toHaveBeenCalledWith({
          layout_id: 'l1',
          course_hole_id: 'ch2',
          position: 2,
        });
        expect(mockHolesInsert).toHaveBeenCalledWith({
          layout_id: 'l1',
          hole_number: 2,
          par: 4,
          distance_m: 120,
          tee_latitude: null,
          tee_longitude: null,
          basket_latitude: null,
          basket_longitude: null,
        });
      });
    });

    it('allows map-first tee and basket coordinate correction on the canonical course hole', async () => {
      const { findByText, findByTestId } = render(<ModeratorLayoutDetailsScreen navigation={mockNavigation} route={route} />);

      await findByText('MAP EDITOR');

      fireEvent.press(await findByTestId('hole-map-picker-ch1-map'), {
        nativeEvent: { coordinate: { latitude: 54.35, longitude: 18.65 } },
      });
      await findByText('Tee 54.3500, 18.6500');

      fireEvent.press(await findByText('Basket'));
      fireEvent.press(await findByTestId('hole-map-picker-ch1-map'), {
        nativeEvent: { coordinate: { latitude: 54.351, longitude: 18.651 } },
      });
      await findByText('Basket 54.3510, 18.6510');

      fireEvent.press(await findByText('Save Course Hole Coordinates'));

      await waitFor(() => {
        expect(mockCourseHolesUpdate).toHaveBeenCalledWith({
          hole_number: 1,
          name: 'Hole 1',
          tee_latitude: 54.35,
          tee_longitude: 18.65,
          basket_latitude: 54.351,
          basket_longitude: 18.651,
          par: 3,
          distance_m: 90,
        });
        expect(mockCourseHolesUpdateEq).toHaveBeenCalledWith('id', 'ch1');
        expect(mockHolesUpdateEq).toHaveBeenCalledWith('id', 'h1');
      });
    });
  });
});
