// controllers/products.js
import { JSDOM } from 'jsdom'
import createDOMPurify from 'dompurify'
import { v2 as cloudinary } from 'cloudinary'

const window = new JSDOM('').window
const DOMPurify = createDOMPurify(window)
// 店家用新增產品
export const createProduct = async (req, res) => {
  const pool = req.pool
  try {
    const uid = req.user.uid
    const sanitizedDescription = DOMPurify.sanitize(req.body.description)
    const [result] = await pool.query('INSERT INTO products (name, price, description, image, sell, category, tab, uid) VALUES (?, ?, ?, ?, ?, ?, ?, ?)', [
      req.body.name,
      req.body.price,
      sanitizedDescription,
      req.file?.path || '',
      req.body.sell,
      req.body.category,
      req.body.tab, // 添加tab字段
      uid
    ])
    res.status(200).json({ success: true, message: '', result: result.insertId })
  } catch (error) {
    console.error('Create product error:', error)
    res.status(500).json({ success: false, message: '未知錯誤' })
  }
}
// 首頁用獲取銷售中的產品(亂數)
export const getSellProducts = async (req, res) => {
  const pool = req.pool
  try {
    const [result] = await pool.query(`
      SELECT p.*, u.company_name 
      FROM products p 
      JOIN users u ON p.uid = u.uid 
      WHERE p.sell = true AND u.status != 0
      ORDER BY RAND()
    `)
    // console.log('Get sell products result:', result)
    res.status(200).json({ success: true, message: '', result })
  } catch (error) {
    // console.error('Get sell products error:', error)
    res.status(500).json({ success: false, message: '未知錯誤' })
  }
}
// 管理者使用獲取全部產品
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

    // 為每個產品查詢其選項種類和選項
    for (const product of products) {
      const [options] = await pool.query(
        `SELECT po.id, po.name, pov.name as option_name, pov.price 
         FROM product_options po 
         LEFT JOIN product_option_values pov ON po.id = pov.option_id 
         WHERE po.product_id = ?`,
        [product.id]
      )
      product.options = options // 將選項數據綁定到產品
    }

    res.status(200).json({ success: true, message: '', result: products, totalPages })
  } catch (error) {
    console.error('Get all products error:', error)
    res.status(500).json({ success: false, message: '未知錯誤' })
  }
}

// 替產品加入選項
export const addProductOptions = async (req, res) => {
  const pool = req.pool
  const { productId, options } = req.body

  try {
    // 確認 productId 存在且有效
    const [productCheck] = await pool.query('SELECT id FROM products WHERE id = ?', [productId])
    if (productCheck.length === 0) {
      return res.status(400).json({ success: false, message: '產品不存在' })
    }

    // 刪除舊的選項及其相關的選項值
    const [existingOptions] = await pool.query('SELECT id FROM product_options WHERE product_id = ?', [productId])

    for (const existingOption of existingOptions) {
      // 刪除 product_option_values 表中的相關記錄
      await pool.query('DELETE FROM product_option_values WHERE option_id = ?', [existingOption.id])
      // 刪除 product_options 表中的記錄
      await pool.query('DELETE FROM product_options WHERE id = ?', [existingOption.id])
    }

    // 插入新的選項和選項值
    for (const option of options) {
      const [result] = await pool.query('INSERT INTO product_options (product_id, name) VALUES (?, ?)', [productId, option.name])
      const optionId = result.insertId

      // 插入該選項種類下的所有選項
      if (option.values && option.values.length > 0) {
        for (const value of option.values) {
          await pool.query('INSERT INTO product_option_values (option_id, name, price) VALUES (?, ?, ?)', [optionId, value.name, value.price])
        }
      }
    }

    res.status(200).json({ success: true, message: '選項已添加成功' })
  } catch (error) {
    console.error('Add product options error:', error)
    res.status(500).json({ success: false, message: '添加選項時出現錯誤' })
  }
}

// 獲取產品資料
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
// 修改產品
export const editProduct = async (req, res) => {
  const pool = req.pool
  try {
    // 取得現有資料
    const [existingProduct] = await pool.query('SELECT image, uid FROM products WHERE id = ?', [req.params.id])

    if (existingProduct.length === 0) {
      return res.status(404).json({ success: false, message: '找不到' })
    }

    // 如果提供了新圖片並且有舊圖片，那麼刪除舊圖片
    if (req.file && existingProduct[0].image) {
      const publicId = existingProduct[0].image.split('/').pop().split('.')[0] // 從路徑中提取 public_id
      await cloudinary.uploader.destroy(publicId) // 刪除 Cloudinary 上的舊圖片
    }

    // 沒有更換圖片則不更新圖片路徑
    const imagePath = req.file ? req.file.path : existingProduct[0].image
    const sanitizedDescription = DOMPurify.sanitize(req.body.description)
    const [result] = await pool.query('UPDATE products SET name = ?, price = ?, description = ?, image = ?, sell = ?, category = ?, tab = ? WHERE id = ?', [
      req.body.name,
      req.body.price,
      sanitizedDescription,
      imagePath,
      req.body.sell,
      req.body.category,
      req.body.tab, // 添加 tab 欄位
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

// 廠商獲取自家產品
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

    // 為每個產品查詢其選項種類和選項
    for (const product of products) {
      const [options] = await pool.query(
        `SELECT po.id, po.name, pov.name as option_name, pov.price 
         FROM product_options po 
         LEFT JOIN product_option_values pov ON po.id = pov.option_id 
         WHERE po.product_id = ?`,
        [product.id]
      )
      product.options = options // 將選項數據綁定到產品
    }

    res.status(200).json({
      success: true,
      message: products.length === 0 ? '沒有找到符合條件的產品' : '',
      result: products,
      totalPages
    })
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
    const { category, store, product } = req.query // 添加 product

    let query = `
      SELECT p.*, u.company_name 
      FROM products p 
      JOIN users u ON p.uid = u.uid 
      WHERE p.sell = true AND u.status != 0
    `
    const params = []

    if (category) {
      query += ' AND category = ?'
      params.push(category)
    }
    if (store) {
      query += ' AND uid IN (SELECT uid FROM users WHERE company_name LIKE ?)'
      params.push(`%${store}%`)
    }
    if (product) {
      query += ' AND name LIKE ?'
      params.push(`%${product}%`)
    }

    query += ' ORDER BY RAND()'

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
    const [products] = await pool.query(
      `
      SELECT p.*, u.company_name 
      FROM products p 
      JOIN users u ON p.uid = u.uid 
      WHERE u.uid = ? AND p.sell = true
    `,
      [req.params.uid]
    )

    // 為每個產品查詢其選項和選項種類
    for (const product of products) {
      const [options] = await pool.query(
        `
        SELECT po.id, po.name AS option_name, pov.name AS value_name, pov.price 
        FROM product_options po 
        LEFT JOIN product_option_values pov ON po.id = pov.option_id 
        WHERE po.product_id = ?
        `,
        [product.id]
      )

      // 如果該產品沒有選項，則賦予空陣列
      product.options = options.length ? options : []
    }
    res.status(200).json({ success: true, message: '', result: products })
  } catch (error) {
    console.error('Get products by store error:', error)
    res.status(500).json({ success: false, message: '未知錯誤' })
  }
}
