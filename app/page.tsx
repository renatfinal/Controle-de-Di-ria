'use client';

import { useState, useMemo, useEffect } from 'react';
import { 
  format, 
  addMonths, 
  subMonths, 
  startOfMonth, 
  endOfMonth, 
  eachDayOfInterval, 
  isSameMonth, 
  isSameDay, 
  startOfWeek, 
  endOfWeek,
  setMonth,
  setYear,
  getYear
} from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, Pencil, Plus, Trash2, X, Wallet, AlignLeft, FileText, Camera, User, Mail, Phone, Lock, ArrowRight, LogIn, Eye, EyeOff } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

type DailyEntry = {
  id: string;
  label: string;
  value: string; // Store as string for easier input handling
};

const INITIAL_RECORDS: Record<string, DailyEntry[]> = {
  '2026-05-03': [{ id: '1', label: 'Almoço (R$)', value: '44,00' }, { id: '2', label: 'Janta (R$)', value: '44,00' }],
  '2026-05-04': [{ id: '1', label: 'Almoço (R$)', value: '44,00' }, { id: '2', label: 'Janta (R$)', value: '44,00' }],
  '2026-05-05': [{ id: '1', label: 'Almoço (R$)', value: '44,00' }, { id: '2', label: 'Janta (R$)', value: '44,00' }],
  '2026-05-06': [{ id: '1', label: 'Almoço (R$)', value: '44,00' }, { id: '2', label: 'Janta (R$)', value: '44,00' }],
  '2026-05-09': [{ id: '1', label: 'Almoço (R$)', value: '44,00' }, { id: '2', label: 'Janta (R$)', value: '44,00' }],
};

export default function ControleDiariaApp() {
  const [currentDate, setCurrentDate] = useState(new Date(2026, 4, 9)); // May 9, 2026
  const [displayedMonth, setDisplayedMonth] = useState(startOfMonth(new Date(2026, 4, 9)));
  const [records, setRecords] = useState<Record<string, DailyEntry[]>>(INITIAL_RECORDS);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [view, setView] = useState<'welcome' | 'register' | 'login' | 'calendar' | 'annual-balance' | 'blank'>('welcome');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [registerPassword, setRegisterPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [isSaved, setIsSaved] = useState(false);
  const [userProfile, setUserProfile] = useState({
    name: '',
    lastName: '',
    email: '',
    phone: '',
    photoUrl: ''
  });

  const formatPhone = (value: string) => {
    let v = value.replace(/\D/g, '');
    if (v.length > 11) v = v.substring(0, 11);
    v = v.replace(/^(\d{2})(\d)/g, '($1) $2');
    v = v.replace(/(\d)(\d{4})$/, '$1-$2');
    return v;
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setUserProfile(p => ({ ...p, phone: formatPhone(e.target.value) }));
  };

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const reader = new FileReader();
      reader.onload = (event) => {
         setUserProfile(prev => ({ ...prev, photoUrl: event.target?.result as string }));
      };
      reader.readAsDataURL(e.target.files[0]);
    }
  };

  const handleLogin = () => {
    setLoginError('');
    // If no user has registered yet, let's just make it required to match what's set (even if empty, they shouldn't just enter anything).
    // Or we can just do a strict match:
    if (loginEmail !== userProfile.email || loginPassword !== registerPassword || (!userProfile.email && loginEmail !== '')) {
      setLoginError('Usuário ou senha incorreta');
      return;
    }
    setView('calendar');
  };

  const dateKey = format(currentDate, 'yyyy-MM-dd');
  
  // Initialize entries for current day if empty
  const currentEntries = useMemo(() => {
    return records[dateKey] || [
      { id: 'default-1', label: 'Almoço (R$)', value: '' },
      { id: 'default-2', label: 'Janta (R$)', value: '' }
    ];
  }, [dateKey, records]);
  
  // Keep local state for the form so we can edit without saving immediately
  const [formEntries, setFormEntries] = useState<DailyEntry[]>(currentEntries);
  const [prevDateKey, setPrevDateKey] = useState(dateKey);

  if (dateKey !== prevDateKey) {
    setPrevDateKey(dateKey);
    setFormEntries(currentEntries);
  }

  // Handle month navigation
  const nextMonth = () => setDisplayedMonth(addMonths(displayedMonth, 1));
  const prevMonth = () => setDisplayedMonth(subMonths(displayedMonth, 1));

  // Calendar logic
  const monthStart = startOfMonth(displayedMonth);
  const monthEnd = endOfMonth(monthStart);
  const startDate = startOfWeek(monthStart, { weekStartsOn: 0 }); // Sunday
  const endDate = endOfWeek(monthEnd, { weekStartsOn: 0 });
  const calendarDays = eachDayOfInterval({ start: startDate, end: endDate });

  // Formatting helpers
  const formatValue = (val: string) => {
    // allow numbers, comma, and dot
    return val.replace(/[^0-9,.]/g, '');
  };

  const parseCurrency = (val: string) => {
    if (!val) return 0;
    return parseFloat(val.replace(/\./g, '').replace(',', '.'));
  };

  const formatCurrency = (val: number) => {
    return val.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  const handleValueBlur = (index: number) => {
    const updated = [...formEntries];
    const val = updated[index].value;
    if (!val) return;
    
    const parsed = parseCurrency(val);
    if (!isNaN(parsed)) {
      updated[index].value = formatCurrency(parsed);
      setFormEntries(updated);
      setRecords(prev => ({ ...prev, [dateKey]: updated }));
    }
  };

  const updateEntry = (index: number, field: 'label' | 'value', newValue: string) => {
    const updated = [...formEntries];
    if (field === 'value') {
      updated[index][field] = formatValue(newValue);
    } else {
      updated[index][field] = newValue;
    }
    setFormEntries(updated);
    setRecords(prev => ({ ...prev, [dateKey]: updated }));
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, index: number, field: 'label' | 'value') => {
    if (e.key === 'Enter') {
      e.preventDefault();
      let nextId = '';
      if (field === 'label') {
        nextId = `input-${index}-value`;
      } else {
        if (index < formEntries.length - 1) {
          nextId = `input-${index + 1}-value`;
        }
      }
      
      if (nextId) {
        document.getElementById(nextId)?.focus();
      } else {
        (e.target as HTMLElement).blur();
      }
    }
  };

  const addEntry = () => {
    const updated = [...formEntries, { id: Date.now().toString(), label: 'Nova Refeição (R$)', value: '' }];
    setFormEntries(updated);
    setRecords(prev => ({ ...prev, [dateKey]: updated }));
  };

  const removeEntry = (index: number) => {
    const updated = [...formEntries];
    updated.splice(index, 1);
    setFormEntries(updated);
    setRecords(prev => ({ ...prev, [dateKey]: updated }));
  };

  const saveDay = () => {
    setRecords(prev => ({
      ...prev,
      [dateKey]: formEntries
    }));
    
    setIsSaved(true);
    setTimeout(() => {
      setIsSaved(false);
    }, 2000);
  };

  const totalDiario = formEntries.reduce((acc, entry) => acc + parseCurrency(entry.value), 0);

  // Calculate monthly total based on all records in the displayed month
  const totalMensal = useMemo(() => {
    let total = 0;
    const year = getYear(displayedMonth);
    const month = displayedMonth.getMonth() + 1;
    Object.keys(records).forEach(key => {
      const parts = key.split('-');
      if (parts.length === 3) {
        const y = parseInt(parts[0], 10);
        const m = parseInt(parts[1], 10);
        if (y === year && m === month) {
          total += records[key].reduce((acc, entry) => acc + parseCurrency(entry.value), 0);
        }
      }
    });
    return total;
  }, [records, displayedMonth]);

  const hasData = (date: Date) => {
    const key = format(date, 'yyyy-MM-dd');
    if (!records[key]) return false;
    // Consider it has data if any entry has a value
    return records[key].some(e => parseCurrency(e.value) > 0);
  };

  const monthsList = useMemo(() => [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
  ], []);

  const annualData = useMemo(() => {
    const year = getYear(displayedMonth);
    const monthsData = Array.from({ length: 12 }, (_, monthIndex) => {
      let col1 = 0;
      let col2 = 0;
      let totalMonth = 0;

      Object.keys(records).forEach(key => {
        const parts = key.split('-');
        if (parts.length === 3) {
          const y = parseInt(parts[0], 10);
          const m = parseInt(parts[1], 10);
          if (y === year && m === monthIndex + 1) {
            records[key].forEach((entry, idx) => {
              const val = parseCurrency(entry.value);
              if (val > 0) {
                if (idx === 0) col1 += val;
                else if (idx === 1) col2 += val;
                totalMonth += val;
              }
            });
          }
        }
      });

      return {
        monthName: monthsList[monthIndex],
        col1,
        col2,
        totalMonth,
      };
    });

    const totalAnual = monthsData.reduce((acc, m) => acc + m.totalMonth, 0);

    return { monthsData, totalAnual, year };
  }, [records, displayedMonth, monthsList]);

  const selectMonthFromSidebar = (monthIndex: number) => {
    const newDate = setMonth(displayedMonth, monthIndex);
    setDisplayedMonth(newDate);
    setIsSidebarOpen(false);
    setView('calendar');
  };

  return (
    <div className="h-screen bg-slate-50 text-slate-900 flex flex-col font-sans overflow-hidden">
      {view === 'welcome' && (
        <div className="flex-1 flex flex-col items-center justify-center p-6 bg-slate-50 min-h-screen">
          <div className="w-24 h-24 bg-indigo-600 rounded-3xl flex items-center justify-center mb-8 shadow-xl shadow-indigo-600/20">
            <Wallet className="w-12 h-12 text-white" />
          </div>
          <h1 className="text-4xl lg:text-5xl font-extrabold text-[#1a2332] tracking-tight mb-2 text-center">
            Controle de Diária
          </h1>
          <p className="text-slate-500 mb-16 text-center max-w-sm text-lg">
            Gerencie suas despesas diárias e acompanhe seu balancete anual com facilidade.
          </p>
          
          <div className="w-full max-w-sm space-y-4">
            <button 
              onClick={() => setView('register')}
              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-4 rounded-2xl flex items-center justify-center gap-3 transition-colors shadow-lg shadow-indigo-600/30 active:scale-95 text-lg"
            >
              <User className="w-5 h-5" />
              Primeiro Acesso
            </button>
            <button 
              onClick={() => setView('login')}
              className="w-full bg-white hover:bg-slate-50 text-slate-700 font-bold py-4 rounded-2xl flex items-center justify-center gap-3 transition-colors border border-slate-200 shadow-sm active:scale-95 text-lg"
            >
              <LogIn className="w-5 h-5" />
              Entrar
            </button>
          </div>
        </div>
      )}

      {view === 'register' && (
        <div className="flex-1 overflow-y-auto bg-slate-50 py-10 px-4">
          <div className="max-w-md mx-auto bg-white rounded-[32px] shadow-sm border border-slate-200 p-8">
            <div className="mb-8">
              <button onClick={() => setView(userProfile.name ? 'calendar' : 'welcome')} className="text-slate-400 hover:text-slate-800 mb-6 transition-colors p-2 -ml-2 rounded-xl hover:bg-slate-50">
                <ChevronLeft className="w-6 h-6" />
              </button>
              <h2 className="text-3xl font-extrabold text-[#1a2332] tracking-tight">Criar Perfil</h2>
              <p className="text-slate-500 mt-1 font-medium">Configure suas informações pessoais</p>
            </div>

            <div className="flex flex-col items-center mb-10">
              <div className="relative group cursor-pointer">
                <input 
                  type="file" 
                  accept="image/*" 
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" 
                  onChange={handlePhotoUpload}
                />
                <div className="w-32 h-32 rounded-[2rem] border-4 border-indigo-50 bg-slate-100 flex items-center justify-center overflow-hidden relative shadow-sm group-hover:border-indigo-100 transition-colors">
                  {userProfile.photoUrl ? (
                    <img src={userProfile.photoUrl} alt="Avatar" className="w-full h-full object-cover" />
                  ) : (
                    <User className="w-12 h-12 text-slate-400" />
                  )}
                  <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <Camera className="w-8 h-8 text-white" />
                  </div>
                </div>
                <div className="absolute -bottom-3 -right-3 w-10 h-10 bg-indigo-600 rounded-full border-4 border-white flex items-center justify-center text-white shadow-md z-10">
                   <Plus className="w-5 h-5" />
                </div>
              </div>
            </div>

            <div className="space-y-5">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-widest pl-1">Nome</label>
                <input 
                  type="text" 
                  value={userProfile.name}
                  onChange={(e) => setUserProfile(p => ({ ...p, name: e.target.value }))}
                  className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3.5 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-shadow font-medium"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-widest pl-1">Sobrenome</label>
                <input 
                  type="text" 
                  value={userProfile.lastName}
                  onChange={(e) => setUserProfile(p => ({ ...p, lastName: e.target.value }))}
                  className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3.5 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-shadow font-medium"
                />
              </div>
              
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-widest pl-1">Email</label>
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                  <input 
                    type="email" 
                    value={userProfile.email}
                    onChange={(e) => setUserProfile(p => ({ ...p, email: e.target.value }))}
                    className="w-full bg-slate-50 border border-slate-200 rounded-2xl pl-12 pr-4 py-3.5 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-shadow font-medium"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-widest pl-1">Tel / Celular</label>
                 <div className="relative">
                  <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                  <input 
                    type="tel" 
                    value={userProfile.phone}
                    onChange={handlePhoneChange}
                    className="w-full bg-slate-50 border border-slate-200 rounded-2xl pl-12 pr-4 py-3.5 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-shadow font-medium"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-widest pl-1">Senha</label>
                 <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                  <input 
                    type={showPassword ? "text" : "password"} 
                    value={registerPassword}
                    onChange={(e) => setRegisterPassword(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-2xl pl-12 pr-12 py-3.5 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-shadow font-medium"
                  />
                  <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 focus:outline-none">
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-widest pl-1">Confirmar Senha</label>
                 <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                  <input 
                    type={showConfirmPassword ? "text" : "password"} 
                    className="w-full bg-slate-50 border border-slate-200 rounded-2xl pl-12 pr-12 py-3.5 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-shadow font-medium"
                  />
                  <button type="button" onClick={() => setShowConfirmPassword(!showConfirmPassword)} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 focus:outline-none">
                    {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>
            </div>

            <button 
              onClick={() => setView('login')}
              className="w-full mt-10 bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-4 rounded-2xl flex items-center justify-center gap-3 transition-colors shadow-lg shadow-indigo-600/30 active:scale-95 text-lg"
            >
              Cadastrar
              <ArrowRight className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}

      {view === 'login' && (
        <div className="flex-1 flex flex-col items-center justify-center p-6 bg-slate-50 min-h-screen">
          <div className="w-full max-w-md bg-white rounded-[32px] shadow-sm border border-slate-200 p-8">
            <div className="mb-8">
              <button onClick={() => setView('welcome')} className="text-slate-400 hover:text-slate-800 mb-6 transition-colors p-2 -ml-2 rounded-xl hover:bg-slate-50">
                <ChevronLeft className="w-6 h-6" />
              </button>
              <h2 className="text-3xl font-extrabold text-[#1a2332] tracking-tight">Acessar App</h2>
              <p className="text-slate-500 mt-1 font-medium">Digite suas credenciais para continuar</p>
            </div>

            <div className="space-y-5">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-widest pl-1">Email</label>
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                  <input 
                    type="email" 
                    value={loginEmail}
                    onChange={(e) => setLoginEmail(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-2xl pl-12 pr-4 py-3.5 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-shadow font-medium"
                    placeholder="Seu email cadastrado"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-widest pl-1">Senha</label>
                 <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                  <input 
                    type={showPassword ? "text" : "password"} 
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-2xl pl-12 pr-12 py-3.5 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-shadow font-medium"
                    placeholder="Sua senha"
                  />
                  <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 focus:outline-none">
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>
            </div>

            {loginError && (
              <div className="mt-6 p-4 bg-red-50 text-red-600 rounded-xl text-center font-bold text-sm border border-red-100">
                {loginError}
              </div>
            )}

            <button 
              onClick={handleLogin}
              className="w-full mt-8 bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-4 rounded-2xl flex items-center justify-center gap-3 transition-colors shadow-lg shadow-indigo-600/30 active:scale-95 text-lg"
            >
              Entrar
              <ArrowRight className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}

      {(view === 'calendar' || view === 'annual-balance' || view === 'blank') && (
        <>
          {/* HEADER */}
          <header className="bg-white border-b border-slate-200 px-6 lg:px-10 py-4 lg:h-24 flex items-center gap-4 shrink-0 overflow-x-auto">
            <button 
              onClick={() => setView('register')}
              className="w-14 h-14 bg-slate-900 text-white rounded-2xl flex items-center justify-center font-bold text-xl hover:bg-slate-800 shadow-sm shrink-0 transition-colors overflow-hidden relative"
            >
              {userProfile.photoUrl ? (
                <img src={userProfile.photoUrl} alt="Avatar" className="w-full h-full object-cover" />
              ) : (
                userProfile.name ? userProfile.name.charAt(0).toUpperCase() : 'RF'
              )}
            </button>
            <button 
              onClick={() => setIsSidebarOpen(true)}
              className="w-14 h-14 bg-indigo-50 border border-indigo-100 text-indigo-600 rounded-2xl flex items-center justify-center hover:bg-indigo-100 shadow-sm shrink-0 transition-colors"
            >
              <CalendarIcon className="w-6 h-6" />
            </button>
            <button 
              onClick={() => setView('calendar')}
              className="w-14 h-14 bg-slate-50 border border-slate-200 text-slate-600 rounded-2xl flex items-center justify-center hover:bg-slate-100 shadow-sm shrink-0 transition-colors"
            >
              <FileText className="w-6 h-6" />
            </button>
            <button 
              onClick={() => setView('annual-balance')}
              className="w-14 h-14 bg-slate-50 border border-slate-200 text-slate-600 rounded-2xl flex items-center justify-center hover:bg-slate-100 shadow-sm shrink-0 transition-colors"
            >
              <AlignLeft className="w-6 h-6" />
            </button>
            
            <div className="flex-1 flex justify-end items-center hidden lg:flex">
              {view === 'calendar' && (
                <div className="flex items-center gap-2 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-200 ml-4 shrink-0">
                  <CalendarIcon className="w-4 h-4 text-indigo-600" />
                  <span className="text-slate-700 text-sm font-semibold tracking-wide uppercase">
                    {format(currentDate, 'dd / MMM / yyyy', { locale: ptBR })}
                  </span>
                </div>
              )}
            </div>
          </header>

      <main className="flex-1 overflow-y-auto min-h-0 bg-slate-50">
        {view === 'calendar' ? (
          <div className="max-w-xl lg:max-w-2xl mx-auto w-full flex flex-col gap-6 lg:gap-8 p-4 lg:p-8 pb-24">
            {/* CALENDAR CARD */}
          <div className="bg-white rounded-[32px] shadow-sm border border-slate-200 p-6 lg:p-8 flex flex-col shrink-0">
            <div className="flex flex-col mb-6 lg:mb-8 text-center lg:text-left">
              <span className="text-slate-400 font-medium text-xs lg:text-sm uppercase tracking-widest mb-1">Relatório Mensal</span>
              <h2 className="text-2xl lg:text-4xl font-extrabold text-[#1a2332] tracking-tight uppercase">Controle de Diária</h2>
            </div>
            <div className="flex items-center justify-between mb-6 lg:mb-8">
              <h3 className="text-lg lg:text-xl font-bold text-slate-800 hidden lg:block">Calendário</h3>
              <div className="flex items-center justify-center lg:justify-end w-full lg:w-auto gap-4 text-indigo-600 font-bold text-sm tracking-widest uppercase">
                <button onClick={prevMonth} className="p-2 hover:bg-slate-50 rounded-xl transition-colors"><ChevronLeft className="w-5 h-5" /></button>
                <span>{format(displayedMonth, 'MMMM yyyy', { locale: ptBR })}</span>
                <button onClick={nextMonth} className="p-2 hover:bg-slate-50 rounded-xl transition-colors"><ChevronRight className="w-5 h-5" /></button>
              </div>
            </div>

            <div className="grid grid-cols-7 text-center mb-6">
              {['D', 'S', 'T', 'Q', 'Q', 'S', 'S'].map((day, i) => (
                <div key={i} className="text-slate-400 font-semibold text-sm">{day}</div>
              ))}
            </div>

            <div className="flex-1 grid grid-cols-7 gap-y-4 gap-x-2 text-center lg:auto-rows-fr">
              {calendarDays.map((day, i) => {
                const isCurrentMonth = isSameMonth(day, displayedMonth);
                const isSelected = isSameDay(day, currentDate);
                const hasRecords = hasData(day);

                return (
                  <div key={i} className="flex justify-center items-center">
                    <button
                      onClick={() => {
                        if (isCurrentMonth) {
                          setCurrentDate(day);
                        } else {
                          setDisplayedMonth(startOfMonth(day));
                          setCurrentDate(day);
                        }
                      }}
                      className={cn(
                        "relative w-full aspect-square max-w-[3rem] lg:max-w-none lg:w-16 lg:h-16 flex flex-col items-center justify-center rounded-2xl font-bold text-lg lg:text-xl transition-all",
                        !isCurrentMonth && "text-slate-300 font-medium",
                        isCurrentMonth && !isSelected && !hasRecords && "bg-slate-50 text-slate-800 hover:bg-slate-100",
                        hasRecords && !isSelected && "bg-indigo-50 text-indigo-600 border border-indigo-100",
                        isSelected && "bg-indigo-600 text-white shadow-lg shadow-indigo-600/30"
                      )}
                    >
                      <span>{format(day, 'd')}</span>
                      {hasRecords && !isSelected && (
                        <span className="absolute bottom-1 w-1.5 h-1.5 rounded-full bg-indigo-500"></span>
                      )}
                      {isSelected && hasRecords && (
                         <span className="absolute bottom-1 w-1.5 h-1.5 rounded-full bg-white"></span>
                      )}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>

          {/* MONTHLY TOTAL CARD */}
          <div className="bg-slate-900 rounded-[32px] lg:rounded-[40px] p-6 lg:p-8 flex justify-between items-center text-white shadow-xl flex-shrink-0">
            <div>
              <div className="text-slate-400 text-xs font-bold tracking-widest uppercase mb-1">Mês Selecionado</div>
              <div className="text-xl lg:text-3xl font-light capitalize">{format(displayedMonth, 'MMMM yyyy', { locale: ptBR })}</div>
            </div>
            <div className="text-right">
              <div className="text-slate-400 text-xs font-bold tracking-widest uppercase mb-1">Total Mensal</div>
              <div className="text-2xl lg:text-4xl font-bold text-indigo-400">
                R$ {formatCurrency(totalMensal)}
              </div>
            </div>
          </div>

          {/* DAILY RECORD CARD */}
          <aside className="w-full bg-indigo-900 rounded-[32px] lg:rounded-[40px] shadow-2xl p-6 lg:p-10 flex flex-col text-white flex-shrink-0">
            <div className="mb-8">
            <p className="text-indigo-300 uppercase tracking-widest text-xs font-semibold mb-1">
              {format(currentDate, 'EEEE', { locale: ptBR })}
            </p>
            <h2 className="text-3xl lg:text-4xl font-light capitalize">
              {format(currentDate, 'dd \'de\' MMMM', { locale: ptBR })}
            </h2>
          </div>

          <div className="flex-1 space-y-6 flex flex-col">
            <AnimatePresence>
              {formEntries.map((entry, index) => (
                <motion.div 
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  key={entry.id} 
                  className="relative group pr-2"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex-1 flex flex-col">
                      <div className="flex justify-between items-center px-1 mb-1">
                        <input 
                          id={`input-${index}-label`}
                          type="text"
                          enterKeyHint="next"
                          value={entry.label}
                          onChange={(e) => updateEntry(index, 'label', e.target.value)}
                          onKeyDown={(e) => handleKeyDown(e, index, 'label')}
                          className="bg-transparent border-none p-0 text-indigo-200 text-sm focus:ring-0 cursor-text w-full outline-none font-medium placeholder-indigo-400"
                          placeholder="Nome da refeição"
                        />
                        {index > 0 && (
                          <button 
                            onClick={() => removeEntry(index)}
                            className="text-indigo-400 hover:text-red-400 transition-colors ml-2"
                            title="Remover Entrada"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                      
                      <div className="bg-indigo-800/50 rounded-2xl p-4 border border-indigo-700/50 flex justify-between items-center gap-2 group-focus-within:border-indigo-500 transition-colors">
                        <span className="text-indigo-300 font-mono text-xl">R$</span>
                        <input
                          id={`input-${index}-value`}
                          type="text"
                          inputMode="decimal"
                          enterKeyHint={index === formEntries.length - 1 ? "done" : "next"}
                          value={entry.value}
                          onChange={(e) => updateEntry(index, 'value', e.target.value)}
                          onKeyDown={(e) => handleKeyDown(e, index, 'value')}
                          onBlur={() => handleValueBlur(index)}
                          placeholder="0,00"
                          className="bg-transparent border-none p-0 w-full font-mono text-xl focus:ring-0 text-white outline-none flex-1 placeholder-indigo-500"
                        />
                        <Pencil className="w-4 h-4 text-indigo-500 opacity-50 block" />
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>

            <button 
              onClick={addEntry}
              className="flex flex-col opacity-70 hover:opacity-100 transition-opacity text-left mt-2 pr-2"
            >
              <div className="px-1 text-indigo-400 text-sm italic font-medium mb-1">Nova Categoria...</div>
              <div className="w-full bg-indigo-900/30 rounded-2xl p-4 border border-dashed border-indigo-700 flex items-center justify-center gap-3 text-indigo-400 hover:bg-indigo-900/50 transition-colors">
                <span className="text-indigo-400 font-medium italic">Adicionar campo</span>
              </div>
            </button>
          </div>

          <div className="pt-8 border-t border-indigo-800 mt-8 lg:mt-auto">
            <div className="flex justify-between items-end mb-6">
              <span className="text-indigo-400 text-sm uppercase tracking-widest font-semibold text-right">Total do Dia</span>
              <span className="text-3xl font-bold">R$ {formatCurrency(totalDiario)}</span>
            </div>
            <button 
              onClick={saveDay}
              disabled={isSaved}
              className={`w-full py-4 rounded-2xl font-bold text-center flex items-center justify-center gap-3 transition-colors shadow-lg active:scale-95 text-lg ${
                isSaved 
                  ? 'bg-green-500 text-white cursor-default shadow-green-500/30' 
                  : 'bg-white text-indigo-900 hover:bg-indigo-50'
              }`}
            >
              <Wallet className="w-5 h-5" />
              {isSaved ? 'Registro Salvo e Seguro' : 'Salvar Registros'}
            </button>
          </div>
        </aside>
        </div>
        ) : view === 'annual-balance' ? (
          <div className="max-w-2xl mx-auto w-full flex flex-col p-4 lg:p-8 pb-24 h-full overflow-y-auto">
            <div className="flex items-center gap-4 mb-6 shrink-0">
              <div className="w-14 h-14 bg-slate-900 text-white rounded-[1.25rem] flex items-center justify-center font-bold text-xl shadow-sm shrink-0 overflow-hidden border border-slate-200">
                 {userProfile.photoUrl ? (
                    <img src={userProfile.photoUrl} alt="Avatar" className="w-full h-full object-cover" />
                  ) : (
                    userProfile.name ? userProfile.name.charAt(0).toUpperCase() : 'RF'
                  )}
              </div>
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-slate-500 font-semibold text-sm">Visão Geral</span>
                  <div className="flex items-center gap-1.5 bg-white px-2 py-0.5 rounded border border-slate-200 shadow-sm">
                    <CalendarIcon className="w-3.5 h-3.5 text-indigo-500" />
                    <span className="text-slate-600 text-xs font-bold uppercase tracking-wider">
                      {format(currentDate, 'dd / MMM / yyyy', { locale: ptBR })}
                    </span>
                  </div>
                </div>
                <h2 className="text-2xl lg:text-3xl font-extrabold text-[#1a2332] tracking-tight">
                  Balancete Anual
                </h2>
              </div>
            </div>
            
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden text-sm shrink-0">
              {annualData.monthsData.map((month) => (
                <div key={month.monthName} className="flex border-b border-slate-100 last:border-0 h-[3.25rem]">
                  <div className="flex-[1.2] lg:flex-1 flex items-center pl-4 lg:pl-6 font-medium text-[#1a2332] border-r border-slate-100 capitalize text-[15px]">
                    {month.monthName}
                  </div>
                  <div className="flex-1 flex items-center justify-center border-r border-slate-100 text-indigo-600 font-semibold px-2">
                    {month.col1 > 0 ? formatCurrency(month.col1) : '0,00'}
                  </div>
                  <div className="flex-1 flex items-center justify-center border-r border-slate-100 text-indigo-600 font-semibold px-2">
                    {month.col2 > 0 ? formatCurrency(month.col2) : '0,00'}
                  </div>
                  <div className="flex-1 flex items-center justify-center text-emerald-600 font-bold px-2 bg-emerald-50/40">
                    {month.totalMonth > 0 ? formatCurrency(month.totalMonth) : '0,00'}
                  </div>
                </div>
              ))}
            </div>

            <div className="bg-[#1e2330] rounded-2xl p-6 lg:p-8 flex justify-between items-center text-white shadow-xl mt-6 shrink-0">
               <div>
                 <div className="text-slate-400 text-xs font-bold tracking-widest uppercase mb-1">Ano Selecionado</div>
                 <div className="text-2xl lg:text-3xl font-bold">{annualData.year}</div>
               </div>
               <div className="text-right">
                 <div className="text-slate-400 text-xs font-bold tracking-widest uppercase mb-1 flex items-center gap-1 justify-end">
                  Balancete Anual
                 </div>
                 <div className="text-2xl lg:text-3xl font-bold text-emerald-400">
                   R$ {formatCurrency(annualData.totalAnual)}
                 </div>
               </div>
            </div>

            <div className="mt-8 flex justify-center pb-8 shrink-0">
              <button 
                onClick={() => setView('calendar')} 
                className="bg-white text-slate-700 border border-slate-200 font-semibold py-3 px-8 rounded-xl shadow-sm hover:bg-slate-50 transition-colors"
               >
                Voltar ao Calendário
              </button>
            </div>
          </div>
        ) : view === 'blank' ? (
          <div className="max-w-2xl mx-auto w-full flex flex-col p-4 lg:p-8 pb-24 h-full overflow-y-auto items-center justify-center">
            <div className="bg-white p-10 rounded-3xl border border-slate-200 shadow-sm text-center">
              <FileText className="w-16 h-16 text-slate-300 mx-auto mb-4" />
              <h2 className="text-2xl font-bold text-slate-800 mb-2">Página em Branco</h2>
              <p className="text-slate-500 mb-8">Esta área está reservada para futuras funcionalidades.</p>
              <button 
                onClick={() => setView('calendar')} 
                className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 px-8 rounded-xl shadow-sm transition-colors"
              >
                Voltar para Calendário
              </button>
            </div>
          </div>
        ) : null}
      </main>
      </>
      )}

      {/* SIDEBAR DRAWER */}
      <AnimatePresence>
        {isSidebarOpen && (
            <motion.div 
              key="overlay"
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.4 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsSidebarOpen(false)}
              className="fixed inset-0 bg-slate-900 z-40"
            />
        )}
        {isSidebarOpen && (
            <motion.div
              key="drawer"
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed top-0 left-0 h-full w-[85%] max-w-sm bg-white z-50 shadow-2xl flex flex-col font-sans"
            >
              <div className="p-6 md:p-8 flex items-center justify-between border-b border-slate-100">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-slate-900 text-white rounded-2xl flex items-center justify-center font-bold text-xl shadow-sm overflow-hidden border border-slate-200">
                    {userProfile.photoUrl ? (
                      <img src={userProfile.photoUrl} alt="Avatar" className="w-full h-full object-cover" />
                    ) : (
                      userProfile.name ? userProfile.name.charAt(0).toUpperCase() : 'RF'
                    )}
                  </div>
                  <h2 className="font-bold text-slate-800 text-lg leading-tight uppercase tracking-wide">Controle<br/>de Diária</h2>
                </div>
                <button onClick={() => setIsSidebarOpen(false)} className="text-slate-400 hover:text-slate-800 bg-slate-50 p-2 rounded-full transition-colors">
                  <X className="w-6 h-6" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto px-4 py-6 space-y-2">
                {monthsList.map((monthName, index) => {
                  const monthDate = setMonth(displayedMonth, index);
                  const isCurMonth = isSameMonth(monthDate, displayedMonth);
                  
                  // A naive way to check if a month is in the past compared to current viewing year/month
                  const isPast = getYear(monthDate) < getYear(displayedMonth) || 
                                (getYear(monthDate) === getYear(displayedMonth) && index < displayedMonth.getMonth());
                  
                  let stateClass = "text-slate-600 hover:bg-slate-50 bg-white border border-transparent";
                  let dot = null;

                  if (isCurMonth) {
                    stateClass = "bg-indigo-600 text-white font-bold border-indigo-600 shadow-sm";
                  } else if (isPast) {
                    stateClass = "text-purple-700 bg-purple-50 border border-purple-100";
                    dot = <span className="w-2 h-2 rounded-full bg-purple-400"></span>;
                  }

                  return (
                    <button
                      key={monthName}
                      onClick={() => selectMonthFromSidebar(index)}
                      className={cn(
                        "w-full flex items-center justify-between px-5 py-4 rounded-xl text-lg font-medium transition-all",
                        stateClass
                      )}
                    >
                      <span className="capitalize">{monthName}</span>
                      {dot}
                    </button>
                  );
                })}
              </div>

              <div className="p-6 border-t border-slate-100 bg-slate-50 mt-auto">
                 <button 
                  onClick={() => {
                    setView('annual-balance');
                    setIsSidebarOpen(false);
                  }}
                  className="w-full bg-slate-900 hover:bg-slate-800 active:scale-95 text-white font-bold py-4 rounded-2xl flex items-center justify-center gap-3 transition-all shadow-md group"
                 >
                  <FileText className="w-5 h-5 text-indigo-300 group-hover:scale-110 transition-transform" />
                  <span className="tracking-wide">Balancete Anual</span>
                </button>
              </div>
            </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}
