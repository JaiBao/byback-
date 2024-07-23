// controllers/orders.js
import { io } from '../index.js'
import moment from 'moment'

export const createOrder = async (req, res) => {
  const pool = req.pool
  try {
    const [userCart] = await pool.query('SELECT * FROM user_cart WHERE user_id = ?', [req.user.id])
    if (userCart.length === 0) {
      return res.status(400).json({ success: false, message: '購物車是空的' })
    }

    const productIds = userCart.map(item => item.product_name)
    const [products] = await pool.query('SELECT * FROM products WHERE id IN (?) AND sell = true', [productIds])

    if (products.length !== userCart.length) {
      return res.status(400).json({ success: false, message: '包含下架商品' })
    }

    const { deliveryDate, deliveryTime, phone, landline, companyName, taxId, recipientName, recipientPhone, uid, comment, address, paymentMethod } = req.body

    if (!deliveryDate || !deliveryTime || !paymentMethod) {
      return res.status(400).json({ success: false, message: '送達日期、送達時間和付款方式是必需的' })
    }

    const now = moment()
    const year = now.format('YY')
    const month = now.format('MM')
    const [orderCountResult] = await pool.query('SELECT COUNT(*) as orderCount FROM orders WHERE DATE_FORMAT(date, "%Y-%m") = ?', [`${now.format('YYYY-MM')}`])
    const orderCount = orderCountResult[0].orderCount + 1
    const oid = `${year}${month}${orderCount.toString().padStart(5, '0')}`

    const [result] = await pool.query(
      'INSERT INTO orders (user_id, date, delivery_date, delivery_time, phone, landline, company_name, tax_id, address, recipient_name, recipient_phone, uid, oid, status, comment, payment_method) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [
        req.user.id,
        new Date(),
        deliveryDate,
        deliveryTime,
        phone,
        landline,
        companyName,
        taxId,
        address,
        recipientName,
        recipientPhone,
        uid,
        oid,
        '未確認',
        comment,
        paymentMethod
      ]
    )
    const orderId = result.insertId

    for (const item of userCart) {
      const productId = parseInt(item.product_name)
      const product = products.find(p => p.id === productId)
      if (!product) {
        console.error(`Product not found for id: ${productId}`)
        return res.status(500).json({ success: false, message: `商品 ID ${productId} 未找到` })
      }
      const totalPrice = item.quantity * product.price
      await pool.query('INSERT INTO order_products (order_id, product_name, quantity, total_price, status) VALUES (?, ?, ?, ?, ?)', [
        orderId,
        item.product_name,
        item.quantity,
        totalPrice,
        '未確認'
      ])
    }

    await pool.query('DELETE FROM user_cart WHERE user_id = ?', [req.user.id])

    res.status(200).json({ success: true, message: '' })
  } catch (error) {
    console.error('加入orders error:', error)
    res.status(500).json({ success: false, message: '未知錯誤', error: error.message })
  }
}

// 更改訂單狀態
export const updateOrderStatus = async (req, res) => {
  const pool = req.pool
  const { orderId, status, cancelReason } = req.body
  try {
    if (status === '商家取消訂單' || status === '顧客取消訂單') {
      await pool.query('UPDATE orders SET status = ?, cancelReason = ? WHERE oid = ?', [status, cancelReason, orderId])
    } else {
      await pool.query('UPDATE orders SET status = ? WHERE oid = ?', [status, orderId])
    }
    res.status(200).json({ success: true, message: '訂單狀態更新成功' })
  } catch (error) {
    console.error('Update order status error:', error)
    res.status(500).json({ success: false, message: '未知錯誤' })
  }
}

// 更改訂單內商品狀態
export const updateOrderProductStatus = async (req, res) => {
  const pool = req.pool
  const { productId, status, cancelReason = '', uid } = req.body

  try {
    let query, params
    if (status === '拒絕') {
      query = 'UPDATE order_products SET status = ?, cancel_reason = ? WHERE id = ?'
      params = [status, cancelReason, productId]
    } else {
      query = 'UPDATE order_products SET status = ?, cancel_reason = NULL WHERE id = ?'
      params = [status, productId]
    }

    await pool.query(query, params)

    const [orderProduct] = await pool.query('SELECT order_id FROM order_products WHERE id = ?', [productId])
    if (orderProduct.length === 0) {
      return res.status(400).json({ success: false, message: '找不到對應的訂單' })
    }
    const orderId = orderProduct[0].order_id

    const [orderProducts] = await pool.query('SELECT status FROM order_products WHERE order_id = ?', [orderId])

    const allAccepted = orderProducts.every(product => product.status === '接受')
    const allShipped = orderProducts.every(product => product.status === '已送出')

    let updateMessage = ''
    let newStatus = ''
    const [order] = await pool.query('SELECT oid FROM orders WHERE id = ?', [orderId])
    const orderLastFourDigits = order.length > 0 ? order[0].oid.slice(-4) : '未知訂單'
    const oid = order.length > 0 ? order[0].oid : null

    if (allAccepted) {
      newStatus = '已接收訂單'
      updateMessage = `訂單編號(${orderLastFourDigits})狀態已自動更新為 已接收訂單`
      await pool.query('UPDATE orders SET status = ? WHERE id = ?', [newStatus, orderId])
    } else if (allShipped) {
      newStatus = '商品已送出'
      updateMessage = `訂單編號(${orderLastFourDigits})狀態已自動更新為 商品已送出`
      await pool.query('UPDATE orders SET status = ? WHERE id = ?', [newStatus, orderId])
    } else if (status === '拒絕') {
      updateMessage = `訂單編號(${orderLastFourDigits})有廠商無法接受訂購`
    }

    if (updateMessage && oid) {
      const [operator] = await pool.query('SELECT name FROM users WHERE uid = ?', [uid])
      const operatorName = operator.length > 0 ? operator[0].name : '未知操作者'

      const currentTime = moment().format('YYYY-MM-DD HH:mm:ss')

      await pool.query('INSERT INTO order_status_log (oid, message, time, operator_id, operator_name) VALUES (?, ?, ?, ?, ?)', [
        oid,
        updateMessage,
        currentTime,
        uid,
        operatorName
      ])

      const message = {
        oid,
        updateMessage,
        time: currentTime,
        operatorId: uid,
        operatorName
      }

      console.log('發送訊息:', message) // 確認要發送的消息

      io.emit('orderStatusUpdate', message) // 發送消息
    }

    res.status(200).json({ success: true, message: '訂單商品狀態更新成功' })
  } catch (error) {
    console.error('Update order product status error:', error) // 輸出錯誤信息
    res.status(500).json({ success: false, message: '未知錯誤' })
  }
}

// 客戶用分頁
export const getMyOrders = async (req, res) => {
  const pool = req.pool
  const { page = 1, limit = 5, status, deliveryDate, userName, orderNumber } = req.query
  const offset = (page - 1) * limit

  try {
    let query = 'SELECT * FROM orders WHERE user_id = ?'
    let countQuery = 'SELECT COUNT(*) AS count FROM orders WHERE user_id = ?'
    const queryParams = [req.user.id]
    const countParams = [req.user.id]

    if (status) {
      query += ' AND status = ?'
      countQuery += ' AND status = ?'
      queryParams.push(status)
      countParams.push(status)
    }

    if (deliveryDate) {
      query += ' AND delivery_date = ?'
      countQuery += ' AND delivery_date = ?'
      queryParams.push(deliveryDate)
      countParams.push(deliveryDate)
    }

    if (userName) {
      query += ' AND user_name = ?'
      countQuery += ' AND user_name = ?'
      queryParams.push(userName)
      countParams.push(userName)
    }

    if (orderNumber) {
      query += ' AND oid = ?'
      countQuery += ' AND oid = ?'
      queryParams.push(orderNumber)
      countParams.push(orderNumber)
    }

    query += ' ORDER BY CASE WHEN status = "商品已送出" THEN 1 ELSE 2 END, id DESC LIMIT ? OFFSET ?'
    queryParams.push(parseInt(limit), parseInt(offset))

    const [orders] = await pool.query(query, queryParams)
    const [countResult] = await pool.query(countQuery, countParams)

    if (orders.length === 0) {
      return res.status(200).json({ success: true, message: '', result: [], totalPages: 0 })
    }

    const orderIds = orders.map(order => order.id)
    const [orderProducts] = await pool.query(
      `
      SELECT op.*, p.name as product_name, p.price as product_price
      FROM order_products op
      JOIN products p ON op.product_name = p.id
      WHERE op.order_id IN (?)
    `,
      [orderIds]
    )

    const result = orders.map(order => ({
      ...order,
      products: orderProducts
        .filter(op => op.order_id === order.id)
        .map(op => ({
          id: op.id,
          order_id: op.order_id,
          product_name: op.product_name,
          quantity: op.quantity,
          total_price: op.total_price,
          status: op.status,
          cancel_reason: op.cancel_reason,
          price: op.product_price
        }))
    }))

    const totalOrders = countResult[0].count
    const totalPages = Math.ceil(totalOrders / limit)

    res.status(200).json({ success: true, message: '', result, totalPages })
  } catch (error) {
    console.error('Get my orders error:', error)
    res.status(500).json({ success: false, message: '未知錯誤' })
  }
}

// 商家用分頁模式
export const getAllOrders = async (req, res) => {
  const pool = req.pool
  const { page = 1, limit = 5, status, deliveryDate, userName, orderNumber } = req.query
  const offset = (page - 1) * limit
  const uid = req.query.uid
  const role = req.user.role

  if (!uid) {
    return res.status(400).json({ success: false, message: '缺少 UID' })
  }

  try {
    let query = ''
    let countQuery = ''
    const queryParams = []
    const countParams = []

    if (role === 2) {
      query = `
        SELECT o.*, u.account as user_account, u.name, u.phone_number, u.birthdate, u.gender
        FROM orders o
        LEFT JOIN users u ON o.user_id = u.id
        WHERE 1=1
      `
      countQuery = `
        SELECT COUNT(*) AS count
        FROM orders o
        LEFT JOIN users u ON o.user_id = u.id
        WHERE 1=1
      `
    } else if (role === 1) {
      query = `
        SELECT DISTINCT o.*, u.account as user_account, u.name, u.phone_number, u.birthdate, u.gender
        FROM orders o
        JOIN order_products op ON o.id = op.order_id
        JOIN products p ON op.product_name = p.id
        JOIN users u ON o.user_id = u.id
        WHERE p.uid = ?
      `
      countQuery = `
        SELECT COUNT(DISTINCT o.id) AS count
        FROM orders o
        JOIN order_products op ON o.id = op.order_id
        JOIN products p ON op.product_name = p.id
        JOIN users u ON o.user_id = u.id
        WHERE p.uid = ?
      `
      queryParams.push(uid)
      countParams.push(uid)
    }

    if (status) {
      query += ' AND o.status = ?'
      countQuery += ' AND o.status = ?'
      queryParams.push(status)
      countParams.push(status)
    }

    if (deliveryDate) {
      query += ' AND o.delivery_date = ?'
      countQuery += ' AND o.delivery_date = ?'
      queryParams.push(deliveryDate)
      countParams.push(deliveryDate)
    }

    if (userName) {
      query += ' AND u.account = ?'
      countQuery += ' AND u.account = ?'
      queryParams.push(userName)
      countParams.push(userName)
    }

    if (orderNumber) {
      query += ' AND o.oid LIKE ?'
      countQuery += ' AND o.oid LIKE ?'
      queryParams.push(`%${orderNumber}%`)
      countParams.push(`%${orderNumber}%`)
    }

    query +=
      ' ORDER BY CASE WHEN o.status = "未確認" THEN 1 WHEN o.status = "已接收訂單" THEN 2 WHEN o.status = "商品已送出" THEN 3 ELSE 4 END, o.id DESC LIMIT ? OFFSET ?'
    queryParams.push(parseInt(limit), parseInt(offset))

    const [orders] = await pool.query(query, queryParams)
    const [countResult] = await pool.query(countQuery, countParams)

    if (orders.length === 0) {
      return res.status(200).json({ success: true, message: '目前沒有訂單', result: [], totalPages: 0 })
    }

    const orderIds = orders.map(order => order.id)
    const [orderProducts] = await pool.query(
      `
      SELECT op.*, p.uid, p.name as product_name, p.price as product_price, pu.company_name as manufacturer_name
      FROM order_products op
      JOIN products p ON op.product_name = p.id
      JOIN users pu ON p.uid = pu.uid
      WHERE op.order_id IN (?)
    `,
      [orderIds]
    )

    const ordersWithProducts = orders.map(order => ({
      ...order,
      products: orderProducts
        .filter(product => product.order_id === order.id && (role === 2 || product.uid === uid))
        .map(product => ({
          id: product.id,
          order_id: product.order_id,
          product_name: product.product_name,
          quantity: product.quantity,
          total_price: product.total_price,
          status: product.status,
          cancel_reason: product.cancel_reason,
          price: product.product_price,
          uid: product.uid,
          manufacturer_name: product.manufacturer_name
        })),
      manufacturerName: orderProducts.find(product => product.order_id === order.id)?.manufacturer_name || '未知廠商',
      companyName: order.company_name,
      userAccount: order.user_account || '未知用戶',
      name: order.name,
      phoneNumber: order.phone_number,
      birthdate: order.birthdate,
      gender: order.gender
    }))

    const totalOrders = countResult[0].count
    const totalPages = Math.ceil(totalOrders / limit)

    res.status(200).json({ success: true, message: '', result: ordersWithProducts, totalPages })
  } catch (error) {
    console.error('Get all orders error:', error)
    res.status(500).json({ success: false, message: '未知錯誤' })
  }
}
