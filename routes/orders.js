import { Router } from 'express'
import { jwt } from '../middleware/auth.js'
import admin from '../middleware/admin.js'
import {
  createOrder,
  getMyOrders,
  getAllOrders,
  updateOrderStatus,
  updateOrderProductStatus,
  getAllCompletedOrders,
  getIncompleteOrders,
  getCompletedOrders
} from '../controllers/orders.js'

const router = Router()

router.post('/', jwt, createOrder)
router.get('/', jwt, getMyOrders)

router.get('/incomplete', jwt, getIncompleteOrders)
router.get('/completed', jwt, getCompletedOrders)

router.get('/all', jwt, admin, getAllOrders)
router.get('/completedorder', jwt, admin, getAllCompletedOrders)
router.put('/status', jwt, updateOrderStatus)
router.put('/products-status', jwt, updateOrderProductStatus)

export default router
