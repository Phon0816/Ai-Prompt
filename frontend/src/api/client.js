/**
 * API Client kết nối với FastAPI Backend
 */

const API_BASE = '/api';

export async function fetchDomains() {
  let res;
  try {
    res = await fetch(`${API_BASE}/domains`);
  } catch (err) {
    res = await fetch('http://127.0.0.1:8000/api/domains');
  }
  if (!res.ok) {
    throw new Error(`Không thể tải danh sách lĩnh vực (Mã lỗi: ${res.status})`);
  }
  return await res.json();
}

export async function fetchDomainDetail(domainId) {
  let res;
  try {
    res = await fetch(`${API_BASE}/domains/${domainId}`);
  } catch (err) {
    res = await fetch(`http://127.0.0.1:8000/api/domains/${domainId}`);
  }
  if (!res.ok) {
    throw new Error(`Không thể tải chi tiết lĩnh vực ${domainId} (Mã lỗi: ${res.status})`);
  }
  return await res.json();
}

export async function scorePrompt(domainId, rawPrompt, templateId = null) {
  const payload = {
    domain_id: domainId,
    raw_prompt: rawPrompt,
    template_id: templateId
  };

  let res;
  try {
    res = await fetch(`${API_BASE}/score`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
  } catch (err) {
    res = await fetch('http://127.0.0.1:8000/api/score', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
  }

  if (!res.ok) {
    throw new Error(`Lỗi khi chấm điểm prompt (Mã lỗi: ${res.status})`);
  }
  return await res.json();
}

export async function fetchRecommendations(domainId, templateId = null, rawPrompt = '', weights = null) {
  const payload = {
    domain_id: domainId,
    template_id: templateId,
    raw_prompt: rawPrompt,
    weights: weights
  };

  let res;
  try {
    res = await fetch(`${API_BASE}/recommend`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
  } catch (err) {
    res = await fetch('http://127.0.0.1:8000/api/recommend', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
  }

  if (!res.ok) {
    throw new Error(`Lỗi khi lấy khuyến nghị mô hình (Mã lỗi: ${res.status})`);
  }
  return await res.json();
}

export async function optimizePrompt(domainId, templateId, rawPrompt, selectedModelId, runAi = true, enableCritic = false, compareRaw = false, executionMode = 'fast', onEvent = null) {
  const payload = {
    domain_id: domainId,
    template_id: templateId,
    raw_prompt: rawPrompt,
    selected_model_id: selectedModelId,
    run_ai_execution: runAi,
    compare_raw: compareRaw,
    enable_critic: enableCritic,
    execution_mode: executionMode
  };

  let res;
  try {
    res = await fetch(`${API_BASE}/optimize/stream`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
  } catch (err) {
    res = await fetch('http://127.0.0.1:8000/api/optimize/stream', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
  }

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    const error = new Error(errorData.detail?.message || errorData.detail || `Lỗi khi tối ưu hóa prompt (Mã lỗi: ${res.status})`);
    error.requestId = res.headers.get('x-request-id') || null;
    throw error;
  }
  if (!res.body) {
    throw new Error('Backend không hỗ trợ luồng SSE');
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let result = null;

  const handleEvent = (block) => {
    const lines = block.split(/\r?\n/);
    const eventName = lines.find((line) => line.startsWith('event:'))?.slice(6).trim() || 'message';
    const dataLine = lines.find((line) => line.startsWith('data:'))?.slice(5).trim();
    if (!dataLine) return;
    let data;
    try {
      data = JSON.parse(dataLine);
    } catch {
      data = { message: dataLine };
    }
    if (onEvent) onEvent(eventName, data);
    if (eventName === 'result') result = data;
    if (eventName === 'error') {
      const error = new Error(data.message || 'Lỗi khi tối ưu hóa prompt');
      error.requestId = data.request_id || null;
      throw error;
    }
  };

  while (true) {
    const { value, done } = await reader.read();
    buffer += decoder.decode(value || new Uint8Array(), { stream: !done });
    const blocks = buffer.split(/\r?\n\r?\n/);
    buffer = blocks.pop() || '';
    for (const block of blocks) {
      if (block.trim()) handleEvent(block);
    }
    if (done) break;
  }
  if (buffer.trim()) handleEvent(buffer);
  if (!result) throw new Error('Backend kết thúc luồng mà không trả về kết quả');
  result.request_id = result.telemetry?.request_id || result.request_id || null;
  return result;
}

export async function checkBackendHealth() {
  try {
    let res;
    try {
      res = await fetch(`${API_BASE}/health`);
    } catch {
      res = await fetch('http://127.0.0.1:8000/api/health');
    }
    if (res.ok) {
      return await res.json();
    }
    return null;
  } catch {
    return null;
  }
}

// ==================== HISTORY API ====================

export async function fetchHistory(domain = null, limit = 50) {
  const params = new URLSearchParams();
  if (domain) params.set('domain', domain);
  params.set('limit', String(limit));
  const qs = params.toString();

  let res;
  try {
    res = await fetch(`${API_BASE}/history?${qs}`);
  } catch (err) {
    res = await fetch(`http://127.0.0.1:8000/api/history?${qs}`);
  }
  if (!res.ok) {
    throw new Error(`Lỗi khi tải lịch sử (Mã lỗi: ${res.status})`);
  }
  return await res.json();
}

export async function fetchHistoryStats() {
  let res;
  try {
    res = await fetch(`${API_BASE}/history/stats`);
  } catch (err) {
    res = await fetch('http://127.0.0.1:8000/api/history/stats');
  }
  if (!res.ok) {
    throw new Error(`Lỗi khi tải thống kê (Mã lỗi: ${res.status})`);
  }
  return await res.json();
}

export async function deleteHistoryItem(historyId) {
  let res;
  try {
    res = await fetch(`${API_BASE}/history/${historyId}`, { method: 'DELETE' });
  } catch (err) {
    res = await fetch(`http://127.0.0.1:8000/api/history/${historyId}`, { method: 'DELETE' });
  }
  if (!res.ok) {
    throw new Error(`Lỗi khi xóa bản ghi (Mã lỗi: ${res.status})`);
  }
  return await res.json();
}

export async function clearAllHistory() {
  let res;
  try {
    res = await fetch(`${API_BASE}/history`, { method: 'DELETE' });
  } catch (err) {
    res = await fetch('http://127.0.0.1:8000/api/history', { method: 'DELETE' });
  }
  if (!res.ok) {
    throw new Error(`Lỗi khi xóa lịch sử (Mã lỗi: ${res.status})`);
  }
  return await res.json();
}

// ==================== SETTINGS API ====================

export async function fetchSettings() {
  let res;
  try {
    res = await fetch(`${API_BASE}/settings`);
  } catch (err) {
    res = await fetch('http://127.0.0.1:8000/api/settings');
  }
  if (!res.ok) {
    throw new Error(`Lỗi khi tải cài đặt (Mã lỗi: ${res.status})`);
  }
  return await res.json();
}

export async function updateApiKey(apiKey) {
  let res;
  try {
    res = await fetch(`${API_BASE}/settings/apikey`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ api_key: apiKey })
    });
  } catch (err) {
    res = await fetch('http://127.0.0.1:8000/api/settings/apikey', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ api_key: apiKey })
    });
  }
  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    throw new Error(errData.detail || `Lỗi cập nhật API Key (Mã lỗi: ${res.status})`);
  }
  return await res.json();
}

export async function removeApiKey() {
  let res;
  try {
    res = await fetch(`${API_BASE}/settings/apikey`, { method: 'DELETE' });
  } catch (err) {
    res = await fetch('http://127.0.0.1:8000/api/settings/apikey', { method: 'DELETE' });
  }
  if (!res.ok) {
    throw new Error(`Lỗi khi xóa API Key (Mã lỗi: ${res.status})`);
  }
  return await res.json();
}

export async function testModelConnection() {
  let res;
  try {
    res = await fetch(`${API_BASE}/settings/test-connection`, { method: 'POST' });
  } catch (err) {
    res = await fetch('http://127.0.0.1:8000/api/settings/test-connection', { method: 'POST' });
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.message || `Lỗi kiểm tra model (Mã lỗi: HTTP_${res.status})`);
  }
  return data;
}

export async function updateDefaultModel(modelId) {
  let res;
  try {
    res = await fetch(`${API_BASE}/settings/default-model`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ model_id: modelId })
    });
  } catch (err) {
    res = await fetch('http://127.0.0.1:8000/api/settings/default-model', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ model_id: modelId })
    });
  }
  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    throw new Error(errData.detail || `Lỗi cập nhật mô hình mặc định (Mã lỗi: ${res.status})`);
  }
  return await res.json();
}
