import React from 'react';
import './TypingIndicator.css';

const TypingIndicator = ({ users = [] }) => {
  if (users.length === 0) return null;

  const getUserText = () => {
    if (users.length === 1) {
      return 'está digitando...';
    } else if (users.length === 2) {
      return 'estão digitando...';
    } else {
      return `${users.length} pessoas estão digitando...`;
    }
  };

  return (
    <div className="typing-indicator-container">
      <div className="typing-indicator">
        <div className="typing-dots">
          <span className="dot"></span>
          <span className="dot"></span>
          <span className="dot"></span>
        </div>
        <span className="typing-text">{getUserText()}</span>
      </div>
    </div>
  );
};

export default TypingIndicator;