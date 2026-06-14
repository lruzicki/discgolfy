import React from 'react';
import { render } from '@testing-library/react-native';
import { ScorecardView } from '../components/ScorecardView';
import { StyleSheet } from 'react-native';

jest.mock('@expo/vector-icons', () => ({
  Ionicons: 'Ionicons',
  MaterialCommunityIcons: 'MaterialCommunityIcons',
}));
jest.mock('@react-native-async-storage/async-storage', () => ({}));
jest.mock('../lib/supabase', () => ({
  supabase: {}
}));
jest.mock('react-native-webview', () => {
  const React = require('react');
  const { View } = require('react-native');
  return {
    WebView: React.forwardRef((props: any, ref: any) => <View {...props} testID="mock-webview" />)
  };
});

describe('ScorecardView', () => {
  it('scales cells proportionally without overflowing minWidth constraints', () => {
    const mockHoles = [
      { id: 'h1', hole_number: 1, par: 3 },
      { id: 'h2', hole_number: 2, par: 3 },
      { id: 'h3', hole_number: 3, par: 4 },
      { id: 'h4', hole_number: 4, par: 3 },
      { id: 'h5', hole_number: 5, par: 5 },
      { id: 'h6', hole_number: 6, par: 3 },
      { id: 'h7', hole_number: 7, par: 4 },
      { id: 'h8', hole_number: 8, par: 3 },
      { id: 'h9', hole_number: 9, par: 4 },
    ] as any[];

    const mockPlayers = [
      { id: 'p1', display_name: 'Player One' }
    ] as any[];

    const { getByTestId } = render(
      <ScorecardView holes={mockHoles} players={mockPlayers} scores={{}} showLeaderboard={false} />
    );

    const stickyCell = getByTestId('summary-cell-sticky');
    const normalCell = getByTestId('summary-cell-hole-h1');

    const flattenedSticky = StyleSheet.flatten(stickyCell.props.style);
    const flattenedNormal = StyleSheet.flatten(normalCell.props.style);

    // Instead of fixed minWidth that overflows small screens, they should use flex
    // and optionally a smaller minWidth or max width.
    expect(flattenedSticky.flex).toBeGreaterThan(0);
    
    // Normal cell should not have a minWidth of 36, or it should be flex based
    expect(flattenedNormal.flex).toBe(1);
    expect(flattenedNormal.minWidth).toBeUndefined(); // We want to remove the minWidth constraint so it fits
  });

  it('renders unplayable holes distinctly with X markers', () => {
    const mockHoles = [{ id: 'h1', hole_number: 1, par: 3 }] as any[];
    const mockPlayers = [
      { id: 'p1', display_name: 'Player One' },
      { id: 'p2', display_name: 'Player Two' },
    ] as any[];
    const mockScores = {
      h1: {
        p1: null,
        p2: null,
      },
    };

    const { getByTestId, getAllByText } = render(
      <ScorecardView holes={mockHoles} players={mockPlayers} scores={mockScores} showLeaderboard={false} />
    );

    const holeHeaderCell = getByTestId('summary-cell-hole-h1');
    const flattenedHeader = StyleSheet.flatten(holeHeaderCell.props.style);

    expect(getAllByText('X')).toHaveLength(2);
    expect(flattenedHeader.borderWidth).toBe(1);
  });

  it('renders a cleared player score as blank without marking the whole hole unplayable', () => {
    const mockHoles = [{ id: 'h1', hole_number: 1, par: 3 }] as any[];
    const mockPlayers = [
      { id: 'p1', display_name: 'Player One' },
      { id: 'p2', display_name: 'Player Two' },
    ] as any[];
    const mockScores = {
      h1: {
        p1: null,
        p2: 4,
      },
    };

    const { getByText, queryByText } = render(
      <ScorecardView holes={mockHoles} players={mockPlayers} scores={mockScores} showLeaderboard={false} />
    );

    expect(getByText('-')).toBeTruthy();
    expect(getByText('4')).toBeTruthy();
    expect(queryByText('X')).toBeNull();
  });
});
