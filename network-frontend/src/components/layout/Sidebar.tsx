import React from 'react';
import {
  LayoutDashboard,
  Network,
  Server,
  AlertOctagon,
  Sparkles,
  ActivitySquare,
  Settings,
} from 'lucide-react';
import { NavigationPage } from '../../types/network';

interface SidebarProps {
  currentPage: NavigationPage;
  onNavigate: (page: NavigationPage) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ currentPage, onNavigate }) => {
  const topNavItems: { id: NavigationPage; label: string; icon: React.ReactNode }[] = [
    { id: 'dashboard', label: 'Overview', icon: <LayoutDashboard size={20} /> },
    { id: 'topology', label: 'Network Topology', icon: <Network size={20} /> },
    { id: 'devices', label: 'Devices', icon: <Server size={20} /> },
    { id: 'incidents', label: 'Incidents', icon: <AlertOctagon size={20} /> },
    { id: 'investigation', label: 'AI Investigation', icon: <Sparkles size={20} /> },
  ];

  const bottomNavItems: { id: NavigationPage; label: string; icon: React.ReactNode }[] = [
    { id: 'diagnostics', label: 'Diagnostics', icon: <ActivitySquare size={20} /> },
    { id: 'settings', label: 'Settings', icon: <Settings size={20} /> },
  ];

  return (
    <aside className="app-sidebar" aria-label="Main Navigation">
      <div className="sidebar-group-top">
        {topNavItems.map((item) => {
          const isActive = currentPage === item.id;
          return (
            <button
              key={item.id}
              className={`sidebar-nav-btn ${isActive ? 'active' : ''}`}
              onClick={() => onNavigate(item.id)}
              aria-label={item.label}
              title={item.label}
            >
              {item.icon}
            </button>
          );
        })}
      </div>

      <div className="sidebar-group-bottom">
        {bottomNavItems.map((item) => {
          const isActive = currentPage === item.id;
          return (
            <button
              key={item.id}
              className={`sidebar-nav-btn ${isActive ? 'active' : ''}`}
              onClick={() => onNavigate(item.id)}
              aria-label={item.label}
              title={item.label}
            >
              {item.icon}
            </button>
          );
        })}
      </div>
    </aside>
  );
};
