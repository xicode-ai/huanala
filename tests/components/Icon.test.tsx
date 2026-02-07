import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { Icon } from '../../components/Icon';

describe('Icon', () => {
  it('renders with the correct icon name', () => {
    render(<Icon name="home" />);
    expect(screen.getByText('home')).toBeInTheDocument();
  });

  it('applies fill class when fill prop is true', () => {
    render(<Icon name="home" fill />);
    const icon = screen.getByText('home');
    expect(icon).toHaveClass('fill');
  });

  it('does not apply fill class by default', () => {
    render(<Icon name="home" />);
    const icon = screen.getByText('home');
    expect(icon).not.toHaveClass('fill');
  });

  it('applies custom className', () => {
    render(<Icon name="home" className="text-lg text-red-500" />);
    const icon = screen.getByText('home');
    expect(icon).toHaveClass('text-lg');
    expect(icon).toHaveClass('text-red-500');
  });
});
