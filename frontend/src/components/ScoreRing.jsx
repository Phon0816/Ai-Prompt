import React from 'react';

export default function ScoreRing({ score = 0, maxScore = 10, size = 96, strokeWidth = 8 }) {
  const normalizedScore = Math.min(maxScore, Math.max(0, Number(score) || 0));
  const percentage = (normalizedScore / maxScore) * 100;

  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (percentage / 100) * circumference;

  // Màu sắc động dựa trên thang điểm 0 - 10
  let strokeColor = '#ef4444'; // Đỏ (< 5.0)
  let statusText = 'Cần bổ sung';
  let badgeColor = 'rgba(239, 68, 68, 0.15)';
  let textColor = '#f87171';

  if (normalizedScore >= 7.5) {
    strokeColor = '#10b981'; // Xanh ngọc (>= 7.5)
    statusText = 'Rất chi tiết';
    badgeColor = 'rgba(16, 185, 129, 0.15)';
    textColor = '#34d399';
  } else if (normalizedScore >= 5.0) {
    strokeColor = '#f59e0b'; // Vàng cam (5.0 - 7.4)
    statusText = 'Khá ổn';
    badgeColor = 'rgba(245, 158, 11, 0.15)';
    textColor = '#fbbf24';
  }

  return (
    <div className="score-ring-wrapper">
      <div className="score-ring-svg-box" style={{ width: size, height: size }}>
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
          {/* Vòng nền mờ */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="transparent"
            stroke="rgba(255, 255, 255, 0.08)"
            strokeWidth={strokeWidth}
          />
          {/* Vòng tiến độ gradient */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="transparent"
            stroke={strokeColor}
            strokeWidth={strokeWidth}
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            style={{
              transition: 'stroke-dashoffset 0.5s ease, stroke 0.4s ease',
              transform: 'rotate(-90deg)',
              transformOrigin: '50% 50%',
            }}
          />
        </svg>

        {/* Điểm số ở giữa vòng */}
        <div className="score-ring-center-text">
          <span className="score-value" style={{ color: strokeColor }}>
            {normalizedScore.toFixed(1)}
          </span>
          <span className="score-max">/{maxScore}</span>
        </div>
      </div>

      <div className="score-ring-info">
        <div
          className="score-status-pill"
          style={{ background: badgeColor, color: textColor }}
        >
          {statusText}
        </div>
        <div className="score-label">Điểm Rubric thô</div>
      </div>
    </div>
  );
}
