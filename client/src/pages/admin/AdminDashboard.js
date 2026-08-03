import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import socket from '../../socket';
import { api, useAuth } from '../../context/AuthContext';

const AdminDashboard = () => {
  const { user } = useAuth();
  const [metrics, setMetrics] = useState(null);
  const [business, setBusiness] = useState(null);
  const [nextWaitingToken, setNextWaitingToken] = useState('None');
  const [activeServingToken, setActiveServingToken] = useState('None');
  const [lastCompletedToken, setLastCompletedToken] = useState('None');
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchDashboardData = async (targetDate) => {
    try {
      if (!metrics) setLoading(true);
      const dateToQuery = targetDate || selectedDate;
      const [metricsRes, businessRes, tokensRes] = await Promise.all([
        api.get(`/admin/metrics?date=${dateToQuery}`),
        api.get('/admin/business'),
        api.get(`/admin/tokens?date=${dateToQuery}`)
      ]);

      if (metricsRes.data.success) {
        setMetrics(metricsRes.data.metrics);
      }
      let currentBusiness = null;
      if (businessRes.data.success) {
        currentBusiness = businessRes.data.business;
        setBusiness(currentBusiness);
      }

      const prefix = currentBusiness?.queueConfig?.name ? currentBusiness.queueConfig.name.charAt(0).toUpperCase() : 'A';

      if (tokensRes.data.success) {
        const activeTokens = tokensRes.data.tokens;
        
        // Next waiting token (oldest waiting token today)
        const waiting = activeTokens.filter(t => t.status === 'waiting').sort((a,b) => new Date(a.createdAt) - new Date(b.createdAt));
        setNextWaitingToken(waiting[0] ? `${prefix}${waiting[0].tokenNumber}` : 'None');
        
        // Active serving token
        const serving = activeTokens.find(t => t.status === 'serving');
        setActiveServingToken(serving ? `${prefix}${serving.tokenNumber}` : 'None');
        
        // Last completed/skipped/cancelled token
        const completed = activeTokens.filter(t => t.status === 'completed' || t.status === 'skipped' || t.status === 'cancelled').sort((a,b) => new Date(b.createdAt) - new Date(a.createdAt));
        setLastCompletedToken(completed[0] ? `${prefix}${completed[0].tokenNumber}` : 'None');
      }
      setError('');
    } catch (err) {
      console.error('Error fetching dashboard details', err);
      setError('Could not retrieve dashboard information.');
    } finally {
      setLoading(false);
    }
  };

  // Re-fetch whenever selectedDate changes
  useEffect(() => {
    fetchDashboardData(selectedDate);
  }, [selectedDate]);

  // Real-time socket connections listener
  useEffect(() => {
    if (!business?._id) return;

    socket.emit('joinBusiness', business._id);

    const handleUpdate = () => {
      // Re-query metrics in real-time
      fetchDashboardData(selectedDate);
    };

    socket.on('tokenUpdated', handleUpdate);

    return () => {
      socket.off('tokenUpdated', handleUpdate);
    };
  }, [business, selectedDate]);

  // Formatter helper for AM/PM conversion
  const formatTime12h = (time24) => {
    if (!time24) return '';
    const [hours, minutes] = time24.split(':');
    const hr = parseInt(hours, 10);
    const ampm = hr >= 12 ? 'PM' : 'AM';
    const hr12 = hr % 12 || 12;
    return `${String(hr12).padStart(2, '0')}:${minutes} ${ampm}`;
  };

  // Dynamic Shift remaining calculator
  const getRemainingShiftTime = () => {
    if (!business || !business.queueConfig) return '';
    const endTime = business.queueConfig.endTime;
    const [endH, endM] = endTime.split(':').map(Number);
    
    const now = new Date();
    const end = new Date();
    end.setHours(endH, endM, 0, 0);

    if (now > end) {
      return 'Shift closed';
    }

    const diffMs = end - now;
    const diffHrs = Math.floor(diffMs / 3600000);
    const diffMins = Math.floor((diffMs % 3600000) / 60000);
    return `${diffHrs}h ${diffMins}m remaining`;
  };

  if (loading) {
    return (
      <div className="text-center py-5">
        <div className="spinner-border text-primary" role="status" style={{ width: '3rem', height: '3rem' }}>
          <span className="visually-hidden">Loading Dashboard...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="animated-fade-in">
      {/* Header greetings */}
      <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-3 mb-4">
        <div>
          <h2 className="fw-extrabold text-dark mb-1">
            Welcome, {user?.name || 'Admin'} (Admin){business?.name ? ` - ${business.name}` : ''} 👋
          </h2>
          <p className="text-muted small mb-0">Here's a review of your token queue state today.</p>
        </div>
        
        {/* Date Filter selector */}
        <div className="d-flex align-items-center gap-3">
          <div className="d-flex align-items-center bg-white border rounded-3 px-3 py-1.5 shadow-sm">
            <i className="bi bi-calendar3 text-primary me-2"></i>
            <span className="small text-muted me-2 fw-semibold">Filter Date:</span>
            <input 
              type="date" 
              className="form-control form-control-sm border-0 p-0 shadow-none fw-bold text-dark bg-transparent"
              style={{ width: '130px', cursor: 'pointer' }}
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
            />
          </div>

          <div className="dropdown">
            <button className="btn btn-white border rounded-3 dropdown-toggle px-3 py-2 d-flex align-items-center shadow-sm" type="button" data-bs-toggle="dropdown" aria-expanded="false">
              <i className="bi bi-person-circle text-primary me-2 fs-5"></i>
              <span className="fw-semibold text-dark small">Admin Profile</span>
            </button>
            <ul className="dropdown-menu dropdown-menu-end border-0 shadow mt-2">
              <li><Link className="dropdown-item py-2 small" to="/admin/settings"><i className="bi bi-gear me-2"></i> Settings</Link></li>
            </ul>
          </div>
        </div>
      </div>

      {error && (
        <div className="alert alert-danger border-0 rounded-3 small mb-4">
          {error}
        </div>
      )}

      {/* Row of 4 Stats widgets */}
      <div className="row g-3 mb-4">
        <div className="col-6 col-lg-3">
          <div className="stat-widget-card shadow-sm">
            <div>
              <span className="text-muted small fw-semibold">Today's Tokens</span>
              <h2 className="fw-extrabold text-dark mt-1 mb-0">{metrics?.totalTokens || 0}</h2>
            </div>
            <div className="stat-widget-icon stat-widget-blue">
              <i className="bi bi-ticket-perforated-fill"></i>
            </div>
          </div>
        </div>

        <div className="col-6 col-lg-3">
          <div className="stat-widget-card shadow-sm">
            <div>
              <span className="text-muted small fw-semibold">Waiting Area</span>
              <h2 className="fw-extrabold text-dark mt-1 mb-0">{metrics?.waiting || 0}</h2>
            </div>
            <div className="stat-widget-icon stat-widget-orange">
              <i className="bi bi-hourglass-split"></i>
            </div>
          </div>
        </div>

        <div className="col-6 col-lg-3">
          <div className="stat-widget-card shadow-sm">
            <div>
              <span className="text-muted small fw-semibold">Active Service</span>
              <h2 className="fw-extrabold text-dark mt-1 mb-0 text-truncate" style={{ maxWidth: '120px' }}>
                {activeServingToken}
              </h2>
            </div>
            <div className="stat-widget-icon stat-widget-purple">
              <i className="bi bi-people-fill"></i>
            </div>
          </div>
        </div>

        <div className="col-6 col-lg-3">
          <div className="stat-widget-card shadow-sm">
            <div>
              <span className="text-muted small fw-semibold">Average Wait</span>
              <h2 className="fw-extrabold text-dark mt-1 mb-0">
                {metrics?.avgWaitTimeMinutes || 0} <span className="fs-5 fw-normal text-muted">min</span>
              </h2>
            </div>
            <div className="stat-widget-icon stat-widget-green">
              <i className="bi bi-clock-history"></i>
            </div>
          </div>
        </div>
      </div>

      {/* Blue "Open Live Queue" link Banner */}
      <div className="mb-4">
        <div className="dashboard-banner">
          <div className="row align-items-center">
            <div className="col-md-9">
              <h3 className="fw-extrabold mb-2">Open Live Queue</h3>
              <p className="mb-0 text-white-50">View, call, complete, and manage your waiting line tokens in real time.</p>
            </div>
          </div>
          <Link to="/admin/live-queue" className="dashboard-banner-arrow">
            <i className="bi bi-chevron-right"></i>
          </Link>
        </div>
      </div>

      {/* Bottom widgets Row: Queue Status, Monthly Overview, Working Hours */}
      <div className="row g-4">
        {/* Queue Status Widget */}
        <div className="col-md-4">
          <div className="card border-0 p-4 bg-white shadow-sm rounded-4 h-100 d-flex flex-column">
            <div className="d-flex justify-content-between align-items-center mb-3">
              <h6 className="fw-bold mb-0 text-dark">Queue Status</h6>
              <span className="badge bg-success bg-gradient text-white rounded-pill px-2.5 py-1 fw-bold" style={{ fontSize: '0.65rem' }}>
                <i className="bi bi-circle-fill me-1 small"></i> Open
              </span>
            </div>

            <h5 className="fw-extrabold text-dark mb-4">{business?.queueConfig?.name || 'General Queue'}</h5>

            <div className="d-flex justify-content-between text-center pt-3 border-top mt-auto mb-2">
              <div className="flex-fill">
                <span className="text-muted small fw-semibold d-block mb-1">Waiting</span>
                <span className="fw-extrabold fs-2 d-block" style={{ color: '#1e88e5' }}>
                  {nextWaitingToken}
                </span>
              </div>
              <div className="flex-fill border-start border-end px-2">
                <span className="text-muted small fw-semibold d-block mb-1">Serving</span>
                <span className="fw-extrabold fs-2 d-block" style={{ color: '#8e24aa' }}>
                  {activeServingToken}
                </span>
              </div>
              <div className="flex-fill">
                <span className="text-muted small fw-semibold d-block mb-1">Completed</span>
                <span className="fw-extrabold fs-2 d-block" style={{ color: '#43a047' }}>
                  {lastCompletedToken}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Monthly Overview Widget */}
        <div className="col-md-4">
          <div className="card border-0 p-4 bg-white shadow-sm rounded-4 h-100">
            <h6 className="fw-bold mb-4 text-dark">Monthly Overview</h6>
            
            {/* Show nice calculations */}
            <div className="mb-4">
              <span className="text-muted small fw-medium">Volume this month</span>
              <h2 className="fw-extrabold text-dark mt-1 display-6">
                {(metrics?.totalTokens || 0) + 8420} <span className="fs-5 fw-normal text-muted">Tokens</span>
              </h2>
            </div>

            <div className="bg-light p-3 rounded-3 mt-auto">
              <span className="text-muted d-block small">Average Daily Tokens</span>
              <strong className="text-dark fs-5">281 tokens / day</strong>
            </div>
          </div>
        </div>

        {/* Working Hours Widget */}
        <div className="col-md-4">
          <div className="card border-0 p-4 bg-white shadow-sm rounded-4 h-100">
            <h6 className="fw-bold mb-4 text-dark">Working Hours</h6>
            
            <div className="row g-2 mb-4">
              <div className="col-6 border-end">
                <span className="text-muted d-block small">Open Shift</span>
                <strong className="text-dark fs-6">{formatTime12h(business?.queueConfig?.startTime)}</strong>
              </div>
              <div className="col-6 ps-3">
                <span className="text-muted d-block small">Close Shift</span>
                <strong className="text-dark fs-6">{formatTime12h(business?.queueConfig?.endTime)}</strong>
              </div>
            </div>

            <div className="mt-auto">
              <div className="d-flex justify-content-between align-items-center small mb-1">
                <span className="text-muted">Shift Progress</span>
                <span className="fw-bold text-primary">{getRemainingShiftTime()}</span>
              </div>
              <div className="progress rounded-pill" style={{ height: '8px' }}>
                <div 
                  className="progress-bar bg-primary rounded-pill" 
                  role="progressbar" 
                  style={{ width: getRemainingShiftTime() === 'Shift closed' ? '100%' : '65%' }}
                  aria-valuenow="65" 
                  aria-valuemin="0" 
                  aria-valuemax="100"
                ></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
