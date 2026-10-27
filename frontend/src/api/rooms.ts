// 会議室APIクライアント。
// コンポーネントから直接 fetch せず、必ずこのモジュールを経由する。
// URLは相対パス /api/... のみ(絶対URLの記述は禁止。CLAUDE.md参照)
import { handleResponse } from './http';
import type { Room, RoomRequest } from './types';

export async function fetchRooms(): Promise<Room[]> {
  const res = await fetch('/api/rooms');
  return handleResponse<Room[]>(res);
}

export async function createRoom(request: RoomRequest): Promise<Room> {
  const res = await fetch('/api/rooms', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(request),
  });
  return handleResponse<Room>(res);
}

export async function updateRoom(id: number, request: RoomRequest): Promise<Room> {
  const res = await fetch(`/api/rooms/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(request),
  });
  return handleResponse<Room>(res);
}

// 未来の予約(進行中を含む)がある会議室は 409 になる
export async function deleteRoom(id: number): Promise<void> {
  const res = await fetch(`/api/rooms/${id}`, { method: 'DELETE' });
  return handleResponse<void>(res);
}
