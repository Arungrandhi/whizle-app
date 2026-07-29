import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const SuperAdminSidebar = ({ showMobile, toggleMobile }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  if (!user || user.role !== 'superadmin') return null;

  return (
    <aside className={`admin-sidebar ${showMobile ? 'show' : ''}`} style={{ borderRight: '1px solid #ddd' }}>
      <div>
        {/* Brand Header */}
        <NavLink className="sidebar-brand" to="/superadmin/dashboard" onClick={() => toggleMobile && toggleMobile(false)}>
          <i className="bi bi-shield-lock-fill text-primary me-2 fs-3"></i>
          <span className="fw-extrabold text-dark font-outfit fs-4">
            Whistlez<span className="text-primary">.</span>
          </span>
        </NavLink>

        {/* Sidebar Nav Links */}
        <ul className="sidebar-menu">
          <li className="sidebar-item">
            <NavLink 
              to="/superadmin/dashboard" 
              className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}
              onClick={() => toggleMobile && toggleMobile(false)}
            >
              <i className="bi bi-grid-fill"></i>
              Dashboard
            </NavLink>
          </li>
          <li className="sidebar-item">
            <NavLink 
              to="/superadmin/users" 
              className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}
              onClick={() => toggleMobile && toggleMobile(false)}
            >
              <i className="bi bi-people-fill"></i>
              Users
            </NavLink>
          </li>
          <li className="sidebar-item">
            <NavLink 
              to="/superadmin/businesses" 
              className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}
              onClick={() => toggleMobile && toggleMobile(false)}
            >
              <i className="bi bi-shop-window"></i>
              Business
            </NavLink>
          </li>
          <li className="sidebar-item">
            <NavLink 
              to="/superadmin/ringtones" 
              className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}
              onClick={() => toggleMobile && toggleMobile(false)}
            >
              <i className="bi bi-music-note-list"></i>
              Whistlez Ringtone
            </NavLink>
          </li>
          <li className="sidebar-item">
            <NavLink 
              to="/superadmin/ads" 
              className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}
              onClick={() => toggleMobile && toggleMobile(false)}
            >
              <i className="bi bi-megaphone-fill"></i>
              Ads
            </NavLink>
          </li>
          <li className="sidebar-item">
            <NavLink 
              to="/superadmin/reports" 
              className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}
              onClick={() => toggleMobile && toggleMobile(false)}
            >
              <i className="bi bi-bar-chart-line-fill"></i>
              Reports
            </NavLink>
          </li>
          <li className="sidebar-item">
            <NavLink 
              to="/superadmin/settings" 
              className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}
              onClick={() => toggleMobile && toggleMobile(false)}
            >
              <i className="bi bi-gear-fill"></i>
              Settings
            </NavLink>
          </li>
        </ul>
      </div>

      {/* Footer Profile & Logout */}
      <div>
        <div className="sidebar-logout">
          <button className="sidebar-logout-btn" onClick={handleLogout}>
            <i className="bi bi-box-arrow-left"></i>
            Logout
          </button>
        </div>
      </div>
    </aside>
  );
};

export default SuperAdminSidebar;
