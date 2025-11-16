import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Play, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { pipelineAPI, runAPI, Run } from '@/services/api';
import { formatDistanceToNow } from 'date-fns';

export default function RunsPage() {
  const { id } = useParams(); // pipeline id
  const navigate = useNavigate();
  const [runs, setRuns] = useState<Run[]>([]);
  const [loading, setLoading] = useState(true);
  const [pipelineName, setPipelineName] = useState('');

  useEffect(() => {
    loadData();
  }, [id]);

  const loadData = async () => {
    try {
      setLoading(true);
      
      // Load pipeline details
      if (id) {
        const pipeline = await pipelineAPI.get(parseInt(id));
        setPipelineName(pipeline.name);
        
        // Load runs
        const runsData = await runAPI.list(parseInt(id));
        setRuns(runsData);
      }
    } catch (err) {
      console.error('Failed to load runs', err);
    } finally {
      setLoading(false);
    }
  };

  const handleTriggerRun = async () => {
    if (!id) return;
    
    try {
      const newRun = await runAPI.trigger(parseInt(id));
      alert('Pipeline run triggered successfully!');
      setRuns([newRun, ...runs]);
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Failed to trigger run');
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

  // Removed unused getStatusColor function

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => navigate(`/pipelines/${id}/editor`)}
          >
            <ArrowLeft size={16} className="mr-2" />
            Back to Editor
          </Button>
          <div>
            <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-50">Run History</h1>
            <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">{pipelineName}</p>
          </div>
        </div>
        <Button onClick={handleTriggerRun}>
          <Play size={16} className="mr-2" />
          Trigger Run
        </Button>
      </div>

      {loading ? (
        <div className="text-center py-12 text-slate-600 dark:text-slate-400">Loading runs...</div>
      ) : runs.length === 0 ? (
        <Card className="text-center py-12">
          <p className="text-slate-600 dark:text-slate-400 mb-4">No runs yet</p>
          <Button onClick={handleTriggerRun}>
            <Play size={16} className="mr-2" />
            Trigger First Run
          </Button>
        </Card>
      ) : (
        <div className="space-y-3">
          {runs.map((run) => (
            <div
              key={run.id}
              className="hover:border-brand-500/30 transition-colors cursor-pointer"
              onClick={() => navigate(`/runs/${run.id}`)}
            >
              <Card>
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
                <div className="text-right">
                  {run.finished_at && (
                    <div className="text-sm text-slate-600 dark:text-slate-400">
                      Duration: {Math.round((new Date(run.finished_at).getTime() - new Date(run.started_at || run.created_at).getTime()) / 1000)}s
                    </div>
                  )}
                  {run.error_message && (
                    <div className="text-sm text-red-600 dark:text-red-400 max-w-xs truncate">
                      {run.error_message}
                    </div>
                  )}
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
