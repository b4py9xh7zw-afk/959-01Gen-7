import { useState, useEffect } from 'react';
import { useNavigate, useLocation, Navigate } from 'react-router-dom';
import { Package, Lock, Mail, Eye, EyeOff, Loader2 } from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import { testAccounts } from '../../shared/mockData';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const { login, isAuthenticated } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();

  const from = (location.state as any)?.from?.pathname || '/';

  useEffect(() => {
    if (isAuthenticated) {
      navigate(from, { replace: true });
    }
  }, [isAuthenticated, navigate, from]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const result = await login(email, password);
      if (result.success) {
        navigate(from, { replace: true });
      } else {
        setError(result.message || '登录失败，请检查邮箱和密码');
      }
    } catch (err) {
      setError('登录时发生错误，请稍后重试');
    } finally {
      setIsLoading(false);
    }
  };

  const handleQuickLogin = async (role: 'admin' | 'teacher' | 'student') => {
    const account = testAccounts[role];
    setEmail(account.email);
    setPassword(account.password);
    setError('');
    setIsLoading(true);

    try {
      const result = await login(account.email, account.password);
      if (result.success) {
        navigate(from, { replace: true });
      } else {
        setError(result.message || '登录失败');
      }
    } catch (err) {
      setError('登录时发生错误');
    } finally {
      setIsLoading(false);
    }
  };

  if (isAuthenticated) {
    return <Navigate to={from} replace />;
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-50 via-white to-primary-50 p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8 opacity-0 animate-fade-in" style={{ animationFillMode: 'forwards' }}>
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-primary-500 to-primary-700 mb-4 shadow-lg shadow-primary-200">
            <Package className="w-8 h-8 text-white" />
          </div>
          <h1 className="font-serif text-3xl font-bold text-gray-900 mb-2">科研软件授权池</h1>
          <p className="text-gray-500">高校科研软件资源智能管理平台</p>
        </div>

        <div className="card p-8 opacity-0 animate-fade-in-up animate-stagger-1" style={{ animationFillMode: 'forwards' }}>
          <h2 className="text-xl font-semibold text-gray-900 mb-6">欢迎回来</h2>

          {error && (
            <div className="mb-4 p-3 rounded-lg bg-danger-50 text-danger-700 text-sm animate-fade-in">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="input-label">邮箱</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="input pl-10"
                  placeholder="your.email@university.edu"
                  required
                />
              </div>
            </div>

            <div>
              <label className="input-label">密码</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="input pl-10 pr-10"
                  placeholder="••••••••"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 text-sm text-gray-600">
                <input type="checkbox" className="w-4 h-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500" />
                记住我
              </label>
              <a href="#" className="text-sm text-primary-600 hover:text-primary-700">
                忘记密码？
              </a>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full btn-primary py-3"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  登录中...
                </>
              ) : (
                '登 录'
              )}
            </button>
          </form>

          <div className="mt-6 pt-6 border-t border-gray-100">
            <p className="text-sm text-gray-500 text-center mb-4">快速体验不同角色</p>
            <div className="grid grid-cols-3 gap-3">
              <button
                type="button"
                onClick={() => handleQuickLogin('admin')}
                disabled={isLoading}
                className="py-2 px-3 text-sm rounded-lg bg-red-50 text-red-700 hover:bg-red-100 transition-colors font-medium"
              >
                管理员
              </button>
              <button
                type="button"
                onClick={() => handleQuickLogin('teacher')}
                disabled={isLoading}
                className="py-2 px-3 text-sm rounded-lg bg-indigo-50 text-indigo-700 hover:bg-indigo-100 transition-colors font-medium"
              >
                教师
              </button>
              <button
                type="button"
                onClick={() => handleQuickLogin('student')}
                disabled={isLoading}
                className="py-2 px-3 text-sm rounded-lg bg-teal-50 text-teal-700 hover:bg-teal-100 transition-colors font-medium"
              >
                学生
              </button>
            </div>
          </div>
        </div>

        <p className="text-center text-sm text-gray-500 mt-6 opacity-0 animate-fade-in animate-stagger-2" style={{ animationFillMode: 'forwards' }}>
          © 2024 科研软件授权池 · 数字化校园管理
        </p>
      </div>
    </div>
  );
}
