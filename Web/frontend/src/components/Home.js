import NavBar from "./Nav";
import Footer from "./Footer";
import React, { useState, useEffect, useRef } from "react";
import axios from "axios";
import { useUser } from "./UserContext";
import { getOrCreateGuestId } from "./UtilityGuest";

const Home = () => {
  const [experience, setExperience] = useState("");
  const [submittedExperiences, setSubmittedExperiences] = useState([]);
  const user = useUser().user;
  const videoRef = useRef(null);

  useEffect(() => {
    if (user) {
      const userId = user._id;
      const guestId = getOrCreateGuestId();

      axios
        .post(
          "https://sitx.onrender.com/merge",
          { userId, guestId },
          { withCredentials: true }
        )
        .catch((err) => console.log("Error merging user: ", err));
    }

    axios
      .get("https://sitx.onrender.com/experience")
      .then((res) => setSubmittedExperiences(res.data))
      .catch((err) => console.error("Failed to load experiences:", err));
  }, [user]);

  useEffect(() => {
    fetch("https://sitx.onrender.com/track-visit", { method: "POST" });
  }, []);

  const handleExperienceSubmit = (e) => {
    e.preventDefault();
    if (!experience.trim()) return;

    const newEntry = {
      text: experience,
      user: user ? user.username : "Guest",
    };

    axios
      .post("https://sitx.onrender.com/experience", newEntry)
      .then(() => {
        setSubmittedExperiences([
          { ...newEntry, date: new Date().toLocaleString() },
          ...submittedExperiences,
        ]);
        setExperience("");
      })
      .catch((err) => console.error("Error submitting experience:", err));
  };

  return (
    <div className="min-h-screen bg-[#FBFBFC] text-slate-900">
      {/* Soft luxury background glow */}
      <div className="pointer-events-none fixed inset-0 -z-10">
        <div className="absolute -top-24 left-1/2 h-[520px] w-[520px] -translate-x-1/2 rounded-full bg-emerald-400/10 blur-[120px]" />
        <div className="absolute bottom-0 right-0 h-[520px] w-[520px] rounded-full bg-sky-400/10 blur-[120px]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(0,0,0,0.05),transparent_55%)]" />
      </div>

      <NavBar />

      {/* HERO */}
      <section className="relative">
        <div className="mx-auto max-w-7xl px-4 py-16 md:py-24">
          <div className="grid items-center gap-10 md:grid-cols-2">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-black/10 bg-white/70 px-4 py-2 text-sm text-slate-700 shadow-sm backdrop-blur">
                <span className="h-2 w-2 rounded-full bg-emerald-500" />
                Say goodbye to back pain
              </div>

              <h1 className="mt-6 text-4xl font-semibold tracking-tight md:text-6xl">
                Correct your posture,
                <span className="block bg-gradient-to-r from-emerald-600 via-teal-600 to-sky-600 bg-clip-text text-transparent">
                  transform your life
                </span>
              </h1>

              <p className="mt-5 max-w-xl text-base leading-relaxed text-slate-600 md:text-lg">
                SitX is a premium posture corrector vest designed to elevate your
                sitting habits, reduce back pain, and boost comfort, productivity
                and confidence.
              </p>

              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <a
                  href="buynow"
                  className="group inline-flex items-center justify-center rounded-xl bg-slate-900 px-6 py-3 font-medium text-white shadow-lg shadow-black/10 transition hover:translate-y-[-1px] hover:bg-black"
                >
                  Order Now
                  <span className="ml-2 transition group-hover:translate-x-0.5">
                    →
                  </span>
                </a>

                <button
                  onClick={() =>
                    videoRef.current?.scrollIntoView({ behavior: "smooth" })
                  }
                  className="inline-flex items-center justify-center rounded-xl border border-black/10 bg-white/70 px-6 py-3 font-medium text-slate-800 shadow-sm backdrop-blur transition hover:bg-white"
                >
                  Watch Video
                </button>
              </div>

              {/* Mini stats */}
              <div className="mt-10 grid max-w-md grid-cols-2 gap-4">
                <div className="rounded-2xl border border-black/10 bg-white/70 p-4 shadow-sm backdrop-blur">
                  <div className="text-2xl font-semibold">97%</div>
                  <div className="mt-1 text-sm text-slate-600">
                    report better posture within 2 weeks
                  </div>
                </div>
                <div className="rounded-2xl border border-black/10 bg-white/70 p-4 shadow-sm backdrop-blur">
                  <div className="text-2xl font-semibold">24/7</div>
                  <div className="mt-1 text-sm text-slate-600">
                    real-time feedback & tracking
                  </div>
                </div>
              </div>

              <div className="mt-8 text-sm text-slate-600">
                {user ? (
                  <span>
                    Welcome back,{" "}
                    <span className="font-medium text-slate-900">
                      {user.username}
                    </span>
                    .
                  </span>
                ) : (
                  <span>Welcome. Start your posture transformation today.</span>
                )}
              </div>
            </div>

            {/* Hero Visual */}
            <div className="relative">
              <div className="relative overflow-hidden rounded-3xl border border-black/10 bg-white/70 p-3 shadow-2xl shadow-black/10 backdrop-blur">
                <img
                  src={process.env.PUBLIC_URL + "/standwithvest.jpg"}
                  alt="SitX vest"
                  className="h-[420px] w-full rounded-2xl object-cover md:h-[520px]"
                />
                <div className="absolute inset-0 rounded-3xl bg-gradient-to-t from-black/15 via-black/0 to-transparent" />

                <div className="absolute bottom-5 left-5 right-5 flex items-end justify-between gap-3">
                  <div className="rounded-2xl border border-black/10 bg-white/75 px-4 py-3 shadow-sm backdrop-blur">
                    <div className="text-sm text-slate-600">Premium Comfort</div>
                    <div className="text-lg font-semibold text-slate-900">
                      Smart Vest
                    </div>
                  </div>

                  <div className="rounded-2xl border border-black/10 bg-white/75 px-4 py-3 shadow-sm backdrop-blur">
                    <div className="text-sm text-slate-600">App Insights</div>
                    <div className="text-lg font-semibold text-slate-900">
                      Daily Progress
                    </div>
                  </div>
                </div>
              </div>

              {/* floating pill */}
              <div className="absolute -right-4 -top-6 hidden rounded-2xl border border-black/10 bg-white/80 px-4 py-3 text-sm text-slate-700 shadow-xl shadow-black/10 backdrop-blur md:block">
                Designed for desk work ✨
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* VIDEO */}
      {/*<section ref={videoRef} className="mx-auto max-w-7xl px-4 pb-20">
        <div className="rounded-3xl border border-black/10 bg-white/70 p-6 shadow-sm backdrop-blur md:p-10">
          <div className="flex items-end justify-between gap-6">
            <div>
              <h2 className="text-2xl font-semibold md:text-3xl">Watch</h2>
              <p className="mt-2 text-slate-600">
                See how SitX works in real life.
              </p>
            </div>
          </div>

          <div className="mt-6 overflow-hidden rounded-2xl border border-black/10 bg-black/5">
            <video className="w-full" controls>
              <source src={process.env.PUBLIC_URL + "/twoperson.mp4"} type="video/mp4" />
              Your browser does not support the video tag.
            </video>
          </div>
        </div>
      </section>*/}

      {/* WHY CHOOSE */}
      <section className="mx-auto max-w-7xl px-4 pb-20">
        <div className="flex items-end justify-between">
          <div>
            <h2 className="text-2xl font-semibold md:text-3xl">Why SitX?</h2>
            <p className="mt-2 text-slate-600">
              Luxury build + smart feedback = better posture.
            </p>
          </div>
        </div>

        <div className="mt-8 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[
            {
              title: "Improves posture",
              desc: "Aligns your spine and reduces slouching with gentle guidance.",
            },
            {
              title: "Reduces back pain",
              desc: "Relieves discomfort caused by prolonged sitting and bad habits.",
            },
            {
              title: "Real-time feedback",
              desc: "Instant alerts when your posture needs correction.",
            },
            {
              title: "Mobile app",
              desc: "Track progress, insights, and personalized posture training.",
            },
          ].map((b) => (
            <div
              key={b.title}
              className="rounded-3xl border border-black/10 bg-white/70 p-6 shadow-sm backdrop-blur transition hover:bg-white"
            >
              <h3 className="text-lg font-semibold text-slate-900">
                {b.title}
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-slate-600">
                {b.desc}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* APP SECTION */}
      <section className="mx-auto max-w-7xl px-4 pb-20">
        <div className="rounded-3xl border border-black/10 bg-gradient-to-br from-white to-slate-50 p-6 shadow-sm backdrop-blur md:p-10">
          <div className="grid gap-10 lg:grid-cols-2">
            <div>
              <h2 className="text-2xl font-semibold md:text-3xl">
                Fast-track results with the{" "}
                <span className="bg-gradient-to-r from-emerald-600 to-sky-600 bg-clip-text text-transparent">
                  FREE SitX App
                </span>
              </h2>
              <p className="mt-3 text-slate-600">
                Simplify improving posture and changing your habits with daily
                insights.
              </p>

              <ul className="mt-6 space-y-3 text-slate-700">
                {[
                  "Personalized posture training",
                  "Daily progress reports",
                  "Step-by-step tutorials",
                  "Track progress over time",
                ].map((x) => (
                  <li key={x} className="flex items-start gap-3">
                    <span className="mt-1 inline-block h-5 w-5 rounded-full bg-emerald-500/15 ring-1 ring-emerald-500/25" />
                    <span>{x}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="grid grid-cols-4 gap-4">
  {["/mo.jpg", "/mob1.jpg", "/moba.jpg", "/mo1.jpg"].map((src) => (
    <div
      key={src}
      className="overflow-hidden rounded-3xl border border-black/10 bg-white shadow-md"
    >
      <img
        src={process.env.PUBLIC_URL + src}
        alt="App preview"
        className="aspect-[9/19] w-full object-cover transition duration-500 hover:scale-105"
      />
    </div>
  ))}
</div>

          </div>
        </div>
      </section>

      {/* TESTIMONIALS */}
      <section className="mx-auto max-w-7xl px-4 pb-20">
        <h2 className="text-2xl font-semibold md:text-3xl">
          What customers say
        </h2>
        <p className="mt-2 text-slate-600">
          Real experiences from SitX users.
        </p>

        <div className="mt-8 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {submittedExperiences.length === 0 ? (
            <p className="text-slate-600">No experiences shared yet.</p>
          ) : (
            submittedExperiences
              .slice(0, 4)
              .reverse()
              .map((exp, index) => (
                <div
                  key={index}
                  className="rounded-3xl border border-black/10 bg-white/70 p-6 shadow-sm backdrop-blur"
                >
                  <div className="flex items-center gap-3">
                    <img
                      src={`https://api.dicebear.com/7.x/adventurer-neutral/svg?seed=${exp.user}`}
                      alt={exp.user}
                      className="h-10 w-10 rounded-full border border-black/10 bg-white"
                    />
                    <div>
                      <div className="font-semibold text-slate-900">
                        {exp.user}
                      </div>
                      <div className="text-xs text-slate-500">SitX User</div>
                    </div>
                  </div>
                  <p className="mt-4 text-sm leading-relaxed text-slate-700">
                    “{exp.text}”
                  </p>
                </div>
              ))
          )}
        </div>

        {/* Form */}
        <div className="mt-10 rounded-3xl border border-black/10 bg-white/70 p-6 shadow-sm backdrop-blur md:p-8">
          <h3 className="text-lg font-semibold text-slate-900">
            Share your experience
          </h3>
          <p className="mt-1 text-sm text-slate-600">
            Tell us how SitX helped you.
          </p>

          <form onSubmit={handleExperienceSubmit} className="mt-5 space-y-4">
            <textarea
              rows={4}
              placeholder="Write your experience..."
              value={experience}
              onChange={(e) => setExperience(e.target.value)}
              className="w-full rounded-2xl border border-black/10 bg-white p-4 text-slate-900 placeholder:text-slate-400 outline-none transition focus:border-black/20 focus:ring-2 focus:ring-emerald-500/20"
              required
            />
            <button
              type="submit"
              className="inline-flex items-center justify-center rounded-xl bg-slate-900 px-6 py-3 font-medium text-white shadow-lg shadow-black/10 transition hover:translate-y-[-1px] hover:bg-black"
            >
              Submit
            </button>
          </form>
        </div>
      </section>

      {/* FAQ */}
      <section id="FAQ" className="mx-auto max-w-7xl px-4 pb-24">
        <h2 className="text-2xl font-semibold md:text-3xl">FAQ</h2>
        <p className="mt-2 text-slate-600">
          Everything you need to know about SitX.
        </p>

        <div className="mt-8 space-y-3">
          {[
            {
              q: "How does the SitX posture corrector work?",
              a: "SitX detects poor posture using sensors and provides gentle feedback. The app tracks progress and offers personalized recommendations.",
            },
            {
              q: "How long should I wear the SitX device each day?",
              a: "Start with 2–4 hours daily for the first week, then gradually increase to 6–8 hours depending on comfort and routine.",
            },
            {
              q: "Is the SitX comfortable to wear?",
              a: "Yes—lightweight materials and adjustable straps provide a comfortable, secure fit for extended use.",
            },
            {
              q: "Can I use SitX while exercising?",
              a: "SitX is designed primarily for desk/sedentary use. Light walking is OK, but intense exercise isn’t recommended.",
            },
            {
              q: "How long does the battery last?",
              a: "Typically 5–7 days on a full charge with normal use, and about 2 hours to recharge.",
            },
          ].map((item) => (
            <details
              key={item.q}
              className="group rounded-2xl border border-black/10 bg-white/70 p-5 shadow-sm backdrop-blur open:bg-white"
            >
              <summary className="cursor-pointer list-none font-medium text-slate-900">
                {item.q}
                <span className="float-right text-slate-500 transition group-open:rotate-180">
                  ▼
                </span>
              </summary>
              <p className="mt-3 text-sm leading-relaxed text-slate-600">
                {item.a}
              </p>
            </details>
          ))}
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default Home;