import { useState, useEffect, useMemo } from 'react';
import {
  Key,
  Calendar,
  Clock,
  Search,
  Filter,
  RefreshCw,
  Loader2,
  ChevronDown,
  ChevronUp,
  RotateCcw,
  AlertTriangle,
  CheckCircle,
  XCircle,
  X,
  Package,
  Hash,
} from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import { licenseApi, softwareApi } from '../lib/apiServices';
import { StatusBadge, CategoryBadge } from '../components/Badges';
import { cn } from '../lib/utils';
import type { License, Software, LicenseStatus } from '../../shared/types';

type TabType = 'active' | 'history' | 'all';

interface LicenseWithSoftware extends License {
  software?: Software;
  daysRemaining?: number;
  licenseKey?: string;
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
}

function formatDateTime(dateStr: string) {
  return new Date(dateStr).toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function getDaysRemaining(endDate: string): number {
  const end = new Date(endDate).getTime();
  const now = new Date().getTime();
  return Math.ceil((end - now) / (1000 * 60 * 60 * 24));
}

function LicenseCard({
  license,
  expanded,
  onToggle,
  onReturn,
  onRenew,
  isProcessing,
  index,
}: {
  license: LicenseWithSoftware;
  expanded: boolean;
  onToggle: () => void;
  onReturn: () => void;
  onRenew: () => void;
  isProcessing: boolean;
  index: number;
}) {
  const daysRemaining = license.daysRemaining ?? 0;
  const isWarning = daysRemaining > 0 && daysRemaining <= 7;
  const isExpired = daysRemaining <= 0;

  return (
    <div
      className="card overflow-hidden opacity-0 animate-fade-in-up"
      style={{ animationDelay: `${index * 0.05}s`, animationFillMode: 'forwards' }}
    >
      <div className="p-6 cursor-pointer" onClick={onToggle}>
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center text-3xl">
              {license.software?.icon || '📦'}
            </div>
            <div>
              <h3 className="font-semibold text-lg text-gray-900">{license.software?.name || '未知软件'}</h3>
              <div className="flex items-center gap-2 mt-1">
                {license.software && <CategoryBadge category={license.software.category} />}
                <StatusBadge status={license.status} />
                {isWarning && (
                  <span className="flex items-center gap-1 text-xs text-warning-600 bg-warning-50 px-2 py-0.5 rounded-full">
                    <AlertTriangle className="w-3 h-3" />
                    即将到期
                  </span>
                )}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {expanded ? (
              <ChevronUp className="w-5 h-5 text-gray-400" />
            ) : (
              <ChevronDown className="w-5 h-5 text-gray-400" />
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          <div className="flex items-center gap-2 text-sm">
            <Calendar className="w-4 h-4 text-gray-400" />
            <span className="text-gray-500">开始日期：</span>
            <span className="text-gray-900 font-medium">{formatDate(license.startDate)}</span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <Calendar className="w-4 h-4 text-gray-400" />
            <span className="text-gray-500">到期日期：</span>
            <span className={cn('font-medium', isExpired || isWarning ? 'text-danger-600' : 'text-gray-900')}>
              {formatDate(license.endDate)}
            </span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <Clock className="w-4 h-4 text-gray-400" />
            <span className="text-gray-500">剩余天数：</span>
            <span
              className={cn(
                'font-bold',
                isExpired ? 'text-danger-600' : isWarning ? 'text-warning-600' : 'text-success-600'
              )}
            >
              {isExpired ? '已过期' : `${daysRemaining} 天`}
            </span>
          </div>
        </div>

        <div className="progress-bar">
          <div
            className={cn(
              'progress-bar-fill',
              isExpired
                ? 'bg-danger-500'
                : isWarning
                ? 'bg-warning-500'
                : daysRemaining <= 30
                ? 'bg-primary-500'
                : 'bg-success-500'
            )}
            style={{ width: `${Math.max(0, Math.min(100, (daysRemaining / 180) * 100))}%` }}
          />
        </div>
      </div>

      {license.status === 'active' && (
        <div className="px-6 pb-4 flex items-center gap-3">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onReturn();
            }}
            className="btn-outline text-sm py-1.5"
            disabled={isProcessing}
          >
            {isProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : <RotateCcw className="w-4 h-4" />}
            归还授权
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onRenew();
            }}
            className="btn-primary text-sm py-1.5"
            disabled={isProcessing}
          >
            <RefreshCw className="w-4 h-4" />
            续期申请
          </button>
        </div>
      )}

      {expanded && (
        <div className="px-6 pb-6">
          <div className="bg-gray-50 rounded-lg p-4 space-y-4">
            <h4 className="text-sm font-medium text-gray-700 flex items-center gap-2">
              <Package className="w-4 h-4" />
              授权详情
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-gray-500">授权ID：</span>
                <span className="text-gray-900 font-mono">{license.id}</span>
              </div>
              <div>
                <span className="text-gray-500">席位ID：</span>
                <span className="text-gray-900 font-mono">{license.seatId}</span>
              </div>
              <div>
                <span className="text-gray-500">许可证密钥：</span>
                <span className="text-gray-900 font-mono">
                  {license.licenseKey || 'XXXX-XXXX-XXXX-XXXX'}
                </span>
              </div>
              <div>
                <span className="text-gray-500">版本：</span>
                <span className="text-gray-900">v{license.software?.version || '-'}</span>
              </div>
              {license.activatedAt && (
                <div>
                  <span className="text-gray-500">激活时间：</span>
                  <span className="text-gray-900">{formatDateTime(license.activatedAt)}</span>
                </div>
              )}
              {license.lastUsedAt && (
                <div>
                  <span className="text-gray-500">最后使用时间：</span>
                  <span className="text-gray-900">{formatDateTime(license.lastUsedAt)}</span>
                </div>
              )}
              <div>
                <span className="text-gray-500">申请关联：</span>
                <span className="text-gray-900 font-mono">{license.applicationId}</span>
              </div>
              <div>
                <span className="text-gray-500">供应商：</span>
                <span className="text-gray-900">{license.software?.vendor || '-'}</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function MyLicenses() {
  const { user } = useAuthStore();
  const [activeTab, setActiveTab] = useState<TabType>('active');
  const [licenses, setLicenses] = useState<LicenseWithSoftware[]>([]);
  const [allLicenses, setAllLicenses] = useState<LicenseWithSoftware[]>([]);
  const [softwareList, setSoftwareList] = useState<Software[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [showRenewModal, setShowRenewModal] = useState(false);
  const [renewLicense, setRenewLicense] = useState<LicenseWithSoftware | null>(null);
  const [renewEndDate, setRenewEndDate] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingId, setProcessingId] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, [user]);

  async function loadData() {
    if (!user) return;
    setIsLoading(true);
    setError(null);
    try {
      const [licensesRes, softwareRes] = await Promise.all([
        licenseApi.getAll({ userId: user.id, pageSize: 100 }),
        softwareApi.getAll({ pageSize: 50 }),
      ]);

      if (licensesRes.success && licensesRes.data) {
        const licensesData = licensesRes.data;
        const softwareData = softwareRes.success && softwareRes.data ? softwareRes.data : [];
        setSoftwareList(softwareData);

        const licensesWithSoftware = licensesData.map((lic) => {
          const software = softwareData.find((s) => s.id === lic.softwareId);
          return {
            ...lic,
            software,
            daysRemaining: getDaysRemaining(lic.endDate),
          };
        });

        setAllLicenses(licensesWithSoftware);
      }
    } catch (err) {
      setError('加载授权数据失败，请刷新重试');
      console.error('Failed to load licenses:', err);
    } finally {
      setIsLoading(false);
    }
  }

  const filteredLicenses = useMemo(() => {
    let filtered = [...allLicenses];

    if (activeTab === 'active') {
      filtered = filtered.filter((l) => l.status === 'active');
    } else if (activeTab === 'history') {
      filtered = filtered.filter((l) => l.status !== 'active');
    }

    if (filterStatus !== 'all') {
      filtered = filtered.filter((l) => l.status === filterStatus);
    }

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (l) =>
          l.software?.name.toLowerCase().includes(query) ||
          l.software?.vendor.toLowerCase().includes(query) ||
          l.id.toLowerCase().includes(query)
      );
    }

    return filtered.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [allLicenses, activeTab, filterStatus, searchQuery]);

  useEffect(() => {
    setLicenses(filteredLicenses);
  }, [filteredLicenses]);

  const stats = useMemo(() => {
    const active = allLicenses.filter((l) => l.status === 'active');
    const expiringSoon = active.filter((l) => (l.daysRemaining ?? 0) > 0 && (l.daysRemaining ?? 0) <= 7);
    return {
      total: allLicenses.length,
      active: active.length,
      expiringSoon: expiringSoon.length,
    };
  }, [allLicenses]);

  const tabs: { key: TabType; label: string; count?: number }[] = [
    { key: 'active', label: '活跃授权', count: stats.active },
    { key: 'history', label: '历史授权' },
    { key: 'all', label: '全部' },
  ];

  const statusOptions: { value: string; label: string }[] = [
    { value: 'all', label: '全部状态' },
    { value: 'active', label: '活跃' },
    { value: 'expired', label: '已过期' },
    { value: 'revoked', label: '已收回' },
  ];

  async function handleReturn(licenseId: string) {
    if (!confirm('确定要归还此授权吗？归还后将无法使用该软件。')) return;

    setIsProcessing(true);
    setProcessingId(licenseId);
    try {
      const res = await licenseApi.returnLicense(licenseId);
      if (res.success) {
        setAllLicenses((prev) =>
          prev.map((lic) => (lic.id === licenseId ? { ...lic, status: 'revoked' as LicenseStatus } : lic))
        );
      }
    } catch (err) {
      console.error('Failed to return license:', err);
      alert('归还失败，请重试');
    } finally {
      setIsProcessing(false);
      setProcessingId(null);
    }
  }

  function openRenewModal(license: LicenseWithSoftware) {
    setRenewLicense(license);
    const defaultEndDate = new Date(license.endDate);
    defaultEndDate.setMonth(defaultEndDate.getMonth() + 3);
    setRenewEndDate(defaultEndDate.toISOString().split('T')[0]);
    setShowRenewModal(true);
  }

  async function handleRenew() {
    if (!renewLicense || !renewEndDate) return;

    setIsProcessing(true);
    try {
      const res = await licenseApi.renew(renewLicense.id, renewEndDate);
      if (res.success) {
        setAllLicenses((prev) =>
          prev.map((lic) =>
            lic.id === renewLicense.id
              ? { ...lic, endDate: renewEndDate, daysRemaining: getDaysRemaining(renewEndDate) }
              : lic
          )
        );
        setShowRenewModal(false);
        setRenewLicense(null);
      }
    } catch (err) {
      console.error('Failed to renew license:', err);
      alert('续期申请失败，请重试');
    } finally {
      setIsProcessing(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="page-header opacity-0 animate-fade-in" style={{ animationFillMode: 'forwards' }}>
        <h1 className="page-title">我的授权</h1>
        <p className="page-subtitle">管理您的软件使用授权</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div
          className="stat-card opacity-0 animate-fade-in-up"
          style={{ animationDelay: '0.1s', animationFillMode: 'forwards' }}
        >
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-gray-500 mb-1">总授权数</p>
              <p className="text-3xl font-bold text-gray-900">{stats.total}</p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary-500 to-primary-700 flex items-center justify-center">
              <Key className="w-6 h-6 text-white" />
            </div>
          </div>
        </div>
        <div
          className="stat-card opacity-0 animate-fade-in-up"
          style={{ animationDelay: '0.2s', animationFillMode: 'forwards' }}
        >
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-gray-500 mb-1">活跃授权</p>
              <p className="text-3xl font-bold text-success-600">{stats.active}</p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-success-500 to-success-700 flex items-center justify-center">
              <CheckCircle className="w-6 h-6 text-white" />
            </div>
          </div>
        </div>
        <div
          className="stat-card opacity-0 animate-fade-in-up"
          style={{ animationDelay: '0.3s', animationFillMode: 'forwards' }}
        >
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-gray-500 mb-1">即将到期</p>
              <p className="text-3xl font-bold text-warning-600">{stats.expiringSoon}</p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-warning-500 to-warning-700 flex items-center justify-center">
              <AlertTriangle className="w-6 h-6 text-white" />
            </div>
          </div>
        </div>
      </div>

      <div
        className="card p-4 opacity-0 animate-fade-in-up"
        style={{ animationDelay: '0.4s', animationFillMode: 'forwards' }}
      >
        <div className="flex flex-col lg:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="搜索软件名称、供应商、授权ID..."
              className="input pl-10"
            />
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-gray-400" />
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="input min-w-[140px]"
              >
                {statusOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
            <button onClick={loadData} className="btn-ghost" disabled={isLoading}>
              <RefreshCw className={cn('w-4 h-4', isLoading && 'animate-spin')} />
            </button>
          </div>
        </div>
      </div>

      <div
        className="card overflow-hidden opacity-0 animate-fade-in-up"
        style={{ animationDelay: '0.5s', animationFillMode: 'forwards' }}
      >
        <div className="flex border-b border-gray-100">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => {
                setActiveTab(tab.key);
                setExpandedId(null);
              }}
              className={cn(
                'px-6 py-4 text-sm font-medium border-b-2 transition-all',
                activeTab === tab.key
                  ? 'border-primary-600 text-primary-600 bg-primary-50/50'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'
              )}
            >
              {tab.label}
              {tab.count !== undefined && (
                <span
                  className={cn(
                    'ml-2 px-2 py-0.5 rounded-full text-xs',
                    activeTab === tab.key ? 'bg-primary-100 text-primary-700' : 'bg-gray-100 text-gray-600'
                  )}
                >
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-24">
            <Loader2 className="w-8 h-8 text-primary-600 animate-spin" />
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <XCircle className="w-16 h-16 text-danger-400 mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">加载失败</h3>
            <p className="text-gray-500 mb-4">{error}</p>
            <button onClick={loadData} className="btn-primary">
              <RefreshCw className="w-4 h-4" />
              重新加载
            </button>
          </div>
        ) : licenses.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <Key className="w-16 h-16 text-gray-300 mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">暂无授权</h3>
            <p className="text-gray-500">
              {activeTab === 'active'
                ? '您当前没有活跃的软件授权'
                : activeTab === 'history'
                ? '暂无历史授权记录'
                : '暂无授权记录'}
            </p>
          </div>
        ) : (
          <div className="p-6 space-y-4">
            <p className="text-sm text-gray-500">共找到 {licenses.length} 条授权记录</p>
            {licenses.map((license, index) => (
              <LicenseCard
                key={license.id}
                license={license}
                expanded={expandedId === license.id}
                onToggle={() => setExpandedId(expandedId === license.id ? null : license.id)}
                onReturn={() => handleReturn(license.id)}
                onRenew={() => openRenewModal(license)}
                isProcessing={isProcessing && processingId === license.id}
                index={index}
              />
            ))}
          </div>
        )}
      </div>

      {showRenewModal && renewLicense && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 animate-fade-in">
          <div className="bg-white rounded-xl p-6 w-full max-w-md mx-4 animate-fade-in-up">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">续期申请</h3>
              <button
                onClick={() => {
                  setShowRenewModal(false);
                  setRenewLicense(null);
                }}
                className="btn-ghost p-1"
                disabled={isProcessing}
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-4">
              <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center text-xl">
                  {renewLicense.software?.icon}
                </div>
                <div>
                  <p className="font-medium text-gray-900">{renewLicense.software?.name}</p>
                  <p className="text-sm text-gray-500">
                    当前到期：{formatDate(renewLicense.endDate)}
                  </p>
                </div>
              </div>
              <div>
                <label className="input-label">
                  <Calendar className="w-4 h-4 inline mr-1" />
                  新到期日期
                </label>
                <input
                  type="date"
                  value={renewEndDate}
                  onChange={(e) => setRenewEndDate(e.target.value)}
                  className="input"
                  min={new Date().toISOString().split('T')[0]}
                  disabled={isProcessing}
                />
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => {
                  setShowRenewModal(false);
                  setRenewLicense(null);
                }}
                className="btn-outline"
                disabled={isProcessing}
              >
                取消
              </button>
              <button
                onClick={handleRenew}
                className="btn-primary"
                disabled={isProcessing || !renewEndDate}
              >
                {isProcessing ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <RefreshCw className="w-4 h-4" />
                )}
                确认续期
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
