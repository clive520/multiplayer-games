import { Routes, Route, useNavigate } from 'react-router-dom';
import Home from './pages/Home';
import Lobby from './pages/Lobby';
import GameRoom from './pages/GameRoom';
import { RequireAuth } from './core/components/RequireAuth';
import { useAuth } from './core/auth/useAuth';

function HomePage() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-slate-400">載入中...</p>
      </div>
    );
  }

  if (user) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-6 p-6">
        <h1 className="text-4xl font-bold">Multiplayer Games</h1>
        <div className="flex items-center gap-3">
          {user.photoURL && (
            <img
              src={user.photoURL}
              alt={user.displayName ?? 'avatar'}
              className="h-10 w-10 rounded-full"
            />
          )}
          <p className="text-slate-300">{user.displayName}</p>
        </div>
        <button
          onClick={() => navigate('/lobby')}
          className="rounded-lg bg-blue-600 px-6 py-3 font-medium text-white hover:bg-blue-500"
        >
          進入遊戲大廳
        </button>
      </div>
    );
  }

  return <Home />;
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route
        path="/lobby"
        element={
          <RequireAuth>
            <Lobby />
          </RequireAuth>
        }
      />
      <Route
        path="/rooms/:roomId"
        element={
          <RequireAuth>
            <GameRoom />
          </RequireAuth>
        }
      />
    </Routes>
  );
}
