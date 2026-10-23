import { useState } from 'react';
import type { Room, RoomRequest } from '../api/types';
import RoomForm from './RoomForm';

type Props = {
  room: Room;
  onUpdate: (id: number, request: RoomRequest) => Promise<boolean>;
  onDelete: (room: Room) => Promise<void>;
};

// 会議室一覧の1行。「編集」で行をフォーム表示に切り替え、保存に成功したら表示に戻す
export default function RoomItem({ room, onUpdate, onDelete }: Props) {
  const [editing, setEditing] = useState(false);

  const handleUpdate = async (request: RoomRequest) => {
    const succeeded = await onUpdate(room.id, request);
    if (succeeded) {
      setEditing(false);
    }
    return succeeded;
  };

  const handleDelete = async () => {
    if (!window.confirm(`会議室「${room.name}」を削除します。よろしいですか?`)) {
      return;
    }
    await onDelete(room);
  };

  if (editing) {
    return (
      <li className="room-item editing" aria-label={`会議室「${room.name}」を編集中`}>
        <RoomForm
          initial={{ name: room.name, capacity: room.capacity, note: room.note }}
          submitLabel="保存"
          onSubmit={handleUpdate}
          onCancel={() => setEditing(false)}
        />
      </li>
    );
  }

  return (
    <li className="room-item">
      <div className="room-main">
        <span className="room-name">{room.name}</span>
        <span className="room-capacity">定員 {room.capacity} 名</span>
      </div>
      {room.note && <p className="room-note">{room.note}</p>}
      <div className="room-actions">
        <button
          type="button"
          onClick={() => setEditing(true)}
          aria-label={`会議室「${room.name}」を編集`}
        >
          編集
        </button>
        <button
          type="button"
          className="danger"
          onClick={() => void handleDelete()}
          aria-label={`会議室「${room.name}」を削除`}
        >
          削除
        </button>
      </div>
    </li>
  );
}
