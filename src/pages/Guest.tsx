import React, { useState, useEffect } from 'react';
import { Shield, Sparkles, AlertTriangle, ExternalLink, BookOpen, Layers, Search, Cpu, RotateCcw, FileText, Loader2 } from 'lucide-react';

interface ChunkEvidence {
  score: number;
  chunk_text: string;
  title: string;
  url: string;
  source: string;
}

interface FewshotDemo {
  text: string;
  label: string;
  source: string;
}

interface AnalyzeResponse {
  record_id: number;
  fb_post_id: string | null;
  post_text: string;
  normalized_text: string;
  slm_label: number;
  slm_confidence: number;
  llm_label: number;
  llm_explanation: string | null;
  wiki_evidence: Record<string, string> | null;
  rag_evidence: ChunkEvidence[] | null;
  fewshot_examples: FewshotDemo[] | null;
}

type QuickPredictionDisplay = {
  label: string;
  toneClass: string;
  progressClass: string;
};

function getQuickPredictionDisplay(slmLabel: number, slmConfidence: number): QuickPredictionDisplay {
  const confidencePercent = slmConfidence * 100;
  const isFake = slmLabel === 1;

  if (!isFake) {
    if (confidencePercent >= 90) {
      return { label: 'Tin thật: Đáng tin cậy', toneClass: 'bg-emerald-900 text-white border-emerald-900', progressClass: 'bg-emerald-900' };
    }
    if (confidencePercent >= 75) {
      return { label: 'Tin thật: Khá tin cậy', toneClass: 'bg-emerald-600 text-white border-emerald-600', progressClass: 'bg-emerald-600' };
    }
    if (confidencePercent >= 60) {
      return { label: 'Tin thật: Có cơ sở', toneClass: 'bg-emerald-200 text-emerald-900 border-emerald-300', progressClass: 'bg-emerald-500' };
    }
    return { label: 'Tin thật: Cần xác minh', toneClass: 'bg-amber-300 text-amber-900 border-amber-400', progressClass: 'bg-amber-500' };
  }

  if (confidencePercent >= 90) {
    return { label: 'Tin giả: Không đáng tin', toneClass: 'bg-red-900 text-white border-red-900', progressClass: 'bg-red-900' };
  }
  if (confidencePercent >= 75) {
    return { label: 'Tin giả: Ít tin cậy', toneClass: 'bg-orange-500 text-white border-orange-500', progressClass: 'bg-orange-500' };
  }
  if (confidencePercent >= 60) {
    return { label: 'Tin giả: Có dấu hiệu sai lệch', toneClass: 'bg-orange-200 text-orange-900 border-orange-300', progressClass: 'bg-orange-400' };
  }
  return { label: 'Tin giả: Cần thận trọng', toneClass: 'bg-amber-300 text-amber-900 border-amber-400', progressClass: 'bg-amber-500' };
}

export default function Guest() {
  const [inputText, setInputText] = useState('');
  const [fbPostIdInput, setFbPostIdInput] = useState('');
  const [isLoadingPredict, setIsLoadingPredict] = useState(false);
  const [isLoadingAnalyze, setIsLoadingAnalyze] = useState(false);
  const [loadingStep, setLoadingStep] = useState(0);
  const [hasSearched, setHasSearched] = useState(false);
  
  // Results
  const [prediction, setPrediction] = useState<{
    recordId: number;
    slmLabel: number;
    slmConfidence: number;
    status: string;
  } | null>(null);
  
  const [analysis, setAnalysis] = useState<AnalyzeResponse | null>(null);
  const [errorMsg, setErrorMsg] = useState('');

  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

  // Stepper effect for deep analysis loading
  useEffect(() => {
    let interval: any;
    if (isLoadingAnalyze) {
      setLoadingStep(1);
      interval = setInterval(() => {
        setLoadingStep((prev) => {
          if (prev < 4) return prev + 1;
          return prev;
        });
      }, 4000); // 4 seconds per step to align with ~15-20s RAG execution
    } else {
      setLoadingStep(0);
    }
    return () => clearInterval(interval);
  }, [isLoadingAnalyze]);

  const handlePredict = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim()) return;

    setIsLoadingPredict(true);
    setErrorMsg('');
    setPrediction(null);
    setAnalysis(null);
    setHasSearched(true);

    try {
      const response = await fetch(`${API_URL}/api/predict`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          text: inputText,
          fb_post_id: fbPostIdInput.trim() || null
        }),
      });

      if (!response.ok) {
        throw new Error('Không thể kết nối đến máy chủ hoặc máy chủ gặp lỗi.');
      }

      const data = await response.json();
      setPrediction({
        recordId: data.record_id,
        slmLabel: data.slm_label,
        slmConfidence: data.slm_confidence,
        status: data.status,
      });
    } catch (err: any) {
      setErrorMsg(err.message || 'Lỗi hệ thống khi dự đoán.');
    } finally {
      setIsLoadingPredict(false);
    }
  };

  const handleAnalyze = async () => {
    if (!inputText.trim()) return;

    setIsLoadingAnalyze(true);
    setErrorMsg('');
    setAnalysis(null);
    setPrediction(null);
    setHasSearched(true);

    // Step 1: Call quick prediction first to show early result
    setIsLoadingPredict(true);
    try {
      const responsePredict = await fetch(`${API_URL}/api/predict`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          text: inputText,
          fb_post_id: fbPostIdInput.trim() || null
        }),
      });

      if (responsePredict.ok) {
        const dataPredict = await responsePredict.json();
        setPrediction({
          recordId: dataPredict.record_id,
          slmLabel: dataPredict.slm_label,
          slmConfidence: dataPredict.slm_confidence,
          status: dataPredict.status,
        });
      }
    } catch (errPredict) {
      console.error("Predict error during analysis:", errPredict);
    } finally {
      setIsLoadingPredict(false);
    }

    // Step 2: Call deep analysis API
    try {
      const response = await fetch(`${API_URL}/api/analyze`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          text: inputText,
          fb_post_id: fbPostIdInput.trim() || null
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.detail || 'Lỗi hệ thống khi phân tích chuyên sâu.');
      }
      setAnalysis(data);
      
      // Update/sync prediction status
      setPrediction({
        recordId: data.record_id,
        slmLabel: data.slm_label,
        slmConfidence: data.slm_confidence,
        status: 'completed',
      });
    } catch (err: any) {
      setErrorMsg(err.message || 'Lỗi hệ thống khi phân tích.');
    } finally {
      setIsLoadingAnalyze(false);
    }
  };

  const handleReset = () => {
    setInputText('');
    setFbPostIdInput('');
    setPrediction(null);
    setAnalysis(null);
    setHasSearched(false);
    setErrorMsg('');
  };

  const renderEvaluationConclusion = () => {
    if (!prediction || !analysis) return null;

    const slmIsFake = prediction.slmLabel === 1;
    const llmIsFake = analysis.llm_label === 1;

    if (slmIsFake === llmIsFake) {
      const labelStr = slmIsFake ? 'GIẢ' : 'THẬT';
      const colorClass = slmIsFake ? 'text-red-500' : 'text-emerald-500';
      return (
        <div className={`p-6 rounded-lg border ${slmIsFake ? 'border-red-500/20 bg-red-500/5' : 'border-emerald-500/20 bg-emerald-500/5'}`}>
          <div className="flex items-center gap-2 mb-3">
            <Shield className={slmIsFake ? 'text-red-500' : 'text-emerald-500'} />
            <h4 className="font-bold text-base text-text-primary">KẾT LUẬN ĐỒNG NHẤT</h4>
          </div>
          <p className="text-xs leading-relaxed text-text-secondary">
            Cả hai mô hình độc lập (SLM phân tích phong cách & LLM phân tích chứng cứ) đều nhận định đây là tin{' '}
            <span className={`font-bold ${colorClass}`}>{labelStr}</span>. 
            Mức độ tin cậy của kết quả đối chiếu này rất cao.
          </p>
        </div>
      );
    } else {
      const slmLabelStr = prediction.slmLabel === 1 ? 'Giả' : 'Thật';
      const llmLabelStr = analysis.llm_label === 1 ? 'Giả' : 'Thật';
      return (
        <div className="p-6 rounded-lg border border-amber-500/20 bg-amber-500/5">
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle className="text-amber-500" />
            <h4 className="font-bold text-base text-text-primary">XUNG ĐỘT KẾT QUẢ DỰ ĐOÁN</h4>
          </div>
          <p className="text-xs leading-relaxed text-text-secondary">
            Mẫu văn bản có đặc điểm văn phong của tin <span className="font-bold text-amber-400">{slmLabelStr}</span> (SLM). 
            Tuy nhiên, dữ liệu kiểm chứng thực tế lại xác minh đây là tin <span className="font-bold text-amber-400">{llmLabelStr}</span> (LLM). 
            Hãy cẩn trọng xem xét lập luận và nguồn kiểm chứng bên dưới.
          </p>
        </div>
      );
    }
  };

  return (
    <div className="flex-1 flex flex-col py-6 md:py-8">
      
      {/* 1. IDLE MODE (Before Search/Check) */}
      {!hasSearched && (
        <div className="page-shell max-w-6xl animate-slide-in page-stack">
          {/* Header */}
          <div className="text-center space-y-3 md:space-y-4 pt-3 md:pt-6">
            <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-blue-50 border border-blue-200 text-blue-600 text-xs font-bold">
              <Sparkles size={14} /> Multi-Round Collaborative RAG Framework
            </div>
            <h1 className="text-3xl md:text-5xl font-black tracking-tight bg-gradient-to-r from-blue-600 via-violet-600 to-indigo-600 bg-clip-text text-transparent">
              Fake News Detection System
            </h1>
            <p className="text-text-secondary text-sm md:text-base max-w-xl mx-auto leading-relaxed">
              Hệ thống kiểm chứng tin tức tự động. Kết hợp mô hình cục bộ PhoBERT phân tích ngữ pháp, 
              RAG trích xuất thông tin đối chiếu, và LLM kết luận chuyên sâu.
            </p>
          </div>

          {/* Form Panel */}
          <div className="glass-panel p-6 md:p-8 lg:p-10 section-stack">
            <form onSubmit={handlePredict} className="section-stack">
              <div className="section-stack">
                <div className="flex justify-between items-center text-xs font-bold text-text-secondary">
                  <label>Nội dung tin tức hoặc bài viết cần kiểm tra</label>
                  <span className="text-text-muted">{inputText.length} ký tự</span>
                </div>
                <textarea
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  placeholder="Dán hoặc nhập nội dung bài viết, tin tức mạng xã hội hoặc tin báo chí cần kiểm duyệt..."
                  rows={8}
                  required
                  className="resize-none text-sm bg-white p-5 border border-border-color focus:border-blue-500 rounded-lg"
                />
              </div>

              <div className="flex flex-col sm:flex-row gap-3 md:justify-end md:self-end">
                  <button
                    type="submit"
                    disabled={isLoadingPredict || !inputText.trim()}
                    className="btn btn-secondary py-2.5 px-4 text-xs font-bold flex-1 sm:flex-initial"
                  >
                    <Cpu size={14} /> Dự đoán nhanh SLM
                  </button>
                  <button
                    type="button"
                    onClick={handleAnalyze}
                    disabled={isLoadingAnalyze || !inputText.trim()}
                    className="btn btn-primary py-2.5 px-5 text-xs font-bold flex-1 sm:flex-initial pulse-glow"
                  >
                    <Sparkles size={14} /> Phân tích sâu (RAG+LLM)
                  </button>
              </div>
            </form>
          </div>

          {/* Info Bento Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-5 lg:gap-6">
            <div className="glass-panel p-6 md:p-7 section-stack">
              <div className="w-10 h-10 rounded-lg bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600">
                <Cpu size={20} />
              </div>
              <h3 className="font-bold text-sm">SLM PhoBERT</h3>
              <p className="text-xs text-text-secondary leading-relaxed">
                Phân tích nhanh cách viết để nhận ra dấu hiệu bất thường trong bài viết.
              </p>
            </div>
            
            <div className="glass-panel p-5 md:p-6 section-stack">
              <div className="w-10 h-10 rounded-lg bg-purple-50 border border-purple-100 flex items-center justify-center text-purple-600">
                <Search size={20} />
              </div>
              <h3 className="font-bold text-sm">Wikipedia RAG</h3>
              <p className="text-xs text-text-secondary leading-relaxed">
                Tìm lại thông tin liên quan để làm rõ những khái niệm hoặc nhân vật được nhắc tới.
              </p>
            </div>

            <div className="glass-panel p-5 md:p-6 section-stack">
              <div className="w-10 h-10 rounded-lg bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600">
                <Layers size={20} />
              </div>
              <h3 className="font-bold text-sm">Đối Chiếu Báo Chí</h3>
              <p className="text-xs text-text-secondary leading-relaxed">
                Đối chiếu với các bài báo đáng tin cậy để xem thông tin có khớp nhau không.
              </p>
            </div>

            <div className="glass-panel p-5 md:p-6 section-stack">
              <div className="w-10 h-10 rounded-lg bg-amber-50 border border-amber-100 flex items-center justify-center text-amber-600">
                <Sparkles size={20} />
              </div>
              <h3 className="font-bold text-sm">LLM Qwen</h3>
              <p className="text-xs text-text-secondary leading-relaxed">
                Tổng hợp các bằng chứng và đưa ra kết luận dễ hiểu cho người dùng.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* 2. RESULTS INSPECTION MODE (After Search/Check) */}
      {hasSearched && (
        <div className="page-shell max-w-7xl animate-slide-in page-stack">
          {/* Header Action Menu */}
          <div className="flex flex-col gap-3 md:flex-row md:justify-between md:items-center border-b border-border-color pb-4">
            <div>
              <h2 className="text-2xl md:text-3xl font-extrabold tracking-tight">Kiểm Định Chi Tiết</h2>
              <p className="text-xs text-text-secondary">Chi tiết các giai đoạn phân tích chéo từ hệ thống</p>
            </div>
            <button
              onClick={handleReset}
              className="btn btn-secondary py-2 px-3 text-xs flex items-center gap-1.5 hover:bg-slate-100 self-start md:self-auto"
            >
              <RotateCcw size={12} /> Kiểm tra tin tức mới
            </button>
          </div>

          {errorMsg && (
            <div className="p-4 rounded-lg bg-red-50 border border-red-200 text-red-700 text-xs flex gap-2">
              <AlertTriangle className="shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Main Inspection Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 xl:gap-6 items-start">
            
            {/* Left Side: Claim Input and SLM Fast Predict (5 Columns) */}
            <div className="lg:col-span-5 section-stack">
              
              {/* Claim Display */}
              <div className="glass-panel p-6 section-stack">
                <h3 className="text-xs font-bold text-text-secondary uppercase tracking-wider flex items-center gap-1.5 border-b border-border-color pb-2">
                  <FileText size={14} className="text-blue-600" /> Tuyên bố đang kiểm chứng
                </h3>
                <div className="text-xs text-text-secondary font-mono leading-relaxed bg-slate-50 p-5 md:p-6 rounded-lg border border-border-color max-h-60 overflow-y-auto">
                  {inputText}
                </div>
              </div>

              {/* SLM Quick Prediction Card */}
              {isLoadingPredict ? (
                <div className="glass-panel p-6 md:p-8 text-center section-stack">
                  <Loader2 className="w-8 h-8 text-blue-500 animate-spin mx-auto" />
                  <p className="text-xs text-text-secondary">PhoBERT đang phân tích cấu trúc ngôn ngữ...</p>
                </div>
              ) : prediction ? (
                <div className="glass-panel p-6 md:p-7 section-stack">
                  <h3 className="text-xs font-bold text-text-secondary uppercase tracking-wider flex items-center gap-1.5 border-b border-border-color pb-2">
                    <Cpu size={14} className="text-blue-600" /> Kết quả dự đoán nhanh (SLM)
                  </h3>

                  {(() => {
                    const display = getQuickPredictionDisplay(prediction.slmLabel, prediction.slmConfidence);
                    return (
                      <div className="flex items-center justify-between gap-3 flex-wrap">
                        <span className="text-xs text-text-secondary">Nhận định nhanh:</span>
                        <span className={`badge text-[11px] px-2.5 py-0.5 ${display.toneClass}`}>
                          {display.label}
                        </span>
                      </div>
                    );
                  })()}

                  <div className="space-y-1.5">
                    <div className="flex justify-between text-[10px] text-text-secondary">
                      <span>Độ tự tin của mô hình:</span>
                      <span className="font-bold">{(prediction.slmConfidence * 100).toFixed(1)}%</span>
                    </div>
                    <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden border border-border-color">
                      {(() => {
                        const display = getQuickPredictionDisplay(prediction.slmLabel, prediction.slmConfidence);
                        return (
                          <div
                            className={`h-full rounded-full ${display.progressClass}`}
                            style={{ width: `${prediction.slmConfidence * 100}%` }}
                          />
                        );
                      })()}
                    </div>
                  </div>
                  <p className="text-[10px] text-text-muted leading-relaxed">
                    Mô hình SLM PhoBERT thực hiện đối chiếu đặc trưng cấu trúc cú pháp Việt ngữ, 
                    phong cách giật tít, phóng đại để phân loại mà không sử dụng thông tin kiểm chứng bên ngoài.
                  </p>
                </div>
              ) : null}

              <div className="p-5 md:p-6 bg-slate-100/80 rounded-lg border border-border-color flex gap-2.5 text-[11px] leading-relaxed text-text-secondary">
                <AlertTriangle className="text-amber-600 shrink-0" size={16} />
                <span>kết quả chỉ để tham khảo cần tự đối chiếu kiểm tra thêm</span>
              </div>
            </div>

            {/* Right Side: RAG + LLM Fact checking (7 Columns) */}
            <div className="lg:col-span-7 section-stack">
              
              {/* Case 1: Deep Analysis NOT run yet */}
              {!analysis && !isLoadingAnalyze && !errorMsg && (
                <div className="glass-panel p-6 md:p-8 text-center section-stack animate-slide-in">
                  <Sparkles size={44} className="mx-auto text-violet-600 animate-pulse" />
                  <div className="space-y-2.5">
                    <h3 className="text-base font-bold">Chưa chạy Phân tích Chuyên sâu (RAG + LLM)</h3>
                    <p className="text-xs text-text-secondary max-w-md mx-auto leading-relaxed">
                      Để kiểm chứng chéo thông tin xem tin tức này có chính xác về mặt sự kiện hay không, 
                      hệ thống cần kích hoạt RAG tìm kiếm Wikipedia tiếng Việt và báo chí trực tuyến.
                    </p>
                  </div>
                  <button
                    onClick={handleAnalyze}
                    className="btn btn-primary px-6 py-2.5 text-xs font-bold flex items-center gap-2 mx-auto pulse-glow"
                  >
                    <Sparkles size={14} /> Chạy phân tích chuyên sâu chéo
                  </button>
                </div>
              )}

              {/* Case 4: Deep Analysis Failed */}
              {!analysis && !isLoadingAnalyze && errorMsg && (
                <div className="glass-panel p-6 md:p-8 text-center bg-red-50/20 border-red-100 section-stack animate-slide-in">
                  <AlertTriangle size={44} className="mx-auto text-red-600 animate-bounce" />
                  <div className="space-y-2.5">
                    <h3 className="text-base font-bold text-red-800">Không thể hoàn thành phân tích chuyên sâu</h3>
                    <p className="text-xs text-text-secondary max-w-md mx-auto leading-relaxed bg-white/80 p-3 rounded border border-red-100 font-mono">
                      {errorMsg}
                    </p>
                    <p className="text-[10px] text-text-muted">
                      Lỗi này có thể xảy ra do sự cố tạm thời của mô hình ngôn ngữ lớn (LLM) hoặc chính sách giới hạn API. Bạn có thể nhấn nút dưới đây để thực hiện lại phân tích.
                    </p>
                  </div>
                  <button
                    onClick={handleAnalyze}
                    className="btn btn-primary bg-red-600 hover:bg-red-700 border-red-600 text-white px-6 py-2.5 text-xs font-bold flex items-center gap-2 mx-auto"
                  >
                    <RotateCcw size={14} /> Thử lại phân tích
                  </button>
                </div>
              )}

              {/* Case 2: Deep Analysis IS LOADING (Dynamic Stepper) */}
              {isLoadingAnalyze && (
                <div className="glass-panel p-6 md:p-7 section-stack animate-slide-in">
                  <div className="flex items-center gap-3 border-b border-border-color pb-3">
                    <Loader2 className="w-5 h-5 text-violet-600 animate-spin" />
                    <div>
                      <h3 className="font-bold text-sm">Hệ thống RAG đang xử lý...</h3>
                      <p className="text-[10px] text-text-secondary">Đang tìm thông tin liên quan và tổng hợp kết quả cho bạn</p>
                    </div>
                  </div>

                  {/* Stepper list */}
                  <div className="section-stack pt-1 md:pt-2">
                    {[
                      { step: 1, label: 'Đọc nội dung và xác định điểm chính' },
                      { step: 2, label: 'Tìm thông tin liên quan để đối chiếu' },
                      { step: 3, label: 'So sánh với nguồn tham khảo đáng tin cậy' },
                      { step: 4, label: 'Tổng hợp kết quả và đưa ra nhận định' }
                    ].map((s) => {
                      const isActive = loadingStep === s.step;
                      const isCompleted = loadingStep > s.step;
                      return (
                        <div key={s.step} className={`flex items-start gap-3 transition-opacity duration-300 ${isCompleted || isActive ? 'opacity-100' : 'opacity-30'}`}>
                          <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold mt-0.5 border ${
                            isCompleted ? 'bg-emerald-50 border-emerald-500 text-emerald-600' :
                            isActive ? 'bg-blue-50 border-blue-500 text-blue-600 animate-pulse' :
                            'bg-slate-100 border-border-color text-text-muted'
                          }`}>
                            {isCompleted ? '✓' : s.step}
                          </div>
                          <span className={`text-xs ${isActive ? 'text-blue-700 font-semibold' : 'text-text-secondary'}`}>{s.label}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Case 3: Deep Analysis Completed */}
              {analysis && (
                <div className="glass-panel p-6 md:p-7 section-stack animate-slide-in">
                  <h3 className="text-xs font-bold text-text-secondary uppercase tracking-wider flex items-center gap-1.5 border-b border-border-color pb-2">
                    <Sparkles size={14} className="text-violet-600" /> Kết quả phân tích chuyên sâu (LLM Qwen)
                  </h3>

                  <div className="flex items-center justify-between">
                    <span className="text-xs text-text-secondary">Kết luận của LLM RAG:</span>
                    <span className={`badge ${analysis.llm_label === 1 ? 'badge-fake' : 'badge-real'} text-[11px] px-2.5 py-0.5`}>
                      {analysis.llm_label === 1 ? 'GIẢ' : 'THẬT'}
                    </span>
                  </div>

                  {/* Unified conclusion match/conflict */}
                  {renderEvaluationConclusion()}

                  {analysis.llm_explanation && (
                    <div className="section-stack">
                      <span className="text-xs font-bold text-text-secondary">Lập luận phân tích của LLM:</span>
                      <p className="text-xs text-text-secondary bg-slate-50 p-5 rounded-lg border border-border-color leading-relaxed">
                        {analysis.llm_explanation}
                      </p>
                    </div>
                  )}

                  {/* Wikipedia definitions */}
                  {analysis.wiki_evidence && Object.keys(analysis.wiki_evidence).length > 0 && (
                    <div className="section-stack">
                      <span className="text-xs font-bold text-text-secondary flex items-center gap-1">
                        <BookOpen size={12} className="text-blue-600" /> Định nghĩa thực thể từ Wikipedia
                      </span>
                      <div className="grid grid-cols-1 gap-2.5 max-h-48 overflow-y-auto pr-1">
                        {Object.entries(analysis.wiki_evidence).map(([entity, def]) => (
                          <div key={entity} className="text-xs bg-slate-50 p-5 rounded-lg border border-border-color">
                            <span className="font-bold text-blue-600 block mb-1">{entity}:</span> 
                            <p className="text-text-secondary leading-relaxed text-[11px] whitespace-pre-wrap break-words">{def}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* RAG Chunks */}
                  {analysis.rag_evidence && analysis.rag_evidence.length > 0 && (
                    <div className="section-stack">
                      <span className="text-xs font-bold text-text-secondary flex items-center gap-1">
                        <Layers size={12} className="text-purple-600" /> Các tài liệu và bài báo kiểm chứng tìm được
                      </span>
                      <div className="grid grid-cols-1 gap-2.5 max-h-96 overflow-y-auto pr-1">
                        {analysis.rag_evidence.map((item, idx) => (
                          <div key={idx} className="text-xs bg-slate-50 p-5 rounded-lg border border-border-color space-y-2">
                            <div className="font-bold text-text-primary text-[11px] whitespace-pre-wrap break-words">{item.title}</div>
                            <p className="text-text-secondary leading-relaxed text-[11px] italic whitespace-pre-wrap break-words">"{item.chunk_text}"</p>
                            <div className="flex justify-between items-center pt-1 text-[10px] text-text-muted">
                              <span>Độ tương quan: {(item.score * 100).toFixed(0)}%</span>
                              {item.url && item.url.startsWith('http') && (
                                <a href={item.url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline flex items-center gap-0.5">
                                  Xem nguồn <ExternalLink size={10} />
                                </a>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
