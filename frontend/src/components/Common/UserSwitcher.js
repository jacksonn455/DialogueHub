import React from 'react';
import { useAuth } from '../../context/AuthContext';
import './UserSwitcher.css';

const UserSwitcher = () => {
  const { user, switchUser, availableUsers } = useAuth();

  return (
    <div className="user-switcher">
      <span className="current-user">
        Logged in as: <strong>{user?.name}</strong>
      </span>
      <div className="user-buttons">
        {availableUsers.map(availableUser => (
          <button
            key={availableUser.id}
            onClick={() => switchUser(availableUser.id)}
            disabled={user?.id === availableUser.id}
            className={`user-btn ${user?.id === availableUser.id ? 'active' : ''}`}
          >
            {availableUser.name}
          </button>
        ))}
      </div>
    </div>
  );
};

export default UserSwitcher;