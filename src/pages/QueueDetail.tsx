import { useState, useEffect, useRef, useMemo } from 'react';
import {
  ArrowLeft,
  Clock,
  Users,
  RefreshCw,
  LogOut,
  AlertCircle,
  Loader2,
  Timer,
  MapPin,
  Building2,
} from 'lucide-react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { queueApi, softwareApi, licenseApi, userApi } from '../lib/apiServices';
import { cn } from '../lib/utils';
import { CategoryBadge, StatusBadge } from '../components/Badges';
import type { QueueResponse, QueueItem, Software, License, User } from '../../shared/types';

interface AnonymousUser {
  position: number;
  department: string;
}

export default function QueueDetail() {
  const { softwareId } = useParams<{ softwareId: string }>();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [software, setSoftware] = useState<Software | null>(null);
  const [queueData, setQueueData] = useState<QueueResponse | null>(null);
  const [licenses, setLicenses] = useState<License[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isLeaving, setIsLeaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [displayedWaitTime, setDisplayedWaitTime] = useState(0);
  const [countdown, setCountdown] = useState<string>('');
  const animationRef = useRef<number | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const autoRefreshRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    loadData();
    autoRefreshRef.current = setInterval(() => {
      loadQueueData();
    }, 30000);

    return () => {
      if (autoRefreshRef.current) {
        clearInterval(autoRefreshRef.current);
      }
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [softwareId]);

  useEffect(() => {
    if (queueData?.currentUserPosition?.estimatedWaitTime !== undefined) {
      animateNumber(displayedWaitTime, queueData.currentUserPosition.estimatedWaitTime);
    }
  }, [queueData?.currentUserPosition?.estimatedWaitTime]);

  useEffect(() => {
    updateCountdown();
    intervalRef.current = setInterval(updateCountdown, 1000);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [licenses]);

  function animateNumber(from: number, to: number) {
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
    }

    const duration = 1500;
    const startTime = performance.now();

    function animate(currentTime: number) {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const easeOutQuart = 1 - Math.pow(1 - progress, 4);
      const current = Math.round(from + (to - from) * easeOutQuart);
      setDisplayedWaitTime(current);

      if (progress < 1) {
        animationRef.current = requestAnimationFrame(animate);
      }
    }

    animationRef.current = requestAnimationFrame(animate);
  }

  function updateCountdown() {
    if (licenses.length === 0) {
      setCountdown('');
      return;
    }

    const now = new Date().getTime();
    const activeLicenses = licenses.filter((l) => l.status === 'active');
    if (activeLicenses.length === 0) {
      setCountdown('');
      return;
    }

    const sortedLicenses = [...activeLicenses].sort(
      (a, b) => new Date(a.endDate).getTime() - new Date(b.endDate).getTime()
    );
    const nearestExpiry = new Date(sortedLicenses[0].endDate).getTime();
    const diff = nearestExpiry - now;

    if (diff <= 0) {
      setCountdown('已到期');
      return;
    }

    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((diff % (1000 * 60)) / 1000);

    if (days > 0) {
      setCountdown(`${days}天 ${hours}小时 ${minutes}分`);
    } else if (hours > 0) {
      setCountdown(`${hours}小时 ${minutes}分 ${seconds}秒`);
    } else {
      setCountdown(`${minutes}分 ${seconds}秒`);
    }
  }

  async function loadData() {
    if (!softwareId) return;
    setIsLoading(true);
    setError(null);
    try {
      const [softwareRes, queueRes, licensesRes, usersRes] = await Promise.all([
        softwareApi.getById(softwareId),
        queueApi.getQueue(softwareId),
        licenseApi.getAll({ softwareId, status: 'active', pageSize: 100 }),
        userApi.getAll({ pageSize: 200 }),
      ]);

      if (softwareRes.success && softwareRes.data) {
        setSoftware(softwareRes.data);
      }
      if (queueRes.success && queueRes.data) {
        setQueueData(queueRes.data);
      }
      if (licensesRes.success && licensesRes.data) {
        setLicenses(licensesRes.data);
      }
      if (usersRes.success && usersRes.data) {
        setUsers(usersRes.data);
      }
    } catch (err) {
      setError('加载排队信息失败，请刷新重试');
      console.error('Failed to load queue data:', err);
    } finally {
      setIsLoading(false);
    }
  }

  async function loadQueueData() {
    if (!softwareId) return;
    try {
      const queueRes = await queueApi.getQueue(softwareId);
      if (queueRes.success && queueRes.data) {
        setQueueData(queueRes.data);
      }
    } catch (err) {
      console.error('Failed to refresh queue data:', err);
    }
  }

  async function handleRefreshEstimates() {
    setIsRefreshing(true);
    try {
      await queueApi.updateEstimates();
      await loadQueueData();
    } catch (err) {
      console.error('Failed to update estimates:', err);
    } finally {
      setIsRefreshing(false);
    }
  }

  async function handleLeaveQueue() {
    if (!queueData?.currentUserPosition) return;
    if (!confirm('确定要取消排队吗？')) return;

    setIsLeaving(true);
    try {
      const res = await queueApi.leaveQueue(queueData.currentUserPosition.id);
      if (res.success) {
        setQueueData((prev) =>
          prev
            ? {
                ...prev,
                items: prev.items.filter((item) => item.id !== queueData.currentUserPosition!.id),
                currentUserPosition: undefined,
              }
            : null
        );
      }
    } catch (err) {
      console.error('Failed to leave queue:', err);
    } finally {
      setIsLeaving(false);
    }
  }

  const anonymousUsers = useMemo<AnonymousUser[]>(() => {
    if (!queueData?.items || !user) return [];

    const currentPosition = queueData.currentUserPosition?.position || Infinity;

    return queueData.items
      .filter((item) => item.position < currentPosition)
      .map((item) => ({
        position: item.position,
        department: users.find((u) => u.id === item.userId)?.department || '未知院系',
      }))
      .sort((a, b) => a.position - b.position);
  }, [queueData, user, users]);

  const positionPercent = useMemo(() => {
    if (!queueData?.currentUserPosition || queueData.items.length === 0) return 0;
    const total = queueData.items.length;
    const position = queueData.currentUserPosition.position;
    return Math.round(((total - position + 1) / total) * 100);
  }, [queueData]);

  const formatWaitTime = (minutes: number) => {
    if (minutes < 60) {
      return `${minutes} 分钟`;
    }
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return mins > 0 ? `${hours} 小时 ${mins} 分钟` : `${hours} 小时`;
  };

  const nearestExpiringLicense = useMemo(() => {
    const activeLicenses = licenses.filter((l) => l.status === 'active');
    if (activeLicenses.length === 0) return null;
    return [...activeLicenses].sort(
      (a, b) => new Date(a.endDate).getTime() - new Date(b.endDate).getTime()
    )[0];
  }, [licenses]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[600px]">
        <Loader2 className="w-8 h-8 text-primary-600 animate-spin" />
      </div>
    );
  }

  if (error || !software) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[600px] text-center">
        <AlertCircle className="w-16 h-16 text-danger-400 mb-4" />
        <h3 className="text-lg font-semibold text-gray-900 mb-2">加载失败</h3>
        <p className="text-gray-500 mb-4">{error || '未找到该软件'}</p>
        <button onClick={() => navigate('/software')} className="btn-primary">
          <ArrowLeft className="w-4 h-4" />
          返回软件列表
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div
        className="flex items-center gap-4 opacity-0 animate-fade-in"
        style={{ animationFillMode: 'forwards' }}
      >
        <button onClick={() => navigate('/software')} className="btn-ghost p-2">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="page-title">排队详情</h1>
          <p className="page-subtitle">实时查看排队状态和预计等待时间</p>
        </div>
      </div>

      <div
        className="card p-6 opacity-0 animate-fade-in-up"
        style={{ animationDelay: '0.1s', animationFillMode: 'forwards' }}
      >
        <div className="flex flex-col md:flex-row items-start md:items-center gap-4">
          <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-primary-100 to-primary-200 flex items-center justify-center text-5xl">
            {software.icon}
          </div>
          <div className="flex-1">
            <div className="flex flex-wrap items-center gap-3 mb-2">
              <h2 className="text-2xl font-bold text-gray-900">{software.name}</h2>
              <CategoryBadge category={software.category} />
              <span className="text-sm text-gray-500">v{software.version}</span>
            </div>
            <p className="text-gray-600 mb-3">{software.description}</p>
            <div className="flex flex-wrap items-center gap-4 text-sm text-gray-500">
              <div className="flex items-center gap-1">
                <Users className="w-4 h-4" />
                <span>
                  席位：{software.usedSeats}/{software.totalSeats} 已使用
                </span>
              </div>
              <div className="flex items-center gap-1">
                <Building2 className="w-4 h-4" />
                <span>供应商：{software.vendor}</span>
              </div>
              <div className="flex items-center gap-1">
                <Clock className="w-4 h-4" />
                <span>平均使用：{software.averageUsageHours} 小时/周</span>
              </div>
            </div>
          </div>
          <button
            onClick={handleRefreshEstimates}
            className="btn-outline"
            disabled={isRefreshing}
          >
            <RefreshCw className={cn('w-4 h-4', isRefreshing && 'animate-spin')} />
            刷新预计时间
          </button>
        </div>
      </div>

      {nearestExpiringLicense && (
        <div
          className="card p-6 bg-gradient-to-r from-warning-50 to-amber-50 border-warning-200 opacity-0 animate-fade-in-up"
          style={{ animationDelay: '0.15s', animationFillMode: 'forwards' }}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-warning-500 flex items-center justify-center">
                <Timer className="w-6 h-6 text-white" />
              </div>
              <div>
                <p className="text-sm text-warning-700 font-medium">最近到期席位</p>
                <p className="text-2xl font-bold text-warning-700 font-mono tabular-nums">
                  {countdown}
                </p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-sm text-warning-600">到期时间</p>
              <p className="text-gray-700 font-medium">
                {new Date(nearestExpiringLicense.endDate).toLocaleString('zh-CN')}
              </p>
            </div>
          </div>
        </div>
      )}

      {queueData?.currentUserPosition ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div
            className="card p-8 text-center opacity-0 animate-fade-in-up"
            style={{ animationDelay: '0.2s', animationFillMode: 'forwards' }}
          >
            <div className="flex justify-center mb-6">
              <div className="relative">
                <svg className="w-48 h-48 transform -rotate-90">
                  <circle
                    cx="96"
                    cy="96"
                    r="84"
                    stroke="currentColor"
                    strokeWidth="12"
                    fill="none"
                    className="text-gray-100"
                  />
                  <circle
                    cx="96"
                    cy="96"
                    r="84"
                    stroke="currentColor"
                    strokeWidth="12"
                    fill="none"
                    strokeLinecap="round"
                    className="text-primary-500 transition-all duration-1000 ease-out"
                    strokeDasharray={`${2 * Math.PI * 84}`}
                    strokeDashoffset={`${2 * Math.PI * 84 * (1 - positionPercent / 100)}`}
                    style={{
                      filter: 'drop-shadow(0 0 8px rgba(59, 130, 246, 0.5))',
                    }}
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <MapPin className="w-8 h-8 text-primary-500 mb-1" />
                  <span className="text-5xl font-bold text-gray-900 tabular-nums">
                    {queueData.currentUserPosition.position}
                  </span>
                  <span className="text-gray-500 text-sm">当前位置</span>
                </div>
              </div>
            </div>
            <div className="space-y-2">
              <p className="text-gray-600">
                队列总长度：
                <span className="font-semibold text-gray-900">{queueData.items.length} 人</span>
              </p>
              <p className="text-gray-600">
                您的位置百分比：
                <span className="font-semibold text-primary-600">{positionPercent}%</span>
              </p>
            </div>
          </div>

          <div
            className="card p-8 text-center opacity-0 animate-fade-in-up"
            style={{ animationDelay: '0.3s', animationFillMode: 'forwards' }}
          >
            <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-gradient-to-br from-warning-400 to-warning-600 flex items-center justify-center animate-pulse-soft">
              <Clock className="w-10 h-10 text-white" />
            </div>
            <p className="text-gray-500 mb-2">预计等待时间</p>
            <div className="text-5xl font-bold text-gray-900 mb-2 tabular-nums">
              {formatWaitTime(displayedWaitTime)}
            </div>
            <p className="text-sm text-gray-400">
              基于 {software.averageUsageHours} 小时平均使用时间估算
            </p>
            <div className="mt-6">
              <button
                onClick={handleLeaveQueue}
                className="btn-danger w-full"
                disabled={isLeaving}
              >
                {isLeaving ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <LogOut className="w-4 h-4" />
                )}
                取消排队
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div
          className="card p-12 text-center opacity-0 animate-fade-in-up"
          style={{ animationDelay: '0.2s', animationFillMode: 'forwards' }}
        >
          <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-gray-100 flex items-center justify-center">
            <Users className="w-10 h-10 text-gray-400" />
          </div>
          <h3 className="text-xl font-semibold text-gray-900 mb-2">您当前不在队列中</h3>
          <p className="text-gray-500 mb-6">该软件当前有 {queueData?.items.length || 0} 人在排队</p>
          <button onClick={() => navigate('/software')} className="btn-primary">
            浏览软件
          </button>
        </div>
      )}

      {anonymousUsers.length > 0 && (
        <div
          className="card p-6 opacity-0 animate-fade-in-up"
          style={{ animationDelay: '0.4s', animationFillMode: 'forwards' }}
        >
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">前方排队用户</h3>
              <p className="text-sm text-gray-500">共 {anonymousUsers.length} 人在您之前</p>
            </div>
            <StatusBadge status="pending" />
          </div>
          <div className="space-y-3 max-h-80 overflow-y-auto scrollbar-thin">
            {anonymousUsers.map((item, index) => (
              <div
                key={index}
                className="flex items-center gap-4 p-3 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors"
                style={{
                  animation: `fadeInUp 0.4s ease-out ${index * 0.05}s both`,
                }}
              >
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-gray-300 to-gray-400 flex items-center justify-center text-white font-semibold flex-shrink-0">
                  {item.position}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-gray-700">匿名用户</span>
                    <span className="text-xs text-gray-400">#{item.position}</span>
                  </div>
                  <div className="flex items-center gap-1 text-sm text-gray-500">
                    <Building2 className="w-3.5 h-3.5" />
                    {item.department}
                  </div>
                </div>
                <div className="w-2 h-2 rounded-full bg-warning-400 animate-pulse" />
              </div>
            ))}
          </div>
        </div>
      )}

      <div
        className="text-center text-sm text-gray-400 opacity-0 animate-fade-in"
        style={{ animationDelay: '0.5s', animationFillMode: 'forwards' }}
      >
        <p>排队状态每 30 秒自动刷新</p>
      </div>
    </div>
  );
}
