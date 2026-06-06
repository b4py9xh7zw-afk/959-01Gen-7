import { useState, useEffect, useMemo } from 'react';
import {
  Users,
  Search,
  Filter,
  Loader2,
  Plus,
  Edit2,
  RefreshCw,
  AlertCircle,
  Eye,
  X,
  ChevronLeft,
  ChevronRight,
  CheckSquare,
  Square,
  UserPlus,
  AlertTriangle,
  UserCheck,
  UserX,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { userApi, licenseApi } from '../lib/apiServices';
import { cn } from '../lib/utils';
import { StatusBadge, RoleBadge } from '../components/Badges';
import type { User, UserRole, UserStatus } from '../../shared/types';

interface FilterState {
  role: string;
  status: string;
  department: string;
}

export default function UserManagement() {
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const [users, setUsers] = useState<User[]>([]);
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [departments, setDepartments] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState<FilterState>({
    role: '',
    status: '',
    department: '',
  });
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 20;
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditRoleModal, setShowEditRoleModal] = useState(false);
  const [showUpdateStatusModal, setShowUpdateStatusModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showBulkRoleModal, setShowBulkRoleModal] = useState(false);
  const [showBulkStatusModal, setShowBulkStatusModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [editRole, setEditRole] = useState<UserRole>('student');
  const [editStatus, setEditStatus] = useState<UserStatus>('active');
  const [isProcessing, setIsProcessing] = useState(false);
  const [newUser, setNewUser] = useState({
    name: '',
    email: '',
    password: '',
    role: 'student' as UserRole,
    department: '',
    studentId: '',
    employeeId: '',
  });

  useEffect(() => {
    if (user && user.role !== 'admin') {
      navigate('/');
      return;
    }
    loadData();
  }, [user, navigate]);

  async function loadData() {
    setIsLoading(true);
    setError(null);
    try {
      const [usersRes, deptsRes] = await Promise.all([
        userApi.getAll({ pageSize: 1000 }),
        userApi.getDepartments(),
      ]);

      if (usersRes.success && usersRes.data) {
        setAllUsers(usersRes.data);
      }

      if (deptsRes.success && deptsRes.data) {
        setDepartments(deptsRes.data);
      }
    } catch (err) {
      setError('加载数据失败，请刷新重试');
      console.error('Failed to load user data:', err);
    } finally {
      setIsLoading(false);
    }
  }

  const filteredUsers = useMemo(() => {
    let filtered = [...allUsers];

    if (filters.role) {
      filtered = filtered.filter((u) => u.role === filters.role);
    }

    if (filters.status) {
      filtered = filtered.filter((u) => u.status === filters.status);
    }

    if (filters.department) {
      filtered = filtered.filter((u) => u.department === filters.department);
    }

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (u) =>
          u.name.toLowerCase().includes(query) ||
          u.email.toLowerCase().includes(query) ||
          u.studentId?.toLowerCase().includes(query) ||
          u.employeeId?.toLowerCase().includes(query)
      );
    }

    return filtered.sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }, [allUsers, filters, searchQuery]);

  const paginatedUsers = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredUsers.slice(start, start + pageSize);
  }, [filteredUsers, currentPage]);

  const totalPages = Math.ceil(filteredUsers.length / pageSize);

  const stats = useMemo(() => {
    return {
      total: allUsers.length,
      active: allUsers.filter((u) => u.status === 'active').length,
      inactive: allUsers.filter((u) => u.status !== 'active').length,
    };
  }, [allUsers]);

  useEffect(() => {
    setUsers(paginatedUsers);
  }, [paginatedUsers]);

  function toggleSelect(id: string) {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedIds(newSelected);
  }

  function toggleSelectAll() {
    if (selectedIds.size === paginatedUsers.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(paginatedUsers.map((u) => u.id)));
    }
  }

  function openEditRoleModal(user: User) {
    setSelectedUser(user);
    setEditRole(user.role);
    setShowEditRoleModal(true);
  }

  function openUpdateStatusModal(user: User) {
    setSelectedUser(user);
    setEditStatus(user.status);
    setShowUpdateStatusModal(true);
  }

  function openDetailModal(user: User) {
    setSelectedUser(user);
    setShowDetailModal(true);
  }

  async function handleUpdateRole() {
    if (!selectedUser || !editRole) return;
    setIsProcessing(true);
    try {
      const res = await userApi.updateRole(selectedUser.id, editRole);
      if (res.success) {
        setAllUsers((prev) =>
          prev.map((u) => (u.id === selectedUser.id ? { ...u, role: editRole } : u))
        );
        setShowEditRoleModal(false);
        setSelectedUser(null);
      }
    } catch (err) {
      console.error('Failed to update role:', err);
    } finally {
      setIsProcessing(false);
    }
  }

  async function handleUpdateStatus() {
    if (!selectedUser || !editStatus) return;
    const needsRevoke = editStatus === 'graduated' || editStatus === 'resigned';
    
    if (needsRevoke) {
      const confirmed = window.confirm(
        `将用户状态设置为"${editStatus === 'graduated' ? '已毕业' : '已离职'}"将自动回收该用户的所有授权，确认继续？`
      );
      if (!confirmed) return;
    }

    setIsProcessing(true);
    try {
      const res = await userApi.updateStatus(selectedUser.id, editStatus);
      if (res.success) {
        setAllUsers((prev) =>
          prev.map((u) => (u.id === selectedUser.id ? { ...u, status: editStatus } : u))
        );
        
        if (needsRevoke) {
          const licensesRes = await licenseApi.getAll({ userId: selectedUser.id, status: 'active' });
          if (licensesRes.success && licensesRes.data) {
            await Promise.all(
              licensesRes.data.map((license) => licenseApi.revoke(license.id))
            );
          }
        }
        
        setShowUpdateStatusModal(false);
        setSelectedUser(null);
      }
    } catch (err) {
      console.error('Failed to update status:', err);
    } finally {
      setIsProcessing(false);
    }
  }

  async function handleAddUser() {
    if (!newUser.name || !newUser.email || !newUser.password || !newUser.department) return;
    setIsProcessing(true);
    try {
      const res = await userApi.create(newUser);
      if (res.success && res.data) {
        setAllUsers((prev) => [res.data!, ...prev]);
        setShowAddModal(false);
        setNewUser({
          name: '',
          email: '',
          password: '',
          role: 'student',
          department: '',
          studentId: '',
          employeeId: '',
        });
      }
    } catch (err) {
      console.error('Failed to create user:', err);
    } finally {
      setIsProcessing(false);
    }
  }

  async function handleBulkUpdateRole() {
    if (selectedIds.size === 0 || !editRole) return;
    setIsProcessing(true);
    try {
      const ids = Array.from(selectedIds);
      await Promise.all(ids.map((id) => userApi.updateRole(id, editRole)));
      setAllUsers((prev) =>
        prev.map((u) => (selectedIds.has(u.id) ? { ...u, role: editRole } : u))
      );
      setSelectedIds(new Set());
      setShowBulkRoleModal(false);
    } catch (err) {
      console.error('Failed to bulk update role:', err);
    } finally {
      setIsProcessing(false);
    }
  }

  async function handleBulkUpdateStatus() {
    if (selectedIds.size === 0 || !editStatus) return;
    const needsRevoke = editStatus === 'graduated' || editStatus === 'resigned';
    
    if (needsRevoke) {
      const confirmed = window.confirm(
        `将 ${selectedIds.size} 个用户状态设置为"${editStatus === 'graduated' ? '已毕业' : '已离职'}"将自动回收这些用户的所有授权，确认继续？`
      );
      if (!confirmed) return;
    }

    setIsProcessing(true);
    try {
      const ids = Array.from(selectedIds);
      await Promise.all(ids.map((id) => userApi.updateStatus(id, editStatus)));
      
      if (needsRevoke) {
        for (const userId of ids) {
          const licensesRes = await licenseApi.getAll({ userId, status: 'active' });
          if (licensesRes.success && licensesRes.data) {
            await Promise.all(
              licensesRes.data.map((license) => licenseApi.revoke(license.id))
            );
          }
        }
      }
      
      setAllUsers((prev) =>
        prev.map((u) => (selectedIds.has(u.id) ? { ...u, status: editStatus } : u))
      );
      setSelectedIds(new Set());
      setShowBulkStatusModal(false);
    } catch (err) {
      console.error('Failed to bulk update status:', err);
    } finally {
      setIsProcessing(false);
    }
  }

  function formatDate(dateStr: string) {
    return new Date(dateStr).toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
  }

  if (!user || user.role !== 'admin') {
    return null;
  }

  return (
    <div className="space-y-6">
      <div className="page-header opacity-0 animate-fade-in" style={{ animationFillMode: 'forwards' }}>
        <h1 className="page-title">用户管理</h1>
        <p className="page-subtitle">管理系统用户及权限</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div
          className="stat-card opacity-0 animate-fade-in-up"
          style={{ animationDelay: '0.1s', animationFillMode: 'forwards' }}
        >
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-gray-500 mb-1">总用户数</p>
              <p className="text-3xl font-bold text-primary-600">{stats.total}</p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary-500 to-primary-700 flex items-center justify-center">
              <Users className="w-6 h-6 text-white" />
            </div>
          </div>
        </div>
        <div
          className="stat-card opacity-0 animate-fade-in-up"
          style={{ animationDelay: '0.2s', animationFillMode: 'forwards' }}
        >
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-gray-500 mb-1">活跃用户</p>
              <p className="text-3xl font-bold text-success-600">{stats.active}</p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-success-500 to-success-700 flex items-center justify-center">
              <UserCheck className="w-6 h-6 text-white" />
            </div>
          </div>
        </div>
        <div
          className="stat-card opacity-0 animate-fade-in-up"
          style={{ animationDelay: '0.3s', animationFillMode: 'forwards' }}
        >
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-gray-500 mb-1">已毕业/离职</p>
              <p className="text-3xl font-bold text-gray-600">{stats.inactive}</p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-gray-500 to-gray-700 flex items-center justify-center">
              <UserX className="w-6 h-6 text-white" />
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
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              placeholder="搜索姓名、邮箱、学号/工号..."
              className="input pl-10"
            />
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-gray-400" />
              <select
                value={filters.role}
                onChange={(e) => {
                  setFilters((prev) => ({ ...prev, role: e.target.value }));
                  setCurrentPage(1);
                }}
                className="input min-w-[120px]"
              >
                <option value="">全部角色</option>
                <option value="student">学生</option>
                <option value="teacher">教师</option>
                <option value="admin">管理员</option>
              </select>
            </div>
            <select
              value={filters.status}
              onChange={(e) => {
                setFilters((prev) => ({ ...prev, status: e.target.value }));
                setCurrentPage(1);
              }}
              className="input min-w-[120px]"
            >
              <option value="">全部状态</option>
              <option value="active">活跃</option>
              <option value="graduated">已毕业</option>
              <option value="resigned">已离职</option>
            </select>
            <select
              value={filters.department}
              onChange={(e) => {
                setFilters((prev) => ({ ...prev, department: e.target.value }));
                setCurrentPage(1);
              }}
              className="input min-w-[140px]"
            >
              <option value="">全部院系</option>
              {departments.map((dept) => (
                <option key={dept} value={dept}>
                  {dept}
                </option>
              ))}
            </select>
            <button onClick={loadData} className="btn-ghost" disabled={isLoading}>
              <RefreshCw className={cn('w-4 h-4', isLoading && 'animate-spin')} />
            </button>
            <button onClick={() => setShowAddModal(true)} className="btn-primary">
              <UserPlus className="w-4 h-4" />
              添加用户
            </button>
          </div>
        </div>
      </div>

      <div
        className="card overflow-hidden opacity-0 animate-fade-in-up"
        style={{ animationDelay: '0.5s', animationFillMode: 'forwards' }}
      >
        <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
          <div className="flex items-center gap-3">
            <button
              onClick={toggleSelectAll}
              className="btn-ghost text-sm py-1.5"
              disabled={isProcessing || users.length === 0}
            >
              {selectedIds.size === paginatedUsers.length && paginatedUsers.length > 0 ? (
                <CheckSquare className="w-4 h-4 text-primary-600" />
              ) : (
                <Square className="w-4 h-4" />
              )}
              全选
            </button>
            {selectedIds.size > 0 && (
              <>
                <button
                  onClick={() => {
                    setEditRole('student');
                    setShowBulkRoleModal(true);
                  }}
                  className="btn-outline text-sm py-1.5"
                  disabled={isProcessing}
                >
                  <Edit2 className="w-4 h-4" />
                  批量编辑角色 ({selectedIds.size})
                </button>
                <button
                  onClick={() => {
                    setEditStatus('active');
                    setShowBulkStatusModal(true);
                  }}
                  className="btn-outline text-sm py-1.5"
                  disabled={isProcessing}
                >
                  <AlertTriangle className="w-4 h-4" />
                  批量更新状态
                </button>
              </>
            )}
          </div>
          <div className="text-sm text-gray-500">
            共 {filteredUsers.length} 条记录，第 {currentPage} / {totalPages || 1} 页
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
        ) : users.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <Users className="w-16 h-16 text-gray-300 mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">暂无用户</h3>
            <p className="text-gray-500">
              {searchQuery || filters.role || filters.status || filters.department
                ? '没有符合条件的用户'
                : '系统中还没有用户'}
            </p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr>
                    <th className="table-header w-12">
                      <span className="sr-only">选择</span>
                    </th>
                    <th className="table-header">姓名</th>
                    <th className="table-header">邮箱</th>
                    <th className="table-header">角色</th>
                    <th className="table-header">院系</th>
                    <th className="table-header">学号/工号</th>
                    <th className="table-header">状态</th>
                    <th className="table-header">注册时间</th>
                    <th className="table-header text-right">操作</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {users.map((u, index) => (
                    <tr
                      key={u.id}
                      className={cn(
                        'transition-all duration-200 hover:bg-gray-50',
                        selectedIds.has(u.id) && 'bg-primary-50/80'
                      )}
                      style={{
                        animation: `fadeInUp 0.5s ease-out ${index * 0.03}s both`,
                      }}
                    >
                      <td className="table-cell">
                        <button
                          onClick={() => toggleSelect(u.id)}
                          disabled={isProcessing}
                        >
                          {selectedIds.has(u.id) ? (
                            <CheckSquare className="w-5 h-5 text-primary-600" />
                          ) : (
                            <Square className="w-5 h-5 text-gray-300 hover:text-gray-400" />
                          )}
                        </button>
                      </td>
                      <td className="table-cell">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center text-white text-sm font-semibold">
                            {u.name.charAt(0)}
                          </div>
                          <span className="font-medium">{u.name}</span>
                        </div>
                      </td>
                      <td className="table-cell text-gray-600">{u.email}</td>
                      <td className="table-cell">
                        <RoleBadge role={u.role} />
                      </td>
                      <td className="table-cell text-gray-600">{u.department}</td>
                      <td className="table-cell text-gray-600">
                        {u.studentId || u.employeeId || '-'}
                      </td>
                      <td className="table-cell">
                        <StatusBadge status={u.status} />
                      </td>
                      <td className="table-cell text-gray-600">
                        {formatDate(u.createdAt)}
                      </td>
                      <td className="table-cell text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => openEditRoleModal(u)}
                            className="btn-ghost p-2"
                            disabled={isProcessing}
                            title="编辑角色"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => openUpdateStatusModal(u)}
                            className="btn-ghost p-2"
                            disabled={isProcessing}
                            title="更新状态"
                          >
                            <AlertTriangle className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => openDetailModal(u)}
                            className="btn-ghost p-2"
                            disabled={isProcessing}
                            title="查看详情"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {totalPages > 1 && (
              <div className="flex items-center justify-between px-6 py-4 border-t border-gray-100">
                <button
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="btn-ghost"
                >
                  <ChevronLeft className="w-4 h-4" />
                  上一页
                </button>
                <div className="flex items-center gap-2">
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    let pageNum;
                    if (totalPages <= 5) {
                      pageNum = i + 1;
                    } else if (currentPage <= 3) {
                      pageNum = i + 1;
                    } else if (currentPage >= totalPages - 2) {
                      pageNum = totalPages - 4 + i;
                    } else {
                      pageNum = currentPage - 2 + i;
                    }
                    return (
                      <button
                        key={pageNum}
                        onClick={() => setCurrentPage(pageNum)}
                        className={cn(
                          'w-10 h-10 rounded-lg font-medium transition-all',
                          currentPage === pageNum
                            ? 'bg-primary-600 text-white'
                            : 'hover:bg-gray-100 text-gray-600'
                        )}
                      >
                        {pageNum}
                      </button>
                    );
                  })}
                </div>
                <button
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="btn-ghost"
                >
                  下一页
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 animate-fade-in">
          <div className="bg-white rounded-xl p-6 w-full max-w-lg mx-4 animate-fade-in-up max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-gray-900">添加用户</h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="btn-ghost p-1"
                disabled={isProcessing}
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="input-label">姓名 *</label>
                <input
                  type="text"
                  value={newUser.name}
                  onChange={(e) => setNewUser((prev) => ({ ...prev, name: e.target.value }))}
                  placeholder="请输入姓名"
                  className="input"
                  disabled={isProcessing}
                />
              </div>
              <div>
                <label className="input-label">邮箱 *</label>
                <input
                  type="email"
                  value={newUser.email}
                  onChange={(e) => setNewUser((prev) => ({ ...prev, email: e.target.value }))}
                  placeholder="请输入邮箱"
                  className="input"
                  disabled={isProcessing}
                />
              </div>
              <div>
                <label className="input-label">初始密码 *</label>
                <input
                  type="password"
                  value={newUser.password}
                  onChange={(e) => setNewUser((prev) => ({ ...prev, password: e.target.value }))}
                  placeholder="请输入初始密码"
                  className="input"
                  disabled={isProcessing}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="input-label">角色 *</label>
                  <select
                    value={newUser.role}
                    onChange={(e) => setNewUser((prev) => ({ ...prev, role: e.target.value as UserRole }))}
                    className="input"
                    disabled={isProcessing}
                  >
                    <option value="student">学生</option>
                    <option value="teacher">教师</option>
                    <option value="admin">管理员</option>
                  </select>
                </div>
                <div>
                  <label className="input-label">院系 *</label>
                  <select
                    value={newUser.department}
                    onChange={(e) => setNewUser((prev) => ({ ...prev, department: e.target.value }))}
                    className="input"
                    disabled={isProcessing}
                  >
                    <option value="">请选择院系</option>
                    {departments.map((dept) => (
                      <option key={dept} value={dept}>
                        {dept}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="input-label">学号（学生）</label>
                  <input
                    type="text"
                    value={newUser.studentId}
                    onChange={(e) => setNewUser((prev) => ({ ...prev, studentId: e.target.value }))}
                    placeholder="请输入学号"
                    className="input"
                    disabled={isProcessing}
                  />
                </div>
                <div>
                  <label className="input-label">工号（教师）</label>
                  <input
                    type="text"
                    value={newUser.employeeId}
                    onChange={(e) => setNewUser((prev) => ({ ...prev, employeeId: e.target.value }))}
                    placeholder="请输入工号"
                    className="input"
                    disabled={isProcessing}
                  />
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => setShowAddModal(false)}
                className="btn-outline"
                disabled={isProcessing}
              >
                取消
              </button>
              <button
                onClick={handleAddUser}
                className="btn-primary"
                disabled={isProcessing || !newUser.name || !newUser.email || !newUser.password || !newUser.department}
              >
                {isProcessing ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Plus className="w-4 h-4" />
                )}
                添加
              </button>
            </div>
          </div>
        </div>
      )}

      {showEditRoleModal && selectedUser && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 animate-fade-in">
          <div className="bg-white rounded-xl p-6 w-full max-w-md mx-4 animate-fade-in-up">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">编辑角色</h3>
              <button
                onClick={() => setShowEditRoleModal(false)}
                className="btn-ghost p-1"
                disabled={isProcessing}
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <p className="text-sm text-gray-600 mb-4">
              将 <span className="font-medium">{selectedUser.name}</span> 的角色修改为：
            </p>
            <select
              value={editRole}
              onChange={(e) => setEditRole(e.target.value as UserRole)}
              className="input mb-6"
              disabled={isProcessing}
            >
              <option value="student">学生</option>
              <option value="teacher">教师</option>
              <option value="admin">管理员</option>
            </select>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowEditRoleModal(false)}
                className="btn-outline"
                disabled={isProcessing}
              >
                取消
              </button>
              <button
                onClick={handleUpdateRole}
                className="btn-primary"
                disabled={isProcessing}
              >
                {isProcessing ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Edit2 className="w-4 h-4" />
                )}
                确认修改
              </button>
            </div>
          </div>
        </div>
      )}

      {showUpdateStatusModal && selectedUser && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 animate-fade-in">
          <div className="bg-white rounded-xl p-6 w-full max-w-md mx-4 animate-fade-in-up">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">更新状态</h3>
              <button
                onClick={() => setShowUpdateStatusModal(false)}
                className="btn-ghost p-1"
                disabled={isProcessing}
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <p className="text-sm text-gray-600 mb-4">
              将 <span className="font-medium">{selectedUser.name}</span> 的状态修改为：
            </p>
            <select
              value={editStatus}
              onChange={(e) => setEditStatus(e.target.value as UserStatus)}
              className="input mb-4"
              disabled={isProcessing}
            >
              <option value="active">活跃</option>
              <option value="graduated">已毕业</option>
              <option value="resigned">已离职</option>
            </select>
            {(editStatus === 'graduated' || editStatus === 'resigned') && (
              <div className="bg-warning-50 border border-warning-200 rounded-lg p-3 mb-6">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="w-5 h-5 text-warning-600 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-warning-700">
                    注意：设置为"已毕业"或"已离职"将自动回收该用户的所有授权。
                  </p>
                </div>
              </div>
            )}
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowUpdateStatusModal(false)}
                className="btn-outline"
                disabled={isProcessing}
              >
                取消
              </button>
              <button
                onClick={handleUpdateStatus}
                className="btn-warning"
                disabled={isProcessing}
              >
                {isProcessing ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <AlertTriangle className="w-4 h-4" />
                )}
                确认更新
              </button>
            </div>
          </div>
        </div>
      )}

      {showDetailModal && selectedUser && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 animate-fade-in">
          <div className="bg-white rounded-xl p-6 w-full max-w-lg mx-4 animate-fade-in-up max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-gray-900">用户详情</h3>
              <button
                onClick={() => setShowDetailModal(false)}
                className="btn-ghost p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="flex items-center gap-4 mb-6">
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center text-white text-2xl font-bold">
                {selectedUser.name.charAt(0)}
              </div>
              <div>
                <h4 className="text-xl font-semibold text-gray-900">{selectedUser.name}</h4>
                <div className="flex items-center gap-2 mt-1">
                  <RoleBadge role={selectedUser.role} />
                  <StatusBadge status={selectedUser.status} />
                </div>
              </div>
            </div>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-500 mb-1">邮箱</p>
                  <p className="text-gray-900">{selectedUser.email}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500 mb-1">院系</p>
                  <p className="text-gray-900">{selectedUser.department}</p>
                </div>
                {selectedUser.studentId && (
                  <div>
                    <p className="text-sm text-gray-500 mb-1">学号</p>
                    <p className="text-gray-900">{selectedUser.studentId}</p>
                  </div>
                )}
                {selectedUser.employeeId && (
                  <div>
                    <p className="text-sm text-gray-500 mb-1">工号</p>
                    <p className="text-gray-900">{selectedUser.employeeId}</p>
                  </div>
                )}
                <div>
                  <p className="text-sm text-gray-500 mb-1">注册时间</p>
                  <p className="text-gray-900">{formatDate(selectedUser.createdAt)}</p>
                </div>
                {selectedUser.enrollmentDate && (
                  <div>
                    <p className="text-sm text-gray-500 mb-1">入学日期</p>
                    <p className="text-gray-900">{formatDate(selectedUser.enrollmentDate)}</p>
                  </div>
                )}
                {selectedUser.graduationDate && (
                  <div>
                    <p className="text-sm text-gray-500 mb-1">毕业日期</p>
                    <p className="text-gray-900">{formatDate(selectedUser.graduationDate)}</p>
                  </div>
                )}
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => {
                  setShowDetailModal(false);
                  openEditRoleModal(selectedUser);
                }}
                className="btn-outline"
              >
                <Edit2 className="w-4 h-4" />
                编辑角色
              </button>
              <button
                onClick={() => {
                  setShowDetailModal(false);
                  openUpdateStatusModal(selectedUser);
                }}
                className="btn-warning"
              >
                <AlertTriangle className="w-4 h-4" />
                更新状态
              </button>
            </div>
          </div>
        </div>
      )}

      {showBulkRoleModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 animate-fade-in">
          <div className="bg-white rounded-xl p-6 w-full max-w-md mx-4 animate-fade-in-up">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">批量编辑角色</h3>
              <button
                onClick={() => setShowBulkRoleModal(false)}
                className="btn-ghost p-1"
                disabled={isProcessing}
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <p className="text-sm text-gray-600 mb-4">
              将选中的 <span className="font-medium">{selectedIds.size}</span> 个用户的角色修改为：
            </p>
            <select
              value={editRole}
              onChange={(e) => setEditRole(e.target.value as UserRole)}
              className="input mb-6"
              disabled={isProcessing}
            >
              <option value="student">学生</option>
              <option value="teacher">教师</option>
              <option value="admin">管理员</option>
            </select>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowBulkRoleModal(false)}
                className="btn-outline"
                disabled={isProcessing}
              >
                取消
              </button>
              <button
                onClick={handleBulkUpdateRole}
                className="btn-primary"
                disabled={isProcessing}
              >
                {isProcessing ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Edit2 className="w-4 h-4" />
                )}
                确认修改
              </button>
            </div>
          </div>
        </div>
      )}

      {showBulkStatusModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 animate-fade-in">
          <div className="bg-white rounded-xl p-6 w-full max-w-md mx-4 animate-fade-in-up">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">批量更新状态</h3>
              <button
                onClick={() => setShowBulkStatusModal(false)}
                className="btn-ghost p-1"
                disabled={isProcessing}
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <p className="text-sm text-gray-600 mb-4">
              将选中的 <span className="font-medium">{selectedIds.size}</span> 个用户的状态修改为：
            </p>
            <select
              value={editStatus}
              onChange={(e) => setEditStatus(e.target.value as UserStatus)}
              className="input mb-4"
              disabled={isProcessing}
            >
              <option value="active">活跃</option>
              <option value="graduated">已毕业</option>
              <option value="resigned">已离职</option>
            </select>
            {(editStatus === 'graduated' || editStatus === 'resigned') && (
              <div className="bg-warning-50 border border-warning-200 rounded-lg p-3 mb-6">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="w-5 h-5 text-warning-600 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-warning-700">
                    注意：设置为"已毕业"或"已离职"将自动回收这些用户的所有授权。
                  </p>
                </div>
              </div>
            )}
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowBulkStatusModal(false)}
                className="btn-outline"
                disabled={isProcessing}
              >
                取消
              </button>
              <button
                onClick={handleBulkUpdateStatus}
                className="btn-warning"
                disabled={isProcessing}
              >
                {isProcessing ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <AlertTriangle className="w-4 h-4" />
                )}
                确认更新
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
