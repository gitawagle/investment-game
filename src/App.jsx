import { useState, useEffect, useCallback } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import TICKERS from './data/tickers';
import './App.css';

const CAPITAL_OPTIONS = [1000, 5000, 10000, 100000];
const FINNHUB_KEY = import.meta.env.VITE_API_KEY;
const STORAGE_KEY = 'trading-sim';
const PIE_COLORS = ['#9333ea', '#7c3aed', '#6d28d9', '#5b21b6', '#4c1d95', '#2563eb', '#1d4ed8', '#1e40af'];

function loadSaved() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

async function fetchQuote(symbol) {
  if (!FINNHUB_KEY || FINNHUB_KEY === 'your_api_key_here') {
    throw new Error('API key not set — add your Finnhub key to .env as VITE_API_KEY and restart the dev server');
  }
  const res = await fetch(`https://finnhub.io/api/v1/quote?symbol=${symbol}&token=${FINNHUB_KEY}`);
  const json = await res.json();
  if (json.error) throw new Error(`Finnhub: ${json.error}`);
  if (!json.c || json.c === 0) throw new Error(`No price data for ${symbol} — it may not be listed on Finnhub`);
  return json;
}

async function fetchNews(symbol) {
  const to = new Date().toISOString().split('T')[0];
  const from = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
  const res = await fetch(`https://finnhub.io/api/v1/company-news?symbol=${symbol}&from=${from}&to=${to}&token=${FINNHUB_KEY}`);
  return res.json();
}

async function fetchProfile(symbol) {
  const res = await fetch(`https://finnhub.io/api/v1/stock/profile2?symbol=${symbol}&token=${FINNHUB_KEY}`);
  return res.json();
}

function generateData(start) {
  if (!start) return Array.from({ length: 30 }, (_, i) => ({ day: `Day ${i + 1}`, value: 0 }));
  const points = [];
  let val = start;
  for (let i = 0; i < 30; i++) {
    val = Math.max(0, val + (Math.random() - 0.48) * val * 0.03);
    points.push({ day: `Day ${i + 1}`, value: Math.round(val) });
  }
  return points;
}

export default function App() {
  const [capital, setCapital] = useState(() => loadSaved().capital ?? 0);
  const [cash, setCash] = useState(() => loadSaved().cash ?? 0);
  const [holdings, setHoldings] = useState(() => loadSaved().holdings ?? []);
  const [trades, setTrades] = useState(() => loadSaved().trades ?? []);
  const [data, setData] = useState(() => generateData(0));
  const [scaleOffset, setScaleOffset] = useState(0);
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState(null);
  const [quote, setQuote] = useState(null);
  const [news, setNews] = useState([]);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [fetchError, setFetchError] = useState(null);
  const [investAmount, setInvestAmount] = useState('');
  const [investError, setInvestError] = useState('');
  const [sellAmount, setSellAmount] = useState('');
  const [sellError, setSellError] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [showHistory, setShowHistory] = useState(false);

  const results = query.trim().length > 0
    ? TICKERS.filter(t =>
        t.symbol.startsWith(query.toUpperCase()) ||
        t.name.toLowerCase().includes(query.toLowerCase())
      ).slice(0, 8)
    : [];

  function handleCapital(amount) {
    setCapital(amount);
    setCash(amount);
    setHoldings([]);
    setTrades([]);
    setSelected(null);
    setQuote(null);
    setNews([]);
    setProfile(null);
    setInvestAmount('');
    setSellAmount('');
  }

  useEffect(() => {
    setData(generateData(capital));
    setScaleOffset(0);
  }, [capital]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ capital, cash, holdings, trades }));
  }, [capital, cash, holdings, trades]);

  async function handleSelect(ticker) {
    setSelected(ticker);
    setQuote(null);
    setNews([]);
    setProfile(null);
    setFetchError(null);
    setInvestAmount('');
    setInvestError('');
    setSellAmount('');
    setSellError('');
    setLoading(true);
    try {
      const [q, n, p] = await Promise.all([
        fetchQuote(ticker.symbol),
        fetchNews(ticker.symbol),
        fetchProfile(ticker.symbol),
      ]);
      setQuote(q);
      setNews(Array.isArray(n) ? n.slice(0, 4) : []);
      setProfile(p?.finnhubIndustry ? p : null);
    } catch (err) {
      setFetchError(err.message || 'Could not load price');
    } finally {
      setLoading(false);
    }
  }

  function handleInvest() {
    const amount = parseFloat(investAmount);
    if (!amount || amount <= 0) return setInvestError('Enter a valid amount');
    if (!quote) return setInvestError('Price not loaded yet');
    if (amount > cash) return setInvestError('Not enough cash');

    const shares = amount / quote.c;
    const trade = {
      id: Date.now(),
      type: 'buy',
      symbol: selected.symbol,
      name: selected.name,
      shares,
      price: quote.c,
      total: amount,
      date: new Date().toLocaleDateString(),
    };

    setCash(c => c - amount);
    setHoldings(prev => {
      const existing = prev.find(h => h.symbol === selected.symbol);
      if (existing) {
        const totalShares = existing.shares + shares;
        const avgPrice = ((existing.shares * existing.priceAtBuy) + (shares * quote.c)) / totalShares;
        return prev.map(h =>
          h.symbol === selected.symbol
            ? { ...h, shares: totalShares, priceAtBuy: avgPrice, currentPrice: quote.c }
            : h
        );
      }
      return [...prev, { symbol: selected.symbol, name: selected.name, shares, priceAtBuy: quote.c, currentPrice: quote.c }];
    });
    setTrades(prev => [trade, ...prev]);
    setInvestAmount('');
    setInvestError('');
  }

  function handleSell() {
    const amount = parseFloat(sellAmount);
    if (!amount || amount <= 0) return setSellError('Enter a valid amount');
    if (!quote) return setSellError('Price not loaded yet');
    const holding = holdings.find(h => h.symbol === selected.symbol);
    if (!holding) return setSellError("You don't own this stock");
    const sharesToSell = amount / quote.c;
    if (sharesToSell > holding.shares) return setSellError('Not enough shares');

    const trade = {
      id: Date.now(),
      type: 'sell',
      symbol: selected.symbol,
      name: selected.name,
      shares: sharesToSell,
      price: quote.c,
      total: amount,
      date: new Date().toLocaleDateString(),
    };

    setCash(c => c + amount);
    setHoldings(prev => {
      const remaining = holding.shares - sharesToSell;
      if (remaining < 0.0001) return prev.filter(h => h.symbol !== selected.symbol);
      return prev.map(h =>
        h.symbol === selected.symbol ? { ...h, shares: remaining, currentPrice: quote.c } : h
      );
    });
    setTrades(prev => [trade, ...prev]);
    setSellAmount('');
    setSellError('');
  }

  const refreshHoldings = useCallback(async () => {
    if (holdings.length === 0) return;
    setRefreshing(true);
    const updated = await Promise.all(
      holdings.map(async h => {
        try {
          const json = await fetchQuote(h.symbol);
          return { ...h, currentPrice: json.c };
        } catch {
          return h;
        }
      })
    );
    setHoldings(updated);
    setRefreshing(false);
  }, [holdings]);

  const totalCurrentValue = holdings.reduce((s, h) => s + h.shares * h.currentPrice, 0);
  const portfolioValue = cash + totalCurrentValue;
  const yMax = capital > 0 ? Math.round(capital * 2 * Math.pow(2, scaleOffset)) : 10000;
  const currentHolding = selected ? holdings.find(h => h.symbol === selected.symbol) : null;

  const pieData = [
    ...holdings.map(h => ({ name: h.symbol, value: parseFloat((h.shares * h.currentPrice).toFixed(2)) })),
    { name: 'Cash', value: parseFloat(cash.toFixed(2)) },
  ];

  return (
    <div style={styles.page}>

      {/* Left column */}
      <div style={styles.left}>
        <h1 style={styles.heading}>Your Portfolio</h1>

        <div style={styles.box}>
          <p style={styles.boxLabel}>Choose your capital</p>
          <div style={styles.options}>
            {CAPITAL_OPTIONS.map(amount => (
              <button
                key={amount}
                style={{ ...styles.option, ...(capital === amount ? styles.optionActive : {}) }}
                onClick={() => handleCapital(amount)}
              >
                ${amount.toLocaleString()}
              </button>
            ))}
          </div>
        </div>

        <div style={styles.box}>
          <p style={styles.boxLabel}>Portfolio value</p>
          <p style={styles.value}>${portfolioValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
        </div>

        <div style={styles.box}>
          <p style={styles.boxLabel}>Cash remaining</p>
          <p style={{ ...styles.value, fontSize: 18 }}>${cash.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
        </div>

        {holdings.length > 0 && (
          <div style={styles.box}>
            <p style={styles.boxLabel}>Profit / Loss</p>
            {holdings.map(h => {
              const gl = (h.currentPrice - h.priceAtBuy) * h.shares;
              const up = gl >= 0;
              return (
                <div key={h.symbol} style={styles.plRow}>
                  <span style={styles.plSymbol}>{h.symbol}</span>
                  <span style={{ ...styles.plAmount, color: up ? '#059669' : '#dc2626' }}>
                    {up ? '+' : ''}${gl.toFixed(2)}
                  </span>
                </div>
              );
            })}
            <div style={styles.plDivider} />
            <div style={styles.plRow}>
              <span style={{ fontSize: 10, fontWeight: 700, color: '#374151' }}>Total</span>
              {(() => {
                const total = holdings.reduce((s, h) => s + (h.currentPrice - h.priceAtBuy) * h.shares, 0);
                return (
                  <span style={{ fontSize: 12, fontWeight: 800, color: total >= 0 ? '#059669' : '#dc2626' }}>
                    {total >= 0 ? '+' : ''}${total.toFixed(2)}
                  </span>
                );
              })()}
            </div>
          </div>
        )}
      </div>

      {/* Center */}
      <div style={styles.center}>
        <div style={styles.chartBox}>
          <div style={styles.chartHeader}>
            <p style={styles.chartTitle}>Portfolio Performance</p>
            <div style={styles.scaleControls}>
              <span style={styles.scaleLabel}>Scale: ${yMax.toLocaleString()}</span>
              <button style={styles.scaleBtn} onClick={() => setScaleOffset(o => o - 1)}>−</button>
              <button style={styles.scaleBtn} onClick={() => setScaleOffset(o => o + 1)}>+</button>
            </div>
          </div>
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ top: 16, right: 24, bottom: 8, left: 8 }}>
              <defs>
                <linearGradient id="grad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#9333ea" stopOpacity={0.15} />
                  <stop offset="100%" stopColor="#9333ea" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" vertical={false} />
              <XAxis dataKey="day" tick={{ fill: '#d1d5db', fontSize: 11 }} axisLine={false} tickLine={false} interval={4} />
              <YAxis domain={[0, yMax]} tick={{ fill: '#d1d5db', fontSize: 11 }} axisLine={false} tickLine={false}
                tickFormatter={v => '$' + (v >= 1000 ? (v / 1000).toFixed(0) + 'k' : v)} width={52} />
              <Tooltip formatter={v => ['$' + v.toLocaleString(), 'Value']}
                contentStyle={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 8, fontSize: 13 }} />
              <Area type="monotone" dataKey="value" stroke="#9333ea" strokeWidth={2} fill="url(#grad)" dot={false} isAnimationActive={false} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Portfolio allocation pie */}
        {holdings.length > 0 && (
          <div style={styles.box}>
            <p style={styles.boxLabel}>Portfolio Allocation</p>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
              <PieChart width={120} height={120}>
                <Pie data={pieData} cx={55} cy={55} innerRadius={30} outerRadius={55} dataKey="value" strokeWidth={0}>
                  {pieData.map((_, i) => (
                    <Cell key={i} fill={i === pieData.length - 1 ? '#e5e7eb' : PIE_COLORS[i % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={v => `$${Number(v).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`} />
              </PieChart>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                {pieData.map((d, i) => (
                  <div key={d.name} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <div style={{ width: 8, height: 8, borderRadius: '50%', flexShrink: 0, background: i === pieData.length - 1 ? '#e5e7eb' : PIE_COLORS[i % PIE_COLORS.length] }} />
                    <span style={{ fontSize: 11, color: '#374151', fontWeight: 600 }}>{d.name}</span>
                    <span style={{ fontSize: 11, color: '#9ca3af', marginLeft: 'auto', paddingLeft: 8 }}>
                      {portfolioValue > 0 ? ((d.value / portfolioValue) * 100).toFixed(1) : '0.0'}%
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Holdings table */}
        <div style={styles.box}>
          <div style={styles.holdingsHeader}>
            <p style={{ ...styles.boxLabel, marginBottom: 0 }}>Your investments</p>
            {holdings.length > 0 && (
              <button style={styles.refreshBtn} onClick={refreshHoldings} disabled={refreshing}>
                {refreshing ? 'Refreshing...' : '↻ Refresh prices'}
              </button>
            )}
          </div>

          {holdings.length === 0 ? (
            <p style={styles.empty}>No investments yet. Look up a stock and invest.</p>
          ) : (
            <div style={styles.holdingsList}>
              <div style={styles.holdingHeaderRow}>
                <span>Stock</span>
                <span>Shares</span>
                <span>Price</span>
                <span>Current value</span>
                <span>Gain / Loss</span>
              </div>
              {holdings.map(h => {
                const currentVal = h.shares * h.currentPrice;
                const costBasis = h.shares * h.priceAtBuy;
                const gainLoss = currentVal - costBasis;
                const gainPct = (gainLoss / costBasis) * 100;
                const up = gainLoss >= 0;
                return (
                  <div key={h.symbol} style={styles.holdingRow}>
                    <div>
                      <span style={styles.holdingSymbol}>{h.symbol}</span>
                      <span style={styles.holdingName}>{h.name}</span>
                    </div>
                    <span style={styles.holdingCell}>{h.shares.toFixed(4)}</span>
                    <span style={styles.holdingCell}>${h.currentPrice.toFixed(2)}</span>
                    <span style={{ ...styles.holdingCell, fontWeight: 700 }}>${currentVal.toFixed(2)}</span>
                    <span style={{ ...styles.holdingCell, color: up ? '#059669' : '#dc2626', fontWeight: 700 }}>
                      {up ? '+' : ''}${gainLoss.toFixed(2)} ({up ? '+' : ''}{gainPct.toFixed(2)}%)
                    </span>
                  </div>
                );
              })}
              <div style={styles.holdingTotal}>
                <span>Total</span>
                <span></span>
                <span></span>
                <span>${totalCurrentValue.toFixed(2)}</span>
                <span style={{ color: totalCurrentValue - holdings.reduce((s, h) => s + h.shares * h.priceAtBuy, 0) >= 0 ? '#059669' : '#dc2626', fontWeight: 700 }}>
                  {(() => {
                    const cost = holdings.reduce((s, h) => s + h.shares * h.priceAtBuy, 0);
                    const gl = totalCurrentValue - cost;
                    return `${gl >= 0 ? '+' : ''}$${gl.toFixed(2)}`;
                  })()}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Trade history */}
        {trades.length > 0 && (
          <div style={styles.box}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: showHistory ? 10 : 0 }}>
              <p style={{ ...styles.boxLabel, marginBottom: 0 }}>Trade history ({trades.length})</p>
              <button style={styles.refreshBtn} onClick={() => setShowHistory(s => !s)}>
                {showHistory ? 'Hide' : 'Show'}
              </button>
            </div>
            {showHistory && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr 1fr 1fr 1fr', fontSize: 9, fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', padding: '0 10px 6px', letterSpacing: '0.05em' }}>
                  <span>Date</span><span>Stock</span><span>Type</span><span>Shares</span><span>Total</span>
                </div>
                {trades.map(t => (
                  <div key={t.id} style={{ display: 'grid', gridTemplateColumns: '1fr 2fr 1fr 1fr 1fr', alignItems: 'center', padding: '6px 10px', borderRadius: 8, background: '#f9fafb', border: '1px solid #f3f4f6', fontSize: 11 }}>
                    <span style={{ color: '#9ca3af' }}>{t.date}</span>
                    <span style={{ fontWeight: 800, color: '#9333ea' }}>{t.symbol}</span>
                    <span style={{ fontWeight: 700, color: t.type === 'buy' ? '#059669' : '#dc2626' }}>{t.type.toUpperCase()}</span>
                    <span style={{ color: '#374151' }}>{t.shares.toFixed(4)}</span>
                    <span style={{ fontWeight: 700, color: '#374151' }}>${t.total.toFixed(2)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Right column */}
      <div style={styles.right}>
        <div style={styles.box}>
          <p style={styles.boxLabel}>Look up a ticker</p>
          <input
            style={styles.searchInput}
            type="text"
            placeholder="e.g. AAPL or Apple"
            value={query}
            onChange={e => { setQuery(e.target.value); setSelected(null); setQuote(null); }}
          />
          {results.length > 0 && (
            <div style={styles.results}>
              {results.map(t => (
                <div
                  key={t.symbol}
                  style={{ ...styles.result, ...(selected?.symbol === t.symbol ? styles.resultActive : {}) }}
                  onClick={() => handleSelect(t)}
                >
                  <span style={styles.resultSymbol}>{t.symbol}</span>
                  <span style={styles.resultName}>{t.name}</span>
                </div>
              ))}
            </div>
          )}
          {query.trim().length > 0 && results.length === 0 && (
            <p style={styles.noResult}>No results found</p>
          )}
        </div>

        {selected && (
          <div style={styles.box}>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 6 }}>
              <p style={{ ...styles.boxLabel, marginBottom: 4 }}>{selected.symbol}</p>
              {profile?.finnhubIndustry && (
                <span style={styles.sectorTag}>{profile.finnhubIndustry}</span>
              )}
            </div>
            <p style={{ fontSize: 12, color: '#6b7280', marginBottom: 10 }}>{selected.name}</p>

            {loading && <p style={styles.noResult}>Loading...</p>}
            {fetchError && <p style={{ ...styles.noResult, color: '#ef4444' }}>{fetchError}</p>}

            {quote && (
              <>
                <p style={styles.quotePrice}>${quote.c.toFixed(2)}</p>
                <p style={{ fontSize: 11, fontWeight: 600, marginTop: 3, color: quote.d >= 0 ? '#059669' : '#dc2626' }}>
                  {quote.d >= 0 ? '+' : ''}${quote.d.toFixed(2)} ({quote.d >= 0 ? '+' : ''}{quote.dp.toFixed(2)}%) today
                </p>
                <div style={styles.quoteGrid}>
                  <div style={styles.quoteStat}><span style={styles.quoteStatLabel}>Open</span><span>${quote.o.toFixed(2)}</span></div>
                  <div style={styles.quoteStat}><span style={styles.quoteStatLabel}>High</span><span>${quote.h.toFixed(2)}</span></div>
                  <div style={styles.quoteStat}><span style={styles.quoteStatLabel}>Low</span><span>${quote.l.toFixed(2)}</span></div>
                  <div style={styles.quoteStat}><span style={styles.quoteStatLabel}>Prev close</span><span>${quote.pc.toFixed(2)}</span></div>
                </div>

                {currentHolding && (
                  <div style={styles.alreadyHeld}>
                    <p style={styles.heldLabel}>You own</p>
                    <p style={styles.heldShares}>{currentHolding.shares.toFixed(4)} shares</p>
                    <p style={styles.heldValue}>Current value: <b>${(currentHolding.shares * currentHolding.currentPrice).toFixed(2)}</b></p>
                  </div>
                )}

                {/* Buy */}
                <div style={styles.investForm}>
                  <p style={styles.tradeLabel}>BUY</p>
                  <div style={styles.investInputRow}>
                    <span style={styles.investDollar}>$</span>
                    <input
                      style={styles.investInput}
                      type="number"
                      placeholder="Amount to invest"
                      value={investAmount}
                      min="1"
                      onChange={e => { setInvestAmount(e.target.value); setInvestError(''); }}
                    />
                  </div>
                  {investAmount && quote.c > 0 && (
                    <p style={styles.sharesPreview}>≈ {(parseFloat(investAmount) / quote.c).toFixed(4)} shares at ${quote.c.toFixed(2)}/share</p>
                  )}
                  {investError && <p style={{ fontSize: 10, color: '#ef4444', marginTop: 4 }}>{investError}</p>}
                  <button
                    style={{ ...styles.investBtn, opacity: capital === 0 ? 0.4 : 1 }}
                    disabled={capital === 0}
                    onClick={handleInvest}
                  >
                    Buy {selected.symbol}
                  </button>
                  {capital === 0 && <p style={styles.noResult}>Choose your capital first</p>}
                </div>

                {/* Sell */}
                {currentHolding && (
                  <div style={{ marginTop: 10, paddingTop: 10, borderTop: '1px solid #f3f4f6' }}>
                    <p style={styles.tradeLabel}>SELL</p>
                    <div style={styles.investInputRow}>
                      <span style={styles.investDollar}>$</span>
                      <input
                        style={styles.investInput}
                        type="number"
                        placeholder="Amount to sell"
                        value={sellAmount}
                        min="1"
                        onChange={e => { setSellAmount(e.target.value); setSellError(''); }}
                      />
                    </div>
                    {sellAmount && quote.c > 0 && (
                      <p style={styles.sharesPreview}>≈ {(parseFloat(sellAmount) / quote.c).toFixed(4)} shares at ${quote.c.toFixed(2)}/share</p>
                    )}
                    {sellError && <p style={{ fontSize: 10, color: '#ef4444', marginTop: 4 }}>{sellError}</p>}
                    <button style={{ ...styles.investBtn, background: 'linear-gradient(135deg,#dc2626,#b91c1c)', marginTop: 8 }} onClick={handleSell}>
                      Sell {selected.symbol}
                    </button>
                  </div>
                )}

                {/* News */}
                {news.length > 0 && (
                  <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid #f3f4f6' }}>
                    <p style={styles.tradeLabel}>RECENT NEWS</p>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      {news.map((article, i) => (
                        <a key={i} href={article.url} target="_blank" rel="noreferrer" style={styles.newsItem}>
                          <p style={styles.newsHeadline}>{article.headline}</p>
                          <p style={styles.newsMeta}>{article.source} · {new Date(article.datetime * 1000).toLocaleDateString()}</p>
                        </a>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

const styles = {
  page: { minHeight: '100vh', background: '#ffffff', padding: '32px 20px', display: 'flex', gap: 20, alignItems: 'flex-start' },
  left: { flexShrink: 0, width: 200 },
  center: { flex: 1, display: 'flex', flexDirection: 'column', gap: 14 },
  right: { flexShrink: 0, width: 220 },
  heading: { fontSize: 17, fontWeight: 700, color: '#111827', marginBottom: 14 },
  box: { border: '1.5px solid #e5e7eb', borderRadius: 12, padding: '12px 14px', marginBottom: 10, background: '#ffffff', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' },
  boxLabel: { fontSize: 10, fontWeight: 600, color: '#9ca3af', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.05em' },
  options: { display: 'flex', gap: 5, flexWrap: 'wrap' },
  option: { padding: '5px 9px', borderRadius: 7, border: '1.5px solid #e5e7eb', background: '#f9fafb', color: '#374151', fontSize: 11, fontWeight: 700, cursor: 'pointer' },
  optionActive: { border: '1.5px solid #9333ea', background: '#faf5ff', color: '#9333ea' },
  value: { fontSize: 22, fontWeight: 800, color: '#111827', letterSpacing: '-0.5px' },
  chartBox: { border: '1.5px solid #e5e7eb', borderRadius: 16, padding: '20px 16px 16px', background: '#ffffff', boxShadow: '0 1px 6px rgba(0,0,0,0.05)', display: 'flex', flexDirection: 'column', height: 360 },
  chartHeader: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12, flexShrink: 0 },
  chartTitle: { fontSize: 13, fontWeight: 700, color: '#111827' },
  scaleControls: { display: 'flex', alignItems: 'center', gap: 6 },
  scaleLabel: { fontSize: 11, color: '#6b7280', fontWeight: 600 },
  scaleBtn: { width: 26, height: 26, borderRadius: 6, border: '1.5px solid #e5e7eb', background: '#f9fafb', color: '#374151', fontSize: 15, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' },
  holdingsHeader: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
  refreshBtn: { fontSize: 10, fontWeight: 600, color: '#7c3aed', background: 'none', border: '1px solid #e9d5ff', borderRadius: 6, padding: '3px 8px', cursor: 'pointer' },
  holdingsList: { display: 'flex', flexDirection: 'column', gap: 4 },
  holdingHeaderRow: { display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1.2fr 1.5fr', fontSize: 9, fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', padding: '0 10px 6px', letterSpacing: '0.05em' },
  holdingRow: { display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1.2fr 1.5fr', alignItems: 'center', padding: '8px 10px', borderRadius: 8, background: '#f9fafb', border: '1px solid #f3f4f6' },
  holdingSymbol: { fontSize: 12, fontWeight: 800, color: '#9333ea', marginRight: 5 },
  holdingName: { fontSize: 10, color: '#9ca3af' },
  holdingCell: { fontSize: 12, color: '#374151' },
  holdingTotal: { display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1.2fr 1.5fr', fontSize: 11, fontWeight: 700, color: '#374151', borderTop: '1px solid #f3f4f6', paddingTop: 8, marginTop: 2, padding: '8px 10px 0' },
  empty: { fontSize: 11, color: '#9ca3af' },
  searchInput: { width: '100%', border: '1.5px solid #e5e7eb', borderRadius: 8, padding: '7px 10px', fontSize: 12, color: '#111827', outline: 'none', background: '#f9fafb', boxSizing: 'border-box' },
  results: { marginTop: 8, display: 'flex', flexDirection: 'column', gap: 2 },
  result: { display: 'flex', flexDirection: 'column', padding: '7px 8px', borderRadius: 7, background: '#f9fafb', border: '1px solid #f3f4f6', cursor: 'pointer' },
  resultActive: { background: '#faf5ff', border: '1px solid #e9d5ff' },
  resultSymbol: { fontSize: 12, fontWeight: 800, color: '#9333ea' },
  resultName: { fontSize: 11, color: '#9ca3af', marginTop: 1 },
  noResult: { fontSize: 11, color: '#9ca3af', marginTop: 6 },
  quotePrice: { fontSize: 24, fontWeight: 800, color: '#111827', letterSpacing: '-0.5px' },
  quoteGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 4, marginTop: 8 },
  quoteStat: { display: 'flex', flexDirection: 'column', background: '#f9fafb', borderRadius: 6, padding: '5px 8px', fontSize: 11, fontWeight: 600, color: '#374151' },
  quoteStatLabel: { fontSize: 9, color: '#9ca3af', marginBottom: 2, textTransform: 'uppercase' },
  alreadyHeld: { background: '#faf5ff', border: '1px solid #e9d5ff', borderRadius: 8, padding: '8px 10px', marginTop: 10 },
  heldLabel: { fontSize: 9, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 2 },
  heldShares: { fontSize: 14, fontWeight: 800, color: '#7c3aed' },
  heldValue: { fontSize: 11, color: '#6b7280', marginTop: 2 },
  investForm: { marginTop: 12, borderTop: '1px solid #f3f4f6', paddingTop: 12 },
  tradeLabel: { fontSize: 10, fontWeight: 700, color: '#9ca3af', marginBottom: 6, letterSpacing: '0.05em' },
  investInputRow: { display: 'flex', alignItems: 'center', border: '1.5px solid #e5e7eb', borderRadius: 8, background: '#f9fafb', padding: '0 10px' },
  investDollar: { fontSize: 13, color: '#9ca3af', fontWeight: 700, marginRight: 4 },
  investInput: { flex: 1, border: 'none', outline: 'none', background: 'transparent', fontSize: 13, fontWeight: 700, color: '#111827', padding: '8px 0' },
  sharesPreview: { fontSize: 10, color: '#7c3aed', marginTop: 5, fontWeight: 600 },
  investBtn: { marginTop: 8, width: '100%', padding: '8px', borderRadius: 8, border: 'none', background: 'linear-gradient(135deg,#9333ea,#7c3aed)', color: '#fff', fontSize: 12, fontWeight: 700, cursor: 'pointer' },
  sectorTag: { fontSize: 9, fontWeight: 700, color: '#7c3aed', background: '#faf5ff', border: '1px solid #e9d5ff', borderRadius: 20, padding: '2px 8px', whiteSpace: 'nowrap' },
  newsItem: { display: 'block', textDecoration: 'none', padding: '7px 8px', borderRadius: 7, background: '#f9fafb', border: '1px solid #f3f4f6' },
  newsHeadline: { fontSize: 11, fontWeight: 600, color: '#111827', lineHeight: 1.4, marginBottom: 3 },
  newsMeta: { fontSize: 10, color: '#9ca3af' },
  plRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '4px 0' },
  plSymbol: { fontSize: 11, fontWeight: 700, color: '#374151' },
  plAmount: { fontSize: 12, fontWeight: 700 },
  plDivider: { borderTop: '1px solid #f3f4f6', margin: '6px 0' },
};
