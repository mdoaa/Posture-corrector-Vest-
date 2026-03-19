// scripts/createAdmin.js
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from '../models/user.js';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '../.env') });

console.log('MONGOURI =>', process.env.MONGOURI); // Debug line



const createAdmin = async () => {
  try {
    await  mongoose.connect(process.env.MONGOURI, {
        useNewUrlParser: true,
        useUnifiedTopology: true,
    }).then(() => console.log('conneced to mongodb ✅'))
        .catch((err) => console.log('error in connection to mongodb', err));


    const existingAdmin = await User.findOne({ email: 'admin@gmail.com' });
    if (existingAdmin) {
      console.log('✅ Admin already exists');
      return process.exit();
    }
    const admin = new User({
      username: 'admin',
      email: 'graduationmi2025@gmail.com',
      password: 'Admingraduationmi2025@grad',
      role: 'admin', 
    });

    await admin.save();
    console.log('✅ Admin created successfully');
    process.exit();
  } catch (err) {
    console.error('❌ Error creating admin:', err);
    process.exit(1);
  }
};

createAdmin();
