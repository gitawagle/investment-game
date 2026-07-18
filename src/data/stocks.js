export const STOCK_UNIVERSE = [
  { symbol: 'AAPL', name: 'Apple Inc.', sector: 'Technology', basePrice: 189.5, volatility: 0.012 },
  { symbol: 'MSFT', name: 'Microsoft Corp.', sector: 'Technology', basePrice: 415.2, volatility: 0.011 },
  { symbol: 'GOOGL', name: 'Alphabet Inc.', sector: 'Technology', basePrice: 178.3, volatility: 0.013 },
  { symbol: 'AMZN', name: 'Amazon.com Inc.', sector: 'Consumer', basePrice: 195.8, volatility: 0.014 },
  { symbol: 'TSLA', name: 'Tesla Inc.', sector: 'Automotive', basePrice: 248.5, volatility: 0.028 },
  { symbol: 'NVDA', name: 'NVIDIA Corp.', sector: 'Technology', basePrice: 875.4, volatility: 0.022 },
  { symbol: 'META', name: 'Meta Platforms', sector: 'Technology', basePrice: 512.3, volatility: 0.016 },
  { symbol: 'NFLX', name: 'Netflix Inc.', sector: 'Media', basePrice: 635.9, volatility: 0.018 },
  { symbol: 'JPM', name: 'JPMorgan Chase', sector: 'Finance', basePrice: 198.4, volatility: 0.010 },
  { symbol: 'V', name: 'Visa Inc.', sector: 'Finance', basePrice: 278.6, volatility: 0.009 },
];

export function generateHistory(basePrice, volatility, points) {
  const history = [];
  let price = basePrice * (0.85 + Math.random() * 0.1);
  for (let i = 0; i < points; i++) {
    const change = (Math.random() - 0.48) * volatility * price;
    price = Math.max(price + change, 1);
    history.push(parseFloat(price.toFixed(2)));
  }
  history[history.length - 1] = basePrice;
  return history;
}

export function generateTimeLabels(view) {
  const now = new Date();
  const labels = [];
  if (view === 'day') {
    for (let h = 9; h <= 16; h++) {
      for (let m = 0; m < 60; m += 15) {
        if (h === 16 && m > 0) break;
        labels.push(`${h}:${m === 0 ? '00' : m}`);
      }
    }
  } else if (view === 'week') {
    const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'];
    days.forEach(d => labels.push(d));
  } else {
    for (let i = 30; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      labels.push(`${d.getMonth() + 1}/${d.getDate()}`);
    }
  }
  return labels;
}
