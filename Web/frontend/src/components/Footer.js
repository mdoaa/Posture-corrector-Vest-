import React from "react";
import "../component style/Footer.css";

const Footer = () => {
  return (
    <footer className="footer">
      <div className="footer-container">
        <div className="footer-branding">
          <h2>SitX</h2>
          <p>Your trusted partner in posture correction.</p>
        </div>
        <div className="footer-links">
          <h4>Quick Links</h4>
          <ul>
            <li>
              <a href="/buyNow">Buy Now</a>
            </li>
            <li>
              <a href="/howItWorks">How to use</a>
            </li>
            <li>
              <a href="/">FAQs</a>
            </li>
          </ul>
        </div>
        <div className="footer-contact">
          <h4>Contact</h4>
          <p>Email: support@sitX.com</p>
          <p>Phone: +1 (800) 555-SITX</p>
        </div>
      </div>
      <div className="footer-bottom">
        <p>&copy; {new Date().getFullYear()} SitX. All rights reserved.</p>
      </div>
    </footer>
  );
};

export default Footer;
