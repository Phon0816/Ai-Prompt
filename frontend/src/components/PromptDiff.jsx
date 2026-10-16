import React, { useState } from 'react';

export default function PromptDiff({ rawPrompt, optimizedPrompt, rawScore = 0, optimizedScore = 10, diffTokens = 0 }) {
  const [copiedType, setCopiedType] = useState(null);

  const handleCopy = (text, type) => {
    navigator.clipboard.writeText(text);
    setCopiedType(type);
    setTimeout(() => setCopiedType(null), 2000);
  };

  const scoreIncrease = Math.max(0, optimizedScore - rawScore).toFixed(1);

  return (
    <div className="prompt-diff-container">
      {/* 1. Header so sánh điểm số & Thống kê */}
      <div className="diff-stats-header">
        <div className="diff-score-progression">
          <div className="score-badge-box raw">
            <span className="score-sub">Điểm Rubric thô:</span>
            <span className="score-num">{Number(rawScore).toFixed(1)}/10</span>
          </div>

          <div className="score-arrow-indicator">
            <span className="arrow-sym">➔</span>
            <span className="diff-gain-badge">+{scoreIncrease} điểm cải thiện</span>
          </div>

          <div className="score-badge-box optimized">
            <span className="score-sub">Điểm sau tối ưu:</span>
            <span className="score-num">{Number(optimizedScore).toFixed(1)}/10</span>
          </div>
        </div>

        <div className="diff-tokens-meta">
          <div className="token-meta-item">
            <span className="meta-lbl">Ký tự thô:</span>
            <span className="meta-val">{rawPrompt?.length || 0}</span>
          </div>
          <div className="token-meta-item">
            <span className="meta-lbl">Ký tự tối ưu:</span>
            <span className="meta-val">{optimizedPrompt?.length || 0}</span>
          </div>
          <div className="token-meta-item highlight">
            <span className="meta-lbl">Gia tăng ngữ cảnh:</span>
            <span className="meta-val">~{diffTokens} tokens</span>
          </div>
        </div>
      </div>

      {/* 2. So sánh đối chiếu 2 cột (Before vs After) */}
      <div className="diff-columns-grid">
        {/* Cột 1: Câu lệnh thô ban đầu */}
        <div className="diff-col-card before">
          <div className="diff-col-header">
            <div className="col-title-left">
              <span className="diff-tag before">BEFORE</span>
              <h4>Câu lệnh thô của người dùng</h4>
            </div>
            <button
              className="btn-diff-copy"
              onClick={() => handleCopy(rawPrompt, 'raw')}
            >
              {copiedType === 'raw' ? '✓ Đã sao chép' : 'Sao chép'}
            </button>
          </div>
          <div className="diff-text-area before">
            <pre className="diff-pre-content">{rawPrompt || '(Chưa có nội dung)'}</pre>
          </div>
          <div className="diff-col-footer warning">
            ⚠️ Thường thiếu vai trò, không nêu rõ ràng buộc, thiếu định dạng đầu ra và dễ gây ảo giác.
          </div>
        </div>

        {/* Cột 2: Câu lệnh đã tối ưu hóa */}
        <div className="diff-col-card after">
          <div className="diff-col-header">
            <div className="col-title-left">
              <span className="diff-tag after">AFTER</span>
              <h4>Prompt hoàn chỉnh được làm giàu (Enriched)</h4>
            </div>
            <button
              className="btn-diff-copy highlight"
              onClick={() => handleCopy(optimizedPrompt, 'opt')}
            >
              {copiedType === 'opt' ? '✓ Đã sao chép' : 'Sao chép Prompt tối ưu'}
            </button>
          </div>
          <div className="diff-text-area after">
            <pre className="diff-pre-content highlight-additions">
              {optimizedPrompt}
            </pre>
          </div>
          <div className="diff-col-footer success">
            ✓ Đã khống chế 6 slots kỹ thuật, nhúng thuật ngữ chuẩn, ràng buộc tiêu cực và guardrail an toàn.
          </div>
        </div>
      </div>
    </div>
  );
}
