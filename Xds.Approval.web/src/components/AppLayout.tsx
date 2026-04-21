import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useAppContext } from '@/contexts/AppContext';
import { api, PaymentRequest } from '@/lib/api';
import LoginPage from './LoginPage';
import Sidebar, { ViewType } from './Sidebar';
import TopBar from './TopBar';
import Dashboard from './Dashboard';
import PaymentRequestList from './PaymentRequestList';
import PaymentRequestForm from './PaymentRequestForm';
import PaymentRequestDetail from './PaymentRequestDetail';
import AuditLogView from './AuditLogView';
import DocumentVerify from './DocumentVerify';
import ReportsPage from './ReportsPage';
import { toast } from 'sonner';


const AppLayout: React.FC = () => {
  const { isAuthenticated, isLoading: authLoading, user } = useAuth();
  const { colorTheme } = useAppContext();
  const [currentView, setCurrentView] = useState<ViewType>('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(() => {
    if (typeof window === 'undefined') {
      return true;
    }

    return window.innerWidth >= 1024;
  });
  const [requests, setRequests] = useState<PaymentRequest[]>([]);
  const [isLoadingRequests, setIsLoadingRequests] = useState(false);
  const [selectedRequestId, setSelectedRequestId] = useState<string | null>(null);

  const loadRequests = useCallback(async () => {
    if (!isAuthenticated) return;
    setIsLoadingRequests(true);
    try {
      const data = await api.getPaymentRequests();
      setRequests(data);
    } catch (err: any) {
      toast.error('Loading error', { description: err.message });
    } finally {
      setIsLoadingRequests(false);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    if (isAuthenticated) {
      loadRequests();
    }
  }, [isAuthenticated, loadRequests]);

  useEffect(() => {
    if (!isAuthenticated || !user) return;

    const landingViewByRole: Record<string, ViewType> = {
      User: 'dashboard',
      CEO: 'dashboard',
      Finance: 'dashboard',
      HeadOfFinance: 'dashboard',
    };

    setCurrentView(landingViewByRole[user.role] ?? 'dashboard');
    setSelectedRequestId(null);
  }, [isAuthenticated, user]);

  const handleNavigate = (view: ViewType | string) => {
    setCurrentView(view as ViewType);
    setSelectedRequestId(null);
  };

  const handleViewRequest = (id: string) => {
    setSelectedRequestId(id);
    setCurrentView('request-detail');
  };

  const handleFormSuccess = () => {
    loadRequests();
    setCurrentView('requests');
  };

  const shellClasses: Record<string, { page: string; spinner: string }> = {
    emerald: {
      page: 'bg-[radial-gradient(circle_at_top_left,_rgba(22,163,74,0.10),_transparent_28%),linear-gradient(180deg,_#ffffff_0%,_#f3fbf5_100%)]',
      spinner: 'border-emerald-200 border-t-emerald-700',
    },
    ocean: {
      page: 'bg-[radial-gradient(circle_at_top_left,_rgba(22,163,74,0.10),_transparent_28%),linear-gradient(180deg,_#ffffff_0%,_#f3fbf5_100%)]',
      spinner: 'border-emerald-200 border-t-emerald-700',
    },
    sunset: {
      page: 'bg-[radial-gradient(circle_at_top_left,_rgba(22,163,74,0.10),_transparent_28%),linear-gradient(180deg,_#ffffff_0%,_#f3fbf5_100%)]',
      spinner: 'border-emerald-200 border-t-emerald-700',
    },
  };

  const shellTheme = shellClasses[colorTheme];

  // Auth loading state
  if (authLoading) {
    return (
      <div className={`min-h-screen ${shellTheme.page} flex items-center justify-center`}>
        <div className="text-center">
          <div className={`w-12 h-12 border-4 ${shellTheme.spinner} rounded-full animate-spin mx-auto`} />
          <p className="text-slate-500 dark:text-slate-400 mt-4 text-sm font-medium">Loading...</p>
        </div>
      </div>
    );
  }

  // Not authenticated
  if (!isAuthenticated) {
    return <LoginPage />;
  }

  const role = user?.role || 'User';

  // Filter requests based on role-specific views
  const pendingRequests = requests.filter((r) => r.status === 'Pending' || r.status === 'FinanceAuthorized');
  const financeRequests = role === 'HeadOfFinance'
    ? requests.filter((r) => r.status === 'FinancePrepared')
    : requests.filter((r) => r.status === 'CEOApproved' || r.status === 'Approved');

  const renderContent = () => {
    switch (currentView) {
      case 'dashboard':
        return (
          <Dashboard
            requests={requests}
            isLoading={isLoadingRequests}
            onViewRequest={handleViewRequest}
            onNavigate={handleNavigate}
          />
        );

      case 'requests':
        return (
          <PaymentRequestList
            requests={requests}
            isLoading={isLoadingRequests}
            onViewRequest={handleViewRequest}
          />
        );

      case 'new-request':
        return (
          <PaymentRequestForm
            onSuccess={handleFormSuccess}
            onCancel={() => setCurrentView('dashboard')}
          />
        );

      case 'approvals':
        return (
          <PaymentRequestList
            requests={pendingRequests}
            isLoading={isLoadingRequests}
            onViewRequest={handleViewRequest}
            title="Requests awaiting approval"
          />
        );

      case 'finance':
        return (
          <PaymentRequestList
            requests={financeRequests}
            isLoading={isLoadingRequests}
            onViewRequest={handleViewRequest}
            title={role === 'HeadOfFinance' ? 'PVs awaiting authorization' : 'Requests for Finance'}
            filterStatus={role === 'HeadOfFinance' ? 'FinancePrepared' : 'CEOApproved'}
          />
        );

      case 'audit-logs':
        return <AuditLogView onViewRequest={handleViewRequest} />;

      case 'verify-document':
        return <DocumentVerify />;

      case 'reports':
        return (
          <ReportsPage
            requests={requests}
            isLoading={isLoadingRequests}
            onRefresh={loadRequests}
          />
        );


      case 'request-detail':
        if (selectedRequestId) {
          return (
            <PaymentRequestDetail
              requestId={selectedRequestId}
              onBack={() => setCurrentView('requests')}
              onRefresh={loadRequests}
            />
          );
        }
        return null;

      default:
        return null;
    }
  };

  return (
    <div className={`min-h-screen ${shellTheme.page} dark:bg-[radial-gradient(circle_at_top_left,_rgba(52,211,153,0.10),_transparent_32%),linear-gradient(180deg,_#282A2D_0%,_#2d3033_55%,_#31353a_100%)]`}>
      <Sidebar
        currentView={currentView}
        onNavigate={handleNavigate}
        isOpen={sidebarOpen}
        onToggle={() => setSidebarOpen(!sidebarOpen)}
      />

      <div
        className={`transition-all duration-300 ${
          sidebarOpen ? 'lg:ml-64' : 'lg:ml-20'
        }`}
      >
        <TopBar currentView={currentView} sidebarOpen={sidebarOpen} />

        <main className="p-3 sm:p-5 lg:p-8">
          {renderContent()}
        </main>
      </div>
    </div>
  );
};

export default AppLayout;
