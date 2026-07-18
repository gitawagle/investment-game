import { AreaChart, Area, ResponsiveContainer } from 'recharts';

export default function StockRow({ stock, holding, onSelect }) {
  const change = stock.price - stock.openPrice;
  const changePct = (change / stock.openPrice) * 100;
  const up = change >= 0;
  const miniData = stock.history.slice(-20).map((p, i) => ({ i, p }));
  const holdingValue = holding ? holding.shares * stock.price : 0;

  return (
    <div
      style={styles.row}
      onClick={() => onSelect(stock)}
      onMouseEnter={e => e.currentTarget.style.background = '#faf5ff'}
      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
    >
      <div style={styles.symbolCol}>
        <div style={styles.symbol}>{stock.symbol}</div>
        <div style={styles.name}>{stock.name}</div>
      </div>

      <div style={styles.chartCol}>
        <ResponsiveContainer width="100%" height={36}>
          <AreaChart data={miniData} margin={{ top: 2, bottom: 2 }}>
            <defs>
              <linearGradient id={`g-${stock.symbol}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={up ? '#059669' : '#dc2626'} stopOpacity={0.25} />
                <stop offset="100%" stopColor={up ? '#059669' : '#dc2626'} stopOpacity={0} />
              </linearGradient>
            </defs>
            <Area
              type="monotone"
              dataKey="p"
              stroke={up ? '#059669' : '#dc2626'}
              strokeWidth={1.5}
              fill={`url(#g-${stock.symbol})`}
              dot={false}
              isAnimationActive={false}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      <div style={styles.priceCol}>
        <div style={styles.price}>${stock.price.toFixed(2)}</div>
        <div style={{ ...styles.change, color: up ? '#059669' : '#dc2626' }}>
          {up ? '+' : ''}{changePct.toFixed(2)}%
        </div>
      </div>

      {holding && (
        <div style={styles.holdingCol}>
          <div style={styles.holdingVal}>${holdingValue.toFixed(2)}</div>
          <div style={styles.holdingShares}>{holding.shares} shares</div>
        </div>
      )}

      <button style={styles.tradeBtn} onClick={e => { e.stopPropagation(); onSelect(stock); }}>
        Trade
      </button>
    </div>
  );
}

const styles = {
  row: {
    display: 'flex', alignItems: 'center', gap: 16,
    padding: '14px 20px',
    borderBottom: '1px solid #f3e8ff',
    cursor: 'pointer',
    transition: 'background 0.12s',
  },
  symbolCol: { width: 110, flexShrink: 0 },
  symbol: { fontSize: 15, fontWeight: 800, color: '#9333ea' },
  name: {
    fontSize: 12, color: '#9d8cb5', marginTop: 2,
    whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 105,
  },
  chartCol: { flex: 1, minWidth: 80 },
  priceCol: { width: 90, textAlign: 'right', flexShrink: 0 },
  price: { fontSize: 15, fontWeight: 700, color: '#1e0a3c' },
  change: { fontSize: 12, marginTop: 2, fontWeight: 600 },
  holdingCol: { width: 90, textAlign: 'right', flexShrink: 0 },
  holdingVal: { fontSize: 14, fontWeight: 700, color: '#7c3aed' },
  holdingShares: { fontSize: 12, color: '#9d8cb5', marginTop: 2 },
  tradeBtn: {
    padding: '7px 14px', borderRadius: 8,
    border: '1.5px solid #e9d5ff',
    background: '#faf5ff', color: '#7c3aed',
    fontSize: 13, fontWeight: 700, cursor: 'pointer', flexShrink: 0,
  },
};
