import { AuthProvider } from './context/AuthContext';
import { SocketProvider } from './context/SocketContext';
import { ChatProvider } from './context/ChatContext';
import Login from './components/Auth/Login';
import ChatWindow from './components/Chat/ChatWindow';
import Sidebar from './components/Sidebar/Sidebar';
import { useAuth } from './hooks/useAuth';
import UserSwitcher from './components/Common/UserSwitcher';
import './App.css';

function AppContent() {
  const { user } = useAuth();

  if (!user) {
    return <Login />;
  }

  return (
    <div className="app">
      <UserSwitcher />
      
      <div className="app-container">
        <Sidebar />
        <ChatWindow />
      </div>
    </div>
  );
}

function App() {
  return (
    <AuthProvider>
      <SocketProvider>
        <ChatProvider>
          <AppContent />
        </ChatProvider>
      </SocketProvider>
    </AuthProvider>
  );
}

export default App;