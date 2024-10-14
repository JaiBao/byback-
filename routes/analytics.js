// routes/analytics.js

import { Router } from 'express'
import admin from '../middleware/admin.js'
import * as auth from '../middleware/auth.js'
import {
  getMonthlyOrders,
  getProductOrderCounts,
  getAgeDistribution,
  getCityDistribution,
  getDistrictDistribution,
  getMonthlyRevenue,
  getAgeAndGenderDistribution,
  getUserCityDistribution,
  getUserDistrictDistribution,
  getUserAgeDistribution
} from '../controllers/analytics.js'
const router = Router()

router.get('/city', auth.jwt, admin, getUserCityDistribution)
router.get('/district', auth.jwt, admin, getUserDistrictDistribution)
router.get('/age', auth.jwt, admin, getUserAgeDistribution)

router.get('/orders/:sid', auth.jwt, admin, getMonthlyOrders)
router.get('/revenue/:sid', auth.jwt, admin, getMonthlyRevenue)
router.get('/products/:sid', auth.jwt, admin, getProductOrderCounts)
router.get('/age/:sid', auth.jwt, admin, getAgeDistribution)
router.get('/ageAndGender/:sid', auth.jwt, admin, getAgeAndGenderDistribution)
router.get('/city/:sid', auth.jwt, admin, getCityDistribution)
router.get('/district/:sid', auth.jwt, admin, getDistrictDistribution)
export default router
