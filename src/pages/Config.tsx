import React, { useState, useEffect } from 'react';
import { Settings, Save, AlertCircle, CheckCircle, Info } from 'lucide-react';

interface ConfigState {
  llm_provider: string;
  llm_endpoint: string;
  llm_model: string;
  slm_model_path: string;
  embedding_model_cache_dir: string;
  seed_corpus_csv: string;
}

const DEFAULT_LLM_MODELS: Record<string, string> = {
  openai: 'Qwen/Qwen3-4B-AWQ',
  genai: 'gemini-3.1-flash-lite',
};

const parseUtcDate = (dateStr: string) => {
  if (!dateStr) return new Date();
  let isoStr = dateStr;
  if (!isoStr.includes('T') && isoStr.includes(' ')) {
    isoStr = isoStr.replace(' ', 'T');
  }
  if (!/Z|[+-]\d{2}(:\d{2})?$/.test(isoStr)) {
    isoStr += 'Z';
  }
  return new Date(isoStr);
};

export default function Config() {
  const [config, setConfig] = useState<ConfigState | null>(null);
  const [llmProvider, setLlmProvider] = useState('openai');
  const [llmEndpoint, setLlmEndpoint] = useState('');
  const [llmModel, setLlmModel] = useState('');
  const [llmApiKey, setLlmApiKey] = useState('EMPTY'); // Default payload api key
  
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  // SLM state variables
  const [modelStatus, setModelStatus] = useState<{
    model_name: string;
    current_sha: string;
    scheduled_time: string | null;
    scheduled_sha: string | null;
    is_updating: boolean;
    last_update_error: string | null;
  } | null>(null);
  const [scheduleTime, setScheduleTime] = useState('');
  const [isModelActionLoading, setIsModelActionLoading] = useState(false);
  const [showSchedulePicker, setShowSchedulePicker] = useState(false);
  const [updateHistory, setUpdateHistory] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<'update' | 'history'>('update');

  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';
  const token = localStorage.getItem('admin_token');

  const fetchConfig = async () => {
    setIsLoading(true);
    setErrorMsg('');
    try {
      const response = await fetch(`${API_URL}/api/admin/config`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Lỗi khi kết nối đến máy chủ quản trị');
      }

      const data = await response.json();
      setConfig(data);
      const provider = data.llm_provider || 'openai';
      setLlmProvider(provider);
      setLlmEndpoint(data.llm_endpoint || '');
      setLlmModel(data.llm_model || DEFAULT_LLM_MODELS[provider] || '');
    } catch (err: any) {
      setErrorMsg(err.message || 'Lỗi tải cấu hình');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchModelStatus = async () => {
    try {
      const response = await fetch(`${API_URL}/api/admin/model-status`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      if (response.ok) {
        const data = await response.json();
        setModelStatus(data);
      }
    } catch (err) {
      console.error('Error fetching model status:', err);
    }
  };

  const fetchUpdateHistory = async () => {
    try {
      const response = await fetch(`${API_URL}/api/admin/model-update-history`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      if (response.ok) {
        const data = await response.json();
        setUpdateHistory(data);
      }
    } catch (err) {
      console.error('Error fetching model update history:', err);
    }
  };

  useEffect(() => {
    fetchConfig();
    fetchModelStatus();
    fetchUpdateHistory();
  }, []);

  // Poll model status every 3 seconds if an update is in progress
  useEffect(() => {
    let intervalId: any;
    if (modelStatus?.is_updating) {
      intervalId = setInterval(() => {
        fetchModelStatus();
      }, 3000);
    }
    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [modelStatus?.is_updating]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setErrorMsg('');
    setSuccessMsg('');

    try {
      const response = await fetch(`${API_URL}/api/admin/config`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          llm_provider: llmProvider,
          llm_endpoint: llmProvider === 'openai' ? llmEndpoint : '',
          llm_model: llmModel,
          llm_api_key: llmApiKey,
        }),
      });

      if (!response.ok) {
        throw new Error('Không thể lưu cấu hình mới lên máy chủ');
      }

      setSuccessMsg('Cấu hình hệ thống đã được lưu và cập nhật thành công!');
      fetchConfig(); // Reload from server
    } catch (err: any) {
      setErrorMsg(err.message || 'Lỗi lưu cấu hình');
    } finally {
      setIsSaving(false);
    }
  };

  const handleImmediateUpdate = async () => {
    const confirmMsg = 'Bạn có chắc chắn muốn cập nhật mô hình SLM ngay lập tức? Việc này sẽ tải phiên bản mới nhất từ Hugging Face trong nền mà không làm gián đoạn dịch vụ dự đoán.';
    if (!window.confirm(confirmMsg)) {
      return;
    }

    setIsModelActionLoading(true);
    setErrorMsg('');
    setSuccessMsg('');

    try {
      const response = await fetch(`${API_URL}/api/admin/update-model`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          target_time: null,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.detail || 'Lỗi khi gửi yêu cầu cập nhật mô hình');
      }

      setSuccessMsg(data.message || 'Yêu cầu cập nhật mô hình đã được ghi nhận!');
      fetchModelStatus();
      fetchUpdateHistory();
    } catch (err: any) {
      setErrorMsg(err.message || 'Lỗi cập nhật mô hình');
    } finally {
      setIsModelActionLoading(false);
    }
  };

  const handleScheduleUpdate = async () => {
    if (!scheduleTime) return;

    const localDate = new Date(scheduleTime);
    const formattedLocal = localDate.toLocaleString('vi-VN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
    const confirmMsg = `Bạn có chắc chắn muốn lên lịch cập nhật mô hình SLM vào lúc ${formattedLocal}?`;
    if (!window.confirm(confirmMsg)) {
      return;
    }

    setIsModelActionLoading(true);
    setErrorMsg('');
    setSuccessMsg('');

    try {
      const response = await fetch(`${API_URL}/api/admin/update-model`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          target_time: localDate.toISOString(),
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.detail || 'Lỗi khi gửi yêu cầu lên lịch');
      }

      setSuccessMsg(data.message || 'Lịch hẹn cập nhật đã được ghi nhận thành công!');
      setScheduleTime('');
      setShowSchedulePicker(false);
      fetchModelStatus();
      fetchUpdateHistory();
    } catch (err: any) {
      setErrorMsg(err.message || 'Lỗi lên lịch cập nhật mô hình');
    } finally {
      setIsModelActionLoading(false);
    }
  };

  const handleCancelUpdate = async () => {
    if (!window.confirm('Bạn có chắc chắn muốn hủy lịch cập nhật mô hình đã lên lịch?')) {
      return;
    }

    setIsModelActionLoading(true);
    setErrorMsg('');
    setSuccessMsg('');

    try {
      const response = await fetch(`${API_URL}/api/admin/cancel-update`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.detail || 'Lỗi khi hủy lịch cập nhật');
      }

      setSuccessMsg(data.message || 'Đã hủy lịch cập nhật mô hình thành công!');
      fetchModelStatus();
      fetchUpdateHistory();
    } catch (err: any) {
      setErrorMsg(err.message || 'Lỗi khi hủy lịch');
    } finally {
      setIsModelActionLoading(false);
    }
  };

  const getMinDateTime = () => {
    const now = new Date();
    now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
    return now.toISOString().slice(0, 16);
  };

  if (isLoading && !config) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center space-y-3">
          <div className="w-10 h-10 border-4 border-blue-500/30 border-t-blue-500 rounded-full animate-spin mx-auto" />
          <p className="text-sm text-text-secondary">Đang tải cấu hình hệ thống...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="page-shell-narrow page-stack flex-1">
      <div className="section-stack">
        <h1 className="text-3xl font-extrabold tracking-tight flex items-center gap-2">
          <Settings size={28} className="text-blue-600" /> Cấu Hình Hệ Thống
        </h1>
        <p className="text-sm text-text-secondary">Điều chỉnh các tham số kết nối LLM và RAG</p>
      </div>

      {successMsg && (
        <div className="p-5 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-700 text-sm flex items-center gap-2 animate-slide-in">
          <CheckCircle size={16} className="shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {errorMsg && (
        <div className="p-5 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm flex items-center gap-2 animate-slide-in">
          <AlertCircle size={16} className="shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-12 gap-6 xl:gap-8 items-start">
        {/* Editable Config Form */}
        <div className="md:col-span-8 glass-panel p-7 md:p-8">
          <form onSubmit={handleSave} className="section-stack">
            <h3 className="text-sm font-bold text-text-secondary uppercase tracking-wider border-b border-border-color pb-3 mb-4">
              Cấu hình mô hình ngôn ngữ lớn (LLM)
            </h3>
            
            <div className="space-y-2">
              <label className="text-xs font-semibold text-text-secondary">Loại Nhà Cung Cấp LLM (Provider)</label>
              <select
                value={llmProvider}
                onChange={(e) => {
                  const nextProvider = e.target.value;
                  setLlmProvider(nextProvider);
                  setLlmModel(DEFAULT_LLM_MODELS[nextProvider] || '');
                }}
              >
                <option value="openai">OpenAI (Hoặc API Tương thích)</option>
                <option value="genai">Google GenAI (Gemma / Gemini)</option>
              </select>
            </div>

            {llmProvider === 'openai' && (
              <div className="space-y-2">
                <label className="text-xs font-semibold text-text-secondary">API Endpoint URL</label>
                <input
                  type="url"
                  value={llmEndpoint}
                  onChange={(e) => setLlmEndpoint(e.target.value)}
                  placeholder="Nhập endpoint của LLM (e.g. OpenAI-compatible API)"
                  required
                />
                <span className="text-[10px] text-text-muted">Đường dẫn đầy đủ tới API Gateway tương thích OpenAI (e.g., https://.../v1)</span>
              </div>
            )}

            <div className="space-y-2">
              <label className="text-xs font-semibold text-text-secondary">Tên Model LLM</label>
              <input
                type="text"
                value={llmModel}
                onChange={(e) => setLlmModel(e.target.value)}
                placeholder={llmProvider === 'openai' ? "Nhập tên model (e.g. Qwen/Qwen3-4B-AWQ)" : "Nhập tên model (e.g. gemma-4-26b-a4b-it)"}
                required
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs font-semibold text-text-secondary">LLM API Key / Google API Key (Mặc định: EMPTY)</label>
              <input
                type="password"
                value={llmApiKey}
                onChange={(e) => setLlmApiKey(e.target.value)}
                placeholder="Nhập API Key mới nếu cần thay đổi"
              />
            </div>

            <button
              type="submit"
              disabled={isSaving}
              className="btn btn-primary w-full py-3 mt-4 flex justify-center items-center gap-2"
            >
              {isSaving ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <Save size={16} /> Lưu cấu hình
                </>
              )}
            </button>
          </form>

          {/* Model Update Management section */}
          <div className="border-t border-border-color pt-8 mt-8 section-stack">
            <div className="flex items-center justify-between border-b border-border-color pb-2 mb-4">
              <h3 className="text-sm font-bold text-text-secondary uppercase tracking-wider">
                Cập nhật mô hình SLM (PhoBERT)
              </h3>
              
              {/* Tab Switcher */}
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setActiveTab('update')}
                  className={`px-3 py-1.5 text-xs font-bold rounded transition-colors ${
                    activeTab === 'update'
                      ? 'bg-blue-50 text-blue-600 border border-blue-200'
                      : 'text-text-muted hover:text-text-secondary border border-transparent'
                  }`}
                >
                  Cập nhật
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('history')}
                  className={`px-3 py-1.5 text-xs font-bold rounded transition-colors ${
                    activeTab === 'history'
                      ? 'bg-blue-50 text-blue-600 border border-blue-200'
                      : 'text-text-muted hover:text-text-secondary border border-transparent'
                  }`}
                >
                  Lịch sử thay đổi
                </button>
              </div>
            </div>
            
            {activeTab === 'update' && (
              <div className="section-stack">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 bg-slate-50 p-5 rounded-lg border border-border-color text-sm">
                  <div className="space-y-1">
                    <span className="text-text-muted text-xs font-semibold">Tên mô hình AI:</span>
                    <p className="font-semibold text-text-secondary">{modelStatus?.model_name || 'chinhde/fake-news-detection-slm'}</p>
                  </div>
                  
                  <div className="space-y-1">
                    <span className="text-text-muted text-xs font-semibold">Phiên bản hiện tại (Commit SHA):</span>
                    <p className="font-mono text-xs bg-white py-1 px-2.5 rounded border border-border-color inline-block font-semibold text-text-secondary break-all">
                      {modelStatus?.current_sha || 'local'}
                    </p>
                  </div>

                  <div className="sm:col-span-2 space-y-1 border-t border-border-color/60 pt-3">
                    <span className="text-text-muted text-xs font-semibold">Trạng thái đặt lịch cập nhật:</span>
                    {modelStatus?.scheduled_time ? (
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-blue-50/60 p-3 rounded border border-blue-100 text-blue-800 text-xs">
                        <div>
                          <p className="font-semibold">Đã lên lịch cập nhật tự động:</p>
                          <p className="mt-0.5">Thời gian: {parseUtcDate(modelStatus.scheduled_time).toLocaleString('vi-VN', {
                            year: 'numeric',
                            month: '2-digit',
                            day: '2-digit',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}</p>
                          <p className="font-mono mt-0.5 text-[10px] text-blue-600">SHA mục tiêu: {modelStatus.scheduled_sha}</p>
                        </div>
                        <button
                          type="button"
                          onClick={handleCancelUpdate}
                          disabled={isModelActionLoading || modelStatus.is_updating}
                          className="btn btn-secondary py-1.5 px-3 text-[11px] bg-white border-red-200 text-red-600 hover:bg-red-50 hover:border-red-300 transition-colors"
                        >
                          Hủy lịch hẹn
                        </button>
                      </div>
                    ) : (
                      <p className="text-text-muted text-xs italic">Không có lịch hẹn cập nhật nào đang chờ xử lý.</p>
                    )}
                  </div>
                </div>

                {modelStatus?.is_updating && (
                  <div className="p-4 rounded-lg bg-blue-50 border border-blue-200 text-blue-700 text-xs flex items-center gap-3 animate-pulse">
                    <div className="w-4 h-4 border-2 border-blue-500/30 border-t-blue-500 rounded-full animate-spin shrink-0" />
                    <div>
                      <p className="font-bold">Đang tải và cập nhật mô hình mới ở nền (Hot-swap)...</p>
                      <p className="text-[10px] text-blue-600 mt-0.5">Tiến trình này đang diễn ra trực tiếp trên bộ nhớ (RAM/VRAM), các yêu cầu dự đoán (/predict) của người dùng vẫn hoạt động bình thường.</p>
                    </div>
                  </div>
                )}

                {modelStatus?.last_update_error && (
                  <div className="p-4 rounded-lg bg-red-50 border border-red-200 text-red-700 text-xs space-y-1">
                    <p className="font-bold">Lần cập nhật trước thất bại (Đã tự động khôi phục bản cũ):</p>
                    <p className="font-mono text-[10px] bg-white p-2 rounded border border-red-100 break-all">{modelStatus.last_update_error}</p>
                  </div>
                )}

                <div className="space-y-4 pt-4 border-t border-border-color/60">
                  <div className="flex flex-col sm:flex-row gap-3">
                    <button
                      type="button"
                      disabled={isModelActionLoading || modelStatus?.is_updating}
                      onClick={handleImmediateUpdate}
                      className="btn btn-primary bg-slate-900 hover:bg-slate-800 text-white flex-1 py-3 flex justify-center items-center gap-2"
                    >
                      {isModelActionLoading && !showSchedulePicker ? (
                        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      ) : (
                        'Cập nhật ngay lập tức'
                      )}
                    </button>
                    <button
                      type="button"
                      disabled={isModelActionLoading || modelStatus?.is_updating}
                      onClick={() => setShowSchedulePicker(!showSchedulePicker)}
                      className={`btn flex-1 py-3 transition-colors ${
                        showSchedulePicker 
                          ? 'bg-blue-600 hover:bg-blue-700 text-white' 
                          : 'btn-secondary'
                      }`}
                    >
                      Hẹn giờ cập nhật...
                    </button>
                  </div>

                  {showSchedulePicker && (
                    <div className="space-y-3 bg-slate-50 p-4 rounded-lg border border-border-color animate-slide-in">
                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-text-secondary">Chọn ngày giờ cập nhật trong tương lai:</label>
                        <input
                          type="datetime-local"
                          value={scheduleTime}
                          onChange={(e) => setScheduleTime(e.target.value)}
                          min={getMinDateTime()}
                          disabled={isModelActionLoading}
                          className="w-full bg-white"
                        />
                      </div>
                      <div className="flex justify-end gap-2 text-xs">
                        <button
                          type="button"
                          onClick={() => {
                            setScheduleTime('');
                            setShowSchedulePicker(false);
                          }}
                          className="btn btn-secondary py-1.5 px-3"
                        >
                          Hủy bỏ
                        </button>
                        <button
                          type="button"
                          disabled={!scheduleTime || isModelActionLoading}
                          onClick={handleScheduleUpdate}
                          className="btn btn-primary bg-slate-900 text-white py-1.5 px-4"
                        >
                          {isModelActionLoading && showSchedulePicker ? (
                            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                          ) : (
                            'Xác nhận hẹn giờ'
                          )}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {activeTab === 'history' && (
              <div className="section-stack animate-slide-in">
                <div className="max-h-[400px] overflow-y-auto pr-1 border border-border-color rounded-lg bg-slate-50">
                  {updateHistory.length === 0 ? (
                    <div className="p-8 text-center text-text-muted text-xs italic">
                      Chưa ghi nhận lịch sử thay đổi mô hình nào.
                    </div>
                  ) : (
                    <div className="divide-y divide-border-color">
                      {updateHistory.map((item) => (
                        <div key={item.id} className="p-4 text-xs space-y-2 hover:bg-slate-100/50 transition-colors">
                          <div className="flex items-center justify-between gap-3">
                            <span className="font-mono text-text-secondary bg-white py-0.5 px-2 rounded border border-border-color">
                              {item.version_sha.slice(0, 7)}
                            </span>
                            <span className={`badge text-[10px] px-2 py-0.5 ${
                              item.status === 'SUCCESS' 
                                ? 'bg-emerald-50 border-emerald-200 text-emerald-700' 
                                : 'bg-red-50 border-red-200 text-red-700'
                            }`}>
                              {item.status === 'SUCCESS' ? 'Thành công' : 'Thất bại'}
                            </span>
                          </div>

                          <div className="text-text-muted text-[10px] space-y-0.5">
                            <p>Yêu cầu lúc: {parseUtcDate(item.triggered_at).toLocaleString('vi-VN', {
                              year: 'numeric',
                              month: '2-digit',
                              day: '2-digit',
                              hour: '2-digit',
                              minute: '2-digit',
                              second: '2-digit'
                            })}</p>
                            <p>Hoàn tất lúc: {parseUtcDate(item.completed_at).toLocaleString('vi-VN', {
                              year: 'numeric',
                              month: '2-digit',
                              day: '2-digit',
                              hour: '2-digit',
                              minute: '2-digit',
                              second: '2-digit'
                            })}</p>
                          </div>

                          {item.error_message && (
                            <div className="bg-red-50/50 p-2.5 rounded border border-red-100/60 text-red-700 font-mono text-[10px] break-all leading-normal">
                              <strong>Lỗi:</strong> {item.error_message}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Read-only System parameters */}
        <div className="md:col-span-4 section-stack">
          <div className="glass-panel p-7 md:p-8 section-stack">
            <h3 className="text-sm font-bold text-text-secondary uppercase tracking-wider border-b border-border-color pb-2">
              Tham số hệ thống
            </h3>
            
            <div className="section-stack text-xs">
              <div className="space-y-2">
                <span className="text-text-muted font-semibold">Đường dẫn SLM Model:</span>
                <p className="font-mono bg-slate-50 p-3 rounded border border-border-color text-text-secondary break-all">
                  {config?.slm_model_path}
                </p>
              </div>

              <div className="space-y-2">
                <span className="text-text-muted font-semibold">Thư mục cache embeddings:</span>
                <p className="font-mono bg-slate-50 p-3 rounded border border-border-color text-text-secondary break-all">
                  {config?.embedding_model_cache_dir}
                </p>
              </div>

              <div className="space-y-2">
                <span className="text-text-muted font-semibold">Đường dẫn file seed CSV:</span>
                <p className="font-mono bg-slate-50 p-3 rounded border border-border-color text-text-secondary break-all">
                  {config?.seed_corpus_csv}
                </p>
              </div>
            </div>
          </div>

          <div className="p-6 md:p-7 bg-blue-50 rounded-lg border border-blue-200 flex gap-2.5 text-xs leading-relaxed text-blue-800">
            <Info className="shrink-0 text-blue-600" size={16} />
            <span>Các cấu hình tham số hệ thống khác (như hyperparameters, dung lượng corpus...) sẽ được phát triển trong giai đoạn sau.</span>
          </div>
        </div>
      </div>
    </div>
  );
}
