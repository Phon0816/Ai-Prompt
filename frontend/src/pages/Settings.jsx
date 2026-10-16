import React, { useState, useEffect } from 'react';
import { fetchSettings, updateApiKey, removeApiKey, updateDefaultModel, testModelConnection } from '../api/client';
import { useWizard } from '../store/wizardContext';
import { PRIMARY_MODEL_ID, PRIMARY_MODEL_NAME } from '../config/modelConfig';

const AVAILABLE_MODELS = [
  { id: 'anthropic/claude-3.5-sonnet', name: 'Claude 3.5 Sonnet', provider: 'Anthropic', badge: 'Top 1 Coding' },
  { id: 'openai/gpt-4o', name: 'OpenAI GPT-4o', provider: 'OpenAI', badge: 'Chuẩn Y khoa' },
  { id: 'meta-llama/llama-3.3-70b-instruct', name: 'Llama 3.3 70B Instruct', provider: 'Meta', badge: 'Open-Source' },
  { id: 'deepseek/deepseek-chat', name: 'DeepSeek V3 (671B)', provider: 'DeepSeek', badge: 'Tiết kiệm 90%' },
  { id: 'qwen/qwen-2.5-coder-32b-instruct', name: 'Qwen 2.5 Coder 32B', provider: 'Alibaba Cloud', badge: 'Chuyên Code' },
  { id: 'google/gemini-flash-1.5', name: 'Gemini 1.5 Flash', provider: 'Google', badge: 'Siêu tốc' },
  { id: PRIMARY_MODEL_ID, name: PRIMARY_MODEL_NAME, provider: 'NVIDIA', badge: 'Miễn phí' },
  { id: 'mistralai/mistral-large-2407', name: 'Mistral Large 2', provider: 'Mistral AI', badge: 'Lập luận cao' }
];
const DEMO_MODEL_ID = PRIMARY_MODEL_ID;

export default function Settings() {
  const { backendStatus } = useWizard();

  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // API Key Form
  const [keyInput, setKeyInput] = useState('');
  const [showKeyInput, setShowKeyInput] = useState(false);
  const [savingKey, setSavingKey] = useState(false);
  const [keyMsg, setKeyMsg] = useState(null); // { type: 'success'|'error', text }

  // Default Model
  const [savingModel, setSavingModel] = useState(false);
  const [checkingConnection, setCheckingConnection] = useState(false);
  const [modelQuery, setModelQuery] = useState('');

  // Toast
  const [toastMsg, setToastMsg] = useState('');
  const showToast = (msg) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(''), 3000);
  };

  const loadSettings = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchSettings();
      setSettings(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSettings();
  }, []);

  const handleSaveKey = async () => {
    if (!keyInput.trim()) {
      setKeyMsg({ type: 'error', text: 'Vui lòng nhập API Key.' });
      return;
    }
    setSavingKey(true);
    setKeyMsg(null);
    try {
      const result = await updateApiKey(keyInput.trim());
      setKeyMsg({ type: 'success', text: result.message });
      setKeyInput('');
      setShowKeyInput(false);
      showToast('Đã lưu API Key thành công!');
      loadSettings();
    } catch (err) {
      setKeyMsg({ type: 'error', text: err.message });
    } finally {
      setSavingKey(false);
    }
  };

  const handleRemoveKey = async () => {
    setSavingKey(true);
    setKeyMsg(null);
    try {
      const result = await removeApiKey();
      setKeyMsg({ type: 'success', text: result.message });
      showToast('Đã xóa API Key.');
      loadSettings();
    } catch (err) {
      setKeyMsg({ type: 'error', text: err.message });
    } finally {
      setSavingKey(false);
    }
  };

  const handleSelectDefaultModel = async (modelId) => {
    setSavingModel(true);
    try {
      const result = await updateDefaultModel(modelId);
      showToast(result.message);
      loadSettings();
    } catch (err) {
      showToast('Lỗi: ' + err.message);
    } finally {
      setSavingModel(false);
    }
  };

  const handleCheckConnection = async () => {
    setCheckingConnection(true);
    setKeyMsg(null);
    try {
      const result = await testModelConnection();
      setKeyMsg({
        type: result.ok ? 'success' : 'error',
        text: result.ok
          ? `${result.message}${result.fallback_used ? ' Nemotron lỗi nên đã fallback sang Laguna.' : ''}`
          : `${result.message} [Mã lỗi: ${result.error_code}] ${
            result.failed_attempts?.map((failure) => `${failure.model_id}: ${failure.error_code}`).join('; ') || ''
          }`,
      });
    } catch (err) {
      setKeyMsg({ type: 'error', text: err.message });
    } finally {
      setCheckingConnection(false);
    }
  };

  const visibleKey = settings?.api_key_preview
    ? `••••${settings.api_key_preview.slice(-4)}`
    : 'Chưa có API Key';
  const filteredModels = AVAILABLE_MODELS.filter((model) =>
    model.id === DEMO_MODEL_ID &&
    `${model.name} ${model.provider} ${model.id}`.toLowerCase().includes(modelQuery.toLowerCase())
  );

  return (
    <div className="sub-page-container settings-page">
      <div className="sub-page-header product-page-heading">
        <div>
          <span className="eyebrow">Workspace settings</span>
          <h1>Settings</h1>
          <p>Quản lý kết nối provider, model mặc định và hành vi workspace.</p>
        </div>
      </div>

      {loading && (
        <div className="settings-loading">
          <div className="skeleton-row" />
          <div className="skeleton-row short" />
        </div>
      )}

      {error && !loading && (
        <div className="history-error-state">
          <div className="error-icon">⚠️</div>
          <h3>Không thể tải cài đặt</h3>
          <p>{error}</p>
          <button className="btn-retry" onClick={loadSettings}>Thử lại</button>
        </div>
      )}

      {!loading && !error && settings && (
        <div className="settings-sections">

          {/* Section 1: API Key Management */}
          <div className="settings-card">
            <div className="settings-card-header">
              <div className="settings-card-icon">🔑</div>
              <div>
                <h3>OpenRouter API Key</h3>
                <p className="settings-card-desc">
                  API Key được lưu trữ an toàn trong file <code>.env</code> trên Backend server.
                  Không bao giờ gửi key nguyên bản ra trình duyệt.
                </p>
              </div>
            </div>

            <div className="settings-card-body">
              <div className="key-status-row">
                <div className="key-status-indicator">
                  <span className={`key-status-dot ${settings.has_api_key ? 'active' : 'inactive'}`} />
                  <span className="key-status-label">
                    {settings.has_api_key ? 'Đã cài đặt' : 'Chưa cài đặt'}
                  </span>
                </div>
                <div className="key-preview-box">
                  <code className="key-preview-text">{visibleKey}</code>
                </div>
              </div>

              {!showKeyInput ? (
                <div className="key-action-buttons">
                  <button className="btn-settings-primary" onClick={() => setShowKeyInput(true)}>
                    {settings.has_api_key ? '🔄 Thay đổi API Key' : '➕ Thêm API Key'}
                  </button>
                  {settings.has_api_key && (
                    <button className="btn-settings-danger" onClick={handleRemoveKey} disabled={savingKey}>
                      🗑️ Xóa API Key
                    </button>
                  )}
                  <button className="btn-settings-secondary" onClick={handleCheckConnection} disabled={checkingConnection}>
                    {checkingConnection ? 'Đang kiểm tra...' : 'Kiểm tra kết nối'}
                  </button>
                </div>
              ) : (
                <div className="key-input-form">
                  <div className="key-input-wrapper">
                    <input
                      type="password"
                      className="key-text-input"
                      placeholder="sk-or-v1-xxxxxxxxxxxxxxxx..."
                      value={keyInput}
                      onChange={(e) => setKeyInput(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleSaveKey()}
                      autoComplete="off"
                      aria-label="OpenRouter API Key"
                      autoFocus
                    />
                  </div>
                  <div className="key-form-actions">
                    <button className="btn-settings-primary" onClick={handleSaveKey} disabled={savingKey}>
                      {savingKey ? 'Đang lưu...' : '✓ Lưu API Key'}
                    </button>
                    <button className="btn-settings-cancel" onClick={() => { setShowKeyInput(false); setKeyMsg(null); setKeyInput(''); }}>
                      Hủy
                    </button>
                  </div>
                </div>
              )}

              {keyMsg && (
                <div className={`key-feedback-msg ${keyMsg.type}`} role={keyMsg.type === 'error' ? 'alert' : 'status'} aria-live="polite">
                  {keyMsg.type === 'success' ? '✓' : '✕'} {keyMsg.text}
                </div>
              )}

              <div className="key-help-note">
                <strong>Hướng dẫn lấy API Key:</strong> Truy cập{' '}
                <a href="https://openrouter.ai/keys" target="_blank" rel="noopener noreferrer">
                  openrouter.ai/keys
                </a>{' '}
                → Đăng nhập → Tạo key mới → Copy key bắt đầu bằng <code>sk-or-</code>.
              </div>
            </div>
          </div>

          {/* Section 2: Default AI Model */}
          <div className="settings-card">
            <div className="settings-card-header">
              <div className="settings-card-icon">🤖</div>
              <div>
                <h3>Mô hình AI Mặc định</h3>
                <p className="settings-card-desc">
                  Bản demo cố định sử dụng NVIDIA Nemotron 3 Super 120B cho mọi lần chạy.
                </p>
              </div>
            </div>

            <div className="settings-card-body">
              <label className="model-search-label" htmlFor="model-search">Tìm model (bản demo chỉ có một model)</label>
              <input
                id="model-search"
                className="model-search-input"
                type="search"
                placeholder="Tên, nhà cung cấp hoặc model id"
                value={modelQuery}
                onChange={(event) => setModelQuery(event.target.value)}
              />
              <div className="default-models-grid" role="listbox" aria-label="Chọn model mặc định">
                {filteredModels.map((m) => {
                  const isSelected = (settings.default_model_id || 'anthropic/claude-3.5-sonnet') === m.id;
                  return (
                    <button
                      key={m.id}
                      type="button"
                      className={`default-model-item ${isSelected ? 'selected' : ''}`}
                      onClick={() => !savingModel && handleSelectDefaultModel(m.id)}
                      role="option"
                      aria-selected={isSelected}
                    >
                      <div className="default-model-radio">
                        <span className={`radio-dot ${isSelected ? 'active' : ''}`} />
                      </div>
                      <div className="default-model-info">
                        <div className="default-model-name-row">
                          <span className="default-model-name">{m.name}</span>
                          <span className="default-model-badge">{m.badge}</span>
                        </div>
                        <span className="default-model-provider">{m.provider}</span>
                      </div>
                    </button>
                  );
                })}
              </div>
              {!filteredModels.length && (
                <div className="settings-empty-state" role="status">
                  Không tìm thấy model phù hợp. Thử từ khóa khác.
                </div>
              )}
              {savingModel && <div className="saving-indicator">⏳ Đang lưu cấu hình mô hình mặc định...</div>}
            </div>
          </div>

          {/* Section 3: System Info */}
          <div className="settings-card">
            <div className="settings-card-header">
              <div className="settings-card-icon">ℹ️</div>
              <div>
                <h3>Thông tin Hệ thống</h3>
                <p className="settings-card-desc">Trạng thái kết nối Backend và thông số kỹ thuật.</p>
              </div>
            </div>

            <div className="settings-card-body">
              <div className="sysinfo-grid">
                <div className="sysinfo-item">
                  <span className="sysinfo-label">Backend</span>
                  <span className={`sysinfo-value ${backendStatus}`}>
                    {backendStatus === 'online' ? '✓ Hoạt động' : backendStatus === 'checking' ? '⏳ Đang kiểm tra...' : '✕ Không kết nối'}
                  </span>
                </div>
                <div className="sysinfo-item">
                  <span className="sysinfo-label">Phiên bản</span>
                  <span className="sysinfo-value">v2.0.0</span>
                </div>
                <div className="sysinfo-item">
                  <span className="sysinfo-label">Kiến trúc</span>
                  <span className="sysinfo-value">FastAPI + React Vite + JSON DB</span>
                </div>
                <div className="sysinfo-item">
                  <span className="sysinfo-label">File .env</span>
                  <span className="sysinfo-value sysinfo-path" title={settings.env_file_path}>
                    {settings.env_file_path.length > 50
                      ? '...' + settings.env_file_path.slice(-47)
                      : settings.env_file_path}
                  </span>
                </div>
                <div className="sysinfo-item">
                  <span className="sysinfo-label">Chế độ an toàn</span>
                  <span className="sysinfo-value">API Key server-side only</span>
                </div>
                <div className="sysinfo-item">
                  <span className="sysinfo-label">Thực thi AI</span>
                  <span className="sysinfo-value">OpenRouter cloud</span>
                </div>
              </div>
            </div>
          </div>

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
