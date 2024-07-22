// routre/products.js
import { Router } from 'express'
import content from '../middleware/content.js'
import admin from '../middleware/admin.js'
import upload from '../middleware/upload.js'
import { jwt } from '../middleware/auth.js'
import {
  createProduct,
  getAllProducts,
  getProduct,
  getSellProducts,
  editProduct,
  getProductsByUid,
  searchProducts,
  getProductsByStoreUid
} from '../controllers/products.js'

const router = Router()

router.post('/', content('multipart/form-data'), jwt, admin, upload, createProduct)
router.get('/me', jwt, admin, getProductsByUid)
router.get('/', getSellProducts)
router.get('/all', jwt, admin, getAllProducts)
router.get('/search', searchProducts)
router.get('/store/:uid', getProductsByStoreUid)
router.get('/:id', getProduct)
router.patch('/:id', content('multipart/form-data'), jwt, admin, upload, editProduct)

export default router
