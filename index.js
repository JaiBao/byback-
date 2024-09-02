import 'dotenv/config'
import express from 'express'
import mysql from 'mysql2/promise'
import cors from 'cors'
import userRoute from './routes/users.js'
import productRoute from './routes/products.js'
import orderRoute from './routes/orders.js'
import './passport/passport.js'
import { Server as SocketIOServer } from 'socket.io'

const pool = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASS,
  database: process.env.DB_NAME
})

const app = express()

// 設定 CORS
// app.use(
//   cors({
//     origin: (origin, callback) => {
//       // 允許的來源，需修改為實際需要的來源
//       if (origin && (origin.includes('localhost:3000') || origin.includes('localhost:4000'))) {
//         callback(null, true)
//       } else {
//         callback(new Error('請求被拒'), false)
//       }
//     }
//   })
// )
// 設定 CORS，允許所有來源
app.use(
  cors({
    origin: (origin, callback) => {
      // 如果 `origin` 為 `undefined`，這通常表示是同源請求，可以允許
      if (!origin) return callback(null, true)

      const allowedOrigins = ['http://localhost:3000', 'http://10.0.0.7:1889', 'http://10.0.0.7']

      if (allowedOrigins.includes(origin)) {
        // 如果 `origin` 在允許的列表中
        callback(null, true)
      } else {
        // 如果 `origin` 不在允許的列表中，返回錯誤
        callback(new Error('CORS policy does not allow access from this origin: ' + origin), false)
      }
    }
  })
)

app.use(express.json())
app.use((req, res, next) => {
  req.pool = pool
  next()
})

app.use('/users', userRoute)
app.use('/products', productRoute)
app.use('/orders', orderRoute)

app.get('/', (req, res) => {
  res.status(200).json({ success: true, message: '' })
})

app.all('*', (req, res) => {
  res.status(404).json({ success: false, message: '找不到' })
})

app.use((err, req, res, next) => {
  console.error('Global error handler:', err)
  res.status(500).json({ success: false, message: '未知錯誤', error: err.message })
})

const server = app.listen(process.env.PORT || 4000, () => {
  console.log('伺服器啟動')
})

// 設定 Socket.IO 伺服器 CORS
const io = new SocketIOServer(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
})

io.on('connection', socket => {
  console.log('WebSocket client connected')

  socket.on('disconnect', () => {
    console.log('WebSocket client disconnected')
  })

  socket.on('error', error => {
    console.error('WebSocket error:', error)
  })
})

export { pool, io }
