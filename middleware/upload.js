// middleware/upload.js
import { v2 as cloudinary } from 'cloudinary'
import { CloudinaryStorage } from 'multer-storage-cloudinary'
import multer from 'multer'

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_NAME,
  api_key: process.env.CLOUDINARY_KEY,
  api_secret: process.env.CLOUDINARY_SECRET
})

const getFolderName = req => {
  if (req.path.includes('/banner')) {
    return 'store/banner'
  } else if (req.path.includes('/cover')) {
    return 'store/cover'
  } else if (req.path.includes('/carousel-image')) {
    return 'carousel'
  }
  return 'products' // 根目錄
}

const storage = new CloudinaryStorage({
  cloudinary,
  params: async (req, file) => ({
    folder: getFolderName(req),
    format: 'png', // 你可以根据需要更改格式
    public_id: file.originalname.split('.')[0]
  })
})

const upload = multer({
  storage,
  fileFilter(req, file, cb) {
    if (!file.mimetype.startsWith('image')) {
      cb(new multer.MulterError('LIMIT_FILE_FORMAT'), false)
    } else {
      cb(null, true)
    }
  },
  limits: {
    fileSize: 2800 * 2800
  }
})

export default (req, res, next) => {
  upload.single('image')(req, res, error => {
    if (error instanceof multer.MulterError) {
      let message = '上傳錯誤'
      if (error.code === 'LIMIT_FILE_SIZE') {
        message = '檔案太大'
      } else if (error.code === 'LIMIT_FILE_FORMAT') {
        message = '檔案格式錯誤'
      }
      res.status(400).json({ success: false, message })
    } else if (error) {
      res.status(500).json({ success: false, message: '未知錯誤' })
    } else {
      next()
    }
  })
}
