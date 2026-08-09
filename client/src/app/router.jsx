import { createBrowserRouter } from 'react-router-dom';
import { AppShell } from '../components/layout/AppShell';
import { BrowseScreen } from '../features/browse/BrowseScreen';
import { RoomDetailScreen } from '../features/browse/RoomDetailScreen';
import { LoginScreen } from '../features/auth/LoginScreen';
import { ProfileScreen } from '../features/auth/ProfileScreen';
import { AuthGate } from '../features/auth/AuthGate';
import { ReserveScreen } from '../features/booking/ReserveScreen';
import { BookingsScreen } from '../features/booking/BookingsScreen';

export const router = createBrowserRouter([
  {
    path: '/',
    element: <AppShell />,
    children: [
      { index: true, element: <BrowseScreen /> },
      { path: 'rooms/:id', element: <RoomDetailScreen /> },
      { path: 'rooms/:id/reserve', element: <ReserveScreen /> },
      { path: 'bookings', element: <AuthGate><BookingsScreen /></AuthGate> },
      { path: 'login', element: <LoginScreen /> },
      { path: 'me', element: <AuthGate><ProfileScreen /></AuthGate> },
    ],
  },
]);
