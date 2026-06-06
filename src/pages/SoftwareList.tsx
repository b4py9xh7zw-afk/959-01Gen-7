import { useEffect, useState } from 'react';
import { Search, Filter, Plus, Loader2, Package, Clock, Users, ChevronRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { softwareApi, queueApi } from '../lib/apiServices';
import { useAuthStore } from '../store/authStore';
import { CategoryBadge, StatusBadge } from '../components/Badges';
import type { Software, SoftwareCategory } from '../../shared/types';

const categories = [
  { value: 'all', label: '全部' },
  { value: 'statistics', label: '统计软件' },
  { value: 'simulation', label: '仿真软件' },
  { value: 'graphics', label: '绘图软件' },
  { value: 'other', label: '其他' },
];

function SoftwareCard({ software, queueLength }: { software: Software; queueLength: number }) {
  const availableSeats = software.totalSeats - software.usedSeats;
  const usageRate = software.totalSeats > 0 ? (software.usedSeats / software.totalSeats) * 100 : 0;

  return (
    <Link
      to={`/software/${software.id}`}
      className="card-hover p-6 block opacity-0 animate-fade-in-up"
    >
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center text-3xl">
            {software.icon}
          </div>
          <div>
            <h3 className="font-semibold text-lg text-gray-900">{software.name}</h3>
            <div className="flex items-center gap-2 mt-1">
              <CategoryBadge category={software.category} />
              <span className="text-xs text-gray-500">v{software.version}</span>
            </div>
          </div>
        </div>
        <ChevronRight className="w-5 h-5 text-gray-400" />
      </div>

      <p className="text-sm text-gray-600 mb-4 line-clamp-2">{software.description}</p>

      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-1 text-sm">
          <Package className="w-4 h-4 text-gray-400" />
          <span className="text-gray-600">
            <span className={availableSeats > 0 ? 'text-success-600 font-semibold' : 'text-danger-600 font-semibold'}>
              {availableSeats}
            </span>
            <span className="text-gray-400">/{software.totalSeats} 可用</span>
          </span>
        </div>
        <div className="flex items-center gap-1 text-sm">
          <Users className="w-4 h-4 text-gray-400" />
          <span className="text-gray-600">{software.usedSeats} 人使用</span>
        </div>
      </div>

      <div className="progress-bar mb-4">
        <div
          className={`progress-bar-fill ${usageRate > 80 ? 'bg-warning-500' : usageRate > 50 ? 'bg-primary-500' : 'bg-success-500'}`}
          style={{ width: `${usageRate}%` }}
        />
      </div>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          {availableSeats > 0 ? (
            <span className="badge-success">
              有席位可用
            </span>
          ) : (
            <div className="flex items-center gap-1 text-warning-600 bg-warning-50 px-2.5 py-0.5 rounded-full text-xs font-medium">
              <Clock className="w-3 h-3" />
              {queueLength} 人排队
            </div>
          )}
        </div>
        <span className="text-xs text-gray-500">
          {software.vendor}
        </span>
      </div>
    </Link>
  );
}

export default function SoftwareList() {
  const { user } = useAuthStore();
  const [softwareList, setSoftwareList] = useState<Software[]>([]);
  const [queueLengths, setQueueLengths] = useState<Record<string, number>>({});
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState<SoftwareCategory | 'all'>('all');
  const [isLoading, setIsLoading] = useState(true);
  const [total, setTotal] = useState(0);

  useEffect(() => {
    loadSoftware();
  }, [activeCategory]);

  async function loadSoftware() {
    setIsLoading(true);
    try {
      const response = await softwareApi.getAll({
        category: activeCategory === 'all' ? undefined : activeCategory,
        pageSize: 50,
      });

      if (response.success && response.data) {
        let filtered = response.data;
        if (searchQuery) {
          const query = searchQuery.toLowerCase();
          filtered = filtered.filter(
            (s) =>
              s.name.toLowerCase().includes(query) ||
              s.vendor.toLowerCase().includes(query) ||
              s.description.toLowerCase().includes(query)
          );
        }
        setSoftwareList(filtered);
        setTotal(response.total || filtered.length);

        const queueMap: Record<string, number> = {};
        for (const sw of filtered) {
          try {
            const queueRes = await queueApi.getQueue(sw.id);
            if (queueRes.success && queueRes.data) {
              queueMap[sw.id] = queueRes.data.items.length;
            }
          } catch {
            queueMap[sw.id] = 0;
          }
        }
        setQueueLengths(queueMap);
      }
    } catch (error) {
      console.error('Failed to load software:', error);
    } finally {
      setIsLoading(false);
    }
  }

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    loadSoftware();
  };

  return (
    <div className="space-y-6">
      <div className="page-header">
        <h1 className="page-title">软件中心</h1>
        <p className="page-subtitle">浏览和申请科研软件使用授权</p>
      </div>

      <div className="card p-4">
        <div className="flex flex-col sm:flex-row gap-4">
          <form onSubmit={handleSearch} className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="搜索软件名称、供应商..."
              className="input pl-10"
            />
          </form>
          <div className="flex items-center gap-2 overflow-x-auto scrollbar-thin pb-1">
            {categories.map((cat) => (
              <button
                key={cat.value}
                onClick={() => setActiveCategory(cat.value as any)}
                className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-all ${
                  activeCategory === cat.value
                    ? 'bg-primary-600 text-white shadow-md'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>
          {user?.role === 'admin' && (
            <Link to="/admin/software" className="btn-primary">
              <Plus className="w-4 h-4" />
              添加软件
            </Link>
          )}
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center h-96">
          <Loader2 className="w-8 h-8 text-primary-600 animate-spin" />
        </div>
      ) : softwareList.length === 0 ? (
        <div className="card p-12 text-center">
          <Package className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">暂无软件</h3>
          <p className="text-gray-500">没有找到符合条件的软件</p>
        </div>
      ) : (
        <>
          <p className="text-sm text-gray-500">共找到 {total} 个软件</p>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {softwareList.map((software, index) => (
              <div
                key={software.id}
                style={{ animationDelay: `${index * 0.05}s`, animationFillMode: 'forwards' }}
              >
                <SoftwareCard software={software} queueLength={queueLengths[software.id] || 0} />
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
