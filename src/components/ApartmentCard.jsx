import React from 'react';
import { MapPin, Phone, MessageCircle, Calendar, ExternalLink, Pencil, Trash2, Star, ChevronDown, Loader2 } from 'lucide-react';
import { DEFAULT_STATUS, STATUS_OPTIONS, getStatusBadgeClass } from '../lib/status';

const ApartmentCard = ({ data, onEdit, onDelete, onTogglePriority, onStatusChange = () => {}, isStatusSaving = false }) => {
  const currentStatus = data.status || DEFAULT_STATUS;
  const statusOptions = STATUS_OPTIONS.includes(currentStatus) ? STATUS_OPTIONS : [currentStatus, ...STATUS_OPTIONS];
  const rent = parseInt(data.rent) || 0;
  const arnona = parseInt(data.arnona) || 0;
  const vaad = parseInt(data.vaad_bayit) || 0;
  
  // Auto-calculated logic: Arnona is bimonthly, so we divide by 2
  const totalMonthlyCost = rent + vaad + Math.round(arnona / 2);

  const formatCurrency = (val) => new Intl.NumberFormat('he-IL', { style: 'currency', currency: 'ILS', maximumFractionDigits: 0 }).format(val);

  // Group features
  const allFeatures = [
    data.has_mamad && 'ממ"ד',
    data.has_parking && 'חניה',
    data.has_elevator && 'מעלית',
    data.has_ac && 'מזגן',
    data.is_renovated && 'משופצת'
  ].filter(Boolean);

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden hover:shadow-md transition-shadow relative group">
      
      {/* Top Decoration - Priority/Action Bar */}
      <div className="absolute top-2 left-2 flex gap-1 z-10 opacity-0 group-hover:opacity-100 transition-opacity">
        <button 
          onClick={(e) => { e.stopPropagation(); onDelete(data.id); }}
          className="bg-white/90 hover:bg-red-50 text-slate-400 hover:text-red-600 p-1.5 rounded-lg border border-slate-200 shadow-sm transition-colors"
          title="מחק דירה"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
        <button 
          onClick={(e) => { e.stopPropagation(); onEdit(data); }}
          className="bg-white/90 hover:bg-slate-50 text-slate-400 hover:text-brand-600 p-1.5 rounded-lg border border-slate-200 shadow-sm transition-colors"
          title="ערוך פרטים"
        >
          <Pencil className="w-3.5 h-3.5" />
        </button>
      </div>

      <div className="absolute top-2 right-2 flex items-center gap-1.5 z-10">
        <button 
          onClick={(e) => { e.stopPropagation(); onTogglePriority(data.id); }}
          className={`p-1.5 rounded-lg border shadow-sm transition-all ${data.priority > 0 ? 'bg-yellow-50 border-yellow-200 text-yellow-500' : 'bg-white/90 text-slate-300 border-slate-100 hover:text-yellow-400'}`}
        >
          <Star className={`w-4 h-4 ${data.priority > 0 ? 'fill-current' : ''}`} />
        </button>
        <div className="relative">
          <select
            value={currentStatus}
            onChange={(event) => {
              event.stopPropagation();
              onStatusChange(data.id, event.target.value);
            }}
            onClick={(event) => event.stopPropagation()}
            disabled={isStatusSaving}
            className={`appearance-none text-[10px] font-black pr-6 pl-2 py-1 rounded-full border shadow-sm transition-opacity ${getStatusBadgeClass(currentStatus)} ${isStatusSaving ? 'opacity-70 cursor-wait' : 'cursor-pointer'}`}
            title="עדכן סטטוס"
          >
            {statusOptions.map((status) => (
              <option key={status} value={status}>
                {status}
              </option>
            ))}
          </select>
          {isStatusSaving ? (
            <Loader2 className="w-3 h-3 absolute right-2 top-1.5 text-slate-500 animate-spin pointer-events-none" />
          ) : (
            <ChevronDown className="w-3 h-3 absolute right-2 top-1.5 text-slate-500 pointer-events-none" />
          )}
        </div>
      </div>

      {/* Main Content Layout */}
      <div className="flex p-3 gap-4 pt-10">
        
        {/* Image Thumbnail */}
        <div className="w-28 h-28 bg-slate-100 rounded-xl flex flex-col items-center justify-center border border-slate-100 flex-shrink-0 relative overflow-hidden shadow-inner">
          {data.photo_url ? (
            <img src={data.photo_url} alt="Apartment" className="absolute inset-0 w-full h-full object-cover" />
          ) : (
            <span className="text-slate-400 text-[10px] text-center px-2 z-10 font-bold uppercase tracking-wider">אין תמונה</span>
          )}
        </div>

        {/* Details & Pricing Stacked Tightly */}
        <div className="flex-1 min-w-0 flex flex-col justify-between py-0.5">
          <div className="truncate">
            <h3 className="font-black text-slate-900 text-lg leading-tight truncate mb-1" title={data.address}>
              {data.address || 'כתובת לא הוזנה'}
            </h3>
            <div className="flex items-center gap-1.5 text-slate-500 text-sm flex-wrap font-medium">
              {data.rooms && <span><span className="font-bold text-slate-700">{data.rooms}</span> חדרים</span>}
              {data.rooms && data.floor !== undefined && <span>•</span>}
              {data.floor !== undefined && <span>קומה <span className="font-bold text-slate-700">{data.floor}</span></span>}
              {data.entry_date && (
                <>
                  <span>•</span>
                  <span className="flex items-center gap-1 text-slate-400 text-xs">
                    <Calendar className="w-3 h-3" />
                    <span dir="ltr">{new Date(data.entry_date).toLocaleDateString('he-IL', {day: '2-digit', month: '2-digit'})}</span>
                  </span>
                </>
              )}
            </div>
          </div>
          
          <div className="flex items-end justify-between gap-1">
            <div className="bg-brand-50/50 px-2.5 py-1.5 rounded-xl border border-brand-100 flex items-baseline gap-2">
              <div className="flex flex-col">
                <span className="text-[9px] text-brand-600 font-black uppercase leading-none mb-0.5">סה״כ לחודש</span>
                <span className="font-black text-brand-700 text-xl leading-none">{formatCurrency(totalMonthlyCost)}</span>
              </div>
              <div className="text-[10px] text-slate-400 border-r border-brand-200 pr-2 mr-1 flex flex-col">
                 <span>{formatCurrency(rent)}</span>
                 <span className="opacity-70">ועד {formatCurrency(vaad)}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Footer: Amenities & Actions */}
      <div className="px-3 py-2 border-t border-slate-100 flex items-center justify-between gap-2 overflow-x-auto no-scrollbar">
        <div className="flex gap-1.5">
          {allFeatures.slice(0, 3).map(f => (
            <span key={f} className="text-[9px] font-bold bg-slate-50 text-slate-500 border border-slate-200 px-2 py-0.5 rounded-lg whitespace-nowrap">
              {f}
            </span>
          ))}
          {allFeatures.length > 3 && (
            <span className="text-[9px] font-bold text-slate-300">+{allFeatures.length - 3}</span>
          )}
        </div>

        <div className="flex items-center gap-1 shrink-0">
          <ActionIcon 
            onClick={() => data.link && window.open(data.link, '_blank')} 
            icon={<ExternalLink className="w-3.5 h-3.5" />} 
            title="מקור"
            disabled={!data.link}
          />
          <ActionIcon 
            onClick={() => window.open(`https://waze.com/ul?q=${encodeURIComponent(data.address)}`, '_blank')} 
            icon={<MapPin className="w-3.5 h-3.5" />} 
            color="text-blue-500" 
            title="נווט"
          />
          <ActionIcon 
            onClick={() => window.open(`https://wa.me/?text=${encodeURIComponent('היי, פונה לגבי הדירה ב' + data.address)}`, '_blank')} 
            icon={<MessageCircle className="w-3.5 h-3.5" />} 
            color="text-emerald-500" 
            title="הודעה"
          />
          <button 
            onClick={() => window.open(`tel:${data.contact_phone || ''}`)}
            className="bg-brand-600 hover:bg-brand-700 text-white font-bold px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-all shadow-sm ml-1"
          >
            <Phone className="w-3.5 h-3.5" />
            <span className="text-xs">התקשר</span>
          </button>
        </div>
      </div>
    </div>
  );
};

const ActionIcon = ({ onClick, icon, color = "text-slate-500", title, disabled = false }) => (
  <button 
    onClick={(e) => { e.stopPropagation(); !disabled && onClick(); }}
    disabled={disabled}
    className={`p-1.5 bg-white hover:bg-slate-50 text-slate-500 border border-slate-200 rounded-lg transition-colors shadow-sm ${disabled ? 'opacity-30 cursor-not-allowed' : ''}`}
    title={title}
  >
    {React.cloneElement(icon, { className: `${icon.props.className} ${color}` })}
  </button>
);

export default ApartmentCard;
