import React, { useState } from 'react';

const SuperAdminSettings = () => {
  const [systemName, setSystemName] = useState('Whistlez Systems');
  const [maxUploadLimit, setMaxUploadLimit] = useState(10); // MB
  const [supportEmail, setSupportEmail] = useState('support@whistlez.com');
  const [maintenanceMode, setMaintenanceMode] = useState(false);
  const [success, setSuccess] = useState('');

  const handleSave = (e) => {
    e.preventDefault();
    setSuccess('Global system configurations saved successfully.');
    setTimeout(() => setSuccess(''), 3000);
  };

  return (
    <div className="animated-fade-in" style={{ maxWidth: '800px' }}>
      <div className="mb-4">
        <h1 className="fw-extrabold text-dark mb-1">Global System Settings</h1>
        <p className="text-muted">Configure server variables, upload parameters, and maintenance controls.</p>
      </div>

      {success && (
        <div className="alert alert-success border-0 rounded-3 small mb-4 py-2 shadow-sm" role="alert">
          <i className="bi bi-check-circle-fill me-2 fs-5"></i>
          <span>{success}</span>
        </div>
      )}

      <div className="card border-0 p-4 p-md-5 bg-white shadow-sm rounded-4">
        <form onSubmit={handleSave}>
          <h5 className="fw-bold mb-4 text-dark border-bottom pb-2">
            <i className="bi bi-gear-fill text-primary me-2"></i> System Configurations
          </h5>

          <div className="row g-3 mb-4">
            <div className="col-md-6">
              <label className="form-label small fw-semibold text-muted">Platform Title Name</label>
              <input 
                type="text" 
                className="form-control form-control-custom"
                value={systemName}
                onChange={(e) => setSystemName(e.target.value)}
                required
              />
            </div>
            
            <div className="col-md-6">
              <label className="form-label small fw-semibold text-muted">Support Contact Email</label>
              <input 
                type="email" 
                className="form-control form-control-custom"
                value={supportEmail}
                onChange={(e) => setSupportEmail(e.target.value)}
                required
              />
            </div>

            <div className="col-md-6">
              <label className="form-label small fw-semibold text-muted">Max Audio Upload Size (MB)</label>
              <input 
                type="number" 
                className="form-control form-control-custom"
                value={maxUploadLimit}
                onChange={(e) => setMaxUploadLimit(Number(e.target.value))}
                required
              />
            </div>

            <div className="col-md-6">
              <label className="form-label small fw-semibold text-muted">Maintenance Status</label>
              <div className="form-check form-switch mt-2">
                <input 
                  className="form-check-input" 
                  type="checkbox" 
                  style={{ transform: 'scale(1.2)', cursor: 'pointer' }}
                  checked={maintenanceMode}
                  onChange={(e) => setMaintenanceMode(e.target.checked)}
                />
                <span className="ms-2 small text-muted">
                  {maintenanceMode ? 'Offline - System Locked' : 'Online - Operational'}
                </span>
              </div>
            </div>
          </div>

          <div className="d-flex justify-content-end border-top pt-4 mt-5">
            <button type="submit" className="btn btn-premium btn-premium-primary px-5 py-2.5 shadow-sm fw-bold border-0 bg-primary bg-gradient">
              Save Global Configurations
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default SuperAdminSettings;
