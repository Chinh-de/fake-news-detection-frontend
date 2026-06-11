import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, AlertCircle, Filter, FileText, Check, Trash2 } from 'lucide-react';

interface HistoryItem {
  id: number;
  text_snippet: string;
  fb_post_id: string | null;
  slm_label: number;
  slm_confidence: number;
  llm_label: number;
  is_trained: boolean;
  created_at: string;
  xgboost_label?: number | null;
  xgboost_confidence?: number | null;
}

export default function History() {
  const [items, setItems] = useState<HistoryItem[]>([]);
  const [totalRecords, setTotalRecords] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  
  // Pagination & Filtering
  const [page, setPage] = useState(1);
  const [isTrained, setIsTrained] = useState<string>('all');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';
  const token = localStorage.getItem('admin_token');
  const limit = 10;

  const fetchHistory = async () => {
    setIsLoading(true);
    setError('');
    
    // Construct query parameters
    let url = `${API_URL}/api/history?page=${page}&limit=${limit}`;
    if (isTrained !== 'all') {
      url += `&isTrained=${isTrained}`;
    }

    try {
      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        if (response.status === 401 || response.status === 403) {
          throw new Error('Hết hạn phiên đăng nhập hoặc không có quyền truy cập');
        }
        throw new Error('Lỗi khi tải lịch sử kiểm định');
      }

      const data = await response.json();
      setItems(data.items);
      setTotalRecords(data.total_records);
      setTotalPages(data.total_pages);
    } catch (err: any) {
      setError(err.message || 'Lỗi kết nối');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, [page, isTrained]);

  const handleFilterChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setIsTrained(e.target.value);
    setPage(1); // Reset to first page
  };

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
      });
    } catch (e) {
      return dateStr;
    }
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm(`Bạn có chắc chắn muốn xóa bản ghi kiểm định #${id}? Hành động này không thể hoàn tác.`)) {
      return;
    }

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

      setItems(prev => prev.filter(item => item.id !== id));
      setTotalRecords(prev => Math.max(0, prev - 1));
      
      if (items.length === 1 && page > 1) {
        setPage(p => p - 1);
      } else {
        fetchHistory();
      }
    } catch (err: any) {
      alert(err.message || 'Lỗi khi xóa bản ghi.');
    }
  };

  return (
    <div className="page-shell max-w-7xl page-stack flex-1">
      <div className="section-stack">
        <h1 className="text-3xl font-extrabold tracking-tight">Lịch Sử Dự Đoán</h1>
        <p className="text-sm text-text-secondary">Quản lý và xem chi tiết lịch sử tin bài đã kiểm duyệt trong hệ thống</p>
      </div>

      {/* Filters Bar */}
      <div className="glass-panel p-5 md:p-6 flex flex-col md:flex-row justify-between items-stretch md:items-center gap-3 md:gap-4">
        <div className="flex items-center gap-2 text-text-secondary text-sm font-semibold">
          <Filter size={16} /> Bộ lọc dữ liệu:
        </div>

        <div className="flex flex-col sm:flex-row gap-4 items-stretch sm:items-center">
          <div className="flex items-center gap-2">
            <span className="text-xs text-text-secondary whitespace-nowrap">Trạng thái huấn luyện (isTrained):</span>
            <select
              value={isTrained}
              onChange={handleFilterChange}
              className="bg-white border border-border-color rounded-md px-3 py-1.5 text-xs font-semibold focus:border-blue-500 outline-none"
            >
              <option value="all">Tất cả</option>
              <option value="false">Chưa huấn luyện (isTrained=false)</option>
              <option value="true">Đã huấn luyện (isTrained=true)</option>
            </select>
          </div>
        </div>
      </div>

      {/* History Table */}
      {error && (
        <div className="p-4 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm flex gap-2">
          <AlertCircle className="shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <div className="glass-panel overflow-hidden">
        {isLoading ? (
          <div className="py-16 md:py-20 text-center section-stack">
            <div className="w-8 h-8 border-4 border-blue-500/30 border-t-blue-500 rounded-full animate-spin mx-auto" />
            <p className="text-sm text-text-secondary">Đang tải danh sách lịch sử...</p>
          </div>
        ) : items.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-border-color bg-slate-100 text-[11px] font-bold text-text-secondary uppercase tracking-wider">
                  <th className="p-5 pl-6">ID bản ghi</th>
                  <th className="p-5">Nội dung trích đoạn</th>
                  <th className="p-5">Nguồn/FB ID</th>
                  <th className="p-5 whitespace-nowrap">Kết quả dự đoán (SLM/XGB)</th>
                  <th className="p-5">Dự đoán LLM</th>
                  <th className="p-5">isTrained</th>
                  <th className="p-5">Thời gian</th>
                  <th className="p-5 pr-6 text-right">Chi tiết</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-color text-sm">
                {items.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50 transition-all">
                    <td className="p-5 pl-6 font-bold text-text-muted">#{item.id}</td>
                    <td className="p-5 max-w-sm">
                      <p className="truncate text-text-primary">{item.text_snippet}</p>
                    </td>
                    <td className="p-5 font-mono text-xs text-text-secondary">
                      {item.fb_post_id ? (
                        <span className="bg-blue-50 text-blue-600 px-2 py-0.5 rounded border border-blue-100">
                          {item.fb_post_id.substring(0, 15)}...
                        </span>
                      ) : (
                        <span className="text-text-muted italic">Nhập web</span>
                      )}
                    </td>
                    <td className="p-5 whitespace-nowrap">
                      <div className="flex items-center gap-4">
                        <div>
                          <span className={`badge ${item.slm_label === 1 ? 'badge-fake' : 'badge-real'} text-[9px]`} title="PhoBERT (SLM)">
                            SLM: {item.slm_label === 1 ? 'GIẢ' : 'THẬT'}
                          </span>
                          <div className="text-[9px] text-text-muted">{(item.slm_confidence * 100).toFixed(0)}% tự tin</div>
                        </div>
                        {item.xgboost_label !== undefined && item.xgboost_label !== null && (
                          <div className="border-l border-slate-200 pl-4">
                            <span className={`badge ${item.xgboost_label === 1 ? 'badge-fake' : 'badge-real'} text-[9px]`} title="XGBoost">
                              XGB: {item.xgboost_label === 1 ? 'GIẢ' : 'THẬT'}
                            </span>
                            <div className="text-[9px] text-text-muted">{(item.xgboost_confidence * 100).toFixed(0)}% tự tin</div>
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="p-5">
                      {item.llm_label === -1 ? (
                        <span className="text-xs text-text-muted italic">Chưa phân tích</span>
                      ) : (
                        <span className={`badge ${item.llm_label === 1 ? 'badge-fake' : 'badge-real'} text-[10px]`}>
                          {item.llm_label === 1 ? 'GIẢ' : 'THẬT'}
                        </span>
                      )}
                    </td>
                    <td className="p-5">
                      {item.is_trained ? (
                        <span className="text-emerald-500 flex items-center gap-0.5 text-xs font-semibold">
                          <Check size={12} /> Đã huấn luyện
                        </span>
                      ) : (
                        <span className="text-text-muted text-xs">Chưa huấn luyện</span>
                      )}
                    </td>
                    <td className="p-5 text-xs text-text-secondary whitespace-nowrap">
                      {formatDate(item.created_at)}
                    </td>
                    <td className="p-5 pr-6 text-right">
                      <div className="flex justify-end gap-2">
                        <Link
                          to={`/admin/history/${item.id}`}
                          className="inline-flex items-center justify-center p-1.5 rounded-lg bg-white border border-border-color text-text-secondary hover:text-text-primary hover:border-border-color-hover transition-all"
                          title="Xem chi tiết"
                        >
                          <ArrowRight size={14} />
                        </Link>
                        <button
                          onClick={() => handleDelete(item.id)}
                          className="inline-flex items-center justify-center p-1.5 rounded-lg bg-white border border-red-200 text-red-500 hover:bg-red-50 hover:border-red-300 transition-all cursor-pointer"
                          title="Xóa dự đoán"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="py-16 md:py-20 text-center text-text-muted section-stack">
            <FileText size={48} className="mx-auto opacity-30" />
            <p className="text-sm">Không tìm thấy bản ghi nào trong lịch sử.</p>
          </div>
        )}

        {/* Pagination Footer */}
        {totalPages > 1 && (
          <div className="p-5 border-t border-border-color flex flex-col md:flex-row justify-between items-start md:items-center gap-3 bg-white/60">
            <div className="text-xs text-text-secondary">
              Hiển thị trang {page}/{totalPages} (Tổng số {totalRecords} bản ghi)
            </div>
            <div className="flex gap-2">
              <button
                disabled={page === 1}
                onClick={() => setPage(p => Math.max(1, p - 1))}
                className="btn btn-secondary py-1.5 px-3 text-xs"
              >
                Trang trước
              </button>
              <button
                disabled={page === totalPages}
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                className="btn btn-secondary py-1.5 px-3 text-xs"
              >
                Trang sau
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
