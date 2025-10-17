# DialogueHub: Real-Time Chat Frontend

A modern, responsive React-based frontend for DialogueHub, featuring real-time messaging capabilities powered by WebSocket technology.

![Login Interface](https://github.com/jacksonn455/DialogueHub/blob/main/images/login.png)
![Chat Interface](https://github.com/jacksonn455/DialogueHub/blob/main/images/message.png)

## 🚀 Features

- **Real-time Messaging**: Instant message delivery using WebSocket connections
- **Typing Indicators**: See when other users are typing
- **Online Status**: Real-time user presence tracking
- **Message Management**: Edit, delete, and read receipts
- **Responsive Design**: Optimized for desktop and mobile devices
- **Modern UI**: Clean, intuitive interface with smooth animations

## 🛠 Tech Stack

- **Frontend Framework**: React 18+ with TypeScript
- **State Management**: React Context API / Redux Toolkit
- **Real-time Communication**: Socket.io Client
- **Styling**: CSS-in-JS (Styled-components) or Tailwind CSS
- **Routing**: React Router v6
- **HTTP Client**: Axios for REST API calls
- **Build Tool**: Vite
- **Package Manager**: npm or yarn

## 📦 Installation

To get a local copy up and running, follow these simple steps.

### Prerequisites

Ensure you have Node.js and npm (or yarn) installed on your system.

### Clone the repository

```bash
git clone https://github.com/jacksonn455/DialogueHub.git
cd DialogueHub/frontend
```

### Install dependencies

```bash
npm install
# or with yarn
yarn install
```

### ⚙️ Configuration

Create a `.env` file in the `frontend` root directory with the following variables:

```env
# WebSocket server URL
VITE_WS_URL=ws://localhost:3000

# API base URL
VITE_API_URL=http://localhost:3000/api

# App version
VITE_APP_VERSION=1.0.0
```

## 🎯 Usage

### Starting the Development Server

```bash
npm run dev
# or with yarn
yarn dev
```

The application will be available at `http://localhost:5173`.

### Building for Production

```bash
npm run build
# Preview production build
npm run preview
```

## 🔌 WebSocket Integration

The frontend leverages a dedicated `SocketService` for managing WebSocket connections.

### Socket Service Example

```typescript
import { socketService } from './services/socketService';

// Connect to WebSocket
socketService.connect(userId);

// Send a message
socketService.sendMessage({
  chatId: '123',
  content: 'Hello World!',
  senderId: userId
});

// Listen for new messages
socketService.onMessage((message) => {
  console.log('New message received:', message);
  // Update UI with new message
});

// Typing indicator
socketService.typing(chatId, true);

// Join a chat room
socketService.joinChat(chatId);
```

### Key WebSocket Events

| Event        | Direction | Purpose                       |
|--------------|-----------|-------------------------------|
| `connect`      | Incoming  | Socket connection established |
| `disconnect`   | Incoming  | Socket disconnected           |
| `newMessage`   | Incoming  | Receive new messages          |
| `sendMessage`  | Outgoing  | Send new messages             |
| `typing`       | Outgoing  | Send typing indicators        |
| `userTyping`   | Incoming  | Receive typing indicators     |
| `userOnline`   | Incoming  | User online status            |
| `userOffline`  | Incoming  | User offline status           |
| `messageRead`  | Both      | Read receipts                 |

## 🏗 Project Structure

```text
src/
├── components/          # Reusable UI components
│   ├── chat/
│   │   ├── MessageBubble.tsx
│   │   ├── ChatHeader.tsx
│   │   └── TypingIndicator.tsx
│   ├── ui/
│   │   ├── Button.tsx
│   │   ├── Input.tsx
│   │   └── Modal.tsx
│   └── layout/
│       ├── Sidebar.tsx
│       └── MainLayout.tsx
├── pages/              # Page components
│   ├── Login.tsx
│   ├── Chat.tsx
│   └── Dashboard.tsx
├── hooks/              # Custom React hooks
│   ├── useWebSocket.ts
│   ├── useChat.ts
│   └── useAuth.ts
├── services/           # API and WebSocket services
│   ├── socketService.ts
│   ├── apiService.ts
│   └── authService.ts
├── contexts/           # React contexts
│   ├── AuthContext.tsx
│   ├── ChatContext.tsx
│   └── SocketContext.tsx
├── types/              # TypeScript definitions
│   ├── chat.types.ts
│   ├── user.types.ts
│   └── socket.types.ts
└── utils/              # Utility functions
    ├── formatters.ts
    └── validators.ts
```

## 🎨 Key Components

### Chat Interface

```tsx
const ChatInterface: React.FC = () => {
  const { messages, currentChat, sendMessage } = useChat();
  const [inputMessage, setInputMessage] = useState('');

  const handleSendMessage = () => {
    if (inputMessage.trim()) {
      sendMessage(inputMessage);
      setInputMessage('');
    }
  };

  return (
    <div className="chat-container">
      <ChatHeader chat={currentChat} />
      <MessageList messages={messages} />
      <MessageInput
        value={inputMessage}
        onChange={setInputMessage}
        onSend={handleSendMessage}
      />
      <TypingIndicator />
    </div>
  );
};
```

### Real-time Hook

```tsx
const useWebSocket = (userId: string) => {
  useEffect(() => {
    // Connect to WebSocket
    socketService.connect(userId);

    // Set up event listeners
    socketService.onMessage(handleNewMessage);
    socketService.onUserTyping(handleTyping);
    socketService.onUserOnline(handleUserOnline);

    return () => {
      // Cleanup on unmount
      socketService.offAll();
      socketService.disconnect();
    };
  }, [userId]);
};
```

## 🔒 Authentication Flow

- **Login**: User authenticates via REST API
- **Token Storage**: JWT token stored securely
- **Socket Connection**: WebSocket connects with user ID
- **Auto-reconnect**: Handles connection drops gracefully

## 📱 Responsive Design

The application is fully responsive with the following breakpoints:

- **Mobile**: `< 768px`
- **Tablet**: `768px - 1024px`
- **Desktop**: `> 1024px`

## 🧪 Testing

To run the tests, use the following commands:

```bash
# Run unit tests
npm run test

# Run e2e tests
npm run test:e2e

# Run with coverage
npm run test:coverage
```

## Author

<img src="https://avatars1.githubusercontent.com/u/46221221?s=460&u=0d161e390cdad66e925f3d52cece6c3e65a23eb2&v=4" width=115>  

<sub>@jacksonn455</sub>