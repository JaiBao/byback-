// 訂單數量
export const getMonthlyOrders = async (req, res) => {
  const pool = req.pool
  const { sid } = req.params
  const { startDate, endDate } = req.query

  // 沒傳時間範圍，默認為當前年份的整年
  const currentYear = new Date().getFullYear()
  const defaultStartDate = `${currentYear}-01-01`
  const defaultEndDate = `${currentYear}-12-31`

  const start = startDate || defaultStartDate
  const end = endDate || defaultEndDate

  // console.log('Received sid:', sid)
  // console.log('Received start date:', start)
  // console.log('Received end date:', end)

  // 生成所有月份的對應格式，默認為0
  const generateMonthlyResult = (start, end) => {
    const result = {}
    let startDate = new Date(start)
    const endDate = new Date(end)

    while (startDate <= endDate) {
      const monthKey = `${startDate.getFullYear()}-${(startDate.getMonth() + 1).toString().padStart(2, '0')}`
      result[monthKey] = 0
      // 移動到下一個月
      startDate.setMonth(startDate.getMonth() + 1)
      startDate = new Date(startDate)
    }

    return result
  }

  try {
    const [rows] = await pool.query(
      `
            SELECT 
              DATE_FORMAT(delivery_date, '%Y-%m') AS month, 
              COUNT(*) AS total_orders 
            FROM orders
            WHERE sid = ? 
              AND delivery_date BETWEEN ? AND ?
              AND status = '訂單完成'
            GROUP BY month
            ORDER BY month
          `,
      [sid, start, end]
    )
    // console.log('Query result rows:', rows)
    // 生成所有月份，並將結果覆蓋進去
    const result = generateMonthlyResult(start, end)
    rows.forEach(row => {
      result[row.month] = row.total_orders
    })

    res.status(200).json({ success: true, result })
  } catch (error) {
    console.error('Get monthly orders error:', error)
    res.status(500).json({ success: false, message: '未知錯誤' })
  }
}

// 營業額計算
export const getMonthlyRevenue = async (req, res) => {
  const pool = req.pool
  const { sid } = req.params
  const { startDate, endDate } = req.query

  // 沒傳時間範圍，默認為當前年份的整年
  const currentYear = new Date().getFullYear()
  const defaultStartDate = `${currentYear}-01-01`
  const defaultEndDate = `${currentYear}-12-31`

  const start = startDate || defaultStartDate
  const end = endDate || defaultEndDate

  // 生成所有月份的對應格式，默認為0
  const generateMonthlyResult = (start, end) => {
    const result = {}
    let startDate = new Date(start)
    const endDate = new Date(end)

    while (startDate <= endDate) {
      const monthKey = `${startDate.getFullYear()}-${(startDate.getMonth() + 1).toString().padStart(2, '0')}`
      result[monthKey] = 0
      // 移動到下一個月
      startDate.setMonth(startDate.getMonth() + 1)
      startDate = new Date(startDate)
    }

    return result
  }

  try {
    const [rows] = await pool.query(
      `
        SELECT 
          DATE_FORMAT(o.delivery_date, '%Y-%m') AS month,
          SUM(op.total_price) AS total_revenue
        FROM orders o
        JOIN order_products op ON o.id = op.order_id
        WHERE o.sid = ? 
          AND o.delivery_date BETWEEN ? AND ?
          AND o.status = '訂單完成'
        GROUP BY month
        ORDER BY month
      `,
      [sid, start, end]
    )

    // 生成所有月份，並將結果覆蓋進去
    const result = generateMonthlyResult(start, end)
    rows.forEach(row => {
      result[row.month] = row.total_revenue
    })

    res.status(200).json({ success: true, result })
  } catch (error) {
    console.error('Get monthly revenue error:', error)
    res.status(500).json({ success: false, message: '未知錯誤' })
  }
}

// 產品訂購數量
export const getProductOrderCounts = async (req, res) => {
  const pool = req.pool
  const { sid } = req.params
  const { startDate, endDate } = req.query

  // 如果未提供日期範圍，默認為當前年份的整年
  const currentYear = new Date().getFullYear()
  const defaultStartDate = `${currentYear}-01-01`
  const defaultEndDate = `${currentYear}-12-31`

  const start = startDate || defaultStartDate
  const end = endDate || defaultEndDate

  // console.log('Received sid:', sid)
  // console.log('Received start date:', start)
  // console.log('Received end date:', end)

  try {
    const [rows] = await pool.query(
      `
        SELECT 
          p.name AS product_name, 
          SUM(op.quantity) AS total_quantity
        FROM orders o
        JOIN order_products op ON o.id = op.order_id
        JOIN products p ON op.product_name = p.id
        WHERE o.sid = ? 
          AND o.delivery_date BETWEEN ? AND ?
          AND o.status = '訂單完成'
        GROUP BY p.name
        ORDER BY total_quantity DESC
        `,
      [sid, start, end]
    )

    // console.log('Query result rows:', rows)

    // 生成產品訂購數量的結果對象
    const result = {}
    rows.forEach(row => {
      result[row.product_name] = row.total_quantity
    })

    res.status(200).json({ success: true, result })
  } catch (error) {
    console.error('Get product order counts error:', error)
    res.status(500).json({ success: false, message: '未知錯誤' })
  }
}

// 年齡分佈
export const getAgeDistribution = async (req, res) => {
  const pool = req.pool
  const { sid } = req.params
  const { startDate, endDate } = req.query

  // 默認為當前年份的整年
  const currentYear = new Date().getFullYear()
  const defaultStartDate = `${currentYear}-01-01`
  const defaultEndDate = `${currentYear}-12-31`

  const start = startDate || defaultStartDate
  const end = endDate || defaultEndDate

  // console.log('Received sid:', sid)
  // console.log('Received start date:', start)
  // console.log('Received end date:', end)

  try {
    const [rows] = await pool.query(
      `
        SELECT 
          u.birthdate AS user_birthdate
        FROM orders o
        JOIN users u ON o.uid = u.uid
        WHERE o.sid = ?
          AND o.delivery_date BETWEEN ? AND ?
          AND o.status = '訂單完成'
          AND u.role = 0
      `,
      [sid, start, end]
    )

    // console.log('Query result rows:', rows)

    // 生成年齡分布範圍
    const ageRanges = {
      '1-20': 0,
      '20-30': 0,
      '30-40': 0,
      '40-50': 0,
      '50-60': 0,
      '60以上': 0
    }

    // 計算年齡，將其分配到對應的年齡範圍
    const calculateAge = birthdate => {
      const birth = new Date(birthdate)
      const today = new Date()
      let age = today.getFullYear() - birth.getFullYear()
      const monthDiff = today.getMonth() - birth.getMonth()
      if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
        age--
      }
      return age
    }

    // 更新年齡區間分布
    rows.forEach(row => {
      const age = calculateAge(row.user_birthdate)

      if (age >= 1 && age < 20) {
        ageRanges['1-20']++
      } else if (age >= 20 && age < 30) {
        ageRanges['20-30']++
      } else if (age >= 30 && age < 40) {
        ageRanges['30-40']++
      } else if (age >= 40 && age < 50) {
        ageRanges['40-50']++
      } else if (age >= 50 && age < 60) {
        ageRanges['50-60']++
      } else if (age >= 60) {
        ageRanges['60以上']++
      }
    })

    // 返回最終的年齡分布結果
    res.status(200).json({ success: true, result: ageRanges })
  } catch (error) {
    console.error('Get age distribution error:', error)
    res.status(500).json({ success: false, message: '未知錯誤' })
  }
}

// 年齡與性別分佈(暫無使用)
export const getAgeAndGenderDistribution = async (req, res) => {
  const pool = req.pool
  const { sid } = req.params
  const { startDate, endDate } = req.query

  const currentYear = new Date().getFullYear()
  const defaultStartDate = `${currentYear}-01-01`
  const defaultEndDate = `${currentYear}-12-31`

  const start = startDate || defaultStartDate
  const end = endDate || defaultEndDate

  try {
    // 修改這裡的 SQL 查詢，確保 gender 和 birthdate 正確被選取
    const [rows] = await pool.query(
      `
        SELECT 
          u.birthdate AS user_birthdate,
          u.gender AS gender
        FROM orders o
        JOIN users u ON o.uid = u.uid
        WHERE o.sid = ?
          AND o.delivery_date BETWEEN ? AND ?
          AND o.status = '訂單完成'
          AND u.role = 0
      `,
      [sid, start, end]
    )

    // 生成年齡和性別分布範圍
    const ageGenderDistribution = {
      '1-20': { male: 0, female: 0 },
      '20-30': { male: 0, female: 0 },
      '30-40': { male: 0, female: 0 },
      '40-50': { male: 0, female: 0 },
      '50-60': { male: 0, female: 0 },
      '60以上': { male: 0, female: 0 }
    }

    // 計算年齡
    const calculateAge = birthdate => {
      const birth = new Date(birthdate)
      const today = new Date()
      let age = today.getFullYear() - birth.getFullYear()
      const monthDiff = today.getMonth() - birth.getMonth()
      if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
        age--
      }
      return age
    }

    // 更新年齡和性別的分布
    rows.forEach(row => {
      const age = calculateAge(row.user_birthdate)
      const gender = row.gender === 'male' ? 'male' : 'female' // 根據性別將其劃分到 male 或 female

      if (age >= 1 && age < 20) {
        ageGenderDistribution['1-20'][gender]++
      } else if (age >= 20 && age < 30) {
        ageGenderDistribution['20-30'][gender]++
      } else if (age >= 30 && age < 40) {
        ageGenderDistribution['30-40'][gender]++
      } else if (age >= 40 && age < 50) {
        ageGenderDistribution['40-50'][gender]++
      } else if (age >= 50 && age < 60) {
        ageGenderDistribution['50-60'][gender]++
      } else if (age >= 60) {
        ageGenderDistribution['60以上'][gender]++
      }
    })

    // 將 ageGenderDistribution 格式化為前端需要的格式
    const formattedData = Object.keys(ageGenderDistribution).map(ageGroup => ({
      ageGroup,
      male: ageGenderDistribution[ageGroup].male,
      female: ageGenderDistribution[ageGroup].female
    }))

    // 返回最終的年齡和性別分布結果
    res.status(200).json({ success: true, result: formattedData })
  } catch (error) {
    console.error('Get age and gender distribution error:', error)
    res.status(500).json({ success: false, message: '未知錯誤' })
  }
}

// 縣市分布
export const getCityDistribution = async (req, res) => {
  const pool = req.pool
  const { sid } = req.params
  const { startDate, endDate } = req.query

  // 默認為當前年份的整年
  const currentYear = new Date().getFullYear()
  const defaultStartDate = `${currentYear}-01-01`
  const defaultEndDate = `${currentYear}-12-31`

  const start = startDate || defaultStartDate
  const end = endDate || defaultEndDate

  try {
    const [rows] = await pool.query(
      `
        SELECT 
          o.address AS order_address
        FROM orders o
        JOIN users u ON o.uid = u.uid
        WHERE o.sid = ?
          AND o.delivery_date BETWEEN ? AND ?
          AND o.status = '訂單完成'
          AND u.role = 0
      `,
      [sid, start, end]
    )

    // 統計市和縣的分布
    const cityCounts = {}

    rows.forEach(row => {
      const address = row.order_address || ''
      let city = address.match(/[^市縣]+[市縣]/)?.[0] || address // 提取"XX市"或"XX縣"部分

      // 將「台北」和「臺北」視為相同城市
      city = city.replace(/台/g, '臺')

      if (city) {
        cityCounts[city] = (cityCounts[city] || 0) + 1
      }
    })

    // 返回最終的市/縣分布結果
    res.status(200).json({ success: true, result: cityCounts })
  } catch (error) {
    console.error('Get city distribution error:', error)
    res.status(500).json({ success: false, message: '未知錯誤' })
  }
}

// 獲取縣市區
export const getDistrictDistribution = async (req, res) => {
  const pool = req.pool
  const { sid } = req.params
  const { startDate, endDate } = req.query

  // 默認為當前年份的整年
  const currentYear = new Date().getFullYear()
  const defaultStartDate = `${currentYear}-01-01`
  const defaultEndDate = `${currentYear}-12-31`

  const start = startDate || defaultStartDate
  const end = endDate || defaultEndDate

  try {
    const [rows] = await pool.query(
      `
        SELECT 
    o.address AS order_address
        FROM orders o
        JOIN users u ON o.uid = u.uid
        WHERE o.sid = ?
          AND o.delivery_date BETWEEN ? AND ?
          AND o.status = '訂單完成'
          AND u.role = 0
      `,
      [sid, start, end]
    )

    // 統計市區的分布
    const districtCounts = {}

    rows.forEach(row => {
      const address = row.order_address || ''

      // 提取 "XX市" 或 "XX縣"
      const cityMatch = address.match(/[^市縣]+[市縣]/)
      let city = cityMatch ? cityMatch[0] : address

      // 將「台北」和「臺北」視為相同城市
      city = city.replace(/台/g, '臺')

      // 從地址中移除城市部分
      const remainingAddress = address.replace(city, '')

      // 提取 "XX區"
      const districtMatch = remainingAddress.match(/[^區]+區|[^市]+市/)
      let district = districtMatch ? districtMatch[0] : remainingAddress

      // 將「台」替換為「臺」，確保統一
      district = district.replace(/台/g, '臺')
      // 如果「區」包含了「市」的名稱，將市的名稱從區中移除
      if (district.includes(city)) {
        district = district.replace(city, '').trim() // 移除重複的市名
      }

      // 組合市和區為唯一標識，去掉空格
      const cityDistrict = `${city}${district}`

      if (cityDistrict) {
        districtCounts[cityDistrict] = (districtCounts[cityDistrict] || 0) + 1
      }
    })

    // 返回最終的市區分布結果
    res.status(200).json({ success: true, result: districtCounts })
  } catch (error) {
    console.error('Get district distribution error:', error)
    res.status(500).json({ success: false, message: '未知錯誤' })
  }
}

// ---------------------------------------------
// 縣市分布 (基於所有用戶)
export const getUserCityDistribution = async (req, res) => {
  const pool = req.pool

  try {
    const [rows] = await pool.query(
      `
        SELECT 
          u.address AS user_address
        FROM users u
        WHERE u.role = 0
      `
    )

    // 統計市和縣的分布
    const cityCounts = {}

    rows.forEach(row => {
      const address = row.user_address || ''
      let city = address.match(/[^市縣]+[市縣]/)?.[0] || address // 提取"XX市"或"XX縣"部分

      // 將「台北」和「臺北」視為相同城市
      city = city.replace(/台/g, '臺')

      if (city) {
        cityCounts[city] = (cityCounts[city] || 0) + 1
      }
    })

    // 返回最終的市/縣分布結果
    res.status(200).json({ success: true, result: cityCounts })
  } catch (error) {
    console.error('Get user city distribution error:', error)
    res.status(500).json({ success: false, message: '未知錯誤' })
  }
}

// 區域分布 (基於所有用戶)
export const getUserDistrictDistribution = async (req, res) => {
  const pool = req.pool

  try {
    const [rows] = await pool.query(
      `
        SELECT 
          u.address AS user_address
        FROM users u
        WHERE u.role = 0
      `
    )

    // 統計市區的分布
    const districtCounts = {}

    rows.forEach(row => {
      const address = row.user_address || ''

      // 提取 "XX市" 或 "XX縣"
      const cityMatch = address.match(/[^市縣]+[市縣]/)
      let city = cityMatch ? cityMatch[0] : address
      // 將「台北」和「臺北」視為相同城市
      city = city.replace(/台/g, '臺')
      // 從地址中移除城市部分
      const remainingAddress = address.replace(city, '')

      // 提取 "XX區"
      const districtMatch = remainingAddress.match(/[^區]+區|[^市]+市/)
      let district = districtMatch ? districtMatch[0] : remainingAddress

      // 將「台」替換為「臺」，確保統一
      district = district.replace(/台/g, '臺')
      // 如果「區」包含了「市」的名稱，將市的名稱從區中移除
      if (district.includes(city)) {
        district = district.replace(city, '').trim() // 移除重複的市名
      }

      // 組合市和區為唯一標識，去掉空格
      const cityDistrict = `${city}${district}`

      if (cityDistrict) {
        districtCounts[cityDistrict] = (districtCounts[cityDistrict] || 0) + 1
      }
    })

    // 返回最終的市區分布結果
    res.status(200).json({ success: true, result: districtCounts })
  } catch (error) {
    console.error('Get user district distribution error:', error)
    res.status(500).json({ success: false, message: '未知錯誤' })
  }
}

// 年齡分布 (基於所有用戶)
export const getUserAgeDistribution = async (req, res) => {
  const pool = req.pool

  try {
    const [rows] = await pool.query(
      `
        SELECT 
          u.birthdate AS user_birthdate
        FROM users u
        WHERE u.role = 0
      `
    )

    // 生成年齡分布範圍
    const ageRanges = {
      '1-20': 0,
      '20-30': 0,
      '30-40': 0,
      '40-50': 0,
      '50-60': 0,
      '60以上': 0
    }

    // 計算年齡，將其分配到對應的年齡範圍
    const calculateAge = birthdate => {
      const birth = new Date(birthdate)
      const today = new Date()
      let age = today.getFullYear() - birth.getFullYear()
      const monthDiff = today.getMonth() - birth.getMonth()
      if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
        age--
      }
      return age
    }

    // 更新年齡區間分布
    rows.forEach(row => {
      const age = calculateAge(row.user_birthdate)

      if (age >= 1 && age < 20) {
        ageRanges['1-20']++
      } else if (age >= 20 && age < 30) {
        ageRanges['20-30']++
      } else if (age >= 30 && age < 40) {
        ageRanges['30-40']++
      } else if (age >= 40 && age < 50) {
        ageRanges['40-50']++
      } else if (age >= 50 && age < 60) {
        ageRanges['50-60']++
      } else if (age >= 60) {
        ageRanges['60以上']++
      }
    })

    // 返回最終的年齡分布結果
    res.status(200).json({ success: true, result: ageRanges })
  } catch (error) {
    console.error('Get user age distribution error:', error)
    res.status(500).json({ success: false, message: '未知錯誤' })
  }
}
