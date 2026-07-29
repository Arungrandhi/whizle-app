import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import socket from '../../socket';
import { api } from '../../context/AuthContext';

const SuperAdminBusinessDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [business, setBusiness] = useState(null);
  const [admin, setAdmin] = useState(null);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [analyticsFilter, setAnalyticsFilter] = useState('weekly');

  // Editable form states
  const [formData, setFormData] = useState({
    name: '',
    category: '',
    phone: '',
    email: '',
    address: '',
    website: 'www.website.com',
    maxCapacity: 100,
    serviceTime: 15
  });

  const fetchDetail = async () => {
    try {
      const res = await api.get(`/superadmin/businesses/${id}`);
      if (res.data.success) {
        const biz = res.data.business;
        setBusiness(biz);
        setAdmin(res.data.admin);
        setStats(res.data.stats);
        setFormData({
          name: biz.name,
          category: biz.category,
          phone: biz.phone,
          email: biz.email,
          address: biz.address,
          website: biz.website || 'www.business-portal.com',
          maxCapacity: biz.maxCapacity || 150,
          serviceTime: biz.queueConfig?.serviceTime || 15
        });
      }
    } catch (err) {
      console.error('Error fetching business detail', err);
      setError('Could not retrieve business details.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setLoading(true);
    fetchDetail();
  }, [id]);

  // Socket listener for live business queue updates
  useEffect(() => {
    if (!id) return;

    socket.emit('joinBusiness', id);

    const handleUpdate = () => {
      // live reload analytics
      fetchDetail();
    };

    socket.on('tokenUpdated', handleUpdate);

    return () => {
      socket.off('tokenUpdated', handleUpdate);
    };
  }, [id]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSaveChanges = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    try {
      // Direct updates (Super admin updates profile details)
      const res = await api.put('/admin/business', {
        name: formData.name,
        category: formData.category,
        phone: formData.phone,
        address: formData.address,
        queueConfig: {
          name: business.queueConfig?.name || 'General OPD Queue',
          startTime: business.queueConfig?.startTime || '09:00',
          endTime: business.queueConfig?.endTime || '18:00',
          serviceTime: Number(formData.serviceTime)
        }
      });
      if (res.data.success) {
        setSuccess('Business profile updated successfully!');
        setBusiness(res.data.business);
      }
    } catch (err) {
      console.error('Error updating business profile', err);
      setError('Failed to save profile changes.');
    }
  };

  const handleDeactivate = async () => {
    if (!window.confirm(`Are you absolutely sure you want to deactivate and remove ${business?.name}? This action is permanent and deletes all records.`)) {
      return;
    }
    try {
      const res = await api.delete(`/superadmin/businesses/${id}`);
      if (res.data.success) {
        alert(`${business?.name} has been successfully deactivated.`);
        navigate('/superadmin/businesses');
      }
    } catch (err) {
      console.error('Error deleting business', err);
      setError('Could not deactivate business.');
    }
  };

  if (loading) {
    return (
      <div className="text-center py-5">
        <div className="spinner-border text-primary" role="status"></div>
      </div>
    );
  }

  return (
    <div className="animated-fade-in" style={{ maxWidth: '1100px' }}>
      <div className="mb-4 d-flex align-items-center">
        <button className="btn btn-light border btn-sm me-3" onClick={() => navigate('/superadmin/businesses')}>
          <i className="bi bi-arrow-left"></i> Back
        </button>
        <div>
          <h1 className="fw-extrabold text-dark mb-1">{business?.name} Profile</h1>
          <p className="text-muted small mb-0">Inspect operations, metrics, shift configurations, and analytics logs.</p>
        </div>
      </div>

      {success && (
        <div className="alert alert-success border-0 rounded-3 small mb-4 d-flex align-items-center py-2 shadow-sm" role="alert">
          <i className="bi bi-check-circle-fill me-2 fs-5"></i>
          <div>{success}</div>
        </div>
      )}

      {error && (
        <div className="alert alert-danger border-0 rounded-3 small mb-4 d-flex align-items-center py-2 shadow-sm" role="alert">
          <i className="bi bi-exclamation-triangle-fill me-2 fs-5"></i>
          <div>{error}</div>
        </div>
      )}

      {/* Main Banner Graphic */}
      <div className="card border-0 rounded-4 overflow-hidden mb-4 shadow-sm" style={{ height: '240px', position: 'relative' }}>
        <div 
          className="w-100 h-100 bg-secondary"
          style={{
            backgroundImage: business?.backgroundImage ? `url(${business.backgroundImage})` : 'none',
            backgroundColor: business?.primaryColor || '#0d6efd',
            backgroundSize: 'cover',
            backgroundPosition: 'center'
          }}
        ></div>
        
        {/* Shadow Overlay */}
        <div className="position-absolute w-100 h-100 top-0 start-0 bg-dark" style={{ opacity: 0.35, zIndex: 1 }}></div>

        {/* Business details summary inside banner */}
        <div className="position-absolute bottom-0 start-0 p-4 text-white d-flex align-items-center" style={{ zIndex: 2 }}>
          <div 
            className="rounded-3 bg-white p-1 me-3 shadow-sm d-flex align-items-center justify-content-center fw-bold text-dark"
            style={{ 
              width: '64px', 
              height: '64px',
              backgroundImage: business?.logo ? `url(${business.logo})` : 'none',
              backgroundSize: 'contain',
              backgroundRepeat: 'no-repeat',
              backgroundPosition: 'center'
            }}
          >
            {!business?.logo && business?.name.substring(0, 2).toUpperCase()}
          </div>
          <div>
            <h3 className="fw-extrabold mb-1">{business?.name}</h3>
            <span className="badge bg-white text-dark rounded-pill fw-bold border shadow-sm">
              {business?.domain}
            </span>
          </div>
        </div>
      </div>

      {/* Tiny Analytics Metrics Summary */}
      <div className="row g-3 mb-4 text-center">
        <div className="col-6 col-md-3">
          <div className="card border-0 bg-white p-3 shadow-sm rounded-3">
            <span className="text-muted small">Avg. Daily Tokens</span>
            <strong className="fs-4 text-dark">{stats?.totalTokens || 0}</strong>
          </div>
        </div>
        <div className="col-6 col-md-3">
          <div className="card border-0 bg-white p-3 shadow-sm rounded-3">
            <span className="text-muted small">Active Tokens</span>
            <strong className="fs-4 text-primary">{stats?.waitingTokens || 0}</strong>
          </div>
        </div>
        <div className="col-6 col-md-3">
          <div className="card border-0 bg-white p-3 shadow-sm rounded-3">
            <span className="text-muted small">Completed Tokens</span>
            <strong className="fs-4 text-success">{stats?.completedTokens || 0}</strong>
          </div>
        </div>
        <div className="col-6 col-md-3">
          <div className="card border-0 bg-white p-3 shadow-sm rounded-3">
            <span className="text-muted small">Missed Tokens</span>
            <strong className="fs-4 text-danger">{stats?.skippedTokens || 0}</strong>
          </div>
        </div>
      </div>

      {/* Information Panels Grid */}
      <form onSubmit={handleSaveChanges}>
        <div className="row g-4 mb-4">
          <div className="col-lg-6">
            {/* Contact Information & Operating hours */}
            <div className="card border-0 p-4 bg-white shadow-sm rounded-4 mb-4">
              <h5 className="fw-bold text-dark mb-3"><i className="bi bi-telephone text-primary me-2"></i> Contact Information</h5>
              <div className="mb-3">
                <label className="form-label text-muted small fw-semibold">Street Address</label>
                <input type="text" name="address" className="form-control form-control-custom" value={formData.address} onChange={handleInputChange} required />
              </div>
              <div className="row g-2">
                <div className="col-md-6 mb-3">
                  <label className="form-label text-muted small fw-semibold">Phone Number</label>
                  <input type="tel" name="phone" className="form-control form-control-custom" value={formData.phone} onChange={handleInputChange} required />
                </div>
                <div className="col-md-6 mb-3">
                  <label className="form-label text-muted small fw-semibold">Email Address</label>
                  <input type="email" name="email" className="form-control form-control-custom text-muted" value={formData.email} disabled />
                </div>
              </div>
              <div className="mb-3">
                <label className="form-label text-muted small fw-semibold">Website</label>
                <input type="text" name="website" className="form-control form-control-custom" value={formData.website} onChange={handleInputChange} />
              </div>
            </div>

            <div className="card border-0 p-4 bg-white shadow-sm rounded-4">
              <h5 className="fw-bold text-dark mb-3"><i className="bi bi-clock text-primary me-2"></i> Operating Hours</h5>
              <div className="list-group list-group-flush small">
                <div className="list-group-item bg-transparent d-flex justify-content-between px-0 py-2 border-0 border-bottom">
                  <span className="text-muted">Monday - Friday</span>
                  <strong className="text-dark">{business?.queueConfig?.startTime || '09:00'} AM - {business?.queueConfig?.endTime || '18:00'} PM</strong>
                </div>
                <div className="list-group-item bg-transparent d-flex justify-content-between px-0 py-2 border-0 border-bottom">
                  <span className="text-muted">Saturday</span>
                  <strong className="text-dark">09:00 AM - 08:00 PM</strong>
                </div>
                <div className="list-group-item bg-transparent d-flex justify-content-between px-0 py-2 border-0">
                  <span className="text-muted">Sunday</span>
                  <strong className="text-danger fw-semibold">Emergency Services Only</strong>
                </div>
              </div>
            </div>
          </div>

          <div className="col-lg-6">
            {/* Queue Settings & Token Analytics chart */}
            <div className="card border-0 p-4 bg-white shadow-sm rounded-4 mb-4">
              <h5 className="fw-bold text-dark mb-3"><i className="bi bi-gear text-primary me-2"></i> Queue Settings</h5>
              <div className="row g-2">
                <div className="col-6 mb-3">
                  <label className="form-label text-muted small fw-semibold">Max Daily Capacity</label>
                  <input type="number" name="maxCapacity" className="form-control form-control-custom" value={formData.maxCapacity} onChange={handleInputChange} required />
                </div>
                <div className="col-6 mb-3">
                  <label className="form-label text-muted small fw-semibold">Turnaround (mins)</label>
                  <input type="number" name="serviceTime" className="form-control form-control-custom" value={formData.serviceTime} onChange={handleInputChange} required />
                </div>
              </div>
              <div>
                <label className="form-label text-muted small fw-semibold">Announcement Setting</label>
                <select className="form-select form-control-custom bg-white border">
                  <option>Priority First</option>
                  <option>Sequential Order</option>
                </select>
              </div>
            </div>

            <div className="card border-0 p-4 bg-white shadow-sm rounded-4">
              <div className="d-flex justify-content-between align-items-center mb-4">
                <h5 className="fw-bold text-dark mb-0">
                  <i className="bi bi-bar-chart-line text-primary me-2"></i> Token Analytics
                </h5>
                {/* Arrow navigators to switch Daily, Weekly, Monthly, Yearly */}
                {(() => {
                  const periods = ['daily', 'weekly', 'monthly', 'yearly'];
                  const currentIdx = periods.indexOf(analyticsFilter);
                  const handlePrev = () => {
                    const prevIdx = (currentIdx - 1 + periods.length) % periods.length;
                    setAnalyticsFilter(periods[prevIdx]);
                  };
                  const handleNext = () => {
                    const nextIdx = (currentIdx + 1) % periods.length;
                    setAnalyticsFilter(periods[nextIdx]);
                  };
                  const primaryColor = business?.primaryColor || '#6f42c1';
                  return (
                    <div className="d-flex align-items-center gap-2">
                      <button 
                        type="button" 
                        className="btn btn-sm btn-light border-0 rounded-circle d-flex align-items-center justify-content-center shadow-sm"
                        style={{ width: '28px', height: '28px', color: primaryColor }}
                        onClick={handlePrev}
                        title="Previous period"
                      >
                        <i className="bi bi-chevron-left fw-bold"></i>
                      </button>
                      <strong className="text-dark text-capitalize font-outfit" style={{ fontSize: '0.85rem', minWidth: '70px', textAlign: 'center' }}>
                        {analyticsFilter}
                      </strong>
                      <button 
                        type="button" 
                        className="btn btn-sm btn-light border-0 rounded-circle d-flex align-items-center justify-content-center shadow-sm"
                        style={{ width: '28px', height: '28px', color: primaryColor }}
                        onClick={handleNext}
                        title="Next period"
                      >
                        <i className="bi bi-chevron-right fw-bold"></i>
                      </button>
                    </div>
                  );
                })()}
              </div>
              
              {/* Styled token bar chart */}
              <div className="d-flex justify-content-between align-items-end pt-3" style={{ height: '170px' }}>
                {(() => {
                  const currentAnalytics = stats?.analytics?.[analyticsFilter] || (
                    analyticsFilter === 'daily' ? [
                      { label: '9 AM', count: 2 },
                      { label: '10 AM', count: 4 },
                      { label: '11 AM', count: 6 },
                      { label: '12 PM', count: 3 },
                      { label: '1 PM', count: 1 },
                      { label: '2 PM', count: 5 },
                      { label: '3 PM', count: 7 },
                      { label: '4 PM', count: 4 },
                      { label: '5 PM', count: 2 },
                      { label: '6 PM', count: 0 }
                    ] : analyticsFilter === 'weekly' ? [
                      { label: 'Mon', count: 4 },
                      { label: 'Tue', count: 7 },
                      { label: 'Wed', count: 3 },
                      { label: 'Thu', count: 8 },
                      { label: 'Fri', count: 6 },
                      { label: 'Sat', count: 9 },
                      { label: 'Sun', count: 2 }
                    ] : analyticsFilter === 'monthly' ? [
                      { label: 'Week 1', count: 25 },
                      { label: 'Week 2', count: 42 },
                      { label: 'Week 3', count: 31 },
                      { label: 'Week 4', count: 50 },
                      { label: 'Week 5', count: 15 }
                    ] : [
                      { label: 'Jan', count: 120 },
                      { label: 'Feb', count: 150 },
                      { label: 'Mar', count: 180 },
                      { label: 'Apr', count: 210 },
                      { label: 'May', count: 190 },
                      { label: 'Jun', count: 240 },
                      { label: 'Jul', count: 260 },
                      { label: 'Aug', count: 230 },
                      { label: 'Sep', count: 270 },
                      { label: 'Oct', count: 290 },
                      { label: 'Nov', count: 310 },
                      { label: 'Dec', count: 340 }
                    ]
                  );
                  
                  const maxVal = Math.max(...currentAnalytics.map(c => c.count), 1);
                  
                  return currentAnalytics.map((item, idx) => {
                    const heightPercent = `${(item.count / maxVal) * 80 + 10}%`; // 10% to 90%
                    return (
                      <div key={idx} className="d-flex flex-column align-items-center flex-grow-1 h-100 justify-content-end" style={{ position: 'relative' }}>
                        <span className="fw-bold text-dark mb-1" style={{ fontSize: '0.7rem' }}>{item.count}</span>
                        <div 
                          className="bg-primary bg-gradient rounded-3 w-50" 
                          style={{ 
                            height: heightPercent, 
                            minHeight: '5px', 
                            backgroundColor: business?.primaryColor || '#0d6efd',
                            transition: 'height 0.3s ease-in-out' 
                          }}
                          title={`${item.count} Tokens`}
                        ></div>
                        <span className="text-muted small mt-2" style={{ fontSize: '0.65rem' }}>{item.label}</span>
                      </div>
                    );
                  });
                })()}
              </div>
            </div>
          </div>
        </div>

        {/* Form buttons */}
        <div className="d-flex justify-content-between align-items-center border-top pt-4">
          <button 
            type="button" 
            className="btn btn-outline-danger btn-premium px-4"
            onClick={handleDeactivate}
          >
            Deactivate Business
          </button>
          
          <div className="d-flex gap-2">
            <button 
              type="button" 
              className="btn btn-outline-secondary btn-premium px-4"
              onClick={() => navigate('/superadmin/businesses')}
            >
              Cancel
            </button>
            <button 
              type="submit" 
              className="btn btn-premium px-4 py-2 text-white bg-purple bg-gradient border-0"
              style={{ backgroundColor: '#6f42c1' }}
            >
              Save Changes
            </button>
          </div>
        </div>
      </form>
    </div>
  );
};

export default SuperAdminBusinessDetail;
