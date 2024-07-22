export default (req, res, next) => {
  if (req.user.role !== 1 && req.user.role !== 2) {
    res.status(403).json({ success: false, message: '沒有權限' })
  } else {
    next()
  }
}
