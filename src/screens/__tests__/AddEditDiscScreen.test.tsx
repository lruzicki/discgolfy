import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { AddEditDiscScreen } from '../AddEditDiscScreen';

const mockGoBack = jest.fn();
const mockNavigate = jest.fn();

const mockInsert = jest.fn();
const mockUpdate = jest.fn();
const mockEq = jest.fn();
const mockSingle = jest.fn();
const mockSelect = jest.fn();

jest.mock('@expo/vector-icons', () => ({
  Ionicons: 'Ionicons',
}));

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({
    goBack: mockGoBack,
    navigate: mockNavigate,
  }),
  useRoute: () => ({
    params: {},
  }),
}));

jest.mock('../../lib/supabase', () => ({
  supabase: {
    auth: {
      getUser: jest.fn().mockResolvedValue({
        data: { user: { id: 'auth-1' } },
      }),
    },
    from: jest.fn((table: string) => {
      if (table === 'profiles') {
        return {
          select: mockSelect.mockReturnValue({
            eq: mockEq.mockReturnValue({
              single: mockSingle.mockResolvedValue({
                data: { id: 'profile-1' },
                error: null,
              }),
            }),
          }),
        };
      }

      if (table === 'discs') {
        return {
          insert: mockInsert.mockResolvedValue({ error: null }),
          update: mockUpdate.mockReturnValue({
            eq: mockEq,
          }),
        };
      }

      return {};
    }),
  },
}));

describe('AddEditDiscScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockInsert.mockResolvedValue({ error: null });
  });

  it('saves multi-character disc name in one payload', async () => {
    const screen = render(<AddEditDiscScreen />);

    fireEvent.changeText(screen.getByDisplayValue(''), 'Destroyer');
    fireEvent.press(screen.getByText('Save'));

    await waitFor(() => {
      expect(mockInsert).toHaveBeenCalledWith(expect.objectContaining({
        name: 'Destroyer',
      }));
    });

    expect(mockInsert).toHaveBeenCalledTimes(1);
  });

  it('saves edited numeric field without dropping typed value', async () => {
    const screen = render(<AddEditDiscScreen />);

    fireEvent.changeText(screen.getByDisplayValue(''), 'Buzzz');
    fireEvent.changeText(screen.getAllByDisplayValue('0')[0], '12');
    fireEvent.press(screen.getByText('Save'));

    await waitFor(() => {
      expect(mockInsert).toHaveBeenCalledWith(expect.objectContaining({
        speed: 12,
      }));
    });

    expect(mockInsert).toHaveBeenCalledTimes(1);
  });
});
