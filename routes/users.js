// routes/users.js
import { Router } from 'express'
import content from '../middleware/content.js'
import * as auth from '../middleware/auth.js'
import upload from '../middleware/upload.js'
import admin from '../middleware/admin.js'
import {
  register,
  login,
  logout,
  extend,
  getUser,
  editCart,
  clearCart,
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
  updatePassword,
  getPendingMerchants,
  approveMerchant,
  rejectMerchant,
  resetPassword,
  updateDescription,
  searchStores,
  updateProductTabs,
  getCarouselImages,
  uploadCarouselImage,
  deleteCarouselImage,
  getCarouselSettings,
  updateCarouselSettings,
  getStoreOpeningHours,
  resetPasswordByAccount
} from '../controllers/users.js'
import { sendVerificationCode } from '../controllers/sendVerificationCode.js'
import { verifyAccountAndPhone } from '../controllers/verifyAccountAndPhone.js'
import { verifyCode } from '../controllers/verifyCode.js'

const router = Router()

router.post('/', content('application/json'), register)
router.post('/login', content('application/json'), auth.login, login)

router.post('/send-verification-code', sendVerificationCode)
router.post('/resetPasswordByAccount', resetPasswordByAccount)
router.post('/verifyAccountAndPhone', verifyAccountAndPhone)
router.post('/verifyCode', verifyCode)

router.delete('/logout', auth.jwtIgnoreExpiration, logout)

router.put('/me', auth.jwt, updateUser)
router.patch('/extend', auth.jwt, extend)
router.get('/me', auth.jwt, getUser)
router.post('/cart', content('application/json'), auth.jwt, editCart)
router.delete('/cart', auth.jwt, clearCart)

router.get('/cart', auth.jwt, getCart)
router.post('/banner', auth.jwt, content('multipart/form-data'), upload, uploadBanner)
router.post('/cover', auth.jwt, content('multipart/form-data'), upload, uploadCover)

router.get('/carousel-settings', getCarouselSettings)

router.post('/carousel-settings', auth.jwt, admin, updateCarouselSettings)
router.get('/carousel-images', getCarouselImages)

router.post('/carousel-image', auth.jwt, content('multipart/form-data'), upload, uploadCarouselImage)

router.post('/description', auth.jwt, content('application/json'), updateDescription)
router.post('/updateProductTabs', auth.jwt, content('application/json'), updateProductTabs)
router.get('/store-images', auth.jwt, getUserStoreImages)
router.get('/pending-merchants', auth.jwt, admin, getPendingMerchants)
router.post('/approve-merchant', approveMerchant)
router.post('/reject-merchant', rejectMerchant)
router.get('/stores', getStores)
router.get('/stores/search', searchStores)
router.get('/store/:uid', getStoreInfo)
router.get('/all', auth.jwt, admin, getAllUsers)
router.put('/updatePassword', auth.jwt, updatePassword)
router.get('/:uid', auth.jwt, getUserByUid)
router.delete('/carousel-image/:id', auth.jwt, deleteCarouselImage)
router.put('/update/:uid', auth.jwt, updateUserById)

router.put('/reset-password/:uid', auth.jwt, resetPassword)
router.get('/opening-hours/:productUid', auth.jwt, getStoreOpeningHours)

export default router
