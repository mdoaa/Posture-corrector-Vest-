import "../component style/HowItWorks.css";
import NAV from "./Nav";
import Footer from "./Footer";
import { useNavigate } from "react-router-dom";

const HowItWorks = () => {
  const navigate = useNavigate();

  return (
    <>
      <NAV />
      <div className="how-it-works">
        <div className="hero">
          <h1>How It Works</h1>
          <p className="subtitle">
            Transform your posture in 3 simple steps. Watch how our posture
            corrector vest gently guides your body into proper alignment.
          </p>
        </div>
        
        

        <section className="steps-section">
          <h2>Step-by-Step Guide</h2>
          <div className="steps-container">
            <div className="step">
              <div className="step-number">1</div>
              <div className="step-content">
                <h3>Put On the Vest</h3>
                <p>
                  Simply slip the lightweight vest over your shoulders like
                  putting on a backpack.
                </p>
                <div className="step-image">
                  <img
                    src="puttingon.png"
                    alt="Put On the Vest"
                  />
                </div>
              </div>
            </div>

            <div className="step"style={{marginLeft:"400px"}}>
              <div className="step-number">2</div>
              <div className="step-content">
                <h3>Adjust the Straps</h3>
                <p>
                  Customize the fit with our adjustable shoulder straps for
                  maximum comfort.
                </p>
                <div className="step-image" >
                  <img style={{width:"300px",height:"300px"}}
                    src="adjustthestrap.png"
                    alt="Adjust the Straps"
                  />
                </div>
              </div>
            </div>

            <div className="step">
              <div className="step-number">3</div>
              <div className="step-content">
                <h3>Feel the Correction</h3>
                <p>
                  The vest gently pulls your shoulders back, naturally improving
                  your posture.
                </p>
                <div className="step-image">
                  <img style={{width:"300px",height:"300px"}}
                    src="feelthecorrection.png"
                    alt="Feel the Correction"
                  />
                 
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="benefits-section">
          <h2>Why It Works So Well</h2>
          <div className="benefits-container">
            <div className="benefit">
              <h3>Immediate Results</h3>
              <p>
                Feel the difference in your posture within minutes of wearing
                the vest.
              </p>
            </div>
            <div className="benefit">
              <h3>Comfortable Design</h3>
              <p>
                Lightweight and breathable material that you can wear all day.
              </p>
            </div>
            <div className="benefit">
              <h3>Fits Everyone</h3>
              <p>
                Adjustable design suitable for chest sizes from 28-48 inches.
              </p>
            </div>
          </div>
        </section>

        <section className="comparison-section">
          <h2>Before vs After</h2>
            <div className="comparison-item">
              <img
                src="beforandAfter.png"
                alt="Before and After Posture Correction"
              />
            </div>
        </section>

        <section className="cta-section">
          <h2>Ready to Transform Your Posture?</h2>
          <p>
            Join thousands of satisfied customers who have improved their
            posture and confidence.
          </p>
          <button className="cta-button" onClick={()=>navigate("/buyNow")}>
            Get Your Posture Corrector Now
          </button>
        </section>
      </div>
      <Footer />
    </>
  );
};

export default HowItWorks;
