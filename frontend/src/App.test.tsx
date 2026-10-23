import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import App from './App';
import type { Room, RoomRequest } from './api/types';

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

// 会議室APIを再現するモック。登録・更新・削除の結果が一覧の再取得に反映される。
// 名前の重複は API と同じく 409 を返す
function mockRoomApi(initialRooms: Room[] = seedRooms) {
  let rooms = [...initialRooms];
  let nextId = 100;
  return vi.spyOn(globalThis, 'fetch').mockImplementation((input, init) => {
    const url = String(input);
    const method = init?.method ?? 'GET';
    const id = url.startsWith('/api/rooms/') ? Number(url.split('/').pop()) : null;

    if (method === 'GET' && url === '/api/rooms') {
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
});

describe('会議室管理', () => {
  it('会議室一覧が表示される', async () => {
    mockRoomApi();

    render(<App />);

    expect(await screen.findByText('A会議室')).toBeInTheDocument();
    expect(within(roomItem('A会議室')).getByText('定員 6 名')).toBeInTheDocument();
    expect(within(roomItem('A会議室')).getByText('モニタあり')).toBeInTheDocument();
    expect(within(roomItem('B会議室')).getByText('定員 10 名')).toBeInTheDocument();
  });

  it('会議室がないときは案内を表示する', async () => {
    mockRoomApi([]);

    render(<App />);

    expect(await screen.findByText(/会議室はありません/)).toBeInTheDocument();
  });

  it('会議室を登録するとAPIが呼ばれ一覧が更新され、フォームが空に戻る', async () => {
    const fetchMock = mockRoomApi();

    const user = userEvent.setup();
    render(<App />);
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
    const fetchMock = mockRoomApi();

    const user = userEvent.setup();
    render(<App />);
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
    mockRoomApi();

    const user = userEvent.setup();
    render(<App />);
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
    mockRoomApi();

    const user = userEvent.setup();
    render(<App />);
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
    const fetchMock = mockRoomApi();

    const user = userEvent.setup();
    render(<App />);
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
    const fetchMock = mockRoomApi();

    const user = userEvent.setup();
    render(<App />);
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
    mockRoomApi();

    const user = userEvent.setup();
    render(<App />);
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
    const fetchMock = mockRoomApi();

    const user = userEvent.setup();
    render(<App />);
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
    const fetchMock = mockRoomApi();

    const user = userEvent.setup();
    render(<App />);
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
    const fetchMock = mockRoomApi();
    const message = 'A会議室には未来の予約があるため削除できません';
    const roomApi = fetchMock.getMockImplementation();
    fetchMock.mockImplementation((input, init) =>
      init?.method === 'DELETE'
        ? Promise.resolve(jsonResponse({ message }, 409))
        : (roomApi as typeof fetch)(input, init),
    );

    const user = userEvent.setup();
    render(<App />);
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
