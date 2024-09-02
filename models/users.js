// models/users.js
import { Schema, model, ObjectId, Error } from 'mongoose'
import validator from 'validator'
import bcrypt from 'bcryptjs'
import { v4 as uuidv4 } from 'uuid'

const cartSchema = new Schema({
  pId: {
    type: ObjectId,
    ref: 'products',
    required: [true, '缺少商品']
  },
  quantity: {
    type: Number,
    required: [true, '缺少數量']
  },
  totalPrice: {
    type: Number,
    required: [true, '缺少總價']
  }
})

const schema = new Schema(
  {
    account: {
      type: String,
      required: [true, '缺少帳號'],
      minlength: [4, '帳號太短'],
      maxlength: [20, '帳號太長'],
      unique: true,
      match: [/^[A-Za-z0-9]+$/, '帳號格式錯誤']
    },
    password: {
      type: String,
      required: true
    },
    email: {
      type: String,
      required: [true, '缺少信箱'],
      unique: true,
      validate: {
        validator(email) {
          return validator.isEmail(email)
        },
        message: '信箱格式錯誤'
      }
    },
    name: {
      type: String,
      required: [true, '缺少姓名']
    },
    address: {
      type: String,
      required: [true, '缺少地址']
    },
    companyName: {
      type: String
    },
    taxId: {
      type: String
    },
    phoneNumber: {
      type: String,
      required: [true, '缺少手機號碼'],
      validate: {
        validator(phoneNumber) {
          return validator.isMobilePhone(phoneNumber, 'any', { strictMode: true })
        },
        message: '手機號碼格式錯誤'
      }
    },
    gender: {
      type: String,
      enum: ['male', 'female'],
      required: [true, '缺少性別']
    },
    birthdate: {
      type: Date,
      required: [true, '缺少出生日期']
    },
    uid: {
      type: String,
      default: uuidv4
    },
    tokens: {
      type: [String],
      default: []
    },
    cart: {
      type: [cartSchema],
      default: []
    },
    role: {
      type: Number,
      // 0 = 使用者
      // 1 = 廠商
      // 2 = 超級管理員
      default: 0
    },
    status: {
      type: Boolean,
      default: true
    }
  },
  { versionKey: false }
)

schema.pre('save', function (next) {
  const user = this
  if (user.isModified('password')) {
    if (user.password.length >= 4 && user.password.length <= 20) {
      user.password = bcrypt.hashSync(user.password, 10)
    } else {
      const error = new Error.ValidationError(null)
      error.addError('password', new Error.ValidatorError({ message: '密碼長度錯誤' }))
      next(error)
      return
    }
  }
  next()
})

schema.pre('findOneAndUpdate', function (next) {
  const user = this._update
  if (user.password) {
    if (user.password.length >= 4 && user.password.length <= 20) {
      user.password = bcrypt.hashSync(user.password, 10)
    } else {
      const error = new Error.ValidationError(null)
      error.addError('password', new Error.ValidatorError({ message: '密碼長度錯誤' }))
      next(error)
      return
    }
  }
  next()
})

export default model('users', schema)
