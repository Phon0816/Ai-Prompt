import React, { useEffect, useState } from 'react';
import { fetchHistory, fetchHistoryStats } from '../api/client';
import { useWizard } from '../store/wizardContext';

export default function Dashboard() {
  const { setActiveTab, setRawPrompt } = useWizard();
  const [stats, setStats] = useState(null);
  const [recent, setRecent] = useState([]);
  const [loading, setLoading] = useState(true);
  const [quickPrompt, setQuickPrompt] = useState('');

  useEffect(() => {
    Promise.all([fetchHistoryStats(), fetchHistory(null, 5)])
      .then(([statsData, historyData]) => {
        setStats(statsData);
        setRecent(historyData);
      })
      .finally(() => setLoading(false));
  }, []);

  const startPrompt = (event) => {
    event.preventDefault();
    setRawPrompt(quickPrompt);
    setActiveTab('wizard');
  };

  return (
    <div className="dashboard-page product-page">
      <div className="product-page-heading">
        <div>
          <span className="eyebrow">Workspace overview</span>
          <h1>Build better prompts</h1>
          <p>Biến yêu cầu tự nhiên thành prompt rõ ràng, có ngữ cảnh và sẵn sàng sử dụng.</p>
        </div>
        <button className="primary-action" onClick={() => setActiveTab('wizard')}>＋ New prompt</button>
      </div>

      <form className="quick-prompt-card" onSubmit={startPrompt}>
        <div>
          <span className="quick-prompt-label">Start with an idea</span>
          <h2>Bạn muốn xây dựng prompt gì hôm nay?</h2>
        </div>
        <textarea
          value={quickPrompt}
          onChange={(event) => setQuickPrompt(event.target.value)}
          placeholder="Ví dụ: Viết API retry an toàn bằng TypeScript..."
          rows={3}
        />
        <div className="quick-prompt-footer">
          <span>Nemotron + domain skills</span>
          <button className="primary-action" type="submit" disabled={!quickPrompt.trim()}>Optimize prompt →</button>
        </div>
      </form>

      <div className="dashboard-metrics">
        <div className="metric-card"><span>Total runs</span><strong>{loading ? '—' : stats?.total_runs ?? 0}</strong><small>All time</small></div>
        <div className="metric-card"><span>Average improvement</span><strong>{loading ? '—' : `+${stats?.avg_improvement?.toFixed(1) ?? '0.0'}`}</strong><small>Rubric score</small></div>
        <div className="metric-card"><span>Primary model</span><strong>Nemotron</strong><small>OpenRouter cloud</small></div>
      </div>

      <section className="dashboard-section">
        <div className="section-heading"><div><span className="eyebrow">Recent activity</span><h2>Recent prompts</h2></div><button className="text-action" onClick={() => setActiveTab('history')}>View library →</button></div>
        <div className="recent-list">
          {!recent.length && !loading && <div className="product-empty">Chưa có prompt nào. Hãy tạo prompt đầu tiên.</div>}
          {recent.map((item) => (
            <button className="recent-item" key={item.id} onClick={() => setActiveTab('history')}>
              <span className="recent-item-icon">{item.domain_id === 'healthcare' ? '＋' : '⌘'}</span>
              <span className="recent-item-copy"><strong>{item.raw_prompt || 'Untitled prompt'}</strong><small>{item.domain_id} · {item.execution_mode || 'legacy'} · {item.timestamp || '—'}</small></span>
              <span className="recent-arrow">→</span>
            </button>
          ))}
        </div>
      </section>
    </div>
  );
}
