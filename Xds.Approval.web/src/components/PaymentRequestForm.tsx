import React, { useState, useRef } from 'react';
import { useAppContext } from '@/contexts/AppContext';
import { api, CreatePaymentRequest } from '@/lib/api';
import { getCurrencySymbol, getPaymentTypeOptions, getTaxBreakdown, PaymentType } from '@/lib/payment';
import {
  FileText,
  Upload,
  X,
  ArrowLeft,
  Send,
  Calendar,
  AlignLeft,
  Type,
  Repeat,
} from 'lucide-react';
import { toast } from 'sonner';

interface PaymentRequestFormProps {
  onSuccess: () => void;
  onCancel: () => void;
}

const PaymentRequestForm: React.FC<PaymentRequestFormProps> = ({ onSuccess, onCancel }) => {
  const { colorTheme } = useAppContext();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [currency, setCurrency] = useState('GHS');
  const [deadline, setDeadline] = useState('');
  const [paymentType, setPaymentType] = useState<PaymentType>('One-off');
  const [files, setFiles] = useState<File[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const fileInputRef = useRef<HTMLInputElement>(null);

  const currencies = ['GHS', 'USD', 'EUR', 'GBP'];
  const paymentTypes = getPaymentTypeOptions();
  const numericAmount = Number.parseFloat(amount);
  const taxBreakdown = Number.isFinite(numericAmount) && numericAmount > 0
    ? getTaxBreakdown(numericAmount, paymentType)
    : null;

  const validate = () => {
    const newErrors: Record<string, string> = {};
    if (!title.trim()) newErrors.title = 'Title is required';
    if (!description.trim()) newErrors.description = 'Description is required';
    if (!amount || parseFloat(amount) <= 0) newErrors.amount = 'Amount must be greater than 0';
    if (!deadline) newErrors.deadline = 'Deadline is required';
    if (!paymentType) newErrors.paymentType = 'Tax category is required';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setIsSubmitting(true);
    try {
      const data: CreatePaymentRequest = {
        title: title.trim(),
        description: description.trim(),
        amount: parseFloat(amount),
        currency,
        deadline,
        paymentType,
      };

      const result = await api.createPaymentRequest(data);

      // Upload attachments if any
      for (const file of files) {
        try {
          await api.uploadAttachment(result.id, file);
        } catch (err) {
          console.error('Failed to upload attachment:', err);
        }
      }

      toast.success('Request created successfully', {
        description: 'Your request has been sent to the CEO for initial approval.',
      });
      onSuccess();
    } catch (err: any) {
      toast.error('Error while creating request', {
        description: err.message || 'Please try again.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleFileDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const droppedFiles = Array.from(e.dataTransfer.files);
    setFiles((prev) => [...prev, ...droppedFiles]);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const selectedFiles = Array.from(e.target.files);
      setFiles((prev) => [...prev, ...selectedFiles]);
    }
  };

  const removeFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const themeClasses: Record<string, {
    back: string;
    title: string;
    input: string;
    upload: string;
    submit: string;
    submitShadow: string;
  }> = {
    emerald: {
      back: 'hover:text-emerald-700',
      title: 'text-emerald-700',
      input: 'focus:ring-emerald-500/20 focus:border-emerald-600',
      upload: 'hover:border-emerald-300 hover:bg-emerald-50/50',
      submit: 'bg-emerald-700 hover:bg-emerald-800 disabled:bg-emerald-400',
      submitShadow: 'shadow-emerald-900/20',
    },
    ocean: {
      back: 'hover:text-emerald-700',
      title: 'text-emerald-700',
      input: 'focus:ring-emerald-500/20 focus:border-emerald-600',
      upload: 'hover:border-emerald-300 hover:bg-emerald-50/50',
      submit: 'bg-emerald-700 hover:bg-emerald-800 disabled:bg-emerald-400',
      submitShadow: 'shadow-emerald-900/20',
    },
    sunset: {
      back: 'hover:text-emerald-700',
      title: 'text-emerald-700',
      input: 'focus:ring-emerald-500/20 focus:border-emerald-600',
      upload: 'hover:border-emerald-300 hover:bg-emerald-50/50',
      submit: 'bg-emerald-700 hover:bg-emerald-800 disabled:bg-emerald-300',
      submitShadow: 'shadow-emerald-900/20',
    },
  };

  return (
    <div className="max-w-2xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <button
          onClick={onCancel}
          className={`flex items-center gap-2 text-slate-500 text-sm font-medium mb-4 transition-colors ${themeClasses[colorTheme].back}`}
        >
          <ArrowLeft className="w-4 h-4" />
          Back
        </button>
        <h1 className={`text-2xl font-bold ${themeClasses[colorTheme].title}`}>New payment request</h1>
        <p className="text-slate-500 dark:text-slate-400 mt-1">
          Fill in the details below. The request will be sent to the CEO for approval.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Title */}
        <div className="bg-white/95 dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm p-6 space-y-5">
          <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100 uppercase tracking-wider">Information</h3>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Request title
            </label>
            <div className="relative">
              <Type className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
              <input
                type="text"
                value={title}
                onChange={(e) => { setTitle(e.target.value); setErrors((p) => ({ ...p, title: '' })); }}
                placeholder="e.g. Office supplies purchase"
                className={`w-full pl-12 pr-4 py-3 bg-slate-50 dark:bg-slate-950 border rounded-xl text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 transition-all ${themeClasses[colorTheme].input} ${
                  errors.title ? 'border-red-300 bg-red-50/50' : 'border-slate-200'
                }`}
              />
            </div>
            {errors.title && <p className="text-red-500 text-sm mt-1.5">{errors.title}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Description
            </label>
            <div className="relative">
              <AlignLeft className="absolute left-4 top-3.5 w-5 h-5 text-slate-400" />
              <textarea
                value={description}
                onChange={(e) => { setDescription(e.target.value); setErrors((p) => ({ ...p, description: '' })); }}
                placeholder="Describe this payment request in detail..."
                rows={4}
                className={`w-full pl-12 pr-4 py-3 bg-slate-50 dark:bg-slate-950 border rounded-xl text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 transition-all resize-none ${themeClasses[colorTheme].input} ${
                  errors.description ? 'border-red-300 bg-red-50/50' : 'border-slate-200'
                }`}
              />
            </div>
            {errors.description && <p className="text-red-500 text-sm mt-1.5">{errors.description}</p>}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Amount
              </label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-lg font-semibold text-slate-400">
                  {getCurrencySymbol(currency)}
                </span>
                <input
                  type="number"
                  value={amount}
                  onChange={(e) => { setAmount(e.target.value); setErrors((p) => ({ ...p, amount: '' })); }}
                  placeholder="0"
                  min="0"
                  step="0.01"
                  className={`w-full pl-12 pr-4 py-3 bg-slate-50 dark:bg-slate-950 border rounded-xl text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 transition-all ${themeClasses[colorTheme].input} ${
                    errors.amount ? 'border-red-300 bg-red-50/50' : 'border-slate-200'
                  }`}
                />
              </div>
              {errors.amount && <p className="text-red-500 text-sm mt-1.5">{errors.amount}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Currency
              </label>
              <select
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
                className={`w-full px-4 py-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 transition-all ${themeClasses[colorTheme].input}`}
              >
                {currencies.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Deadline
              </label>
              <div className="relative">
                <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                <input
                  type="date"
                  value={deadline}
                  onChange={(e) => { setDeadline(e.target.value); setErrors((p) => ({ ...p, deadline: '' })); }}
                  className={`w-full pl-12 pr-4 py-3 bg-slate-50 dark:bg-slate-950 border rounded-xl text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 transition-all ${themeClasses[colorTheme].input} ${
                    errors.deadline ? 'border-red-300 bg-red-50/50' : 'border-slate-200'
                  }`}
                />
              </div>
              {errors.deadline && <p className="text-red-500 text-sm mt-1.5">{errors.deadline}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Tax category
              </label>
              <div className="relative">
                <Repeat className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 pointer-events-none" />
                <select
                  value={paymentType}
                  onChange={(e) => { setPaymentType(e.target.value as PaymentType); setErrors((p) => ({ ...p, paymentType: '' })); }}
                  className={`w-full pl-12 pr-4 py-3 bg-slate-50 dark:bg-slate-950 border rounded-xl text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 transition-all ${themeClasses[colorTheme].input} ${
                    errors.paymentType ? 'border-red-300 bg-red-50/50' : 'border-slate-200'
                  }`}
                >
                  {paymentTypes.map((type) => (
                    <option key={type} value={type}>{type}</option>
                  ))}
                </select>
              </div>
              {errors.paymentType && <p className="text-red-500 text-sm mt-1.5">{errors.paymentType}</p>}
            </div>
          </div>

          {taxBreakdown && (
            <div className="rounded-xl border border-emerald-100 bg-emerald-50/70 p-4">
              <p className="text-sm font-semibold text-emerald-900">Tax preview</p>
              <p className="mt-1 text-xs text-emerald-800">Taxes are applied only when relevant to the selected tax category.</p>
              <div className="mt-2 grid grid-cols-1 gap-2 text-sm text-emerald-800 sm:grid-cols-3">
                <p>VAT ({(taxBreakdown.vatRate * 100).toFixed(0)}%): {currency} {taxBreakdown.vatAmount.toFixed(2)}</p>
                <p>WHT ({(taxBreakdown.whtRate * 100).toFixed(0)}%): {currency} {taxBreakdown.whtAmount.toFixed(2)}</p>
                <p>Total tax: {currency} {taxBreakdown.totalTaxAmount.toFixed(2)}</p>
              </div>
            </div>
          )}
        </div>

        {/* File Upload */}
        <div className="bg-white/95 dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm p-6 space-y-4">
          <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100 uppercase tracking-wider">Attachments</h3>

          <div
            onDragOver={(e) => e.preventDefault()}
            onDrop={handleFileDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`border-2 border-dashed border-slate-200 rounded-xl p-8 text-center cursor-pointer transition-all ${themeClasses[colorTheme].upload}`}
          >
            <Upload className="w-10 h-10 text-slate-300 mx-auto mb-3" />
            <p className="text-sm font-medium text-slate-600">
              Drag and drop your files here
            </p>
            <p className="text-xs text-slate-400 mt-1">
              or click to select
            </p>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              onChange={handleFileSelect}
              className="hidden"
            />
          </div>

          {files.length > 0 && (
            <div className="space-y-2">
              {files.map((file, i) => (
                <div
                  key={i}
                  className="flex items-center gap-3 p-3 bg-slate-50 dark:bg-slate-950 rounded-xl"
                >
                  <FileText className="w-5 h-5 text-emerald-600 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-700 truncate">{file.name}</p>
                    <p className="text-xs text-slate-400">{formatFileSize(file.size)}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => removeFile(i)}
                    className="w-7 h-7 rounded-lg hover:bg-slate-200 flex items-center justify-center text-slate-400 hover:text-red-500 transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-3 justify-end">
          <button
            type="button"
            onClick={onCancel}
            className="px-5 py-2.5 text-slate-600 font-medium rounded-xl hover:bg-slate-100 transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className={`px-6 py-2.5 text-white font-semibold rounded-xl transition-all flex items-center gap-2 shadow-lg ${themeClasses[colorTheme].submit} ${themeClasses[colorTheme].submitShadow}`}
          >
            {isSubmitting ? (
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <>
                <Send className="w-4 h-4" />
                Submit request
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};

export default PaymentRequestForm;
