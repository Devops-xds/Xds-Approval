import React, { useState } from 'react';
import { useAppContext } from '@/contexts/AppContext';
import { api, DocumentVerification } from '@/lib/api';
import { formatCurrencyAmount } from '@/lib/currency';
import {
  FileSearch,
  Search,
  CheckCircle2,
  XCircle,
  FileText,
  Shield,
  Hash,
  Key,
} from 'lucide-react';
import { toast } from 'sonner';

const DocumentVerify: React.FC = () => {
  const { colorTheme } = useAppContext();
  const [documentNumber, setDocumentNumber] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [result, setResult] = useState<DocumentVerification | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!documentNumber.trim() && !verificationCode.trim()) {
      toast.error('Please fill in at least one field');
      return;
    }

    setIsLoading(true);
    setHasSearched(true);
    try {
      const data = await api.verifyDocument({
        documentNumber: documentNumber.trim() || undefined,
        verificationCode: verificationCode.trim() || undefined,
      });
      setResult(data);
    } catch (err: any) {
      setResult(null);
      toast.error('Document not found', { description: err.message });
    } finally {
      setIsLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return formatCurrencyAmount(amount, 'GHS');
  };

  const themeClasses: Record<string, {
    iconShell: string;
    iconText: string;
    title: string;
    input: string;
    submit: string;
    submitShadow: string;
    validShell: string;
    validBorder: string;
    validIconShell: string;
    validIconText: string;
    validTitle: string;
    validText: string;
    validCard: string;
  }> = {
    emerald: {
      iconShell: 'bg-emerald-50',
      iconText: 'text-emerald-600',
      title: 'text-emerald-700',
      input: 'focus:ring-emerald-500/20 focus:border-emerald-600',
      submit: 'bg-emerald-700 hover:bg-emerald-800 disabled:bg-emerald-400',
      submitShadow: 'shadow-emerald-900/20',
      validShell: 'bg-emerald-50',
      validBorder: 'border-emerald-200',
      validIconShell: 'bg-emerald-100',
      validIconText: 'text-emerald-600',
      validTitle: 'text-emerald-900',
      validText: 'text-emerald-700',
      validCard: 'text-emerald-900',
    },
    ocean: {
      iconShell: 'bg-emerald-50',
      iconText: 'text-emerald-600',
      title: 'text-emerald-700',
      input: 'focus:ring-emerald-500/20 focus:border-emerald-600',
      submit: 'bg-emerald-700 hover:bg-emerald-800 disabled:bg-emerald-400',
      submitShadow: 'shadow-emerald-900/20',
      validShell: 'bg-emerald-50',
      validBorder: 'border-emerald-200',
      validIconShell: 'bg-emerald-100',
      validIconText: 'text-emerald-600',
      validTitle: 'text-emerald-900',
      validText: 'text-emerald-700',
      validCard: 'text-emerald-900',
    },
    sunset: {
      iconShell: 'bg-emerald-50',
      iconText: 'text-emerald-600',
      title: 'text-emerald-700',
      input: 'focus:ring-emerald-500/20 focus:border-emerald-600',
      submit: 'bg-emerald-700 hover:bg-emerald-800 disabled:bg-emerald-300',
      submitShadow: 'shadow-emerald-900/20',
      validShell: 'bg-emerald-50',
      validBorder: 'border-emerald-200',
      validIconShell: 'bg-emerald-100',
      validIconText: 'text-emerald-600',
      validTitle: 'text-emerald-900',
      validText: 'text-emerald-700',
      validCard: 'text-emerald-900',
    },
  };

  return (
    <div className="max-w-xl mx-auto space-y-8">
      <div className="text-center">
        <div className={`w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4 ${themeClasses[colorTheme].iconShell}`}>
          <FileSearch className={`w-8 h-8 ${themeClasses[colorTheme].iconText}`} />
        </div>
        <h1 className={`text-2xl font-bold ${themeClasses[colorTheme].title}`}>Document verification</h1>
        <p className="text-slate-500 dark:text-slate-400 mt-2">
          Verify a document's authenticity by entering its number or verification code
        </p>
      </div>

      <form onSubmit={handleVerify} className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 p-6 space-y-5">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">
            Document number
          </label>
          <div className="relative">
            <Hash className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input
              type="text"
              value={documentNumber}
              onChange={(e) => setDocumentNumber(e.target.value)}
              placeholder="Ex: REF00001"
              className={`w-full pl-12 pr-4 py-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 transition-all ${themeClasses[colorTheme].input}`}
            />
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex-1 h-px bg-slate-200" />
          <span className="text-xs text-slate-400 font-medium">AND / OR</span>
          <div className="flex-1 h-px bg-slate-200" />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">
            Verification code
          </label>
          <div className="relative">
            <Key className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input
              type="text"
              value={verificationCode}
              onChange={(e) => setVerificationCode(e.target.value)}
              placeholder="Ex: ABC123XYZ"
              className={`w-full pl-12 pr-4 py-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 transition-all font-mono ${themeClasses[colorTheme].input}`}
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={isLoading}
          className={`w-full py-3 text-white font-semibold rounded-xl transition-all flex items-center justify-center gap-2 shadow-lg ${themeClasses[colorTheme].submit} ${themeClasses[colorTheme].submitShadow}`}
        >
          {isLoading ? (
            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          ) : (
            <>
              <Search className="w-4 h-4" />
              Verify
            </>
          )}
        </button>
      </form>

      {/* Result */}
      {hasSearched && !isLoading && (
        <>
          {result?.isValid ? (
            <div className={`border rounded-2xl p-6 space-y-4 ${themeClasses[colorTheme].validShell} ${themeClasses[colorTheme].validBorder}`}>
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${themeClasses[colorTheme].validIconShell}`}>
                  <CheckCircle2 className={`w-5 h-5 ${themeClasses[colorTheme].validIconText}`} />
                </div>
                <div>
                  <h3 className={`text-lg font-semibold ${themeClasses[colorTheme].validTitle}`}>Valid document</h3>
                  <p className={`text-sm ${themeClasses[colorTheme].validText}`}>This document is authentic and verified</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="bg-white/80 rounded-xl p-3">
                  <p className={`text-xs font-medium ${themeClasses[colorTheme].validText}`}>Title</p>
                  <p className={`text-sm font-medium mt-0.5 ${themeClasses[colorTheme].validCard}`}>{result.paymentRequestTitle}</p>
                </div>
                <div className="bg-white/80 rounded-xl p-3">
                  <p className={`text-xs font-medium ${themeClasses[colorTheme].validText}`}>Amount</p>
                  <p className={`text-sm font-medium mt-0.5 ${themeClasses[colorTheme].validCard}`}>{formatCurrency(result.amount)}</p>
                </div>
                <div className="bg-white/80 rounded-xl p-3">
                  <p className={`text-xs font-medium ${themeClasses[colorTheme].validText}`}>Number</p>
                  <p className={`text-sm font-mono font-medium mt-0.5 ${themeClasses[colorTheme].validCard}`}>{result.documentNumber}</p>
                </div>
                <div className="bg-white/80 rounded-xl p-3">
                  <p className={`text-xs font-medium ${themeClasses[colorTheme].validText}`}>Status</p>
                  <p className={`text-sm font-medium mt-0.5 ${themeClasses[colorTheme].validCard}`}>{result.status}</p>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-red-50 border border-red-200 rounded-2xl p-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-red-100 rounded-xl flex items-center justify-center">
                  <XCircle className="w-5 h-5 text-red-600" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-red-900">Document not found</h3>
                  <p className="text-sm text-red-700">
                    No document matches the provided information
                  </p>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default DocumentVerify;
