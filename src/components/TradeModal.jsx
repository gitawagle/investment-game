import { useState } from 'react';

export default function TradeModal({ stock, cash, holdings, onClose, onTrade }) {
  const [mode, setMode] = useState('buy');
  const [shares, setShares] = useState('');

  const price = stock.price;
  const sharesNum = parseFloat(shares) || 0;
  const heldShares = holdings?.shares || 0;
  const total = sharesNum * price;
  const canBuy = sharesNum > 0 && total <= cash;
  const canSell = sharesNum > 0 && sharesNum <= heldShares;

  function maxBuy() { setShares(String(Math.floor(cash / price))); }

  function handleSubmit() {
    if (mode === 'buy' && canBuy) onTrade('buy', stock.symbol, sharesNum, price);
    if (mode === 'sell' && canSell) onTrade('sell', stock.symbol, sharesNum, price);
    onClose();
  }

  const change = stock.price - stock.openPrice;
  const changePct = (change / stock.openPrice) * 100;
  const up = change >= 0;

  return (
    <div style={styles.overlay} onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={styles.modal}>
        <div style={styles.header}>
          <div>
            <div style={styles.symbol}>{stock.symbol}</div>
            <div style={styles.name}>{stock.name}</div>
          </div>
          <div style={styles.priceBlock}>
            <div style={styles.price}>${price.toFixed(2)}</div>
            <div style={{ ...styles.change, color: up ? '#059669' : '#dc2626' }}>
              {up ? '+' : ''}{change.toFixed(2)} ({up ? '+' : ''}{changePct.toFixed(2)}%)
            </div>
          </div>
          <button style={styles.close} onClick={onClose}>✕</button>
        </div>

        <div style={styles.tabs}>
          <button
            style={{ ...styles.tab, ...(mode === 'buy' ? styles.tabBuy : {}) }}
            onClick={() => setMode('buy')}
          >Buy</button>
          <button
            style={{ ...styles.tab, ...(mode === 'sell' ? styles.tabSell : {}) }}
            onClick={() => setMode('sell')}
          >Sell</button>
        </div>

        <div style={styles.info}>
          <div style={styles.infoRow}>
            <span style={styles.label}>{mode === 'buy' ? 'Available Cash' : 'Shares Held'}</span>
            <span style={styles.value}>
              {mode === 'buy'
                ? `$${cash.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                : `${heldShares} shares`}
            </span>
          </div>
          {mode === 'buy' && heldShares > 0 && (
            <div style={styles.infoRow}>
              <span style={styles.label}>Already Owned</span>
              <span style={styles.value}>{heldShares} shares</span>
            </div>
          )}
        </div>

        <div style={styles.sharesRow}>
          <div style={styles.sharesInput}>
            <input
              style={styles.input}
              type="number"
              min="1"
              placeholder="0"
              value={shares}
              onChange={e => setShares(e.target.value)}
            />
            <span style={styles.sharesLabel}>shares</span>
          </div>
          {mode === 'buy' && (
            <button style={styles.maxBtn} onClick={maxBuy}>Max</button>
          )}
          {mode === 'sell' && heldShares > 0 && (
            <button style={styles.maxBtn} onClick={() => setShares(String(heldShares))}>All</button>
          )}
        </div>

        <div style={styles.totalRow}>
          <span style={styles.label}>Estimated Total</span>
          <span style={styles.totalVal}>${total.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
        </div>

        {mode === 'buy' && sharesNum > 0 && total > cash && (
          <div style={styles.error}>Insufficient funds</div>
        )}
        {mode === 'sell' && sharesNum > 0 && sharesNum > heldShares && (
          <div style={styles.error}>You only have {heldShares} shares</div>
        )}
        {mode === 'sell' && heldShares === 0 && (
          <div style={styles.error}>You don't own any {stock.symbol} shares</div>
        )}

        <button
          style={{
            ...styles.actionBtn,
            ...(mode === 'buy'
              ? { background: 'linear-gradient(135deg,#9333ea,#7c3aed)', boxShadow: '0 4px 20px rgba(147,51,234,0.35)' }
              : { background: 'linear-gradient(135deg,#dc2626,#b91c1c)', boxShadow: '0 4px 20px rgba(220,38,38,0.3)' }),
            opacity: (mode === 'buy' ? canBuy : canSell) ? 1 : 0.35,
            cursor: (mode === 'buy' ? canBuy : canSell) ? 'pointer' : 'not-allowed',
          }}
          onClick={handleSubmit}
          disabled={!(mode === 'buy' ? canBuy : canSell)}
        >
          {mode === 'buy' ? `Buy ${sharesNum || 0} shares` : `Sell ${sharesNum || 0} shares`}
        </button>
      </div>
    </div>
  );
}

const styles = {
  overlay: {
    position: 'fixed', inset: 0,
    background: 'rgba(30,10,60,0.35)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    zIndex: 100, padding: 20,
    backdropFilter: 'blur(6px)',
  },
  modal: {
    background: '#ffffff',
    border: '1.5px solid #e9d5ff',
    borderRadius: 24, padding: 28,
    width: '100%', maxWidth: 420,
    boxShadow: '0 20px 60px rgba(147,51,234,0.15)',
  },
  header: { display: 'flex', alignItems: 'flex-start', gap: 12, marginBottom: 20 },
  symbol: { fontSize: 20, fontWeight: 800, color: '#9333ea' },
  name: { fontSize: 13, color: '#9d8cb5', marginTop: 2 },
  priceBlock: { marginLeft: 'auto', textAlign: 'right' },
  price: { fontSize: 20, fontWeight: 700, color: '#1e0a3c' },
  change: { fontSize: 13, marginTop: 2, fontWeight: 600 },
  close: {
    background: 'none', border: 'none', color: '#c4b5fd',
    fontSize: 18, cursor: 'pointer', padding: 4, marginLeft: 4,
  },
  tabs: {
    display: 'flex', gap: 6, marginBottom: 20,
    background: '#faf5ff', borderRadius: 12, padding: 4,
    border: '1px solid #f3e8ff',
  },
  tab: {
    flex: 1, padding: '9px', borderRadius: 9, border: 'none',
    background: 'transparent', color: '#9d8cb5',
    fontSize: 14, fontWeight: 700, cursor: 'pointer',
  },
  tabBuy: { background: 'rgba(147,51,234,0.1)', color: '#9333ea' },
  tabSell: { background: 'rgba(220,38,38,0.08)', color: '#dc2626' },
  info: {
    background: '#faf5ff', borderRadius: 12, padding: '12px 16px',
    marginBottom: 16, display: 'flex', flexDirection: 'column', gap: 8,
    border: '1px solid #f3e8ff',
  },
  infoRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  label: { fontSize: 13, color: '#9d8cb5' },
  value: { fontSize: 14, fontWeight: 700, color: '#1e0a3c' },
  sharesRow: { display: 'flex', gap: 8, marginBottom: 16, alignItems: 'center' },
  sharesInput: {
    flex: 1, display: 'flex', alignItems: 'center', gap: 10,
    background: '#faf5ff', border: '1.5px solid #e9d5ff', borderRadius: 12, padding: '0 16px',
  },
  input: {
    flex: 1, background: 'transparent', border: 'none', outline: 'none',
    color: '#1e0a3c', fontSize: 18, fontWeight: 700, padding: '13px 0',
  },
  sharesLabel: { color: '#c4b5fd', fontSize: 14, fontWeight: 600 },
  maxBtn: {
    padding: '13px 16px', borderRadius: 12,
    border: '1.5px solid #e9d5ff', background: '#faf5ff',
    color: '#7c3aed', fontSize: 13, fontWeight: 700, cursor: 'pointer',
  },
  totalRow: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    padding: '12px 0', borderTop: '1px solid #f3e8ff', marginBottom: 16,
  },
  totalVal: { fontSize: 18, fontWeight: 800, color: '#9333ea' },
  error: {
    fontSize: 13, color: '#dc2626', textAlign: 'center',
    background: 'rgba(220,38,38,0.06)', borderRadius: 8,
    padding: '8px', marginBottom: 12, fontWeight: 600,
  },
  actionBtn: {
    width: '100%', padding: '14px', borderRadius: 12, border: 'none',
    color: '#fff', fontSize: 16, fontWeight: 800, transition: 'opacity 0.15s',
  },
};
