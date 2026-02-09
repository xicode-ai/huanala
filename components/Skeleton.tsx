import React from 'react';

interface SkeletonProps {
  className?: string;
  width?: string | number;
  height?: string | number;
  variant?: 'rect' | 'circle';
}

export const Skeleton: React.FC<SkeletonProps> = ({ className = '', width, height, variant = 'rect' }) => {
  const style = {
    width,
    height,
  };

  const baseClasses = 'bg-slate-200 animate-pulse';
  const variantClasses = variant === 'circle' ? 'rounded-full' : 'rounded-lg';

  return <div className={`${baseClasses} ${variantClasses} ${className}`} style={style}></div>;
};
