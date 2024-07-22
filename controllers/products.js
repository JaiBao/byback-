// controllers/products.js
export const createProduct = async (req, res) => {
  const pool = req.pool
  try {
    const uid = req.user.uid
    const [result] = await pool.query('INSERT INTO products (name, price, description, image, sell, category, uid) VALUES (?, ?, ?, ?, ?, ?, ?)', [
      req.body.name,
      req.body.price,
      req.body.description,
      req.file?.path || '',
      req.body.sell,
      req.body.category,
      uid
    ])
    res.status(200).json({ success: true, message: '', result: result.insertId })
  } catch (error) {
    console.error('Create product error:', error)
    res.status(500).json({ success: false, message: '未知錯誤' })
  }
}

export const getSellProducts = async (req, res) => {
  const pool = req.pool
  try {
    const [result] = await pool.query(`
      SELECT p.*, u.company_name 
      FROM products p 
      JOIN users u ON p.uid = u.uid 
      WHERE p.sell = true
      ORDER BY RAND()
    `)
    // console.log('Get sell products result:', result)
    res.status(200).json({ success: true, message: '', result })
  } catch (error) {
    // console.error('Get sell products error:', error)
    res.status(500).json({ success: false, message: '未知錯誤' })
  }
}

export const getAllProducts = async (req, res) => {
  const pool = req.pool
  const { page = 1, limit = 5, name, sell, manufacturerName } = req.query
  const offset = (page - 1) * limit

  try {
    let query = `
      SELECT 
        p.*, 
        u.company_name AS manufacturer_name 
      FROM 
        products p 
      LEFT JOIN 
        users u 
      ON 
        p.uid = u.uid
      WHERE 1=1
    `
    let countQuery = `
      SELECT COUNT(*) AS count
      FROM 
        products p 
      LEFT JOIN 
        users u 
      ON 
        p.uid = u.uid
      WHERE 1=1
    `
    const queryParams = []
    const countParams = []

    if (name) {
      query += ' AND p.name LIKE ?'
      countQuery += ' AND p.name LIKE ?'
      queryParams.push(`%${name}%`)
      countParams.push(`%${name}%`)
    }

    if (sell !== undefined) {
      query += ' AND p.sell = ?'
      countQuery += ' AND p.sell = ?'
      queryParams.push(sell)
      countParams.push(sell)
    }

    if (manufacturerName) {
      query += ' AND u.company_name LIKE ?'
      countQuery += ' AND u.company_name LIKE ?'
      queryParams.push(`%${manufacturerName}%`)
      countParams.push(`%${manufacturerName}%`)
    }

    query += ' LIMIT ? OFFSET ?'
    queryParams.push(parseInt(limit), parseInt(offset))

    const [products] = await pool.query(query, queryParams)
    const [countResult] = await pool.query(countQuery, countParams)

    const totalProducts = countResult[0].count
    const totalPages = Math.ceil(totalProducts / limit)

    res.status(200).json({ success: true, message: '', result: products, totalPages })
  } catch (error) {
    console.error('Get all products error:', error)
    res.status(500).json({ success: false, message: '未知錯誤' })
  }
}

export const getProduct = async (req, res) => {
  const pool = req.pool
  try {
    const [result] = await pool.query(
      `
      SELECT p.*, u.company_name 
      FROM products p 
      JOIN users u ON p.uid = u.uid 
      WHERE p.id = ?
    `,
      [req.params.id]
    )
    // console.log('Get product result:', result)
    if (result.length === 0) {
      res.status(404).json({ success: false, message: '找不到' })
    } else {
      res.status(200).json({ success: true, message: '', result: result[0] })
    }
  } catch (error) {
    console.error('Get product error:', error)
    res.status(500).json({ success: false, message: '未知錯誤' })
  }
}

export const editProduct = async (req, res) => {
  const pool = req.pool
  try {
    const uid = req.user.uid

    // 現有資料get
    const [existingProduct] = await pool.query('SELECT image FROM products WHERE id = ?', [req.params.id])

    if (existingProduct.length === 0) {
      return res.status(404).json({ success: false, message: '找不到' })
    }

    // 沒換圖片 不更新圖片
    const imagePath = req.file ? req.file.path : existingProduct[0].image

    const [result] = await pool.query('UPDATE products SET name = ?, price = ?, description = ?, image = ?, sell = ?, category = ?, uid = ? WHERE id = ?', [
      req.body.name,
      req.body.price,
      req.body.description,
      imagePath,
      req.body.sell,
      req.body.category,
      uid,
      req.params.id
    ])

    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: '找不到' })
    } else {
      return res.status(200).json({ success: true, message: '', result })
    }
  } catch (error) {
    console.error('Edit product error:', error)
    res.status(500).json({ success: false, message: '未知錯誤' })
  }
}

export const getProductsByUid = async (req, res) => {
  const pool = req.pool
  const { page = 1, limit = 5, name, sell } = req.query
  const offset = (page - 1) * limit
  const uid = req.query.uid || req.uid

  try {
    let query = 'SELECT * FROM products WHERE uid = ?'
    let countQuery = 'SELECT COUNT(*) AS count FROM products WHERE uid = ?'
    const queryParams = [uid]
    const countParams = [uid]

    if (name) {
      query += ' AND name LIKE ?'
      countQuery += ' AND name LIKE ?'
      queryParams.push(`%${name}%`)
      countParams.push(`%${name}%`)
    }

    if (sell !== undefined) {
      query += ' AND sell = ?'
      countQuery += ' AND sell = ?'
      queryParams.push(sell)
      countParams.push(sell)
    }

    query += ' LIMIT ? OFFSET ?'
    queryParams.push(parseInt(limit), parseInt(offset))

    const [products] = await pool.query(query, queryParams)
    const [countResult] = await pool.query(countQuery, countParams)

    const totalProducts = countResult[0].count
    const totalPages = Math.ceil(totalProducts / limit)

    if (products.length === 0) {
      res.status(404).json({ success: false, message: '找不到' })
    } else {
      res.status(200).json({ success: true, message: '', result: products, totalPages })
    }
  } catch (error) {
    console.error('Get products by UID error:', error)
    res.status(500).json({ success: false, message: '未知錯誤' })
  }
}

// 種類搜索
export const searchProductsByCategory = async (req, res) => {
  const pool = req.pool
  try {
    const [result] = await pool.query('SELECT * FROM products WHERE category = ? AND sell = true', [req.params.category])
    res.status(200).json({ success: true, message: '', result })
  } catch (error) {
    console.error('Search products by category error:', error)
    res.status(500).json({ success: false, message: '未知錯誤' })
  }
}

// 店家搜索
export const searchProductsByStore = async (req, res) => {
  const pool = req.pool
  try {
    const [result] = await pool.query('SELECT p.* FROM products p JOIN users u ON p.uid = u.uid WHERE u.company_name = ? AND p.sell = true', [req.params.store])
    res.status(200).json({ success: true, message: '', result })
  } catch (error) {
    console.error('Search products by store error:', error)
    res.status(500).json({ success: false, message: '未知錯誤' })
  }
}

// 綜合搜索
export const searchProducts = async (req, res) => {
  const pool = req.pool
  try {
    const { category, store } = req.query
    let query = 'SELECT * FROM products WHERE sell = true'
    const params = []

    if (category) {
      query += ' AND category = ?'
      params.push(category)
    }
    if (store) {
      query += ' AND uid IN (SELECT uid FROM users WHERE company_name LIKE ?)'
      params.push(`%${store}%`)
    }

    const [result] = await pool.query(query, params)
    res.status(200).json({ success: true, message: '', result })
  } catch (error) {
    console.error('Search products error:', error)
    res.status(500).json({ success: false, message: '未知錯誤' })
  }
}

// 店家商品卡片
export const getProductsByStoreUid = async (req, res) => {
  const pool = req.pool
  try {
    const [result] = await pool.query(
      `
      SELECT p.*, u.company_name 
      FROM products p 
      JOIN users u ON p.uid = u.uid 
      WHERE u.uid = ? AND p.sell = true
    `,
      [req.params.uid]
    )
    res.status(200).json({ success: true, message: '', result })
  } catch (error) {
    console.error('Get products by store error:', error)
    res.status(500).json({ success: false, message: '未知錯誤' })
  }
}
