import { useState, useEffect } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line, BarChart, Bar } from 'recharts';
import { CheckCircle, AlertTriangle, AlertCircle, Database, TrendingUp, ShieldCheck } from 'lucide-react';

interface DashboardData {
  overview: {
    total_checked: number;
    total_fake: number;
    total_real: number;
    total_conflict: number;
  };
  charts: {
    time_distribution: Array<{ time_label: string; count: number }>;
    pie_fake: number;
    pie_real: number;
    pie_conflict: number;
    slm_confidence_distribution: Array<{ time_label: string; avg_confidence: number }>;
    slm_llm_agreement_distribution: Array<{ time_label: string; count: number }>;
  };
}

export default function Dashboard() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [timeRange, setTimeRange] = useState<'today' | 'week' | 'month' | 'all'>('all');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';
  const token = localStorage.getItem('admin_token');

  const fetchDashboardData = async () => {
    setIsLoading(true);
    setError('');
    try {
      const response = await fetch(`${API_URL}/api/dashboard?range=${timeRange}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        if (response.status === 401 || response.status === 403) {
          throw new Error('Hết hạn phiên đăng nhập hoặc không có quyền truy cập');
        }
        throw new Error('Không thể lấy dữ liệu thống kê từ server');
      }

      const resData = await response.json();
      setData(resData);
    } catch (err: any) {
      setError(err.message || 'Lỗi kết nối');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, [timeRange]);

  if (isLoading && !data) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center space-y-3">
          <div className="w-10 h-10 border-4 border-blue-500/30 border-t-blue-500 rounded-full animate-spin mx-auto" />
          <p className="text-sm text-text-secondary">Đang tải dữ liệu thống kê...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-12 flex-1 flex flex-col justify-center">
        <div className="glass-panel p-8 text-center space-y-4">
          <AlertCircle className="mx-auto text-red-500" size={48} />
          <h3 className="text-xl font-bold">Lỗi tải dữ liệu</h3>
          <p className="text-text-secondary">{error}</p>
          <button onClick={fetchDashboardData} className="btn btn-primary px-6">Thử lại</button>
        </div>
      </div>
    );
  }

  const overview = data?.overview;
  const charts = data?.charts;

  // Pie chart data structure
  const pieData = [
    { name: 'Tin thật', value: charts?.pie_real || 0, color: '#10B981' },
    { name: 'Tin giả', value: charts?.pie_fake || 0, color: '#EF4444' },
    { name: 'Xung đột nhãn', value: charts?.pie_conflict || 0, color: '#F59E0B' },
  ].filter(item => item.value > 0);

  return (
    <div className="page-shell max-w-7xl page-stack flex-1">
      {/* Dashboard Title & Filter */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-5 border-b border-border-color pb-5">
        <div className="space-y-1">
          <h1 className="text-3xl font-extrabold tracking-tight">Hệ Thống Thống Kê</h1>
          <p className="text-sm text-text-secondary">Thống kê dữ liệu kiểm định tin tức từ người dùng</p>
        </div>

        {/* Date Filter Buttons */}
        <div className="flex rounded-lg bg-slate-100 p-1 border border-border-color self-start sm:self-auto">
          {(['all', 'today', 'week', 'month'] as const).map((r) => (
            <button
              key={r}
              onClick={() => setTimeRange(r)}
              className={`px-4 py-1.5 text-xs font-bold rounded-md transition-all ${
                timeRange === r
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-text-secondary hover:text-text-primary'
              }`}
            >
              {r === 'all' && 'Tất cả'}
              {r === 'today' && 'Hôm nay'}
              {r === 'week' && 'Tuần này'}
              {r === 'month' && 'Tháng này'}
            </button>
          ))}
        </div>
      </div>

      {/* Overview Cards (Bento style) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 md:gap-6 xl:gap-7">
        {/* Total Checked */}
        <div className="glass-panel p-6 md:p-7 flex items-center gap-5 md:gap-6">
          <div className="p-4 rounded-lg bg-blue-50 border border-blue-100 text-blue-600">
            <Database size={24} />
          </div>
          <div>
            <div className="text-2xl font-black">{overview?.total_checked}</div>
            <div className="text-xs text-text-secondary font-semibold uppercase tracking-wider">Tổng số tin đã kiểm tra</div>
          </div>
        </div>

        {/* Fake News */}
        <div className="glass-panel p-6 md:p-7 flex items-center gap-5 md:gap-6">
          <div className="p-4 rounded-lg bg-red-50 border border-red-100 text-red-600">
            <AlertCircle size={24} />
          </div>
          <div>
            <div className="text-2xl font-black">{overview?.total_fake}</div>
            <div className="text-xs text-text-secondary font-semibold uppercase tracking-wider">Tin có dấu hiệu giả</div>
          </div>
        </div>

        {/* Real News */}
        <div className="glass-panel p-6 md:p-7 flex items-center gap-5 md:gap-6">
          <div className="p-4 rounded-lg bg-emerald-50 border border-emerald-100 text-emerald-600">
            <CheckCircle size={24} />
          </div>
          <div>
            <div className="text-2xl font-black">{overview?.total_real}</div>
            <div className="text-xs text-text-secondary font-semibold uppercase tracking-wider">Tin có dấu hiệu thật</div>
          </div>
        </div>

        {/* Label Conflicts */}
        <div className="glass-panel p-6 md:p-7 flex items-center gap-5 md:gap-6">
          <div className="p-4 rounded-lg bg-amber-50 border border-amber-100 text-amber-600">
            <AlertTriangle size={24} />
          </div>
          <div>
            <div className="text-2xl font-black">{overview?.total_conflict}</div>
            <div className="text-xs text-text-secondary font-semibold uppercase tracking-wider">Số tin xung đột nhãn</div>
          </div>
        </div>
      </div>

      {/* Main Charts Layout (Bento Grid) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 xl:gap-7">
        {/* Chart 1: Time distribution (AreaChart) - Left Column */}
        <div className="glass-panel p-6 md:p-7 lg:col-span-8 section-stack">
          <div>
            <h3 className="font-bold text-base flex items-center gap-2">
              <TrendingUp size={16} className="text-blue-600" /> Biểu đồ số lượng kiểm tra theo thời gian
            </h3>
            <p className="text-xs text-text-secondary">Thống kê số lượng bài đăng được kiểm duyệt theo giờ</p>
          </div>
          <div style={{ height: 340, width: '100%', minHeight: 340 }}>
            {charts?.time_distribution && charts.time_distribution.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={charts.time_distribution} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#3B82F6" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(15,23,42,0.05)" />
                  <XAxis dataKey="time_label" tick={{ fontSize: 10, fill: '#475569' }} stroke="rgba(15,23,42,0.08)" />
                  <YAxis tick={{ fontSize: 10, fill: '#475569' }} stroke="rgba(15,23,42,0.08)" />
                  <Tooltip contentStyle={{ backgroundColor: '#FFFFFF', borderColor: 'rgba(15,23,42,0.08)', borderRadius: '8px', color: '#0F172A' }} />
                  <Area type="monotone" dataKey="count" name="Số yêu cầu" stroke="#3B82F6" strokeWidth={2} fillOpacity={1} fill="url(#colorCount)" />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-text-muted text-sm">Chưa có dữ liệu thống kê theo thời gian.</div>
            )}
          </div>
        </div>

        {/* Chart 2: Pie distribution - Right Column */}
        <div className="glass-panel p-6 md:p-7 lg:col-span-4 section-stack">
          <div>
            <h3 className="font-bold text-base">Tỷ lệ phân bổ nhãn tin tức</h3>
            <p className="text-xs text-text-secondary">Phần trăm nhãn thật, giả và xung đột</p>
          </div>
          <div style={{ height: 280, width: '100%', minHeight: 280 }} className="relative flex items-center justify-center">
            {pieData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ backgroundColor: '#FFFFFF', borderColor: 'rgba(15,23,42,0.08)', borderRadius: '8px', color: '#0F172A' }} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-text-muted text-sm">Không có dữ liệu nhãn.</div>
            )}
          </div>
          {/* Legend */}
          <div className="grid grid-cols-3 gap-2 text-center pt-2">
            {pieData.map((item, idx) => (
              <div key={idx} className="space-y-1">
                <div className="text-[10px] text-text-secondary flex items-center justify-center gap-1">
                  <span className="w-2 h-2 rounded-full" style={{ backgroundColor: item.color }} />
                  {item.name}
                </div>
                <div className="text-sm font-bold">{item.value}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 xl:gap-7">
        {/* Chart 3: SLM Confidence over time */}
        <div className="glass-panel p-6 md:p-7 section-stack">
          <div>
            <h3 className="font-bold text-base flex items-center gap-2">
              <TrendingUp size={16} className="text-emerald-600" /> Phân bổ độ tự tin SLM theo thời gian
            </h3>
            <p className="text-xs text-text-secondary">Độ tự tin trung bình của mô hình dự đoán nhanh PhoBERT</p>
          </div>
          <div style={{ height: 310, width: '100%', minHeight: 310 }}>
            {charts?.slm_confidence_distribution && charts.slm_confidence_distribution.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={charts.slm_confidence_distribution} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(15,23,42,0.05)" />
                  <XAxis dataKey="time_label" tick={{ fontSize: 10, fill: '#475569' }} stroke="rgba(15,23,42,0.08)" />
                  <YAxis domain={[0, 1]} tickFormatter={(v) => `${(v * 100).toFixed(0)}%`} tick={{ fontSize: 10, fill: '#475569' }} stroke="rgba(15,23,42,0.08)" />
                  <Tooltip contentStyle={{ backgroundColor: '#FFFFFF', borderColor: 'rgba(15,23,42,0.08)', borderRadius: '8px', color: '#0F172A' }} formatter={(v) => `${(Number(v) * 100).toFixed(2)}%`} />
                  <Line type="monotone" dataKey="avg_confidence" name="Độ tự tin TB" stroke="#10B981" strokeWidth={2} dot={{ r: 3 }} activeDot={{ r: 5 }} />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-text-muted text-sm">Chưa có dữ liệu độ tự tin.</div>
            )}
          </div>
        </div>

        {/* Chart 4: SLM-LLM Agreement Count (>80%) */}
        <div className="glass-panel p-6 md:p-7 section-stack">
          <div>
            <h3 className="font-bold text-base flex items-center gap-2">
              <ShieldCheck size={16} className="text-violet-600" /> Biểu đồ đồng thuận cao (SLM & LLM)
            </h3>
            <p className="text-xs text-text-secondary">Số lượng tin SLM tự tin {'>'} 80% và kết quả trùng khớp với LLM</p>
          </div>
          <div style={{ height: 310, width: '100%', minHeight: 310 }}>
            {charts?.slm_llm_agreement_distribution && charts.slm_llm_agreement_distribution.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={charts.slm_llm_agreement_distribution} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(15,23,42,0.05)" />
                  <XAxis dataKey="time_label" tick={{ fontSize: 10, fill: '#475569' }} stroke="rgba(15,23,42,0.08)" />
                  <YAxis tick={{ fontSize: 10, fill: '#475569' }} stroke="rgba(15,23,42,0.08)" />
                  <Tooltip contentStyle={{ backgroundColor: '#FFFFFF', borderColor: 'rgba(15,23,42,0.08)', borderRadius: '8px', color: '#0F172A' }} />
                  <Bar dataKey="count" name="Số tin đồng thuận" fill="#8B5CF6" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-text-muted text-sm">Chưa có dữ liệu tin đồng thuận.</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
