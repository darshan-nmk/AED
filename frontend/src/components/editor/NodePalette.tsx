import { 
  Database, FileText, Globe, Filter, GitMerge, Shuffle, 
  Columns, Type, Calculator, ArrowUpDown, Droplet, Copy,
  FileSpreadsheet, FileJson, Scale, Text, AlertTriangle, Split,
  Merge, Calendar, BarChart3
} from 'lucide-react';

interface NodeType {
  type: 'SOURCE' | 'TRANSFORM' | 'LOAD';
  subtype: string;
  label: string;
  icon: any;
}

const nodeTypes: NodeType[] = [
  // Sources
  { type: 'SOURCE', subtype: 'CSV_SOURCE', label: 'CSV File', icon: FileText },
  { type: 'SOURCE', subtype: 'EXCEL_SOURCE', label: 'Excel File', icon: FileSpreadsheet },
  { type: 'SOURCE', subtype: 'JSON_SOURCE', label: 'JSON File', icon: FileJson },
  { type: 'SOURCE', subtype: 'DB_SOURCE', label: 'Database', icon: Database },
  { type: 'SOURCE', subtype: 'API_SOURCE', label: 'API Source', icon: Globe },
  
  // Transforms - Basic
  { type: 'TRANSFORM', subtype: 'SELECT', label: 'Select Columns', icon: Columns },
  { type: 'TRANSFORM', subtype: 'FILTER', label: 'Filter Rows', icon: Filter },
  { type: 'TRANSFORM', subtype: 'RENAME', label: 'Rename Columns', icon: Shuffle },
  { type: 'TRANSFORM', subtype: 'CAST', label: 'Cast Types', icon: Type },
  { type: 'TRANSFORM', subtype: 'AGGREGATE', label: 'Aggregate', icon: Calculator },
  { type: 'TRANSFORM', subtype: 'JOIN', label: 'Join', icon: GitMerge },
  { type: 'TRANSFORM', subtype: 'SORT', label: 'Sort', icon: ArrowUpDown },
  
  // Transforms - Data Cleaning
  { type: 'TRANSFORM', subtype: 'FILL_MISSING', label: 'Fill Missing', icon: Droplet },
  { type: 'TRANSFORM', subtype: 'DROP_DUPLICATES', label: 'Drop Duplicates', icon: Copy },
  { type: 'TRANSFORM', subtype: 'FILTER_OUTLIERS', label: 'Remove Outliers', icon: AlertTriangle },
  { type: 'TRANSFORM', subtype: 'NORMALIZE', label: 'Normalize/Scale', icon: Scale },
  
  // Transforms - String Operations
  { type: 'TRANSFORM', subtype: 'STRING_TRANSFORM', label: 'String Transform', icon: Text },
  { type: 'TRANSFORM', subtype: 'SPLIT_COLUMN', label: 'Split Column', icon: Split },
  { type: 'TRANSFORM', subtype: 'MERGE_COLUMNS', label: 'Merge Columns', icon: Merge },
  
  // Transforms - Date/Time
  { type: 'TRANSFORM', subtype: 'EXTRACT_DATE_PARTS', label: 'Extract Date Parts', icon: Calendar },
  { type: 'TRANSFORM', subtype: 'BINNING', label: 'Bin Values', icon: BarChart3 },
  
  // Loads
  { type: 'LOAD', subtype: 'CSV_LOAD', label: 'To CSV', icon: FileText },
  { type: 'LOAD', subtype: 'EXCEL_LOAD', label: 'To Excel', icon: FileSpreadsheet },
  { type: 'LOAD', subtype: 'JSON_LOAD', label: 'To JSON', icon: FileJson },
  { type: 'LOAD', subtype: 'DB_LOAD', label: 'To Database', icon: Database },
  { type: 'LOAD', subtype: 'API_LOAD', label: 'To API', icon: Globe },
];

export default function NodePalette() {
  const onDragStart = (event: React.DragEvent, nodeType: NodeType) => {
    event.dataTransfer.setData('application/reactflow', JSON.stringify(nodeType));
    event.dataTransfer.effectAllowed = 'move';
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'SOURCE':
        return 'border-blue-500 bg-blue-500/5 hover:bg-blue-500/10';
      case 'TRANSFORM':
        return 'border-green-500 bg-green-500/5 hover:bg-green-500/10';
      case 'LOAD':
        return 'border-purple-500 bg-purple-500/5 hover:bg-purple-500/10';
      default:
        return 'border-slate-500 bg-slate-500/5 hover:bg-slate-500/10';
    }
  };

  return (
    <div className="w-56 bg-slate-50 dark:bg-slate-900/50 border-r border-slate-200 dark:border-slate-800 flex flex-col h-full">
      <div className="p-2 border-b border-slate-200 dark:border-slate-800 flex-shrink-0">
        <h3 className="text-xs font-semibold text-slate-700 dark:text-slate-300">Components</h3>
      </div>
      
      <div className="flex-1 overflow-y-auto p-2 scrollbar-thin scrollbar-thumb-slate-400 dark:scrollbar-thumb-slate-600 scrollbar-track-slate-100 dark:scrollbar-track-slate-800">
        {/* Sources */}
        <details open className="mb-3">
          <summary className="text-[10px] font-semibold text-blue-600 dark:text-blue-400 mb-2 px-1 cursor-pointer flex items-center gap-1 select-none">
            <span className="text-xs">▼</span>
            <span>SOURCES</span>
          </summary>
          <div className="space-y-1 mt-1 pl-2">
            {nodeTypes.filter(n => n.type === 'SOURCE').map((node) => {
              const Icon = node.icon;
              return (
                <div
                  key={`${node.type}-${node.subtype}`}
                  draggable
                  onDragStart={(e) => onDragStart(e, node)}
                  className={`flex items-center gap-1.5 p-1.5 rounded border ${getTypeColor(node.type)} cursor-move transition-colors`}
                >
                  <Icon size={12} className="text-slate-600 dark:text-slate-300 flex-shrink-0" />
                  <span className="text-[11px] text-slate-900 dark:text-slate-200">{node.label}</span>
                </div>
              );
            })}
          </div>
        </details>

        {/* Transformations */}
        <details open className="mb-3">
          <summary className="text-[10px] font-semibold text-green-600 dark:text-green-400 mb-2 px-1 cursor-pointer flex items-center gap-1 select-none">
            <span className="text-xs">▼</span>
            <span>TRANSFORMATIONS</span>
          </summary>
          <div className="space-y-1 mt-1 pl-2">
            {nodeTypes.filter(n => n.type === 'TRANSFORM').map((node) => {
              const Icon = node.icon;
              return (
                <div
                  key={`${node.type}-${node.subtype}`}
                  draggable
                  onDragStart={(e) => onDragStart(e, node)}
                  className={`flex items-center gap-1.5 p-1.5 rounded border ${getTypeColor(node.type)} cursor-move transition-colors`}
                >
                  <Icon size={12} className="text-slate-600 dark:text-slate-300 flex-shrink-0" />
                  <span className="text-[11px] text-slate-900 dark:text-slate-200">{node.label}</span>
                </div>
              );
            })}
          </div>
        </details>

        {/* Destinations */}
        <details open className="mb-2">
          <summary className="text-[10px] font-semibold text-purple-600 dark:text-purple-400 mb-2 px-1 cursor-pointer flex items-center gap-1 select-none">
            <span className="text-xs">▼</span>
            <span>DESTINATIONS</span>
          </summary>
          <div className="space-y-1 mt-1 pl-2">
            {nodeTypes.filter(n => n.type === 'LOAD').map((node) => {
              const Icon = node.icon;
              return (
                <div
                  key={`${node.type}-${node.subtype}`}
                  draggable
                  onDragStart={(e) => onDragStart(e, node)}
                  className={`flex items-center gap-1.5 p-1.5 rounded border ${getTypeColor(node.type)} cursor-move transition-colors`}
                >
                  <Icon size={12} className="text-slate-600 dark:text-slate-300 flex-shrink-0" />
                  <span className="text-[11px] text-slate-900 dark:text-slate-200">{node.label}</span>
                </div>
              );
            })}
          </div>
        </details>
      </div>

      <div className="p-2 bg-slate-100 dark:bg-slate-800/30 border-t border-slate-200 dark:border-slate-800 flex-shrink-0">
        <p className="text-[9px] leading-tight text-slate-600 dark:text-slate-400">Drag components to canvas</p>
      </div>
    </div>
  );
}
