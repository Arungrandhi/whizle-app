import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import socket from '../../socket';
import { api } from '../../context/AuthContext';
import { countryData } from '../../utils/locationData';

// Configurable placements constant
const AD_PLACEMENTS = [
  { id: 'HOME_1', label: 'Home Page 1' },
  { id: 'HOME_2', label: 'Home Page 2' },
  { id: 'SIDEBAR', label: 'Sidebar Ads' },
  { id: 'FOOTER', label: 'Footer Banners' }
];

const SuperAdminAds = () => {
  const [ads, setAds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Filtering states
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL'); // ALL, ACTIVE, INACTIVE
  const [placementFilter, setPlacementFilter] = useState('ALL'); // ALL, HOME_1, HOME_2, etc.
  const [targetFilter, setTargetFilter] = useState('ALL'); // ALL, GLOBAL, REGIONAL

  // Unified modal state
  const [showModal, setShowModal] = useState(false);
  const [editId, setEditId] = useState(null); // null = Create Mode, otherwise Edit Mode
  const [uploading, setUploading] = useState(false);

  // Form states
  const [adName, setAdName] = useState('');
  const [adUrl, setAdUrl] = useState('');
  const [adFile, setAdFile] = useState(''); // Base64 or existing path
  const [adPositions, setAdPositions] = useState([]); // Selected placements IDs/Labels
  const [targetingType, setTargetingType] = useState('GLOBAL');
  const [selectedLocations, setSelectedLocations] = useState([]);

  // Location selector intermediate states
  const [selectedCountryCode, setSelectedCountryCode] = useState('');
  const [selectedStateCode, setSelectedStateCode] = useState('');
  const [selectedCityName, setSelectedCityName] = useState('');

  // Expandable regional targeting on cards
  const [expandedAdIds, setExpandedAdIds] = useState({});

  // Redundancy and logical normalization logic
  const isRedundant = (newLoc, existingLocs) => {
    for (const loc of existingLocs) {
      if (loc.targetingLevel === 'COUNTRY' && loc.countryCode === newLoc.countryCode) {
        return true;
      }
      if (loc.targetingLevel === 'STATE' && 
          loc.countryCode === newLoc.countryCode && 
          loc.stateCode === newLoc.stateCode) {
        return true;
      }
      if (loc.countryCode === newLoc.countryCode && 
          loc.stateCode === newLoc.stateCode && 
          loc.cityName === newLoc.cityName) {
        return true;
      }
    }
    return false;
  };

  const addAndNormalize = (newLoc, existingLocs) => {
    if (isRedundant(newLoc, existingLocs)) {
      return { success: false, message: 'This location is already covered by a broader target in your list!' };
    }

    let normalized = [...existingLocs];
    if (newLoc.targetingLevel === 'COUNTRY') {
      normalized = normalized.filter(loc => loc.countryCode !== newLoc.countryCode);
    } else if (newLoc.targetingLevel === 'STATE') {
      normalized = normalized.filter(loc => !(loc.countryCode === newLoc.countryCode && loc.stateCode === newLoc.stateCode));
    }

    normalized.push(newLoc);
    return { success: true, list: normalized };
  };

  const handleAddLocation = () => {
    if (!selectedCountryCode) {
      alert('Please select a country.');
      return;
    }

    const countryObj = countryData.find(c => c.code === selectedCountryCode);
    const countryName = countryObj ? countryObj.name : selectedCountryCode;

    let newLoc = {};

    if (!selectedStateCode || selectedStateCode === '') {
      // Entire Country
      newLoc = {
        countryCode: selectedCountryCode,
        countryName,
        targetingLevel: 'COUNTRY'
      };
    } else {
      const stateObj = countryObj.states.find(s => s.code === selectedStateCode);
      const stateName = stateObj ? stateObj.name : selectedStateCode;

      if (!selectedCityName || selectedCityName === '') {
        // Entire State
        newLoc = {
          countryCode: selectedCountryCode,
          countryName,
          stateCode: selectedStateCode,
          stateName,
          targetingLevel: 'STATE'
        };
      } else {
        // Specific City
        newLoc = {
          countryCode: selectedCountryCode,
          countryName,
          stateCode: selectedStateCode,
          stateName,
          cityName: selectedCityName,
          targetingLevel: 'CITY'
        };
      }
    }

    const res = addAndNormalize(newLoc, selectedLocations);
    if (!res.success) {
      alert(res.message);
    } else {
      setSelectedLocations(res.list);
      // Reset state & city but preserve country for faster multi-entry
      setSelectedStateCode('');
      setSelectedCityName('');
    }
  };

  const renderLocationLabel = (loc) => {
    if (loc.targetingLevel === 'COUNTRY') {
      return `${loc.countryName} (Entire)`;
    } else if (loc.targetingLevel === 'STATE') {
      return `${loc.stateName}, ${loc.countryName} (All)`;
    } else {
      return `${loc.cityName}, ${loc.stateName}, ${loc.countryName}`;
    }
  };

  const fetchAds = async () => {
    try {
      const res = await api.get('/superadmin/ads');
      if (res.data.success) {
        setAds(res.data.ads);
      }
    } catch (err) {
      console.error('Error loading ads', err);
      setError('Could not fetch advertising campaigns.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setLoading(true);
    fetchAds();
  }, []);

  // Socket listener for real-time updates
  useEffect(() => {
    socket.emit('joinSuperAdmin');
    const handleUpdate = () => {
      fetchAds();
    };
    socket.on('adsUpdated', handleUpdate);
    return () => {
      socket.off('adsUpdated', handleUpdate);
    };
  }, []);

  const handleImageFile = (file) => {
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        alert('Banner image size must be less than 2MB');
        return;
      }
      if (!file.type.startsWith('image/')) {
        alert('File must be an image');
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setAdFile(reader.result); // Base64 encoding
      };
      reader.readAsDataURL(file);
    }
  };

  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    handleImageFile(file);
  };

  const handleOpenCreateModal = () => {
    setEditId(null);
    setAdName('');
    setAdUrl('');
    setAdFile('');
    setAdPositions(['Home Page 1']); // Default selection
    setTargetingType('GLOBAL');
    setSelectedLocations([]);
    setSelectedCountryCode('');
    setSelectedStateCode('');
    setSelectedCityName('');
    setError('');
    setSuccess('');
    setShowModal(true);
  };

  const handleOpenEditModal = (ad) => {
    setEditId(ad._id);
    setAdName(ad.name);
    setAdUrl(ad.url);
    setAdFile(''); // Keep empty, user can optionally upload new image
    setAdPositions(ad.positions || (ad.position ? [ad.position] : []));
    setTargetingType(ad.targeting?.type || 'GLOBAL');
    setSelectedLocations(ad.targeting?.locations || []);
    setSelectedCountryCode('');
    setSelectedStateCode('');
    setSelectedCityName('');
    setError('');
    setSuccess('');
    setShowModal(true);
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    if (!adName || !adUrl) {
      alert('Please fill in Campaign Name and Redirect URL.');
      return;
    }
    if (!editId && !adFile) {
      alert('Please upload a banner image.');
      return;
    }
    if (adPositions.length === 0) {
      alert('Please select at least one ad placement.');
      return;
    }
    if (targetingType === 'REGIONAL' && selectedLocations.length === 0) {
      alert('Regional targeting requires at least one location.');
      return;
    }

    setUploading(true);
    setError('');
    setSuccess('');

    try {
      const payload = {
        name: adName,
        positions: adPositions,
        url: adUrl,
        targeting: {
          type: targetingType,
          locations: selectedLocations
        }
      };

      if (adFile) {
        payload.file = adFile;
      }

      let res;
      if (editId) {
        res = await api.put(`/superadmin/ads/${editId}`, payload);
      } else {
        res = await api.post('/superadmin/ads', payload);
      }

      if (res.data.success) {
        setSuccess(`Ad campaign "${adName}" ${editId ? 'updated' : 'launched'} successfully!`);
        setShowModal(false);
        fetchAds();
      }
    } catch (err) {
      console.error('Error saving campaign', err);
      setError(err.response?.data?.message || 'Failed to save advertising campaign.');
    } finally {
      setUploading(false);
    }
  };

  const handleToggleAd = async (id, name) => {
    setError('');
    setSuccess('');
    try {
      const res = await api.put(`/superadmin/ads/${id}/toggle`);
      if (res.data.success) {
        setSuccess(`Campaign "${name}" status updated.`);
        fetchAds();
      }
    } catch (err) {
      console.error('Error toggling ad status', err);
      setError('Failed to toggle status.');
    }
  };

  const handleDeleteAd = async (id, name) => {
    if (!window.confirm(`Are you sure you want to permanently delete campaign "${name}"?`)) return;
    setError('');
    setSuccess('');
    try {
      const res = await api.delete(`/superadmin/ads/${id}`);
      if (res.data.success) {
        setSuccess(`Campaign "${name}" has been deleted.`);
        fetchAds();
      }
    } catch (err) {
      console.error('Error deleting ad', err);
      setError('Failed to delete campaign.');
    }
  };

  const handleTogglePlacement = (placementLabel) => {
    if (adPositions.includes(placementLabel)) {
      setAdPositions(adPositions.filter(p => p !== placementLabel));
    } else {
      setAdPositions([...adPositions, placementLabel]);
    }
  };

  const toggleExpandLocations = (adId) => {
    setExpandedAdIds(prev => ({
      ...prev,
      [adId]: !prev[adId]
    }));
  };

  // Intermediate helper for dynamic button text
  const getAddLocationButtonText = () => {
    if (!selectedCountryCode) return 'Location';
    const countryObj = countryData.find(c => c.code === selectedCountryCode);
    const countryName = countryObj ? countryObj.name : selectedCountryCode;

    if (!selectedStateCode) return `Entire ${countryName}`;
    const stateObj = countryObj.states.find(s => s.code === selectedStateCode);
    const stateName = stateObj ? stateObj.name : selectedStateCode;

    if (!selectedCityName) return `Entire ${stateName}`;
    return `${selectedCityName}`;
  };

  // Metrics calculations
  const totalAds = ads.length;
  const activeAds = ads.filter(ad => ad.isActive).length;
  const totalViews = ads.reduce((sum, ad) => sum + (ad.views || 0), 0);
  const totalClicks = ads.reduce((sum, ad) => sum + (ad.clicks || 0), 0);
  const overallCTR = totalViews > 0 ? ((totalClicks / totalViews) * 100).toFixed(1) : '0.0';

  // Filter lists in memory
  const filteredAds = ads.filter(ad => {
    // 1. Search text
    if (searchTerm) {
      const query = searchTerm.toLowerCase();
      if (!ad.name.toLowerCase().includes(query) && !ad.url.toLowerCase().includes(query)) {
        return false;
      }
    }

    // 2. Status
    if (statusFilter === 'ACTIVE' && !ad.isActive) return false;
    if (statusFilter === 'INACTIVE' && ad.isActive) return false;

    // 3. Placement
    if (placementFilter !== 'ALL') {
      const matches = ad.positions.some(pos => {
        const pObj = AD_PLACEMENTS.find(p => p.id === placementFilter);
        return pObj && (pos === pObj.label || pos === pObj.id);
      });
      if (!matches) return false;
    }

    // 4. Target type
    if (targetFilter === 'GLOBAL' && ad.targeting?.type !== 'GLOBAL') return false;
    if (targetFilter === 'REGIONAL' && ad.targeting?.type !== 'REGIONAL') return false;

    return true;
  });

  if (loading) {
    return (
      <div className="d-flex justify-content-center align-items-center py-5" style={{ minHeight: '350px' }}>
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Loading...</span>
        </div>
      </div>
    );
  }

  // Country Selection Objects
  const countryObj = countryData.find(c => c.code === selectedCountryCode);
  const stateObj = countryObj?.states.find(s => s.code === selectedStateCode);

  return (
    <div className="animated-fade-in container-fluid px-0">
      
      {/* HEADER SECTION */}
      <div className="d-flex flex-column flex-sm-row justify-content-between align-items-start align-items-sm-center mb-4 gap-3">
        <div>
          <h1 className="fw-extrabold text-dark mb-1" style={{ fontSize: '1.75rem', letterSpacing: '-0.025em' }}>
            Advertisement Management
          </h1>
          <p className="text-muted small mb-0">Manage banner advertisements, placements and regional targeting.</p>
        </div>
        
        <button 
          className="btn btn-premium px-4 py-2 text-white bg-purple bg-gradient border-0 d-flex align-items-center gap-2 shadow-sm"
          style={{ backgroundColor: '#6f42c1', borderRadius: '10px', fontWeight: '600' }}
          onClick={handleOpenCreateModal}
        >
          <i className="bi bi-plus-circle-fill"></i>
          <span>Create Advertisement</span>
        </button>
      </div>

      {/* METRICS CARDS SECTION */}
      <div className="row g-3 mb-4">
        {/* Total Ads Card */}
        <div className="col-12 col-sm-6 col-lg-3">
          <div className="card border-0 bg-white shadow-sm p-4 rounded-4 h-100 position-relative overflow-hidden border-start border-primary border-4">
            <div className="d-flex align-items-center justify-content-between">
              <div>
                <span className="text-muted small fw-bold text-uppercase d-block mb-1" style={{ letterSpacing: '0.04em', fontSize: '0.72rem' }}>Total Ads</span>
                <h2 className="fw-black text-dark mb-0 font-monospace">{totalAds}</h2>
              </div>
              <div className="bg-primary bg-opacity-10 text-primary rounded-4 p-3 d-flex align-items-center justify-content-center" style={{ width: '52px', height: '52px' }}>
                <i className="bi bi-megaphone fs-3"></i>
              </div>
            </div>
          </div>
        </div>

        {/* Active Ads Card */}
        <div className="col-12 col-sm-6 col-lg-3">
          <div className="card border-0 bg-white shadow-sm p-4 rounded-4 h-100 position-relative overflow-hidden border-start border-success border-4">
            <div className="d-flex align-items-center justify-content-between">
              <div>
                <span className="text-muted small fw-bold text-uppercase d-block mb-1" style={{ letterSpacing: '0.04em', fontSize: '0.72rem' }}>Active Ads</span>
                <h2 className="fw-black text-success mb-0 font-monospace">{activeAds}</h2>
              </div>
              <div className="bg-success bg-opacity-10 text-success rounded-4 p-3 d-flex align-items-center justify-content-center" style={{ width: '52px', height: '52px' }}>
                <i className="bi bi-check-circle fs-3"></i>
              </div>
            </div>
          </div>
        </div>

        {/* Total Views Card */}
        <div className="col-12 col-sm-6 col-lg-3">
          <div className="card border-0 bg-white shadow-sm p-4 rounded-4 h-100 position-relative overflow-hidden border-start border-info border-4">
            <div className="d-flex align-items-center justify-content-between">
              <div>
                <span className="text-muted small fw-bold text-uppercase d-block mb-1" style={{ letterSpacing: '0.04em', fontSize: '0.72rem' }}>Total Views</span>
                <h2 className="fw-black text-dark mb-0 font-monospace">{totalViews.toLocaleString()}</h2>
              </div>
              <div className="bg-info bg-opacity-10 text-info rounded-4 p-3 d-flex align-items-center justify-content-center" style={{ width: '52px', height: '52px' }}>
                <i className="bi bi-eye fs-3"></i>
              </div>
            </div>
          </div>
        </div>

        {/* Total Clicks & CTR Card */}
        <div className="col-12 col-sm-6 col-lg-3">
          <div className="card border-0 bg-white shadow-sm p-4 rounded-4 h-100 position-relative overflow-hidden border-start border-purple border-4" style={{ borderLeftColor: '#6f42c1 !important' }}>
            <div className="d-flex align-items-center justify-content-between">
              <div>
                <span className="text-muted small fw-bold text-uppercase d-block mb-1" style={{ letterSpacing: '0.04em', fontSize: '0.72rem' }}>Clicks & CTR</span>
                <h2 className="fw-black text-purple mb-0 font-monospace" style={{ color: '#6f42c1' }}>
                  {totalClicks.toLocaleString()} <span className="text-muted fw-normal" style={{ fontSize: '0.95rem' }}>({overallCTR}%)</span>
                </h2>
              </div>
              <div className="bg-purple bg-opacity-10 text-purple rounded-4 p-3 d-flex align-items-center justify-content-center" style={{ width: '52px', height: '52px', backgroundColor: '#f3ebff', color: '#6f42c1' }}>
                <i className="bi bi-hand-index-thumb fs-3"></i>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ALERTS */}
      {success && (
        <div className="alert alert-success border-0 rounded-3 small mb-4 py-3 shadow-sm d-flex align-items-center animate-fade-in" role="alert">
          <i className="bi bi-check-circle-fill me-2 fs-5 text-success"></i>
          <span className="fw-semibold text-dark">{success}</span>
          <button type="button" className="btn-close ms-auto small py-1" onClick={() => setSuccess('')}></button>
        </div>
      )}

      {error && (
        <div className="alert alert-danger border-0 rounded-3 small mb-4 py-3 shadow-sm d-flex align-items-center animate-fade-in" role="alert">
          <i className="bi bi-exclamation-triangle-fill me-2 fs-5 text-danger"></i>
          <span className="fw-semibold text-dark">{error}</span>
          <button type="button" className="btn-close ms-auto small py-1" onClick={() => setError('')}></button>
        </div>
      )}

      {/* TOOLBAR FILTERS SECTION */}
      <div className="card border-0 bg-white shadow-sm rounded-4 p-3 mb-4">
        <div className="row g-3">
          {/* Search bar */}
          <div className="col-12 col-md-4">
            <div className="input-group" style={{ height: '44px' }}>
              <span className="input-group-text bg-light border-0 text-muted px-3">
                <i className="bi bi-search"></i>
              </span>
              <input 
                type="text" 
                className="form-control bg-light border-0 py-2 small" 
                placeholder="Search campaigns by name or URL..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>

          {/* Status filter */}
          <div className="col-12 col-sm-4 col-md-2">
            <select 
              className="form-select bg-light border-0 px-3 small"
              style={{ height: '44px' }}
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="ALL">All Statuses</option>
              <option value="ACTIVE">Active</option>
              <option value="INACTIVE">Inactive</option>
            </select>
          </div>

          {/* Placement filter */}
          <div className="col-12 col-sm-4 col-md-3">
            <select 
              className="form-select bg-light border-0 px-3 small"
              style={{ height: '44px' }}
              value={placementFilter}
              onChange={(e) => setPlacementFilter(e.target.value)}
            >
              <option value="ALL">All Placements</option>
              {AD_PLACEMENTS.map(p => (
                <option key={p.id} value={p.id}>{p.label}</option>
              ))}
            </select>
          </div>

          {/* Targeting Filter */}
          <div className="col-12 col-sm-4 col-md-3">
            <select 
              className="form-select bg-light border-0 px-3 small"
              style={{ height: '44px' }}
              value={targetFilter}
              onChange={(e) => setTargetFilter(e.target.value)}
            >
              <option value="ALL">All Targets</option>
              <option value="GLOBAL">Global Only</option>
              <option value="REGIONAL">Regional Only</option>
            </select>
          </div>
        </div>
      </div>

      {/* ADVERTISEMENT LIST (GRID LAYOUT) */}
      <div className="row g-4">
        {filteredAds.length > 0 ? (
          filteredAds.map((ad) => {
            const hasRegionalLocations = ad.targeting?.type === 'REGIONAL' && ad.targeting.locations?.length > 0;
            const isExpanded = !!expandedAdIds[ad._id];
            
            return (
              <div className="col-12 col-md-6 col-xl-4" key={ad._id}>
                <div className="card border-0 bg-white shadow-sm rounded-4 overflow-hidden h-100 d-flex flex-column justify-content-between card-hover transition-all">
                  <div>
                    {/* Image Banner Container */}
                    <div style={{ height: '165px', position: 'relative', overflow: 'hidden' }}>
                      <div 
                        className="w-100 h-100"
                        style={{
                          backgroundImage: `url(${ad.file})`,
                          backgroundSize: 'cover',
                          backgroundPosition: 'center',
                          backgroundColor: '#eaeaea'
                        }}
                      ></div>
                      
                      {/* Active/Inactive badge absolute */}
                      <span className={`badge rounded-pill position-absolute top-0 end-0 m-3 shadow-sm px-2 py-1 fw-bold ${ad.isActive ? 'bg-success text-white' : 'bg-secondary text-white'}`}>
                        {ad.isActive ? '● Active' : '● Inactive'}
                      </span>
                    </div>
                    
                    {/* Content Body */}
                    <div className="p-4">
                      <div className="d-flex justify-content-between align-items-start mb-2">
                        <div>
                          <h5 className="fw-bold text-dark mb-1 text-truncate" style={{ maxWidth: '270px' }} title={ad.name}>
                            {ad.name}
                          </h5>
                          <a 
                            href={ad.url} 
                            target="_blank" 
                            rel="noopener noreferrer" 
                            className="text-primary small text-decoration-none d-inline-flex align-items-center gap-2 text-truncate"
                            style={{ fontSize: '0.78rem', fontWeight: '500' }}
                          >
                            <i className="bi bi-box-arrow-up-right small"></i>
                            {ad.url}
                          </a>
                        </div>
                      </div>

                      {/* Display Placements */}
                      <div className="mb-3 mt-3">
                        <span className="text-muted d-block small fw-bold mb-1.5" style={{ fontSize: '0.7rem', letterSpacing: '0.02em' }}>Placements:</span>
                        <div className="d-flex flex-wrap gap-2">
                          {ad.positions && ad.positions.map((pos, i) => (
                            <span key={i} className="badge bg-light text-dark border px-2 py-1 rounded-3 fw-semibold" style={{ fontSize: '0.68rem' }}>
                              {pos}
                            </span>
                          ))}
                        </div>
                      </div>

                      {/* Target Audience Display */}
                      <div className="mb-3 py-3 border-top border-bottom">
                        <div className="d-flex justify-content-between align-items-center">
                          <span className="text-muted small fw-bold" style={{ fontSize: '0.7rem' }}>Target Audience:</span>
                          {ad.targeting?.type === 'GLOBAL' ? (
                            <span className="badge bg-success-subtle text-success px-2 py-1 text-uppercase fw-bold" style={{ fontSize: '0.62rem' }}>Global</span>
                          ) : (
                            <span className="badge bg-info-subtle text-primary px-2 py-1 text-uppercase fw-bold" style={{ fontSize: '0.62rem' }}>Regional</span>
                          )}
                        </div>

                        {/* Interactive locations rendering */}
                        {hasRegionalLocations && (
                          <div className="mt-2 p-2 bg-light rounded-3">
                            <div className="d-flex align-items-center justify-content-between">
                              <span className="small text-dark fw-bold text-truncate" style={{ maxWidth: '210px', fontSize: '0.72rem' }}>
                                <i className="bi bi-geo-alt-fill text-danger me-1"></i>
                                {renderLocationLabel(ad.targeting.locations[0])}
                                {ad.targeting.locations.length > 1 && ` (+${ad.targeting.locations.length - 1} more)`}
                              </span>
                              <button 
                                className="btn btn-link btn-sm p-0 text-primary small text-decoration-none border-0 fw-bold"
                                style={{ fontSize: '0.72rem' }}
                                onClick={() => toggleExpandLocations(ad._id)}
                              >
                                {isExpanded ? 'Hide' : 'Expand'}
                              </button>
                            </div>

                            {/* Expanded list of locations */}
                            {isExpanded && (
                              <div className="mt-2 pt-2 border-top d-flex flex-wrap gap-1" style={{ maxHeight: '120px', overflowY: 'auto' }}>
                                {ad.targeting.locations.map((loc, idx) => (
                                  <span key={idx} className="badge bg-white text-dark border px-2 py-1 rounded-2" style={{ fontSize: '0.65rem', fontWeight: '500' }}>
                                    {renderLocationLabel(loc)}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Views/Clicks metrics row */}
                      <div className="row g-2 text-center text-muted bg-light rounded-3 py-2 px-1 mt-3" style={{ fontSize: '0.75rem' }}>
                        <div className="col-4 border-end">
                          <span className="d-block text-uppercase fw-bold mb-0.5 text-muted" style={{ fontSize: '0.6rem', letterSpacing: '0.04em' }}>Views</span>
                          <strong className="text-dark fs-6 font-monospace">{ad.views}</strong>
                        </div>
                        <div className="col-4 border-end">
                          <span className="d-block text-uppercase fw-bold mb-0.5 text-muted" style={{ fontSize: '0.6rem', letterSpacing: '0.04em' }}>Clicks</span>
                          <strong className="text-dark fs-6 font-monospace">{ad.clicks}</strong>
                        </div>
                        <div className="col-4">
                          <span className="d-block text-uppercase fw-bold mb-0.5 text-muted" style={{ fontSize: '0.6rem', letterSpacing: '0.04em' }}>CTR Ratio</span>
                          <strong className="text-purple fs-6 font-monospace" style={{ color: '#6f42c1' }}>
                            {ad.views > 0 ? ((ad.clicks / ad.views) * 100).toFixed(1) : 0}%
                          </strong>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Actions Footer */}
                  <div className="p-3 bg-light border-top d-flex align-items-center justify-content-between">
                    {/* Status switch toggle */}
                    <div className="form-check form-switch m-0 d-flex align-items-center gap-2">
                      <input 
                        className="form-check-input" 
                        type="checkbox"
                        id={`switch-${ad._id}`}
                        style={{ cursor: 'pointer' }}
                        checked={ad.isActive} 
                        onChange={() => handleToggleAd(ad._id, ad.name)}
                      />
                      <label className="form-check-label text-dark small fw-bold cursor-pointer" htmlFor={`switch-${ad._id}`}>
                        Enabled
                      </label>
                    </div>

                    {/* Edit/Delete actions */}
                    <div className="d-flex gap-2">
                      <button 
                        className="btn btn-outline-primary btn-sm rounded-pill px-3 py-1 fw-bold d-flex align-items-center gap-2 text-purple border-purple"
                        style={{ borderColor: '#6f42c1', color: '#6f42c1', fontSize: '0.72rem' }}
                        onClick={() => handleOpenEditModal(ad)}
                      >
                        <i className="bi bi-pencil-square"></i>
                        <span>Edit</span>
                      </button>
                      <button 
                        className="btn btn-outline-danger btn-sm rounded-pill px-3 py-1 fw-bold d-flex align-items-center gap-2"
                        style={{ fontSize: '0.72rem' }}
                        onClick={() => handleDeleteAd(ad._id, ad.name)}
                      >
                        <i className="bi bi-trash"></i>
                        <span>Delete</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        ) : (
          <div className="col-12 text-center py-5 text-muted bg-white rounded-4 border shadow-sm">
            <i className="bi bi- megaphone fs-1 text-muted opacity-50 d-block mb-2"></i>
            <span>No advertising campaigns match the selected filters.</span>
          </div>
        )}
      </div>

      {/* FIXED STRUCTURE: SCROLLABLE MODAL CARD */}
      {showModal && createPortal(
        <>
          <div className="modal-backdrop fade show" style={{ zIndex: 1040 }}></div>
          <div className="modal fade show d-block" tabIndex="-1" style={{ zIndex: 1050, overflowY: 'auto' }}>
            <div className="modal-dialog modal-dialog-centered" style={{ maxWidth: '1000px', width: '85%', margin: '1.75rem auto' }}>
              
              {/* Form is the modal-content card, ensuring everything wraps correctly */}
              <form onSubmit={handleFormSubmit} className="modal-content border-0 rounded-4 shadow-lg p-3">
                
                {/* Modal Header */}
                <div className="modal-header border-0 pb-2">
                  <div>
                    <h5 className="modal-title fw-extrabold text-dark" style={{ fontSize: '1.3rem', letterSpacing: '-0.02em' }}>
                      {editId ? 'Edit Ad Campaign' : 'Create Advertisement'}
                    </h5>
                    <p className="text-muted small mb-0 mt-0.5">
                      {editId ? 'Modify campaign parameters, positions, and locations.' : 'Launch a new banner campaign across multiple placements.'}
                    </p>
                  </div>
                  <button type="button" className="btn-close" onClick={() => setShowModal(false)}></button>
                </div>
                
                {/* Modal Body split columns */}
                <div className="modal-body py-2">
                  <div className="row g-4">
                    {/* LEFT COLUMN: Basic Info & Placement */}
                    <div className="col-12 col-md-6 border-end pe-md-4">
                      
                      {/* SECTION 1: BASIC INFORMATION */}
                      <div className="mb-4">
                        <div className="d-flex align-items-center gap-2 mb-3 border-bottom pb-2">
                          <span className="badge rounded-circle d-inline-flex align-items-center justify-content-center" style={{ width: '22px', height: '22px', backgroundColor: '#6f42c1', color: '#fff', fontSize: '0.75rem', fontWeight: 'bold' }}>1</span>
                          <h6 className="fw-bold text-dark mb-0" style={{ fontSize: '0.92rem' }}>Basic Information</h6>
                        </div>
                        
                        {/* Campaign Name */}
                        <div className="mb-3">
                          <label className="form-label small fw-bold text-muted mb-1">Campaign Name</label>
                          <input 
                            type="text" 
                            className="form-control form-control-custom bg-light border-0 py-2 small fw-semibold"
                            placeholder="e.g. Summer Haircut Promotion"
                            value={adName}
                            onChange={(e) => setAdName(e.target.value)}
                            required
                          />
                        </div>

                        {/* Redirect Landing URL */}
                        <div className="mb-3">
                          <label className="form-label small fw-bold text-muted mb-1">Redirect Landing URL</label>
                          <input 
                            type="url" 
                            className="form-control form-control-custom bg-light border-0 py-2 small fw-semibold"
                            placeholder="https://salon-promotions.com/summer"
                            value={adUrl}
                            onChange={(e) => setAdUrl(e.target.value)}
                            required
                          />
                        </div>

                        {/* Banner Image Upload */}
                        <div className="mb-3">
                          <label className="form-label small fw-bold text-muted mb-1">Banner Image File</label>
                          <div 
                            className="border border-dashed border-2 rounded-3 p-3 text-center bg-light position-relative"
                            style={{ borderColor: '#6f42c1', cursor: 'pointer' }}
                          >
                            <input 
                              type="file" 
                              className="position-absolute top-0 start-0 w-100 h-100 opacity-0"
                              style={{ cursor: 'pointer', zIndex: 5 }}
                              accept="image/*"
                              onChange={handleImageUpload}
                              required={!editId}
                            />
                            <i className="bi bi-cloud-arrow-up fs-2 text-purple mb-1 d-block" style={{ color: '#6f42c1' }}></i>
                            <span className="small d-block text-dark fw-bold">Click or drag banner file to upload</span>
                            <span className="text-muted d-block mt-0.5" style={{ fontSize: '0.65rem' }}>JPEG, PNG format (Max size: 2MB)</span>
                          </div>
                        </div>

                        {/* Image Preview */}
                        {adFile && (
                          <div className="mt-2 p-2 bg-light border rounded-3 text-center position-relative">
                            <img 
                              src={adFile} 
                              alt="Banner Preview" 
                              className="img-fluid rounded border" 
                              style={{ maxHeight: '110px', objectFit: 'contain' }}
                            />
                            <span className="badge bg-success rounded-pill position-absolute top-0 start-50 translate-middle shadow-sm fw-bold" style={{ fontSize: '0.65rem' }}>
                              New Image Selected
                            </span>
                          </div>
                        )}
                        
                        {editId && !adFile && (
                          <span className="text-muted small mt-1 d-block font-italic" style={{ fontSize: '0.68rem' }}>
                            * Retaining currently active banner. Select a new file only if you wish to overwrite it.
                          </span>
                        )}
                      </div>

                      {/* SECTION 2: AD PLACEMENTS */}
                      <div className="mb-3">
                        <div className="d-flex align-items-center gap-2 mb-3 border-bottom pb-2">
                          <span className="badge rounded-circle d-inline-flex align-items-center justify-content-center" style={{ width: '22px', height: '22px', backgroundColor: '#6f42c1', color: '#fff', fontSize: '0.75rem', fontWeight: 'bold' }}>2</span>
                          <h6 className="fw-bold text-dark mb-0" style={{ fontSize: '0.92rem' }}>Ad Placements</h6>
                        </div>
                        
                        <p className="text-muted small mb-2">Where should this advertisement appear? (Select one or many)</p>

                        <div className="row g-2">
                          {AD_PLACEMENTS.map((placement) => {
                            const isChecked = adPositions.includes(placement.label) || adPositions.includes(placement.id);
                            return (
                              <div className="col-6" key={placement.id}>
                                <div 
                                  className={`p-2.5 border rounded-3 d-flex align-items-center justify-content-between cursor-pointer transition-all ${isChecked ? 'border-purple bg-purple-subtle bg-opacity-10' : 'bg-white'}`}
                                  style={{ borderColor: isChecked ? '#6f42c1' : '#dee2e6', cursor: 'pointer' }}
                                  onClick={() => handleTogglePlacement(placement.label)}
                                >
                                  <span className="small fw-bold text-dark">{placement.label}</span>
                                  <div 
                                    className="rounded-circle d-flex align-items-center justify-content-center border"
                                    style={{ 
                                      width: '20px', 
                                      height: '20px', 
                                      backgroundColor: isChecked ? '#6f42c1' : 'transparent',
                                      borderColor: isChecked ? '#6f42c1' : '#dee2e6'
                                    }}
                                  >
                                    {isChecked && <i className="bi bi-check text-white" style={{ fontSize: '0.9rem' }}></i>}
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>

                        <div className="mt-3">
                          <span className="badge bg-purple-subtle text-purple px-3 py-1 rounded-pill small" style={{ backgroundColor: '#f3ebff', color: '#6f42c1', fontWeight: 'bold', fontSize: '0.72rem' }}>
                            {adPositions.length} placement{adPositions.length !== 1 ? 's' : ''} selected
                          </span>
                        </div>
                      </div>

                    </div>

                    {/* RIGHT COLUMN: Target Audience */}
                    <div className="col-12 col-md-6 ps-md-4">
                      
                      <div className="d-flex align-items-center gap-2 mb-3 border-bottom pb-2">
                        <span className="badge rounded-circle d-inline-flex align-items-center justify-content-center" style={{ width: '22px', height: '22px', backgroundColor: '#6f42c1', color: '#fff', fontSize: '0.75rem', fontWeight: 'bold' }}>3</span>
                        <h6 className="fw-bold text-dark mb-0" style={{ fontSize: '0.92rem' }}>Target Audience</h6>
                      </div>

                      {/* Large Radio Selection Cards */}
                      <div className="row g-2.5 mb-3">
                        {/* Global Radio Card */}
                        <div className="col-6">
                          <div 
                            className={`p-3 border rounded-4 cursor-pointer text-center h-100 d-flex flex-column justify-content-center align-items-center transition-all ${targetingType === 'GLOBAL' ? 'border-purple bg-purple-subtle bg-opacity-10 shadow-sm' : 'bg-white'}`}
                            style={{ borderColor: targetingType === 'GLOBAL' ? '#6f42c1' : '#dee2e6', borderWidth: '2px' }}
                            onClick={() => setTargetingType('GLOBAL')}
                          >
                            <div className="d-flex align-items-center gap-2 mb-1.5">
                              <i className={`bi bi-globe fs-5 ${targetingType === 'GLOBAL' ? 'text-purple' : 'text-muted'}`} style={{ color: targetingType === 'GLOBAL' ? '#6f42c1' : 'inherit' }}></i>
                              <div className="small fw-extrabold text-dark text-uppercase" style={{ fontSize: '0.72rem', letterSpacing: '0.04em' }}>Global</div>
                            </div>
                            <span className="text-muted d-block" style={{ fontSize: '0.68rem' }}>Show advertisement everywhere</span>
                          </div>
                        </div>

                        {/* Specific Locations Radio Card */}
                        <div className="col-6">
                          <div 
                            className={`p-3 border rounded-4 cursor-pointer text-center h-100 d-flex flex-column justify-content-center align-items-center transition-all ${targetingType === 'REGIONAL' ? 'border-purple bg-purple-subtle bg-opacity-10 shadow-sm' : 'bg-white'}`}
                            style={{ borderColor: targetingType === 'REGIONAL' ? '#6f42c1' : '#dee2e6', borderWidth: '2px' }}
                            onClick={() => setTargetingType('REGIONAL')}
                          >
                            <div className="d-flex align-items-center gap-2 mb-1.5">
                              <i className={`bi bi-geo-alt-fill fs-5 ${targetingType === 'REGIONAL' ? 'text-purple' : 'text-muted'}`} style={{ color: targetingType === 'REGIONAL' ? '#6f42c1' : 'inherit' }}></i>
                              <div className="small fw-extrabold text-dark text-uppercase" style={{ fontSize: '0.72rem', letterSpacing: '0.04em' }}>Specific Locations</div>
                            </div>
                            <span className="text-muted d-block" style={{ fontSize: '0.68rem' }}>Target specific countries/regions</span>
                          </div>
                        </div>
                      </div>

                      {/* Geographic Selectors Hierarchy */}
                      {targetingType === 'REGIONAL' && (
                        <div className="bg-light p-3 rounded-4 border mb-2 animate-fade-in">
                          
                          {/* selectors dropdowns */}
                          <div className="row g-2 mb-2">
                            {/* Country Selector */}
                            <div className="col-12">
                              <label className="form-label small text-muted fw-bold mb-1" style={{ fontSize: '0.68rem' }}>Country</label>
                              <select 
                                className="form-select form-select-sm border-0 shadow-sm py-2"
                                value={selectedCountryCode}
                                onChange={(e) => {
                                  setSelectedCountryCode(e.target.value);
                                  setSelectedStateCode('');
                                  setSelectedCityName('');
                                }}
                              >
                                <option value="">-- Select Country --</option>
                                {countryData.map(c => (
                                  <option key={c.code} value={c.code}>{c.name}</option>
                                ))}
                              </select>
                            </div>

                            {/* State Selector */}
                            <div className="col-6">
                              <label className="form-label small text-muted fw-bold mb-1" style={{ fontSize: '0.68rem' }}>State / Province</label>
                              <select 
                                className="form-select form-select-sm border-0 shadow-sm py-2"
                                disabled={!selectedCountryCode}
                                value={selectedStateCode}
                                onChange={(e) => {
                                  setSelectedStateCode(e.target.value);
                                  setSelectedCityName('');
                                }}
                              >
                                <option value="">[ All States / Entire Country ]</option>
                                {countryObj?.states?.map(s => (
                                  <option key={s.code} value={s.code}>{s.name}</option>
                                ))}
                              </select>
                            </div>

                            {/* City Selector */}
                            <div className="col-6">
                              <label className="form-label small text-muted fw-bold mb-1" style={{ fontSize: '0.68rem' }}>City</label>
                              <select 
                                className="form-select form-select-sm border-0 shadow-sm py-2"
                                disabled={!selectedStateCode || selectedStateCode === ''}
                                value={selectedCityName}
                                onChange={(e) => setSelectedCityName(e.target.value)}
                              >
                                <option value="">[ All Cities / Entire State ]</option>
                                {stateObj?.cities?.map(city => (
                                  <option key={city} value={city}>{city}</option>
                                ))}
                              </select>
                            </div>
                          </div>

                          {/* Add button */}
                          <button 
                            type="button" 
                            className="btn btn-sm btn-purple w-100 py-2 text-white border-0 fw-bold d-flex align-items-center justify-content-center gap-2 shadow-sm" 
                            style={{ backgroundColor: '#6f42c1', borderRadius: '8px', fontSize: '0.75rem' }}
                            onClick={handleAddLocation}
                            disabled={!selectedCountryCode}
                          >
                            <i className="bi bi-plus-lg"></i>
                            <span>Add {getAddLocationButtonText()}</span>
                          </button>

                          {/* Header of selected chips */}
                          <div className="mt-3 border-top pt-2 d-flex align-items-center justify-content-between">
                            <span className="small text-dark fw-bold" style={{ fontSize: '0.75rem' }}>
                              Targeted Areas ({selectedLocations.length})
                            </span>
                            {selectedLocations.length > 0 && (
                              <button 
                                type="button" 
                                className="btn btn-link btn-sm text-danger p-0 text-decoration-none border-0 fw-bold"
                                style={{ fontSize: '0.72rem' }}
                                onClick={() => setSelectedLocations([])}
                              >
                                Clear All
                              </button>
                            )}
                          </div>

                          {/* Chips Container */}
                          <div className="mt-2 d-flex flex-wrap gap-2 overflow-auto" style={{ maxHeight: '115px' }}>
                            {selectedLocations.length > 0 ? (
                              selectedLocations.map((loc, idx) => (
                                <span 
                                  key={idx} 
                                  className="d-inline-flex align-items-center gap-2 px-3 py-1 border animate-fade-in" 
                                  style={{ 
                                    fontSize: '0.72rem', 
                                    backgroundColor: '#f3ebff', 
                                    color: '#6f42c1',
                                    borderColor: '#dcd0ff',
                                    borderRadius: '20px', 
                                    fontWeight: '600' 
                                  }}
                                >
                                  <span>{renderLocationLabel(loc)}</span>
                                  <i 
                                    className="bi bi-x-lg cursor-pointer" 
                                    style={{ cursor: 'pointer', fontSize: '0.65rem' }}
                                    onClick={() => setSelectedLocations(selectedLocations.filter((_, i) => i !== idx))}
                                  ></i>
                                </span>
                              ))
                            ) : (
                              <span className="text-muted small italic" style={{ fontSize: '0.7rem' }}>
                                No specific target locations assigned yet. Select parameters and click add.
                              </span>
                            )}
                          </div>
                        </div>
                      )}

                    </div>
                  </div>

                  {/* SECTION 4: REVIEW SUMMARY (FULL WIDTH BOTTOM) */}
                  <div className="bg-light p-3 rounded-4 border mt-4 mb-1">
                    <div className="small fw-extrabold text-uppercase text-muted mb-2" style={{ fontSize: '0.65rem', letterSpacing: '0.05em' }}>
                      Ad Campaign Overview Summary
                    </div>
                    <div className="row g-2 text-dark font-medium" style={{ fontSize: '0.75rem' }}>
                      <div className="col-4 border-end">
                        <span className="text-muted d-block small" style={{ fontSize: '0.68rem' }}>Placements:</span>
                        <strong className={adPositions.length > 0 ? 'text-dark fw-bold' : 'text-danger'}>
                          {adPositions.length > 0 ? `${adPositions.length} placements selected` : 'None'}
                        </strong>
                      </div>
                      <div className="col-4 border-end">
                        <span className="text-muted d-block small" style={{ fontSize: '0.68rem' }}>Target Audience:</span>
                        <strong className="fw-bold">
                          {targetingType === 'GLOBAL' ? 'Global (Everywhere)' : `${selectedLocations.length} regional location(s)`}
                        </strong>
                      </div>
                      <div className="col-4">
                        <span className="text-muted d-block small" style={{ fontSize: '0.68rem' }}>Banner Image:</span>
                        <strong className={adFile || editId ? 'text-success fw-bold' : 'text-danger'}>
                          {adFile ? 'Ready (New image loaded)' : editId ? 'Active (Retaining current image)' : 'Not Uploaded'}
                        </strong>
                      </div>
                    </div>
                  </div>

                </div>

                {/* Modal Footer Actions */}
                <div className="modal-footer border-0 pt-2 d-flex gap-2 justify-content-end">
                  <button 
                    type="button" 
                    className="btn btn-outline-secondary py-2 rounded-3 fw-bold small px-4" 
                    onClick={() => setShowModal(false)}
                    disabled={uploading}
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit" 
                    className="btn btn-primary py-2 rounded-3 fw-bold bg-purple border-0 small px-5" 
                    style={{ backgroundColor: '#6f42c1' }} 
                    disabled={uploading}
                  >
                    {uploading ? (
                      <>
                        <span className="spinner-border spinner-border-sm me-1.5" role="status" aria-hidden="true"></span>
                        <span>Saving...</span>
                      </>
                    ) : editId ? 'Save Changes' : 'Create Advertisement'}
                  </button>
                </div>
              </form>
              
            </div>
          </div>
        </>,
        document.body
      )}
    </div>
  );
};

export default SuperAdminAds;
