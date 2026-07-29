import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import socket from '../../socket';
import { api } from '../../context/AuthContext';

const SuperAdminRingtones = () => {
  const [ringtones, setRingtones] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Upload modal states
  const [showModal, setShowModal] = useState(false);
  const [soundName, setSoundName] = useState('');
  const [soundFile, setSoundFile] = useState('');
  const [soundDuration, setSoundDuration] = useState('0:15 sec');
  const [isDefaultUpload, setIsDefaultUpload] = useState(false);
  const [uploading, setUploading] = useState(false);

  // Edit modal states
  const [showEditModal, setShowEditModal] = useState(false);
  const [editId, setEditId] = useState(null);
  const [editName, setEditName] = useState('');

  // Audio player states
  const [playingId, setPlayingId] = useState(null);
  const [currentTime, setCurrentTime] = useState(0);
  const [playbackDuration, setPlaybackDuration] = useState(0);
  const [audioRef, setAudioRef] = useState(null);

  const fetchRingtones = async () => {
    try {
      const res = await api.get('/superadmin/ringtones');
      if (res.data.success) {
        setRingtones(res.data.ringtones);
      }
    } catch (err) {
      console.error('Error fetching ringtones', err);
      setError('Could not retrieve ringtone sound records.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setLoading(true);
    fetchRingtones();
  }, []);

  // Socket listener for real-time ringtones updates
  useEffect(() => {
    socket.emit('joinSuperAdmin');

    const handleUpdate = () => {
      fetchRingtones();
    };

    socket.on('ringtonesUpdated', handleUpdate);

    return () => {
      socket.off('ringtonesUpdated', handleUpdate);
    };
  }, []);

  // Clean up audio on unmount
  useEffect(() => {
    return () => {
      if (audioRef) {
        audioRef.pause();
      }
    };
  }, [audioRef]);

  const handleAudioUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        setError('Audio file size must be less than 5MB');
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64 = reader.result;
        setSoundFile(base64);
        setError('');

        // Determine audio duration dynamically
        const audio = new Audio();
        audio.addEventListener('loadedmetadata', () => {
          const secs = Math.round(audio.duration);
          const minutes = Math.floor(secs / 60);
          const remainingSecs = secs % 60;
          const formattedDuration = `${minutes}:${remainingSecs < 10 ? '0' : ''}${remainingSecs} sec`;
          setSoundDuration(formattedDuration);
        });
        audio.src = base64;
      };
      reader.readAsDataURL(file);
    }
  };

  const handleCreateRingtone = async (e) => {
    e.preventDefault();
    if (!soundName || !soundFile) {
      setError('Please provide a name and select an audio file.');
      return;
    }

    setUploading(true);
    setError('');
    setSuccess('');
    try {
      const res = await api.post('/superadmin/ringtones', {
        name: soundName,
        file: soundFile,
        duration: soundDuration,
        isDefault: isDefaultUpload
      });
      if (res.data.success) {
        setSuccess(`Ringtone "${soundName}" uploaded successfully!`);
        setSoundName('');
        setSoundFile('');
        setSoundDuration('0:15 sec');
        setIsDefaultUpload(false);
        setShowModal(false);
        fetchRingtones();
      }
    } catch (err) {
      console.error('Error uploading ringtone', err);
      setError(err.response?.data?.message || 'Failed to upload ringtone.');
    } finally {
      setUploading(false);
    }
  };

  const handleToggleActive = async (id, name) => {
    setError('');
    setSuccess('');
    try {
      const res = await api.put(`/superadmin/ringtones/${id}/toggle`);
      if (res.data.success) {
        setSuccess(`Status changed for Ringtone "${name}".`);
        fetchRingtones();
      }
    } catch (err) {
      console.error('Error toggling status', err);
      setError('Failed to toggle status.');
    }
  };

  const handleSetDefault = async (id) => {
    setError('');
    setSuccess('');
    try {
      const res = await api.put(`/superadmin/ringtones/${id}/default`);
      if (res.data.success) {
        setSuccess('System default ringtone updated.');
        fetchRingtones();
      }
    } catch (err) {
      console.error('Error setting default ringtone', err);
      setError('Failed to update default ringtone.');
    }
  };

  const handleEditClick = (r) => {
    setEditId(r._id);
    setEditName(r.name);
    setShowEditModal(true);
  };

  const handleUpdateRingtone = async (e) => {
    e.preventDefault();
    if (!editName) return;
    setError('');
    setSuccess('');
    try {
      const res = await api.put(`/superadmin/ringtones/${editId}`, { name: editName });
      if (res.data.success) {
        setSuccess(`Ringtone name updated successfully!`);
        setShowEditModal(false);
        fetchRingtones();
      }
    } catch (err) {
      console.error('Error updating ringtone', err);
      setError('Failed to update ringtone.');
    }
  };

  const handleDelete = async (id, name) => {
    if (!window.confirm(`Delete ringtone "${name}"?`)) return;
    setError('');
    setSuccess('');
    
    // Stop playback if deleting the active playing ringtone
    if (playingId === id && audioRef) {
      audioRef.pause();
      setPlayingId(null);
    }
    
    try {
      const res = await api.delete(`/superadmin/ringtones/${id}`);
      if (res.data.success) {
        setSuccess(`Successfully deleted sound "${name}".`);
        fetchRingtones();
      }
    } catch (err) {
      console.error('Error deleting ringtone', err);
      setError('Failed to delete sound.');
    }
  };

  const handlePlayPause = (r) => {
    if (playingId === r._id) {
      if (audioRef) {
        audioRef.pause();
      }
      setPlayingId(null);
      setCurrentTime(0);
      return;
    }

    if (audioRef) {
      audioRef.pause();
    }

    const newAudio = new Audio(r.file);
    newAudio.play().catch(err => {
      console.error("Audio play failed", err);
      setError("Unable to play audio. Check file source.");
    });
    setAudioRef(newAudio);
    setPlayingId(r._id);
    setCurrentTime(0);

    newAudio.addEventListener('timeupdate', () => {
      setCurrentTime(newAudio.currentTime);
    });

    newAudio.addEventListener('loadedmetadata', () => {
      setPlaybackDuration(newAudio.duration);
    });

    newAudio.addEventListener('ended', () => {
      setPlayingId(null);
      setCurrentTime(0);
    });
  };

  const handleSeek = (e) => {
    const time = parseFloat(e.target.value);
    if (audioRef) {
      audioRef.currentTime = time;
      setCurrentTime(time);
    }
  };

  const formatTime = (timeInSecs) => {
    const minutes = Math.floor(timeInSecs / 60);
    const seconds = Math.floor(timeInSecs % 60);
    return `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
  };

  if (loading) {
    return (
      <div className="text-center py-5">
        <div className="spinner-border text-primary" role="status"></div>
      </div>
    );
  }

  return (
    <div className="animated-fade-in">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h1 className="fw-extrabold text-dark mb-1">Whistlez Ringtone</h1>
          <p className="text-muted small mb-0">Review system default and active audio sound files for broadcast counters.</p>
        </div>
        
        <button 
          className="btn btn-premium px-4 text-white bg-purple bg-gradient border-0"
          style={{ backgroundColor: '#6f42c1' }}
          onClick={() => setShowModal(true)}
        >
          Add New Ringtone
        </button>
      </div>

      {success && (
        <div className="alert alert-success border-0 rounded-3 small mb-4 py-2 shadow-sm" role="alert">
          <i className="bi bi-check-circle-fill me-2 fs-5"></i>
          <span>{success}</span>
        </div>
      )}

      {error && (
        <div className="alert alert-danger border-0 rounded-3 small mb-4 py-2 shadow-sm" role="alert">
          <i className="bi bi-exclamation-triangle-fill me-2 fs-5"></i>
          <span>{error}</span>
        </div>
      )}

      {/* Grid List of Sounds */}
      <div className="row g-4">
        {ringtones.length > 0 ? (
          ringtones.map((r) => (
            <div className="col-12 col-md-6" key={r._id}>
              <div className="card border-0 bg-white shadow-sm rounded-4 p-4 d-flex flex-column h-100 justify-content-between">
                
                {/* Top Section */}
                <div className="d-flex align-items-center justify-content-between">
                  <div className="d-flex align-items-center">
                    <div 
                      className="rounded-circle d-flex align-items-center justify-content-center me-3" 
                      style={{ 
                        width: '46px', 
                        height: '46px', 
                        backgroundColor: '#f3e8ff', 
                        color: '#6f42c1' 
                      }}
                    >
                      <i className="bi bi-music-note-beamed fs-5"></i>
                    </div>
                    <div>
                      <div className="d-flex align-items-center flex-wrap">
                        <h5 className="fw-bold text-dark mb-0">{r.name}</h5>
                        {r.isDefault && (
                          <span 
                            className="badge text-purple ms-2 px-2 py-1 rounded-pill" 
                            style={{ 
                              fontSize: '0.65rem', 
                              color: '#6f42c1', 
                              backgroundColor: '#f3e8ff', 
                              border: '1px solid #d8b4fe',
                              fontWeight: '700'
                            }}
                          >
                            DEFAULT
                          </span>
                        )}
                        {!r.isDefault && (
                          <button 
                            className="btn btn-link p-0 ms-2 text-decoration-none text-muted small fw-bold"
                            style={{ fontSize: '0.65rem' }}
                            onClick={() => handleSetDefault(r._id)}
                            title="Set as System Default"
                          >
                            (Set Default)
                          </button>
                        )}
                      </div>
                      <span className="text-muted small mt-1 d-block">
                        {playingId === r._id && playbackDuration ? `${formatTime(playbackDuration)} sec` : (r.duration || '0:15 sec')}
                      </span>
                    </div>
                  </div>

                  <div className="d-flex align-items-center gap-2">
                    <span 
                      className="small fw-semibold me-2" 
                      style={{ color: r.isActive ? '#198754' : '#6c757d' }}
                    >
                      {r.isActive ? 'Active' : 'Disabled'}
                    </span>
                    <div className="form-check form-switch m-0">
                      <input 
                        className="form-check-input" 
                        type="checkbox"
                        role="switch"
                        style={{ cursor: 'pointer', transform: 'scale(1.25)' }}
                        checked={r.isActive} 
                        onChange={() => handleToggleActive(r._id, r.name)}
                      />
                    </div>
                  </div>
                </div>

                <hr className="my-3 text-muted opacity-25" />

                {/* Bottom Section */}
                <div className="d-flex align-items-center justify-content-between">
                  {playingId === r._id ? (
                    <div className="d-flex align-items-center flex-grow-1 me-3">
                      <button
                        className="btn btn-primary btn-sm rounded-circle d-flex align-items-center justify-content-center p-0 border-0"
                        style={{ 
                          width: '32px', 
                          height: '32px', 
                          backgroundColor: '#6f42c1', 
                          color: '#fff' 
                        }}
                        onClick={() => handlePlayPause(r)}
                        title="Stop Playing"
                      >
                        <i className="bi bi-stop-fill fs-5"></i>
                      </button>
                      <span className="small text-dark fw-bold ms-2" style={{ fontSize: '0.75rem' }}>
                        {formatTime(currentTime)}
                      </span>
                      <input 
                        type="range" 
                        className="form-range flex-grow-1 mx-3" 
                        min="0" 
                        max={playbackDuration || 15} 
                        value={currentTime} 
                        onChange={handleSeek}
                        style={{
                          height: '4px',
                          accentColor: '#6f42c1',
                          cursor: 'pointer'
                        }}
                      />
                      <span className="small text-muted" style={{ fontSize: '0.75rem' }}>
                        {playingId === r._id && playbackDuration ? `${formatTime(playbackDuration)} sec` : (r.duration || '0:15 sec')}
                      </span>
                    </div>
                  ) : (
                    <button
                      className="btn btn-link p-0 d-flex align-items-center text-decoration-none"
                      style={{ color: '#6f42c1', fontWeight: '600' }}
                      onClick={() => handlePlayPause(r)}
                    >
                      <div 
                        className="rounded-circle d-flex align-items-center justify-content-center me-2" 
                        style={{ 
                          width: '32px', 
                          height: '32px', 
                          backgroundColor: '#6f42c1', 
                          color: '#fff' 
                        }}
                      >
                        <i className="bi bi-play-fill fs-5" style={{ marginLeft: '2px' }}></i>
                      </div>
                      Play
                    </button>
                  )}

                  <div className="d-flex align-items-center gap-2">
                    <button 
                      className="btn btn-outline-secondary btn-sm border-0 rounded-circle p-1.5"
                      title="Edit ringtone"
                      onClick={() => handleEditClick(r)}
                    >
                      <i className="bi bi-pencil fs-6 text-muted"></i>
                    </button>
                    <button 
                      className="btn btn-outline-danger btn-sm border-0 rounded-circle p-1.5"
                      title="Delete ringtone"
                      onClick={() => handleDelete(r._id, r.name)}
                    >
                      <i className="bi bi-trash fs-6 text-danger"></i>
                    </button>
                  </div>
                </div>

              </div>
            </div>
          ))
        ) : (
          <div className="col-12 text-center py-5 text-muted bg-white rounded-4 border shadow-sm">
            <i className="bi bi-music-note-list fs-1 mb-2 text-muted d-block"></i>
            No custom ringtones uploaded yet. Click "+ Add New Ringtone" above.
          </div>
        )}
      </div>

      {/* UPLOAD TICKET RINGTONE AUDIO MODAL */}
      {showModal && createPortal(
        <>
          <div className="modal-backdrop fade show" style={{ zIndex: 1040 }}></div>
          <div className="modal fade show d-block" tabIndex="-1" style={{ zIndex: 1050, overflowY: 'auto' }}>
            <div className="modal-dialog modal-dialog-centered">
              <div className="modal-content border-0 rounded-4 shadow-lg p-3">
                <div className="modal-header border-0 pb-0">
                  <h5 className="modal-title fw-extrabold text-dark">Add New Ringtone</h5>
                  <button type="button" className="btn-close" onClick={() => setShowModal(false)}></button>
                </div>
                
                <form onSubmit={handleCreateRingtone}>
                  <div className="modal-body py-3">
                    <div className="mb-3">
                      <label className="form-label small fw-semibold text-muted">Ringtone Name</label>
                      <input 
                        type="text" 
                        className="form-control form-control-custom"
                        placeholder="e.g. Siren Voice Alert"
                        value={soundName}
                        onChange={(e) => setSoundName(e.target.value)}
                        required
                      />
                    </div>
                    
                    <div className="mb-3">
                      <label className="form-label small fw-semibold text-muted">Audio File (.mp3, .wav)</label>
                      <input 
                        type="file" 
                        className="form-control form-control-custom"
                        accept="audio/*"
                        onChange={handleAudioUpload}
                        required
                      />
                      {soundFile && (
                        <div className="mt-2 text-success small">
                          <i className="bi bi-check-circle me-1"></i> Detected Duration: {soundDuration}
                        </div>
                      )}
                    </div>

                    <div className="form-check form-switch mb-2">
                      <input 
                        className="form-check-input" 
                        type="checkbox"
                        role="switch"
                        id="isDefaultUploadSwitch"
                        checked={isDefaultUpload}
                        onChange={(e) => setIsDefaultUpload(e.target.checked)}
                      />
                      <label className="form-check-label small fw-semibold text-muted" htmlFor="isDefaultUploadSwitch">
                        Set as Default Announcement Ringtone
                      </label>
                    </div>
                  </div>

                  <div className="modal-footer border-0 pt-0 d-flex gap-2">
                    <button type="button" className="btn btn-outline-secondary flex-grow-1 py-2.5 rounded-3" onClick={() => setShowModal(false)}>
                      Cancel
                    </button>
                    <button type="submit" className="btn btn-primary flex-grow-1 py-2.5 rounded-3 fw-bold bg-purple border-0" style={{ backgroundColor: '#6f42c1' }} disabled={uploading}>
                      {uploading ? 'Uploading...' : 'Upload File'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </>,
        document.body
      )}

      {/* RENAME RINGTONE MODAL */}
      {showEditModal && createPortal(
        <>
          <div className="modal-backdrop fade show" style={{ zIndex: 1040 }}></div>
          <div className="modal fade show d-block" tabIndex="-1" style={{ zIndex: 1050, overflowY: 'auto' }}>
            <div className="modal-dialog modal-dialog-centered">
              <div className="modal-content border-0 rounded-4 shadow-lg p-3">
                <div className="modal-header border-0 pb-0">
                  <h5 className="modal-title fw-extrabold text-dark">Edit Ringtone Name</h5>
                  <button type="button" className="btn-close" onClick={() => setShowEditModal(false)}></button>
                </div>
                
                <form onSubmit={handleUpdateRingtone}>
                  <div className="modal-body py-3">
                    <div className="mb-3">
                      <label className="form-label small fw-semibold text-muted">Ringtone Name</label>
                      <input 
                        type="text" 
                        className="form-control form-control-custom"
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        required
                      />
                    </div>
                  </div>

                  <div className="modal-footer border-0 pt-0 d-flex gap-2">
                    <button type="button" className="btn btn-outline-secondary flex-grow-1 py-2.5 rounded-3" onClick={() => setShowEditModal(false)}>
                      Cancel
                    </button>
                    <button type="submit" className="btn btn-primary flex-grow-1 py-2.5 rounded-3 fw-bold bg-purple border-0" style={{ backgroundColor: '#6f42c1' }}>
                      Save Changes
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </>,
        document.body
      )}
    </div>
  );
};

export default SuperAdminRingtones;
