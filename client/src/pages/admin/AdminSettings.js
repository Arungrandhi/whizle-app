import React, { useState, useEffect } from 'react';
import { api } from '../../context/AuthContext';

const AdminSettings = () => {
  const [business, setBusiness] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [editForm, setEditForm] = useState({
    name: '',
    category: '',
    phone: '',
    address: '',
    city: '',
    state: '',
    zipCode: '',
    primaryColor: '#0d6efd',
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
          name: biz.name,
          category: biz.category,
          phone: biz.phone,
          address: biz.address,
          city: biz.city,
          state: biz.state,
          zipCode: biz.zipCode,
          primaryColor: biz.primaryColor || '#0d6efd',
          queueConfigName: biz.queueConfig.name,
          startTime: biz.queueConfig.startTime,
          endTime: biz.queueConfig.endTime,
          serviceTime: biz.queueConfig.serviceTime
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

  if (loading) {
    return (
      <div className="text-center py-5">
        <div className="spinner-border text-primary" role="status"></div>
      </div>
    );
  }

  return (
    <div className="animated-fade-in" style={{ maxWidth: '900px' }}>
      <div className="mb-4">
        <h1 className="fw-extrabold text-dark mb-1">Configuration Settings</h1>
        <p className="text-muted">Customize your business details, queue schedules, and visual brand identity.</p>
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

      <div className="card border-0 p-4 p-md-5 bg-white shadow-sm rounded-4">
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
      </div>
    </div>
  );
};

export default AdminSettings;
