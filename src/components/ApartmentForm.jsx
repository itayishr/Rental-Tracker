import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import { ArrowRight, Save, ImagePlus, MapPin, Search, Loader2, DownloadCloud, Check, X, AlertCircle, Pencil } from 'lucide-react';
import { MapContainer, TileLayer, Marker, useMap } from 'react-leaflet';
import { apiFetch } from '../lib/api';
import { STATUS_OPTIONS } from '../lib/status';

// Component to dynamically recenter map when coordinates change
function RecenterMap({ lat, lon }) {
  const map = useMap();
  useEffect(() => {
    const latNum = parseFloat(lat);
    const lonNum = parseFloat(lon);
    if (!isNaN(latNum) && !isNaN(lonNum)) {
      map.setView([latNum, lonNum], 16);
    }
  }, [lat, lon, map]);
  return null;
}

const ApartmentForm = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const editId = searchParams.get('editId');

  const [formData, setFormData] = useState({
    link: '',
    address: '',
    lat: 32.0853,
    lon: 34.7818,
    status: 'חדש',
    rent: '',
    arnona: '',
    vaad_bayit: '',
    rooms: '',
    floor: '',
    entry_date: '',
    contact_name: '',
    contact_phone: '',
    has_mamad: false,
    has_ac: false,
    has_elevator: false,
    has_solar_heater: false,
    has_parking: false,
    is_renovated: false,
    notes: '',
    photo_url: '',
  });

  const [addressSearch, setAddressSearch] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [loading, setLoading] = useState(false);
  const [isScraping, setIsScraping] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [errors, setErrors] = useState({});

  // Fetch data if in Edit mode
  useEffect(() => {
    if (editId) {
      setLoading(true);
      apiFetch('/api/apartments')
        .then(res => res.json())
        .then(data => {
          const apt = data.find(a => a.id === editId);
          if (apt) {
            setFormData(apt);
            setAddressSearch(apt.address);
          }
          setLoading(false);
        })
        .catch(() => setLoading(false));
    }
  }, [editId]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
    // Clear validation error when user types
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: null }));
    }
  };

  const handleChipToggle = (name) => {
    setFormData(prev => ({
      ...prev,
      [name]: !prev[name]
    }));
  };

  const fetchAddressSuggestions = async (query) => {
    if (!query || query.length < 3) return;
    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query + ' תל אביב')}&limit=5`);
      const data = await res.json();
      setSuggestions(data);
    } catch (e) {
      console.error('Error fetching address', e);
    }
  };

  const selectAddress = (suggestion) => {
    const shortAddress = suggestion.display_name.split(',')[0];
    setAddressSearch(shortAddress);
    setFormData(prev => ({
      ...prev,
      address: shortAddress,
      lat: parseFloat(suggestion.lat),
      lon: parseFloat(suggestion.lon)
    }));
    setShowDropdown(false);
    if (errors['address']) setErrors(prev => ({...prev, address: null}));
  };

  const handleScrapeYad2 = async () => {
    if (!formData.link) {
      alert("אנא הזן קישור ליד2 קודם");
      return;
    }
    setIsScraping(true);
    try {
      const res = await apiFetch(`/api/scrape?url=${encodeURIComponent(formData.link)}`);
      const data = await res.json();
      if (data.error) throw new Error(data.error);

      setFormData(prev => ({
        ...prev,
        ...data,
        has_ac: data.ac !== undefined ? data.ac : prev.has_ac,
        has_parking: data.parking !== undefined ? data.parking : prev.has_parking,
        has_elevator: data.elevator !== undefined ? data.elevator : prev.has_elevator,
      }));

      if (data.address) {
        setAddressSearch(data.address);
        const hasCoordinates =
          data.lat !== null &&
          data.lon !== null &&
          data.lat !== undefined &&
          data.lon !== undefined &&
          !Number.isNaN(Number(data.lat)) &&
          !Number.isNaN(Number(data.lon));

        // Only geocode when Yad2 didn't provide exact coordinates.
        if (!hasCoordinates) {
          fetchAddressSuggestions(data.address);
        } else {
          setSuggestions([]);
          setShowDropdown(false);
        }
      }
    } catch (err) {
      alert("נכשל חילוץ הנתונים. נסה שנית או הזן ידנית. " + err.message);
    } finally {
      setIsScraping(false);
    }
  };

  const validate = () => {
    const newErrors = {};
    if (!formData.address) newErrors.address = 'חובה להזין כתובת';
    if (!formData.rent) newErrors.rent = 'חובה להזין שכר דירה';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = async (e, isDraft = false) => {
    if (e) e.preventDefault();
    if (!isDraft && !validate()) {
      alert("יש למלא את כל שדות החובה");
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
    
    setLoading(true);
    // Safety: ensure we don't save with an empty address or price if they bypassed validation
    if (!formData.address || !formData.rent) {
      setLoading(false);
      return;
    }

    try {
      const res = await apiFetch('/api/apartments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({...formData, status: isDraft ? 'טיוטה' : formData.status})
      });
      if (!res.ok) throw new Error("Save failed");
      
      setSaveSuccess(true);
      // Wait for the success animation to be seen before navigating
      setTimeout(() => navigate('/'), 1200);
    } catch (err) {
      alert("שגיאה בשמירה: " + err.message);
      setLoading(false);
    }
  };

  const rent = parseInt(formData?.rent || 0) || 0;
  const arnona = parseInt(formData?.arnona || 0) || 0;
  const vaad = parseInt(formData?.vaad_bayit || 0) || 0;
  const totalCost = rent + vaad + Math.round(arnona / 2);

  if (loading && editId) {
    return (
      <div className="flex flex-col items-center justify-center py-32 text-slate-500 font-bold gap-4 h-[70vh]">
        <Loader2 className="w-10 h-10 animate-spin text-brand-500" />
        <span className="text-lg">טוען פרטי דירה...</span>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl shadow-lg border border-slate-100 overflow-hidden mb-12 relative max-w-2xl mx-auto">
      
      {/* Success Overlay - Minimalist Toast-style */}
      {saveSuccess && (
        <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 z-50 flex items-center justify-center p-4 pointer-events-none">
          <div className="bg-white/95 backdrop-blur-md rounded-2xl px-6 py-5 flex flex-col items-center shadow-2xl border border-emerald-100 animate-in zoom-in duration-300 max-w-[240px] w-full pointer-events-auto ring-1 ring-emerald-50">
            <div className="w-12 h-12 bg-emerald-500 rounded-xl flex items-center justify-center mb-3 shadow-lg shadow-emerald-100">
              <Check className="w-6 h-6 text-white" />
            </div>
            <h3 className="text-lg font-black text-slate-800 tracking-tight">נשמר בהצלחה!</h3>
            <div className="mt-2 flex items-center gap-1.5">
               <Loader2 className="w-3 h-3 animate-spin text-emerald-500" />
               <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">מעדכן רשימה...</span>
            </div>
          </div>
        </div>
      )}

      <div className="bg-white px-6 py-4 border-b border-slate-100 flex items-center justify-between sticky top-0 z-40">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-brand-50 text-brand-600 rounded-xl flex items-center justify-center font-bold shadow-sm">
             {editId ? <Pencil className="w-5 h-5" /> : <Save className="w-5 h-5" />}
          </div>
          <div>
            <h2 className="font-black text-slate-900 text-lg leading-none">{editId ? 'עריכת דירה' : 'הוספת דירה חדשה'}</h2>
            <p className="text-slate-400 text-xs mt-1 font-medium">{editId ? 'עדכן פרטים וסטטוס מעקב' : 'מלא פרטים ידנית או ייבא מיד2'}</p>
          </div>
        </div>
        <Link to="/" className="text-slate-400 hover:text-slate-700 bg-slate-50 p-2 rounded-xl transition-colors">
          <ArrowRight className="w-5 h-5 rtl:-scale-x-100" />
        </Link>
      </div>

      <form className="p-6 space-y-8" onSubmit={(e) => handleSave(e, false)}>

        {/* SECTION: URL Import & Image Preview */}
        {!editId && (
          <section className="bg-brand-50/30 p-5 rounded-2xl border border-brand-100/50 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-brand-500/5 rounded-full -mr-16 -mt-16 blur-3xl"></div>
            
            <div className="flex flex-col md:flex-row gap-5 mb-4 items-start">
               {/* Image Preview Box */}
               <div className="w-24 h-24 bg-white rounded-xl border-2 border-brand-100 flex-shrink-0 relative overflow-hidden shadow-sm flex items-center justify-center">
                 {formData.photo_url ? (
                   <img src={formData.photo_url} alt="Preview" className="w-full h-full object-cover" />
                 ) : (
                   <ImagePlus className="w-8 h-8 text-brand-200" />
                 )}
                 {isScraping && (
                   <div className="absolute inset-0 bg-white/60 flex items-center justify-center">
                     <Loader2 className="w-5 h-5 animate-spin text-brand-500" />
                   </div>
                 )}
               </div>
               
               <div className="flex-1">
                 <label className="block text-sm font-black text-brand-900 mb-1">קישור מהיר מיד2 (מומלץ)</label>
                 <p className="text-[11px] text-brand-600/70 mb-4 font-medium italic leading-tight">נשתמש בבוט שלנו כדי לחלץ כתובת, מחיר, חדרים ותמונות עבורך</p>
               </div>
            </div>

            <div className="flex gap-2 items-stretch relative">
              <input 
                type="url" 
                name="link" 
                value={formData.link} 
                onChange={handleChange} 
                disabled={isScraping} 
                className="flex-1 rounded-xl border-brand-200 border-2 p-3.5 bg-white text-left font-medium focus:ring-4 focus:ring-brand-100 focus:outline-none transition-all disabled:opacity-50 text-sm shadow-sm" 
                dir="ltr" 
                placeholder="https://www.yad2.co.il/..." 
              />
              <button 
                type="button" 
                onClick={handleScrapeYad2} 
                disabled={isScraping} 
                className={`text-white px-5 rounded-xl flex items-center justify-center shadow-lg transition-all font-bold ${isScraping ? 'bg-slate-800 cursor-wait' : 'bg-brand-600 hover:bg-brand-700 active:scale-95 shadow-brand-200'}`}
              >
                {isScraping ? (
                  <div className="flex items-center gap-2">
                    <Loader2 className="w-5 h-5 animate-spin text-brand-400" />
                    <span className="text-sm font-black text-white">מייבא...</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <DownloadCloud className="w-5 h-5" />
                    <span>ייבא</span>
                  </div>
                )}
              </button>
            </div>
          </section>
        )}

        {/* SECTION: Location */}
        <section className="space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-2">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-brand-500 rounded-full"></div>
              <h3 className="font-black text-slate-800 uppercase tracking-wide text-xs">מיקום הנכס</h3>
            </div>
          </div>
          
          <div className="relative z-30">
            <div className="relative">
              <input 
                type="text" 
                value={addressSearch} 
                onChange={(e) => {
                  setAddressSearch(e.target.value);
                  fetchAddressSuggestions(e.target.value);
                  setShowDropdown(true);
                }} 
                onFocus={() => setShowDropdown(true)}
                className={`w-full rounded-xl border-2 ${errors.address ? 'border-red-400 bg-red-50' : 'border-slate-100 bg-slate-50 shadow-inner'} p-3.5 pr-11 focus:bg-white focus:border-brand-500 focus:ring-4 focus:ring-brand-50 focus:outline-none transition-all font-bold`} 
                placeholder="הכנס רחוב ומספר בית..." 
              />
              <Search className="w-5 h-5 text-slate-400 absolute right-4 top-4" />
            </div>
            {errors.address && <p className="text-red-500 text-xs mt-2 font-bold flex items-center gap-1"><AlertCircle className="w-3.5 h-3.5" />{errors.address}</p>}

            {showDropdown && suggestions.length > 0 && (
              <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-slate-100 rounded-2xl shadow-2xl overflow-hidden flex flex-col z-50 ring-1 ring-slate-200">
                {suggestions.map((s, i) => (
                  <button key={i} type="button" className="text-right px-5 py-3 hover:bg-slate-50 border-b border-slate-50 last:border-0 text-slate-700 text-sm font-bold transition-colors" onClick={() => selectAddress(s)}>
                    {s.display_name}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="h-44 w-full rounded-2xl overflow-hidden border-2 border-slate-100 shadow-inner z-0 relative">
            {!isNaN(parseFloat(formData.lat)) && !isNaN(parseFloat(formData.lon)) ? (
              <MapContainer center={[parseFloat(formData.lat), parseFloat(formData.lon)]} zoom={16} zoomControl={false} scrollWheelZoom={false} className="w-full h-full">
                <TileLayer url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png" />
                <Marker position={[parseFloat(formData.lat), parseFloat(formData.lon)]} />
                <RecenterMap lat={formData.lat} lon={formData.lon} />
              </MapContainer>
            ) : (
              <div className="w-full h-full bg-slate-50 flex items-center justify-center text-slate-400 text-xs">המפה אינה זמינה לכתובת זו</div>
            )}
            <div className="absolute inset-x-0 bottom-3 text-center pointer-events-none z-20">
              <span className="bg-white/90 backdrop-blur shadow-sm text-[10px] px-3 py-1.5 rounded-full font-black text-slate-600 border border-slate-200 uppercase tracking-tighter">המיקום במפה מתעדכן אוטומטית</span>
            </div>
          </div>
        </section>

        {/* SECTION: Pricing */}
        <section className="space-y-4">
          <div className="flex items-center gap-2 border-b border-slate-100 pb-2">
            <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
            <h3 className="font-black text-slate-800 uppercase tracking-wide text-xs">הוצאות ושכר דירה</h3>
          </div>
          
          <div className="grid grid-cols-2 gap-5">
            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1.5 mr-1">שכר דירה (חודשי)</label>
              <div className="relative">
                <input type="number" name="rent" value={formData.rent} onChange={handleChange} className={`w-full rounded-xl border-2 ${errors.rent ? 'border-red-400 bg-red-50' : 'border-slate-100 bg-slate-50 shadow-inner'} p-3.5 pl-8 focus:bg-white focus:border-brand-500 focus:outline-none transition-all font-black text-lg`} placeholder="0" />
                <span className="absolute left-4 top-4 text-slate-400 font-bold">₪</span>
              </div>
              {errors.rent && <p className="text-red-500 text-xs mt-2 font-bold flex items-center gap-1"><AlertCircle className="w-3.5 h-3.5" />{errors.rent}</p>}
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1.5 mr-1">ועד בית</label>
              <div className="relative">
                <input type="number" name="vaad_bayit" value={formData.vaad_bayit} onChange={handleChange} className="w-full rounded-xl border-2 border-slate-100 bg-slate-50 shadow-inner p-3.5 pl-8 focus:bg-white focus:border-brand-500 focus:outline-none transition-all font-black" placeholder="0" />
                <span className="absolute left-4 top-4 text-slate-400 font-bold">₪</span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-5 items-end">
            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1.5 mr-1">ארנונה (לחודשיים)</label>
              <div className="relative">
                <input type="number" name="arnona" value={formData.arnona} onChange={handleChange} className="w-full rounded-xl border-2 border-slate-100 bg-slate-50 shadow-inner p-3.5 pl-8 focus:bg-white focus:border-brand-500 focus:outline-none transition-all font-black" placeholder="0" />
                <span className="absolute left-4 top-4 text-slate-400 font-bold">₪</span>
              </div>
            </div>
            <div className="bg-brand-600 rounded-xl p-3.5 flex flex-col justify-center shadow-lg shadow-brand-100">
              <label className="block text-[10px] font-black text-brand-100 uppercase tracking-tighter mb-0.5">סה״כ לתשלום בחודש</label>
              <div className="flex items-center gap-1">
                <span className="text-white font-black text-2xl leading-none">{totalCost.toLocaleString()}</span>
                <span className="text-brand-200 font-bold text-lg">₪</span>
              </div>
            </div>
          </div>
        </section>

        {/* SECTION: Details */}
        <section className="space-y-4">
          <div className="flex items-center gap-2 border-b border-slate-100 pb-2">
            <div className="w-2 h-2 bg-emerald-500 rounded-full"></div>
            <h3 className="font-black text-slate-800 uppercase tracking-wide text-xs">פרטי הנכס וסטטוס</h3>
          </div>

          <div className="grid grid-cols-2 gap-5">
            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1.5 mr-1">חדרים</label>
              <input type="number" step="0.5" name="rooms" value={formData.rooms} onChange={handleChange} className="w-full rounded-xl border-2 border-slate-100 bg-slate-50 shadow-inner p-3.5 focus:bg-white focus:border-brand-500 focus:outline-none transition-all font-black" placeholder="לדוגמא 2.5" />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1.5 mr-1">קומה</label>
              <input type="number" name="floor" value={formData.floor} onChange={handleChange} className="w-full rounded-xl border-2 border-slate-100 bg-slate-50 shadow-inner p-3.5 focus:bg-white focus:border-brand-500 focus:outline-none transition-all font-black" placeholder="0 = קרקע" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-5">
            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1.5 mr-1">תאריך כניסה</label>
              <input type="date" name="entry_date" value={formData.entry_date} onChange={handleChange} className="w-full rounded-xl border-2 border-slate-100 bg-slate-50 shadow-inner p-3.5 focus:bg-white focus:border-brand-500 focus:outline-none transition-all font-bold text-slate-700" />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1.5 mr-1">סטטוס מעקב</label>
              <select name="status" value={formData.status} onChange={handleChange} className="w-full rounded-xl border-2 border-slate-100 bg-slate-50 shadow-inner p-3.5 focus:bg-white focus:border-brand-500 focus:outline-none transition-all font-black text-slate-800 appearance-none bg-no-repeat bg-[right_0.5rem_center] cursor-pointer">
                {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          </div>
        </section>

        {/* SECTION: Contact */}
        <section className="space-y-4">
          <div className="grid grid-cols-2 gap-5">
            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1.5 mr-1">שם איש קשר</label>
              <input type="text" name="contact_name" value={formData.contact_name} onChange={handleChange} className="w-full rounded-xl border-2 border-slate-100 bg-slate-50 shadow-inner p-3.5 focus:bg-white focus:border-brand-500 focus:outline-none transition-all font-bold" placeholder="לדוגמא: רונית" />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1.5 mr-1">טלפון ליצירת קשר</label>
              <input type="tel" name="contact_phone" value={formData.contact_phone} onChange={handleChange} className="w-full rounded-xl border-2 border-slate-100 bg-slate-50 shadow-inner p-3.5 text-left focus:bg-white focus:border-brand-500 focus:outline-none transition-all font-bold" dir="ltr" placeholder="05X-XXXXXXX" />
            </div>
          </div>
        </section>

        {/* SECTION: Amenities */}
        <section className="space-y-4">
          <div className="flex items-center gap-2 border-b border-slate-100 pb-2">
            <div className="w-2 h-2 bg-sky-500 rounded-full"></div>
            <h3 className="font-black text-slate-800 uppercase tracking-wide text-xs">הצ'קליסט הישראלי</h3>
          </div>
          
          <div className="flex flex-wrap gap-2.5">
            <AmenityChip label="ממ״ד" active={formData.has_mamad} onClick={() => handleChipToggle('has_mamad')} />
            <AmenityChip label="מזגן" active={formData.has_ac} onClick={() => handleChipToggle('has_ac')} />
            <AmenityChip label="מעלית" active={formData.has_elevator} onClick={() => handleChipToggle('has_elevator')} />
            <AmenityChip label="חניה" active={formData.has_parking} onClick={() => handleChipToggle('has_parking')} />
            <AmenityChip label="דוד שמש" active={formData.has_solar_heater} onClick={() => handleChipToggle('has_solar_heater')} />
            <AmenityChip label="משופצת" active={formData.is_renovated} onClick={() => handleChipToggle('is_renovated')} />
          </div>
        </section>

        {/* Action Buttons */}
        <div className="pt-8 border-t border-slate-100 flex gap-4">
          <button 
            type="submit" 
            disabled={loading || isScraping}
            className={`flex-1 font-black py-4 rounded-2xl flex items-center justify-center gap-3 shadow-lg transition-all active:scale-[0.98] ${loading ? 'bg-slate-100 text-slate-400 cursor-not-allowed' : 'bg-brand-600 hover:bg-brand-700 text-white shadow-brand-200'}`}
          >
            {loading ? <Loader2 className="w-6 h-6 animate-spin" /> : <Save className="w-6 h-6" />}
            <span className="text-lg">{editId ? 'עדכן דירה' : 'שמור דירה'}</span>
          </button>
          <button 
            type="button" 
            onClick={(e) => handleSave(e, true)} 
            disabled={loading || isScraping}
            className="px-6 bg-white hover:bg-slate-50 border-2 border-slate-100 text-slate-700 font-black py-4 rounded-2xl transition-all active:scale-[0.98] shadow-sm disabled:opacity-50"
          >
            {editId ? 'ביטול' : 'שמור טיוטה'}
          </button>
        </div>

      </form>
    </div>
  );
};

const AmenityChip = ({ label, active, onClick }) => {
  return (
    <button 
      type="button" 
      onClick={onClick}
      className={`px-5 py-2.5 text-xs font-black rounded-2xl flex items-center gap-2 border-2 transition-all ${
        active 
        ? 'bg-brand-600 text-white border-brand-600 shadow-md shadow-brand-100' 
        : 'bg-white text-slate-400 border-slate-100 hover:border-slate-200 hover:text-slate-600'
      }`}
    >
      {active ? <Check className="w-3.5 h-3.5 stroke-[3]" /> : <div className="w-3.5 h-3.5" />}
      {label}
    </button>
  );
}

export default ApartmentForm;
