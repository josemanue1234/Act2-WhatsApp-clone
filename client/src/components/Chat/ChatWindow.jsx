import React, { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { useSocket } from '../../contexts/SocketContext';
import { useAuth } from '../../contexts/AuthContext';
import axios from 'axios';
import moment from 'moment';

const ChatWindow = () => {
  const { contactId } = useParams();
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [contact, setContact] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { user } = useAuth();
  const { sendMessage, listenForMessages, onlineUsers } = useSocket();
  const messagesEndRef = useRef(null);

  useEffect(() => {
    const loadChatData = async () => {
      try {
        setLoading(true);
        const [contactRes, messagesRes] = await Promise.all([
          axios.get(`/api/users/${contactId}`),
          axios.get(`/api/messages?contactId=${contactId}`)
        ]);
        
        setContact(contactRes.data);
        setMessages(messagesRes.data);
      } catch (err) {
        setError(err.response?.data?.error || 'Error al cargar el chat');
      } finally {
        setLoading(false);
      }
    };
    
    if (contactId) {
      loadChatData();
    }
  }, [contactId]);

  useEffect(() => {
    if (!contactId) return;
    
    const unsubscribe = listenForMessages((message) => {
      if (message.senderId === contactId || message.receiverId === contactId) {
        setMessages(prev => [...prev, message]);
      }
    });
    
    return unsubscribe;
  }, [contactId, listenForMessages]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() || !contactId) return;
    
    try {
      const tempId = Date.now();
      const tempMessage = {
        _id: tempId,
        sender: user._id,
        receiver: contactId,
        content: newMessage,
        timestamp: new Date(),
        delivered: false,
        read: false
      };
      
      setMessages(prev => [...prev, tempMessage]);
      setNewMessage('');
      
      const sentMessage = await sendMessage(contactId, newMessage);
      
      setMessages(prev => prev.map(msg => 
        msg._id === tempId ? { ...sentMessage, _id: sentMessage._id } : msg
      ));
    } catch (err) {
      setError('Error al enviar el mensaje');
      setMessages(prev => prev.filter(msg => msg._id !== tempId));
    }
  };

  if (loading) return <div className="loading-chat">Cargando chat...</div>;
  if (error) return <div className="error-chat">{error}</div>;
  if (!contact) return <div className="no-contact">Selecciona un contacto para chatear</div>;

  return (
    <div className="chat-window">
      <div className="chat-header">
        <div className="contact-avatar">
          <span>{contact.username.charAt(0).toUpperCase()}</span>
        </div>
        <div className="contact-info">
          <h2>{contact.username}</h2>
          <p>
            {onlineUsers[contact._id] ? 'En línea' : `Última vez ${moment(contact.lastSeen).fromNow()}`}
          </p>
        </div>
      </div>
      
      <div className="messages-container">
        {messages.map((message) => (
          <div
            key={message._id}
            className={`message ${message.sender === user._id ? 'sent' : 'received'}`}
          >
            <div className="message-content">
              <p>{message.content}</p>
              <div className="message-time">
                {moment(message.timestamp).format('HH:mm')}
                {message.sender === user._id && (
                  <span className="message-status">
                    {message.read ? '✓✓' : message.delivered ? '✓' : ''}
                  </span>
                )}
              </div>
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>
      
      <form onSubmit={handleSendMessage} className="message-input">
        <input
          type="text"
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          placeholder="Escribe un mensaje..."
        />
        <button type="submit">
          Enviar
        </button>
      </form>
    </div>
  );
};

export default ChatWindow;