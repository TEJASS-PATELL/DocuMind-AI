import React, { Suspense } from 'react';
import { createRoot } from 'react-dom/client';
import { RouterProvider, createBrowserRouter } from 'react-router-dom';
import './index.css';
import App from './App';
import HomePage from './Pages/Home';
import Login from './Pages/Login';
import Signup from './Pages/Signup';
import ProtectedRoute from './security/ProtectedRoute';
import PublicOnlyRoute from './security/PublicOnlyRoute';
import Loader from './Components/Loader';

const LazyChatbot = React.lazy(() => import('./Pages/Chatbot'));

const router = createBrowserRouter([
  {
    path: '/',
    element: <App />,
    children: [
      { index: true, element: <HomePage /> },
      {
        element: <PublicOnlyRoute />,
        children: [
          { path: '/login', element: <Login /> },
          { path: '/signup', element: <Signup /> },
        ],
      },
      {
        path: '/chatbot',
        element: <ProtectedRoute />,
        children: [
          {
            index: true,
            element: (
              <Suspense fallback={<Loader />}>
                <LazyChatbot />
              </Suspense>
            ),
          },
        ],
      },
    ],
  },
]);

createRoot(document.getElementById('root')!).render(
  <RouterProvider router={router} />
);
