import React from 'react';
import { cn } from '../../lib/utils';

interface NeumorphicCardProps {
  children?: React.ReactNode;
  className?: string;
  key?: React.Key;
  onClick?: React.MouseEventHandler<HTMLDivElement>;
  variant?: 'raised' | 'inset';
}

export const NeumorphicCard = ({ 
  variant = 'raised', 
  children, 
  className, 
  ...props 
}: NeumorphicCardProps) => {
  return (
    <div 
      className={cn(
        'rounded-[2rem] bg-surface-light dark:bg-surface-dark transition-all duration-300',
        variant === 'raised' ? 'neumorphic-raised' : 'neumorphic-inset',
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
};
