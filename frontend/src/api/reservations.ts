// 予約APIクライアント。
// コンポーネントから直接 fetch せず、必ずこのモジュールを経由する。
// URLは相対パス /api/... のみ(絶対URLの記述は禁止。CLAUDE.md参照)
import { handleResponse } from './http';
import type { Reservation, ReservationRequest } from './types';

// 指定日の全会議室の予約(会議室ID・開始時刻の昇順)
export async function fetchReservationsByDate(date: string): Promise<Reservation[]> {
  const res = await fetch(`/api/reservations?date=${encodeURIComponent(date)}`);
  return handleResponse<Reservation[]>(res);
}

// 指定会議室の予約(日付・開始時刻の昇順)
export async function fetchReservationsByRoom(roomId: number): Promise<Reservation[]> {
  const res = await fetch(`/api/reservations?roomId=${roomId}`);
  return handleResponse<Reservation[]>(res);
}

// 時間帯の重複は 409、過去日時・終了が開始以前などは 400 になる
export async function createReservation(request: ReservationRequest): Promise<Reservation> {
  const res = await fetch('/api/reservations', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(request),
  });
  return handleResponse<Reservation>(res);
}

export async function deleteReservation(id: number): Promise<void> {
  const res = await fetch(`/api/reservations/${id}`, { method: 'DELETE' });
  return handleResponse<void>(res);
}
