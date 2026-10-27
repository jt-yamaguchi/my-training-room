import { useCallback, useEffect, useState } from 'react';
import { deleteReservation, fetchReservationsByRoom } from '../api/reservations';
import type { Reservation, Room } from '../api/types';
import ReservationItem from './ReservationItem';

type Props = {
  rooms: Room[];
  // API失敗時のメッセージを画面上部に表示する。null で表示を消す
  onError: (message: string | null) => void;
};

// S-02 会議室別予約画面。選んだ会議室の予約を日付・開始時刻の昇順で一覧する
export default function RoomReservations({ rooms, onError }: Props) {
  const [selectedRoomId, setSelectedRoomId] = useState<number | null>(null);
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [loading, setLoading] = useState(false);

  // 未選択(または選択中の会議室が削除された)なら先頭の会議室を表示する
  const roomId = rooms.some((r) => r.id === selectedRoomId)
    ? selectedRoomId
    : (rooms[0]?.id ?? null);

  const loadReservations = useCallback(async () => {
    if (roomId === null) {
      setReservations([]);
      return;
    }
    setLoading(true);
    try {
      setReservations(await fetchReservationsByRoom(roomId));
    } catch (e) {
      onError(e instanceof Error ? e.message : '予約の取得に失敗しました');
    } finally {
      setLoading(false);
    }
  }, [roomId, onError]);

  useEffect(() => {
    void loadReservations();
  }, [loadReservations]);

  const handleCancel = async (reservation: Reservation) => {
    try {
      onError(null);
      await deleteReservation(reservation.id);
      await loadReservations();
    } catch (e) {
      onError(e instanceof Error ? e.message : '予約の取り消しに失敗しました');
    }
  };

  if (rooms.length === 0) {
    return <p className="empty">会議室はありません。会議室管理から登録してください。</p>;
  }

  return (
    <section>
      <div className="date-nav">
        <select
          value={roomId ?? ''}
          onChange={(e) => setSelectedRoomId(Number(e.target.value))}
          aria-label="表示する会議室"
        >
          {rooms.map((room) => (
            <option key={room.id} value={room.id}>
              {room.name}
            </option>
          ))}
        </select>
      </div>

      <h2 className="section-title">予約一覧</h2>
      {loading ? (
        <p className="empty">読み込み中...</p>
      ) : reservations.length === 0 ? (
        <p className="empty">この会議室の予約はありません。</p>
      ) : (
        <ul className="reservation-list">
          {reservations.map((r) => (
            <ReservationItem key={r.id} reservation={r} showDate onCancel={handleCancel} />
          ))}
        </ul>
      )}
    </section>
  );
}
