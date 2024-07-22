import { Router } from 'express'
import { jwt } from '../middleware/auth.js'
import admin from '../middleware/admin.js'
import { createOrder, getMyOrders, getAllOrders, updateOrderStatus, updateOrderProductStatus } from '../controllers/orders.js'

const router = Router()

router.post('/', jwt, createOrder)
router.get('/', jwt, getMyOrders)
router.get('/all', jwt, admin, getAllOrders)
router.put('/status', jwt, updateOrderStatus)
router.put('/products-status', jwt, updateOrderProductStatus)

export default router
