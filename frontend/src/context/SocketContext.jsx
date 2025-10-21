import React, { createContext, useEffect, useState, useRef } from "react";
import { initializeSocket, disconnectSocket } from "../api/socket";
import { useAuth } from "../hooks/useAuth";

export const SocketContext = createContext();

export const SocketProvider = ({ children }) => {
  const { user } = useAuth();
  const [socket, setSocket] = useState(null);
  const [connected, setConnected] = useState(false);
  const previousUserIdRef = useRef();

  useEffect(() => {
    if (!user?.id) {
      if (socket) {
        console.log("No user, disconnecting socket");
        disconnectSocket();
        setSocket(null);
        setConnected(false);
      }
      return;
    }

    if (previousUserIdRef.current !== user.id) {
      console.log(
        "User changed from",
        previousUserIdRef.current,
        "to",
        user.id,
        "- reinitializing socket"
      );

      if (socket) {
        disconnectSocket();
        setSocket(null);
        setConnected(false);
      }

      const newSocket = initializeSocket(user.id);

      newSocket.on("connect", () => {
        console.log("Socket connected for user:", user.id);
        setConnected(true);
      });

      newSocket.on("disconnect", () => {
        console.log("Socket disconnected for user:", user.id);
        setConnected(false);
      });

      newSocket.on("connect_error", (error) => {
        console.error("Socket connection error:", error);
        setConnected(false);
      });

      setSocket(newSocket);
      previousUserIdRef.current = user.id;
    }

    return () => {};
  }, [user, user?.id]);

  return (
    <SocketContext.Provider value={{ socket, connected }}>
      {children}
    </SocketContext.Provider>
  );
};
