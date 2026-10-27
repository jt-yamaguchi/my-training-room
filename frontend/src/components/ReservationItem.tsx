import type { Reservation } from '../api/types';

type Props = {
  reservation: Reservation;
  // 会議室別画面では日付も表示する
  showDate?: boolean;
  onCancel: (reservation: Reservation) => Promise<void>;
};

// 予約一覧の1行。取り消しは確認ダイアログで了承された場合のみ行う
export default function ReservationItem({ reservation, showDate = false, onCancel }: Props) {
  const handleCancel = async () => {
    const when = `${reservation.date} ${reservation.startTime}〜${reservation.endTime}`;
    if (!window.confirm(`予約「${reservation.title}」(${when})を取り消します。よろしいですか?`)) {
      return;
    }
    await onCancel(reservation);
  };

  return (
    <li className="reservation-item">
      <span className="reservation-time">
        {showDate && <span className="reservation-date">{reservation.date}</span>}
        {reservation.startTime}〜{reservation.endTime}
      </span>
      <span className="reservation-title">{reservation.title}</span>
      <span className="reservation-reserver">{reservation.reserverName}</span>
      <button
        type="button"
        className="danger"
        onClick={() => void handleCancel()}
        aria-label={`予約「${reservation.title}」(${reservation.startTime}〜${reservation.endTime})を取り消す`}
      >
        取り消し
      </button>
    </li>
  );
}
