// APIクライアント共通のレスポンス処理。
// エラー時は API の {"message": "..."} を Error のメッセージにする
export async function handleResponse<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const body = (await res.json().catch(() => null)) as { message?: string } | null;
    throw new Error(body?.message ?? `APIエラー (HTTP ${res.status})`);
  }
  if (res.status === 204) {
    return undefined as T;
  }
  return (await res.json()) as T;
}
