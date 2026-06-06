import { useState, useEffect, useMemo, useCallback } from 'react';
import {
  BarChart3,
  Users,
  Monitor,
  TrendingUp,
  Clock,
  AlertCircle,
  Loader2,
  RefreshCw,
  Calendar,
  Download,
  PieChart,
  LineChart,
  BarChart,
  ArrowUpRight,
  ArrowDownRight,
  X,
  ChevronDown,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { statisticsApi, softwareApi } from '../lib/apiServices';
import { cn } from '../lib/utils';
import {
  BarChart as RechartsBarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart as RechartsPieChart,
  Pie,
  Cell,
  LineChart as RechartsLineChart,
  Line,
  AreaChart,
  Area,
} from 'recharts';
import type {
  StatisticsOverview,
  SoftwareUsageStats,
  DepartmentUsageStats,
  Software,
} from '../../shared/types';

type TabType = 'software' | 'department' | 'monthly' | 'turnover';
type TimeRangeType = '7d' | '30d' | '90d' | '1y' | 'custom';

const COLORS = [
  '#1e40af',
  '#3b82f6',
  '#60a5fa',
  '#93c5fd',
  '#10b981',
  '#059669',
  '#f59e0b',
  '#d97706',
  '#ef4444',
  '#dc2626',
  '#8b5cf6',
  '#7c3aed',
];

function getDateRange(
  range: TimeRangeType,
  customStartDate: string,
  customEndDate: string
): { startDate: string; endDate: string } {
  const now = new Date();
  const endDate = now.toISOString().split('T')[0];
  let startDate: string;

  switch (range) {
    case '7d':
      startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      break;
    case '30d':
      startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      break;
    case '90d':
      startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      break;
    case '1y':
      startDate = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      break;
    case 'custom':
      startDate = customStartDate || endDate;
      break;
    default:
      startDate = endDate;
  }

  return { startDate, endDate: customEndDate || endDate };
}

export default function StatisticsReport() {
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [overview, setOverview] = useState<StatisticsOverview | null>(null);
  const [softwareUsage, setSoftwareUsage] = useState<SoftwareUsageStats[]>([]);
  const [departmentUsage, setDepartmentUsage] = useState<DepartmentUsageStats[]>([]);
  const [monthlyUsage, setMonthlyUsage] = useState<{ month: string; activeLicenses: number; newApplications: number; revokedLicenses?: number }[]>([]);
  const [softwareList, setSoftwareList] = useState<Software[]>([]);
  const [activeTab, setActiveTab] = useState<TabType>('software');
  const [timeRange, setTimeRange] = useState<TimeRangeType>('30d');
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');

  const loadData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const { startDate, endDate } = getDateRange(timeRange, customStartDate, customEndDate);

      const [overviewRes, softwareUsageRes, departmentRes, monthlyRes, softwareRes] =
        await Promise.all([
          statisticsApi.getOverview(),
          statisticsApi.getSoftwareUsage(
            timeRange === 'custom' && customStartDate ? { startDate, endDate } : undefined
          ),
          statisticsApi.getDepartmentUsage(),
          statisticsApi.getMonthlyUsage(),
          softwareApi.getAll({ pageSize: 100 }),
        ]);

      if (overviewRes.success && overviewRes.data) {
        setOverview(overviewRes.data);
      }

      if (softwareUsageRes.success && softwareUsageRes.data) {
        setSoftwareUsage(softwareUsageRes.data);
      }

      if (departmentRes.success && departmentRes.data) {
        setDepartmentUsage(departmentRes.data);
      }

      if (monthlyRes.success && monthlyRes.data) {
        setMonthlyUsage(monthlyRes.data);
      }

      if (softwareRes.success && softwareRes.data) {
        setSoftwareList(softwareRes.data);
      }
    } catch (err) {
      setError('加载数据失败，请刷新重试');
      console.error('Failed to load statistics data:', err);
    } finally {
      setIsLoading(false);
    }
  }, [timeRange, customStartDate, customEndDate]);

  useEffect(() => {
    if (user && user.role !== 'admin') {
      navigate('/');
      return;
    }
    loadData();
  }, [user, navigate, loadData]);

  const usageRate = useMemo(() => {
    if (!overview) return 0;
    return overview.totalSeats > 0
      ? Math.round((overview.usedSeats / overview.totalSeats) * 1000) / 10
      : 0;
  }, [overview]);

  const turnoverData = useMemo(() => {
    return softwareList.map((sw) => {
      const usage = softwareUsage.find((s) => s.softwareId === sw.id);
      const turnoverRate = sw.averageUsageHours > 0 ? 30 / sw.averageUsageHours : 0;
      return {
        id: sw.id,
        name: sw.name,
        totalSeats: sw.totalSeats,
        usedSeats: sw.usedSeats,
        turnoverRate: Math.round(turnoverRate * 100) / 100,
        avgUsageHours: sw.averageUsageHours,
        usageRate: usage?.usageRate || 0,
      };
    }).sort((a, b) => b.turnoverRate - a.turnoverRate);
  }, [softwareList, softwareUsage]);

  const tabs: { key: TabType; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
    { key: 'software', label: '软件使用率', icon: BarChart },
    { key: 'department', label: '院系使用情况', icon: PieChart },
    { key: 'monthly', label: '月度趋势', icon: LineChart },
    { key: 'turnover', label: '席位周转', icon: TrendingUp },
  ];

  const timeRangeOptions: { key: TimeRangeType; label: string }[] = [
    { key: '7d', label: '近7天' },
    { key: '30d', label: '近30天' },
    { key: '90d', label: '近90天' },
    { key: '1y', label: '近1年' },
    { key: 'custom', label: '自定义' },
  ];

  function exportToCSV() {
    let csvContent = '';
    let filename = '';

    switch (activeTab) {
      case 'software':
        csvContent = '软件名称,使用时长(小时),使用率(%)\n';
        softwareUsage.forEach((item) => {
          csvContent += `${item.softwareName},${item.usageHours},${item.usageRate}\n`;
        });
        filename = '软件使用率统计.csv';
        break;
      case 'department':
        csvContent = '院系,活跃用户数,授权数\n';
        departmentUsage.forEach((item) => {
          csvContent += `${item.department},${item.userCount},${item.licenseCount}\n`;
        });
        filename = '院系使用情况统计.csv';
        break;
      case 'monthly':
        csvContent = '月份,新增申请,活跃授权,回收授权\n';
        monthlyUsage.forEach((item) => {
          csvContent += `${item.month},${item.newApplications || 0},${item.activeLicenses || 0},${item.revokedLicenses || 0}\n`;
        });
        filename = '月度趋势统计.csv';
        break;
      case 'turnover':
        csvContent = '软件名称,总席位数,已用席位,周转率,平均使用时长(小时),使用率(%)\n';
        turnoverData.forEach((item) => {
          csvContent += `${item.name},${item.totalSeats},${item.usedSeats},${item.turnoverRate},${item.avgUsageHours},${item.usageRate}\n`;
        });
        filename = '席位周转统计.csv';
        break;
    }

    const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  function handleCustomDateApply() {
    if (customStartDate && customEndDate) {
      setShowDatePicker(false);
      loadData();
    }
  }

  if (!user || user.role !== 'admin') {
    return null;
  }

  return (
    <div className="space-y-6">
      <div className="page-header opacity-0 animate-fade-in" style={{ animationFillMode: 'forwards' }}>
        <h1 className="page-title">统计报表</h1>
        <p className="page-subtitle">查看软件授权使用数据和分析报告</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        <div
          className="stat-card opacity-0 animate-fade-in-up"
          style={{ animationDelay: '0.1s', animationFillMode: 'forwards' }}
        >
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-gray-500 mb-1">软件总数</p>
              <p className="text-2xl font-bold text-primary-600">{overview?.totalSoftware || 0}</p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary-500 to-primary-700 flex items-center justify-center">
              <Monitor className="w-5 h-5 text-white" />
            </div>
          </div>
        </div>
        <div
          className="stat-card opacity-0 animate-fade-in-up"
          style={{ animationDelay: '0.15s', animationFillMode: 'forwards' }}
        >
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-gray-500 mb-1">席位总数</p>
              <p className="text-2xl font-bold text-indigo-600">{overview?.totalSeats || 0}</p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-indigo-700 flex items-center justify-center">
              <BarChart3 className="w-5 h-5 text-white" />
            </div>
          </div>
        </div>
        <div
          className="stat-card opacity-0 animate-fade-in-up"
          style={{ animationDelay: '0.2s', animationFillMode: 'forwards' }}
        >
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-gray-500 mb-1">使用率</p>
              <div className="flex items-center gap-2">
                <p className="text-2xl font-bold text-success-600">{usageRate}%</p>
                <ArrowUpRight className="w-4 h-4 text-success-600" />
              </div>
            </div>
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-success-500 to-success-700 flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-white" />
            </div>
          </div>
        </div>
        <div
          className="stat-card opacity-0 animate-fade-in-up"
          style={{ animationDelay: '0.25s', animationFillMode: 'forwards' }}
        >
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-gray-500 mb-1">活跃用户</p>
              <p className="text-2xl font-bold text-teal-600">{overview?.activeUsers || 0}</p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-teal-500 to-teal-700 flex items-center justify-center">
              <Users className="w-5 h-5 text-white" />
            </div>
          </div>
        </div>
        <div
          className="stat-card opacity-0 animate-fade-in-up"
          style={{ animationDelay: '0.3s', animationFillMode: 'forwards' }}
        >
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-gray-500 mb-1">待审批</p>
              <div className="flex items-center gap-2">
                <p className="text-2xl font-bold text-warning-600">{overview?.pendingApplications || 0}</p>
                <ArrowDownRight className="w-4 h-4 text-warning-600" />
              </div>
            </div>
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-warning-500 to-warning-700 flex items-center justify-center">
              <Clock className="w-5 h-5 text-white" />
            </div>
          </div>
        </div>
        <div
          className="stat-card opacity-0 animate-fade-in-up"
          style={{ animationDelay: '0.35s', animationFillMode: 'forwards' }}
        >
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-gray-500 mb-1">排队中</p>
              <p className="text-2xl font-bold text-danger-600">{overview?.queueLength || 0}</p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-danger-500 to-danger-700 flex items-center justify-center">
              <AlertCircle className="w-5 h-5 text-white" />
            </div>
          </div>
        </div>
      </div>

      <div
        className="card p-4 opacity-0 animate-fade-in-up"
        style={{ animationDelay: '0.4s', animationFillMode: 'forwards' }}
      >
        <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center justify-between">
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-gray-400" />
              {timeRangeOptions.map((option) => (
                <button
                  key={option.key}
                  onClick={() => {
                    setTimeRange(option.key);
                    if (option.key !== 'custom') {
                      setShowDatePicker(false);
                    }
                  }}
                  className={cn(
                    'px-3 py-1.5 rounded-lg text-sm font-medium transition-all',
                    timeRange === option.key
                      ? 'bg-primary-600 text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  )}
                >
                  {option.label}
                </button>
              ))}
            </div>
            {timeRange === 'custom' && (
              <button
                onClick={() => setShowDatePicker(!showDatePicker)}
                className="btn-outline text-sm py-1.5 flex items-center gap-2"
              >
                选择日期
                <ChevronDown className="w-4 h-4" />
              </button>
            )}
          </div>
          <div className="flex items-center gap-3">
            <button onClick={loadData} className="btn-ghost" disabled={isLoading}>
              <RefreshCw className={cn('w-4 h-4', isLoading && 'animate-spin')} />
              刷新
            </button>
            <button onClick={exportToCSV} className="btn-outline">
              <Download className="w-4 h-4" />
              导出CSV
            </button>
          </div>
        </div>

        {showDatePicker && (
          <div className="mt-4 p-4 bg-gray-50 rounded-lg flex flex-wrap gap-4 items-end">
            <div>
              <label className="input-label">开始日期</label>
              <input
                type="date"
                value={customStartDate}
                onChange={(e) => setCustomStartDate(e.target.value)}
                className="input"
              />
            </div>
            <div>
              <label className="input-label">结束日期</label>
              <input
                type="date"
                value={customEndDate}
                onChange={(e) => setCustomEndDate(e.target.value)}
                className="input"
              />
            </div>
            <button
              onClick={handleCustomDateApply}
              className="btn-primary"
              disabled={!customStartDate || !customEndDate}
            >
              应用
            </button>
            <button onClick={() => setShowDatePicker(false)} className="btn-ghost">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>

      <div
        className="card overflow-hidden opacity-0 animate-fade-in-up"
        style={{ animationDelay: '0.5s', animationFillMode: 'forwards' }}
      >
        <div className="border-b border-gray-100">
          <div className="flex">
            {tabs.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={cn(
                  'flex items-center gap-2 px-6 py-4 text-sm font-medium border-b-2 transition-all',
                  activeTab === tab.key
                    ? 'border-primary-600 text-primary-600 bg-primary-50/50'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                )}
              >
                <tab.icon className="w-4 h-4" />
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-24">
            <Loader2 className="w-8 h-8 text-primary-600 animate-spin" />
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <AlertCircle className="w-16 h-16 text-danger-400 mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">加载失败</h3>
            <p className="text-gray-500 mb-4">{error}</p>
            <button onClick={loadData} className="btn-primary">
              <RefreshCw className="w-4 h-4" />
              重新加载
            </button>
          </div>
        ) : (
          <div className="p-6">
            {activeTab === 'software' && (
              <div className="space-y-6 animate-fade-in">
                <h3 className="text-lg font-semibold text-gray-900 font-serif">软件使用率排名</h3>
                <div className="h-[500px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <RechartsBarChart
                      data={softwareUsage.sort((a, b) => b.usageRate - a.usageRate)}
                      layout="vertical"
                      margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} />
                      <XAxis type="number" domain={[0, 100]} unit="%" />
                      <YAxis dataKey="softwareName" type="category" width={120} />
                      <Tooltip
                        formatter={(value: number, name: string) => [
                          `${value}%`,
                          name === 'usageRate' ? '使用率' : name,
                        ]}
                        contentStyle={{
                          borderRadius: '8px',
                          border: '1px solid #e5e7eb',
                          boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                        }}
                      />
                      <Legend />
                      <Bar
                        dataKey="usageRate"
                        name="使用率"
                        fill="#1e40af"
                        radius={[0, 4, 4, 0]}
                        animationDuration={1000}
                      />
                    </RechartsBarChart>
                  </ResponsiveContainer>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-6">
                  {softwareUsage
                    .sort((a, b) => b.usageHours - a.usageHours)
                    .slice(0, 6)
                    .map((item, index) => (
                      <div
                        key={item.softwareId}
                        className="card p-4 hover:shadow-md transition-all"
                        style={{
                          animation: `fadeInUp 0.5s ease-out ${index * 0.1}s both`,
                        }}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-medium text-gray-900">{item.softwareName}</span>
                          <span className="text-2xl">
                            {softwareList.find((s) => s.id === item.softwareId)?.icon}
                          </span>
                        </div>
                        <div className="flex items-end justify-between">
                          <div>
                            <p className="text-2xl font-bold text-primary-600">
                              {Math.round(item.usageHours)}
                            </p>
                            <p className="text-sm text-gray-500">使用时长(小时)</p>
                          </div>
                          <div className="text-right">
                            <p className="text-xl font-bold text-success-600">{item.usageRate}%</p>
                            <p className="text-sm text-gray-500">使用率</p>
                          </div>
                        </div>
                        <div className="mt-3 progress-bar">
                          <div
                            className="progress-bar-fill bg-gradient-to-r from-primary-500 to-primary-600"
                            style={{ width: `${item.usageRate}%` }}
                          />
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            )}

            {activeTab === 'department' && (
              <div className="space-y-6 animate-fade-in">
                <h3 className="text-lg font-semibold text-gray-900 font-serif">院系使用情况分布</h3>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                  <div className="h-[500px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <RechartsPieChart>
                        <Pie
                          data={departmentUsage}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          label={({ department, percent }) =>
                            `${department} ${(percent * 100).toFixed(0)}%`
                          }
                          outerRadius={150}
                          fill="#8884d8"
                          dataKey="licenseCount"
                          animationDuration={1000}
                        >
                          {departmentUsage.map((entry, index) => (
                            <Cell
                              key={`cell-${index}`}
                              fill={COLORS[index % COLORS.length]}
                            />
                          ))}
                        </Pie>
                        <Tooltip
                          formatter={(value: number, name: string) => [
                            value,
                            name === 'userCount' ? '活跃用户' : name === 'licenseCount' ? '授权数' : name,
                          ]}
                          contentStyle={{
                            borderRadius: '8px',
                            border: '1px solid #e5e7eb',
                            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                          }}
                        />
                        <Legend />
                      </RechartsPieChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="h-[500px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <RechartsBarChart
                        data={departmentUsage}
                        margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="department" angle={-45} textAnchor="end" height={100} />
                        <YAxis />
                        <Tooltip
                          contentStyle={{
                            borderRadius: '8px',
                            border: '1px solid #e5e7eb',
                            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                          }}
                        />
                        <Legend />
                        <Bar
                          dataKey="userCount"
                          name="活跃用户"
                          fill="#3b82f6"
                          radius={[4, 4, 0, 0]}
                          animationDuration={1000}
                        />
                        <Bar
                          dataKey="licenseCount"
                          name="授权数"
                          fill="#10b981"
                          radius={[4, 4, 0, 0]}
                          animationDuration={1000}
                        />
                      </RechartsBarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
                <div className="overflow-x-auto mt-6">
                  <table className="w-full">
                    <thead>
                      <tr>
                        <th className="table-header">院系</th>
                        <th className="table-header">活跃用户数</th>
                        <th className="table-header">授权数</th>
                        <th className="table-header">人均授权</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {departmentUsage.map((dept, index) => (
                        <tr
                          key={dept.department}
                          className="hover:bg-gray-50 transition-colors"
                          style={{
                            animation: `fadeInUp 0.5s ease-out ${index * 0.05}s both`,
                          }}
                        >
                          <td className="table-cell">
                            <div className="flex items-center gap-2">
                              <div
                                className="w-3 h-3 rounded-full"
                                style={{ backgroundColor: COLORS[index % COLORS.length] }}
                              />
                              {dept.department}
                            </div>
                          </td>
                          <td className="table-cell">{dept.userCount}</td>
                          <td className="table-cell">{dept.licenseCount}</td>
                          <td className="table-cell">
                            {dept.userCount > 0
                              ? (dept.licenseCount / dept.userCount).toFixed(2)
                              : '-'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {activeTab === 'monthly' && (
              <div className="space-y-6 animate-fade-in">
                <h3 className="text-lg font-semibold text-gray-900 font-serif">近12个月趋势分析</h3>
                <div className="h-[500px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <RechartsLineChart
                      data={monthlyUsage}
                      margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="month" />
                      <YAxis />
                      <Tooltip
                        contentStyle={{
                          borderRadius: '8px',
                          border: '1px solid #e5e7eb',
                          boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                        }}
                      />
                      <Legend />
                      <Line
                        type="monotone"
                        dataKey="newApplications"
                        name="新增申请"
                        stroke="#3b82f6"
                        strokeWidth={2}
                        dot={{ r: 4 }}
                        activeDot={{ r: 6 }}
                        animationDuration={1000}
                      />
                      <Line
                        type="monotone"
                        dataKey="activeLicenses"
                        name="活跃授权"
                        stroke="#10b981"
                        strokeWidth={2}
                        dot={{ r: 4 }}
                        activeDot={{ r: 6 }}
                        animationDuration={1000}
                      />
                      <Line
                        type="monotone"
                        dataKey="revokedLicenses"
                        name="回收授权"
                        stroke="#ef4444"
                        strokeWidth={2}
                        dot={{ r: 4 }}
                        activeDot={{ r: 6 }}
                        animationDuration={1000}
                      />
                    </RechartsLineChart>
                  </ResponsiveContainer>
                </div>
                <div className="h-[300px] mt-6">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart
                      data={monthlyUsage}
                      margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
                    >
                      <defs>
                        <linearGradient id="colorActive" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#10b981" stopOpacity={0.8} />
                          <stop offset="95%" stopColor="#10b981" stopOpacity={0.1} />
                        </linearGradient>
                        <linearGradient id="colorNew" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8} />
                          <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.1} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="month" />
                      <YAxis />
                      <Tooltip
                        contentStyle={{
                          borderRadius: '8px',
                          border: '1px solid #e5e7eb',
                          boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                        }}
                      />
                      <Legend />
                      <Area
                        type="monotone"
                        dataKey="activeLicenses"
                        name="活跃授权"
                        stroke="#10b981"
                        fillOpacity={1}
                        fill="url(#colorActive)"
                        animationDuration={1000}
                      />
                      <Area
                        type="monotone"
                        dataKey="newApplications"
                        name="新增申请"
                        stroke="#3b82f6"
                        fillOpacity={1}
                        fill="url(#colorNew)"
                        animationDuration={1000}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}

            {activeTab === 'turnover' && (
              <div className="space-y-6 animate-fade-in">
                <h3 className="text-lg font-semibold text-gray-900 font-serif">席位周转情况</h3>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr>
                        <th className="table-header">软件名称</th>
                        <th className="table-header">总席位数</th>
                        <th className="table-header">已用席位</th>
                        <th className="table-header">使用率</th>
                        <th className="table-header">平均使用时长</th>
                        <th className="table-header">周转率</th>
                        <th className="table-header">周转状态</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {turnoverData.map((item, index) => (
                        <tr
                          key={item.id}
                          className="hover:bg-gray-50 transition-colors"
                          style={{
                            animation: `fadeInUp 0.5s ease-out ${index * 0.05}s both`,
                          }}
                        >
                          <td className="table-cell">
                            <div className="flex items-center gap-2">
                              <span className="text-xl">
                                {softwareList.find((s) => s.id === item.id)?.icon}
                              </span>
                              <span className="font-medium">{item.name}</span>
                            </div>
                          </td>
                          <td className="table-cell">{item.totalSeats}</td>
                          <td className="table-cell">
                            <span className={cn(
                              item.usedSeats >= item.totalSeats ? 'text-danger-600 font-medium' : ''
                            )}>
                              {item.usedSeats}
                            </span>
                          </td>
                          <td className="table-cell">
                            <div className="flex items-center gap-2">
                              <div className="w-20 progress-bar">
                                <div
                                  className={cn(
                                    'progress-bar-fill',
                                    item.usageRate >= 80
                                      ? 'bg-danger-500'
                                      : item.usageRate >= 60
                                      ? 'bg-warning-500'
                                      : 'bg-success-500'
                                  )}
                                  style={{ width: `${item.usageRate}%` }}
                                />
                              </div>
                              <span className="text-sm">{item.usageRate}%</span>
                            </div>
                          </td>
                          <td className="table-cell">{item.avgUsageHours} 小时</td>
                          <td className="table-cell font-medium">{item.turnoverRate}</td>
                          <td className="table-cell">
                            <span
                              className={cn(
                                'badge',
                                item.turnoverRate >= 3
                                  ? 'bg-success-100 text-success-700'
                                  : item.turnoverRate >= 1.5
                                  ? 'bg-warning-100 text-warning-700'
                                  : 'bg-danger-100 text-danger-700'
                              )}
                            >
                              {item.turnoverRate >= 3
                                ? '周转良好'
                                : item.turnoverRate >= 1.5
                                ? '周转一般'
                                : '周转缓慢'}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mt-6">
                  {turnoverData.slice(0, 4).map((item, index) => (
                    <div
                      key={item.id}
                      className="card p-4"
                      style={{
                        animation: `fadeInUp 0.5s ease-out ${index * 0.1}s both`,
                      }}
                    >
                      <div className="flex items-center gap-3 mb-3">
                        <span className="text-2xl">
                          {softwareList.find((s) => s.id === item.id)?.icon}
                        </span>
                        <span className="font-medium text-gray-900">{item.name}</span>
                      </div>
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-500">周转率</span>
                          <span className="font-semibold text-primary-600">
                            {item.turnoverRate}
                          </span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-500">使用时长</span>
                          <span className="font-medium">{item.avgUsageHours}h</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-500">席位使用</span>
                          <span className="font-medium">
                            {item.usedSeats}/{item.totalSeats}
                          </span>
                        </div>
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
  );
}
