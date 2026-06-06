import { useState, useEffect, useMemo, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  ArrowLeft,
  Loader2,
  AlertCircle,
  Package,
  Users,
  CheckCircle,
  Clock,
  Calendar,
  Building2,
  Tag,
  TrendingUp,
  BarChart3,
  UserPlus,
  RefreshCw,
} from 'lucide-react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { softwareApi, queueApi, applicationApi } from '../lib/apiServices';
import { useAuthStore } from '../store/authStore';
import { StatusBadge, CategoryBadge } from '../components/Badges';
import type { Software, QueueResponse } from '../../shared/types';

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

function formatCurrency(amount: number) {
  return new Intl.NumberFormat('zh-CN', {
    style: 'currency',
    currency: 'CNY',
  }).format(amount);
}

function generateUsageData() {
  const data = [];
  const today = new Date();
  for (let i = 29; i >= 0; i--) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);
    data.push({
      date: `${date.getMonth() + 1}/${date.getDate()}`,
      usage: Math.floor(Math.random() * 40) + 50,
    });
  }
  return data;
}

interface StatCardProps {
  icon: React.ElementType;
  label: string;
  value: string | number;
  color: string;
  delay: number;
}

function StatCard({ icon: Icon, label, value, color, delay }: StatCardProps) {
  return (
    <div
      className="stat-card opacity-0 animate-fade-in-up"
      style={{ animationDelay: `${delay}s`, animationFillMode: 'forwards' }}
    >
      <div
        className="stat-card::before"
        style={{ backgroundColor: color }}
      />
      <div className="flex items-center gap-4">
        <div
          className="w-12 h-12 rounded-xl flex items-center justify-center"
          style={{ backgroundColor: `${color}20`, color }}
        >
          <Icon className="w-6 h-6" />
        </div>
        <div>
          <p className="text-sm text-gray-500 mb-1">{label}</p>
          <p className="text-2xl font-bold text-gray-900">{value}</p>
        </div>
      </div>
    </div>
  );
}

export default function SoftwareDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [software, setSoftware] = useState<Software | null>(null);
  const [queueData, setQueueData] = useState<QueueResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isApplying, setIsApplying] = useState(false);
  const [isJoiningQueue, setIsJoiningQueue] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [applicationSuccess, setApplicationSuccess] = useState(false);
  const [queueSuccess, setQueueSuccess] = useState(false);

  const usageData = useMemo(() => generateUsageData(), []);

  const loadData = useCallback(async () => {
    if (!id) return;
    setIsLoading(true);
    setError(null);
    try {
      const [softwareRes, queueRes] = await Promise.all([
        softwareApi.getById(id),
        queueApi.getQueue(id),
      ]);

      if (softwareRes.success && softwareRes.data) {
        setSoftware(softwareRes.data);
      } else {
        setError(softwareRes.message || '加载软件信息失败');
      }

      if (queueRes.success && queueRes.data) {
        setQueueData(queueRes.data);
      }
    } catch (err) {
      setError('加载数据失败，请稍后重试');
      console.error('Failed to load data:', err);
    } finally {
      setIsLoading(false);
    }
  }, [id]);

  useEffect(() => {
    if (id) {
      loadData();
    }
  }, [id, loadData]);

  const handleApply = async () => {
    if (!software || !user) return;
    setIsApplying(true);
    try {
      navigate(`/apply/${software.id}`);
    } catch (err) {
      console.error('Failed to apply:', err);
    } finally {
      setIsApplying(false);
    }
  };

  const handleQuickApply = async () => {
    if (!software || !user) return;
    setIsApplying(true);
    try {
      const response = await applicationApi.create({
        userId: user.id,
        softwareId: software.id,
        purpose: '个人学习使用',
        type: 'personal',
        department: user.department,
        startDate: new Date().toISOString().split('T')[0],
        endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      });

      if (response.success && response.data) {
        setApplicationSuccess(true);
        setTimeout(() => {
          navigate('/licenses');
        }, 2000);
      }
    } catch (err) {
      setError('申请失败，请稍后重试');
      console.error('Failed to create application:', err);
    } finally {
      setIsApplying(false);
    }
  };

  const handleJoinQueue = async () => {
    if (!software || !user) return;
    setIsJoiningQueue(true);
    try {
      const appResponse = await applicationApi.create({
        userId: user.id,
        softwareId: software.id,
        purpose: '个人学习使用',
        type: 'personal',
        department: user.department,
        startDate: new Date().toISOString().split('T')[0],
        endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      });

      if (appResponse.success && appResponse.data) {
        const queueResponse = await queueApi.joinQueue(software.id, appResponse.data.id);
        if (queueResponse.success) {
          setQueueSuccess(true);
          setTimeout(() => {
            navigate('/queue');
          }, 2000);
        }
      }
    } catch (err) {
      setError('加入排队失败，请稍后重试');
      console.error('Failed to join queue:', err);
    } finally {
      setIsJoiningQueue(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="w-8 h-8 text-primary-600 animate-spin" />
      </div>
    );
  }

  if (error || !software) {
    return (
      <div className="card p-12 text-center opacity-0 animate-fade-in">
        <AlertCircle className="w-16 h-16 text-danger-500 mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-gray-900 mb-2">加载失败</h3>
        <p className="text-gray-500 mb-6">{error || '未找到该软件'}</p>
        <div className="flex items-center justify-center gap-4">
          <button onClick={loadData} className="btn-outline">
            <RefreshCw className="w-4 h-4" />
            重试
          </button>
          <Link to="/software" className="btn-primary">
            <ArrowLeft className="w-4 h-4" />
            返回列表
          </Link>
        </div>
      </div>
    );
  }

  const availableSeats = software.totalSeats - software.usedSeats;
  const usageRate = software.totalSeats > 0 ? (software.usedSeats / software.totalSeats) * 100 : 0;
  const isExpired = new Date(software.expirationDate) < new Date();

  return (
    <div className="space-y-6 opacity-0 animate-fade-in">
      <div className="flex items-center gap-4 mb-6">
        <button
          onClick={() => navigate('/software')}
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <ArrowLeft className="w-5 h-5 text-gray-600" />
        </button>
        <div>
          <h1 className="font-serif text-2xl font-bold text-gray-900">软件详情</h1>
          <p className="text-sm text-gray-500">查看软件信息和申请使用席位</p>
        </div>
      </div>

      {applicationSuccess && (
        <div className="bg-success-50 border border-success-200 rounded-xl p-4 flex items-center gap-3 opacity-0 animate-fade-in">
          <CheckCircle className="w-5 h-5 text-success-600 flex-shrink-0" />
          <div>
            <p className="font-medium text-success-800">申请提交成功！</p>
            <p className="text-sm text-success-600">正在跳转到我的授权页面...</p>
          </div>
        </div>
      )}

      {queueSuccess && (
        <div className="bg-warning-50 border border-warning-200 rounded-xl p-4 flex items-center gap-3 opacity-0 animate-fade-in">
          <Clock className="w-5 h-5 text-warning-600 flex-shrink-0" />
          <div>
            <p className="font-medium text-warning-800">已加入排队队列！</p>
            <p className="text-sm text-warning-600">正在跳转到排队查询页面...</p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div
            className="card p-6 opacity-0 animate-fade-in-up"
            style={{ animationFillMode: 'forwards' }}
          >
            <div className="flex flex-col sm:flex-row items-start gap-6">
              <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center text-5xl flex-shrink-0">
                {software.icon}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-3 mb-2">
                  <h2 className="font-serif text-2xl font-bold text-gray-900">
                    {software.name}
                  </h2>
                  <CategoryBadge category={software.category} />
                  <StatusBadge status={isExpired ? 'expired' : 'active'} />
                </div>
                <div className="flex flex-wrap items-center gap-4 text-sm text-gray-500 mb-4">
                  <span className="flex items-center gap-1">
                    <Tag className="w-4 h-4" />
                    v{software.version}
                  </span>
                  <span className="flex items-center gap-1">
                    <Building2 className="w-4 h-4" />
                    {software.vendor}
                  </span>
                  <span className="flex items-center gap-1">
                    <TrendingUp className="w-4 h-4" />
                    {software.averageUsageHours.toFixed(1)} 小时/天
                  </span>
                </div>
                <p className="text-gray-600 leading-relaxed">{software.description}</p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div
              className="card p-6 opacity-0 animate-fade-in-up"
              style={{ animationDelay: '0.1s', animationFillMode: 'forwards' }}
            >
              <h3 className="font-serif text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <Calendar className="w-5 h-5 text-primary-600" />
                采购信息
              </h3>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-gray-500">采购价格</span>
                  <span className="font-semibold text-gray-900">
                    {formatCurrency(software.price)}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-500">采购日期</span>
                  <span className="text-gray-900">{formatDate(software.purchaseDate)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-500">到期日期</span>
                  <span className={isExpired ? 'text-danger-600 font-semibold' : 'text-gray-900'}>
                    {formatDate(software.expirationDate)}
                  </span>
                </div>
              </div>
            </div>

            <div
              className="card p-6 opacity-0 animate-fade-in-up"
              style={{ animationDelay: '0.2s', animationFillMode: 'forwards' }}
            >
              <h3 className="font-serif text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <Users className="w-5 h-5 text-primary-600" />
                排队队列
              </h3>
              {queueData && queueData.items.length > 0 ? (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-gray-500">当前排队人数</span>
                    <span className="font-semibold text-warning-600">
                      {queueData.items.length} 人
                    </span>
                  </div>
                  {queueData.currentUserPosition && (
                    <div className="bg-warning-50 rounded-lg p-3">
                      <p className="text-sm text-warning-700 font-medium mb-1">
                        您的排队位置
                      </p>
                      <p className="text-2xl font-bold text-warning-600">
                        第 {queueData.currentUserPosition.position} 位
                      </p>
                      <p className="text-xs text-warning-600 mt-1">
                        预计等待约 {queueData.currentUserPosition.estimatedWaitTime} 分钟
                      </p>
                    </div>
                  )}
                  <div className="text-xs text-gray-500">
                    最近排队者：
                    {queueData.items.slice(0, 3).map((item, index) => (
                      <span key={item.id}>
                        {index > 0 && '、'}
                        用户{item.userId.slice(-4)}
                      </span>
                    ))}
                    {queueData.items.length > 3 && ' 等'}
                  </div>
                </div>
              ) : (
                <div className="text-center py-4">
                  <CheckCircle className="w-10 h-10 text-success-500 mx-auto mb-2" />
                  <p className="text-gray-600">暂无排队</p>
                  <p className="text-sm text-gray-500">席位充足，可直接申请</p>
                </div>
              )}
            </div>
          </div>

          <div
            className="card p-6 opacity-0 animate-fade-in-up"
            style={{ animationDelay: '0.3s', animationFillMode: 'forwards' }}
          >
            <h3 className="font-serif text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-primary-600" />
              近30天使用率趋势
            </h3>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={usageData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorUsage" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis
                    dataKey="date"
                    tick={{ fontSize: 12, fill: '#9ca3af' }}
                    tickLine={false}
                    axisLine={{ stroke: '#e5e7eb' }}
                  />
                  <YAxis
                    tick={{ fontSize: 12, fill: '#9ca3af' }}
                    tickLine={false}
                    axisLine={{ stroke: '#e5e7eb' }}
                    domain={[0, 100]}
                    tickFormatter={(value) => `${value}%`}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#fff',
                      border: '1px solid #e5e7eb',
                      borderRadius: '8px',
                      boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                    }}
                    formatter={(value: number) => [`${value}%`, '使用率']}
                  />
                  <Area
                    type="monotone"
                    dataKey="usage"
                    stroke="#3b82f6"
                    strokeWidth={2}
                    fill="url(#colorUsage)"
                    animationDuration={1500}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div
            className="card p-6 opacity-0 animate-fade-in-up"
            style={{ animationDelay: '0.15s', animationFillMode: 'forwards' }}
          >
            <h3 className="font-serif text-lg font-semibold text-gray-900 mb-6 flex items-center gap-2">
              <Package className="w-5 h-5 text-primary-600" />
              席位统计
            </h3>

            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <StatCard
                  icon={Package}
                  label="总席位"
                  value={software.totalSeats}
                  color="#3b82f6"
                  delay={0.2}
                />
                <StatCard
                  icon={Users}
                  label="已使用"
                  value={software.usedSeats}
                  color="#f59e0b"
                  delay={0.25}
                />
                <StatCard
                  icon={CheckCircle}
                  label="可用"
                  value={availableSeats}
                  color={availableSeats > 0 ? '#10b981' : '#ef4444'}
                  delay={0.3}
                />
                <StatCard
                  icon={TrendingUp}
                  label="使用率"
                  value={`${usageRate.toFixed(0)}%`}
                  color="#8b5cf6"
                  delay={0.35}
                />
              </div>

              <div>
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-gray-500">使用率</span>
                  <span className="font-medium text-gray-900">{usageRate.toFixed(1)}%</span>
                </div>
                <div className="progress-bar">
                  <div
                    className={`progress-bar-fill ${
                      usageRate > 80
                        ? 'bg-danger-500'
                        : usageRate > 50
                        ? 'bg-warning-500'
                        : 'bg-success-500'
                    }`}
                    style={{ width: `${usageRate}%` }}
                  />
                </div>
              </div>
            </div>
          </div>

          <div
            className="card p-6 opacity-0 animate-fade-in-up"
            style={{ animationDelay: '0.4s', animationFillMode: 'forwards' }}
          >
            <h3 className="font-serif text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <UserPlus className="w-5 h-5 text-primary-600" />
              申请使用
            </h3>

            {isExpired ? (
              <div className="bg-danger-50 rounded-lg p-4 text-center">
                <AlertCircle className="w-10 h-10 text-danger-500 mx-auto mb-2" />
                <p className="text-danger-700 font-medium">软件授权已过期</p>
                <p className="text-sm text-danger-600">暂无法申请使用</p>
              </div>
            ) : availableSeats > 0 ? (
              <div className="space-y-4">
                <div className="bg-success-50 rounded-lg p-4 text-center">
                  <CheckCircle className="w-10 h-10 text-success-500 mx-auto mb-2" />
                  <p className="text-success-700 font-medium">有席位可用</p>
                  <p className="text-sm text-success-600">当前剩余 {availableSeats} 个席位</p>
                </div>
                <div className="space-y-3">
                  <button
                    onClick={handleApply}
                    disabled={isApplying}
                    className="w-full btn-primary"
                  >
                    {isApplying ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        处理中...
                      </>
                    ) : (
                      <>
                        <UserPlus className="w-4 h-4" />
                        填写申请
                      </>
                    )}
                  </button>
                  <button
                    onClick={handleQuickApply}
                    disabled={isApplying}
                    className="w-full btn-outline"
                  >
                    <RefreshCw className="w-4 h-4" />
                    快速申请（30天）
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="bg-warning-50 rounded-lg p-4 text-center">
                  <Clock className="w-10 h-10 text-warning-500 mx-auto mb-2" />
                  <p className="text-warning-700 font-medium">席位已满</p>
                  <p className="text-sm text-warning-600">
                    当前有 {queueData?.items.length || 0} 人在排队
                  </p>
                  {queueData && queueData.items.length > 0 && (
                    <p className="text-xs text-warning-600 mt-2">
                      预计等待约 {queueData.items[0].estimatedWaitTime} 分钟
                    </p>
                  )}
                </div>
                <button
                  onClick={handleJoinQueue}
                  disabled={isJoiningQueue}
                  className="w-full btn-warning"
                >
                  {isJoiningQueue ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      加入中...
                    </>
                  ) : (
                    <>
                      <Clock className="w-4 h-4" />
                      加入排队
                    </>
                  )}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
