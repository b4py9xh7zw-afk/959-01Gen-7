import { useState, useEffect, useMemo } from 'react';
import {
  Package,
  Search,
  Filter,
  Plus,
  Edit2,
  Trash2,
  Settings,
  Loader2,
  X,
  AlertTriangle,
  CheckCircle,
  XCircle,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  Key,
  Ban,
  Check,
  Users,
  DollarSign,
  Hash,
  Building2,
  Tag,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { softwareApi } from '../lib/apiServices';
import { StatusBadge, CategoryBadge } from '../components/Badges';
import { cn } from '../lib/utils';
import type { Software, Seat, SoftwareCategory } from '../../shared/types';

const categories: { value: SoftwareCategory | 'all'; label: string }[] = [
  { value: 'all', label: '全部分类' },
  { value: 'statistics', label: '统计软件' },
  { value: 'simulation', label: '仿真软件' },
  { value: 'graphics', label: '绘图软件' },
  { value: 'other', label: '其他' },
];

const categoryOptions: { value: SoftwareCategory; label: string }[] = [
  { value: 'statistics', label: '统计软件' },
  { value: 'simulation', label: '仿真软件' },
  { value: 'graphics', label: '绘图软件' },
  { value: 'other', label: '其他' },
];

const icons = ['📊', '📈', '📉', '🔢', '🧮', '🔬', '⚗️', '🎛️', '📐', '🎨', '⚛️', '📋', '📦', '💻', '🔧'];

interface SoftwareFormData {
  name: string;
  category: SoftwareCategory;
  version: string;
  vendor: string;
  description: string;
  totalSeats: number;
  price: number;
  purchaseDate: string;
  expirationDate: string;
  icon: string;
}

const defaultFormData: SoftwareFormData = {
  name: '',
  category: 'statistics',
  version: '',
  vendor: '',
  description: '',
  totalSeats: 10,
  price: 0,
  purchaseDate: new Date().toISOString().split('T')[0],
  expirationDate: new Date(new Date().setFullYear(new Date().getFullYear() + 1)).toISOString().split('T')[0],
  icon: '📦',
};

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
}

function formatCurrency(amount: number) {
  return new Intl.NumberFormat('zh-CN', {
    style: 'currency',
    currency: 'CNY',
    minimumFractionDigits: 0,
  }).format(amount);
}

export default function SoftwareManagement() {
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const [softwareList, setSoftwareList] = useState<Software[]>([]);
  const [allSoftware, setAllSoftware] = useState<Software[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCategory, setFilterCategory] = useState<SoftwareCategory | 'all'>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 20;

  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showSeatModal, setShowSeatModal] = useState(false);
  const [selectedSoftware, setSelectedSoftware] = useState<Software | null>(null);
  const [formData, setFormData] = useState<SoftwareFormData>(defaultFormData);
  const [isProcessing, setIsProcessing] = useState(false);

  const [seats, setSeats] = useState<Seat[]>([]);
  const [isSeatsLoading, setIsSeatsLoading] = useState(false);

  useEffect(() => {
    if (user && user.role !== 'admin') {
      navigate('/');
      return;
    }
    loadSoftware();
  }, [user, navigate]);

  async function loadSoftware() {
    setIsLoading(true);
    setError(null);
    try {
      const response = await softwareApi.getAll({ pageSize: 100 });
      if (response.success && response.data) {
        setAllSoftware(response.data);
      }
    } catch (err) {
      setError('加载软件列表失败，请刷新重试');
      console.error('Failed to load software:', err);
    } finally {
      setIsLoading(false);
    }
  }

  const filteredSoftware = useMemo(() => {
    let filtered = [...allSoftware];

    if (filterCategory !== 'all') {
      filtered = filtered.filter((s) => s.category === filterCategory);
    }

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (s) =>
          s.name.toLowerCase().includes(query) ||
          s.vendor.toLowerCase().includes(query) ||
          s.description.toLowerCase().includes(query)
      );
    }

    return filtered.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [allSoftware, filterCategory, searchQuery]);

  const totalPages = Math.ceil(filteredSoftware.length / pageSize);
  const paginatedSoftware = filteredSoftware.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

  useEffect(() => {
    setSoftwareList(paginatedSoftware);
  }, [paginatedSoftware]);

  useEffect(() => {
    setCurrentPage(1);
  }, [filterCategory, searchQuery]);

  function openAddModal() {
    setFormData(defaultFormData);
    setShowAddModal(true);
  }

  function openEditModal(software: Software) {
    setSelectedSoftware(software);
    setFormData({
      name: software.name,
      category: software.category,
      version: software.version,
      vendor: software.vendor,
      description: software.description,
      totalSeats: software.totalSeats,
      price: software.price,
      purchaseDate: software.purchaseDate.split('T')[0],
      expirationDate: software.expirationDate.split('T')[0],
      icon: software.icon,
    });
    setShowEditModal(true);
  }

  function openDeleteModal(software: Software) {
    setSelectedSoftware(software);
    setShowDeleteModal(true);
  }

  async function openSeatModal(software: Software) {
    setSelectedSoftware(software);
    setShowSeatModal(true);
    await loadSeats(software.id);
  }

  async function loadSeats(softwareId: string) {
    setIsSeatsLoading(true);
    try {
      const response = await softwareApi.getSeats(softwareId);
      if (response.success && response.data) {
        setSeats(response.data);
      }
    } catch (err) {
      console.error('Failed to load seats:', err);
    } finally {
      setIsSeatsLoading(false);
    }
  }

  async function handleAdd() {
    if (!formData.name.trim() || !formData.category || formData.totalSeats <= 0) {
      alert('请填写完整的软件信息');
      return;
    }

    setIsProcessing(true);
    try {
      const res = await softwareApi.create(formData);
      if (res.success && res.data) {
        setAllSoftware((prev) => [res.data!, ...prev]);
        setShowAddModal(false);
      }
    } catch (err) {
      console.error('Failed to create software:', err);
      alert('创建失败，请重试');
    } finally {
      setIsProcessing(false);
    }
  }

  async function handleEdit() {
    if (!selectedSoftware || !formData.name.trim() || formData.totalSeats <= 0) {
      alert('请填写完整的软件信息');
      return;
    }

    setIsProcessing(true);
    try {
      const res = await softwareApi.update(selectedSoftware.id, formData);
      if (res.success && res.data) {
        setAllSoftware((prev) => prev.map((s) => (s.id === selectedSoftware.id ? res.data! : s)));
        setShowEditModal(false);
        setSelectedSoftware(null);
      }
    } catch (err) {
      console.error('Failed to update software:', err);
      alert('更新失败，请重试');
    } finally {
      setIsProcessing(false);
    }
  }

  async function handleDelete() {
    if (!selectedSoftware) return;

    setIsProcessing(true);
    try {
      const res = await softwareApi.delete(selectedSoftware.id);
      if (res.success) {
        setAllSoftware((prev) => prev.filter((s) => s.id !== selectedSoftware.id));
        setShowDeleteModal(false);
        setSelectedSoftware(null);
      }
    } catch (err) {
      console.error('Failed to delete software:', err);
      alert('删除失败，请重试');
    } finally {
      setIsProcessing(false);
    }
  }

  async function handleAddSeat() {
    if (!selectedSoftware) return;

    setIsProcessing(true);
    try {
      const res = await softwareApi.addSeat(selectedSoftware.id);
      if (res.success && res.data) {
        setSeats((prev) => [...prev, res.data!]);
        setAllSoftware((prev) =>
          prev.map((s) =>
            s.id === selectedSoftware.id ? { ...s, totalSeats: s.totalSeats + 1 } : s
          )
        );
      }
    } catch (err) {
      console.error('Failed to add seat:', err);
      alert('添加席位失败，请重试');
    } finally {
      setIsProcessing(false);
    }
  }

  async function handleToggleSeatStatus(seat: Seat) {
    if (!selectedSoftware) return;

    const newStatus = seat.status === 'available' ? 'maintenance' : 'available';
    if (seat.status === 'occupied') {
      alert('已占用的席位无法禁用');
      return;
    }

    try {
      const res = await softwareApi.updateSeatStatus(selectedSoftware.id, seat.id, newStatus);
      if (res.success && res.data) {
        setSeats((prev) => prev.map((s) => (s.id === seat.id ? res.data! : s)));
        await loadSoftware();
      }
    } catch (err) {
      console.error('Failed to update seat status:', err);
      alert('更新席位状态失败，请重试');
    }
  }

  if (!user || user.role !== 'admin') {
    return null;
  }

  return (
    <div className="space-y-6">
      <div className="page-header opacity-0 animate-fade-in" style={{ animationFillMode: 'forwards' }}>
        <h1 className="page-title">软件管理</h1>
        <p className="page-subtitle">管理软件库和席位配置</p>
      </div>

      <div
        className="card p-4 opacity-0 animate-fade-in-up"
        style={{ animationDelay: '0.1s', animationFillMode: 'forwards' }}
      >
        <div className="flex flex-col lg:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="搜索软件名称、供应商..."
              className="input pl-10"
            />
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-gray-400" />
              <select
                value={filterCategory}
                onChange={(e) => setFilterCategory(e.target.value as SoftwareCategory | 'all')}
                className="input min-w-[140px]"
              >
                {categories.map((cat) => (
                  <option key={cat.value} value={cat.value}>
                    {cat.label}
                  </option>
                ))}
              </select>
            </div>
            <button onClick={loadSoftware} className="btn-ghost" disabled={isLoading}>
              <RefreshCw className={cn('w-4 h-4', isLoading && 'animate-spin')} />
            </button>
            <button onClick={openAddModal} className="btn-primary">
              <Plus className="w-4 h-4" />
              添加软件
            </button>
          </div>
        </div>
      </div>

      <div
        className="card overflow-hidden opacity-0 animate-fade-in-up"
        style={{ animationDelay: '0.2s', animationFillMode: 'forwards' }}
      >
        {isLoading ? (
          <div className="flex items-center justify-center py-24">
            <Loader2 className="w-8 h-8 text-primary-600 animate-spin" />
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <XCircle className="w-16 h-16 text-danger-400 mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">加载失败</h3>
            <p className="text-gray-500 mb-4">{error}</p>
            <button onClick={loadSoftware} className="btn-primary">
              <RefreshCw className="w-4 h-4" />
              重新加载
            </button>
          </div>
        ) : filteredSoftware.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <Package className="w-16 h-16 text-gray-300 mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">暂无软件</h3>
            <p className="text-gray-500">没有找到符合条件的软件</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-100">
                    <th className="table-header">软件名称</th>
                    <th className="table-header">分类</th>
                    <th className="table-header">版本</th>
                    <th className="table-header">供应商</th>
                    <th className="table-header">总席位</th>
                    <th className="table-header">已用席位</th>
                    <th className="table-header">使用率</th>
                    <th className="table-header">价格</th>
                    <th className="table-header text-right">操作</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {softwareList.map((software, index) => {
                    const usageRate =
                      software.totalSeats > 0 ? (software.usedSeats / software.totalSeats) * 100 : 0;
                    return (
                      <tr
                        key={software.id}
                        className="hover:bg-gray-50 transition-colors"
                        style={{
                          animation: `fadeInUp 0.5s ease-out ${index * 0.03}s both`,
                        }}
                      >
                        <td className="table-cell">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center text-xl">
                              {software.icon}
                            </div>
                            <span className="font-medium text-gray-900">{software.name}</span>
                          </div>
                        </td>
                        <td className="table-cell">
                          <CategoryBadge category={software.category} />
                        </td>
                        <td className="table-cell text-gray-600">v{software.version}</td>
                        <td className="table-cell text-gray-600">{software.vendor}</td>
                        <td className="table-cell">
                          <div className="flex items-center gap-1">
                            <Hash className="w-4 h-4 text-gray-400" />
                            <span className="text-gray-900 font-medium">{software.totalSeats}</span>
                          </div>
                        </td>
                        <td className="table-cell">
                          <div className="flex items-center gap-1">
                            <Users className="w-4 h-4 text-gray-400" />
                            <span
                              className={cn(
                                'font-medium',
                                software.usedSeats >= software.totalSeats ? 'text-danger-600' : 'text-gray-900'
                              )}
                            >
                              {software.usedSeats}
                            </span>
                          </div>
                        </td>
                        <td className="table-cell">
                          <div className="flex items-center gap-2">
                            <div className="w-20 h-2 bg-gray-200 rounded-full overflow-hidden">
                              <div
                                className={cn(
                                  'h-full rounded-full transition-all duration-500',
                                  usageRate > 80
                                    ? 'bg-danger-500'
                                    : usageRate > 50
                                    ? 'bg-warning-500'
                                    : 'bg-success-500'
                                )}
                                style={{ width: `${usageRate}%` }}
                              />
                            </div>
                            <span className="text-sm text-gray-600">{Math.round(usageRate)}%</span>
                          </div>
                        </td>
                        <td className="table-cell">
                          <div className="flex items-center gap-1">
                            <DollarSign className="w-4 h-4 text-gray-400" />
                            <span className="text-gray-900 font-medium">{formatCurrency(software.price)}</span>
                          </div>
                        </td>
                        <td className="table-cell">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => openEditModal(software)}
                              className="btn-ghost p-1.5 text-gray-500 hover:text-primary-600 hover:bg-primary-50"
                              title="编辑"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => openSeatModal(software)}
                              className="btn-ghost p-1.5 text-gray-500 hover:text-success-600 hover:bg-success-50"
                              title="席位管理"
                            >
                              <Settings className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => openDeleteModal(software)}
                              className="btn-ghost p-1.5 text-gray-500 hover:text-danger-600 hover:bg-danger-50"
                              title="删除"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {totalPages > 1 && (
              <div className="flex items-center justify-between px-6 py-4 border-t border-gray-100">
                <p className="text-sm text-gray-500">
                  共 {filteredSoftware.length} 条记录，第 {currentPage} / {totalPages} 页
                </p>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    className="btn-ghost p-1.5"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    let page: number;
                    if (totalPages <= 5) {
                      page = i + 1;
                    } else if (currentPage <= 3) {
                      page = i + 1;
                    } else if (currentPage >= totalPages - 2) {
                      page = totalPages - 4 + i;
                    } else {
                      page = currentPage - 2 + i;
                    }
                    return (
                      <button
                        key={page}
                        onClick={() => setCurrentPage(page)}
                        className={cn(
                          'w-8 h-8 rounded-lg text-sm font-medium transition-all',
                          currentPage === page
                            ? 'bg-primary-600 text-white'
                            : 'text-gray-600 hover:bg-gray-100'
                        )}
                      >
                        {page}
                      </button>
                    );
                  })}
                  <button
                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                    className="btn-ghost p-1.5"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 animate-fade-in">
          <div className="bg-white rounded-xl p-6 w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto animate-fade-in-up">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-gray-900">添加软件</h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="btn-ghost p-1"
                disabled={isProcessing}
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="input-label">
                  <Package className="w-4 h-4 inline mr-1" />
                  软件名称 *
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="请输入软件名称"
                  className="input"
                  disabled={isProcessing}
                />
              </div>
              <div>
                <label className="input-label">
                  <Tag className="w-4 h-4 inline mr-1" />
                  分类 *
                </label>
                <select
                  value={formData.category}
                  onChange={(e) =>
                    setFormData({ ...formData, category: e.target.value as SoftwareCategory })
                  }
                  className="input"
                  disabled={isProcessing}
                >
                  {categoryOptions.map((cat) => (
                    <option key={cat.value} value={cat.value}>
                      {cat.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="input-label">
                  <Hash className="w-4 h-4 inline mr-1" />
                  版本
                </label>
                <input
                  type="text"
                  value={formData.version}
                  onChange={(e) => setFormData({ ...formData, version: e.target.value })}
                  placeholder="例如: 29.0"
                  className="input"
                  disabled={isProcessing}
                />
              </div>
              <div>
                <label className="input-label">
                  <Building2 className="w-4 h-4 inline mr-1" />
                  供应商
                </label>
                <input
                  type="text"
                  value={formData.vendor}
                  onChange={(e) => setFormData({ ...formData, vendor: e.target.value })}
                  placeholder="请输入供应商名称"
                  className="input"
                  disabled={isProcessing}
                />
              </div>
              <div>
                <label className="input-label">
                  <Users className="w-4 h-4 inline mr-1" />
                  总席位 *
                </label>
                <input
                  type="number"
                  min="1"
                  value={formData.totalSeats}
                  onChange={(e) =>
                    setFormData({ ...formData, totalSeats: parseInt(e.target.value) || 0 })
                  }
                  className="input"
                  disabled={isProcessing}
                />
              </div>
              <div>
                <label className="input-label">
                  <DollarSign className="w-4 h-4 inline mr-1" />
                  价格 (元)
                </label>
                <input
                  type="number"
                  min="0"
                  value={formData.price}
                  onChange={(e) =>
                    setFormData({ ...formData, price: parseInt(e.target.value) || 0 })
                  }
                  className="input"
                  disabled={isProcessing}
                />
              </div>
              <div>
                <label className="input-label">
                  <CheckCircle className="w-4 h-4 inline mr-1" />
                  采购日期
                </label>
                <input
                  type="date"
                  value={formData.purchaseDate}
                  onChange={(e) => setFormData({ ...formData, purchaseDate: e.target.value })}
                  className="input"
                  disabled={isProcessing}
                />
              </div>
              <div>
                <label className="input-label">
                  <AlertTriangle className="w-4 h-4 inline mr-1" />
                  到期日期
                </label>
                <input
                  type="date"
                  value={formData.expirationDate}
                  onChange={(e) => setFormData({ ...formData, expirationDate: e.target.value })}
                  className="input"
                  disabled={isProcessing}
                />
              </div>
              <div>
                <label className="input-label">
                  <Package className="w-4 h-4 inline mr-1" />
                  图标
                </label>
                <div className="flex flex-wrap gap-2 p-2 border border-gray-200 rounded-lg">
                  {icons.map((icon) => (
                    <button
                      key={icon}
                      type="button"
                      onClick={() => setFormData({ ...formData, icon })}
                      className={cn(
                        'w-10 h-10 rounded-lg text-xl flex items-center justify-center transition-all',
                        formData.icon === icon
                          ? 'bg-primary-100 ring-2 ring-primary-500'
                          : 'hover:bg-gray-100'
                      )}
                      disabled={isProcessing}
                    >
                      {icon}
                    </button>
                  ))}
                </div>
              </div>
              <div className="md:col-span-2">
                <label className="input-label">描述</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="请输入软件描述"
                  className="input min-h-[100px] resize-none"
                  disabled={isProcessing}
                />
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
                onClick={handleAdd}
                className="btn-primary"
                disabled={isProcessing || !formData.name.trim()}
              >
                {isProcessing ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Plus className="w-4 h-4" />
                )}
                添加软件
              </button>
            </div>
          </div>
        </div>
      )}

      {showEditModal && selectedSoftware && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 animate-fade-in">
          <div className="bg-white rounded-xl p-6 w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto animate-fade-in-up">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-gray-900">编辑软件</h3>
              <button
                onClick={() => {
                  setShowEditModal(false);
                  setSelectedSoftware(null);
                }}
                className="btn-ghost p-1"
                disabled={isProcessing}
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="input-label">
                  <Package className="w-4 h-4 inline mr-1" />
                  软件名称 *
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="请输入软件名称"
                  className="input"
                  disabled={isProcessing}
                />
              </div>
              <div>
                <label className="input-label">
                  <Tag className="w-4 h-4 inline mr-1" />
                  分类 *
                </label>
                <select
                  value={formData.category}
                  onChange={(e) =>
                    setFormData({ ...formData, category: e.target.value as SoftwareCategory })
                  }
                  className="input"
                  disabled={isProcessing}
                >
                  {categoryOptions.map((cat) => (
                    <option key={cat.value} value={cat.value}>
                      {cat.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="input-label">
                  <Hash className="w-4 h-4 inline mr-1" />
                  版本
                </label>
                <input
                  type="text"
                  value={formData.version}
                  onChange={(e) => setFormData({ ...formData, version: e.target.value })}
                  placeholder="例如: 29.0"
                  className="input"
                  disabled={isProcessing}
                />
              </div>
              <div>
                <label className="input-label">
                  <Building2 className="w-4 h-4 inline mr-1" />
                  供应商
                </label>
                <input
                  type="text"
                  value={formData.vendor}
                  onChange={(e) => setFormData({ ...formData, vendor: e.target.value })}
                  placeholder="请输入供应商名称"
                  className="input"
                  disabled={isProcessing}
                />
              </div>
              <div>
                <label className="input-label">
                  <Users className="w-4 h-4 inline mr-1" />
                  总席位 *
                </label>
                <input
                  type="number"
                  min="1"
                  value={formData.totalSeats}
                  onChange={(e) =>
                    setFormData({ ...formData, totalSeats: parseInt(e.target.value) || 0 })
                  }
                  className="input"
                  disabled={isProcessing}
                />
              </div>
              <div>
                <label className="input-label">
                  <DollarSign className="w-4 h-4 inline mr-1" />
                  价格 (元)
                </label>
                <input
                  type="number"
                  min="0"
                  value={formData.price}
                  onChange={(e) =>
                    setFormData({ ...formData, price: parseInt(e.target.value) || 0 })
                  }
                  className="input"
                  disabled={isProcessing}
                />
              </div>
              <div>
                <label className="input-label">
                  <CheckCircle className="w-4 h-4 inline mr-1" />
                  采购日期
                </label>
                <input
                  type="date"
                  value={formData.purchaseDate}
                  onChange={(e) => setFormData({ ...formData, purchaseDate: e.target.value })}
                  className="input"
                  disabled={isProcessing}
                />
              </div>
              <div>
                <label className="input-label">
                  <AlertTriangle className="w-4 h-4 inline mr-1" />
                  到期日期
                </label>
                <input
                  type="date"
                  value={formData.expirationDate}
                  onChange={(e) => setFormData({ ...formData, expirationDate: e.target.value })}
                  className="input"
                  disabled={isProcessing}
                />
              </div>
              <div>
                <label className="input-label">
                  <Package className="w-4 h-4 inline mr-1" />
                  图标
                </label>
                <div className="flex flex-wrap gap-2 p-2 border border-gray-200 rounded-lg">
                  {icons.map((icon) => (
                    <button
                      key={icon}
                      type="button"
                      onClick={() => setFormData({ ...formData, icon })}
                      className={cn(
                        'w-10 h-10 rounded-lg text-xl flex items-center justify-center transition-all',
                        formData.icon === icon
                          ? 'bg-primary-100 ring-2 ring-primary-500'
                          : 'hover:bg-gray-100'
                      )}
                      disabled={isProcessing}
                    >
                      {icon}
                    </button>
                  ))}
                </div>
              </div>
              <div className="md:col-span-2">
                <label className="input-label">描述</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="请输入软件描述"
                  className="input min-h-[100px] resize-none"
                  disabled={isProcessing}
                />
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => {
                  setShowEditModal(false);
                  setSelectedSoftware(null);
                }}
                className="btn-outline"
                disabled={isProcessing}
              >
                取消
              </button>
              <button
                onClick={handleEdit}
                className="btn-primary"
                disabled={isProcessing || !formData.name.trim()}
              >
                {isProcessing ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Check className="w-4 h-4" />
                )}
                保存修改
              </button>
            </div>
          </div>
        </div>
      )}

      {showDeleteModal && selectedSoftware && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 animate-fade-in">
          <div className="bg-white rounded-xl p-6 w-full max-w-md mx-4 animate-fade-in-up">
            <div className="flex items-center gap-4 mb-4">
              <div className="w-12 h-12 rounded-full bg-danger-100 flex items-center justify-center flex-shrink-0">
                <AlertTriangle className="w-6 h-6 text-danger-600" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">确认删除</h3>
                <p className="text-sm text-gray-500">此操作不可撤销</p>
              </div>
            </div>
            <div className="bg-gray-50 rounded-lg p-4 mb-6">
              <p className="text-sm text-gray-600">
                确定要删除软件{' '}
                <span className="font-medium text-gray-900">{selectedSoftware.name}</span>{' '}
                吗？删除后所有相关的席位、授权和排队信息也将被清除。
              </p>
            </div>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => {
                  setShowDeleteModal(false);
                  setSelectedSoftware(null);
                }}
                className="btn-outline"
                disabled={isProcessing}
              >
                取消
              </button>
              <button
                onClick={handleDelete}
                className="btn-danger"
                disabled={isProcessing}
              >
                {isProcessing ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Trash2 className="w-4 h-4" />
                )}
                确认删除
              </button>
            </div>
          </div>
        </div>
      )}

      {showSeatModal && selectedSoftware && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 animate-fade-in">
          <div className="bg-white rounded-xl p-6 w-full max-w-4xl mx-4 max-h-[90vh] overflow-y-auto animate-fade-in-up">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center text-xl">
                  {selectedSoftware.icon}
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">席位管理</h3>
                  <p className="text-sm text-gray-500">{selectedSoftware.name}</p>
                </div>
              </div>
              <button
                onClick={() => {
                  setShowSeatModal(false);
                  setSelectedSoftware(null);
                  setSeats([]);
                }}
                className="btn-ghost p-1"
                disabled={isProcessing}
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-4 text-sm">
                <div className="flex items-center gap-1">
                  <Hash className="w-4 h-4 text-gray-400" />
                  <span className="text-gray-600">
                    总席位：<span className="font-medium text-gray-900">{seats.length}</span>
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  <Users className="w-4 h-4 text-gray-400" />
                  <span className="text-gray-600">
                    已用：<span className="font-medium text-warning-600">
                      {seats.filter((s) => s.status === 'occupied').length}
                    </span>
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  <CheckCircle className="w-4 h-4 text-gray-400" />
                  <span className="text-gray-600">
                    可用：<span className="font-medium text-success-600">
                      {seats.filter((s) => s.status === 'available').length}
                    </span>
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  <Ban className="w-4 h-4 text-gray-400" />
                  <span className="text-gray-600">
                    维护中：<span className="font-medium text-gray-600">
                      {seats.filter((s) => s.status === 'maintenance').length}
                    </span>
                  </span>
                </div>
              </div>
              <button
                onClick={handleAddSeat}
                className="btn-primary text-sm py-1.5"
                disabled={isProcessing}
              >
                {isProcessing ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Plus className="w-4 h-4" />
                )}
                添加席位
              </button>
            </div>

            {isSeatsLoading ? (
              <div className="flex items-center justify-center py-16">
                <Loader2 className="w-8 h-8 text-primary-600 animate-spin" />
              </div>
            ) : seats.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <Key className="w-16 h-16 text-gray-300 mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">暂无席位</h3>
                <p className="text-gray-500">点击上方按钮添加新席位</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-100">
                      <th className="table-header">席位ID</th>
                      <th className="table-header">许可证密钥</th>
                      <th className="table-header">状态</th>
                      <th className="table-header">分配时间</th>
                      <th className="table-header text-right">操作</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {seats.map((seat, index) => (
                      <tr
                        key={seat.id}
                        className="hover:bg-gray-50 transition-colors"
                        style={{
                          animation: `fadeInUp 0.3s ease-out ${index * 0.02}s both`,
                        }}
                      >
                        <td className="table-cell">
                          <span className="font-mono text-sm text-gray-600">{seat.id}</span>
                        </td>
                        <td className="table-cell">
                          <span className="font-mono text-sm text-gray-900">
                            {seat.licenseKey}
                          </span>
                        </td>
                        <td className="table-cell">
                          <StatusBadge status={seat.status} />
                        </td>
                        <td className="table-cell text-gray-600">
                          {seat.assignedAt ? formatDate(seat.assignedAt) : '-'}
                        </td>
                        <td className="table-cell text-right">
                          <button
                            onClick={() => handleToggleSeatStatus(seat)}
                            disabled={seat.status === 'occupied'}
                            className={cn(
                              'btn-ghost text-sm py-1 px-2',
                              seat.status === 'occupied'
                                ? 'text-gray-300 cursor-not-allowed'
                                : seat.status === 'available'
                                ? 'text-warning-600 hover:bg-warning-50'
                                : 'text-success-600 hover:bg-success-50'
                            )}
                          >
                            {seat.status === 'available' ? (
                              <>
                                <Ban className="w-3.5 h-3.5 inline mr-1" />
                                禁用
                              </>
                            ) : seat.status === 'maintenance' ? (
                              <>
                                <Check className="w-3.5 h-3.5 inline mr-1" />
                                启用
                              </>
                            ) : (
                              '使用中'
                            )}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
