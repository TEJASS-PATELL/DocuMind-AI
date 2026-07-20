import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  FaSignInAlt, FaFileAlt, FaShieldAlt, FaArrowRight, FaBolt,
  FaBrain, FaFilePdf, FaFileWord, FaFilePowerpoint,
  FaCheckCircle
} from "react-icons/fa";
import { SiGooglegemini } from "react-icons/si";
import api from "../api";
import Footer from "../Components/Footer";
import "./Home.css";
import Feature from "../Components/Feature";
import Working from "../Components/Working";

const HomePage = () => {
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    api.get('/api/auth/check')
      .then(() => setIsLoggedIn(true))
      .catch(() => setIsLoggedIn(false));
  }, []);

  return (
    <div className="home-wrapper">
      <section className="hero-section">
        <div className="hero-inner">
          <div className="badge">
            <span className="badge-dot" />
            RAG-powered document intelligence
          </div>

          <h1 className="hero-headline">
            Your documents,<br />
            <em>finally</em> answerable.
          </h1>

          <p className="hero-sub">
            Upload PDFs, research papers, or docs and get instant, accurate answers.
            Powered by semantic search and multi-modal AI that reads text, tables, and charts.
          </p>

          <div className="feature-pills">
            <span className="pill"><FaFileAlt className="pill-icon" />Smart chunking</span>
            <span className="pill"><FaShieldAlt className="pill-icon" />Private &amp; secure</span>
            <span className="pill"><FaBolt className="pill-icon" />Instant retrieval</span>
          </div>

          <div className="cta-group">
            {isLoggedIn ? (
              <div className="logged-in-cta">
                <Link to="/chatbot" className="btn-workspace">
                  Open AI Workspace <FaArrowRight />
                </Link>
                <p className="welcome-note">Welcome back — ready to analyze?</p>
              </div>
            ) : (
              <div className="logged-out-cta">
                <Link to="/login" className="btn-primary">
                  Get started free <FaArrowRight />
                </Link>
              </div>
            )}
          </div>

          <div className="hero-disclaimer">
            <FaCheckCircle className="check-icon" />
            <span>Free forever plan · No credit card · Setup in 60 seconds</span>
          </div>

          <div className="hero-formats">
            <span className="formats-label">Works with</span>
            <div className="formats-list">
              <span className="format-item"><FaFilePdf className="fmt-pdf" />PDF</span>
              <span className="format-item"><FaFileWord className="fmt-word" />Word</span>
              <span className="format-item"><FaFilePowerpoint className="fmt-ppt" />PPT</span>
              <span className="format-item"><FaFileAlt className="fmt-txt" />TXT</span>
              <span className="format-item fmt-more">+ more</span>
            </div>
          </div>
        </div>

        <div className="hero-right">
          <div className="hero-demo-card">
            <div className="demo-topbar">
              <div className="demo-dots">
                <span /><span /><span />
              </div>
              <span className="demo-topbar-title">DocuMind AI</span>
            </div>

            <div className="demo-body">
              <div className="demo-msg demo-msg--user">
                What are the key findings in section 3?
              </div>

              <div className="demo-msg demo-msg--ai">
                <div className="ai-label">
                  <FaBrain className="ai-label-icon" /> DocuMind
                </div>
                Section 3 highlights three main findings:
                <ul className="demo-list">
                  <li>Revenue grew by <strong>34%</strong> YoY</li>
                  <li>Customer retention reached <strong>91%</strong></li>
                  <li>Operating costs fell by <strong>12%</strong></li>
                </ul>
              </div>

              <div className="demo-typing">
                <span /><span /><span />
              </div>
            </div>

            <div className="demo-footer">
              <span className="demo-input-fake">Ask a follow-up...</span>
              <span className="demo-send"><FaArrowRight size={14}/></span>
            </div>
          </div>

          <div className="hero-mini-stats">
            <div className="mini-stat">
              <span className="mini-stat-num">10×</span>
              <span className="mini-stat-label">Faster research</span>
            </div>
            <div className="mini-stat-divider" />
            <div className="mini-stat">
              <span className="mini-stat-num">99%</span>
              <span className="mini-stat-label">Accuracy</span>
            </div>
            <div className="mini-stat-divider" />
            <div className="mini-stat">
              <span className="mini-stat-num">500+</span>
              <span className="mini-stat-label">Researchers</span>
            </div>
          </div>

          <div className="hero-powered">
            <span className="powered-label">Powered by</span>
            <div className="powered-logos">
              <span className="powered-item">
                <SiGooglegemini /> Gemini Pro
              </span>
              <span className="powered-sep">·</span>
              <span className="powered-item">
                  Pinecone
              </span>
            </div>
          </div>
        </div>
      </section>
      <Working />
      <Feature />
      <Footer />
    </div>
  );
};

export default HomePage;