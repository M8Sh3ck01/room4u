import { createBrowserRouter } from 'react-router-dom';
import { AppShell } from '../components/layout/AppShell';
import { HomeScreen } from '../features/home/HomeScreen';
import { RoomDetailScreen } from '../features/browse/RoomDetailScreen';
import { LoginScreen } from '../features/auth/LoginScreen';
import { ProfileScreen } from '../features/auth/ProfileScreen';
import { AuthGate } from '../features/auth/AuthGate';

export const router = createBrowserRouter([
  {
    path: '/',
    element: <AppShell />,
    children: [
      { index: true, element: <HomeScreen /> },
      { path: 'rooms/:id', element: <RoomDetailScreen /> },
      { path: 'login', element: <LoginScreen /> },
      { path: 'me', element: <AuthGate><ProfileScreen /></AuthGate> },
    ],
  },
]);
