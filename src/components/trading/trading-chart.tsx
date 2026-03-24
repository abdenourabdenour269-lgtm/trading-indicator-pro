'use client';

import { useEffect, useRef, useCallback } from 'react';
import {
  createChart,
  IChartApi,
  ISeriesApi,
  CandlestickData,
  LineData,
  HistogramData,
  ColorType,
  CrosshairMode,
} from 'lightweight-charts';
import { useTradingStore } from '@/store/trading-store';

interface ChartProps {
  height?: number;
}

export function TradingChart({ height = 500 }: ChartProps) {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const candlestickSeriesRef = useRef<ISeriesApi<'Candlestick'> | null>(null);
  const volumeSeriesRef = useRef<ISeriesApi<'Histogram'> | null>(null);
  const ema20SeriesRef = useRef<ISeriesApi<'Line'> | null>(null);
  const ema50SeriesRef = useRef<ISeriesApi<'Line'> | null>(null);
  const ema200SeriesRef = useRef<ISeriesApi<'Line'> | null>(null);

  const {
    marketData,
    showIndicators,
    chartType,
  } = useTradingStore();

  // Initialize chart
  useEffect(() => {
    if (!chartContainerRef.current) return;

    const chart = createChart(chartContainerRef.current, {
      width: chartContainerRef.current.clientWidth,
      height,
      layout: {
        background: { type: ColorType.Solid, color: '#0f172a' },
        textColor: '#94a3b8',
      },
      grid: {
        vertLines: { color: '#1e293b' },
        horzLines: { color: '#1e293b' },
      },
      crosshair: {
        mode: CrosshairMode.Normal,
        vertLine: {
          color: '#6366f1',
          width: 1,
          style: 2,
          labelBackgroundColor: '#6366f1',
        },
        horzLine: {
          color: '#6366f1',
          width: 1,
          style: 2,
          labelBackgroundColor: '#6366f1',
        },
      },
      rightPriceScale: {
        borderColor: '#1e293b',
        scaleMargins: {
          top: 0.1,
          bottom: 0.2,
        },
      },
      timeScale: {
        borderColor: '#1e293b',
        timeVisible: true,
        secondsVisible: false,
      },
    });

    chartRef.current = chart;

    // Create candlestick series
    const candlestickSeries = chart.addCandlestickSeries({
      upColor: '#22c55e',
      downColor: '#ef4444',
      borderDownColor: '#ef4444',
      borderUpColor: '#22c55e',
      wickDownColor: '#ef4444',
      wickUpColor: '#22c55e',
    });
    candlestickSeriesRef.current = candlestickSeries;

    // Create volume series
    const volumeSeries = chart.addHistogramSeries({
      color: '#6366f1',
      priceFormat: {
        type: 'volume',
      },
      priceScaleId: '',
    });
    volumeSeriesRef.current = volumeSeries;

    // Create EMA series
    const ema20Series = chart.addLineSeries({
      color: '#f59e0b',
      lineWidth: 2,
      title: 'EMA 20',
    });
    ema20SeriesRef.current = ema20Series;

    const ema50Series = chart.addLineSeries({
      color: '#a855f7',
      lineWidth: 2,
      title: 'EMA 50',
    });
    ema50SeriesRef.current = ema50Series;

    const ema200Series = chart.addLineSeries({
      color: '#ec4899',
      lineWidth: 2,
      title: 'EMA 200',
    });
    ema200SeriesRef.current = ema200Series;

    // Handle resize
    const handleResize = () => {
      if (chartContainerRef.current && chart) {
        chart.applyOptions({ width: chartContainerRef.current.clientWidth });
      }
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      chart.remove();
    };
  }, [height]);

  // Update chart data
  useEffect(() => {
    if (!marketData || !candlestickSeriesRef.current || !volumeSeriesRef.current) return;

    const { candles, indicators, signal } = marketData;

    // Update candlestick data
    const candleData: CandlestickData[] = candles.map((c) => ({
      time: Math.floor(c.time / 1000) as any,
      open: c.open,
      high: c.high,
      low: c.low,
      close: c.close,
    }));
    candlestickSeriesRef.current.setData(candleData);

    // Update volume data
    const volumeData: HistogramData[] = candles.map((c) => ({
      time: Math.floor(c.time / 1000) as any,
      value: c.volume,
      color: c.close >= c.open ? 'rgba(34, 197, 94, 0.5)' : 'rgba(239, 68, 68, 0.5)',
    }));
    volumeSeriesRef.current.setData(volumeData);

    // Update EMA data
    if (indicators && showIndicators) {
      if (showIndicators.ema20 && ema20SeriesRef.current) {
        const ema20Data: LineData[] = candles
          .map((c, i) => ({
            time: Math.floor(c.time / 1000) as any,
            value: indicators.ema20[i],
          }))
          .filter((d) => d.value !== null) as LineData[];
        ema20SeriesRef.current.setData(ema20Data);
      }

      if (showIndicators.ema50 && ema50SeriesRef.current) {
        const ema50Data: LineData[] = candles
          .map((c, i) => ({
            time: Math.floor(c.time / 1000) as any,
            value: indicators.ema50[i],
          }))
          .filter((d) => d.value !== null) as LineData[];
        ema50SeriesRef.current.setData(ema50Data);
      }

      if (showIndicators.ema200 && ema200SeriesRef.current) {
        const ema200Data: LineData[] = candles
          .map((c, i) => ({
            time: Math.floor(c.time / 1000) as any,
            value: indicators.ema200[i],
          }))
          .filter((d) => d.value !== null) as LineData[];
        ema200SeriesRef.current.setData(ema200Data);
      }
    }

    // Add signal markers
    if (signal && candlestickSeriesRef.current) {
      const markers = [
        {
          time: Math.floor(candles[candles.length - 1].time / 1000) as any,
          position: signal.type === 'BUY' ? 'belowBar' : 'aboveBar',
          color: signal.type === 'BUY' ? '#22c55e' : '#ef4444',
          shape: signal.type === 'BUY' ? 'arrowUp' : 'arrowDown',
          text: `${signal.type} (${signal.confidence}%)`,
        },
      ];
      candlestickSeriesRef.current.setMarkers(markers);
    }

    // Fit content
    if (chartRef.current) {
      chartRef.current.timeScale().fitContent();
    }
  }, [marketData, showIndicators]);

  // Toggle indicators visibility
  useEffect(() => {
    if (ema20SeriesRef.current) {
      ema20SeriesRef.current.applyOptions({
        visible: showIndicators.ema20,
      });
    }
    if (ema50SeriesRef.current) {
      ema50SeriesRef.current.applyOptions({
        visible: showIndicators.ema50,
      });
    }
    if (ema200SeriesRef.current) {
      ema200SeriesRef.current.applyOptions({
        visible: showIndicators.ema200,
      });
    }
  }, [showIndicators]);

  return (
    <div
      ref={chartContainerRef}
      className="w-full rounded-lg overflow-hidden border border-slate-700"
    />
  );
}

// RSI Chart Component
export function RSIChart({ height = 150 }: ChartProps) {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const rsiSeriesRef = useRef<ISeriesApi<'Line'> | null>(null);

  const { marketData, showIndicators } = useTradingStore();

  useEffect(() => {
    if (!chartContainerRef.current) return;

    const chart = createChart(chartContainerRef.current, {
      width: chartContainerRef.current.clientWidth,
      height,
      layout: {
        background: { type: ColorType.Solid, color: '#0f172a' },
        textColor: '#94a3b8',
      },
      grid: {
        vertLines: { color: '#1e293b' },
        horzLines: { color: '#1e293b' },
      },
      rightPriceScale: {
        borderColor: '#1e293b',
        scaleMargins: {
          top: 0.1,
          bottom: 0.1,
        },
      },
      timeScale: {
        borderColor: '#1e293b',
        visible: false,
      },
    });

    chartRef.current = chart;

    const rsiSeries = chart.addLineSeries({
      color: '#22d3ee',
      lineWidth: 2,
    });
    rsiSeriesRef.current = rsiSeries;

    // Add overbought/oversold lines
    chart.addLineSeries({
      color: '#ef4444',
      lineWidth: 1,
      lineStyle: 2,
    }).setData([{ time: 0 as any, value: 70 }, { time: Date.now() / 1000 as any, value: 70 }]);

    chart.addLineSeries({
      color: '#22c55e',
      lineWidth: 1,
      lineStyle: 2,
    }).setData([{ time: 0 as any, value: 30 }, { time: Date.now() / 1000 as any, value: 30 }]);

    const handleResize = () => {
      if (chartContainerRef.current && chart) {
        chart.applyOptions({ width: chartContainerRef.current.clientWidth });
      }
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      chart.remove();
    };
  }, [height]);

  useEffect(() => {
    if (!marketData?.indicators?.rsi || !rsiSeriesRef.current) return;

    const rsiData: LineData[] = marketData.candles
      .map((c, i) => ({
        time: Math.floor(c.time / 1000) as any,
        value: marketData.indicators!.rsi[i] || undefined,
      }))
      .filter((d) => d.value !== null && d.value !== undefined) as LineData[];

    rsiSeriesRef.current.setData(rsiData);

    if (chartRef.current) {
      chartRef.current.timeScale().fitContent();
    }
  }, [marketData]);

  if (!showIndicators.rsi) return null;

  return (
    <div className="w-full">
      <div className="text-xs text-slate-400 mb-1 px-2">RSI (14)</div>
      <div
        ref={chartContainerRef}
        className="w-full rounded-lg overflow-hidden border border-slate-700"
      />
    </div>
  );
}

// MACD Chart Component
export function MACDChart({ height = 150 }: ChartProps) {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const histogramSeriesRef = useRef<ISeriesApi<'Histogram'> | null>(null);
  const macdSeriesRef = useRef<ISeriesApi<'Line'> | null>(null);
  const signalSeriesRef = useRef<ISeriesApi<'Line'> | null>(null);

  const { marketData, showIndicators } = useTradingStore();

  useEffect(() => {
    if (!chartContainerRef.current) return;

    const chart = createChart(chartContainerRef.current, {
      width: chartContainerRef.current.clientWidth,
      height,
      layout: {
        background: { type: ColorType.Solid, color: '#0f172a' },
        textColor: '#94a3b8',
      },
      grid: {
        vertLines: { color: '#1e293b' },
        horzLines: { color: '#1e293b' },
      },
      rightPriceScale: {
        borderColor: '#1e293b',
        scaleMargins: {
          top: 0.1,
          bottom: 0.1,
        },
      },
      timeScale: {
        borderColor: '#1e293b',
        visible: false,
      },
    });

    chartRef.current = chart;

    const histogramSeries = chart.addHistogramSeries({
      priceFormat: { type: 'price', precision: 4 },
    });
    histogramSeriesRef.current = histogramSeries;

    const macdSeries = chart.addLineSeries({
      color: '#22c55e',
      lineWidth: 2,
    });
    macdSeriesRef.current = macdSeries;

    const signalSeries = chart.addLineSeries({
      color: '#ef4444',
      lineWidth: 2,
    });
    signalSeriesRef.current = signalSeries;

    const handleResize = () => {
      if (chartContainerRef.current && chart) {
        chart.applyOptions({ width: chartContainerRef.current.clientWidth });
      }
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      chart.remove();
    };
  }, [height]);

  useEffect(() => {
    if (!marketData?.indicators?.macd || !histogramSeriesRef.current) return;

    const { macd, signal, histogram } = marketData.indicators.macd;
    const candles = marketData.candles;

    // Histogram data
    const histogramData: HistogramData[] = candles
      .map((c, i) => ({
        time: Math.floor(c.time / 1000) as any,
        value: histogram[i] || 0,
        color: (histogram[i] || 0) >= 0 ? 'rgba(34, 197, 94, 0.5)' : 'rgba(239, 68, 68, 0.5)',
      }))
      .filter((d) => d.value !== null);
    histogramSeriesRef.current.setData(histogramData as any);

    // MACD line
    const macdData: LineData[] = candles
      .map((c, i) => ({
        time: Math.floor(c.time / 1000) as any,
        value: macd[i] || undefined,
      }))
      .filter((d) => d.value !== null && d.value !== undefined) as LineData[];
    if (macdSeriesRef.current) macdSeriesRef.current.setData(macdData);

    // Signal line
    const signalData: LineData[] = candles
      .map((c, i) => ({
        time: Math.floor(c.time / 1000) as any,
        value: signal[i] || undefined,
      }))
      .filter((d) => d.value !== null && d.value !== undefined) as LineData[];
    if (signalSeriesRef.current) signalSeriesRef.current.setData(signalData);

    if (chartRef.current) {
      chartRef.current.timeScale().fitContent();
    }
  }, [marketData]);

  if (!showIndicators.macd) return null;

  return (
    <div className="w-full">
      <div className="text-xs text-slate-400 mb-1 px-2">MACD (12, 26, 9)</div>
      <div
        ref={chartContainerRef}
        className="w-full rounded-lg overflow-hidden border border-slate-700"
      />
    </div>
  );
}
