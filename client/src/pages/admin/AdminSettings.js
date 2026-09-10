import React, { useState, useEffect, useRef } from 'react';
import { api } from '../../context/AuthContext';

const AdminSettings = () => {
  const [business, setBusiness] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [qrLoading, setQrLoading] = useState(false);

  const [copiedCode, setCopiedCode] = useState(false);
  const fileInputRef = useRef(null);

  const handleCopyCode = () => {
    if (!business?.uniqueQrCode) return;
    navigator.clipboard.writeText(business.uniqueQrCode);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const [editForm, setEditForm] = useState({
    name: '',
    category: '',
    phone: '',
    address: '',
    city: '',
    state: '',
    zipCode: '',
    primaryColor: '#0d6efd',
    website: '',
    queueConfigName: '',
    startTime: '',
    endTime: '',
    serviceTime: 15
  });

  const fetchBusiness = async () => {
    try {
      setLoading(true);
      const res = await api.get('/admin/business');
      if (res.data.success) {
        const biz = res.data.business;
        setBusiness(biz);
        setEditForm({
          name: biz.name || '',
          category: biz.category || '',
          phone: biz.phone || '',
          address: biz.address || '',
          city: biz.city || '',
          state: biz.state || '',
          zipCode: biz.zipCode || '',
          primaryColor: biz.primaryColor || '#0d6efd',
          website: biz.website || '',
          queueConfigName: biz.queueConfig?.name || '',
          startTime: biz.queueConfig?.startTime || '',
          endTime: biz.queueConfig?.endTime || '',
          serviceTime: biz.queueConfig?.serviceTime || 15
        });
      }
    } catch (err) {
      console.error('Error fetching settings', err);
      setError('Could not fetch business configurations.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBusiness();
  }, []);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setEditForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSaveSettings = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    try {
      const res = await api.put('/admin/business', {
        name: editForm.name,
        category: editForm.category,
        phone: editForm.phone,
        address: editForm.address,
        city: editForm.city,
        state: editForm.state,
        zipCode: editForm.zipCode,
        primaryColor: editForm.primaryColor,
        website: editForm.website,
        queueConfig: {
          name: editForm.queueConfigName,
          startTime: editForm.startTime,
          endTime: editForm.endTime,
          serviceTime: Number(editForm.serviceTime)
        }
      });

      if (res.data.success) {
        setSuccess('Business profile and queue configurations updated successfully!');
        setBusiness(res.data.business);
      }
    } catch (err) {
      console.error('Error updating configurations', err);
      setError(err.response?.data?.message || 'Failed to update settings.');
    }
  };

  // Generate QR Code
  const handleGenerateQR = async () => {
    try {
      setQrLoading(true);
      setError('');
      setSuccess('');
      const res = await api.post('/admin/business/qr/generate');
      if (res.data.success) {
        setBusiness(res.data.business);
        setSuccess('QR Code successfully generated and saved to your business profile!');
      }
    } catch (err) {
      console.error('Error generating QR', err);
      setError(err.response?.data?.message || 'Failed to generate QR Code.');
    } finally {
      setQrLoading(false);
    }
  };

  // Upload Custom QR Image
  const handleCustomQRUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = async () => {
      try {
        setQrLoading(true);
        setError('');
        setSuccess('');
        const res = await api.put('/admin/business/qr', { qrCode: reader.result });
        if (res.data.success) {
          setBusiness(res.data.business);
          setSuccess('Custom QR Code uploaded and saved successfully!');
        }
      } catch (err) {
        console.error('Error uploading custom QR', err);
        setError(err.response?.data?.message || 'Failed to upload custom QR Code.');
      } finally {
        setQrLoading(false);
      }
    };
    reader.readAsDataURL(file);
  };

  // Remove QR Code
  const handleRemoveQR = async () => {
    if (!window.confirm('Are you sure you want to remove the QR Code from your business?')) return;
    try {
      setQrLoading(true);
      setError('');
      setSuccess('');
      const res = await api.delete('/admin/business/qr');
      if (res.data.success) {
        setBusiness(res.data.business);
        setSuccess('QR Code removed successfully from your business profile.');
      }
    } catch (err) {
      console.error('Error removing QR', err);
      setError(err.response?.data?.message || 'Failed to remove QR Code.');
    } finally {
      setQrLoading(false);
    }
  };

  // Download QR as PNG image
  const handleDownloadQR = () => {
    if (!business?.qrCode) return;
    const link = document.createElement('a');
    link.href = business.qrCode;
    link.download = `${(business.name || 'Business').replace(/\s+/g, '_')}_QRCode.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Print Counter Standee
  const handlePrintQRStandee = () => {
    if (!business?.qrCode) return;
    const printWindow = window.open('', '_blank', 'width=700,height=900');
    printWindow.document.write(`
      <html>
        <head>
          <title>Print QR Standee - ${business.name || 'Business'}</title>
          <style>
            body { font-family: 'Segoe UI', Roboto, sans-serif; text-align: center; padding: 40px; background: #fff; }
            .card { max-width: 480px; margin: 0 auto; border: 3px solid ${business.primaryColor || '#0d6efd'}; border-radius: 24px; padding: 36px 24px; box-shadow: 0 10px 30px rgba(0,0,0,0.08); }
            .logo-text { font-size: 26px; font-weight: 800; color: #111; margin-bottom: 4px; }
            .category { font-size: 14px; text-transform: uppercase; color: #666; font-weight: 600; letter-spacing: 1px; margin-bottom: 16px; }
            .qr-frame { background: #f8f9fa; padding: 16px; border-radius: 16px; display: inline-block; margin-bottom: 16px; border: 1px solid #e9ecef; }
            .qr-img { width: 260px; height: 260px; display: block; }
            .code-badge { font-family: monospace; font-size: 14px; font-weight: 700; color: #333; background: #e9ecef; padding: 6px 14px; border-radius: 8px; display: inline-block; margin-bottom: 16px; }
            .instruction-heading { font-size: 18px; font-weight: 700; color: #222; margin-bottom: 4px; }
            .instruction-sub { font-size: 13px; color: #666; margin-bottom: 20px; }
            .badge { background: ${business.primaryColor || '#0d6efd'}; color: #fff; padding: 8px 18px; border-radius: 50px; font-weight: 700; font-size: 13px; display: inline-block; }
          </style>
        </head>
        <body>
          <div class="card">
            <div class="logo-text">${business.name || 'WhistleApp Store'}</div>
            <div class="category">${business.category || 'Service Queue'}</div>
            <div class="qr-frame">
              <img class="qr-img" src="${business.qrCode}" alt="QR Code" />
            </div>
            ${business.uniqueQrCode ? `<div class="code-badge">ID: ${business.uniqueQrCode}</div>` : ''}
            <div class="instruction-heading">Scan to Request Token on Mobile</div>
            <div class="instruction-sub">Point your mobile camera or open WhistleApp to view live wait-times and check-in instantly.</div>
            <div><span class="badge">WhistleApp Digital Check-in</span></div>
          </div>
          <script>
            window.onload = function() {
              window.print();
            };
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  return (
    <div className="animated-fade-in" style={{ maxWidth: '900px' }}>
      <div className="mb-4">
        <h1 className="fw-extrabold text-dark mb-1">Configuration Settings</h1>
        <p className="text-muted">Customize your business details, generate QR codes, and configure queue preferences.</p>
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

      {/* QR CODE MANAGEMENT SECTION */}
      <div className="card border-0 p-4 p-md-5 bg-white shadow-sm rounded-4 mb-4">
        <div className="d-flex flex-column flex-md-row justify-content-between align-items-start align-items-md-center gap-2 mb-4 border-bottom pb-3">
          <div>
            <h5 className="fw-bold mb-1 text-dark">
              <i className="bi bi-qr-code-scan text-primary me-2"></i> Business Mobile QR Code
            </h5>
            <p className="text-muted small mb-0">Customers scan this QR code on their mobile devices to request queue tokens.</p>
          </div>
          <span className={`badge rounded-pill px-3 py-1.5 ${business?.qrCode ? 'bg-success-subtle text-success border border-success-subtle' : 'bg-secondary-subtle text-secondary'}`}>
            <i className={`bi bi-${business?.qrCode ? 'check-circle-fill' : 'dash-circle'} me-1`}></i>
            {business?.qrCode ? 'Active & Saved in Collection' : 'No QR Configured'}
          </span>
        </div>

        <div className="row g-4 align-items-center">
          {/* QR Code Canvas Preview */}
          <div className="col-md-5 col-lg-4 text-center">
            <div 
              className="p-3 bg-light rounded-4 border d-inline-flex flex-column align-items-center justify-content-center position-relative shadow-sm"
              style={{ width: '230px', minHeight: '230px' }}
            >
              {qrLoading ? (
                <div className="d-flex flex-column align-items-center justify-content-center py-4">
                  <div className="spinner-border text-primary mb-2" role="status"></div>
                  <span className="small text-muted fw-semibold">Processing QR...</span>
                </div>
              ) : business?.qrCode ? (
                <>
                  <img 
                    src={business.qrCode} 
                    alt="Business QR Code" 
                    className="img-fluid rounded-3 mb-2" 
                    style={{ maxWidth: '170px', maxHeight: '170px', objectFit: 'contain' }}
                  />
                  <span className="small fw-bold text-dark font-monospace text-truncate mb-1" style={{ maxWidth: '200px' }}>
                    {business.name}
                  </span>

                  {business.uniqueQrCode && (
                    <div className="d-flex align-items-center justify-content-between bg-white border rounded-pill px-2.5 py-1 w-100 shadow-sm mt-1">
                      <div className="d-flex align-items-center text-truncate me-1">
                        <i className="bi bi-shield-lock-fill text-primary me-1" style={{ fontSize: '0.7rem' }}></i>
                        <span className="font-monospace fw-bold text-dark text-truncate" style={{ fontSize: '0.72rem' }}>
                          {business.uniqueQrCode}
                        </span>
                      </div>
                      <button
                        type="button"
                        className="btn btn-link p-0 text-muted"
                        onClick={handleCopyCode}
                        title="Copy Unique Code"
                      >
                        <i className={`bi bi-${copiedCode ? 'check-lg text-success' : 'clipboard'}`} style={{ fontSize: '0.8rem' }}></i>
                      </button>
                    </div>
                  )}

                  {business.qrGeneratedAt && (
                    <span className="text-muted mt-1.5" style={{ fontSize: '0.62rem' }}>
                      Created: {new Date(business.qrGeneratedAt).toLocaleDateString()}
                    </span>
                  )}
                </>
              ) : (
                <div className="text-center text-muted py-4 px-2">
                  <i className="bi bi-qr-code fs-1 text-muted d-block mb-2"></i>
                  <span className="small d-block fw-semibold">No QR Code Generated</span>
                  <span className="text-muted" style={{ fontSize: '0.72rem' }}>Click generate below to create one</span>
                </div>
              )}
            </div>
          </div>

          {/* QR Action Buttons */}
          <div className="col-md-7 col-lg-8">
            <h6 className="fw-bold text-dark mb-2">QR Code Actions & Standee Setup</h6>
            <p className="text-muted small mb-3">
              Generate an official QR code linked to this business, or upload your own branded QR code. Changes are saved directly in the Business database collection.
            </p>

            <div className="d-flex flex-wrap gap-2 mb-3">
              <button 
                type="button" 
                className="btn btn-primary btn-sm px-3 py-2 rounded-3 fw-bold d-flex align-items-center shadow-sm"
                onClick={handleGenerateQR}
                disabled={qrLoading}
              >
                <i className="bi bi-magic me-1.5"></i>
                {business?.qrCode ? 'Regenerate QR Code' : 'Generate QR Code'}
              </button>

              <button 
                type="button" 
                className="btn btn-outline-secondary btn-sm px-3 py-2 rounded-3 fw-bold d-flex align-items-center"
                onClick={() => fileInputRef.current?.click()}
                disabled={qrLoading}
              >
                <i className="bi bi-upload me-1.5"></i> Upload Custom QR
              </button>
              <input 
                type="file" 
                ref={fileInputRef} 
                className="d-none" 
                accept="image/*" 
                onChange={handleCustomQRUpload}
              />

              {business?.qrCode && (
                <>
                  <button 
                    type="button" 
                    className="btn btn-outline-primary btn-sm px-3 py-2 rounded-3 fw-bold d-flex align-items-center"
                    onClick={handleDownloadQR}
                  >
                    <i className="bi bi-download me-1.5"></i> Download PNG
                  </button>

                  <button 
                    type="button" 
                    className="btn btn-outline-dark btn-sm px-3 py-2 rounded-3 fw-bold d-flex align-items-center"
                    onClick={handlePrintQRStandee}
                  >
                    <i className="bi bi-printer me-1.5"></i> Print Standee
                  </button>

                  <button 
                    type="button" 
                    className="btn btn-outline-danger btn-sm px-3 py-2 rounded-3 fw-bold d-flex align-items-center"
                    onClick={handleRemoveQR}
                    disabled={qrLoading}
                  >
                    <i className="bi bi-trash3 me-1.5"></i> Remove QR
                  </button>
                </>
              )}
            </div>

            <div className="p-3 bg-light rounded-3 small text-muted">
              <div className="d-flex align-items-start gap-2">
                <i className="bi bi-info-circle-fill text-primary mt-0.5"></i>
                <div>
                  <strong>Mobile Integration:</strong> When customers scan this QR code with their mobile device, it will automatically connect them to your business queue to request a token.
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* BUSINESS PROFILE INFO */}
      <div className="card border-0 p-4 p-md-5 bg-white shadow-sm rounded-4">
        {loading ? (
          <div className="text-center py-5">
            <div className="spinner-border text-primary" role="status"></div>
          </div>
        ) : (
          <form onSubmit={handleSaveSettings}>
            <h5 className="fw-bold mb-4 text-dark border-bottom pb-2">
              <i className="bi bi-shop text-primary me-2"></i> Business Profile Info
            </h5>

            <div className="row g-3 mb-4">
              <div className="col-md-6">
                <label className="form-label small fw-semibold text-muted">Business Name</label>
                <input
                  type="text"
                  name="name"
                  className="form-control form-control-custom"
                  value={editForm.name}
                  onChange={handleInputChange}
                  required
                />
              </div>
              <div className="col-md-6">
                <label className="form-label small fw-semibold text-muted">Sub-category / Speciality</label>
                <input
                  type="text"
                  name="category"
                  className="form-control form-control-custom"
                  value={editForm.category}
                  onChange={handleInputChange}
                  required
                />
              </div>
              <div className="col-md-6">
                <label className="form-label small fw-semibold text-muted">Outlet Phone Number</label>
                <input
                  type="tel"
                  name="phone"
                  className="form-control form-control-custom"
                  value={editForm.phone}
                  onChange={handleInputChange}
                  required
                />
              </div>
              <div className="col-md-6">
                <label className="form-label small fw-semibold text-muted">Accent Hex Color Theme</label>
                <div className="d-flex align-items-center">
                  <input
                    type="color"
                    name="primaryColor"
                    className="form-control form-control-color me-2 border-0"
                    style={{ width: '48px', height: '38px', borderRadius: '8px' }}
                    value={editForm.primaryColor}
                    onChange={handleInputChange}
                  />
                  <input
                    type="text"
                    name="primaryColor"
                    className="form-control form-control-custom font-monospace"
                    value={editForm.primaryColor}
                    onChange={handleInputChange}
                  />
                </div>
              </div>
              <div className="col-12">
                <label className="form-label small fw-semibold text-muted">Street Address</label>
                <input
                  type="text"
                  name="address"
                  className="form-control form-control-custom"
                  value={editForm.address}
                  onChange={handleInputChange}
                  required
                />
              </div>
              <div className="col-md-4">
                <label className="form-label small fw-semibold text-muted">City</label>
                <input
                  type="text"
                  name="city"
                  className="form-control form-control-custom"
                  value={editForm.city}
                  onChange={handleInputChange}
                  required
                />
              </div>
              <div className="col-md-4">
                <label className="form-label small fw-semibold text-muted">State</label>
                <input
                  type="text"
                  name="state"
                  className="form-control form-control-custom"
                  value={editForm.state}
                  onChange={handleInputChange}
                  required
                />
              </div>
              <div className="col-md-4">
                <label className="form-label small fw-semibold text-muted">Zip Code</label>
                <input
                  type="text"
                  name="zipCode"
                  className="form-control form-control-custom"
                  value={editForm.zipCode}
                  onChange={handleInputChange}
                  required
                />
              </div>
            </div>

            <h5 className="fw-bold mt-5 mb-4 text-dark border-bottom pb-2">
              <i className="bi bi-clock-history text-primary me-2"></i> Queue Configurations & Schedule
            </h5>

            <div className="row g-3 mb-4">
              <div className="col-md-6">
                <label className="form-label small fw-semibold text-muted">Queue Display Name</label>
                <input
                  type="text"
                  name="queueConfigName"
                  className="form-control form-control-custom"
                  value={editForm.queueConfigName}
                  onChange={handleInputChange}
                  required
                />
              </div>
              <div className="col-md-6">
                <label className="form-label small fw-semibold text-muted">Average Turnaround Time (Minutes)</label>
                <input
                  type="number"
                  name="serviceTime"
                  className="form-control form-control-custom"
                  value={editForm.serviceTime}
                  onChange={handleInputChange}
                  required
                />
              </div>
              <div className="col-md-6">
                <label className="form-label small fw-semibold text-muted">Shift Start Time</label>
                <input
                  type="time"
                  name="startTime"
                  className="form-control form-control-custom"
                  value={editForm.startTime}
                  onChange={handleInputChange}
                  required
                />
              </div>
              <div className="col-md-6">
                <label className="form-label small fw-semibold text-muted">Shift End Time</label>
                <input
                  type="time"
                  name="endTime"
                  className="form-control form-control-custom"
                  value={editForm.endTime}
                  onChange={handleInputChange}
                  required
                />
              </div>
            </div>

            <div className="d-flex justify-content-end gap-2 border-top pt-4 mt-5">
              <button
                type="submit"
                className="btn btn-premium btn-premium-primary px-5 py-2.5 shadow-sm fw-bold"
              >
                Save Configurations Settings
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

export default AdminSettings;

