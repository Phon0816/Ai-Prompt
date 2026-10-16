import React from 'react';
import { useWizard } from '../store/wizardContext';

export default function Navbar() {
  const { activeTab, setActiveTab, backendStatus, backendMeta } = useWizard();

  return (
    <aside className="navbar-header product-sidebar">
      <div className="navbar-container product-sidebar-inner">
        {/* Brand Area */}
        <div className="navbar-brand" onClick={() => setActiveTab('landing')} role="button" tabIndex={0} onKeyDown={(event) => event.key === 'Enter' && setActiveTab('landing')}>
          <div className="brand-logo-badge">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
            </svg>
          </div>
          <div className="brand-titles">
            <div className="brand-main-title">
              PromptContext
            </div>
            <div className="brand-subtitle">
              AI workspace
            </div>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="sidebar-section-label">Workspace</div>
        <nav className="navbar-nav-tabs product-nav">
          <button className={`nav-tab-btn ${activeTab === 'landing' ? 'active' : ''}`} onClick={() => setActiveTab('landing')}>
            <span className="nav-tab-icon">✦</span><span>Home</span>
          </button>
          <button className={`nav-tab-btn ${activeTab === 'dashboard' ? 'active' : ''}`} onClick={() => setActiveTab('dashboard')}>
            <span className="nav-tab-icon">▦</span><span>Overview</span>
          </button>
          <button
            className={`nav-tab-btn ${activeTab === 'wizard' ? 'active' : ''}`}
            onClick={() => setActiveTab('wizard')}
          >
            <span className="nav-tab-icon">＋</span>
            <span>New prompt</span>
          </button>

          <button
            className={`nav-tab-btn ${activeTab === 'history' ? 'active' : ''}`}
            onClick={() => setActiveTab('history')}
          >
            <span className="nav-tab-icon">▤</span>
            <span>Prompt library</span>
          </button>

          <button
            className={`nav-tab-btn ${activeTab === 'settings' ? 'active' : ''}`}
            onClick={() => setActiveTab('settings')}
          >
            <span className="nav-tab-icon">⚙</span>
            <span>Settings</span>
          </button>
        </nav>

        {/* Status Indicator */}
        <div className="sidebar-spacer" />
        <div className="navbar-status-area product-status">
          <div className={`status-pill ${backendStatus}`}>
            <span className="status-dot"></span>
            <span className="status-text">
              {backendStatus === 'online'
                ? 'Cloud connected'
                : backendStatus === 'checking'
                ? 'Checking connection...'
                : 'Connection unavailable'}
            </span>
          </div>
        </div>
      </div>
    </aside>
  );
}
