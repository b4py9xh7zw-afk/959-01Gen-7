import { Router } from 'express';
import { AuthService } from '../services/AuthService';
import type { LoginRequest } from '../../shared/types';

const router = Router();

router.post('/login', (req, res) => {
  const { email, password } = req.body as LoginRequest;

  if (!email || !password) {
    return res.status(400).json({
      success: false,
      message: '请提供邮箱和密码',
    });
  }

  const result = AuthService.login({ email, password });

  if (!result) {
    return res.status(401).json({
      success: false,
      message: '邮箱或密码错误，或账号已失效',
    });
  }

  res.json({
    success: true,
    data: result,
    message: '登录成功',
  });
});

router.post('/logout', (req, res) => {
  const result = AuthService.logout();
  res.json({
    success: result.success,
    message: '退出成功',
  });
});

router.get('/me', (req, res) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;

  if (!token) {
    return res.status(401).json({ success: false, message: '未认证' });
  }

  const decoded = AuthService.verifyToken(token);
  if (!decoded) {
    return res.status(403).json({ success: false, message: '认证已过期' });
  }

  const user = AuthService.getUserById(decoded.userId);
  if (!user) {
    return res.status(404).json({ success: false, message: '用户不存在' });
  }

  res.json({
    success: true,
    data: user,
  });
});

export default router;
