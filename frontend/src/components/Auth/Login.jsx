import React, { useState } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { MessageSquare } from 'lucide-react';
import './Login.css';

const Login = () => {
  const [userId, setUserId] = useState('');
  const [userName, setUserName] = useState('');
  const { login } = useAuth();

  const handleSubmit = (e) => {
    e.preventDefault();
    if (userId.trim() && userName.trim()) {
      login({ id: userId, name: userName });
    }
  };

  return (
    <div className="login-container">
      <div className="login-card">
        <div className="login-header">
          <MessageSquare size={48} className="login-icon" />
          <h1>Dialog Hub</h1>
          <p>Sign in to start chatting</p>
        </div>
        
        <form onSubmit={handleSubmit} className="login-form">
          <div className="form-group">
            <label htmlFor="userId">User ID</label>
            <input
              id="userId"
              type="text"
              placeholder="Enter your ID"
              value={userId}
              onChange={(e) => setUserId(e.target.value)}
              required
            />
          </div>
          
          <div className="form-group">
            <label htmlFor="userName">Name</label>
            <input
              id="userName"
              type="text"
              placeholder="Enter your name"
              value={userName}
              onChange={(e) => setUserName(e.target.value)}
              required
            />
          </div>
          
          <button type="submit" className="btn-login">
            Enter
          </button>
        </form>
      </div>
    </div>
  );
};

export default Login;