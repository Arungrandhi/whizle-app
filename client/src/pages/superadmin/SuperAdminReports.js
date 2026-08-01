import React, { useState } from 'react';
import { api } from '../../context/AuthContext';

const SuperAdminReports = () => {
  const [downloadingUsers, setDownloadingUsers] = useState(false);
  const [downloadingBusinesses, setDownloadingBusinesses] = useState(false);
  const [downloadingAds, setDownloadingAds] = useState(false);
  const [error, setError] = useState('');

  const downloadCSV = (headers, rows, filename) => {
    // Compile data into CSV string format
    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(val => {
        const str = String(val === null || val === undefined ? '' : val).replace(/"/g, '""');
        return `"${str}"`;
      }).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `${filename}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleDownloadUsers = async () => {
    try {
      setDownloadingUsers(true);
      setError('');
      const res = await api.get('/superadmin/users');
      if (res.data.success) {
        const users = res.data.users;
        const headers = ['Name', 'Email', 'Role', 'Registered At'];
        const rows = users.map(u => [
          u.name,
          u.email,
          u.role,
          u.createdAt ? new Date(u.createdAt).toLocaleString() : ''
        ]);
        downloadCSV(headers, rows, `whistle_users_${new Date().toISOString().split('T')[0]}`);
      }
    } catch (err) {
      console.error('Error downloading users report', err);
      setError('Failed to compile users report.');
    } finally {
      setDownloadingUsers(false);
    }
  };

  const handleDownloadBusinesses = async () => {
    try {
      setDownloadingBusinesses(true);
      setError('');
      const res = await api.get('/superadmin/businesses');
      if (res.data.success) {
        const businesses = res.data.businesses;
        const headers = ['Business Name', 'Domain', 'Admin Name', 'Admin Email', 'City', 'State', 'Address', 'Registered At'];
        const rows = businesses.map(b => [
          b.name,
          b.domain,
          b.admin?.name || 'N/A',
          b.admin?.email || 'N/A',
          b.city,
          b.state,
          b.address,
          b.createdAt ? new Date(b.createdAt).toLocaleString() : ''
        ]);
        downloadCSV(headers, rows, `whistle_businesses_${new Date().toISOString().split('T')[0]}`);
      }
    } catch (err) {
      console.error('Error downloading business report', err);
      setError('Failed to compile business report.');
    } finally {
      setDownloadingBusinesses(false);
    }
  };

  const handleDownloadAds = async () => {
    try {
      setDownloadingAds(true);
      setError('');
      const res = await api.get('/superadmin/ads');
      if (res.data.success) {
        const ads = res.data.ads;
        const headers = ['Ad Campaign Name', 'Placements', 'Active Status', 'URL', 'Views', 'Clicks', 'CTR (%)', 'Targeting Type', 'Created At'];
        const rows = ads.map(ad => {
          const ctr = ad.views > 0 ? ((ad.clicks / ad.views) * 100).toFixed(2) : '0.00';
          const placements = ad.positions && ad.positions.length 
            ? ad.positions.join(' | ') 
            : (ad.position || 'N/A');
          return [
            ad.name,
            placements,
            ad.isActive ? 'Active' : 'Inactive',
            ad.url,
            ad.views || 0,
            ad.clicks || 0,
            `${ctr}%`,
            ad.targeting?.type || 'GLOBAL',
            ad.createdAt ? new Date(ad.createdAt).toLocaleString() : ''
          ];
        });
        downloadCSV(headers, rows, `whistle_ads_${new Date().toISOString().split('T')[0]}`);
      }
    } catch (err) {
      console.error('Error downloading ads report', err);
      setError('Failed to compile ads report.');
    } finally {
      setDownloadingAds(false);
    }
  };

  return (
    <div className="animated-fade-in" style={{ maxWidth: '1000px' }}>
      <div className="mb-4">
        <h1 className="fw-extrabold text-dark mb-1">Global System Reports</h1>
        <p className="text-muted">Generate and extract spreadsheet files for database auditing.</p>
      </div>

      {error && (
        <div className="alert alert-danger border-0 rounded-3 small mb-4">
          {error}
        </div>
      )}

      <div className="row g-4">
        {/* Card 1: Users Reports */}
        <div className="col-12 col-md-4">
          <div className="card border-0 p-4 bg-white shadow-sm rounded-4 h-100 d-flex flex-column justify-content-between">
            <div>
              <div className="bg-primary bg-opacity-10 text-primary rounded-3 p-3 me-3 d-inline-block mb-3">
                <i className="bi bi-people-fill fs-3"></i>
              </div>
              <h5 className="fw-bold text-dark mb-2">Users Reports</h5>
              <p className="text-muted small mb-4">
                Extract summaries of registered administrators, staff logs, and user roles counts.
              </p>
            </div>
            <button 
              className="btn btn-outline-primary w-100 py-2.5 rounded-3 fw-bold small"
              onClick={handleDownloadUsers}
              disabled={downloadingUsers}
            >
              <i className="bi bi-download me-1"></i> {downloadingUsers ? 'Downloading...' : 'Download Excel'}
            </button>
          </div>
        </div>

        {/* Card 2: Business Reports */}
        <div className="col-12 col-md-4">
          <div className="card border-0 p-4 bg-white shadow-sm rounded-4 h-100 d-flex flex-column justify-content-between">
            <div>
              <div className="bg-success bg-opacity-10 text-success rounded-3 p-3 me-3 d-inline-block mb-3">
                <i className="bi bi-shop-window fs-3"></i>
              </div>
              <h5 className="fw-bold text-dark mb-2">Business Report</h5>
              <p className="text-muted small mb-4">
                Detailed breakdowns of outlets registrations, domains, active queues, and usage limits.
              </p>
            </div>
            <button 
              className="btn btn-outline-success w-100 py-2.5 rounded-3 fw-bold small"
              onClick={handleDownloadBusinesses}
              disabled={downloadingBusinesses}
            >
              <i className="bi bi-download me-1"></i> {downloadingBusinesses ? 'Downloading...' : 'Download Excel'}
            </button>
          </div>
        </div>

        {/* Card 3: Ads Reports */}
        <div className="col-12 col-md-4">
          <div className="card border-0 p-4 bg-white shadow-sm rounded-4 h-100 d-flex flex-column justify-content-between">
            <div>
              <div className="bg-purple bg-opacity-10 text-purple rounded-3 p-3 me-3 d-inline-block mb-3" style={{ color: '#6f42c1', backgroundColor: '#f3e8ff' }}>
                <i className="bi bi-megaphone-fill fs-3"></i>
              </div>
              <h5 className="fw-bold text-dark mb-2">Ads Report</h5>
              <p className="text-muted small mb-4">
                Performance tracking sheet aggregating campaign views, active status, duration and priority specs.
              </p>
            </div>
            <button 
              className="btn btn-outline-primary w-100 py-2.5 rounded-3 fw-bold small"
              style={{ color: '#6f42c1', borderColor: '#6f42c1' }}
              onClick={handleDownloadAds}
              disabled={downloadingAds}
            >
              <i className="bi bi-download me-1"></i> {downloadingAds ? 'Downloading...' : 'Download Excel'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SuperAdminReports;
