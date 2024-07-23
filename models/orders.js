// models/orders.js
import { Schema, model } from 'mongoose'

const orderProductSchema = new Schema({
  p_id: {
    type: Number,
    ref: 'products',
    required: [true, '缺少商品']
  },
  quantity: {
    type: Number,
    required: [true, '缺少數量']
  },
  status: {
    type: String,
    enum: ['未確認', '拒絕', '接受', '已送出'],
    default: '未確認'
  },
  totalPrice: {
    type: Number,
    required: [true, '缺少總價']
  }
})

const schema = new Schema(
  {
    u_id: {
      type: Number,
      ref: 'users',
      required: [true, '缺少使用者']
    },
    products: {
      type: [orderProductSchema],
      default: []
    },
    date: {
      type: Date,
      default: Date.now
    },
    deliveryDate: {
      type: Date,
      required: [true, '缺少送達日期']
    },
    deliveryTime: {
      type: String,
      required: [true, '缺少送達時間']
    },
    phone: {
      type: String,
      required: [true, '缺少手機']
    },
    landline: {
      type: String
    },
    companyName: {
      type: String
    },
    taxId: {
      type: String
    },
    recipientName: {
      type: String,
      required: [true, '缺少收貨人']
    },
    recipientPhone: {
      type: String,
      required: [true, '缺少收貨人電話']
    },
    uid: {
      type: String,
      required: [true, '缺少UID']
    },
    status: {
      type: String,
      default: '未確認'
    },
    comment: {
      type: String,
      default: ''
    },
    address: {
      type: String,
      required: [true, '缺少地址']
    },
    paymentMethod: {
      type: String,
      enum: ['現金', '轉帳'],
      required: [true, '缺少付款方式']
    }
  },
  { versionKey: false }
)

export default model('orders', schema)
