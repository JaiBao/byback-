// passport/passprt.js
import passport from 'passport'
import bcrypt from 'bcrypt'
import passportLocal from 'passport-local'
import passportJWT from 'passport-jwt'
import mysql from 'mysql2/promise'
import 'dotenv/config'

const pool = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASS,
  database: process.env.DB_NAME
})

// 使用 Local 策略寫 login 方式
passport.use(
  'login',
  new passportLocal.Strategy(
    {
      usernameField: 'account',
      passwordField: 'password'
    },
    async (account, password, done) => {
      try {
        const [users] = await pool.query('SELECT * FROM users WHERE account = ?', [account])
        const user = users[0]
        if (!user) {
          return done(null, false, { message: '帳號不存在' })
        }
        if (!bcrypt.compareSync(password, user.password)) {
          return done(null, false, { message: '密碼錯誤' })
        }
        return done(null, user)
      } catch (error) {
        return done(error, false)
      }
    }
  )
)

// 使用 JWT 策略寫 jwt 方式
passport.use(
  'jwt',
  new passportJWT.Strategy(
    {
      jwtFromRequest: passportJWT.ExtractJwt.fromAuthHeaderAsBearerToken(),
      secretOrKey: process.env.JWT_SECRET,
      passReqToCallback: true,
      ignoreExpiration: false
    },
    async (req, payload, done) => {
      const expired = payload.exp * 1000 < Date.now()
      if (expired && req.originalUrl !== '/users/extend' && req.originalUrl !== '/users/logout') {
        return done(null, false, { message: '登入逾時' })
      }
      const token = req.headers.authorization.split(' ')[1]
      try {
        const [users] = await pool.query('SELECT * FROM users WHERE id = ?', [payload.id])
        const user = users[0]
        if (user) {
          return done(null, { user, token })
        }
        return done(null, false, { message: '使用者不存在或 JWT 無效' })
      } catch (error) {
        return done(error, false)
      }
    }
  )
)

passport.use(
  'jwt-ignore-expiration',
  new passportJWT.Strategy(
    {
      jwtFromRequest: passportJWT.ExtractJwt.fromAuthHeaderAsBearerToken(),
      secretOrKey: process.env.JWT_SECRET,
      passReqToCallback: true,
      ignoreExpiration: true // 忽略过期时间
    },
    async (req, payload, done) => {
      const token = req.headers.authorization.split(' ')[1]
      try {
        const [users] = await pool.query('SELECT * FROM users WHERE id = ?', [payload.id])
        const user = users[0]
        if (user) {
          return done(null, { user, token })
        }
        return done(null, false, { message: '使用者不存在或 JWT 無效' })
      } catch (error) {
        return done(error, false)
      }
    }
  )
)

export default passport
