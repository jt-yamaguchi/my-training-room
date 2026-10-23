// API の型定義はこのファイルに集約する

export type Room = {
  id: number;
  name: string;
  capacity: number;
  // 備考。null = 未入力
  note: string | null;
  createdAt: string;
};

export type RoomRequest = {
  name: string;
  capacity: number;
  // null = 未入力(更新時に null を送ると備考を消す)
  note: string | null;
};
