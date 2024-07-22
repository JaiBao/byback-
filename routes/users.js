// routes/users.js
import { Router } from 'express'
import content from '../middleware/content.js'
import * as auth from '../middleware/auth.js'
import upload from '../middleware/upload.js'
import {
  register,
  login,
  logout,
  extend,
  getUser,
  editCart,
  getCart,
  updateUser,
  uploadBanner,
  uploadCover,
  getUserStoreImages,
  getStores,
  getStoreInfo,
  getUserByUid,
  getAllUsers,
  updateUserById,
  updatePassword
} from '../controllers/users.js'

const router = Router()

router.post('/', content('application/json'), register)
router.post('/login', content('application/json'), auth.login, login)
router.delete('/logout', auth.jwtIgnoreExpiration, logout)

router.put('/me', auth.jwt, updateUser)
router.patch('/extend', auth.jwt, extend)
router.get('/me', auth.jwt, getUser)
router.post('/cart', content('application/json'), auth.jwt, editCart)
router.get('/cart', auth.jwt, getCart)
router.post('/banner', auth.jwt, content('multipart/form-data'), upload, uploadBanner)
router.post('/cover', auth.jwt, content('multipart/form-data'), upload, uploadCover)
router.get('/store-images', auth.jwt, getUserStoreImages)
router.get('/stores', getStores)
router.get('/store/:uid', getStoreInfo)
router.get('/all', auth.jwt, getAllUsers)
router.put('/updatePassword', auth.jwt, updatePassword)
router.get('/:uid', auth.jwt, getUserByUid)
router.put('/update/:uid', auth.jwt, updateUserById)

export default router
