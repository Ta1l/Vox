# DESIGN_SYSTEM.md

Last updated: 2026-10-03

---

## Design philosophy

Personal Finance OS — mobile-first производственная финансовая система.

**Core principles:**

1. **Mobile first, mobile always** — primary viewport 390×844;
2. **Information density** — show financial status quickly;
3. **Touch-optimized** — targets ≥ 44×44px, comfortable spacing;
4. **Production aesthetic** — sharp, confident, technical;
5. **Financial clarity** — numbers readable, status obvious;
6. **No decorative complexity** — every element serves a purpose;
7. **Dark mode native** — designed dark-first.

---

## Color palette

### Base colors (dark-first)

```css
:root {
  /* Backgrounds */
  --bg-base: #0B0E14;           /* Deep navy base */
  --bg-elevated: #141922;       /* Slightly elevated surface */
  --bg-subtle: #1E2330;         /* Subtle cards/panels */
  --bg-interactive: #262D3E;    /* Hover/active states */
  
  /* Text */
  --text-primary: #F8FAFC;      /* High-contrast white */
  --text-secondary: #94A3B8;    /* Muted for secondary info */
  --text-tertiary: #64748B;     /* De-emphasized text */
  
  /* Borders */
  --border-subtle: #1E293B;     /* Hairline dividers */
  --border-strong: #334155;     /* Emphasized borders */
  
  /* Accents */
  --accent-primary: #38BDF8;    /* Sky blue - primary actions */
  --accent-primary-hover: #0EA5E9;
  --accent-primary-muted: #0C4A6E;
  
  --accent-action: #F97316;     /* Orange - important CTAs */
  --accent-action-hover: #EA580C;
  --accent-action-muted: #7C2D12;
  
  /* Status colors */
  --status-success: #10B981;    /* Green - received, completed */
  --status-success-muted: #064E3B;
  
  --status-warning: #F59E0B;    /* Amber - attention needed */
  --status-warning-muted: #78350F;
  
  --status-error: #EF4444;      /* Red - overdue, critical */
  --status-error-muted: #7F1D1D;
  
  --status-info: #3B82F6;       /* Blue - informational */
  --status-info-muted: #1E3A8A;
  
  /* Protection levels */
  --protection-hard: #DC2626;   /* Red - HARD protection */
  --protection-negotiable: #F59E0B; /* Amber - NEGOTIABLE */
  --protection-flexible: #10B981;   /* Green - FLEXIBLE */
  
  /* Special */
  --shadow-sm: 0 1px 2px 0 rgb(0 0 0 / 0.3);
  --shadow-md: 0 4px 6px -1px rgb(0 0 0 / 0.4);
  --shadow-lg: 0 10px 15px -3px rgb(0 0 0 / 0.5);
}

/* Light mode (system preference fallback) */
@media (prefers-color-scheme: light) {
  :root:not([data-theme="dark"]) {
    --bg-base: #FFFFFF;
    --bg-elevated: #F8FAFC;
    --bg-subtle: #F1F5F9;
    --bg-interactive: #E2E8F0;
    
    --text-primary: #0F172A;
    --text-secondary: #475569;
    --text-tertiary: #94A3B8;
    
    --border-subtle: #E2E8F0;
    --border-strong: #CBD5E1;
    
    /* Accent colors stay same for consistency */
    
    --shadow-sm: 0 1px 2px 0 rgb(0 0 0 / 0.05);
    --shadow-md: 0 4px 6px -1px rgb(0 0 0 / 0.1);
    --shadow-lg: 0 10px 15px -3px rgb(0 0 0 / 0.15);
  }
}

/* Explicit theme overrides */
:root[data-theme="dark"] {
  /* Dark palette from above */
}

:root[data-theme="light"] {
  /* Light palette from above */
}
```

---

## Typography

### Font stack

```css
:root {
  /* Primary interface font */
  --font-sans: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', 
               system-ui, sans-serif;
  
  /* Monospace for amounts, codes, technical */
  --font-mono: 'JetBrains Mono', 'SF Mono', 'Roboto Mono', 
               'Courier New', monospace;
  
  /* Tabular numerals for financial tables */
  --font-tabular: 'Inter', system-ui;
  font-feature-settings: 'tnum' 1; /* tabular numbers */
}
```

### Type scale

```css
:root {
  /* Display (rare, hero sections only) */
  --text-display: 2.25rem;      /* 36px */
  --leading-display: 2.5rem;    /* 40px */
  
  /* Headings */
  --text-h1: 1.875rem;          /* 30px */
  --leading-h1: 2.25rem;        /* 36px */
  
  --text-h2: 1.5rem;            /* 24px */
  --leading-h2: 2rem;           /* 32px */
  
  --text-h3: 1.25rem;           /* 20px */
  --leading-h3: 1.75rem;        /* 28px */
  
  /* Body */
  --text-base: 1rem;            /* 16px */
  --leading-base: 1.5rem;       /* 24px */
  
  --text-sm: 0.875rem;          /* 14px */
  --leading-sm: 1.25rem;        /* 20px */
  
  --text-xs: 0.75rem;           /* 12px */
  --leading-xs: 1rem;           /* 16px */
  
  /* Financial amounts (larger for emphasis) */
  --text-amount-lg: 2rem;       /* 32px */
  --text-amount-md: 1.5rem;     /* 24px */
  --text-amount-sm: 1.125rem;   /* 18px */
}
```

### Font weights

```css
:root {
  --weight-normal: 400;
  --weight-medium: 500;
  --weight-semibold: 600;
  --weight-bold: 700;
}
```

### Typography components

```tsx
// Heading
<h1 className="text-h1 font-semibold text-primary">
  Dashboard
</h1>

// Amount (large)
<div className="font-mono text-amount-lg font-semibold text-primary tabular-nums">
  125 050,00 ₽
</div>

// Secondary text
<p className="text-sm text-secondary">
  Available balance
</p>

// Status label
<span className="text-xs font-medium text-tertiary uppercase tracking-wide">
  IN TRANSIT
</span>
```

---

## Spacing system

```css
:root {
  --space-0: 0;
  --space-1: 0.25rem;   /* 4px */
  --space-2: 0.5rem;    /* 8px */
  --space-3: 0.75rem;   /* 12px */
  --space-4: 1rem;      /* 16px */
  --space-5: 1.25rem;   /* 20px */
  --space-6: 1.5rem;    /* 24px */
  --space-8: 2rem;      /* 32px */
  --space-10: 2.5rem;   /* 40px */
  --space-12: 3rem;     /* 48px */
  --space-16: 4rem;     /* 64px */
}
```

**Usage:**

- Card padding: `--space-4` (16px);
- Section spacing: `--space-6` (24px);
- Element gap: `--space-3` (12px);
- Tight spacing: `--space-2` (8px);
- Touch target padding: `--space-3` minimum.

---

## Layout primitives

### Container

```tsx
<div className="container">
  {/* Max width 390px, centered */}
</div>

.container {
  max-width: 390px;
  margin-left: auto;
  margin-right: auto;
  padding-left: var(--space-4);
  padding-right: var(--space-4);
}
```

### Stack (vertical spacing)

```tsx
<div className="stack-4">
  <div>Item 1</div>
  <div>Item 2</div>
</div>

.stack-4 > * + * {
  margin-top: var(--space-4);
}
```

### Grid (dashboard cards)

```tsx
<div className="grid grid-cols-2 gap-3">
  <Card>Stat 1</Card>
  <Card>Stat 2</Card>
</div>
```

---

## Components

### Button

```tsx
// Primary action
<button className="btn btn-primary">
  Save
</button>

// Secondary action
<button className="btn btn-secondary">
  Cancel
</button>

// Danger action
<button className="btn btn-danger">
  Delete
</button>

// Ghost (minimal)
<button className="btn btn-ghost">
  Skip
</button>
```

```css
.btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: var(--space-2);
  padding: var(--space-3) var(--space-4);
  min-height: 44px; /* touch target */
  border-radius: 8px;
  font-size: var(--text-base);
  font-weight: var(--weight-medium);
  transition: all 150ms ease;
  cursor: pointer;
  border: none;
}

.btn-primary {
  background: var(--accent-primary);
  color: var(--bg-base);
}

.btn-primary:hover {
  background: var(--accent-primary-hover);
}

.btn-secondary {
  background: var(--bg-subtle);
  color: var(--text-primary);
  border: 1px solid var(--border-strong);
}

.btn-danger {
  background: var(--status-error);
  color: white;
}

.btn-ghost {
  background: transparent;
  color: var(--text-secondary);
}

.btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
```

### Card

```tsx
<div className="card">
  <div className="card-header">
    <h3 className="card-title">Available Balance</h3>
  </div>
  <div className="card-content">
    <div className="amount-lg">125 050,00 ₽</div>
  </div>
</div>
```

```css
.card {
  background: var(--bg-subtle);
  border: 1px solid var(--border-subtle);
  border-radius: 12px;
  overflow: hidden;
}

.card-header {
  padding: var(--space-4);
  border-bottom: 1px solid var(--border-subtle);
}

.card-title {
  font-size: var(--text-sm);
  font-weight: var(--weight-medium);
  color: var(--text-secondary);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.card-content {
  padding: var(--space-4);
}
```

### Status badge

```tsx
<span className="badge badge-success">RECEIVED</span>
<span className="badge badge-warning">PENDING</span>
<span className="badge badge-error">OVERDUE</span>
```

```css
.badge {
  display: inline-flex;
  align-items: center;
  gap: var(--space-2);
  padding: var(--space-1) var(--space-3);
  border-radius: 6px;
  font-size: var(--text-xs);
  font-weight: var(--weight-medium);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.badge-success {
  background: var(--status-success-muted);
  color: var(--status-success);
}

.badge-warning {
  background: var(--status-warning-muted);
  color: var(--status-warning);
}

.badge-error {
  background: var(--status-error-muted);
  color: var(--status-error);
}
```

### Protection level indicator

```tsx
<div className="protection-indicator protection-hard">
  <span className="protection-dot"></span>
  <span>HARD</span>
</div>
```

```css
.protection-indicator {
  display: inline-flex;
  align-items: center;
  gap: var(--space-2);
  font-size: var(--text-xs);
  font-weight: var(--weight-medium);
}

.protection-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
}

.protection-hard .protection-dot {
  background: var(--protection-hard);
}

.protection-negotiable .protection-dot {
  background: var(--protection-negotiable);
}

.protection-flexible .protection-dot {
  background: var(--protection-flexible);
}
```

### Input field

```tsx
<div className="field">
  <label className="label">Amount (₽)</label>
  <input 
    type="number" 
    className="input" 
    placeholder="0.00"
  />
  <p className="hint">Enter amount in rubles</p>
</div>
```

```css
.field {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}

.label {
  font-size: var(--text-sm);
  font-weight: var(--weight-medium);
  color: var(--text-primary);
}

.input {
  padding: var(--space-3) var(--space-4);
  min-height: 44px;
  background: var(--bg-elevated);
  border: 1px solid var(--border-subtle);
  border-radius: 8px;
  color: var(--text-primary);
  font-size: var(--text-base);
  transition: all 150ms ease;
}

.input:focus {
  outline: none;
  border-color: var(--accent-primary);
  box-shadow: 0 0 0 3px var(--accent-primary-muted);
}

.input::placeholder {
  color: var(--text-tertiary);
}

.hint {
  font-size: var(--text-xs);
  color: var(--text-tertiary);
}

.input:invalid {
  border-color: var(--status-error);
}
```

### Bottom navigation

```tsx
<nav className="bottom-nav">
  <button className="nav-item nav-item-active">
    <DashboardIcon />
    <span>Dashboard</span>
  </button>
  <button className="nav-item">
    <CalendarIcon />
    <span>Calendar</span>
  </button>
  <button className="nav-item">
    <PlanIcon />
    <span>Plan</span>
  </button>
  <button className="nav-item">
    <MoreIcon />
    <span>More</span>
  </button>
</nav>
```

```css
.bottom-nav {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  display: flex;
  background: var(--bg-elevated);
  border-top: 1px solid var(--border-subtle);
  padding: var(--space-2) var(--space-4);
  z-index: 50;
}

.nav-item {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-1);
  padding: var(--space-2);
  min-height: 56px;
  background: transparent;
  border: none;
  color: var(--text-tertiary);
  font-size: var(--text-xs);
  font-weight: var(--weight-medium);
  cursor: pointer;
  transition: color 150ms ease;
}

.nav-item svg {
  width: 24px;
  height: 24px;
}

.nav-item-active {
  color: var(--accent-primary);
}

.nav-item:hover {
  color: var(--text-secondary);
}
```

---

## Financial display patterns

### Large balance display

```tsx
<div className="balance-display">
  <p className="balance-label">Available Balance</p>
  <div className="balance-amount">125 050,00 ₽</div>
  <p className="balance-sublabel">+10 000,00 ₽ in transit</p>
</div>
```

```css
.balance-display {
  text-align: center;
  padding: var(--space-6);
}

.balance-label {
  font-size: var(--text-sm);
  color: var(--text-secondary);
  text-transform: uppercase;
  letter-spacing: 0.05em;
  margin-bottom: var(--space-2);
}

.balance-amount {
  font-family: var(--font-mono);
  font-size: var(--text-amount-lg);
  font-weight: var(--weight-semibold);
  color: var(--text-primary);
  font-feature-settings: 'tnum' 1; /* tabular nums */
  margin-bottom: var(--space-2);
}

.balance-sublabel {
  font-size: var(--text-sm);
  color: var(--text-tertiary);
}
```

### Stat card

```tsx
<div className="stat-card">
  <div className="stat-icon">
    <IncomeIcon />
  </div>
  <div className="stat-content">
    <p className="stat-label">This Week</p>
    <p className="stat-value">45 000,00 ₽</p>
    <p className="stat-change stat-change-positive">+12%</p>
  </div>
</div>
```

```css
.stat-card {
  display: flex;
  gap: var(--space-3);
  padding: var(--space-4);
  background: var(--bg-subtle);
  border: 1px solid var(--border-subtle);
  border-radius: 12px;
}

.stat-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  background: var(--accent-primary-muted);
  border-radius: 8px;
  color: var(--accent-primary);
}

.stat-content {
  flex: 1;
}

.stat-label {
  font-size: var(--text-xs);
  color: var(--text-secondary);
  text-transform: uppercase;
  letter-spacing: 0.05em;
  margin-bottom: var(--space-1);
}

.stat-value {
  font-family: var(--font-mono);
  font-size: var(--text-amount-sm);
  font-weight: var(--weight-semibold);
  color: var(--text-primary);
  margin-bottom: var(--space-1);
}

.stat-change {
  font-size: var(--text-xs);
  font-weight: var(--weight-medium);
}

.stat-change-positive {
  color: var(--status-success);
}

.stat-change-negative {
  color: var(--status-error);
}
```

### Transaction list item

```tsx
<div className="transaction-item">
  <div className="transaction-icon">
    <ExpenseIcon />
  </div>
  <div className="transaction-content">
    <p className="transaction-title">Groceries</p>
    <p className="transaction-meta">
      <span>Food</span>
      <span>•</span>
      <span>Today, 14:32</span>
    </p>
  </div>
  <div className="transaction-amount transaction-amount-negative">
    -2 450,00 ₽
  </div>
</div>
```

```css
.transaction-item {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  padding: var(--space-3);
  border-bottom: 1px solid var(--border-subtle);
  cursor: pointer;
  transition: background 150ms ease;
}

.transaction-item:hover {
  background: var(--bg-interactive);
}

.transaction-item:active {
  background: var(--bg-elevated);
}

.transaction-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  background: var(--bg-elevated);
  border-radius: 8px;
  color: var(--text-secondary);
}

.transaction-content {
  flex: 1;
  min-width: 0; /* allow text truncation */
}

.transaction-title {
  font-size: var(--text-base);
  font-weight: var(--weight-medium);
  color: var(--text-primary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  margin-bottom: var(--space-1);
}

.transaction-meta {
  font-size: var(--text-xs);
  color: var(--text-tertiary);
  display: flex;
  gap: var(--space-2);
}

.transaction-amount {
  font-family: var(--font-mono);
  font-size: var(--text-amount-sm);
  font-weight: var(--weight-semibold);
  white-space: nowrap;
}

.transaction-amount-positive {
  color: var(--status-success);
}

.transaction-amount-negative {
  color: var(--text-primary);
}
```

---

## Iconography

### Icon system

- Size: 24×24px (default), 20×20px (small), 16×16px (inline);
- Style: Outlined (2px stroke);
- Library: Lucide React или Heroicons;
- Color: inherit from parent text color.

**Common icons:**

- Dashboard: LayoutDashboard
- Calendar: Calendar
- Plan/AI: Sparkles
- Income: TrendingUp
- Expense: TrendingDown
- Debt: CreditCard
- Goal: Target
- Settings: Settings
- Add: Plus
- Edit: Pencil
- Delete: Trash2
- Check: Check
- Close: X
- Info: Info
- Warning: AlertTriangle
- Error: AlertCircle

---

## Motion and transitions

### Timing functions

```css
:root {
  --ease-out: cubic-bezier(0.16, 1, 0.3, 1);
  --ease-in: cubic-bezier(0.7, 0, 0.84, 0);
  --ease-in-out: cubic-bezier(0.65, 0, 0.35, 1);
}
```

### Durations

- Micro-interactions: 150ms (hover, focus);
- Sheet/modal enter: 250ms;
- Sheet/modal exit: 200ms;
- Page transitions: 300ms;
- Skeleton loading: 1500ms loop.

### Animations

```css
/* Fade in */
@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

/* Slide up */
@keyframes slideUp {
  from { 
    opacity: 0;
    transform: translateY(8px); 
  }
  to { 
    opacity: 1;
    transform: translateY(0); 
  }
}

/* Slide from bottom (sheet) */
@keyframes slideFromBottom {
  from { transform: translateY(100%); }
  to { transform: translateY(0); }
}

/* Pulse (loading dot) */
@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}
```

**Usage:**

```tsx
<div className="animate-fade-in">Content</div>

.animate-fade-in {
  animation: fadeIn 250ms var(--ease-out);
}
```

---

## Loading states

### Skeleton

```tsx
<div className="skeleton skeleton-text"></div>
<div className="skeleton skeleton-amount"></div>
```

```css
.skeleton {
  background: linear-gradient(
    90deg,
    var(--bg-subtle) 0%,
    var(--bg-interactive) 50%,
    var(--bg-subtle) 100%
  );
  background-size: 200% 100%;
  animation: shimmer 1.5s infinite;
  border-radius: 4px;
}

.skeleton-text {
  height: 1rem;
  width: 100%;
}

.skeleton-amount {
  height: 2rem;
  width: 60%;
}

@keyframes shimmer {
  0% { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}
```

### Spinner

```tsx
<div className="spinner"></div>
```

```css
.spinner {
  width: 24px;
  height: 24px;
  border: 2px solid var(--border-subtle);
  border-top-color: var(--accent-primary);
  border-radius: 50%;
  animation: spin 600ms linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}
```

---

## Modal and sheet patterns

### Bottom sheet

```tsx
<div className="sheet-overlay" onClick={close}>
  <div className="sheet" onClick={e => e.stopPropagation()}>
    <div className="sheet-handle"></div>
    <div className="sheet-header">
      <h2 className="sheet-title">Add Income</h2>
    </div>
    <div className="sheet-content">
      {/* Form content */}
    </div>
  </div>
</div>
```

```css
.sheet-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.6);
  z-index: 100;
  animation: fadeIn 200ms var(--ease-out);
}

.sheet {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  max-height: 90vh;
  background: var(--bg-elevated);
  border-radius: 16px 16px 0 0;
  animation: slideFromBottom 250ms var(--ease-out);
  overflow: hidden;
}

.sheet-handle {
  width: 32px;
  height: 4px;
  background: var(--border-strong);
  border-radius: 2px;
  margin: var(--space-3) auto var(--space-2);
}

.sheet-header {
  padding: var(--space-4);
  border-bottom: 1px solid var(--border-subtle);
}

.sheet-title {
  font-size: var(--text-h3);
  font-weight: var(--weight-semibold);
  color: var(--text-primary);
}

.sheet-content {
  padding: var(--space-4);
  overflow-y: auto;
  max-height: calc(90vh - 80px);
}
```

---

## Calendar specific styles

### Month grid

```css
.calendar-grid {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: var(--space-1);
}

.calendar-day {
  aspect-ratio: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: var(--space-2);
  border-radius: 8px;
  font-size: var(--text-sm);
  cursor: pointer;
  transition: background 150ms ease;
}

.calendar-day:hover {
  background: var(--bg-interactive);
}

.calendar-day-today {
  background: var(--accent-primary-muted);
  color: var(--accent-primary);
  font-weight: var(--weight-semibold);
}

.calendar-day-has-events::after {
  content: '';
  width: 4px;
  height: 4px;
  background: var(--accent-primary);
  border-radius: 50%;
  margin-top: var(--space-1);
}
```

---

## Responsive breakpoints

```css
/* Mobile first approach */

/* Extra small (default): 320px+ */
/* Primary target: 390px */

/* Small: 640px+ (large phones, small tablets) */
@media (min-width: 640px) {
  .container {
    max-width: 640px;
  }
}

/* Medium: 768px+ (tablets) */
@media (min-width: 768px) {
  .container {
    max-width: 768px;
  }
}
```

**Note:** Desktop не является приоритетом. При wider viewport application остаётся в centered mobile layout.

---

## Accessibility

### Focus indicators

```css
*:focus-visible {
  outline: 2px solid var(--accent-primary);
  outline-offset: 2px;
}

button:focus-visible {
  outline-offset: 0;
  box-shadow: 0 0 0 3px var(--accent-primary-muted);
}
```

### Touch targets

- Minimum 44×44px для всех interactive elements;
- Spacing между targets ≥ 8px;
- Tap feedback через :active state.

### Color contrast

- Text primary на base background: ≥ 7:1 (AAA);
- Text secondary на base background: ≥ 4.5:1 (AA);
- Interactive elements: ≥ 3:1 against background.

### Screen reader labels

```tsx
<button aria-label="Add income">
  <PlusIcon />
</button>

<div role="status" aria-live="polite">
  Balance updated
</div>
```

---

## Dark mode implementation

Application designed dark-first. Light mode — fallback.

```tsx
// Theme provider
export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState<'dark' | 'light' | 'system'>('dark');
  
  useEffect(() => {
    const root = document.documentElement;
    
    if (theme === 'system') {
      const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches 
        ? 'dark' 
        : 'light';
      root.setAttribute('data-theme', systemTheme);
    } else {
      root.setAttribute('data-theme', theme);
    }
  }, [theme]);
  
  return (
    <ThemeContext.Provider value={{ theme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}
```

---

## Component library

Используем **shadcn/ui** как base:

- Unstyled primitives от Radix UI;
- Tailwind-based styling;
- Copy-paste components (not npm package);
- Full control над customization.

**Customized components:**

- Button (with variants);
- Card;
- Input;
- Select;
- Dialog/Sheet;
- Toast;
- Badge;
- Tabs.

---

## Performance considerations

- Use CSS containment для cards: `contain: layout style paint;`;
- Lazy load off-screen calendar months;
- Virtualize long transaction lists (react-virtual);
- Optimize font loading: preload Inter woff2;
- Minimize layout shifts: skeleton loaders с fixed dimensions;
- Use transform/opacity для animations (GPU-accelerated).

---

## Design checklist

Before declaring UI component complete:

- [ ] Works on 390×844 viewport;
- [ ] Touch targets ≥ 44×44px;
- [ ] Focus states visible;
- [ ] Color contrast meets AA minimum;
- [ ] Loading states implemented;
- [ ] Error states handled;
- [ ] Dark mode renders correctly;
- [ ] Light mode fallback works;
- [ ] Animations smooth (60fps);
- [ ] Text readable without zoom;
- [ ] Spacing consistent with system;
- [ ] Icons sized correctly;
- [ ] Financial amounts use tabular nums;
- [ ] Status indicators clear.

---

## Summary

Design system создаёт:

1. **Consistent visual language** — всё выглядит как одна система;
2. **Developer efficiency** — reusable components ускоряют development;
3. **User confidence** — professional aesthetic вызывает trust;
4. **Maintainability** — централизованные tokens упрощают updates.

V1 UI должен быть production-ready: sharp, clear, confident.
