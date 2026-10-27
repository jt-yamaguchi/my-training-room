import { useCallback, useEffect, useState } from 'react';
import { createRoom, deleteRoom, fetchRooms, updateRoom } from './api/rooms';
import type { Room, RoomRequest } from './api/types';
import DailyReservations from './components/DailyReservations';
import RoomManagement from './components/RoomManagement';

// 画面切替タブ(基本設計 2.4)。URLは / のまま state で切り替える
type Screen = 'daily' | 'rooms';

const SCREENS: Array<{ key: Screen; label: string }> = [
  { key: 'daily', label: '日別' },
  { key: 'rooms', label: '会議室管理' },
];

export default function App() {
  const [screen, setScreen] = useState<Screen>('daily');
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(true);
  // API失敗時のメッセージ。画面上部に表示する(基本設計「共通 / エラー表示」)
  const [error, setError] = useState<string | null>(null);

  const loadRooms = useCallback(async () => {
    try {
      setRooms(await fetchRooms());
    } catch (e) {
      setError(e instanceof Error ? e.message : '会議室の取得に失敗しました');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadRooms();
  }, [loadRooms]);

  // 更新系の操作を実行して一覧を再取得する。失敗時はメッセージを表示して false を返す
  const runAndReload = async (action: () => Promise<unknown>, fallback: string) => {
    try {
      setError(null);
      await action();
      await loadRooms();
      return true;
    } catch (e) {
      setError(e instanceof Error ? e.message : fallback);
      return false;
    }
  };

  const handleCreate = (request: RoomRequest) =>
    runAndReload(() => createRoom(request), '会議室の登録に失敗しました');

  const handleUpdate = (id: number, request: RoomRequest) =>
    runAndReload(() => updateRoom(id, request), '会議室の更新に失敗しました');

  const handleDelete = async (room: Room) => {
    await runAndReload(() => deleteRoom(room.id), '会議室の削除に失敗しました');
  };

  return (
    <main className="container">
      <header className="header">
        <h1>会議室予約システム</h1>
        <nav className="tabs">
          {SCREENS.map((s) => (
            <button
              key={s.key}
              type="button"
              className={s.key === screen ? 'tab active' : 'tab'}
              aria-current={s.key === screen ? 'page' : undefined}
              onClick={() => {
                setError(null);
                setScreen(s.key);
              }}
            >
              {s.label}
            </button>
          ))}
        </nav>
      </header>

      {error && <p className="error">{error}</p>}

      {screen === 'daily' && <DailyReservations rooms={rooms} onError={setError} />}

      {screen === 'rooms' && (
        <RoomManagement
          rooms={rooms}
          loading={loading}
          onCreate={handleCreate}
          onUpdate={handleUpdate}
          onDelete={handleDelete}
        />
      )}
    </main>
  );
}
