import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  ArrowLeft,
  Loader2,
  AlertCircle,
  CheckCircle,
  Package,
  FileText,
  BookOpen,
  FlaskConical,
  User as UserIcon,
  ChevronRight,
  ChevronLeft,
  Check,
} from 'lucide-react';
import { softwareApi, applicationApi } from '../lib/apiServices';
import { useAuthStore } from '../store/authStore';
import { CategoryBadge, UsageTypeBadge } from '../components/Badges';
import type { Software, ApplicationType, User } from '../../shared/types';
import { cn } from '../lib/utils';

interface FormData {
  type: ApplicationType;
  purpose: string;
  courseName: string;
  projectName: string;
  startDate: string;
  endDate: string;
}

interface FormErrors {
  type?: string;
  purpose?: string;
  courseName?: string;
  projectName?: string;
  startDate?: string;
  endDate?: string;
}

const steps = [
  { id: 1, title: '选择软件', icon: Package },
  { id: 2, title: '填写信息', icon: FileText },
  { id: 3, title: '确认提交', icon: Check },
];

const usageTypes: { value: ApplicationType; label: string; icon: React.ElementType; description: string }[] = [
  { value: 'course', label: '课程学习', icon: BookOpen, description: '用于课程教学和学习' },
  { value: 'research', label: '科研项目', icon: FlaskConical, description: '用于科研项目研究' },
  { value: 'personal', label: '个人学习', icon: UserIcon, description: '用于个人自主学习' },
];

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

function StepIndicator({ currentStep }: { currentStep: number }) {
  return (
    <div className="flex items-center justify-center mb-8">
      {steps.map((step, index) => (
        <div key={step.id} className="flex items-center">
          <div
            className={cn(
              'flex items-center gap-2 px-4 py-2 rounded-lg transition-all duration-300',
              currentStep === step.id
                ? 'bg-primary-100 text-primary-700'
                : currentStep > step.id
                ? 'bg-success-100 text-success-700'
                : 'bg-gray-100 text-gray-400'
            )}
          >
            <step.icon
              className={cn(
                'w-5 h-5',
                currentStep > step.id && 'text-success-600'
              )}
            />
            <span className="font-medium text-sm hidden sm:inline">{step.title}</span>
          </div>
          {index < steps.length - 1 && (
            <div
              className={cn(
                'w-8 sm:w-16 h-1 mx-1 transition-all duration-500',
                currentStep > step.id ? 'bg-success-500' : 'bg-gray-200'
              )}
            />
          )}
        </div>
      ))}
    </div>
  );
}

function Step1({ software }: { software: Software }) {
  const availableSeats = software.totalSeats - software.usedSeats;
  const usageRate = software.totalSeats > 0 ? (software.usedSeats / software.totalSeats) * 100 : 0;

  return (
    <div className="space-y-6 opacity-0 animate-fade-in">
      <div className="text-center mb-6">
        <h3 className="font-serif text-xl font-semibold text-gray-900 mb-2">
          确认申请软件
        </h3>
        <p className="text-gray-500">请确认您要申请的软件信息</p>
      </div>

      <div className="card p-6">
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
            </div>
            <div className="flex flex-wrap items-center gap-4 text-sm text-gray-500 mb-4">
              <span>v{software.version}</span>
              <span>·</span>
              <span>{software.vendor}</span>
            </div>
            <p className="text-gray-600 leading-relaxed mb-4">{software.description}</p>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-4 border-t border-gray-100">
              <div className="text-center">
                <p className="text-2xl font-bold text-primary-600">{software.totalSeats}</p>
                <p className="text-xs text-gray-500">总席位</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-warning-600">{software.usedSeats}</p>
                <p className="text-xs text-gray-500">已使用</p>
              </div>
              <div className="text-center">
                <p className={cn(
                  'text-2xl font-bold',
                  availableSeats > 0 ? 'text-success-600' : 'text-danger-600'
                )}>
                  {availableSeats}
                </p>
                <p className="text-xs text-gray-500">可用</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-purple-600">{usageRate.toFixed(0)}%</p>
                <p className="text-xs text-gray-500">使用率</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-primary-50 border border-primary-200 rounded-xl p-4">
        <div className="flex items-start gap-3">
          <CheckCircle className="w-5 h-5 text-primary-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-medium text-primary-800">
              {availableSeats > 0 ? '席位充足，可立即申请' : '席位紧张，申请后可能需要排队'}
            </p>
            <p className="text-sm text-primary-600 mt-1">
              点击"下一步"继续填写申请信息
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

interface Step2Props {
  formData: FormData;
  errors: FormErrors;
  onChange: (data: Partial<FormData>) => void;
}

function Step2({ formData, errors, onChange }: Step2Props) {
  const today = new Date().toISOString().split('T')[0];
  const maxDate = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

  return (
    <div className="space-y-6 opacity-0 animate-fade-in">
      <div className="text-center mb-6">
        <h3 className="font-serif text-xl font-semibold text-gray-900 mb-2">
          填写申请信息
        </h3>
        <p className="text-gray-500">请完整填写以下申请信息</p>
      </div>

      <div className="card p-6 space-y-6">
        <div>
          <label className="input-label">使用类型 *</label>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {usageTypes.map((type) => (
              <button
                key={type.value}
                type="button"
                onClick={() => onChange({ type: type.value, courseName: '', projectName: '' })}
                className={cn(
                  'p-4 rounded-xl border-2 text-left transition-all duration-200',
                  formData.type === type.value
                    ? 'border-primary-500 bg-primary-50'
                    : 'border-gray-200 hover:border-gray-300'
                )}
              >
                <type.icon
                  className={cn(
                    'w-6 h-6 mb-2',
                    formData.type === type.value ? 'text-primary-600' : 'text-gray-400'
                  )}
                />
                <p
                  className={cn(
                    'font-medium mb-1',
                    formData.type === type.value ? 'text-primary-700' : 'text-gray-900'
                  )}
                >
                  {type.label}
                </p>
                <p className="text-xs text-gray-500">{type.description}</p>
              </button>
            ))}
          </div>
          {errors.type && (
            <p className="text-danger-600 text-sm mt-2 flex items-center gap-1">
              <AlertCircle className="w-4 h-4" />
              {errors.type}
            </p>
          )}
        </div>

        <div>
          <label className="input-label">用途说明 *</label>
          <textarea
            value={formData.purpose}
            onChange={(e) => onChange({ purpose: e.target.value })}
            placeholder="请详细描述您的使用用途..."
            rows={4}
            className={cn('input resize-none', errors.purpose && 'border-danger-300 focus:ring-danger-500')}
          />
          <div className="flex justify-between mt-1">
            {errors.purpose ? (
              <p className="text-danger-600 text-sm flex items-center gap-1">
                <AlertCircle className="w-4 h-4" />
                {errors.purpose}
              </p>
            ) : (
              <span />
            )}
            <span className="text-xs text-gray-400">{formData.purpose.length}/500</span>
          </div>
        </div>

        {formData.type === 'course' && (
          <div className="opacity-0 animate-fade-in" style={{ animationFillMode: 'forwards' }}>
            <label className="input-label">关联课程名称 *</label>
            <input
              type="text"
              value={formData.courseName}
              onChange={(e) => onChange({ courseName: e.target.value })}
              placeholder="例如：高等数学、数据结构..."
              className={cn('input', errors.courseName && 'border-danger-300 focus:ring-danger-500')}
            />
            {errors.courseName && (
              <p className="text-danger-600 text-sm mt-2 flex items-center gap-1">
                <AlertCircle className="w-4 h-4" />
                {errors.courseName}
              </p>
            )}
          </div>
        )}

        {formData.type === 'research' && (
          <div className="opacity-0 animate-fade-in" style={{ animationFillMode: 'forwards' }}>
            <label className="input-label">关联项目名称 *</label>
            <input
              type="text"
              value={formData.projectName}
              onChange={(e) => onChange({ projectName: e.target.value })}
              placeholder="例如：国家自然科学基金项目..."
              className={cn('input', errors.projectName && 'border-danger-300 focus:ring-danger-500')}
            />
            {errors.projectName && (
              <p className="text-danger-600 text-sm mt-2 flex items-center gap-1">
                <AlertCircle className="w-4 h-4" />
                {errors.projectName}
              </p>
            )}
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="input-label">使用开始日期 *</label>
            <input
              type="date"
              value={formData.startDate}
              onChange={(e) => onChange({ startDate: e.target.value })}
              min={today}
              max={maxDate}
              className={cn('input', errors.startDate && 'border-danger-300 focus:ring-danger-500')}
            />
            {errors.startDate && (
              <p className="text-danger-600 text-sm mt-2 flex items-center gap-1">
                <AlertCircle className="w-4 h-4" />
                {errors.startDate}
              </p>
            )}
          </div>
          <div>
            <label className="input-label">使用结束日期 *</label>
            <input
              type="date"
              value={formData.endDate}
              onChange={(e) => onChange({ endDate: e.target.value })}
              min={formData.startDate || today}
              max={maxDate}
              className={cn('input', errors.endDate && 'border-danger-300 focus:ring-danger-500')}
            />
            {errors.endDate && (
              <p className="text-danger-600 text-sm mt-2 flex items-center gap-1">
                <AlertCircle className="w-4 h-4" />
                {errors.endDate}
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

interface Step3Props {
  software: Software;
  formData: FormData;
  user: User | null;
}

function Step3({ software, formData, user }: Step3Props) {
  const typeInfo = usageTypes.find((t) => t.value === formData.type);

  return (
    <div className="space-y-6 opacity-0 animate-fade-in">
      <div className="text-center mb-6">
        <h3 className="font-serif text-xl font-semibold text-gray-900 mb-2">
          确认申请信息
        </h3>
        <p className="text-gray-500">请仔细核对以下信息，确认无误后提交</p>
      </div>

      <div className="card p-6 space-y-6">
        <div>
          <h4 className="text-sm font-medium text-gray-500 uppercase tracking-wider mb-3">
            软件信息
          </h4>
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center text-2xl">
                {software.icon}
              </div>
              <div>
                <p className="font-semibold text-gray-900">{software.name}</p>
                <div className="flex items-center gap-2 text-sm text-gray-500">
                  <span>v{software.version}</span>
                  <span>·</span>
                  <span>{software.vendor}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div>
          <h4 className="text-sm font-medium text-gray-500 uppercase tracking-wider mb-3">
            申请人信息
          </h4>
          <div className="bg-gray-50 rounded-lg p-4 space-y-2">
            <div className="flex justify-between">
              <span className="text-gray-500">姓名</span>
              <span className="font-medium text-gray-900">{user?.name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">部门</span>
              <span className="font-medium text-gray-900">{user?.department}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">身份</span>
              <span className="font-medium text-gray-900">
                {user?.role === 'student' ? '学生' : user?.role === 'teacher' ? '教师' : '管理员'}
              </span>
            </div>
          </div>
        </div>

        <div>
          <h4 className="text-sm font-medium text-gray-500 uppercase tracking-wider mb-3">
            申请信息
          </h4>
          <div className="bg-gray-50 rounded-lg p-4 space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-gray-500">使用类型</span>
              {typeInfo && <UsageTypeBadge type={typeInfo.value} />}
            </div>
            {formData.type === 'course' && (
              <div className="flex justify-between">
                <span className="text-gray-500">关联课程</span>
                <span className="font-medium text-gray-900">{formData.courseName}</span>
              </div>
            )}
            {formData.type === 'research' && (
              <div className="flex justify-between">
                <span className="text-gray-500">关联项目</span>
                <span className="font-medium text-gray-900">{formData.projectName}</span>
              </div>
            )}
            <div>
              <span className="text-gray-500 block mb-1">用途说明</span>
              <p className="text-gray-900 bg-white rounded-lg p-3 border border-gray-200">
                {formData.purpose}
              </p>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">使用期限</span>
              <span className="font-medium text-gray-900">
                {formatDate(formData.startDate)} 至 {formatDate(formData.endDate)}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-warning-50 border border-warning-200 rounded-xl p-4">
        <div className="flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-warning-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-medium text-warning-800">申请须知</p>
            <p className="text-sm text-warning-600 mt-1">
              提交申请后，管理员将在1-3个工作日内审核。审核通过后，您将获得软件使用授权。
              请确保填写的信息真实有效，虚假信息可能导致申请被拒绝。
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ApplicationForm() {
  const { softwareId } = useParams<{ softwareId: string }>();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [currentStep, setCurrentStep] = useState(1);
  const [software, setSoftware] = useState<Software | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [formData, setFormData] = useState<FormData>({
    type: 'personal',
    purpose: '',
    courseName: '',
    projectName: '',
    startDate: new Date().toISOString().split('T')[0],
    endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
  });
  const [errors, setErrors] = useState<FormErrors>({});

  const loadSoftware = useCallback(async () => {
    if (!softwareId) return;
    setIsLoading(true);
    setError(null);
    try {
      const response = await softwareApi.getById(softwareId);
      if (response.success && response.data) {
        setSoftware(response.data);
      } else {
        setError(response.message || '加载软件信息失败');
      }
    } catch (err) {
      setError('加载数据失败，请稍后重试');
      console.error('Failed to load software:', err);
    } finally {
      setIsLoading(false);
    }
  }, [softwareId]);

  useEffect(() => {
    if (softwareId) {
      loadSoftware();
    }
  }, [softwareId, loadSoftware]);

  const validateStep2 = (): boolean => {
    const newErrors: FormErrors = {};

    if (!formData.type) {
      newErrors.type = '请选择使用类型';
    }

    if (!formData.purpose.trim()) {
      newErrors.purpose = '请填写用途说明';
    } else if (formData.purpose.trim().length < 10) {
      newErrors.purpose = '用途说明至少需要10个字符';
    }

    if (formData.type === 'course' && !formData.courseName.trim()) {
      newErrors.courseName = '请填写关联课程名称';
    }

    if (formData.type === 'research' && !formData.projectName.trim()) {
      newErrors.projectName = '请填写关联项目名称';
    }

    if (!formData.startDate) {
      newErrors.startDate = '请选择开始日期';
    }

    if (!formData.endDate) {
      newErrors.endDate = '请选择结束日期';
    } else if (formData.startDate && formData.endDate < formData.startDate) {
      newErrors.endDate = '结束日期不能早于开始日期';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = () => {
    if (currentStep === 2 && !validateStep2()) {
      return;
    }
    setCurrentStep((prev) => Math.min(prev + 1, 3));
  };

  const handlePrev = () => {
    setCurrentStep((prev) => Math.max(prev - 1, 1));
  };

  const handleFormChange = (data: Partial<FormData>) => {
    setFormData((prev) => ({ ...prev, ...data }));
    setErrors({});
  };

  const handleSubmit = async () => {
    if (!software || !user) return;
    setIsSubmitting(true);
    setError(null);
    try {
      const response = await applicationApi.create({
        userId: user.id,
        softwareId: software.id,
        purpose: formData.purpose.trim(),
        type: formData.type,
        courseName: formData.type === 'course' ? formData.courseName.trim() : undefined,
        projectName: formData.type === 'research' ? formData.projectName.trim() : undefined,
        department: user.department,
        startDate: formData.startDate,
        endDate: formData.endDate,
      });

      if (response.success && response.data) {
        setSubmitSuccess(true);
        setTimeout(() => {
          navigate('/licenses');
        }, 2500);
      } else {
        setError(response.message || '提交申请失败');
      }
    } catch (err) {
      setError('提交申请失败，请稍后重试');
      console.error('Failed to submit application:', err);
    } finally {
      setIsSubmitting(false);
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
        <Link to="/software" className="btn-primary inline-flex">
          <ArrowLeft className="w-4 h-4" />
          返回软件列表
        </Link>
      </div>
    );
  }

  if (submitSuccess) {
    return (
      <div className="max-w-lg mx-auto">
        <div className="card p-12 text-center opacity-0 animate-fade-in">
          <div className="w-20 h-20 bg-success-100 rounded-full flex items-center justify-center mx-auto mb-6 animate-bounce">
            <CheckCircle className="w-10 h-10 text-success-600" />
          </div>
          <h3 className="font-serif text-2xl font-bold text-gray-900 mb-2">
            申请提交成功！
          </h3>
          <p className="text-gray-500 mb-6">
            您的申请已成功提交，请等待管理员审核。
            <br />
            正在跳转到我的授权页面...
          </p>
          <div className="flex items-center justify-center gap-2 text-sm text-gray-400">
            <Loader2 className="w-4 h-4 animate-spin" />
            页面跳转中
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6 opacity-0 animate-fade-in">
      <div className="flex items-center gap-4 mb-6">
        <button
          onClick={() => navigate(`/software/${software.id}`)}
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <ArrowLeft className="w-5 h-5 text-gray-600" />
        </button>
        <div>
          <h1 className="font-serif text-2xl font-bold text-gray-900">席位申请</h1>
          <p className="text-sm text-gray-500">申请软件使用授权</p>
        </div>
      </div>

      <StepIndicator currentStep={currentStep} />

      <div className="transition-all duration-300">
        {currentStep === 1 && <Step1 software={software} />}
        {currentStep === 2 && (
          <Step2 formData={formData} errors={errors} onChange={handleFormChange} />
        )}
        {currentStep === 3 && <Step3 software={software} formData={formData} user={user} />}
      </div>

      <div className="flex justify-between pt-4">
        <button
          onClick={handlePrev}
          disabled={currentStep === 1 || isSubmitting}
          className={cn(
            'btn-outline',
            currentStep === 1 && 'opacity-50 cursor-not-allowed'
          )}
        >
          <ChevronLeft className="w-4 h-4" />
          上一步
        </button>

        {currentStep < 3 ? (
          <button onClick={handleNext} className="btn-primary">
            下一步
            <ChevronRight className="w-4 h-4" />
          </button>
        ) : (
          <button
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="btn-success"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                提交中...
              </>
            ) : (
              <>
                <Check className="w-4 h-4" />
                提交申请
              </>
            )}
          </button>
        )}
      </div>
    </div>
  );
}
