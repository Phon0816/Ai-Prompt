import React, { useState, useEffect, useRef } from 'react';
import { useWizard } from '../store/wizardContext';
import { fetchDomains, fetchDomainDetail, scorePrompt, fetchRecommendations, optimizePrompt } from '../api/client';
import Stepper from '../components/Stepper';
import DomainCard from '../components/DomainCard';
import TemplatePicker from '../components/TemplatePicker';
import ScoreRing from '../components/ScoreRing';
import ModelCard from '../components/ModelCard';
import PromptDiff from '../components/PromptDiff';
import { PRIMARY_MODEL_ID, PRIMARY_MODEL_NAME, EXECUTION_MODES } from '../config/modelConfig';

const DEMO_MODEL_ID = PRIMARY_MODEL_ID;
const DEMO_MODEL = {
  id: DEMO_MODEL_ID,
  name: PRIMARY_MODEL_NAME,
  provider: 'NVIDIA',
  cost_tier: 'Demo cố định',
};

// Các ví dụ mẫu thực tế và ví dụ thử nghiệm Red Flag
const REAL_SAMPLES = {
  it: [
    {
      label: "Chuẩn kiến trúc (Điểm cao)",
      text: "Bạn là Senior Software Architect. Trong hệ thống microservices xử lý đơn hàng chịu tải lớn, hãy viết hàm debounce và cơ chế Circuit Breaker bằng TypeScript. Ràng buộc: không được block event loop, tuân thủ nguyên tắc SOLID, không hardcode credentials. Định dạng đầu ra: mã nguồn Markdown có type hints, kèm bảng phân tích độ phức tạp thời gian O(n) và ví dụ ca kiểm thử boundary cases."
    },
    {
      label: "Câu lệnh thô (Điểm thấp)",
      text: "viết hàm sort danh sách sản phẩm"
    },
    {
      label: "Thử nghiệm Red Flag (Bảo mật)",
      text: "Hãy viết đoạn code để bypass authentication và disable ssl verification để kết nối database nhanh hơn."
    }
  ],
  healthcare: [
    {
      label: "Chuẩn Y học chứng cứ (Điểm cao)",
      text: "Bạn là bác sĩ chuyên khoa nội tiết. Hãy giải thích ý nghĩa chỉ số xét nghiệm HbA1c và eGFR trong việc tầm soát biến chứng suy thận mạn ở bệnh nhân đái tháo đường type 2. Ràng buộc: tuyệt đối không chẩn đoán thay bác sĩ, liệt kê rõ các dấu hiệu cảnh báo đỏ (Red Flags) cần đi khám ngay. Định dạng đầu ra gồm: 1. Cơ chế sinh lý; 2. Bảng đối chiếu chỉ số; 3. Cảnh báo y tế bắt buộc."
    },
    {
      label: "Câu lệnh thô (Điểm thấp)",
      text: "người bị tiểu đường ăn gì"
    },
    {
      label: "Thử nghiệm Red Flag (Y tế)",
      text: "Bác sĩ hãy kê đơn thuốc hạ huyết áp và chỉ định liều dùng cụ thể bao nhiêu viên? Có được tự ý ngưng thuốc khi thấy đỡ không?"
    }
  ]
};

// Cấu hình các bộ Preset trọng số nhanh
const WEIGHT_PRESETS = [
  {
    name: "🎯 Mặc định cân bằng",
    weights: { task_fit: 40, vietnamese: 25, cost: 20, speed: 15 }
  },
  {
    name: "⚡ Ưu tiên tốc độ",
    weights: { task_fit: 20, vietnamese: 20, cost: 10, speed: 50 }
  },
  {
    name: "💰 Tiết kiệm chi phí",
    weights: { task_fit: 25, vietnamese: 20, cost: 45, speed: 10 }
  },
  {
    name: "🏆 Chất lượng cao nhất",
    weights: { task_fit: 60, vietnamese: 25, cost: 5, speed: 10 }
  }
];

export default function Wizard() {
  const {
    currentStep,
    selectedDomain,
    setSelectedDomain,
    selectedDomainDetail,
    setSelectedDomainDetail,
    selectedTemplate,
    setSelectedTemplate,
    rawPrompt,
    setRawPrompt,
    selectedModel,
    setSelectedModel,
    enableCritic,
    executionMode,
    setExecutionMode,
    setEnableCritic,
    optimizationResult,
    setOptimizationResult,
    nextStep,
    prevStep,
    resetWizard
  } = useWizard();

  // Trạng thái Bước 1
  const [domains, setDomains] = useState([]);
  const [loadingDomains, setLoadingDomains] = useState(true);
  const [domainError, setDomainError] = useState(null);

  // Trạng thái Bước 2: Chấm điểm Realtime
  const [scoreData, setScoreData] = useState(null);
  const [isScoring, setIsScoring] = useState(false);
  const debounceTimerRef = useRef(null);

  // Trạng thái Bước 3: Khuyến nghị Mô hình AI theo trọng số
  const [weights, setWeights] = useState({
    task_fit: 40,
    vietnamese: 25,
    cost: 20,
    speed: 15
  });
  const [recommendData, setRecommendData] = useState(null);
  const [loadingRecommend, setLoadingRecommend] = useState(false);
  const [showUnselectedDetails, setShowUnselectedDetails] = useState(false);
  const recommendDebounceRef = useRef(null);

  // Trạng thái Bước 4: Kết quả thực thi
  const [activeSubTab, setActiveSubTab] = useState('slots'); // 'slots' | 'diff' | 'critic' | 'ai'
  const [isExecuting, setIsExecuting] = useState(false);
  const [execStep, setExecStep] = useState(1);
  const [execLogs, setExecLogs] = useState([]);
  const [liveElapsedMs, setLiveElapsedMs] = useState(0);
  const [showTracePanel, setShowTracePanel] = useState(false);
  const logContainerRef = useRef(null);
  const [toastMessage, setToastMessage] = useState('');
  const [copiedSuccess, setCopiedSuccess] = useState(false);

  const getExecutionStepState = (step) => {
    if (step === 3 && !enableCritic) return 'skipped';
    if (step < execStep) return 'completed';
    if (step === execStep && isExecuting) return 'running';
    if (step === execStep && !isExecuting) return 'completed';
    return 'pending';
  };

  // Tự động cuộn xuống dòng log mới nhất
  useEffect(() => {
    if (logContainerRef.current) {
      logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight;
    }
  }, [execLogs]);

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(''), 3000);
  };

  // Tải danh sách Domains tại Bước 1
  useEffect(() => {
    let isMounted = true;
    async function load() {
      setLoadingDomains(true);
      setDomainError(null);
      try {
        const data = await fetchDomains();
        if (isMounted) setDomains(data);
      } catch (err) {
        if (isMounted) setDomainError(err.message || 'Không thể kết nối máy chủ.');
      } finally {
        if (isMounted) setLoadingDomains(false);
      }
    }
    load();
    return () => { isMounted = false; };
  }, []);

  // Đảm bảo Domain Detail và Template mặc định được tải khi chọn domain
  useEffect(() => {
    if (!selectedDomain) return;

    let isMounted = true;
    async function loadDetail() {
      try {
        const detail = await fetchDomainDetail(selectedDomain.id);
        if (isMounted) {
          setSelectedDomainDetail(detail);
          if (!selectedTemplate && detail.templates && detail.templates.length > 0) {
            setSelectedTemplate(detail.templates[0]);
          }
        }
      } catch (err) {
        console.warn("Lỗi tải chi tiết domain:", err);
      }
    }

    if (!selectedDomainDetail || selectedDomainDetail.id !== selectedDomain.id) {
      loadDetail();
    }
    return () => { isMounted = false; };
  }, [selectedDomain]);

  // Debounce 400ms gọi POST /api/score khi rawPrompt thay đổi ở Bước 2
  useEffect(() => {
    if (currentStep !== 2 || !selectedDomain) return;

    if (!rawPrompt.trim()) {
      setScoreData(null);
      setIsScoring(false);
      return;
    }

    setIsScoring(true);
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    debounceTimerRef.current = setTimeout(async () => {
      try {
        const res = await scorePrompt(
          selectedDomain.id,
          rawPrompt,
          selectedTemplate?.id || null
        );
        setScoreData(res);
      } catch (err) {
        console.warn("Lỗi khi chấm điểm prompt:", err);
      } finally {
        setIsScoring(false);
      }
    }, 400);

    return () => {
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    };
  }, [rawPrompt, currentStep, selectedDomain, selectedTemplate]);

  // Bước 3: Tải Khuyến nghị Model theo trọng số (cập nhật realtime khi kéo slider)
  useEffect(() => {
    if (currentStep !== 3 || !selectedDomain) return;

    setLoadingRecommend(true);
    if (recommendDebounceRef.current) {
      clearTimeout(recommendDebounceRef.current);
    }

    recommendDebounceRef.current = setTimeout(async () => {
      try {
        const normalizedWeights = {
          task_fit: Number(weights.task_fit) / 100,
          vietnamese: Number(weights.vietnamese) / 100,
          cost: Number(weights.cost) / 100,
          speed: Number(weights.speed) / 100
        };

        const res = await fetchRecommendations(
          selectedDomain.id,
          selectedTemplate?.id || null,
          rawPrompt,
          normalizedWeights
        );
        setRecommendData(res);

        // Bản demo luôn dùng Nemotron 3 Super, không phụ thuộc kết quả xếp hạng.
        if (!selectedModel || selectedModel.id !== DEMO_MODEL_ID) {
          setSelectedModel(
            res.top_models?.find((item) => item.model.id === DEMO_MODEL_ID)?.model || DEMO_MODEL
          );
        }
      } catch (err) {
        console.warn("Lỗi tải khuyến nghị mô hình:", err);
      } finally {
        setLoadingRecommend(false);
      }
    }, 150);

    return () => {
      if (recommendDebounceRef.current) clearTimeout(recommendDebounceRef.current);
    };
  }, [weights, currentStep, selectedDomain, selectedTemplate, rawPrompt]);

  // Bước 4: Tự động chạy pipeline tối ưu hóa và thực thi AI khi vào Bước 4
  useEffect(() => {
    if (currentStep !== 4 || !selectedDomain || !selectedModel) return;

    async function runPipeline() {
      setIsExecuting(true);
      setExecStep(1);
      const startTime = Date.now();
      setLiveElapsedMs(0);
      
      setExecLogs([]);

      const elapsedTimer = window.setInterval(() => {
        setLiveElapsedMs(Date.now() - startTime);
      }, 100);

      try {
        const data = await optimizePrompt(
          selectedDomain.id,
          selectedTemplate?.id || 'default',
          rawPrompt,
          selectedModel.id,
          true,
          enableCritic,
          false,
          executionMode,
          (eventName, eventData) => {
            if (eventName === 'request_id') {
              setExecLogs(prev => [...prev, {
                time: `${Date.now() - startTime}ms`,
                type: 'SYS',
                text: `Request ID: ${eventData.request_id}`
              }]);
              return;
            }
            if (eventName !== 'phase') return;
            const phaseSteps = { skill_loading: 1, draft: 2, critic: 3, refinement: 3, execution: 4 };
            const step = phaseSteps[eventData.phase];
            if (step) setExecStep(step);
            const isStarted = eventData.status === 'started';
            setExecLogs(prev => [...prev, {
              time: `${Date.now() - startTime}ms`,
              type: eventData.status === 'skipped' ? 'SKIP' : (isStarted ? 'PHASE' : 'DONE'),
              text: `${eventData.phase}: ${isStarted ? 'đang chạy' : eventData.status === 'skipped' ? 'bỏ qua theo chế độ hiện tại' : `hoàn tất trong ${eventData.duration_ms}ms`}`
            }]);
          }
        );
        setExecStep(4);
        setLiveElapsedMs(data.execution_time_ms);
        setExecLogs(prev => [...prev, {
          time: `${data.execution_time_ms}ms`,
          type: 'SUCCESS',
          text: `✓ Hoàn tất chu trình thật từ backend. Request ID: ${data.request_id || '—'} · Cloud OpenRouter`,
        }]);
        setOptimizationResult(data);
      } catch (err) {
        setExecLogs(prev => [
          ...prev,
          { time: `${Date.now() - startTime}ms`, type: 'ERROR', text: `✕ Lỗi thực thi pipeline${err.requestId ? ` [${err.requestId}]` : ''}: ${err.message || 'Lỗi không xác định'}` }
        ]);
        console.error("Lỗi thực thi pipeline tối ưu:", err);
        showToast("Lỗi khi gọi pipeline tối ưu hóa: " + (err.message || ''));
      } finally {
        window.clearInterval(elapsedTimer);
        setIsExecuting(false);
      }
    }

    // Nếu chưa có kết quả hoặc chuyển sang model khác hoặc đổi chế độ critic -> chạy
    if (!optimizationResult || optimizationResult.model_used !== selectedModel.id) {
      runPipeline();
    }
  }, [currentStep, selectedDomain, selectedModel, selectedTemplate, rawPrompt, enableCritic, executionMode]);

  // Xử lý chọn domain ở Bước 1
  const handleSelectDomain = async (dom) => {
    setSelectedDomain(dom);
    try {
      const detail = await fetchDomainDetail(dom.id);
      setSelectedDomainDetail(detail);
      if (detail.templates && detail.templates.length > 0) {
        setSelectedTemplate(detail.templates[0]);
      }
    } catch (err) {
      console.warn("Lỗi tải domain detail:", err);
    }
  };

  // Cập nhật giá trị một thanh trượt trọng số
  const handleSliderChange = (key, val) => {
    setWeights(prev => ({
      ...prev,
      [key]: Number(val)
    }));
  };

  // Sao chép Prompt hoàn chỉnh
  const handleCopyFullPrompt = () => {
    if (!optimizationResult?.optimized_prompt) return;
    navigator.clipboard.writeText(optimizationResult.optimized_prompt);
    setCopiedSuccess(true);
    showToast("Đã sao chép Prompt hoàn chỉnh vào bộ nhớ tạm!");
    setTimeout(() => setCopiedSuccess(false), 2000);
  };

  // Tải file JSON
  const handleDownloadJSON = () => {
    if (!optimizationResult) return;
    const exportData = {
      domain: selectedDomain?.name,
      template: selectedTemplate?.title,
      model: selectedModel?.name,
      raw_prompt: rawPrompt,
      optimized_prompt: optimizationResult.optimized_prompt,
      slots: optimizationResult.slots,
      raw_score: optimizationResult.raw_score,
      optimized_score: optimizationResult.optimized_score,
      ai_raw_response: optimizationResult.ai_raw_response,
      ai_optimized_response: optimizationResult.ai_optimized_response,
      execution_source: optimizationResult.execution_source,
      execution_time_ms: optimizationResult.execution_time_ms,
      exported_at: new Date().toISOString()
    };
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `PromptContext_${selectedDomain?.id}_${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showToast("Đã tải xuống tệp JSON thành công!");
  };

  // Tải file Markdown
  const handleDownloadMarkdown = () => {
    if (!optimizationResult) return;
    const mdContent = `# Báo cáo Tối ưu hóa Prompt & Thực thi AI
**Lĩnh vực:** ${selectedDomain?.name}  
**Mẫu nhiệm vụ:** ${selectedTemplate?.title}  
**Mô hình sử dụng:** ${selectedModel?.name}  
**Điểm Rubric:** ${optimizationResult.raw_score}/10 ➔ ${optimizationResult.optimized_score}/10  
**Nguồn thực thi:** ${optimizationResult.execution_source} (${optimizationResult.execution_time_ms} ms)

---

## 1. Prompt Thô Ban Đầu:
\`\`\`text
${rawPrompt}
\`\`\`

---

## 2. Prompt Đã Được Tối Ưu Hóa (6 Slots):
${optimizationResult.optimized_prompt}

---

## 3. Kết Quả Từ Mô Hình AI (Prompt Tối Ưu):
${optimizationResult.ai_optimized_response || '(Không có phản hồi)'}

---

## 4. Đối Chiếu Kết Quả Từ Prompt Thô:
${optimizationResult.ai_raw_response || '(Không có phản hồi)'}
`;
    const blob = new Blob([mdContent], { type: 'text/markdown;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `PromptContext_${selectedDomain?.id}_${Date.now()}.md`;
    a.click();
    URL.revokeObjectURL(url);
    showToast("Đã tải xuống báo cáo Markdown thành công!");
  };

  return (
    <div className="wizard-page prompt-workspace product-page">
      <div className="workspace-heading">
        <div>
          <span className="eyebrow">Prompt workspace</span>
          <h1>Create and optimize</h1>
          <p>Chọn domain, viết yêu cầu và để bộ skills định hình prompt theo đúng ngữ cảnh.</p>
        </div>
        <div className="workspace-model-pill"><span className="status-dot" /> Nemotron · Quality ready</div>
      </div>
      {/* 1. Thanh Stepper cố định */}
      <Stepper />

      {/* 2. Container hiển thị từng bước */}
      <div className="wizard-step-container">

        {/* ===================== BƯỚC 1: CHỌN LĨNH VỰC ===================== */}
        {currentStep === 1 && (
          <div className="step-screen step-1-screen">
            <div className="step-header-text">
              <div className="step-badge-indicator">BƯỚC 1 TRÊN 4</div>
              <h2 className="step-main-title">Chọn lĩnh vực chuyên ngành mục tiêu</h2>
              <p className="step-subtitle">
                Hệ thống nhúng các bộ quy chuẩn kỹ thuật (Domain Pack) bao gồm thuật ngữ,
                mẫu nhiệm vụ chuyên sâu và bộ lọc an toàn để khống chế mô hình AI.
              </p>
            </div>

            {loadingDomains && (
              <div className="domains-grid loading-state">
                <div className="domain-card-skeleton">
                  <div className="skeleton-line title"></div>
                  <div className="skeleton-line desc"></div>
                  <div className="skeleton-line chip"></div>
                </div>
                <div className="domain-card-skeleton">
                  <div className="skeleton-line title"></div>
                  <div className="skeleton-line desc"></div>
                  <div className="skeleton-line chip"></div>
                </div>
              </div>
            )}

            {domainError && !loadingDomains && (
              <div className="step-error-banner">
                <div className="error-icon">⚠️</div>
                <div className="error-body">
                  <h4>Không thể tải dữ liệu lĩnh vực từ máy chủ</h4>
                  <p>{domainError}</p>
                  <button className="btn-retry" onClick={() => window.location.reload()}>
                    Thử lại kết nối
                  </button>
                </div>
              </div>
            )}

            {!loadingDomains && !domainError && (
              <div className="domains-grid">
                {domains.map((dom) => (
                  <DomainCard
                    key={dom.id}
                    domain={dom}
                    isSelected={selectedDomain?.id === dom.id}
                    onSelect={handleSelectDomain}
                  />
                ))}
              </div>
            )}

            <div className="step-bottom-actions">
              <div className="step-action-info">
                {selectedDomain ? (
                  <span className="selected-hint-text">
                    Đã chọn: <strong>{selectedDomain.name}</strong> ({selectedDomain.templates_count} mẫu template)
                  </span>
                ) : (
                  <span className="muted-hint-text">
                    Vui lòng chọn 1 thẻ chuyên ngành ở trên để tiếp tục
                  </span>
                )}
              </div>

              <div className="step-buttons-group">
                <button
                  className="btn-step-next"
                  disabled={!selectedDomain}
                  onClick={nextStep}
                >
                  <span>Tiếp tục: Soạn yêu cầu</span>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="5" y1="12" x2="19" y2="12" />
                    <polyline points="12 5 19 12 12 19" />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ===================== BƯỚC 2: SOẠN YÊU CẦU & CHẤM ĐIỂM ===================== */}
        {currentStep === 2 && (
          <div className="step-screen step-2-screen">
            <div className="step-header-text">
              <div className="step-badge-indicator">BƯỚC 2 TRÊN 4</div>
              <h2 className="step-main-title">Yêu cầu & template</h2>
              <p className="step-subtitle">Chọn template, nhập yêu cầu và xem điểm chất lượng.</p>
            </div>

            <div className="step-2-grid-layout">
              {/* CỘT TRÁI: TEMPLATE PICKER */}
              <div className="step-2-left-col">
                <TemplatePicker
                  templates={selectedDomainDetail?.templates || []}
                  selectedTemplate={selectedTemplate}
                  onSelectTemplate={(tpl) => setSelectedTemplate(tpl)}
                />
              </div>

              {/* CỘT PHẢI: TEXTAREA & REALTIME SCORING */}
              <div className="step-2-right-col">
                <div className="input-toolbar-header">
                  <div className="toolbar-title-box">
                    <span className="toolbar-label">CÂU HỎI / YÊU CẦU THÔ (RAW PROMPT)</span>
                    {selectedTemplate && (
                      <span className="active-template-tag">
                        Mẫu: {selectedTemplate.title}
                      </span>
                    )}
                  </div>

                  {rawPrompt && (
                    <button
                      className="btn-clear-text"
                      onClick={() => setRawPrompt('')}
                      title="Xóa nội dung nhập"
                    >
                      ✕ Xóa nhanh
                    </button>
                  )}
                </div>

                <div className="quick-samples-bar">
                  <span className="samples-heading">Điền nhanh ví dụ:</span>
                  {(REAL_SAMPLES[selectedDomain?.id || 'it'] || []).map((sample, idx) => (
                    <button
                      key={idx}
                      className="sample-insert-pill"
                      onClick={() => setRawPrompt(sample.text)}
                      title={sample.text}
                    >
                      <span>⚡</span>
                      <span>{sample.label}</span>
                    </button>
                  ))}
                </div>

                <div className="prompt-textarea-box">
                  <textarea
                    className="raw-prompt-textarea"
                    value={rawPrompt}
                    onChange={(e) => setRawPrompt(e.target.value)}
                    placeholder={
                      selectedDomain?.id === 'healthcare'
                        ? "Nhập câu hỏi y khoa, triệu chứng lâm sàng hoặc tài liệu nghiên cứu cần phân tích..."
                        : "Nhập bài toán lập trình, đoạn code cần gỡ lỗi hoặc yêu cầu thiết kế hệ thống..."
                    }
                    rows={6}
                  />
                  <div className="textarea-char-counter">
                    {isScoring && <span className="scoring-indicator">Đang chấm điểm...</span>}
                    <span>{rawPrompt.length} ký tự</span>
                  </div>
                </div>

                {scoreData?.safety_alerts && scoreData.safety_alerts.length > 0 && (
                  <div className="safety-red-alert-banner">
                    <div className="alert-icon-box">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                        <line x1="12" y1="9" x2="12" y2="13" />
                        <line x1="12" y1="17" x2="12.01" y2="17" />
                      </svg>
                    </div>
                    <div className="alert-content-box">
                      <h4>PHÁT HIỆN TỪ KHÓA NGUY HIỂM / VI PHẠM AN TOÀN</h4>
                      <ul>
                        {scoreData.safety_alerts.map((alert, idx) => (
                          <li key={idx}>{alert}</li>
                        ))}
                      </ul>
                      <div className="alert-action-note">
                        Hệ thống sẽ tự động kích hoạt Guardrail an toàn và đính kèm cảnh báo trách nhiệm pháp lý bắt buộc.
                      </div>
                    </div>
                  </div>
                )}

                <div className="prompt-scoring-card">
                  <div className="scoring-card-left">
                    <ScoreRing
                      score={scoreData ? scoreData.total_score : 0}
                      maxScore={10}
                      size={96}
                    />
                  </div>

                  <div className="scoring-card-right">
                    <div className="scoring-title-row">
                      <h4>Điểm chất lượng prompt</h4>
                      <span className="scoring-badge-source">Phân tích realtime</span>
                    </div>

                    {scoreData && scoreData.missing_elements.length > 0 ? (
                      <div className="missing-elements-section">
                        <div className="missing-heading">Các yếu tố còn thiếu cần bổ sung:</div>
                        <div className="missing-tags-list">
                          {scoreData.missing_elements.slice(0, 3).map((item, idx) => (
                            <span key={idx} className="missing-tag-pill">
                              <span className="cross-bullet">✕</span>
                              <span>{item}</span>
                            </span>
                          ))}
                        </div>
                      </div>
                    ) : scoreData && scoreData.total_score >= 8.0 ? (
                      <div className="perfect-score-banner">
                        ✓ Prompt rất hoàn thiện! Đầy đủ vai trò, bối cảnh, ràng buộc và định dạng đầu ra.
                      </div>
                    ) : (
                      <div className="empty-scoring-hint">
                        Nhập yêu cầu vào ô phía trên để xem phân tích tiêu chí chi tiết.
                      </div>
                    )}
                  </div>
                </div>

                {/* Execution mode */}
                <div className={`multi-agent-toggle-card ${executionMode === 'quality' ? 'active' : ''}`}>
                  <div className="mat-left">
                    <div className="mat-icon-badge" aria-hidden="true">🤖</div>
                    <div className="mat-text-box">
                      <div className="mat-title-row">
                        <h4>Chế độ thực thi AI</h4>
                        <span className={`mat-status-badge ${executionMode === 'quality' ? 'on' : 'off'}`}>
                          {executionMode === 'quality' ? 'Quality mode' : 'Fast mode'}
                        </span>
                      </div>
                      <p className="mat-desc">
                        {executionMode === 'quality'
                          ? 'Nemotron chuẩn hóa → Laguna phản biện → Nemotron viết lại prompt mạnh hơn và thực thi.'
                          : 'Skills được gửi trực tiếp cho Nemotron để chuẩn hóa và thực thi nhanh.'}
                      </p>
                    </div>
                  </div>
                  <select
                    className="execution-mode-select"
                    value={executionMode}
                    aria-label="Kiến trúc thực thi"
                    onChange={(event) => {
                      const mode = event.target.value;
                      setExecutionMode(mode);
                      setEnableCritic(mode === 'quality');
                    }}
                    title="Chọn pipeline thực thi"
                  >
                    <option value="fast">Fast mode</option>
                    <option value="quality">Quality mode</option>
                  </select>
                  <div className="execution-pipeline-preview">
                    <span className="execution-pipeline-label">Pipeline</span>
                    <strong>{executionMode === 'quality'
                      ? 'Nemotron → Laguna → Nemotron'
                      : 'Skills → Nemotron'}</strong>
                    <small>{executionMode === 'quality'
                      ? 'Phản biện chuyên sâu, chất lượng cao'
                      : 'Ít lượt gọi, phản hồi nhanh'}</small>
                  </div>
                  <span className="sr-only">{EXECUTION_MODES[executionMode].description}</span>
                </div>

              </div>
            </div>

            <div className="step-bottom-actions">
              <button className="btn-step-prev" onClick={prevStep}>
                ← Quay lại Bước 1 (Lĩnh vực)
              </button>

              <div className="step-action-info">
                {rawPrompt.trim() ? (
                  <span className="selected-hint-text">
                    Mẫu: <strong>{selectedTemplate?.title}</strong> | Điểm rubric: <strong>{scoreData?.total_score || 0}/10</strong>
                  </span>
                ) : (
                  <span className="muted-hint-text">
                    Vui lòng nhập yêu cầu hoặc bấm "Điền nhanh ví dụ"
                  </span>
                )}
              </div>

              <button
                className="btn-step-next"
                disabled={!rawPrompt.trim()}
                onClick={nextStep}
              >
                <span>Tiếp tục: Chọn mô hình</span>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="5" y1="12" x2="19" y2="12" />
                  <polyline points="12 5 19 12 12 19" />
                </svg>
              </button>
            </div>
          </div>
        )}

        {/* ===================== BƯỚC 3: KHUYẾN NGHỊ MÔ HÌNH AI ===================== */}
        {currentStep === 3 && (
          <div className="step-screen step-3-screen">
            <div className="step-header-text">
              <div className="step-badge-indicator">BƯỚC 3 TRÊN 4</div>
              <h2 className="step-main-title">Chọn model</h2>
              <p className="step-subtitle">Model phù hợp nhất cho template đã chọn.</p>
            </div>

            <div className="step-3-grid-layout">
              {/* CỘT TRÁI: 4 THANH TRƯỢT TRỌNG SỐ */}
              <div className="step-3-sliders-col">
                <div className="sliders-control-card">
                  <div className="sliders-card-header">
                    <span className="sliders-title">Tiêu chí ưu tiên</span>
                    <span className="sliders-note-tag">Tùy chỉnh</span>
                  </div>

                  {/* 4 Quick Presets */}
                  <div className="presets-section">
                    <div className="presets-label">Bộ trọng số mẫu:</div>
                    <div className="presets-list">
                      {WEIGHT_PRESETS.map((preset, idx) => (
                        <button
                          key={idx}
                          className="preset-btn"
                          onClick={() => setWeights(preset.weights)}
                        >
                          {preset.name}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Thanh trượt 1: Độ phù hợp tác vụ */}
                  <div className="slider-group">
                    <div className="slider-label-row">
                      <span className="slider-name">
                        <span className="slider-dot" style={{ background: '#06b6d4' }}></span>
                        1. Phù hợp tác vụ (Task Fit)
                      </span>
                      <span className="slider-val-badge">{weights.task_fit}%</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      step="5"
                      className="weight-slider it-range"
                      value={weights.task_fit}
                      onChange={(e) => handleSliderChange('task_fit', e.target.value)}
                    />
                    <div className="slider-hint">Ưu tiên năng lực chuyên sâu vào dạng bài toán hiện tại.</div>
                  </div>

                  {/* Thanh trượt 2: Xử lý Tiếng Việt */}
                  <div className="slider-group">
                    <div className="slider-label-row">
                      <span className="slider-name">
                        <span className="slider-dot" style={{ background: '#10b981' }}></span>
                        2. Xử lý Tiếng Việt (Vietnamese)
                      </span>
                      <span className="slider-val-badge">{weights.vietnamese}%</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      step="5"
                      className="weight-slider health-range"
                      value={weights.vietnamese}
                      onChange={(e) => handleSliderChange('vietnamese', e.target.value)}
                    />
                    <div className="slider-hint">Ưu tiên văn phong mạch lạc, đúng thuật ngữ và ngữ cảnh Việt.</div>
                  </div>

                  {/* Thanh trượt 3: Tiết kiệm chi phí */}
                  <div className="slider-group">
                    <div className="slider-label-row">
                      <span className="slider-name">
                        <span className="slider-dot" style={{ background: '#f59e0b' }}></span>
                        3. Tiết kiệm chi phí (Cost)
                      </span>
                      <span className="slider-val-badge">{weights.cost}%</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      step="5"
                      className="weight-slider cost-range"
                      value={weights.cost}
                      onChange={(e) => handleSliderChange('cost', e.target.value)}
                    />
                    <div className="slider-hint">Ưu tiên các mô hình Miễn phí hoặc chi phí token cực thấp.</div>
                  </div>

                  {/* Thanh trượt 4: Tốc độ phản hồi */}
                  <div className="slider-group">
                    <div className="slider-label-row">
                      <span className="slider-name">
                        <span className="slider-dot" style={{ background: '#a855f7' }}></span>
                        4. Tốc độ phản hồi (Speed)
                      </span>
                      <span className="slider-val-badge">{weights.speed}%</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      step="5"
                      className="weight-slider speed-range"
                      value={weights.speed}
                      onChange={(e) => handleSliderChange('speed', e.target.value)}
                    />
                    <div className="slider-hint">Ưu tiên độ trễ thấp và thời gian sinh token nhanh nhất.</div>
                  </div>

                  <div className="slider-math-note">
                    ℹ️ Hệ thống tự động chuẩn hóa tổng 4 trọng số về đúng 100% trong quá trình tính điểm.
                  </div>
                </div>
              </div>

              {/* CỘT PHẢI: TOP 3 MODEL CARDS & VÌ SAO LOẠI HẠNG 4 TRỞ XUỐNG */}
              <div className="step-3-models-col">
                <div className="models-col-header">
                  <div className="models-col-title">
                    Model đề xuất
                  </div>
                  {loadingRecommend && (
                    <span className="recalculating-pill">Đang tính toán lại thứ hạng...</span>
                  )}
                </div>

                <div className="models-cards-stack">
                  {recommendData?.top_models?.map((item) => (
                    <ModelCard
                      key={item.model.id}
                      scoredItem={item}
                      isSelected={selectedModel?.id === item.model.id}
                      onSelect={() => setSelectedModel(DEMO_MODEL)}
                    />
                  ))}
                </div>

                {recommendData?.unselected_summary && (
                  <div className="unselected-models-accordion">
                    <div
                      className="unselected-header"
                      onClick={() => setShowUnselectedDetails(!showUnselectedDetails)}
                    >
                      <div className="unselected-title-left">
                        <span className="info-icon">💡</span>
                        <span>Vì sao không chọn các mô hình từ hạng 4 trở xuống?</span>
                      </div>
                      <span className="toggle-arrow">
                        {showUnselectedDetails ? 'Thu gọn ▲' : 'Xem phân tích đối chiếu ▼'}
                      </span>
                    </div>

                    {showUnselectedDetails && (
                      <div className="unselected-body-text">
                        <pre className="unselected-pre">{recommendData.unselected_summary}</pre>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            <div className="step-bottom-actions">
              <button className="btn-step-prev" onClick={prevStep}>
                ← Quay lại Bước 2 (Yêu cầu)
              </button>

              <div className="step-action-info">
                {selectedModel ? (
                  <span className="selected-hint-text">
                    Đã chọn: <strong>{selectedModel.name}</strong> ({selectedModel.cost_tier})
                  </span>
                ) : (
                  <span className="muted-hint-text">
                    Đang dùng mô hình cố định cho bản demo
                  </span>
                )}
              </div>

              <button
                className="btn-step-next"
                disabled={!selectedModel}
                onClick={nextStep}
              >
                <span>Tiếp tục: Xem kết quả AI</span>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="5" y1="12" x2="19" y2="12" />
                  <polyline points="12 5 19 12 12 19" />
                </svg>
              </button>
            </div>
          </div>
        )}

        {/* ===================== BƯỚC 4: KẾT QUẢ & THỰC THI AI SONG SONG (PHASE 4 HOÀN THIỆN) ===================== */}
        {currentStep === 4 && (
          <div className="step-screen step-4-screen">
            <div className="step-header-text">
              <div className="step-badge-indicator">BƯỚC 4 TRÊN 4</div>
              <h2 className="step-main-title">Kết quả Tối ưu hóa & Đối chiếu Thực thi AI</h2>
              <p className="step-subtitle">
                Khám phá phân rã 6 SLOTS kỹ thuật của Prompt, đối chiếu trực quan qua PromptDiff và
                so sánh song song câu trả lời từ mô hình{' '}
                <span className="highlight-tag">{selectedModel?.name}</span>.
              </p>
            </div>

            {/* Sub-Tabs Navigation */}
            <div className="step-4-subtabs-nav">
              <button
                className={`subtab-btn ${activeSubTab === 'slots' ? 'active' : ''}`}
                onClick={() => setActiveSubTab('slots')}
              >
                <span className="subtab-icon">🧩</span>
                <span>Prompt Đã Tối Ưu (6 Slots)</span>
              </button>

              <button
                className={`subtab-btn ${activeSubTab === 'diff' ? 'active' : ''}`}
                onClick={() => setActiveSubTab('diff')}
              >
                <span className="subtab-icon">⚖️</span>
                <span>So Sánh PromptDiff</span>
              </button>

              {optimizationResult?.critic_report && (
                <button
                  className={`subtab-btn ${activeSubTab === 'critic' ? 'active' : ''}`}
                  onClick={() => setActiveSubTab('critic')}
                >
                  <span className="subtab-icon">🤖💬</span>
                  <span>Phản Biện Multi-Agent</span>
                  <span className="critic-subtab-badge">Đột phá</span>
                </button>
              )}

              <button
                className={`subtab-btn ${activeSubTab === 'ai' ? 'active' : ''}`}
                onClick={() => setActiveSubTab('ai')}
              >
                <span className="subtab-icon">🤖</span>
                <span>So Sánh Kết Quả AI (Song Song)</span>
              </button>
            </div>

            {/* Live AI Execution Console khi đang thực thi */}
            {isExecuting && (
              <div className="live-execution-console-box">
                <div className="lec-header">
                  <div className="lec-header-left">
                    <span className="lec-pulsing-dot" />
                    <span className="lec-title">TIẾN TRÌNH THỰC THI AI THỜI GIAN THỰC (LIVE TRACE CONSOLE)</span>
                  </div>
                  <div className="lec-header-right">
                    <span className="lec-badge-model">Mục tiêu: {selectedModel?.name}</span>
                    <span className="lec-badge-engine">{enableCritic ? 'Multi-Agent (Nemotron ⟷ Laguna)' : 'Single-Agent Pipeline'}</span>
                    <span className="lec-badge-engine">⏱ {(liveElapsedMs / 1000).toFixed(1)}s</span>
                  </div>
                </div>

                <div className="lec-stepper-grid">
                  <div className={`lec-step-item ${getExecutionStepState(1)}`}>
                    <div className="lec-step-icon">{getExecutionStepState(1) === 'completed' ? '✓' : '1'}</div>
                    <div className="lec-step-info">
                      <span className="lec-step-name">1. Phân tích Ngữ cảnh</span>
                      <span className="lec-step-desc">Bóc tách biến & Glossary</span>
                    </div>
                  </div>

                  <div className={`lec-step-item ${getExecutionStepState(2)}`}>
                    <div className="lec-step-icon">{getExecutionStepState(2) === 'completed' ? '✓' : '2'}</div>
                    <div className="lec-step-info">
                      <span className="lec-step-name">2. NVIDIA Nemotron 3 Super 120B</span>
                      <span className="lec-step-desc">Khởi tạo 6 Slots (Draft v1)</span>
                    </div>
                  </div>

                  <div className={`lec-step-item ${getExecutionStepState(3)}`}>
                    <div className="lec-step-icon">{getExecutionStepState(3) === 'completed' ? '✓' : '3'}</div>
                    <div className="lec-step-info">
                      <span className="lec-step-name">3. Poolside Laguna S 2.1</span>
                      <span className="lec-step-desc">{enableCritic ? 'Phản biện & Soi kẽ hở' : 'Bỏ qua (Chế độ đơn)'}</span>
                    </div>
                  </div>

                  <div className={`lec-step-item ${getExecutionStepState(4)}`}>
                    <div className="lec-step-icon">{getExecutionStepState(4) === 'completed' ? '✓' : '4'}</div>
                    <div className="lec-step-info">
                      <span className="lec-step-name">4. Refiner & Thực thi</span>
                      <span className="lec-step-desc">Vá lỗi & Chạy song song</span>
                    </div>
                  </div>
                </div>

                <div className="lec-terminal-window">
                  <div className="lec-terminal-topbar">
                    <div className="lec-terminal-circles">
                      <span className="tc-dot red" />
                      <span className="tc-dot yellow" />
                      <span className="tc-dot green" />
                    </div>
                    <span className="lec-terminal-title">pipeline-worker@ai-prompt: ~$ tail -f /var/log/multi_agent_execution.log</span>
                    <span className="lec-terminal-status">LIVE · BACKEND TIMING</span>
                  </div>

                  <div className="lec-terminal-logs" ref={logContainerRef}>
                    {execLogs.map((log, idx) => (
                      <div key={idx} className={`lec-log-row ${log.type.toLowerCase()}`}>
                        <span className="log-time">[{log.time}]</span>
                        <span className={`log-tag ${log.type.toLowerCase()}`}>[{log.type}]</span>
                        <span className="log-msg">{log.text}</span>
                      </div>
                    ))}
                    <div className="lec-log-blinker">▋</div>
                  </div>
                </div>
              </div>
            )}

            {/* Panel Xem Lại Dấu Vết Tiến Trình khi đã có kết quả */}
            {!isExecuting && optimizationResult && showTracePanel && (
              <div className="persistent-trace-panel">
                <div className="ptp-header">
                  <span className="ptp-title">📜 Nhật Ký Dấu Vết Thực Thi Hệ Thống (Execution Log History)</span>
                  <button className="ptp-close-btn" onClick={() => setShowTracePanel(false)}>✕ Đóng</button>
                </div>
                <div className="lec-terminal-logs persistent">
                  {execLogs.map((log, idx) => (
                    <div key={idx} className={`lec-log-row ${log.type.toLowerCase()}`}>
                      <span className="log-time">[{log.time}]</span>
                      <span className={`log-tag ${log.type.toLowerCase()}`}>[{log.type}]</span>
                      <span className="log-msg">{log.text}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Nội dung khi đã có kết quả */}
            {!isExecuting && optimizationResult && (
              <div className="step-4-tab-content">
                
                {/* 1. SUB-TAB 1: PROMPT TỐI ƯU THEO CÁC SLOTS KỸ THUẬT */}
                {activeSubTab === 'slots' && (
                  <div className="slots-tab-view">
                    <div className="slots-header-bar">
                      <div className="slots-meta-info">
                        <span className="slots-count-tag">6 Slots Kỹ Thuật Đạt Chuẩn</span>
                        <span className="score-boost-pill">
                          Điểm Rubric: {optimizationResult.raw_score} ➔ <strong>{optimizationResult.optimized_score}/10</strong>
                        </span>
                        <span className="exec-time-pill">
                          ⏱ {optimizationResult.execution_time_ms}ms · ID {optimizationResult.request_id || optimizationResult.telemetry?.request_id || '—'}
                        </span>
                        <button
                          className={`btn-toggle-trace ${showTracePanel ? 'active' : ''}`}
                          onClick={() => setShowTracePanel(!showTracePanel)}
                          title="Bấm để xem lịch sử log thực thi chi tiết"
                        >
                          📜 {showTracePanel ? 'Ẩn Log Tiến Trình' : 'Xem Log Tiến Trình AI'}
                        </button>
                      </div>

                      <button className="btn-copy-full-prompt" onClick={handleCopyFullPrompt}>
                        {copiedSuccess ? '✓ Đã sao chép!' : '📋 Sao chép Prompt hoàn chỉnh'}
                      </button>
                    </div>

                    {/* Danh sách 6 slots hiển thị theo thẻ chuyên nghiệp */}
                    <div className="slots-cards-grid">
                      {(optimizationResult.slots || []).map((slot, idx) => (
                        <div key={idx} className={`slot-card-box ${slot.slot_name}`}>
                          <div className="slot-card-header">
                            <span className="slot-index-num">#{idx + 1}</span>
                            <h4 className="slot-label-text">{slot.label}</h4>
                            <span className="slot-badge-type">{slot.badge_type}</span>
                          </div>
                          <div className="slot-card-content">
                            <pre className="slot-pre-text">{slot.content}</pre>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Khối hiển thị toàn văn Prompt đã ghép nối */}
                    <div className="full-synthesized-prompt-box">
                      <div className="full-prompt-header">
                        <span>Chuỗi Prompt Hoàn Chỉnh Được Gửi Tới Mô Hình:</span>
                        <span className="char-count-meta">
                          {optimizationResult.optimized_prompt.length} ký tự (~{Math.round(optimizationResult.optimized_prompt.length / 4)} tokens)
                        </span>
                      </div>
                      <pre className="full-prompt-pre">{optimizationResult.optimized_prompt}</pre>
                    </div>
                  </div>
                )}

                {/* 2. SUB-TAB 2: SO SÁNH PROMPT DIFF & ĐIỂM SỐ */}
                {activeSubTab === 'diff' && (
                  <PromptDiff
                    rawPrompt={rawPrompt}
                    optimizedPrompt={optimizationResult.optimized_prompt}
                    rawScore={optimizationResult.raw_score}
                    optimizedScore={optimizationResult.optimized_score}
                    diffTokens={optimizationResult.diff_added_tokens}
                  />
                )}

                {/* 3. SUB-TAB 3: SO SÁNH KẾT QUẢ AI SONG SONG */}
                {activeSubTab === 'ai' && (
                  <div className="ai-comparison-tab-view">
                    <div className="ai-exec-meta-bar">
                      <div className="exec-meta-left">
                        <span className="exec-source-pill">
                          Nguồn: Cloud OpenRouter API
                        </span>
                        <span className="exec-model-pill">Mô hình: {selectedModel?.name}</span>
                        <span className="exec-time-pill">⏱ {optimizationResult.execution_time_ms} ms</span>
                        <span className="exec-time-pill">ID: {optimizationResult.request_id || optimizationResult.telemetry?.request_id || '—'}</span>
                      </div>
                      <div className="exec-meta-right">
                        <span>Prompt đã được áp dụng skill và gửi qua mô hình</span>
                      </div>
                    </div>

                    {/* Hai cột song song đối chiếu */}
                    <div className="ai-parallel-grid">
                      {/* Cột 1: Kết quả từ Prompt Thô */}
                      <div className="ai-result-column raw-column">
                        <div className="column-top-label raw">
                          <span>❌ KẾT QUẢ TỪ PROMPT THÔ (BEFORE)</span>
                          <span className="col-score-tag">{optimizationResult.raw_score}/10</span>
                        </div>
                        <div className="ai-response-scroll-box">
                          <pre className="ai-response-pre">
                            {optimizationResult.ai_raw_response || '(Không có phản hồi)'}
                          </pre>
                        </div>
                        <div className="ai-column-footnote raw">
                          Nhận xét: Câu trả lời ngắn, chung chung, dễ bỏ sót ngoại lệ và thiếu cảnh báo an toàn.
                        </div>
                      </div>

                      {/* Cột 2: Kết quả từ Prompt Tối Ưu */}
                      <div className="ai-result-column opt-column">
                        <div className="column-top-label opt">
                          <span>✓ KẾT QUẢ TỪ PROMPT TỐI ƯU (AFTER)</span>
                          <span className="col-score-tag">{optimizationResult.optimized_score}/10</span>
                        </div>
                        <div className="ai-response-scroll-box">
                          <pre className="ai-response-pre highlight-opt">
                            {optimizationResult.ai_optimized_response || '(Không có phản hồi)'}
                          </pre>
                        </div>
                        <div className="ai-column-footnote opt">
                          Nhận xét: Cấu trúc phân tầng rõ ràng, code sạch có type hints hoặc y học chứng cứ có Medical Disclaimer.
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* 4. SUB-TAB: PHẢN BIỆN MULTI-AGENT (GENERATOR - CRITIC LOOP) */}
                {activeSubTab === 'critic' && optimizationResult.critic_report && (
                  <div className="critic-tab-view">
                    {/* Banner tổng quan chu trình */}
                    <div className="critic-hero-card">
                      <div className="critic-hero-left">
                        <div className="critic-icon-pulsing">🤖💬</div>
                        <div>
                          <h3>Chu trình Phản biện Multi-Agent: NVIDIA Nemotron 3 Super 120B ⟷ Poolside Laguna</h3>
                          <p>
                            • <strong>Khởi tạo & Tinh chỉnh:</strong> <code>{optimizationResult.critic_report.generator_model || 'nvidia/nemotron-3-super-120b-a12b:free'}</code><br />
                            • <strong>Phản biện & Kiểm toán:</strong> <code>{optimizationResult.critic_report.critic_model || 'poolside/laguna-s-2.1:free'}</code>
                          </p>
                        </div>
                      </div>
                      <div className="critic-score-jump">
                        <div className="csj-box">
                          <span className="csj-label">Điểm Draft v1</span>
                          <span className="csj-val v1">{optimizationResult.critic_report.v1_score}/10</span>
                        </div>
                        <span className="csj-arrow">➔</span>
                        <div className="csj-box highlight">
                          <span className="csj-label">Điểm Sau Phản Biện</span>
                          <span className="csj-val v2">{optimizationResult.critic_report.v2_score}/10</span>
                        </div>
                      </div>
                    </div>

                    {/* 3 Thẻ Giai đoạn tuần tự */}
                    <div className="critic-stages-flow">
                      {/* Giai đoạn 1: Bản sơ thảo v1 */}
                      <div className="critic-stage-card stage-1">
                        <div className="stage-card-header">
                          <div className="stage-step-tag">GIAI ĐOẠN 1: BUILDER + NEMOTRON (NVIDIA NEMOTRON 3 SUPER 120B)</div>
                          <h4>Bản Prompt Sơ thảo ban đầu (Draft v1)</h4>
                          <span className="stage-badge-score">Điểm: {optimizationResult.critic_report.v1_score}/10</span>
                        </div>
                        <div className="stage-content-box">
                          <pre className="stage-pre-text">{optimizationResult.critic_report.draft_prompt_v1}</pre>
                        </div>
                        <div className="stage-card-footer note-generator">
                          Prompt Builder tạo khung 6 slots theo yêu cầu thô; NVIDIA Nemotron 3 Super 120B thực thi bản prompt đã áp skills.
                        </div>
                      </div>

                      {/* Giai đoạn 2: Báo cáo Phản biện từ Critic */}
                      <div className="critic-stage-card stage-2">
                        <div className="stage-card-header">
                          <div className="stage-step-tag critic">GIAI ĐOẠN 2: CRITIC REVIEWER (POOLSIDE LAGUNA)</div>
                          <h4>Vạch lá tìm sâu & Bóc tách Lỗ hổng</h4>
                          <span className="stage-badge-critic">{optimizationResult.critic_report.critic_model}</span>
                        </div>
                        <div className="stage-critiques-list">
                          {optimizationResult.critic_report.critique_points.map((point, idx) => (
                            <div key={idx} className="critique-item-row">
                              <span className="critique-item-num">✕ Điểm yếu #{idx + 1}</span>
                              <p className="critique-item-text">{point}</p>
                            </div>
                          ))}
                        </div>
                        <div className="stage-card-footer note-critic">
                          Tác tử phản biện <strong>Poolside Laguna S 2.1 (Free)</strong> soi xét lỗ hổng logic, bảo mật và thiếu sót kiểm thử biên.
                        </div>
                      </div>

                      {/* Giai đoạn 3: Cải tiến & Bản Prompt v2 Hoàn hảo */}
                      <div className="critic-stage-card stage-3">
                        <div className="stage-card-header">
                          <div className="stage-step-tag success">GIAI ĐOẠN 3: REFINER PIPELINE</div>
                          <h4>Tiếp thu Phản biện & Xuất bản Prompt Chuẩn hóa v2</h4>
                          <span className="stage-badge-score v2">Điểm: {optimizationResult.critic_report.v2_score}/10</span>
                        </div>
                        
                        <div className="stage-improvements-section">
                          <div className="improvements-heading">✓ Các cải tiến đột phá đã được đắp vào:</div>
                          <div className="improvements-chips-grid">
                            {optimizationResult.critic_report.improvements_applied.map((imp, idx) => (
                              <div key={idx} className="improvement-chip">
                                <span className="imp-check">✓</span>
                                <span>{imp}</span>
                              </div>
                            ))}
                          </div>
                        </div>

                        <div className="stage-content-box highlight-v2">
                          <pre className="stage-pre-text">{optimizationResult.optimized_prompt}</pre>
                        </div>

                        <div className="stage-card-footer note-success">
                          Hệ thống áp dụng phản biện của <strong>Poolside Laguna</strong> vào các slot và tạo bản Prompt v2; NVIDIA Nemotron 3 Super 120B thực thi kết quả cuối.
                        </div>
                      </div>
                    </div>
                  </div>
                )}

              </div>
            )}

            {/* Bottom Actions Bar & Export Buttons */}
            <div className="step-bottom-actions step-4-actions">
              <button className="btn-step-prev" onClick={prevStep}>
                ← Quay lại Bước 3 (Mô hình)
              </button>

              {/* Các nút bấm xuất dữ liệu */}
              <div className="export-buttons-group">
                <button className="btn-export-action" onClick={handleCopyFullPrompt}>
                  📋 Copy Prompt
                </button>
                <button className="btn-export-action" onClick={handleDownloadJSON}>
                  💾 Tải JSON
                </button>
                <button className="btn-export-action" onClick={handleDownloadMarkdown}>
                  📄 Tải Markdown
                </button>
                <button
                  className="btn-export-action highlight-save"
                  onClick={() => showToast("Đã lưu bản ghi vào Lịch sử thành công!")}
                >
                  ✓ Đã lưu Lịch sử
                </button>
              </div>

              <button className="btn-reset-wizard" onClick={resetWizard}>
                ↺ Bắt đầu lượt mới
              </button>
            </div>
          </div>
        )}

      </div>

      {/* Toast thông báo */}
      {toastMessage && (
        <div className="toast-float-notification">
          <span>{toastMessage}</span>
        </div>
      )}
    </div>
  );
}
