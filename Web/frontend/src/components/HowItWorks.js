import React from "react";
import NavBar from "./Nav";
import Footer from "./Footer";
import { useNavigate } from "react-router-dom";

const HowItWorks = () => {
  const navigate = useNavigate();

  const img = (path) => process.env.PUBLIC_URL + path;

  return (
    <div className="min-h-screen bg-[#FBFBFC] text-slate-900">
      {/* soft background glow */}
      <div className="pointer-events-none fixed inset-0 -z-10">
        <div className="absolute -top-24 left-1/2 h-[520px] w-[520px] -translate-x-1/2 rounded-full bg-emerald-400/10 blur-[120px]" />
        <div className="absolute bottom-0 right-0 h-[520px] w-[520px] rounded-full bg-sky-400/10 blur-[120px]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(0,0,0,0.05),transparent_55%)]" />
      </div>

      <NavBar />

      {/* HERO */}
      <section className="mx-auto max-w-7xl px-4 pt-14 pb-10 md:pt-20">
        <div className="rounded-3xl border border-black/10 bg-white/70 p-8 shadow-sm backdrop-blur md:p-12">
          <h1 className="text-3xl font-semibold tracking-tight md:text-5xl">
            How It Works
          </h1>
          <p className="mt-4 max-w-2xl text-slate-600 md:text-lg">
            Transform your posture in 3 simple steps. Watch how our posture
            corrector vest gently guides your body into proper alignment.
          </p>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <button
              onClick={() => navigate("/buyNow")}
              className="inline-flex items-center justify-center rounded-xl bg-slate-900 px-6 py-3 font-medium text-white shadow-lg shadow-black/10 transition hover:translate-y-[-1px] hover:bg-black"
            >
              Buy Now
              <span className="ml-2">→</span>
            </button>

            <a
              href="#steps"
              className="inline-flex items-center justify-center rounded-xl border border-black/10 bg-white/80 px-6 py-3 font-medium text-slate-800 shadow-sm transition hover:bg-white"
            >
              See Steps
            </a>
          </div>
        </div>
      </section>

      {/* STEPS */}
      <section id="steps" className="mx-auto max-w-7xl px-4 pb-16">
        <div className="flex items-end justify-between">
          <div>
            <h2 className="text-2xl font-semibold md:text-3xl">
              Step-by-Step Guide
            </h2>
            <p className="mt-2 text-slate-600">
              Simple. Comfortable. Effective.
            </p>
          </div>
        </div>

        <div className="mt-8 grid gap-6 lg:grid-cols-3">
          {[
            {
              n: "1",
              title: "Put On the Vest",
              desc: "Slip the lightweight vest over your shoulders like putting on a backpack.",
              img: "/puttingon.png",
            },
            {
              n: "2",
              title: "Adjust the Straps",
              desc: "Customize the fit with adjustable shoulder straps for maximum comfort.",
              img: "/adjustthestrap.png",
            },
            {
              n: "3",
              title: "Feel the Correction",
              desc: "The vest gently pulls your shoulders back, naturally improving your posture.",
              img: "/feelthecorrection.png",
            },
          ].map((s) => (
            <div
              key={s.n}
              className="group rounded-3xl border border-black/10 bg-white/70 p-6 shadow-sm backdrop-blur transition hover:bg-white"
            >
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-900 text-white font-semibold">
                  {s.n}
                </div>
                <h3 className="text-lg font-semibold text-slate-900">
                  {s.title}
                </h3>
              </div>

              <p className="mt-3 text-sm leading-relaxed text-slate-600">
                {s.desc}
              </p>

              <div className="mt-5 overflow-hidden rounded-2xl border border-black/10 bg-slate-50">
                <img
                  src={img(s.img)}
                  alt={s.title}
                  className="aspect-[4/5] w-full object-cover transition duration-500 group-hover:scale-[1.03]"
                />
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* BENEFITS */}
      <section className="mx-auto max-w-7xl px-4 pb-16">
        <div className="rounded-3xl border border-black/10 bg-white/70 p-6 shadow-sm backdrop-blur md:p-10">
          <h2 className="text-2xl font-semibold md:text-3xl">
            Why It Works So Well
          </h2>
          <p className="mt-2 text-slate-600">
            Built to help you build better habits.
          </p>

          <div className="mt-8 grid gap-4 md:grid-cols-3">
            {[
              {
                t: "Immediate Results",
                d: "Feel the difference in your posture within minutes of wearing the vest.",
              },
              {
                t: "Comfortable Design",
                d: "Lightweight and breathable material that you can wear all day.",
              },
              {
                t: "Fits Everyone",
                d: "Adjustable design suitable for chest sizes from 28–48 inches.",
              },
            ].map((b) => (
              <div
                key={b.t}
                className="rounded-3xl border border-black/10 bg-white/80 p-6 shadow-sm"
              >
                <h3 className="text-lg font-semibold text-slate-900">{b.t}</h3>
                <p className="mt-2 text-sm leading-relaxed text-slate-600">
                  {b.d}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* BEFORE vs AFTER */}
      <section className="mx-auto max-w-7xl px-4 pb-16">
        <div className="rounded-3xl border border-black/10 bg-white/70 p-6 shadow-sm backdrop-blur md:p-10">
          <div className="flex items-end justify-between gap-6">
            <div>
              <h2 className="text-2xl font-semibold md:text-3xl">
                Before vs After
              </h2>
              <p className="mt-2 text-slate-600">
                See the posture difference with consistent use.
              </p>
            </div>
          </div>

          <div className="mt-6 overflow-hidden rounded-3xl border border-black/10 bg-slate-50">
  <img
    src={img("/beforandAfter.png")}
    alt="Before and After Posture Correction"
    className="aspect-[3/2] w-full object-cover"
  />
</div>

        </div>
      </section>

      {/* CTA */}
      <section className="mx-auto max-w-7xl px-4 pb-24">
        <div className="rounded-3xl border border-black/10 bg-gradient-to-br from-slate-900 to-black p-8 text-white shadow-2xl shadow-black/15 md:p-12">
          <h2 className="text-2xl font-semibold md:text-4xl">
            Ready to transform your posture?
          </h2>
          <p className="mt-3 max-w-2xl text-white/80">
            Join thousands of satisfied customers who have improved their
            posture and confidence.
          </p>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <button
              className="inline-flex items-center justify-center rounded-xl bg-white px-6 py-3 font-medium text-slate-900 shadow-lg shadow-white/10 transition hover:translate-y-[-1px]"
              onClick={() => navigate("/buyNow")}
            >
              Get Your Posture Corrector Now
              <span className="ml-2">→</span>
            </button>

            <button
              className="inline-flex items-center justify-center rounded-xl border border-white/20 bg-white/10 px-6 py-3 font-medium text-white backdrop-blur transition hover:bg-white/15"
              onClick={() => navigate("/")}
            >
              Back to Home
            </button>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default HowItWorks;
