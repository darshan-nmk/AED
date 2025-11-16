import { memo } from 'react';
import { Handle, Position, NodeProps } from 'reactflow';
import { Database, Filter, GitMerge, FileText, Globe, Shuffle } from 'lucide-react';

interface CustomNodeData {
  label: string;
  type: 'SOURCE' | 'TRANSFORM' | 'LOAD';
  subtype: string;
  config?: Record<string, any>;
}

const CustomNode = memo(({ data }: NodeProps<CustomNodeData>) => {
  const getNodeIcon = () => {
    switch (data.subtype) {
      case 'csv':
      case 'file':
        return FileText;
      case 'database':
      case 'mysql':
      case 'postgres':
        return Database;
      case 'api':
        return Globe;
      case 'filter':
        return Filter;
      case 'join':
        return GitMerge;
      case 'transform':
      case 'map':
        return Shuffle;
      default:
        return Database;
    }
  };

  const getNodeColor = () => {
    switch (data.type) {
      case 'SOURCE':
        return 'bg-blue-500/10 border-blue-500';
      case 'TRANSFORM':
        return 'bg-green-500/10 border-green-500';
      case 'LOAD':
        return 'bg-purple-500/10 border-purple-500';
      default:
        return 'bg-slate-500/10 border-slate-500';
    }
  };

  const Icon = getNodeIcon();

  return (
    <div className={`px-4 py-3 rounded-lg border-2 ${getNodeColor()} bg-white dark:bg-slate-900 min-w-[180px]`}>
      <Handle type="target" position={Position.Left} className="w-3 h-3 !bg-brand-500" />
      
      <div className="flex items-center gap-2">
        <Icon size={18} className="text-slate-600 dark:text-slate-300" />
        <div>
          <div className="text-sm font-semibold text-slate-900 dark:text-slate-100">{data.label}</div>
          <div className="text-xs text-slate-600 dark:text-slate-400">{data.subtype}</div>
        </div>
      </div>

      <Handle type="source" position={Position.Right} className="w-3 h-3 !bg-brand-500" />
    </div>
  );
});

CustomNode.displayName = 'CustomNode';

export default CustomNode;
