// src/components/Chat/ChatList.jsx
import React, { useState, useEffect } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useSocket } from '../../contexts/SocketContext';
import axios from 'axios';
import moment from 'moment';
import './ChatList.css';

const ChatList = () => {
  const [chats, setChats] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { user } = useAuth();
  const { onlineUsers } = useSocket();
  const { chatId } = useParams();

  useEffect(() => {
    const fetchChats = async () => {
      try {
        setLoading(true);
        const response = await axios.get('/api/chats');
        setChats(response.data);
      } catch (err) {
        setError(err.response?.data?.error || 'Error al cargar chats');
      } finally {
        setLoading(false);
      }
    };

    if (user) {
      fetchChats();
    }
  }, [user]);

  if (loading) return <div className="loading-chats">Cargando chats...</div>;
  if (error) return <div className="error-chats">{error}</div>;

  return (
    <div className="chat-list">
      <div className="chat-list-header">
        <h3>Chats</h3>
      </div>
      <div className="chat-items">
        {chats.map((chat) => (
          <Link
            key={chat._id}
            to={`/chat/${chat.contact._id}`}
            className={`chat-item ${chatId === chat.contact._id ? 'active' : ''}`}
          >
            <div className="chat-avatar">
              <span>{chat.contact.username.charAt(0).toUpperCase()}</span>
              {onlineUsers[chat.contact._id] && <div className="online-badge"></div>}
            </div>
            <div className="chat-info">
              <div className="chat-contact">
                <h4>{chat.contact.username}</h4>
                <span className="chat-time">
                  {moment(chat.lastMessage?.timestamp).fromNow()}
                </span>
              </div>
              <p className="chat-preview">
                {chat.lastMessage?.content || 'Nuevo chat'}
              </p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
};

export default ChatList;