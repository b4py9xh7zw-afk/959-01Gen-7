import express, {
  type Request,
  type Response,
  type NextFunction,
} from 'express'
import cors from 'cors'
import path from 'path'
import dotenv from 'dotenv'
import { fileURLToPath } from 'url'
import authRoutes from './routes/auth.js'
import softwareRoutes from './routes/software.js'
import applicationsRoutes from './routes/applications.js'
import queueRoutes from './routes/queue.js'
import licensesRoutes from './routes/licenses.js'
import statisticsRoutes from './routes/statistics.js'
import usersRoutes from './routes/users.js'
import { errorHandler } from './middleware/auth.js'
import { LicenseService } from './services/LicenseService.js'
import { QueueService } from './services/QueueService.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

dotenv.config()

const app: express.Application = express()

app.use(cors())
app.use(express.json({ limit: '10mb' }))
app.use(express.urlencoded({ extended: true, limit: '10mb' }))

app.use('/api/auth', authRoutes)
app.use('/api/software', softwareRoutes)
app.use('/api/applications', applicationsRoutes)
app.use('/api/queue', queueRoutes)
app.use('/api/licenses', licensesRoutes)
app.use('/api/statistics', statisticsRoutes)
app.use('/api/users', usersRoutes)

app.use(
  '/api/health',
  (req: Request, res: Response, next: NextFunction): void => {
    res.status(200).json({
      success: true,
      message: 'ok',
    })
  },
)

app.use(errorHandler)

app.use((req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    error: 'API not found',
  })
})

setInterval(() => {
  const revoked = LicenseService.revokeExpiredLicenses()
  if (revoked > 0) {
    console.log(`[定时任务] 自动回收 ${revoked} 个过期授权`)
  }
}, 60 * 60 * 1000)

setInterval(() => {
  QueueService.updateAllEstimatedWaitTimes()
  console.log('[定时任务] 已更新所有排队预计等待时间')
}, 5 * 60 * 1000)

export default app
