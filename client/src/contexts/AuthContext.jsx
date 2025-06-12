import React, { createContext, useContext, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const verifyAuth = async () => {
      const token = localStorage.getItem('whatsapp-token');
      if (!token) {
        setLoading(false);
        return;
      }
      
      try {
        const response = await axios.get('/api/validate', {
          headers: { Authorization: `Bearer ${token}` }
        });
        setUser(response.data.user);
      } catch (err) {
        localStorage.removeItem('whatsapp-token');
      } finally {
        setLoading(false);
      }
    };
    
    verifyAuth();
  }, []);

  const register = async (username, phone, password) => {
    try {
      setError(null);
      const response = await axios.post('/api/register', { username, phone, password });
      localStorage.setItem('whatsapp-token', response.data.token);
      setUser(response.data.user);
      navigate('/chat');
      return { success: true };
    } catch (err) {
      setError(err.response?.data?.error || 'Error en el registro');
      return { success: false, error: err.response?.data?.error };
    }
  };

  const login = async (phone, password) => {
    try {
      setError(null);
      const response = await axios.post('/api/login', { phone, password });
      localStorage.setItem('whatsapp-token', response.data.token);
      setUser(response.data.user);
      navigate('/chat');
      return { success: true };
    } catch (err) {
      setError(err.response?.data?.error || 'Credenciales inválidas');
      return { success: false, error: err.response?.data?.error };
    }
  };

  const logout = () => {
    localStorage.removeItem('whatsapp-token');
    setUser(null);
    navigate('/');
  };

  return (
    <AuthContext.Provider value={{ user, loading, error, register, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);