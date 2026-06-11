import React, { useState, useEffect, useRef } from 'react';
import { Shield, Sparkles, AlertTriangle, ExternalLink, BookOpen, Layers, Search, Cpu, RotateCcw, FileText, Loader2, X, ChevronLeft, ChevronRight } from 'lucide-react';

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
  xgboost_label: number | null;
  xgboost_confidence: number | null;
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
      return { label: 'Tin chính xác: Đáng tin cậy', toneClass: 'bg-emerald-900 text-white border-emerald-900', progressClass: 'bg-emerald-900' };
    }
    if (confidencePercent >= 75) {
      return { label: 'Tin chính xác: Khá tin cậy', toneClass: 'bg-emerald-600 text-white border-emerald-600', progressClass: 'bg-emerald-600' };
    }
    if (confidencePercent >= 60) {
      return { label: 'Tin chính xác: Có cơ sở', toneClass: 'bg-emerald-200 text-emerald-900 border-emerald-300', progressClass: 'bg-emerald-500' };
    }
    return { label: 'Tin chính xác: Cần xác minh thêm', toneClass: 'bg-amber-300 text-amber-900 border-amber-400', progressClass: 'bg-amber-500' };
  }

  if (confidencePercent >= 90) {
    return { label: 'Tin sai lệch: Rất đáng ngờ', toneClass: 'bg-red-900 text-white border-red-900', progressClass: 'bg-red-900' };
  }
  if (confidencePercent >= 75) {
    return { label: 'Tin sai lệch: Thiếu tin cậy', toneClass: 'bg-orange-500 text-white border-orange-500', progressClass: 'bg-orange-500' };
  }
  if (confidencePercent >= 60) {
    return { label: 'Tin sai lệch: Có dấu hiệu sai sự thật', toneClass: 'bg-orange-200 text-orange-900 border-orange-300', progressClass: 'bg-orange-400' };
  }
  return { label: 'Tin sai lệch: Cần hết sức thận trọng', toneClass: 'bg-amber-300 text-amber-900 border-amber-400', progressClass: 'bg-amber-500' };
}

export default function Guest() {
  const [inputText, setInputText] = useState('');
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
    xgboostLabel?: number | null;
    xgboostConfidence?: number | null;
  } | null>(null);
  
  const [analysis, setAnalysis] = useState<AnalyzeResponse | null>(null);
  const [errorMsg, setErrorMsg] = useState('');

  const wikiCarouselRef = useRef<HTMLDivElement>(null);
  const [activeWikiIndex, setActiveWikiIndex] = useState(0);

  // Set default middle card active on load
  useEffect(() => {
    if (analysis?.wiki_evidence) {
      const len = Object.keys(analysis.wiki_evidence).length;
      setActiveWikiIndex(len >= 3 ? 1 : 0);
    }
  }, [analysis]);

  const scrollToCard = (index: number) => {
    if (wikiCarouselRef.current) {
      const cardWidth = 240;
      const gap = 16;
      const carouselWidth = wikiCarouselRef.current.clientWidth;
      const cardLeft = index * (cardWidth + gap);
      const targetScrollLeft = cardLeft - (carouselWidth / 2) + (cardWidth / 2);
      wikiCarouselRef.current.scrollTo({
        left: targetScrollLeft,
        behavior: 'smooth'
      });
      setActiveWikiIndex(index);
    }
  };

  const scrollWikiCarousel = (direction: 'left' | 'right') => {
    if (analysis?.wiki_evidence) {
      const keys = Object.keys(analysis.wiki_evidence);
      const maxIdx = keys.length - 1;
      let targetIndex = activeWikiIndex;
      if (direction === 'left') {
        targetIndex = Math.max(0, activeWikiIndex - 1);
      } else {
        targetIndex = Math.min(maxIdx, activeWikiIndex + 1);
      }
      scrollToCard(targetIndex);
    }
  };

  const handleCarouselScroll = () => {
    if (wikiCarouselRef.current && analysis?.wiki_evidence) {
      const scrollLeft = wikiCarouselRef.current.scrollLeft;
      const carouselWidth = wikiCarouselRef.current.clientWidth;
      const cardWidth = 240;
      const gap = 16;
      const scrollCenter = scrollLeft + (carouselWidth / 2);
      const index = Math.round((scrollCenter - (cardWidth / 2)) / (cardWidth + gap));
      const maxIdx = Object.keys(analysis.wiki_evidence).length - 1;
      const boundedIndex = Math.max(0, Math.min(maxIdx, index));
      if (boundedIndex !== activeWikiIndex) {
        setActiveWikiIndex(boundedIndex);
      }
    }
  };

  // Modal states for "Xem thêm" details
  const [modalOpen, setModalOpen] = useState(false);
  const [modalTitle, setModalTitle] = useState('');
  const [modalContent, setModalContent] = useState('');

  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

  // Stepper effect for deep analysis loading
  useEffect(() => {
    let interval: any;
    if (isLoadingAnalyze) {
      setLoadingStep(1);
      interval = setInterval(() => {
        setLoadingStep((prev: number) => {
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
          fb_post_id: null
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
        xgboostLabel: data.xgboost_label,
        xgboostConfidence: data.xgboost_confidence,
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
    setHasSearched(true);

    let currentPrediction = prediction;

    // Call quick prediction if we don't have it yet
    if (!currentPrediction) {
      setIsLoadingPredict(true);
      try {
        const responsePredict = await fetch(`${API_URL}/api/predict`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            text: inputText,
            fb_post_id: null
          }),
        });

        if (responsePredict.ok) {
          const dataPredict = await responsePredict.json();
          currentPrediction = {
            recordId: dataPredict.record_id,
            slmLabel: dataPredict.slm_label,
            slmConfidence: dataPredict.slm_confidence,
            status: dataPredict.status,
            xgboostLabel: dataPredict.xgboost_label,
            xgboostConfidence: dataPredict.xgboost_confidence,
          };
          setPrediction(currentPrediction);
        }
      } catch (errPredict) {
        console.error("Predict error during analysis:", errPredict);
      } finally {
        setIsLoadingPredict(false);
      }
    }

    // Step 2: Call deep analysis API
    try {
      const response = await fetch(`${API_URL}/api/analyze`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          text: inputText,
          fb_post_id: null,
          record_id: currentPrediction ? currentPrediction.recordId : null
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
        xgboostLabel: data.xgboost_label,
        xgboostConfidence: data.xgboost_confidence,
      });
    } catch (err: any) {
      setErrorMsg(err.message || 'Lỗi hệ thống khi phân tích.');
    } finally {
      setIsLoadingAnalyze(false);
    }
  };

  const handleReset = () => {
    setInputText('');
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
      const labelStr = slmIsFake ? 'SAI SỰ THẬT' : 'CHÍNH XÁC';
      const colorClass = slmIsFake ? 'text-rose-600' : 'text-emerald-600';
      return (
        <div className={`p-4 rounded-xl border ${slmIsFake ? 'border-rose-200 bg-rose-50/30' : 'border-emerald-200 bg-emerald-50/30'}`}>
          <div className="flex items-center gap-2 mb-2">
            <Shield className={slmIsFake ? 'text-rose-600' : 'text-emerald-600'} size={18} />
            <h4 className="font-bold text-xs uppercase tracking-wider text-text-primary">KẾT QUẢ TRÙNG KHỚP</h4>
          </div>
          <p className="text-[11px] leading-relaxed text-text-secondary">
            Cả hai phương pháp phân tích (kiểm tra giọng điệu bài viết & đối chiếu thông tin thực tế) đều nhận định đây là tin{' '}
            <span className={`font-bold ${colorClass}`}>{labelStr}</span>. 
            Kết quả xác minh có độ chính xác rất cao.
          </p>
        </div>
      );
    } else {
      const slmLabelStr = prediction.slmLabel === 1 ? 'sai lệch' : 'chính xác';
      const llmLabelStr = analysis.llm_label === 1 ? 'sai lệch' : 'chính xác';
      return (
        <div className="p-4 rounded-xl border border-amber-200 bg-amber-50/30">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle className="text-amber-600" size={18} />
            <h4 className="font-bold text-xs uppercase tracking-wider text-text-primary">KẾT QUẢ CHƯA ĐỒNG NHẤT</h4>
          </div>
          <p className="text-[11px] leading-relaxed text-text-secondary">
            Giọng điệu bài viết có dấu hiệu của tin <span className="font-bold text-amber-700">{slmLabelStr}</span>. 
            Tuy nhiên, khi đối chiếu với các nguồn tin thực tế, AI lại nhận định đây là tin <span className="font-bold text-amber-700">{llmLabelStr}</span>. 
            Bạn nên tham khảo kỹ các giải thích và bằng chứng báo chí bên dưới.
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
              <Sparkles size={14} /> Hệ thống kiểm chứng thông tin đa chiều
            </div>
            <h1 className="text-3xl md:text-5xl p-3 font-black tracking-tight bg-gradient-to-r from-blue-600 via-violet-600 to-indigo-600 bg-clip-text text-transparent">
              Fake News Detection System
            </h1>
            <p className="text-text-secondary text-sm md:text-base max-w-xl mx-auto leading-relaxed">
              Công cụ nhận diện tin giả và tin sai sự thật tự động. Kết hợp giữa AI phân tích giọng điệu bài viết, 
              tự động tra cứu đối chiếu nguồn tin tức Internet và tổng hợp đưa ra kết luận rõ ràng.
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
                    className="btn btn-primary py-2.5 px-6 text-xs font-bold flex-1 sm:flex-initial pulse-glow"
                  >
                    <Search size={14} /> Kiểm tra
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
              <h3 className="font-bold text-sm">Phân tích cách viết</h3>
              <p className="text-xs text-text-secondary leading-relaxed">
                Nhận diện dấu hiệu bất thường trong câu cú, giọng điệu giật gân hoặc phóng đại.
              </p>
            </div>
            
            <div className="glass-panel p-5 md:p-6 section-stack">
              <div className="w-10 h-10 rounded-lg bg-purple-50 border border-purple-100 flex items-center justify-center text-purple-600">
                <Search size={20} />
              </div>
              <h3 className="font-bold text-sm">Tra cứu kiến thức</h3>
              <p className="text-xs text-text-secondary leading-relaxed">
                Tự động tìm kiếm thông tin về các nhân vật, sự kiện hoặc khái niệm được nhắc đến.
              </p>
            </div>

            <div className="glass-panel p-5 md:p-6 section-stack">
              <div className="w-10 h-10 rounded-lg bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600">
                <Layers size={20} />
              </div>
              <h3 className="font-bold text-sm">Đối chiếu tin tức</h3>
              <p className="text-xs text-text-secondary leading-relaxed">
                So sánh chéo nội dung với các trang tin tức và báo chí chính thống uy tín.
              </p>
            </div>

            <div className="glass-panel p-5 md:p-6 section-stack">
              <div className="w-10 h-10 rounded-lg bg-amber-50 border border-amber-100 flex items-center justify-center text-amber-600">
                <Sparkles size={20} />
              </div>
              <h3 className="font-bold text-sm">Trợ lý AI tổng hợp</h3>
              <p className="text-xs text-text-secondary leading-relaxed">
                Tổng hợp tất cả các bằng chứng tìm được để đưa ra kết luận rõ ràng, dễ hiểu nhất.
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
              <h2 className="text-2xl md:text-3xl font-extrabold tracking-tight">Kết quả xác minh</h2>
              <p className="text-xs text-text-secondary">Chi tiết các nguồn đối chiếu và phân tích từ hệ thống</p>
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
            
            {/* Left Side: Claim Input and SLM Fast Predict (33% Columns) */}
            <div className="lg:col-span-4 lg:sticky lg:top-20 self-start flex flex-col gap-6">
              
              {/* Claim Display */}
              <div className="glass-panel p-6 section-stack">
                <h3 className="text-xs font-bold text-text-secondary uppercase tracking-wider flex items-center gap-1.5 border-b border-border-color pb-2">
                  <FileText size={14} className="text-blue-600" /> Nội dung cần xác minh
                </h3>
                <div className="text-xs text-text-secondary font-mono leading-relaxed bg-slate-50 p-5 md:p-6 rounded-lg border border-border-color max-h-60 overflow-y-auto">
                  {inputText}
                </div>
              </div>

              {/* SLM Quick Prediction Card */}
              {isLoadingPredict ? (
                <div className="glass-panel p-6 md:p-8 text-center section-stack">
                  <Loader2 className="w-8 h-8 text-blue-500 animate-spin mx-auto" />
                  <p className="text-xs text-text-secondary">AI đang phân tích cấu trúc ngôn ngữ...</p>
                </div>
              ) : prediction ? (
                <div className="glass-panel p-6 md:p-7 section-stack">
                  <h3 className="text-xs font-bold text-text-secondary uppercase tracking-wider flex items-center gap-1.5 border-b border-border-color pb-2">
                    <Cpu size={14} className="text-blue-600" /> Kết quả phân tích văn phong
                  </h3>

                  {(() => {
                    const display = getQuickPredictionDisplay(prediction.slmLabel, prediction.slmConfidence);
                    return (
                      <div className="flex items-center justify-between gap-3 flex-wrap">
                        <span className="text-xs text-text-secondary">Đánh giá nhanh:</span>
                        <span className={`badge text-[11px] px-2.5 py-0.5 ${display.toneClass}`}>
                          {display.label}
                        </span>
                      </div>
                    );
                  })()}

                  <div className="space-y-1.5">
                    <div className="flex justify-between text-[10px] text-text-secondary">
                      <span>Độ tin cậy của AI:</span>
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
                    AI phân tích cách dùng từ, cấu trúc câu và giọng điệu để phát hiện dấu hiệu giật gân, nói quá phổ biến của tin giả mà không cần tra cứu Internet.
                  </p>

                  {prediction.xgboostLabel !== undefined && prediction.xgboostLabel !== null && (
                    <div className="border-t border-slate-100 pt-4 mt-4 space-y-3">
                      <div className="flex items-center gap-1.5">
                        <Layers size={13} className="text-violet-600" />
                        <span className="text-[10px] font-bold text-text-secondary uppercase tracking-wider">Dự đoán phụ (XGBoost + TF-IDF)</span>
                      </div>
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-text-secondary text-[11px]">Đánh giá:</span>
                        <span className={`badge text-[10px] px-2.5 py-0.5 font-bold ${
                          prediction.xgboostLabel === 1
                            ? 'bg-rose-100 text-rose-800 border-rose-200'
                            : 'bg-emerald-100 text-emerald-800 border-emerald-200'
                        }`}>
                          {prediction.xgboostLabel === 1 ? 'Tin sai lệch' : 'Tin chính xác'}
                        </span>
                      </div>
                      <div className="space-y-1">
                        <div className="flex justify-between text-[10px] text-text-secondary">
                          <span>Độ tự tin:</span>
                          <span className="font-bold">
                            {prediction.xgboostConfidence ? (prediction.xgboostConfidence * 100).toFixed(1) : 0}%
                          </span>
                        </div>
                        <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden border border-border-color">
                          <div
                            className={`h-full rounded-full ${prediction.xgboostLabel === 1 ? 'bg-rose-500' : 'bg-emerald-500'}`}
                            style={{ width: `${(prediction.xgboostConfidence || 0) * 100}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ) : null}

              <div className="p-5 md:p-6 bg-slate-100/80 rounded-lg border border-border-color flex gap-2.5 text-[11px] leading-relaxed text-text-secondary">
                <AlertTriangle className="text-amber-600 shrink-0" size={16} />
                <span>Kết quả phân tích từ AI chỉ mang tính chất tham khảo, bạn vui lòng tự đối chiếu và kiểm tra thêm.</span>
              </div>
            </div>

            {/* Right Side: RAG + LLM Fact checking (67% Columns) */}
            <div className="lg:col-span-8 flex flex-col gap-6">
              
              {/* Case 1: Deep Analysis NOT run yet */}
              {!analysis && !isLoadingAnalyze && !errorMsg && (
                <div className="glass-panel p-6 md:p-8 text-center section-stack animate-slide-in">
                  <Sparkles size={44} className="mx-auto text-violet-600 animate-pulse" />
                  <div className="space-y-2.5">
                    <h3 className="text-base font-bold">Chưa đối chiếu thông tin thực tế</h3>
                    <p className="text-xs text-text-secondary max-w-md mx-auto leading-relaxed">
                      Để xác minh xem nội dung bài viết có đúng sự thật hay không, 
                      hệ thống cần đối chiếu thông tin trên Wikipedia và các nguồn tin báo chí trực tuyến.
                    </p>
                  </div>
                  <button
                    onClick={handleAnalyze}
                    className="btn btn-primary px-6 py-2.5 text-xs font-bold flex items-center gap-2 mx-auto pulse-glow"
                  >
                    <Sparkles size={14} /> Tìm kiếm & đối chiếu thực tế
                  </button>
                </div>
              )}

              {/* Case 4: Deep Analysis Failed */}
              {!analysis && !isLoadingAnalyze && errorMsg && (
                <div className="glass-panel p-6 md:p-8 text-center bg-red-50/20 border-red-100 section-stack animate-slide-in">
                  <AlertTriangle size={44} className="mx-auto text-red-600 animate-bounce" />
                  <div className="space-y-2.5">
                    <h3 className="text-base font-bold text-red-800">Không thể đối chiếu thông tin</h3>
                    <p className="text-xs text-text-secondary max-w-md mx-auto leading-relaxed bg-white/80 p-3 rounded border border-red-100 font-mono">
                      {errorMsg}
                    </p>
                    <p className="text-[10px] text-text-muted">
                      Đã xảy ra lỗi kết nối với máy chủ AI. Vui lòng nhấn nút bên dưới để thử lại.
                    </p>
                  </div>
                  <button
                    onClick={handleAnalyze}
                    className="btn btn-primary bg-red-600 hover:bg-red-700 border-red-600 text-white px-6 py-2.5 text-xs font-bold flex items-center gap-2 mx-auto"
                  >
                    <RotateCcw size={14} /> Thử lại đối chiếu
                  </button>
                </div>
              )}

              {/* Case 2: Deep Analysis IS LOADING (Dynamic Stepper) */}
              {isLoadingAnalyze && (
                <div className="glass-panel p-6 md:p-7 section-stack animate-slide-in">
                  <div className="flex items-center gap-3 border-b border-border-color pb-3">
                    <Loader2 className="w-5 h-5 text-violet-600 animate-spin" />
                    <div>
                      <h3 className="font-bold text-sm">Hệ thống đang tìm kiếm & đối chiếu...</h3>
                      <p className="text-[10px] text-text-secondary">Đang tra cứu từ Wikipedia và báo chí trực tuyến để xác minh bài viết</p>
                    </div>
                  </div>

                  {/* Stepper list */}
                  <div className="section-stack pt-1 md:pt-2">
                    {[
                      { step: 1, label: 'Đọc nội dung bài viết và phân tích từ khóa chính' },
                      { step: 2, label: 'Tìm kiếm các thông tin và bài viết liên quan trên Internet' },
                      { step: 3, label: 'So sánh nội dung với các nguồn tin chính thống uy tín' },
                      { step: 4, label: 'Tổng hợp bằng chứng để đưa ra kết luận' }
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
                <div className="flex flex-col gap-6">
                  {/* Block 1: LLM RAG Block */}
                  <div className="llm-rag-block animate-stagger-1 flex flex-col gap-5">
                    <h3 className="text-xs font-bold text-text-secondary uppercase tracking-wider flex items-center gap-1.5 border-b border-border-color pb-2">
                      <Sparkles size={14} className="text-violet-600" /> Kết quả đối chiếu thông tin
                    </h3>

                    {/* Status banner */}
                    {analysis.llm_label === 0 ? (
                      <div className="flex items-center gap-3 p-4 rounded-xl border border-emerald-200 bg-emerald-50/50 text-emerald-950 transition-all duration-300">
                        <div className="pulse-animate w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600 shrink-0">
                          <Shield size={18} className="pulse-animate" />
                        </div>
                        <div>
                          <div className="text-xs font-black">AI NHẬN ĐỊNH: TIN CHÍNH XÁC</div>
                          <div className="text-[10px] text-emerald-800">Nội dung bài viết khớp với các tài liệu thực tế và tin tức chính thống.</div>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center gap-3 p-4 rounded-xl border border-rose-200 bg-rose-50/50 text-rose-950 transition-all duration-300">
                        <div className="pulse-animate w-8 h-8 rounded-full bg-rose-100 flex items-center justify-center text-rose-600 shrink-0">
                          <AlertTriangle size={18} className="pulse-animate" />
                        </div>
                        <div>
                          <div className="text-xs font-black">AI NHẬN ĐỊNH: TIN SAI LỆCH</div>
                          <div className="text-[10px] text-rose-800">Thông tin bài viết có dấu hiệu sai sự thật hoặc không tìm thấy nguồn kiểm chứng uy tín.</div>
                        </div>
                      </div>
                    )}

                    {/* Unified conclusion match/conflict */}
                    {renderEvaluationConclusion()}

                    {analysis.llm_explanation && (
                      <div className="flex flex-col gap-2">
                        <span className="text-xs font-bold text-text-secondary">Giải thích từ trợ lý AI:</span>
                        <p className="text-xs text-text-secondary bg-slate-50 p-4 rounded-lg border border-border-color leading-relaxed">
                          {analysis.llm_explanation}
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Block 2: Wikipedia definitions */}
                  {analysis.wiki_evidence && Object.keys(analysis.wiki_evidence).length > 0 && (
                    <div className="glass-panel p-6 animate-stagger-2 flex flex-col gap-4">
                      <div className="flex justify-between items-center border-b border-border-color pb-2">
                        <h3 className="text-xs font-bold text-text-secondary uppercase tracking-wider flex items-center gap-1.5">
                          <BookOpen size={14} className="text-blue-600" /> Thông tin liên quan trên Wikipedia
                        </h3>
                        {Object.keys(analysis.wiki_evidence).length > 1 && (
                          <div className="flex gap-1.5">
                            <button 
                              onClick={() => scrollWikiCarousel('left')}
                              disabled={activeWikiIndex === 0}
                              className={`p-1 rounded-md border border-border-color text-text-secondary transition-colors cursor-pointer ${
                                activeWikiIndex === 0 ? 'opacity-30 cursor-not-allowed' : 'hover:bg-slate-100'
                              }`}
                              title="Trước"
                            >
                              <ChevronLeft size={14} />
                            </button>
                            <button 
                              onClick={() => scrollWikiCarousel('right')}
                              disabled={activeWikiIndex === Object.keys(analysis.wiki_evidence).length - 1}
                              className={`p-1 rounded-md border border-border-color text-text-secondary transition-colors cursor-pointer ${
                                activeWikiIndex === Object.keys(analysis.wiki_evidence).length - 1 ? 'opacity-30 cursor-not-allowed' : 'hover:bg-slate-100'
                              }`}
                              title="Sau"
                            >
                              <ChevronRight size={14} />
                            </button>
                          </div>
                        )}
                      </div>
                      
                      <div 
                        ref={wikiCarouselRef} 
                        onScroll={handleCarouselScroll}
                        className="wikipedia-carousel hide-scrollbar"
                      >
                        {(Object.entries(analysis.wiki_evidence) as [string, string][]).map(([entity, def], index) => {
                          const isActive = index === activeWikiIndex;
                          return (
                            <div key={entity} className={`wikipedia-carousel-card ${isActive ? 'is-active' : ''}`}>
                              <div className="flex flex-col gap-1.5 h-full overflow-hidden">
                                <div className="flex justify-between items-center w-full">
                                  <span className="font-bold text-blue-600 text-xs truncate max-w-[75%]" title={entity}>
                                    {entity}
                                  </span>
                                  <span className="text-[10px] font-extrabold text-blue-500 bg-blue-50 border border-blue-100 px-2 py-0.5 rounded-full shrink-0">
                                    #{index + 1}
                                  </span>
                                </div>
                                <div className="relative flex-1 mt-1">
                                  <p className="card-fade-out-text">{def}</p>
                                  <div className="absolute bottom-0 left-0 right-0 h-10 bg-gradient-to-t from-white to-transparent pointer-events-none" />
                                </div>
                              </div>
                              <button 
                                onClick={() => {
                                  setModalTitle(entity);
                                  setModalContent(def);
                                  setModalOpen(true);
                                }}
                                className="mt-2 text-[10px] font-bold text-blue-600 bg-blue-50 hover:bg-blue-600 hover:text-white py-1.5 px-3 rounded-lg text-center transition-all duration-200 border border-blue-100 hover:border-blue-600"
                              >
                                Xem thêm
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Block 3: RAG Chunks */}
                  {analysis.rag_evidence && analysis.rag_evidence.length > 0 && (
                    <div className="glass-panel p-6 animate-stagger-3 flex flex-col gap-4">
                      <h3 className="text-xs font-bold text-text-secondary uppercase tracking-wider flex items-center gap-1.5 border-b border-border-color pb-2">
                        <Layers size={14} className="text-purple-600" /> Nguồn tin đối chiếu
                      </h3>
                      
                      <div className="rag-scroll-container">
                        <div className="flex flex-col gap-4 pr-1">
                          {analysis.rag_evidence.map((item: ChunkEvidence, idx: number) => (
                            <div key={idx} className="rag-article-card flex flex-col gap-3">
                              <div className="flex justify-between items-start gap-3">
                                <span 
                                  onClick={() => {
                                    setModalTitle(item.title);
                                    setModalContent(item.chunk_text);
                                    setModalOpen(true);
                                  }}
                                  className="navy-deep-link text-xs leading-snug"
                                >
                                  {item.title}
                                </span>
                                {item.url && item.url.startsWith('http') && (
                                  <a 
                                    href={item.url} 
                                    target="_blank" 
                                    rel="noopener noreferrer" 
                                    className="text-text-muted hover:text-blue-600 transition-colors shrink-0 p-1 rounded-md hover:bg-blue-50 border border-transparent hover:border-blue-100"
                                    title="Xem nguồn báo chí"
                                  >
                                    <ExternalLink size={12} />
                                  </a>
                                )}
                              </div>
                              
                              <div className="highlight-dashed-yellow text-[11px] leading-relaxed text-text-secondary italic">
                                "{item.chunk_text}"
                              </div>
                              
                              <div className="flex justify-between items-center text-[10px] text-text-muted border-t border-slate-100 pt-2">
                                <span>Độ tương đồng: <strong className="text-slate-700">{(item.score * 100).toFixed(0)}%</strong></span>
                                <span className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded text-[9px] font-bold uppercase">{item.source || 'Internet'}</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modal Popup for Detailed Full Text */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm modal-backdrop-animate">
          <div className="bg-white rounded-2xl border border-border-color shadow-2xl max-w-2xl w-full p-6 md:p-8 flex flex-col gap-4 max-h-[85vh] overflow-y-auto modal-content-animate">
            <div className="flex justify-between items-start border-b border-border-color pb-3">
              <h3 className="font-extrabold text-base text-text-primary pr-4">{modalTitle}</h3>
              <button 
                onClick={() => setModalOpen(false)}
                className="text-text-muted hover:text-text-primary p-1.5 rounded-lg border border-border-color hover:bg-slate-100 transition-colors shrink-0"
              >
                <X size={16} />
              </button>
            </div>
            <div className="text-xs text-text-secondary leading-relaxed whitespace-pre-wrap break-words max-h-[50vh] overflow-y-auto pr-1">
              {modalContent}
            </div>
            <div className="flex justify-end pt-3 border-t border-border-color">
              <button onClick={() => setModalOpen(false)} className="btn btn-secondary text-xs px-5 py-2">
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
