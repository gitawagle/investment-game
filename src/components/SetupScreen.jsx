import { useState } from 'react';

const PRESETS = [1000, 5000, 10000, 50000, 100000];

const NEON = '#9333ea';
const NEON_BRIGHT = '#a855f7';
const NEON_GLOW = '0 0 12px rgba(147,51,234,0.5), 0 0 24px rgba(147,51,234,0.25)';

export default function SetupScreen({ onStart }) {
  const [username, setUsername] = useState('');
  const [input, setInput] = useState('');
  const [selected, setSelected] = useState(null);

  const fmt = n => '$' + Number(n).toLocaleString();

  function handlePreset(val) {
    setSelected(val);
    setInput(String(val));
  }

  function handleSubmit(e) {
    e.preventDefault();
    const val = parseFloat(input.replace(/,/g, ''));
    if (val >= 100 && username.trim()) {
      localStorage.setItem('tradesim_username', username.trim());
      onStart(val, username.trim());
    }
  }

  const value = parseFloat(input.replace(/,/g, ''));
  const valid = !isNaN(value) && value >= 100 && username.trim().length > 0;

  return (
    <div style={styles.page}>
      <div style={styles.card}>
        <div style={styles.logo}>
          <span style={styles.logoIcon}>📈</span>
          <span style={styles.logoText}>TradeSim</span>
        </div>

        <h1 style={styles.title}>Start Your Portfolio</h1>
        <p style={styles.subtitle}>
          Choose your starting capital and invest in stocks. Watch your portfolio grow — or shrink — in real time.
        </p>

        <div style={styles.presets}>
          {PRESETS.map(p => (
            <button
              key={p}
              style={{ ...styles.preset, ...(selected === p ? styles.presetActive : {}) }}
              onClick={() => handlePreset(p)}
            >
              {fmt(p)}
            </button>
          ))}
        </div>

        <form onSubmit={handleSubmit} style={styles.form}>
          <div style={styles.inputWrap}>
            <span style={styles.fieldIcon}>👤</span>
            <input
              style={styles.input}
              type="text"
              placeholder="Enter your username"
              value={username}
              maxLength={24}
              onChange={e => setUsername(e.target.value)}
            />
          </div>
          <div style={styles.inputWrap}>
            <span style={styles.dollar}>$</span>
            <input
              style={styles.input}
              type="number"
              placeholder="Enter custom amount"
              value={input}
              min="100"
              onChange={e => { setInput(e.target.value); setSelected(null); }}
            />
          </div>
          <p style={styles.hint}>Minimum: $100</p>
          <button
            type="submit"
            disabled={!valid}
            style={{ ...styles.startBtn, ...(valid ? {} : styles.startBtnDisabled) }}
          >
            Start Trading →
          </button>
        </form>
      </div>

      <div style={styles.features}>
        {[
          ['📊', 'Live Charts', 'Track price movements over day, week, or month'],
          ['💼', 'Portfolio', 'Build and manage your stock holdings'],
          ['⚡', 'Real-time', 'Prices update live as you trade'],
        ].map(([icon, title, desc]) => (
          <div key={title} style={styles.feature}>
            <span style={styles.featureIcon}>{icon}</span>
            <div>
              <div style={styles.featureTitle}>{title}</div>
              <div style={styles.featureDesc}>{desc}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

const styles = {
  page: {
    minHeight: '100vh',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '40px 20px',
    gap: 32,
    background: 'radial-gradient(ellipse at 50% 0%, rgba(147,51,234,0.1) 0%, transparent 65%)',
  },
  card: {
    background: '#ffffff',
    border: '1.5px solid #e9d5ff',
    borderRadius: 24,
    padding: '44px 40px',
    maxWidth: 520,
    width: '100%',
    boxShadow: '0 8px 40px rgba(147,51,234,0.08)',
  },
  logo: {
    display: 'flex', alignItems: 'center', gap: 10,
    marginBottom: 28, justifyContent: 'center',
  },
  logoIcon: { fontSize: 28 },
  logoText: {
    fontSize: 22, fontWeight: 800, color: '#9333ea',
    letterSpacing: '-0.5px',
    textShadow: '0 0 20px rgba(147,51,234,0.4)',
  },
  title: {
    fontSize: 30, fontWeight: 800, color: '#1e0a3c',
    marginBottom: 10, textAlign: 'center', letterSpacing: '-0.5px',
  },
  subtitle: {
    fontSize: 14, color: '#7c6d97',
    textAlign: 'center', lineHeight: 1.6, marginBottom: 28,
  },
  presets: {
    display: 'flex', flexWrap: 'wrap', gap: 8,
    justifyContent: 'center', marginBottom: 20,
  },
  preset: {
    padding: '9px 15px', borderRadius: 10,
    border: '1.5px solid #e9d5ff',
    background: '#faf5ff',
    color: '#7c3aed', cursor: 'pointer',
    fontSize: 13, fontWeight: 700, transition: 'all 0.15s',
  },
  presetActive: {
    border: '1.5px solid #9333ea',
    background: 'rgba(147,51,234,0.08)',
    color: '#9333ea',
    boxShadow: '0 0 10px rgba(147,51,234,0.2)',
  },
  form: { display: 'flex', flexDirection: 'column', gap: 10 },
  inputWrap: {
    display: 'flex', alignItems: 'center',
    background: '#faf5ff',
    border: '1.5px solid #e9d5ff',
    borderRadius: 12, padding: '0 16px', gap: 8,
  },
  dollar: { fontSize: 18, color: '#c4b5fd', fontWeight: 700 },
  fieldIcon: { fontSize: 15, color: '#c4b5fd' },
  input: {
    flex: 1, background: 'transparent', border: 'none', outline: 'none',
    color: '#1e0a3c', fontSize: 17, fontWeight: 600, padding: '13px 0',
  },
  hint: { fontSize: 12, color: '#a78bfa', paddingLeft: 4 },
  startBtn: {
    marginTop: 4, padding: '14px', borderRadius: 12, border: 'none',
    background: 'linear-gradient(135deg, #9333ea, #7c3aed)',
    color: '#fff', fontSize: 16, fontWeight: 800,
    cursor: 'pointer', letterSpacing: '-0.2px',
    boxShadow: '0 4px 20px rgba(147,51,234,0.4)',
    transition: 'all 0.15s',
  },
  startBtnDisabled: {
    opacity: 0.35, cursor: 'not-allowed', boxShadow: 'none',
  },
  features: {
    display: 'flex', flexDirection: 'column', gap: 12,
    maxWidth: 400, width: '100%',
  },
  feature: {
    display: 'flex', alignItems: 'flex-start', gap: 14,
    background: '#ffffff',
    border: '1.5px solid #e9d5ff',
    borderRadius: 12, padding: '14px 18px',
    boxShadow: '0 2px 8px rgba(147,51,234,0.05)',
  },
  featureIcon: { fontSize: 20, marginTop: 1 },
  featureTitle: { fontSize: 14, fontWeight: 700, color: '#1e0a3c', marginBottom: 2 },
  featureDesc: { fontSize: 12, color: '#7c6d97' },
};
