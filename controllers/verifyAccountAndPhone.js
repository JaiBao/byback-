// controllers/verifyAccountAndPhone.js
import { sendVerificationCode } from './sendVerificationCode.js'

export const verifyAccountAndPhone = async (req, res) => {
  const pool = req.pool
  const { account, phoneNumber } = req.body

  let phoneNumberForCheck = phoneNumber
  if (phoneNumber.startsWith('+886')) {
    phoneNumberForCheck = '0' + phoneNumber.slice(4)
  }

  // 檢查帳號和手機號是否匹配
  const [user] = await pool.query('SELECT * FROM users WHERE account = ? AND phone_number = ?', [account, phoneNumberForCheck])
  if (user.length === 0) {
    return res.status(404).json({ success: false, message: '帳號與手機號碼不匹配' })
  }

  // 匹配成功，發送驗證碼
  req.body.phoneNumber = phoneNumberForCheck // 確保使用正確格式的手機號碼
  return sendVerificationCode(req, res, true) // 傳遞 true 來跳過手機註冊檢查
}
