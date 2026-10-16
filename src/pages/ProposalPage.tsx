import { useState, useMemo, useRef } from 'react';
import { Phone, Instagram, Shield, TrendingDown, TrendingUp, Calendar, DollarSign, CheckCircle2, AlertCircle, ArrowRight, Star, Sparkles, Home, Car, Upload, FileText, X, Send, Mail, MapPin, CreditCard, Percent, PieChart, Loader2, Clock, Zap } from 'lucide-react';
import { formatCurrency, formatDate, addDays } from '../utils/format';
import { calculateGenericFinancing } from '../utils/financing';

type ConsortiumType = 'imobiliario' | 'automovel';
type LanceType = 'fixo' | 'livre' | 'nenhum';

interface ProposalData {
  creditValue: number;
  firstInstallment: number;
  otherInstallments: number;
  postContemplationInstallment: number | null;
  months: number;
  sellerName: string;
  clientName: string;
  isParcelinha: boolean;
  consortiumType: ConsortiumType;
  taxaAdministrativa: number;
  fundoReserva: number;
  lanceType: LanceType;
  lanceLivreValue: number | null;
}

interface AcquireFormData {
  name: string;
  email: string;
  phone: string;
  address: string;
  cpf: string;
  cnhFile: File | null;
  comprovanteFile: File | null;
}

function getProposalData(): ProposalData | null {
  const hash = window.location.hash;
  const queryString = hash.split('?')[1] || '';
  const params = new URLSearchParams(queryString);

  const creditValue = parseFloat(params.get('credito') || '0');
  const firstInstallment = parseFloat(params.get('parcela1') || '0');
  const otherInstallments = parseFloat(params.get('parcelas') || '0');
  const months = parseInt(params.get('meses') || '0');
  const sellerName = params.get('vendedor') || '';
  const clientName = params.get('cliente') || '';
  const isParcelinha = params.get('parcelinha') === '1';
  const consortiumType = (params.get('tipo') as ConsortiumType) || 'imobiliario';
  const taxaAdministrativa = parseFloat(params.get('taxa_adm') || '0');
  const fundoReserva = parseFloat(params.get('fundo_reserva') || '0');
  const lanceType = (params.get('lance_type') as LanceType) || 'nenhum';
  const lanceLivreValue = lanceType === 'livre' 
    ? parseFloat(params.get('lance_livre') || '0') || null 
    : null;
  const postContemplationInstallment = isParcelinha
    ? parseFloat(params.get('parcela_pos') || '0') || null
    : null;

  if (!creditValue || !firstInstallment || !otherInstallments || !months) {
    return null;
  }

  return {
    creditValue,
    firstInstallment,
    otherInstallments,
    postContemplationInstallment,
    months,
    sellerName,
    clientName,
    isParcelinha,
    consortiumType,
    taxaAdministrativa,
    fundoReserva,
    lanceType,
    lanceLivreValue,
  };
}

export default function ProposalPage() {
  const data = useMemo(() => getProposalData(), []);
  const [showAcquireForm, setShowAcquireForm] = useState(false);
  const [acquireForm, setAcquireForm] = useState<AcquireFormData>({
    name: '',
    email: '',
    phone: '',
    address: '',
    cpf: '',
    cnhFile: null,
    comprovanteFile: null,
  });
  const [formSubmitted, setFormSubmitted] = useState(false);
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState('');
  const cnhInputRef = useRef<HTMLInputElement>(null);
  const comprovanteInputRef = useRef<HTMLInputElement>(null);

  if (!data) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4">
        <div className="bg-slate-800/50 rounded-2xl border border-red-500/30 p-8 text-center max-w-md">
          <AlertCircle className="w-16 h-16 text-red-400 mx-auto mb-4" />
          <h2 className="text-white text-xl font-bold mb-2">Proposta Inválida</h2>
          <p className="text-slate-400">
            Os dados da proposta não foram encontrados. Solicite um novo link ao seu consultor.
          </p>
          <a
            href="https://wa.me/5579981386285"
            target="_blank"
            rel="noopener noreferrer"
            className="mt-6 inline-flex items-center gap-2 px-6 py-3 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl font-semibold transition-all"
          >
            <Phone className="w-4 h-4" />
            Falar com Consultor
          </a>
        </div>
      </div>
    );
  }

  const totalConsortium = useMemo(() => {
    let total = data.firstInstallment + data.otherInstallments * (data.months - 1);
    if (data.isParcelinha && data.postContemplationInstallment) {
      const monthsBefore = Math.min(6, data.months);
      const monthsAfter = data.months - monthsBefore;
      total =
        data.firstInstallment +
        data.otherInstallments * (monthsBefore - 1) +
        data.postContemplationInstallment * monthsAfter;
    }
    return total;
  }, [data]);

  const isImobiliario = data.consortiumType === 'imobiliario';
  const indiceReajuste = isImobiliario ? 'INCC' : 'IPCA';
  const indiceDescription = isImobiliario
    ? 'Índice Nacional de Custo da Construção'
    : 'Índice Nacional de Preços ao Consumidor Amplo';

  const validityDateTime = addDays(new Date(), 1);
  const validityDate = validityDateTime.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
  
  const lanceEmbutido = data.lanceType !== 'nenhum' ? data.creditValue * 0.25 : 0;
  
  const valorLiquidoReceber = data.lanceType !== 'nenhum'
    ? data.creditValue - lanceEmbutido
    : data.creditValue;

  const indiceAnoAnterior = isImobiliario ? 6.10 : 4.26;
  const indiceNome = isImobiliario ? 'INCC' : 'IPCA';

  const taxaValor = data.creditValue * (data.taxaAdministrativa / 100);
  const fundoValor = data.creditValue * (data.fundoReserva / 100);
  const totalEncargos = taxaValor + fundoValor;
  
  const totalGeral = valorLiquidoReceber + totalEncargos;

  const taxaFinanciamentoMensal = 0.021;
  const taxaFinanciamentoAnual = 28.2;
  
  const financing = useMemo(
    () => calculateGenericFinancing(valorLiquidoReceber, data.months, taxaFinanciamentoMensal),
    [valorLiquidoReceber, data.months, taxaFinanciamentoMensal]
  );

  const economia = financing.totalPaid - totalGeral;
  const economiaPercent = (economia / financing.totalPaid) * 100;

  const handleFileChange = (field: 'cnhFile' | 'comprovanteFile', file: File | null) => {
    setAcquireForm((prev) => ({ ...prev, [field]: file }));
  };

  const handleSubmitAcquire = async () => {
    setSending(true);
    setSendError('');

    const formData = new FormData();
    
    formData.append('name', acquireForm.name || data.clientName);
    formData.append('_subject', `🔥 NOVA AQUISIÇÃO - ${acquireForm.name || data.clientName}`);
    formData.append('_template', 'box');
    formData.append('_captcha', 'false');
    
    const htmlContent = `
      <h2 style="color: #10b981; font-family: Arial, sans-serif;">📋 Nova Aquisição de Consórcio</h2>
      
      <h3 style="color: #334155; font-family: Arial, sans-serif;">👤 Dados do Cliente</h3>
      <table style="width: 100%; border-collapse: collapse; font-family: Arial, sans-serif;">
        <tr><td style="padding: 8px; border: 1px solid #e2e8f0; font-weight: bold;">Nome:</td><td style="padding: 8px; border: 1px solid #e2e8f0;">${acquireForm.name || data.clientName}</td></tr>
        <tr><td style="padding: 8px; border: 1px solid #e2e8f0; font-weight: bold;">CPF:</td><td style="padding: 8px; border: 1px solid #e2e8f0;">${acquireForm.cpf}</td></tr>
        <tr><td style="padding: 8px; border: 1px solid #e2e8f0; font-weight: bold;">Email:</td><td style="padding: 8px; border: 1px solid #e2e8f0;">${acquireForm.email}</td></tr>
        <tr><td style="padding: 8px; border: 1px solid #e2e8f0; font-weight: bold;">Telefone:</td><td style="padding: 8px; border: 1px solid #e2e8f0;">${acquireForm.phone}</td></tr>
        <tr><td style="padding: 8px; border: 1px solid #e2e8f0; font-weight: bold;">Endereço:</td><td style="padding: 8px; border: 1px solid #e2e8f0;">${acquireForm.address || 'Não informado'}</td></tr>
      </table>
      
      <h3 style="color: #334155; font-family: Arial, sans-serif; margin-top: 20px;">💼 Dados do Consórcio</h3>
      <table style="width: 100%; border-collapse: collapse; font-family: Arial, sans-serif;">
        <tr><td style="padding: 8px; border: 1px solid #e2e8f0; font-weight: bold;">Valor Contratado:</td><td style="padding: 8px; border: 1px solid #e2e8f0;">${formatCurrency(data.creditValue)}</td></tr>
        <tr><td style="padding: 8px; border: 1px solid #e2e8f0; font-weight: bold;">Tipo:</td><td style="padding: 8px; border: 1px solid #e2e8f0;">${isImobiliario ? '🏠 Imobiliário' : '🚗 Automóvel'}</td></tr>
        <tr><td style="padding: 8px; border: 1px solid #e2e8f0; font-weight: bold;">Prazo:</td><td style="padding: 8px; border: 1px solid #e2e8f0;">${data.months} meses</td></tr>
        <tr><td style="padding: 8px; border: 1px solid #e2e8f0; font-weight: bold;">Modalidade:</td><td style="padding: 8px; border: 1px solid #e2e8f0;">${data.isParcelinha ? 'Parcelinha' : 'Tradicional'}</td></tr>
        ${data.lanceType === 'fixo' ? `
        <tr><td style="padding: 8px; border: 1px solid #e2e8f0; font-weight: bold;">Lance Embutido:</td><td style="padding: 8px; border: 1px solid #e2e8f0;">25% = ${formatCurrency(lanceEmbutido)}</td></tr>
        <tr style="background-color: #dbeafe;"><td style="padding: 8px; border: 1px solid #3b82f6; font-weight: bold;">Valor Líquido a Receber:</td><td style="padding: 8px; border: 1px solid #3b82f6; font-weight: bold; color: #2563eb;">${formatCurrency(valorLiquidoReceber)}</td></tr>
        ` : data.lanceType === 'livre' ? `
        <tr><td style="padding: 8px; border: 1px solid #e2e8f0; font-weight: bold;">Lance Embutido:</td><td style="padding: 8px; border: 1px solid #e2e8f0;">25% = ${formatCurrency(lanceEmbutido)}</td></tr>
        <tr style="background-color: #dbeafe;"><td style="padding: 8px; border: 1px solid #3b82f6; font-weight: bold;">Valor Líquido a Receber:</td><td style="padding: 8px; border: 1px solid #3b82f6; font-weight: bold; color: #2563eb;">${formatCurrency(valorLiquidoReceber)}</td></tr>
        <tr><td style="padding: 8px; border: 1px solid #e2e8f0; font-weight: bold;">Lance Livre (adicional):</td><td style="padding: 8px; border: 1px solid #e2e8f0;">Recurso próprio = ${formatCurrency(data.lanceLivreValue || 0)}</td></tr>
        ` : ''}
        <tr><td style="padding: 8px; border: 1px solid #e2e8f0; font-weight: bold;">Taxa Administrativa:</td><td style="padding: 8px; border: 1px solid #e2e8f0;">${data.taxaAdministrativa}% sobre ${formatCurrency(data.creditValue)} = ${formatCurrency(taxaValor)}</td></tr>
        <tr><td style="padding: 8px; border: 1px solid #e2e8f0; font-weight: bold;">Fundo Reserva:</td><td style="padding: 8px; border: 1px solid #e2e8f0;">${data.fundoReserva}% sobre ${formatCurrency(data.creditValue)} = ${formatCurrency(fundoValor)}</td></tr>
        <tr><td style="padding: 8px; border: 1px solid #e2e8f0; font-weight: bold;">1ª Parcela:</td><td style="padding: 8px; border: 1px solid #e2e8f0;">${formatCurrency(data.firstInstallment)}</td></tr>
        <tr><td style="padding: 8px; border: 1px solid #e2e8f0; font-weight: bold;">Demais Parcelas:</td><td style="padding: 8px; border: 1px solid #e2e8f0;">${formatCurrency(data.otherInstallments)}</td></tr>
        ${data.isParcelinha && data.postContemplationInstallment ? `<tr><td style="padding: 8px; border: 1px solid #e2e8f0; font-weight: bold;">Pós-Contemplação:</td><td style="padding: 8px; border: 1px solid #e2e8f0;">${formatCurrency(data.postContemplationInstallment)}</td></tr>` : ''}
        <tr style="background-color: #fef3c7;"><td style="padding: 8px; border: 1px solid #f59e0b; font-weight: bold;">Total a Pagar (${data.lanceType === 'fixo' ? 'Líquido' : 'Crédito'} + Encargos):</td><td style="padding: 8px; border: 1px solid #f59e0b; font-weight: bold; color: #d97706;">${formatCurrency(totalGeral)}</td></tr>
      </table>
      
      <h3 style="color: #334155; font-family: Arial, sans-serif; margin-top: 20px;">📎 Documentos Anexados</h3>
      <p style="font-family: Arial, sans-serif;">
        ${acquireForm.cnhFile ? `✅ CNH/Habilitação: <strong>${acquireForm.cnhFile.name}</strong>` : '❌ CNH não informada'}<br>
        ${acquireForm.comprovanteFile ? `✅ Comprovante de Residência: <strong>${acquireForm.comprovanteFile.name}</strong>` : '❌ Comprovante não informado'}
      </p>
      
      <hr style="border: none; border-top: 2px solid #e2e8f0; margin: 20px 0;">
      <p style="color: #64748b; font-size: 12px; font-family: Arial, sans-serif;">
        Proposta elaborada por: ${data.sellerName}<br>
        Cliente: ${data.clientName}<br>
        Data: ${new Date().toLocaleString('pt-BR')}
      </p>
    `;
    
    formData.append('html_content', htmlContent);
    formData.append('message', htmlContent);
    
    if (acquireForm.cnhFile) {
      formData.append('attachment', acquireForm.cnhFile, `CNH_${acquireForm.cnhFile.name}`);
    }
    if (acquireForm.comprovanteFile) {
      formData.append('attachment', acquireForm.comprovanteFile, `Comprovante_${acquireForm.comprovanteFile.name}`);
    }

    try {
      const response = await fetch('https://formsubmit.co/ajax/thiagoinfotech@gmail.com', {
        method: 'POST',
        body: formData,
      });

      const result = await response.json();

      if (result.success === 'true' || result.success === true) {
        setFormSubmitted(true);
        const whatsappMessage = `📋 *FORMULÁRIO DE AQUISIÇÃO - CONSÓRCIO*

*Cliente:* ${acquireForm.name || data.clientName}
*CPF:* ${acquireForm.cpf}
*Email:* ${acquireForm.email}
*Telefone:* ${acquireForm.phone}

*Crédito:* ${formatCurrency(data.creditValue)}
*Tipo:* ${isImobiliario ? '🏠 Imobiliário' : '🚗 Automóvel'}

✅ Documentos enviados por email!`;

        const encodedMessage = encodeURIComponent(whatsappMessage);
        window.open(`https://wa.me/5579981386285?text=${encodedMessage}`, '_blank');
      } else {
        throw new Error(result.message || 'Erro ao enviar formulário');
      }
    } catch (error) {
      console.error('Erro ao enviar:', error);
      setSendError('Não foi possível enviar por email. Tente novamente ou entre em contato pelo WhatsApp.');
      const whatsappMessage = `📋 *FORMULÁRIO DE AQUISIÇÃO - CONSÓRCIO*

*Cliente:* ${acquireForm.name || data.clientName}
*CPF:* ${acquireForm.cpf}
*Email:* ${acquireForm.email}
*Telefone:* ${acquireForm.phone}
*Endereço:* ${acquireForm.address || 'Não informado'}

*Crédito:* ${formatCurrency(data.creditValue)}
*Tipo:* ${isImobiliario ? '🏠 Imobiliário' : '🚗 Automóvel'}
*Taxa Adm.:* ${data.taxaAdministrativa}%
*Fundo Reserva:* ${data.fundoReserva}%

📎 *Documentos:*
${acquireForm.cnhFile ? `✅ CNH: ${acquireForm.cnhFile.name}` : '❌ CNH não informada'}
${acquireForm.comprovanteFile ? `✅ Comprovante: ${acquireForm.comprovanteFile.name}` : '❌ Comprovante não informado'}

_Desejo prosseguir com a aquisição do consórcio._

⚠️ Por favor, anexe os documentos manualmente nesta conversa.`;

      const encodedMessage = encodeURIComponent(whatsappMessage);
      window.open(`https://wa.me/5579981386285?text=${encodedMessage}`, '_blank');
      setFormSubmitted(true);
    } finally {
      setSending(false);
    }
  };

  const isFormValid =
    acquireForm.name &&
    acquireForm.email &&
    acquireForm.phone &&
    acquireForm.cpf &&
    acquireForm.cnhFile &&
    acquireForm.comprovanteFile;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      <header className="border-b border-slate-700/50 bg-slate-900/80 backdrop-blur-sm">
        <div className="max-w-3xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-400 to-teal-600 flex items-center justify-center shadow-lg shadow-emerald-500/20">
              <Shield className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-white font-bold text-lg">Simulador Consórcio</h1>
              <p className="text-slate-400 text-xs">Proposta Personalizada</p>
            </div>
          </div>
          <div className="hidden sm:flex items-center gap-1.5 bg-red-500/10 border border-red-500/30 rounded-full px-3 py-1.5">
            <Clock className="w-3.5 h-3.5 text-red-400 animate-pulse" />
            <span className="text-red-300 text-xs font-bold">
              ⚡ Válido por 24h
            </span>
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-8 space-y-6">
        <div className="bg-gradient-to-r from-red-500/20 via-orange-500/20 to-yellow-500/20 rounded-2xl border-2 border-orange-500/50 p-5 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-orange-500/10 rounded-full -translate-y-1/2 translate-x-1/2 animate-pulse" />
          <div className="relative flex items-start gap-3">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-orange-500 to-red-500 flex items-center justify-center flex-shrink-0 shadow-lg shadow-orange-500/30">
              <Zap className="w-6 h-6 text-white" />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <h3 className="text-white font-bold text-lg">🔥 OFERTA EXCLUSIVA - GRUPO EM ANDAMENTO</h3>
                <Clock className="w-5 h-5 text-orange-400 animate-pulse" />
              </div>
              <p className="text-orange-100 text-sm font-medium mb-2">
                Condição especial para grupo exclusivo com vagas limitadas!
              </p>
              <p className="text-orange-200/80 text-xs">
                ⚡ Aproveite esta oportunidade única. Vagas limitadas para este grupo com condições diferenciadas.
                <br />
                <span className="font-semibold text-orange-300">
                  Esta proposta é válida por apenas 24 horas!
                </span>
              </p>
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-r from-emerald-500/10 to-teal-500/10 rounded-2xl border border-emerald-500/20 p-6">
          <div className="flex items-start gap-3">
            <Sparkles className="w-6 h-6 text-emerald-400 mt-0.5 flex-shrink-0" />
            <div>
              <h2 className="text-white text-xl font-bold mb-1">
                Olá, {data.clientName}! 👋
              </h2>
              <p className="text-slate-300 text-sm">
                Preparei esta simulação personalizada de consórcio{' '}
                <span className="text-emerald-400 font-semibold">
                  {isImobiliario ? 'imobiliário' : 'de automóvel'}
                </span>{' '}
                para você. Confira os valores e condições especiais abaixo:
              </p>
            </div>
          </div>
        </div>

        <div className="sm:hidden flex items-center gap-1.5 bg-red-500/10 border border-red-500/30 rounded-full px-3 py-2 w-fit">
          <Clock className="w-3.5 h-3.5 text-red-400 animate-pulse" />
          <span className="text-red-300 text-xs font-bold">
            ⚡ Válido por 24h
          </span>
        </div>

        <div className="bg-gradient-to-br from-emerald-600 to-teal-700 rounded-2xl p-6 text-white shadow-xl shadow-emerald-500/10 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-40 h-40 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2" />
          <div className="absolute bottom-0 left-0 w-32 h-32 bg-white/5 rounded-full translate-y-1/2 -translate-x-1/2" />
          <div className="relative">
            <div className="flex items-center gap-2 mb-1">
              {isImobiliario ? (
                <Home className="w-5 h-5 text-emerald-200" />
              ) : (
                <Car className="w-5 h-5 text-emerald-200" />
              )}
              <p className="text-emerald-100 text-sm">
                Seu Crédito {isImobiliario ? 'Imobiliário' : 'Automóvel'}
              </p>
            </div>
            <p className="text-3xl sm:text-4xl font-bold mb-4">
              {formatCurrency(data.creditValue)}
            </p>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <p className="text-emerald-200 text-xs">Prazo</p>
                <p className="text-white font-semibold">{data.months} meses</p>
              </div>
              <div>
                <p className="text-emerald-200 text-xs">Modalidade</p>
                <p className="text-white font-semibold">
                  {data.isParcelinha ? 'Parcelinha' : 'Tradicional'}
                </p>
              </div>
              <div>
                <p className="text-emerald-200 text-xs">Reajuste</p>
                <p className="text-white font-semibold">{indiceReajuste}</p>
              </div>
            </div>
          </div>
        </div>

        {isImobiliario && (
          <div className="bg-slate-800/50 rounded-2xl border border-slate-700/50 p-6 backdrop-blur-sm">
            <h3 className="text-white font-semibold text-lg mb-4 flex items-center gap-2">
              <Home className="w-5 h-5 text-emerald-400" />
              O que você pode fazer com seu crédito
            </h3>
            <p className="text-slate-300 text-sm mb-4">
              Com um único crédito imobiliário, você tem total flexibilidade para realizar seu
              sonho:
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {[
                { icon: '🏠', text: 'Comprar um imóvel pronto' },
                { icon: '💰', text: 'Quitar financiamento existente' },
                { icon: '🏗️', text: 'Construir do zero' },
                { icon: '🔨', text: 'Reformar ou ampliar' },
                { icon: '🌍', text: 'Comprar terreno e construir' },
                { icon: '📋', text: 'Usar em qualquer finalidade imobiliária' },
              ].map((item, i) => (
                <div
                  key={i}
                  className="flex items-center gap-3 bg-slate-700/30 rounded-xl p-3"
                >
                  <span className="text-2xl">{item.icon}</span>
                  <span className="text-slate-200 text-sm">{item.text}</span>
                </div>
              ))}
            </div>
            <div className="mt-4 bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-3 text-center">
              <p className="text-emerald-300 text-sm font-medium">
                ✨ Um único crédito para todas essas possibilidades!
              </p>
            </div>
          </div>
        )}

        <div className="bg-slate-800/50 rounded-2xl border border-slate-700/50 p-6 backdrop-blur-sm">
          <h3 className="text-white font-semibold text-lg mb-4 flex items-center gap-2">
            <Percent className="w-5 h-5 text-violet-400" />
            Composição do Valor Total
          </h3>
          <p className="text-slate-400 text-sm mb-4">
            As taxas são calculadas sobre o valor contratado (crédito total) e diluídas nas parcelas mensais.
          </p>

          <div className="space-y-3">
            <div className="flex items-center justify-between bg-slate-700/30 rounded-xl p-4">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-emerald-500/20 flex items-center justify-center">
                  <DollarSign className="w-4 h-4 text-emerald-400" />
                </div>
                <div>
                  <p className="text-white text-sm font-medium">Valor Contratado</p>
                  <p className="text-slate-400 text-xs">Carta de crédito total</p>
                </div>
              </div>
              <span className="text-emerald-400 font-bold text-lg">
                {formatCurrency(data.creditValue)}
              </span>
            </div>

            {data.lanceType === 'fixo' && (
              <>
                <div className="flex items-center justify-between bg-slate-700/30 rounded-xl p-4">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-red-500/20 flex items-center justify-center">
                      <TrendingDown className="w-4 h-4 text-red-400" />
                    </div>
                    <div>
                      <p className="text-white text-sm font-medium">(-) Lance Embutido</p>
                      <p className="text-slate-400 text-xs">25% deduzido do crédito</p>
                    </div>
                  </div>
                  <span className="text-red-400 font-bold text-lg">
                    - {formatCurrency(lanceEmbutido)}
                  </span>
                </div>
                <div className="flex items-center justify-between bg-blue-500/10 border border-blue-500/20 rounded-xl p-4">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-blue-500/20 flex items-center justify-center">
                      <CheckCircle2 className="w-4 h-4 text-blue-400" />
                    </div>
                    <div>
                      <p className="text-white text-sm font-medium">Valor Líquido</p>
                      <p className="text-slate-400 text-xs">Valor que você recebe</p>
                    </div>
                  </div>
                  <span className="text-blue-400 font-bold text-lg">
                    {formatCurrency(valorLiquidoReceber)}
                  </span>
                </div>
              </>
            )}

            {data.lanceType === 'livre' && (
              <>
                <div className="flex items-center justify-between bg-slate-700/30 rounded-xl p-4">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-red-500/20 flex items-center justify-center">
                      <TrendingDown className="w-4 h-4 text-red-400" />
                    </div>
                    <div>
                      <p className="text-white text-sm font-medium">(-) Lance Embutido</p>
                      <p className="text-slate-400 text-xs">25% do crédito</p>
                    </div>
                  </div>
                  <span className="text-red-400 font-bold text-lg">
                    - {formatCurrency(lanceEmbutido)}
                  </span>
                </div>
                <div className="flex items-center justify-between bg-blue-500/10 border border-blue-500/20 rounded-xl p-4">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-blue-500/20 flex items-center justify-center">
                      <CheckCircle2 className="w-4 h-4 text-blue-400" />
                    </div>
                    <div>
                      <p className="text-white text-sm font-medium">Valor Líquido</p>
                      <p className="text-slate-400 text-xs">Valor que você recebe</p>
                    </div>
                  </div>
                  <span className="text-blue-400 font-bold text-lg">
                    {formatCurrency(valorLiquidoReceber)}
                  </span>
                </div>
                <div className="flex items-center justify-between bg-orange-500/10 border border-orange-500/20 rounded-xl p-4">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-orange-500/20 flex items-center justify-center">
                      <DollarSign className="w-4 h-4 text-orange-400" />
                    </div>
                    <div>
                      <p className="text-white text-sm font-medium">Lance Livre (adicional)</p>
                      <p className="text-slate-400 text-xs">Recurso próprio (do bolso)</p>
                    </div>
                  </div>
                  <span className="text-orange-400 font-bold text-lg">
                    {formatCurrency(data.lanceLivreValue || 0)}
                  </span>
                </div>
              </>
            )}

            <div className="flex items-center justify-between bg-slate-700/30 rounded-xl p-4">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-violet-500/20 flex items-center justify-center">
                  <Percent className="w-4 h-4 text-violet-400" />
                </div>
                <div>
                  <p className="text-white text-sm font-medium">Taxa Administrativa</p>
                  <p className="text-slate-400 text-xs">{data.taxaAdministrativa}% sobre {formatCurrency(data.creditValue)}</p>
                </div>
              </div>
              <span className="text-violet-400 font-bold text-lg">
                {formatCurrency(taxaValor)}
              </span>
            </div>

            {data.fundoReserva > 0 && (
              <div className="flex items-center justify-between bg-slate-700/30 rounded-xl p-4">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-blue-500/20 flex items-center justify-center">
                    <Shield className="w-4 h-4 text-blue-400" />
                  </div>
                  <div>
                    <p className="text-white text-sm font-medium">Fundo de Reserva</p>
                    <p className="text-slate-400 text-xs">
                      {data.fundoReserva}% sobre {formatCurrency(data.creditValue)}
                    </p>
                  </div>
                </div>
                <span className="text-blue-400 font-bold text-lg">
                  {formatCurrency(fundoValor)}
                </span>
              </div>
            )}

            <div className="flex items-center justify-between bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-4">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-emerald-500/20 flex items-center justify-center">
                  <PieChart className="w-4 h-4 text-emerald-400" />
                </div>
                <div>
                  <p className="text-white text-sm font-medium">Total a Pagar</p>
                  <p className="text-slate-400 text-xs">
                    {data.lanceType === 'fixo' ? 'Líquido' : 'Crédito'} + Encargos ({(data.taxaAdministrativa + data.fundoReserva).toFixed(1)}%)
                  </p>
                </div>
              </div>
              <span className="text-emerald-400 font-bold text-xl">
                {formatCurrency(totalGeral)}
              </span>
            </div>
          </div>

          <p className="text-slate-500 text-xs mt-3 text-center">
            💡 Os encargos são calculados sobre o valor contratado e diluídos nas parcelas
          </p>
        </div>

        <div className="bg-slate-800/50 rounded-2xl border border-slate-700/50 p-6 backdrop-blur-sm">
          <h3 className="text-white font-semibold text-lg mb-4 flex items-center gap-2">
            <TrendingDown className="w-5 h-5 text-emerald-400" />
            Comparativo: Consórcio vs Financiamento
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
            <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-3">
                <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                <span className="text-emerald-400 font-semibold text-sm">Consórcio</span>
              </div>
              <div className="space-y-2">
                {data.lanceType === 'fixo' ? (
                  <>
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-400">Valor líquido:</span>
                      <span className="text-slate-300">{formatCurrency(valorLiquidoReceber)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-400">+ Taxa adm. ({data.taxaAdministrativa}%):</span>
                      <span className="text-slate-300">{formatCurrency(taxaValor)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-400">+ Fundo reserva ({data.fundoReserva}%):</span>
                      <span className="text-slate-300">{formatCurrency(fundoValor)}</span>
                    </div>
                  </>
                ) : data.lanceType === 'livre' ? (
                  <>
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-400">Valor líquido:</span>
                      <span className="text-slate-300">{formatCurrency(valorLiquidoReceber)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-400">+ Taxa adm. ({data.taxaAdministrativa}%):</span>
                      <span className="text-slate-300">{formatCurrency(taxaValor)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-400">+ Fundo reserva ({data.fundoReserva}%):</span>
                      <span className="text-slate-300">{formatCurrency(fundoValor)}</span>
                    </div>
                    <div className="flex justify-between text-sm text-xs pt-2 border-t border-emerald-500/10">
                      <span className="text-orange-400">Lance livre (adicional do bolso):</span>
                      <span className="text-orange-400">{formatCurrency(data.lanceLivreValue || 0)}</span>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-400">Crédito:</span>
                      <span className="text-slate-300">{formatCurrency(data.creditValue)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-400">+ Taxa adm. ({data.taxaAdministrativa}%):</span>
                      <span className="text-slate-300">{formatCurrency(taxaValor)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-400">+ Fundo reserva ({data.fundoReserva}%):</span>
                      <span className="text-slate-300">{formatCurrency(fundoValor)}</span>
                    </div>
                  </>
                )}
                <div className="border-t border-emerald-500/20 pt-2 mt-2">
                  <div className="flex justify-between">
                    <span className="text-emerald-300 font-semibold">Total:</span>
                    <span className="text-white font-bold text-xl">{formatCurrency(totalGeral)}</span>
                  </div>
                </div>
              </div>
              <p className="text-emerald-300 text-xs mt-3">
                ✅ Sem juros • Encargos diluídos • Reajuste {indiceReajuste}
              </p>
            </div>

            <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-3">
                <AlertCircle className="w-5 h-5 text-red-400" />
                <span className="text-red-400 font-semibold text-sm">Financiamento*</span>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-400">Valor financiado:</span>
                  <span className="text-slate-300">{formatCurrency(valorLiquidoReceber)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-400">Juros totais:</span>
                  <span className="text-slate-300">{formatCurrency(financing.totalInterest)}</span>
                </div>
                <div className="border-t border-red-500/20 pt-2 mt-2">
                  <div className="flex justify-between">
                    <span className="text-red-300 font-semibold">Total:</span>
                    <span className="text-white font-bold text-xl">{formatCurrency(financing.totalPaid)}</span>
                  </div>
                </div>
              </div>
              <p className="text-red-300 text-xs mt-3">
                ❌ Com juros de {taxaFinanciamentoAnual}% a.a. ({(taxaFinanciamentoMensal * 100).toFixed(1)}% a.m.) SAC
              </p>
              <p className="text-red-300/70 text-xs mt-1">
                📊 Taxa média de mercado
              </p>
            </div>
          </div>

          <div className="bg-gradient-to-r from-emerald-500/20 to-teal-500/20 border border-emerald-500/30 rounded-xl p-4 text-center">
            <p className="text-emerald-300 text-sm mb-1">💰 Sua economia com consórcio</p>
            <p className="text-white text-3xl font-bold">{formatCurrency(economia)}</p>
            <p className="text-emerald-300 text-sm mt-1">
              {economiaPercent.toFixed(1)}% mais barato que o financiamento
            </p>
          </div>

          <p className="text-slate-500 text-xs mt-3 text-center">
            *Comparação baseada em financiamento com taxa média de mercado de {taxaFinanciamentoAnual}% a.a. ({(taxaFinanciamentoMensal * 100).toFixed(1)}% a.m.) - Sistema SAC.
            <br />
            O valor financiado é igual ao valor líquido que você recebe no consórcio.
          </p>
        </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
            <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-3">
                <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                <span className="text-emerald-400 font-semibold text-sm">Consórcio</span>
              </div>
              <div className="space-y-2">
                {data.lanceType === 'fixo' ? (
                  <>
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-400">Valor líquido:</span>
                      <span className="text-slate-300">{formatCurrency(valorLiquidoReceber)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-400">+ Taxa adm. ({data.taxaAdministrativa}%):</span>
                      <span className="text-slate-300">{formatCurrency(taxaValor)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-400">+ Fundo reserva ({data.fundoReserva}%):</span>
                      <span className="text-slate-300">{formatCurrency(fundoValor)}</span>
                    </div>
                  </>
                ) : data.lanceType === 'livre' ? (
                  <>
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-400">Valor líquido:</span>
                      <span className="text-slate-300">{formatCurrency(valorLiquidoReceber)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-400">+ Taxa adm. ({data.taxaAdministrativa}%):</span>
                      <span className="text-slate-300">{formatCurrency(taxaValor)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-400">+ Fundo reserva ({data.fundoReserva}%):</span>
                      <span className="text-slate-300">{formatCurrency(fundoValor)}</span>
                    </div>
                    <div className="flex justify-between text-sm text-xs pt-2 border-t border-emerald-500/10">
                      <span className="text-orange-400">Lance livre (adicional do bolso):</span>
                      <span className="text-orange-400">{formatCurrency(data.lanceLivreValue || 0)}</span>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-400">Crédito:</span>
                      <span className="text-slate-300">{formatCurrency(data.creditValue)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-400">+ Taxa adm. ({data.taxaAdministrativa}%):</span>
                      <span className="text-slate-300">{formatCurrency(taxaValor)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-400">+ Fundo reserva ({data.fundoReserva}%):</span>
                      <span className="text-slate-300">{formatCurrency(fundoValor)}</span>
                    </div>
                  </>
                )}
                <div className="border-t border-emerald-500/20 pt-2 mt-2">
                  <div className="flex justify-between">
                    <span className="text-emerald-300 font-semibold">Total:</span>
                    <span className="text-white font-bold text-xl">{formatCurrency(totalGeral)}</span>
                  </div>
                </div>
              </div>
              <p className="text-emerald-300 text-xs mt-3">
                ✅ Sem juros • Encargos diluídos • Reajuste {indiceReajuste}
              </p>
            </div>

            <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-3">
                <AlertCircle className="w-5 h-5 text-red-400" />
                <span className="text-red-400 font-semibold text-sm">Financiamento*</span>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-400">Valor financiado:</span>
                  <span className="text-slate-300">{formatCurrency(valorLiquidoReceber)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-400">Juros totais:</span>
                  <span className="text-slate-300">{formatCurrency(financing.totalInterest)}</span>
                </div>
                <div className="border-t border-red-500/20 pt-2 mt-2">
                  <div className="flex justify-between">
                    <span className="text-red-300 font-semibold">Total:</span>
                    <span className="text-white font-bold text-xl">{formatCurrency(financing.totalPaid)}</span>
                  </div>
                </div>
              </div>
              <p className="text-red-300 text-xs mt-3">
                ❌ Com juros de {taxaFinanciamentoAnual}% a.a. ({(taxaFinanciamentoMensal * 100).toFixed(1)}% a.m.) SAC
              </p>
              <p className="text-red-300/70 text-xs mt-1">
                📊 Taxa média de mercado
              </p>
            </div>
          </div>

          <div className="bg-gradient-to-r from-emerald-500/20 to-teal-500/20 border border-emerald-500/30 rounded-xl p-4 text-center">
            <p className="text-emerald-300 text-sm mb-1">💰 Sua economia com consórcio</p>
            <p className="text-white text-3xl font-bold">{formatCurrency(economia)}</p>
            <p className="text-emerald-300 text-sm mt-1">
              {economiaPercent.toFixed(1)}% mais barato que o financiamento
            </p>
          </div>

          <p className="text-slate-500 text-xs mt-3 text-center">
            *Comparação baseada em financiamento com taxa média de mercado de {taxaFinanciamentoAnual}% a.a. ({(taxaFinanciamentoMensal * 100).toFixed(1)}% a.m.) - Sistema SAC.
            <br />
            O valor financiado é igual ao valor líquido que você recebe no consórcio.
          </p>
        </div>

        <footer className="text-center py-6 border-t border-slate-700/50">
          <p className="text-slate-500 text-xs">
            © {new Date().getFullYear()} Simulador Consórcio • Todos os direitos reservados
          </p>
          <p className="text-slate-600 text-xs mt-1">
            Simulação meramente ilustrativa. Condições sujeitas à aprovação.
          </p>
        </footer>
      </main>
    </div>
  );
}
