
import React from 'react';

interface IconProps {
  className?: string;
}

export const ChatBubbleIcon: React.FC<IconProps> = ({ className }) => (
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
      d="M20.25 8.511c.884.284 1.5 1.128 1.5 2.097v4.286c0 1.136-.847 2.1-1.98 2.193-.34.027-.68.052-1.02.072v3.091l-3.682-3.091c-.379-.318-.885-.372-1.314-.123a2.861 2.861 0 01-1.88.45H8.25a2.25 2.25 0 01-2.25-2.25v-6.572c0-.533.18-1.034.51-1.437A2.25 2.25 0 016.75 6.75h9.063c.707 0 1.35.316 1.79.821zM4.5 13.529V7.125A2.25 2.25 0 016.75 4.875h9.063a2.25 2.25 0 011.789.821M4.5 13.529c-.256 0-.512-.012-.762-.036a2.109 2.109 0 01-1.411-.564A2.09 2.09 0 011.5 11.042V7.125c0-1.136.847-2.1 1.98-2.193.34-.027.68-.052 1.02-.072V2.75l3.682 3.09c.379.318.885.372 1.313.123A2.861 2.861 0 0110.186 6h1.063M4.5 13.529V7.125" 
    />
  </svg>
);
