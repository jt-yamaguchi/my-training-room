import { useCallback, useEffect, useState } from 'react';
import { createReservation, deleteReservation, fetchReservationsByDate } from '../api/reservations';
import type { Reservation, ReservationRequest, Room } from '../api/types';
import ReservationForm from './ReservationForm';
import ReservationItem from './ReservationItem';

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

// yyyy-MM-dd を days 日ずらす
function shiftDate(value: string, days: number): string {
  const [y, m, d] = value.split('-').map(Number);
  return toDateString(new Date(y, m - 1, d + days));
}

// S-01 日別予約状況画面。選択した日の全会議室の予約一覧と、予約登録フォーム
export default function DailyReservations({ rooms, onError }: Props) {
  const [date, setDate] = useState(() => toDateString(new Date()));
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [loading, setLoading] = useState(true);

  const loadReservations = useCallback(async () => {
    try {
      setReservations(await fetchReservationsByDate(date));
    } catch (e) {
      onError(e instanceof Error ? e.message : '予約の取得に失敗しました');
    } finally {
      setLoading(false);
    }
  }, [date, onError]);

  useEffect(() => {
    void loadReservations();
  }, [loadReservations]);

  // 予約の登録・取り消しを実行して一覧を再取得する。失敗時はメッセージを表示して false を返す
  const runAndReload = async (action: () => Promise<unknown>, fallback: string) => {
    try {
      onError(null);
      await action();
      await loadReservations();
      return true;
    } catch (e) {
      onError(e instanceof Error ? e.message : fallback);
      return false;
    }
  };

  const handleCreate = async (request: ReservationRequest) => {
    const succeeded = await runAndReload(
      () => createReservation(request),
      '予約の登録に失敗しました',
    );
    // 選択中と別の日付で登録した場合は、登録した日の一覧に切り替える
    if (succeeded && request.date !== date) {
      setDate(request.date);
    }
    return succeeded;
  };

  const handleCancel = async (reservation: Reservation) => {
    await runAndReload(() => deleteReservation(reservation.id), '予約の取り消しに失敗しました');
  };

  return (
    <section>
      <div className="date-nav">
        <button type="button" onClick={() => setDate(shiftDate(date, -1))}>
          前日
        </button>
        <input
          type="date"
          value={date}
          onChange={(e) => e.target.value && setDate(e.target.value)}
          aria-label="表示する日付"
        />
        <button type="button" onClick={() => setDate(shiftDate(date, 1))}>
          翌日
        </button>
      </div>

      <h2 className="section-title">{date} の予約状況</h2>
      {loading ? (
        <p className="empty">読み込み中...</p>
      ) : rooms.length === 0 ? (
        <p className="empty">会議室はありません。会議室管理から登録してください。</p>
      ) : (
        <ul className="daily-list">
          {rooms.map((room) => {
            const roomReservations = reservations.filter((r) => r.roomId === room.id);
            return (
              <li key={room.id} className="daily-room" aria-label={`${room.name}の予約`}>
                <div className="room-main">
                  <span className="room-name">{room.name}</span>
                  <span className="room-capacity">定員 {room.capacity} 名</span>
                </div>
                {roomReservations.length === 0 ? (
                  <p className="reservation-none">予約なし</p>
                ) : (
                  <ul className="reservation-list">
                    {roomReservations.map((r) => (
                      <ReservationItem key={r.id} reservation={r} onCancel={handleCancel} />
                    ))}
                  </ul>
                )}
              </li>
            );
          })}
        </ul>
      )}

      <h2 className="section-title">予約を登録</h2>
      <ReservationForm rooms={rooms} initialDate={date} onSubmit={handleCreate} />
    </section>
  );
}
