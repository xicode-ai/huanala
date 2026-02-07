import { describe, it, expect } from 'vitest';
import { Api } from '../../services/api';
import { MOCK_USER, MOCK_TRANSACTIONS, MOCK_CHAT_HISTORY } from '../../services/mockData';

describe('Api', () => {
  it('login returns mock user', async () => {
    const user = await Api.login('13888888888');
    expect(user).toEqual(MOCK_USER);
  });

  it('getUser returns mock user', async () => {
    const user = await Api.getUser();
    expect(user).toEqual(MOCK_USER);
  });

  it('getTransactions returns mock transactions', async () => {
    const txs = await Api.getTransactions();
    expect(txs).toEqual(MOCK_TRANSACTIONS);
    expect(txs.length).toBeGreaterThan(0);
  });

  it('getChatHistory returns mock chat messages', async () => {
    const messages = await Api.getChatHistory();
    expect(messages).toEqual(MOCK_CHAT_HISTORY);
    expect(messages.length).toBeGreaterThan(0);
  });

  it('sendMessage returns an AI response', async () => {
    const response = await Api.sendMessage('hello');
    expect(response.sender).toBe('ai');
    expect(response.type).toBe('text');
    expect(response.text).toContain('hello');
  });

  it('uploadBill returns a new transaction', async () => {
    const file = new File(['test'], 'receipt.jpg', { type: 'image/jpeg' });
    const tx = await Api.uploadBill(file);
    expect(tx.type).toBe('expense');
    expect(tx.amount).toBeGreaterThan(0);
    expect(tx.id).toBeDefined();
  });

  it('uploadVoice returns a new transaction', async () => {
    const tx = await Api.uploadVoice(null);
    expect(tx.type).toBe('expense');
    expect(tx.category).toBe('Transport');
    expect(tx.id).toBeDefined();
  });
});
