import mongoose from "mongoose";

const guestCartSchema = new mongoose.Schema({

    guestId: { type: String, required: true },
    items: [
        {
            productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },
            quantity:{type:Number,default:1}
        }   
    ]
    
});
const GuestCart = mongoose.model('GuestCart', guestCartSchema);
export default GuestCart;