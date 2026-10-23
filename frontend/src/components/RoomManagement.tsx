import type { Room, RoomRequest } from '../api/types';
import RoomForm from './RoomForm';
import RoomItem from './RoomItem';

type Props = {
  rooms: Room[];
  loading: boolean;
  onCreate: (request: RoomRequest) => Promise<boolean>;
  onUpdate: (id: number, request: RoomRequest) => Promise<boolean>;
  onDelete: (room: Room) => Promise<void>;
};

// S-03 会議室管理画面。登録フォームと会議室一覧(ID昇順)
export default function RoomManagement({ rooms, loading, onCreate, onUpdate, onDelete }: Props) {
  return (
    <section>
      <h2 className="section-title">会議室を登録</h2>
      <RoomForm submitLabel="追加する" onSubmit={onCreate} />

      <h2 className="section-title">会議室一覧</h2>
      {loading ? (
        <p className="empty">読み込み中...</p>
      ) : rooms.length === 0 ? (
        <p className="empty">会議室はありません。上のフォームから登録してください。</p>
      ) : (
        <ul className="room-list">
          {rooms.map((room) => (
            <RoomItem key={room.id} room={room} onUpdate={onUpdate} onDelete={onDelete} />
          ))}
        </ul>
      )}
    </section>
  );
}
