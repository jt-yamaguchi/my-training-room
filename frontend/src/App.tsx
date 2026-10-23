import { useCallback, useEffect, useState } from 'react';
import { createRoom, deleteRoom, fetchRooms, updateRoom } from './api/rooms';
import type { Room, RoomRequest } from './api/types';
import RoomManagement from './components/RoomManagement';

// 画面切替タブ。日別予約状況(S-01)・会議室別予約(S-02)は予約機能の追加時にここへ加える
type Screen = 'rooms';

const SCREENS: Array<{ key: Screen; label: string }> = [{ key: 'rooms', label: '会議室管理' }];

export default function App() {
  const [screen, setScreen] = useState<Screen>('rooms');
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
              onClick={() => setScreen(s.key)}
            >
              {s.label}
            </button>
          ))}
        </nav>
      </header>

      {error && <p className="error">{error}</p>}

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
