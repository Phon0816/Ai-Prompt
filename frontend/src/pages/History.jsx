import React, { useState, useEffect, useCallback } from 'react';
import { fetchHistory, fetchHistoryStats, deleteHistoryItem, clearAllHistory } from '../api/client';

const DOMAIN_LABELS = {
  it: { name: 'IT & Lập trình', icon: '💻' },
  healthcare: { name: 'Y tế & Sức khỏe', icon: '🏥' },
};

export default function History() {
  const [history, setHistory] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filterDomain, setFilterDomain] = useState(null);
  const [expandedId, setExpandedId] = useState(null);
  const [toastMsg, setToastMsg] = useState('');
  const [confirmClear, setConfirmClear] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const showToast = (msg) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(''), 3000);
  };

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [histData, statsData] = await Promise.all([
        fetchHistory(filterDomain, 50),
        fetchHistoryStats()
      ]);
      setHistory(histData);
      setStats(statsData);
    } catch (err) {
      setError(err.message || 'Không thể tải lịch sử.');
    } finally {
      setLoading(false);
    }
  }, [filterDomain]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleDelete = async (id) => {
    try {
      await deleteHistoryItem(id);
      showToast('Đã xóa bản ghi thành công.');
      if (expandedId === id) setExpandedId(null);
      loadData();
    } catch (err) {
      showToast('Lỗi: ' + err.message);
    }
  };

  const handleClearAll = async () => {
    try {
      await clearAllHistory();
      setConfirmClear(false);
      showToast('Đã xóa toàn bộ lịch sử.');
      loadData();
    } catch (err) {
      showToast('Lỗi: ' + err.message);
    }
  };

  const handleExportJSON = () => {
    if (!history.length) return;
    const blob = new Blob([JSON.stringify(history, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `prompt_history_${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('Đã tải xuống lịch sử dạng JSON.');
  };

  const handleExportMarkdown = () => {
    if (!history.length) return;
    let md = `# Lịch sử Tối ưu hóa Prompt\n\nXuất lúc: ${new Date().toLocaleString('vi-VN')}\nTổng: ${history.length} bản ghi\n\n---\n\n`;
    history.forEach((item, idx) => {
      const domLabel = DOMAIN_LABELS[item.domain_id]?.name || item.domain_id;
      md += `## ${idx + 1}. ${domLabel} — ${item.template_id || 'N/A'}\n`;
      md += `- **Thời gian:** ${item.timestamp}\n`;
      md += `- **Mô hình:** ${item.model_used || 'N/A'}\n`;
      md += `- **Điểm:** ${item.raw_score}/10 ➔ ${item.optimized_score}/10\n`;
      md += `- **Nguồn:** ${item.source || 'legacy'}\n`;
      md += `- **Thời gian xử lý:** ${item.execution_time_ms || 0} ms\n\n`;
      md += `### Prompt Thô:\n\`\`\`\n${item.raw_prompt || ''}\n\`\`\`\n\n`;
      md += `### Prompt Tối Ưu:\n${item.optimized_prompt || ''}\n\n---\n\n`;
    });
    const blob = new Blob([md], { type: 'text/markdown;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `prompt_history_${Date.now()}.md`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('Đã tải xuống lịch sử dạng Markdown.');
  };

  // Tìm mô hình dùng nhiều nhất
  const topModel = stats?.model_breakdown
    ? Object.entries(stats.model_breakdown).sort((a, b) => b[1] - a[1])[0]
    : null;

  const visibleHistory = history.filter((item) => {
    const haystack = `${item.raw_prompt || ''} ${item.optimized_prompt || ''} ${item.domain_id || ''} ${item.template_id || ''}`.toLowerCase();
    return haystack.includes(searchQuery.toLowerCase());
  });

  return (
    <div className="sub-page-container history-page">
      <div className="sub-page-header">
        <div className="sub-page-badge">LỊCH SỬ TỐI ƯU HÓA</div>
        <h2>Lịch sử & Thống kê Tối ưu Prompt</h2>
        <p>Search, review và quản lý các prompt đã tối ưu trong workspace của bạn.</p>
      </div>

      {/* 3 Thẻ KPI */}
      <div className="history-kpi-grid">
        <div className="kpi-card">
          <div className="kpi-icon">🔄</div>
          <div className="kpi-content">
            <div className="kpi-value">{stats?.total_runs ?? 0}</div>
            <div className="kpi-label">Tổng lần chạy</div>
          </div>
        </div>
        <div className="kpi-card highlight">
          <div className="kpi-icon">📈</div>
          <div className="kpi-content">
            <div className="kpi-value">+{stats?.avg_improvement?.toFixed(1) ?? '0.0'}</div>
            <div className="kpi-label">Điểm tăng trung bình</div>
          </div>
        </div>
        <div className="kpi-card">
          <div className="kpi-icon">🏆</div>
          <div className="kpi-content">
            <div className="kpi-value kpi-model-name">{topModel ? topModel[0] : '—'}</div>
            <div className="kpi-label">Mô hình dùng nhiều nhất{topModel ? ` (${topModel[1]} lần)` : ''}</div>
          </div>
        </div>
      </div>

      {/* Thanh điều khiển: Lọc + Hành động */}
      <div className="history-toolbar">
        <input className="library-search" type="search" value={searchQuery} onChange={(event) => setSearchQuery(event.target.value)} placeholder="Search prompts..." aria-label="Search prompts" />
        <div className="history-filters">
          <button
            className={`filter-chip ${filterDomain === null ? 'active' : ''}`}
            onClick={() => setFilterDomain(null)}
          >
            Tất cả
          </button>
          <button
            className={`filter-chip ${filterDomain === 'it' ? 'active' : ''}`}
            onClick={() => setFilterDomain('it')}
          >
            💻 IT
          </button>
          <button
            className={`filter-chip ${filterDomain === 'healthcare' ? 'active' : ''}`}
            onClick={() => setFilterDomain('healthcare')}
          >
            🏥 Y tế
          </button>
        </div>

        <div className="history-actions">
          <button className="btn-hist-action" onClick={handleExportJSON} disabled={!history.length}>
            💾 Xuất JSON
          </button>
          <button className="btn-hist-action" onClick={handleExportMarkdown} disabled={!history.length}>
            📄 Xuất Markdown
          </button>
          {!confirmClear ? (
            <button
              className="btn-hist-action danger"
              onClick={() => setConfirmClear(true)}
              disabled={!history.length}
            >
              🗑️ Xóa tất cả
            </button>
          ) : (
            <div className="confirm-clear-group">
              <span className="confirm-text">Chắc chắn?</span>
              <button className="btn-hist-action danger-confirm" onClick={handleClearAll}>Xóa</button>
              <button className="btn-hist-action" onClick={() => setConfirmClear(false)}>Hủy</button>
            </div>
          )}
        </div>
      </div>

      {/* Trạng thái Loading / Error / Empty */}
      {loading && (
        <div className="history-loading-state">
          <div className="skeleton-row" />
          <div className="skeleton-row short" />
          <div className="skeleton-row" />
        </div>
      )}

      {error && !loading && (
        <div className="history-error-state">
          <div className="error-icon">⚠️</div>
          <h3>Không thể tải lịch sử</h3>
          <p>{error}</p>
          <button className="btn-retry" onClick={loadData}>Thử lại</button>
        </div>
      )}

      {!loading && !error && history.length === 0 && (
        <div className="history-empty-state">
          <div className="empty-icon">📭</div>
          <h3>Chưa có lịch sử nào</h3>
          <p>Hãy sử dụng Wizard Tối Ưu để tạo prompt đầu tiên. Kết quả sẽ được tự động lưu tại đây.</p>
        </div>
      )}

      {/* Bảng lịch sử */}
      {!loading && !error && visibleHistory.length > 0 && (
        <div className="history-table-wrap">
          <div className="history-table-header">
            <span className="ht-col ht-time">Thời gian</span>
            <span className="ht-col ht-domain">Lĩnh vực</span>
            <span className="ht-col ht-template">Template</span>
            <span className="ht-col ht-model">Mô hình</span>
            <span className="ht-col ht-score">Điểm</span>
            <span className="ht-col ht-source">Nguồn</span>
            <span className="ht-col ht-actions">Thao tác</span>
          </div>

          {visibleHistory.map((item) => {
            const domInfo = DOMAIN_LABELS[item.domain_id] || { name: item.domain_id, icon: '❓' };
            const isExpanded = expandedId === item.id;
            const modelShort = item.model_used
              ? (item.model_used.includes('/') ? item.model_used.split('/')[1] : item.model_used)
              : '—';

            return (
              <div key={item.id} className={`history-row-group ${isExpanded ? 'expanded' : ''}`}>
                <div className="history-row" onClick={() => setExpandedId(isExpanded ? null : item.id)}>
                  <span className="ht-col ht-time">{item.timestamp || '—'}</span>
                  <span className="ht-col ht-domain">
                    <span className="domain-chip-mini">{domInfo.icon} {domInfo.name}</span>
                  </span>
                  <span className="ht-col ht-template">{item.template_id || '—'}</span>
                  <span className="ht-col ht-model" title={item.model_used}>{modelShort}</span>
                  <span className="ht-col ht-score">
                    <span className="score-before">{Number(item.raw_score).toFixed(1)}</span>
                    <span className="score-arrow">➔</span>
                    <span className="score-after">{Number(item.optimized_score).toFixed(1)}</span>
                  </span>
                  <span className="ht-col ht-source">
                    <span className={`source-badge ${item.source || 'legacy'}`}>
                      {item.source === 'openrouter' ? 'Cloud' : 'Lịch sử cũ'}
                    </span>
                  </span>
                  <span className="ht-col ht-actions">
                    <button
                      className="btn-row-delete"
                      title="Xóa bản ghi"
                      onClick={(e) => { e.stopPropagation(); handleDelete(item.id); }}
                    >
                      ✕
                    </button>
                    <span className="expand-arrow">{isExpanded ? '▲' : '▼'}</span>
                  </span>
                </div>

                {isExpanded && (
                  <div className="history-detail-panel">
                    <div className="detail-cols">
                      <div className="detail-col">
                        <div className="detail-label">Prompt Thô (gốc):</div>
                        <pre className="detail-pre raw">{item.raw_prompt || '(không có)'}</pre>
                      </div>
                      <div className="detail-col">
                        <div className="detail-label">Prompt Tối Ưu (6 Slots):</div>
                        <pre className="detail-pre opt">{item.optimized_prompt || '(không có)'}</pre>
                      </div>
                    </div>
                    <div className="detail-meta-bar">
                      <span>⏱ {item.execution_time_ms || 0} ms</span>
                      <span>Nguồn: Cloud OpenRouter</span>
                      <span>ID: {item.id}</span>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {toastMsg && (
        <div className="toast-float-notification">
          <span>{toastMsg}</span>
        </div>
      )}
    </div>
  );
}
