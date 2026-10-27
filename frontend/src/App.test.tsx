import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import App from './App';
import type { Reservation, ReservationRequest, Room, RoomRequest } from './api/types';

// fetch をモックしてAPIなしでコンポーネントを検証する。
// 新しい画面のテストはこのファイルの書き方を模倣すること。
const seedRooms: Room[] = [
  {
    id: 1,
    name: 'A会議室',
    capacity: 6,
    note: 'モニタあり',
    createdAt: '2026-10-01T00:00:00+09:00',
  },
  {
    id: 2,
    name: 'B会議室',
    capacity: 10,
    note: null,
    createdAt: '2026-10-01T00:00:00+09:00',
  },
];

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

const seedReservations: Reservation[] = [
  reservation(1, 1, '2026-11-02', '13:00', '14:00', '振り返り', '佐藤'),
  reservation(2, 1, '2026-11-02', '10:00', '11:00', '定例会議', '山田'),
  reservation(3, 1, '2026-11-03', '09:00', '10:00', '朝会', '鈴木'),
  reservation(4, 2, '2026-11-03', '15:00', '16:00', '面接', '田中'),
];

function reservation(
  id: number,
  roomId: number,
  date: string,
  startTime: string,
  endTime: string,
  title: string,
  reserverName: string,
): Reservation {
  const roomName = seedRooms.find((r) => r.id === roomId)?.name ?? '';
  return {
    id,
    roomId,
    roomName,
    date,
    startTime,
    endTime,
    title,
    reserverName,
    createdAt: '2026-10-01T00:00:00+09:00',
  };
}

// 会議室API・予約APIを再現するモック。登録・更新・削除の結果が一覧の再取得に反映される。
// 名前の重複・時間帯の重複は API と同じく 409 を返す
function mockApi(initialRooms: Room[] = seedRooms, initialReservations: Reservation[] = []) {
  let rooms = [...initialRooms];
  let reservations = [...initialReservations];
  let nextId = 100;
  return vi.spyOn(globalThis, 'fetch').mockImplementation((input, init) => {
    const url = new URL(String(input), 'http://localhost');
    const method = init?.method ?? 'GET';
    const id = /^\/api\/\w+\/\d+$/.test(url.pathname)
      ? Number(url.pathname.split('/').pop())
      : null;

    if (url.pathname.startsWith('/api/reservations')) {
      if (method === 'GET') {
        const date = url.searchParams.get('date');
        const roomId = url.searchParams.get('roomId');
        const found = reservations
          .filter(
            (r) =>
              (date === null || r.date === date) &&
              (roomId === null || r.roomId === Number(roomId)),
          )
          .sort(
            (a, b) =>
              a.date.localeCompare(b.date) ||
              a.roomId - b.roomId ||
              a.startTime.localeCompare(b.startTime),
          );
        return Promise.resolve(jsonResponse(found));
      }
      if (method === 'POST') {
        const request = JSON.parse(String(init?.body)) as ReservationRequest;
        const existing = reservations.find(
          (r) =>
            r.roomId === request.roomId &&
            r.date === request.date &&
            r.startTime < request.endTime &&
            request.startTime < r.endTime,
        );
        const roomName = rooms.find((r) => r.id === request.roomId)?.name ?? '';
        if (existing) {
          return Promise.resolve(
            jsonResponse(
              {
                message: `${roomName}の ${existing.startTime}〜${existing.endTime}(${existing.title})と時間が重なっています`,
              },
              409,
            ),
          );
        }
        const created: Reservation = {
          id: nextId,
          roomName,
          ...request,
          createdAt: '2026-11-02T10:00:00+09:00',
        };
        nextId += 1;
        reservations = [...reservations, created];
        return Promise.resolve(jsonResponse(created, 201));
      }
      if (method === 'DELETE') {
        reservations = reservations.filter((r) => r.id !== id);
        return Promise.resolve(new Response(null, { status: 204 }));
      }
    }

    if (method === 'GET' && url.pathname === '/api/rooms') {
      return Promise.resolve(jsonResponse(rooms));
    }
    if (method === 'POST' || method === 'PUT') {
      const request = JSON.parse(String(init?.body)) as RoomRequest;
      if (rooms.some((r) => r.name === request.name && r.id !== id)) {
        return Promise.resolve(
          jsonResponse({ message: `同じ名前の会議室が既にあります: ${request.name}` }, 409),
        );
      }
      if (method === 'POST') {
        const created: Room = { id: nextId, ...request, createdAt: '2026-10-23T00:00:00+09:00' };
        nextId += 1;
        rooms = [...rooms, created];
        return Promise.resolve(jsonResponse(created, 201));
      }
      rooms = rooms.map((r) => (r.id === id ? { ...r, ...request } : r));
      return Promise.resolve(jsonResponse(rooms.find((r) => r.id === id)));
    }
    if (method === 'DELETE') {
      rooms = rooms.filter((r) => r.id !== id);
      return Promise.resolve(new Response(null, { status: 204 }));
    }
    return Promise.resolve(jsonResponse({ message: '想定外の呼び出し' }, 500));
  });
}

// アプリを表示し、指定したタブの画面に切り替える
async function renderScreen(tab: '日別' | '会議室別' | '会議室管理') {
  const user = userEvent.setup();
  render(<App />);
  await user.click(screen.getByRole('button', { name: tab }));
  return user;
}

// 一覧の中から指定した会議室の行を取得する
function roomItem(name: string): HTMLElement {
  const item = screen.getByText(name).closest('li');
  expect(item).not.toBeNull();
  return item as HTMLElement;
}

// 新規登録フォーム(一覧の外側にある最初のフォーム)
function createForm(): HTMLElement {
  return screen.getAllByRole('button', { name: '追加する' })[0].closest('form') as HTMLElement;
}

beforeEach(() => {
  vi.restoreAllMocks();
  // 「今日」を 2026-11-02 に固定する(Date のみ偽装し、userEvent のタイマーは本物を使う)
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date(2026, 10, 2, 10, 0));
});

afterEach(() => {
  vi.useRealTimers();
});

describe('会議室管理', () => {
  it('会議室一覧が表示される', async () => {
    mockApi();

    await renderScreen('会議室管理');

    expect(await screen.findByText('A会議室')).toBeInTheDocument();
    expect(within(roomItem('A会議室')).getByText('定員 6 名')).toBeInTheDocument();
    expect(within(roomItem('A会議室')).getByText('モニタあり')).toBeInTheDocument();
    expect(within(roomItem('B会議室')).getByText('定員 10 名')).toBeInTheDocument();
  });

  it('会議室がないときは案内を表示する', async () => {
    mockApi([]);

    await renderScreen('会議室管理');

    expect(await screen.findByText(/会議室はありません/)).toBeInTheDocument();
  });

  it('会議室を登録するとAPIが呼ばれ一覧が更新され、フォームが空に戻る', async () => {
    const fetchMock = mockApi();

    const user = await renderScreen('会議室管理');
    await screen.findByText('A会議室');

    const form = createForm();
    await user.type(within(form).getByLabelText('会議室名'), 'C会議室');
    await user.type(within(form).getByLabelText('定員'), '4');
    await user.type(within(form).getByLabelText('備考'), 'ホワイトボードあり');
    await user.click(within(form).getByRole('button', { name: '追加する' }));

    expect(await screen.findByText('C会議室')).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/rooms',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ name: 'C会議室', capacity: 4, note: 'ホワイトボードあり' }),
      }),
    );
    expect(within(form).getByLabelText('会議室名')).toHaveValue('');
    expect(within(form).getByLabelText('定員')).toHaveValue(null);
  });

  it('備考が空なら null で登録する', async () => {
    const fetchMock = mockApi();

    const user = await renderScreen('会議室管理');
    await screen.findByText('A会議室');

    const form = createForm();
    await user.type(within(form).getByLabelText('会議室名'), 'C会議室');
    await user.type(within(form).getByLabelText('定員'), '4');
    await user.click(within(form).getByRole('button', { name: '追加する' }));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        '/api/rooms',
        expect.objectContaining({ method: 'POST', body: expect.stringContaining('"note":null') }),
      );
    });
  });

  it('会議室名・定員が未入力、または定員が1未満の間は追加ボタンが押せない', async () => {
    mockApi();

    const user = await renderScreen('会議室管理');
    await screen.findByText('A会議室');

    const form = createForm();
    const button = within(form).getByRole('button', { name: '追加する' });
    expect(button).toBeDisabled();

    await user.type(within(form).getByLabelText('会議室名'), 'C会議室');
    expect(button).toBeDisabled();

    await user.type(within(form).getByLabelText('定員'), '0');
    expect(button).toBeDisabled();

    await user.clear(within(form).getByLabelText('定員'));
    await user.type(within(form).getByLabelText('定員'), '1');
    expect(button).toBeEnabled();
  });

  it('同じ名前の会議室を登録するとエラーメッセージが表示され、入力内容は残る', async () => {
    mockApi();

    const user = await renderScreen('会議室管理');
    await screen.findByText('A会議室');

    const form = createForm();
    await user.type(within(form).getByLabelText('会議室名'), 'A会議室');
    await user.type(within(form).getByLabelText('定員'), '8');
    await user.click(within(form).getByRole('button', { name: '追加する' }));

    expect(await screen.findByText('同じ名前の会議室が既にあります: A会議室')).toBeInTheDocument();
    expect(within(form).getByLabelText('会議室名')).toHaveValue('A会議室');
    expect(within(form).getByLabelText('定員')).toHaveValue(8);
  });

  it('編集ボタンで行がフォームになり、保存するとPUTが呼ばれ一覧に反映される', async () => {
    const fetchMock = mockApi();

    const user = await renderScreen('会議室管理');
    await screen.findByText('A会議室');

    await user.click(screen.getByRole('button', { name: '会議室「A会議室」を編集' }));

    const editing = screen.getByRole('listitem', { name: '会議室「A会議室」を編集中' });
    // 現在の値が入った状態で開く
    expect(within(editing).getByLabelText('会議室名')).toHaveValue('A会議室');
    expect(within(editing).getByLabelText('定員')).toHaveValue(6);
    expect(within(editing).getByLabelText('備考')).toHaveValue('モニタあり');

    await user.clear(within(editing).getByLabelText('定員'));
    await user.type(within(editing).getByLabelText('定員'), '12');
    await user.click(within(editing).getByRole('button', { name: '保存' }));

    expect(await screen.findByText('定員 12 名')).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/rooms/1',
      expect.objectContaining({
        method: 'PUT',
        body: JSON.stringify({ name: 'A会議室', capacity: 12, note: 'モニタあり' }),
      }),
    );
    expect(
      screen.queryByRole('listitem', { name: '会議室「A会議室」を編集中' }),
    ).not.toBeInTheDocument();
  });

  it('編集をキャンセルするとAPIを呼ばずに表示に戻る', async () => {
    const fetchMock = mockApi();

    const user = await renderScreen('会議室管理');
    await screen.findByText('A会議室');

    await user.click(screen.getByRole('button', { name: '会議室「A会議室」を編集' }));
    const editing = screen.getByRole('listitem', { name: '会議室「A会議室」を編集中' });
    await user.clear(within(editing).getByLabelText('会議室名'));
    await user.type(within(editing).getByLabelText('会議室名'), '変更途中');
    await user.click(within(editing).getByRole('button', { name: 'キャンセル' }));

    expect(screen.getByText('A会議室')).toBeInTheDocument();
    expect(screen.queryByText('変更途中')).not.toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalledWith(
      '/api/rooms/1',
      expect.objectContaining({ method: 'PUT' }),
    );
  });

  it('他の会議室と同じ名前に更新するとエラーが表示され、編集フォームのまま残る', async () => {
    mockApi();

    const user = await renderScreen('会議室管理');
    await screen.findByText('B会議室');

    await user.click(screen.getByRole('button', { name: '会議室「B会議室」を編集' }));
    const editing = screen.getByRole('listitem', { name: '会議室「B会議室」を編集中' });
    await user.clear(within(editing).getByLabelText('会議室名'));
    await user.type(within(editing).getByLabelText('会議室名'), 'A会議室');
    await user.click(within(editing).getByRole('button', { name: '保存' }));

    expect(await screen.findByText('同じ名前の会議室が既にあります: A会議室')).toBeInTheDocument();
    expect(within(editing).getByLabelText('会議室名')).toHaveValue('A会議室');
  });

  it('確認で了承すると会議室が削除される', async () => {
    const confirmMock = vi.spyOn(window, 'confirm').mockReturnValue(true);
    const fetchMock = mockApi();

    const user = await renderScreen('会議室管理');
    await screen.findByText('B会議室');

    await user.click(screen.getByRole('button', { name: '会議室「B会議室」を削除' }));

    expect(confirmMock).toHaveBeenCalledWith(expect.stringContaining('B会議室'));
    await waitFor(() => {
      expect(screen.queryByText('B会議室')).not.toBeInTheDocument();
    });
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/rooms/2',
      expect.objectContaining({ method: 'DELETE' }),
    );
  });

  it('確認でキャンセルすると会議室は削除されない', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(false);
    const fetchMock = mockApi();

    const user = await renderScreen('会議室管理');
    await screen.findByText('B会議室');

    await user.click(screen.getByRole('button', { name: '会議室「B会議室」を削除' }));

    expect(screen.getByText('B会議室')).toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalledWith(
      '/api/rooms/2',
      expect.objectContaining({ method: 'DELETE' }),
    );
  });

  it('削除できない場合はAPIのメッセージが表示され、会議室は残る', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    const fetchMock = mockApi();
    const message = 'A会議室には未来の予約があるため削除できません';
    const roomApi = fetchMock.getMockImplementation();
    fetchMock.mockImplementation((input, init) =>
      init?.method === 'DELETE'
        ? Promise.resolve(jsonResponse({ message }, 409))
        : (roomApi as typeof fetch)(input, init),
    );

    const user = await renderScreen('会議室管理');
    await screen.findByText('A会議室');

    await user.click(screen.getByRole('button', { name: '会議室「A会議室」を削除' }));

    expect(await screen.findByText(message)).toBeInTheDocument();
    expect(screen.getByText('A会議室')).toBeInTheDocument();
  });

  it('API失敗時にエラーメッセージが表示される', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      jsonResponse({ message: 'サーバーエラー' }, 500),
    );

    render(<App />);

    expect(await screen.findByText('サーバーエラー')).toBeInTheDocument();
  });
});

// 日別画面で、指定した会議室のカードを取得する
function dailyRoom(name: string): HTMLElement {
  return screen.getByRole('listitem', { name: `${name}の予約` });
}

// 予約登録フォーム
function reservationForm(): HTMLElement {
  return screen.getByRole('button', { name: '予約する' }).closest('form') as HTMLElement;
}

async function fillReservationForm(
  user: ReturnType<typeof userEvent.setup>,
  values: {
    roomId: string;
    startTime: string;
    endTime: string;
    title: string;
    reserverName: string;
  },
) {
  const form = reservationForm();
  await user.selectOptions(within(form).getByLabelText('会議室'), values.roomId);
  await user.selectOptions(within(form).getByLabelText('開始時刻'), values.startTime);
  await user.selectOptions(within(form).getByLabelText('終了時刻'), values.endTime);
  await user.type(within(form).getByLabelText('件名'), values.title);
  await user.type(within(form).getByLabelText('予約者名'), values.reserverName);
}

describe('日別予約状況', () => {
  it('初期表示は今日の日別画面で、会議室ごとの予約が開始時刻順に表示される', async () => {
    const fetchMock = mockApi(seedRooms, seedReservations);

    render(<App />);

    expect(await screen.findByText('定例会議')).toBeInTheDocument();
    expect(screen.getByLabelText('表示する日付')).toHaveValue('2026-11-02');
    expect(fetchMock).toHaveBeenCalledWith('/api/reservations?date=2026-11-02');

    const items = within(dailyRoom('A会議室')).getAllByRole('listitem');
    expect(items).toHaveLength(2);
    expect(within(items[0]).getByText('10:00〜11:00')).toBeInTheDocument();
    expect(within(items[0]).getByText('定例会議')).toBeInTheDocument();
    expect(within(items[0]).getByText('山田')).toBeInTheDocument();
    expect(within(items[1]).getByText('13:00〜14:00')).toBeInTheDocument();
    // 翌日の予約は表示しない
    expect(screen.queryByText('朝会')).not.toBeInTheDocument();
    // 予約のない会議室は「予約なし」
    expect(within(dailyRoom('B会議室')).getByText('予約なし')).toBeInTheDocument();
  });

  it('翌日・前日ボタンで日付が切り替わり、その日の予約を再取得する', async () => {
    const fetchMock = mockApi(seedRooms, seedReservations);

    const user = userEvent.setup();
    render(<App />);
    await screen.findByText('定例会議');

    await user.click(screen.getByRole('button', { name: '翌日' }));

    expect(await screen.findByText('朝会')).toBeInTheDocument();
    expect(screen.getByLabelText('表示する日付')).toHaveValue('2026-11-03');
    expect(within(dailyRoom('B会議室')).getByText('面接')).toBeInTheDocument();
    expect(screen.queryByText('定例会議')).not.toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledWith('/api/reservations?date=2026-11-03');
    // フォームの日付も選択中の日付に追従する
    expect(within(reservationForm()).getByLabelText('予約日')).toHaveValue('2026-11-03');

    await user.click(screen.getByRole('button', { name: '前日' }));

    expect(await screen.findByText('定例会議')).toBeInTheDocument();
    expect(screen.getByLabelText('表示する日付')).toHaveValue('2026-11-02');
  });

  it('時刻の選択肢は15分刻みの 00:00〜23:45', async () => {
    mockApi();

    render(<App />);
    await screen.findAllByText('予約なし');

    const options = within(within(reservationForm()).getByLabelText('開始時刻'))
      .getAllByRole('option')
      .map((o) => (o as HTMLOptionElement).value)
      .filter((v) => v !== '');
    expect(options).toHaveLength(96);
    expect(options.slice(0, 3)).toEqual(['00:00', '00:15', '00:30']);
    expect(options[options.length - 1]).toBe('23:45');
  });

  it('予約を登録するとAPIが呼ばれ一覧に反映され、件名と時刻が空に戻る', async () => {
    const fetchMock = mockApi();

    const user = userEvent.setup();
    render(<App />);
    await screen.findAllByText('予約なし');

    await fillReservationForm(user, {
      roomId: '1',
      startTime: '10:00',
      endTime: '11:00',
      title: '定例会議',
      reserverName: '山田',
    });
    await user.click(screen.getByRole('button', { name: '予約する' }));

    expect(await within(dailyRoom('A会議室')).findByText('定例会議')).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/reservations',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({
          roomId: 1,
          date: '2026-11-02',
          startTime: '10:00',
          endTime: '11:00',
          title: '定例会議',
          reserverName: '山田',
        }),
      }),
    );
    const form = reservationForm();
    expect(within(form).getByLabelText('件名')).toHaveValue('');
    expect(within(form).getByLabelText('開始時刻')).toHaveValue('');
    expect(within(form).getByLabelText('予約者名')).toHaveValue('山田');
  });

  it('別の日付で登録すると、登録した日の一覧に切り替わる', async () => {
    mockApi();

    const user = userEvent.setup();
    render(<App />);
    await screen.findAllByText('予約なし');

    const form = reservationForm();
    await user.clear(within(form).getByLabelText('予約日'));
    await user.type(within(form).getByLabelText('予約日'), '2026-11-05');
    await fillReservationForm(user, {
      roomId: '2',
      startTime: '09:00',
      endTime: '09:30',
      title: '朝会',
      reserverName: '鈴木',
    });
    await user.click(screen.getByRole('button', { name: '予約する' }));

    expect(await within(dailyRoom('B会議室')).findByText('朝会')).toBeInTheDocument();
    expect(screen.getByLabelText('表示する日付')).toHaveValue('2026-11-05');
  });

  it('必須項目が未入力の間は予約ボタンが押せない', async () => {
    mockApi();

    const user = userEvent.setup();
    render(<App />);
    await screen.findAllByText('予約なし');

    const form = reservationForm();
    const button = within(form).getByRole('button', { name: '予約する' });
    expect(button).toBeDisabled();

    await user.selectOptions(within(form).getByLabelText('会議室'), '1');
    await user.selectOptions(within(form).getByLabelText('開始時刻'), '10:00');
    await user.selectOptions(within(form).getByLabelText('終了時刻'), '11:00');
    await user.type(within(form).getByLabelText('件名'), '定例会議');
    expect(button).toBeDisabled();

    await user.type(within(form).getByLabelText('予約者名'), '   ');
    expect(button).toBeDisabled();

    await user.type(within(form).getByLabelText('予約者名'), '山田');
    expect(button).toBeEnabled();
  });

  it('時間帯が重なる予約はエラーメッセージが表示され、入力内容は残る', async () => {
    mockApi(seedRooms, seedReservations);

    const user = userEvent.setup();
    render(<App />);
    await screen.findByText('定例会議');

    await fillReservationForm(user, {
      roomId: '1',
      startTime: '10:30',
      endTime: '11:30',
      title: '打合せ',
      reserverName: '佐藤',
    });
    await user.click(screen.getByRole('button', { name: '予約する' }));

    expect(
      await screen.findByText('A会議室の 10:00〜11:00(定例会議)と時間が重なっています'),
    ).toBeInTheDocument();
    expect(within(reservationForm()).getByLabelText('件名')).toHaveValue('打合せ');
    expect(within(dailyRoom('A会議室')).getAllByRole('listitem')).toHaveLength(2);
  });

  it('確認で了承すると予約が取り消される', async () => {
    const confirmMock = vi.spyOn(window, 'confirm').mockReturnValue(true);
    const fetchMock = mockApi(seedRooms, seedReservations);

    const user = userEvent.setup();
    render(<App />);
    await screen.findByText('定例会議');

    await user.click(
      screen.getByRole('button', { name: '予約「定例会議」(10:00〜11:00)を取り消す' }),
    );

    expect(confirmMock).toHaveBeenCalledWith(expect.stringContaining('定例会議'));
    await waitFor(() => {
      expect(screen.queryByText('定例会議')).not.toBeInTheDocument();
    });
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/reservations/2',
      expect.objectContaining({ method: 'DELETE' }),
    );
  });

  it('確認でキャンセルすると予約は取り消されない', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(false);
    const fetchMock = mockApi(seedRooms, seedReservations);

    const user = userEvent.setup();
    render(<App />);
    await screen.findByText('定例会議');

    await user.click(
      screen.getByRole('button', { name: '予約「定例会議」(10:00〜11:00)を取り消す' }),
    );

    expect(screen.getByText('定例会議')).toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalledWith(
      '/api/reservations/2',
      expect.objectContaining({ method: 'DELETE' }),
    );
  });
});

describe('会議室別予約', () => {
  it('先頭の会議室の予約が日付・開始時刻順に表示され、会議室を切り替えると再取得する', async () => {
    const fetchMock = mockApi(seedRooms, seedReservations);

    const user = await renderScreen('会議室別');

    expect(await screen.findByText('朝会')).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledWith('/api/reservations?roomId=1');
    const items = screen.getAllByRole('listitem');
    expect(items).toHaveLength(3);
    expect(within(items[0]).getByText('2026-11-02')).toBeInTheDocument();
    expect(within(items[0]).getByText('定例会議')).toBeInTheDocument();
    expect(within(items[1]).getByText('振り返り')).toBeInTheDocument();
    expect(within(items[2]).getByText('2026-11-03')).toBeInTheDocument();
    expect(within(items[2]).getByText('朝会')).toBeInTheDocument();

    await user.selectOptions(screen.getByLabelText('表示する会議室'), '2');

    expect(await screen.findByText('面接')).toBeInTheDocument();
    expect(screen.queryByText('朝会')).not.toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledWith('/api/reservations?roomId=2');
  });

  it('予約のない会議室は案内を表示する', async () => {
    mockApi(seedRooms, []);

    await renderScreen('会議室別');

    expect(await screen.findByText('この会議室の予約はありません。')).toBeInTheDocument();
  });

  it('会議室別画面からも予約を取り消せる', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    const fetchMock = mockApi(seedRooms, seedReservations);

    const user = await renderScreen('会議室別');
    await screen.findByText('朝会');

    await user.click(screen.getByRole('button', { name: '予約「朝会」(09:00〜10:00)を取り消す' }));

    await waitFor(() => {
      expect(screen.queryByText('朝会')).not.toBeInTheDocument();
    });
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/reservations/3',
      expect.objectContaining({ method: 'DELETE' }),
    );
  });
});
