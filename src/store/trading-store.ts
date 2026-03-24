import { create } from 'zustand';

export type SignalType = 'BUY' | 'SELL';
export type SignalStrength = 'WEAK' | 'MODERATE' | 'STRONG';

export interface Candle {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface Signal {
  type: SignalType;
  strength: SignalStrength;
  price: number;
  stopLoss: number;
  takeProfit1: number;
  takeProfit2: number;
  takeProfit3: number;
  reason: string;
  confidence: number;
  indicators: Record<string, number>;
}

export interface Indicators {
  ema20: (number | null)[];
  ema50: (number | null)[];
  ema200: (number | null)[];
  rsi: (number | null)[];
  macd: {
    macd: (number | null)[];
    signal: (number | null)[];
    histogram: (number | null)[];
  };
  bollingerBands: {
    upper: (number | null)[];
    middle: (number | null)[];
    lower: (number | null)[];
  };
  atr: (number | null)[];
  supportResistance: {
    supports: number[];
    resistances: number[];
  };
  bos: {
    bullish: boolean;
    bearish: boolean;
    level: number | null;
  };
  liquidityZones: {
    buySide: number[];
    sellSide: number[];
  };
}

export interface MarketData {
  symbol: string;
  timeframe: string;
  candles: Candle[];
  currentPrice: number;
  change24h: number;
  high24h: number;
  low24h: number;
  volume24h: number;
  indicators?: Indicators;
  signal?: Signal | null;
}

export interface Symbol {
  symbol: string;
  name: string;
  type: string;
}

export interface BacktestResult {
  totalTrades: number;
  winTrades: number;
  lossTrades: number;
  winRate: number;
  totalPnL: number;
  avgWin: number;
  avgLoss: number;
  maxDrawdown: number;
  profitFactor: number;
}

export interface TradingStore {
  // Market Data
  marketData: MarketData | null;
  symbols: Symbol[];
  selectedSymbol: string;
  selectedTimeframe: string;
  isLoading: boolean;
  error: string | null;

  // UI State
  showIndicators: {
    ema20: boolean;
    ema50: boolean;
    ema200: boolean;
    rsi: boolean;
    macd: boolean;
    bollingerBands: boolean;
    supportResistance: boolean;
    liquidityZones: boolean;
  };
  chartType: 'candlestick' | 'line' | 'area';

  // Backtesting
  backtestResult: BacktestResult | null;

  // AI Prediction
  aiPrediction: {
    direction: 'bullish' | 'bearish' | 'neutral';
    confidence: number;
    nextPrice: number;
  } | null;

  // User
  user: {
    id: string;
    email: string;
    name: string;
    subscription: 'FREE' | 'PRO' | 'VIP';
  } | null;

  // Actions
  setMarketData: (data: MarketData) => void;
  setSymbols: (symbols: Symbol[]) => void;
  setSelectedSymbol: (symbol: string) => void;
  setSelectedTimeframe: (timeframe: string) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  toggleIndicator: (indicator: keyof TradingStore['showIndicators']) => void;
  setChartType: (type: 'candlestick' | 'line' | 'area') => void;
  setBacktestResult: (result: BacktestResult | null) => void;
  setAIPrediction: (prediction: TradingStore['aiPrediction']) => void;
  setUser: (user: TradingStore['user']) => void;
}

export const useTradingStore = create<TradingStore>((set) => ({
  // Initial State
  marketData: null,
  symbols: [],
  selectedSymbol: 'BTCUSDT',
  selectedTimeframe: '1h',
  isLoading: false,
  error: null,

  showIndicators: {
    ema20: true,
    ema50: true,
    ema200: true,
    rsi: true,
    macd: true,
    bollingerBands: false,
    supportResistance: true,
    liquidityZones: false,
  },
  chartType: 'candlestick',

  backtestResult: null,
  aiPrediction: null,
  user: null,

  // Actions
  setMarketData: (data) => set({ marketData: data }),
  setSymbols: (symbols) => set({ symbols }),
  setSelectedSymbol: (symbol) => set({ selectedSymbol: symbol }),
  setSelectedTimeframe: (timeframe) => set({ selectedTimeframe: timeframe }),
  setLoading: (loading) => set({ isLoading: loading }),
  setError: (error) => set({ error }),
  toggleIndicator: (indicator) =>
    set((state) => ({
      showIndicators: {
        ...state.showIndicators,
        [indicator]: !state.showIndicators[indicator],
      },
    })),
  setChartType: (type) => set({ chartType: type }),
  setBacktestResult: (result) => set({ backtestResult: result }),
  setAIPrediction: (prediction) => set({ aiPrediction: prediction }),
  setUser: (user) => set({ user }),
}));

// Timeframe options
export const TIMEFRAMES = [
  { value: '1m', label: '1 دقيقة' },
  { value: '5m', label: '5 دقائق' },
  { value: '15m', label: '15 دقيقة' },
  { value: '1h', label: '1 ساعة' },
  { value: '4h', label: '4 ساعات' },
  { value: '1d', label: '1 يوم' },
  { value: '1w', label: '1 أسبوع' },
];
