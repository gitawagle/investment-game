import { useState, useEffect, useRef, useCallback } from 'react';
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from 'recharts';
import StockRow from './StockRow';
import TradeModal from './TradeModal';
import { generateHistory, generateTimeLabels } from '../data/stocks';

const TIME_VIEWS = ['day', 'week', 'month'];
const TICK_MS = 2500;

function fmtMoney(n) {
  return '$' + n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export default function Dashboard({ initialCapital, stockUniverse, onReset }) {
  const username = localStorage.getItem('tradesim_username') || 'Trader';
  const [stocks, setStocks] = useState(() =>
    stockUniverse.map(s => {
      const ptCount = { day: 29, week: 5, month: 31 };
      return {
        ...s,
        price: s.basePrice,
        openPrice: s.basePrice,
        history: {
          day: generateHistory(s.basePrice, s.volatility, ptCount.day),
          week: generateHistory(s.basePrice, s.volatility * 5, ptCount.week),
          month: generateHistory(s.basePrice, s.volatility * 15, ptCount.month),
        },
      };
    })
  );

  const [cash, setCash] = useState(initialCapital);
  const [holdings, setHoldings] = useState({});
  const [timeView, setTimeView] = useState('day');
  const [selectedStock, setSelectedStock] = useState(null);
  const [tab, setTab] = useState('market');
  const [portfolioHistory, setPortfolioHistory] = useState(() =>
    generateHistory(initialCapital, 0.005, { day: 29, week: 5, month: 31 }['day']).map((v, i) => ({
      i, v: initialCapital,
    }))
  );

  const holdingsRef = useRef(holdings);
  holdingsRef.current = holdings;
  const cashRef = useRef(cash);
  cashRef.current = cash;

  const tickPrices = useCallback(() => {
    setStocks(prev => prev.map(s => {
      const move = (Math.random() - 0.49) * s.volatility * s.price;
      const newPrice = parseFloat(Math.max(s.price + move, 1).toFixed(2));
      const newHistory = {
        ...s.history,
        [timeView]: [...s.history[timeView].slice(1), newPrice],
      };
      return { ...s, price: newPrice, history: newHistory };
    }));
  }, [timeView]);

  useEffect(() => {
    const id = setInterval(tickPrices, TICK_MS);
    return () => clearInterval(id);
  }, [tickPrices]);

  useEffect(() => {
    setStocks(prev => prev.map(s => {
      const ptCount = { day: 29, week: 5, month: 31 }[timeView];
      return {
        ...s,
        history: {
          ...s.history,
          [timeView]: s.history[timeView].length !== ptCount
            ? generateHistory(s.price, s.volatility * (timeView === 'week' ? 5 : timeView === 'month' ? 15 : 1), ptCount)
            : s.history[timeView],
        },
      };
    }));
  }, [timeView]);

  useEffect(() => {
    const totalHoldings = Object.entries(holdingsRef.current).reduce((sum, [sym, h]) => {
      const stock = stocks.find(s => s.symbol === sym);
      return sum + (stock ? stock.price * h.shares : 0);
    }, 0);
    const totalVal = cashRef.current + totalHoldings;
    setPortfolioHistory(prev => [...prev.slice(1), { i: prev.length, v: totalVal }]);
  }, [stocks]);

  function handleTrade(action, symbol, sharesNum, price) {
    const cost = sharesNum * price;
    if (action === 'buy') {
      setCash(c => c - cost);
      setHoldings(h => {
        const cur = h[symbol] || { shares: 0, avgCost: 0 };
        const newShares = cur.shares + sharesNum;
        const newAvg = (cur.shares * cur.avgCost + cost) / newShares;
        return { ...h, [symbol]: { shares: newShares, avgCost: newAvg } };
      });
    } else {
      setCash(c => c + cost);
      setHoldings(h => {
        const cur = h[symbol];
        const newShares = cur.shares - sharesNum;
        if (newShares <= 0) {
          const next = { ...h };
          delete next[symbol];
          return next;
        }
        return { ...h, [symbol]: { ...cur, shares: newShares } };
      });
    }
  }

  const labels = generateTimeLabels(timeView);
  const chartData = portfolioHistory.map((pt, i) => ({
    label: labels[Math.floor(i * (labels.length / portfolioHistory.length))] || '',
    value: pt.v,
  }));

  const totalHoldingsValue = Object.entries(holdings).reduce((sum, [sym, h]) => {
    const stock = stocks.find(s => s.symbol === sym);
    return sum + (stock ? stock.price * h.shares : 0);
  }, 0);
  const totalValue = cash + totalHoldingsValue;
  const gainLoss = totalValue - initialCapital;
  const gainLossPct = (gainLoss / initialCapital) * 100;
  const portfolioUp = gainLoss >= 0;

  const heldStocks = stocks.filter(s => holdings[s.symbol]);
  const allStocks = stocks;

  const CustomTooltip = ({ active, payload }) => {
    if (active && payload?.length) {
      return (
        <div style={{ background: '#fff', border: '1.5px solid #e9d5ff', borderRadius: 8, padding: '8px 12px', boxShadow: '0 4px 12px rgba(147,51,234,0.12)' }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: '#9333ea' }}>{fmtMoney(payload[0].value)}</div>
        </div>
      );
    }
    return null;
  };

  return (
    <div style={styles.page}>

      {/* Top navbar */}
      <div style={styles.navbar}>
        <div style={styles.navLogo}>📈 <span style={styles.navLogoText}>TradeSim</span></div>
        <div style={styles.navTabs}>
          {[['market', 'Market'], ['portfolio', 'Portfolio']].map(([id, label]) => (
            <button
              key={id}
              style={{ ...styles.navTab, ...(tab === id ? styles.navTabActive : {}) }}
              onClick={() => setTab(id)}
            >
              {label}
            </button>
          ))}
        </div>
        <div style={styles.navRight}>
          <div style={styles.cashPill}>
            <span style={styles.cashPillLabel}>Cash</span>
            <span style={styles.cashPillVal}>{fmtMoney(cash)}</span>
          </div>
          <button style={styles.resetBtn} onClick={onReset}>↩ Reset</button>
        </div>
      </div>

      {/* Page content */}
      <div style={styles.content}>

        {/* Username heading */}
        <h1 style={styles.pageTitle}>{username}'s Portfolio</h1>

        {/* Value + time view row */}
        <div style={styles.valueRow}>
          <div>
            <div style={styles.portfolioVal}>{fmtMoney(totalValue)}</div>
            <div style={{ ...styles.portfolioChange, color: portfolioUp ? '#059669' : '#dc2626' }}>
              {portfolioUp ? '+' : ''}{fmtMoney(gainLoss)} ({portfolioUp ? '+' : ''}{gainLossPct.toFixed(2)}%) all time
            </div>
          </div>
          <div style={styles.timeTabs}>
            {TIME_VIEWS.map(v => (
              <button
                key={v}
                style={{ ...styles.timeTab, ...(timeView === v ? styles.timeTabActive : {}) }}
                onClick={() => setTimeView(v)}
              >
                {v.charAt(0).toUpperCase() + v.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {/* Chart */}
        <div style={styles.chartCard}>
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={chartData} margin={{ top: 10, right: 10, bottom: 0, left: 10 }}>
              <defs>
                <linearGradient id="portGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={portfolioUp ? '#9333ea' : '#dc2626'} stopOpacity={0.15} />
                  <stop offset="100%" stopColor={portfolioUp ? '#9333ea' : '#dc2626'} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" vertical={false} />
              <XAxis dataKey="label" tick={{ fill: '#d1d5db', fontSize: 11 }} axisLine={false} tickLine={false} interval="preserveStartEnd" />
              <YAxis tick={{ fill: '#d1d5db', fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={v => '$' + (v >= 1000 ? (v / 1000).toFixed(0) + 'k' : v.toFixed(0))} width={55} />
              <Tooltip content={<CustomTooltip />} />
              <Area type="monotone" dataKey="value" stroke={portfolioUp ? '#9333ea' : '#dc2626'} strokeWidth={2} fill="url(#portGrad)" dot={false} isAnimationActive={false} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Stock list */}
        <div style={styles.listCard}>
          <div style={styles.listHeader}>
            <span style={styles.listTitle}>{tab === 'portfolio' ? 'Your Holdings' : 'Market'}</span>
            <span style={styles.listSub}>{tab === 'portfolio' ? `${heldStocks.length} positions` : `${allStocks.length} stocks`}</span>
          </div>
          {tab === 'portfolio' ? (
            heldStocks.length === 0 ? (
              <div style={styles.empty}>
                <div style={{ fontSize: 36, marginBottom: 12 }}>💼</div>
                <div style={{ color: '#9d8cb5', fontSize: 15 }}>No positions yet.</div>
                <button style={styles.goMarketBtn} onClick={() => setTab('market')}>Browse Market →</button>
              </div>
            ) : (
              heldStocks.map(s => (
                <StockRow key={s.symbol} stock={s} holding={holdings[s.symbol]} onSelect={setSelectedStock} />
              ))
            )
          ) : (
            allStocks.map(s => (
              <StockRow key={s.symbol} stock={s} holding={holdings[s.symbol]} onSelect={setSelectedStock} />
            ))
          )}
        </div>

      </div>

      {selectedStock && (
        <TradeModal
          stock={selectedStock}
          cash={cash}
          holdings={holdings[selectedStock.symbol]}
          onClose={() => setSelectedStock(null)}
          onTrade={handleTrade}
        />
      )}
    </div>
  );
}

const styles = {
  page: { minHeight: '100vh', background: '#ffffff', display: 'flex', flexDirection: 'column' },

  /* Navbar */
  navbar: {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    padding: '0 40px', height: 60,
    borderBottom: '1px solid #f3f4f6',
    background: '#ffffff',
    position: 'sticky', top: 0, zIndex: 10,
  },
  navLogo: { display: 'flex', alignItems: 'center', gap: 8, fontSize: 16, fontWeight: 800, color: '#9333ea' },
  navLogoText: { letterSpacing: '-0.3px' },
  navTabs: { display: 'flex', gap: 4 },
  navTab: {
    padding: '6px 16px', borderRadius: 8, border: 'none',
    background: 'transparent', color: '#9ca3af',
    fontSize: 14, fontWeight: 600, cursor: 'pointer',
  },
  navTabActive: {
    background: '#f3e8ff', color: '#9333ea',
  },
  navRight: { display: 'flex', alignItems: 'center', gap: 12 },
  cashPill: {
    display: 'flex', alignItems: 'center', gap: 8,
    background: '#faf5ff', border: '1px solid #e9d5ff',
    borderRadius: 20, padding: '6px 14px',
  },
  cashPillLabel: { fontSize: 12, color: '#a78bfa', fontWeight: 600 },
  cashPillVal: { fontSize: 14, fontWeight: 800, color: '#7c3aed' },
  resetBtn: {
    padding: '7px 14px', borderRadius: 8,
    border: '1px solid #e5e7eb', background: 'transparent',
    color: '#9ca3af', fontSize: 13, cursor: 'pointer',
  },

  /* Content */
  content: { maxWidth: 900, width: '100%', margin: '0 auto', padding: '40px 24px 60px' },

  pageTitle: {
    fontSize: 36, fontWeight: 800, color: '#9333ea',
    letterSpacing: '-0.8px', margin: '0 0 24px',
    textShadow: '0 0 24px rgba(147,51,234,0.25)',
  },

  valueRow: {
    display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between',
    flexWrap: 'wrap', gap: 16, marginBottom: 20,
  },
  portfolioVal: { fontSize: 42, fontWeight: 800, color: '#111827', letterSpacing: '-1.5px' },
  portfolioChange: { fontSize: 14, marginTop: 6, fontWeight: 600 },

  timeTabs: {
    display: 'flex', gap: 4, background: '#f9fafb',
    borderRadius: 10, padding: 4, border: '1px solid #f3f4f6',
  },
  timeTab: {
    padding: '6px 14px', borderRadius: 7, border: 'none',
    background: 'transparent', color: '#9ca3af',
    fontSize: 13, fontWeight: 600, cursor: 'pointer',
  },
  timeTabActive: { background: '#ffffff', color: '#9333ea', fontWeight: 700, boxShadow: '0 1px 4px rgba(0,0,0,0.08)' },

  chartCard: {
    background: '#ffffff', border: '1px solid #f3f4f6',
    borderRadius: 16, padding: '16px 8px 8px', marginBottom: 24,
    boxShadow: '0 1px 8px rgba(0,0,0,0.04)',
  },

  listCard: {
    background: '#ffffff', border: '1px solid #f3f4f6',
    borderRadius: 16, overflow: 'hidden',
    boxShadow: '0 1px 8px rgba(0,0,0,0.04)',
  },
  listHeader: {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    padding: '16px 20px', borderBottom: '1px solid #f9fafb',
  },
  listTitle: { fontSize: 15, fontWeight: 800, color: '#111827' },
  listSub: { fontSize: 13, color: '#9ca3af' },

  empty: {
    display: 'flex', flexDirection: 'column', alignItems: 'center',
    justifyContent: 'center', padding: '60px 20px',
  },
  goMarketBtn: {
    marginTop: 16, padding: '10px 20px', borderRadius: 10,
    border: '1px solid #e9d5ff', background: '#faf5ff',
    color: '#7c3aed', fontSize: 14, fontWeight: 700, cursor: 'pointer',
  },
};
