import React, { useState, useEffect, useRef } from 'react';
import socket from '../../socket';
import { api } from '../../context/AuthContext';

const SuperAdminLiveMobile = () => {
  const [liveTopics, setLiveTopics] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [selectedTopicDetail, setSelectedTopicDetail] = useState(null);
  
  // Ref to track previous ranks for green/red change indicators
  const prevRanksRef = useRef({});
  const [rankChanges, setRankChanges] = useState({}); // mapping: topicId -> 'up' | 'down' | 'same'

  const categoriesList = [
    'All',
    'Technology',
    'Entertainment',
    'Sports',
    'Business',
    'Education',
    'News',
    'Lifestyle',
    'Gaming',
    'Science'
  ];

  // Fetch the live generated trending topics (what public users see)
  const fetchLiveFeed = async () => {
    try {
      const res = await api.get('/trending');
      if (res.data.success) {
        const topics = res.data.topics || [];
        
        // Compute rank shifts
        const newChanges = {};
        topics.forEach((t, index) => {
          const newRank = index + 1;
          const prevRank = prevRanksRef.current[t._id];
          
          if (prevRank !== undefined) {
            if (newRank < prevRank) {
              newChanges[t._id] = 'up';
            } else if (newRank > prevRank) {
              newChanges[t._id] = 'down';
            } else {
              newChanges[t._id] = 'same';
            }
          } else {
            newChanges[t._id] = 'same';
          }
          
          // Update ref cache
          prevRanksRef.current[t._id] = newRank;
        });

        setRankChanges(newChanges);
        setLiveTopics(topics);
      }
    } catch (err) {
      console.error('Error fetching live trending feed:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLiveFeed();
  }, []);

  // Set up real-time web socket listeners for automatic updates
  useEffect(() => {
    socket.emit('joinSuperAdmin');

    const handleUpdate = () => {
      fetchLiveFeed();
    };

    socket.on('trendingWhizled', handleUpdate);
    socket.on('trendingUpdated', handleUpdate);
    socket.on('trendingRegenerated', handleUpdate);

    return () => {
      socket.off('trendingWhizled', handleUpdate);
      socket.off('trendingUpdated', handleUpdate);
      socket.off('trendingRegenerated', handleUpdate);
    };
  }, []);

  // Increment whizles/likes infinitely on click
  const handleLikeClick = async (topicId) => {
    try {
      const res = await api.post(`/trending/${topicId}/whizle`);
      if (res.data.success) {
        // Optimistically update count locally first
        setLiveTopics(prev => 
          prev.map(t => t._id === topicId ? { ...t, whizlesCount: t.whizlesCount + 1 } : t)
        );
      }
    } catch (err) {
      console.error('Error sending like vote:', err);
    }
  };

  // Filter topics on category select
  const filteredTopics = selectedCategory === 'All'
    ? liveTopics
    : liveTopics.filter(t => t.category === selectedCategory);

  const heroTopic = filteredTopics[0] || null;
  const standardTopics = filteredTopics.slice(1);

  return (
    <div className="animated-fade-in pb-5">
      {/* Header greetings */}
      <div className="mb-4">
        <h2 className="fw-extrabold text-dark mb-1">Live Trend Mobile View</h2>
        <p className="text-muted small mb-0">See in real time how trending modules look on a mobile device screen. Heart clicks are unlimited for testing.</p>
      </div>

      <div className="row g-4 justify-content-center">
        {/* Left Side: Mock Phone Viewport Chassis */}
        <div className="col-12 col-md-6 d-flex justify-content-center">
          <div 
            className="phone-chassis border border-dark position-relative bg-dark shadow-lg"
            style={{
              width: '360px',
              height: '740px',
              borderRadius: '40px',
              padding: '12px',
              boxShadow: '0 25px 50px -12px rgba(0,0,0,0.4)',
              borderWidth: '8px'
            }}
          >
            {/* Dynamic Island Notch */}
            <div 
              className="position-absolute bg-dark"
              style={{
                width: '110px',
                height: '24px',
                borderRadius: '20px',
                top: '18px',
                left: '50%',
                transform: 'translateX(-50%)',
                zIndex: 1000
              }}
            ></div>

            {/* Top Status Bar indicator simulation */}
            <div 
              className="position-absolute d-flex justify-content-between px-4 align-items-center w-100 text-white font-monospace"
              style={{
                top: '20px',
                left: 0,
                fontSize: '0.65rem',
                zIndex: 999
              }}
            >
              <span>12:00</span>
              <div className="d-flex gap-1.5 align-items-center">
                <i className="bi bi-reception-4"></i>
                <i className="bi bi-wifi"></i>
                <i className="bi bi-battery-full"></i>
              </div>
            </div>

            {/* Inner scrollable screen mockup viewport */}
            <div 
              className="bg-light w-100 h-100 rounded-5 overflow-hidden position-relative d-flex flex-column"
              style={{
                borderRadius: '32px'
              }}
            >
              {/* Glassmorphic App Top Bar */}
              <div 
                className="bg-white bg-opacity-75 border-bottom px-3 pb-2 d-flex align-items-center justify-content-between position-sticky top-0"
                style={{
                  paddingTop: '32px',
                  backdropFilter: 'blur(8px)',
                  zIndex: 998
                }}
              >
                <div className="d-flex align-items-center gap-1">
                  <i className="bi bi-graph-up text-primary fw-extrabold fs-5"></i>
                  <span className="fw-extrabold text-dark font-outfit fs-6">What's Trending</span>
                </div>
                <span className="badge bg-primary rounded-pill small" style={{ fontSize: '0.6rem' }}>LIVE FEED</span>
              </div>

              {/* Horizontal Scroll Categories Pills */}
              <div 
                className="d-flex gap-1.5 px-3 py-2 bg-white border-bottom"
                style={{
                  overflowX: 'auto',
                  scrollbarWidth: 'none',
                  msOverflowStyle: 'none'
                }}
              >
                {categoriesList.map(cat => (
                  <button
                    key={cat}
                    className={`btn btn-xs rounded-pill px-2.5 py-1 fw-bold text-nowrap border-0 ${selectedCategory === cat ? 'bg-primary text-white' : 'bg-light text-muted'}`}
                    style={{ fontSize: '0.65rem' }}
                    onClick={() => setSelectedCategory(cat)}
                  >
                    {cat}
                  </button>
                ))}
              </div>

              {/* Main content viewport */}
              <div className="flex-grow-1 overflow-y-auto px-3 py-3" style={{ height: '0px' }}>
                {loading ? (
                  <div className="d-flex flex-column align-items-center justify-content-center h-100 py-5 text-muted">
                    <div className="spinner-border text-primary spinner-border-sm mb-2" role="status"></div>
                    <span className="small">Loading mobile feed...</span>
                  </div>
                ) : liveTopics.length > 0 ? (
                  <>
                    {/* Rank #1 Hero card view */}
                    {heroTopic && (
                      <div 
                        className="card border-0 shadow-sm rounded-4 overflow-hidden mb-3 bg-white"
                        style={{ cursor: 'pointer' }}
                        onClick={() => setSelectedTopicDetail(heroTopic)}
                      >
                        <div className="position-relative" style={{ height: '140px' }}>
                          {heroTopic.image ? (
                            <img src={heroTopic.image} alt={heroTopic.title} className="w-100 h-100 object-fit-cover" />
                          ) : (
                            <div className="bg-gradient bg-primary bg-opacity-25 w-100 h-100 d-flex align-items-center justify-content-center text-primary fs-1">
                              <i className="bi bi-graph-up-arrow"></i>
                            </div>
                          )}
                          <span className="position-absolute top-0 start-0 m-2 badge bg-warning text-dark fw-extrabold px-2.5 py-1 rounded-pill" style={{ fontSize: '0.65rem' }}>
                            <i className="bi bi-trophy-fill me-1"></i> #1 TRENDING
                          </span>

                          {/* Shift Rank Indicator */}
                          {rankChanges[heroTopic._id] === 'up' && (
                            <span className="position-absolute top-0 end-0 m-2 badge bg-success px-1.5 py-0.5 rounded-circle" title="Rank shifted up">
                              <i className="bi bi-arrow-up-short"></i>
                            </span>
                          )}
                          {rankChanges[heroTopic._id] === 'down' && (
                            <span className="position-absolute top-0 end-0 m-2 badge bg-danger px-1.5 py-0.5 rounded-circle" title="Rank shifted down">
                              <i className="bi bi-arrow-down-short"></i>
                            </span>
                          )}
                        </div>
                        <div className="p-3 small">
                          <span className="badge bg-light text-primary border mb-1" style={{ fontSize: '0.6rem' }}>{heroTopic.category}</span>
                          <h6 className="fw-black text-dark mb-1">{heroTopic.heading}</h6>
                          <p className="text-muted mb-2 text-truncate-2" style={{ fontSize: '0.7rem', display: '-webkit-box', WebkitLineClamp: '2', WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                            {heroTopic.shortText}
                          </p>

                          <div className="d-flex justify-content-between align-items-center mt-2 border-top pt-2">
                            <span className="text-muted font-monospace" style={{ fontSize: '0.65rem' }}>Likes: {heroTopic.whizlesCount}</span>
                            <button 
                              className="btn btn-outline-danger btn-xs px-2 py-0.5 rounded-pill d-flex align-items-center gap-1 fw-bold text-uppercase border-danger-subtle hover-pulse"
                              style={{ fontSize: '0.6rem' }}
                              onClick={(e) => {
                                e.stopPropagation();
                                handleLikeClick(heroTopic._id);
                              }}
                            >
                              <i className="bi bi-suit-heart-fill text-danger"></i> Like
                            </button>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Standard items list ranks #2+ */}
                    <div className="d-flex flex-column gap-2">
                      {standardTopics.map((topic, index) => {
                        const globalRank = index + 2;
                        const shift = rankChanges[topic._id];
                        return (
                          <div 
                            key={topic._id} 
                            className="card border-0 shadow-sm rounded-3 p-2 bg-white"
                            style={{ cursor: 'pointer' }}
                            onClick={() => setSelectedTopicDetail(topic)}
                          >
                            <div className="d-flex align-items-center justify-content-between gap-2">
                              {/* Left Rank & Cover Image */}
                              <div className="d-flex align-items-center gap-2 text-truncate">
                                <div className="d-flex flex-column align-items-center justify-content-center">
                                  <span className="fw-bold text-dark font-monospace" style={{ fontSize: '0.85rem' }}>#{globalRank}</span>
                                  {shift === 'up' && <i className="bi bi-arrow-up-short text-success fs-7" title="Rank rose"></i>}
                                  {shift === 'down' && <i className="bi bi-arrow-down-short text-danger fs-7" title="Rank dropped"></i>}
                                </div>
                                {topic.image ? (
                                  <img src={topic.image} alt={topic.title} className="rounded object-fit-cover" style={{ width: '40px', height: '40px' }} />
                                ) : (
                                  <div className="bg-light rounded d-flex align-items-center justify-content-center text-muted" style={{ width: '40px', height: '40px' }}>
                                    <i className="bi bi-image" style={{ fontSize: '0.75rem' }}></i>
                                  </div>
                                )}
                                <div className="text-truncate">
                                  <strong className="text-dark d-block text-truncate small" style={{ maxWidth: '140px' }}>{topic.heading}</strong>
                                  <span className="text-muted d-block text-truncate" style={{ fontSize: '0.6rem', maxWidth: '140px' }}>{topic.shortText}</span>
                                </div>
                              </div>

                              {/* Right Likes hearts click */}
                              <div className="d-flex align-items-center gap-1">
                                <span className="font-monospace text-muted fw-bold" style={{ fontSize: '0.65rem' }}>{topic.whizlesCount}</span>
                                <button 
                                  className="btn btn-light border btn-sm p-1 rounded-circle hover-pulse" 
                                  title="Test Like"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleLikeClick(topic._id);
                                  }}
                                >
                                  <i className="bi bi-suit-heart-fill text-danger" style={{ fontSize: '0.75rem' }}></i>
                                </button>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </>
                ) : (
                  <div className="text-center text-muted py-5 small">
                    <i className="bi bi-smartphone fs-1 mb-2 text-muted"></i>
                    <span className="d-block">No topics calculated in feed.</span>
                  </div>
                )}
              </div>

              {/* Backdrop dim overlay when details drawer is open */}
              {selectedTopicDetail && (
                <div 
                  className="position-absolute top-0 start-0 w-100 h-100 bg-dark bg-opacity-40"
                  style={{ zIndex: 1000, transition: 'opacity 0.25s' }}
                  onClick={() => setSelectedTopicDetail(null)}
                ></div>
              )}

              {/* Slide-up Details sheet drawer */}
              {selectedTopicDetail && (
                <div 
                  className="position-absolute bottom-0 start-0 w-100 bg-white border-top shadow-lg p-3"
                  style={{
                    borderTopLeftRadius: '24px',
                    borderTopRightRadius: '24px',
                    zIndex: 1001,
                    maxHeight: '82%',
                    overflowY: 'auto',
                    animation: 'slideUp 0.22s ease-out'
                  }}
                >
                  <style>{`
                    @keyframes slideUp {
                      from { transform: translateY(100%); }
                      to { transform: translateY(0); }
                    }
                  `}</style>
                  {/* Handle indicator */}
                  <div 
                    className="mx-auto bg-secondary bg-opacity-25 mb-3" 
                    style={{ width: '40px', height: '5px', borderRadius: '3px', cursor: 'pointer' }}
                    onClick={() => setSelectedTopicDetail(null)}
                  ></div>

                  <div className="d-flex justify-content-between align-items-center mb-2">
                    <span className="badge bg-primary rounded-pill fw-bold" style={{ fontSize: '0.6rem' }}>RANK #{selectedTopicDetail.rank}</span>
                    <button className="btn-close" style={{ fontSize: '0.65rem' }} onClick={() => setSelectedTopicDetail(null)}></button>
                  </div>

                  {selectedTopicDetail.image && (
                    <img 
                      src={selectedTopicDetail.image} 
                      alt={selectedTopicDetail.title} 
                      className="w-100 rounded-3 mb-2.5" 
                      style={{ height: '110px', objectFit: 'cover' }} 
                    />
                  )}

                  <span className="badge bg-light text-primary border mb-1" style={{ fontSize: '0.55rem' }}>{selectedTopicDetail.category}</span>
                  <h6 className="fw-black text-dark mb-1" style={{ fontSize: '0.85rem' }}>{selectedTopicDetail.heading}</h6>
                  <p className="text-muted mb-2 font-monospace" style={{ fontSize: '0.55rem' }}>Internal Name: {selectedTopicDetail.title}</p>
                  
                  <p className="text-dark mb-2.5 fw-bold" style={{ fontSize: '0.7rem' }}>{selectedTopicDetail.shortText}</p>
                  
                  <div className="border-top pt-2 mb-2">
                    <span className="fw-bold text-dark d-block mb-1" style={{ fontSize: '0.7rem' }}>Full Description</span>
                    <p className="text-muted" style={{ fontSize: '0.65rem', lineHeight: '1.4' }}>{selectedTopicDetail.description}</p>
                  </div>

                  <div className="bg-light p-2 rounded-2 mb-3 text-muted font-monospace" style={{ fontSize: '0.55rem' }}>
                    <div>Start: {selectedTopicDetail.startAt ? new Date(selectedTopicDetail.startAt).toLocaleString() : 'Immediate'}</div>
                    <div>End: {selectedTopicDetail.endAt ? new Date(selectedTopicDetail.endAt).toLocaleString() : 'Never'}</div>
                  </div>

                  <div className="d-flex align-items-center justify-content-between border-top pt-2">
                    <strong className="text-dark" style={{ fontSize: '0.7rem' }}><i className="bi bi-suit-heart-fill text-danger me-1"></i> {selectedTopicDetail.whizlesCount} Likes</strong>
                    <button 
                      className="btn btn-danger btn-xs rounded-pill px-3 py-1 fw-bold text-uppercase"
                      style={{ fontSize: '0.65rem' }}
                      onClick={() => handleLikeClick(selectedTopicDetail._id)}
                    >
                      Like
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Side: Information / Testing Panel */}
        <div className="col-12 col-md-5">
          <div className="card border-0 shadow-sm rounded-4 p-4 bg-white">
            <h5 className="fw-black text-dark border-bottom pb-2 mb-3">Live Feed Emulator Console</h5>
            
            <div className="small">
              <p className="text-muted mb-4">
                This emulator helps you test changes without refreshing the page or restarting server endpoints.
              </p>

              <div className="p-3 bg-light rounded-3 mb-3">
                <span className="fw-bold d-block text-primary mb-1"><i className="bi bi-patch-check-fill me-1"></i> Testing Instructions</span>
                <ul className="mb-0 ps-3 text-muted">
                  <li>Click the **Heart** button on any topic to increment user likes (Whizles) instantly.</li>
                  <li>Likes are **unlimited** for mock testing (no throttling applied).</li>
                  <li>If the trending feed config is **unlocked**, the backend automatically triggers rankings recalculations.</li>
                  <li>Ranks will shift immediately! Topics that gain velocity will move up, and the list updates automatically via sockets.</li>
                </ul>
              </div>

              <div className="p-3 bg-light rounded-3">
                <span className="fw-bold d-block text-primary mb-1"><i className="bi bi-arrow-down-up me-1"></i> Rank Shift Indicators</span>
                <p className="mb-0 text-muted">
                  Small green arrows (<i className="bi bi-arrow-up-short text-success fw-bold"></i>) and red arrows (<i className="bi bi-arrow-down-short text-danger fw-bold"></i>) next to rank numbers indicate the direction a topic has moved since you loaded this page.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SuperAdminLiveMobile;
