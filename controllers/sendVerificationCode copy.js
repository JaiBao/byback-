// controllers/sendVerificationCode.js
import axios from 'axios'

export const sendVerificationCode = async (req, res) => {
  const pool = req.pool
  const { phoneNumber } = req.body

  // 將+886開頭的手機號碼轉換為09開頭來進行資料庫查詢
  let phoneNumberForCheck = phoneNumber
  if (phoneNumber.startsWith('+886')) {
    phoneNumberForCheck = '0' + phoneNumber.slice(4)
  }

  // 檢查手機號碼是否已經被註冊
  const [existingPhone] = await pool.query('SELECT id FROM users WHERE phone_number = ?', [phoneNumberForCheck])
  if (existingPhone.length > 0) {
    return res.status(400).json({ success: false, message: '手機號碼已被註冊' })
  }

  // 檢查今天的發送次數和最後一次發送時間
  const [verificationData] = await pool.query('SELECT code, send_count, last_sent_at FROM verification_codes WHERE phone_number = ? AND DATE(created_at) = CURDATE()', [
    phoneNumberForCheck
  ])

  if (verificationData.length > 0) {
    const { send_count, last_sent_at } = verificationData[0]

    // 檢查發送次數是否超過10次
    if (send_count >= 10) {
      return res.status(429).json({ success: false, message: '今天已達到最大發送次數' })
    }

    // 檢查是否距離上次發送已超過10分鐘
    const now = new Date()
    const lastSent = new Date(last_sent_at)
    const timeDiff = (now - lastSent) / 1000 / 60

    if (timeDiff < 10) {
      return res.status(429).json({ success: false, message: '請等待10分鐘後再試' })
    }
  }

  // 生成隨機6位數字驗證碼
  const verificationCode = Math.floor(100000 + Math.random() * 900000).toString()

  // 構建消息內容
  const message = `歡迎您加入北台灣企業餐飲團訂網，您的驗證碼為：${verificationCode}，請您於10分鐘內輸入驗證碼，逾期將失效。若仍有問題，請與我們聯絡，謝謝！`

  // 發送簡訊
  try {
    await sendVerificationSMS(phoneNumber, message) // 發送簡訊時使用+886開頭的號碼

    // 更新或插入驗證碼和發送次數
    if (verificationData.length > 0) {
      await pool.query(
        'UPDATE verification_codes SET code = ?, send_count = send_count + 1, last_sent_at = NOW() WHERE phone_number = ? AND DATE(created_at) = CURDATE()',
        [verificationCode, phoneNumberForCheck]
      )
    } else {
      await pool.query('INSERT INTO verification_codes (phone_number, code, send_count, created_at, last_sent_at) VALUES (?, ?, 1, NOW(), NOW())', [
        phoneNumberForCheck,
        verificationCode
      ])
    }

    res.status(200).json({ success: true, message: '驗證碼已發送' })
  } catch (error) {
    console.error('Error sending SMS:', error)
    res.status(500).json({ success: false, message: '無法發送驗證碼' })
  }
}

const sendVerificationSMS = async (phoneNumber, message) => {
  const UID = process.env.SMS_UID
  const PWD = process.env.SMS_PWD
  const DEST = phoneNumber
  const MSG = message
  const ST = ''
  const RETRYTIME = '10'

  await axios.post('https://api.e8d.tw/API21/HTTP/SendSMS.ashx', null, {
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    params: {
      UID,
      PWD,
      MSG,
      DEST,
      ST,
      RETRYTIME
    }
  })
}
