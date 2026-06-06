import {
  LayoutDashboard,
  Package,
  FileText,
  Clock,
  Key,
  Settings,
  Users,
  BarChart3,
  LogOut,
  Menu,
  X,
  Bell,
  Search,
} from 'lucide-react';
import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import type { UserRole } from '../../shared/types';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export function Sidebar({ isOpen, onClose }: SidebarProps) {
  const location = useLocation();
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();

  const isActive = (path: string) => location.pathname === path;

  const menuItems = [
    { path: '/', icon: LayoutDashboard, label: '仪表盘', roles: ['student', 'teacher', 'admin'] as UserRole[] },
    { path: '/software', icon: Package, label: '软件中心', roles: ['student', 'teacher', 'admin'] as UserRole[] },
    { path: '/approval', icon: FileText, label: '审批中心', roles: ['teacher', 'admin'] as UserRole[] },
    { path: '/queue', icon: Clock, label: '排队查询', roles: ['student', 'teacher', 'admin'] as UserRole[] },
    { path: '/licenses', icon: Key, label: '我的授权', roles: ['student', 'teacher', 'admin'] as UserRole[] },
    { path: '/admin/software', icon: Settings, label: '软件管理', roles: ['admin'] as UserRole[] },
    { path: '/admin/users', icon: Users, label: '用户管理', roles: ['admin'] as UserRole[] },
    { path: '/admin/statistics', icon: BarChart3, label: '统计报表', roles: ['admin'] as UserRole[] },
  ];

  const visibleItems = menuItems.filter((item) => user && item.roles.includes(user.role));

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <>
      {isOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
          onClick={onClose}
        />
      )}

      <aside
        className={`fixed lg:static inset-y-0 left-0 z-50 w-64 bg-white border-r border-gray-200 transform transition-transform duration-300 ease-in-out ${
          isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        <div className="flex flex-col h-full">
          <div className="flex items-center justify-between h-16 px-6 border-b border-gray-100">
            <Link to="/" className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary-500 to-primary-700 flex items-center justify-center">
                <Package className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="font-serif font-bold text-lg text-gray-900">软件授权池</h1>
                <p className="text-xs text-gray-500">科研资源管理</p>
              </div>
            </Link>
            <button
              onClick={onClose}
              className="lg:hidden p-1 hover:bg-gray-100 rounded-lg"
            >
              <X className="w-5 h-5 text-gray-500" />
            </button>
          </div>

          <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto scrollbar-thin">
            {visibleItems.map((item, index) => (
              <Link
                key={item.path}
                to={item.path}
                onClick={onClose}
                className={`sidebar-link ${isActive(item.path) ? 'active' : ''} opacity-0 animate-slide-in animate-stagger-${Math.min(index + 1, 6)}`}
                style={{ animationFillMode: 'forwards' }}
              >
                <item.icon className="w-5 h-5 flex-shrink-0" />
                <span className="font-medium">{item.label}</span>
              </Link>
            ))}
          </nav>

          {user && (
            <div className="p-4 border-t border-gray-100">
              <div className="flex items-center gap-3 p-3 rounded-lg bg-gray-50 mb-3">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center text-white font-semibold">
                  {user.name.charAt(0)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-gray-900 truncate">{user.name}</p>
                  <p className="text-xs text-gray-500 truncate">
                    {user.role === 'admin' ? '管理员' : user.role === 'teacher' ? '教师' : '学生'} · {user.department}
                  </p>
                </div>
              </div>
              <button
                onClick={handleLogout}
                className="w-full btn-ghost text-danger-600 hover:text-danger-700 hover:bg-danger-50"
              >
                <LogOut className="w-4 h-4" />
                退出登录
              </button>
            </div>
          )}
        </div>
      </aside>
    </>
  );
}

interface NavbarProps {
  onMenuClick: () => void;
}

export function Navbar({ onMenuClick }: NavbarProps) {
  const { user } = useAuthStore();

  return (
    <header className="h-16 bg-white border-b border-gray-100 flex items-center justify-between px-4 lg:px-8">
      <div className="flex items-center gap-4">
        <button
          onClick={onMenuClick}
          className="lg:hidden p-2 hover:bg-gray-100 rounded-lg"
        >
          <Menu className="w-5 h-5 text-gray-600" />
        </button>
        <div className="relative hidden sm:block">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="搜索软件、用户..."
            className="input pl-10 pr-4 py-2 w-64 text-sm bg-gray-50 border-transparent focus:bg-white"
          />
        </div>
      </div>

      <div className="flex items-center gap-4">
        <button className="relative p-2 hover:bg-gray-100 rounded-lg">
          <Bell className="w-5 h-5 text-gray-600" />
          <span className="absolute top-1 right-1 w-2 h-2 bg-danger-500 rounded-full" />
        </button>
        {user && (
          <div className="hidden sm:flex items-center gap-3">
            <div className="text-right">
              <p className="text-sm font-medium text-gray-900">{user.name}</p>
              <p className="text-xs text-gray-500">
                {user.role === 'admin' ? '管理员' : user.role === 'teacher' ? '教师' : '学生'}
              </p>
            </div>
            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center text-white font-semibold text-sm">
              {user.name.charAt(0)}
            </div>
          </div>
        )}
      </div>
    </header>
  );
}

interface LayoutProps {
  children: React.ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      <div className="flex">
        <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
        <div className="flex-1 flex flex-col min-h-screen">
          <Navbar onMenuClick={() => setSidebarOpen(true)} />
          <main className="flex-1 p-4 lg:p-8 overflow-auto">
            {children}
          </main>
        </div>
      </div>
    </div>
  );
}
