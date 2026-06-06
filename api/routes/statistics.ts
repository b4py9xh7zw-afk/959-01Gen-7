import { Router } from 'express';
import { authenticateToken, requireRole } from '../middleware/auth';
import { StatisticsService } from '../services/StatisticsService';

const router = Router();

router.get('/overview', authenticateToken, (req, res) => {
  const overview = StatisticsService.getOverview();

  res.json({
    success: true,
    data: overview,
  });
});

router.get('/software-usage', authenticateToken, (req, res) => {
  const { startDate, endDate } = req.query;
  const now = new Date();
  const defaultStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
  const defaultEnd = now.toISOString();

  const stats = StatisticsService.getSoftwareUsage(
    (startDate as string) || defaultStart,
    (endDate as string) || defaultEnd
  );

  res.json({
    success: true,
    data: stats,
  });
});

router.get('/department-usage', authenticateToken, (req, res) => {
  const stats = StatisticsService.getDepartmentUsage();

  res.json({
    success: true,
    data: stats,
  });
});

router.get('/popular-software', authenticateToken, (req, res) => {
  const { limit } = req.query;
  const software = StatisticsService.getPopularSoftware(parseInt(limit as string) || 5);

  res.json({
    success: true,
    data: software,
  });
});

router.get('/recent-activity', authenticateToken, (req, res) => {
  const { limit } = req.query;
  const activity = StatisticsService.getRecentActivity(parseInt(limit as string) || 10);

  res.json({
    success: true,
    data: activity,
  });
});

router.get('/monthly-usage', authenticateToken, (req, res) => {
  const data = StatisticsService.getMonthlyUsageData();

  res.json({
    success: true,
    data: data,
  });
});

export default router;
