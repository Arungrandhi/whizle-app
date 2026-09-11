import React, { useState, useEffect } from 'react';
import socket from '../../socket';
import { api } from '../../context/AuthContext';

const LiveQueue = () => {
  const [tokens, setTokens] = useState([]);
  const [business, setBusiness] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Helper to extract queue display name first character as prefix
  const getQueuePrefix = () => {
    return business?.queueConfig?.name ? business.queueConfig.name.charAt(0).toUpperCase() : 'A';
  };

  const formatTokenNumber = (num) => {
    if (!num) return '';
    if (/^[A-Za-z]+-?\d+/.test(num)) return num;
    return `${getQueuePrefix()}-${num}`;
  };

  // Selected Token for Detail Drawer
  const [selectedToken, setSelectedToken] = useState(null);
  const [visitPurpose, setVisitPurpose] = useState('General Consultation');

  // Walk-in Modal state
  const [showModal, setShowModal] = useState(false);
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [addingToken, setAddingToken] = useState(false);

  // Time ticker state (for calculating relative wait times in real-time)
  const [currentTime, setCurrentTime] = useState(new Date());

  // Date Picker states for Live Queue
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [postponeDate, setPostponeDate] = useState(new Date(Date.now() + 86400000).toISOString().split('T')[0]);
  const [postponing, setPostponing] = useState(false);

  const fetchLiveQueueData = async (targetDate) => {
    try {
      const dateToQuery = targetDate || selectedDate;
      const [tokensRes, businessRes] = await Promise.all([
        api.get(`/admin/tokens?date=${dateToQuery}`),
        api.get('/admin/business')
      ]);

      if (tokensRes.data.success) {
        setTokens(tokensRes.data.tokens);
      }
      if (businessRes.data.success) {
        setBusiness(businessRes.data.business);
      }
      setError('');
    } catch (err) {
      console.error('Error fetching live queue data', err);
      setError('Could not retrieve live queue data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLiveQueueData(selectedDate);
  }, [selectedDate]);

  useEffect(() => {
    // Update local clock every 10 seconds for wait timers
    const intervalClock = setInterval(() => {
      setCurrentTime(new Date());
    }, 10000);

    return () => {
      clearInterval(intervalClock);
    };
  }, []);

  // Socket listener for instantaneous updates
  useEffect(() => {
    if (!business?._id) return;

    socket.emit('joinBusiness', business._id);

    const handleUpdate = () => {
      fetchLiveQueueData(selectedDate);
    };

    socket.on('tokenUpdated', handleUpdate);

    return () => {
      socket.off('tokenUpdated', handleUpdate);
    };
  }, [business, selectedDate]);

  const handlePostponeToken = async () => {
    if (!selectedToken || !postponeDate) return;
    try {
      setPostponing(true);
      const res = await api.put(`/admin/tokens/${selectedToken.token._id}/postpone`, {
        postponedDate: postponeDate
      });
      if (res.data.success) {
        setSuccess(`Token successfully postponed to ${postponeDate}`);
        setSelectedToken(null);
        fetchLiveQueueData(selectedDate);
      }
    } catch (err) {
      console.error('Error postponing token', err);
      setError(err.response?.data?.message || 'Error rescheduling token');
    } finally {
      setPostponing(false);
    }
  };

  const handleAddToken = async (e) => {
    e.preventDefault();
    if (!customerName || !customerPhone) return;

    setAddingToken(true);
    setError('');
    setSuccess('');

    try {
      const res = await api.post('/admin/tokens/add', {
        customerName,
        customerPhone
      });

      if (res.data.success) {
        setSuccess(`Token #${res.data.token.tokenNumber} created successfully for ${customerName}!`);
        setCustomerName('');
        setCustomerPhone('');
        setShowModal(false);
        fetchLiveQueueData();
      }
    } catch (err) {
      console.error('Error creating token', err);
      setError(err.response?.data?.message || 'Failed to add walk-in token.');
    } finally {
      setAddingToken(false);
    }
  };

  const handleCallToken = async (tokenId) => {
    setError('');
    setSuccess('');
    try {
      const res = await api.put(`/admin/tokens/${tokenId}/status`, { status: 'serving' });
      if (res.data.success) {
        setSuccess(`Token #${res.data.token.tokenNumber} called to serving desk.`);
        fetchLiveQueueData();
      }
    } catch (err) {
      console.error('Error calling token', err);
      setError('Failed to serve token.');
    }
  };

  const handleCompleteToken = async (tokenId) => {
    setError('');
    setSuccess('');
    try {
      const res = await api.put(`/admin/tokens/${tokenId}/status`, { status: 'completed' });
      if (res.data.success) {
        setSuccess(`Token #${res.data.token.tokenNumber} marked completed.`);
        fetchLiveQueueData();
      }
    } catch (err) {
      console.error('Error completing token', err);
      setError('Failed to complete token.');
    }
  };

  const handleMoveBackToken = async (tokenId) => {
    setError('');
    setSuccess('');
    try {
      const res = await api.put(`/admin/tokens/${tokenId}/status`, { status: 'waiting' });
      if (res.data.success) {
        setSuccess(`Token #${res.data.token.tokenNumber} moved back.`);
        fetchLiveQueueData();
      }
    } catch (err) {
      console.error('Error moving token back', err);
      setError('Failed to move token back.');
    }
  };

  const handleCancelToken = async (tokenId) => {
    setError('');
    setSuccess('');
    try {
      const res = await api.put(`/admin/tokens/${tokenId}/status`, { status: 'cancelled' });
      if (res.data.success) {
        setSuccess(`Token #${res.data.token.tokenNumber} cancelled.`);
        fetchLiveQueueData();
      }
    } catch (err) {
      console.error('Error cancelling token', err);
      setError('Failed to cancel token.');
    }
  };

  // Helper: calculate minutes elapsed
  const getMinutesElapsed = (timeString) => {
    if (!timeString) return 0;
    const diffMs = currentTime - new Date(timeString);
    return Math.max(0, Math.floor(diffMs / 60000));
  };

  // Helper: format clock string
  const formatClock = (date) => {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) + 
      ' | ' + date.toLocaleDateString([], { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
  };

  // Filter lists based on statuses
  const waitingList = tokens.filter(t => t.status === 'waiting');
  
  // Next Up = first 2 waiting tokens
  const nextUpList = waitingList.slice(0, 2);
  
  // Remaining Waiting = waiting tokens from index 2 onwards
  const remainingWaitingList = waitingList.slice(2);
  
  const servingList = tokens.filter(t => t.status === 'serving');
  const completedList = tokens.filter(t => t.status === 'completed' || t.status === 'skipped' || t.status === 'cancelled' || t.status === 'postponed');

  // Stats aggregate counts
  const totalWaitingCount = remainingWaitingList.length;
  const nextUpCount = nextUpList.length;
  const servingCount = servingList.length;
  const completedCount = completedList.length;

  return (
    <div className="live-queue-page-container animated-fade-in position-relative">
      {/* HEADER SECTION */}
      <div className="d-flex flex-column flex-md-row justify-content-between align-items-start align-items-md-center mb-4 gap-3">
        <div>
          <h2 className="fw-extrabold text-dark mb-1">Live Queue Management</h2>
          <p className="text-muted small mb-0 d-flex align-items-center">
            <span className="fw-bold text-dark">{business?.queueConfig?.name || 'General OPD Queue'}</span>
            <span className="badge bg-success-subtle text-success border border-success-subtle rounded-pill ms-2 fw-bold" style={{ fontSize: '0.65rem' }}>
              <i className="bi bi-circle-fill me-1" style={{ fontSize: '0.5rem' }}></i> Open
            </span>
            <span className="mx-2 text-muted-50">|</span>
            <span className="font-monospace text-muted">{formatClock(currentTime)}</span>
          </p>
        </div>

        <div className="d-flex align-items-center gap-3">
          <div className="d-flex align-items-center bg-white border rounded-3 px-3 py-1.5 shadow-sm">
            <i className="bi bi-calendar3 text-primary me-2"></i>
            <span className="small text-muted me-2 fw-semibold">Queue Date:</span>
            <input 
              type="date" 
              className="form-control form-control-sm border-0 p-0 shadow-none fw-bold text-dark bg-transparent"
              style={{ width: '130px', cursor: 'pointer' }}
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
            />
          </div>

          <button 
            className="btn btn-premium btn-premium-primary px-4 shadow-sm"
            onClick={() => setShowModal(true)}
          >
            <i className="bi bi-plus-lg me-1"></i> Live / Walk-in Token
          </button>
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

      {/* STAGE PROGRESS PATH ROW */}
      <div className="stage-path-container mb-4 shadow-sm">
        <div className="stage-path-item">
          <div className="stage-path-icon stat-widget-blue">
            <i className="bi bi-hourglass-split"></i>
          </div>
          <div>
            <span className="text-muted small fw-semibold d-block">Waiting</span>
            <strong className="text-dark">{totalWaitingCount} Persons</strong>
          </div>
        </div>
        
        <div className="stage-path-line"></div>

        <div className="stage-path-item">
          <div className="stage-path-icon stat-widget-orange">
            <i className="bi bi-arrow-right-circle-fill"></i>
          </div>
          <div>
            <span className="text-muted small fw-semibold d-block">Next Up</span>
            <strong className="text-dark">{nextUpCount} Persons</strong>
          </div>
        </div>

        <div className="stage-path-line"></div>

        <div className="stage-path-item">
          <div className="stage-path-icon stat-widget-purple">
            <i className="bi bi-person-badge-fill"></i>
          </div>
          <div>
            <span className="text-muted small fw-semibold d-block">Serving</span>
            <strong className="text-dark">{servingCount} Person</strong>
          </div>
        </div>

        <div className="stage-path-line"></div>

        <div className="stage-path-item">
          <div className="stage-path-icon stat-widget-green">
            <i className="bi bi-check-all"></i>
          </div>
          <div>
            <span className="text-muted small fw-semibold d-block">Completed Today</span>
            <strong className="text-dark">{completedCount} Tokens</strong>
          </div>
        </div>
      </div>

      {/* KANBAN KANBAN BOARDS COLUMN SECTION */}
      <div className="kanban-container">
        {/* COLUMN 1: WAITING */}
        <div className="kanban-column-wrapper">
          <div className="kanban-column-header">
            <span>Waiting ({totalWaitingCount})</span>
            <i className="bi bi-three-dots text-muted"></i>
          </div>
          
          <div className="kanban-column-list">
            {loading ? (
              <div className="text-center py-5">
                <div className="spinner-border spinner-border-sm text-primary" role="status"></div>
              </div>
            ) : remainingWaitingList.length > 0 ? (
              remainingWaitingList.map((t, idx) => (
                <div 
                  key={t._id} 
                  className="kanban-card kanban-card-border-waiting"
                  onClick={() => setSelectedToken({ token: t, position: idx + 3 })} // position calculated (since nextUp takes index 0,1)
                >
                  <div className="kanban-card-id text-primary">{formatTokenNumber(t.tokenNumber)}</div>
                  <div className="kanban-card-title">{t.customerName}</div>
                  <div className="kanban-card-phone">{t.customerPhone}</div>
                  <div className="d-flex justify-content-between align-items-center mt-2 pt-2 border-top">
                    <span className="kanban-card-subtext">
                      <i className="bi bi-clock me-1"></i> Waiting {getMinutesElapsed(t.createdAt)}m
                    </span>
                    <button className="btn btn-link text-primary text-decoration-none p-0 small fw-bold" style={{ fontSize: '0.75rem' }}>
                      View Details
                    </button>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-5 text-muted small bg-white rounded-3 border">
                No other waiting clients.
              </div>
            )}
          </div>
        </div>

        {/* COLUMN 2: NEXT UP */}
        <div className="kanban-column-wrapper">
          <div className="kanban-column-header text-purple">
            <span>Next Up ({nextUpCount})</span>
            <i className="bi bi-arrow-right-square text-muted"></i>
          </div>

          <div className="kanban-column-list">
            {loading ? (
              <div className="text-center py-5">
                <div className="spinner-border spinner-border-sm text-primary" role="status"></div>
              </div>
            ) : nextUpList.length > 0 ? (
              nextUpList.map((t, idx) => (
                <div 
                  key={t._id} 
                  className="kanban-card kanban-card-border-nextup"
                  onClick={() => setSelectedToken({ token: t, position: idx + 1 })}
                >
                  <div className="kanban-card-id text-purple">{formatTokenNumber(t.tokenNumber)}</div>
                  <div className="kanban-card-title">{t.customerName}</div>
                  <div className="kanban-card-phone">{t.customerPhone}</div>
                  <div className="kanban-card-subtext mb-2">
                    <i className="bi bi-clock me-1"></i> Waiting {getMinutesElapsed(t.createdAt)}m
                  </div>
                  
                  {/* Next up actions */}
                  <div className="kanban-card-actions" onClick={(e) => e.stopPropagation()}>
                    <button 
                      className="btn btn-outline-secondary btn-sm flex-grow-1 py-1 rounded-3" 
                      onClick={() => handleMoveBackToken(t._id)}
                    >
                      Back
                    </button>
                    <button 
                      className="btn btn-primary btn-sm flex-grow-1 py-1 rounded-3 fw-bold"
                      onClick={() => handleCallToken(t._id)}
                    >
                      Next
                    </button>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-5 text-muted small bg-white rounded-3 border">
                No staged candidates.
              </div>
            )}
          </div>
        </div>

        {/* COLUMN 3: SERVING */}
        <div className="kanban-column-wrapper">
          <div className="kanban-column-header text-success">
            <span>Serving ({servingCount})</span>
            <i className="bi bi-check-circle text-muted"></i>
          </div>

          <div className="kanban-column-list">
            {loading ? (
              <div className="text-center py-5">
                <div className="spinner-border spinner-border-sm text-primary" role="status"></div>
              </div>
            ) : servingList.length > 0 ? (
              servingList.map((t) => (
                <div 
                  key={t._id} 
                  className="kanban-card kanban-card-border-serving"
                  onClick={() => setSelectedToken({ token: t, position: 0 })}
                >
                  <div className="kanban-card-id text-success">{formatTokenNumber(t.tokenNumber)}</div>
                  <div className="kanban-card-title">{t.customerName}</div>
                  <div className="kanban-card-phone">{t.customerPhone}</div>
                  <div className="kanban-card-subtext mb-2 text-success font-monospace fw-semibold">
                    <i className="bi bi-play-circle me-1 animate-pulse"></i> Serving {getMinutesElapsed(t.calledAt)}m
                  </div>

                  {/* Serving actions */}
                  <div className="kanban-card-actions" onClick={(e) => e.stopPropagation()}>
                    <button 
                      className="btn btn-outline-secondary btn-sm flex-grow-1 py-1 rounded-3"
                      onClick={() => handleMoveBackToken(t._id)}
                    >
                      Back
                    </button>
                    <button 
                      className="btn btn-success btn-sm flex-grow-1 py-1 rounded-3 fw-bold border-0"
                      onClick={() => handleCompleteToken(t._id)}
                    >
                      Complete
                    </button>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-5 text-muted small bg-white rounded-3 border">
                No active serving.
              </div>
            )}
          </div>
        </div>

        {/* COLUMN 4: COMPLETED */}
        <div className="kanban-column-wrapper">
          <div className="kanban-column-header text-muted">
            <span>Completed ({completedCount})</span>
            <i className="bi bi-journal-check text-muted"></i>
          </div>

          <div className="kanban-column-list">
            {loading ? (
              <div className="text-center py-5">
                <div className="spinner-border spinner-border-sm text-primary" role="status"></div>
              </div>
            ) : completedList.length > 0 ? (
              completedList.slice(0, 10).map((t) => (
                <div 
                  key={t._id} 
                  className="kanban-card kanban-card-border-completed"
                  onClick={() => setSelectedToken({ token: t, position: -1 })}
                >
                  <div className="d-flex justify-content-between align-items-center">
                    <div className="kanban-card-id text-muted text-decoration-line-through">{formatTokenNumber(t.tokenNumber)}</div>
                    <span className={`badge rounded-pill ${
                      t.status === 'completed' ? 'bg-success-subtle text-success' : 
                      t.status === 'skipped' ? 'bg-danger-subtle text-danger' : 
                      t.status === 'cancelled' ? 'bg-danger-subtle text-danger' : 
                      'bg-warning-subtle text-warning'
                    }`} style={{ fontSize: '0.6rem' }}>
                      {t.status === 'completed' ? 'Completed' : 
                       t.status === 'skipped' ? 'Skipped' : 
                       t.status === 'cancelled' ? 'Cancelled' : 'Postponed'}
                    </span>
                  </div>
                  <div className="kanban-card-title">{t.customerName}</div>
                  <div className="kanban-card-phone">{t.customerPhone}</div>
                  <div className="kanban-card-subtext border-top mt-2 pt-2 text-muted">
                    Ended: {t.completedAt ? new Date(t.completedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '-'}
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-5 text-muted small bg-white rounded-3 border">
                No completed history.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* TICKET DETAILS DRAWER OVERLAY */}
      {selectedToken && (
        <div 
          className="details-drawer-overlay show" 
          onClick={() => setSelectedToken(null)}
        ></div>
      )}

      {/* TICKET DETAILS DRAWER (Panel 3 UI) */}
      <aside className={`details-drawer ${selectedToken ? 'open' : ''}`}>
        {selectedToken && (
          <>
            <button className="details-drawer-close" onClick={() => setSelectedToken(null)}>
              <i className="bi bi-x-lg"></i>
            </button>
            
            <div className="text-center mb-4">
              <span className="badge bg-primary bg-gradient rounded-pill px-3 py-1.5 fw-bold mb-2">
                #{selectedToken.token.tokenNumber}
              </span>
              <h2 className="fw-extrabold text-dark display-6 mb-1">{formatTokenNumber(selectedToken.token.tokenNumber)}</h2>
              <span className={`badge rounded-pill px-3 py-1.5 text-uppercase ${
                selectedToken.token.status === 'completed' ? 'bg-success-subtle text-success' :
                selectedToken.token.status === 'skipped' ? 'bg-danger-subtle text-danger' :
                selectedToken.token.status === 'cancelled' ? 'bg-danger-subtle text-danger' :
                selectedToken.token.status === 'postponed' ? 'bg-warning-subtle text-warning' :
                selectedToken.token.status === 'serving' ? 'bg-warning-subtle text-warning' :
                'bg-primary-subtle text-primary'
              }`} style={{ fontSize: '0.75rem', fontWeight: 'bold' }}>
                {selectedToken.token.status}
              </span>
            </div>

            {/* Customer specs */}
            <div className="details-info-section">
              <h6 className="text-muted small fw-semibold text-uppercase tracking-wider mb-2">Customer Details</h6>
              <h5 className="fw-bold text-dark mb-1">{selectedToken.token.customerName}</h5>
              <p className="text-muted small mb-0"><i className="bi bi-phone me-1"></i> {selectedToken.token.customerPhone}</p>
            </div>

            {/* Purpose of visit */}
            <div className="details-info-section">
              <label className="form-label text-muted small fw-semibold text-uppercase tracking-wider">Purpose of Visit</label>
              <select 
                className="form-select form-control-custom bg-white border"
                value={visitPurpose}
                onChange={(e) => setVisitPurpose(e.target.value)}
              >
                <option value="General Consultation">General Consultation</option>
                <option value="Express Service">Express Service</option>
                <option value="Checkup & Review">Checkup & Review</option>
                <option value="Other">Other Query</option>
              </select>
            </div>

            {/* Ticket Info timeline */}
            <div className="details-info-section">
              <h6 className="text-muted small fw-semibold text-uppercase tracking-wider mb-3">Ticket Information</h6>
              
              <div className="list-group list-group-flush small">
                <div className="list-group-item bg-transparent d-flex justify-content-between px-0 py-2 border-0 border-bottom">
                  <span className="text-muted">Registered At</span>
                  <strong className="text-dark">
                    {new Date(selectedToken.token.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </strong>
                </div>
                
                {selectedToken.position > 0 && (
                  <>
                    <div className="list-group-item bg-transparent d-flex justify-content-between px-0 py-2 border-0 border-bottom">
                      <span className="text-muted">Estimated Wait</span>
                      <strong className="text-primary">
                        ~{selectedToken.position * (business?.queueConfig?.serviceTime || 15)} mins
                      </strong>
                    </div>
                    <div className="list-group-item bg-transparent d-flex justify-content-between px-0 py-2 border-0">
                      <span className="text-muted">Queue Position</span>
                      <strong className="text-dark">
                        {selectedToken.position}
                        {selectedToken.position === 1 ? 'st' : selectedToken.position === 2 ? 'nd' : selectedToken.position === 3 ? 'rd' : 'th'} in Line
                      </strong>
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Drawer Actions */}
            <div className="mt-auto pt-4 border-top">
              {selectedToken.token.status === 'waiting' && (
                <div className="d-grid gap-2 mb-3">
                  <button 
                    className="btn btn-outline-primary py-2.5 rounded-3 fw-bold d-flex align-items-center justify-content-center"
                    onClick={() => {
                      alert(`Calling client ${formatTokenNumber(selectedToken.token.tokenNumber)} via Megaphone!`);
                    }}
                  >
                    <i className="bi bi-megaphone me-2 fs-5"></i> Call Client
                  </button>
                </div>
              )}

              {selectedToken.token.status === 'waiting' && (
                <div className="border-top my-3 pt-3">
                  <label className="form-label small fw-semibold text-muted text-uppercase tracking-wider">Postpone / Reschedule</label>
                  <div className="input-group mb-2">
                    <input 
                      type="date" 
                      className="form-control form-control-sm" 
                      value={postponeDate}
                      onChange={(e) => setPostponeDate(e.target.value)}
                      min={new Date().toISOString().split('T')[0]}
                    />
                    <button 
                      className="btn btn-outline-primary btn-sm fw-bold px-3"
                      onClick={handlePostponeToken}
                      disabled={postponing}
                    >
                      {postponing ? 'Rescheduling...' : 'Postpone'}
                    </button>
                  </div>
                  <p className="text-muted" style={{ fontSize: '0.7rem', lineHeight: '1.2' }}>
                    If the customer goes outside or requests another time, move this token to any future date.
                  </p>
                </div>
              )}

              {['waiting', 'serving'].includes(selectedToken.token.status) && (
                <button 
                  className="btn btn-danger w-100 py-3 rounded-3 fw-bold"
                  onClick={() => {
                    handleCancelToken(selectedToken.token._id);
                    setSelectedToken(null);
                  }}
                >
                  Cancel Token
                </button>
              )}
            </div>
          </>
        )}
      </aside>

      {/* WALK-IN TICKET GENERATOR MODAL */}
      {showModal && (
        <>
          <div className="modal-backdrop fade show" style={{ zIndex: 1040 }}></div>
          <div className="modal fade show d-block" tabIndex="-1" style={{ zIndex: 1050 }}>
            <div className="modal-dialog modal-dialog-centered">
              <div className="modal-content border-0 rounded-4 shadow-lg p-3">
                <div className="modal-header border-0 pb-0">
                  <h5 className="modal-title fw-extrabold text-dark">Register Walk-in Customer</h5>
                  <button type="button" className="btn-close" onClick={() => setShowModal(false)}></button>
                </div>
                
                <form onSubmit={handleAddToken}>
                  <div className="modal-body py-3">
                    <div className="mb-3">
                      <label className="form-label small fw-semibold text-muted">Customer Name</label>
                      <input 
                        type="text" 
                        className="form-control form-control-custom"
                        placeholder="e.g. Johnathan Smith"
                        value={customerName}
                        onChange={(e) => setCustomerName(e.target.value)}
                        required
                      />
                    </div>
                    
                    <div className="mb-3">
                      <label className="form-label small fw-semibold text-muted">Phone Number</label>
                      <input 
                        type="tel" 
                        className="form-control form-control-custom"
                        placeholder="e.g. +61 98765 43210"
                        value={customerPhone}
                        onChange={(e) => setCustomerPhone(e.target.value)}
                        required
                      />
                    </div>
                  </div>

                  <div className="modal-footer border-0 pt-0 d-flex gap-2">
                    <button type="button" className="btn btn-outline-secondary flex-grow-1 py-2.5 rounded-3" onClick={() => setShowModal(false)}>
                      Close
                    </button>
                    <button type="submit" className="btn btn-primary flex-grow-1 py-2.5 rounded-3 fw-bold" disabled={addingToken}>
                      {addingToken ? 'Registering...' : 'Register Token'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default LiveQueue;
