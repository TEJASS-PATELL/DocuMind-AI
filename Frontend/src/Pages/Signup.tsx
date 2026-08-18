import React, { useState } from 'react';
import './Signup.css';
import toast from 'react-hot-toast';
import { useNavigate, Link } from 'react-router-dom';
import api from '../api';
import { Sparkles } from 'lucide-react';

interface FormState {
  name: string;
  email: string;
  password: string;
  confirmPassword: string;
}

const Signup: React.FC = () => {
  const [form, setForm] = useState<FormState>({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
  });

  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  const navigate = useNavigate();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
    setErrors(prev => ({ ...prev, [name]: '' }));
  };

  const validate = () => {
    const newErrors: { [key: string]: string } = {};
    if (!form.name.trim()) newErrors.name = 'Full name is required';
    if (!form.email.trim()) newErrors.email = 'Email is required';
    else if (!/\S+@\S+\.\S+/.test(form.email)) newErrors.email = 'Enter a valid email address';

    if (!form.password) newErrors.password = 'Password is required';
    else if (form.password.length < 6) newErrors.password = 'Must be at least 6 characters';

    if (!form.confirmPassword) newErrors.confirmPassword = 'Please confirm your password';
    else if (form.confirmPassword !== form.password) newErrors.confirmPassword = 'Passwords do not match';

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    try {
      await api.post('/api/auth/signup', {
        name: form.name,
        email: form.email,
        password: form.password,
      });
      toast.success('Welcome to DocuMind AI');
      navigate('/chatbot', { replace: true });
    } catch (err: any) {
      if (err.response?.status === 409) {
        toast.error('Email already registered. Try logging in.');
      } else {
        toast.error('Something went wrong. Please try again.');
      }
    }
  };

  return (
    <div className="signup-wrapper">
      <form className="signup-box" onSubmit={handleSubmit} noValidate>
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

        <h2 className="signup-title">
          Create an <em>Account</em>
        </h2>
        <p className="signup-subtitle">
          Join <span>DocuMind AI</span> and start chatting with your documents.
        </p>

        <div className="form-group">
          <label htmlFor="name">Full Name</label>
          <input
            id="name"
            type="text"
            name="name"
            placeholder="your name"
            value={form.name}
            onChange={handleChange}
          />
          {errors.name && <p className="error-text">{errors.name}</p>}
        </div>

        <div className="form-group">
          <label htmlFor="email">Email</label>
          <input
            id="email"
            type="email"
            name="email"
            placeholder="you@example.com"
            value={form.email}
            onChange={handleChange}
          />
          {errors.email && <p className="error-text">{errors.email}</p>}
        </div>

        <div className="form-group">
          <label htmlFor="password">Password</label>
          <input
            id="password"
            type="password"
            name="password"
            placeholder="••••••••"
            value={form.password}
            onChange={handleChange}
          />
          {errors.password ? (
            <p className="error-text">{errors.password}</p>
          ) : (
            <small className="password-help">At least 6 characters.</small>
          )}
        </div>

        <div className="form-group">
          <label htmlFor="confirmPassword">Confirm Password</label>
          <input
            id="confirmPassword"
            type="password"
            name="confirmPassword"
            placeholder="••••••••"
            value={form.confirmPassword}
            onChange={handleChange}
          />
          {errors.confirmPassword && <p className="error-text">{errors.confirmPassword}</p>}
        </div>

        <button type="submit" className="signup-btn">
          Create account
        </button>

        <p className="login-redirect">
          Already have an account? <Link to="/login">Sign in</Link>
        </p>
      </form>

      <div className="bottom-system-status">
        <Sparkles size={11} />
        <span>System ready · v3.1</span>
      </div>
    </div>
  );
};

export default Signup;