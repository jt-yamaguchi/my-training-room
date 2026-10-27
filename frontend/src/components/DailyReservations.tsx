import { useState } from 'react';
import { createReservation } from '../api/reservations';
import type { Reservation, ReservationRequest, Room } from '../api/types';
import ReservationForm from './ReservationForm';

type Props = {
  rooms: Room[];
  // API失敗時のメッセージを画面上部に表示する。null で表示を消す
  onError: (message: string | null) => void;
};

// Date をローカル(日本時間で利用する想定)の yyyy-MM-dd にする
function toDateString(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

// S-01 日別予約状況画面。予約登録フォームのみ(予約一覧・取り消しは予約照会機能で追加する)
export default function DailyReservations({ rooms, onError }: Props) {
  const [today] = useState(() => toDateString(new Date()));
  // 直前に登録した予約。一覧がまだないため、登録できたことをメッセージで示す
  const [created, setCreated] = useState<Reservation | null>(null);

  // 予約を登録する。失敗時はメッセージを表示して false を返す
  const handleCreate = async (request: ReservationRequest) => {
    try {
      onError(null);
      setCreated(null);
      setCreated(await createReservation(request));
      return true;
    } catch (e) {
      onError(e instanceof Error ? e.message : '予約の登録に失敗しました');
      return false;
    }
  };

  return (
    <section>
      {created && (
        <p className="notice" role="status">
          {created.roomName} の {created.date} {created.startTime}〜{created.endTime}(
          {created.title})を予約しました
        </p>
      )}

      <h2 className="section-title">予約を登録</h2>
      {rooms.length === 0 ? (
        <p className="empty">会議室はありません。会議室管理から登録してください。</p>
      ) : (
        <ReservationForm rooms={rooms} initialDate={today} onSubmit={handleCreate} />
      )}
    </section>
  );
}
