import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import App from './App';

// 実装を始めたら、このテストはお手本(training-task の App.test.tsx)を模倣して書き換えること
describe('App', () => {
  it('プレースホルダ画面が表示される', () => {
    render(<App />);
    expect(screen.getByRole('heading', { name: '会議室予約システム' })).toBeInTheDocument();
  });
});
