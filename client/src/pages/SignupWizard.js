import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const SignupWizard = () => {
  const navigate = useNavigate();
  const { registerAdmin } = useAuth();
  
  // Wizard Step State (1 to 6)
  const [step, setStep] = useState(1);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Consolidated Form State
  const [formData, setFormData] = useState({
    // Step 1
    domain: '',
    
    // Step 2
    businessName: '',
    adminName: '', // owner name
    businessEmail: '',
    businessPhone: '',
    businessCategory: '',
    password: '',
    confirmPassword: '',

    // Step 3
    address: '',
    country: 'India',
    state: 'Telangana',
    city: 'Hyderabad',
    zipCode: '',
    mapsUrl: '',

    // Step 4
    queueName: '',
    startTime: '09:00',
    endTime: '18:00',
    serviceTime: 15,
    maxDailyTickets: 200,
    verificationTime: '12 Minutes',
    enableNotifications: true,

    // Step 5
    logo: '',
    backgroundImage: ''
  });

  const domains = [
    { name: 'Health Care', icon: 'bi-heart-pulse-fill', color: '#e91e63', bg: '#fce4ec' },
    { name: 'Banking', icon: 'bi-bank2', color: '#f59e0b', bg: '#fef3c7' },
    { name: 'Salon', icon: 'bi-scissors', color: '#ef4444', bg: '#fee2e2' },
    { name: 'Eating', icon: 'bi-egg-fried', color: '#6366f1', bg: '#e0e7ff' },
    { name: 'Services', icon: 'bi-gear-wide-connected', color: '#10b981', bg: '#d1fae5' },
    { name: 'Beauty', icon: 'bi-brush-fill', color: '#8b5cf6', bg: '#ede9fe' },
    { name: 'Diagnostics', icon: 'bi-activity', color: '#f97316', bg: '#ffedd5' },
    { name: 'Other', icon: 'bi-grid-3x3-gap-fill', color: '#06b6d4', bg: '#ecfeff' }
  ];

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  // Convert uploaded image files to Base64 strings for storage
  const handleImageUpload = (e, field) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        setError('Image file size must be less than 2MB');
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData((prev) => ({ ...prev, [field]: reader.result }));
        setError('');
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRemoveImage = (field) => {
    setFormData((prev) => ({ ...prev, [field]: '' }));
  };

  const nextStep = () => {
    setError('');
    
    // Form validations per step
    if (step === 1 && !formData.domain) {
      setError('Please choose a business domain first');
      return;
    }
    
    if (step === 2) {
      if (!formData.businessName || !formData.adminName || !formData.businessEmail || !formData.businessPhone || !formData.businessCategory || !formData.password) {
        setError('Please fill in all required fields');
        return;
      }
      if (formData.password !== formData.confirmPassword) {
        setError('Passwords do not match');
        return;
      }
      if (formData.password.length < 6) {
        setError('Password must be at least 6 characters');
        return;
      }
    }

    if (step === 3) {
      if (!formData.address || !formData.country || !formData.state || !formData.city || !formData.zipCode) {
        setError('Please fill in all location fields');
        return;
      }
    }

    if (step === 4) {
      if (!formData.queueName || !formData.serviceTime || !formData.maxDailyTickets) {
        setError('Please configure your queue schedule');
        return;
      }
    }

    if (step === 5) {
      // Complete registration process
      handleRegistration();
      return;
    }

    setStep((prev) => prev + 1);
  };

  const prevStep = () => {
    setError('');
    setStep((prev) => prev - 1);
  };

  const selectDomain = (domainName) => {
    setFormData((prev) => ({
      ...prev,
      domain: domainName,
      businessCategory: domainName // auto fill category
    }));
    setError('');
  };

  const handleRegistration = async () => {
    setLoading(true);
    setError('');
    
    // Combine data payload
    const submissionPayload = {
      domain: formData.domain,
      businessName: formData.businessName,
      businessCategory: formData.businessCategory,
      businessPhone: formData.businessPhone,
      businessEmail: formData.businessEmail.toLowerCase(),
      address: formData.address,
      country: formData.country,
      state: formData.state,
      city: formData.city,
      zipCode: formData.zipCode,
      queueName: formData.queueName,
      startTime: formData.startTime,
      endTime: formData.endTime,
      serviceTime: Number(formData.serviceTime),
      logo: formData.logo,
      backgroundImage: formData.backgroundImage,
      primaryColor: '#3b82f6', // default branding blue
      adminName: formData.adminName,
      adminEmail: formData.businessEmail.toLowerCase(),
      password: formData.password
    };

    const result = await registerAdmin(submissionPayload);
    setLoading(false);

    if (result.success) {
      setStep(6);
    } else {
      setError(result.message || 'Registration failed. Please check details.');
    }
  };

  return (
    <div className="container py-5 min-vh-100 d-flex flex-column justify-content-center">
      <div className="row justify-content-center">
        <div className="col-12 col-lg-8">
          <div className="card premium-card border-0 p-4 p-md-5 animated-fade-in shadow">
            {error && (
              <div className="alert alert-danger border-0 rounded-3 small mb-4 d-flex align-items-center py-2" role="alert">
                <i className="bi bi-exclamation-triangle-fill me-2 fs-5"></i>
                <div>{error}</div>
              </div>
            )}

            {/* STEP 1: Domain Selection Page */}
            {step === 1 && (
              <div>
                <div className="text-center mb-5">
                  <h2 className="fw-extrabold text-dark mb-2">Choose Your Business Type</h2>
                  <p className="text-muted small">
                    Select the category that best matches your business to choose select your operational options.
                  </p>
                </div>
                
                <div className="row g-3 justify-content-center mb-5">
                  {domains.map((dom) => {
                    const isSelected = formData.domain === dom.name;
                    return (
                      <div className="col-6 col-md-3" key={dom.name}>
                        <div
                          className={`domain-card h-100 border p-4 text-center d-flex flex-column align-items-center justify-content-center`}
                          style={{ 
                            cursor: 'pointer', 
                            borderRadius: '16px', 
                            minHeight: '110px',
                            transition: 'all 0.3s ease',
                            borderColor: isSelected ? dom.color : '#e2e8f0',
                            backgroundColor: isSelected ? dom.bg : '#ffffff',
                            boxShadow: isSelected ? `0 0 12px ${dom.color}33` : 'none'
                          }}
                          onClick={() => selectDomain(dom.name)}
                        >
                          <div 
                            className="domain-icon mb-2 d-flex align-items-center justify-content-center rounded-circle" 
                            style={{ 
                              fontSize: '1.8rem',
                              color: dom.color,
                              width: '56px',
                              height: '56px',
                              backgroundColor: `${dom.color}15`
                            }}
                          >
                            <i className={`bi ${dom.icon}`}></i>
                          </div>
                          <h6 className="fw-bold mb-0 text-dark small">{dom.name}</h6>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* STEP 2: Business Information Page */}
            {step === 2 && (
              <div className="mb-5">
                <div className="text-center mb-5">
                  <h2 className="fw-extrabold text-dark mb-2">Business Information</h2>
                  <p className="text-muted small">Provide the official details of your organization to setup your primary profile.</p>
                </div>

                <div className="row g-3">
                  <div className="col-md-6">
                    <label className="form-label small fw-semibold text-muted">Business Name *</label>
                    <input
                      type="text"
                      name="businessName"
                      className="form-control form-control-custom"
                      placeholder="e.g. Sri Krishna Hospital"
                      value={formData.businessName}
                      onChange={handleInputChange}
                      required
                    />
                  </div>
                  <div className="col-md-6">
                    <label className="form-label small fw-semibold text-muted">Domain *</label>
                    <select
                      name="domain"
                      className="form-select form-control-custom bg-white"
                      value={formData.domain}
                      onChange={handleInputChange}
                    >
                      <option value="">Select Domain</option>
                      <option value="Health Care">Health Care</option>
                      <option value="Banking">Banking</option>
                      <option value="Salon">Salon</option>
                      <option value="Eating">Eating</option>
                      <option value="Services">Services</option>
                      <option value="Beauty">Beauty</option>
                      <option value="Diagnostics">Diagnostics</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>
                  <div className="col-md-6">
                    <label className="form-label small fw-semibold text-muted">Owner Name *</label>
                    <input
                      type="text"
                      name="adminName"
                      className="form-control form-control-custom"
                      placeholder="e.g. Dr. Satya Sharma"
                      value={formData.adminName}
                      onChange={handleInputChange}
                      required
                    />
                  </div>
                  <div className="col-md-6">
                    <label className="form-label small fw-semibold text-muted">Mobile Number *</label>
                    <input
                      type="tel"
                      name="businessPhone"
                      className="form-control form-control-custom"
                      placeholder="e.g. +91 98765 43210"
                      value={formData.businessPhone}
                      onChange={handleInputChange}
                      required
                    />
                  </div>
                  <div className="col-12">
                    <label className="form-label small fw-semibold text-muted">Email Address (Login ID) *</label>
                    <input
                      type="email"
                      name="businessEmail"
                      className="form-control form-control-custom"
                      placeholder="e.g. contact@srikrishnahospital.com"
                      value={formData.businessEmail}
                      onChange={handleInputChange}
                      required
                    />
                  </div>
                  <div className="col-md-6">
                    <label className="form-label small fw-semibold text-muted">Create Password *</label>
                    <input
                      type="password"
                      name="password"
                      className="form-control form-control-custom"
                      placeholder="Min. 6 characters"
                      value={formData.password}
                      onChange={handleInputChange}
                      required
                    />
                  </div>
                  <div className="col-md-6">
                    <label className="form-label small fw-semibold text-muted">Confirm Password *</label>
                    <input
                      type="password"
                      name="confirmPassword"
                      className="form-control form-control-custom"
                      placeholder="Repeat password"
                      value={formData.confirmPassword}
                      onChange={handleInputChange}
                      required
                    />
                  </div>
                </div>
              </div>
            )}

            {/* STEP 3: Location Details Page */}
            {step === 3 && (
              <div className="mb-5">
                <div className="text-center mb-5">
                  <h2 className="fw-extrabold text-dark mb-2">Business Location</h2>
                  <p className="text-muted small">
                    Configure your primary business operating address. This information will be visible to customers on the app and used for automated distance calculations.
                  </p>
                </div>

                <div className="row g-3">
                  <div className="col-12">
                    <label className="form-label small fw-semibold text-muted">Address *</label>
                    <textarea
                      name="address"
                      rows="3"
                      className="form-control form-control-custom"
                      placeholder="Flat No 201, Near Park avenue, Madhapur"
                      value={formData.address}
                      onChange={handleInputChange}
                      required
                    ></textarea>
                  </div>
                  <div className="col-md-6">
                    <label className="form-label small fw-semibold text-muted">Country *</label>
                    <select
                      name="country"
                      className="form-select form-control-custom bg-white"
                      value={formData.country}
                      onChange={handleInputChange}
                    >
                      <option value="India">India</option>
                      <option value="United States">United States</option>
                      <option value="Canada">Canada</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>
                  <div className="col-md-6">
                    <label className="form-label small fw-semibold text-muted">State *</label>
                    <select
                      name="state"
                      className="form-select form-control-custom bg-white"
                      value={formData.state}
                      onChange={handleInputChange}
                    >
                      <option value="Telangana">Telangana</option>
                      <option value="Andhra Pradesh">Andhra Pradesh</option>
                      <option value="Karnataka">Karnataka</option>
                      <option value="Maharashtra">Maharashtra</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>
                  <div className="col-md-6">
                    <label className="form-label small fw-semibold text-muted">City *</label>
                    <input
                      type="text"
                      name="city"
                      className="form-control form-control-custom"
                      value={formData.city}
                      onChange={handleInputChange}
                      required
                    />
                  </div>
                  <div className="col-md-6">
                    <label className="form-label small fw-semibold text-muted">Pincode *</label>
                    <input
                      type="text"
                      name="zipCode"
                      className="form-control form-control-custom"
                      placeholder="e.g. 500081"
                      value={formData.zipCode}
                      onChange={handleInputChange}
                      required
                    />
                  </div>
                  <div className="col-12">
                    <label className="form-label small fw-semibold text-muted">Google Maps Link</label>
                    <input
                      type="url"
                      name="mapsUrl"
                      className="form-control form-control-custom"
                      placeholder="https://maps.google.com/..."
                      value={formData.mapsUrl}
                      onChange={handleInputChange}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* STEP 4: Queue Configuration Page */}
            {step === 4 && (
              <div className="mb-5">
                <div className="text-center mb-5">
                  <h2 className="fw-extrabold text-dark mb-2">Queue Configuration</h2>
                  <p className="text-muted small">Define how your customer lineup behaves with your opening options.</p>
                </div>

                <div className="row g-3">
                  <div className="col-md-6">
                    <label className="form-label small fw-semibold text-muted">Queue Display Name *</label>
                    <input
                      type="text"
                      name="queueName"
                      className="form-control form-control-custom"
                      placeholder="e.g. General OPD Queue"
                      value={formData.queueName}
                      onChange={handleInputChange}
                      required
                    />
                  </div>
                  <div className="col-md-6">
                    <label className="form-label small fw-semibold text-muted">Average Turnaround / Service Time *</label>
                    <div className="input-group">
                      <input
                        type="number"
                        name="serviceTime"
                        min="1"
                        className="form-control form-control-custom"
                        value={formData.serviceTime}
                        onChange={handleInputChange}
                        required
                      />
                      <span className="input-group-text bg-white text-muted rounded-end-3">Min / Person</span>
                    </div>
                  </div>
                  <div className="col-md-6">
                    <label className="form-label small fw-semibold text-muted">Maximum Daily Tickets *</label>
                    <input
                      type="number"
                      name="maxDailyTickets"
                      className="form-control form-control-custom"
                      value={formData.maxDailyTickets}
                      onChange={handleInputChange}
                      required
                    />
                  </div>
                  <div className="col-md-6">
                    <label className="form-label small fw-semibold text-muted">Verification Before Turn</label>
                    <select
                      name="verificationTime"
                      className="form-select form-control-custom bg-white"
                      value={formData.verificationTime}
                      onChange={handleInputChange}
                    >
                      <option value="12 Minutes">12 Minutes</option>
                      <option value="15 Minutes">15 Minutes</option>
                      <option value="20 Minutes">20 Minutes</option>
                      <option value="None">None</option>
                    </select>
                  </div>
                  
                  <div className="col-12 mt-4">
                    <div className="form-check p-3 border rounded-3 bg-light d-flex align-items-center">
                      <input 
                        type="checkbox"
                        className="form-check-input ms-0 me-3"
                        style={{ transform: 'scale(1.2)', cursor: 'pointer' }}
                        id="notificationsCheck"
                        checked={formData.enableNotifications}
                        onChange={(e) => setFormData(prev => ({ ...prev, enableNotifications: e.target.checked }))}
                      />
                      <label className="form-check-label text-muted small" htmlFor="notificationsCheck" style={{ cursor: 'pointer' }}>
                        Customers will receive an SMS and active text line updates before their turn.
                      </label>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* STEP 5: Branding & Review Page (Visual Identity) */}
            {step === 5 && (
              <div className="mb-5">
                <div className="text-center mb-5">
                  <h2 className="fw-extrabold text-dark mb-2">Visual Identity</h2>
                  <p className="text-muted small">Smarter waiting, better service.</p>
                </div>

                <div className="row g-4">
                  {/* Logo upload */}
                  <div className="col-md-6">
                    <label className="form-label small fw-semibold text-muted d-block">Business Logo</label>
                    <div className="border border-dashed rounded-4 p-4 text-center bg-light position-relative" style={{ height: '140px', borderStyle: 'dashed', borderWidth: '2px' }}>
                      {!formData.logo ? (
                        <div className="d-flex flex-column align-items-center justify-content-center h-100">
                          <i className="bi bi-cloud-arrow-up text-primary fs-2 mb-1"></i>
                          <div className="small fw-bold">Drag & drop business logo</div>
                          <small className="text-muted" style={{ fontSize: '0.65rem' }}>PNG, JPG up to 1MB</small>
                          <input type="file" className="position-absolute top-0 start-0 w-100 h-100 opacity-0" style={{ cursor: 'pointer' }} accept="image/*" onChange={(e) => handleImageUpload(e, 'logo')} />
                        </div>
                      ) : (
                        <div className="position-relative h-100">
                          <img src={formData.logo} alt="Logo" className="img-thumbnail h-100 border-0" style={{ objectFit: 'contain' }} />
                          <button type="button" className="btn btn-danger btn-sm rounded-circle position-absolute top-0 end-0 m-1" onClick={() => handleRemoveImage('logo')}>
                            <i className="bi bi-x-lg"></i>
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Cover upload */}
                  <div className="col-md-6">
                    <label className="form-label small fw-semibold text-muted d-block">Business Cover Image</label>
                    <div className="border border-dashed rounded-4 p-4 text-center bg-light position-relative" style={{ height: '140px', borderStyle: 'dashed', borderWidth: '2px' }}>
                      {!formData.backgroundImage ? (
                        <div className="d-flex flex-column align-items-center justify-content-center h-100">
                          <i className="bi bi-cloud-arrow-up text-primary fs-2 mb-1"></i>
                          <div className="small fw-bold">Drag & drop business cover</div>
                          <small className="text-muted" style={{ fontSize: '0.65rem' }}>PNG, JPG up to 1MB</small>
                          <input type="file" className="position-absolute top-0 start-0 w-100 h-100 opacity-0" style={{ cursor: 'pointer' }} accept="image/*" onChange={(e) => handleImageUpload(e, 'backgroundImage')} />
                        </div>
                      ) : (
                        <div className="position-relative h-100">
                          <img src={formData.backgroundImage} alt="Cover" className="img-thumbnail h-100 border-0 w-100" style={{ objectFit: 'cover' }} />
                          <button type="button" className="btn btn-danger btn-sm rounded-circle position-absolute top-0 end-0 m-1" onClick={() => handleRemoveImage('backgroundImage')}>
                            <i className="bi bi-x-lg"></i>
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* STEP 6: Branding & Review Page (Success Screen) */}
            {step === 6 && (
              <div className="text-center py-4">
                <div className="bg-success bg-opacity-10 text-success rounded-circle d-inline-flex align-items-center justify-content-center mb-3" style={{ width: '64px', height: '64px' }}>
                  <i className="bi bi-check-lg fs-2"></i>
                </div>
                <h3 className="fw-extrabold text-dark mb-1">Business Profile Created Successfully!</h3>
                <p className="text-muted small mb-4">Your business is now ready to manage smart digital queues with Tokenz.</p>

                {/* Profile Card in center */}
                <div className="row justify-content-center mb-4">
                  <div className="col-md-10">
                    <div className="card border p-4 bg-white text-start shadow-sm rounded-4">
                      <div className="d-flex justify-content-between align-items-start mb-3">
                        <div>
                          <h4 className="fw-extrabold text-dark mb-0">{formData.businessName}</h4>
                          <span className="badge bg-primary-subtle text-primary text-uppercase rounded-pill fw-bold px-2.5 py-1 mt-1" style={{ fontSize: '0.6rem' }}>
                            {formData.domain}
                          </span>
                        </div>
                        <span className="badge bg-success text-white rounded-pill px-3 py-1 fw-semibold small">
                          <i className="bi bi-circle-fill me-1 small animate-pulse"></i> Active
                        </span>
                      </div>
                      
                      <div className="row g-2 border-top pt-3 small text-muted">
                        <div className="col-4">
                          <span className="d-block small">Location</span>
                          <strong className="text-dark">{formData.city}, {formData.state.substring(0, 2).toUpperCase()}</strong>
                        </div>
                        <div className="col-4 border-start ps-3">
                          <span className="d-block small">Business Hours</span>
                          <strong className="text-dark">{formData.startTime} AM - {formData.endTime} PM</strong>
                        </div>
                        <div className="col-4 border-start ps-3">
                          <span className="d-block small">Configuration</span>
                          <strong className="text-primary"><i className="bi bi-qr-code me-1"></i> QR Ready</strong>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Verify status badges */}
                <div className="d-flex justify-content-center flex-wrap gap-2 mb-5">
                  <span className="badge bg-light text-dark border px-3 py-2 rounded-pill small fw-bold">
                    <i className="bi bi-check-circle-fill text-success me-1"></i> Business Registered
                  </span>
                  <span className="badge bg-light text-dark border px-3 py-2 rounded-pill small fw-bold">
                    <i className="bi bi-check-circle-fill text-success me-1"></i> Location Verified
                  </span>
                  <span className="badge bg-light text-dark border px-3 py-2 rounded-pill small fw-bold">
                    <i className="bi bi-check-circle-fill text-success me-1"></i> Queue Configured
                  </span>
                  <span className="badge bg-light text-dark border px-3 py-2 rounded-pill small fw-bold">
                    <i className="bi bi-check-circle-fill text-success me-1"></i> Notifications Enabled
                  </span>
                </div>

                <button
                  type="button"
                  className="btn btn-primary btn-premium px-5 py-3 fs-6 fw-bold border-0 bg-primary bg-gradient shadow-sm"
                  onClick={() => navigate('/admin/dashboard')}
                >
                  Go To Dashboard <i className="bi bi-arrow-right-short ms-1 fs-5"></i>
                </button>
              </div>
            )}

            {/* Bottom Progress Dashes (Centred above footer nav buttons) */}
            {step < 6 && (
              <div className="d-flex justify-content-center gap-2 mb-4">
                {[1, 2, 3, 4, 5].map((i) => (
                  <div 
                    key={i} 
                    className="rounded-pill" 
                    style={{ 
                      width: '28px', 
                      height: '6px', 
                      backgroundColor: step === i ? '#3b82f6' : '#cbd5e1',
                      transition: 'background-color 0.3s ease'
                    }}
                  ></div>
                ))}
              </div>
            )}

            {/* Stepper Navigation Buttons */}
            {step < 6 && (
              <div className="d-flex justify-content-between align-items-center pt-2">
                {step > 1 ? (
                  <button
                    type="button"
                    className="btn btn-outline-secondary btn-premium px-4"
                    onClick={prevStep}
                    disabled={loading}
                  >
                    <i className="bi bi-chevron-left me-1"></i> Back
                  </button>
                ) : (
                  <Link to="/login" className="btn btn-link text-muted small text-decoration-none">
                    Already registered? Log in
                  </Link>
                )}

                <button
                  type="button"
                  className="btn btn-premium btn-premium-primary px-4 d-flex align-items-center"
                  onClick={nextStep}
                  disabled={loading}
                >
                  {loading ? (
                    <>
                      <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                      Submitting...
                    </>
                  ) : (
                    <>
                      {step === 5 ? 'Finish' : 'Next'} 
                      <i className="bi bi-chevron-right ms-1"></i>
                    </>
                  )}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default SignupWizard;
