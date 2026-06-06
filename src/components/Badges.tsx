import { cn } from '../lib/utils';
import type { ApplicationStatus, UserStatus, SeatStatus, LicenseStatus } from '../../shared/types';

interface StatusBadgeProps {
  status: string;
  className?: string;
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const statusConfig: Record<string, { label: string; className: string }> = {
    pending: { label: '待审批', className: 'badge-warning' },
    approved: { label: '已通过', className: 'badge-success' },
    rejected: { label: '已拒绝', className: 'badge-danger' },
    active: { label: '活跃', className: 'badge-success' },
    graduated: { label: '已毕业', className: 'badge-gray' },
    resigned: { label: '已离职', className: 'badge-gray' },
    available: { label: '可用', className: 'badge-success' },
    occupied: { label: '已占用', className: 'badge-warning' },
    maintenance: { label: '维护中', className: 'badge-gray' },
    expired: { label: '已过期', className: 'badge-danger' },
    revoked: { label: '已收回', className: 'badge-danger' },
  };

  const config = statusConfig[status] || { label: status, className: 'badge-gray' };

  return <span className={cn(config.className, className)}>{config.label}</span>;
}

export function CategoryBadge({ category }: { category: string }) {
  const categoryConfig: Record<string, { label: string; className: string }> = {
    statistics: { label: '统计软件', className: 'bg-blue-100 text-blue-700' },
    simulation: { label: '仿真软件', className: 'bg-purple-100 text-purple-700' },
    graphics: { label: '绘图软件', className: 'bg-green-100 text-green-700' },
    other: { label: '其他', className: 'bg-gray-100 text-gray-700' },
  };

  const config = categoryConfig[category] || { label: category, className: 'bg-gray-100 text-gray-700' };

  return <span className={`badge ${config.className}`}>{config.label}</span>;
}

export function RoleBadge({ role }: { role: string }) {
  const roleConfig: Record<string, { label: string; className: string }> = {
    admin: { label: '管理员', className: 'bg-red-100 text-red-700' },
    teacher: { label: '教师', className: 'bg-indigo-100 text-indigo-700' },
    student: { label: '学生', className: 'bg-teal-100 text-teal-700' },
  };

  const config = roleConfig[role] || { label: role, className: 'bg-gray-100 text-gray-700' };

  return <span className={`badge ${config.className}`}>{config.label}</span>;
}

export function UsageTypeBadge({ type }: { type: string }) {
  const typeConfig: Record<string, { label: string; className: string }> = {
    course: { label: '课程学习', className: 'bg-cyan-100 text-cyan-700' },
    research: { label: '科研项目', className: 'bg-amber-100 text-amber-700' },
    personal: { label: '个人学习', className: 'bg-gray-100 text-gray-700' },
  };

  const config = typeConfig[type] || { label: type, className: 'bg-gray-100 text-gray-700' };

  return <span className={`badge ${config.className}`}>{config.label}</span>;
}
