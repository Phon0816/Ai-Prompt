import React from 'react';
import { WizardProvider, useWizard } from './store/wizardContext';
import Navbar from './components/Navbar';
import Wizard from './pages/Wizard';
import History from './pages/History';
import Settings from './pages/Settings';
import Dashboard from './pages/Dashboard';
import LandingPage from './pages/LandingPage';

function AppContent() {
  const { activeTab } = useWizard();
  const isLanding = activeTab === 'landing';

  return (
    <div className={`app-shell ${isLanding ? 'landing-shell' : 'product-shell'}`}>
      {!isLanding && <Navbar />}

      <main className={`main-content-layout ${isLanding ? 'landing-main' : 'product-main'}`}>
        {activeTab === 'landing' && <LandingPage />}
        {activeTab === 'dashboard' && <Dashboard />}
        {activeTab === 'wizard' && <Wizard />}
        {activeTab === 'history' && <History />}
        {activeTab === 'settings' && <Settings />}
      </main>

      {!isLanding && <footer className="app-footer product-footer">
        <div className="footer-inner">
          <p>
            <strong>Đề tài môn học:</strong> Ứng dụng Web Khuyến nghị mô hình AI và Tối ưu hóa câu lệnh (Prompt) theo ngữ cảnh cho chuyên ngành IT và Y tế.
          </p>
          <p className="footer-credits">
            Kiến trúc: FastAPI Backend + React Vite State Machine + Domain Pack JSON Database
          </p>
        </div>
      </footer>}
    </div>
  );
}

export default function App() {
  return (
    <WizardProvider>
      <AppContent />
    </WizardProvider>
  );
}
