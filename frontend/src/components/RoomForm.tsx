import { useState } from 'react';
import type { RoomRequest } from '../api/types';

type Props = {
  // 編集時は現在の値を渡す。未指定なら空のフォーム(新規登録)
  initial?: RoomRequest;
  submitLabel: string;
  // 成功したら true を返す。true のときだけ入力を初期値に戻す(失敗時は修正して再送できるよう残す)
  onSubmit: (request: RoomRequest) => Promise<boolean>;
  onCancel?: () => void;
};

// 定員は1以上の整数のみ受け付ける
function isValidCapacity(value: string): boolean {
  return /^\d+$/.test(value) && Number(value) >= 1;
}

// 会議室の登録・編集フォーム。必須未入力・定員不正の間は送信ボタンを非活性にする
export default function RoomForm({ initial, submitLabel, onSubmit, onCancel }: Props) {
  const [name, setName] = useState(initial?.name ?? '');
  const [capacity, setCapacity] = useState(initial ? String(initial.capacity) : '');
  const [note, setNote] = useState(initial?.note ?? '');
  const [submitting, setSubmitting] = useState(false);

  const canSubmit = name.trim() !== '' && isValidCapacity(capacity) && !submitting;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) {
      return;
    }
    setSubmitting(true);
    const succeeded = await onSubmit({
      name: name.trim(),
      capacity: Number(capacity),
      note: note.trim() || null,
    });
    setSubmitting(false);
    if (succeeded) {
      setName(initial?.name ?? '');
      setCapacity(initial ? String(initial.capacity) : '');
      setNote(initial?.note ?? '');
    }
  };

  return (
    <form className="room-form" onSubmit={handleSubmit}>
      <input
        type="text"
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="会議室名(50文字まで)"
        maxLength={50}
        aria-label="会議室名"
      />
      <input
        type="number"
        value={capacity}
        onChange={(e) => setCapacity(e.target.value)}
        placeholder="定員"
        min={1}
        step={1}
        aria-label="定員"
      />
      <input
        type="text"
        className="room-form-wide"
        value={note}
        onChange={(e) => setNote(e.target.value)}
        placeholder="備考(任意・200文字まで)"
        maxLength={200}
        aria-label="備考"
      />
      <div className="room-form-actions">
        {onCancel && (
          <button type="button" className="secondary" onClick={onCancel}>
            キャンセル
          </button>
        )}
        <button type="submit" disabled={!canSubmit}>
          {submitLabel}
        </button>
      </div>
    </form>
  );
}
