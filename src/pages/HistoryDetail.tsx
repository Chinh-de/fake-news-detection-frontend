import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, Cpu, Sparkles, BookOpen, Layers, MessageSquare, Code, AlertTriangle, ExternalLink, Calendar, Trash2 } from 'lucide-react';

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
  final_prompt: string | null;
  created_at: string;
}

export default function HistoryDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [record, setRecord] = useState<AnalyzeResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);

  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';
  const token = localStorage.getItem('admin_token');

  const handleDelete = async () => {
    if (!window.confirm(`Bạn có chắc chắn muốn xóa bản ghi kiểm định #${id}? Hành động này không thể hoàn tác.`)) {
      return;
    }

    setIsDeleting(true);
    try {
      const response = await fetch(`${API_URL}/api/history/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Lỗi khi xóa bản ghi lịch sử.');
      }

      alert('Đã xóa bản ghi thành công.');
      navigate('/admin/history');
    } catch (err: any) {
      alert(err.message || 'Lỗi khi xóa bản ghi.');
      setIsDeleting(false);
    }
  };

  useEffect(() => {
    const fetchDetail = async () => {
      setIsLoading(true);
      setError('');
      try {
        const response = await fetch(`${API_URL}/api/history/${id}`, {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        });

        if (!response.ok) {
          throw new Error('Không thể tải chi tiết bản ghi kiểm định');
        }

        const data = await response.json();
        setRecord(data);
      } catch (err: any) {
        setError(err.message || 'Lỗi hệ thống');
      } finally {
        setIsLoading(false);
      }
    };

    fetchDetail();
  }, [id]);

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center space-y-3">
          <div className="w-10 h-10 border-4 border-blue-500/30 border-t-blue-500 rounded-full animate-spin mx-auto" />
          <p className="text-sm text-text-secondary">Đang tải chi tiết bản ghi...</p>
        </div>
      </div>
    );
  }

  if (error || !record) {
    return (
      <div className="page-shell-narrow flex-1 flex flex-col justify-center">
        <div className="glass-panel p-7 md:p-8 text-center section-stack">
          <AlertTriangle className="mx-auto text-red-500" size={48} />
          <h3 className="text-xl font-bold">Lỗi tải dữ liệu</h3>
          <p className="text-text-secondary">{error || 'Không tìm thấy bản ghi.'}</p>
          <Link to="/admin/history" className="btn btn-primary px-6 inline-flex items-center gap-2">
            <ArrowLeft size={16} /> Quay lại danh sách
          </Link>
        </div>
      </div>
    );
  }
  const formatDate = (dateStr: string) => {
    try {
      let isoStr = dateStr;
      if (!isoStr.includes('T') && isoStr.includes(' ')) {
        isoStr = isoStr.replace(' ', 'T');
      }
      if (!/Z|[+-]\d{2}(:\d{2})?$/.test(isoStr)) {
        isoStr += 'Z';
      }
      const date = new Date(isoStr);
      return date.toLocaleString('vi-VN', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      });
    } catch (e) {
      return dateStr;
    }
  };

  return (
    <div className="page-shell max-w-7xl page-stack flex-1">
      {/* Header back navigation */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between border-b border-border-color pb-4">
        <div className="flex items-center gap-3">
          <Link
            to="/admin/history"
            className="inline-flex items-center justify-center p-2 rounded-lg bg-white border border-border-color text-text-secondary hover:text-text-primary hover:border-border-color-hover transition-all"
          >
            <ArrowLeft size={18} />
          </Link>
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              Chi Tiết Bản Ghi <span className="text-text-muted">#{record.record_id}</span>
            </h1>
            <p className="text-xs text-text-secondary flex items-center gap-1.5 mt-0.5">
              <Calendar size={12} /> Thời gian kiểm định: {formatDate(record.created_at)}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          <span className={`badge ${record.slm_label === 1 ? 'badge-fake' : 'badge-real'} text-xs px-3 py-1.5`}>
            SLM: {record.slm_label === 1 ? 'GIẢ' : 'THẬT'}
          </span>
          {record.llm_label !== -1 && (
            <span className={`badge ${record.llm_label === 1 ? 'badge-fake' : 'badge-real'} text-xs px-3 py-1.5`}>
              LLM: {record.llm_label === 1 ? 'GIẢ' : 'THẬT'}
            </span>
          )}
          <button
            onClick={handleDelete}
            disabled={isDeleting}
            className="btn py-1.5 px-3 text-xs bg-red-50 text-red-600 border border-red-200 hover:bg-red-600 hover:text-white transition-all disabled:opacity-50 inline-flex items-center gap-1.5 cursor-pointer ml-2"
          >
            <Trash2 size={12} /> {isDeleting ? 'Đang xóa...' : 'Xóa bản ghi'}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 xl:gap-6">
        {/* Left Column: Original Text & Predictions */}
        <div className="lg:col-span-7 section-stack">
          {/* Original Text content */}
          <div className="glass-panel p-6 md:p-7 section-stack">
            <h3 className="text-sm font-bold text-text-secondary uppercase tracking-wider">Nội dung bài đăng gốc</h3>
            <div className="p-6 rounded-lg bg-slate-50 text-sm leading-relaxed border border-border-color whitespace-pre-wrap select-all">
              {record.post_text}
            </div>
            {record.normalized_text && (
              <div className="space-y-1.5">
                <span className="text-xs font-bold text-text-muted uppercase tracking-wider">Văn bản đã qua tiền xử lý (Normalized):</span>
                <div className="p-5 rounded bg-slate-50 text-xs leading-relaxed border border-border-color text-text-secondary italic">
                  {record.normalized_text}
                </div>
              </div>
            )}
            <div className="text-xs text-text-muted pt-2 flex items-center justify-between">
              <span>Nguồn: {record.fb_post_id ? `Facebook (Post ID: ${record.fb_post_id})` : 'Dán từ Giao diện Web'}</span>
            </div>
          </div>

          {/* Prompt Sent to LLM */}
          {record.final_prompt && (
            <div className="glass-panel p-6 md:p-7 section-stack">
              <h3 className="text-sm font-bold text-text-secondary uppercase tracking-wider flex items-center gap-2">
                <Code size={16} className="text-violet-600" /> Mẫu prompt gửi lên LLM
              </h3>
              <p className="text-xs text-text-secondary">Nội dung prompt được định cấu trúc tự động bởi Backend</p>
              <pre className="p-5 rounded-lg bg-slate-50 text-[10px] font-mono leading-relaxed border border-border-color overflow-x-auto text-text-secondary max-h-96 select-all">
                {record.final_prompt}
              </pre>
            </div>
          )}
        </div>

        {/* Right Column: Evidence & Model outputs */}
        <div className="lg:col-span-5 section-stack">
          {/* SLM Output */}
          <div className="glass-panel p-6 md:p-7 section-stack">
            <h3 className="text-sm font-bold text-text-secondary uppercase tracking-wider flex items-center gap-2">
              <Cpu size={16} className="text-blue-600" /> Kết quả dự đoán nhanh SLM
            </h3>
              <div className="grid grid-cols-2 gap-4 text-center">
              <div className="bg-slate-50 p-5 rounded-lg border border-border-color">
                <div className="text-[10px] text-text-muted font-bold uppercase tracking-wider mb-1">Dự đoán</div>
                <span className={`badge ${record.slm_label === 1 ? 'badge-fake' : 'badge-real'} text-xs`}>
                  {record.slm_label === 1 ? 'GIẢ MẠO' : 'XÁC THỰC'}
                </span>
              </div>
              <div className="bg-slate-50 p-5 rounded-lg border border-border-color">
                <div className="text-[10px] text-text-muted font-bold uppercase tracking-wider mb-1">Độ tự tin</div>
                <div className="text-base font-extrabold text-text-primary">{(record.slm_confidence * 100).toFixed(2)}%</div>
              </div>
            </div>
          </div>

          {/* LLM Output */}
          <div className="glass-panel p-6 md:p-7 section-stack">
            <h3 className="text-sm font-bold text-text-secondary uppercase tracking-wider flex items-center gap-2">
              <Sparkles size={16} className="text-purple-600" /> Kết quả phân tích chuyên sâu LLM
            </h3>
            {record.llm_label === -1 ? (
              <p className="text-xs text-text-muted italic text-center py-4">Bản ghi này chưa có phân tích chuyên sâu từ LLM.</p>
            ) : (
              <div className="space-y-3">
                <div className="bg-slate-50 p-5 rounded-lg border border-border-color text-center">
                  <div className="text-[10px] text-text-muted font-bold uppercase tracking-wider mb-1">Dự đoán LLM</div>
                  <span className={`badge ${record.llm_label === 1 ? 'badge-fake' : 'badge-real'} text-xs`}>
                    {record.llm_label === 1 ? 'TIN GIẢ' : 'TIN THẬT'}
                  </span>
                </div>
                {record.llm_explanation && (
                  <div className="space-y-1.5">
                    <span className="text-xs font-semibold text-text-secondary">Lập luận giải thích:</span>
                    <p className="text-xs text-text-secondary bg-slate-50 p-5 rounded-lg border border-border-color leading-relaxed">
                      {record.llm_explanation}
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* RAG Internet sources evidence */}
          <div className="glass-panel p-6 md:p-7 section-stack">
            <h3 className="text-sm font-bold text-text-secondary uppercase tracking-wider flex items-center gap-2">
              <Layers size={16} className="text-emerald-600" /> Ngữ liệu báo chí kiểm chứng
            </h3>
            {record.rag_evidence && record.rag_evidence.length > 0 ? (
              <div className="space-y-3 max-h-72 overflow-y-auto pr-1">
                {record.rag_evidence.map((item, idx) => (
                  <div key={idx} className="text-xs bg-slate-50 p-5 rounded-lg border border-border-color space-y-2">
                    <div className="font-semibold text-text-primary whitespace-pre-wrap break-words">{item.title}</div>
                    <p className="text-text-muted italic leading-relaxed whitespace-pre-wrap break-words">"{item.chunk_text}"</p>
                    <div className="flex justify-between items-center text-[10px] text-text-muted pt-1">
                      <span>Độ tương đồng: {(item.score * 100).toFixed(1)}%</span>
                      {item.url && (
                        <a href={item.url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline flex items-center gap-0.5">
                          Xem nguồn <ExternalLink size={8} />
                        </a>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-text-muted italic text-center py-4">Không tìm thấy hoặc không sử dụng tài liệu kiểm chứng báo chí.</p>
            )}
          </div>

          {/* Wikipedia definitions */}
          <div className="glass-panel p-6 md:p-7 section-stack">
            <h3 className="text-sm font-bold text-text-secondary uppercase tracking-wider flex items-center gap-2">
              <BookOpen size={16} className="text-blue-600" /> Định nghĩa thực thể Wikipedia
            </h3>
            {record.wiki_evidence && Object.keys(record.wiki_evidence).length > 0 ? (
              <div className="space-y-3 max-h-60 overflow-y-auto pr-1">
                {Object.entries(record.wiki_evidence).map(([entity, def]) => (
                  <div key={entity} className="text-xs bg-slate-50 p-5 rounded-lg border border-border-color space-y-2">
                    <div className="font-bold text-blue-600">{entity}</div>
                    <p className="text-text-secondary leading-relaxed">{def}</p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-text-muted italic text-center py-4">Không tìm thấy hoặc không sử dụng thực thể Wikipedia.</p>
            )}
          </div>

          {/* Few-shot templates */}
          <div className="glass-panel p-7 space-y-4">
            <h3 className="text-sm font-bold text-text-secondary uppercase tracking-wider flex items-center gap-2">
              <MessageSquare size={16} className="text-amber-600" /> Mẫu ví dụ in-context learning (Few-shot)
            </h3>
            {record.fewshot_examples && record.fewshot_examples.length > 0 ? (
              <div className="space-y-3 max-h-72 overflow-y-auto pr-1">
                {record.fewshot_examples.map((item, idx) => (
                  <div key={idx} className="text-xs bg-slate-50 p-5 rounded-lg border border-border-color space-y-2.5">
                    <p className="text-text-secondary line-clamp-3">"{item.text}"</p>
                    <div className="flex justify-between items-center text-[10px] pt-1 border-t border-border-color/40">
                      <span className="text-text-muted">Nguồn ví dụ: {item.source}</span>
                      <span className="badge badge-neutral font-semibold text-amber-600">{item.label}</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-text-muted italic text-center py-4">Không sử dụng mẫu ví dụ fewshot.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
