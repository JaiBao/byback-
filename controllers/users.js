// controller/users.js
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { v4 as uuidv4 } from 'uuid'
import { JSDOM } from 'jsdom'
import createDOMPurify from 'dompurify'
import { v2 as cloudinary } from 'cloudinary'

const window = new JSDOM('').window
const DOMPurify = createDOMPurify(window)
// 註冊接口
export const register = async (req, res) => {
  const pool = req.pool
  try {
    const { account, password, email, role = 0, name, address, companyName = null, taxId = null, phoneNumber, gender, birthdate } = req.body

    // 檢查手機號碼是否已經被註冊
    const [existingPhone] = await pool.query('SELECT id FROM users WHERE phone_number = ?', [phoneNumber])
    if (existingPhone.length > 0) {
      return res.status(400).json({ success: false, message: '手機號碼已被註冊' })
    }

    // 檢查帳號是否已經被註冊
    const [existingAccount] = await pool.query('SELECT id FROM users WHERE account = ?', [account])
    if (existingAccount.length > 0) {
      return res.status(400).json({ success: false, message: '帳號已被註冊' })
    }

    const hashedPassword = await bcrypt.hash(password, 10)
    const uid = uuidv4()
    const registrationDate = new Date()

    if (role === 1) {
      // 若是廠商，先加入 pending_merchants 表
      await pool.query(
        'INSERT INTO pending_merchants (account, password, email, role, name, address, company_name, tax_id, phone_number, uid, registration_date, gender, birthdate) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
        [account, hashedPassword, email, role, name, address, companyName, taxId, phoneNumber, uid, registrationDate, gender, birthdate]
      )
      return res.status(200).json({ success: true, message: '註冊成功，請等待審核' })
    } else {
      // 若是一般使用者，直接加入 users 表
      await pool.query(
        'INSERT INTO users (account, password, email, role, name, address, company_name, tax_id, phone_number, uid, registration_date, gender, birthdate) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
        [account, hashedPassword, email, role, name, address, companyName, taxId, phoneNumber, uid, registrationDate, gender, birthdate]
      )
      return res.status(200).json({ success: true, message: '註冊成功' })
    }
  } catch (error) {
    console.error('Register error:', error)
    if (error.code === 'ER_DUP_ENTRY') {
      res.status(400).json({ success: false, message: '帳號或郵箱重複' })
    } else {
      res.status(500).json({ success: false, message: '未知錯誤', error: error.message })
    }
  }
}
// 註冊接口(驗證碼)
// export const register = async (req, res) => {
//   const pool = req.pool
//   try {
//     const {
//       account,
//       password,
//       email,
//       role = 0,
//       name,
//       address,
//       companyName = null,
//       taxId = null,
//       phoneNumber,
//       gender,
//       birthdate,
//       verificationCode // 新增驗證碼字段
//     } = req.body

//     // 將手機號碼轉換為國際格式 +8869xxxxxxxx，用於驗證碼檢查
//     let formattedPhoneNumber = phoneNumber
//     if (phoneNumber.startsWith('09')) {
//       formattedPhoneNumber = '+886' + phoneNumber.substring(1)
//     }

//     // 驗證手機驗證碼
//     const [verificationRecord] = await pool.query('SELECT code, created_at FROM verification_codes WHERE phone_number = ? ORDER BY created_at DESC LIMIT 1', [
//       formattedPhoneNumber
//     ])

//     if (verificationRecord.length === 0 || verificationRecord[0].code !== verificationCode) {
//       return res.status(400).json({ success: false, message: '驗證碼錯誤或已過期' })
//     }

//     const codeCreationTime = new Date(verificationRecord[0].created_at)
//     const currentTime = new Date()
//     const timeDifference = (currentTime - codeCreationTime) / 1000 / 60 // 以分鐘計算時間差

//     if (timeDifference > 10) {
//       // 檢查是否超過10分鐘
//       return res.status(400).json({ success: false, message: '驗證碼已過期，請重新發送' })
//     }

//     // 驗證手機號碼是否已被註冊
//     const [existingPhone] = await pool.query('SELECT id FROM users WHERE phone_number = ?', [phoneNumber])
//     if (existingPhone.length > 0) {
//       return res.status(400).json({ success: false, message: '手機號碼已被註冊' })
//     }

//     // 驗證帳號是否已被註冊
//     const [existingAccount] = await pool.query('SELECT id FROM users WHERE account = ?', [account])
//     if (existingAccount.length > 0) {
//       return res.status(400).json({ success: false, message: '帳號已被註冊' })
//     }

//     const hashedPassword = await bcrypt.hash(password, 10)
//     const uid = uuidv4()
//     const registrationDate = new Date()

//     if (role === 1) {
//       // 若是廠商，先加入 pending_merchants 表
//       await pool.query(
//         'INSERT INTO pending_merchants (account, password, email, role, name, address, company_name, tax_id, phone_number, uid, registration_date, gender, birthdate) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
//         [account, hashedPassword, email, role, name, address, companyName, taxId, phoneNumber, uid, registrationDate, gender, birthdate]
//       )
//       return res.status(200).json({ success: true, message: '註冊成功，請等待審核' })
//     } else {
//       // 若是一般使用者，直接加入 users 表
//       await pool.query(
//         'INSERT INTO users (account, password, email, role, name, address, company_name, tax_id, phone_number, uid, registration_date, gender, birthdate) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
//         [account, hashedPassword, email, role, name, address, companyName, taxId, phoneNumber, uid, registrationDate, gender, birthdate]
//       )
//       return res.status(200).json({ success: true, message: '註冊成功' })
//     }
//   } catch (error) {
//     console.error('Register error:', error)
//     if (error.code === 'ER_DUP_ENTRY') {
//       res.status(400).json({ success: false, message: '帳號或郵箱重複' })
//     } else {
//       res.status(500).json({ success: false, message: '未知錯誤', error: error.message })
//     }
//   }
// }

// 審核接口
export const approveMerchant = async (req, res) => {
  const pool = req.pool
  const { id } = req.body
  try {
    const [merchant] = await pool.query('SELECT * FROM pending_merchants WHERE id = ?', [id])
    if (merchant.length === 0) {
      return res.status(404).json({ success: false, message: '未找到待審核的廠商' })
    }

    const { account, password, email, role, name, address, company_name, tax_id, phone_number, uid, registration_date, gender, birthdate } = merchant[0]

    await pool.query(
      'INSERT INTO users (account, password, email, role, name, address, company_name, tax_id, phone_number, uid, registration_date, gender, birthdate) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [account, password, email, role, name, address, company_name, tax_id, phone_number, uid, registration_date, gender, birthdate]
    )

    await pool.query('DELETE FROM pending_merchants WHERE id = ?', [id])

    res.status(200).json({ success: true, message: '審核通過' })
  } catch (error) {
    console.error('Approve merchant error:', error)
    res.status(500).json({ success: false, message: '未知錯誤', error: error.message })
  }
}

export const login = async (req, res) => {
  const pool = req.pool
  try {
    const [users] = await pool.query('SELECT * FROM users WHERE account = ?', [req.body.account])
    const user = users[0]
    if (!user) {
      return res.status(400).json({ success: false, message: '帳號或密碼錯誤' })
    }

    const match = await bcrypt.compare(req.body.password, user.password)
    if (!match) {
      return res.status(400).json({ success: false, message: '帳號或密碼錯誤' })
    }

    const token = jwt.sign({ id: user.id }, process.env.JWT_SECRET, { expiresIn: '1 days' })
    await pool.query('INSERT INTO user_tokens (user_id, token) VALUES (?, ?)', [user.id, token])

    res.status(200).json({
      success: true,
      message: '',
      result: {
        token,
        account: user.account,
        email: user.email,
        role: user.role,
        name: user.name,
        address: user.address,
        companyName: user.company_name,
        taxId: user.tax_id,
        phoneNumber: user.phone_number,
        uid: user.uid
      }
    })
  } catch (error) {
    console.error('Login error:', error)
    res.status(500).json({ success: false, message: '未知錯誤', error: error.message })
  }
}

export const logout = async (req, res) => {
  const pool = req.pool
  try {
    await pool.query('DELETE FROM user_tokens WHERE token = ?', [req.token])
    res.status(200).json({ success: true, message: '' })
  } catch (error) {
    console.error('Logout error:', error)
    res.status(500).json({ success: false, message: '未知錯誤' })
  }
}

export const extend = async (req, res) => {
  const pool = req.pool
  try {
    const newToken = jwt.sign({ id: req.user.id }, process.env.JWT_SECRET, { expiresIn: '7 days' })
    await pool.query('UPDATE user_tokens SET token = ? WHERE token = ?', [newToken, req.token])
    res.status(200).json({ success: true, message: '', result: newToken })
  } catch (error) {
    console.error('Extend error:', error)
    res.status(500).json({ success: false, message: '未知錯誤' })
  }
}

export const getUser = async (req, res) => {
  const pool = req.pool
  try {
    const [users] = await pool.query('SELECT * FROM users WHERE id = ?', [req.user.id])
    const user = users[0]

    const [userCart] = await pool.query('SELECT * FROM user_cart WHERE user_id = ?', [req.user.id])
    const cartQuantity = userCart.reduce((total, current) => total + current.quantity, 0)

    res.status(200).json({
      success: true,
      message: '',
      result: {
        account: user.account,
        email: user.email,
        role: user.role,
        name: user.name,
        address: user.address,
        companyName: user.company_name,
        taxId: user.tax_id,
        phoneNumber: user.phone_number,
        uid: user.uid,
        cart: cartQuantity
      }
    })
  } catch (error) {
    res.status(500).json({ success: false, message: '未知錯誤' })
  }
}

export const editCart = async (req, res) => {
  const pool = req.pool
  try {
    const userId = req.user.id
    const { p_id, quantity, uid } = req.body // 從請求體中獲取 p_id, quantity, 和 uid

    // 檢查購物車中是否已經存在該商品
    const [userCart] = await pool.query('SELECT * FROM user_cart WHERE user_id = ? AND product_name = ?', [userId, p_id])

    if (userCart.length > 0) {
      const newQuantity = userCart[0].quantity + parseInt(quantity)
      if (newQuantity <= 0) {
        await pool.query('DELETE FROM user_cart WHERE user_id = ? AND product_name = ?', [userId, p_id])
      } else {
        await pool.query('UPDATE user_cart SET quantity = ? WHERE user_id = ? AND product_name = ?', [newQuantity, userId, p_id])
      }
    } else {
      const [products] = await pool.query('SELECT * FROM products WHERE id = ? AND sell = 1', [p_id])
      if (products.length === 0) {
        res.status(404).json({ success: false, message: '找不到' })
        return
      }
      // 插入新的購物車項，包括 uid
      await pool.query('INSERT INTO user_cart (user_id, product_name, quantity, uid) VALUES (?, ?, ?, ?)', [userId, p_id, parseInt(quantity), uid])
    }

    const [updatedCart] = await pool.query('SELECT * FROM user_cart WHERE user_id = ?', [userId])
    const cartQuantity = updatedCart.reduce((total, current) => total + current.quantity, 0)

    res.status(200).json({ success: true, message: '', result: cartQuantity })
  } catch (error) {
    console.error('Edit cart error:', error)
    res.status(500).json({ success: false, message: '未知錯誤' })
  }
}

// 清空購物車的 API
export const clearCart = async (req, res) => {
  const pool = req.pool
  try {
    // 刪除該用戶購物車中的所有商品
    await pool.query('DELETE FROM user_cart WHERE user_id = ?', [req.user.id])

    res.status(200).json({ success: true, message: '購物車已清空' })
  } catch (error) {
    console.error('清空購物車錯誤:', error)
    res.status(500).json({ success: false, message: '未知錯誤', error: error.message })
  }
}

export const getCart = async (req, res) => {
  const pool = req.pool
  try {
    const userId = req.user.id
    const [userCart] = await pool.query('SELECT * FROM user_cart WHERE user_id = ?', [userId])
    if (userCart.length === 0) {
      res.status(200).json({ success: true, message: '', result: [] })
      return
    }

    const productIds = userCart.map(item => item.product_name)
    const [products] = await pool.query('SELECT * FROM products WHERE id IN (?)', [productIds])

    const populatedCart = userCart.map(item => ({
      ...item,
      product: products.find(product => product.id === parseInt(item.product_name))
    }))

    res.status(200).json({ success: true, message: '', result: populatedCart })
  } catch (error) {
    console.error('Get cart error:', error)
    res.status(500).json({ success: false, message: '未知錯誤' })
  }
}

export const updateUser = async (req, res) => {
  const pool = req.pool
  const userId = req.user.id
  const { email, name, address, companyName, taxId, phoneNumber, currentPassword, password } = req.body

  try {
    const [user] = await pool.query('SELECT * FROM users WHERE id = ?', [userId])
    if (user.length === 0) {
      return res.status(404).json({ success: false, message: '用戶不存在' })
    }

    if (user[0].phone_number !== phoneNumber) {
      const [existingPhone] = await pool.query('SELECT id FROM users WHERE phone_number = ?', [phoneNumber])
      if (existingPhone.length > 0) {
        return res.status(400).json({ success: false, message: '手機號碼已被註冊' })
      }
    }

    if (password) {
      if (!currentPassword) {
        return res.status(400).json({ success: false, message: '需要提供當前密碼以更新密碼' })
      }

      const match = await bcrypt.compare(currentPassword, user[0].password)
      if (!match) {
        return res.status(400).json({ success: false, message: '當前密碼不正確' })
      }

      const hashedPassword = await bcrypt.hash(password, 10)
      await pool.query('UPDATE users SET password = ? WHERE id = ?', [hashedPassword, userId])
    }

    const updateFields = {
      email,
      name,
      address,
      company_name: companyName,
      tax_id: taxId,
      phone_number: phoneNumber
    }

    await pool.query('UPDATE users SET ? WHERE id = ?', [updateFields, userId])

    res.status(200).json({ success: true, message: '資料已更新' })
  } catch (error) {
    console.error('Update user error:', error)
    res.status(500).json({ success: false, message: '未知錯誤' })
  }
}

export const updatePassword = async (req, res) => {
  const pool = req.pool
  const userId = req.user.id
  const { currentPassword, newPassword } = req.body

  if (newPassword.length < 4 || newPassword.length > 20) {
    return res.status(400).json({ success: false, message: '新密碼長度必須在4到20個字之間' })
  }

  try {
    const [user] = await pool.query('SELECT * FROM users WHERE id = ?', [userId])
    if (user.length === 0) {
      return res.status(404).json({ success: false, message: '用戶不存在' })
    }

    const match = await bcrypt.compare(currentPassword, user[0].password)
    if (!match) {
      return res.status(400).json({ success: false, message: '當前密碼不正確' })
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10)
    await pool.query('UPDATE users SET password = ? WHERE id = ?', [hashedPassword, userId])

    res.status(200).json({ success: true, message: '密碼已更新' })
  } catch (error) {
    console.error('Update password error:', error)
    res.status(500).json({ success: false, message: '未知錯誤' })
  }
}

export const uploadBanner = async (req, res) => {
  const pool = req.pool
  const userId = req.user.id
  try {
    const [existingRecord] = await pool.query('SELECT banner FROM user_stores WHERE user_id = ?', [userId])

    if (existingRecord.length > 0 && existingRecord[0].banner) {
      const publicId = existingRecord[0].banner.split('/').pop().split('.')[0]
      await cloudinary.uploader.destroy(publicId) // 刪除 Cloudinary 上的舊圖片
    }

    if (existingRecord.length === 0) {
      await pool.query('INSERT INTO user_stores (user_id, banner) VALUES (?, ?)', [userId, req.file.path])
    } else {
      await pool.query('UPDATE user_stores SET banner = ? WHERE user_id = ?', [req.file.path, userId])
    }

    res.status(200).json({ success: true, message: '橫幅圖片已更新', result: { path: req.file.path } })
  } catch (error) {
    console.error('Upload banner error:', error)
    res.status(500).json({ success: false, message: '未知錯誤' })
  }
}

export const uploadCover = async (req, res) => {
  const pool = req.pool
  const userId = req.user.id
  try {
    const [existingRecord] = await pool.query('SELECT cover FROM user_stores WHERE user_id = ?', [userId])

    if (existingRecord.length > 0 && existingRecord[0].cover) {
      const publicId = existingRecord[0].cover.split('/').pop().split('.')[0]
      await cloudinary.uploader.destroy(publicId) // 刪除 Cloudinary 上的舊圖片
    }

    if (existingRecord.length === 0) {
      await pool.query('INSERT INTO user_stores (user_id, cover) VALUES (?, ?)', [userId, req.file.path])
    } else {
      await pool.query('UPDATE user_stores SET cover = ? WHERE user_id = ?', [req.file.path, userId])
    }

    res.status(200).json({ success: true, message: '封面圖片已更新', result: { path: req.file.path } })
  } catch (error) {
    console.error('Upload cover error:', error)
    res.status(500).json({ success: false, message: '未知錯誤' })
  }
}

export const updateDescription = async (req, res) => {
  const pool = req.pool
  const userId = req.user.id
  const { description, categories, openingHours } = req.body

  try {
    const sanitizedDescription = DOMPurify.sanitize(description)
    const [existingRecord] = await pool.query('SELECT * FROM user_stores WHERE user_id = ?', [userId])
    if (existingRecord.length === 0) {
      await pool.query('INSERT INTO user_stores (user_id, description, categories, opening_hours, product_tabs) VALUES (?, ?, ?, ?, ?)', [
        userId,
        sanitizedDescription,
        categories,
        openingHours,
        '' // 插入空的 productTabs，防止覆蓋
      ])
    } else {
      // 保留現有的 productTabs
      const currentProductTabs = existingRecord[0].product_tabs
      await pool.query('UPDATE user_stores SET description = ?, categories = ?, opening_hours = ?, product_tabs = ? WHERE user_id = ?', [
        sanitizedDescription,
        categories,
        openingHours,
        currentProductTabs, // 保留原本的 productTabs
        userId
      ])
    }
    res.status(200).json({ success: true, message: '店家描述及分類已更新' })
  } catch (error) {
    console.error('Update description error:', error)
    res.status(500).json({ success: false, message: '未知錯誤' })
  }
}

export const updateProductTabs = async (req, res) => {
  const pool = req.pool
  const userId = req.user.id
  const { productTabs } = req.body

  try {
    const [existingRecord] = await pool.query('SELECT * FROM user_stores WHERE user_id = ?', [userId])
    if (existingRecord.length === 0) {
      return res.status(404).json({ success: false, message: '找不到相關店家信息' })
    } else {
      await pool.query('UPDATE user_stores SET product_tabs = ? WHERE user_id = ?', [productTabs, userId])
    }
    res.status(200).json({ success: true, message: '產品分類已更新' })
  } catch (error) {
    console.error('Update product tabs error:', error)
    res.status(500).json({ success: false, message: '未知錯誤' })
  }
}

export const getUserStoreImages = async (req, res) => {
  const pool = req.pool
  try {
    const [result] = await pool.query(
      'SELECT banner, cover, description, categories, opening_hours AS openingHours, product_tabs AS productTabs FROM user_stores WHERE user_id = ?',
      [req.user.id]
    )

    if (result.length === 0) {
      return res.status(200).json({
        success: true,
        message: '尚未建立商店檔案',
        result: {
          banner: '',
          cover: '',
          description: '',
          categories: [],
          openingHours: '',
          productTabs: []
        }
      })
    }

    res.status(200).json({ success: true, message: '', result: result[0] })
  } catch (error) {
    console.error('Get user store images error:', error)
    res.status(500).json({ success: false, message: '未知錯誤' })
  }
}

export const getStores = async (req, res) => {
  const pool = req.pool
  try {
    const [stores] = await pool.query(`
      SELECT u.uid, u.company_name, us.cover,u.address, us.description, us.categories
      FROM users u
      LEFT JOIN user_stores us ON u.id = us.user_id
      WHERE u.role = 1 AND u.status!=0
        ORDER BY RAND()
    `)
    res.status(200).json({ success: true, result: stores })
  } catch (error) {
    console.error('Get stores error:', error)
    res.status(500).json({ success: false, message: '未知錯誤' })
  }
}

export const searchStores = async (req, res) => {
  const pool = req.pool
  const { category, store, address, city } = req.query

  let query = `
    SELECT u.uid, u.company_name, us.cover, us.categories, u.address, us.description
    FROM users u
    LEFT JOIN user_stores us ON u.id = us.user_id
    WHERE u.role = 1 AND u.status !=0
      ORDER BY RAND()
  `

  const queryParams = []
  if (category) {
    query += ' AND FIND_IN_SET(?, us.categories) > 0'
    queryParams.push(category)
  }
  if (store) {
    query += ' AND u.company_name LIKE ?'
    queryParams.push(`%${store}%`)
  }
  if (address) {
    query += " AND (REPLACE(u.address, '台', '臺') LIKE ? OR REPLACE(u.address, '臺', '台') LIKE ?)"
    queryParams.push(`%${address}%`, `%${address}%`)
  }
  if (city) {
    query += " AND (REPLACE(u.address, '台', '臺') LIKE ? OR REPLACE(u.address, '臺', '台') LIKE ?)"
    queryParams.push(`%${city}%`, `%${city}%`)
  }

  try {
    const [stores] = await pool.query(query, queryParams)
    res.status(200).json({ success: true, result: stores })
  } catch (error) {
    console.error('Search stores error:', error)
    res.status(500).json({ success: false, message: '未知錯誤' })
  }
}

export const getStoreInfo = async (req, res) => {
  const pool = req.pool
  const uid = req.params.uid
  console.log('Fetching store info for UID:', uid) // 添加日志输出
  try {
    const [stores] = await pool.query(
      `
      SELECT u.company_name,u.address, us.banner,us.cover,us.opening_hours,us.product_tabs,us.description
      FROM users u
      LEFT JOIN user_stores us ON u.id = us.user_id
      WHERE u.uid = ?
    `,
      [uid]
    )

    if (stores.length === 0) {
      console.log('No store found for UID:', uid) // 添加日志输出
      return res.status(404).json({ success: false, message: '商家不存在' })
    }

    console.log('Store info:', stores[0]) // 添加日志输出
    res.status(200).json({ success: true, result: stores[0] })
  } catch (error) {
    console.error('Get store info error:', error)
    res.status(500).json({ success: false, message: '未知錯誤' })
  }
}

export const getUserByUid = async (req, res) => {
  const pool = req.pool
  const uid = req.params.uid

  try {
    const [user] = await pool.query(
      `
      SELECT account, company_name, phone_number 
      FROM users 
      WHERE uid = ?
    `,
      [uid]
    )

    if (user.length === 0) {
      return res.status(404).json({ success: false, message: '用戶不存在' })
    }

    res.status(200).json({ success: true, result: user[0] })
  } catch (error) {
    console.error('Get user by uid error:', error)
    res.status(500).json({ success: false, message: '未知錯誤' })
  }
}

// 獲取所有會員
export const getAllUsers = async (req, res) => {
  const pool = req.pool
  const { page = 1, limit = 5, account, name, phoneNumber, role } = req.query
  const offset = (page - 1) * limit

  try {
    let query = `
      SELECT * FROM users WHERE 1=1
    `
    let countQuery = `
      SELECT COUNT(*) AS count FROM users WHERE 1=1
    `
    const queryParams = []
    const countParams = []

    if (account) {
      query += ' AND account LIKE ?'
      countQuery += ' AND account LIKE ?'
      queryParams.push(`%${account}%`)
      countParams.push(`%${account}%`)
    }

    if (name) {
      query += ' AND name LIKE ?'
      countQuery += ' AND name LIKE ?'
      queryParams.push(`%${name}%`)
      countParams.push(`%${name}%`)
    }

    if (phoneNumber) {
      query += ' AND phone_number LIKE ?'
      countQuery += ' AND phone_number LIKE ?'
      queryParams.push(`%${phoneNumber}%`)
      countParams.push(`%${phoneNumber}%`)
    }

    if (role !== undefined) {
      query += ' AND role = ?'
      countQuery += ' AND role = ?'
      queryParams.push(role)
      countParams.push(role)
    }

    query += ' LIMIT ? OFFSET ?'
    queryParams.push(parseInt(limit), parseInt(offset))

    const [users] = await pool.query(query, queryParams)
    const [countResult] = await pool.query(countQuery, countParams)

    const totalUsers = countResult[0].count
    const totalPages = Math.ceil(totalUsers / limit)

    res.status(200).json({ success: true, message: '', result: users, totalPages })
  } catch (error) {
    console.error('Get all users error:', error)
    res.status(500).json({ success: false, message: '未知錯誤' })
  }
}

// 更新會員
export const updateUserById = async (req, res) => {
  const pool = req.pool
  const { uid } = req.params
  const { email, name, address, companyName, taxId, phoneNumber, password, role, status } = req.body

  try {
    const [user] = await pool.query('SELECT * FROM users WHERE uid = ?', [uid])
    if (user.length === 0) {
      return res.status(404).json({ success: false, message: '用戶不存在' })
    }

    const updateFields = {
      email,
      name,
      address,
      company_name: companyName,
      tax_id: taxId,
      phone_number: phoneNumber,
      role,
      status
    }

    // 只有在提供新密碼時才更新密碼
    if (password) {
      const hashedPassword = await bcrypt.hash(password, 10)
      updateFields.password = hashedPassword
    }

    // 構建更新語句時排除未提供的欄位
    const fieldsToUpdate = Object.entries(updateFields).filter(([key, value]) => value !== undefined)

    if (fieldsToUpdate.length > 0) {
      const setClause = fieldsToUpdate.map(([key]) => `${key} = ?`).join(', ')
      const values = fieldsToUpdate.map(([, value]) => value)
      values.push(uid) // 將 uid 放到陣列的最後一個位置，用於 WHERE 條件

      await pool.query(`UPDATE users SET ${setClause} WHERE uid = ?`, values)
    }

    res.status(200).json({ success: true, message: '資料已更新' })
  } catch (error) {
    console.error('Update user error:', error)
    res.status(500).json({ success: false, message: '未知錯誤' })
  }
}

// 獲取待審核帳號
export const getPendingMerchants = async (req, res) => {
  const pool = req.pool
  const { page = 1, limit = 5, account, name, phoneNumber } = req.query
  const offset = (page - 1) * limit

  try {
    let query = `
      SELECT * FROM pending_merchants WHERE 1=1
    `
    let countQuery = `
      SELECT COUNT(*) AS count FROM pending_merchants WHERE 1=1
    `
    const queryParams = []
    const countParams = []

    if (account) {
      query += ' AND account LIKE ?'
      countQuery += ' AND account LIKE ?'
      queryParams.push(`%${account}%`)
      countParams.push(`%${account}%`)
    }

    if (name) {
      query += ' AND name LIKE ?'
      countQuery += ' AND name LIKE ?'
      queryParams.push(`%${name}%`)
      countParams.push(`%${name}%`)
    }

    if (phoneNumber) {
      query += ' AND phone_number LIKE ?'
      countQuery += ' AND phone_number LIKE ?'
      queryParams.push(`%${phoneNumber}%`)
      countParams.push(`%${phoneNumber}%`)
    }

    query += ' LIMIT ? OFFSET ?'
    queryParams.push(parseInt(limit), parseInt(offset))

    const [pendingMerchants] = await pool.query(query, queryParams)
    const [countResult] = await pool.query(countQuery, countParams)

    const totalPending = countResult[0].count
    const totalPages = Math.ceil(totalPending / limit)

    res.status(200).json({ success: true, message: '', result: pendingMerchants, totalPages })
  } catch (error) {
    console.error('Get pending merchants error:', error)
    res.status(500).json({ success: false, message: '未知錯誤', error: error.message })
  }
}

// 拒絕帳號
export const rejectMerchant = async (req, res) => {
  const pool = req.pool
  const { id } = req.body
  try {
    await pool.query('DELETE FROM pending_merchants WHERE id = ?', [id])
    res.status(200).json({ success: true, message: '帳號已拒絕' })
  } catch (error) {
    console.error('Reject merchant error:', error)
    res.status(500).json({ success: false, message: '未知錯誤', error: error.message })
  }
}

// 管理者用重置密碼
export const resetPassword = async (req, res) => {
  const pool = req.pool
  const { uid } = req.params
  const { newPassword } = req.body

  try {
    const [user] = await pool.query('SELECT * FROM users WHERE uid = ?', [uid])
    if (user.length === 0) {
      return res.status(404).json({ success: false, message: '用戶不存在' })
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10)
    await pool.query('UPDATE users SET password = ? WHERE uid = ?', [hashedPassword, uid])

    res.status(200).json({ success: true, message: '密碼已重置' })
  } catch (error) {
    console.error('Reset password error:', error)
    res.status(500).json({ success: false, message: '未知錯誤' })
  }
}

// 忘記密碼專用
export const resetPasswordByAccount = async (req, res) => {
  const pool = req.pool
  const { account, newPassword } = req.body

  // 查找用戶
  const [user] = await pool.query('SELECT * FROM users WHERE account = ?', [account])
  if (user.length === 0) {
    return res.status(404).json({ success: false, message: '用戶不存在' })
  }

  // 重置密碼
  const hashedPassword = await bcrypt.hash(newPassword, 10)
  await pool.query('UPDATE users SET password = ? WHERE account = ?', [hashedPassword, account])

  res.status(200).json({ success: true, message: '密碼已重置' })
}

// 獲取所有輪播圖片
export const getCarouselImages = async (req, res) => {
  const pool = req.pool
  try {
    const [results] = await pool.query('SELECT * FROM carousel_images ORDER BY created_at DESC')
    res.status(200).json({ success: true, message: '', result: results })
  } catch (error) {
    console.error('獲取輪播圖片錯誤:', error)
    res.status(500).json({ success: false, message: '無法獲取輪播圖片' })
  }
}

// 上傳新的輪播圖片
export const uploadCarouselImage = async (req, res) => {
  const pool = req.pool
  try {
    const { link_to } = req.body
    const imageUrl = req.file.path

    // 將圖片和鏈接資訊存入資料庫
    await pool.query('INSERT INTO carousel_images (image_url, link_to) VALUES (?, ?)', [imageUrl, link_to])

    res.status(200).json({ success: true, message: '圖片上傳成功', imageUrl })
  } catch (error) {
    console.error('資料庫錯誤:', error)
    res.status(500).json({ success: false, message: '保存到資料庫失敗' })
  }
}

// 刪除指定的輪播圖片
export const deleteCarouselImage = async (req, res) => {
  const pool = req.pool
  const { id } = req.params

  try {
    // 首先確認該圖片是否存在
    const [imageRecord] = await pool.query('SELECT * FROM carousel_images WHERE id = ?', [id])

    if (imageRecord.length === 0) {
      return res.status(404).json({ success: false, message: '圖片未找到' })
    }

    const imageUrl = imageRecord[0].image_url

    // 確認 publicId 的生成是否正確
    // 如果 `imageUrl` 是 Cloudinary 給出的完整網址，例如 `https://res.cloudinary.com/your-cloud-name/image/upload/v1234567890/folder/image_name.png`
    // 那麼可以這樣生成 `publicId`
    const publicId = imageUrl.split('/').slice(-2).join('/').split('.')[0]

    console.log(`正在刪除 Cloudinary 圖片的 publicId: ${publicId}`) // 打印 publicId 以供調試

    // 從 Cloudinary 刪除該圖片
    await cloudinary.uploader.destroy(publicId)

    // 從資料庫刪除該圖片的紀錄
    await pool.query('DELETE FROM carousel_images WHERE id = ?', [id])

    res.status(200).json({ success: true, message: '圖片已刪除' })
  } catch (error) {
    console.error('刪除輪播圖片時發生錯誤:', error)
    res.status(500).json({ success: false, message: '刪除圖片時發生錯誤' })
  }
}

// 獲取營業時間
export const getStoreOpeningHours = async (req, res) => {
  const pool = req.pool
  const productUid = req.params.productUid
  try {
    const [store] = await pool.query(
      `
      SELECT us.opening_hours
      FROM users u
      JOIN user_stores us ON u.id = us.user_id
      WHERE u.uid = ?
    `,
      [productUid]
    )

    if (store.length > 0) {
      res.status(200).json({ success: true, result: store[0] })
    } else {
      res.status(404).json({ success: false, message: '找不到商店' })
    }
  } catch (error) {
    console.error('Error fetching opening hours:', error)
    res.status(500).json({ success: false, message: '伺服器錯誤' })
  }
}

export const getCarouselSettings = async (req, res) => {
  const pool = req.pool
  try {
    const [results] = await pool.query('SELECT * FROM carousel_settings ORDER BY created_at DESC LIMIT 1')
    if (results.length === 0) {
      return res.status(200).json({
        success: true,
        message: 'No settings found, returning default values',
        result: { autoplay_interval: 10000, initial_slide: 1 }
      })
    }
    res.status(200).json({ success: true, message: '', result: results[0] })
  } catch (error) {
    console.error('獲取輪播設定錯誤:', error)
    res.status(500).json({ success: false, message: '無法獲取輪播設定' })
  }
}

export const updateCarouselSettings = async (req, res) => {
  const pool = req.pool
  try {
    const { autoplay_interval = 10000, initial_slide = 1 } = req.body

    await pool.query('INSERT INTO carousel_settings (autoplay_interval, initial_slide) VALUES (?, ?)', [autoplay_interval, initial_slide])

    res.status(200).json({ success: true, message: '輪播設定已更新' })
  } catch (error) {
    console.error('更新輪播設定錯誤:', error)
    res.status(500).json({ success: false, message: '無法更新輪播設定' })
  }
}
