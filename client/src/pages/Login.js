import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    
    if (!email || !password) {
      setError('Please fill in all fields');
      return;
    }

    setLoading(true);
    const result = await login(email, password);
    setLoading(false);

    if (result.success) {
      if (result.user.role === 'superadmin') {
        navigate('/superadmin/dashboard');
      } else {
        navigate('/admin/dashboard');
      }
    } else {
      setError(result.message || 'Login failed. Please check credentials.');
    }
  };

  return (
    <div 
      className="min-vh-100 w-100 d-flex align-items-center justify-content-center animated-fade-in py-5 px-3" 
      style={{ 
        background: 'radial-gradient(circle at 50% 50%, #f4f6fc 0%, #e2e8f5 100%)',
        position: 'relative'
      }}
    >
      {/* Background radial overlays for a premium visual effect */}
      <div 
        className="position-absolute" 
        style={{
          width: '350px',
          height: '350px',
          background: 'rgba(111, 66, 193, 0.08)',
          filter: 'blur(80px)',
          borderRadius: '50%',
          top: '15%',
          left: '20%',
          zIndex: 0
        }}
      ></div>
      <div 
        className="position-absolute" 
        style={{
          width: '300px',
          height: '300px',
          background: 'rgba(59, 130, 246, 0.08)',
          filter: 'blur(70px)',
          borderRadius: '50%',
          bottom: '15%',
          right: '20%',
          zIndex: 0
        }}
      ></div>

      {/* Main Centered Login Box */}
      <div 
        className="card border-0 shadow-lg rounded-4 p-5 bg-white position-relative" 
        style={{ maxWidth: '420px', width: '100%', zIndex: 1 }}
      >
        
        {/* Brand Logo Header */}
        <div className="text-center mb-4">
          <div className="d-inline-flex align-items-center justify-content-center mb-2">
            <div 
              className="rounded-3 p-2 d-flex align-items-center justify-content-center shadow-sm text-white" 
              style={{ width: '44px', height: '44px', backgroundColor: '#6f42c1' }}
            >
              <i className="bi bi-megaphone-fill fs-5"></i>
            </div>
          </div>
          <h4 className="fw-black font-outfit text-dark m-0" style={{ letterSpacing: '-0.02em' }}>Whistlez</h4>
          <p className="text-muted small mt-1.5 mb-0">Sign in to manage queues and campaigns</p>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="alert alert-danger border-0 rounded-3 small mb-4 d-flex align-items-center py-2.5 shadow-sm animate-fade-in" role="alert">
            <i className="bi bi-exclamation-triangle-fill me-2 fs-5 text-danger"></i>
            <div className="fw-semibold text-dark">{error}</div>
          </div>
        )}

        {/* Login Form */}
        <form onSubmit={handleSubmit}>
          
          {/* Email Address */}
          <div className="mb-3.5">
            <label className="form-label small fw-bold text-muted mb-1.5">Email Address</label>
            <div className="input-group" style={{ height: '44px' }}>
              <span className="input-group-text bg-light border-0 rounded-start-3 text-muted px-3">
                <i className="bi bi-envelope"></i>
              </span>
              <input
                type="email"
                className="form-control bg-light border-0 rounded-end-3"
                placeholder="Enter your email address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                style={{ fontSize: '0.9rem' }}
              />
            </div>
          </div>

          {/* Password */}
          <div className="mb-3">
            <label className="form-label small fw-bold text-muted mb-1.5">Password</label>
            <div className="input-group" style={{ height: '44px' }}>
              <span className="input-group-text bg-light border-0 rounded-start-3 text-muted px-3">
                <i className="bi bi-lock"></i>
              </span>
              <input
                type={showPassword ? 'text' : 'password'}
                className="form-control bg-light border-0"
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                style={{ fontSize: '0.9rem' }}
              />
              <button 
                type="button"
                className="input-group-text bg-light rounded-end-3 text-muted border-0 px-3"
                style={{ cursor: 'pointer' }}
                onClick={() => setShowPassword(!showPassword)}
              >
                <i className={`bi ${showPassword ? 'bi-eye-slash' : 'bi-eye'}`}></i>
              </button>
            </div>
          </div>

          {/* Remember Me & Forgot Password */}
          <div className="d-flex justify-content-between align-items-center mb-4 small font-medium">
            <div className="form-check d-flex align-items-center gap-2 m-0">
              <input 
                type="checkbox" 
                className="form-check-input cursor-pointer" 
                id="rememberCheck" 
                checked={rememberMe} 
                onChange={(e) => setRememberMe(e.target.checked)}
                style={{ cursor: 'pointer', width: '16px', height: '16px' }}
              />
              <label className="form-check-label text-muted cursor-pointer" htmlFor="rememberCheck" style={{ cursor: 'pointer', userSelect: 'none' }}>
                Remember me
              </label>
            </div>
            <button 
              type="button" 
              className="btn btn-link text-primary text-decoration-none p-0 small fw-bold"
              style={{ fontSize: '0.85rem' }}
              onClick={() => alert('Forgot Password route triggered.\nPlease contact support@whistlez.com for credential recovery.')}
            >
              Forgot Password?
            </button>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            className="btn btn-primary w-100 py-2.5 rounded-3 fw-bold bg-purple bg-gradient border-0 shadow-sm mb-4 d-flex align-items-center justify-content-center gap-2"
            style={{ backgroundColor: '#6f42c1', height: '45px' }}
            disabled={loading}
          >
            {loading ? (
              <>
                <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
                <span>Signing In...</span>
              </>
            ) : (
              <span>Sign In</span>
            )}
          </button>

        </form>

        {/* Signup Link footer */}
        <div className="text-center border-top pt-4">
          <p className="text-muted small mb-0">
            Don't have an account?{' '}
            <Link to="/signup" className="text-primary fw-bold text-decoration-none">
              Sign up
            </Link>
          </p>
        </div>

      </div>
    </div>
  );
};

export default Login;
