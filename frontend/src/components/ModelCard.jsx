import React, { useState } from 'react';

export default function ModelCard({ scoredItem, isSelected, onSelect }) {
  const { rank, model, final_score, score_breakdown, reasons, is_top_choice } = scoredItem;
  const [showDetails, setShowDetails] = useState(false);

  // Format context window
  const contextFormatted = model.context_window >= 1000000 
    ? `${(model.context_window / 1000000).toFixed(0)}M tokens`
    : `${(model.context_window / 1000).toFixed(0)}k tokens`;

  // Cost tier badge color
  const costColorMap = {
    free: { text: 'Miễn phí 100%', badgeClass: 'cost-free' },
    low: { text: 'Siêu tiết kiệm', badgeClass: 'cost-low' },
    medium: { text: 'Tiêu chuẩn', badgeClass: 'cost-medium' },
    high: { text: 'Cao cấp', badgeClass: 'cost-high' }
  };
  const costMeta = costColorMap[model.cost_tier] || { text: model.cost_tier, badgeClass: 'cost-medium' };

  return (
    <div className={`model-card-item ${isSelected ? 'selected' : ''} ${is_top_choice ? 'top-choice' : ''}`}>
      {/* Top Banner if Top Choice */}
      {is_top_choice && (
        <div className="top-choice-banner">
          <span>★ KHUYẾN NGHỊ HÀNG ĐẦU DỰA TRÊN TRỌNG SỐ</span>
        </div>
      )}

      {/* Header */}
      <div className="model-card-header">
        <div className="model-rank-badge">
          <span className="rank-label">Hạng</span>
          <span className="rank-number">{rank}</span>
        </div>

        <div className="model-titles-box">
          <h3 className="model-display-name">{model.name}</h3>
          <div className="model-provider-tags">
            <span className="provider-pill">Đơn vị: {model.provider}</span>
            <span className={`cost-pill ${costMeta.badgeClass}`}>{costMeta.text}</span>
            <span className="context-pill">Context: {contextFormatted}</span>
          </div>
        </div>

        {/* Score Ring/Number Box */}
        <div className="model-score-box">
          <div className="final-score-value">{final_score.toFixed(1)}</div>
          <div className="final-score-max">/10</div>
          <div className="final-score-label">Điểm tổng</div>
        </div>
      </div>

      {/* Score Breakdown Bars */}
      <div className="score-breakdown-row">
        <div className="breakdown-stat" title="Độ phù hợp tác vụ">
          <span className="stat-label">Tác vụ</span>
          <span className="stat-val">{score_breakdown?.task_fit || 0}</span>
        </div>
        <div className="breakdown-stat" title="Xử lý Tiếng Việt">
          <span className="stat-label">Tiếng Việt</span>
          <span className="stat-val">{score_breakdown?.vietnamese || 0}</span>
        </div>
        <div className="breakdown-stat" title="Tiết kiệm chi phí">
          <span className="stat-label">Chi phí</span>
          <span className="stat-val">{score_breakdown?.cost || 0}</span>
        </div>
        <div className="breakdown-stat" title="Tốc độ phản hồi">
          <span className="stat-label">Tốc độ</span>
          <span className="stat-val">{score_breakdown?.speed || 0}</span>
        </div>
      </div>

      {/* Specific Reasons in Vietnamese */}
      <div className="model-reasons-box">
        <div className="reasons-heading">Lý do đề xuất cụ thể:</div>
        <ul className="reasons-list">
          {(reasons || []).map((reason, idx) => (
            <li key={idx}>
              <span className="reason-check">✓</span>
              <span>{reason}</span>
            </li>
          ))}
        </ul>
      </div>

      {/* Toggle Chi tiết Điểm mạnh & Điểm yếu */}
      <div className="model-details-toggle-area">
        <button
          className="btn-toggle-details"
          onClick={() => setShowDetails(!showDetails)}
        >
          <span>{showDetails ? 'Thu gọn ưu / nhược điểm ▲' : 'Xem ưu & nhược điểm kỹ thuật ▼'}</span>
        </button>

        {showDetails && (
          <div className="model-expanded-details">
            <div className="strengths-box">
              <strong>Điểm mạnh nổi bật:</strong>
              <ul>
                {(model.strengths || []).map((s, i) => (
                  <li key={i}>+ {s}</li>
                ))}
              </ul>
            </div>
            <div className="weaknesses-box">
              <strong>Lưu ý hạn chế:</strong>
              <ul>
                {(model.weaknesses || []).map((w, i) => (
                  <li key={i}>- {w}</li>
                ))}
              </ul>
            </div>
          </div>
        )}
      </div>

      {/* Action Select Button */}
      <div className="model-card-actions">
        <button
          className={`btn-select-this-model ${isSelected ? 'active' : ''}`}
          onClick={() => onSelect(model)}
        >
          {isSelected ? (
            <>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" width="16" height="16">
                <polyline points="20 6 9 17 4 12" />
              </svg>
              <span>Đang chọn mô hình này</span>
            </>
          ) : (
            <span>Chọn mô hình này để thực thi →</span>
          )}
        </button>
      </div>
    </div>
  );
}
