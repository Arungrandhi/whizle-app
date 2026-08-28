import React, { useState, useEffect } from 'react';
import socket from '../../socket';
import { api } from '../../context/AuthContext';

const SuperAdminTrending = () => {
  // Navigation Tabs state
  const [activeTab, setActiveTab] = useState('overview'); // overview, topics, ranking, schedule, categories, history, settings

  // Global Config state
  const [config, setConfig] = useState({
    enabled: true,
    topicsPerDay: 50,
    selectionMode: 'hybrid',
    whizleWeight: 40,
    priorityWeight: 20,
    categoryWeight: 15,
    freshnessWeight: 15,
    randomWeight: 10,
    newTopicBoost: true,
    avoidRecentRepeat: true,
    rotationEnabled: true,
    isLocked: false,
    categoryDistribution: {},
    categoryPriorities: {}
  });

  // Topics state
  const [topics, setTopics] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCategory, setFilterCategory] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterRankingType, setFilterRankingType] = useState('all');
  const [filterPriority, setFilterPriority] = useState('all');
  const [filterDate, setFilterDate] = useState('');
  const [sortField, setSortField] = useState('rank');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // Bulk actions state
  const [selectedIds, setSelectedIds] = useState([]);
  const [bulkAction, setBulkAction] = useState('');
  const [bulkValue, setBulkValue] = useState('');

  // Daily trending history preview state
  const [todayHistory, setTodayHistory] = useState(null);
  const [historySummaryList, setHistorySummaryList] = useState([]);
  const [selectedHistoryDate, setSelectedHistoryDate] = useState('');
  const [selectedHistoryFeed, setSelectedHistoryFeed] = useState(null);

  // General Alert state
  const [alertMsg, setAlertMsg] = useState({ type: '', text: '' });
  
  // Topic Modal CRUD states
  const [modalOpen, setModalOpen] = useState(false);
  const [editId, setEditId] = useState(null);
  const [formTitle, setFormTitle] = useState('');
  const [formHeading, setFormHeading] = useState('');
  const [formShortText, setFormShortText] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formCategory, setFormCategory] = useState('');
  const [formImage, setFormImage] = useState('');
  const [formPriority, setFormPriority] = useState(0);
  const [formStatus, setFormStatus] = useState('active');
  const [formStartAt, setFormStartAt] = useState('');
  const [formEndAt, setFormEndAt] = useState('');
  const [formIsPinned, setFormIsPinned] = useState(false);
  const [formManualPosition, setFormManualPosition] = useState('');
  const [formRankingType, setFormRankingType] = useState('auto');
  const [formIsExcluded, setFormIsExcluded] = useState(false);

  // Standard category list for selection defaults
  const categoriesList = [
    'Technology',
    'Entertainment',
    'Sports',
    'Business',
    'Education',
    'News',
    'Lifestyle',
    'Gaming',
    'Science',
    'Other'
  ];

  const showAlert = (type, text) => {
    setAlertMsg({ type, text });
    setTimeout(() => setAlertMsg({ type: '', text: '' }), 5000);
  };

  // Helper date formatter for datetime-local forms
  const formatDateForInput = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    const offset = date.getTimezoneOffset();
    const adjustedDate = new Date(date.getTime() - offset * 60 * 1000);
    return adjustedDate.toISOString().slice(0, 16);
  };

  // Fetch functions
  const fetchConfig = async () => {
    try {
      const res = await api.get('/superadmin/trending/config');
      if (res.data.success) {
        setConfig(res.data.config);
      }
    } catch (err) {
      console.error(err);
      showAlert('danger', 'Failed to retrieve configuration');
    }
  };

  const fetchTopicsPool = async () => {
    try {
      setLoading(true);
      const url = `/superadmin/trending/topics?search=${searchQuery}&category=${filterCategory}&status=${filterStatus}&rankingType=${filterRankingType}&priority=${filterPriority}&date=${filterDate}&sort=${sortField}&page=${currentPage}&limit=10`;
      const res = await api.get(url);
      if (res.data.success) {
        setTopics(res.data.topics);
        setTotalPages(res.data.pagination.pages || 1);
      }
    } catch (err) {
      console.error(err);
      showAlert('danger', 'Failed to retrieve topics');
    } finally {
      setLoading(false);
    }
  };

  const fetchTodayHistory = async () => {
    try {
      const todayStr = new Date().toISOString().split('T')[0];
      const res = await api.get(`/superadmin/trending/history?date=${todayStr}`);
      if (res.data.success) {
        setTodayHistory(res.data.history);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const fetchHistorySummaries = async () => {
    try {
      const res = await api.get('/superadmin/trending/history/summary');
      if (res.data.success) {
        setHistorySummaryList(res.data.historyList || []);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const fetchSelectedHistoryFeed = async (dateStr) => {
    if (!dateStr) return;
    try {
      const res = await api.get(`/superadmin/trending/history?date=${dateStr}`);
      if (res.data.success) {
        setSelectedHistoryFeed(res.data.history);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const fetchAllData = () => {
    fetchConfig();
    fetchTopicsPool();
    fetchTodayHistory();
    fetchHistorySummaries();
  };

  useEffect(() => {
    fetchAllData();
  }, [searchQuery, filterCategory, filterStatus, filterRankingType, filterPriority, filterDate, sortField, currentPage]);

  // Socket updates listener
  useEffect(() => {
    socket.emit('joinSuperAdmin');

    const handleUpdate = () => {
      fetchAllData();
    };

    socket.on('trendingUpdated', handleUpdate);
    socket.on('trendingConfigUpdated', handleUpdate);
    socket.on('trendingRegenerated', handleUpdate);
    socket.on('trendingWhizled', handleUpdate);

    return () => {
      socket.off('trendingUpdated', handleUpdate);
      socket.off('trendingConfigUpdated', handleUpdate);
      socket.off('trendingRegenerated', handleUpdate);
      socket.off('trendingWhizled', handleUpdate);
    };
  }, []);

  // Handle image upload conversions
  const handleImageFile = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        alert('Image file size must be less than 2MB');
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormImage(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  // Open modals
  const openCreateModal = () => {
    setEditId(null);
    setFormTitle('');
    setFormHeading('');
    setFormShortText('');
    setFormDescription('');
    setFormCategory('Technology');
    setFormImage('');
    setFormPriority(0);
    setFormStatus('active');
    setFormStartAt('');
    setFormEndAt('');
    setFormIsPinned(false);
    setFormManualPosition('');
    setFormRankingType('auto');
    setFormIsExcluded(false);
    setModalOpen(true);
  };

  const openEditModal = (topic) => {
    setEditId(topic._id);
    setFormTitle(topic.title);
    setFormHeading(topic.heading);
    setFormShortText(topic.shortText);
    setFormDescription(topic.description);
    setFormCategory(topic.category);
    setFormImage(topic.image || '');
    setFormPriority(topic.priority);
    setFormStatus(topic.status);
    setFormStartAt(formatDateForInput(topic.startAt));
    setFormEndAt(formatDateForInput(topic.endAt));
    setFormIsPinned(topic.isPinned || false);
    setFormManualPosition(topic.manualPosition !== null ? topic.manualPosition : '');
    setFormRankingType(topic.rankingType || 'auto');
    setFormIsExcluded(topic.isExcludedFromRotation || false);
    setModalOpen(true);
  };

  // Create / Update Topic submission
  const handleTopicSubmit = async (e) => {
    e.preventDefault();
    const payload = {
      title: formTitle,
      heading: formHeading,
      shortText: formShortText,
      description: formDescription,
      category: formCategory,
      image: formImage,
      priority: parseInt(formPriority),
      status: formStatus,
      startAt: formStartAt || null,
      endAt: formEndAt || null,
      isPinned: formIsPinned,
      manualPosition: formManualPosition !== '' ? parseInt(formManualPosition) : null,
      rankingType: formRankingType,
      isExcludedFromRotation: formIsExcluded
    };

    try {
      let res;
      if (editId) {
        res = await api.put(`/superadmin/trending/topics/${editId}`, payload);
      } else {
        res = await api.post('/superadmin/trending/topics', payload);
      }

      if (res.data.success) {
        showAlert('success', editId ? 'Trending topic updated successfully' : 'Trending topic created successfully');
        setModalOpen(false);
        fetchAllData();
      }
    } catch (err) {
      console.error(err);
      showAlert('danger', 'Error saving trending topic');
    }
  };

  // Duplicate handler
  const handleDuplicate = async (id) => {
    try {
      const res = await api.post(`/superadmin/trending/topics/${id}/duplicate`);
      if (res.data.success) {
        showAlert('success', 'Topic duplicated successfully (saved as Draft)');
        fetchAllData();
      }
    } catch (err) {
      console.error(err);
      showAlert('danger', 'Error duplicating topic');
    }
  };

  // Delete handler
  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this trending topic? This cannot be undone.')) return;
    try {
      const res = await api.delete(`/superadmin/trending/topics/${id}`);
      if (res.data.success) {
        showAlert('success', 'Topic deleted successfully');
        fetchAllData();
      }
    } catch (err) {
      console.error(err);
      showAlert('danger', 'Error deleting topic');
    }
  };

  // Quick Inline edits
  const handleQuickStatusChange = async (id, value) => {
    try {
      await api.put(`/superadmin/trending/topics/${id}`, { status: value });
      fetchAllData();
    } catch (err) {
      console.error(err);
      showAlert('danger', 'Error updating status');
    }
  };

  const handleQuickPriorityChange = async (id, value) => {
    try {
      await api.put(`/superadmin/trending/topics/${id}`, { priority: parseInt(value) });
      fetchAllData();
    } catch (err) {
      console.error(err);
      showAlert('danger', 'Error updating priority');
    }
  };

  const handleQuickPinToggle = async (id, currentVal) => {
    try {
      await api.put(`/superadmin/trending/topics/${id}`, { isPinned: !currentVal });
      fetchAllData();
    } catch (err) {
      console.error(err);
      showAlert('danger', 'Error updating pinned override');
    }
  };

  const handleQuickExcludeToggle = async (id, currentVal) => {
    try {
      await api.put(`/superadmin/trending/topics/${id}`, { isExcludedFromRotation: !currentVal });
      fetchAllData();
    } catch (err) {
      console.error(err);
      showAlert('danger', 'Error updating rotation exclude');
    }
  };

  // Bulk actions execution
  const handleBulkAction = async () => {
    if (selectedIds.length === 0) {
      alert('Please select at least one topic');
      return;
    }
    if (!bulkAction) {
      alert('Please select an action');
      return;
    }

    if (bulkAction === 'delete' && !window.confirm(`Are you sure you want to delete ${selectedIds.length} topics?`)) {
      return;
    }

    try {
      const res = await api.post('/superadmin/trending/topics/bulk', {
        ids: selectedIds,
        action: bulkAction,
        value: bulkValue
      });
      if (res.data.success) {
        showAlert('success', 'Bulk action applied successfully');
        setSelectedIds([]);
        setBulkAction('');
        setBulkValue('');
        fetchAllData();
      }
    } catch (err) {
      console.error(err);
      showAlert('danger', 'Error applying bulk action');
    }
  };

  // Global Config form saves
  const handleSaveConfig = async (updatedFields) => {
    try {
      const res = await api.put('/superadmin/trending/config', {
        ...config,
        ...updatedFields
      });
      if (res.data.success) {
        showAlert('success', 'Global configurations updated successfully');
        fetchConfig();
      }
    } catch (err) {
      console.error(err);
      showAlert('danger', 'Error saving configuration');
    }
  };

  // Lock / Unlock toggle
  const handleToggleLock = async () => {
    try {
      const nextLocked = !config.isLocked;
      const res = await api.post('/superadmin/trending/lock', { isLocked: nextLocked });
      if (res.data.success) {
        showAlert('success', nextLocked ? 'Today\'s feed is now locked' : 'Today\'s feed is unlocked');
        fetchConfig();
      }
    } catch (err) {
      console.error(err);
      showAlert('danger', 'Error updating locks');
    }
  };

  // Regenerate manual trigger
  const handleRegenerate = async () => {
    if (!window.confirm('Are you sure you want to regenerate today\'s trending ranks? This will recompute ranking values immediately.')) return;
    try {
      const res = await api.post('/superadmin/trending/regenerate', {});
      if (res.data.success) {
        showAlert('success', 'Trending feed generated successfully');
        fetchAllData();
      }
    } catch (err) {
      console.error(err);
      showAlert('danger', 'Error regenerating feed');
    }
  };

  // Multi select utilities
  const handleSelectAll = (e) => {
    if (e.target.checked) {
      setSelectedIds(topics.map(t => t._id));
    } else {
      setSelectedIds([]);
    }
  };

  const handleSelectRow = (id) => {
    if (selectedIds.includes(id)) {
      setSelectedIds(prev => prev.filter(x => x !== id));
    } else {
      setSelectedIds(prev => [...prev, id]);
    }
  };

  // Derived Summary counts
  const activeCount = topics.filter(t => t.status === 'active').length;
  const scheduledCount = topics.filter(t => t.status === 'scheduled').length;
  const totalWhizles = topics.reduce((acc, curr) => acc + (curr.whizlesCount || 0), 0);
  const distinctCategories = Array.from(new Set(topics.map(t => t.category))).length;
  const currentLeader = todayHistory?.topics?.[0]?.heading || 'None';

  return (
    <div className="animated-fade-in pb-5">
      {/* Dynamic Alerts */}
      {alertMsg.text && (
        <div 
          className={`alert alert-${alertMsg.type} border-0 rounded-3 small shadow position-fixed top-0 end-0 m-4`} 
          style={{ zIndex: 1060 }}
        >
          {alertMsg.text}
        </div>
      )}

      {/* Hero Header */}
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h2 className="fw-extrabold text-dark mb-1">Trending Editorial Console</h2>
          <p className="text-muted small mb-0">Control selection mode engines, lock history feeds, adjust category priorities, and schedules.</p>
        </div>
        <div className="d-flex gap-2">
          <button className="btn btn-outline-primary btn-sm fw-bold px-3" onClick={handleRegenerate}>
            <i className="bi bi-arrow-clockwise me-1"></i> Regenerate Feed
          </button>
          <button className="btn btn-primary btn-sm fw-bold px-3" onClick={openCreateModal}>
            <i className="bi bi-plus-circle me-1"></i> Add Topic
          </button>
        </div>
      </div>

      {/* Main Tabs Navigation */}
      <div className="card border-0 shadow-sm rounded-4 p-2 bg-white mb-4">
        <div className="d-flex flex-wrap gap-1">
          {[
            { id: 'overview', label: 'Overview', icon: 'bi-grid-fill' },
            { id: 'topics', label: 'Topics Manager', icon: 'bi-list-ul' },
            { id: 'ranking', label: 'Ranking Settings', icon: 'bi-sliders' },
            { id: 'schedule', label: 'Schedule & Calendar', icon: 'bi-calendar-event' },
            { id: 'categories', label: 'Category Weights', icon: 'bi-tags-fill' },
            { id: 'history', label: 'History Logs', icon: 'bi-clock-history' },
            { id: 'settings', label: 'Settings', icon: 'bi-gear-fill' }
          ].map(tab => (
            <button
              key={tab.id}
              className={`btn btn-sm border-0 d-flex align-items-center gap-2 px-3 py-2 fw-bold ${activeTab === tab.id ? 'bg-primary text-white shadow-xs' : 'text-muted'}`}
              onClick={() => {
                setActiveTab(tab.id);
                if (tab.id === 'history' && historySummaryList.length > 0) {
                  const initialDate = historySummaryList[0].date;
                  setSelectedHistoryDate(initialDate);
                  fetchSelectedHistoryFeed(initialDate);
                }
              }}
            >
              <i className={tab.icon}></i>
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* --- TAB CONTENT 1: OVERVIEW --- */}
      {activeTab === 'overview' && (
        <div className="row g-4">
          {/* Summary metrics widgets */}
          <div className="col-12">
            <div className="row g-3">
              {[
                { label: 'Active Topics', value: activeCount, color: 'primary', icon: 'bi-activity' },
                { label: 'Scheduled Topics', value: scheduledCount, color: 'warning', icon: 'bi-alarm' },
                { label: 'Today\'s Trending Items', value: todayHistory?.topics?.length || 0, color: 'success', icon: 'bi-check-circle' },
                { label: 'Total Whizles', value: totalWhizles, color: 'danger', icon: 'bi-suit-heart-fill' },
                { label: 'Categories Active', value: distinctCategories, color: 'info', icon: 'bi-folder2-open' },
                { label: 'Current Leader (#1)', value: currentLeader, color: 'purple', icon: 'bi-trophy-fill', isText: true }
              ].map((card, i) => (
                <div key={i} className="col-6 col-md-4 col-lg-2">
                  <div className="card border-0 shadow-sm rounded-3 p-3 bg-white h-100 text-center">
                    <span className="text-muted small fw-bold d-block text-uppercase mb-1">{card.label}</span>
                    <h4 className={`fw-extrabold text-${card.color} mb-2 ${card.isText ? 'text-truncate small' : ''}`} title={card.value}>{card.value}</h4>
                    <div className="mt-auto">
                      <i className={`bi ${card.icon} text-${card.color} fs-4`}></i>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="col-lg-8">
            <div className="card border-0 shadow-sm rounded-4 p-4 bg-white">
              <div className="d-flex justify-content-between align-items-center border-bottom pb-3 mb-3">
                <div>
                  <h5 className="fw-black text-dark mb-0">Today's Live Trending Feed</h5>
                  <span className="text-muted small">Generated outcomes visible to public users</span>
                </div>
                <div className="d-flex gap-2">
                  <button 
                    className={`btn btn-sm fw-bold ${config.isLocked ? 'btn-danger' : 'btn-outline-danger'}`}
                    onClick={handleToggleLock}
                  >
                    <i className={`bi ${config.isLocked ? 'bi-lock-fill' : 'bi-unlock-fill'} me-1`}></i>
                    {config.isLocked ? 'Locked' : 'Lock Feed'}
                  </button>
                  <button className="btn btn-sm btn-outline-primary fw-bold" onClick={handleRegenerate}>
                    <i className="bi bi-arrow-repeat me-1"></i>
                    Regenerate
                  </button>
                </div>
              </div>

              <div className="table-responsive">
                <table className="table table-hover align-middle small">
                  <thead>
                    <tr className="table-light text-muted">
                      <th scope="col" style={{ width: '60px' }}>Rank</th>
                      <th scope="col">Topic Title</th>
                      <th scope="col">Category</th>
                      <th scope="col">Whizles</th>
                      <th scope="col">Selection Reason</th>
                      <th scope="col">Score</th>
                    </tr>
                  </thead>
                  <tbody>
                    {todayHistory && todayHistory.topics && todayHistory.topics.length > 0 ? (
                      todayHistory.topics.map((t) => (
                        <tr key={t._id} className={t.rank === 1 ? 'table-primary bg-gradient' : ''}>
                          <td><strong className="fs-6 font-monospace">#{t.rank}</strong></td>
                          <td>
                            <strong className="text-dark d-block">{t.heading}</strong>
                          </td>
                          <td><span className="badge bg-light text-dark border">{t.category}</span></td>
                          <td><strong><i className="bi bi-suit-heart-fill text-danger me-1"></i> {t.whizlesCount}</strong></td>
                          <td><span className="badge bg-light text-primary border">{t.selectionReason}</span></td>
                          <td><span className="font-monospace fw-bold">{t.score}</span></td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan="6" className="text-center py-4 text-muted">
                          No trending feed generated for today. Click "Regenerate" to calculate it now.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          <div className="col-lg-4">
            <div className="card border-0 shadow-sm rounded-4 p-4 bg-white h-100">
              <h6 className="fw-black text-dark border-bottom pb-2 mb-3">Live Ranks Info</h6>
              <div className="small">
                <div className="mb-3 p-3 bg-light rounded-3">
                  <span className="fw-bold d-block mb-1 text-primary">Engine Configuration</span>
                  <div className="d-flex justify-content-between mb-1">
                    <span className="text-muted">Selection Mode:</span>
                    <strong className="text-dark text-capitalize">{config.selectionMode}</strong>
                  </div>
                  <div className="d-flex justify-content-between mb-1">
                    <span className="text-muted">Display Count:</span>
                    <strong className="text-dark">{config.topicsPerDay} topics</strong>
                  </div>
                  <div className="d-flex justify-content-between">
                    <span className="text-muted">Status:</span>
                    <strong className={config.enabled ? 'text-success' : 'text-danger'}>
                      {config.enabled ? 'Online' : 'Offline'}
                    </strong>
                  </div>
                </div>

                <div className="p-3 bg-light rounded-3">
                  <span className="fw-bold d-block mb-1 text-primary">Audit Log</span>
                  <div className="d-flex justify-content-between mb-1">
                    <span className="text-muted">Generated At:</span>
                    <strong className="text-dark font-monospace small">
                      {config.generatedAt ? new Date(config.generatedAt).toLocaleTimeString() : 'N/A'}
                    </strong>
                  </div>
                  <div className="d-flex justify-content-between">
                    <span className="text-muted">Feed State:</span>
                    <strong className={config.isLocked ? 'text-danger' : 'text-success'}>
                      {config.isLocked ? 'Locked (Editorial)' : 'Automatic'}
                    </strong>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* --- TAB CONTENT 2: TOPICS MANAGER --- */}
      {activeTab === 'topics' && (
        <div className="card border-0 shadow-sm rounded-4 p-4 bg-white">
          {/* Filters Row */}
          <div className="row g-2 mb-4">
            <div className="col-12 col-md-3">
              <input 
                type="text" 
                className="form-control form-control-sm"
                placeholder="Search Title / Heading..."
                value={searchQuery}
                onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
              />
            </div>
            <div className="col-6 col-md-2">
              <select 
                className="form-select form-select-sm"
                value={filterCategory}
                onChange={(e) => { setFilterCategory(e.target.value); setCurrentPage(1); }}
              >
                <option value="all">All Categories</option>
                {categoriesList.map(cat => <option key={cat} value={cat}>{cat}</option>)}
              </select>
            </div>
            <div className="col-6 col-md-2">
              <select 
                className="form-select form-select-sm"
                value={filterStatus}
                onChange={(e) => { setFilterStatus(e.target.value); setCurrentPage(1); }}
              >
                <option value="all">All Statuses</option>
                <option value="active">Active</option>
                <option value="draft">Draft</option>
                <option value="scheduled">Scheduled</option>
                <option value="paused">Paused</option>
                <option value="expired">Expired</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>
            <div className="col-6 col-md-2">
              <select 
                className="form-select form-select-sm"
                value={filterRankingType}
                onChange={(e) => { setFilterRankingType(e.target.value); setCurrentPage(1); }}
              >
                <option value="all">All Ranking Types</option>
                <option value="auto">Auto</option>
                <option value="manual">Manual</option>
                <option value="random">Random</option>
              </select>
            </div>
            <div className="col-6 col-md-1.5">
              <select 
                className="form-select form-select-sm"
                value={sortField}
                onChange={(e) => setSortField(e.target.value)}
              >
                <option value="rank">Sort by Rank</option>
                <option value="whizles">Sort by Whizles</option>
                <option value="priority">Sort by Priority</option>
                <option value="newest">Sort by Newest</option>
              </select>
            </div>
          </div>

          {/* Bulk Action Bar */}
          {selectedIds.length > 0 && (
            <div className="alert alert-primary border-0 rounded-3 p-3 mb-3 d-flex align-items-center justify-content-between flex-wrap gap-2 small">
              <div className="fw-bold">
                <i className="bi bi-check2-square me-1"></i>
                {selectedIds.length} topics selected for updates
              </div>
              <div className="d-flex align-items-center gap-2">
                <select 
                  className="form-select form-select-sm"
                  style={{ width: '170px' }}
                  value={bulkAction}
                  onChange={(e) => {
                    setBulkAction(e.target.value);
                    setBulkValue('');
                  }}
                >
                  <option value="">Choose bulk action...</option>
                  <option value="status">Change Status</option>
                  <option value="priority">Change Priority</option>
                  <option value="isPinned">Pin / Unpin</option>
                  <option value="isExcluded">Rotation Exclude</option>
                  <option value="delete">Delete Selected</option>
                </select>

                {bulkAction === 'status' && (
                  <select 
                    className="form-select form-select-sm"
                    style={{ width: '120px' }}
                    value={bulkValue}
                    onChange={(e) => setBulkValue(e.target.value)}
                  >
                    <option value="">Status...</option>
                    <option value="active">Active</option>
                    <option value="draft">Draft</option>
                    <option value="paused">Paused</option>
                    <option value="inactive">Inactive</option>
                  </select>
                )}

                {bulkAction === 'priority' && (
                  <input 
                    type="number"
                    className="form-control form-control-sm text-center"
                    placeholder="Priority"
                    style={{ width: '90px' }}
                    value={bulkValue}
                    onChange={(e) => setBulkValue(e.target.value)}
                  />
                )}

                {bulkAction === 'isPinned' && (
                  <select 
                    className="form-select form-select-sm"
                    style={{ width: '100px' }}
                    value={bulkValue}
                    onChange={(e) => setBulkValue(e.target.value)}
                  >
                    <option value="">Value...</option>
                    <option value="true">Pin</option>
                    <option value="false">Unpin</option>
                  </select>
                )}

                {bulkAction === 'isExcluded' && (
                  <select 
                    className="form-select form-select-sm"
                    style={{ width: '120px' }}
                    value={bulkValue}
                    onChange={(e) => setBulkValue(e.target.value)}
                  >
                    <option value="">Value...</option>
                    <option value="true">Exclude</option>
                    <option value="false">Include</option>
                  </select>
                )}

                <button className="btn btn-sm btn-primary fw-bold" onClick={handleBulkAction}>
                  Apply
                </button>
              </div>
            </div>
          )}

          {/* Topics Pool Table */}
          <div className="table-responsive">
            <table className="table table-hover align-middle small">
              <thead>
                <tr className="table-light text-muted">
                  <th scope="col" style={{ width: '40px' }}>
                    <input 
                      type="checkbox"
                      checked={topics.length > 0 && selectedIds.length === topics.length}
                      onChange={handleSelectAll}
                    />
                  </th>
                  <th scope="col" style={{ width: '50px' }}>Pin</th>
                  <th scope="col" style={{ width: '70px' }}>Exclude</th>
                  <th scope="col">Topic Title</th>
                  <th scope="col">Category</th>
                  <th scope="col" style={{ width: '80px' }}>Whizles</th>
                  <th scope="col" style={{ width: '70px' }}>Priority</th>
                  <th scope="col" style={{ width: '110px' }}>Status</th>
                  <th scope="col" className="text-end" style={{ width: '120px' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan="9" className="text-center py-5">
                      <div className="spinner-border text-primary" role="status"></div>
                    </td>
                  </tr>
                ) : topics.length > 0 ? (
                  topics.map(t => (
                    <tr key={t._id}>
                      <td>
                        <input 
                          type="checkbox"
                          checked={selectedIds.includes(t._id)}
                          onChange={() => handleSelectRow(t._id)}
                        />
                      </td>
                      <td>
                        <div className="form-check form-switch p-0 d-flex justify-content-center">
                          <input 
                            className="form-check-input ms-0"
                            type="checkbox"
                            checked={t.isPinned || false}
                            onChange={() => handleQuickPinToggle(t._id, t.isPinned)}
                          />
                        </div>
                      </td>
                      <td>
                        <div className="form-check form-switch p-0 d-flex justify-content-center">
                          <input 
                            className="form-check-input ms-0"
                            type="checkbox"
                            checked={t.isExcludedFromRotation || false}
                            onChange={() => handleQuickExcludeToggle(t._id, t.isExcludedFromRotation)}
                          />
                        </div>
                      </td>
                      <td>
                        <div className="d-flex align-items-center">
                          {t.image ? (
                            <img src={t.image} alt={t.title} className="rounded me-2 border" style={{ width: '38px', height: '38px', objectFit: 'cover' }} />
                          ) : (
                            <div className="bg-light rounded me-2 d-flex align-items-center justify-content-center text-muted" style={{ width: '38px', height: '38px' }}>
                              <i className="bi bi-image" style={{ fontSize: '0.9rem' }}></i>
                            </div>
                          )}
                          <div>
                            <strong className="text-dark d-block text-truncate" style={{ maxWidth: '170px' }}>{t.title}</strong>
                            <span className="text-muted d-block text-truncate small" style={{ maxWidth: '170px' }}>{t.heading}</span>
                          </div>
                        </div>
                      </td>
                      <td><span className="badge bg-light text-primary border">{t.category}</span></td>
                      <td><strong>{t.whizlesCount || 0}</strong></td>
                      <td>
                        <input 
                          type="number"
                          className="form-control form-control-sm text-center px-1 font-monospace"
                          style={{ width: '55px', fontWeight: 'bold' }}
                          value={t.priority}
                          onChange={(e) => handleQuickPriorityChange(t._id, e.target.value)}
                        />
                      </td>
                      <td>
                        <select 
                          className="form-select form-select-sm p-1 py-0.5 text-center text-uppercase fw-bold"
                          style={{ 
                            fontSize: '0.75rem', 
                            borderColor: t.status === 'active' ? '#198754' : '#dee2e6',
                            color: t.status === 'active' ? '#198754' : '#6c757d'
                          }}
                          value={t.status}
                          onChange={(e) => handleQuickStatusChange(t._id, e.target.value)}
                        >
                          <option value="active">Active</option>
                          <option value="draft">Draft</option>
                          <option value="scheduled">Scheduled</option>
                          <option value="paused">Paused</option>
                          <option value="expired">Expired</option>
                          <option value="inactive">Inactive</option>
                        </select>
                      </td>
                      <td className="text-end">
                        <div className="d-flex justify-content-end gap-1">
                          <button className="btn btn-light border btn-sm p-1.5 rounded-circle" title="Duplicate Topic" onClick={() => handleDuplicate(t._id)}>
                            <i className="bi bi-files text-primary"></i>
                          </button>
                          <button className="btn btn-light border btn-sm p-1.5 rounded-circle" title="Edit Topic" onClick={() => openEditModal(t)}>
                            <i className="bi bi-pencil-fill text-muted"></i>
                          </button>
                          <button className="btn btn-light border btn-sm p-1.5 rounded-circle" title="Delete Topic" onClick={() => handleDelete(t._id)}>
                            <i className="bi bi-trash3-fill text-danger"></i>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="9" className="text-center py-4 text-muted">No topics registered.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="d-flex justify-content-between align-items-center mt-3 pt-3 border-top small">
              <span className="text-muted">Page {currentPage} of {totalPages}</span>
              <div className="d-flex gap-2">
                <button 
                  className="btn btn-outline-primary btn-sm px-3"
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                >
                  Previous
                </button>
                <button 
                  className="btn btn-outline-primary btn-sm px-3"
                  disabled={currentPage === totalPages}
                  onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* --- TAB CONTENT 3: RANKING SETTINGS --- */}
      {activeTab === 'ranking' && (
        <div className="row g-4">
          <div className="col-md-7">
            <div className="card border-0 shadow-sm rounded-4 p-4 bg-white">
              <h5 className="fw-black text-dark border-bottom pb-2 mb-4">Ranking Algorithm Weights</h5>
              
              <div className="mb-4">
                <label className="form-label fw-bold text-dark mb-1">Selection Mode</label>
                <select 
                  className="form-select"
                  value={config.selectionMode}
                  onChange={(e) => handleSaveConfig({ selectionMode: e.target.value })}
                >
                  <option value="hybrid">Hybrid Algorithmic weights (Recommended)</option>
                  <option value="auto">Auto Ranking (Whizles + Topic Priority)</option>
                  <option value="whizle">Whizles Based (Likes only)</option>
                  <option value="priority">Priority Based (Topic priority only)</option>
                  <option value="new_topics">New Topics (Freshness decay only)</option>
                  <option value="random">Random Selection (Eligible pool shuffle)</option>
                  <option value="category_weighted">Category Priority weighted</option>
                </select>
              </div>

              {config.selectionMode === 'hybrid' && (
                <div className="small">
                  <p className="text-muted mb-4">
                    Adjust sliders to allocate percentage weights to different ranking factors. The sum does not need to equal 100%.
                  </p>

                  {[
                    { key: 'whizleWeight', label: 'Whizles (Likes) Weight', desc: 'Popularity coefficient' },
                    { key: 'priorityWeight', label: 'Topic Priority Weight', desc: 'Editorial weight' },
                    { key: 'categoryWeight', label: 'Category Priority Weight', desc: 'Category-wide weight factor' },
                    { key: 'freshnessWeight', label: 'Freshness Time-Decay Weight', desc: 'Age gravity divisor' },
                    { key: 'randomWeight', label: 'Random Shuffling Weight', desc: 'Promotes discovery exploration' }
                  ].map(slider => (
                    <div key={slider.key} className="mb-3">
                      <div className="d-flex justify-content-between mb-1">
                        <span className="fw-bold text-dark">{slider.label}</span>
                        <strong className="text-primary font-monospace">{config[slider.key]}%</strong>
                      </div>
                      <input 
                        type="range"
                        className="form-range"
                        min="0"
                        max="100"
                        step="5"
                        value={config[slider.key]}
                        onChange={(e) => handleSaveConfig({ [slider.key]: parseInt(e.target.value) })}
                      />
                      <small className="text-muted d-block" style={{ fontSize: '0.75rem' }}>{slider.desc}</small>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="col-md-5">
            <div className="card border-0 shadow-sm rounded-4 p-4 bg-white h-100">
              <h5 className="fw-black text-dark border-bottom pb-2 mb-4">Dynamic Boosting Parameters</h5>
              
              <div className="small">
                <div className="mb-4">
                  <div className="form-check form-switch mb-2">
                    <input 
                      className="form-check-input"
                      type="checkbox"
                      id="configNewTopicBoost"
                      checked={config.newTopicBoost}
                      onChange={(e) => handleSaveConfig({ newTopicBoost: e.target.checked })}
                    />
                    <label className="form-check-label fw-bold text-dark" htmlFor="configNewTopicBoost">
                      New Topic Boost (+20%)
                    </label>
                  </div>
                  <span className="text-muted d-block">Newly created topics in the last 24 hours receive temporary score inflation.</span>
                </div>

                <div className="mb-4">
                  <div className="form-check form-switch mb-2">
                    <input 
                      className="form-check-input"
                      type="checkbox"
                      id="configAvoidRepeat"
                      checked={config.avoidRecentRepeat}
                      onChange={(e) => handleSaveConfig({ avoidRecentRepeat: e.target.checked })}
                    />
                    <label className="form-check-label fw-bold text-dark" htmlFor="configAvoidRepeat">
                      Avoid Repetition (-50% Penalty)
                    </label>
                  </div>
                  <span className="text-muted d-block">Topics displayed in the trending feed in the last 3 days are penalized to promote round-robin rotation.</span>
                </div>

                <div className="p-3 bg-light rounded-3">
                  <span className="fw-bold d-block text-primary mb-1">Selection Logic Detail</span>
                  <p className="mb-0 text-muted">
                    If Hybrid is chosen, the engine scores each topic based on the weights. Pinned topics bypass this logic and sit at their specified slots, sliding the automatic results down.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* --- TAB CONTENT 4: SCHEDULES --- */}
      {activeTab === 'schedule' && (
        <div className="card border-0 shadow-sm rounded-4 p-4 bg-white">
          <div className="d-flex justify-content-between align-items-center border-bottom pb-3 mb-4">
            <div>
              <h5 className="fw-black text-dark mb-0">Upcoming & Active Schedules</h5>
              <span className="text-muted small">Timeline views of date-bound trending topics</span>
            </div>
            <input 
              type="date"
              className="form-control form-control-sm"
              style={{ width: '160px' }}
              value={filterDate}
              onChange={(e) => setFilterDate(e.target.value)}
            />
          </div>

          <div className="table-responsive">
            <table className="table table-hover align-middle small">
              <thead>
                <tr className="table-light text-muted">
                  <th scope="col">Topic</th>
                  <th scope="col">Category</th>
                  <th scope="col">Start Time</th>
                  <th scope="col">End Time</th>
                  <th scope="col">Scheduled Duration</th>
                  <th scope="col">Status</th>
                </tr>
              </thead>
              <tbody>
                {topics.length > 0 ? (
                  topics.map(t => {
                    const daysDuration = t.startAt && t.endAt 
                      ? Math.ceil((new Date(t.endAt) - new Date(t.startAt)) / (1000 * 60 * 60 * 24))
                      : 'Always';
                    return (
                      <tr key={t._id}>
                        <td>
                          <strong className="text-dark d-block">{t.title}</strong>
                          <span className="text-muted d-block small">{t.heading}</span>
                        </td>
                        <td><span className="badge bg-light text-dark border">{t.category}</span></td>
                        <td>{t.startAt ? new Date(t.startAt).toLocaleString() : 'Immediate'}</td>
                        <td>{t.endAt ? new Date(t.endAt).toLocaleString() : 'Never expires'}</td>
                        <td><strong>{daysDuration} {daysDuration !== 'Always' ? 'Days' : ''}</strong></td>
                        <td>
                          <span className={`badge ${
                            t.status === 'active' ? 'bg-success' : 
                            t.status === 'scheduled' ? 'bg-warning text-dark' : 
                            t.status === 'expired' ? 'bg-secondary' : 'bg-danger'
                          }`}>
                            {t.status}
                          </span>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan="6" className="text-center py-4 text-muted">No scheduled items found.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* --- TAB CONTENT 5: CATEGORY LIMITS --- */}
      {activeTab === 'categories' && (
        <div className="card border-0 shadow-sm rounded-4 p-4 bg-white">
          <h5 className="fw-black text-dark border-bottom pb-2 mb-4">Category priorities and Distribution Weight Caps</h5>
          <p className="text-muted small mb-4">
            Control the priority values and percentage ceilings per category to balance the trending content distribution.
          </p>

          <div className="row g-4">
            <div className="col-12">
              <table className="table table-hover align-middle small">
                <thead>
                  <tr className="table-light text-muted">
                    <th scope="col">Category</th>
                    <th scope="col" style={{ width: '180px' }}>Category Priority</th>
                    <th scope="col" style={{ width: '250px' }}>Distribution Ceiling (%)</th>
                  </tr>
                </thead>
                <tbody>
                  {categoriesList.map(cat => {
                    const currentPriority = config.categoryPriorities?.[cat] || 1;
                    const currentCap = config.categoryDistribution?.[cat] || 0;

                    return (
                      <tr key={cat}>
                        <td><strong className="text-primary">{cat}</strong></td>
                        <td>
                          <input 
                            type="number"
                            className="form-control form-control-sm font-monospace text-center fw-bold"
                            style={{ width: '80px' }}
                            value={currentPriority}
                            onChange={(e) => {
                              const newPriMap = { ...config.categoryPriorities, [cat]: parseInt(e.target.value) || 1 };
                              handleSaveConfig({ categoryPriorities: newPriMap });
                            }}
                          />
                        </td>
                        <td>
                          <div className="d-flex align-items-center gap-2">
                            <input 
                              type="range"
                              className="form-range"
                              min="0"
                              max="100"
                              step="5"
                              value={currentCap}
                              onChange={(e) => {
                                const newCapMap = { ...config.categoryDistribution, [cat]: parseInt(e.target.value) || 0 };
                                handleSaveConfig({ categoryDistribution: newCapMap });
                              }}
                            />
                            <strong className="font-monospace text-dark" style={{ width: '40px' }}>{currentCap}%</strong>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* --- TAB CONTENT 6: HISTORY AUDITS --- */}
      {activeTab === 'history' && (
        <div className="row g-4">
          <div className="col-md-4">
            <div className="card border-0 shadow-sm rounded-4 p-4 bg-white h-100">
              <h6 className="fw-black text-dark border-bottom pb-2 mb-3">Historical Logs Dates</h6>
              <div className="list-group list-group-flush small" style={{ maxHeight: '420px', overflowY: 'auto' }}>
                {historySummaryList.map(h => (
                  <button
                    key={h._id}
                    className={`list-group-item list-group-item-action border-0 rounded-2 py-2 d-flex justify-content-between align-items-center ${selectedHistoryDate === h.date ? 'active' : ''}`}
                    onClick={() => {
                      setSelectedHistoryDate(h.date);
                      fetchSelectedHistoryFeed(h.date);
                    }}
                  >
                    <span><i className="bi bi-calendar-check me-2"></i> {h.date}</span>
                    <span className="badge bg-light text-dark border">{h.topics?.length || 0} items</span>
                  </button>
                ))}
                {historySummaryList.length === 0 && (
                  <div className="text-center py-4 text-muted">No historical files stored.</div>
                )}
              </div>
            </div>
          </div>

          <div className="col-md-8">
            <div className="card border-0 shadow-sm rounded-4 p-4 bg-white h-100">
              <div className="d-flex justify-content-between align-items-center border-bottom pb-2 mb-3">
                <h6 className="fw-black text-dark mb-0">Outcome feed snapshot for: {selectedHistoryDate || 'N/A'}</h6>
                <span className="badge bg-light text-primary border">Mode: {selectedHistoryFeed?.selectionMode || 'Hybrid'}</span>
              </div>

              <div className="table-responsive" style={{ maxHeight: '380px', overflowY: 'auto' }}>
                <table className="table table-hover align-middle small">
                  <thead>
                    <tr className="table-light text-muted">
                      <th scope="col" style={{ width: '60px' }}>Rank</th>
                      <th scope="col">Topic Heading</th>
                      <th scope="col">Category</th>
                      <th scope="col">Whizles</th>
                      <th scope="col">Reason</th>
                      <th scope="col">Score</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedHistoryFeed && selectedHistoryFeed.topics && selectedHistoryFeed.topics.length > 0 ? (
                      selectedHistoryFeed.topics.map(t => (
                        <tr key={t._id}>
                          <td><strong className="font-monospace">#{t.rank}</strong></td>
                          <td><strong>{t.heading}</strong></td>
                          <td><span className="badge bg-light text-dark border">{t.category}</span></td>
                          <td><i className="bi bi-suit-heart-fill text-danger me-1"></i> {t.whizlesCount}</td>
                          <td><span className="badge bg-light text-primary border small">{t.selectionReason}</span></td>
                          <td><span className="font-monospace">{t.score}</span></td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan="6" className="text-center py-4 text-muted">Select a date from the left side panel to review feeds.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* --- TAB CONTENT 7: GLOBAL SETTINGS --- */}
      {activeTab === 'settings' && (
        <div className="card border-0 shadow-sm rounded-4 p-4 bg-white">
          <h5 className="fw-black text-dark border-bottom pb-2 mb-4">Global Trending Configuration</h5>
          
          <div className="row g-3 small">
            <div className="col-md-6">
              <label className="form-label fw-bold text-dark mb-1">Topics Per Day Display Count</label>
              <select 
                className="form-select"
                value={config.topicsPerDay}
                onChange={(e) => handleSaveConfig({ topicsPerDay: parseInt(e.target.value) })}
              >
                <option value="10">10 Topics</option>
                <option value="20">20 Topics</option>
                <option value="30">30 Topics</option>
                <option value="40">40 Topics</option>
                <option value="50">50 Topics</option>
                <option value="75">75 Topics</option>
                <option value="100">100 Topics</option>
              </select>
              <small className="text-muted d-block mt-1">Limits the length of results returned in user APIs.</small>
            </div>

            <div className="col-md-6">
              <label className="form-label fw-bold text-dark mb-1">Engine Controls</label>
              <div className="d-flex flex-column gap-3 mt-2">
                <div className="form-check form-switch">
                  <input 
                    className="form-check-input"
                    type="checkbox"
                    id="settingsEnabled"
                    checked={config.enabled}
                    onChange={(e) => handleSaveConfig({ enabled: e.target.checked })}
                  />
                  <label className="form-check-label fw-bold text-dark" htmlFor="settingsEnabled">
                    Global Trending Module Enabled
                  </label>
                </div>
                <div className="form-check form-switch">
                  <input 
                    className="form-check-input"
                    type="checkbox"
                    id="settingsRotation"
                    checked={config.rotationEnabled}
                    onChange={(e) => handleSaveConfig({ rotationEnabled: e.target.checked })}
                  />
                  <label className="form-check-label fw-bold text-dark" htmlFor="settingsRotation">
                    Round-Robin Rotation Engine Enabled
                  </label>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* --- ADD / EDIT TOPIC POPUP MODAL --- */}
      {modalOpen && (
        <div className="modal show d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1050 }}>
          <div className="modal-dialog modal-dialog-centered modal-lg">
            <div className="modal-content border-0 rounded-4 shadow">
              <div className="modal-header border-bottom-0 pb-0 pt-4 px-4">
                <h5 className="modal-title fw-bold text-dark">{editId ? 'Modify Trending Topic' : 'Add Trending Topic'}</h5>
                <button type="button" className="btn-close" onClick={() => setModalOpen(false)}></button>
              </div>
              <form onSubmit={handleTopicSubmit}>
                <div className="modal-body p-4 small">
                  <div className="row g-3">
                    <div className="col-md-6">
                      <label className="form-label fw-bold text-dark mb-1">Topic Name / Title *</label>
                      <input 
                        type="text" 
                        className="form-control" 
                        required 
                        placeholder="e.g. AI & Technology"
                        value={formTitle} 
                        onChange={(e) => setFormTitle(e.target.value)} 
                      />
                    </div>
                    <div className="col-md-6">
                      <label className="form-label fw-bold text-dark mb-1">Trending Heading *</label>
                      <input 
                        type="text" 
                        className="form-control" 
                        required 
                        placeholder="e.g. AI is changing the way we work"
                        value={formHeading} 
                        onChange={(e) => setFormHeading(e.target.value)} 
                      />
                    </div>

                    <div className="col-md-12">
                      <label className="form-label fw-bold text-dark mb-1">Short Text *</label>
                      <input 
                        type="text" 
                        className="form-control" 
                        required 
                        placeholder="e.g. Artificial Intelligence is rapidly transforming businesses."
                        value={formShortText} 
                        onChange={(e) => setFormShortText(e.target.value)} 
                      />
                    </div>

                    <div className="col-md-12">
                      <label className="form-label fw-bold text-dark mb-1">Description *</label>
                      <textarea 
                        className="form-control" 
                        rows="3" 
                        required
                        placeholder="Discuss the latest developments, tools..."
                        value={formDescription} 
                        onChange={(e) => setFormDescription(e.target.value)}
                      />
                    </div>

                    <div className="col-md-6">
                      <label className="form-label fw-bold text-dark mb-1">Category *</label>
                      <select
                        className="form-select"
                        value={formCategory}
                        onChange={(e) => setFormCategory(e.target.value)}
                      >
                        {categoriesList.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                      </select>
                    </div>

                    <div className="col-md-6">
                      <label className="form-label fw-bold text-dark mb-1">Topic Priority</label>
                      <input 
                        type="number" 
                        className="form-control" 
                        placeholder="1, 2, 3..."
                        value={formPriority} 
                        onChange={(e) => setFormPriority(e.target.value)} 
                      />
                    </div>

                    <div className="col-md-6">
                      <label className="form-label fw-bold text-dark mb-1">Thumbnail Image</label>
                      <input 
                        type="file" 
                        className="form-control" 
                        accept="image/*"
                        onChange={handleImageFile} 
                      />
                      {formImage && (
                        <div className="mt-2 position-relative d-inline-block">
                          <img src={formImage} alt="Thumbnail preview" className="rounded border shadow-sm" style={{ width: '80px', height: '60px', objectFit: 'cover' }} />
                          <button type="button" className="btn btn-danger btn-sm p-0 rounded-circle position-absolute top-0 start-100 translate-middle" style={{ width: '20px', height: '20px', fontSize: '0.7rem' }} onClick={() => setFormImage('')}>X</button>
                        </div>
                      )}
                    </div>

                    <div className="col-md-6">
                      <label className="form-label fw-bold text-dark mb-1">Status</label>
                      <select
                        className="form-select"
                        value={formStatus}
                        onChange={(e) => setFormStatus(e.target.value)}
                      >
                        <option value="active">Active</option>
                        <option value="draft">Draft</option>
                        <option value="scheduled">Scheduled</option>
                        <option value="paused">Paused</option>
                        <option value="expired">Expired</option>
                        <option value="inactive">Inactive</option>
                      </select>
                    </div>

                    <div className="col-md-6">
                      <label className="form-label fw-bold text-dark mb-1">Start Date & Time</label>
                      <input 
                        type="datetime-local" 
                        className="form-control" 
                        value={formStartAt} 
                        onChange={(e) => setFormStartAt(e.target.value)} 
                      />
                    </div>

                    <div className="col-md-6">
                      <label className="form-label fw-bold text-dark mb-1">End Date & Time</label>
                      <input 
                        type="datetime-local" 
                        className="form-control" 
                        value={formEndAt} 
                        onChange={(e) => setFormEndAt(e.target.value)} 
                      />
                    </div>

                    <div className="col-md-12">
                      <hr className="my-1 text-muted" />
                      <h6 className="fw-extrabold text-primary mb-2">Editorial Override Options</h6>
                    </div>

                    <div className="col-md-6">
                      <div className="form-check form-switch mt-2">
                        <input 
                          className="form-check-input" 
                          type="checkbox" 
                          id="formIsPinned"
                          checked={formIsPinned} 
                          onChange={(e) => setFormIsPinned(e.target.checked)} 
                        />
                        <label className="form-check-label fw-bold text-dark" htmlFor="formIsPinned">Pin Topic</label>
                      </div>
                    </div>

                    <div className="col-md-6">
                      <label className="form-label fw-bold text-dark mb-1">Manual Override Position</label>
                      <input 
                        type="number"
                        className="form-control"
                        placeholder="Rank e.g. 1, 2"
                        value={formManualPosition}
                        onChange={(e) => setFormManualPosition(e.target.value)}
                      />
                    </div>

                    <div className="col-md-6">
                      <label className="form-label fw-bold text-dark mb-1">Selection Mode Type</label>
                      <select 
                        className="form-select"
                        value={formRankingType}
                        onChange={(e) => setFormRankingType(e.target.value)}
                      >
                        <option value="auto">Auto</option>
                        <option value="manual">Manual</option>
                        <option value="random">Random</option>
                      </select>
                    </div>

                    <div className="col-md-6">
                      <div className="form-check form-switch mt-4">
                        <input 
                          className="form-check-input" 
                          type="checkbox" 
                          id="formIsExcluded"
                          checked={formIsExcluded} 
                          onChange={(e) => setFormIsExcluded(e.target.checked)} 
                        />
                        <label className="form-check-label fw-bold text-dark" htmlFor="formIsExcluded">Exclude from Automatic Rotation</label>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="modal-footer border-top-0 pt-0 pb-4 px-4 gap-2">
                  <button type="button" className="btn btn-light border px-4 py-2 fw-semibold" onClick={() => setModalOpen(false)}>Cancel</button>
                  <button type="submit" className="btn btn-primary px-4 py-2 fw-semibold">Save Changes</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SuperAdminTrending;
