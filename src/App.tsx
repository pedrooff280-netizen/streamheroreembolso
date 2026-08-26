import React, { useState, useEffect, useCallback } from 'react';
import { 
  ArrowRight, 
  ArrowLeft, 
  Check, 
  CheckCircle2, 
  ChevronRight, 
  HelpCircle, 
  Loader2, 
  Mail, 
  Hash, 
  Clock, 
  AlertTriangle, 
  Moon,
  Sun,
  AlertCircle,
  ShieldCheck,
  XCircle,
  ExternalLink,
  FileText
} from 'lucide-react';
import { TermosDeUso } from './components/TermosDeUso';

export interface RefundRecord {
  id: string;
  email: string;
  orderId: string;
  motivo: string;
  details?: string;
  dataSolicitacao: number | string;
  status: 'aguardando_documentos' | 'pix_enviado' | 'reembolso_concluido';
  pix: string | null;
  feedbackFinal: string | null;
  dataEnvioPix: number | string | null;
  createdAt: string;
  updatedAt: string;
}

const SEVENTY_TWO_HOURS_MS = 72 * 60 * 60 * 1000;
const FIVE_DAYS_MS = 5 * 24 * 60 * 60 * 1000;

const reasonMap: Record<string, string> = {
  nao_funcionou: 'Produto não funcionou como esperado',
  duplicada: 'Compra duplicada ou acidental',
  sem_acesso: 'Não recebi acesso ao produto',
  garantia: 'Desisti dentro do prazo de garantia',
  outro: 'Outro motivo'
};

function parseTimestamp(val: any): number {
  if (!val) return 0;
  if (typeof val === 'number' && !isNaN(val) && val > 0) return val;
  const num = Number(val);
  if (!isNaN(num) && num > 0) return num;
  const dateNum = new Date(val).getTime();
  if (!isNaN(dateNum) && dateNum > 0) return dateNum;
  return 0;
}

export default function App() {
  const [currentPage, setCurrentPage] = useState<'reembolso' | 'termos'>('reembolso');
  
  // Theme state: dark (default) or light
  const [isDarkMode, setIsDarkMode] = useState<boolean>(() => {
    const saved = localStorage.getItem('hero_theme');
    return saved ? saved === 'dark' : true;
  });

  // Active step flow: 1 (Identificação), 2 (Motivo), 3 (Confirmação), 4 (Processamento)
  const [currentStep, setCurrentStep] = useState<number>(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Form State
  const [email, setEmail] = useState(() => localStorage.getItem('hero_refund_email') || '');
  const [orderId, setOrderId] = useState(() => localStorage.getItem('hero_refund_order_id') || '');
  const [reason, setReason] = useState('nao_funcionou');
  const [details, setDetails] = useState('');
  const [pixKey, setPixKey] = useState('');
  const [feedback, setFeedback] = useState('');

  // Backend state
  const [requestRecord, setRequestRecord] = useState<RefundRecord | null>(null);
  const [serverTimeOffset, setServerTimeOffset] = useState<number>(0);
  const [now, setNow] = useState<number>(Date.now());
  const [serverCanAdvanceToPix, setServerCanAdvanceToPix] = useState<boolean>(false);
  const [serverIsPixCompleted, setServerIsPixCompleted] = useState<boolean>(false);

  const toggleTheme = () => {
    setIsDarkMode((prev) => {
      const next = !prev;
      localStorage.setItem('hero_theme', next ? 'dark' : 'light');
      return next;
    });
  };

  // Sync server clock
  const syncServerTime = useCallback(async () => {
    try {
      const res = await fetch('/api/time');
      if (res.ok) {
        const data = await res.json();
        const clientNow = Date.now();
        setServerTimeOffset(data.serverTime - clientNow);
      }
    } catch {
      // fallback
    }
  }, []);

  // Lookup refund record by email
  const checkExistingRefund = useCallback(async (searchEmail: string) => {
    if (!searchEmail || !searchEmail.includes('@')) return;
    setIsLoading(true);
    setErrorMsg(null);
    try {
      await syncServerTime();
      const res = await fetch('/api/refunds/lookup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: searchEmail }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erro ao consultar servidor.');

      if (data.found && data.request) {
        setRequestRecord(data.request);
        setOrderId(data.request.orderId || orderId);
        setServerCanAdvanceToPix(Boolean(data.canAdvanceToPix));
        setServerIsPixCompleted(Boolean(data.isPixCompleted));
        if (data.serverTime) {
          setServerTimeOffset(data.serverTime - Date.now());
        }
        setCurrentStep(4);
      } else {
        setRequestRecord(null);
        setServerCanAdvanceToPix(false);
        setServerIsPixCompleted(false);
      }
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || 'Erro ao comunicar com o servidor.');
    } finally {
      setIsLoading(false);
    }
  }, [orderId, syncServerTime]);

  useEffect(() => {
    if (email) {
      checkExistingRefund(email);
    }
  }, []);

  useEffect(() => {
    const timer = setInterval(() => {
      setNow(Date.now() + serverTimeOffset);
    }, 1000);
    return () => clearInterval(timer);
  }, [serverTimeOffset]);

  const serverNow = now;
  const dataSolicitacao = parseTimestamp(requestRecord?.dataSolicitacao);
  const elapsedMs = dataSolicitacao > 0 ? Math.max(0, serverNow - dataSolicitacao) : 0;
  const remainingMs = Math.max(0, SEVENTY_TWO_HOURS_MS - elapsedMs);

  const totalSeconds72h = Math.floor(remainingMs / 1000);
  const hours72h = Math.floor(totalSeconds72h / 3600);
  const minutes72h = Math.floor((totalSeconds72h % 3600) / 60);
  const seconds72h = totalSeconds72h % 60;

  // 72h completion logic: true if server flag is true OR remaining time is <= 0 OR elapsed time >= 72h
  const isTimer72hCompleted =
    requestRecord?.status === 'aguardando_documentos' &&
    (serverCanAdvanceToPix || remainingMs <= 0 || (dataSolicitacao > 0 && elapsedMs >= SEVENTY_TWO_HOURS_MS));

  const dataEnvioPix = parseTimestamp(requestRecord?.dataEnvioPix);
  const elapsedPixMs = dataEnvioPix > 0 ? Math.max(0, serverNow - dataEnvioPix) : 0;
  const remainingPixMs = Math.max(0, FIVE_DAYS_MS - elapsedPixMs);

  const totalSecondsPix = Math.floor(remainingPixMs / 1000);
  const daysPix = Math.floor(totalSecondsPix / 86400);
  const hoursPix = Math.floor((totalSecondsPix % 86400) / 3600);
  const minutesPix = Math.floor((totalSecondsPix % 3600) / 60);
  const secondsPix = totalSecondsPix % 60;

  // 5-day PIX completion logic: true if server flag is true OR remaining time <= 0 OR elapsed time >= 5 days
  const isPix5DaysCompleted =
    (requestRecord?.status === 'pix_enviado' || requestRecord?.status === 'reembolso_concluido') &&
    (serverIsPixCompleted || remainingPixMs <= 0 || (dataEnvioPix > 0 && elapsedPixMs >= FIVE_DAYS_MS));

  const formatTimerPill72h = () => {
    const hh = String(hours72h).padStart(2, '0');
    const mm = String(minutes72h).padStart(2, '0');
    const ss = String(seconds72h).padStart(2, '0');
    return `${hh}:${mm}:${ss}`;
  };

  const formatTimerPill5Days = () => {
    const dd = String(daysPix);
    const hh = String(hoursPix).padStart(2, '0');
    const mm = String(minutesPix).padStart(2, '0');
    const ss = String(secondsPix).padStart(2, '0');
    return `${dd}d ${hh}:${mm}:${ss}`;
  };

  const handleStep1Submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !email.includes('@')) {
      setErrorMsg('Por favor, informe um e-mail válido.');
      return;
    }
    if (!orderId.trim()) {
      setErrorMsg('Por favor, informe o número do pedido.');
      return;
    }

    const cleanEmail = email.trim().toLowerCase();
    localStorage.setItem('hero_refund_email', cleanEmail);
    localStorage.setItem('hero_refund_order_id', orderId.trim());

    setIsLoading(true);
    setErrorMsg(null);

    try {
      await syncServerTime();
      const res = await fetch('/api/refunds/lookup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: cleanEmail }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erro ao consultar.');

      if (data.found && data.request) {
        setRequestRecord(data.request);
        setServerCanAdvanceToPix(Boolean(data.canAdvanceToPix));
        setServerIsPixCompleted(Boolean(data.isPixCompleted));
        if (data.serverTime) {
          setServerTimeOffset(data.serverTime - Date.now());
        }
        setCurrentStep(4);
      } else {
        setRequestRecord(null);
        setServerCanAdvanceToPix(false);
        setServerIsPixCompleted(false);
        setCurrentStep(2);
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Erro ao verificar solicitação.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleStep2Submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!reason) {
      setErrorMsg('Selecione um motivo para o reembolso.');
      return;
    }
    setErrorMsg(null);
    setCurrentStep(3);
  };

  const handleStep3Submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrorMsg(null);

    try {
      const res = await fetch('/api/refunds/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: email.trim().toLowerCase(),
          orderId: orderId.trim(),
          motivo: reasonMap[reason] || reason,
          details: details.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erro ao criar solicitação.');

      setRequestRecord(data.request);
      setServerCanAdvanceToPix(false);
      setServerIsPixCompleted(false);
      if (data.serverTime) {
        setServerTimeOffset(data.serverTime - Date.now());
      }
      setCurrentStep(4);
    } catch (err: any) {
      setErrorMsg(err.message || 'Erro ao salvar solicitação.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleFinalizeRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pixKey.trim() || !feedback.trim()) {
      setErrorMsg('Preencha a Chave PIX e o Feedback obrigatório.');
      return;
    }

    setIsSubmitting(true);
    setErrorMsg(null);

    try {
      const res = await fetch('/api/refunds/finalize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: email.trim().toLowerCase(),
          pix: pixKey.trim(),
          feedbackFinal: feedback.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erro ao finalizar solicitação.');

      setRequestRecord(data.request);
      setServerIsPixCompleted(false);
      if (data.serverTime) {
        setServerTimeOffset(data.serverTime - Date.now());
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Erro ao finalizar solicitação.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResetSession = () => {
    setRequestRecord(null);
    setServerCanAdvanceToPix(false);
    setServerIsPixCompleted(false);
    setCurrentStep(1);
    setEmail('');
    setOrderId('');
    setReason('nao_funcionou');
    setDetails('');
    setPixKey('');
    setFeedback('');
    setErrorMsg(null);
    localStorage.removeItem('hero_refund_email');
    localStorage.removeItem('hero_refund_order_id');
  };

  const steps = [
    { id: 1, title: 'Identificação' },
    { id: 2, title: 'Motivo' },
    { id: 3, title: 'Confirmação' },
    { id: 4, title: 'Processamento' },
  ];

  const TermosLinkButton = ({ text = 'Termos de Uso' }: { text?: string }) => (
    <button
      type="button"
      onClick={() => setCurrentPage('termos')}
      className="inline-flex items-center gap-1 font-semibold text-[#E74C6A] hover:text-[#f05c79] hover:underline cursor-pointer bg-[#E74C6A]/10 hover:bg-[#E74C6A]/20 px-2 py-0.5 rounded-md transition-all text-xs border border-[#E74C6A]/20"
      title="Clique para ler os Termos de Uso completos"
    >
      <span>{text}</span>
      <ExternalLink className="w-3 h-3" />
    </button>
  );

  return (
    <div className={`min-h-screen font-sans relative pb-24 transition-colors duration-300 ${
      isDarkMode 
        ? 'bg-luxe-gradient text-white selection:bg-[#5C1327] selection:text-white' 
        : 'bg-[#FAFAFC] text-[#111827] selection:bg-rose-100 selection:text-rose-900'
    }`}>
      {isDarkMode && <div className="luxe-ambient-glow" />}

      {/* Header Original Floating Navbar */}
      <header className="fixed top-6 left-0 right-0 z-50 px-4 flex justify-center">
        <div className={`rounded-full px-6 py-3 flex items-center justify-between w-full max-w-5xl transition-colors duration-300 ${
          isDarkMode 
            ? 'bg-[#09080B] border border-[#2A2328] shadow-[0_8px_30px_rgba(0,0,0,0.4)] text-white' 
            : 'bg-white border border-[#E5E7EB] shadow-[0_4px_20px_rgba(0,0,0,0.06)] text-[#111827]'
        }`}>
          {/* Logo */}
          <div 
            onClick={() => setCurrentPage('reembolso')} 
            className="flex items-center gap-3 cursor-pointer"
          >
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#E74C6A] to-[#5C1327] flex items-center justify-center shadow-[0_0_15px_rgba(231,76,106,0.3)]">
              <span className="font-bold text-lg text-white">H</span>
            </div>
            <span className="font-bold text-xl tracking-wide">Hero</span>
          </div>

          {/* Center Nav */}
          <nav className="hidden md:flex items-center gap-8">
            <span 
              onClick={() => setCurrentPage('reembolso')}
              className={`text-sm cursor-pointer transition-colors ${
                currentPage === 'reembolso' 
                  ? 'font-semibold text-current' 
                  : isDarkMode ? 'font-medium text-[#B0A8AE] hover:text-white' : 'font-medium text-[#6B7280] hover:text-[#111827]'
              }`}
            >
              Central de Reembolso
            </span>
            <span 
              onClick={() => setCurrentPage('termos')}
              className={`text-sm cursor-pointer transition-colors ${
                currentPage === 'termos' 
                  ? 'font-semibold text-current' 
                  : isDarkMode ? 'font-medium text-[#B0A8AE] hover:text-white' : 'font-medium text-[#6B7280] hover:text-[#111827]'
              }`}
            >
              Termos de Uso
            </span>
          </nav>

          {/* Action Button & Theme Toggle */}
          <div className="flex items-center gap-4">
            {currentPage === 'termos' && (
              <span className={`text-[10px] font-bold tracking-widest uppercase hidden lg:block mr-2 ${isDarkMode ? 'text-[#B0A8AE]' : 'text-[#6B7280]'}`}>
                Atualizado: 2026
              </span>
            )}

            <button 
              onClick={toggleTheme}
              className={`w-10 h-10 rounded-full flex items-center justify-center transition-all cursor-pointer ${
                isDarkMode 
                  ? 'bg-[#121015] border border-[#2A2328] text-[#B0A8AE] hover:text-white hover:bg-[#1a171c]' 
                  : 'bg-[#F3F4F6] border border-[#E5E7EB] text-[#F59E0B] hover:text-amber-600 hover:bg-[#E5E7EB]'
              }`}
              title={isDarkMode ? 'Alternar para Modo Claro' : 'Alternar para Modo Escuro'}
            >
              {isDarkMode ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Body */}
      <main className="max-w-6xl mx-auto px-6 pt-32 pb-12 relative z-10">
        {currentPage === 'termos' ? (
          <TermosDeUso />
        ) : (
          <div className="flex flex-col lg:flex-row gap-12 lg:gap-24">
            
            {/* Sidebar Left Column */}
            <div className="lg:w-64 shrink-0 space-y-8">
              <div>
                <h3 className={`text-xs font-bold tracking-widest uppercase mb-6 ${isDarkMode ? 'text-[#B0A8AE]' : 'text-[#6B7280]'}`}>
                  ETAPAS DO PROCESSO
                </h3>
                <div className="space-y-1 relative">
                  {/* Vertical Line */}
                  <div className={`absolute left-[3px] top-4 bottom-4 w-px -z-10 ${isDarkMode ? 'bg-[#2A2328]' : 'bg-[#E5E7EB]'}`} />
                  
                  {steps.map((step) => {
                    const isActive = step.id === currentStep;
                    const isPast = requestRecord ? true : step.id < currentStep;
                    
                    return (
                      <div
                        key={step.id}
                        className={`flex items-center gap-4 py-3 px-2 rounded-lg transition-colors ${
                          isActive ? isDarkMode ? 'bg-[#171215] border border-[#2A2328] -ml-2' : 'bg-white border border-[#E5E7EB] -ml-2 shadow-xs' : ''
                        }`}
                      >
                        <div className={`w-2 h-2 rounded-full relative shrink-0 ${
                          isActive || isPast
                            ? 'bg-[#22C55E] shadow-[0_0_10px_#22C55E]' 
                            : isDarkMode ? 'bg-[#2A2328]' : 'bg-[#E5E7EB]'
                        }`} />
                        <span className={`font-semibold text-sm flex items-center gap-2 ${
                          isActive || isPast ? 'text-[#22C55E]' : isDarkMode ? 'text-[#2A2328]' : 'text-[#9CA3AF]'
                        }`}>
                          {step.id}. {step.title}
                          {isPast && <Check className="w-4 h-4" />}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Support Box */}
              <div className={`p-6 rounded-2xl border ${isDarkMode ? 'bg-[#171215] border-[#2A2328]' : 'bg-white border-[#E5E7EB] shadow-xs'}`}>
                <HelpCircle className="w-5 h-5 text-[#E74C6A] mb-3" />
                <p className={`text-sm mb-4 leading-relaxed ${isDarkMode ? 'text-[#B0A8AE]' : 'text-[#4B5563]'}`}>
                  Dúvidas sobre o reembolso ou os nossos termos?
                </p>
                <button 
                  onClick={() => setCurrentPage('termos')}
                  className="text-sm font-semibold text-[#E74C6A] hover:underline transition-colors flex items-center gap-1 cursor-pointer"
                >
                  Fale com o suporte <ChevronRight className="w-4 h-4" />
                </button>
              </div>

              {/* Active email indicator badge */}
              {email && requestRecord && (
                <div className={`p-4 rounded-xl border text-xs space-y-2 ${isDarkMode ? 'bg-[#121015] border-[#2A2328] text-[#B0A8AE]' : 'bg-white border-[#E5E7EB] text-[#6B7280] shadow-xs'}`}>
                  <p className={`font-semibold truncate ${isDarkMode ? 'text-white' : 'text-[#111827]'}`}>{requestRecord.email}</p>
                  <p className="text-[11px] opacity-75">Pedido: {requestRecord.orderId}</p>
                  <button
                    onClick={handleResetSession}
                    className="w-full text-left text-[#E74C6A] hover:underline font-medium text-[11px] pt-1"
                  >
                    Trocar e-mail / pedido
                  </button>
                </div>
              )}
            </div>

            {/* Main Content Area Right Column */}
            <div className="flex-1 max-w-2xl">
              
              {/* Error Alert */}
              {errorMsg && (
                <div className={`mb-6 p-4 rounded-xl border text-sm flex items-center gap-3 ${isDarkMode ? 'bg-red-950/60 border-red-800 text-red-200' : 'bg-red-50 border-red-200 text-red-700'}`}>
                  <AlertCircle className="w-5 h-5 text-red-400 shrink-0" />
                  <span>{errorMsg}</span>
                </div>
              )}

              {/* Loader */}
              {isLoading && (
                <div className="flex flex-col items-center justify-center py-16 gap-3">
                  <Loader2 className="w-10 h-10 animate-spin text-[#E74C6A]" />
                  <p className={`text-sm ${isDarkMode ? 'text-[#B0A8AE]' : 'text-[#6B7280]'}`}>Consultando dados do servidor...</p>
                </div>
              )}

              {!isLoading && (
                <>
                  {/* STEP 1: Identificação */}
                  {currentStep === 1 && (
                    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                      <h1 className="text-3xl font-bold mb-3">Identificação</h1>
                      <p className={`mb-10 text-sm ${isDarkMode ? 'text-[#B0A8AE]' : 'text-[#6B7280]'}`}>
                        Informe os dados da sua compra para iniciarmos o processo.
                      </p>

                      <form onSubmit={handleStep1Submit} className="space-y-6">
                        <div className="space-y-2">
                          <label htmlFor="email" className="block text-sm font-medium">
                            E-mail utilizado na compra <span className="text-[#E74C6A]">*</span>
                          </label>
                          <div className="relative">
                            <Mail className={`absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 ${isDarkMode ? 'text-[#B0A8AE]' : 'text-[#9CA3AF]'}`} />
                            <input
                              id="email"
                              type="email"
                              required
                              value={email}
                              onChange={(e) => setEmail(e.target.value)}
                              placeholder="seu@email.com"
                              className={`w-full rounded-xl py-3 pl-12 pr-4 text-sm transition-all focus:outline-none focus:ring-1 ${
                                isDarkMode 
                                  ? 'bg-[#121015] border border-[#2A2328] text-white placeholder-[#B0A8AE]/50 focus:border-[#5C1327] focus:ring-[#5C1327]'
                                  : 'bg-white border border-[#E5E7EB] text-[#111827] placeholder-[#9CA3AF] focus:border-[#E74C6A] focus:ring-[#E74C6A]'
                              }`}
                            />
                          </div>
                        </div>

                        <div className="space-y-2">
                          <label htmlFor="orderId" className="block text-sm font-medium">
                            Número do pedido <span className="text-[#E74C6A]">*</span>
                          </label>
                          <div className="relative">
                            <Hash className={`absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 ${isDarkMode ? 'text-[#B0A8AE]' : 'text-[#9CA3AF]'}`} />
                            <input
                              id="orderId"
                              type="text"
                              required
                              value={orderId}
                              onChange={(e) => setOrderId(e.target.value)}
                              placeholder="Ex: TRD-2024-00123"
                              className={`w-full rounded-xl py-3 pl-12 pr-4 text-sm transition-all focus:outline-none focus:ring-1 ${
                                isDarkMode 
                                  ? 'bg-[#121015] border border-[#2A2328] text-white placeholder-[#B0A8AE]/50 focus:border-[#5C1327] focus:ring-[#5C1327]'
                                  : 'bg-white border border-[#E5E7EB] text-[#111827] placeholder-[#9CA3AF] focus:border-[#E74C6A] focus:ring-[#E74C6A]'
                              }`}
                            />
                          </div>
                        </div>

                        <button
                          type="submit"
                          className="w-full sm:w-auto mt-8 bg-gradient-to-r from-[#5C1327] to-[#7A1835] hover:from-[#7A1835] hover:to-[#5C1327] text-white font-semibold py-3 px-8 rounded-xl flex items-center justify-center gap-2 transition-all shadow-lg shadow-[#5C1327]/20 group cursor-pointer text-sm"
                        >
                          <span>Continuar</span>
                          <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                        </button>
                      </form>
                    </div>
                  )}

                  {/* STEP 2: Motivo do Reembolso */}
                  {currentStep === 2 && !requestRecord && (
                    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                      <h1 className="text-3xl font-bold mb-3">Motivo do reembolso</h1>
                      <p className={`mb-10 text-sm ${isDarkMode ? 'text-[#B0A8AE]' : 'text-[#6B7280]'}`}>
                        Nos conte o que aconteceu para que possamos analisar melhor.
                      </p>

                      <form onSubmit={handleStep2Submit} className="space-y-6">
                        <div className="space-y-2">
                          <label className="block text-sm font-medium">
                            Selecione o motivo <span className="text-[#E74C6A]">*</span>
                          </label>
                          <select
                            required
                            value={reason}
                            onChange={(e) => setReason(e.target.value)}
                            className={`w-full rounded-xl py-3 px-4 text-sm transition-all appearance-none ${
                              isDarkMode 
                                ? 'bg-[#121015] border border-[#2A2328] text-white' 
                                : 'bg-white border border-[#E5E7EB] text-[#111827]'
                            }`}
                            style={{ backgroundImage: 'url("data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22292.4%22%20height%3D%22292.4%22%3E%3Cpath%20fill%3D%22%23B0A8AE%22%20d%3D%22M287%2069.4a17.6%2017.6%200%200%200-13-5.4H18.4c-5%200-9.3%201.8-12.9%205.4A17.6%2017.6%200%200%200%200%2082.2c0%205%201.8%209.3%205.4%2012.9l128%20127.9c3.6%203.6%207.8%205.4%2012.8%205.4s9.2-1.8%2012.8-5.4L287%2095c3.5-3.5%205.4-7.8%205.4-12.8%200-5-1.9-9.2-5.5-12.8z%22%2F%3E%3C%2Fsvg%3E")', backgroundRepeat: 'no-repeat', backgroundPosition: 'right 1rem top 50%', backgroundSize: '0.65rem auto' }}
                          >
                            <option value="nao_funcionou">Produto não funcionou como esperado</option>
                            <option value="duplicada">Compra duplicada ou acidental</option>
                            <option value="sem_acesso">Não recebi acesso ao produto</option>
                            <option value="garantia">Desisti dentro do prazo de garantia</option>
                            <option value="outro">Outro motivo</option>
                          </select>
                        </div>

                        <div className="space-y-2">
                          <label className="block text-sm font-medium">
                            Descrição (opcional)
                          </label>
                          <textarea
                            value={details}
                            onChange={(e) => setDetails(e.target.value)}
                            placeholder="Descreva com mais detalhes o que aconteceu..."
                            rows={4}
                            className={`w-full rounded-xl py-3 px-4 text-sm transition-all resize-none ${
                              isDarkMode 
                                ? 'bg-[#121015] border border-[#2A2328] text-white placeholder-[#B0A8AE]/50'
                                : 'bg-white border border-[#E5E7EB] text-[#111827] placeholder-[#9CA3AF]'
                            }`}
                          />
                        </div>

                        <div className="flex flex-col sm:flex-row items-center gap-4 mt-8 pt-4">
                          <button
                            type="button"
                            onClick={() => setCurrentStep(1)}
                            className={`w-full sm:w-auto px-8 py-3 rounded-xl border text-sm font-semibold transition-all flex items-center justify-center gap-2 cursor-pointer ${
                              isDarkMode ? 'border-[#2A2328] hover:bg-[#171215] text-[#B0A8AE] hover:text-white' : 'border-[#E5E7EB] hover:bg-[#F9FAFB] text-[#374151]'
                            }`}
                          >
                            <ArrowLeft className="w-4 h-4" />
                            Voltar
                          </button>
                          <button
                            type="submit"
                            className="w-full sm:flex-1 bg-gradient-to-r from-[#5C1327] to-[#7A1835] hover:from-[#7A1835] hover:to-[#5C1327] text-white font-semibold py-3 px-8 rounded-xl flex items-center justify-center gap-2 transition-all shadow-lg shadow-[#5C1327]/20 group cursor-pointer text-sm"
                          >
                            <span>Continuar</span>
                            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                          </button>
                        </div>
                      </form>
                    </div>
                  )}

                  {/* STEP 3: Confirmação */}
                  {currentStep === 3 && !requestRecord && (
                    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                      <h1 className="text-3xl font-bold mb-3">Confirme os dados</h1>
                      <p className={`mb-10 text-sm ${isDarkMode ? 'text-[#B0A8AE]' : 'text-[#6B7280]'}`}>
                        Revise as informações antes de enviar.
                      </p>

                      <div className={`p-6 rounded-2xl space-y-6 mb-6 shadow-sm border ${isDarkMode ? 'bg-[#121015] border-[#2A2328]' : 'bg-white border-[#E5E7EB]'}`}>
                        <div>
                          <h4 className={`text-xs font-bold tracking-widest uppercase mb-1 ${isDarkMode ? 'text-[#B0A8AE]' : 'text-[#9CA3AF]'}`}>E-mail</h4>
                          <p className="font-medium">{email || '-'}</p>
                        </div>
                        <div>
                          <h4 className={`text-xs font-bold tracking-widest uppercase mb-1 ${isDarkMode ? 'text-[#B0A8AE]' : 'text-[#9CA3AF]'}`}>Pedido</h4>
                          <p className="font-medium">{orderId || '-'}</p>
                        </div>
                        <div>
                          <h4 className={`text-xs font-bold tracking-widest uppercase mb-1 ${isDarkMode ? 'text-[#B0A8AE]' : 'text-[#9CA3AF]'}`}>Motivo</h4>
                          <p className="font-medium">{reasonMap[reason] || '-'}</p>
                        </div>
                        {details && (
                          <div>
                            <h4 className={`text-xs font-bold tracking-widest uppercase mb-1 ${isDarkMode ? 'text-[#B0A8AE]' : 'text-[#9CA3AF]'}`}>Detalhes</h4>
                            <p className="text-sm mt-1 opacity-90">{details}</p>
                          </div>
                        )}
                      </div>

                      <div className={`p-4 rounded-xl mb-8 border ${isDarkMode ? 'bg-[#171215] border-[#2A2328] text-[#B0A8AE]' : 'bg-[#F9FAFB] border-[#E5E7EB] text-[#4B5563]'}`}>
                        <p className="text-sm leading-relaxed">
                          Ao solicitar, você concorda que sua solicitação será analisada pela equipe <span className="font-bold">Hero</span> dentro do prazo de <span className="font-bold">72 horas úteis</span> de acordo com os nossos <TermosLinkButton />.
                        </p>
                      </div>

                      <form onSubmit={handleStep3Submit}>
                        <div className="flex flex-col sm:flex-row items-center gap-4">
                          <button
                            type="button"
                            onClick={() => setCurrentStep(2)}
                            disabled={isSubmitting}
                            className={`w-full sm:w-auto px-8 py-3 rounded-xl border text-sm font-semibold transition-all flex items-center justify-center gap-2 cursor-pointer ${
                              isDarkMode ? 'border-[#2A2328] hover:bg-[#171215] text-[#B0A8AE] hover:text-white' : 'border-[#E5E7EB] hover:bg-[#F9FAFB] text-[#374151]'
                            }`}
                          >
                            <ArrowLeft className="w-4 h-4" />
                            Voltar
                          </button>
                          <button
                            type="submit"
                            disabled={isSubmitting}
                            className="w-full sm:flex-1 bg-gradient-to-r from-[#5C1327] to-[#7A1835] hover:from-[#7A1835] hover:to-[#5C1327] disabled:opacity-70 text-white font-semibold py-3 px-8 rounded-xl flex items-center justify-center gap-2 transition-all shadow-lg shadow-[#5C1327]/20 group cursor-pointer text-sm"
                          >
                            {isSubmitting ? (
                              <>
                                <Loader2 className="w-5 h-5 animate-spin" />
                                Enviando solicitação...
                              </>
                            ) : (
                              <>
                                <span>Solicitar reembolso</span>
                                <ArrowRight className="w-4 h-4" />
                              </>
                            )}
                          </button>
                        </div>
                      </form>
                    </div>
                  )}

                  {/* STEP 4A: Solicitação em Análise (Primeiras 72 Horas) */}
                  {currentStep === 4 && requestRecord && requestRecord.status === 'aguardando_documentos' && !isTimer72hCompleted && (
                    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 relative">
                      
                      {/* Top Golden Clock Icon */}
                      <div className="w-16 h-16 rounded-full bg-[#E8A341]/10 flex items-center justify-center mb-6">
                        <Clock className="w-8 h-8 text-[#E8A341]" />
                      </div>

                      {/* Main Title & Subtitle */}
                      <h1 className="text-3xl font-bold mb-3 tracking-tight">
                        Solicitação em análise
                      </h1>
                      <p className={`text-base mb-8 leading-relaxed ${isDarkMode ? 'text-[#B0A8AE]' : 'text-[#4B5563]'}`}>
                        Sua solicitação foi registrada com sucesso e está em etapa de validação automática.
                      </p>

                      {/* Info Box 1: Prazo Médio */}
                      <div className={`rounded-xl p-5 flex items-center gap-4 mb-4 border ${isDarkMode ? 'bg-[#121015] border-[#2A2328]' : 'bg-white border-[#E5E7EB] shadow-xs'}`}>
                        <div className={`w-7 h-7 rounded-full border flex items-center justify-center shrink-0 ${isDarkMode ? 'border-[#2A2328] text-[#B0A8AE]' : 'border-[#D1D5DB] text-[#6B7280]'}`}>
                          <Clock className="w-4 h-4" />
                        </div>
                        <p className="text-sm">
                          O prazo médio de análise é de até <strong className="font-bold">72 horas úteis</strong> conforme os <TermosLinkButton />.
                        </p>
                      </div>

                      {/* Info Box 2: Importante */}
                      <div className={`rounded-xl p-6 mb-8 space-y-3 border ${isDarkMode ? 'bg-[#121015] border-[#2A2328]' : 'bg-white border-[#E5E7EB] shadow-xs'}`}>
                        <div className="flex items-start gap-3">
                          <AlertTriangle className="w-5 h-5 text-[#E8A341] shrink-0 mt-0.5" />
                          <p className={`text-sm leading-relaxed ${isDarkMode ? 'text-[#B0A8AE]' : 'text-[#374151]'}`}>
                            <strong className="font-bold">Importante:</strong> Retorne a esta mesma página utilizando o mesmo e-mail informado para acompanhar a atualização da solicitação.
                          </p>
                        </div>
                        <p className={`text-xs pl-8 leading-relaxed ${isDarkMode ? 'text-[#B0A8AE]/80' : 'text-[#6B7280]'}`}>
                          Assim que a próxima etapa estiver disponível, os campos necessários serão liberados automaticamente.
                        </p>
                      </div>

                      {/* Voltar ao Início Action Button */}
                      <button
                        type="button"
                        onClick={handleResetSession}
                        className={`w-full flex items-center justify-center gap-2 border font-semibold py-4 rounded-xl transition-all cursor-pointer text-sm ${
                          isDarkMode ? 'bg-transparent border-[#2A2328] hover:bg-[#121015] text-white' : 'bg-white border-[#E5E7EB] hover:bg-[#F9FAFB] text-[#374151]'
                        }`}
                      >
                        <ArrowLeft className="w-4 h-4" />
                        <span>Voltar ao Início</span>
                      </button>
                    </div>
                  )}

                  {/* STEP 4B (ETAPA DE DEVOLUÇÃO PIX): Liberada automaticamente após 72h */}
                  {currentStep === 4 && requestRecord && requestRecord.status === 'aguardando_documentos' && isTimer72hCompleted && (
                    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                      <h1 className="text-3xl font-bold mb-3">Confirmação dos dados</h1>
                      <p className={`text-sm mb-8 leading-relaxed ${isDarkMode ? 'text-[#B0A8AE]' : 'text-[#6B7280]'}`}>
                        Para concluirmos seu processo, informe abaixo a chave PIX onde deseja receber o valor e compartilhe um último feedback para nos ajudar a melhorar nossa plataforma.
                      </p>

                      <form onSubmit={handleFinalizeRequest} className="space-y-6">
                        <div>
                          <label className={`block text-xs font-semibold uppercase tracking-wider mb-2 ${isDarkMode ? 'text-[#B0A8AE]' : 'text-[#4B5563]'}`}>
                            Chave PIX para devolução <span className="text-[#E74C6A]">*</span>
                          </label>
                          <input
                            type="text"
                            value={pixKey}
                            onChange={(e) => setPixKey(e.target.value)}
                            placeholder="CPF, E-mail, Telefone ou Chave Aleatória"
                            required
                            className={`w-full rounded-xl py-3.5 px-4 text-sm font-mono transition-all ${
                              isDarkMode 
                                ? 'bg-[#121015] border border-[#2A2328] text-white placeholder-[#6E636C] focus:border-[#E74C6A]' 
                                : 'bg-white border border-[#E5E7EB] text-[#111827] placeholder-[#9CA3AF] focus:border-[#E74C6A]'
                            }`}
                          />
                        </div>

                        <div>
                          <label className={`block text-xs font-semibold uppercase tracking-wider mb-2 ${isDarkMode ? 'text-[#B0A8AE]' : 'text-[#4B5563]'}`}>
                            O que poderíamos melhorar para oferecer uma experiência melhor? <span className="text-[#E74C6A]">*</span>
                          </label>
                          <textarea
                            value={feedback}
                            onChange={(e) => setFeedback(e.target.value)}
                            placeholder="Sua opinião é muito importante para nós..."
                            rows={4}
                            required
                            className={`w-full rounded-xl py-3.5 px-4 text-sm resize-none transition-all ${
                              isDarkMode 
                                ? 'bg-[#121015] border border-[#2A2328] text-white placeholder-[#6E636C] focus:border-[#E74C6A]' 
                                : 'bg-white border border-[#E5E7EB] text-[#111827] placeholder-[#9CA3AF] focus:border-[#E74C6A]'
                            }`}
                          />
                        </div>

                        <button
                          type="submit"
                          disabled={isSubmitting}
                          className="w-full py-4 px-6 rounded-xl bg-gradient-to-r from-[#5C1327] to-[#7A1835] hover:from-[#7A1835] hover:to-[#5C1327] disabled:opacity-50 text-white font-semibold text-sm shadow-[0_4px_25px_rgba(231,76,106,0.35)] transition-all flex items-center justify-center gap-2 cursor-pointer"
                        >
                          {isSubmitting ? (
                            <>
                              <Loader2 className="w-5 h-5 animate-spin" />
                              Finalizando solicitação...
                            </>
                          ) : (
                            <>
                              <span>Finalizar solicitação</span>
                              <CheckCircle2 className="w-5 h-5 text-white" />
                            </>
                          )}
                        </button>
                      </form>
                    </div>
                  )}

                  {/* STEP 4C: Processando PIX (Durante os 5 Dias Úteis) */}
                  {currentStep === 4 && requestRecord && (requestRecord.status === 'pix_enviado' || requestRecord.status === 'reembolso_concluido') && !isPix5DaysCompleted && (
                    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 relative">
                      
                      {/* Top Relojinho Icon */}
                      <div className="w-16 h-16 rounded-full bg-purple-500/10 border border-purple-500/30 flex items-center justify-center mb-6 text-purple-400">
                        <Clock className="w-8 h-8 animate-pulse" />
                      </div>

                      {/* Main Title & Reassuring Subtitle */}
                      <h1 className="text-3xl font-bold mb-3 tracking-tight">
                        Processando seu ressarcimento
                      </h1>
                      <p className={`text-base mb-8 leading-relaxed ${isDarkMode ? 'text-[#B0A8AE]' : 'text-[#4B5563]'}`}>
                        Pode ficar tranquilo(a)! O seu pedido de reembolso foi finalizado e os dados foram registrados. O valor será ressarcido na sua conta em até no máximo <strong className="font-bold">5 dias úteis</strong>.
                      </p>

                      {/* Info Box 1: Prazo Máximo de Depósito */}
                      <div className={`rounded-xl p-5 flex items-center gap-4 mb-4 border ${isDarkMode ? 'bg-[#121015] border-[#2A2328]' : 'bg-white border-[#E5E7EB] shadow-xs'}`}>
                        <div className="w-7 h-7 rounded-full border border-[#2A2328] flex items-center justify-center text-purple-400 shrink-0">
                          <Clock className="w-4 h-4" />
                        </div>
                        <p className="text-sm">
                          O prazo para transferência via PIX é de até <strong className="font-bold text-emerald-400">5 dias úteis</strong> conforme os <TermosLinkButton />.
                        </p>
                      </div>

                      {/* Info Box 2: Dados Registrados */}
                      <div className={`rounded-xl p-6 mb-8 space-y-3 border ${isDarkMode ? 'bg-[#121015] border-[#2A2328]' : 'bg-white border-[#E5E7EB] shadow-xs'}`}>
                        <div className="flex items-start gap-3">
                          <ShieldCheck className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
                          <div className="space-y-1">
                            <p className="text-sm font-semibold">
                              Chave PIX cadastrada: <span className="font-mono text-emerald-400 font-normal">{requestRecord.pix}</span>
                            </p>
                            <p className={`text-xs leading-relaxed ${isDarkMode ? 'text-[#B0A8AE]' : 'text-[#6B7280]'}`}>
                              Assim que o depósito for concluído pelo nosso setor financeiro, a notificação será atualizada automaticamente aqui.
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* Voltar ao Início Action Button */}
                      <button
                        type="button"
                        onClick={handleResetSession}
                        className={`w-full flex items-center justify-center gap-2 border font-semibold py-4 rounded-xl transition-all cursor-pointer text-sm ${
                          isDarkMode ? 'bg-transparent border-[#2A2328] hover:bg-[#121015] text-white' : 'bg-white border-[#E5E7EB] hover:bg-[#F9FAFB] text-[#374151]'
                        }`}
                      >
                        <ArrowLeft className="w-4 h-4" />
                        <span>Voltar ao Início</span>
                      </button>
                    </div>
                  )}

                  {/* STEP 4D: Tela de Reembolso Não Aprovado / Política Hero (Exibida Após Conclusão dos 5 Dias Úteis) */}
                  {currentStep === 4 && requestRecord && (requestRecord.status === 'pix_enviado' || requestRecord.status === 'reembolso_concluido') && isPix5DaysCompleted && (
                    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                      
                      {/* Warm Cream/Beige Card Styled Exactly like the Attached Image */}
                      <div className="bg-[#FAF4EA] text-[#292524] rounded-3xl p-8 sm:p-10 border border-[#F5E8D6] shadow-xl space-y-8">
                        
                        {/* Status Badge header inside card */}
                        <div className="flex items-center justify-between border-b border-[#F97316]/20 pb-4">
                          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-orange-500/10 border border-orange-500/30 text-[#EA580C] text-xs font-semibold uppercase tracking-wider">
                            <XCircle className="w-3.5 h-3.5 text-[#EA580C]" />
                            <span>Status: Reembolso não aprovado</span>
                          </div>
                          <span className="text-xs text-[#78350F] font-mono">ID: {requestRecord.id.slice(0, 8)}</span>
                        </div>

                        {/* Title matching user copy */}
                        <div>
                          <h1 className="text-2xl sm:text-3xl font-extrabold text-[#EA580C] tracking-tight leading-snug">
                            Política de Reembolso na Hero: posso desistir da compra?
                          </h1>
                        </div>

                        {/* Intro Paragraph */}
                        <p className="text-sm sm:text-base leading-relaxed text-[#374151]">
                          Entendemos que mudanças de ideia podem acontecer 🧡 Mas é importante saber que nem todo conteúdo permite reembolso — e a gente te explica o motivo com transparência e base legal.
                        </p>

                        <div className="h-px bg-[#F97316]/30 w-full my-4" />

                        {/* Section 1 */}
                        <div className="space-y-3">
                          <h2 className="text-xl font-bold text-[#EA580C]">
                            O que diz o Código de Defesa do Consumidor?
                          </h2>
                          <p className="text-sm leading-relaxed text-[#374151]">
                            O <strong className="font-bold text-[#1C1917]">artigo 49 do Código de Defesa do Consumidor (CDC)</strong> prevê o <strong className="font-bold text-[#1C1917]">direito de arrependimento</strong> para compras realizadas fora do estabelecimento comercial, como em sites e aplicativos.
                          </p>
                          <p className="text-sm leading-relaxed text-[#374151]">
                            No entanto, existem situações específicas relacionadas ao fornecimento de <strong className="font-bold text-[#1C1917]">conteúdos e serviços digitais com acesso imediato</strong>, cujas condições estão descritas na legislação vigente e detalhadas em nossos <TermosLinkButton text="Termos de Uso" />.
                          </p>
                          <p className="text-sm leading-relaxed text-[#374151]">
                            Por esse motivo, recomendamos que, antes de solicitar um reembolso, você leia atentamente os <TermosLinkButton text="Termos de Uso da Hero" />, onde estão descritos os critérios, condições e hipóteses aplicáveis às solicitações de cancelamento e reembolso.
                          </p>
                        </div>

                        <div className="h-px bg-[#F97316]/30 w-full my-4" />

                        {/* Section 2 */}
                        <div className="space-y-3">
                          <h2 className="text-xl font-bold text-[#EA580C]">
                            O que isso significa na prática?
                          </h2>
                          <ul className="space-y-2 text-sm text-[#374151] pl-2">
                            <li className="flex items-start gap-2">
                              <span className="text-[#EA580C] font-bold">•</span>
                              <span>Após a confirmação do pagamento, o acesso à plataforma e aos recursos contratados é <strong className="font-bold text-[#1C1917]">disponibilizado imediatamente 💎</strong>;</span>
                            </li>
                            <li className="flex items-start gap-2">
                              <span className="text-[#EA580C] font-bold">•</span>
                              <span>As solicitações de reembolso são analisadas individualmente, considerando as condições da compra e o que está previsto nos <TermosLinkButton text="Termos de Uso" />;</span>
                            </li>
                            <li className="flex items-start gap-2">
                              <span className="text-[#EA580C] font-bold">•</span>
                              <span>Em determinadas situações, o reembolso poderá não ser aplicável, conforme as condições aceitas durante a contratação do serviço.</span>
                            </li>
                          </ul>
                          <div className="pt-2 text-xs text-[#78350F] flex items-start gap-2">
                            <span className="text-sm">💡</span>
                            <span>Essa regra está de acordo com o <strong className="font-bold text-[#1C1917]">CDC</strong> e segue as mesmas práticas adotadas por outras plataformas de conteúdo digital no Brasil.</span>
                          </div>
                        </div>

                        <div className="h-px bg-[#F97316]/30 w-full my-4" />

                        {/* Section 3 */}
                        <div className="space-y-3">
                          <h2 className="text-xl font-bold text-[#EA580C]">
                            E se eu tiver dúvidas sobre minha compra?
                          </h2>
                          <p className="text-sm leading-relaxed text-[#374151]">
                            A gente tá aqui pra te ajudar! 💜 Se surgir qualquer dúvida sobre sua assinatura ou pagamento, fale com nosso <strong className="font-bold text-[#1C1917]">time de suporte</strong> pelo chat ou consulte os <TermosLinkButton text="Termos de Uso da Hero" /> 💬 Vamos analisar o seu caso e te orientar da melhor forma.
                          </p>
                        </div>

                        <div className="h-px bg-[#F97316]/30 w-full my-4" />

                        {/* Footer matching image */}
                        <div className="text-center pt-2">
                          <p className="text-xs text-[#78716C] font-medium">
                            © 2025 Hero. Todos os direitos reservados.
                          </p>
                        </div>
                      </div>

                      {/* Action Button outside card */}
                      <button
                        type="button"
                        onClick={handleResetSession}
                        className={`w-full mt-6 border font-semibold text-sm py-4 rounded-xl transition-all cursor-pointer flex items-center justify-center gap-2 ${
                          isDarkMode ? 'border-[#2A2328] hover:bg-[#121015] text-white' : 'border-[#E5E7EB] hover:bg-[#F9FAFB] text-[#374151]'
                        }`}
                      >
                        <ArrowLeft className="w-4 h-4" />
                        <span>Consultar outro reembolso</span>
                      </button>
                    </div>
                  )}

                </>
              )}
            </div>
          </div>
        )}
      </main>

      {/* Floating Timer Pill 72h */}
      {requestRecord && requestRecord.status === 'aguardando_documentos' && !isTimer72hCompleted && (
        <div className={`fixed bottom-6 right-6 rounded-2xl p-4 shadow-lg flex items-center gap-4 z-50 border ${
          isDarkMode ? 'bg-[#09080B]/90 backdrop-blur-md border-[#2A2328] text-white' : 'bg-white border-[#E5E7EB] text-[#111827]'
        }`}>
          <div className="w-10 h-10 rounded-full bg-[#E74C6A]/10 flex items-center justify-center text-[#E74C6A]">
            <Clock className="w-5 h-5" />
          </div>
          <div>
            <p className={`text-[10px] font-bold tracking-widest uppercase mb-0.5 ${isDarkMode ? 'text-[#B0A8AE]' : 'text-[#9CA3AF]'}`}>Tempo Restante (72h)</p>
            <p className="text-xl font-bold font-mono">{formatTimerPill72h()}</p>
          </div>
        </div>
      )}

      {/* Floating Timer Pill 5 Days PIX */}
      {requestRecord && (requestRecord.status === 'pix_enviado' || requestRecord.status === 'reembolso_concluido') && !isPix5DaysCompleted && (
        <div className={`fixed bottom-6 right-6 rounded-2xl p-4 shadow-lg flex items-center gap-4 z-50 border ${
          isDarkMode ? 'bg-[#09080B]/90 backdrop-blur-md border-[#2A2328] text-white' : 'bg-white border-[#E5E7EB] text-[#111827]'
        }`}>
          <div className="w-10 h-10 rounded-full bg-purple-500/10 flex items-center justify-center text-purple-400">
            <Clock className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <p className={`text-[10px] font-bold tracking-widest uppercase mb-0.5 ${isDarkMode ? 'text-[#B0A8AE]' : 'text-[#9CA3AF]'}`}>Processamento PIX (5 Dias)</p>
            <p className="text-xl font-bold text-emerald-400 font-mono">{formatTimerPill5Days()}</p>
          </div>
        </div>
      )}
    </div>
  );
}
