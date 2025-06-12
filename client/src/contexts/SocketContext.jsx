import React, { createContext, useContext, useEffect, useState } from 'react';
import { io } from 'socket.io-client';
import { useAuth } from './AuthContext';

const SocketContext = createContext();

export const SocketProvider = ({ children }) => {
  const [socket, setSocket] = useState(null);
  const [onlineUsers, setOnlineUsers] = useState({});
  const { user } = useAuth();

  useEffect(() => {
    if (!user) return;
    
    const serverIp = process.env.REACT_APP_SERVER_IP || 'localhost';
    const newSocket = io(`http://${serverIp}:4000`, {
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
      transports: ['websocket']
    });

    setSocket(newSocket);

    const token = localStorage.getItem('whatsapp-token');
    if (token) {
      newSocket.emit('authenticate', token);
    }

    newSocket.on('contact-status', ({ userId, online }) => {
      setOnlineUsers(prev => ({
        ...prev,
        [userId]: online
      }));
    });

    return () => {
      newSocket.disconnect();
    };
  }, [user]);

  const sendMessage = (receiverId, content) => {
    return new Promise((resolve, reject) => {
      if (!socket) return reject('Socket no conectado');
      
      socket.emit('send-message', { receiverId, content }, (response) => {
        if (response.error) {
          reject(response.error);
        } else {
          resolve(response);
        }
      });
    });
  };

  const listenForMessages = (callback) => {
    if (!socket) return () => {};
    
    const handler = (message) => {
      callback(message);
    };
    
    socket.on('new-message', handler);
    
    return () => {
      socket.off('new-message', handler);
    };
  };

  const value = {
    socket,
    onlineUsers,
    sendMessage,
    listenForMessages,
    isConnected: socket?.connected || false
  };

  return (
    <SocketContext.Provider value={value}>
      {children}
    </SocketContext.Provider>
  );
};

export const useSocket = () => useContext(SocketContext);