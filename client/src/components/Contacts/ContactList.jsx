import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useSocket } from '../../contexts/SocketContext';
import axios from 'axios';
import moment from 'moment';

const ContactList = () => {
  const [contacts, setContacts] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { user } = useAuth();
  const { onlineUsers } = useSocket();

  useEffect(() => {
    const fetchContacts = async () => {
      try {
        setLoading(true);
        const response = await axios.get('/api/contacts');
        setContacts(response.data);
      } catch (err) {
        setError(err.response?.data?.error || 'Error al cargar contactos');
      } finally {
        setLoading(false);
      }
    };
    
    if (user) {
      fetchContacts();
    }
  }, [user]);

  const filteredContacts = contacts.filter(contact =>
    contact.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
    contact.phone.includes(searchTerm)
  );

  if (loading) return <div className="loading-contacts">Cargando contactos...</div>;
  if (error) return <div className="error-contacts">{error}</div>;

  return (
    <div className="contact-list">
      <div className="search-bar">
        <input
          type="text"
          placeholder="Buscar contactos..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>
      
      <div className="contacts">
        {filteredContacts.length > 0 ? (
          filteredContacts.map((contact) => (
            <Link
              key={contact._id}
              to={`/chat/${contact._id}`}
              className="contact-item"
            >
              <div className="contact-avatar">
                <span>{contact.username.charAt(0).toUpperCase()}</span>
                {onlineUsers[contact._id] && <div className="online-badge"></div>}
              </div>
              <div className="contact-info">
                <h3>{contact.username}</h3>
                <p>{contact.lastMessage?.content || 'Nuevo contacto'}</p>
              </div>
              <div className="contact-time">
                {contact.lastMessage
                  ? moment(contact.lastMessage.timestamp).fromNow()
                  : ''}
              </div>
            </Link>
          ))
        ) : (
          <div className="no-contacts">
            {searchTerm ? 'No se encontraron contactos' : 'Añade contactos para comenzar a chatear'}
          </div>
        )}
      </div>
    </div>
  );
};

export default ContactList;