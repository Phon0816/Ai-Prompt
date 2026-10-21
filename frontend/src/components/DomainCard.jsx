import React from 'react';

export default function DomainCard({ domain, isSelected, onSelect }) {
  return (
    <div
      className={`domain-card ${isSelected ? 'selected' : ''} ${domain.id}`}
      onClick={() => onSelect(domain)}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          onSelect(domain);
        }
      }}
      role="button"
      tabIndex={0}
      aria-pressed={isSelected}
      aria-label={`${isSelected ? 'Đã chọn' : 'Chọn'} lĩnh vực ${domain.name}`}
    >
      {/* Top Header of Card */}
      <div className="domain-card-header">
        <div className="domain-icon-box">
          {domain.icon === 'code' ? (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="16 18 22 12 16 6" />
              <polyline points="8 6 2 12 8 18" />
            </svg>
          ) : domain.icon === 'megaphone' ? (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="m3 11 18-5v12L3 14v-3Z" />
              <path d="M11.6 16.2 13 21H9l-1.8-6.1" />
              <path d="M5 10v5" />
            </svg>
          ) : domain.icon === 'book-open' ? (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M2 4.8A2.8 2.8 0 0 1 4.8 2H12v18H4.8A2.8 2.8 0 0 0 2 22Z" />
              <path d="M22 4.8A2.8 2.8 0 0 0 19.2 2H12v18h7.2a2.8 2.8 0 0 1 2.8 2Z" />
            </svg>
          ) : (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
            </svg>
          )}
        </div>

        <div className="domain-select-radio">
          <div className={`radio-outer ${isSelected ? 'checked' : ''}`}>
            {isSelected && <div className="radio-inner" />}
          </div>
        </div>
      </div>

      {/* Main Title & One-sentence Description */}
      <div className="domain-card-body">
        <h3 className="domain-title">{domain.name}</h3>
        <p className="domain-short-desc">{domain.short_desc}</p>

        {/* Warning Badge if domain requires it */}
        {domain.has_warning_badge && (
          <div className="domain-warning-badge">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
              <line x1="12" y1="9" x2="12" y2="13" />
              <line x1="12" y1="17" x2="12.01" y2="17" />
            </svg>
            <span>{domain.badge_text || 'Cảnh báo bắt buộc: Bắt buộc Medical Disclaimer'}</span>
          </div>
        )}

        {/* Sample Tasks Section */}
        <div className="domain-tasks-section">
          <div className="tasks-label">3 Ví dụ nhiệm vụ điển hình:</div>
          <div className="tasks-list">
            {(domain.sample_tasks || []).slice(0, 2).map((task, idx) => (
              <div key={idx} className="task-chip">
                <span className="task-bullet">✦</span>
                <span className="task-text">{task}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Footer Info */}
      <div className="domain-card-footer">
        <span className="templates-count-badge">
          📁 {domain.templates_count} mẫu chuyên sâu sẵn sàng
        </span>
        <span className="select-action-hint">
          {isSelected ? '✓ Đã chọn' : 'Nhấp để chọn →'}
        </span>
      </div>
    </div>
  );
}
