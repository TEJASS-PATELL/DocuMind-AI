import React from 'react';
import './Footer.css';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faGithub } from '@fortawesome/free-brands-svg-icons';
import { faEnvelope } from '@fortawesome/free-solid-svg-icons';
import { FaHeart, FaReact } from 'react-icons/fa';
import { SiLangchain, SiGooglegemini, SiExpress } from 'react-icons/si';
import { Trees } from 'lucide-react';

const socialLinks = {
  github: 'https://github.com/TEJASS-PATELL',
  email: 'mailto:tejasspatell2@gmail.com',
};

const Footer: React.FC = () => {
  return (
    <footer className="rag-footer">
      <div className="footer-content">
        <div className="footer-info">
          <p className="copyright">
            &copy; {new Date().getFullYear()} <strong>DocuMind AI</strong> — Intelligent RAG Systems
          </p>
          <p className="made-by">
            Built with <FaHeart className="heart-icon" /> by <strong>Tejas Patel</strong>
          </p>
        </div>

        <div className="footer-tech-stack">
          <span><FaReact size={14} /> React</span>
          <span><SiExpress size={14} /> Express</span>
          <span><SiLangchain size={14} /> LangChain</span>
          <span><SiGooglegemini size={14} /> Gemini</span>
          <span><Trees size={14} /> Pinecone</span>
        </div>

        <div className="footer-social-icons">
          <a href={socialLinks.github} target="_blank" rel="noopener noreferrer" title="GitHub">
            <FontAwesomeIcon icon={faGithub} />
          </a>
          <a href={socialLinks.email} title="Email">
            <FontAwesomeIcon icon={faEnvelope} />
          </a>
        </div>
      </div>
    </footer>
  );
};

export default Footer;