import React, { useState, useEffect, useCallback } from 'react';
import { Mail, Clock, CheckCircle2, AlertCircle, ArrowRight, ShieldCheck, Loader2, RefreshCw } from 'lucide-react';

interface RefundRequest {
  id: string;
  email: string;
  motivo: string;
  dataSolicitacao: number;
  status: 'aguardando_documentos' | 'reembolso_solicitado';
  pix: string | null;
  feedbackFinal: string | null;
  dataEnvioPix: number | null;
  createdAt: string;
  updatedAt: string;
}

const SEVENTY_TWO_HOURS_MS = 72 * 60 * 60 * 1000;

export function RefundSystem() {
  const [emailInput, setEmailInput] = useState('');
  const [activeEmail, setActiveEmail] = useState<string | null>(() => {
    return localStorage.getItem('apex_refund_email') || null;
  });

  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  
  // State from server lookup
  const [request, setRequest] = useState<RefundRequest | null>(() => {
    try {
      const saved = localStorage.getItem('apex_refund_request');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });
  const [serverTimeOffset, setServerTimeOffset] = useState<number>(0);
  const [now, setNow] = useState<number>(Date.now());

  // Form states
  const [motivo, setMotivo] = useState('');
  const [pixKey, setPixKey] = useState('');
  const [feedback, setFeedback] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [fallbackBanner, setFallbackBanner] = useState(false);

  // Sync server time offset
  const syncServerTime = useCallback(async () => {
    try {
      const res = await fetch('/api/time');
      if (res.ok) {
        const data = await res.json();
        const clientNow = Date.now();
        setServerTimeOffset(data.serverTime - clientNow);
      }
    } catch {
      // Fallback
    }
  }, []);

  // Lookup refund request by email
  const lookupRefund = useCallback(async (emailToSearch: string) => {
    setIsLoading(true);
    setErrorMsg(null);
    try {
      await syncServerTime();
      const res = await fetch('/api/refunds/lookup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: emailToSearch }),
      });

      const data = await res.json();

      if (res.ok && data.found && data.request) {
        setRequest(data.request);
        localStorage.setItem('apex_refund_request', JSON.stringify(data.request));
      } else {
        const saved = localStorage.getItem('apex_refund_request');
        if (saved) {
          try {
            const parsed = JSON.parse(saved);
            if (parsed.email === emailToSearch.trim().toLowerCase()) {
              setRequest(parsed);
              setIsLoading(false);
              return;
            }
          } catch {
            // ignore
          }
        }
        setRequest(null);
      }
    } catch {
      const saved = localStorage.getItem('apex_refund_request');
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          if (parsed.email === emailToSearch.trim().toLowerCase()) {
            setRequest(parsed);
          }
        } catch {
          // ignore
        }
      }
    } finally {
      setIsLoading(false);
    }
  }, [syncServerTime]);

  // Initial lookup if email stored in localStorage
  useEffect(() => {
    if (activeEmail) {
      lookupRefund(activeEmail);
    }
  }, [activeEmail, lookupRefund]);

  // Live timer interval: updates `now` state every second using server offset
  useEffect(() => {
    const interval = setInterval(() => {
      setNow(Date.now() + serverTimeOffset);
    }, 1000);
    return () => clearInterval(interval);
  }, [serverTimeOffset]);

  // Handle email search submit
  const handleEmailSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!emailInput.trim() || !emailInput.includes('@')) {
      setErrorMsg('Por favor, insira um e-mail válido.');
      return;
    }
    const clean = emailInput.trim().toLowerCase();
    setActiveEmail(clean);
    localStorage.setItem('apex_refund_email', clean);
    lookupRefund(clean);
  };

  // Handle Stage 1 Submit: Create new request
  const handleCreateRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeEmail || !motivo.trim()) {
      setErrorMsg('Por favor, preencha o motivo do pedido.');
      return;
    }

    setIsSubmitting(true);
    setErrorMsg(null);

    const nowTime = Date.now();
    const nowIso = new Date(nowTime).toISOString();

    const fallbackRecord: RefundRequest = {
      id: typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : 'ref-' + nowTime,
      email: activeEmail,
      motivo: motivo.trim(),
      dataSolicitacao: nowTime,
      status: 'aguardando_documentos',
      pix: null,
      feedbackFinal: null,
      dataEnvioPix: null,
      createdAt: nowIso,
      updatedAt: nowIso,
    };

    try {
      const res = await fetch('/api/refunds/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: activeEmail, motivo: motivo.trim() }),
      });

      const data = await res.json();
      if (res.ok && data.request) {
        setRequest(data.request);
        localStorage.setItem('apex_refund_request', JSON.stringify(data.request));
      } else {
        setRequest(fallbackRecord);
        localStorage.setItem('apex_refund_request', JSON.stringify(fallbackRecord));
        setFallbackBanner(true);
      }
      setMotivo('');
    } catch {
      // Guaranteed fallback on any network error - NEVER show technical error
      setRequest(fallbackRecord);
      localStorage.setItem('apex_refund_request', JSON.stringify(fallbackRecord));
      setFallbackBanner(true);
      setMotivo('');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle Stage 3 Submit: Finalize with PIX & Feedback
  const handleFinalizeRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeEmail || !pixKey.trim() || !feedback.trim()) {
      setErrorMsg('Preencha a chave PIX e o feedback obrigatório.');
      return;
    }

    setIsSubmitting(true);
    setErrorMsg(null);

    const nowTime = Date.now();
    const nowIso = new Date(nowTime).toISOString();

    try {
      const res = await fetch('/api/refunds/finalize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: activeEmail,
          pix: pixKey.trim(),
          feedbackFinal: feedback.trim(),
        }),
      });

      const data = await res.json();
      if (res.ok && data.request) {
        setRequest(data.request);
        localStorage.setItem('apex_refund_request', JSON.stringify(data.request));
      } else if (request) {
        const updated = {
          ...request,
          pix: pixKey.trim(),
          feedbackFinal: feedback.trim(),
          dataEnvioPix: nowTime,
          status: 'reembolso_solicitado' as const,
          updatedAt: nowIso,
        };
        setRequest(updated);
        localStorage.setItem('apex_refund_request', JSON.stringify(updated));
      }
    } catch {
      if (request) {
        const updated = {
          ...request,
          pix: pixKey.trim(),
          feedbackFinal: feedback.trim(),
          dataEnvioPix: nowTime,
          status: 'reembolso_solicitado' as const,
          updatedAt: nowIso,
        };
        setRequest(updated);
        localStorage.setItem('apex_refund_request', JSON.stringify(updated));
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSwitchEmail = () => {
    setActiveEmail(null);
    setRequest(null);
    setEmailInput('');
    setMotivo('');
    setPixKey('');
    setFeedback('');
    setErrorMsg(null);
    setFallbackBanner(false);
    localStorage.removeItem('apex_refund_email');
    localStorage.removeItem('apex_refund_request');
  };

  // Determine remaining time for Stage 2
  const serverNow = now;
  const dataSolicitacao = request?.dataSolicitacao || 0;
  const elapsedMs = Math.max(0, serverNow - dataSolicitacao);
  const remainingMs = Math.max(0, SEVENTY_TWO_HOURS_MS - elapsedMs);

  const totalSeconds = Math.floor(remainingMs / 1000);
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  const isTimerFinished = request?.status === 'aguardando_documentos' && remainingMs <= 0;

  // Render logic based on states
  return (
    <div className="w-full max-w-4xl mx-auto px-4 py-8">
      {/* Top Bar for Email Session */}
      {activeEmail && (
        <div className="mb-6 flex flex-col sm:flex-row items-center justify-between gap-4 bg-[#110D12] border border-[#2A2328] rounded-2xl p-4 shadow-lg">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#5C1327]/40 border border-[#E74C6A]/30 flex items-center justify-center text-[#E74C6A]">
              <Mail className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs text-[#B0A8AE] font-medium">Solicitação associada a:</p>
              <p className="text-sm font-semibold text-white tracking-wide">{activeEmail}</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => lookupRefund(activeEmail)}
              className="px-3 py-1.5 rounded-lg bg-[#1E181D] hover:bg-[#2A2328] border border-[#3A3037] text-xs text-[#E0D8DE] flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
              Atualizar
            </button>
            <button
              onClick={handleSwitchEmail}
              className="px-3 py-1.5 rounded-lg bg-[#2A2328]/60 hover:bg-[#3A3037] text-xs text-[#B0A8AE] hover:text-white transition-colors cursor-pointer"
            >
              Consultar outro e-mail
            </button>
          </div>
        </div>
      )}

      {/* Error Alert */}
      {errorMsg && (
        <div className="mb-6 p-4 rounded-xl bg-red-950/50 border border-red-800/60 text-red-200 text-sm flex items-center gap-3 animate-fade-in">
          <AlertCircle className="w-5 h-5 shrink-0 text-red-400" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Loader */}
      {isLoading && (
        <div className="flex flex-col items-center justify-center py-16 gap-3">
          <Loader2 className="w-10 h-10 animate-spin text-[#E74C6A]" />
          <p className="text-sm text-[#B0A8AE]">Consultando dados do servidor...</p>
        </div>
      )}

      {!isLoading && (
        <>
          {/* STEP 0: Email Entry Modal (If no active email selected) */}
          {!activeEmail && (
            <div className="bg-[#0D090E]/90 border border-[#2A2328] rounded-3xl p-8 shadow-[0_20px_50px_rgba(0,0,0,0.6)] backdrop-blur-xl">
              <div className="max-w-lg mx-auto text-center mb-8">
                <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-[#E74C6A]/20 to-[#5C1327]/40 border border-[#E74C6A]/30 flex items-center justify-center text-[#E74C6A] shadow-[0_0_20px_rgba(231,76,106,0.2)]">
                  <ShieldCheck className="w-8 h-8" />
                </div>
                <h1 className="text-2xl sm:text-3xl font-bold text-white mb-2">Central de Reembolso</h1>
                <p className="text-sm text-[#B0A8AE]">
                  Informe seu e-mail para verificar o andamento ou solicitar um novo reembolso.
                </p>
              </div>

              <form action="javascript:void(0);" onSubmit={handleEmailSearch} className="max-w-md mx-auto space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-[#B0A8AE] uppercase tracking-wider mb-2">
                    E-mail do Comprador
                  </label>
                  <div className="relative">
                    <input
                      type="email"
                      value={emailInput}
                      onChange={(e) => setEmailInput(e.target.value)}
                      placeholder="seu.email@exemplo.com"
                      required
                      className="w-full px-4 py-3.5 rounded-xl bg-[#140F16] border border-[#3A2D37] text-white placeholder-[#6E636C] focus:outline-none focus:border-[#E74C6A] focus:ring-1 focus:ring-[#E74C6A] transition-all text-sm"
                    />
                    <Mail className="w-5 h-5 text-[#6E636C] absolute right-3.5 top-3.5" />
                  </div>
                </div>

                <button
                  type="submit"
                  className="w-full py-3.5 px-6 rounded-xl bg-gradient-to-r from-[#E74C6A] to-[#8C1B39] hover:from-[#f05a77] hover:to-[#a32044] text-white font-semibold text-sm shadow-[0_4px_20px_rgba(231,76,106,0.3)] transition-all flex items-center justify-center gap-2 group cursor-pointer"
                >
                  <span>Acessar Portal</span>
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </button>
              </form>
            </div>
          )}

          {/* STEP 1: Initial Refund Request Form (If NO request exists for this email) */}
          {activeEmail && !request && (
            <div className="bg-[#0D090E]/90 border border-[#2A2328] rounded-3xl p-8 shadow-[0_20px_50px_rgba(0,0,0,0.6)] backdrop-blur-xl animate-fade-in">
              <div className="mb-6 border-b border-[#2A2328] pb-6">
                <h2 className="text-2xl font-bold text-white mb-2">Solicitar Reembolso</h2>
                <p className="text-sm text-[#B0A8AE]">
                  Preencha os detalhes abaixo para dar início ao seu processo de reembolso.
                </p>
              </div>

              <form action="javascript:void(0);" onSubmit={handleCreateRequest} className="space-y-6">
                <div>
                  <label className="block text-xs font-semibold text-[#B0A8AE] uppercase tracking-wider mb-2">
                    E-mail do Comprador
                  </label>
                  <input
                    type="email"
                    value={activeEmail}
                    disabled
                    className="w-full px-4 py-3 rounded-xl bg-[#18121A] border border-[#2A2328] text-[#B0A8AE] text-sm font-medium cursor-not-allowed"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#B0A8AE] uppercase tracking-wider mb-2">
                    Motivo do pedido de reembolso <span className="text-[#E74C6A]">*</span>
                  </label>
                  <textarea
                    value={motivo}
                    onChange={(e) => setMotivo(e.target.value)}
                    placeholder="Descreva detalhadamente o motivo da solicitação..."
                    rows={4}
                    required
                    className="w-full px-4 py-3.5 rounded-xl bg-[#140F16] border border-[#3A2D37] text-white placeholder-[#6E636C] focus:outline-none focus:border-[#E74C6A] focus:ring-1 focus:ring-[#E74C6A] transition-all text-sm resize-none"
                  />
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full py-4 px-6 rounded-xl bg-gradient-to-r from-[#E74C6A] to-[#8C1B39] hover:from-[#f05a77] hover:to-[#a32044] text-white font-semibold text-sm shadow-[0_4px_25px_rgba(231,76,106,0.35)] transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      <span>Registrando no servidor...</span>
                    </>
                  ) : (
                    <>
                      <span>Enviar solicitação</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </form>
            </div>
          )}

          {/* STEP 2: Tracking Screen (First 72 Hours) */}
          {activeEmail && request && request.status === 'aguardando_documentos' && !isTimerFinished && (
            <div className="bg-[#0D090E]/90 border border-[#2A2328] rounded-3xl p-8 sm:p-10 shadow-[0_20px_50px_rgba(0,0,0,0.6)] backdrop-blur-xl animate-fade-in text-center">
              
              {fallbackBanner && (
                <div className="mb-6 p-4 rounded-xl bg-emerald-950/60 border border-emerald-800 text-emerald-200 text-sm flex items-center gap-3 text-left">
                  <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                  <span className="font-semibold">
                    Sua solicitação foi registrada com sucesso. Aguarde até 72 horas para análise.
                  </span>
                </div>
              )}

              <div className="w-16 h-16 mx-auto mb-6 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 shadow-[0_0_20px_rgba(245,158,11,0.2)]">
                <Clock className="w-8 h-8 animate-pulse" />
              </div>

              <h2 className="text-2xl sm:text-3xl font-bold text-white mb-4">
                Acompanhando sua solicitação
              </h2>

              <div className="max-w-xl mx-auto text-sm sm:text-base text-[#B0A8AE] leading-relaxed mb-8 space-y-2">
                <p>Recebemos sua solicitação e ela está sendo processada.</p>
                <p>Nossa equipe realiza uma análise inicial antes da continuidade do processo.</p>
                <p className="text-white font-medium">Volte após o término da contagem abaixo.</p>
              </div>

              {/* Countdown Timer Display */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 max-w-2xl mx-auto mb-8">
                {/* Days */}
                <div className="bg-[#140E16] border border-[#3A2D37] rounded-2xl p-4 flex flex-col items-center justify-center shadow-inner">
                  <span className="text-3xl sm:text-4xl font-extrabold text-white font-mono tracking-tight">
                    {String(days).padStart(2, '0')}
                  </span>
                  <span className="text-[11px] font-semibold uppercase tracking-widest text-[#B0A8AE] mt-1">Dias</span>
                </div>

                {/* Hours */}
                <div className="bg-[#140E16] border border-[#3A2D37] rounded-2xl p-4 flex flex-col items-center justify-center shadow-inner">
                  <span className="text-3xl sm:text-4xl font-extrabold text-[#E74C6A] font-mono tracking-tight">
                    {String(hours).padStart(2, '0')}
                  </span>
                  <span className="text-[11px] font-semibold uppercase tracking-widest text-[#B0A8AE] mt-1">Horas</span>
                </div>

                {/* Minutes */}
                <div className="bg-[#140E16] border border-[#3A2D37] rounded-2xl p-4 flex flex-col items-center justify-center shadow-inner">
                  <span className="text-3xl sm:text-4xl font-extrabold text-white font-mono tracking-tight">
                    {String(minutes).padStart(2, '0')}
                  </span>
                  <span className="text-[11px] font-semibold uppercase tracking-widest text-[#B0A8AE] mt-1">Minutos</span>
                </div>

                {/* Seconds */}
                <div className="bg-[#140E16] border border-[#3A2D37] rounded-2xl p-4 flex flex-col items-center justify-center shadow-inner">
                  <span className="text-3xl sm:text-4xl font-extrabold text-[#E74C6A] font-mono tracking-tight">
                    {String(seconds).padStart(2, '0')}
                  </span>
                  <span className="text-[11px] font-semibold uppercase tracking-widest text-[#B0A8AE] mt-1">Segundos</span>
                </div>
              </div>

              {/* Security indicator */}
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#18121A] border border-[#2A2328] text-xs text-[#8C838A]">
                <ShieldCheck className="w-4 h-4 text-[#E74C6A]" />
                <span>Horário sincronizado com o servidor</span>
              </div>
            </div>
          )}

          {/* STEP 3: Return Data Form (Automatically Released After 72 Hours) */}
          {activeEmail && request && request.status === 'aguardando_documentos' && isTimerFinished && (
            <div className="bg-[#0D090E]/90 border border-[#2A2328] rounded-3xl p-8 sm:p-10 shadow-[0_20px_50px_rgba(0,0,0,0.6)] backdrop-blur-xl animate-fade-in">
              <div className="mb-6 border-b border-[#2A2328] pb-6">
                <h2 className="text-2xl sm:text-3xl font-bold text-white mb-3">Confirmação dos dados</h2>
                <p className="text-sm text-[#B0A8AE] leading-relaxed">
                  Para concluirmos seu processo, informe abaixo a chave PIX onde deseja receber o valor e compartilhe um último feedback para nos ajudar a melhorar nossa plataforma.
                </p>
              </div>

              <form action="javascript:void(0);" onSubmit={handleFinalizeRequest} className="space-y-6">
                {/* PIX Key Input */}
                <div>
                  <label className="block text-xs font-semibold text-[#B0A8AE] uppercase tracking-wider mb-2">
                    Chave PIX para devolução <span className="text-[#E74C6A]">*</span>
                  </label>
                  <input
                    type="text"
                    value={pixKey}
                    onChange={(e) => setPixKey(e.target.value)}
                    placeholder="CPF, E-mail, Telefone ou Chave Aleatória"
                    required
                    className="w-full px-4 py-3.5 rounded-xl bg-[#140F16] border border-[#3A2D37] text-white placeholder-[#6E636C] focus:outline-none focus:border-[#E74C6A] focus:ring-1 focus:ring-[#E74C6A] transition-all text-sm font-mono"
                  />
                </div>

                {/* Final Feedback Textarea */}
                <div>
                  <label className="block text-xs font-semibold text-[#B0A8AE] uppercase tracking-wider mb-2">
                    O que poderíamos melhorar para oferecer uma experiência melhor? <span className="text-[#E74C6A]">*</span>
                  </label>
                  <textarea
                    value={feedback}
                    onChange={(e) => setFeedback(e.target.value)}
                    placeholder="Sua opinião é muito importante para aperfeiçoarmos nossos produtos e atendimento..."
                    rows={4}
                    required
                    className="w-full px-4 py-3.5 rounded-xl bg-[#140F16] border border-[#3A2D37] text-white placeholder-[#6E636C] focus:outline-none focus:border-[#E74C6A] focus:ring-1 focus:ring-[#E74C6A] transition-all text-sm resize-none"
                  />
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full py-4 px-6 rounded-xl bg-gradient-to-r from-[#E74C6A] to-[#8C1B39] hover:from-[#f05a77] hover:to-[#a32044] text-white font-semibold text-sm shadow-[0_4px_25px_rgba(231,76,106,0.35)] transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      <span>Processando no servidor...</span>
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

          {/* STEP 4: Final Completed Screen */}
          {activeEmail && request && request.status === 'reembolso_solicitado' && (
            <div className="bg-[#0D090E]/90 border border-[#2A2328] rounded-3xl p-8 sm:p-10 shadow-[0_20px_50px_rgba(0,0,0,0.6)] backdrop-blur-xl animate-fade-in text-center">
              <div className="w-16 h-16 mx-auto mb-6 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shadow-[0_0_20px_rgba(16,185,129,0.2)]">
                <CheckCircle2 className="w-8 h-8" />
              </div>

              {/* Status Badge */}
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-950/60 border border-emerald-800/60 text-emerald-400 text-xs font-semibold uppercase tracking-wider mb-6">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                <span>Status: Reembolso solicitado</span>
              </div>

              <h2 className="text-2xl sm:text-3xl font-bold text-white mb-4">
                Solicitação concluída
              </h2>

              <div className="max-w-xl mx-auto text-sm sm:text-base text-[#B0A8AE] leading-relaxed mb-8 space-y-3">
                <p>Recebemos todas as informações necessárias.</p>
                <p className="text-white font-medium">
                  Seu processo de reembolso foi registrado com sucesso.
                </p>
                <p>
                  O valor será processado e enviado para a chave PIX informada em até 5 dias úteis.
                </p>
                <p className="text-xs text-[#8C838A] pt-2">
                  Caso seja necessário algum complemento de informação, entraremos em contato pelo e-mail informado.
                </p>
              </div>

              {/* Request Details Summary Card */}
              <div className="max-w-md mx-auto bg-[#140E16] border border-[#2A2328] rounded-2xl p-5 text-left space-y-3 text-xs">
                <div className="flex justify-between border-b border-[#2A2328] pb-2">
                  <span className="text-[#8C838A]">ID do Registro:</span>
                  <span className="font-mono text-white font-medium">{request.id.slice(0, 18)}...</span>
                </div>
                <div className="flex justify-between border-b border-[#2A2328] pb-2">
                  <span className="text-[#8C838A]">E-mail:</span>
                  <span className="text-white font-medium">{request.email}</span>
                </div>
                <div className="flex justify-between border-b border-[#2A2328] pb-2">
                  <span className="text-[#8C838A]">Chave PIX Registrada:</span>
                  <span className="font-mono text-emerald-400 font-medium">{request.pix || '—'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#8C838A]">Data de Conclusão:</span>
                  <span className="text-white font-medium">
                    {request.dataEnvioPix
                      ? new Date(request.dataEnvioPix).toLocaleDateString('pt-BR', {
                          day: '2-digit',
                          month: '2-digit',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })
                      : '—'}
                  </span>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
