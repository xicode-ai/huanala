import { render } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { Skeleton } from '../../components/Skeleton';

describe('Skeleton', () => {
  it('renders with default rect variant', () => {
    const { container } = render(<Skeleton />);
    const el = container.firstChild as HTMLElement;
    expect(el).toHaveClass('rounded-lg');
    expect(el).toHaveClass('animate-pulse');
  });

  it('renders with circle variant', () => {
    const { container } = render(<Skeleton variant="circle" />);
    const el = container.firstChild as HTMLElement;
    expect(el).toHaveClass('rounded-full');
  });

  it('applies custom className', () => {
    const { container } = render(<Skeleton className="h-10 w-32" />);
    const el = container.firstChild as HTMLElement;
    expect(el).toHaveClass('h-10');
    expect(el).toHaveClass('w-32');
  });

  it('applies inline width and height styles', () => {
    const { container } = render(<Skeleton width={100} height={50} />);
    const el = container.firstChild as HTMLElement;
    expect(el).toHaveStyle({ width: '100px', height: '50px' });
  });
});
