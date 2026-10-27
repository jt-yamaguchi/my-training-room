import { useEffect, useState } from 'react';
import type { ReservationRequest, Room } from '../api/types';

type Props = {
  rooms: Room[];
  // 日付の初期値(日別画面で選択中の日付)。変わったらフォームの日付も追従する
  initialDate: string;
  // 成功したら true を返す。true のときだけ件名・時刻を空に戻す(失敗時は修正して再送できるよう残す)
  onSubmit: (request: ReservationRequest) => Promise<boolean>;
};

// 15分刻みの時刻の選択肢(00:00〜23:45)。日またぎは不可のため終了の上限も 23:45(基本設計 2.2 / 2.3)
const TIME_OPTIONS: string[] = Array.from({ length: 96 }, (_, i) => {
  const hour = String(Math.floor(i / 4)).padStart(2, '0');
  const minute = String((i % 4) * 15).padStart(2, '0');
  return `${hour}:${minute}`;
});

// 予約登録フォーム。必須未入力の間は登録ボタンを非活性にする。
// 終了が開始以前・過去日時・重複は API が判定し、メッセージを画面上部に表示する
export default function ReservationForm({ rooms, initialDate, onSubmit }: Props) {
  const [roomId, setRoomId] = useState('');
  const [date, setDate] = useState(initialDate);
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [title, setTitle] = useState('');
  const [reserverName, setReserverName] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    setDate(initialDate);
  }, [initialDate]);

  // 選択中の会議室が削除された場合は未選択に戻す
  const selectedRoomExists = rooms.some((r) => String(r.id) === roomId);
  const effectiveRoomId = selectedRoomExists ? roomId : '';

  const canSubmit =
    effectiveRoomId !== '' &&
    date !== '' &&
    startTime !== '' &&
    endTime !== '' &&
    title.trim() !== '' &&
    reserverName.trim() !== '' &&
    !submitting;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) {
      return;
    }
    setSubmitting(true);
    const succeeded = await onSubmit({
      roomId: Number(effectiveRoomId),
      date,
      startTime,
      endTime,
      title: title.trim(),
      reserverName: reserverName.trim(),
    });
    setSubmitting(false);
    if (succeeded) {
      // 続けて同じ会議室・同じ人で登録しやすいよう、会議室・日付・予約者名は残す
      setStartTime('');
      setEndTime('');
      setTitle('');
    }
  };

  return (
    <form className="reservation-form" onSubmit={handleSubmit}>
      <select
        value={effectiveRoomId}
        onChange={(e) => setRoomId(e.target.value)}
        aria-label="会議室"
      >
        <option value="">会議室を選択</option>
        {rooms.map((room) => (
          <option key={room.id} value={room.id}>
            {room.name}(定員 {room.capacity} 名)
          </option>
        ))}
      </select>
      <input
        type="date"
        value={date}
        onChange={(e) => setDate(e.target.value)}
        aria-label="予約日"
      />
      <div className="reservation-form-times">
        <select
          value={startTime}
          onChange={(e) => setStartTime(e.target.value)}
          aria-label="開始時刻"
        >
          <option value="">開始</option>
          {TIME_OPTIONS.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
        <span>〜</span>
        <select value={endTime} onChange={(e) => setEndTime(e.target.value)} aria-label="終了時刻">
          <option value="">終了</option>
          {TIME_OPTIONS.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
      </div>
      <input
        type="text"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="件名(100文字まで)"
        maxLength={100}
        aria-label="件名"
      />
      <input
        type="text"
        value={reserverName}
        onChange={(e) => setReserverName(e.target.value)}
        placeholder="予約者名(50文字まで)"
        maxLength={50}
        aria-label="予約者名"
      />
      <div className="reservation-form-actions">
        <button type="submit" disabled={!canSubmit}>
          予約する
        </button>
      </div>
    </form>
  );
}
