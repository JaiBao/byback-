// controllers/verifyCode.js
export const verifyCode = async (req, res) => {
  const pool = req.pool
  const { phoneNumber, code } = req.body

  // 將09開頭的號碼轉換為+886格式
  let phoneNumberForCheck = phoneNumber
  if (phoneNumber.startsWith('09')) {
    phoneNumberForCheck = '+886' + phoneNumber.slice(1)
  }

  // 檢查驗證碼是否正確
  const [verification] = await pool.query('SELECT * FROM verification_codes WHERE phone_number = ? AND code = ?', [phoneNumberForCheck, code])
  if (verification.length === 0) {
    return res.status(400).json({ success: false, message: '驗證碼不正確或已失效' })
  }

  res.status(200).json({ success: true, message: '驗證碼正確' })
}
