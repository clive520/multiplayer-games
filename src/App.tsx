import { Routes, Route, useNavigate } from 'react-router-dom';
import Home from './pages/Home';
import Lobby from './pages/Lobby';
import GameRoom from './pages/GameRoom';
import Leaderboard from './pages/Leaderboard';
import Profile from './pages/Profile';
import Settings from './pages/Settings';
import { RequireAuth } from './core/components/RequireAuth';
import { useAuth } from './core/auth/useAuth';

function HomePage() {
  const { user, profile, profileLoading, loading } = useAuth();
  const navigate = useNavigate();

  if (loading || (user && profileLoading)) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="dark:text-slate-400 text-slate-600 dark:text-slate-400">載入中...</p>
      </div>
    );
  }

  if (user) {
    const displayName = profile?.nickname ?? '載入中...';
    const photoURL = profile?.photoURL ?? user.photoURL;
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-6 p-6">
        <h1 className="text-4xl font-bold dark:text-white text-slate-900">Multiplayer Games</h1>
        <div className="flex items-center gap-3">
          {photoURL && (
            <img
              src={photoURL}
              alt={displayName}
              className="h-10 w-10 rounded-full"
            />
          )}
          <p className="dark:text-slate-300 text-slate-700">{displayName}</p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
          <button
            onClick={() => navigate('/lobby')}
            className="rounded-lg bg-blue-600 px-6 py-3 font-medium dark:text-white text-slate-900 hover:bg-blue-500"
          >
            進入遊戲大廳
          </button>
          <button
            onClick={() => navigate('/leaderboard')}
            className="rounded-lg dark:bg-slate-700 bg-slate-200 dark:bg-slate-700 bg-slate-200 px-6 py-3 font-medium dark:text-white text-slate-900 hover:dark:bg-slate-600 bg-slate-300 dark:hover:dark:bg-slate-600 bg-slate-300 hover:bg-slate-300"
          >
            排行榜
          </button>
          <button
            onClick={() => navigate('/profile')}
            className="rounded-lg dark:bg-slate-700 bg-slate-200 dark:bg-slate-700 bg-slate-200 px-6 py-3 font-medium dark:text-white text-slate-900 hover:dark:bg-slate-600 bg-slate-300 dark:hover:dark:bg-slate-600 bg-slate-300 hover:bg-slate-300"
          >
            我的檔案
          </button>
          <button
            onClick={() => navigate('/settings')}
            className="rounded-lg dark:bg-slate-700 bg-slate-200 dark:bg-slate-700 bg-slate-200 px-6 py-3 font-medium dark:text-white text-slate-900 hover:dark:bg-slate-600 bg-slate-300 dark:hover:dark:bg-slate-600 bg-slate-300 hover:bg-slate-300"
          >
            設定
          </button>
        </div>
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
      <Route
        path="/leaderboard"
        element={
          <RequireAuth>
            <Leaderboard />
          </RequireAuth>
        }
      />
      <Route
        path="/profile"
        element={
          <RequireAuth>
            <Profile />
          </RequireAuth>
        }
      />
      <Route
        path="/settings"
        element={
          <RequireAuth>
            <Settings />
          </RequireAuth>
        }
      />
    </Routes>
  );
}
