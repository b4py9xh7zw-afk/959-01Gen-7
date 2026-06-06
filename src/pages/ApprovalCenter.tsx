import { useState, useEffect, useMemo } from 'react';
import {
  CheckCircle,
  XCircle,
  ChevronDown,
  ChevronUp,
  Filter,
  Search,
  Loader2,
  Users,
  FileText,
  CheckSquare,
  Square,
  Clock,
  AlertCircle,
  X,
  RefreshCw,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { applicationApi, userApi, softwareApi } from '../lib/apiServices';
import { cn } from '../lib/utils';
import { StatusBadge, CategoryBadge, RoleBadge, UsageTypeBadge } from '../components/Badges';
import type { Application, User, Software } from '../../shared/types';

type TabType = 'pending' | 'approved' | 'rejected' | 'all';

interface ApplicationWithRelations extends Application {
  user?: User;
  software?: Software;
}

export default function ApprovalCenter() {
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<TabType>('pending');
  const [applications, setApplications] = useState<ApplicationWithRelations[]>([]);
  const [allApplications, setAllApplications] = useState<ApplicationWithRelations[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [softwareList, setSoftwareList] = useState<Software[]>([]);
  const [departments, setDepartments] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [filterDepartment, setFilterDepartment] = useState<string>('');
  const [filterSoftware, setFilterSoftware] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (user && user.role !== 'admin' && user.role !== 'teacher') {
      navigate('/');
      return;
    }
    loadData();
  }, [user, navigate]);

  async function loadData() {
    setIsLoading(true);
    setError(null);
    try {
      const [appsRes, usersRes, softwareRes, deptsRes] = await Promise.all([
        applicationApi.getAll({ pageSize: 100 }),
        userApi.getAll({ pageSize: 200 }),
        softwareApi.getAll({ pageSize: 50 }),
        userApi.getDepartments(),
      ]);

      if (appsRes.success && appsRes.data) {
        const apps = appsRes.data;
        const usersData = usersRes.success && usersRes.data ? usersRes.data : [];
        const softwareData = softwareRes.success && softwareRes.data ? softwareRes.data : [];

        const appsWithRelations = apps.map((app) => ({
          ...app,
          user: usersData.find((u) => u.id === app.userId),
          software: softwareData.find((s) => s.id === app.softwareId),
        }));

        setAllApplications(appsWithRelations);
        setUsers(usersData);
        setSoftwareList(softwareData);
      }

      if (deptsRes.success && deptsRes.data) {
        setDepartments(deptsRes.data);
      }
    } catch (err) {
      setError('加载数据失败，请刷新重试');
      console.error('Failed to load approval data:', err);
    } finally {
      setIsLoading(false);
    }
  }

  const filteredApplications = useMemo(() => {
    let filtered = [...allApplications];

    if (activeTab !== 'all') {
      filtered = filtered.filter((app) => app.status === activeTab);
    }

    if (filterDepartment) {
      filtered = filtered.filter((app) => app.department === filterDepartment);
    }

    if (filterSoftware) {
      filtered = filtered.filter((app) => app.softwareId === filterSoftware);
    }

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (app) =>
          app.user?.name.toLowerCase().includes(query) ||
          app.software?.name.toLowerCase().includes(query) ||
          app.purpose.toLowerCase().includes(query)
      );
    }

    return filtered.sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }, [allApplications, activeTab, filterDepartment, filterSoftware, searchQuery]);

  useEffect(() => {
    setApplications(filteredApplications);
  }, [filteredApplications]);

  const stats = useMemo(() => {
    return {
      pending: allApplications.filter((a) => a.status === 'pending').length,
      approved: allApplications.filter((a) => a.status === 'approved').length,
      rejected: allApplications.filter((a) => a.status === 'rejected').length,
    };
  }, [allApplications]);

  const tabs: { key: TabType; label: string; count?: number }[] = [
    { key: 'pending', label: '待审批', count: stats.pending },
    { key: 'approved', label: '已审批', count: stats.approved },
    { key: 'rejected', label: '已拒绝', count: stats.rejected },
    { key: 'all', label: '全部' },
  ];

  function toggleSelect(id: string) {
    const app = applications.find((a) => a.id === id);
    if (!app || app.status !== 'pending') return;

    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedIds(newSelected);
  }

  function toggleSelectAll() {
    const pendingApps = applications.filter((a) => a.status === 'pending');
    if (selectedIds.size === pendingApps.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(pendingApps.map((a) => a.id)));
    }
  }

  async function handleApprove(id: string) {
    if (!user) return;
    setIsProcessing(true);
    try {
      const res = await applicationApi.approve(id, user.id);
      if (res.success) {
        setAllApplications((prev) =>
          prev.map((app) =>
            app.id === id ? { ...app, status: 'approved', approvedAt: new Date().toISOString(), approverId: user.id } : app
          )
        );
        setSelectedIds((prev) => {
          const next = new Set(prev);
          next.delete(id);
          return next;
        });
      }
    } catch (err) {
      console.error('Failed to approve application:', err);
    } finally {
      setIsProcessing(false);
    }
  }

  async function handleBulkApprove() {
    if (!user || selectedIds.size === 0) return;
    setIsProcessing(true);
    try {
      const ids = Array.from(selectedIds);
      await Promise.all(ids.map((id) => applicationApi.approve(id, user.id)));
      setAllApplications((prev) =>
        prev.map((app) =>
          selectedIds.has(app.id)
            ? { ...app, status: 'approved', approvedAt: new Date().toISOString(), approverId: user.id }
            : app
        )
      );
      setSelectedIds(new Set());
    } catch (err) {
      console.error('Failed to bulk approve:', err);
    } finally {
      setIsProcessing(false);
    }
  }

  function openRejectModal(id: string) {
    setRejectingId(id);
    setRejectionReason('');
    setShowRejectModal(true);
  }

  async function handleReject() {
    if (!user || !rejectingId || !rejectionReason.trim()) return;
    setIsProcessing(true);
    try {
      const res = await applicationApi.reject(rejectingId, rejectionReason.trim(), user.id);
      if (res.success) {
        setAllApplications((prev) =>
          prev.map((app) =>
            app.id === rejectingId ? { ...app, status: 'rejected', rejectionReason: rejectionReason.trim() } : app
          )
        );
        setSelectedIds((prev) => {
          const next = new Set(prev);
          next.delete(rejectingId);
          return next;
        });
        setShowRejectModal(false);
        setRejectingId(null);
      }
    } catch (err) {
      console.error('Failed to reject application:', err);
    } finally {
      setIsProcessing(false);
    }
  }

  async function handleBulkReject() {
    if (!user || selectedIds.size === 0) return;
    const reason = prompt('请输入拒绝原因：');
    if (!reason?.trim()) return;

    setIsProcessing(true);
    try {
      const ids = Array.from(selectedIds);
      await Promise.all(ids.map((id) => applicationApi.reject(id, reason.trim(), user.id)));
      setAllApplications((prev) =>
        prev.map((app) =>
          selectedIds.has(app.id) ? { ...app, status: 'rejected', rejectionReason: reason.trim() } : app
        )
      );
      setSelectedIds(new Set());
    } catch (err) {
      console.error('Failed to bulk reject:', err);
    } finally {
      setIsProcessing(false);
    }
  }

  function formatDate(dateStr: string) {
    return new Date(dateStr).toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  if (!user || (user.role !== 'admin' && user.role !== 'teacher')) {
    return null;
  }

  const pendingApps = applications.filter((a) => a.status === 'pending');

  return (
    <div className="space-y-6">
      <div className="page-header opacity-0 animate-fade-in" style={{ animationFillMode: 'forwards' }}>
        <h1 className="page-title">审批中心</h1>
        <p className="page-subtitle">管理软件使用授权申请</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div
          className="stat-card opacity-0 animate-fade-in-up"
          style={{ animationDelay: '0.1s', animationFillMode: 'forwards' }}
        >
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-gray-500 mb-1">待审批</p>
              <p className="text-3xl font-bold text-warning-600">{stats.pending}</p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-warning-500 to-warning-700 flex items-center justify-center">
              <Clock className="w-6 h-6 text-white" />
            </div>
          </div>
        </div>
        <div
          className="stat-card opacity-0 animate-fade-in-up"
          style={{ animationDelay: '0.2s', animationFillMode: 'forwards' }}
        >
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-gray-500 mb-1">已通过</p>
              <p className="text-3xl font-bold text-success-600">{stats.approved}</p>
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
              <p className="text-sm text-gray-500 mb-1">已拒绝</p>
              <p className="text-3xl font-bold text-danger-600">{stats.rejected}</p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-danger-500 to-danger-700 flex items-center justify-center">
              <XCircle className="w-6 h-6 text-white" />
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
              placeholder="搜索申请人、软件名称、用途..."
              className="input pl-10"
            />
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-gray-400" />
              <select
                value={filterDepartment}
                onChange={(e) => setFilterDepartment(e.target.value)}
                className="input min-w-[140px]"
              >
                <option value="">全部院系</option>
                {departments.map((dept) => (
                  <option key={dept} value={dept}>
                    {dept}
                  </option>
                ))}
              </select>
            </div>
            <select
              value={filterSoftware}
              onChange={(e) => setFilterSoftware(e.target.value)}
              className="input min-w-[140px]"
            >
              <option value="">全部软件</option>
              {softwareList.map((sw) => (
                <option key={sw.id} value={sw.id}>
                  {sw.name}
                </option>
              ))}
            </select>
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
        <div className="flex items-center justify-between border-b border-gray-100">
          <div className="flex">
            {tabs.map((tab) => (
              <button
                key={tab.key}
                onClick={() => {
                  setActiveTab(tab.key);
                  setSelectedIds(new Set());
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
                      activeTab === tab.key
                        ? 'bg-primary-100 text-primary-700'
                        : 'bg-gray-100 text-gray-600'
                    )}
                  >
                    {tab.count}
                  </span>
                )}
              </button>
            ))}
          </div>
          {activeTab === 'pending' && pendingApps.length > 0 && (
            <div className="px-6 py-3 flex items-center gap-3">
              <button
                onClick={toggleSelectAll}
                className="btn-ghost text-sm py-1.5"
                disabled={isProcessing}
              >
                {selectedIds.size === pendingApps.length ? (
                  <CheckSquare className="w-4 h-4 text-primary-600" />
                ) : (
                  <Square className="w-4 h-4" />
                )}
                全选
              </button>
              {selectedIds.size > 0 && (
                <>
                  <button
                    onClick={handleBulkApprove}
                    className="btn-success text-sm py-1.5"
                    disabled={isProcessing}
                  >
                    {isProcessing ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <CheckCircle className="w-4 h-4" />
                    )}
                    批量通过 ({selectedIds.size})
                  </button>
                  <button
                    onClick={handleBulkReject}
                    className="btn-danger text-sm py-1.5"
                    disabled={isProcessing}
                  >
                    {isProcessing ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <XCircle className="w-4 h-4" />
                    )}
                    批量拒绝
                  </button>
                </>
              )}
            </div>
          )}
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
        ) : applications.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <FileText className="w-16 h-16 text-gray-300 mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">暂无申请</h3>
            <p className="text-gray-500">
              {activeTab === 'pending'
                ? '当前没有待处理的申请'
                : activeTab === 'approved'
                ? '暂无已通过的申请'
                : activeTab === 'rejected'
                ? '暂无已拒绝的申请'
                : '暂无申请记录'}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {applications.map((app, index) => (
              <div
                key={app.id}
                className={cn(
                  'transition-all duration-300',
                  expandedId === app.id ? 'bg-gray-50' : 'hover:bg-gray-50',
                  selectedIds.has(app.id) && 'bg-primary-50/80'
                )}
                style={{
                  animation: `fadeInUp 0.5s ease-out ${index * 0.03}s both`,
                }}
              >
                <div
                  className="p-4 cursor-pointer"
                  onClick={() => setExpandedId(expandedId === app.id ? null : app.id)}
                >
                  <div className="flex items-start gap-4">
                    {activeTab === 'pending' && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleSelect(app.id);
                        }}
                        className="mt-1 flex-shrink-0"
                        disabled={isProcessing}
                      >
                        {selectedIds.has(app.id) ? (
                          <CheckSquare className="w-5 h-5 text-primary-600" />
                        ) : (
                          <Square className="w-5 h-5 text-gray-300 hover:text-gray-400" />
                        )}
                      </button>
                    )}

                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center text-white font-semibold flex-shrink-0">
                      {app.user?.name?.charAt(0) || '?'}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2 mb-2">
                        <span className="font-semibold text-gray-900">
                          {app.user?.name || '未知用户'}
                        </span>
                        {app.user && <RoleBadge role={app.user.role} />}
                        <span className="text-sm text-gray-500">{app.department}</span>
                        <StatusBadge status={app.status} />
                      </div>

                      <div className="flex flex-wrap items-center gap-3 mb-2">
                        <div className="flex items-center gap-2">
                          <span className="text-2xl">{app.software?.icon}</span>
                          <span className="font-medium text-gray-800">{app.software?.name}</span>
                          {app.software && <CategoryBadge category={app.software.category} />}
                        </div>
                        <UsageTypeBadge type={app.type} />
                      </div>

                      <p className="text-sm text-gray-600 line-clamp-1 mb-2">{app.purpose}</p>

                      <div className="flex flex-wrap items-center gap-4 text-xs text-gray-500">
                        <div className="flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5" />
                          <span>申请时间：{formatDate(app.createdAt)}</span>
                        </div>
                        {app.type === 'course' && app.courseName && (
                          <span>课程：{app.courseName}</span>
                        )}
                        {app.type === 'research' && app.projectName && (
                          <span>项目：{app.projectName}</span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 flex-shrink-0">
                      {activeTab === 'pending' && (
                        <>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleApprove(app.id);
                            }}
                            className="btn-success text-sm py-1.5"
                            disabled={isProcessing}
                          >
                            {isProcessing ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <CheckCircle className="w-4 h-4" />
                            )}
                            通过
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              openRejectModal(app.id);
                            }}
                            className="btn-danger text-sm py-1.5"
                            disabled={isProcessing}
                          >
                            <XCircle className="w-4 h-4" />
                            拒绝
                          </button>
                        </>
                      )}
                      {expandedId === app.id ? (
                        <ChevronUp className="w-5 h-5 text-gray-400" />
                      ) : (
                        <ChevronDown className="w-5 h-5 text-gray-400" />
                      )}
                    </div>
                  </div>
                </div>

                {expandedId === app.id && (
                  <div className="px-4 pb-4 pl-[88px]">
                    <div className="bg-white rounded-lg p-4 border border-gray-200 space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <h4 className="text-sm font-medium text-gray-500 mb-1">申请人信息</h4>
                          <div className="text-sm space-y-1">
                            <p>
                              <span className="text-gray-600">姓名：</span>
                              {app.user?.name}
                            </p>
                            <p>
                              <span className="text-gray-600">邮箱：</span>
                              {app.user?.email}
                            </p>
                            <p>
                              <span className="text-gray-600">院系：</span>
                              {app.department}
                            </p>
                            {app.user?.studentId && (
                              <p>
                                <span className="text-gray-600">学号：</span>
                                {app.user.studentId}
                              </p>
                            )}
                            {app.user?.employeeId && (
                              <p>
                                <span className="text-gray-600">工号：</span>
                                {app.user.employeeId}
                              </p>
                            )}
                          </div>
                        </div>
                        <div>
                          <h4 className="text-sm font-medium text-gray-500 mb-1">软件信息</h4>
                          <div className="text-sm space-y-1">
                            <p>
                              <span className="text-gray-600">软件：</span>
                              {app.software?.name} {app.software?.version}
                            </p>
                            <p>
                              <span className="text-gray-600">供应商：</span>
                              {app.software?.vendor}
                            </p>
                            <p>
                              <span className="text-gray-600">可用席位：</span>
                              {(app.software?.totalSeats || 0) - (app.software?.usedSeats || 0)}/
                              {app.software?.totalSeats}
                            </p>
                          </div>
                        </div>
                        <div>
                          <h4 className="text-sm font-medium text-gray-500 mb-1">申请详情</h4>
                          <div className="text-sm space-y-1">
                            <p>
                              <span className="text-gray-600">申请类型：</span>
                              {app.type === 'course'
                                ? '课程学习'
                                : app.type === 'research'
                                ? '科研项目'
                                : '个人学习'}
                            </p>
                            {app.courseName && (
                              <p>
                                <span className="text-gray-600">课程名称：</span>
                                {app.courseName}
                              </p>
                            )}
                            {app.projectName && (
                              <p>
                                <span className="text-gray-600">项目名称：</span>
                                {app.projectName}
                              </p>
                            )}
                            <p>
                              <span className="text-gray-600">使用期限：</span>
                              {new Date(app.startDate).toLocaleDateString('zh-CN')} ~{' '}
                              {new Date(app.endDate).toLocaleDateString('zh-CN')}
                            </p>
                          </div>
                        </div>
                        <div>
                          <h4 className="text-sm font-medium text-gray-500 mb-1">审批信息</h4>
                          <div className="text-sm space-y-1">
                            <p>
                              <span className="text-gray-600">申请时间：</span>
                              {formatDate(app.createdAt)}
                            </p>
                            {app.approvedAt && (
                              <p>
                                <span className="text-gray-600">审批时间：</span>
                                {formatDate(app.approvedAt)}
                              </p>
                            )}
                            {app.rejectionReason && (
                              <p>
                                <span className="text-gray-600">拒绝原因：</span>
                                {app.rejectionReason}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                      <div>
                        <h4 className="text-sm font-medium text-gray-500 mb-1">申请用途</h4>
                        <p className="text-sm text-gray-700 bg-gray-50 rounded-lg p-3">
                          {app.purpose}
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {showRejectModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 animate-fade-in">
          <div className="bg-white rounded-xl p-6 w-full max-w-md mx-4 animate-fade-in-up">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">拒绝申请</h3>
              <button
                onClick={() => setShowRejectModal(false)}
                className="btn-ghost p-1"
                disabled={isProcessing}
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <p className="text-sm text-gray-600 mb-4">请输入拒绝原因：</p>
            <textarea
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              placeholder="请详细说明拒绝原因..."
              className="input min-h-[120px] mb-4 resize-none"
              disabled={isProcessing}
            />
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowRejectModal(false)}
                className="btn-outline"
                disabled={isProcessing}
              >
                取消
              </button>
              <button
                onClick={handleReject}
                className="btn-danger"
                disabled={isProcessing || !rejectionReason.trim()}
              >
                {isProcessing ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <XCircle className="w-4 h-4" />
                )}
                确认拒绝
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
