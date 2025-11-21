import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Download } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { runAPI, RunDetail } from '@/services/api';
import { format } from 'date-fns';
import { useToast } from '@/contexts/ToastContext';

export default function RunDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const [run, setRun] = useState<RunDetail | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadRunDetail();
  }, [id]);

  const loadRunDetail = async () => {
    if (!id) return;
    
    try {
      const data = await runAPI.get(parseInt(id));
      setRun(data);
    } catch (err) {
      console.error('Failed to load run details', err);
    } finally {
      setLoading(false);
    }
  };

  const getStatusVariant = (status: string) => {
    switch (status) {
      case 'SUCCESS':
        return 'success';
      case 'FAILED':
        return 'error';
      case 'RUNNING':
        return 'info';
      case 'PENDING':
        return 'warning';
      default:
        return 'default';
    }
  };

  const handleDownload = async () => {
    if (!run?.result_location) return;
    
    try {
      // Extract filename from path (e.g., "outputs/123/test.csv" -> "test.csv")
      const filename = run.result_location.split('/').pop() || 'output.csv';
      
      // Get auth token
      const token = localStorage.getItem('access_token');
      
      // Download the file from backend with auth header
      const response = await fetch(
        `http://localhost:8000/api/v1/files/download/${encodeURIComponent(run.result_location)}`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        }
      );
      
      if (!response.ok) {
        throw new Error('Download failed');
      }
      
      // Get the blob from response
      const blob = await response.blob();
      
      // Create download link
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      // Clean up the URL object
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Download failed:', err);
      toast.error('Failed to download file');
    }
  };

  if (loading) {
    return <div className="text-center py-12 text-slate-600 dark:text-slate-400">Loading run details...</div>;
  }

  if (!run) {
    return (
      <Card className="text-center py-12">
        <p className="text-slate-600 dark:text-slate-400">Run not found</p>
        <Button className="mt-4" onClick={() => navigate('/pipelines')}>
          Back to Pipelines
        </Button>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate(-1)}
          >
            <ArrowLeft size={16} className="mr-2" />
            Back
          </Button>
          <div>
            <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-50">Run #{run.id}</h1>
            <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">{run.pipeline_name || 'Pipeline'}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {run.status === 'SUCCESS' && run.result_location && (
            <Button onClick={handleDownload} variant="secondary">
              <Download size={16} className="mr-2" />
              Download Output
            </Button>
          )}
          <Badge variant={getStatusVariant(run.status)}>
            {run.status}
          </Badge>
        </div>
      </div>

      <Card className="p-6">
        <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-50 mb-4">Run Information</h2>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-slate-600 dark:text-slate-400">Status:</span>
            <span className="text-slate-900 dark:text-slate-200">{run.status}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-600 dark:text-slate-400">Started:</span>
            <span className="text-slate-900 dark:text-slate-200">
              {run.started_at ? format(new Date(run.started_at), 'PPp') : 'Not started'}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-600 dark:text-slate-400">Finished:</span>
            <span className="text-slate-900 dark:text-slate-200">
              {run.finished_at ? format(new Date(run.finished_at), 'PPp') : 'In progress'}
            </span>
          </div>
        </div>
      </Card>

      {run.error_message && (
        <Card className="p-4 border-red-500/20 bg-red-500/5">
          <div className="text-sm font-medium text-red-400 mb-2">Error</div>
          <pre className="text-sm text-red-300 whitespace-pre-wrap font-mono">
            {run.error_message}
          </pre>
        </Card>
      )}

      <Card className="p-6">
        <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-50 mb-4">Execution Logs</h2>
        {run.logs && run.logs.length > 0 ? (
          <div className="space-y-1 max-h-96 overflow-y-auto font-mono text-sm">
            {run.logs.map((log) => (
              <div key={log.id} className="text-slate-700 dark:text-slate-300">
                <span className="text-slate-500 dark:text-slate-500">
                  {format(new Date(log.created_at), 'HH:mm:ss')}
                </span>
                <span className="ml-2">[{log.level}]</span>
                <span className="ml-2">{log.message}</span>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-slate-600 dark:text-slate-400 text-center py-8">No logs available</p>
        )}
      </Card>
    </div>
  );
}
