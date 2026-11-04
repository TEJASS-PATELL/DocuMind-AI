import { Toaster } from 'react-hot-toast';
import './App.css';
import { Outlet } from 'react-router-dom';
import { useEffect } from 'react';
import api from './api';

function App() {

  useEffect(() => {
    if (sessionStorage.getItem('guest') === 'true') return;

    api.get('/api/auth/userinfo')
      .then(res => {
        localStorage.setItem('username', res.data.name);
        localStorage.setItem('email', res.data.email);
      })
      .catch(err => console.error('Failed to fetch user info:', err));
  }, []);

  return (
    <>
      <Toaster position="top-center" reverseOrder={false} />
      <Outlet />
    </>
  );
}

export default App;
