import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import socket from '../../socket';
import { api } from '../../context/AuthContext';

const SuperAdminBusinesses = () => {
  const navigate = useNavigate();
  const { search } = useLocation();
  const [businesses, setBusinesses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [timeFilter, setTimeFilter] = useState('all');
  const [urlFilter, setUrlFilter] = useState(null);

  useEffect(() => {
    const params = new URLSearchParams(search);
    const filterType = params.get('filter');
    const filterVal = params.get('value');
    const filterLabel = params.get('label');
    
    if (filterType && filterVal) {
      setUrlFilter({
        type: filterType,
        value: filterVal,
        label: filterLabel || filterVal
      });
    } else {
      setUrlFilter(null);
    }
  }, [search]);

  const fetchBusinesses = async () => {
    try {
      const res = await api.get('/superadmin/businesses');
      if (res.data.success) {
        setBusinesses(res.data.businesses);
      }
    } catch (err) {
      console.error('Error fetching businesses list', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBusinesses();
  }, []);

  // Socket listener for real-time businesses updates
  useEffect(() => {
    socket.emit('joinSuperAdmin');

    const handleUpdate = () => {
      fetchBusinesses();
    };

    socket.on('businessesUpdated', handleUpdate);

    return () => {
      socket.off('businessesUpdated', handleUpdate);
    };
  }, []);

  const filteredBusinesses = businesses.filter((b) => {
    const matchesSearch = b.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
           b.domain.toLowerCase().includes(searchQuery.toLowerCase());
    
    if (urlFilter) {
      const createdDate = new Date(b.createdAt);
      if (urlFilter.type === 'daily') {
        const todayStr = new Date().toDateString();
        return matchesSearch && 
               createdDate.toDateString() === todayStr && 
               createdDate.getHours() === Number(urlFilter.value);
      } else if (urlFilter.type === 'weekly') {
        return matchesSearch && createdDate.toDateString() === urlFilter.value;
      } else if (urlFilter.type === 'monthly') {
        const [year, month] = urlFilter.value.split('-').map(Number);
        return matchesSearch && 
               createdDate.getFullYear() === year && 
               createdDate.getMonth() === month;
      } else if (urlFilter.type === 'yearly') {
        return matchesSearch && createdDate.getFullYear() === Number(urlFilter.value);
      }
    }

    let matchesTime = true;
    if (timeFilter !== 'all') {
      const createdDate = new Date(b.createdAt);
      const now = new Date();
      if (timeFilter === 'week') {
        const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        matchesTime = createdDate >= oneWeekAgo;
      } else if (timeFilter === 'month') {
        const oneMonthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        matchesTime = createdDate >= oneMonthAgo;
      }
    }
    return matchesSearch && matchesTime;
  });

  if (loading) {
    return (
      <div className="text-center py-5">
        <div className="spinner-border text-primary" role="status"></div>
      </div>
    );
  }

  return (
    <div className="animated-fade-in">
      <div className="mb-4">
        <h1 className="fw-extrabold text-dark mb-1">Business Clients</h1>
        <p className="text-muted">Review, configure settings, and manage registered queue systems.</p>
      </div>

      {/* Active URL Filter Banner */}
      {urlFilter && (
        <div className="alert alert-info border-0 rounded-4 shadow-sm p-3 mb-4 d-flex justify-content-between align-items-center" style={{ backgroundColor: '#e0cffc', color: '#6f42c1' }}>
          <div>
            <i className="bi bi-funnel-fill me-2 fs-5"></i>
            Showing businesses registered in <strong>{urlFilter.label}</strong> (growth chart selection)
          </div>
          <button 
            className="btn btn-sm btn-outline-primary fw-bold text-uppercase rounded-3 px-3 py-1" 
            style={{ color: '#6f42c1', borderColor: '#6f42c1' }}
            onClick={() => navigate('/superadmin/businesses')}
          >
            Clear Filter
          </button>
        </div>
      )}

      {/* Search Header */}
      <div className="card border-0 p-4 bg-white shadow-sm rounded-4 mb-4">
        <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-3">
          <h5 className="fw-bold mb-0 text-dark">Business Clients Directory</h5>
          
          <div className="d-flex flex-wrap gap-2">
            <input 
              type="text" 
              className="form-control form-control-sm"
              placeholder="Search Business Name..."
              style={{ width: '220px' }}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />

            <select 
              className="form-select form-select-sm" 
              style={{ width: '150px' }}
              value={timeFilter}
              onChange={(e) => setTimeFilter(e.target.value)}
            >
              <option value="all">All Time</option>
              <option value="week">This Week</option>
              <option value="month">This Month</option>
            </select>
          </div>
        </div>
      </div>

      {/* Grid of Business Cards */}
      <div className="row g-4">
        {filteredBusinesses.length > 0 ? (
          filteredBusinesses.map((b) => (
            <div className="col-12 col-md-6 col-lg-4" key={b._id}>
              <div className="card border-0 bg-white shadow-sm rounded-4 p-4 h-100 d-flex flex-column justify-content-between border-top border-5" style={{ borderTopColor: b.primaryColor || '#0d6efd' }}>
                <div>
                  <div className="d-flex align-items-center mb-3">
                    <div 
                      className="rounded-3 me-3 d-flex align-items-center justify-content-center text-white fw-bold shadow-sm"
                      style={{ 
                        width: '44px', 
                        height: '44px',
                        backgroundColor: b.primaryColor || '#0d6efd',
                        backgroundImage: b.logo ? `url(${b.logo})` : 'none',
                        backgroundSize: 'contain',
                        backgroundRepeat: 'no-repeat',
                        backgroundPosition: 'center'
                      }}
                    >
                      {!b.logo && b.name.substring(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <h5 className="fw-bold text-dark mb-0 text-truncate" style={{ maxWidth: '160px' }}>{b.name}</h5>
                      <span className="text-muted small d-block">{b.domain}</span>
                    </div>
                  </div>

                  <div className="list-group list-group-flush border-top pt-2 mb-4 small">
                    <div className="list-group-item bg-transparent d-flex justify-content-between px-0 py-2 border-0">
                      <span className="text-muted">Owner</span>
                      <strong className="text-dark">{b.admin?.name || 'N/A'}</strong>
                    </div>
                    <div className="list-group-item bg-transparent d-flex justify-content-between px-0 py-2 border-0">
                      <span className="text-muted">Domain</span>
                      <strong className="text-dark">{b.domain || 'N/A'}</strong>
                    </div>
                    <div className="list-group-item bg-transparent d-flex justify-content-between px-0 py-2 border-0">
                      <span className="text-muted">Location</span>
                      <strong className="text-dark">{b.city}, {b.state}</strong>
                    </div>
                    <div className="list-group-item bg-transparent d-flex justify-content-between px-0 py-2 border-0">
                      <span className="text-muted">Registered</span>
                      <strong className="text-dark">{new Date(b.createdAt).toLocaleDateString([], { day: 'numeric', month: 'short', year: 'numeric' })}</strong>
                    </div>
                  </div>
                </div>

                <div className="d-flex gap-2 mt-auto">
                  <button 
                    className="btn btn-outline-primary btn-sm rounded-3 py-2 fw-bold flex-grow-1"
                    style={{ borderColor: '#6f42c1', color: '#6f42c1', transition: 'all 0.2s ease-in-out' }}
                    onClick={() => navigate(`/superadmin/businesses/${b._id}`)}
                    onMouseEnter={(e) => { e.target.style.backgroundColor = '#6f42c1'; e.target.style.color = '#fff'; }}
                    onMouseLeave={(e) => { e.target.style.backgroundColor = 'transparent'; e.target.style.color = '#6f42c1'; }}
                  >
                    View Profile
                  </button>
                  <button 
                    className="btn btn-primary btn-sm rounded-3 py-2 border-0 fw-bold flex-grow-1"
                    style={{ backgroundColor: '#6f42c1', color: '#fff', transition: 'all 0.2s ease-in-out' }}
                    onClick={() => navigate(`/superadmin/businesses/${b._id}`)}
                    onMouseEnter={(e) => { e.target.style.backgroundColor = '#5a32a3'; }}
                    onMouseLeave={(e) => { e.target.style.backgroundColor = '#6f42c1'; }}
                  >
                    Manage
                  </button>
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="col-12 text-center py-5 text-muted bg-white rounded-4 border shadow-sm">
            <i className="bi bi-shop fs-1 mb-2 text-muted d-block"></i>
            No business clients found matching your search.
          </div>
        )}
      </div>
    </div>
  );
};

export default SuperAdminBusinesses;
