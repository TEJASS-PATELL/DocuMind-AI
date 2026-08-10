import React, { useState } from 'react';
import { FcGoogle } from 'react-icons/fc';
import './Login.css';
import toast from 'react-hot-toast';
import { Link, useNavigate } from 'react-router-dom';
import api from '../api';
import { Sparkles } from 'lucide-react';

const Login: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post('/api/auth/login', { email, password });
      toast.success('Login successful! Welcome back');
      navigate('/chatbot', { replace: true });
    } catch {
      toast.error('Login failed');
    }
  };

  const handleGoogleLogin = () => {
    window.location.href = `${import.meta.env.VITE_API_URL}/api/auth/google`;
  };

  return (
    <div className="login-wrapper">
      <div className="login-box">
        <div className="logo-top-left">
          <svg
            viewBox="0 0 512 512"
            xmlns="http://www.w3.org/2000/svg"
            width="30"
            className="spin-icon"
            height="30"
            style={{ flexShrink: 0 }}
          >
            <g transform="translate(256, 256)">
              <path
                d="M 0 -140 C 35 -45 45 -35 140 0 C 45 35 35 45 0 140 C -35 45 -45 35 -140 0 C -45 -35 -35 -45 0 -140 Z"
                fill="#1A1A1A"
              />
              <path
                d="M 0 -85 C 22 -28 28 -22 85 0 C 28 22 22 28 0 85 C -22 28 -28 22 -85 0 C -28 -22 -22 -28 0 -85 Z"
                fill="#2A5C45"
              />
              <circle cx="0" cy="0" r="16" fill="#FFFFFF" />
            </g>
          </svg>
          <span className="logo-name">DocuMind AI</span>
        </div>

        <h2 className="login-title">
          Welcome <em>Back</em>
        </h2>
        <p className="login-subtitle">Sign in to your account to continue.</p>

        <form onSubmit={handleLogin} className="login-form">
          <div className="form-group">
            <label htmlFor="email">Email</label>
            <input
              id="email"
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="password">Password</label>
            <input
              id="password"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          <button type="submit" className="login-btn">Sign in</button>
        </form>

        <div className="divider-line"><span>or</span></div>

        <button type="button" className="google-btn" onClick={handleGoogleLogin}>
          <FcGoogle size={18} />
          <span>Continue with Google</span>
        </button>

        <p className="signup-text">
          Don't have an account? <Link to="/signup">Create one</Link>
        </p>
      </div>

      <div className="bottom-system-status">
        <span className="status-dot" />
        <Sparkles size={11} />
        <span>System ready · v2.0.5</span>
      </div>
    </div>
  );
};

export default Login;