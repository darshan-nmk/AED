import { useEffect } from 'react';
import { CheckCircle, XCircle, AlertCircle, Info, X } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

interface ToastProps {
  message: string;
  type: ToastType;
  onClose: () => void;
  duration?: number;
}

export function Toast({ message, type, onClose, duration = 4000 }: ToastProps) {
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose();
    }, duration);

    return () => clearTimeout(timer);
  }, [duration, onClose]);

  const styles = {
    success: 'bg-green-600 border-green-500 text-white shadow-xl',
    error: 'bg-red-600 border-red-500 text-white shadow-xl',
    warning: 'bg-yellow-600 border-yellow-500 text-white shadow-xl',
    info: 'bg-blue-600 border-blue-500 text-white shadow-xl',
  };

  const iconStyles = {
    success: <CheckCircle className="w-5 h-5 text-white" />,
    error: <XCircle className="w-5 h-5 text-white" />,
    warning: <AlertCircle className="w-5 h-5 text-white" />,
    info: <Info className="w-5 h-5 text-white" />,
  };

  return (
    <div className={`flex items-center gap-3 px-4 py-3 rounded-lg border-2 ${styles[type]} animate-slide-in-right max-w-md min-w-[300px]`}>
      {iconStyles[type]}
      <p className="flex-1 text-sm font-semibold text-white">{message}</p>
      <button
        onClick={onClose}
        className="text-white/80 hover:text-white transition-colors"
        aria-label="Close notification"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}
