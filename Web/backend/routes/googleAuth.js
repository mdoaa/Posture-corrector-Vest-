import passport from 'passport';
import express from 'express';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';

dotenv.config();


const router = express.Router();

router.get('/google', passport.authenticate('google', {
    scope: ['profile', 'email']
  }));
  
  router.get('/google/callback',
    passport.authenticate('google', { failureRedirect: '/' }),
    (req, res) => {
      const token = jwt.sign(
        { userId: req.user._id, role: req.user.role },
        process.env.JWT_SECRET_KEY,
        { expiresIn: process.env.JWT_EXPIRES_IN }
      );
  
      res.cookie('token', token, {
        httpOnly: true,
        secure: false,
        sameSite: 'Lax',
        path: '/'
      });
  
      const userInfo = encodeURIComponent(JSON.stringify({
        _id: req.user._id,
        name: req.user.name,
        email: req.user.email,
        role: req.user.role
      }));
  
      res.redirect(`http://localhost:3000/google-success?user=${userInfo}`);
    }
  );
  
  
export default router;
  