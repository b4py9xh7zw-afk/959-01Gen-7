import { useEffect, useState } from 'react';
import {
  Package,
  Users,
  Key,
  Clock,
  FileText,
  TrendingUp,
  ArrowUpRight,
  ArrowDownRight,
  Loader2,
  Plus,
  ChevronRight,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { statisticsApi, applicationApi, softwareApi } from '../lib/apiServices';
import { StatusBadge, CategoryBadge } from '../components/Badges';
import type { StatisticsOverview } from '../../shared/types';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
} from 'recharts';

interface StatCardProps {
  title: string;
  value: number | string;
  icon: React.ComponentType<any>;
  trend?: { value: number; isUp: boolean };
  color: string;
  delay: number;
}

function StatCard({ title, value, icon: Icon, trend, color, delay }: StatCardProps) {
  return (
    <div
      className="stat-card opacity-0 animate-fade-in-up"
      style={{ animationDelay: `${delay}s`, animationFillMode: 'forwards' }}
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-gray-500 mb-1">{title}</p>
          <p className="text-3xl font-bold text-gray-900">{value}</p>
          {trend && (
            <div className={`flex items-center gap-1 mt-2 text-sm ${trend.isUp ? 'text-success-600' : 'text-danger-600'}`}>
              {trend.isUp ? <ArrowUpRight className="w-4 h-4" /> : <ArrowDownRight className="w-4 h-4" />}
              <span>{trend.value}% 较上月</span>
            </div>
          )}
        </div>
        <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${color}`}>
          <Icon className="w-6 h-6 text-white" />
        </div>
      </div>
    </div>
  );
}

export default function Dashboard() {
  const { user } = useAuthStore();
  const [overview, setOverview] = useState<StatisticsOverview | null>(null);
  const [popularSoftware, setPopularSoftware] = useState<any[]>([]);
  const [recentActivity, setRecentActivity] = useState<any[]>([]);
  const [monthlyData, setMonthlyData] = useState<any[]>([]);
  const [pendingCount, setPendingCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      const [overviewRes, popularRes, activityRes, monthlyRes, pendingRes] = await Promise.all([
        statisticsApi.getOverview(),
        statisticsApi.getPopularSoftware(5),
        statisticsApi.getRecentActivity(8),
        statisticsApi.getMonthlyUsage(),
        applicationApi.getPendingCount(user?.department),
      ]);

      if (overviewRes.success && overviewRes.data) setOverview(overviewRes.data);
      if (popularRes.success && popularRes.data) setPopularSoftware(popularRes.data);
      if (activityRes.success && activityRes.data) setRecentActivity(activityRes.data);
      if (monthlyRes.success && monthlyRes.data) setMonthlyData(monthlyRes.data);
      if (pendingRes.success && pendingRes.data) setPendingCount(pendingRes.data.count);
    } catch (error) {
      console.error('Failed to load dashboard data:', error);
    } finally {
      setIsLoading(false);
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="w-8 h-8 text-primary-600 animate-spin" />
      </div>
    );
  }

  const actionItems = [];
  if (user?.role === 'admin' || user?.role === 'teacher') {
    actionItems.push({
      title: '待处理审批',
      count: pendingCount,
      path: '/approval',
      color: 'bg-warning-500',
    });
  }
  actionItems.push(
    { title: '浏览软件', count: overview?.totalSoftware || 0, path: '/software', color: 'bg-primary-500' },
    { title: '我的授权', count: overview?.usedSeats || 0, path: '/licenses', color: 'bg-success-500' }
  );

  return (
    <div className="space-y-8">
      <div className="page-header opacity-0 animate-fade-in" style={{ animationFillMode: 'forwards' }}>
        <h1 className="page-title">
          欢迎回来，{user?.name} 👋
        </h1>
        <p className="page-subtitle">
          {new Date().toLocaleDateString('zh-CN', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            weekday: 'long',
          })}
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="可用软件"
          value={overview?.totalSoftware || 0}
          icon={Package}
          color="bg-gradient-to-br from-primary-500 to-primary-700"
          delay={0.1}
        />
        <StatCard
          title="总席位"
          value={overview?.totalSeats || 0}
          icon={Key}
          color="bg-gradient-to-br from-success-500 to-success-700"
          trend={{ value: 12, isUp: true }}
          delay={0.2}
        />
        <StatCard
          title="活跃用户"
          value={overview?.activeUsers || 0}
          icon={Users}
          color="bg-gradient-to-br from-warning-500 to-warning-700"
          trend={{ value: 8, isUp: true }}
          delay={0.3}
        />
        <StatCard
          title="排队中"
          value={overview?.queueLength || 0}
          icon={Clock}
          color="bg-gradient-to-br from-purple-500 to-purple-700"
          delay={0.4}
        />
      </div>

      {(user?.role === 'admin' || user?.role === 'teacher') && actionItems.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {actionItems.map((item, index) => (
            <Link
              key={item.path}
              to={item.path}
              className="card-hover p-6 opacity-0 animate-fade-in-up"
              style={{ animationDelay: `${0.5 + index * 0.1}s`, animationFillMode: 'forwards' }}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className={`w-12 h-12 rounded-xl ${item.color} flex items-center justify-center`}>
                    {item.title === '待处理审批' ? (
                      <FileText className="w-6 h-6 text-white" />
                    ) : item.title === '浏览软件' ? (
                      <Package className="w-6 h-6 text-white" />
                    ) : (
                      <Key className="w-6 h-6 text-white" />
                    )}
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900">{item.title}</p>
                    <p className="text-2xl font-bold text-gray-900">{item.count}</p>
                  </div>
                </div>
                <ChevronRight className="w-5 h-5 text-gray-400" />
              </div>
            </Link>
          ))}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 card p-6 opacity-0 animate-fade-in-up" style={{ animationDelay: '0.6s', animationFillMode: 'forwards' }}>
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">使用趋势</h3>
              <p className="text-sm text-gray-500">近6个月授权与申请统计</p>
            </div>
            <div className="flex items-center gap-4 text-sm">
              <span className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-primary-600" />
                活跃授权
              </span>
              <span className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-success-500" />
                新增申请
              </span>
            </div>
          </div>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={monthlyData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="month" stroke="#9ca3af" fontSize={12} />
                <YAxis stroke="#9ca3af" fontSize={12} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'white',
                    border: 'none',
                    borderRadius: '12px',
                    boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="activeLicenses"
                  stroke="#1e40af"
                  strokeWidth={3}
                  dot={{ fill: '#1e40af', strokeWidth: 2, r: 4 }}
                  activeDot={{ r: 6 }}
                  name="活跃授权"
                />
                <Line
                  type="monotone"
                  dataKey="newApplications"
                  stroke="#10b981"
                  strokeWidth={3}
                  dot={{ fill: '#10b981', strokeWidth: 2, r: 4 }}
                  activeDot={{ r: 6 }}
                  name="新增申请"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="card p-6 opacity-0 animate-fade-in-up" style={{ animationDelay: '0.7s', animationFillMode: 'forwards' }}>
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">热门软件</h3>
              <p className="text-sm text-gray-500">按使用率排序</p>
            </div>
            <Link to="/software" className="text-sm text-primary-600 hover:text-primary-700 flex items-center gap-1">
              查看全部 <ChevronRight className="w-4 h-4" />
            </Link>
          </div>
          <div className="space-y-4">
            {popularSoftware.map((sw, index) => (
              <div
                key={sw.id}
                className="flex items-center gap-4 p-3 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center text-xl">
                  {sw.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-medium text-gray-900 truncate">{sw.name}</p>
                    <CategoryBadge category={sw.category} />
                  </div>
                  <div className="flex items-center gap-2 mt-1">
                    <div className="flex-1 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-primary-500 to-primary-600 rounded-full"
                        style={{ width: `${sw.utilizationRate}%` }}
                      />
                    </div>
                    <span className="text-xs text-gray-500">{Math.round(sw.utilizationRate)}%</span>
                  </div>
                </div>
                {sw.queueLength > 0 && (
                  <div className="flex items-center gap-1 text-xs text-warning-600 bg-warning-50 px-2 py-1 rounded-full">
                    <Clock className="w-3 h-3" />
                    {sw.queueLength}人排队
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card p-6 opacity-0 animate-fade-in-up" style={{ animationDelay: '0.8s', animationFillMode: 'forwards' }}>
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">最近活动</h3>
              <p className="text-sm text-gray-500">系统使用日志</p>
            </div>
          </div>
          <div className="space-y-3 max-h-80 overflow-y-auto scrollbar-thin">
            {recentActivity.map((activity, index) => (
              <div
                key={activity.id}
                className="flex items-start gap-4 p-3 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center text-white text-xs font-semibold flex-shrink-0">
                  {activity.userName?.charAt(0)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-gray-900">
                    <span className="font-medium">{activity.userName}</span>
                    {' '}
                    {activity.action === 'activate' ? '激活了' : activity.action === 'deactivate' ? '停用了' : activity.action === 'checkout' ? '签出了' : '归还了'}
                    {' '}
                    <span className="font-medium">{activity.softwareName}</span>
                    {' '}
                    {activity.softwareIcon}
                  </p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {new Date(activity.timestamp).toLocaleString('zh-CN')}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="card p-6 opacity-0 animate-fade-in-up" style={{ animationDelay: '0.9s', animationFillMode: 'forwards' }}>
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">席位使用率</h3>
              <p className="text-sm text-gray-500">各软件席位占用情况</p>
            </div>
          </div>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={popularSoftware.map(sw => ({
                  name: sw.name,
                  已用: sw.usedSeats,
                  可用: sw.totalSeats - sw.usedSeats,
                }))}
                layout="vertical"
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis type="number" stroke="#9ca3af" fontSize={12} />
                <YAxis dataKey="name" type="category" stroke="#9ca3af" fontSize={12} width={80} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'white',
                    border: 'none',
                    borderRadius: '12px',
                    boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
                  }}
                />
                <Bar dataKey="可用" stackId="a" fill="#10b981" radius={[0, 4, 4, 0]} />
                <Bar dataKey="已用" stackId="a" fill="#1e40af" radius={[4, 0, 0, 4]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {user?.role === 'admin' && (
        <div className="flex justify-end gap-4 opacity-0 animate-fade-in" style={{ animationDelay: '1s', animationFillMode: 'forwards' }}>
          <Link to="/apply/" className="btn-primary">
            <Plus className="w-4 h-4" />
            新增加软件
          </Link>
        </div>
      )}
    </div>
  );
}
