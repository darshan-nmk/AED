import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { runAPI, Run } from '@/services/api';
import { formatDistanceToNow } from 'date-fns';

export default function AllRunsPage() {
  const [runs, setRuns] = useState<Run[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    loadAllRuns();
  }, []);

  const loadAllRuns = async () => {
    try {
      const data = await runAPI.listAll();
      setRuns(data);
    } catch (err) {
      console.error('Failed to load runs', err);
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

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-50">All Runs</h1>
        <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">View run history across all pipelines</p>
      </div>

      {loading ? (
        <div className="text-center py-12 text-slate-600 dark:text-slate-400">Loading runs...</div>
      ) : runs.length === 0 ? (
        <Card className="text-center py-12">
          <p className="text-slate-600 dark:text-slate-400">No runs found</p>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-2">
            Run a pipeline from the Pipelines page to see results here
          </p>
        </Card>
      ) : (
        <div className="space-y-3">
          {runs.map((run) => (
            <div
              key={run.id}
              className="cursor-pointer"
              onClick={() => navigate(`/runs/${run.id}`)}
            >
              <Card className="hover:border-brand-500/30 transition-colors">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <Badge variant={getStatusVariant(run.status)}>
                    {run.status}
                  </Badge>
                  <div>
                    <div className="font-medium text-slate-900 dark:text-slate-50">Run #{run.id}</div>
                    <div className="text-sm text-slate-600 dark:text-slate-400">
                      Started {formatDistanceToNow(new Date(run.created_at), { addSuffix: true })}
                    </div>
                  </div>
                </div>
              </div>
            </Card>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
