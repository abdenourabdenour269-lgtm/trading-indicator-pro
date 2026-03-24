'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  TrendingUp,
  TrendingDown,
  Activity,
  BarChart3,
  Settings,
  Bell,
  User,
  Zap,
  Target,
  AlertTriangle,
  CheckCircle,
  Info,
  RefreshCw,
  ChevronUp,
  ChevronDown,
  Minus,
  LineChart,
  Brain,
  History,
  Wallet,
  Crown,
  Menu,
  X,
} from 'lucide-react';
import { TradingChart, RSIChart, MACDChart } from '@/components/trading/trading-chart';
import { useMarketData, useAIPrediction } from '@/hooks/use-market-data';
import { useTradingStore, TIMEFRAMES, type Signal } from '@/store/trading-store';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';

// Signal Card Component
function SignalCard({ signal }: { signal: Signal }) {
  const isBuy = signal.type === 'BUY';

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        'p-4 rounded-xl border',
        isBuy
          ? 'bg-emerald-500/10 border-emerald-500/30'
          : 'bg-red-500/10 border-red-500/30'
      )}
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <motion.div
            whileHover={{ scale: 1.1 }}
            className={cn(
              'p-2 rounded-lg',
              isBuy ? 'bg-emerald-500/20' : 'bg-red-500/20'
            )}
          >
            {isBuy ? (
              <TrendingUp className="w-5 h-5 text-emerald-400" />
            ) : (
              <TrendingDown className="w-5 h-5 text-red-400" />
            )}
          </motion.div>
          <div>
            <div className="flex items-center gap-2">
              <Badge
                className={cn(
                  'font-bold',
                  isBuy ? 'bg-emerald-500' : 'bg-red-500'
                )}
              >
                {isBuy ? 'شراء' : 'بيع'}
              </Badge>
              <Badge variant="outline" className="text-xs">
                {signal.strength === 'STRONG'
                  ? 'قوية'
                  : signal.strength === 'MODERATE'
                  ? 'متوسطة'
                  : 'ضعيفة'}
              </Badge>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              الثقة: {signal.confidence.toFixed(0)}%
            </p>
          </div>
        </div>
        <div className="text-left">
          <p
            className={cn(
              'text-lg font-bold font-mono',
              isBuy ? 'text-emerald-400' : 'text-red-400'
            )}
          >
            ${signal.price.toFixed(2)}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2 mb-3">
        <div className="p-2 bg-slate-800/50 rounded-lg text-center">
          <p className="text-xs text-red-400">Stop Loss</p>
          <p className="text-sm font-mono font-bold">${signal.stopLoss.toFixed(2)}</p>
        </div>
        <div className="p-2 bg-slate-800/50 rounded-lg text-center">
          <p className="text-xs text-emerald-400">TP1</p>
          <p className="text-sm font-mono font-bold">${signal.takeProfit1.toFixed(2)}</p>
        </div>
        <div className="p-2 bg-slate-800/50 rounded-lg text-center">
          <p className="text-xs text-emerald-400">TP2</p>
          <p className="text-sm font-mono font-bold">${signal.takeProfit2.toFixed(2)}</p>
        </div>
      </div>

      <p className="text-xs text-slate-400">{signal.reason}</p>
    </motion.div>
  );
}

// Stats Card Component
function StatsCard({
  title,
  value,
  change,
  icon: Icon,
  color,
}: {
  title: string;
  value: string;
  change?: number;
  icon: React.ElementType;
  color: string;
}) {
  return (
    <motion.div
      whileHover={{ scale: 1.02 }}
      className="p-4 bg-slate-800/50 rounded-xl border border-slate-700/50"
    >
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs text-slate-400">{title}</p>
          <p className={cn('text-xl font-bold font-mono mt-1', color)}>{value}</p>
          {change !== undefined && (
            <p
              className={cn(
                'text-xs mt-1 flex items-center gap-1',
                change >= 0 ? 'text-emerald-400' : 'text-red-400'
              )}
            >
              {change >= 0 ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
              {Math.abs(change).toFixed(2)}%
            </p>
          )}
        </div>
        <div className={cn('p-3 rounded-xl bg-slate-700/50', color)}>
          <Icon className="w-5 h-5" />
        </div>
      </div>
    </motion.div>
  );
}

// Backtesting Results Component
function BacktestingResults() {
  const { backtestResult } = useTradingStore();

  if (!backtestResult) {
    return (
      <div className="text-center py-8 text-slate-400">
        <History className="w-12 h-12 mx-auto mb-2 opacity-50" />
        <p>قم بتشغيل الـ Backtesting لرؤية النتائج</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div className="p-3 bg-slate-700/30 rounded-lg">
          <p className="text-xs text-slate-400">إجمالي الصفقات</p>
          <p className="text-lg font-bold">{backtestResult.totalTrades}</p>
        </div>
        <div className="p-3 bg-slate-700/30 rounded-lg">
          <p className="text-xs text-slate-400">نسبة النجاح</p>
          <p className="text-lg font-bold text-emerald-400">{backtestResult.winRate.toFixed(1)}%</p>
        </div>
        <div className="p-3 bg-slate-700/30 rounded-lg">
          <p className="text-xs text-slate-400">صفقات رابحة</p>
          <p className="text-lg font-bold text-emerald-400">{backtestResult.winTrades}</p>
        </div>
        <div className="p-3 bg-slate-700/30 rounded-lg">
          <p className="text-xs text-slate-400">صفقات خاسرة</p>
          <p className="text-lg font-bold text-red-400">{backtestResult.lossTrades}</p>
        </div>
      </div>

      <div className="p-3 bg-slate-700/30 rounded-lg">
        <div className="flex justify-between items-center mb-2">
          <p className="text-xs text-slate-400">نسبة الربح</p>
          <p className={cn('font-bold', backtestResult.profitFactor >= 1 ? 'text-emerald-400' : 'text-red-400')}>
            {backtestResult.profitFactor.toFixed(2)}
          </p>
        </div>
        <Progress value={Math.min(100, backtestResult.profitFactor * 50)} className="h-2" />
      </div>

      <div className="p-3 bg-slate-700/30 rounded-lg">
        <p className="text-xs text-slate-400">إجمالي P&L</p>
        <p className={cn('text-lg font-bold', backtestResult.totalPnL >= 0 ? 'text-emerald-400' : 'text-red-400')}>
          ${backtestResult.totalPnL.toFixed(2)}
        </p>
      </div>
    </div>
  );
}

// Main Trading Platform Component
export default function TradingPlatform() {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [activeTab, setActiveTab] = useState('chart');

  const {
    marketData,
    symbols,
    selectedSymbol,
    selectedTimeframe,
    isLoading,
    error,
    showIndicators,
    aiPrediction,
    setSelectedSymbol,
    setSelectedTimeframe,
    toggleIndicator,
  } = useTradingStore();

  const { refresh } = useMarketData();
  const { generatePrediction } = useAIPrediction();

  // Generate AI prediction when market data changes
  useEffect(() => {
    if (marketData) {
      generatePrediction();
    }
  }, [marketData, generatePrediction]);

  // Run backtesting
  const runBacktest = useCallback(async () => {
    if (!marketData) return;
    // Backtesting logic would go here
  }, [marketData]);

  const currentSignal = marketData?.signal;
  const currentPrice = marketData?.currentPrice || 0;
  const priceChange = marketData?.change24h || 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white">
      {/* Header */}
      <header className="border-b border-slate-700/50 backdrop-blur-sm bg-slate-900/80 sticky top-0 z-50">
        <div className="px-4 py-3">
          <div className="flex items-center justify-between flex-wrap gap-4">
            {/* Logo & Symbol Selector */}
            <div className="flex items-center gap-4">
              <motion.div
                whileHover={{ rotate: 360 }}
                transition={{ duration: 0.5 }}
                className="p-2 bg-gradient-to-br from-emerald-500 to-cyan-500 rounded-xl"
              >
                <BarChart3 className="w-6 h-6" />
              </motion.div>

              <Select value={selectedSymbol} onValueChange={setSelectedSymbol}>
                <SelectTrigger className="w-[150px] bg-slate-800 border-slate-700">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-slate-800 border-slate-700">
                  {symbols.map((s) => (
                    <SelectItem key={s.symbol} value={s.symbol}>
                      {s.symbol}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={selectedTimeframe} onValueChange={setSelectedTimeframe}>
                <SelectTrigger className="w-[100px] bg-slate-800 border-slate-700">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-slate-800 border-slate-700">
                  {TIMEFRAMES.map((tf) => (
                    <SelectItem key={tf.value} value={tf.value}>
                      {tf.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Price Info */}
            <div className="flex items-center gap-4 flex-wrap">
              <motion.div
                whileHover={{ scale: 1.02 }}
                className="flex items-center gap-3 px-4 py-2 bg-slate-800/50 rounded-xl border border-slate-700/50"
              >
                <div className="text-right">
                  <p className="text-xs text-slate-400">السعر الحالي</p>
                  <p className="text-lg font-bold font-mono">
                    ${currentPrice.toFixed(2)}
                  </p>
                </div>
                <div
                  className={cn(
                    'p-2 rounded-lg',
                    priceChange >= 0 ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'
                  )}
                >
                  {priceChange >= 0 ? <TrendingUp className="w-5 h-5" /> : <TrendingDown className="w-5 h-5" />}
                </div>
                <div className="text-right">
                  <p className="text-xs text-slate-400">24h</p>
                  <p className={cn('font-mono font-semibold', priceChange >= 0 ? 'text-emerald-400' : 'text-red-400')}>
                    {priceChange >= 0 ? '+' : ''}{priceChange.toFixed(2)}%
                  </p>
                </div>
              </motion.div>

              <Button
                onClick={refresh}
                disabled={isLoading}
                className="bg-gradient-to-r from-emerald-500 to-cyan-500 hover:from-emerald-600 hover:to-cyan-600"
              >
                <RefreshCw className={cn('w-4 h-4 mr-2', isLoading && 'animate-spin')} />
                تحديث
              </Button>

              <Button variant="ghost" size="icon" className="relative">
                <Bell className="w-5 h-5" />
                <span className="absolute top-0 right-0 w-2 h-2 bg-red-500 rounded-full" />
              </Button>
            </div>
          </div>
        </div>
      </header>

      <div className="flex">
        {/* Sidebar */}
        <motion.aside
          initial={false}
          animate={{ width: sidebarOpen ? 280 : 0 }}
          className="border-l border-slate-700/50 bg-slate-900/50 overflow-hidden"
        >
          {sidebarOpen && (
            <div className="w-[280px] p-4 space-y-4">
              {/* AI Prediction */}
              {aiPrediction && (
                <Card className="bg-slate-800/50 border-slate-700/50">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <Brain className="w-4 h-4 text-purple-400" />
                      توقع الذكاء الاصطناعي
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center justify-between mb-2">
                      <Badge
                        className={cn(
                          aiPrediction.direction === 'bullish'
                            ? 'bg-emerald-500'
                            : aiPrediction.direction === 'bearish'
                            ? 'bg-red-500'
                            : 'bg-slate-500'
                        )}
                      >
                        {aiPrediction.direction === 'bullish'
                          ? 'صعودي'
                          : aiPrediction.direction === 'bearish'
                          ? 'هبوطي'
                          : 'محايد'}
                      </Badge>
                      <span className="text-sm font-mono">{aiPrediction.confidence.toFixed(0)}%</span>
                    </div>
                    <Progress value={aiPrediction.confidence} className="h-2" />
                  </CardContent>
                </Card>
              )}

              {/* Signal */}
              {currentSignal && (
                <Card className="bg-slate-800/50 border-slate-700/50">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <Zap className="w-4 h-4 text-yellow-400" />
                      الإشارة الحالية
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <SignalCard signal={currentSignal} />
                  </CardContent>
                </Card>
              )}

              {/* Indicator Toggles */}
              <Card className="bg-slate-800/50 border-slate-700/50">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">المؤشرات</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <label className="flex items-center justify-between cursor-pointer">
                    <span className="text-sm text-amber-400">EMA 20</span>
                    <Switch checked={showIndicators.ema20} onCheckedChange={() => toggleIndicator('ema20')} />
                  </label>
                  <label className="flex items-center justify-between cursor-pointer">
                    <span className="text-sm text-purple-400">EMA 50</span>
                    <Switch checked={showIndicators.ema50} onCheckedChange={() => toggleIndicator('ema50')} />
                  </label>
                  <label className="flex items-center justify-between cursor-pointer">
                    <span className="text-sm text-pink-400">EMA 200</span>
                    <Switch checked={showIndicators.ema200} onCheckedChange={() => toggleIndicator('ema200')} />
                  </label>
                  <Separator className="bg-slate-700" />
                  <label className="flex items-center justify-between cursor-pointer">
                    <span className="text-sm text-cyan-400">RSI</span>
                    <Switch checked={showIndicators.rsi} onCheckedChange={() => toggleIndicator('rsi')} />
                  </label>
                  <label className="flex items-center justify-between cursor-pointer">
                    <span className="text-sm text-emerald-400">MACD</span>
                    <Switch checked={showIndicators.macd} onCheckedChange={() => toggleIndicator('macd')} />
                  </label>
                  <label className="flex items-center justify-between cursor-pointer">
                    <span className="text-sm text-blue-400">Support/Resistance</span>
                    <Switch
                      checked={showIndicators.supportResistance}
                      onCheckedChange={() => toggleIndicator('supportResistance')}
                    />
                  </label>
                </CardContent>
              </Card>

              {/* Quick Stats */}
              <Card className="bg-slate-800/50 border-slate-700/50">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">إحصائيات</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-400">أعلى 24h</span>
                    <span className="font-mono text-emerald-400">
                      ${marketData?.high24h.toFixed(2) || '-'}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-400">أدنى 24h</span>
                    <span className="font-mono text-red-400">
                      ${marketData?.low24h.toFixed(2) || '-'}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-400">الحجم 24h</span>
                    <span className="font-mono">
                      {marketData?.volume24h
                        ? (marketData.volume24h / 1e9).toFixed(2) + 'B'
                        : '-'}
                    </span>
                  </div>
                </CardContent>
              </Card>

              {/* Backtesting */}
              <Card className="bg-slate-800/50 border-slate-700/50">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <History className="w-4 h-4 text-cyan-400" />
                    Backtesting
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <Button onClick={runBacktest} className="w-full" variant="outline">
                    تشغيل Backtesting
                  </Button>
                  <BacktestingResults />
                </CardContent>
              </Card>
            </div>
          )}
        </motion.aside>

        {/* Toggle Sidebar Button */}
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="absolute right-2 top-20 z-10"
        >
          {sidebarOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
        </Button>

        {/* Main Content */}
        <main className="flex-1 p-4 overflow-hidden">
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-4 p-4 bg-red-500/10 border border-red-500/30 rounded-xl flex items-center gap-3"
            >
              <AlertTriangle className="w-5 h-5 text-red-400" />
              <p className="text-red-400">{error}</p>
            </motion.div>
          )}

          {/* Stats Row */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
            <StatsCard
              title="RSI (14)"
              value={
                marketData?.indicators?.rsi
                  ? (marketData.indicators.rsi[marketData.indicators.rsi.length - 1] || 50).toFixed(1)
                  : '-'
              }
              icon={Activity}
              color="text-cyan-400"
            />
            <StatsCard
              title="MACD"
              value={
                marketData?.indicators?.macd
                  ? (marketData.indicators.macd.macd[marketData.indicators.macd.macd.length - 1] || 0).toFixed(4)
                  : '-'
              }
              icon={BarChart3}
              color="text-emerald-400"
            />
            <StatsCard
              title="EMA 20"
              value={
                marketData?.indicators?.ema20
                  ? (marketData.indicators.ema20[marketData.indicators.ema20.length - 1] || 0).toFixed(2)
                  : '-'
              }
              icon={LineChart}
              color="text-amber-400"
            />
            <StatsCard
              title="ATR (14)"
              value={
                marketData?.indicators?.atr
                  ? (marketData.indicators.atr[marketData.indicators.atr.length - 1] || 0).toFixed(2)
                  : '-'
              }
              icon={Target}
              color="text-purple-400"
            />
          </div>

          {/* Chart */}
          <div className="space-y-4">
            <TradingChart height={450} />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <RSIChart height={120} />
              <MACDChart height={120} />
            </div>
          </div>

          {/* Support & Resistance Levels */}
          {marketData?.indicators?.supportResistance && (
            <Card className="mt-4 bg-slate-800/50 border-slate-700/50">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">مستويات الدعم والمقاومة</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-emerald-400 mb-2">مستويات الدعم</p>
                    <div className="space-y-2">
                      {marketData.indicators.supportResistance.supports.map((level, i) => (
                        <div key={i} className="flex justify-between text-sm p-2 bg-emerald-500/10 rounded">
                          <span className="text-slate-400">S{i + 1}</span>
                          <span className="font-mono">${level.toFixed(2)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div>
                    <p className="text-xs text-red-400 mb-2">مستويات المقاومة</p>
                    <div className="space-y-2">
                      {marketData.indicators.supportResistance.resistances.map((level, i) => (
                        <div key={i} className="flex justify-between text-sm p-2 bg-red-500/10 rounded">
                          <span className="text-slate-400">R{i + 1}</span>
                          <span className="font-mono">${level.toFixed(2)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* BOS & Liquidity */}
          {marketData?.indicators && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
              <Card className="bg-slate-800/50 border-slate-700/50">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Zap className="w-4 h-4 text-yellow-400" />
                    Break of Structure
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-4">
                    <Badge
                      className={cn(
                        marketData.indicators.bos.bullish
                          ? 'bg-emerald-500'
                          : marketData.indicators.bos.bearish
                          ? 'bg-red-500'
                          : 'bg-slate-500'
                      )}
                    >
                      {marketData.indicators.bos.bullish
                        ? 'صعودي'
                        : marketData.indicators.bos.bearish
                        ? 'هبوطي'
                        : 'محايد'}
                    </Badge>
                    {marketData.indicators.bos.level && (
                      <span className="text-sm font-mono">
                        ${marketData.indicators.bos.level.toFixed(2)}
                      </span>
                    )}
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-slate-800/50 border-slate-700/50">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Target className="w-4 h-4 text-cyan-400" />
                    مناطق السيولة
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <p className="text-emerald-400 mb-1">Buy-side</p>
                      <div className="space-y-1">
                        {marketData.indicators.liquidityZones.buySide.slice(0, 2).map((l, i) => (
                          <div key={i} className="font-mono">${l.toFixed(2)}</div>
                        ))}
                      </div>
                    </div>
                    <div>
                      <p className="text-red-400 mb-1">Sell-side</p>
                      <div className="space-y-1">
                        {marketData.indicators.liquidityZones.sellSide.slice(0, 2).map((l, i) => (
                          <div key={i} className="font-mono">${l.toFixed(2)}</div>
                        ))}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </main>
      </div>

      {/* Footer */}
      <footer className="border-t border-slate-700/50 mt-8 py-4">
        <div className="px-4 flex items-center justify-between flex-wrap gap-4">
          <p className="text-xs text-slate-500">
            ⚠️ هذه المنصة للأغراض التعليمية فقط. استشر مستشاراً مالياً قبل التداول.
          </p>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-xs">
              <Crown className="w-3 h-3 mr-1 text-yellow-400" />
              Free Plan
            </Badge>
          </div>
        </div>
      </footer>
    </div>
  );
}
