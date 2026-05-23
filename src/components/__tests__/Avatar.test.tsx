import React from 'react';
import { render } from '@testing-library/react-native';
import { Avatar } from '../Avatar';

describe('Avatar Component', () => {
  it('displays the first letter of the name when avatarUrl is null', () => {
    const { getByText } = render(
      <Avatar userId="123e4567-e89b-12d3-a456-426614174000" name="John Doe" avatarUrl={null} />
    );
    
    expect(getByText('J')).toBeTruthy();
  });

  it('generates a deterministic background color based on the userId', () => {
    const userId1 = "123e4567-e89b-12d3-a456-426614174000";
    const userId2 = "987fcdeb-51a2-43d7-9012-345678901234";

    const { getByTestId: getByTestId1 } = render(
      <Avatar userId={userId1} name="Alice" avatarUrl={null} />
    );
    const { getByTestId: getByTestId2 } = render(
      <Avatar userId={userId1} name="Alice" avatarUrl={null} />
    );
    const { getByTestId: getByTestId3 } = render(
      <Avatar userId={userId2} name="Bob" avatarUrl={null} />
    );

    const container1 = getByTestId1('avatar-container');
    const container2 = getByTestId2('avatar-container');
    const container3 = getByTestId3('avatar-container');

    const style1 = container1.props.style.find((s: any) => s && s.backgroundColor);
    const style2 = container2.props.style.find((s: any) => s && s.backgroundColor);
    const style3 = container3.props.style.find((s: any) => s && s.backgroundColor);

    expect(style1.backgroundColor).toBeDefined();
    // Same ID should give same color
    expect(style1.backgroundColor).toEqual(style2.backgroundColor);
    // Different IDs should give different colors (highly likely)
    expect(style1.backgroundColor).not.toEqual(style3.backgroundColor);
  });

  it('renders an image when avatarUrl is provided', () => {
    const { getByTestId, queryByText } = render(
      <Avatar userId="123" name="Alice" avatarUrl="https://example.com/avatar.jpg" />
    );

    const image = getByTestId('avatar-image');
    expect(image.props.source.uri).toBe('https://example.com/avatar.jpg');
    
    // Should not render initials
    expect(queryByText('A')).toBeNull();
  });
});
