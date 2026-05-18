import React from 'react';
import { render } from '@testing-library/react-native';
import { PodiumView } from '../PodiumView';

// Mock vector icons
jest.mock('@expo/vector-icons', () => {
  const React = require('react');
  const { View } = require('react-native');
  return {
    Ionicons: (props: any) => <View {...props} />,
    MaterialCommunityIcons: (props: any) => <View {...props} />,
  };
});

describe('PodiumView', () => {
  const mockPlayers = [
    { id: '1', display_name: 'Player 1', avg_diff: -2.5, rounds_played: 10, best_score: -5 },
    { id: '2', display_name: 'Player 2', avg_diff: 1.2, rounds_played: 5, best_score: 0 },
    { id: '3', display_name: 'Player 3', avg_diff: 3.0, rounds_played: 8, best_score: 1 },
  ];

  it('renders the top 3 players', () => {
    const { getByText } = render(<PodiumView players={mockPlayers} />);
    
    expect(getByText('Player 1')).toBeTruthy();
    expect(getByText('Player 2')).toBeTruthy();
    expect(getByText('Player 3')).toBeTruthy();
  });

  it('renders correctly with fewer than 3 players', () => {
    const { getByText, queryByText } = render(<PodiumView players={mockPlayers.slice(0, 1)} />);
    
    expect(getByText('Player 1')).toBeTruthy();
    expect(queryByText('Player 2')).toBeNull();
  });

  it('places the winner in the center and 2nd on the left', () => {
    const { getByTestId } = render(<PodiumView players={mockPlayers} />);
    
    // We'll add testIDs to verify position
    const podium = getByTestId('podium-container');
    expect(podium.props.children[0].props.testID).toBe('podium-item-1'); // 2nd place
    expect(podium.props.children[1].props.testID).toBe('podium-item-0'); // 1st place
    expect(podium.props.children[2].props.testID).toBe('podium-item-2'); // 3rd place
  });
});
