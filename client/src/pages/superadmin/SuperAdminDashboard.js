import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import socket from '../../socket';
import { api } from '../../context/AuthContext';

const SuperAdminDashboard = () => {
  const navigate = useNavigate();
  const [metrics, setMetrics] = useState(null);
  const [businesses, setBusinesses] = useState([]);
  const [allBusinesses, setAllBusinesses] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [growthFilter, setGrowthFilter] = useState('Weekly');

  const fetchDashboardData = async () => {
    try {
      if (!metrics) setLoading(true);
      const [metricsRes, bizRes, usersRes] = await Promise.all([
        api.get('/superadmin/metrics'),
        api.get('/superadmin/businesses'),
        api.get('/superadmin/users')
      ]);

      if (metricsRes.data.success) {
        setMetrics(metricsRes.data.metrics);
      }
      if (bizRes.data.success) {
        setAllBusinesses(bizRes.data.businesses);
        setBusinesses(bizRes.data.businesses.slice(0, 5)); // show top 5
      }
      if (usersRes.data.success) {
        setUsers(usersRes.data.users.slice(0, 5)); // show top 5
      }
    } catch (err) {
      console.error('Error fetching dashboard details', err);
      setError('Could not retrieve super admin dashboard statistics.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  // Socket listener for real-time superadmin updates
  useEffect(() => {
    socket.emit('joinSuperAdmin');

    const handleUpdate = () => {
      fetchDashboardData();
    };

    socket.on('metricsUpdated', handleUpdate);
    socket.on('businessesUpdated', handleUpdate);
    socket.on('usersUpdated', handleUpdate);

    return () => {
      socket.off('metricsUpdated', handleUpdate);
      socket.off('businessesUpdated', handleUpdate);
      socket.off('usersUpdated', handleUpdate);
    };
  }, []);

  // Hourly Daily Growth Calculator (9 AM to 6 PM today)
  const getDailyChartData = () => {
    const hours = [];
    for (let i = 9; i <= 18; i++) {
      hours.push({
        label: `${i > 12 ? i - 12 : i} ${i >= 12 ? 'PM' : 'AM'}`,
        hour: i,
        count: 0
      });
    }

    const todayStr = new Date().toDateString();
    allBusinesses.forEach(b => {
      const bDate = new Date(b.createdAt);
      if (bDate.toDateString() === todayStr) {
        const hr = bDate.getHours();
        const match = hours.find(h => h.hour === hr);
        if (match) {
          match.count++;
        }
      }
    });

    const max = Math.max(...hours.map(h => h.count), 1);
    return hours.map(h => ({
      label: h.label,
      val: `${Math.max(10, Math.round((h.count / max) * 100))}%`,
      count: h.count,
      filterType: 'daily',
      filterValue: h.hour
    }));
  };

  // Rolling 7-day Weekly Growth Calculator
  const getWeeklyChartData = () => {
    const days = [];
    const now = new Date();
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
      days.push({
        dateString: d.toDateString(),
        label: d.toLocaleDateString([], { weekday: 'short' }),
        count: 0
      });
    }

    allBusinesses.forEach(b => {
      const bDateString = new Date(b.createdAt).toDateString();
      const match = days.find(d => d.dateString === bDateString);
      if (match) {
        match.count++;
      }
    });

    const max = Math.max(...days.map(d => d.count), 1);
    return days.map(d => ({
      label: d.label,
      val: `${Math.max(10, Math.round((d.count / max) * 100))}%`,
      count: d.count,
      filterType: 'weekly',
      filterValue: d.dateString
    }));
  };

  // Rolling 6-month Monthly Growth Calculator
  const getMonthlyChartData = () => {
    const months = [];
    const now = new Date();
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      months.push({
        year: d.getFullYear(),
        month: d.getMonth(),
        label: d.toLocaleDateString([], { month: 'short' }),
        count: 0
      });
    }

    allBusinesses.forEach(b => {
      const bDate = new Date(b.createdAt);
      const match = months.find(m => m.year === bDate.getFullYear() && m.month === bDate.getMonth());
      if (match) {
        match.count++;
      }
    });

    const max = Math.max(...months.map(m => m.count), 1);
    return months.map(m => ({
      label: m.label,
      val: `${Math.max(10, Math.round((m.count / max) * 100))}%`,
      count: m.count,
      filterType: 'monthly',
      filterValue: `${m.year}-${m.month}`
    }));
  };

  // Yearly Growth Calculator (last 5 years)
  const getYearlyChartData = () => {
    const years = [];
    const currentYear = new Date().getFullYear();
    for (let i = 4; i >= 0; i--) {
      years.push({
        label: `${currentYear - i}`,
        year: currentYear - i,
        count: 0
      });
    }

    allBusinesses.forEach(b => {
      const bYear = new Date(b.createdAt).getFullYear();
      const match = years.find(y => y.year === bYear);
      if (match) {
        match.count++;
      }
    });

    const max = Math.max(...years.map(y => y.count), 1);
    return years.map(y => ({
      label: y.label,
      val: `${Math.max(10, Math.round((y.count / max) * 100))}%`,
      count: y.count,
      filterType: 'yearly',
      filterValue: y.year
    }));
  };

  const chartData = 
    growthFilter === 'Daily' ? getDailyChartData() :
    growthFilter === 'Weekly' ? getWeeklyChartData() :
    growthFilter === 'Monthly' ? getMonthlyChartData() :
    getYearlyChartData();

  const handleBarClick = (item) => {
    navigate(`/superadmin/businesses?filter=${item.filterType}&value=${item.filterValue}&label=${item.label}`);
  };

  return (
    <div className="animated-fade-in">
      {/* Header greetings */}
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h2 className="fw-extrabold text-dark mb-1">Super Admin Dashboard</h2>
          <p className="text-muted small mb-0">System performance metrics and global directory management.</p>
        </div>
      </div>

      {error && (
        <div className="alert alert-danger border-0 rounded-3 small mb-4">
          {error}
        </div>
      )}

      {/* Stats row */}
      <div className="row g-3 mb-4">
        <div className="col-md-4">
          <div className="stat-widget-card shadow-sm">
            <div>
              <span className="text-muted small fw-semibold">TOTAL BUSINESS</span>
              <h2 className="fw-extrabold text-dark mt-1 mb-0">
                {loading ? <span className="spinner-border spinner-border-sm text-muted"></span> : metrics?.totalBusinesses || 0}
              </h2>
              <small className="text-muted small">Registered in system</small>
            </div>
            <div className="stat-widget-icon stat-widget-blue">
              <i className="bi bi-shop-window"></i>
            </div>
          </div>
        </div>

        <div className="col-md-4">
          <div className="stat-widget-card shadow-sm">
            <div>
              <span className="text-muted small fw-semibold">TOTAL USERS</span>
              <h2 className="fw-extrabold text-dark mt-1 mb-0">
                {loading ? <span className="spinner-border spinner-border-sm text-muted"></span> : metrics?.totalAdmins || 0}
              </h2>
              <small className="text-muted small">Registered accounts</small>
            </div>
            <div className="stat-widget-icon stat-widget-purple">
              <i className="bi bi-people-fill"></i>
            </div>
          </div>
        </div>

        <div className="col-md-4">
          <div className="stat-widget-card shadow-sm">
            <div>
              <span className="text-muted small fw-semibold">ACTIVE ADS</span>
              <h2 className="fw-extrabold text-dark mt-1 mb-0">
                {loading ? <span className="spinner-border spinner-border-sm text-muted"></span> : metrics?.totalAds || 0}
              </h2>
              <small className="text-muted small">{metrics?.totalAds || 0} active campaigns</small>
            </div>
            <div className="stat-widget-icon stat-widget-green">
              <i className="bi bi-megaphone-fill"></i>
            </div>
          </div>
        </div>
      </div>

      {/* Row 2: Usage & Growth bar chart & Quick Actions */}
      <div className="row g-4 mb-4">
        <div className="col-lg-8">
          <div className="card border-0 p-4 bg-white shadow-sm rounded-4 h-100">
            <div className="d-flex justify-content-between align-items-center mb-4">
              <h6 className="fw-bold mb-0 text-dark">Usage & Growth (New Outlets)</h6>
              <select 
                className="form-select form-select-sm" 
                style={{ width: '120px' }}
                value={growthFilter}
                onChange={(e) => setGrowthFilter(e.target.value)}
              >
                <option value="Daily">Daily</option>
                <option value="Weekly">Weekly</option>
                <option value="Monthly">Monthly</option>
                <option value="Yearly">Yearly</option>
              </select>
            </div>
            
            {/* Visual growth CSS chart */}
            <div className="d-flex justify-content-between align-items-end pt-4" style={{ height: '180px' }}>
              {loading ? (
                <div className="w-100 text-center py-5">
                  <div className="spinner-border text-primary" role="status"></div>
                </div>
              ) : (
                chartData.map((b, i) => (
                  <div 
                    key={i} 
                    className="d-flex flex-column align-items-center flex-grow-1 h-100 justify-content-end" 
                    title={`${b.count} registered (Click to view)`}
                    style={{ cursor: 'pointer', position: 'relative' }}
                    onClick={() => handleBarClick(b)}
                  >
                    <span className="text-primary fw-bold mb-1" style={{ fontSize: '0.75rem' }}>{b.count}</span>
                    <div 
                      className="bg-primary bg-gradient rounded-3 w-50" 
                      style={{ height: b.val, minHeight: '5px', transition: 'height 0.5s ease-in-out', backgroundColor: '#6f42c1' }}
                    ></div>
                    <span className="text-muted small mt-2" style={{ fontSize: '0.7rem' }}>{b.label}</span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        <div className="col-lg-4">
          <div className="card border-0 p-4 bg-white shadow-sm rounded-4 h-100">
            <h6 className="fw-bold mb-4 text-dark">Quick Actions</h6>
            
            <div className="d-grid gap-3">
              <button className="btn btn-primary btn-premium py-2.5 d-flex align-items-center justify-content-center border-0 bg-primary bg-gradient" onClick={() => navigate('/superadmin/ringtones')}>
                <i className="bi bi-music-note-list me-2 fs-5"></i> Add Ringtone
              </button>
              <button className="btn btn-outline-primary btn-premium py-2.5 d-flex align-items-center justify-content-center" onClick={() => navigate('/superadmin/ads')}>
                <i className="bi bi-megaphone-fill me-2 fs-5"></i> Create Ad
              </button>
              <button className="btn btn-light border btn-premium py-2.5 d-flex align-items-center justify-content-center" onClick={() => navigate('/superadmin/users')}>
                <i className="bi bi-people me-2 fs-5"></i> View Users
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Row 3: Recent Users directory */}
      <div className="card border-0 p-4 bg-white shadow-sm rounded-4 mb-4">
        <div className="d-flex justify-content-between align-items-center mb-3">
          <h6 className="fw-bold mb-0 text-dark">Recent Users</h6>
          <Link to="/superadmin/users" className="text-primary text-decoration-none small fw-bold">View All</Link>
        </div>

        <div className="table-responsive">
          <table className="table table-hover align-middle">
            <thead>
              <tr className="table-light text-muted small">
                <th scope="col" style={{ width: '60px' }}>ID</th>
                <th scope="col">NAME</th>
                <th scope="col">EMAIL</th>
                <th scope="col">ROLE</th>
                <th scope="col">JOINED</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="5" className="text-center py-4">
                    <div className="spinner-border text-primary" role="status"></div>
                  </td>
                </tr>
              ) : users.length > 0 ? (
                users.map((u, index) => (
                  <tr key={u._id}>
                    <td><span className="text-muted">{String(users.length - index).padStart(2, '0')}</span></td>
                    <td>
                      <div className="d-flex align-items-center">
                        <div className="bg-primary text-white rounded-circle d-flex align-items-center justify-content-center fw-bold me-2 font-outfit" style={{ width: '32px', height: '32px', fontSize: '0.8rem' }}>
                          {u.name.substring(0, 1).toUpperCase()}
                        </div>
                        <span className="fw-bold text-dark">{u.name}</span>
                      </div>
                    </td>
                    <td>{u.email}</td>
                    <td>
                      <span 
                        className="badge rounded-pill text-uppercase px-2 py-0.5" 
                        style={{ 
                          fontSize: '0.65rem', 
                          fontWeight: 'bold',
                          color: u.role === 'superadmin' ? '#dc3545' : '#0d6efd',
                          backgroundColor: u.role === 'superadmin' ? '#f8d7da' : '#cfe2ff',
                          border: `1px solid ${u.role === 'superadmin' ? '#f5c2c7' : '#b6d4fe'}`
                        }}
                      >
                        {u.role}
                      </span>
                    </td>
                    <td className="text-muted small">{new Date(u.createdAt).toLocaleDateString([], { day: 'numeric', month: 'short', year: 'numeric' })}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="5" className="text-center py-4 text-muted small">No active users logged.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Row 4: Recent Businesses directory */}
      <div className="card border-0 p-4 bg-white shadow-sm rounded-4">
        <div className="d-flex justify-content-between align-items-center mb-3">
          <h6 className="fw-bold mb-0 text-dark">Recent Businesses</h6>
          <Link to="/superadmin/businesses" className="text-primary text-decoration-none small fw-bold">View All</Link>
        </div>

        <div className="table-responsive">
          <table className="table table-hover align-middle">
            <thead>
              <tr className="table-light text-muted small">
                <th scope="col" style={{ width: '60px' }}>ID</th>
                <th scope="col">BUSINESS NAME</th>
                <th scope="col">EMAIL</th>
                <th scope="col">PHONE NUMBER</th>
                <th scope="col">REGISTERED DATE</th>
                <th scope="col" className="text-end">ACTION</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="6" className="text-center py-4">
                    <div className="spinner-border text-primary" role="status"></div>
                  </td>
                </tr>
              ) : businesses.length > 0 ? (
                businesses.map((b, index) => (
                  <tr key={b._id}>
                    <td><span className="text-muted">{String(businesses.length - index).padStart(2, '0')}</span></td>
                    <td>
                      <div className="d-flex align-items-center">
                        <div className="rounded-3 me-2 bg-primary text-white d-flex align-items-center justify-content-center fw-bold" style={{ width: '32px', height: '32px', fontSize: '0.8rem' }}>
                          {b.name.substring(0, 2).toUpperCase()}
                        </div>
                        <span className="fw-bold text-dark">{b.name}</span>
                      </div>
                    </td>
                    <td>{b.email}</td>
                    <td>{b.phone}</td>
                    <td className="text-muted small">{new Date(b.createdAt).toLocaleDateString([], { day: 'numeric', month: 'short', year: 'numeric' })}</td>
                    <td className="text-end">
                      <Link to={`/superadmin/businesses/${b._id}`} className="btn btn-outline-primary btn-sm rounded-pill px-3 py-1">
                        View
                      </Link>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="6" className="text-center py-4 text-muted small">No businesses registered yet.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default SuperAdminDashboard;
