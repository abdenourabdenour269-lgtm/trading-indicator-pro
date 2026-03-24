// Technical Indicators Library

export interface CandleData {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume?: number;
}

export interface PivotPoints {
  pivot: number;
  r1: number;
  r2: number;
  r3: number;
  s1: number;
  s2: number;
  s3: number;
}

export interface SupportResistance {
  levels: { price: number; type: 'support' | 'resistance'; strength: number }[];
}

export interface Signal {
  type: 'buy' | 'sell' | 'hold';
  strength: 'strong' | 'moderate' | 'weak';
  price: number;
  reason: string;
}

// Calculate Simple Moving Average
export function calculateSMA(data: CandleData[], period: number): (number | null)[] {
  const result: (number | null)[] = [];
  
  for (let i = 0; i < data.length; i++) {
    if (i < period - 1) {
      result.push(null);
      continue;
    }
    
    let sum = 0;
    for (let j = 0; j < period; j++) {
      sum += data[i - j].close;
    }
    result.push(sum / period);
  }
  
  return result;
}

// Calculate Exponential Moving Average
export function calculateEMA(data: CandleData[], period: number): (number | null)[] {
  const result: (number | null)[] = [];
  const multiplier = 2 / (period + 1);
  
  for (let i = 0; i < data.length; i++) {
    if (i < period - 1) {
      result.push(null);
      continue;
    }
    
    if (i === period - 1) {
      // First EMA is SMA
      let sum = 0;
      for (let j = 0; j < period; j++) {
        sum += data[i - j].close;
      }
      result.push(sum / period);
    } else {
      const prevEMA = result[i - 1] as number;
      const ema = (data[i].close - prevEMA) * multiplier + prevEMA;
      result.push(ema);
    }
  }
  
  return result;
}

// Calculate Pivot Points (Standard Method)
export function calculatePivotPoints(high: number, low: number, close: number): PivotPoints {
  const pivot = (high + low + close) / 3;
  const r1 = 2 * pivot - low;
  const s1 = 2 * pivot - high;
  const r2 = pivot + (high - low);
  const s2 = pivot - (high - low);
  const r3 = high + 2 * (pivot - low);
  const s3 = low - 2 * (high - pivot);
  
  return { pivot, r1, r2, r3, s1, s2, s3 };
}

// Calculate Fibonacci Pivot Points
export function calculateFibonacciPivotPoints(high: number, low: number, close: number): PivotPoints {
  const pivot = (high + low + close) / 3;
  const range = high - low;
  
  const r1 = pivot + range * 0.382;
  const s1 = pivot - range * 0.382;
  const r2 = pivot + range * 0.618;
  const s2 = pivot - range * 0.618;
  const r3 = pivot + range * 1.0;
  const s3 = pivot - range * 1.0;
  
  return { pivot, r1, r2, r3, s1, s2, s3 };
}

// Calculate Camarilla Pivot Points
export function calculateCamarillaPivotPoints(high: number, low: number, close: number): PivotPoints {
  const pivot = (high + low + close) / 3;
  const range = high - low;
  
  const r1 = close + range * 1.1 / 12;
  const s1 = close - range * 1.1 / 12;
  const r2 = close + range * 1.1 / 6;
  const s2 = close - range * 1.1 / 6;
  const r3 = close + range * 1.1 / 4;
  const s3 = close - range * 1.1 / 4;
  
  return { pivot, r1, r2, r3, s1, s2, s3 };
}

// Find Support and Resistance Levels
export function findSupportResistance(data: CandleData[], lookback: number = 50): SupportResistance {
  const levels: { price: number; type: 'support' | 'resistance'; strength: number }[] = [];
  const recentData = data.slice(-lookback);
  
  // Find local highs and lows
  for (let i = 2; i < recentData.length - 2; i++) {
    const current = recentData[i];
    const prev1 = recentData[i - 1];
    const prev2 = recentData[i - 2];
    const next1 = recentData[i + 1];
    const next2 = recentData[i + 2];
    
    // Local high (resistance)
    if (
      current.high > prev1.high &&
      current.high > prev2.high &&
      current.high > next1.high &&
      current.high > next2.high
    ) {
      levels.push({
        price: current.high,
        type: 'resistance',
        strength: 1
      });
    }
    
    // Local low (support)
    if (
      current.low < prev1.low &&
      current.low < prev2.low &&
      current.low < next1.low &&
      current.low < next2.low
    ) {
      levels.push({
        price: current.low,
        type: 'support',
        strength: 1
      });
    }
  }
  
  // Cluster nearby levels
  const clusteredLevels: typeof levels = [];
  const tolerance = 0.005; // 0.5% tolerance
  
  for (const level of levels) {
    const existingLevel = clusteredLevels.find(
      l => l.type === level.type && Math.abs(l.price - level.price) / l.price < tolerance
    );
    
    if (existingLevel) {
      existingLevel.strength++;
      existingLevel.price = (existingLevel.price + level.price) / 2;
    } else {
      clusteredLevels.push({ ...level });
    }
  }
  
  // Sort by strength and price
  return {
    levels: clusteredLevels.sort((a, b) => b.strength - a.strength)
  };
}

// Generate Trading Signals
export function generateSignals(
  data: CandleData[],
  sma20: (number | null)[],
  sma50: (number | null)[],
  ema12: (number | null)[],
  ema26: (number | null)[],
  pivotPoints: PivotPoints,
  supportResistance: SupportResistance
): Signal[] {
  const signals: Signal[] = [];
  
  for (let i = 50; i < data.length; i++) {
    const currentPrice = data[i].close;
    const prevPrice = data[i - 1].close;
    const currentSMA20 = sma20[i];
    const currentSMA50 = sma50[i];
    const prevSMA20 = sma20[i - 1];
    const prevSMA50 = sma50[i - 1];
    const currentEMA12 = ema12[i];
    const currentEMA26 = ema26[i];
    const prevEMA12 = ema12[i - 1];
    const prevEMA26 = ema26[i - 1];
    
    if (!currentSMA20 || !currentSMA50 || !currentEMA12 || !currentEMA26) continue;
    
    let buySignals = 0;
    let sellSignals = 0;
    const reasons: string[] = [];
    
    // SMA Crossover (Golden Cross / Death Cross)
    if (prevSMA20 && prevSMA50) {
      if (prevSMA20 <= prevSMA50 && currentSMA20 > currentSMA50) {
        buySignals += 2;
        reasons.push('Golden Cross (SMA20 above SMA50)');
      } else if (prevSMA20 >= prevSMA50 && currentSMA20 < currentSMA50) {
        sellSignals += 2;
        reasons.push('Death Cross (SMA20 below SMA50)');
      }
    }
    
    // EMA Crossover
    if (prevEMA12 && prevEMA26) {
      if (prevEMA12 <= prevEMA26 && currentEMA12 > currentEMA26) {
        buySignals += 2;
        reasons.push('EMA Bullish Crossover');
      } else if (prevEMA12 >= prevEMA26 && currentEMA12 < currentEMA26) {
        sellSignals += 2;
        reasons.push('EMA Bearish Crossover');
      }
    }
    
    // Price above/below Moving Averages
    if (currentPrice > currentSMA20 && currentPrice > currentSMA50) {
      buySignals += 1;
    } else if (currentPrice < currentSMA20 && currentPrice < currentSMA50) {
      sellSignals += 1;
    }
    
    // Pivot Point signals
    if (currentPrice <= pivotPoints.s1 * 1.01 && currentPrice >= pivotPoints.s1 * 0.99) {
      buySignals += 1;
      reasons.push('Near S1 Support Level');
    } else if (currentPrice <= pivotPoints.s2 * 1.01 && currentPrice >= pivotPoints.s2 * 0.99) {
      buySignals += 2;
      reasons.push('Near S2 Strong Support');
    } else if (currentPrice >= pivotPoints.r1 * 0.99 && currentPrice <= pivotPoints.r1 * 1.01) {
      sellSignals += 1;
      reasons.push('Near R1 Resistance Level');
    } else if (currentPrice >= pivotPoints.r2 * 0.99 && currentPrice <= pivotPoints.r2 * 1.01) {
      sellSignals += 2;
      reasons.push('Near R2 Strong Resistance');
    }
    
    // Support/Resistance Level signals
    const nearbySupport = supportResistance.levels.find(
      l => l.type === 'support' && 
           Math.abs(l.price - currentPrice) / currentPrice < 0.01
    );
    const nearbyResistance = supportResistance.levels.find(
      l => l.type === 'resistance' && 
           Math.abs(l.price - currentPrice) / currentPrice < 0.01
    );
    
    if (nearbySupport) {
      buySignals += nearbySupport.strength;
      reasons.push(`Strong Support at ${nearbySupport.price.toFixed(2)}`);
    }
    if (nearbyResistance) {
      sellSignals += nearbyResistance.strength;
      reasons.push(`Strong Resistance at ${nearbyResistance.price.toFixed(2)}`);
    }
    
    // Generate signal
    if (buySignals > sellSignals && buySignals >= 2) {
      signals.push({
        type: 'buy',
        strength: buySignals >= 4 ? 'strong' : buySignals >= 3 ? 'moderate' : 'weak',
        price: currentPrice,
        reason: reasons.join(', ')
      });
    } else if (sellSignals > buySignals && sellSignals >= 2) {
      signals.push({
        type: 'sell',
        strength: sellSignals >= 4 ? 'strong' : sellSignals >= 3 ? 'moderate' : 'weak',
        price: currentPrice,
        reason: reasons.join(', ')
      });
    }
  }
  
  return signals;
}

// Calculate RSI
export function calculateRSI(data: CandleData[], period: number = 14): (number | null)[] {
  const result: (number | null)[] = [];
  const gains: number[] = [];
  const losses: number[] = [];
  
  for (let i = 0; i < data.length; i++) {
    if (i === 0) {
      result.push(null);
      continue;
    }
    
    const change = data[i].close - data[i - 1].close;
    gains.push(change > 0 ? change : 0);
    losses.push(change < 0 ? Math.abs(change) : 0);
    
    if (i < period) {
      result.push(null);
      continue;
    }
    
    if (i === period) {
      const avgGain = gains.slice(0, period).reduce((a, b) => a + b, 0) / period;
      const avgLoss = losses.slice(0, period).reduce((a, b) => a + b, 0) / period;
      
      if (avgLoss === 0) {
        result.push(100);
      } else {
        const rs = avgGain / avgLoss;
        result.push(100 - (100 / (1 + rs)));
      }
    } else {
      const prevRSI = result[i - 1] as number;
      const prevAvgGain = prevRSI ? (100 - prevRSI) / prevRSI : 1;
      const avgGain = (gains.slice(i - period, i).reduce((a, b) => a + b, 0) / period);
      const avgLoss = (losses.slice(i - period, i).reduce((a, b) => a + b, 0) / period);
      
      if (avgLoss === 0) {
        result.push(100);
      } else {
        const rs = avgGain / avgLoss;
        result.push(100 - (100 / (1 + rs)));
      }
    }
  }
  
  return result;
}

// Calculate MACD
export function calculateMACD(
  data: CandleData[],
  fastPeriod: number = 12,
  slowPeriod: number = 26,
  signalPeriod: number = 9
): { macd: (number | null)[]; signal: (number | null)[]; histogram: (number | null)[] } {
  const emaFast = calculateEMA(data, fastPeriod);
  const emaSlow = calculateEMA(data, slowPeriod);
  
  const macd: (number | null)[] = [];
  
  for (let i = 0; i < data.length; i++) {
    if (emaFast[i] === null || emaSlow[i] === null) {
      macd.push(null);
    } else {
      macd.push(emaFast[i] - emaSlow[i]);
    }
  }
  
  // Calculate signal line (EMA of MACD)
  const validMacd = macd.filter(v => v !== null) as number[];
  const signal: (number | null)[] = [];
  const multiplier = 2 / (signalPeriod + 1);
  
  let signalIndex = 0;
  for (let i = 0; i < macd.length; i++) {
    if (macd[i] === null) {
      signal.push(null);
      continue;
    }
    
    if (signalIndex < signalPeriod - 1) {
      signal.push(null);
      signalIndex++;
    } else if (signalIndex === signalPeriod - 1) {
      // First signal is SMA
      const firstSignals = validMacd.slice(0, signalPeriod);
      signal.push(firstSignals.reduce((a, b) => a + b, 0) / signalPeriod);
      signalIndex++;
    } else {
      const prevSignal = signal[i - 1] as number;
      signal.push((macd[i] as number - prevSignal) * multiplier + prevSignal);
      signalIndex++;
    }
  }
  
  // Calculate histogram
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

// Generate sample data for demonstration
export function generateSampleData(days: number = 100): CandleData[] {
  const data: CandleData[] = [];
  let basePrice = 50000 + Math.random() * 10000;
  const now = Date.now();
  
  for (let i = days; i >= 0; i--) {
    const volatility = 0.02 + Math.random() * 0.03;
    const trend = Math.sin(i / 20) * 0.01;
    
    const open = basePrice;
    const change = (Math.random() - 0.5 + trend) * volatility * basePrice;
    const close = open + change;
    const high = Math.max(open, close) + Math.random() * volatility * basePrice * 0.5;
    const low = Math.min(open, close) - Math.random() * volatility * basePrice * 0.5;
    
    data.push({
      time: now - i * 24 * 60 * 60 * 1000,
      open: parseFloat(open.toFixed(2)),
      high: parseFloat(high.toFixed(2)),
      low: parseFloat(low.toFixed(2)),
      close: parseFloat(close.toFixed(2)),
      volume: Math.floor(Math.random() * 1000000)
    });
    
    basePrice = close;
  }
  
  return data;
}
