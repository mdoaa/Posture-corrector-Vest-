import React from "react";
import { Link } from "react-router-dom";

const Footer = () => {
  return (
    <footer className="mt-24 border-t border-slate-300 bg-slate-600">
      <div className="mx-auto max-w-7xl px-4 py-16">
        <div className="grid gap-10 md:grid-cols-3">
          {/* Branding */}
          <div>
            <h2 className="text-xl font-semibold tracking-tight text-slate-100">
              SitX
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-slate-100">
              Your trusted partner in posture correction. Designed to elevate
              comfort, confidence, and everyday performance.
            </p>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="text-sm font-semibold uppercase tracking-wider text-slate-100">
              Quick Links
            </h4>
            <ul className="mt-4 space-y-3 text-sm text-slate-100">
              <li>
                <Link to="/buyNow" className="transition hover:text-slate-300">
                  Buy Now
                </Link>
              </li>
              <li>
                <Link
                  to="/howItWorks"
                  className="transition hover:text-slate-200"
                >
                  How It Works
                </Link>
              </li>
              <li>
                <Link to="/#FAQ" className="transition hover:text-slate-200">
                  FAQs
                </Link>
              </li>
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h4 className="text-sm font-semibold uppercase tracking-wider text-slate-100">
              Contact
            </h4>
            <div className="mt-4 space-y-2 text-sm text-slate-100">
              <p>
                Email:{" "}
                <a
                  href="mailto:sitxmi2025.com"
                  className="transition hover:text-slate-200"
                >
                  support@sitx.com
                </a>
              </p>
            </div>
          </div>
        </div>

        {/* Bottom */}
        <div className="mt-12 border-t border-slate-300 pt-6 text-center text-xs text-slate-100">
          © {new Date().getFullYear()} SitX. All rights reserved.
        </div>
      </div>
    </footer>
  );
};

export default Footer;
