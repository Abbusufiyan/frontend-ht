import React from 'react';
import { Cpu } from 'lucide-react';

export const TopNavbar: React.FC = () => {
  return (
    <header className="top-navbar">
      {/* Left: Clean Brand Identity */}
      <div className="top-nav-left">
        <div className="brand-logo-container">
          <div className="brand-logo-gem">
            <Cpu size={18} strokeWidth={2.4} />
          </div>
          <div className="brand-name">
            CLARIX <span>NETWORKOPS</span>
          </div>
        </div>
      </div>
    </header>
  );
};
