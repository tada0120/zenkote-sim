
import React from 'react';

interface IconProps {
  className?: string;
}

export const RetweetIcon: React.FC<IconProps> = ({ className }) => (
  <svg 
    xmlns="http://www.w3.org/2000/svg" 
    viewBox="0 0 24 24" 
    strokeWidth={1.5} 
    stroke="currentColor"
    fill="none"
    className={className || "w-6 h-6"}
  >
    <path 
      strokeLinecap="round" 
      strokeLinejoin="round" 
      d="M19.5 12c0-2.761-2.239-5-5-5H6.75M19.5 12v3.75M19.5 12h-6.75m0 0v3.75m0-3.75L9 9.75M4.5 12c0 2.761 2.239 5 5 5h8.25M4.5 12V8.25M4.5 12h6.75m0 0V8.25m0 3.75L15 14.25" 
    />
  </svg>
);
