'use client';

import { useState, useMemo, useEffect, useRef, useCallback } from 'react';
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
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, Pencil, Plus, Trash2, X, Wallet, AlignLeft, FileText, Camera, User, Mail, Phone, Lock, ArrowRight, LogIn, Eye, EyeOff, Search, Shield, Users, Unlock, Image as ImageIcon, Type, Play, Pause, Upload, Video, Bold, Italic, Type as TypeIcon, Menu, BarChart3, Heart } from 'lucide-react';

// ... Inside ControleDiariaApp ...

import { motion, AnimatePresence } from 'motion/react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { supabase } from '../lib/supabase';
import { loadMonthlyRecords, loadYearlyRecords, saveDailyRecords, saveProfile, fetchProfile, fetchAllUsers, toggleBlockUser, deleteUserProfile } from '../lib/api';
import localforage from 'localforage';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

type DailyEntry = {
  id: string;
  label: string;
  value: string; // Store as string for easier input handling
};

const DEFAULT_ENTRIES: DailyEntry[] = [
  { id: 'default-1', label: 'Almoço (R$)', value: '' },
  { id: 'default-2', label: 'Janta (R$)', value: '' }
];

export default function ControleDiariaApp() {
  const [currentDate, setCurrentDate] = useState(new Date()); // Today
  const [displayedMonth, setDisplayedMonth] = useState(startOfMonth(new Date()));
  const [records, setRecords] = useState<Record<string, DailyEntry[]>>({});
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [authUserId, setAuthUserId] = useState<string | null>(null);
  const [view, setView] = useState<'welcome' | 'register' | 'login' | 'calendar' | 'annual-balance' | 'blank' | 'admin'>('welcome');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [registerPassword, setRegisterPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [resetMessage, setResetMessage] = useState('');
  const [isSaved, setIsSaved] = useState(false);
  const [userProfile, setUserProfile] = useState({
    name: '',
    lastName: '',
    email: '',
    phone: '',
    photoUrl: '',
    role: 'user'
  });
  const [allUsers, setAllUsers] = useState<any[]>([]);
  const [adminSearchQuery, setAdminSearchQuery] = useState('');
  const [annualNotes, setAnnualNotes] = useState('');

  // Slideshow States
  type Slide = { 
    id: string; 
    type: 'text' | 'media'; 
    content: string; 
    mediaUrl?: string;
    mediaType?: 'image' | 'video';
    bgColor?: string;
    textConfig?: {
      color: string;
      fontFamily: string;
      isBold: boolean;
      isItalic: boolean;
      fontSize: number;
    }
  };
  const [slides, setSlides] = useState<Slide[]>([]);
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);
  const [showSlideConfig, setShowSlideConfig] = useState(false);
  const [newSlideData, setNewSlideData] = useState<Partial<Slide>>({ 
    type: 'text', 
    content: '', 
    bgColor: '#6366f1',
    textConfig: {
      color: '#ffffff',
      fontFamily: 'Inter',
      isBold: true,
      isItalic: false,
      fontSize: 32
    }
  });

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setAuthUserId(session.user.id);
        setView('calendar');
      }
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        setAuthUserId(session.user.id);
      } else {
        setAuthUserId(null);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  // Load records from Supabase
  useEffect(() => {
    if (authUserId) {
      const year = getYear(displayedMonth);
      loadYearlyRecords(authUserId, year)
        .then((dbRecords) => {
          // Merge local with DB, db takes precedence
          setRecords(prev => ({ ...prev, ...dbRecords }));
        })
        .catch(console.error);
        
      localforage.getItem(`annualNotes_${authUserId}`).then((notes: any) => {
        if (notes && typeof notes === 'string') {
          setAnnualNotes(notes);
        }
      });
    }
  }, [authUserId, displayedMonth]);

  useEffect(() => {
    if (authUserId) {
      supabase.auth.getUser().then(({ data: { user } }) => {
        fetchProfile(authUserId).then(profile => {
          if (profile) {
            setUserProfile({
              name: profile.name || '',
              lastName: profile.last_name || '',
              email: profile.email || user?.email || '',
              phone: profile.phone || '',
              photoUrl: profile.photo_url || '',
              role: profile.role || 'user'
            });
          } else if (user) {
            setUserProfile(prev => ({ ...prev, email: user.email || '' }));
          }
        }).catch(err => {
          console.warn(err);
          if (user) setUserProfile(prev => ({ ...prev, email: user.email || '' }));
        });
      });
    }
  }, [authUserId]);

  useEffect(() => {
    if (view === 'admin' && (userProfile.role === 'admin' || userProfile.email === 'renatof.rcc@gmail.com')) {
      fetchAllUsers().then(setAllUsers).catch(console.error);
    }
  }, [view, userProfile.role, userProfile.email]);

  // Load slides when user changes
  useEffect(() => {
    if (authUserId) {
      import('../lib/slidesApi').then(({ fetchGlobalSlides }) => {
        fetchGlobalSlides().then((dbSlides) => {
          if (dbSlides && dbSlides.length > 0) {
            setSlides(dbSlides);
          } else {
            // Fallback se não configurou Supabase ainda 
            localforage.getItem(`slides_${authUserId}`).then((storedSlides: any) => {
              if (storedSlides && storedSlides.length > 0) {
                setSlides(storedSlides);
              } else {
                setSlides([{ 
                  id: 'default', 
                  type: 'text', 
                  content: 'Bem-vindo ao seu painel!', 
                  bgColor: '#6366f1',
                  textConfig: { color: '#ffffff', fontFamily: 'Inter', isBold: true, isItalic: false, fontSize: 32 }
                }]);
              }
            }).catch(e => console.error('Failed to parse slides', e));
          }
        }).catch(err => {
          console.warn('Could not load global slides from Supabase, error or table missing:', err);
          // Fallback to local
          localforage.getItem(`slides_${authUserId}`).then((storedSlides: any) => {
            if (storedSlides && storedSlides.length > 0) {
              setSlides(storedSlides);
            }
          });
        });
      });
    }
  }, [authUserId]);

  // Autoplay slides
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isPlaying && slides.length > 0) {
      interval = setInterval(() => {
        setCurrentSlideIndex((prev) => (prev + 1) % slides.length);
      }, 10000); // 10 seconds per slide
    }
    return () => clearInterval(interval);
  }, [isPlaying, slides.length]);

  const handleSaveSlide = async () => {
    if (!newSlideData.content?.trim() && newSlideData.type === 'text') return;
    if (!newSlideData.mediaUrl && newSlideData.mediaType === 'image' && newSlideData.type !== 'text') return;
    
    try {
      if (newSlideData.id) {
        // Update existing
        const { updateGlobalSlide } = await import('../lib/slidesApi');
        const savedDbSlide = await updateGlobalSlide(newSlideData.id, newSlideData);
        const updatedSlides = slides.map(s => s.id === newSlideData.id ? savedDbSlide : s);
        setSlides(updatedSlides);
      } else {
        // Create new
        const { addGlobalSlide } = await import('../lib/slidesApi');
        const savedDbSlide = await addGlobalSlide(newSlideData);
        const updatedSlides = [...slides, savedDbSlide];
        setSlides(updatedSlides);
        setCurrentSlideIndex(updatedSlides.length - 1);
      }
    } catch (e) {
      console.error('Failed to save slide globally. Ensure table global_slides is created.', e);
      // Fallback
      if (newSlideData.id) {
        const updatedSlides = slides.map(s => s.id === newSlideData.id ? (newSlideData as Slide) : s);
        setSlides(updatedSlides);
        if (authUserId) {
          localforage.setItem(`slides_${authUserId}`, updatedSlides).catch(console.error);
        }
      } else {
        const newSlide: Slide = {
          id: Date.now().toString(),
          type: newSlideData.type as 'text' | 'media',
          content: newSlideData.content || '',
          mediaUrl: newSlideData.mediaUrl,
          mediaType: newSlideData.mediaType,
          bgColor: newSlideData.bgColor,
          textConfig: newSlideData.textConfig
        };
        const updatedSlides = [...slides, newSlide];
        setSlides(updatedSlides);
        if (authUserId) {
          localforage.setItem(`slides_${authUserId}`, updatedSlides).catch(console.error);
        }
        setCurrentSlideIndex(updatedSlides.length - 1);
      }
    }
    
    setShowSlideConfig(false);
    setNewSlideData({ 
      type: 'text', 
      content: '', 
      bgColor: '#6366f1',
      textConfig: { color: '#ffffff', fontFamily: 'Inter', isBold: true, isItalic: false, fontSize: 32 }
    });
  };

  const handleDeleteSlide = async (id: string) => {
    try {
      const { deleteGlobalSlide } = await import('../lib/slidesApi');
      await deleteGlobalSlide(id);
      const updatedSlides = slides.filter(s => s.id !== id);
      setSlides(updatedSlides);
      if (currentSlideIndex >= updatedSlides.length) {
        setCurrentSlideIndex(Math.max(0, updatedSlides.length - 1));
      }
    } catch (e) {
      console.error('Failed to delete slide globally.', e);
      // Fallback
      const updatedSlides = slides.filter(s => s.id !== id);
      setSlides(updatedSlides);
      if (authUserId) {
        localforage.setItem(`slides_${authUserId}`, updatedSlides).catch(console.error);
      }
      if (currentSlideIndex >= updatedSlides.length) {
        setCurrentSlideIndex(Math.max(0, updatedSlides.length - 1));
      }
    }
  };

  const toggleBlock = async (id: string, isBlocked: boolean) => {
    await toggleBlockUser(id, !isBlocked);
    setAllUsers(prev => prev.map(u => u.id === id ? { ...u, is_blocked: !isBlocked } : u));
  };

  const deleteUser = async (id: string) => {
    if (confirm('Tem certeza que deseja excluir este usuário e todos os seus registros?')) {
      await deleteUserProfile(id);
      setAllUsers(prev => prev.filter(u => u.id !== id));
    }
  };

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

  const handleLogin = async () => {
    setLoginError('');
    if (!loginEmail || !loginPassword) {
      setLoginError('Preencha os dados.');
      return;
    }
    
    // Attempt Supabase login
    const { data: authData, error } = await supabase.auth.signInWithPassword({
      email: loginEmail,
      password: loginPassword
    });

    if (error) {
      // Local fallback for demo purposes if Supabase is not provided
      if (loginEmail === userProfile.email && loginPassword === registerPassword && userProfile.email) {
        setView('calendar');
        return;
      }
      console.error(error);
      setLoginError('Usuário ou senha incorreta (Supabase não conectado ou credencial inválida)');
      return;
    }

    if (authData.user) {
      setAuthUserId(authData.user.id);
      setView('calendar');
    }
  };

  const handleResetPassword = async () => {
    setResetMessage('');
    setLoginError('');
    if (!loginEmail) {
      setLoginError('Digite seu email primeiro para recuperar a senha.');
      return;
    }
    
    const { error } = await supabase.auth.resetPasswordForEmail(loginEmail, {
      redirectTo: window.location.origin,
    });
    
    if (error) {
      setLoginError('Erro ao solicitar recuperação de senha: ' + error.message);
    } else {
      setResetMessage('Um link de recuperação de senha foi enviado para seu email.');
    }
  };

  const handleRegister = async () => {
    if (authUserId) {
      // Update existing user profile
      const updates = {
         name: userProfile.name,
         last_name: userProfile.lastName,
         phone: userProfile.phone,
         photo_url: userProfile.photoUrl,
         email: userProfile.email
      };
      await saveProfile(authUserId, updates).catch(console.error);
      
      // Update password if provided
      if (registerPassword) {
        if (registerPassword.length < 6) {
          alert('A nova senha deve ter no mínimo 6 caracteres.');
          return;
        }
        const { error } = await supabase.auth.updateUser({ password: registerPassword });
        if (error) {
          alert('Erro ao atualizar a senha: ' + error.message);
          return;
        }
        setRegisterPassword('');
      }
      
      alert('Perfil atualizado com sucesso!');
      setView('calendar');
      return;
    }

    const { data: authData, error } = await supabase.auth.signUp({
      email: userProfile.email,
      password: registerPassword
    });

    if (error) {
      console.error(error);
      alert('Erro no cadastro Supabase: ' + error.message);
      // Local fallback
      setView('login');
      return;
    }
    
    if (authData.user) {
       try {
         await saveProfile(authData.user.id, {
           name: userProfile.name,
           last_name: userProfile.lastName,
           email: userProfile.email,
           phone: userProfile.phone,
           photo_url: userProfile.photoUrl
         });
       } catch (err: any) {
         console.error('Falha ao salvar perfil:', err);
       }
    }
    alert('Cadastrado com sucesso! Faça login.');
    setView('login');
  };

  const dateKey = format(currentDate, 'yyyy-MM-dd');
  
  // Initialize entries for current day if empty
  const currentEntries = useMemo(() => {
    return records[dateKey] || DEFAULT_ENTRIES;
  }, [dateKey, records]);
  
  // Keep local state for the form so we can edit without saving immediately
  const [formEntries, setFormEntries] = useState<DailyEntry[]>(currentEntries);
  const [prevDateKey, setPrevDateKey] = useState(dateKey);
  const [prevEntries, setPrevEntries] = useState(currentEntries);
  const debounceRef = useRef<Record<string, NodeJS.Timeout>>({});
  const saveQueueRef = useRef<Promise<void>>(Promise.resolve());

  if (currentEntries !== prevEntries || dateKey !== prevDateKey) {
    setPrevDateKey(dateKey);
    setPrevEntries(currentEntries);
    setFormEntries(currentEntries);
  }

  const autoSave = useCallback((key: string, entries: DailyEntry[]) => {
    if (!authUserId) return;
    if (debounceRef.current[key]) clearTimeout(debounceRef.current[key]);
    debounceRef.current[key] = setTimeout(() => {
      saveQueueRef.current = saveQueueRef.current.then(async () => {
        try {
          await saveDailyRecords(authUserId, key, entries);
        } catch (err) {
          console.error(err);
        }
      });
    }, 1000);
  }, [authUserId]);

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
      autoSave(dateKey, updated);
    }
  };

  const updateEntry = (index: number, field: 'label' | 'value', newValue: string) => {
    const updated = [...formEntries];
    updated[index] = { ...updated[index] };
    if (field === 'value') {
      updated[index][field] = formatValue(newValue);
    } else {
      updated[index][field] = newValue;
    }
    setFormEntries(updated);
    setRecords(prev => ({ ...prev, [dateKey]: updated }));
    autoSave(dateKey, updated);
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
    autoSave(dateKey, updated);
  };

  const removeEntry = (index: number) => {
    const updated = [...formEntries];
    updated.splice(index, 1);
    setFormEntries(updated);
    setRecords(prev => ({ ...prev, [dateKey]: updated }));
    autoSave(dateKey, updated);
  };

  const saveDay = async () => {
    setRecords(prev => ({
      ...prev,
      [dateKey]: formEntries
    }));
    
    if (authUserId) {
      saveQueueRef.current = saveQueueRef.current.then(async () => {
        try {
          await saveDailyRecords(authUserId, dateKey, formEntries);
        } catch (err) {
          console.error('Failed to save to Supabase', err);
        }
      });
    }

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

  const getDataStatus = (date: Date) => {
    const key = format(date, 'yyyy-MM-dd');
    if (!records[key]) return 'none';
    
    const activeEntries = records[key].filter(e => parseCurrency(e.value) > 0);
    if (activeEntries.length === 0) return 'none';
    
    const hasAlmoco = activeEntries.some(e => e.label.toLowerCase().includes('almo'));
    const hasJanta = activeEntries.some(e => e.label.toLowerCase().includes('jant'));
    
    if (hasAlmoco && !hasJanta) return 'almoco';
    if (!hasAlmoco && hasJanta) return 'janta';
    if (hasAlmoco && hasJanta) return 'both';
    
    return 'other';
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
      {(authUserId && view !== 'welcome' && view !== 'login') && (
        <header className="bg-white border-b border-slate-200 px-6 lg:px-10 py-4 lg:h-24 flex flex-shrink-0 items-center gap-4 overflow-x-auto z-[60] relative w-full shadow-sm">
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
            onClick={() => setView('calendar')}
            className="w-14 h-14 bg-indigo-50 border border-indigo-100 text-indigo-600 rounded-2xl flex flex-col items-center justify-center hover:bg-indigo-100 shadow-sm shrink-0 transition-colors"
            title="Calendário"
          >
            <span className="text-[10px] font-bold uppercase tracking-widest leading-none mb-1">
              {format(currentDate, 'MMM', { locale: ptBR })}
            </span>
            <span className="text-xl font-black leading-none">
              {format(currentDate, 'dd')}
            </span>
          </button>
          <button 
            onClick={() => setView('blank')}
            className="w-14 h-14 bg-slate-50 border border-slate-200 text-slate-600 rounded-2xl flex items-center justify-center hover:bg-slate-100 shadow-sm shrink-0 transition-colors"
            title="Slideshow"
          >
            <FileText className="w-6 h-6" />
          </button>
          <button 
            onClick={() => setView('annual-balance')}
            className="w-14 h-14 bg-slate-50 border border-slate-200 text-slate-600 rounded-2xl flex items-center justify-center hover:bg-slate-100 shadow-sm shrink-0 transition-colors"
          >
            <BarChart3 className="w-6 h-6" />
          </button>
          <button 
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className="w-14 h-14 bg-slate-50 border border-slate-200 text-slate-600 rounded-2xl flex items-center justify-center hover:bg-slate-100 shadow-sm shrink-0 transition-colors"
            title="Menu de Meses"
          >
            <Menu className="w-6 h-6" />
          </button>
          {(userProfile.role === 'admin' || userProfile.email === 'renatof.rcc@gmail.com') && (
            <button 
              onClick={() => setView('admin')}
              className="w-14 h-14 bg-slate-900 border border-slate-900 text-indigo-400 rounded-2xl flex items-center justify-center hover:bg-slate-800 shadow-sm shrink-0 transition-colors ml-auto mr-0 lg:ml-4 lg:mr-0"
              title="Painel Administrativo"
            >
              <Shield className="w-6 h-6" />
            </button>
          )}
          
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
      )}

      {view === 'welcome' && (
        <div className="flex-1 flex flex-col items-center justify-center p-6 bg-slate-50 min-h-screen">
          <div className="w-32 h-32 rounded-[2rem] bg-indigo-600 flex items-center justify-center mb-8 shadow-xl shadow-indigo-600/20 overflow-hidden">
            <img src="/logo.png" alt="Logo Controle de Diária" className="w-full h-full object-cover" />
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
              className="w-full bg-purple-600 hover:bg-purple-700 text-white font-bold py-4 rounded-2xl flex items-center justify-center gap-3 transition-colors shadow-lg shadow-purple-600/30 active:scale-95 text-lg"
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
        <div className="flex-1 overflow-y-auto bg-slate-50 pt-10 pb-24 px-4">
          <div className="max-w-md mx-auto bg-white rounded-[32px] shadow-sm border border-slate-200 p-8">
            <div className="mb-8">
              <h2 className="text-3xl font-extrabold text-[#1a2332] tracking-tight">{authUserId ? 'Meu Perfil' : 'Criar Perfil'}</h2>
              <p className="text-slate-500 mt-1 font-medium">{authUserId ? 'Atualize suas informações pessoais ou senha' : 'Configure suas informações pessoais'}</p>
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
                  <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-100 transition-opacity">
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
                <label className="text-xs font-bold text-slate-500 uppercase tracking-widest pl-1">{authUserId ? 'Nova Senha (Opcional)' : 'Senha'}</label>
                 <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                  <input 
                    type={showPassword ? "text" : "password"} 
                    value={registerPassword}
                    onChange={(e) => setRegisterPassword(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-2xl pl-12 pr-12 py-3.5 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-shadow font-medium"
                    placeholder={authUserId ? 'Deixe em branco para não alterar' : 'Senha'}
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
                    placeholder={authUserId ? 'Confirme se for alterar a senha' : ''}
                  />
                  <button type="button" onClick={() => setShowConfirmPassword(!showConfirmPassword)} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 focus:outline-none">
                    {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>
            </div>

            <button 
              onClick={handleRegister}
              className="w-full mt-10 bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-4 rounded-2xl flex items-center justify-center gap-3 transition-colors shadow-lg shadow-indigo-600/30 active:scale-95 text-lg"
            >
              {authUserId ? 'Salvar Alterações' : 'Cadastrar'}
              <ArrowRight className="w-5 h-5" />
            </button>
            {authUserId && (
               <button 
                onClick={async () => {
                  await supabase.auth.signOut();
                  setView('welcome');
                }}
                className="w-full mt-4 bg-white hover:bg-red-50 text-red-600 border border-slate-200 hover:border-red-200 active:scale-95 font-bold py-4 rounded-2xl flex items-center justify-center gap-3 transition-all shadow-sm text-lg"
               >
                 Sair (Logout)
               </button>
            )}
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
                <div className="flex justify-between items-center pl-1">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Senha</label>
                  <button type="button" onClick={handleResetPassword} className="text-xs font-bold text-indigo-600 hover:text-indigo-700">Esqueceu a senha?</button>
                </div>
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
            
            {resetMessage && (
              <div className="mt-6 p-4 bg-emerald-50 text-emerald-700 rounded-xl text-center font-bold text-sm border border-emerald-100">
                {resetMessage}
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

      {(view === 'calendar' || view === 'annual-balance' || view === 'blank' || view === 'admin') && (
        <div className="flex-1 flex flex-col min-h-0 relative">
        <main className="flex-1 overflow-y-auto min-h-0 bg-slate-50 relative">
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
                const dataStatus = getDataStatus(day);
                const hasRecords = dataStatus !== 'none';

                let dotColorNormal = "bg-indigo-500";
                let dotColorSelected = "bg-white";
                
                if (dataStatus === 'almoco') {
                  dotColorNormal = "bg-green-500";
                  dotColorSelected = "bg-green-300";
                } else if (dataStatus === 'janta') {
                  dotColorNormal = "bg-red-500";
                  dotColorSelected = "bg-red-300";
                }

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
                        <span className={cn("absolute bottom-1 w-1.5 h-1.5 rounded-full", dotColorNormal)}></span>
                      )}
                      {isSelected && hasRecords && (
                         <span className={cn("absolute bottom-1 w-1.5 h-1.5 rounded-full", dotColorSelected)}></span>
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
            <a
              href="https://mpago.li/2SoYfa3"
              target="_blank"
              rel="noopener noreferrer"
              className="mt-4 w-full py-4 rounded-2xl font-bold text-center flex items-center justify-center gap-3 transition-all text-white border-2 border-indigo-400/50 hover:bg-indigo-800 hover:border-indigo-300 active:scale-95 text-lg shadow-[0_0_15px_-3px_rgba(99,102,241,0.2)] group"
            >
              <Heart className="w-5 h-5 text-pink-400 transition-transform group-hover:scale-110" />
              Seja um Colaborador desse APP
            </a>
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
                  <div className="flex-1 flex items-center justify-center text-indigo-600 font-bold px-2 bg-indigo-50/40">
                    {month.totalMonth > 0 ? formatCurrency(month.totalMonth) : '0,00'}
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-6 shrink-0 bg-white rounded-2xl shadow-sm border border-slate-200 p-4 lg:p-6 flex flex-col">
              <label 
                htmlFor="annual-notes" 
                className="block text-slate-500 font-bold tracking-widest uppercase text-xs mb-3"
              >
                Anotações (4 linhas)
              </label>
              <textarea
                id="annual-notes"
                value={annualNotes}
                onChange={(e) => {
                  setAnnualNotes(e.target.value);
                  if (authUserId) {
                    localforage.setItem(`annualNotes_${authUserId}`, e.target.value).catch(console.error);
                  }
                }}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 resize-none text-slate-700 shadow-inner"
                placeholder="Escreva suas observações para o ano..."
                rows={4}
              />
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
                 <div className="text-2xl lg:text-3xl font-bold text-indigo-400">
                   R$ {formatCurrency(annualData.totalAnual)}
                 </div>
               </div>
            </div>
          </div>
        ) : view === 'blank' ? (
          <div className="max-w-2xl mx-auto w-full flex flex-col p-4 lg:p-8 pb-24 h-full relative">
            
            <div className="flex justify-between items-center mb-6">
              <div>
                <h2 className="text-3xl font-extrabold text-[#1a2332] tracking-tight mb-1">Slideshow</h2>
                <p className="text-slate-500 font-medium">Exibição de notas e imagens</p>
              </div>
              {(userProfile.role === 'admin' || userProfile.email === 'renatof.rcc@gmail.com' || authUserId) && (
                <button
                  onClick={() => setShowSlideConfig(true)}
                  className="bg-indigo-50 text-indigo-600 hover:bg-indigo-100 font-medium py-2 px-4 rounded-xl flex items-center gap-2 transition-colors"
                  title="Adicionar Slide"
                >
                  <Plus className="w-5 h-5" /> Adicionar
                </button>
              )}
            </div>

            {slides.length === 0 ? (
              <div className="flex-1 bg-slate-50 rounded-3xl border border-dashed border-slate-300 flex flex-col items-center justify-center p-8 text-center min-h-[400px]">
                <ImageIcon className="w-16 h-16 text-slate-300 mb-4" />
                <h3 className="text-xl font-bold text-slate-700 mb-2">Sem slides</h3>
                {(userProfile.role === 'admin' || userProfile.email === 'renatof.rcc@gmail.com') ? (
                  <>
                    <p className="text-slate-500 mb-6 max-w-sm">Crie seu primeiro slide para iniciar a apresentação automática.</p>
                    <button
                      onClick={() => setShowSlideConfig(true)}
                      className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 px-6 rounded-xl flex items-center gap-2 transition-colors"
                    >
                      <Plus className="w-5 h-5" /> Criar Slide
                    </button>
                  </>
                ) : (
                  <p className="text-slate-500 mb-6 max-w-sm">A apresentação está vazia e somente o administrador pode adicionar slides.</p>
                )}
              </div>
            ) : (
              <div className="flex-1 rounded-3xl overflow-hidden relative shadow-xl min-h-[400px] flex items-center justify-center bg-slate-900 group">
                <AnimatePresence mode="wait">
                  {slides[currentSlideIndex].type === 'media' && slides[currentSlideIndex].mediaUrl && (
                    <motion.div
                      key={slides[currentSlideIndex].id + '-media'}
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 1.05 }}
                      transition={{ duration: 0.3 }}
                      className="absolute inset-0"
                    >
                      {slides[currentSlideIndex].mediaType === 'video' ? (
                         <video 
                           src={slides[currentSlideIndex].mediaUrl} 
                           autoPlay 
                           loop 
                           muted 
                           className="w-full h-full object-cover" 
                         />
                      ) : (
                        <img 
                          src={slides[currentSlideIndex].mediaUrl} 
                          alt="Slide Media" 
                          className="w-full h-full object-cover opacity-80"
                        />
                      )}
                    </motion.div>
                  )}
                  
                  {(!slides[currentSlideIndex].type || slides[currentSlideIndex].type === 'text' || (slides[currentSlideIndex].type === 'media' && slides[currentSlideIndex].content)) && (
                    <motion.div
                      key={slides[currentSlideIndex].id + '-text'}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      transition={{ duration: 0.3, delay: 0.1 }}
                      className="absolute inset-0 flex items-center justify-center p-8 text-center z-10"
                      style={{ backgroundColor: slides[currentSlideIndex].type === 'text' ? (slides[currentSlideIndex].bgColor || '#6366f1') : 'transparent' }}
                    >
                      <div 
                        style={{ 
                          color: slides[currentSlideIndex].textConfig?.color || '#ffffff', 
                          fontFamily: slides[currentSlideIndex].textConfig?.fontFamily || 'Inter',
                          fontWeight: slides[currentSlideIndex].textConfig?.isBold ? 'bold' : 'normal',
                          fontStyle: slides[currentSlideIndex].textConfig?.isItalic ? 'italic' : 'normal',
                          fontSize: `${slides[currentSlideIndex].textConfig?.fontSize || 32}px`,
                          textShadow: slides[currentSlideIndex].type === 'media' ? '0 4px 12px rgba(0,0,0,0.6)' : 'none'
                        }}
                        className="drop-shadow-md leading-tight max-w-2xl whitespace-pre-line px-4"
                      >
                        {slides[currentSlideIndex].content}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
                
                {/* Controls Overlay */}
                <div className="absolute inset-x-0 bottom-0 p-8 bg-gradient-to-t from-black/60 to-transparent flex flex-col gap-4 opacity-100 transition-opacity z-30 pointer-events-none">
                  <div className="flex justify-center gap-2 pointer-events-auto">
                    {slides.map((_, i) => (
                      <div 
                        key={i} 
                        className={clsx(
                          "w-2 h-2 rounded-full transition-all cursor-pointer",
                          i === currentSlideIndex ? "bg-white w-6" : "bg-white/50 hover:bg-white/80"
                        )}
                        onClick={() => setCurrentSlideIndex(i)}
                      />
                    ))}
                  </div>
                  <div className="flex items-center justify-between pointer-events-auto">
                    {(userProfile.role === 'admin' || userProfile.email === 'renatof.rcc@gmail.com') ? (
                      <div className="flex gap-2">
                        <button 
                          onClick={() => {
                            setNewSlideData(slides[currentSlideIndex]);
                            setShowSlideConfig(true);
                          }}
                          className="w-10 h-10 rounded-full bg-blue-500/80 hover:bg-blue-500 text-white flex items-center justify-center backdrop-blur transition-colors"
                          title="Editar Slide"
                        >
                          <Pencil className="w-5 h-5" />
                        </button>
                        <button 
                          onClick={() => handleDeleteSlide(slides[currentSlideIndex].id)}
                          className="w-10 h-10 rounded-full bg-red-500/80 hover:bg-red-500 text-white flex items-center justify-center backdrop-blur transition-colors"
                          title="Excluir Slide"
                        >
                          <Trash2 className="w-5 h-5" />
                        </button>
                      </div>
                    ) : (
                      <div className="w-10 h-10" />
                    )}

                    <div className="flex items-center gap-4">
                      <button 
                        onClick={() => setCurrentSlideIndex(prev => prev === 0 ? slides.length - 1 : prev - 1)}
                        className="w-12 h-12 rounded-full bg-white/20 hover:bg-white/30 text-white flex items-center justify-center backdrop-blur transition-colors"
                      >
                        <ChevronLeft className="w-8 h-8" />
                      </button>
                      <button 
                        onClick={() => setIsPlaying(!isPlaying)}
                        className="w-16 h-16 rounded-full bg-white text-slate-900 flex items-center justify-center shadow-lg hover:scale-105 active:scale-95 transition-all"
                      >
                        {isPlaying ? <Pause className="w-8 h-8" /> : <Play className="w-8 h-8 ml-1" />}
                      </button>
                      <button 
                        onClick={() => setCurrentSlideIndex(prev => (prev + 1) % slides.length)}
                        className="w-12 h-12 rounded-full bg-white/20 hover:bg-white/30 text-white flex items-center justify-center backdrop-blur transition-colors"
                      >
                        <ChevronRight className="w-8 h-8" />
                      </button>
                    </div>

                    <div className="w-10 h-10" /> {/* Spacer to balance flex layout */}
                  </div>
                </div>
              </div>
            )}

            {showSlideConfig && (
              <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
                <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
                  <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                    <h3 className="text-xl font-bold text-slate-800">{newSlideData.id ? "Editar Slide" : "Adicionar Slide"}</h3>
                    <button onClick={() => setShowSlideConfig(false)} className="text-slate-400 hover:text-slate-600 bg-white shadow-sm p-1.5 rounded-full transition-colors">
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                  
                  <div className="p-6 flex-1 overflow-y-auto">
                    <div className="flex gap-2 p-1 bg-slate-100 rounded-xl mb-6">
                      <button
                        onClick={() => setNewSlideData({ ...newSlideData, type: 'text' })}
                        className={clsx(
                          "flex-1 py-2 rounded-lg text-sm font-bold flex items-center justify-center gap-2 transition-colors",
                          newSlideData.type === 'text' ? "bg-white text-slate-800 shadow-sm" : "text-slate-500 hover:text-slate-700"
                        )}
                      >
                        <Type className="w-4 h-4" /> Texto
                      </button>
                      <button
                        onClick={() => setNewSlideData({ ...newSlideData, type: 'media' })}
                        className={clsx(
                          "flex-1 py-2 rounded-lg text-sm font-bold flex items-center justify-center gap-2 transition-colors",
                          newSlideData.type === 'media' ? "bg-white text-slate-800 shadow-sm" : "text-slate-500 hover:text-slate-700"
                        )}
                      >
                        <ImageIcon className="w-4 h-4" /> Imagem/Vídeo
                      </button>
                    </div>

                    <div className="space-y-6">
                      {newSlideData.type === 'media' && (
                        <div>
                          <label className="text-xs font-bold text-slate-500 uppercase tracking-widest pl-1 mb-2 block">Upload da Mídia</label>
                          <label className="flex items-center justify-center w-full h-32 px-4 transition bg-white border-2 border-slate-300 border-dashed rounded-2xl appearance-none cursor-pointer hover:border-indigo-400 focus:outline-none">
                            <span className="flex items-center space-x-2">
                               <Upload className="w-6 h-6 text-slate-400" />
                               <span className="font-medium text-slate-600">
                                 {newSlideData.mediaUrl ? "Alterar arquivo selecionado" : "Selecione uma imagem ou vídeo curto"}
                               </span>
                            </span>
                            <input type="file" name="file_upload" className="hidden" accept="image/*,video/*" onChange={(e) => {
                               const file = e.target.files?.[0];
                               if (file) {
                                 const reader = new FileReader();
                                 reader.onload = (event) => {
                                   if (event.target?.result) {
                                     setNewSlideData(prev => ({
                                       ...prev,
                                       mediaUrl: event.target!.result as string,
                                       mediaType: file.type.startsWith('video/') ? 'video' : 'image'
                                     }));
                                   }
                                 };
                                 reader.readAsDataURL(file);
                               }
                            }}/>
                          </label>
                          {newSlideData.mediaUrl && newSlideData.mediaType === 'image' && (
                            <div className="mt-4 rounded-xl overflow-hidden border border-slate-200 bg-slate-50 h-32">
                              <img src={newSlideData.mediaUrl} alt="Preview" className="w-full h-full object-cover" />
                            </div>
                          )}
                          {newSlideData.mediaUrl && newSlideData.mediaType === 'video' && (
                            <div className="mt-4 rounded-xl overflow-hidden border border-slate-200 bg-slate-50 h-32 flex items-center justify-center relative">
                               <Video className="w-8 h-8 text-slate-400" />
                               <span className="absolute bottom-2 right-2 px-2 py-1 bg-black/60 text-white text-xs rounded-md">Vídeo Selecionado</span>
                            </div>
                          )}
                        </div>
                      )}

                      <div>
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-widest pl-1">
                          {newSlideData.type === 'media' ? 'Texto Sobreposto (Opcional)' : 'Mensagem'}
                        </label>
                        <textarea 
                          value={newSlideData.content}
                          onChange={(e) => setNewSlideData({ ...newSlideData, content: e.target.value })}
                          className="mt-1 w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 min-h-[100px] resize-none"
                          placeholder={newSlideData.type === 'media' ? "Escreva algo sobre a imagem..." : "Escreva algo inspirador..."}
                        />
                      </div>

                      <div className="flex flex-col gap-4">
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-widest pl-1 -mb-2">Estilo do Texto</label>
                        <div className="flex items-center gap-2 flex-wrap bg-slate-50 p-2 rounded-2xl border border-slate-200">
                          <button
                            onClick={() => setNewSlideData(p => ({ ...p, textConfig: { ...p.textConfig!, isBold: !p.textConfig?.isBold } }))}
                            className={clsx("p-2 rounded-xl transition-colors", newSlideData.textConfig?.isBold ? "bg-indigo-100 text-indigo-700" : "text-slate-500 hover:bg-slate-200")}
                            title="Negrito"
                          >
                            <Bold className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => setNewSlideData(p => ({ ...p, textConfig: { ...p.textConfig!, isItalic: !p.textConfig?.isItalic } }))}
                            className={clsx("p-2 rounded-xl transition-colors", newSlideData.textConfig?.isItalic ? "bg-indigo-100 text-indigo-700" : "text-slate-500 hover:bg-slate-200")}
                            title="Itálico"
                          >
                            <Italic className="w-4 h-4" />
                          </button>
                          <div className="w-px h-6 bg-slate-300 mx-1"></div>
                          <button
                            onClick={() => setNewSlideData(p => ({ ...p, textConfig: { ...p.textConfig!, fontSize: Math.max(16, (p.textConfig?.fontSize || 32) - 4) } }))}
                            className="p-2 text-slate-600 hover:bg-slate-200 rounded-xl"
                            title="Diminuir Texto"
                          >
                            <TypeIcon className="w-3 h-3" />
                          </button>
                          <span className="text-sm font-medium w-8 text-center">{newSlideData.textConfig?.fontSize || 32}</span>
                          <button
                            onClick={() => setNewSlideData(p => ({ ...p, textConfig: { ...p.textConfig!, fontSize: Math.min(120, (p.textConfig?.fontSize || 32) + 4) } }))}
                            className="p-2 text-slate-600 hover:bg-slate-200 rounded-xl"
                            title="Aumentar Texto"
                          >
                            <TypeIcon className="w-5 h-5" />
                          </button>
                          <div className="w-px h-6 bg-slate-300 mx-1"></div>
                          <select
                            value={newSlideData.textConfig?.fontFamily || 'Inter'}
                            onChange={(e) => setNewSlideData(p => ({ ...p, textConfig: { ...p.textConfig!, fontFamily: e.target.value } }))}
                            className="bg-transparent border-none text-sm font-medium focus:ring-0 text-slate-700 p-2 cursor-pointer outline-none"
                          >
                            <option value="Inter">Inter</option>
                            <option value="'Times New Roman', Times, serif">Times New Roman</option>
                            <option value="Georgia, serif">Georgia</option>
                            <option value="serif">Serif</option>
                            <option value="monospace">Monospace</option>
                            <option value="cursive">Cursive</option>
                            <option value="system-ui">System</option>
                          </select>
                        </div>
                        
                        <div>
                          <label className="text-xs font-bold text-slate-500 uppercase tracking-widest pl-1 mb-2 block">Cor do Texto</label>
                          <div className="flex gap-2 flex-wrap">
                            {['#ffffff', '#000000', '#f87171', '#fbbf24', '#34d399', '#60a5fa', '#a78bfa'].map(color => (
                              <button
                                key={color}
                                onClick={() => setNewSlideData(p => ({ ...p, textConfig: { ...p.textConfig!, color } }))}
                                className={clsx(
                                  "w-8 h-8 rounded-full transition-transform border border-slate-200",
                                  newSlideData.textConfig?.color === color ? "scale-110 ring-2 ring-offset-2 ring-slate-800" : "hover:scale-105"
                                )}
                                style={{ backgroundColor: color }}
                              />
                            ))}
                          </div>
                        </div>
                      </div>

                      {newSlideData.type === 'text' && (
                        <div>
                          <label className="text-xs font-bold text-slate-500 uppercase tracking-widest pl-1 mb-2 block">Cor de Fundo</label>
                          <div className="flex gap-2 flex-wrap">
                            {['#6366f1', '#ec4899', '#f59e0b', '#10b981', '#3b82f6', '#8b5cf6', '#1e293b'].map(color => (
                              <button
                                key={color}
                                onClick={() => setNewSlideData({ ...newSlideData, bgColor: color })}
                                className={clsx(
                                  "w-10 h-10 rounded-full transition-transform",
                                  newSlideData.bgColor === color ? "scale-110 ring-2 ring-offset-2 ring-slate-800" : "hover:scale-105"
                                )}
                                style={{ backgroundColor: color }}
                              />
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="p-4 border-t border-slate-100 flex gap-3 bg-white">
                     <button
                      onClick={() => setShowSlideConfig(false)}
                      className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-3 px-6 rounded-xl transition-colors"
                     >
                      Cancelar
                     </button>
                     <button
                      onClick={handleSaveSlide}
                      className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 px-6 rounded-xl transition-colors"
                     >
                      Salvar Slide
                     </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        ) : view === 'admin' ? (
          <div className="max-w-5xl mx-auto w-full flex flex-col p-4 lg:p-8 pb-24 h-full overflow-y-auto">
            <div className="flex flex-col md:flex-row md:items-end justify-between mb-8 gap-4">
              <div>
                <h2 className="text-3xl font-bold text-slate-800 mb-1">Painel Administrativo</h2>
                <p className="text-slate-500">Gestão ativa dos clientes e usuários do sistema.</p>
              </div>
              <div className="relative max-w-sm w-full md:w-auto">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Search className="h-5 w-5 text-slate-400" />
                </div>
                <input
                  type="text"
                  placeholder="Buscar por nome ou email..."
                  value={adminSearchQuery}
                  onChange={(e) => setAdminSearchQuery(e.target.value)}
                  className="pl-10 pr-4 py-2 w-full border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white shadow-sm"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex items-center justify-between">
                 <div>
                   <p className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-1">Total de Clientes</p>
                   <p className="text-3xl font-bold text-slate-800">{allUsers.length}</p>
                 </div>
                 <div className="w-12 h-12 bg-indigo-50 rounded-2xl flex items-center justify-center text-indigo-600">
                   <Users className="w-6 h-6" />
                 </div>
              </div>
              <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex items-center justify-between">
                 <div>
                   <p className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-1">Ativos</p>
                   <p className="text-3xl font-bold text-emerald-600">{allUsers.filter(u => !u.is_blocked).length}</p>
                 </div>
                 <div className="w-12 h-12 bg-emerald-50 rounded-2xl flex items-center justify-center text-emerald-600">
                   <Shield className="w-6 h-6" />
                 </div>
              </div>
              <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex items-center justify-between">
                 <div>
                   <p className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-1">Bloqueados</p>
                   <p className="text-3xl font-bold text-red-600">{allUsers.filter(u => u.is_blocked).length}</p>
                 </div>
                 <div className="w-12 h-12 bg-red-50 rounded-2xl flex items-center justify-center text-red-600">
                   <Lock className="w-6 h-6" />
                 </div>
              </div>
            </div>

            <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse min-w-[700px]">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold text-sm">
                      <th className="p-4 pl-6 uppercase tracking-wider text-xs">Cliente</th>
                      <th className="p-4 uppercase tracking-wider text-xs">Contato</th>
                      <th className="p-4 uppercase tracking-wider text-xs w-32 text-center">Status</th>
                      <th className="p-4 uppercase tracking-wider text-xs w-40 text-center">Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {allUsers.length === 0 && (
                      <tr>
                        <td colSpan={4} className="p-8 text-center text-slate-500">
                          Nenhum usuário encontrado ou carregando...
                        </td>
                      </tr>
                    )}
                    {allUsers
                      .filter(u => 
                         (u.name?.toLowerCase() || '').includes(adminSearchQuery.toLowerCase()) || 
                         (u.last_name?.toLowerCase() || '').includes(adminSearchQuery.toLowerCase()) || 
                         (u.email?.toLowerCase() || '').includes(adminSearchQuery.toLowerCase())
                      )
                      .map((u) => (
                      <tr key={u.id} className="border-b border-slate-100/50 hover:bg-slate-50/50 transition-colors">
                        <td className="p-4 pl-6">
                           <div className="flex items-center gap-3">
                             <div className="w-10 h-10 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-sm shrink-0 border border-indigo-200">
                               {u.photo_url ? (
                                  <img src={u.photo_url} alt="" className="w-10 h-10 rounded-full object-cover" />
                               ) : (
                                  `${(u.name?.[0] || u.email[0]).toUpperCase()}`
                               )}
                             </div>
                             <div>
                               <div className="font-bold text-slate-800 flex items-center gap-2">
                                 {u.name || 'Sem nome'} {u.last_name || ''}
                                 {u.role === 'admin' && <span className="text-[10px] bg-slate-800 text-white px-2 py-0.5 rounded-full uppercase tracking-wider font-bold">Admin</span>}
                               </div>
                               <div className="text-xs text-slate-400 mt-0.5">Cadastrado em {u.created_at ? format(new Date(u.created_at), 'dd/MM/yyyy') : 'N/A'}</div>
                             </div>
                           </div>
                        </td>
                        <td className="p-4">
                          <div className="text-slate-700 font-medium">{u.email}</div>
                          <div className="text-xs text-slate-500 mt-0.5">{u.phone || 'Sem telefone'}</div>
                        </td>
                        <td className="p-4 text-center">
                          <span className={cn(
                            "text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-wider",
                            u.is_blocked ? "bg-red-100 text-red-700" : "bg-emerald-100 text-emerald-700"
                          )}>
                            {u.is_blocked ? 'Bloqueado' : 'Ativo'}
                          </span>
                        </td>
                        <td className="p-4 text-center space-x-2">
                           {userProfile.email !== u.email && (
                             <div className="flex items-center justify-center gap-2">
                              <button 
                                onClick={() => toggleBlock(u.id, u.is_blocked)} 
                                className={cn(
                                  "w-9 h-9 rounded-xl flex items-center justify-center transition-colors shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-indigo-500",
                                  u.is_blocked ? "bg-emerald-50 text-emerald-600 hover:bg-emerald-100 border border-emerald-200" : "bg-orange-50 text-orange-600 hover:bg-orange-100 border border-orange-200"
                                )}
                                title={u.is_blocked ? 'Desbloquear Acesso' : 'Bloquear Acesso'}
                              >
                                {u.is_blocked ? <Unlock className="w-4 h-4" /> : <Lock className="w-4 h-4" />}
                              </button>
                              <button 
                                onClick={() => deleteUser(u.id)}
                                className="w-9 h-9 bg-white border border-red-200 text-red-600 rounded-xl flex items-center justify-center hover:bg-red-50 transition-colors shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-red-500"
                                title="Excluir Definitivamente"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                             </div>
                           )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
            
            <div className="mt-8 flex justify-center pb-8 shrink-0">
               <button 
                 onClick={() => setView('calendar')} 
                 className="bg-white text-slate-700 border border-slate-200 font-semibold py-3 px-8 rounded-xl shadow-sm hover:bg-slate-50 transition-colors"
               >
                 Voltar ao Resumo
               </button>
            </div>
          </div>
        ) : null}
      </main>

      {/* SIDEBAR DRAWER (NOW A FULL-WIDTH PANEL BELOW HEADER) */}
      <AnimatePresence>
        {isSidebarOpen && (
            <motion.div
              key="panel"
              initial={{ y: -50, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: -50, opacity: 0 }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="absolute top-0 left-0 w-full h-full bg-slate-50/95 backdrop-blur-md z-40 flex flex-col font-sans"
            >
              <div className="p-6 md:p-8 flex flex-col items-center justify-center border-b border-slate-100 bg-white shadow-sm">
                <div className="w-full flex items-center justify-between max-w-sm mx-auto">
                  <h2 className="font-bold text-slate-800 text-xl leading-tight tracking-wide">Selecionar Mês</h2>
                  <button onClick={() => setIsSidebarOpen(false)} className="text-slate-400 hover:text-slate-800 bg-slate-50 p-2 rounded-full transition-colors">
                    <X className="w-6 h-6" />
                  </button>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-6 md:p-10 flex flex-col items-center">
                <div className="grid grid-cols-4 gap-4 w-full max-w-sm">
                  {monthsList.map((monthName, index) => {
                    const monthDate = setMonth(displayedMonth, index);
                    const isCurMonth = isSameMonth(monthDate, displayedMonth);
                    
                    const isPast = getYear(monthDate) < getYear(displayedMonth) || 
                                  (getYear(monthDate) === getYear(displayedMonth) && index < displayedMonth.getMonth());
                    
                    let stateClass = "text-slate-600 hover:bg-slate-100 bg-white border border-slate-100 shadow-sm";
                    let dot = null;

                    if (isCurMonth) {
                      stateClass = "bg-indigo-600 text-white font-bold border-indigo-600 shadow-md shadow-indigo-600/20";
                    } else if (isPast) {
                      stateClass = "text-indigo-400 bg-indigo-50/50 border border-indigo-50/50";
                      dot = <span className="absolute bottom-2 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full bg-indigo-300"></span>;
                    }

                    return (
                      <button
                        key={monthName}
                        onClick={() => selectMonthFromSidebar(index)}
                        className={cn(
                          "w-full aspect-[4/3] flex flex-col items-center justify-center rounded-2xl text-sm font-bold transition-all relative overflow-hidden",
                          stateClass
                        )}
                      >
                        <span className="capitalize">{monthName.substring(0, 3)}</span>
                        {dot}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="p-6 bg-slate-50 flex justify-center pb-8 border-t border-slate-200">
                 {(userProfile.role === 'admin' || userProfile.email === 'renatof.rcc@gmail.com') && (
                    <button 
                      onClick={() => {
                        setView('admin');
                        setIsSidebarOpen(false);
                      }}
                      className="w-full max-w-sm bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold py-4 rounded-2xl flex items-center justify-center gap-3 transition-all shadow-sm"
                    >
                      <User className="w-5 h-5" />
                      <span>Painel Admin</span>
                    </button>
                 )}
              </div>
            </motion.div>
        )}
      </AnimatePresence>

      </div>
      )}

    </div>
  );
}
