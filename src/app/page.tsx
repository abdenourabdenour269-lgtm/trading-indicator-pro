'use client'

import { useState, useMemo, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ComposedChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  Area,
  Bar,
  Legend
} from 'recharts'
import {
  TrendingUp,
  TrendingDown,
  Activity,
  Target,
  AlertTriangle,
  CheckCircle,
  Info,
  ChevronUp,
  ChevronDown,
  Minus,
  Zap,
  BarChart3,
  LineChart
} from 'lucide-react'
import {
  generateSampleData,
  calculateSMA,
  calculateEMA,
  calculatePivotPoints,
  calculateFibonacciPivotPoints,
  calculateCamarillaPivotPoints,
  findSupportResistance,
  generateSignals,
  calculateRSI,
  calculateMACD,
  type CandleData,
  type PivotPoints,
  type Signal
} from '@/lib/indicators'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'

// Candlestick component for custom rendering
const Candlestick = (props: any) => {
  const { x, y, width, height, low, high, open, close } = props
  const isPositive = close >= open
  const color = isPositive ? '#22c55e' : '#ef4444'
  const bodyTop = y(Math.max(open, close))
  const bodyBottom = y(Math.min(open, close))
  const bodyHeight = Math.max(bodyBottom - bodyTop, 1)
  const wickTop = y(high)
  const wickBottom = y(low)
  const centerX = x + width / 2

  return (
    <g>
      {/* Wick */}
      <line
        x1={centerX}
        y1={wickTop}
        x2={centerX}
        y2={wickBottom}
        stroke={color}
        strokeWidth={1}
      />
      {/* Body */}
      <rect
        x={x + width * 0.15}
        y={bodyTop}
        width={width * 0.7}
        height={bodyHeight}
        fill={isPositive ? color : color}
        stroke={color}
        strokeWidth={1}
        rx={1}
      />
    </g>
  )
}

interface ChartDataPoint extends CandleData {
  sma20: number | null
  sma50: number | null
  ema12: number | null
  ema26: number | null
  rsi: number | null
  macd: number | null
  macdSignal: number | null
  histogram: number | null
}

export default function TradingIndicator() {
  const [data, setData] = useState<CandleData[]>([])
  const [showSMA20, setShowSMA20] = useState(true)
  const [showSMA50, setShowSMA50] = useState(true)
  const [showEMA12, setShowEMA12] = useState(true)
  const [showEMA26, setShowEMA26] = useState(true)
  const [pivotMethod, setPivotMethod] = useState<'standard' | 'fibonacci' | 'camarilla'>('standard')
  const [showPivotLines, setShowPivotLines] = useState(true)
  const [activeTab, setActiveTab] = useState('chart')

  // Generate data on mount
  useEffect(() => {
    setData(generateSampleData(150))
  }, [])

  // Calculate all indicators
  const indicators = useMemo(() => {
    if (data.length === 0) return null

    const sma20 = calculateSMA(data, 20)
    const sma50 = calculateSMA(data, 50)
    const ema12 = calculateEMA(data, 12)
    const ema26 = calculateEMA(data, 26)
    const rsi = calculateRSI(data, 14)
    const { macd, signal, histogram } = calculateMACD(data, 12, 26, 9)

    const lastCandle = data[data.length - 1]
    const pivotData = data.slice(-20)
    const high = Math.max(...pivotData.map(d => d.high))
    const low = Math.min(...pivotData.map(d => d.low))

    let pivotPoints: PivotPoints
    switch (pivotMethod) {
      case 'fibonacci':
        pivotPoints = calculateFibonacciPivotPoints(high, low, lastCandle.close)
        break
      case 'camarilla':
        pivotPoints = calculateCamarillaPivotPoints(high, low, lastCandle.close)
        break
      default:
        pivotPoints = calculatePivotPoints(high, low, lastCandle.close)
    }

    const supportResistance = findSupportResistance(data, 50)
    const signals = generateSignals(data, sma20, sma50, ema12, ema26, pivotPoints, supportResistance)

    return {
      sma20,
      sma50,
      ema12,
      ema26,
      rsi,
      macd,
      signal,
      histogram,
      pivotPoints,
      supportResistance,
      signals
    }
  }, [data, pivotMethod])

  // Prepare chart data
  const chartData: ChartDataPoint[] = useMemo(() => {
    if (!data.length || !indicators) return []

    return data.map((candle, i) => ({
      ...candle,
      date: new Date(candle.time).toLocaleDateString('ar-EG', { month: 'short', day: 'numeric' }),
      sma20: indicators.sma20[i],
      sma50: indicators.sma50[i],
      ema12: indicators.ema12[i],
      ema26: indicators.ema26[i],
      rsi: indicators.rsi[i],
      macd: indicators.macd[i],
      macdSignal: indicators.signal[i],
      histogram: indicators.histogram[i]
    }))
  }, [data, indicators])

  // Current price info
  const currentPrice = data[data.length - 1]?.close || 0
  const prevPrice = data[data.length - 2]?.close || 0
  const priceChange = currentPrice - prevPrice
  const priceChangePercent = prevPrice ? ((priceChange / prevPrice) * 100) : 0
  const isPositive = priceChange >= 0

  // Latest signals
  const latestSignals = indicators?.signals.slice(-5).reverse() || []

  // Refresh data
  const refreshData = () => {
    setData(generateSampleData(150))
  }

  if (!indicators) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
          className="w-16 h-16 border-4 border-emerald-500 border-t-transparent rounded-full"
        />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white">
      {/* Header */}
      <motion.header 
        initial={{ y: -50, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="border-b border-slate-700/50 backdrop-blur-sm bg-slate-900/50 sticky top-0 z-50"
      >
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-3">
              <motion.div 
                whileHover={{ rotate: 180 }}
                transition={{ duration: 0.5 }}
                className="p-2 bg-gradient-to-br from-emerald-500 to-cyan-500 rounded-xl"
              >
                <BarChart3 className="w-6 h-6" />
              </motion.div>
              <div>
                <h1 className="text-xl md:text-2xl font-bold bg-gradient-to-r from-emerald-400 to-cyan-400 bg-clip-text text-transparent">
                  المؤشر الفني الاحترافي
                </h1>
                <p className="text-xs text-slate-400">Professional Trading Indicator</p>
              </div>
            </div>

            <div className="flex items-center gap-4 flex-wrap">
              {/* Current Price Card */}
              <motion.div 
                whileHover={{ scale: 1.02 }}
                className="flex items-center gap-3 px-4 py-2 bg-slate-800/50 rounded-xl border border-slate-700/50"
              >
                <div className="text-right">
                  <p className="text-xs text-slate-400">السعر الحالي</p>
                  <p className="text-lg font-bold font-mono">${currentPrice.toFixed(2)}</p>
                </div>
                <motion.div 
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className={cn(
                    "p-2 rounded-lg",
                    isPositive ? "bg-emerald-500/20 text-emerald-400" : "bg-red-500/20 text-red-400"
                  )}
                >
                  {isPositive ? <TrendingUp className="w-5 h-5" /> : <TrendingDown className="w-5 h-5" />}
                </motion.div>
                <div className="text-right">
                  <p className="text-xs text-slate-400">التغير</p>
                  <p className={cn(
                    "font-mono font-semibold",
                    isPositive ? "text-emerald-400" : "text-red-400"
                  )}>
                    {isPositive ? '+' : ''}{priceChange.toFixed(2)} ({priceChangePercent.toFixed(2)}%)
                  </p>
                </div>
              </motion.div>

              <Button 
                onClick={refreshData}
                className="bg-gradient-to-r from-emerald-500 to-cyan-500 hover:from-emerald-600 hover:to-cyan-600"
              >
                <Activity className="w-4 h-4 mr-2" />
                تحديث البيانات
              </Button>
            </div>
          </div>
        </div>
      </motion.header>

      <main className="max-w-7xl mx-auto px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Main Chart */}
          <div className="lg:col-span-3">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
            >
              <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                <TabsList className="grid w-full grid-cols-3 bg-slate-800/50 border border-slate-700/50">
                  <TabsTrigger value="chart" className="flex items-center gap-2">
                    <LineChart className="w-4 h-4" />
                    الرسم البياني
                  </TabsTrigger>
                  <TabsTrigger value="indicators" className="flex items-center gap-2">
                    <Activity className="w-4 h-4" />
                    المؤشرات
                  </TabsTrigger>
                  <TabsTrigger value="signals" className="flex items-center gap-2">
                    <Zap className="w-4 h-4" />
                    الإشارات
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="chart" className="mt-4">
                  <Card className="bg-slate-800/50 border-slate-700/50 backdrop-blur-sm">
                    <CardHeader className="pb-2">
                      <div className="flex flex-wrap items-center justify-between gap-4">
                        <CardTitle className="text-lg">الشموع اليابانية مع المتوسطات المتحركة</CardTitle>
                        <div className="flex flex-wrap gap-4 text-sm">
                          <label className="flex items-center gap-2 cursor-pointer">
                            <Switch checked={showSMA20} onCheckedChange={setShowSMA20} />
                            <span className="text-amber-400">SMA 20</span>
                          </label>
                          <label className="flex items-center gap-2 cursor-pointer">
                            <Switch checked={showSMA50} onCheckedChange={setShowSMA50} />
                            <span className="text-purple-400">SMA 50</span>
                          </label>
                          <label className="flex items-center gap-2 cursor-pointer">
                            <Switch checked={showEMA12} onCheckedChange={setShowEMA12} />
                            <span className="text-cyan-400">EMA 12</span>
                          </label>
                          <label className="flex items-center gap-2 cursor-pointer">
                            <Switch checked={showEMA26} onCheckedChange={setShowEMA26} />
                            <span className="text-pink-400">EMA 26</span>
                          </label>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="h-[400px] md:h-[500px]">
                        <ResponsiveContainer width="100%" height="100%">
                          <ComposedChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                            <defs>
                              <linearGradient id="colorClose" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#22c55e" stopOpacity={0.3}/>
                                <stop offset="95%" stopColor="#22c55e" stopOpacity={0}/>
                              </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.3} />
                            <XAxis 
                              dataKey="date" 
                              stroke="#64748b"
                              tick={{ fontSize: 10 }}
                              interval="preserveStartEnd"
                            />
                            <YAxis 
                              stroke="#64748b"
                              tick={{ fontSize: 10 }}
                              domain={['auto', 'auto']}
                            />
                            <Tooltip
                              contentStyle={{
                                backgroundColor: '#1e293b',
                                border: '1px solid #334155',
                                borderRadius: '8px',
                                color: '#fff'
                              }}
                              formatter={(value: any, name: string) => [
                                value?.toFixed(2) || '-',
                                name.toUpperCase()
                              ]}
                            />
                            <Legend />
                            
                            {/* Candlestick - using Area as background then lines for OHLC */}
                            <Area
                              type="monotone"
                              dataKey="close"
                              stroke="transparent"
                              fill="url(#colorClose)"
                              fillOpacity={0.3}
                            />
                            
                            {/* Price Line */}
                            <Line
                              type="monotone"
                              dataKey="close"
                              stroke="#22c55e"
                              strokeWidth={1}
                              dot={false}
                              name="السعر"
                            />

                            {/* Moving Averages */}
                            {showSMA20 && (
                              <Line
                                type="monotone"
                                dataKey="sma20"
                                stroke="#f59e0b"
                                strokeWidth={2}
                                dot={false}
                                name="SMA 20"
                              />
                            )}
                            {showSMA50 && (
                              <Line
                                type="monotone"
                                dataKey="sma50"
                                stroke="#a855f7"
                                strokeWidth={2}
                                dot={false}
                                name="SMA 50"
                              />
                            )}
                            {showEMA12 && (
                              <Line
                                type="monotone"
                                dataKey="ema12"
                                stroke="#22d3ee"
                                strokeWidth={2}
                                dot={false}
                                name="EMA 12"
                              />
                            )}
                            {showEMA26 && (
                              <Line
                                type="monotone"
                                dataKey="ema26"
                                stroke="#ec4899"
                                strokeWidth={2}
                                dot={false}
                                name="EMA 26"
                              />
                            )}

                            {/* Pivot Lines */}
                            {showPivotLines && (
                              <>
                                <ReferenceLine y={indicators.pivotPoints.pivot} stroke="#fbbf24" strokeDasharray="5 5" label={{ value: 'Pivot', fill: '#fbbf24', fontSize: 10 }} />
                                <ReferenceLine y={indicators.pivotPoints.r1} stroke="#ef4444" strokeDasharray="3 3" label={{ value: 'R1', fill: '#ef4444', fontSize: 10 }} />
                                <ReferenceLine y={indicators.pivotPoints.r2} stroke="#ef4444" strokeDasharray="3 3" strokeOpacity={0.5} />
                                <ReferenceLine y={indicators.pivotPoints.s1} stroke="#22c55e" strokeDasharray="3 3" label={{ value: 'S1', fill: '#22c55e', fontSize: 10 }} />
                                <ReferenceLine y={indicators.pivotPoints.s2} stroke="#22c55e" strokeDasharray="3 3" strokeOpacity={0.5} />
                              </>
                            )}
                          </ComposedChart>
                        </ResponsiveContainer>
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="indicators" className="mt-4 space-y-4">
                  {/* RSI Chart */}
                  <Card className="bg-slate-800/50 border-slate-700/50 backdrop-blur-sm">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-lg flex items-center gap-2">
                        <Activity className="w-5 h-5 text-cyan-400" />
                        RSI - مؤشر القوة النسبية
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="h-[200px]">
                        <ResponsiveContainer width="100%" height="100%">
                          <ComposedChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.3} />
                            <XAxis dataKey="date" stroke="#64748b" tick={{ fontSize: 10 }} />
                            <YAxis stroke="#64748b" tick={{ fontSize: 10 }} domain={[0, 100]} />
                            <Tooltip
                              contentStyle={{
                                backgroundColor: '#1e293b',
                                border: '1px solid #334155',
                                borderRadius: '8px',
                                color: '#fff'
                              }}
                            />
                            <ReferenceLine y={70} stroke="#ef4444" strokeDasharray="3 3" />
                            <ReferenceLine y={30} stroke="#22c55e" strokeDasharray="3 3" />
                            <ReferenceLine y={50} stroke="#64748b" strokeDasharray="3 3" />
                            <Line type="monotone" dataKey="rsi" stroke="#22d3ee" strokeWidth={2} dot={false} name="RSI" />
                          </ComposedChart>
                        </ResponsiveContainer>
                      </div>
                    </CardContent>
                  </Card>

                  {/* MACD Chart */}
                  <Card className="bg-slate-800/50 border-slate-700/50 backdrop-blur-sm">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-lg flex items-center gap-2">
                        <BarChart3 className="w-5 h-5 text-purple-400" />
                        MACD - تقارب وتباعد المتوسطات
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="h-[200px]">
                        <ResponsiveContainer width="100%" height="100%">
                          <ComposedChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.3} />
                            <XAxis dataKey="date" stroke="#64748b" tick={{ fontSize: 10 }} />
                            <YAxis stroke="#64748b" tick={{ fontSize: 10 }} />
                            <Tooltip
                              contentStyle={{
                                backgroundColor: '#1e293b',
                                border: '1px solid #334155',
                                borderRadius: '8px',
                                color: '#fff'
                              }}
                            />
                            <ReferenceLine y={0} stroke="#64748b" />
                            <Bar dataKey="histogram" fill="#6366f1" name="Histogram" />
                            <Line type="monotone" dataKey="macd" stroke="#22c55e" strokeWidth={2} dot={false} name="MACD" />
                            <Line type="monotone" dataKey="macdSignal" stroke="#ef4444" strokeWidth={2} dot={false} name="Signal" />
                          </ComposedChart>
                        </ResponsiveContainer>
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="signals" className="mt-4">
                  <Card className="bg-slate-800/50 border-slate-700/50 backdrop-blur-sm">
                    <CardHeader>
                      <CardTitle className="text-lg flex items-center gap-2">
                        <Zap className="w-5 h-5 text-yellow-400" />
                        أحدث إشارات التداول
                      </CardTitle>
                      <CardDescription>إشارات بيع وشراء مبنية على تحليل المؤشرات الفنية</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        <AnimatePresence mode="popLayout">
                          {latestSignals.map((signal, index) => (
                            <motion.div
                              key={index}
                              initial={{ opacity: 0, x: -20 }}
                              animate={{ opacity: 1, x: 0 }}
                              exit={{ opacity: 0, x: 20 }}
                              transition={{ delay: index * 0.1 }}
                              className={cn(
                                "p-4 rounded-xl border flex items-center justify-between",
                                signal.type === 'buy' 
                                  ? "bg-emerald-500/10 border-emerald-500/30" 
                                  : "bg-red-500/10 border-red-500/30"
                              )}
                            >
                              <div className="flex items-center gap-3">
                                <motion.div
                                  whileHover={{ scale: 1.1 }}
                                  whileTap={{ scale: 0.9 }}
                                  className={cn(
                                    "p-3 rounded-xl",
                                    signal.type === 'buy' ? "bg-emerald-500/20" : "bg-red-500/20"
                                  )}
                                >
                                  {signal.type === 'buy' 
                                    ? <TrendingUp className="w-6 h-6 text-emerald-400" />
                                    : <TrendingDown className="w-6 h-6 text-red-400" />
                                  }
                                </motion.div>
                                <div>
                                  <div className="flex items-center gap-2">
                                    <Badge variant={signal.type === 'buy' ? 'default' : 'destructive'}
                                      className={signal.type === 'buy' ? 'bg-emerald-500' : 'bg-red-500'}
                                    >
                                      {signal.type === 'buy' ? 'شراء' : 'بيع'}
                                    </Badge>
                                    <Badge variant="outline" className="text-xs">
                                      {signal.strength === 'strong' ? 'قوية' : signal.strength === 'moderate' ? 'متوسطة' : 'ضعيفة'}
                                    </Badge>
                                  </div>
                                  <p className="text-sm text-slate-400 mt-1">${signal.price.toFixed(2)}</p>
                                  <p className="text-xs text-slate-500 mt-1 max-w-md">{signal.reason}</p>
                                </div>
                              </div>
                              <div className="text-left">
                                <p className={cn(
                                  "text-lg font-bold font-mono",
                                  signal.type === 'buy' ? "text-emerald-400" : "text-red-400"
                                )}>
                                  {signal.type === 'buy' ? '↑' : '↓'}
                                </p>
                              </div>
                            </motion.div>
                          ))}
                        </AnimatePresence>
                        
                        {latestSignals.length === 0 && (
                          <div className="text-center py-8 text-slate-400">
                            <Info className="w-12 h-12 mx-auto mb-2 opacity-50" />
                            <p>لا توجد إشارات تداول حالياً</p>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>
              </Tabs>
            </motion.div>
          </div>

          {/* Sidebar - Pivot Points & Levels */}
          <div className="space-y-4">
            {/* Pivot Points */}
            <motion.div
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 }}
            >
              <Card className="bg-slate-800/50 border-slate-700/50 backdrop-blur-sm">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Target className="w-5 h-5 text-amber-400" />
                      نقاط المحور
                    </CardTitle>
                    <Select value={pivotMethod} onValueChange={(v: any) => setPivotMethod(v)}>
                      <SelectTrigger className="w-[120px] h-8 bg-slate-700 border-slate-600">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-slate-700 border-slate-600">
                        <SelectItem value="standard">قياسي</SelectItem>
                        <SelectItem value="fibonacci">فيبوناتشي</SelectItem>
                        <SelectItem value="camarilla">كاماريلا</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div className="flex items-center justify-between p-2 bg-red-500/10 rounded-lg border border-red-500/20">
                      <span className="text-slate-400">R3</span>
                      <span className="font-mono text-red-400">{indicators.pivotPoints.r3.toFixed(2)}</span>
                    </div>
                    <div className="flex items-center justify-between p-2 bg-red-500/10 rounded-lg border border-red-500/20">
                      <span className="text-slate-400">R2</span>
                      <span className="font-mono text-red-400">{indicators.pivotPoints.r2.toFixed(2)}</span>
                    </div>
                    <div className="flex items-center justify-between p-2 bg-red-500/10 rounded-lg border border-red-500/20">
                      <span className="text-slate-400">R1</span>
                      <span className="font-mono text-red-400">{indicators.pivotPoints.r1.toFixed(2)}</span>
                    </div>
                    <div className="flex items-center justify-between p-2 bg-amber-500/10 rounded-lg border border-amber-500/20">
                      <span className="text-slate-400">Pivot</span>
                      <span className="font-mono text-amber-400 font-bold">{indicators.pivotPoints.pivot.toFixed(2)}</span>
                    </div>
                    <div className="flex items-center justify-between p-2 bg-emerald-500/10 rounded-lg border border-emerald-500/20">
                      <span className="text-slate-400">S1</span>
                      <span className="font-mono text-emerald-400">{indicators.pivotPoints.s1.toFixed(2)}</span>
                    </div>
                    <div className="flex items-center justify-between p-2 bg-emerald-500/10 rounded-lg border border-emerald-500/20">
                      <span className="text-slate-400">S2</span>
                      <span className="font-mono text-emerald-400">{indicators.pivotPoints.s2.toFixed(2)}</span>
                    </div>
                    <div className="col-span-2 flex items-center justify-between p-2 bg-emerald-500/10 rounded-lg border border-emerald-500/20">
                      <span className="text-slate-400">S3</span>
                      <span className="font-mono text-emerald-400">{indicators.pivotPoints.s3.toFixed(2)}</span>
                    </div>
                  </div>
                  
                  <label className="flex items-center gap-2 mt-3 cursor-pointer">
                    <Switch checked={showPivotLines} onCheckedChange={setShowPivotLines} />
                    <span className="text-sm text-slate-400">إظهار خطوط المحور</span>
                  </label>
                </CardContent>
              </Card>
            </motion.div>

            {/* Support & Resistance */}
            <motion.div
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3 }}
            >
              <Card className="bg-slate-800/50 border-slate-700/50 backdrop-blur-sm">
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Activity className="w-5 h-5 text-cyan-400" />
                    الدعم والمقاومة
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 max-h-[200px] overflow-y-auto custom-scrollbar">
                    {indicators.supportResistance.levels.slice(0, 6).map((level, i) => (
                      <motion.div
                        key={i}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.05 }}
                        className={cn(
                          "flex items-center justify-between p-2 rounded-lg",
                          level.type === 'resistance' 
                            ? "bg-red-500/10 border border-red-500/20" 
                            : "bg-emerald-500/10 border border-emerald-500/20"
                        )}
                      >
                        <div className="flex items-center gap-2">
                          {level.type === 'resistance' 
                            ? <ChevronUp className="w-4 h-4 text-red-400" />
                            : <ChevronDown className="w-4 h-4 text-emerald-400" />
                          }
                          <span className="text-xs text-slate-400">
                            {level.type === 'resistance' ? 'مقاومة' : 'دعم'}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-sm">${level.price.toFixed(2)}</span>
                          <Badge variant="outline" className="text-xs">
                            x{level.strength}
                          </Badge>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            {/* Quick Stats */}
            <motion.div
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.4 }}
            >
              <Card className="bg-slate-800/50 border-slate-700/50 backdrop-blur-sm">
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg">إحصائيات سريعة</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="p-3 bg-slate-700/30 rounded-xl text-center">
                      <p className="text-xs text-slate-400 mb-1">السعر المرتفع</p>
                      <p className="font-mono font-bold text-emerald-400">
                        ${Math.max(...data.slice(-20).map(d => d.high)).toFixed(2)}
                      </p>
                    </div>
                    <div className="p-3 bg-slate-700/30 rounded-xl text-center">
                      <p className="text-xs text-slate-400 mb-1">السعر المنخفض</p>
                      <p className="font-mono font-bold text-red-400">
                        ${Math.min(...data.slice(-20).map(d => d.low)).toFixed(2)}
                      </p>
                    </div>
                    <div className="p-3 bg-slate-700/30 rounded-xl text-center">
                      <p className="text-xs text-slate-400 mb-1">SMA 20</p>
                      <p className="font-mono font-bold text-amber-400">
                        ${(indicators.sma20[indicators.sma20.length - 1] || 0).toFixed(2)}
                      </p>
                    </div>
                    <div className="p-3 bg-slate-700/30 rounded-xl text-center">
                      <p className="text-xs text-slate-400 mb-1">SMA 50</p>
                      <p className="font-mono font-bold text-purple-400">
                        ${(indicators.sma50[indicators.sma50.length - 1] || 0).toFixed(2)}
                      </p>
                    </div>
                    <div className="p-3 bg-slate-700/30 rounded-xl text-center">
                      <p className="text-xs text-slate-400 mb-1">RSI</p>
                      <p className={cn(
                        "font-mono font-bold",
                        (indicators.rsi[indicators.rsi.length - 1] || 50) > 70 ? "text-red-400" :
                        (indicators.rsi[indicators.rsi.length - 1] || 50) < 30 ? "text-emerald-400" : "text-cyan-400"
                      )}>
                        {(indicators.rsi[indicators.rsi.length - 1] || 50).toFixed(1)}
                      </p>
                    </div>
                    <div className="p-3 bg-slate-700/30 rounded-xl text-center">
                      <p className="text-xs text-slate-400 mb-1">إشارات</p>
                      <p className="font-mono font-bold text-yellow-400">
                        {indicators.signals.length}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-700/50 mt-8">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <p className="text-center text-sm text-slate-500">
            ⚠️ هذا المؤشر للأغراض التعليمية فقط. استشر مستشاراً مالياً قبل اتخاذ قرارات التداول.
          </p>
        </div>
      </footer>
    </div>
  )
}
