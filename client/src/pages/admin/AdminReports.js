import React, { useState, useEffect } from 'react';
import { api } from '../../context/AuthContext';

const AdminReports = () => {
  const [tokens, setTokens] = useState([]);
  const [business, setBusiness] = useState(null);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const prefix = business?.queueConfig?.name ? business.queueConfig.name.charAt(0).toUpperCase() : 'A';

  const formatDateTime = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${day}-${month}-${year} ${hours}:${minutes}`;
  };

  const fetchHistory = async () => {
    try {
      if (tokens.length === 0) setLoading(true);
      let url = '/admin/tokens?all=true';
      if (startDate && endDate) {
        url = `/admin/tokens?all=true&startDate=${startDate}&endDate=${endDate}`;
      } else if (startDate) {
        url = `/admin/tokens?all=true&date=${startDate}`;
      }
      const [res, businessRes] = await Promise.all([
        api.get(url),
        api.get('/admin/business')
      ]);
      if (res.data.success) {
        setTokens(res.data.tokens);
      }
      if (businessRes.data.success) {
        setBusiness(businessRes.data.business);
      }
    } catch (err) {
      console.error('Error loading history', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, [startDate, endDate]);

  const handleDownloadCSV = () => {
    if (tokens.length === 0) {
      alert('No ticket logs to download.');
      return;
    }
    const headers = ['Token Number', 'Customer Name', 'Customer Phone', 'Status', 'Created At', 'Called At', 'Completed At'];
    const rows = tokens.map(t => [
      `${prefix}${t.tokenNumber}`,
      t.customerName,
      t.customerPhone,
      t.status.toUpperCase(),
      new Date(t.createdAt).toLocaleString(),
      t.calledAt ? new Date(t.calledAt).toLocaleString() : 'N/A',
      t.completedAt ? new Date(t.completedAt).toLocaleString() : 'N/A'
    ]);
    
    const csvContent = "data:text/csv;charset=utf-8," 
      + [headers.join(','), ...rows.map(e => e.map(val => `"${val}"`).join(','))].join('\n');
      
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Whistlez_Queue_Report_${startDate || 'all'}_to_${endDate || 'all'}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const filteredTokens = tokens.filter((t) => {
    const matchesStatus = filterStatus === 'all' || t.status === filterStatus;
    const matchesSearch = 
      t.customerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.tokenNumber.toString().includes(searchQuery) ||
      t.customerPhone.includes(searchQuery);
    return matchesStatus && matchesSearch;
  });

  const totals = tokens.length;
  const completed = tokens.filter(t => t.status === 'completed').length;
  const skipped = tokens.filter(t => t.status === 'skipped').length;
  const cancelled = tokens.filter(t => t.status === 'cancelled').length;
  const waiting = tokens.filter(t => t.status === 'waiting').length;

  return (
    <div className="animated-fade-in">
      <div className="mb-4">
        <h1 className="fw-extrabold text-dark mb-1">Reports & Logs</h1>
        <p className="text-muted">Analyze your business performance and ticket logs history.</p>
      </div>

      {/* Reports Metrics Summary */}
      <div className="row g-3 mb-4">
        <div className="col-6 col-md-3">
          <div className="card border-0 p-3 bg-white shadow-sm rounded-3">
            <span className="text-muted small fw-medium">All generated</span>
            <h3 className="fw-extrabold text-dark mt-1 mb-0">
              {loading ? <span className="spinner-border spinner-border-sm text-muted"></span> : totals}
            </h3>
          </div>
        </div>
        <div className="col-6 col-md-3">
          <div className="card border-0 p-3 bg-white shadow-sm rounded-3">
            <span className="text-muted small fw-medium">Completed</span>
            <h3 className="fw-extrabold text-success mt-1 mb-0">
              {loading ? <span className="spinner-border spinner-border-sm text-muted"></span> : completed}
            </h3>
          </div>
        </div>
        <div className="col-6 col-md-3">
          <div className="card border-0 p-3 bg-white shadow-sm rounded-3">
            <span className="text-muted small fw-medium">Cancelled/Skipped</span>
            <h3 className="fw-extrabold text-danger mt-1 mb-0">
              {loading ? <span className="spinner-border spinner-border-sm text-muted"></span> : cancelled + skipped}
            </h3>
          </div>
        </div>
        <div className="col-6 col-md-3">
          <div className="card border-0 p-3 bg-white shadow-sm rounded-3">
            <span className="text-muted small fw-medium">Active Waiting</span>
            <h3 className="fw-extrabold text-primary mt-1 mb-0">
              {loading ? <span className="spinner-border spinner-border-sm text-muted"></span> : waiting}
            </h3>
          </div>
        </div>
      </div>

      {/* Filter and Search controls */}
      <div className="card border-0 p-4 bg-white shadow-sm rounded-4 mb-4">
        <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-3 mb-4">
          <h5 className="fw-bold mb-0 text-dark">Ticket Logs Directory</h5>
          <div className="d-flex flex-wrap align-items-center gap-3">
            <div className="d-flex align-items-center gap-1.5">
              <span className="small text-muted fw-semibold">From:</span>
              <input 
                type="date" 
                className="form-control form-control-sm"
                style={{ width: '130px' }}
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
              <span className="small text-muted fw-semibold ms-1">To:</span>
              <input 
                type="date" 
                className="form-control form-control-sm"
                style={{ width: '130px' }}
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>

            <select 
              className="form-select form-select-sm" 
              style={{ width: '130px' }}
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
            >
              <option value="all">All Statuses</option>
              <option value="waiting">Waiting</option>
              <option value="serving">Serving</option>
              <option value="completed">Completed</option>
              <option value="skipped">Skipped</option>
              <option value="cancelled">Cancelled</option>
              <option value="postponed">Postponed</option>
            </select>

            <input 
              type="text" 
              className="form-control form-control-sm"
              placeholder="Search Name / Token / Phone"
              style={{ width: '200px' }}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />

            <button 
              className="btn btn-primary btn-sm d-flex align-items-center px-3 py-1.5 rounded-3 fw-bold bg-primary bg-gradient border-0"
              onClick={handleDownloadCSV}
            >
              <i className="bi bi-download me-1"></i> Download
            </button>
          </div>
        </div>

        <div className="table-responsive">
          <table className="table table-hover align-middle">
            <thead>
              <tr className="table-light text-muted small">
                <th scope="col">TOKEN NO</th>
                <th scope="col">CUSTOMER</th>
                <th scope="col">PHONE</th>
                <th scope="col">STATUS</th>
                <th scope="col" className="text-end">TIMINGS</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                   <td colSpan="5" className="text-center py-5">
                     <div className="spinner-border text-primary" role="status"></div>
                   </td>
                </tr>
              ) : filteredTokens.length > 0 ? (
                filteredTokens.map((t) => (
                  <tr key={t._id}>
                    <td>
                      <span className="badge bg-primary-subtle text-primary rounded-pill fw-bold">
                        {prefix}{t.tokenNumber}
                      </span>
                    </td>
                    <td><strong className="text-dark">{t.customerName}</strong></td>
                    <td>{t.customerPhone}</td>
                    <td>
                      <span className={`badge rounded-pill text-uppercase px-2.5 py-1 ${
                        t.status === 'completed' ? 'bg-success-subtle text-success' :
                        t.status === 'skipped' ? 'bg-danger-subtle text-danger' :
                        t.status === 'cancelled' ? 'bg-danger-subtle text-danger' :
                        t.status === 'postponed' ? 'bg-warning-subtle text-warning' :
                        t.status === 'serving' ? 'bg-warning-subtle text-warning' :
                        'bg-primary-subtle text-primary'
                      }`} style={{ fontSize: '0.65rem', fontWeight: 'bold' }}>
                        {t.status}
                      </span>
                    </td>
                    <td className="text-end text-muted small">
                      Created: {formatDateTime(t.createdAt)}
                      {t.calledAt && ` | Served: ${formatDateTime(t.calledAt)}`}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="5" className="text-center py-5 text-muted small">
                    No matching token records found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default AdminReports;
