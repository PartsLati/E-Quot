import React from 'react';
import { UT_LOGO_BASE64 } from './ut-logo-base64';

interface UTLogoProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

export const UTLogo: React.FC<UTLogoProps> = ({ className = '', size = 'md' }) => {
  // Exact height matching the standard quotation header
  const heightPx = size === 'sm' ? 32 : size === 'lg' ? 48 : 40;

  return (
    <div className={`inline-flex items-center select-none ${className}`}>
      <img
        src={UT_LOGO_BASE64}
        alt="United Tractors - member of ASTRA"
        style={{ height: `${heightPx}px`, width: 'auto' }}
        className="object-contain block max-w-none"
      />
    </div>
  );
};
