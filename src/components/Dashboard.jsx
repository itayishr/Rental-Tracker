import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { SlidersHorizontal, X } from 'lucide-react';
import ApartmentCard from './ApartmentCard';
import { apiFetch } from '../lib/api';
import { DEFAULT_STATUS, STATUS_OPTIONS, getStatusBadgeClass } from '../lib/status';

export default function Dashboard() {
  const [apartments, setApartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedStatuses, setSelectedStatuses] = useState([]);
  const [savingStatusIds, setSavingStatusIds] = useState(new Set());
  const navigate = useNavigate();

  const fetchApartments = () => {
    apiFetch('/api/apartments')
      .then(res => res.json())
      .then(data => {
        // Deduplicate by ID to prevent key warnings
        const seen = new Set();
        const unique = data.filter(apt => {
          if (seen.has(apt.id)) return false;
          seen.add(apt.id);
          return true;
        });
        
        // Sort by priority first, then createdAt
        const sorted = unique.sort((a, b) => {
          if (b.priority !== a.priority) return b.priority - a.priority;
          return new Date(b.createdAt) - new Date(a.createdAt);
        });
        setApartments(sorted);
        setLoading(false);
      })
      .catch(err => {
        console.error("Error fetching defaults, using empty", err);
        setLoading(false);
      });
  };

  const statusOptions = useMemo(() => {
    const fromData = apartments.map((apt) => apt.status || DEFAULT_STATUS);
    return [...new Set([...STATUS_OPTIONS, ...fromData])];
  }, [apartments]);

  const statusCounts = useMemo(() => {
    return apartments.reduce((acc, apt) => {
      const status = apt.status || DEFAULT_STATUS;
      acc[status] = (acc[status] || 0) + 1;
      return acc;
    }, {});
  }, [apartments]);

  const filteredApartments = useMemo(() => {
    if (selectedStatuses.length === 0) return apartments;
    return apartments.filter((apt) => selectedStatuses.includes(apt.status || DEFAULT_STATUS));
  }, [apartments, selectedStatuses]);

  useEffect(() => {
    fetchApartments();
  }, []);

  useEffect(() => {
    setSelectedStatuses((prev) => prev.filter((status) => statusOptions.includes(status)));
  }, [statusOptions]);

  const toggleStatusFilter = (status) => {
    setSelectedStatuses((prev) => (
      prev.includes(status) ? prev.filter((value) => value !== status) : [...prev, status]
    ));
  };

  const clearStatusFilters = () => {
    setSelectedStatuses([]);
  };

  const handleEdit = (apt) => {
    navigate(`/add?editId=${apt.id}`);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('האם אתה בטוח שברצונך למחוק דירה זו?')) return;
    try {
      const res = await apiFetch(`/api/apartments/${id}`, { method: 'DELETE' });
      if (res.ok) fetchApartments();
    } catch (err) {
      alert('מחיקה נכשלה');
    }
  };

  const handleTogglePriority = async (id) => {
    const apt = apartments.find(a => a.id === id);
    if (!apt) return;
    const newPriority = apt.priority > 0 ? 0 : 1;
    
    try {
      const res = await apiFetch('/api/apartments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...apt, priority: newPriority })
      });
      if (res.ok) fetchApartments();
    } catch (err) {
      console.error('Priority update failed');
    }
  };

  const handleStatusChange = async (id, nextStatus) => {
    const currentApartment = apartments.find((apt) => apt.id === id);
    if (!currentApartment) return;

    const previousStatus = currentApartment.status || DEFAULT_STATUS;
    if (previousStatus === nextStatus) return;

    setApartments((prev) => prev.map((apt) => (
      apt.id === id ? { ...apt, status: nextStatus } : apt
    )));
    setSavingStatusIds((prev) => {
      const next = new Set(prev);
      next.add(id);
      return next;
    });

    try {
      const res = await apiFetch('/api/apartments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...currentApartment, status: nextStatus })
      });

      if (!res.ok) {
        throw new Error('Status update failed');
      }

      const saved = await res.json();
      setApartments((prev) => prev.map((apt) => (
        apt.id === id ? { ...apt, ...saved } : apt
      )));
    } catch (err) {
      setApartments((prev) => prev.map((apt) => (
        apt.id === id ? { ...apt, status: previousStatus } : apt
      )));
      alert('עדכון סטטוס נכשל, נסה שוב');
    } finally {
      setSavingStatusIds((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }
  };

  if (loading) {
    return <div className="flex justify-center items-center py-20 text-slate-500 font-bold">טוען נתונים...</div>;
  }

  if (apartments.length === 0) {
    return (
      <div className="text-center py-20 bg-white rounded-2xl border border-dashed border-slate-300 shadow-sm">
        <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4">
           <span className="text-2xl">🏠</span>
        </div>
        <h2 className="text-xl font-bold text-slate-800 mb-2">אין דירות במעקב עדיין</h2>
        <p className="text-slate-500 mb-6">התחל לעקוב אחרי דירות פוטנציאליות ע״י לחיצה על הכפתור למעלה</p>
        <button onClick={() => navigate('/add')} className="bg-brand-600 text-white font-bold px-6 py-2.5 rounded-xl hover:bg-brand-700 transition-all shadow-md">הוסף דירה ראשונה</button>
      </div>
    );
  }

  return (
    <div className="space-y-4 pb-12">
      <section className="bg-white border border-slate-200 rounded-2xl shadow-sm p-4">
        <div className="flex items-center justify-between gap-3 mb-3">
          <div className="flex items-center gap-2 text-slate-700">
            <SlidersHorizontal className="w-4 h-4" />
            <span className="font-black text-sm">סינון לפי סטטוס</span>
          </div>
          {selectedStatuses.length > 0 && (
            <button
              onClick={clearStatusFilters}
              className="text-xs font-bold text-slate-500 hover:text-slate-700 flex items-center gap-1 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg px-2 py-1 transition-colors"
            >
              <X className="w-3.5 h-3.5" />
              נקה סינון
            </button>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          {statusOptions.map((status) => {
            const active = selectedStatuses.includes(status);
            return (
              <button
                key={status}
                onClick={() => toggleStatusFilter(status)}
                className={`text-xs font-bold px-3 py-1.5 rounded-full border transition-all flex items-center gap-2 ${
                  active
                    ? `${getStatusBadgeClass(status)} shadow-sm`
                    : 'bg-white text-slate-500 border-slate-200 hover:border-slate-300 hover:text-slate-700'
                }`}
              >
                <span>{status}</span>
                <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${active ? 'bg-white/80 text-slate-700' : 'bg-slate-100 text-slate-500'}`}>
                  {statusCounts[status] || 0}
                </span>
              </button>
            );
          })}
        </div>
      </section>

      {filteredApartments.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-2xl border border-dashed border-slate-300 shadow-sm">
          <h3 className="font-black text-slate-800 mb-1">אין דירות בסטטוס שנבחר</h3>
          <p className="text-slate-500 text-sm mb-4">נסה לבחור סטטוסים אחרים או לנקות סינון</p>
          <button
            onClick={clearStatusFilters}
            className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold px-4 py-2 rounded-xl transition-colors"
          >
            נקה סינון
          </button>
        </div>
      ) : (
        filteredApartments.map((apt) => (
          <ApartmentCard 
            key={apt.id} 
            data={apt} 
            onEdit={handleEdit}
            onDelete={handleDelete}
            onTogglePriority={handleTogglePriority}
            onStatusChange={handleStatusChange}
            isStatusSaving={savingStatusIds.has(apt.id)}
          />
        ))
      )}
    </div>
  );
}
