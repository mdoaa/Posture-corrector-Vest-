import NavBar from "./Nav";
import Footer from "./Footer";
import React, { useState, useEffect, useRef } from "react";
import axios from "axios";
import { useUser } from "./UserContext";
import { getOrCreateGuestId } from "./UtilityGuest";
import "../component style/Home.css";

const images = [
  { src: "sit.png", alt: "Posture Image", title: "Improve Posture" },
  {
    src: "SitX_logo.png",
    alt: "Posture Logo",
    title: "SitX Posture Corrector",
  },
  { src: "sit.png", alt: "Posture Improvement", title: "Sit Better" },
];

const videos = [
  { src: "posture-corrector-demo.mp4", title: "Posture Corrector Demo" },
  { src: "posture-tips.mp4", title: "Posture Tips" },
];

const Home = () => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [experience, setExperience] = useState("");
  const [submittedExperiences, setSubmittedExperiences] = useState([]);
  const user = useUser().user;
  const vedioRef = useRef(null);

  useEffect(() => {
    if (user) {
      const userId = user._id;
      const guestId = getOrCreateGuestId();
      console.log("guest ID from ho,e: ", guestId);
      axios
        .post(
          "http://localhost:8080/merge",
          {
            userId,
            guestId,
          },
          { withCredentials: true }
        )
        .then(() => {
          console.log("User merged successfully");
        })
        .catch((err) => {
          console.log("Error merging user: ", err);
        });
    }

    axios
      .get("http://localhost:8080/experience")
      .then((res) => setSubmittedExperiences(res.data))
      .catch((err) => console.error("Failed to load experiences:", err));
  }, [user]);

  useEffect(() => {
    fetch("http://localhost:8080/track-visit", {
      method: "POST",
    });
    console.log("Visit tracked");
  }, []);

  const handleExperienceSubmit = (e) => {
    e.preventDefault();

    if (!experience.trim()) return;

    const newEntry = {
      text: experience,
      user: user ? user.username : "Guest",
    };

    axios
      .post("http://localhost:8080/experience", newEntry)
      .then((res) => {
        setSubmittedExperiences([
          {
            ...newEntry,
            date: new Date().toLocaleString(),
          },
          ...submittedExperiences,
        ]);
        setExperience(""); // clear input
      })
      .catch((err) => console.error("Error submitting experience:", err));
  };

  const prevImage = () => {
    setCurrentIndex((prevIndex) =>
      prevIndex === 0 ? images.length - 1 : prevIndex - 1
    );
  };

  const nextImage = () => {
    setCurrentIndex((prevIndex) =>
      prevIndex === images.length - 1 ? 0 : prevIndex + 1
    );
  };

  return (
    <div className="home-container">
      <NavBar />
      <div className="welcome">
        {user ? <h3>Welcome, {user.username}!</h3> : <h3>Welcome!</h3>}
        <p>Transform your posture with ease using our posture corrector</p>
      </div>

      <main style={{ height: "500px", backgroundColor: "#f8f8f8" }}>
        <section class="hero">
          <div class="container">
            <div class="hero-content">
              <div class="hero-text">
                <div class="badge">Say Goodbye to Back Pain</div>
                <h2>
                  Correct Your Posture, <span>Transform Your Life</span>
                </h2>
                <p>
                  SitX is a revolutionary posture corrector vest designed to
                  improve your sitting posture, reduce back pain, and boost your
                  productivity and confidence.
                </p>
                <div class="hero-buttons">
                  <a href="buynow" class="btn btn-primary">
                    Order Now
                  </a>
                  <button
                    class="btn btn-outline"
                    onClick={() =>
                      vedioRef.current.scrollIntoView({ behavior: "smooth" })
                    }
                  >
                    Watch Video
                  </button>
                </div>
              </div>
              <div class="hero-image">
                <div class="sitmobile-image">
                  <img src="standwithvest.jpg" alt="sitX image" />
                </div>
                <div class="stats">
                  <div class="stat">
                    <div class="stat-number">97%</div>
                    <div class="stat-text">
                      of users report better posture within just 2 weeks
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>

      <div ref={vedioRef} className="video-section">
        <h2>Watch Our Videos</h2>
        <div className="video-list">
          <div className="video-item">
            <video width="800" height="500" controls>
              <source src="twoperson.mp4" type="video/mp4" />
              Your browser does not support the video tag.
            </video>
            <h4></h4>
          </div>
        </div>
      </div>

      <div className="why-choose">
        <h2>Why Choose SitX?</h2>
        <div className="benefit-list">
          <div className="benefit-item">
            <h3>Improves Posture 𓀗</h3>
            <p>
              Our posture corrector helps align your spine, reducing slouching
              and improving overall posture.
            </p>
          </div>
          <div className="benefit-item">
            <h3>Reduces Back Pain</h3>
            <p>
              Relieve chronic back pain caused by bad posture with a device
              designed for comfort and effectiveness.
            </p>
          </div>
          <div className="benefit-item">
            <h3>Real-time Feedback📊</h3>
            <p>Get instant alerts when your posture needs correction</p>
          </div>
          <div className="benefit-item">
            <h3>📱Mobile App</h3>
            <p>
              Track your progress and get insights through our intuitive app
            </p>
          </div>
        </div>
      </div>

      <div className="sitx-app-section">
        <h2>
          Fast-track your results with the{" "}
          <span className="highlight">FREE SITX App</span>
        </h2>
        <p className="subtitle">
          Simplify improving your posture and changing your habits with the SitX
          App
        </p>
        <div className="sitx-features">
          <ul>
            <li>✓ Personalized posture training</li>
            <li>✓ Daily progress reports</li>
            <li>✓ Step-by-step tutorials </li>
            <li>✓ Track your progress over time</li>
          </ul>
          <div className="app-images">
            <img src="mo.jpg" alt="App Screenshot 1" />
            <img src="mob1.jpg" alt="App Screenshot 2" />
            <img src="moba.jpg" alt="App Screenshot 3" />
            <img src="mo1.jpg" alt="App Screenshot 4" />
          </div>
        </div>
      </div>

      <div className="testimonial-section">
        <h2>What Our Customers Say</h2>
        <p className="testimonial-subtitle">
          Thousands of people have transformed their posture and alleviated pain
          with SitX.
        </p>
        <div className="testimonial-cards">
          {submittedExperiences.length === 0 ? (
            <p>No experiences shared yet.</p>
          ) : (
            submittedExperiences
              .slice(0,4)
              .reverse()
              .map((exp, index) => (
                <div key={index} className="testimonial-card">
                  <div className="testimonial-header">
                    <img
                      src={`https://api.dicebear.com/7.x/adventurer-neutral/svg?seed=${exp.user}`}
                      alt={exp.user}
                      className="testimonial-avatar"
                    />
                    <div>
                      <strong>{exp.user}</strong>
                      <p className="testimonial-role">SitX User</p>
                    </div>
                  </div>
                  <div className="testimonial-body">
                    <p>“{exp.text}”</p>
                  </div>
                </div>
              ))
          )}
        </div>

        <div className="testimonial-form">
          <h3>🗣 Share Your Experience</h3>
          <form onSubmit={handleExperienceSubmit}>
            <textarea
              rows="4"
              cols="50"
              placeholder="Tell us how SitX helped you..."
              value={experience}
              onChange={(e) => setExperience(e.target.value)}
              required
            />
            <br />
            <button type="submit">Submit</button>
          </form>
        </div>
      </div>

      {/* FAQ Section */}
      <div id="FAQ" className="faq-section">
        <h2>Frequently Asked Questions</h2>
        <div className="faq-container">
          {/* FAQ Item 1 */}
          <details className="faq-item">
            <summary>How does the SitX posture corrector work?</summary>
            <p>
              SitX uses advanced sensors to detect when you're slouching or
              maintaining poor posture. It then provides gentle vibration
              feedback to remind you to correct your posture. The accompanying
              app tracks your progress and provides personalized
              recommendations.
            </p>
          </details>

          {/* FAQ Item 2 */}
          <details className="faq-item">
            <summary>How long should I wear the SitX device each day?</summary>
            <p>
              For optimal results, we recommend wearing SitX for 2-4 hours daily
              during the first week, gradually increasing to 6-8 hours. Many
              users wear it during work hours when they're most likely to
              slouch.
            </p>
          </details>

          {/* FAQ Item 3 */}
          <details className="faq-item">
            <summary>Is the SitX comfortable to wear?</summary>
            <p>
              Yes! SitX is designed with comfort in mind. The lightweight
              materials and adjustable straps ensure it fits comfortably against
              your body without causing discomfort during extended wear.
            </p>
          </details>

          {/* FAQ Item 4 */}
          <details className="faq-item">
            <summary>Can I use SitX while exercising?</summary>
            <p>
              SitX is primarily designed for sedentary activities like sitting
              at a desk. While it can be worn during light walking or standing
              activities, we don't recommend wearing it during intense physical
              exercise as it may affect the accuracy of posture detection.
            </p>
          </details>

          {/* FAQ Item 5 */}
          <details className="faq-item">
            <summary>How long does the battery last?</summary>
            <p>
              On a full charge, the SitX device typically lasts 5-7 days with
              normal use. The app will notify you when the battery is running
              low, and it takes approximately 2 hours to fully charge.
            </p>
          </details>
        </div>
      </div>

      <Footer />
    </div>
  );
};

export default Home;
