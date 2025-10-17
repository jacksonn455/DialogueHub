import React from 'react';
import { getInitials, generateAvatarColor } from '../../utils/helpers';
import './Avatar.css';

const Avatar = ({ name, src, size = 40, online = false }) => {
  const initials = getInitials(name);
  const backgroundColor = generateAvatarColor(name);

  return (
    <div
      className="avatar"
      style={{
        width: size,
        height: size,
        backgroundColor: src ? 'transparent' : backgroundColor,
      }}
    >
      {src ? (
        <img src={src} alt={name} className="avatar-image" />
      ) : (
        <span className="avatar-initials" style={{ fontSize: size * 0.4 }}>
          {initials}
        </span>
      )}
      {online && <span className="avatar-online-indicator" />}
    </div>
  );
};

export default Avatar;