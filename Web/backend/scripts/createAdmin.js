// scripts/createAdmin.js
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from '../models/user.js';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const adminSeedEmail = process.env.ADMIN_SEED_EMAIL;
const adminSeedPassword = process.env.ADMIN_SEED_PASSWORD;
const adminSeedUsername = process.env.ADMIN_SEED_USERNAME || 'admin';


const createAdmin = async () => {
  try {
    if (!adminSeedEmail || !adminSeedPassword) {
      console.error('❌ Missing ADMIN_SEED_EMAIL or ADMIN_SEED_PASSWORD in environment');
      process.exit(1);
    }

    await  mongoose.connect(process.env.MONGOURI, {
        useNewUrlParser: true,
        useUnifiedTopology: true,
    }).then(() => console.log('conneced to mongodb ✅'))
        .catch((err) => console.log('error in connection to mongodb', err));


    const existingAdmin = await User.findOne({ email: adminSeedEmail });
    if (existingAdmin) {
      console.log('✅ Admin already exists');
      return process.exit();
    }

    const admin = new User({
      username: adminSeedUsername,
      email: adminSeedEmail,
      password: adminSeedPassword,
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
