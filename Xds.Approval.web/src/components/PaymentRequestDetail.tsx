import React, { useState, useEffect } from 'react';
import { api, PaymentRequest, AuditLog, Attachment } from '@/lib/api';
import { formatCurrencyAmount } from '@/lib/currency';
import { useAuth } from '@/contexts/AuthContext';
import { useAppContext } from '@/contexts/AppContext';
import { getPaymentTypeLabel } from '@/lib/payment';
import StatusBadge from './StatusBadge';
import {
  ArrowLeft,
  FileText,
  Download,
  CheckCircle2,
  XCircle,
  Banknote,
  User,
  Calendar,
  Clock,
  MessageSquare,
  Paperclip,
  Shield,
  Upload,
  Eye,
  X,
} from 'lucide-react';
import { format } from 'date-fns';
import { enGB } from 'date-fns/locale';
import { toast } from 'sonner';

interface PaymentRequestDetailProps {
  requestId: string;
  onBack: () => void;
  onRefresh: () => void;
}

const PaymentRequestDetail: React.FC<PaymentRequestDetailProps> = ({ requestId, onBack, onRefresh }) => {
  const { user } = useAuth();
  const { colorTheme } = useAppContext();
  const role = user?.role || 'User';
  const [request, setRequest] = useState<PaymentRequest | null>(null);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [comment, setComment] = useState('');
  const [showApproveModal, setShowApproveModal] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [showFinanceModal, setShowFinanceModal] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [companyName, setCompanyName] = useState('');
  const [recipientName, setRecipientName] = useState('');
  const [recipientAddress, setRecipientAddress] = useState('');
  const [recipientTelephone, setRecipientTelephone] = useState('');
  const [financeFormError, setFinanceFormError] = useState('');
  const [previewAttachment, setPreviewAttachment] = useState<Attachment | null>(null);
  const [previewTitle, setPreviewTitle] = useState('');
  const [previewUrl, setPreviewUrl] = useState('');
  const [isPreviewLoading, setIsPreviewLoading] = useState(false);

  useEffect(() => {
    loadData();
  }, [requestId]);

  useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  useEffect(() => {
    if (!showFinanceModal || !request) {
      return;
    }

    setCompanyName(request.companyName || '');
    setRecipientName(request.recipientName || '');
    setRecipientAddress(request.recipientAddress || '');
    setRecipientTelephone(request.recipientTelephone || '');
    setFinanceFormError('');
  }, [showFinanceModal, request]);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [reqData, logsData] = await Promise.all([
        api.getPaymentRequest(requestId),
        api.getRequestAuditLogs(requestId),
      ]);
      setRequest(reqData);
      setAuditLogs(logsData);
    } catch (err: any) {
      toast.error('Loading error', { description: err.message });
    } finally {
      setIsLoading(false);
    }
  };

  const handleApprove = async () => {
    setIsProcessing(true);
    try {
      await api.approveRequest({
        paymentRequestId: requestId,
        status: 'Approved',
        comment: comment.trim() || undefined,
      });
      toast.success('CEO action saved', {
        description: request?.status === 'Pending'
          ? 'The request has moved to Finance for the next workflow step.'
          : 'The request has moved to the next workflow step.',
      });
      setShowApproveModal(false);
      setComment('');
      loadData();
      onRefresh();
    } catch (err: any) {
      toast.error('Error', { description: err.message });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleReject = async () => {
    if (!comment.trim()) {
      toast.error('Comment required', { description: 'Please provide the reason for rejection.' });
      return;
    }
    setIsProcessing(true);
    try {
      await api.approveRequest({
        paymentRequestId: requestId,
        status: 'Rejected',
        comment: comment.trim(),
      });
      toast.success('Request rejected');
      setShowRejectModal(false);
      setComment('');
      loadData();
      onRefresh();
    } catch (err: any) {
      toast.error('Error', { description: err.message });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleProcess = async () => {
    const isFinancePreparation = role === 'Finance';
    const normalizedPhone = recipientTelephone.replace(/\D/g, '');
    if (isFinancePreparation && normalizedPhone.length !== 10) {
      const message = 'The Ghana phone number must contain exactly 10 digits. Please update it and try again.';
      setFinanceFormError(message);
      toast.error('Invalid phone number', { description: message });
      return;
    }

    setIsProcessing(true);
    try {
      await api.processPayment(requestId, {
        companyName: companyName.trim() || undefined,
        recipientName: recipientName.trim() || undefined,
        recipientAddress: recipientAddress.trim() || undefined,
        recipientTelephone: isFinancePreparation ? normalizedPhone || undefined : undefined,
      });
      toast.success(role === 'HeadOfFinance' ? 'PV authorized' : 'PV prepared', {
        description: role === 'HeadOfFinance'
          ? 'The PV has been sent to the CEO for final signature.'
          : 'The PV has been sent to the Finance Manager for authorization.',
      });
      setShowFinanceModal(false);
      setCompanyName('');
      setRecipientName('');
      setRecipientAddress('');
      setRecipientTelephone('');
      setFinanceFormError('');
      loadData();
      onRefresh();
    } catch (err: any) {
      toast.error('Error', { description: err.message });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDownloadPDF = async () => {
    try {
      const isFinalPackage = request?.status === 'Approved';
      const blob = isFinalPackage
        ? await api.downloadArchive(requestId)
        : await api.downloadDocument(requestId);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `request-${requestId}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.setTimeout(() => {
        URL.revokeObjectURL(url);
        a.remove();
      }, 1000);
    } catch (err: any) {
      toast.error('Download error', { description: err.message });
    }
  };

  const handleUploadAttachment = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files?.length) return;

    const files = Array.from(e.target.files);
    const invalidFiles = files.filter((file) =>
      file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf'));

    if (invalidFiles.length > 0) {
      toast.error('Invalid attachment', {
        description: 'Only PDF files are allowed.',
      });
      e.target.value = '';
      return;
    }

    setIsUploading(true);
    try {
      for (const file of files) {
        await api.uploadAttachment(requestId, file);
      }
      toast.success('File(s) added');
      loadData();
    } catch (err: any) {
      toast.error('Upload error', { description: err.message });
    } finally {
      setIsUploading(false);
      e.target.value = '';
    }
  };

  const canPreviewAttachment = (attachment: Attachment) => {
    const contentType = attachment.contentType?.toLowerCase() || '';
    return contentType === 'application/pdf';
  };

  const closePreview = () => {
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }

    setPreviewAttachment(null);
    setPreviewTitle('');
    setPreviewUrl('');
    setIsPreviewLoading(false);
  };

  const handlePreviewAttachment = async (attachment: Attachment) => {
    if (!attachment.id) {
      toast.error('Preview unavailable');
      return;
    }

    setPreviewAttachment(attachment);
    setIsPreviewLoading(true);

    try {
      const blob = await api.downloadAttachment(requestId, attachment.id);
      const objectUrl = URL.createObjectURL(blob);

      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }

      setPreviewAttachment(attachment);
      setPreviewTitle('');
      setPreviewUrl(objectUrl);
    } catch (err: any) {
      closePreview();
      toast.error('Preview error', {
        description: err.message || 'Unable to load the attachment preview.',
      });
    } finally {
      setIsPreviewLoading(false);
    }
  };

  const handleViewPDF = async () => {
    setIsPreviewLoading(true);
    setPreviewAttachment(null);
    setPreviewTitle('PV preview');

    try {
      const blob = await api.downloadDocument(requestId);
      const objectUrl = URL.createObjectURL(blob);

      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }

      setPreviewUrl(objectUrl);
    } catch (err: any) {
      closePreview();
      toast.error('View error', { description: err.message });
    } finally {
      setIsPreviewLoading(false);
    }
  };

  const handleDownloadAttachment = async (attachment: Attachment) => {
    if (!attachment.id) {
      toast.error('Download unavailable');
      return;
    }

    try {
      const blob = await api.downloadAttachment(requestId, attachment.id);
      const objectUrl = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = objectUrl;
      link.download = attachment.fileName || 'attachment';
      document.body.appendChild(link);
      link.click();
      window.setTimeout(() => {
        URL.revokeObjectURL(objectUrl);
        link.remove();
      }, 1000);
    } catch (err: any) {
      toast.error('Download error', {
        description: err.message || 'Unable to download the attachment.',
      });
    }
  };

  const formatCurrency = (amount: number) => {
    return formatCurrencyAmount(amount, request?.currency);
  };
  const vatAmount = request?.vatAmount ?? 0;
  const whtAmount = request?.whtAmount ?? 0;
  const totalTaxAmount = vatAmount + whtAmount;

  const formatDate = (dateStr: string) => {
    try {
      return format(new Date(dateStr), 'dd MMMM yyyy HH:mm', { locale: enGB });
    } catch {
      return dateStr;
    }
  };

  const formatDateOnly = (dateStr: string) => {
    try {
      return format(new Date(dateStr), 'dd MMMM yyyy', { locale: enGB });
    } catch {
      return dateStr;
    }
  };

  const openFinanceModal = () => {
    setShowFinanceModal(true);
    setFinanceFormError('');
  };

  const actionColors: Record<string, string> = {
    Created: 'bg-slate-600',
    'CEO Approved Request': 'bg-emerald-500',
    'CEO Signed PV': 'bg-emerald-600',
    Approved: 'bg-emerald-500',
    'CEO Rejected': 'bg-red-500',
    Rejected: 'bg-red-500',
    'Finance Prepared PV': 'bg-emerald-500',
    'Finance Updated PV': 'bg-emerald-600',
    'Finance Manager Authorized PV': 'bg-green-500',
    'Upload Attachment': 'bg-emerald-500',
    AttachmentUploaded: 'bg-emerald-500',
  };

  const themeClasses: Record<string, {
    accentText: string;
    back: string;
    softButton: string;
    metricCard: string;
    upload: string;
    download: string;
    approve: string;
    process: string;
    approveModalIcon: string;
    approveModalText: string;
    approveInput: string;
    approveConfirm: string;
  }> = {
    emerald: {
      accentText: 'text-emerald-700',
      back: 'hover:text-emerald-700',
      softButton: 'hover:bg-emerald-50',
      metricCard: 'bg-emerald-50/50',
      upload: 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100',
      download: 'bg-emerald-50 border-emerald-200 text-emerald-700 hover:bg-emerald-100',
      approve: 'bg-emerald-500 hover:bg-emerald-600',
      process: 'bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-300',
      approveModalIcon: 'bg-emerald-100',
      approveModalText: 'text-emerald-600',
      approveInput: 'focus:ring-emerald-500/20 focus:border-emerald-500',
      approveConfirm: 'bg-emerald-500 hover:bg-emerald-600 disabled:bg-emerald-300',
    },
    ocean: {
      accentText: 'text-emerald-700',
      back: 'hover:text-emerald-700',
      softButton: 'hover:bg-emerald-50',
      metricCard: 'bg-emerald-50/50',
      upload: 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100',
      download: 'bg-emerald-50 border-emerald-200 text-emerald-700 hover:bg-emerald-100',
      approve: 'bg-emerald-600 hover:bg-emerald-700',
      process: 'bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-300',
      approveModalIcon: 'bg-emerald-100',
      approveModalText: 'text-emerald-600',
      approveInput: 'focus:ring-emerald-500/20 focus:border-emerald-500',
      approveConfirm: 'bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-300',
    },
    sunset: {
      accentText: 'text-emerald-700',
      back: 'hover:text-emerald-700',
      softButton: 'hover:bg-emerald-50',
      metricCard: 'bg-emerald-50/60',
      upload: 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100',
      download: 'bg-emerald-50 border-emerald-200 text-emerald-700 hover:bg-emerald-100',
      approve: 'bg-emerald-600 hover:bg-emerald-700',
      process: 'bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-300',
      approveModalIcon: 'bg-emerald-100',
      approveModalText: 'text-emerald-600',
      approveInput: 'focus:ring-emerald-500/20 focus:border-emerald-500',
      approveConfirm: 'bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-300',
    },
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="h-6 bg-slate-200 rounded w-24 animate-pulse" />
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 p-6">
          <div className="space-y-4">
            <div className="h-8 bg-slate-200 rounded w-2/3 animate-pulse" />
            <div className="h-4 bg-slate-100 rounded w-1/3 animate-pulse" />
            <div className="h-20 bg-slate-100 rounded animate-pulse" />
          </div>
        </div>
      </div>
    );
  }

  if (!request) {
    return (
      <div className="text-center py-12">
        <FileText className="w-12 h-12 text-slate-300 mx-auto mb-3" />
        <p className="text-slate-500 dark:text-slate-400">Request not found</p>
        <button onClick={onBack} className={`mt-4 font-medium text-sm ${themeClasses[colorTheme].accentText}`}>
          Back
        </button>
      </div>
    );
  }

  const canDownloadGeneratedPv = ['FinancePrepared', 'FinanceAuthorized', 'Approved'].includes(request.status);
  const shouldShowViewPv = role === 'HeadOfFinance' && request.status === 'FinancePrepared';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
        <div>
          <button
            onClick={onBack}
            className={`flex items-center gap-2 text-slate-500 text-sm font-medium mb-3 transition-colors ${themeClasses[colorTheme].back}`}
          >
            <ArrowLeft className="w-4 h-4" />
            Back
          </button>
          <h1 className={`text-2xl font-bold ${themeClasses[colorTheme].accentText}`}>{request.title}</h1>
          <div className="flex items-center gap-3 mt-2 flex-wrap">
            <StatusBadge status={request.status} />
            <span className="text-sm text-slate-400">
              Created on {formatDate(request.createdAt)}
            </span>
          </div>
        </div>

        {/* Document Actions */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full lg:w-auto">
          <button
            onClick={shouldShowViewPv ? handleViewPDF : handleDownloadPDF}
            disabled={!canDownloadGeneratedPv}
            className="w-full lg:w-auto px-4 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors flex items-center justify-center gap-2 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {shouldShowViewPv ? <Eye className="w-4 h-4" /> : <FileText className="w-4 h-4" />}
            {shouldShowViewPv ? 'View' : request.status === 'Approved' ? 'Download Full PV' : 'Download PV'}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Details Card */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm p-6 space-y-5">
            <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100 uppercase tracking-wider">Details</h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className={`${themeClasses[colorTheme].metricCard} rounded-xl border border-slate-200 p-4`}>
                <p className="text-xs text-slate-500 font-medium uppercase tracking-wider">Amount</p>
                <p className="text-xl font-bold text-slate-900 dark:text-slate-100 mt-1">{formatCurrency(request.amount)}</p>
              </div>
              <div className={`${themeClasses[colorTheme].metricCard} rounded-xl border border-slate-200 p-4`}>
                <p className="text-xs text-slate-500 font-medium uppercase tracking-wider">Currency</p>
                <p className="text-xl font-bold text-slate-900 dark:text-slate-100 mt-1">{request.currency}</p>
              </div>
              <div className={`${themeClasses[colorTheme].metricCard} rounded-xl border border-slate-200 p-4`}>
                <p className="text-xs text-slate-500 font-medium uppercase tracking-wider">Deadline</p>
                <p className="text-xl font-bold text-slate-900 dark:text-slate-100 mt-1">{request.deadline ? formatDateOnly(request.deadline) : 'N/A'}</p>
              </div>
              <div className={`${themeClasses[colorTheme].metricCard} rounded-xl border border-slate-200 p-4`}>
                <p className="text-xs text-slate-500 font-medium uppercase tracking-wider">Tax category</p>
                <p className="text-xl font-bold text-slate-900 dark:text-slate-100 mt-1">{getPaymentTypeLabel(request.paymentType)}</p>
              </div>
            </div>

            {(vatAmount > 0 || whtAmount > 0) && (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <div className={`${themeClasses[colorTheme].metricCard} rounded-xl border border-slate-200 p-4`}>
                  <p className="text-xs text-slate-500 font-medium uppercase tracking-wider">VAT</p>
                  <p className="text-lg font-bold text-slate-900 dark:text-slate-100 mt-1">
                    {formatCurrency(vatAmount)}
                  </p>
                </div>
                <div className={`${themeClasses[colorTheme].metricCard} rounded-xl border border-slate-200 p-4`}>
                  <p className="text-xs text-slate-500 font-medium uppercase tracking-wider">WHT</p>
                  <p className="text-lg font-bold text-slate-900 dark:text-slate-100 mt-1">
                    {formatCurrency(whtAmount)}
                  </p>
                </div>
                <div className={`${themeClasses[colorTheme].metricCard} rounded-xl border border-slate-200 p-4`}>
                  <p className="text-xs text-slate-500 font-medium uppercase tracking-wider">Total tax</p>
                  <p className="text-lg font-bold text-slate-900 dark:text-slate-100 mt-1">
                    {formatCurrency(totalTaxAmount)}
                  </p>
                </div>
              </div>
            )}
            {(vatAmount > 0 || whtAmount > 0) && (
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Tax amounts were entered manually when this request was created.
              </p>
            )}

            <div>
              <p className="text-xs text-slate-500 font-medium uppercase tracking-wider mb-2">Description</p>
              <p className="text-base text-slate-700 dark:text-slate-300 leading-relaxed bg-slate-50 dark:bg-slate-950 rounded-xl p-5">
                {request.description}
              </p>
            </div>

            {request.ceoComment && role === 'User' && request.status === 'Rejected' && (
              <div>
                <p className="text-xs text-slate-500 font-medium uppercase tracking-wider mb-2">CEO comment</p>
                <div className="bg-amber-50 border border-amber-100 rounded-xl p-4 flex items-start gap-3">
                  <MessageSquare className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-amber-800">{request.ceoComment}</p>
                </div>
              </div>
            )}

            {request.documentNumber && (
              <div className="bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-100 dark:border-emerald-500/20 rounded-xl p-4">
                <p className="text-xs text-emerald-700 dark:text-emerald-300 font-medium uppercase tracking-wider mb-1">Reference</p>
                <p className="text-sm font-mono font-semibold text-emerald-950 dark:text-emerald-100">{request.documentNumber}</p>
                {request.verificationCode && (
                  <>
                    <p className="text-xs text-emerald-700 dark:text-emerald-300 font-medium uppercase tracking-wider mt-3 mb-1">Verification code</p>
                    <p className="text-sm font-mono font-semibold text-emerald-950 dark:text-emerald-100">{request.verificationCode}</p>
                  </>
                )}
              </div>
            )}
          </div>

          {/* Attachments */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm p-6 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <h3 className="text-sm font-semibold text-slate-900 uppercase tracking-wider">
                Attachments ({request.attachments?.length || 0})
              </h3>
              {(role === 'User' || role === 'Finance') && ['Pending', 'CEOApproved', 'FinancePrepared'].includes(request.status) && (
                <label className={`px-3 py-1.5 rounded-lg text-sm font-medium cursor-pointer transition-colors flex items-center gap-1.5 ${themeClasses[colorTheme].upload}`}>
                  <Upload className="w-4 h-4" />
                  {isUploading ? 'Uploading...' : role === 'Finance' ? 'Attach document' : 'Add'}
                  <input type="file" accept=".pdf,application/pdf" multiple onChange={handleUploadAttachment} className="hidden" />
                </label>
              )}
            </div>

            {(!request.attachments || request.attachments.length === 0) ? (
              <div className="text-center py-6">
                <Paperclip className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                <p className="text-sm text-slate-400">No attachments</p>
              </div>
            ) : (
              <div className="space-y-2">
                {request.attachments.map((att) => (
                  <div key={att.id} className="flex items-center gap-3 p-3 bg-slate-50 dark:bg-slate-950 rounded-xl">
                    <FileText className="w-5 h-5 text-emerald-600 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-700 truncate">{att.fileName}</p>
                      <p className="text-xs text-slate-400">
                        {(att.fileSize / 1024).toFixed(1)} KB
                        {att.uploadedAt ? ` · ${formatDate(att.uploadedAt)}` : ''}
                      </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2 flex-shrink-0">
                      {canPreviewAttachment(att) && (
                        <button
                          type="button"
                          onClick={() => handlePreviewAttachment(att)}
                          className="px-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors inline-flex items-center gap-1.5"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          View
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => handleDownloadAttachment(att)}
                        className={`px-3 py-1.5 border rounded-lg text-xs font-medium transition-colors inline-flex items-center gap-1.5 ${themeClasses[colorTheme].download}`}
                      >
                        <Download className="w-3.5 h-3.5" />
                        Download
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Audit Timeline */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm p-6 space-y-4">
            <h3 className="text-sm font-semibold text-slate-900 uppercase tracking-wider">
              History
            </h3>

            {auditLogs.length === 0 ? (
              <p className="text-sm text-slate-400 text-center py-4">No history available</p>
            ) : (
              <div className="relative">
                <div className="absolute left-[17px] top-2 bottom-2 w-0.5 bg-slate-100" />
                <div className="space-y-4">
                  {auditLogs.map((log) => (
                    <div key={log.id} className="flex gap-4 relative">
                      <div className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 z-10 ${actionColors[log.action] || 'bg-slate-400'}`}>
                        <Clock className="w-4 h-4 text-white" />
                      </div>
                      <div className="flex-1 pb-2">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <p className="text-sm font-medium text-slate-900 dark:text-slate-100">{log.action}</p>
                            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{log.userName}</p>
                          </div>
                          <span className="text-xs text-slate-400 whitespace-nowrap">
                            {formatDate(log.createdAt)}
                          </span>
                        </div>
                        {log.details && (
                          <p className="text-sm text-slate-600 dark:text-slate-300 mt-1 bg-slate-50 dark:bg-slate-950 rounded-lg p-2.5">
                            {log.details}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Info Card */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm p-5 space-y-4">
            <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100 uppercase tracking-wider">Information</h3>

            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <User className="w-4 h-4 text-slate-400" />
                <div>
                  <p className="text-xs text-slate-400">Requester</p>
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-sm font-medium text-slate-700 dark:text-slate-200">{request.requesterName}</p>
                    {request.requesterDepartment && (
                      <>
                        <span className="text-slate-300">·</span>
                        <p className="text-xs text-slate-400">{request.requesterDepartment}</p>
                      </>
                    )}
                  </div>
                </div>
              </div>
              {request.companyName && (
                <div className="flex items-center gap-3">
                  <FileText className="w-4 h-4 text-slate-400" />
                  <div>
                    <p className="text-xs text-slate-400">PV company name</p>
                    <p className="text-sm font-medium text-slate-700 dark:text-slate-200">{request.companyName}</p>
                  </div>
                </div>
              )}
              {request.recipientName && (
                <div className="flex items-center gap-3">
                  <FileText className="w-4 h-4 text-slate-400" />
                  <div>
                    <p className="text-xs text-slate-400">Recipient name</p>
                    <p className="text-sm font-medium text-slate-700 dark:text-slate-200">{request.recipientName}</p>
                  </div>
                </div>
              )}
              {request.recipientAddress && (
                <div className="flex items-center gap-3">
                  <FileText className="w-4 h-4 text-slate-400" />
                  <div>
                    <p className="text-xs text-slate-400">Recipient address</p>
                    <p className="text-sm font-medium text-slate-700 dark:text-slate-200">{request.recipientAddress}</p>
                  </div>
                </div>
              )}
              {request.recipientTelephone && (
                <div className="flex items-center gap-3">
                  <FileText className="w-4 h-4 text-slate-400" />
                  <div>
                    <p className="text-xs text-slate-400">Recipient telephone</p>
                    <p className="text-sm font-medium text-slate-700 dark:text-slate-200">{request.recipientTelephone}</p>
                  </div>
                </div>
              )}
              <div className="flex items-center gap-3">
                <Calendar className="w-4 h-4 text-slate-400" />
                <div>
                  <p className="text-xs text-slate-400">Created date</p>
                  <p className="text-sm font-medium text-slate-700 dark:text-slate-200">{formatDate(request.createdAt)}</p>
                </div>
              </div>
              {request.updatedAt && request.updatedAt !== request.createdAt && (
                <div className="flex items-center gap-3">
                  <Clock className="w-4 h-4 text-slate-400" />
                  <div>
                    <p className="text-xs text-slate-400">Last updated</p>
                    <p className="text-sm font-medium text-slate-700 dark:text-slate-200">{formatDate(request.updatedAt)}</p>
                  </div>
                </div>
              )}
              {request.preparedByUserName && (
                <div className="flex items-center gap-3">
                  <Banknote className="w-4 h-4 text-slate-400" />
                  <div>
                    <p className="text-xs text-slate-400">Prepared by Finance manager</p>
                    <p className="text-sm font-medium text-slate-700 dark:text-slate-200">
                      {request.preparedByUserName}
                      {request.preparedAt ? ` on ${formatDate(request.preparedAt)}` : ''}
                    </p>
                  </div>
                </div>
              )}
              {request.authorizedByUserName && (
                <div className="flex items-center gap-3">
                  <CheckCircle2 className="w-4 h-4 text-slate-400" />
                  <div>
                    <p className="text-xs text-slate-400">Finance Manager authorized by</p>
                    <p className="text-sm font-medium text-slate-700 dark:text-slate-200">
                      {request.authorizedByUserName}
                      {request.authorizedAt ? ` on ${formatDate(request.authorizedAt)}` : ''}
                    </p>
                  </div>
                </div>
              )}
              {request.approvedByUserName && (
                <div className="flex items-center gap-3">
                  <CheckCircle2 className="w-4 h-4 text-slate-400" />
                  <div>
                    <p className="text-xs text-slate-400">CEO final signed by</p>
                    <p className="text-sm font-medium text-slate-700 dark:text-slate-200">
                      {request.approvedByUserName}
                      {request.approvedAt ? ` on ${formatDate(request.approvedAt)}` : ''}
                    </p>
                  </div>
                </div>
              )}
              <div className="flex items-center gap-3">
                <Shield className="w-4 h-4 text-slate-400" />
                <div>
                  <p className="text-xs text-slate-400">Status</p>
                  <StatusBadge status={request.status} size="sm" />
                </div>
              </div>
            </div>
          </div>

          {/* CEO Actions */}
          {role === 'CEO' && (request.status === 'Pending' || request.status === 'FinanceAuthorized') && (
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 p-5 space-y-3">
              <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100 uppercase tracking-wider">CEO actions</h3>
              <button
                onClick={() => setShowApproveModal(true)}
                className={`w-full py-2.5 text-white font-semibold rounded-xl transition-colors flex items-center justify-center gap-2 ${themeClasses[colorTheme].approve}`}
              >
                <CheckCircle2 className="w-4 h-4" />
                {request.status === 'Pending' ? 'Approve' : 'Final sign PV'}
              </button>
              <button
                onClick={() => setShowRejectModal(true)}
                className="w-full py-2.5 bg-red-500 hover:bg-red-600 text-white font-semibold rounded-xl transition-colors flex items-center justify-center gap-2"
              >
                <XCircle className="w-4 h-4" />
                Reject
              </button>
            </div>
          )}

          {/* Finance Actions */}
          {role === 'Finance' && ['CEOApproved', 'FinancePrepared', 'FinanceAuthorized'].includes(request.status) && (
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 p-5 space-y-3">
              <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100 uppercase tracking-wider">Finance actions</h3>
              <button
                onClick={openFinanceModal}
                disabled={isProcessing}
                className={`w-full py-2.5 text-white font-semibold rounded-xl transition-colors flex items-center justify-center gap-2 ${themeClasses[colorTheme].process}`}
              >
                {isProcessing ? (
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    <Banknote className="w-4 h-4" />
                    {request.status === 'CEOApproved' ? 'Prepare PV' : 'Modify PV'}
                  </>
                )}
              </button>
            </div>
          )}
          {role === 'HeadOfFinance' && request.status === 'FinancePrepared' && (
            <div className="bg-white rounded-2xl border border-slate-100 p-5 space-y-3">
              <h3 className="text-sm font-semibold text-slate-900 uppercase tracking-wider">Finance Manager actions</h3>
              <button
                onClick={handleProcess}
                disabled={isProcessing}
                className={`w-full py-2.5 text-white font-semibold rounded-xl transition-colors flex items-center justify-center gap-2 ${themeClasses[colorTheme].process}`}
              >
                {isProcessing ? (
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    <Banknote className="w-4 h-4" />
                    Authorize PV
                  </>
                )}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Approve Modal */}
      {showApproveModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full max-h-[90vh] overflow-y-auto p-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${themeClasses[colorTheme].approveModalIcon}`}>
                <CheckCircle2 className={`w-5 h-5 ${themeClasses[colorTheme].approveModalText}`} />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-slate-900">Approve request</h3>
                <p className="text-sm text-slate-500">
                  {request.status === 'Pending'
                    ? 'This action sends the approved request to Finance.'
                    : 'This action adds the CEO final signature and returns the voucher to Finance for payment.'}
                </p>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Comment
              </label>
              <textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="Add a comment..."
                rows={3}
                className={`w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 resize-none ${themeClasses[colorTheme].approveInput}`}
              />
            </div>

            <div className="flex gap-3 justify-end">
              <button
                onClick={() => { setShowApproveModal(false); setComment(''); }}
                className="px-4 py-2 text-slate-600 font-medium rounded-xl hover:bg-slate-100 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleApprove}
                disabled={isProcessing}
                className={`px-5 py-2 text-white font-semibold rounded-xl transition-colors flex items-center gap-2 ${themeClasses[colorTheme].approveConfirm}`}
              >
                {isProcessing ? (
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  'Confirm'
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reject Modal */}
      {showRejectModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full max-h-[90vh] overflow-y-auto p-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-red-100 rounded-xl flex items-center justify-center">
                <XCircle className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-slate-900">Reject request</h3>
                <p className="text-sm text-slate-500">Please provide the reason for rejection</p>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Rejection reason <span className="text-red-500">*</span>
              </label>
              <textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="Enter the reason for rejection..."
                rows={3}
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 resize-none"
              />
            </div>

            <div className="flex gap-3 justify-end">
              <button
                onClick={() => { setShowRejectModal(false); setComment(''); }}
                className="px-4 py-2 text-slate-600 font-medium rounded-xl hover:bg-slate-100 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleReject}
                disabled={isProcessing}
                className="px-5 py-2 bg-red-500 hover:bg-red-600 disabled:bg-red-300 text-white font-semibold rounded-xl transition-colors flex items-center gap-2"
              >
                {isProcessing ? (
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  'Confirm rejection'
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {showFinanceModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4">
            <div>
              <h3 className="text-lg font-semibold text-slate-900">{request?.status === 'CEOApproved' ? 'Prepare PV' : 'Modify PV'}</h3>
              <p className="text-sm text-slate-500">Enter the recipient details that will appear on the PV.</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Company name</label>
              <input
                type="text"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                placeholder="Enter company name"
                className={`w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 ${themeClasses[colorTheme].approveInput}`}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Recipient name</label>
              <input
                type="text"
                value={recipientName}
                onChange={(e) => setRecipientName(e.target.value)}
                placeholder="Enter recipient name"
                className={`w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 ${themeClasses[colorTheme].approveInput}`}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Recipient address</label>
              <textarea
                value={recipientAddress}
                onChange={(e) => setRecipientAddress(e.target.value)}
                placeholder="Enter recipient address"
                rows={3}
                className={`w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 resize-none ${themeClasses[colorTheme].approveInput}`}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Recipient telephone</label>
              <input
                type="text"
                value={recipientTelephone}
                onChange={(e) => {
                  setRecipientTelephone(e.target.value.replace(/\D/g, '').slice(0, 10));
                  if (financeFormError) {
                    setFinanceFormError('');
                  }
                }}
                placeholder="Enter 10-digit Ghana telephone"
                maxLength={10}
                className={`w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 ${themeClasses[colorTheme].approveInput}`}
              />
            </div>
            {financeFormError && (
              <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                {financeFormError}
              </div>
            )}
            <div className="flex justify-end gap-3">
              <button
                onClick={() => { setShowFinanceModal(false); setCompanyName(''); setRecipientName(''); setRecipientAddress(''); setRecipientTelephone(''); setFinanceFormError(''); }}
                className="px-4 py-2 text-slate-600 font-medium rounded-xl hover:bg-slate-100 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleProcess}
                disabled={isProcessing || !companyName.trim() || !recipientName.trim() || !recipientAddress.trim() || !recipientTelephone.trim()}
                className={`px-5 py-2 text-white font-semibold rounded-xl transition-colors ${themeClasses[colorTheme].approveConfirm}`}
              >
                Continue
              </button>
            </div>
          </div>
        </div>
      )}

      {(previewAttachment || previewTitle) && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-[95vw] h-[92vh] overflow-hidden shadow-2xl">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200">
              <div>
                <h3 className="text-base font-semibold text-slate-900">{previewAttachment?.fileName || previewTitle}</h3>
                <p className="text-xs text-slate-400">{previewAttachment ? 'Attachment preview' : 'PV preview'}</p>
              </div>
              <button
                type="button"
                onClick={closePreview}
                className="w-10 h-10 rounded-xl text-slate-500 hover:bg-slate-100 hover:text-slate-700 transition-colors flex items-center justify-center"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="h-[calc(92vh-73px)] bg-slate-100">
              {isPreviewLoading ? (
                <div className="h-full w-full flex items-center justify-center">
                  <div className="w-8 h-8 border-2 border-slate-300 border-t-slate-700 rounded-full animate-spin" />
                </div>
              ) : previewUrl && previewAttachment?.contentType?.startsWith('image/') ? (
                <img
                  src={previewUrl}
                  alt={previewAttachment.fileName}
                  className="h-full w-full object-contain"
                />
              ) : previewUrl ? (
                <iframe
                  title={previewAttachment?.fileName || previewTitle}
                  src={previewUrl}
                  className="h-full w-full"
                />
              ) : (
                <div className="h-full w-full flex items-center justify-center text-sm text-slate-500">
                  Preview unavailable
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PaymentRequestDetail;
