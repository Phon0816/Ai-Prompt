import React, { useState } from 'react';

export default function TemplatePicker({ templates = [], selectedTemplate, onSelectTemplate }) {
  const [searchTerm, setSearchTerm] = useState('');

  const filteredTemplates = templates.filter((tpl) => {
    if (!searchTerm.trim()) return true;
    const term = searchTerm.toLowerCase();
    return (
      tpl.title.toLowerCase().includes(term) ||
      tpl.description.toLowerCase().includes(term) ||
      (tpl.category && tpl.category.toLowerCase().includes(term))
    );
  });

  return (
    <div className="template-picker-container">
      {/* Header & Search Input */}
      <div className="template-picker-header">
        <div className="template-picker-title-row">
          <span className="picker-title">DANH MỤC TEMPLATE</span>
          <span className="templates-count-tag">{filteredTemplates.length} mẫu</span>
        </div>

        <div className="template-search-wrapper">
          <svg className="search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            type="text"
            className="template-search-input"
            placeholder="Tìm kiếm mẫu nhiệm vụ..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          {searchTerm && (
            <button className="clear-search-btn" onClick={() => setSearchTerm('')}>
              ✕
            </button>
          )}
        </div>
      </div>

      {/* Templates List */}
      <div className="template-cards-scroll">
        {filteredTemplates.length === 0 ? (
          <div className="empty-templates-message">
            Không tìm thấy mẫu phù hợp với từ khóa "{searchTerm}".
          </div>
        ) : (
          filteredTemplates.map((tpl) => {
            const isSelected = selectedTemplate?.id === tpl.id;
            return (
              <div
                key={tpl.id}
                className={`template-pick-card ${isSelected ? 'selected' : ''}`}
                onClick={() => onSelectTemplate(tpl)}
              >
                <div className="tpl-card-top">
                  <span className="tpl-category-badge">{tpl.category || 'Chung'}</span>
                  <div className={`tpl-radio ${isSelected ? 'checked' : ''}`}>
                    {isSelected && <div className="tpl-radio-inner" />}
                  </div>
                </div>

                <h4 className="tpl-card-title">{tpl.title}</h4>
                <p className="tpl-card-desc">{tpl.description}</p>

                {tpl.recommended_model_ids && tpl.recommended_model_ids.length > 0 && (
                  <div className="tpl-recommended-models-hint">
                    <span className="hint-label">Mô hình tối ưu:</span>
                    <span className="hint-models">
                      {tpl.recommended_model_ids.slice(0, 2).map((m) => m.split('/')[1] || m).join(', ')}
                    </span>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
