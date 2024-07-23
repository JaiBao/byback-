// controller/users.js
import bcrypt from 'bcrypt'
import jwt from 'jsonwebtoken'
import { v4 as uuidv4 } from 'uuid'

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

    await pool.query(
      'INSERT INTO users (account, password, email, role, name, address, company_name, tax_id, phone_number, uid, registration_date, gender, birthdate) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [account, hashedPassword, email, role, name, address, companyName, taxId, phoneNumber, uid, registrationDate, gender, birthdate]
    )

    res.status(200).json({ success: true, message: '註冊成功' })
  } catch (error) {
    console.error('Register error:', error)
    if (error.code === 'ER_DUP_ENTRY') {
      res.status(400).json({ success: false, message: '帳號或郵箱重複' })
    } else {
      res.status(500).json({ success: false, message: '未知錯誤', error: error.message })
    }
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
    const [userCart] = await pool.query('SELECT * FROM user_cart WHERE user_id = ? AND product_name = ?', [userId, req.body.p_id])

    if (userCart.length > 0) {
      const quantity = userCart[0].quantity + parseInt(req.body.quantity)
      if (quantity <= 0) {
        await pool.query('DELETE FROM user_cart WHERE user_id = ? AND product_name = ?', [userId, req.body.p_id])
      } else {
        await pool.query('UPDATE user_cart SET quantity = ? WHERE user_id = ? AND product_name = ?', [quantity, userId, req.body.p_id])
      }
    } else {
      const [products] = await pool.query('SELECT * FROM products WHERE id = ? AND sell = 1', [req.body.p_id])
      if (products.length === 0) {
        res.status(404).json({ success: false, message: '找不到' })
        return
      }
      await pool.query('INSERT INTO user_cart (user_id, product_name, quantity) VALUES (?, ?, ?)', [userId, req.body.p_id, parseInt(req.body.quantity)])
    }

    const [updatedCart] = await pool.query('SELECT * FROM user_cart WHERE user_id = ?', [userId])
    const cartQuantity = updatedCart.reduce((total, current) => total + current.quantity, 0)

    res.status(200).json({ success: true, message: '', result: cartQuantity })
  } catch (error) {
    console.error('Edit cart error:', error)
    res.status(500).json({ success: false, message: '未知錯誤' })
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
    const [existingRecord] = await pool.query('SELECT * FROM user_stores WHERE user_id = ?', [userId])
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
    const [existingRecord] = await pool.query('SELECT * FROM user_stores WHERE user_id = ?', [userId])
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

export const getUserStoreImages = async (req, res) => {
  const pool = req.pool
  try {
    const [result] = await pool.query('SELECT banner, cover FROM user_stores WHERE user_id = ?', [req.user.id])
    if (result.length === 0) {
      return res.status(404).json({ success: false, message: '找不到圖片' })
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
      SELECT u.uid, u.company_name, us.cover,u.address
      FROM users u
      LEFT JOIN user_stores us ON u.id = us.user_id
      WHERE u.role = 1
    `)
    res.status(200).json({ success: true, result: stores })
  } catch (error) {
    console.error('Get stores error:', error)
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
      SELECT u.company_name, us.banner
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
  try {
    const [users] = await pool.query('SELECT * FROM users')
    res.status(200).json({ success: true, message: '', result: users })
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

    if (password) {
      const hashedPassword = await bcrypt.hash(password, 10)
      updateFields.password = hashedPassword
    }

    await pool.query('UPDATE users SET ? WHERE uid = ?', [updateFields, uid])

    res.status(200).json({ success: true, message: '資料已更新' })
  } catch (error) {
    console.error('Update user error:', error)
    res.status(500).json({ success: false, message: '未知錯誤' })
  }
}
