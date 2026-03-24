import { Server as HttpServer } from 'http';
import { Server as SocketServer, Socket } from 'socket.io';
import { createServer } from 'http';

const PORT = 3003;

// Types
interface Candle {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

interface Signal {
  type: 'BUY' | 'SELL';
  strength: 'WEAK' | 'MODERATE' | 'STRONG';
  price: number;
  stopLoss: number;
  takeProfit1: number;
  takeProfit2: number;
  takeProfit3: number;
  reason: string;
  confidence: number;
  indicators: Record<string, number>;
}

interface MarketData {
  symbol: string;
  timeframe: string;
  candles: Candle[];
  currentPrice: number;
  change24h: number;
  high24h: number;
  low24h: number;
  volume24h: number;
}

// In-memory storage for market data
const marketDataCache = new Map<string, MarketData>();
const subscribers = new Map<string, Set<string>>();

// Technical Indicator Calculations
class TechnicalIndicators {
  // Simple Moving Average
  static SMA(data: number[], period: number): (number | null)[] {
    const result: (number | null)[] = [];
    for (let i = 0; i < data.length; i++) {
      if (i < period - 1) {
        result.push(null);
        continue;
      }
      const sum = data.slice(i - period + 1, i + 1).reduce((a, b) => a + b, 0);
      result.push(sum / period);
    }
    return result;
  }

  // Exponential Moving Average
  static EMA(data: number[], period: number): (number | null)[] {
    const result: (number | null)[] = [];
    const multiplier = 2 / (period + 1);
    
    for (let i = 0; i < data.length; i++) {
      if (i < period - 1) {
        result.push(null);
        continue;
      }
      if (i === period - 1) {
        const sum = data.slice(0, period).reduce((a, b) => a + b, 0);
        result.push(sum / period);
      } else {
        const prevEMA = result[i - 1] as number;
        result.push((data[i] - prevEMA) * multiplier + prevEMA);
      }
    }
    return result;
  }

  // RSI
  static RSI(data: number[], period: number = 14): (number | null)[] {
    const result: (number | null)[] = [];
    const gains: number[] = [];
    const losses: number[] = [];

    for (let i = 0; i < data.length; i++) {
      if (i === 0) {
        result.push(null);
        continue;
      }

      const change = data[i] - data[i - 1];
      gains.push(change > 0 ? change : 0);
      losses.push(change < 0 ? Math.abs(change) : 0);

      if (i < period) {
        result.push(null);
        continue;
      }

      const avgGain = gains.slice(-period).reduce((a, b) => a + b, 0) / period;
      const avgLoss = losses.slice(-period).reduce((a, b) => a + b, 0) / period;

      if (avgLoss === 0) {
        result.push(100);
      } else {
        const rs = avgGain / avgLoss;
        result.push(100 - (100 / (1 + rs)));
      }
    }
    return result;
  }

  // MACD
  static MACD(data: number[], fastPeriod: number = 12, slowPeriod: number = 26, signalPeriod: number = 9): {
    macd: (number | null)[];
    signal: (number | null)[];
    histogram: (number | null)[];
  } {
    const emaFast = this.EMA(data, fastPeriod);
    const emaSlow = this.EMA(data, slowPeriod);
    
    const macd: (number | null)[] = [];
    for (let i = 0; i < data.length; i++) {
      if (emaFast[i] === null || emaSlow[i] === null) {
        macd.push(null);
      } else {
        macd.push(emaFast[i] - emaSlow[i]);
      }
    }

    const validMacd = macd.filter(v => v !== null) as number[];
    const signal: (number | null)[] = [];
    const multiplier = 2 / (signalPeriod + 1);

    let signalIdx = 0;
    for (let i = 0; i < macd.length; i++) {
      if (macd[i] === null) {
        signal.push(null);
        continue;
      }

      if (signalIdx < signalPeriod - 1) {
        signal.push(null);
        signalIdx++;
      } else if (signalIdx === signalPeriod - 1) {
        const firstSignals = validMacd.slice(0, signalPeriod);
        signal.push(firstSignals.reduce((a, b) => a + b, 0) / signalPeriod);
        signalIdx++;
      } else {
        const prevSignal = signal[i - 1] as number;
        signal.push((macd[i] as number - prevSignal) * multiplier + prevSignal);
        signalIdx++;
      }
    }

    const histogram: (number | null)[] = [];
    for (let i = 0; i < macd.length; i++) {
      if (macd[i] === null || signal[i] === null) {
        histogram.push(null);
      } else {
        histogram.push(macd[i] - signal[i]);
      }
    }

    return { macd, signal, histogram };
  }

  // Bollinger Bands
  static BollingerBands(data: number[], period: number = 20, stdDev: number = 2): {
    upper: (number | null)[];
    middle: (number | null)[];
    lower: (number | null)[];
  } {
    const middle = this.SMA(data, period);
    const upper: (number | null)[] = [];
    const lower: (number | null)[] = [];

    for (let i = 0; i < data.length; i++) {
      if (i < period - 1) {
        upper.push(null);
        lower.push(null);
        continue;
      }

      const slice = data.slice(i - period + 1, i + 1);
      const mean = middle[i] as number;
      const squaredDiffs = slice.map(v => Math.pow(v - mean, 2));
      const variance = squaredDiffs.reduce((a, b) => a + b, 0) / period;
      const std = Math.sqrt(variance);

      upper.push(mean + stdDev * std);
      lower.push(mean - stdDev * std);
    }

    return { upper, middle, lower };
  }

  // ATR (Average True Range)
  static ATR(candles: Candle[], period: number = 14): (number | null)[] {
    const trueRanges: number[] = [];
    
    for (let i = 0; i < candles.length; i++) {
      if (i === 0) {
        trueRanges.push(candles[i].high - candles[i].low);
        continue;
      }

      const high = candles[i].high;
      const low = candles[i].low;
      const prevClose = candles[i - 1].close;

      const tr = Math.max(
        high - low,
        Math.abs(high - prevClose),
        Math.abs(low - prevClose)
      );
      trueRanges.push(tr);
    }

    return this.SMA(trueRanges, period);
  }

  // Support & Resistance Detection
  static findSupportResistance(candles: Candle[], lookback: number = 50): {
    supports: number[];
    resistances: number[];
  } {
    const supports: number[] = [];
    const resistances: number[] = [];
    const recentCandles = candles.slice(-lookback);

    for (let i = 2; i < recentCandles.length - 2; i++) {
      const current = recentCandles[i];
      const prev1 = recentCandles[i - 1];
      const prev2 = recentCandles[i - 2];
      const next1 = recentCandles[i + 1];
      const next2 = recentCandles[i + 2];

      // Local high (resistance)
      if (
        current.high > prev1.high &&
        current.high > prev2.high &&
        current.high > next1.high &&
        current.high > next2.high
      ) {
        resistances.push(current.high);
      }

      // Local low (support)
      if (
        current.low < prev1.low &&
        current.low < prev2.low &&
        current.low < next1.low &&
        current.low < next2.low
      ) {
        supports.push(current.low);
      }
    }

    return {
      supports: supports.sort((a, b) => b - a).slice(0, 5),
      resistances: resistances.sort((a, b) => a - b).slice(0, 5)
    };
  }

  // Smart Money Concept - Break of Structure
  static detectBOS(candles: Candle[]): {
    bullish: boolean;
    bearish: boolean;
    level: number | null;
  } {
    if (candles.length < 20) return { bullish: false, bearish: false, level: null };

    const recent = candles.slice(-20);
    const highs = recent.map(c => c.high);
    const lows = recent.map(c => c.low);
    
    const recentHigh = Math.max(...highs.slice(-5));
    const recentLow = Math.min(...lows.slice(-5));
    const prevHigh = Math.max(...highs.slice(-15, -5));
    const prevLow = Math.min(...lows.slice(-15, -5));

    const currentPrice = recent[recent.length - 1].close;

    // Bullish BOS: Price breaks above recent lower high
    if (currentPrice > prevHigh && recentHigh > prevHigh) {
      return { bullish: true, bearish: false, level: prevHigh };
    }

    // Bearish BOS: Price breaks below recent higher low
    if (currentPrice < prevLow && recentLow < prevLow) {
      return { bullish: false, bearish: true, level: prevLow };
    }

    return { bullish: false, bearish: false, level: null };
  }

  // Liquidity Zones Detection
  static detectLiquidityZones(candles: Candle[]): {
    buySide: number[];
    sellSide: number[];
  } {
    const closes = candles.map(c => c.close);
    const volumes = candles.map(c => c.volume);
    
    // Find high volume nodes
    const avgVolume = volumes.reduce((a, b) => a + b, 0) / volumes.length;
    const highVolumeCandles = candles.filter((c, i) => volumes[i] > avgVolume * 1.5);
    
    const priceLevels: Record<number, number> = {};
    const priceStep = (Math.max(...closes) - Math.min(...closes)) / 50;
    
    highVolumeCandles.forEach(c => {
      const level = Math.round(c.close / priceStep) * priceStep;
      priceLevels[level] = (priceLevels[level] || 0) + c.volume;
    });

    const sortedLevels = Object.entries(priceLevels)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([level]) => parseFloat(level));

    const currentPrice = closes[closes.length - 1];
    
    return {
      buySide: sortedLevels.filter(l => l < currentPrice),
      sellSide: sortedLevels.filter(l => l > currentPrice)
    };
  }
}

// Signal Generator
class SignalGenerator {
  static generate(candles: Candle[]): Signal | null {
    if (candles.length < 100) return null;

    const closes = candles.map(c => c.close);
    const currentPrice = closes[closes.length - 1];

    // Calculate indicators
    const ema20 = TechnicalIndicators.EMA(closes, 20);
    const ema50 = TechnicalIndicators.EMA(closes, 50);
    const ema200 = TechnicalIndicators.EMA(closes, 200);
    const rsi = TechnicalIndicators.RSI(closes, 14);
    const macd = TechnicalIndicators.MACD(closes);
    const atr = TechnicalIndicators.ATR(candles, 14);
    const { supports, resistances } = TechnicalIndicators.findSupportResistance(candles);
    const bos = TechnicalIndicators.detectBOS(candles);
    const liquidity = TechnicalIndicators.detectLiquidityZones(candles);

    const currentEMA20 = ema20[ema20.length - 1];
    const currentEMA50 = ema50[ema50.length - 1];
    const currentEMA200 = ema200[ema200.length - 1];
    const currentRSI = rsi[rsi.length - 1];
    const currentMACD = macd.macd[macd.macd.length - 1];
    const currentSignal = macd.signal[macd.signal.length - 1];
    const currentATR = atr[atr.length - 1];
    const prevMACD = macd.macd[macd.macd.length - 2];
    const prevSignal = macd.signal[macd.signal.length - 2];

    if (!currentEMA20 || !currentEMA50 || !currentEMA200 || !currentRSI || 
        !currentMACD || !currentSignal || !currentATR || !prevMACD || !prevSignal) {
      return null;
    }

    let buyScore = 0;
    let sellScore = 0;
    const reasons: string[] = [];

    // EMA Trend Analysis
    if (currentPrice > currentEMA20 && currentEMA20 > currentEMA50) {
      buyScore += 2;
      reasons.push('EMA Bullish Trend');
    } else if (currentPrice < currentEMA20 && currentEMA20 < currentEMA50) {
      sellScore += 2;
      reasons.push('EMA Bearish Trend');
    }

    // Golden/Death Cross
    const prevEMA50 = ema50[ema50.length - 2];
    const prevEMA200 = ema200[ema200.length - 2];
    if (prevEMA50 && prevEMA200) {
      if (prevEMA50 <= prevEMA200 && currentEMA50 > currentEMA200) {
        buyScore += 3;
        reasons.push('Golden Cross');
      } else if (prevEMA50 >= prevEMA200 && currentEMA50 < currentEMA200) {
        sellScore += 3;
        reasons.push('Death Cross');
      }
    }

    // RSI Analysis
    if (currentRSI < 30) {
      buyScore += 2;
      reasons.push('RSI Oversold');
    } else if (currentRSI > 70) {
      sellScore += 2;
      reasons.push('RSI Overbought');
    } else if (currentRSI < 40) {
      buyScore += 1;
    } else if (currentRSI > 60) {
      sellScore += 1;
    }

    // MACD Crossover
    if (prevMACD <= prevSignal && currentMACD > currentSignal) {
      buyScore += 2;
      reasons.push('MACD Bullish Cross');
    } else if (prevMACD >= prevSignal && currentMACD < currentSignal) {
      sellScore += 2;
      reasons.push('MACD Bearish Cross');
    }

    // Break of Structure
    if (bos.bullish) {
      buyScore += 2;
      reasons.push('Bullish BOS');
    } else if (bos.bearish) {
      sellScore += 2;
      reasons.push('Bearish BOS');
    }

    // Support/Resistance Bounce
    const nearestSupport = supports.find(s => currentPrice - s < currentATR * 2 && currentPrice > s);
    const nearestResistance = resistances.find(r => r - currentPrice < currentATR * 2 && currentPrice < r);

    if (nearestSupport && currentPrice > nearestSupport * 0.99) {
      buyScore += 1;
      reasons.push('Near Support');
    }
    if (nearestResistance && currentPrice < nearestResistance * 1.01) {
      sellScore += 1;
      reasons.push('Near Resistance');
    }

    // Liquidity Sweep
    if (liquidity.buySide.some(l => Math.abs(currentPrice - l) < currentATR * 0.5)) {
      buyScore += 1;
      reasons.push('Buy-side Liquidity');
    }
    if (liquidity.sellSide.some(l => Math.abs(currentPrice - l) < currentATR * 0.5)) {
      sellScore += 1;
      reasons.push('Sell-side Liquidity');
    }

    // Generate Signal
    const totalScore = Math.max(buyScore, sellScore);
    if (totalScore < 3) return null;

    const isBuy = buyScore > sellScore;
    const strength = totalScore >= 6 ? 'STRONG' : totalScore >= 4 ? 'MODERATE' : 'WEAK';
    const confidence = Math.min(95, 50 + totalScore * 5);

    // Calculate Stop Loss and Take Profits
    const atrMultiplier = 1.5;
    const stopLoss = isBuy 
      ? currentPrice - currentATR * atrMultiplier * 2
      : currentPrice + currentATR * atrMultiplier * 2;

    const takeProfit1 = isBuy
      ? currentPrice + currentATR * atrMultiplier
      : currentPrice - currentATR * atrMultiplier;

    const takeProfit2 = isBuy
      ? currentPrice + currentATR * atrMultiplier * 2
      : currentPrice - currentATR * atrMultiplier * 2;

    const takeProfit3 = isBuy
      ? currentPrice + currentATR * atrMultiplier * 3
      : currentPrice - currentATR * atrMultiplier * 3;

    return {
      type: isBuy ? 'BUY' : 'SELL',
      strength,
      price: currentPrice,
      stopLoss: parseFloat(stopLoss.toFixed(8)),
      takeProfit1: parseFloat(takeProfit1.toFixed(8)),
      takeProfit2: parseFloat(takeProfit2.toFixed(8)),
      takeProfit3: parseFloat(takeProfit3.toFixed(8)),
      reason: reasons.join(', '),
      confidence,
      indicators: {
        ema20: currentEMA20,
        ema50: currentEMA50,
        ema200: currentEMA200,
        rsi: currentRSI,
        macd: currentMACD,
        atr: currentATR
      }
    };
  }
}

// Fetch historical data from Binance with timeout
async function fetchBinanceKlines(symbol: string, interval: string, limit: number = 500): Promise<Candle[]> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);
    
    const url = `https://api.binance.com/api/v3/klines?symbol=${symbol}&interval=${interval}&limit=${limit}`;
    const response = await fetch(url, { signal: controller.signal });
    clearTimeout(timeoutId);
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    
    if (!Array.isArray(data)) {
      console.error('Invalid Binance response:', data);
      return generateMockData(limit);
    }
    
    return data.map((k: any[]) => ({
      time: k[0],
      open: parseFloat(k[1]),
      high: parseFloat(k[2]),
      low: parseFloat(k[3]),
      close: parseFloat(k[4]),
      volume: parseFloat(k[5])
    }));
  } catch (error) {
    console.error('Error fetching Binance data:', error);
    return generateMockData(limit);
  }
}

// Generate mock data for fallback
function generateMockData(count: number): Candle[] {
  const data: Candle[] = [];
  let price = 50000 + Math.random() * 10000;
  const now = Date.now();
  
  for (let i = 0; i < count; i++) {
    const volatility = 0.02 + Math.random() * 0.02;
    const trend = Math.sin(i / 30) * 0.005;
    
    const open = price;
    const change = (Math.random() - 0.5 + trend) * volatility * price;
    const close = open + change;
    const high = Math.max(open, close) + Math.random() * volatility * price * 0.5;
    const low = Math.min(open, close) - Math.random() * volatility * price * 0.5;
    
    data.push({
      time: now - (count - i) * 3600000,
      open: parseFloat(open.toFixed(2)),
      high: parseFloat(high.toFixed(2)),
      low: parseFloat(low.toFixed(2)),
      close: parseFloat(close.toFixed(2)),
      volume: Math.floor(Math.random() * 1000000)
    });
    
    price = close;
  }
  
  return data;
}

// Fetch 24h ticker data with timeout
async function fetchBinanceTicker(symbol: string): Promise<{
  priceChange: string;
  priceChangePercent: string;
  highPrice: string;
  lowPrice: string;
  volume: string;
}> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);
    
    const url = `https://api.binance.com/api/v3/ticker/24hr?symbol=${symbol}`;
    const response = await fetch(url, { signal: controller.signal });
    clearTimeout(timeoutId);
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error fetching Binance ticker:', error);
    return {
      priceChange: '0',
      priceChangePercent: '0',
      highPrice: '0',
      lowPrice: '0',
      volume: '0'
    };
  }
}

// Initialize market data for a symbol
async function initializeMarketData(symbol: string, timeframe: string): Promise<MarketData | null> {
  console.log(`Initializing market data for ${symbol}:${timeframe}`);
  
  // Try to fetch from Binance, fallback to mock data
  let candles: Candle[] = [];
  let ticker = {
    priceChange: '0',
    priceChangePercent: '0',
    highPrice: '0',
    lowPrice: '0',
    volume: '0'
  };
  
  try {
    // Set a short timeout for the whole operation
    const timeoutPromise = new Promise<never>((_, reject) => 
      setTimeout(() => reject(new Error('Timeout')), 8000)
    );
    
    const result = await Promise.race([
      (async () => {
        candles = await fetchBinanceKlines(symbol, timeframe);
        ticker = await fetchBinanceTicker(symbol);
        return { candles, ticker };
      })(),
      timeoutPromise
    ]);
    
    candles = result.candles;
    ticker = result.ticker;
  } catch (error) {
    console.log('Using mock data due to:', error);
    candles = generateMockData(500);
  }
  
  if (candles.length === 0) {
    console.log('Generating mock data as fallback');
    candles = generateMockData(500);
  }
  
  const key = `${symbol}:${timeframe}`;

  const marketData: MarketData = {
    symbol,
    timeframe,
    candles,
    currentPrice: candles[candles.length - 1].close,
    change24h: parseFloat(ticker.priceChangePercent) || (Math.random() - 0.5) * 10,
    high24h: parseFloat(ticker.highPrice) || Math.max(...candles.slice(-24).map(c => c.high)),
    low24h: parseFloat(ticker.lowPrice) || Math.min(...candles.slice(-24).map(c => c.low)),
    volume24h: parseFloat(ticker.volume) || Math.floor(Math.random() * 1e10)
  };

  marketDataCache.set(key, marketData);
  console.log(`Market data initialized for ${symbol}:${timeframe}`);
  return marketData;
}

// HTTP Server and Socket.io
const httpServer = createServer();
const io = new SocketServer(httpServer, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

// API endpoints handler
httpServer.on('request', async (req, res) => {
  const url = new URL(req.url || '/', `http://localhost:${PORT}`);
  
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }

  // Get market data
  if (url.pathname === '/api/market-data' && req.method === 'GET') {
    const symbol = url.searchParams.get('symbol') || 'BTCUSDT';
    const timeframe = url.searchParams.get('timeframe') || '1h';
    const key = `${symbol}:${timeframe}`;
    console.log(`API request for ${key}`);

    let marketData = marketDataCache.get(key);
    if (!marketData) {
      console.log('Cache miss, fetching data...');
      marketData = await initializeMarketData(symbol, timeframe);
    }

    if (marketData) {
      console.log('Market data available, generating response...');
      
      // Generate signal
      const signal = SignalGenerator.generate(marketData.candles);
      
      // Calculate indicators for the response - only include last 100 candles for performance
      const recentCandles = marketData.candles.slice(-100);
      const closes = recentCandles.map(c => c.close);
      const allCloses = marketData.candles.map(c => c.close);
      
      const indicators = {
        ema20: TechnicalIndicators.EMA(allCloses, 20).slice(-100),
        ema50: TechnicalIndicators.EMA(allCloses, 50).slice(-100),
        ema200: TechnicalIndicators.EMA(allCloses, 200).slice(-100),
        rsi: TechnicalIndicators.RSI(allCloses, 14).slice(-100),
        macd: TechnicalIndicators.MACD(allCloses),
        bollingerBands: TechnicalIndicators.BollingerBands(allCloses),
        atr: TechnicalIndicators.ATR(marketData.candles, 14).slice(-100),
        supportResistance: TechnicalIndicators.findSupportResistance(marketData.candles),
        bos: TechnicalIndicators.detectBOS(marketData.candles),
        liquidityZones: TechnicalIndicators.detectLiquidityZones(marketData.candles)
      };

      // Limit candles in response for performance
      const responseData = {
        success: true,
        data: {
          symbol: marketData.symbol,
          timeframe: marketData.timeframe,
          candles: recentCandles,
          currentPrice: marketData.currentPrice,
          change24h: marketData.change24h,
          high24h: marketData.high24h,
          low24h: marketData.low24h,
          volume24h: marketData.volume24h,
          indicators,
          signal
        }
      };

      console.log('Sending response...');
      const jsonStr = JSON.stringify(responseData);
      console.log(`Response size: ${jsonStr.length} bytes`);
      
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(jsonStr);
      console.log('Response sent');
    } else {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: false, error: 'Failed to fetch market data' }));
    }
    return;
  }

  // Get available symbols
  if (url.pathname === '/api/symbols' && req.method === 'GET') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      success: true,
      symbols: [
        { symbol: 'BTCUSDT', name: 'Bitcoin', type: 'crypto' },
        { symbol: 'ETHUSDT', name: 'Ethereum', type: 'crypto' },
        { symbol: 'BNBUSDT', name: 'BNB', type: 'crypto' },
        { symbol: 'SOLUSDT', name: 'Solana', type: 'crypto' },
        { symbol: 'XRPUSDT', name: 'Ripple', type: 'crypto' },
        { symbol: 'ADAUSDT', name: 'Cardano', type: 'crypto' },
        { symbol: 'DOGEUSDT', name: 'Dogecoin', type: 'crypto' },
        { symbol: 'DOTUSDT', name: 'Polkadot', type: 'crypto' },
        { symbol: 'MATICUSDT', name: 'Polygon', type: 'crypto' },
        { symbol: 'LINKUSDT', name: 'Chainlink', type: 'crypto' }
      ]
    }));
    return;
  }

  // Health check
  if (url.pathname === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ status: 'ok', timestamp: Date.now() }));
    return;
  }

  res.writeHead(404, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ error: 'Not found' }));
});

// WebSocket connection handling
io.on('connection', (socket: Socket) => {
  console.log(`Client connected: ${socket.id}`);

  socket.on('subscribe', async (data: { symbol: string; timeframe: string }) => {
    const { symbol, timeframe } = data;
    const key = `${symbol}:${timeframe}`;
    
    // Add to subscribers
    if (!subscribers.has(key)) {
      subscribers.set(key, new Set());
    }
    subscribers.get(key)!.add(socket.id);
    socket.join(key);
    
    console.log(`Client ${socket.id} subscribed to ${key}`);

    // Send initial data
    let marketData = marketDataCache.get(key);
    if (!marketData) {
      marketData = await initializeMarketData(symbol, timeframe);
    }

    if (marketData) {
      const signal = SignalGenerator.generate(marketData.candles);
      const closes = marketData.candles.map(c => c.close);
      
      socket.emit('market-data', {
        ...marketData,
        indicators: {
          ema20: TechnicalIndicators.EMA(closes, 20),
          ema50: TechnicalIndicators.EMA(closes, 50),
          rsi: TechnicalIndicators.RSI(closes, 14)
        },
        signal
      });
    }
  });

  socket.on('unsubscribe', (data: { symbol: string; timeframe: string }) => {
    const key = `${data.symbol}:${data.timeframe}`;
    socket.leave(key);
    
    const subs = subscribers.get(key);
    if (subs) {
      subs.delete(socket.id);
    }
    
    console.log(`Client ${socket.id} unsubscribed from ${key}`);
  });

  socket.on('get-signal', async (data: { symbol: string; timeframe: string }) => {
    const { symbol, timeframe } = data;
    const key = `${symbol}:${timeframe}`;
    
    let marketData = marketDataCache.get(key);
    if (!marketData) {
      marketData = await initializeMarketData(symbol, timeframe);
    }

    if (marketData) {
      const signal = SignalGenerator.generate(marketData.candles);
      socket.emit('signal', signal);
    }
  });

  socket.on('disconnect', () => {
    console.log(`Client disconnected: ${socket.id}`);
    
    // Remove from all subscribers
    subscribers.forEach((subs, key) => {
      subs.delete(socket.id);
    });
  });
});

// Update market data periodically
setInterval(async () => {
  for (const [key, subs] of subscribers) {
    if (subs.size > 0) {
      const [symbol, timeframe] = key.split(':');
      const marketData = await initializeMarketData(symbol, timeframe);
      
      if (marketData) {
        const signal = SignalGenerator.generate(marketData.candles);
        const closes = marketData.candles.map(c => c.close);
        
        io.to(key).emit('market-update', {
          ...marketData,
          indicators: {
            ema20: TechnicalIndicators.EMA(closes, 20),
            ema50: TechnicalIndicators.EMA(closes, 50),
            rsi: TechnicalIndicators.RSI(closes, 14)
          },
          signal
        });
      }
    }
  }
}, 10000); // Update every 10 seconds

// Start server
httpServer.listen(PORT, () => {
  console.log(`Market Data Service running on port ${PORT}`);
});
