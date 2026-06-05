import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
  ArrowLeft, Cpu, Calendar, GitCommit, List, AlertCircle, RefreshCw, 
  ChevronDown, ChevronUp, CheckCircle2, HelpCircle, Layers, 
  BookOpen, MessageSquare, ArrowLeftRight
} from 'lucide-react';


interface MRCDRun {
  id: number;
  hf_commit_sha: string | null;
  total_samples: number;
  clean_count_r1: number;
  clean_count_r2: number;
  clean_count_r3: number;
  noisy_count_final: number;
  triggered_at: string | null;
  completed_at: string | null;
}

interface RoundLog {
  round_id: number | string;
  y_llm: number | null;
  y_slm: number;
  conf_slm: number;
  status: string;
  wiki_evidence?: any;
  rag_evidence?: any;
  fewshot_examples?: any;
}

interface SampleDetail {
  record: {
    id: number;
    post_text: string;
    final_slm_label: number;
    final_slm_conf: number;
    final_llm_label: number;
    wiki_evidence?: any;
    rag_evidence?: any;
    fewshot_examples?: any;
  };
  rounds: RoundLog[];
}

interface RunDetailResponse {
  run_info: MRCDRun;
  samples: SampleDetail[];
  total_count: number;
}

export default function MRCDHistory() {
  const [runs, setRuns] = useState<MRCDRun[]>([]);
  const [selectedRunId, setSelectedRunId] = useState<number | null>(null);
  const [runDetail, setRunDetail] = useState<RunDetailResponse | null>(null);
  const [isLoadingList, setIsLoadingList] = useState(true);
  const [isLoadingDetail, setIsLoadingDetail] = useState(false);
  const [listError, setListError] = useState('');
  const [detailError, setDetailError] = useState('');
  const [expandedSamples, setExpandedSamples] = useState<Record<number, boolean>>({});
  
  // Pagination & Tabs State
  const [detailPage, setDetailPage] = useState(1);
  const [sampleTabs, setSampleTabs] = useState<Record<number, 'timeline' | 'retrieval' | 'fewshot'>>({});
  const [selectedRoundForEvidence, setSelectedRoundForEvidence] = useState<Record<number, number>>({});
  const [filterRound, setFilterRound] = useState<number | 'all'>('all');
  const [filterPool, setFilterPool] = useState<'all' | 'clean' | 'noisy'>('all');
  const detailLimit = 10;

  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';
  const token = localStorage.getItem('admin_token');

  const fetchRunsList = async () => {
    setIsLoadingList(true);
    setListError('');
    try {
      const response = await fetch(`${API_URL}/api/admin/mrcd-runs`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Lỗi khi tải lịch sử chạy MRCD');
      }

      const data = await response.json();
      setRuns(data);
      if (data.length > 0 && selectedRunId === null) {
        setSelectedRunId(data[0].id);
      }
    } catch (err: any) {
      setListError(err.message || 'Lỗi kết nối');
    } finally {
      setIsLoadingList(false);
    }
  };

  const fetchRunDetail = async (
    runId: number,
    roundVal: number | 'all' = filterRound,
    poolVal: 'all' | 'clean' | 'noisy' = filterPool,
    pageVal: number = detailPage
  ) => {
    setIsLoadingDetail(true);
    setDetailError('');
    setExpandedSamples({});
    setSampleTabs({});
    try {
      let url = `${API_URL}/api/admin/mrcd-runs/${runId}?page=${pageVal}&limit=${detailLimit}`;
      if (roundVal !== 'all') {
        url += `&round=${roundVal}`;
      }
      if (poolVal !== 'all') {
        url += `&pool=${poolVal}`;
      }

      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Lỗi khi tải chi tiết lượt chạy MRCD');
      }

      const data = await response.json();
      setRunDetail(data);
    } catch (err: any) {
      setDetailError(err.message || 'Lỗi kết nối');
    } finally {
      setIsLoadingDetail(false);
    }
  };

  useEffect(() => {
    fetchRunsList();
  }, []);

  useEffect(() => {
    if (selectedRunId !== null) {
      fetchRunDetail(selectedRunId, filterRound, filterPool, detailPage);
    }
  }, [selectedRunId, filterRound, filterPool, detailPage]);

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return 'N/A';
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

  const toggleSampleExpand = (sampleId: number) => {
    setExpandedSamples((prev) => ({
      ...prev,
      [sampleId]: !prev[sampleId],
    }));
  };

  const getSampleTab = (id: number): 'timeline' | 'retrieval' | 'fewshot' => {
    return sampleTabs[id] || 'timeline';
  };

  const setSampleTab = (id: number, tab: 'timeline' | 'retrieval' | 'fewshot') => {
    setSampleTabs((prev) => ({
      ...prev,
      [id]: tab,
    }));
  };

  const parseJsonField = (val: any) => {
    if (!val) return null;
    if (typeof val === 'string') {
      try {
        return JSON.parse(val);
      } catch (e) {
        return null;
      }
    }
    return val;
  };

  const renderLabelBadge = (label: number | null) => {
    if (label === null || label === -1) {
      return <span className="bg-slate-100 text-slate-500 text-[10px] font-semibold px-2 py-0.5 rounded uppercase">Chưa rõ</span>;
    }
    return label === 1 ? (
      <span className="badge badge-fake text-[10px]">GIẢ</span>
    ) : (
      <span className="badge badge-real text-[10px]">THẬT</span>
    );
  };

  // Dynamic Round stats calculation
  const getRoundStats = () => {
    if (!runDetail) return [];
    const run = runDetail.run_info;
    const total = run.total_samples;
    
    const r1_clean = run.clean_count_r1;
    const r1_noisy = total - r1_clean;

    const r2_clean = run.clean_count_r2;
    const r2_noisy = Math.max(0, r1_noisy - r2_clean);

    const r3_clean = run.clean_count_r3;
    const r3_noisy = Math.max(0, r2_noisy - r3_clean);

    return [
      { round: "Vòng 1", checked: total, clean: r1_clean, noisy: r1_noisy },
      { round: "Vòng 2", checked: r1_noisy, clean: r2_clean, noisy: r2_noisy },
      { round: "Vòng 3", checked: r2_noisy, clean: r3_clean, noisy: r3_noisy }
    ];
  };


  const roundStats = getRoundStats();

  const paginatedSamples = runDetail ? runDetail.samples : [];
  const totalPages = runDetail ? Math.ceil(runDetail.total_count / detailLimit) : 0;

  return (
    <div className="page-shell max-w-7xl page-stack flex-1 animate-fade-in">
      {/* Header back navigation */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between border-b border-border-color pb-4">
        <div className="flex items-center gap-3">
          <Link
            to="/admin/dashboard"
            className="inline-flex items-center justify-center p-2 rounded-lg bg-white border border-border-color text-text-secondary hover:text-text-primary hover:border-border-color-hover transition-all"
          >
            <ArrowLeft size={18} />
          </Link>
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              Lịch Sử Chạy MRCD
            </h1>
            <p className="text-xs text-text-secondary mt-0.5">
              Xem chi tiết nhật ký huấn luyện đa vòng, chuyển dịch mẫu tin và lịch sử commit mô hình HuggingFace.
            </p>
          </div>
        </div>
        <button
          onClick={() => {
            fetchRunsList();
            if (selectedRunId !== null) fetchRunDetail(selectedRunId);
          }}
          className="btn btn-secondary self-start lg:self-center py-1.5 px-3 text-xs font-bold flex items-center gap-1.5 cursor-pointer"
        >
          <RefreshCw size={12} /> Làm mới dữ liệu
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Side: Runs List Column (4 cols) */}
        <div className="lg:col-span-4 section-stack">
          <div className="glass-panel p-5 section-stack">
            <h3 className="text-xs font-bold text-text-secondary uppercase tracking-wider flex items-center gap-1.5">
              <List size={14} className="text-blue-600" /> Danh sách lượt chạy
            </h3>

            {isLoadingList ? (
              <div className="py-10 text-center space-y-2">
                <div className="w-6 h-6 border-2 border-blue-500/30 border-t-blue-500 rounded-full animate-spin mx-auto" />
                <p className="text-xs text-text-secondary">Đang tải lượt chạy...</p>
              </div>
            ) : listError ? (
              <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-lg flex gap-2">
                <AlertCircle className="shrink-0" size={14} />
                <span>{listError}</span>
              </div>
            ) : runs.length === 0 ? (
              <p className="text-xs text-text-muted italic text-center py-6">Chưa có lượt chạy MRCD nào được lưu.</p>
            ) : (
              <div className="space-y-2 max-h-[600px] overflow-y-auto pr-1">
                {runs.map((run) => {
                  const isSelected = selectedRunId === run.id;
                  return (
                    <button
                      key={run.id}
                      onClick={() => {
                        setFilterRound('all');
                        setFilterPool('all');
                        setDetailPage(1);
                        setSelectedRunId(run.id);
                      }}
                      className={`w-full text-left p-3.5 rounded-lg border transition-all text-xs flex flex-col gap-1.5 cursor-pointer ${
                        isSelected
                          ? 'bg-blue-50/70 border-blue-200 shadow-sm'
                          : 'bg-white border-border-color hover:bg-slate-50'
                      }`}
                    >
                      <div className="flex justify-between items-center w-full">
                        <span className="font-bold text-text-primary">Lượt chạy #{run.id}</span>
                        <span className={`text-[10px] px-1.5 py-0.5 rounded font-mono ${
                          isSelected ? 'bg-blue-100 text-blue-800' : 'bg-slate-100 text-text-secondary'
                        }`}>
                          {run.total_samples} mẫu tin
                        </span>
                      </div>
                      
                      {run.hf_commit_sha && (
                        <div className="flex items-center gap-1 text-[10px] text-text-secondary font-mono">
                          <GitCommit size={12} className="text-indigo-500 shrink-0" />
                          <span className="truncate" title={run.hf_commit_sha}>
                            commit: {run.hf_commit_sha.substring(0, 10)}...
                          </span>
                        </div>
                      )}

                      <div className="flex items-center gap-1 text-[10px] text-text-muted mt-1.5">
                        <Calendar size={10} />
                        <span>{formatDate(run.triggered_at)}</span>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Right Side: Detail Column (8 cols) */}
        <div className="lg:col-span-8 section-stack">
          {selectedRunId === null ? (
            <div className="glass-panel p-8 text-center text-text-muted italic text-xs">
              Vui lòng chọn một lượt chạy ở danh sách bên trái để xem chi tiết.
            </div>
          ) : isLoadingDetail ? (
            <div className="glass-panel p-16 text-center space-y-3">
              <div className="w-8 h-8 border-3 border-blue-500/30 border-t-blue-500 rounded-full animate-spin mx-auto" />
              <p className="text-xs text-text-secondary">Đang tải chi tiết lượt chạy #{selectedRunId}...</p>
            </div>
          ) : detailError || !runDetail ? (
            <div className="glass-panel p-5 text-center section-stack">
              <AlertCircle className="mx-auto text-red-500" size={36} />
              <p className="text-xs text-text-secondary">{detailError || 'Không tìm thấy thông tin lượt chạy.'}</p>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Overview Metrics Cards */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="glass-panel p-4 text-center">
                  <div className="text-[10px] text-text-muted font-bold uppercase tracking-wider mb-1">Tổng số mẫu</div>
                  <div className="text-xl font-extrabold text-text-primary">{runDetail.run_info.total_samples}</div>
                </div>
                <div className="glass-panel p-4 text-center border-l-2 border-l-emerald-500">
                  <div className="text-[10px] text-text-muted font-bold uppercase tracking-wider mb-1">D_clean R1 / R2 / R3</div>
                  <div className="text-xl font-extrabold text-emerald-600">
                    {runDetail.run_info.clean_count_r1} <span className="text-xs font-normal text-text-muted">/</span> {runDetail.run_info.clean_count_r2} <span className="text-xs font-normal text-text-muted">/</span> {runDetail.run_info.clean_count_r3}
                  </div>
                </div>
                <div className="glass-panel p-4 text-center border-l-2 border-l-orange-400">
                  <div className="text-[10px] text-text-muted font-bold uppercase tracking-wider mb-1">D_noisy cuối cùng</div>
                  <div className="text-xl font-extrabold text-orange-600">{runDetail.run_info.noisy_count_final}</div>
                </div>
                <div className="glass-panel p-4 text-center">
                  <div className="text-[10px] text-text-muted font-bold uppercase tracking-wider mb-1">Commit HF</div>
                  <div className="text-xs font-mono font-bold text-indigo-600 truncate mt-1">
                    {runDetail.run_info.hf_commit_sha ? runDetail.run_info.hf_commit_sha.substring(0, 8) : 'N/A'}
                  </div>
                </div>
              </div>

              {/* Transition statistics across each round */}
              <div className="glass-panel p-5 section-stack">
                <h3 className="text-xs font-bold text-text-secondary uppercase tracking-wider flex items-center gap-1.5">
                  <ArrowLeftRight size={14} className="text-emerald-500" /> Phân tách Tập dữ liệu qua các vòng (Transitions Pool Stats)
                </h3>
                <div className="overflow-x-auto mt-2">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-slate-50 border-b border-border-color font-bold text-text-secondary">
                        <th className="p-3 pl-4">Vòng Đánh giá</th>
                        <th className="p-3">Số mẫu kiểm tra (Checked)</th>
                        <th className="p-3 text-emerald-600">Phân vào Tập Sạch (D_clean)</th>
                        <th className="p-3 text-orange-600">Còn lại Tập Nhiễu (D_noisy)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border-color">
                      {roundStats.map((stat, idx) => (
                        <tr key={idx} className="hover:bg-slate-50/50 transition-all">
                          <td className="p-3 pl-4 font-bold text-text-primary">{stat.round}</td>
                          <td className="p-3 font-mono text-text-secondary">{stat.checked} mẫu</td>
                          <td className="p-3 font-mono font-semibold text-emerald-600">+{stat.clean} mẫu</td>
                          <td className="p-3 font-mono text-orange-600">
                            {stat.noisy} mẫu
                          </td>
                        </tr>
                      ))}

                    </tbody>
                  </table>
                </div>
              </div>

              {/* Commit info panel */}
              <div className="glass-panel p-4 text-xs space-y-1 bg-slate-50 border border-slate-200/60">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  <div>
                    <span className="font-bold text-text-secondary">Thời gian bắt đầu:</span> {formatDate(runDetail.run_info.triggered_at)}
                  </div>
                  <div>
                    <span className="font-bold text-text-secondary">Thời gian hoàn tất:</span> {formatDate(runDetail.run_info.completed_at)}
                  </div>
                </div>
                {runDetail.run_info.hf_commit_sha && (
                  <div className="pt-1 select-all">
                    <span className="font-bold text-text-secondary">Full HF Commit ID:</span> <code className="bg-white border border-border-color px-1.5 py-0.5 rounded text-[10px] font-mono">{runDetail.run_info.hf_commit_sha}</code>
                  </div>
                )}
              </div>

              {/* Samples Table */}
              <div className="glass-panel overflow-hidden section-stack">
                <div className="px-5 py-4 border-b border-border-color bg-slate-50/50 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                  <h4 className="text-xs font-bold text-text-primary uppercase tracking-wider flex items-center gap-1.5">
                    <Cpu size={14} className="text-blue-500" /> Danh sách mẫu tin ({runDetail.total_count})
                  </h4>
                  <div className="flex flex-wrap items-center gap-2 text-xs">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] text-text-secondary uppercase font-bold">Lọc theo vòng:</span>
                      <select
                        value={filterRound}
                        onChange={(e) => {
                          const val = e.target.value === 'all' ? 'all' : Number(e.target.value);
                          setFilterRound(val);
                          setDetailPage(1);
                        }}
                        className="bg-white border border-border-color rounded px-2 py-1 outline-none text-xs text-text-primary cursor-pointer hover:border-border-color-hover transition-all"
                      >
                        <option value="all">Tất cả vòng</option>
                        <option value="1">Vòng 1</option>
                        <option value="2">Vòng 2</option>
                        <option value="3">Vòng 3</option>
                      </select>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] text-text-secondary uppercase font-bold">Lọc theo tập:</span>
                      <select
                        value={filterPool}
                        onChange={(e) => {
                          const val = e.target.value as any;
                          setFilterPool(val);
                          setDetailPage(1);
                        }}
                        className="bg-white border border-border-color rounded px-2 py-1 outline-none text-xs text-text-primary cursor-pointer hover:border-border-color-hover transition-all"
                      >
                        <option value="all">Tất cả tập</option>
                        <option value="clean">Tập Sạch (D_clean)</option>
                        <option value="noisy">Tập Nhiễu (D_noisy)</option>
                      </select>
                    </div>
                  </div>
                </div>

                <div className="divide-y divide-border-color">
                  {paginatedSamples.length === 0 ? (
                    <div className="p-8 text-center text-text-muted italic text-xs">
                      Không có mẫu tin nào khớp với bộ lọc đã chọn.
                    </div>
                  ) : (
                    paginatedSamples.map(({ record, rounds }) => {
                    const isExpanded = !!expandedSamples[record.id];
                    const activeTab = getSampleTab(record.id);
                    
                    const activeRoundId = selectedRoundForEvidence[record.id] || 1;
                    const activeRound = rounds.find(r => Number(r.round_id) === activeRoundId) || rounds[0];

                    // Parse RAG/Wiki from round 1 (bootstrap only). Fewshot is per-round.
                    const firstRound = rounds[0];
                    const parsedWiki = parseJsonField(firstRound?.wiki_evidence || record.wiki_evidence);
                    const parsedRag = parseJsonField(firstRound?.rag_evidence || record.rag_evidence);
                    const parsedFewshot = parseJsonField(activeRound?.fewshot_examples || record.fewshot_examples);

                    return (
                      <div key={record.id} className="transition-all hover:bg-slate-50/30">
                        {/* Summary Row */}
                        <div
                          onClick={() => toggleSampleExpand(record.id)}
                          className="p-4 flex flex-col md:flex-row justify-between items-start md:items-center gap-3 cursor-pointer text-xs select-none"
                        >
                          <div className="flex-1 space-y-1 max-w-lg">
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-text-muted">Bản ghi #{record.id}</span>
                              <span className="text-[10px] text-text-muted">SLM cuối: {(record.final_slm_conf * 100).toFixed(0)}%</span>
                            </div>
                            <p className="text-text-primary font-medium truncate">{record.post_text}</p>
                          </div>

                          <div className="flex items-center gap-3 shrink-0 self-end md:self-center">
                            <div className="flex items-center gap-2">
                              <div className="flex flex-col items-center">
                                <span className="text-[9px] text-text-muted uppercase font-bold">SLM cuối</span>
                                {renderLabelBadge(record.final_slm_label)}
                              </div>
                              {record.final_llm_label !== -1 && (
                                <div className="flex flex-col items-center">
                                  <span className="text-[9px] text-text-muted uppercase font-bold">LLM</span>
                                  {renderLabelBadge(record.final_llm_label)}
                                </div>
                              )}
                            </div>
                            <div className="text-text-secondary border border-border-color rounded p-1 hover:bg-slate-100 transition-all">
                              {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                            </div>
                          </div>
                        </div>

                        {/* Detailed Tabs & Timelines Panel (Expanded) */}
                        {isExpanded && (
                          <div className="px-5 pb-5 pt-1 bg-slate-50/60 border-t border-border-color/40 animate-slide-in space-y-4">
                            {/* Inner Tabs Menu */}
                            <div className="flex border-b border-border-color text-xs gap-3">
                              <button
                                onClick={() => setSampleTab(record.id, 'timeline')}
                                className={`py-2 px-1 font-bold border-b-2 transition-all flex items-center gap-1.5 cursor-pointer ${
                                  activeTab === 'timeline'
                                    ? 'border-blue-500 text-blue-600'
                                    : 'border-transparent text-text-secondary hover:text-text-primary'
                                }`}
                              >
                                <Cpu size={12} /> Tiến trình đa vòng
                              </button>
                              <button
                                onClick={() => setSampleTab(record.id, 'retrieval')}
                                className={`py-2 px-1 font-bold border-b-2 transition-all flex items-center gap-1.5 cursor-pointer ${
                                  activeTab === 'retrieval'
                                    ? 'border-blue-500 text-blue-600'
                                    : 'border-transparent text-text-secondary hover:text-text-primary'
                                }`}
                              >
                                <Layers size={12} /> Tra cứu RAG & Wiki
                              </button>
                              <button
                                onClick={() => setSampleTab(record.id, 'fewshot')}
                                className={`py-2 px-1 font-bold border-b-2 transition-all flex items-center gap-1.5 cursor-pointer ${
                                  activeTab === 'fewshot'
                                    ? 'border-blue-500 text-blue-600'
                                    : 'border-transparent text-text-secondary hover:text-text-primary'
                                }`}
                              >
                                <MessageSquare size={12} /> Mẫu Few-shot
                              </button>
                            </div>

                            {/* Tab Content 1: Timeline */}
                            {activeTab === 'timeline' && (
                              <div className="space-y-4">
                                <div className="mb-2">
                                  <p className="text-[10px] text-text-muted leading-relaxed">
                                    * Điều kiện phân loại Tập Sạch (D_clean): Nhãn dự đoán của LLM và SLM trùng nhau ($y^1 == y^2$) và độ tự tin của SLM $p(y^2) \ge 0.8$. Các trường hợp khác đưa vào Tập Nhiễu (D_noisy).
                                  </p>
                                </div>

                                <div className="relative border-l border-slate-300 pl-4 ml-2.5 py-1 space-y-4">
                                  {rounds.map((round, idx) => {
                                    const isClean = round.status === 'clean' || round.status.startsWith('clean');
                                    return (
                                      <div key={idx} className="relative">
                                        <div className={`absolute -left-[22.5px] top-1.5 w-4.5 h-4.5 rounded-full border-2 bg-white flex items-center justify-center ${
                                          isClean ? 'border-emerald-500' : 'border-orange-400'
                                        }`}>
                                          <div className={`w-1.5 h-1.5 rounded-full ${
                                            isClean ? 'bg-emerald-500' : 'bg-orange-400'
                                          }`} />
                                        </div>

                                        <div className="bg-white border border-border-color rounded-lg p-3 shadow-sm text-xs space-y-2">
                                          <div className="flex justify-between items-center">
                                            <span className="font-bold text-text-primary">
                                              Vòng {round.round_id}
                                            </span>

                                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${
                                              isClean 
                                                ? 'bg-emerald-50 text-emerald-600 border-emerald-100'
                                                : 'bg-orange-50 text-orange-600 border-orange-100'
                                            }`}>
                                              {isClean ? 'Tập Sạch (D_clean)' : 'Tập Nhiễu (D_noisy)'}
                                            </span>
                                          </div>

                                          <div className="grid grid-cols-3 gap-3 text-[11px] text-text-secondary">
                                            <div className="bg-slate-50/70 p-2 rounded">
                                              <div className="text-[9px] text-text-muted uppercase font-bold mb-0.5">Dự đoán LLM (y1)</div>
                                              <div className="font-semibold">{round.y_llm !== null ? (round.y_llm === 1 ? 'GIẢ' : 'THẬT') : 'N/A (Chốt hạ)'}</div>
                                            </div>
                                            <div className="bg-slate-50/70 p-2 rounded">
                                              <div className="text-[9px] text-text-muted uppercase font-bold mb-0.5">Dự đoán SLM (y2)</div>
                                              <div className="font-semibold">{round.y_slm === 1 ? 'GIẢ' : 'THẬT'}</div>
                                            </div>
                                            <div className="bg-slate-50/70 p-2 rounded">
                                              <div className="text-[9px] text-text-muted uppercase font-bold mb-0.5">Độ tự tin p(y2)</div>
                                              <div className="font-semibold">{(round.conf_slm * 100).toFixed(1)}%</div>
                                            </div>
                                          </div>

                                          <div className="flex items-center gap-1.5 text-[10px] text-text-muted border-t border-slate-100 pt-1.5 mt-1">
                                            {isClean ? (
                                              <>
                                                <CheckCircle2 size={12} className="text-emerald-500" />
                                                <span>Trùng khớp & Độ tự tin cao ({ (round.conf_slm * 100).toFixed(0) }% &ge; 80%) &rarr; Được thêm vào Tập Sạch</span>
                                              </>
                                            ) : (
                                              <>
                                                <HelpCircle size={12} className="text-orange-400" />
                                                <span>
                                                  {round.y_llm !== round.y_slm 
                                                    ? 'LLM và SLM mâu thuẫn nhãn' 
                                                    : `SLM có độ tự tin thấp (${ (round.conf_slm * 100).toFixed(0) }% < 80%)`
                                                  } &rarr; Phân loại Tập Nhiễu
                                                </span>
                                              </>
                                            )}
                                          </div>
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                            )}

                            {/* Tab Content 2: Retrieval Tra cứu */}
                            {activeTab === 'retrieval' && (
                              <div className="space-y-4 w-full">
                                <p className="text-[10px] text-text-muted">
                                  * Bằng chứng RAG và Wiki được thu thập 1 lần (vòng 1) và dùng chung cho toàn bộ quy trình.
                                </p>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {/* RAG Evidence */}
                                <div className="space-y-2">
                                  <h6 className="text-[11px] font-bold text-text-secondary uppercase tracking-wider flex items-center gap-1.5">
                                    <Layers size={12} className="text-blue-500" /> Tài liệu báo chí (RAG)
                                  </h6>
                                  {parsedRag && parsedRag.length > 0 ? (
                                    <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                                      {parsedRag.map((item: any, idx: number) => (
                                        <div key={idx} className="bg-white border border-border-color p-3 rounded text-xs space-y-1 shadow-sm">
                                          <div className="font-semibold text-text-primary">{item.title}</div>
                                          <p className="text-text-secondary italic">"{item.chunk_text}"</p>
                                          <div className="flex justify-between items-center text-[10px] text-text-muted pt-1.5 border-t border-slate-50">
                                            <span>Độ tương đồng: {(item.score * 100).toFixed(0)}%</span>
                                            {item.url && (
                                              <a href={item.url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                                                Xem nguồn
                                              </a>
                                            )}
                                          </div>
                                        </div>
                                      ))}
                                    </div>
                                  ) : (
                                    <p className="text-text-muted italic text-[11px] bg-white border border-border-color p-3 rounded text-center">Không sử dụng tài liệu kiểm chứng báo chí.</p>
                                  )}
                                </div>

                                {/* Wiki Entities */}
                                <div className="space-y-2">
                                  <h6 className="text-[11px] font-bold text-text-secondary uppercase tracking-wider flex items-center gap-1.5">
                                    <BookOpen size={12} className="text-emerald-500" /> Định nghĩa Wikipedia
                                  </h6>
                                  {parsedWiki && Object.keys(parsedWiki).length > 0 ? (
                                    <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                                      {Object.entries(parsedWiki).map(([entity, def]: any) => (
                                        <div key={entity} className="bg-white border border-border-color p-3 rounded text-xs shadow-sm">
                                          <div className="font-bold text-blue-600 mb-0.5">{entity}</div>
                                          <p className="text-text-secondary leading-relaxed">{def}</p>
                                        </div>
                                      ))}
                                    </div>
                                  ) : (
                                    <p className="text-text-muted italic text-[11px] bg-white border border-border-color p-3 rounded text-center">Không tìm thấy thực thể Wikipedia liên quan.</p>
                                  )}
                                </div>
                              </div>
                            </div>
                            )}

                            {/* Tab Content 3: Fewshot Examples */}
                            {activeTab === 'fewshot' && (
                              <div className="space-y-3">
                                {rounds.length > 1 && (
                                  <div className="flex gap-2 items-center mb-1">
                                    <span className="text-[10px] text-text-secondary uppercase font-bold">Xem theo vòng:</span>
                                    {rounds.map((r) => (
                                      <button
                                        key={r.round_id}
                                        onClick={() => setSelectedRoundForEvidence(prev => ({ ...prev, [record.id]: Number(r.round_id) }))}
                                        className={`px-2 py-0.5 rounded text-[10px] font-bold border transition-all cursor-pointer ${
                                          activeRoundId === Number(r.round_id)
                                            ? 'bg-blue-600 border-blue-600 text-white shadow-sm'
                                            : 'bg-white border-border-color text-text-secondary hover:bg-slate-50'
                                        }`}
                                      >
                                        Vòng {r.round_id}
                                      </button>
                                    ))}
                                  </div>
                                )}
                                <h6 className="text-[11px] font-bold text-text-secondary uppercase tracking-wider flex items-center gap-1.5">
                                  <MessageSquare size={12} className="text-amber-500" /> Ví dụ minh họa in-context learning (Few-shot)
                                </h6>
                                {parsedFewshot && parsedFewshot.length > 0 ? (
                                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-60 overflow-y-auto pr-1">
                                    {parsedFewshot.map((item: any, idx: number) => (
                                      <div key={idx} className="bg-white border border-border-color p-3 rounded text-xs space-y-2 shadow-sm flex flex-col justify-between">
                                        <p className="text-text-secondary italic">"{item.text}"</p>
                                        <div className="flex justify-between items-center text-[10px] pt-1.5 border-t border-slate-50">
                                          <span className="text-text-muted">Nguồn: {item.source}</span>
                                          <span className={`px-1.5 py-0.5 rounded font-bold ${
                                            item.label === 'THẬT' 
                                              ? 'bg-emerald-50 text-emerald-600' 
                                              : 'bg-rose-50 text-rose-600'
                                          }`}>{item.label}</span>
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                ) : (
                                  <p className="text-text-muted italic text-[11px] bg-white border border-border-color p-3 rounded text-center">Không sử dụng mẫu fewshot.</p>
                                )}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })
                  )}
                </div>

                {/* Pagination Controls */}
                {totalPages > 1 && (
                  <div className="p-4 border-t border-border-color flex justify-between items-center bg-slate-50/50 text-xs">
                    <span className="text-text-secondary">
                      Hiển thị {Math.min(runDetail.total_count, (detailPage - 1) * detailLimit + 1)} - {Math.min(runDetail.total_count, detailPage * detailLimit)} trong tổng số {runDetail.total_count} mẫu
                    </span>
                    <div className="flex gap-2">
                      <button
                        disabled={detailPage === 1}
                        onClick={() => setDetailPage(p => Math.max(1, p - 1))}
                        className="btn btn-secondary py-1.5 px-3 text-[11px] cursor-pointer"
                      >
                        Trang trước
                      </button>
                      <span className="flex items-center px-1 font-bold text-text-primary">
                        {detailPage} / {totalPages}
                      </span>
                      <button
                        disabled={detailPage === totalPages}
                        onClick={() => setDetailPage(p => Math.min(totalPages, p + 1))}
                        className="btn btn-secondary py-1.5 px-3 text-[11px] cursor-pointer"
                      >
                        Trang sau
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
