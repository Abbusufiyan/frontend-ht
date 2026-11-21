import React, { useState, useEffect, useCallback } from 'react';
import { TopNavbar } from './components/layout/TopNavbar';
import { Sidebar } from './components/layout/Sidebar';
import { DashboardPage } from './pages/DashboardPage';
import { TopologyPage } from './pages/TopologyPage';
import { IncidentsPage } from './pages/IncidentsPage';
import { DevicesPage } from './pages/DevicesPage';
import { AIInvestigationPage } from './pages/AIInvestigationPage';
import { DiagnosticsPage } from './pages/DiagnosticsPage';
import { SettingsPage } from './pages/SettingsPage';
import { networkService } from './services/networkService';
import {
  NavigationPage,
  NetworkStatus,
  TopologyData,
  Device,
  Incident,
  DemoMode,
} from './types/network';

import './styles/global.css';
import './styles/dashboard.css';

export const App: React.FC = () => {
  const [currentPage, setCurrentPage] = useState<NavigationPage>('dashboard');

  // TWO NETWORK DEMONSTRATION MODES STATE
  const [demoMode, setDemoMode] = useState<DemoMode>('healthy');

  const [status, setStatus] = useState<NetworkStatus | null>(null);
  const [topology, setTopology] = useState<TopologyData | null>(null);
  const [devices, setDevices] = useState<Device[]>([]);
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [aiInitialQuery, setAiInitialQuery] = useState<string>('Analyze Network');

  const loadData = useCallback(async (mode: DemoMode = demoMode) => {
    setIsRefreshing(true);
    try {
      const [statusRes, topoRes, devRes, incRes] = await Promise.all([
        networkService.getStatus(mode),
        networkService.getTopology(mode),
        networkService.getDevices(undefined, undefined, mode),
        networkService.getIncidents(undefined, undefined, undefined, mode),
      ]);

      setStatus(statusRes.data);
      setTopology(topoRes.data);
      setDevices(devRes.data);
      setIncidents(incRes.data);
    } catch (err) {
      console.warn('NetworkOps service fetch fallback applied:', err);
    } finally {
      setIsRefreshing(false);
    }
  }, [demoMode]);

  // Handle switching between Demo 1 and Demo 2
  const handleSelectDemoMode = (mode: DemoMode) => {
    setDemoMode(mode);
    loadData(mode);
  };

  useEffect(() => {
    loadData(demoMode);
  }, [demoMode]);

  const handleNavigateToAI = (query: string) => {
    setAiInitialQuery(query);
    setCurrentPage('investigation');
  };

  return (
    <div className="app-viewport">
      {/* Background Robot Figure Atmosphere from assets.zip */}
      <div className="app-fig-backdrop" aria-hidden="true">
        <img src="/assets/robot-1.jpg" alt="" className="app-fig-img" />
        <div className="app-fig-overlay" />
      </div>

      <div className="app-container-inner">
        {/* Top Navbar with Clean Brand Identity */}
        <TopNavbar />

        {/* Main Body: Sidebar + Active Page */}
        <div className="app-main-layout">
          <Sidebar currentPage={currentPage} onNavigate={setCurrentPage} />

          <main className="app-content-area">
            {status && topology ? (
              <>
                {currentPage === 'dashboard' && (
                  <DashboardPage
                    status={status}
                    topology={topology}
                    incidents={incidents}
                    demoMode={demoMode}
                    onSelectDemoMode={handleSelectDemoMode}
                    onRefresh={() => loadData(demoMode)}
                    isRefreshing={isRefreshing}
                    onNavigate={setCurrentPage}
                    onNavigateToAI={handleNavigateToAI}
                  />
                )}

                {currentPage === 'topology' && (
                  <TopologyPage
                    topology={topology}
                    devices={devices}
                    status={status}
                    demoMode={demoMode}
                    onSelectDemoMode={handleSelectDemoMode}
                    onNavigateToAI={handleNavigateToAI}
                  />
                )}

                {currentPage === 'incidents' && (
                  <IncidentsPage
                    incidents={incidents}
                    onNavigateToAI={handleNavigateToAI}
                  />
                )}

                {currentPage === 'devices' && (
                  <DevicesPage
                    devices={devices}
                    onNavigateToAI={handleNavigateToAI}
                  />
                )}

                {currentPage === 'investigation' && (
                  <AIInvestigationPage
                    initialQuery={aiInitialQuery}
                    demoMode={demoMode}
                    onSelectDemoMode={handleSelectDemoMode}
                  />
                )}

                {currentPage === 'diagnostics' && <DiagnosticsPage />}

                {currentPage === 'settings' && <SettingsPage />}
              </>
            ) : (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  height: '400px',
                  color: '#00f2fe',
                  gap: '12px',
                }}
              >
                <div
                  style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '50%',
                    border: '3px solid rgba(0, 242, 254, 0.2)',
                    borderTopColor: '#00f2fe',
                    animation: 'spin 1s linear infinite',
                  }}
                />
                <span>Loading Clarix NetworkOps Demo Scenarios...</span>
              </div>
            )}
          </main>
        </div>
      </div>
    </div>
  );
};

export default App;
