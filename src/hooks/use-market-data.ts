'use client';

import { useEffect, useCallback, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { useTradingStore, type MarketData, type Symbol } from '@/store/trading-store';

const MARKET_DATA_PORT = 3003;

export function useMarketData() {
  const socketRef = useRef<Socket | null>(null);
  const {
    selectedSymbol,
    selectedTimeframe,
    setMarketData,
    setSymbols,
    setLoading,
    setError,
  } = useTradingStore();

  // Fetch market data via REST API
  const fetchMarketData = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(
        `/api/market-data?XTransformPort=${MARKET_DATA_PORT}&symbol=${selectedSymbol}&timeframe=${selectedTimeframe}`
      );
      const result = await response.json();

      if (result.success && result.data) {
        setMarketData(result.data);
      } else {
        setError(result.error || 'Failed to fetch market data');
      }
    } catch (err) {
      setError('Network error occurred');
      console.error('Fetch error:', err);
    } finally {
      setLoading(false);
    }
  }, [selectedSymbol, selectedTimeframe, setMarketData, setLoading, setError]);

  // Fetch available symbols
  const fetchSymbols = useCallback(async () => {
    try {
      const response = await fetch(`/api/symbols?XTransformPort=${MARKET_DATA_PORT}`);
      const result = await response.json();

      if (result.success && result.symbols) {
        setSymbols(result.symbols);
      }
    } catch (err) {
      console.error('Failed to fetch symbols:', err);
    }
  }, [setSymbols]);

  // Initialize WebSocket connection
  useEffect(() => {
    socketRef.current = io(`/?XTransformPort=${MARKET_DATA_PORT}`, {
      transports: ['websocket', 'polling'],
    });

    const socket = socketRef.current;

    socket.on('connect', () => {
      console.log('Connected to market data service');
    });

    socket.on('market-data', (data: MarketData) => {
      setMarketData(data);
    });

    socket.on('market-update', (data: MarketData) => {
      setMarketData(data);
    });

    socket.on('disconnect', () => {
      console.log('Disconnected from market data service');
    });

    // Fetch initial data
    fetchSymbols();
    fetchMarketData();

    return () => {
      socket.disconnect();
    };
  }, [fetchSymbols, fetchMarketData, setMarketData]);

  // Subscribe to updates when symbol/timeframe changes
  useEffect(() => {
    const socket = socketRef.current;
    if (socket && socket.connected) {
      socket.emit('subscribe', {
        symbol: selectedSymbol,
        timeframe: selectedTimeframe,
      });
    }

    return () => {
      if (socket) {
        socket.emit('unsubscribe', {
          symbol: selectedSymbol,
          timeframe: selectedTimeframe,
        });
      }
    };
  }, [selectedSymbol, selectedTimeframe]);

  // Refresh data
  const refresh = useCallback(() => {
    fetchMarketData();
  }, [fetchMarketData]);

  return { refresh };
}

export function useAIPrediction() {
  const { marketData, setAIPrediction } = useTradingStore();

  const generatePrediction = useCallback(async () => {
    if (!marketData || marketData.candles.length < 50) return;

    try {
      // Use AI SDK to predict market direction
      const response = await fetch('/api/ai/predict', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          candles: marketData.candles.slice(-100),
          symbol: marketData.symbol,
        }),
      });

      const result = await response.json();

      if (result.prediction) {
        setAIPrediction(result.prediction);
      }
    } catch (err) {
      console.error('AI prediction error:', err);
    }
  }, [marketData, setAIPrediction]);

  return { generatePrediction };
}
