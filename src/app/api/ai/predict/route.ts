import { NextRequest, NextResponse } from 'next/server';
import ZAI from 'z-ai-web-dev-sdk';

interface Candle {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { candles, symbol } = body as { candles: Candle[]; symbol: string };

    if (!candles || candles.length < 50) {
      return NextResponse.json({
        prediction: {
          direction: 'neutral',
          confidence: 50,
          nextPrice: candles?.[candles.length - 1]?.close || 0,
        },
      });
    }

    // Analyze price action and indicators
    const closes = candles.map((c) => c.close);
    const volumes = candles.map((c) => c.volume);

    // Calculate basic indicators for AI analysis
    const sma20 = SMA(closes, 20);
    const sma50 = SMA(closes, 50);
    const rsi = RSI(closes, 14);
    const macd = MACD(closes);

    const currentPrice = closes[closes.length - 1];
    const prevPrice = closes[closes.length - 2];

    // Get indicator values
    const currentSMA20 = sma20[sma20.length - 1];
    const currentSMA50 = sma50[sma50.length - 1];
    const currentRSI = rsi[rsi.length - 1];
    const currentMACD = macd.macd[macd.macd.length - 1];
    const currentSignal = macd.signal[macd.signal.length - 1];

    // Calculate trend strength
    let bullishScore = 0;
    let bearishScore = 0;

    // Price vs Moving Averages
    if (currentPrice > currentSMA20) bullishScore += 1;
    else bearishScore += 1;

    if (currentPrice > currentSMA50) bullishScore += 1;
    else bearishScore += 1;

    // Moving Average crossover
    if (currentSMA20 > currentSMA50) bullishScore += 1;
    else bearishScore += 1;

    // RSI analysis
    if (currentRSI < 30) bullishScore += 2; // Oversold - bullish reversal potential
    else if (currentRSI > 70) bearishScore += 2; // Overbought - bearish reversal potential
    else if (currentRSI > 50) bullishScore += 0.5;
    else bearishScore += 0.5;

    // MACD analysis
    if (currentMACD > currentSignal) bullishScore += 1;
    else bearishScore += 1;

    // Volume trend
    const avgVolume = volumes.slice(-20).reduce((a, b) => a + b, 0) / 20;
    const currentVolume = volumes[volumes.length - 1];
    if (currentVolume > avgVolume * 1.5) {
      // High volume confirms the move
      if (currentPrice > prevPrice) bullishScore += 1;
      else bearishScore += 1;
    }

    // Recent price momentum
    const priceChange5 = (currentPrice - closes[closes.length - 5]) / closes[closes.length - 5];
    if (priceChange5 > 0.02) bullishScore += 1;
    else if (priceChange5 < -0.02) bearishScore += 1;

    // Calculate prediction
    let direction: 'bullish' | 'bearish' | 'neutral';
    let confidence: number;

    if (bullishScore > bearishScore * 1.5) {
      direction = 'bullish';
      confidence = Math.min(90, 50 + (bullishScore - bearishScore) * 5);
    } else if (bearishScore > bullishScore * 1.5) {
      direction = 'bearish';
      confidence = Math.min(90, 50 + (bearishScore - bullishScore) * 5);
    } else {
      direction = 'neutral';
      confidence = 50;
    }

    // Predict next price (simple extrapolation with trend)
    const volatility = calculateVolatility(closes);
    const trend = direction === 'bullish' ? 1 : direction === 'bearish' ? -1 : 0;
    const nextPrice = currentPrice * (1 + trend * volatility * (confidence / 100));

    // Use AI SDK to enhance prediction
    try {
      const zai = await ZAI.create();
      const completion = await zai.chat.completions.create({
        messages: [
          {
            role: 'system',
            content: `You are a professional financial analyst. Analyze the given market data and provide a prediction.
                      Respond with ONLY a JSON object with: { "direction": "bullish/bearish/neutral", "confidence": number 0-100, "analysis": "brief explanation" }`,
          },
          {
            role: 'user',
            content: `Analyze ${symbol}:
                      Current Price: ${currentPrice.toFixed(2)}
                      RSI: ${currentRSI.toFixed(1)}
                      MACD: ${currentMACD.toFixed(4)}
                      SMA20: ${currentSMA20.toFixed(2)}
                      SMA50: ${currentSMA50.toFixed(2)}
                      Price Change 5 candles: ${(priceChange5 * 100).toFixed(2)}%
                      Volume vs Average: ${((currentVolume / avgVolume) * 100).toFixed(0)}%
                      
                      Current Analysis: ${direction} with ${confidence}% confidence.
                      Provide your prediction as JSON.`,
          },
        ],
        max_tokens: 200,
      });

      const aiResponse = completion.choices[0]?.message?.content;
      if (aiResponse) {
        try {
          const aiPrediction = JSON.parse(aiResponse);
          if (aiPrediction.direction && typeof aiPrediction.confidence === 'number') {
            direction = aiPrediction.direction;
            confidence = Math.max(0, Math.min(100, aiPrediction.confidence));
          }
        } catch {
          // Use default prediction if AI response is invalid
        }
      }
    } catch (aiError) {
      // Continue with calculated prediction if AI fails
      console.error('AI prediction error:', aiError);
    }

    return NextResponse.json({
      prediction: {
        direction,
        confidence,
        nextPrice: parseFloat(nextPrice.toFixed(8)),
        analysis: {
          bullishScore,
          bearishScore,
          rsi: currentRSI,
          macd: currentMACD,
        },
      },
    });
  } catch (error) {
    console.error('Prediction API error:', error);
    return NextResponse.json(
      { error: 'Failed to generate prediction' },
      { status: 500 }
    );
  }
}

// Helper functions
function SMA(data: number[], period: number): number[] {
  const result: number[] = [];
  for (let i = 0; i < data.length; i++) {
    if (i < period - 1) {
      result.push(data[i]);
      continue;
    }
    const sum = data.slice(i - period + 1, i + 1).reduce((a, b) => a + b, 0);
    result.push(sum / period);
  }
  return result;
}

function EMA(data: number[], period: number): number[] {
  const result: number[] = [];
  const multiplier = 2 / (period + 1);

  for (let i = 0; i < data.length; i++) {
    if (i === 0) {
      result.push(data[i]);
    } else {
      result.push((data[i] - result[i - 1]) * multiplier + result[i - 1]);
    }
  }
  return result;
}

function RSI(data: number[], period: number = 14): number[] {
  const result: number[] = [];
  const gains: number[] = [];
  const losses: number[] = [];

  for (let i = 0; i < data.length; i++) {
    if (i === 0) {
      result.push(50);
      continue;
    }

    const change = data[i] - data[i - 1];
    gains.push(change > 0 ? change : 0);
    losses.push(change < 0 ? Math.abs(change) : 0);

    if (i < period) {
      result.push(50);
      continue;
    }

    const avgGain = gains.slice(-period).reduce((a, b) => a + b, 0) / period;
    const avgLoss = losses.slice(-period).reduce((a, b) => a + b, 0) / period;

    if (avgLoss === 0) {
      result.push(100);
    } else {
      const rs = avgGain / avgLoss;
      result.push(100 - 100 / (1 + rs));
    }
  }
  return result;
}

function MACD(data: number[]): { macd: number[]; signal: number[] } {
  const ema12 = EMA(data, 12);
  const ema26 = EMA(data, 26);
  const macd = ema12.map((v, i) => v - ema26[i]);
  const signal = EMA(macd, 9);
  return { macd, signal };
}

function calculateVolatility(closes: number[]): number {
  const returns: number[] = [];
  for (let i = 1; i < closes.length; i++) {
    returns.push((closes[i] - closes[i - 1]) / closes[i - 1]);
  }
  const mean = returns.reduce((a, b) => a + b, 0) / returns.length;
  const variance = returns.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / returns.length;
  return Math.sqrt(variance);
}
