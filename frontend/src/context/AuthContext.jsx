import React, { createContext, useState, useContext } from 'react';

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState({
    id: 'user-123',
    name: 'João Silva',
    email: 'joao@example.com'
  });

  const [availableUsers] = useState([
    {
      id: 'user-123',
      name: 'João Silva',
      email: 'joao@example.com'
    }
  ]);

  const switchUser = (userId) => {
    const newUser = availableUsers.find(u => u.id === userId);
    if (newUser) {
      setUser(newUser);
      console.log('Switched to user:', newUser);
    }
  };

  const login = (userData) => {
    setUser(userData);
  };

  const logout = () => {
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ 
      user, 
      login, 
      logout, 
      switchUser, 
      availableUsers 
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};