import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Play, Trash2, Edit } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { pipelineAPI, PipelineListItem } from '@/services/api';
import { formatDistanceToNow } from 'date-fns';

export default function PipelinesPage() {
  const [pipelines, setPipelines] = useState<PipelineListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [runningPipelines, setRunningPipelines] = useState<Set<number>>(new Set());
  const navigate = useNavigate();

  useEffect(() => {
    loadPipelines();
  }, []);

  const loadPipelines = async () => {
    try {
      const data = await pipelineAPI.list();
      setPipelines(data);
    } catch (err) {
      console.error('Failed to load pipelines', err);
    } finally {
      setLoading(false);
    }
  };

  const handleRunPipeline = async (e: React.MouseEvent, pipelineId: number) => {
    e.stopPropagation(); // Prevent card click
    
    if (runningPipelines.has(pipelineId)) {
      return; // Already running
    }

    try {
      setRunningPipelines(prev => new Set(prev).add(pipelineId));
      await pipelineAPI.run(pipelineId);
      alert('Pipeline started successfully! Check the Runs page for status.');
      
      // Reload pipelines to get updated status
      await loadPipelines();
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Failed to run pipeline');
    } finally {
      setRunningPipelines(prev => {
        const next = new Set(prev);
        next.delete(pipelineId);
        return next;
      });
    }
  };

  const handleDeletePipeline = async (e: React.MouseEvent, pipelineId: number, pipelineName: string) => {
    e.stopPropagation(); // Prevent card click
    
    if (!confirm(`Are you sure you want to delete "${pipelineName}"? This action cannot be undone.`)) {
      return;
    }

    try {
      await pipelineAPI.delete(pipelineId);
      setPipelines(prev => prev.filter(p => p.id !== pipelineId));
      alert('Pipeline deleted successfully!');
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Failed to delete pipeline');
    }
  };

  const handleEditPipeline = (e: React.MouseEvent, pipelineId: number) => {
    e.stopPropagation(); // Prevent card click
    navigate(`/pipelines/${pipelineId}/editor`);
  };

  const getStatusVariant = (status?: string) => {
    switch (status) {
      case 'SUCCESS':
        return 'success';
      case 'FAILED':
        return 'error';
      case 'RUNNING':
        return 'info';
      default:
        return 'default';
    }
  };

  return (
    <div className="h-full flex flex-col space-y-6">
      <div className="flex items-center justify-between flex-shrink-0">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-50">Pipelines</h1>
          <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">Create and manage your ETL workflows</p>
        </div>
        <Button onClick={() => navigate('/pipelines/new/editor')}>
          <Plus size={16} className="mr-2" />
          New Pipeline
        </Button>
      </div>

      {loading ? (
        <div className="text-center py-12 text-slate-600 dark:text-slate-400">Loading...</div>
      ) : pipelines.length === 0 ? (
        <Card className="text-center py-12">
          <p className="text-slate-600 dark:text-slate-400 mb-4">No pipelines yet</p>
          <Button onClick={() => navigate('/pipelines/new/editor')}>Create First Pipeline</Button>
        </Card>
      ) : (
        <div className="flex-1 overflow-y-auto">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 pb-6">
            {pipelines.map((pipeline) => (
              <Card key={pipeline.id} className="hover:border-brand-500/30 transition-colors">
                <div className="flex flex-col h-full">
                  <div className="flex-1 mb-3">
                    <h3 className="font-semibold text-slate-900 dark:text-slate-50 mb-2">{pipeline.name}</h3>
                    {pipeline.description && (
                      <p className="text-sm text-slate-600 dark:text-slate-400 mb-3 line-clamp-2">{pipeline.description}</p>
                    )}
                    <div className="flex items-center gap-2">
                      {pipeline.last_run_status && (
                        <Badge variant={getStatusVariant(pipeline.last_run_status)}>
                          {pipeline.last_run_status}
                        </Badge>
                      )}
                      {pipeline.last_run_at && (
                        <span className="text-xs text-slate-500">
                          {formatDistanceToNow(new Date(pipeline.last_run_at), { addSuffix: true })}
                        </span>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex gap-2 pt-3 border-t border-slate-200 dark:border-slate-800">
                    <button
                      onClick={(e) => handleEditPipeline(e, pipeline.id)}
                      className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded text-sm transition-colors"
                      title="Edit pipeline"
                    >
                      <Edit size={14} />
                      <span>Edit</span>
                    </button>
                    <button
                      onClick={(e) => handleRunPipeline(e, pipeline.id)}
                      disabled={runningPipelines.has(pipeline.id)}
                      className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-green-600 hover:bg-green-700 disabled:bg-slate-300 dark:disabled:bg-slate-700 disabled:text-slate-500 text-white rounded text-sm transition-colors"
                      title="Run pipeline"
                    >
                      <Play size={14} />
                      <span>{runningPipelines.has(pipeline.id) ? 'Running...' : 'Run'}</span>
                    </button>
                    <button
                      onClick={(e) => handleDeletePipeline(e, pipeline.id, pipeline.name)}
                      className="px-3 py-2 bg-red-600/10 hover:bg-red-600/20 text-red-600 dark:text-red-400 rounded text-sm transition-colors"
                      title="Delete pipeline"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
