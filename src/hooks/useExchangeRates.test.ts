import { describe, it, expect, vi, beforeEach } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import React from 'react';

const orderMock = vi.fn();
const selectMock = vi.fn(() => ({ order: orderMock }));
const fromMock = vi.fn(() => ({ select: selectMock }));

vi.mock('@/integrations/supabase/client', () => ({
  supabase: { from: (...args: unknown[]) => fromMock(...args) },
}));

import { useExchangeRates } from './useExchangeRates';

const wrapper = ({ children }: { children: React.ReactNode }) => {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return React.createElement(QueryClientProvider, { client: qc }, children);
};

describe('useExchangeRates', () => {
  beforeEach(() => {
    fromMock.mockClear();
    selectMock.mockClear();
    orderMock.mockClear();
  });

  it('charge les taux triés par date décroissante', async () => {
    const rows = [
      { id: '1', currency_code: 'EUR', rate_to_fcfa: 655.957, effective_date: '2026-06-01', source: 'BCEAO' },
      { id: '2', currency_code: 'USD', rate_to_fcfa: 605.12, effective_date: '2026-06-01', source: 'manual' },
    ];
    orderMock.mockResolvedValueOnce({ data: rows, error: null });

    const { result } = renderHook(() => useExchangeRates(), { wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(fromMock).toHaveBeenCalledWith('exchange_rates');
    expect(orderMock).toHaveBeenCalledWith('effective_date', { ascending: false });
    expect(result.current.data).toEqual(rows);
  });

  it('retourne un tableau vide si data est null', async () => {
    orderMock.mockResolvedValueOnce({ data: null, error: null });
    const { result } = renderHook(() => useExchangeRates(), { wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual([]);
  });

  it('propage l\'erreur Supabase', async () => {
    orderMock.mockResolvedValueOnce({ data: null, error: new Error('boom') });
    const { result } = renderHook(() => useExchangeRates(), { wrapper });
    await waitFor(() => expect(result.current.isError).toBe(true));
  });
});