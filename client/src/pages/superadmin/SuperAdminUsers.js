import React, { useState, useEffect } from 'react';
import socket from '../../socket';
import { api } from '../../context/AuthContext';

const SuperAdminUsers = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterRole, setFilterRole] = useState('all');
  const [timeFilter, setTimeFilter] = useState('all');

  const fetchUsers = async () => {
    try {
      const res = await api.get('/superadmin/users');
      if (res.data.success) {
        setUsers(res.data.users);
      }
    } catch (err) {
      console.error('Error fetching users', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  // Socket listener for real-time users updates
  useEffect(() => {
    socket.emit('joinSuperAdmin');

    const handleUpdate = () => {
      fetchUsers();
    };

    socket.on('usersUpdated', handleUpdate);

    return () => {
      socket.off('usersUpdated', handleUpdate);
    };
  }, []);

  const filteredUsers = users.filter((u) => {
    const matchesSearch = 
      u.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.email.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesRole = filterRole === 'all' || u.role === filterRole;
    
    let matchesTime = true;
    if (timeFilter !== 'all') {
      const createdDate = new Date(u.createdAt);
      const now = new Date();
      if (timeFilter === 'week') {
        const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        matchesTime = createdDate >= oneWeekAgo;
      } else if (timeFilter === 'month') {
        const oneMonthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        matchesTime = createdDate >= oneMonthAgo;
      }
    }
    
    return matchesSearch && matchesRole && matchesTime;
  });

  if (loading) {
    return (
      <div className="text-center py-5">
        <div className="spinner-border text-primary" role="status"></div>
      </div>
    );
  }

  return (
    <div className="animated-fade-in">
      <div className="mb-4">
        <h1 className="fw-extrabold text-dark mb-1">Users Directory</h1>
        <p className="text-muted">Review credentials and profile records of accounts on the platform.</p>
      </div>

      <div className="card border-0 p-4 bg-white shadow-sm rounded-4">
        <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-3 mb-4">
          <h5 className="fw-bold mb-0 text-dark">Platform Users Directory</h5>
          
          <div className="d-flex flex-wrap gap-2">
            <input 
              type="text" 
              className="form-control form-control-sm"
              placeholder="Search Users Name or Email..."
              style={{ width: '220px' }}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />

            <select 
              className="form-select form-select-sm" 
              style={{ width: '150px' }}
              value={filterRole}
              onChange={(e) => setFilterRole(e.target.value)}
            >
              <option value="all">All Roles</option>
              <option value="admin">Business Admin</option>
              <option value="superadmin">Super Admin</option>
            </select>

            <select 
              className="form-select form-select-sm" 
              style={{ width: '150px' }}
              value={timeFilter}
              onChange={(e) => setTimeFilter(e.target.value)}
            >
              <option value="all">All Time</option>
              <option value="week">This Week</option>
              <option value="month">This Month</option>
            </select>
          </div>
        </div>

        <div className="table-responsive">
          <table className="table table-hover align-middle">
            <thead>
              <tr className="table-light text-muted small">
                <th scope="col" style={{ width: '60px' }}>ID</th>
                <th scope="col">PROFILE</th>
                <th scope="col">NAME</th>
                <th scope="col">EMAIL</th>
                <th scope="col">ROLE</th>
                <th scope="col">PHONE NUMBER</th>
                <th scope="col">JOINED</th>
              </tr>
            </thead>
            <tbody>
              {filteredUsers.length > 0 ? (
                filteredUsers.map((u, index) => (
                  <tr key={u._id}>
                    <td><span className="text-muted">{String(filteredUsers.length - index).padStart(2, '0')}</span></td>
                    <td>
                      <div className="bg-primary text-white rounded-circle d-flex align-items-center justify-content-center fw-bold font-outfit" style={{ width: '36px', height: '36px' }}>
                        {u.name.substring(0, 1).toUpperCase()}
                      </div>
                    </td>
                    <td><strong className="text-dark">{u.name}</strong></td>
                    <td>{u.email}</td>
                    <td>
                      <span 
                        className="badge rounded-pill text-uppercase px-2.5 py-1" 
                        style={{ 
                          fontSize: '0.65rem', 
                          fontWeight: 'bold',
                          color: u.role === 'superadmin' ? '#dc3545' : '#0d6efd',
                          backgroundColor: u.role === 'superadmin' ? '#f8d7da' : '#cfe2ff',
                          border: `1px solid ${u.role === 'superadmin' ? '#f5c2c7' : '#b6d4fe'}`
                        }}
                      >
                        {u.role}
                      </span>
                    </td>
                    <td>+1 (555) 019-2834</td>
                    <td className="text-muted small">{new Date(u.createdAt).toLocaleDateString([], { day: 'numeric', month: 'short', year: 'numeric' })}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="7" className="text-center py-5 text-muted small">No user accounts found matching your queries.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default SuperAdminUsers;
