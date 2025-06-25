import mongoose from "mongoose";
import bcrypt from "bcryptjs";

const userSchema = new mongoose.Schema({
  username: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: {
    type: String,
    required: function () {
      return !this.googleId;
    },
    minlength: [6, 'Password must be at least 6 characters long.']
  },
  googleId: {
    type: String,
    default: null
  },
  
  role: {
    type: String,
    enum: ['user', 'admin'],
    default: 'user'
  },
  cart:[
    {
    productId: {type:mongoose.Schema.Types.ObjectId,ref:'Product'},
    quantity:{type:Number,default:1}
  
    }
  ],
  orders: [
    {
      items: [
        {
          productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },
          quantity: Number
        }
      ],
      total: Number,
      country:{ type: String, default: "Egypt" },
      city: { type: String, default: "Cairo" },
      name: String,
      address: String,
      phone: String,
      date: { type: Date, default: Date.now }
    }
  ]
});

userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();
  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (err) {
    next(err);
  }
});

userSchema.methods.comparePassword = function (candidatePassword) {
    return bcrypt.compare(candidatePassword, this.password);
};

export default mongoose.model('User', userSchema);
