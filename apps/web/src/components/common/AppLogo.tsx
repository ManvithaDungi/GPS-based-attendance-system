import React from 'react';
import { cn } from '../../lib/utils';

type AppLogoProps = {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
};

const sizeClasses = {
  sm: 'w-8 h-8 rounded-lg',
  md: 'w-10 h-10 rounded-xl',
  lg: 'w-16 h-16 rounded-2xl',
};

export const AppLogo: React.FC<AppLogoProps> = ({ size = 'md', className }) => (
  <img
    src="/logo.png"
    alt="InDaZone"
    className={cn(sizeClasses[size], 'object-contain shrink-0', className)}
  />
);
