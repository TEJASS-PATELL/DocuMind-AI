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