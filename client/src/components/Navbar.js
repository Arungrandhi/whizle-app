import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const Navbar = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  if (!user) return null;

  return (
    <nav className="navbar navbar-expand-lg navbar-light navbar-custom sticky-top shadow-sm">
      <div className="container-fluid">
        <Link className="navbar-brand d-flex align-items-center" to="/">
          <i className="bi bi-megaphone-fill text-primary me-2 fs-4"></i>
          <span className="fw-extrabold text-dark font-outfit fs-4">Whistlez <span className="text-primary">& Tokens</span></span>
        </Link>
        
        <button
          className="navbar-toggler border-0"
          type="button"
          data-bs-toggle="collapse"
          data-bs-target="#navbarNav"
          aria-controls="navbarNav"
          aria-expanded="false"
          aria-label="Toggle navigation"
        >
          <span className="navbar-toggler-icon"></span>
        </button>

        <div className="collapse navbar-collapse" id="navbarNav">
          <ul className="navbar-nav me-auto mb-2 mb-lg-0">
            {user.role === 'admin' && (
              <>
                <li className="nav-item">
                  <Link className="nav-link fw-semibold px-3" to="/admin/dashboard">
                    <i className="bi bi-speedometer2 me-1"></i> Dashboard
                  </Link>
                </li>
                <li className="nav-item">
                  <Link className="nav-link fw-semibold px-3" to="/admin/live-queue">
                    <i className="bi bi-people-fill me-1"></i> Live Queue
                  </Link>
                </li>
              </>
            )}
            {user.role === 'superadmin' && (
              <li className="nav-item">
                <Link className="nav-link fw-semibold px-3" to="/superadmin/dashboard">
                  <i className="bi bi-shield-lock-fill me-1"></i> Super Admin Panel
                </Link>
              </li>
            )}
          </ul>
          
          <div className="d-flex align-items-center">
            <div className="d-flex align-items-center me-3 border-end pe-3">
              <div className="bg-primary-subtle text-primary rounded-circle d-flex align-items-center justify-content-center me-2" style={{ width: '40px', height: '40px' }}>
                <i className={`bi ${user.role === 'superadmin' ? 'bi-shield-check' : 'bi-person-badge-fill'} fs-5`}></i>
              </div>
              <div>
                <div className="fw-bold text-dark lh-1">{user.name}</div>
                <small className="text-uppercase fw-semibold text-muted" style={{ fontSize: '0.65rem', letterSpacing: '0.5px' }}>
                  {user.role === 'superadmin' ? 'Super Admin' : 'Business Admin'}
                </small>
              </div>
            </div>
            
            <button className="btn btn-outline-danger btn-sm border-0 fw-semibold px-3 py-2 rounded-3" onClick={handleLogout}>
              <i className="bi bi-box-arrow-right me-1"></i> Log Out
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
