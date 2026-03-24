import passport from 'passport';
import express from 'express';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';

dotenv.config();


const router = express.Router();
const frontendSuccessBaseUrl =
  (process.env.FRONTEND_SUCCESS_URL || "http://localhost:3000").replace(/\/$/, "");

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
        secure: true,
        sameSite: 'none',
        path: '/'
      });
  
      const userInfo = encodeURIComponent(JSON.stringify({
        _id: req.user._id,
        name: req.user.name,
        email: req.user.email,
        role: req.user.role
      }));
  
      res.redirect(`${frontendSuccessBaseUrl}/google-success?user=${userInfo}`);
    }
  );
  
  
export default router;
  