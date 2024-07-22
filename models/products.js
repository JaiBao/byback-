// models/products.js
import { Schema, model } from 'mongoose'

const schema = new Schema(
  {
    name: {
      type: String,
      required: [true, '缺少名稱']
    },
    price: {
      type: Number,
      min: [0, '價格錯誤'],
      required: [true, '缺少價格']
    },
    description: {
      type: String,
      required: [true, '缺少說明']
    },
    image: {
      type: String,
      required: [true, '缺少圖片']
    },
    sell: {
      type: Number,
      required: [true, '缺少狀態']
    },
    category: {
      type: String,
      required: [true, '缺少分類'],
      enum: {
        values: ['中式料理', '韓式料理', '日式料理', '手搖杯飲料', '其他'],
        message: '分類錯誤'
      }
    },
    uid: {
      type: String,
      required: [true, '缺少 UID']
    }
  },
  { versionKey: false }
)

export default model('products', schema)
