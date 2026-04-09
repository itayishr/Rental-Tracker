export const DEFAULT_STATUS = 'חדש';

export const STATUS_OPTIONS = [
  'חדש',
  'נוצר קשר',
  'מעקב',
  'נקבע סיור',
  'ביקרנו',
  'לא רלוונטי',
  'נסגר',
  'טיוטה'
];

export const STATUS_COLORS = {
  'חדש': 'bg-blue-100 text-blue-800 border-blue-200',
  'נוצר קשר': 'bg-violet-100 text-violet-800 border-violet-200',
  'מעקב': 'bg-indigo-100 text-indigo-800 border-indigo-200',
  'נקבע סיור': 'bg-amber-100 text-amber-800 border-amber-200',
  'ביקרנו': 'bg-brand-100 text-brand-800 border-brand-200',
  'לא רלוונטי': 'bg-slate-100 text-slate-600 border-slate-200',
  'נסגר': 'bg-emerald-100 text-emerald-800 border-emerald-200',
  'טיוטה': 'bg-slate-100 text-slate-500 border-slate-200'
};

export const getStatusBadgeClass = (status) => STATUS_COLORS[status] || STATUS_COLORS[DEFAULT_STATUS];
