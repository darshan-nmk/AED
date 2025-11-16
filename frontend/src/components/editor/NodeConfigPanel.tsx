import { X, Upload } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Node, Edge } from 'reactflow';
import { useState, useEffect } from 'react';
import { fileAPI } from '@/services/api';

interface NodeConfigPanelProps {
  node: Node | null;
  nodes: Node[];
  edges: Edge[];
  pipelineName?: string;
  onClose: () => void;
  onUpdate: (nodeId: string, data: any) => void;
  onDelete: (nodeId: string) => void;
}

export default function NodeConfigPanel({ node, nodes, edges, pipelineName, onClose, onUpdate, onDelete }: NodeConfigPanelProps) {
  const [uploading, setUploading] = useState(false);
  const [availableColumns, setAvailableColumns] = useState<string[]>([]);
  const [loadingColumns, setLoadingColumns] = useState(false);
  
  if (!node) return null;

  // Get columns from upstream source nodes
  useEffect(() => {
    const fetchColumnsFromSource = async () => {
      if (node.data.type !== 'TRANSFORM' && node.data.type !== 'LOAD') return;
      
      setLoadingColumns(true);
      try {
        // Find incoming edges to this node
        const incomingEdges = edges.filter(edge => edge.target === node.id);
        if (incomingEdges.length === 0) {
          setAvailableColumns([]);
          return;
        }
        
        // Get the source node (could be SOURCE or TRANSFORM)
        const sourceNodeId = incomingEdges[0].source;
        const sourceNode = nodes.find(n => n.id === sourceNodeId);
        
        if (!sourceNode) {
          setAvailableColumns([]);
          return;
        }
        
        // If source is a SOURCE node with file uploaded, fetch columns
        if (sourceNode.data.type === 'SOURCE' && sourceNode.data.config?.file_id) {
          const sample = await fileAPI.getSample(sourceNode.data.config.file_id, 1);
          setAvailableColumns(sample.columns || []);
        } else if (sourceNode.data.type === 'TRANSFORM') {
          // For transform nodes, we'd need to trace back further or use cached columns
          // For now, just clear
          setAvailableColumns([]);
        }
      } catch (error) {
        console.error('Failed to fetch columns:', error);
        setAvailableColumns([]);
      } finally {
        setLoadingColumns(false);
      }
    };
    
    fetchColumnsFromSource();
  }, [node.id, node.data.type, edges, nodes]);


  const handleConfigChange = (key: string, value: any) => {
    onUpdate(node.id, {
      ...node.data,
      config: {
        ...node.data.config,
        [key]: value,
      },
    });
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    console.log('Starting file upload...', file.name);
    setUploading(true);
    try {
      const uploadedFile = await fileAPI.upload(file);
      console.log('Upload response:', uploadedFile);
      
      // Update both file_path and file_id at once
      onUpdate(node.id, {
        ...node.data,
        config: {
          ...node.data.config,
          file_path: uploadedFile.file_path,
          file_id: uploadedFile.file_id,
        },
      });
      
      console.log('Config updated with:', {
        file_path: uploadedFile.file_path,
        file_id: uploadedFile.file_id
      });
      
      // Reset the file input so the same file can be uploaded again if needed
      event.target.value = '';
      
      // Show success alert after state updates
      alert('File uploaded successfully!');
    } catch (error: any) {
      console.error('Upload error:', error);
      alert(`Upload failed: ${error.response?.data?.detail || error.message}`);
      event.target.value = '';
    } finally {
      setUploading(false);
    }
  };

  const renderConfigFields = () => {
    const { type, subtype } = node.data;
    
    // Debug: Log current node config
    console.log('Node config:', node.data.config);

    // CSV Source
    if (type === 'SOURCE' && subtype === 'CSV_SOURCE') {
      return (
        <>
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              CSV File
            </label>
            
            {!node.data.config?.file_path ? (
              // Show upload button only if no file uploaded
              <>
                <input
                  type="file"
                  accept=".csv,text/csv"
                  onChange={handleFileUpload}
                  className="hidden"
                  id="csv-upload"
                />
                <label
                  htmlFor="csv-upload"
                  className="flex items-center justify-center gap-2 w-full p-3 border-2 border-dashed border-slate-300 dark:border-slate-600 rounded-lg hover:border-blue-500 hover:bg-blue-500/5 cursor-pointer transition-colors"
                >
                  <Upload size={16} className="text-slate-600 dark:text-slate-400" />
                  <span className="text-sm text-slate-700 dark:text-slate-300">
                    {uploading ? 'Uploading...' : 'Upload CSV File'}
                  </span>
                </label>
              </>
            ) : (
              // Show file info after upload
              <div className="space-y-2">
                <div className="p-3 bg-green-500/10 border border-green-500/30 rounded-lg">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-green-400 mb-1">
                        ✓ File Uploaded
                      </p>
                      <p className="text-xs text-slate-700 dark:text-slate-300 truncate">
                        {node.data.config.file_path.split('/').pop()}
                      </p>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                        Path: {node.data.config.file_path}
                      </p>
                    </div>
                    <button
                      onClick={() => {
                        handleConfigChange('file_path', null);
                        handleConfigChange('file_id', null);
                      }}
                      className="text-red-400 hover:text-red-300 text-xs"
                      title="Remove file"
                    >
                      Remove
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">
              Has Header Row
            </label>
            <input
              type="checkbox"
              checked={node.data.config?.has_header ?? true}
              onChange={(e) => handleConfigChange('has_header', e.target.checked)}
              className="rounded"
              aria-label="Has header row"
            />
          </div>
          <Input
            label="Delimiter"
            placeholder=","
            value={node.data.config?.delimiter || ','}
            onChange={(e) => handleConfigChange('delimiter', e.target.value)}
          />
        </>
      );
    }

    // Excel Source
    if (type === 'SOURCE' && subtype === 'EXCEL_SOURCE') {
      return (
        <>
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Excel File
            </label>
            
            {!node.data.config?.file_path ? (
              <>
                <input
                  type="file"
                  accept=".xlsx,.xls"
                  onChange={handleFileUpload}
                  className="hidden"
                  id="excel-upload"
                />
                <label
                  htmlFor="excel-upload"
                  className="flex items-center justify-center gap-2 w-full p-3 border-2 border-dashed border-slate-600 rounded-lg hover:border-blue-500 hover:bg-blue-500/5 cursor-pointer transition-colors"
                >
                  <Upload size={16} className="text-slate-400" />
                  <span className="text-sm text-slate-300">
                    {uploading ? 'Uploading...' : 'Upload Excel File'}
                  </span>
                </label>
              </>
            ) : (
              <div className="p-3 bg-green-500/10 border border-green-500/30 rounded-lg">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-green-400 mb-1">
                      ✓ File Uploaded
                    </p>
                    <p className="text-xs text-slate-300 truncate">
                      {node.data.config.file_path.split('/').pop()}
                    </p>
                    <p className="text-xs text-slate-500 mt-1">
                      Path: {node.data.config.file_path}
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      handleConfigChange('file_path', null);
                      handleConfigChange('file_id', null);
                    }}
                    className="text-red-400 hover:text-red-300 text-xs"
                    title="Remove file"
                  >
                    Remove
                  </button>
                </div>
              </div>
            )}
          </div>
          <Input
            label="Sheet Name (Optional)"
            placeholder="Sheet1"
            value={node.data.config?.sheet_name || ''}
            onChange={(e) => handleConfigChange('sheet_name', e.target.value)}
          />
        </>
      );
    }

    // JSON Source
    if (type === 'SOURCE' && subtype === 'JSON_SOURCE') {
      return (
        <>
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              JSON File
            </label>
            
            {!node.data.config?.file_path ? (
              <>
                <input
                  type="file"
                  accept=".json,application/json"
                  onChange={handleFileUpload}
                  className="hidden"
                  id="json-upload"
                />
                <label
                  htmlFor="json-upload"
                  className="flex items-center justify-center gap-2 w-full p-3 border-2 border-dashed border-slate-600 rounded-lg hover:border-blue-500 hover:bg-blue-500/5 cursor-pointer transition-colors"
                >
                  <Upload size={16} className="text-slate-400" />
                  <span className="text-sm text-slate-300">
                    {uploading ? 'Uploading...' : 'Upload JSON File'}
                  </span>
                </label>
              </>
            ) : (
              <div className="p-3 bg-green-500/10 border border-green-500/30 rounded-lg">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-green-400 mb-1">
                      ✓ File Uploaded
                    </p>
                    <p className="text-xs text-slate-300 truncate">
                      {node.data.config.file_path.split('/').pop()}
                    </p>
                    <p className="text-xs text-slate-500 mt-1">
                      Path: {node.data.config.file_path}
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      handleConfigChange('file_path', null);
                      handleConfigChange('file_id', null);
                    }}
                    className="text-red-400 hover:text-red-300 text-xs"
                    title="Remove file"
                  >
                    Remove
                  </button>
                </div>
              </div>
            )}
          </div>
        </>
      );
    }

    // Database Source/Load
    if ((type === 'SOURCE' && subtype === 'DB_SOURCE') || (type === 'LOAD' && subtype === 'DB_LOAD')) {
      return (
        <>
          <Input
            label="Connection String"
            placeholder="mysql+pymysql://user:pass@host:port/db"
            value={node.data.config?.connection_string || ''}
            onChange={(e) => handleConfigChange('connection_string', e.target.value)}
          />
          <Input
            label="Table Name"
            placeholder="users"
            value={node.data.config?.table_name || ''}
            onChange={(e) => handleConfigChange('table_name', e.target.value)}
          />
          {type === 'SOURCE' && (
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">
                Query (Optional)
              </label>
              <textarea
                className="input min-h-[80px] font-mono text-xs"
                placeholder="SELECT * FROM users WHERE active = 1"
                value={node.data.config?.query || ''}
                onChange={(e) => handleConfigChange('query', e.target.value)}
              />
            </div>
          )}
          {type === 'LOAD' && (
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">
                If Exists
              </label>
              <select
                className="input"
                value={node.data.config?.if_exists || 'replace'}
                onChange={(e) => handleConfigChange('if_exists', e.target.value)}
                aria-label="If table exists action"
              >
                <option value="replace">Replace</option>
                <option value="append">Append</option>
                <option value="fail">Fail</option>
              </select>
            </div>
          )}
        </>
      );
    }

    // API Source/Load
    if ((type === 'SOURCE' && subtype === 'API_SOURCE') || (type === 'LOAD' && subtype === 'API_LOAD')) {
      return (
        <>
          <Input
            label="API Endpoint"
            placeholder="https://api.example.com/data"
            value={node.data.config?.endpoint || ''}
            onChange={(e) => handleConfigChange('endpoint', e.target.value)}
          />
          <Input
            label="Method"
            placeholder="GET"
            value={node.data.config?.method || (type === 'SOURCE' ? 'GET' : 'POST')}
            onChange={(e) => handleConfigChange('method', e.target.value)}
          />
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">
              Headers (JSON)
            </label>
            <textarea
              className="input min-h-[60px] font-mono text-xs"
              placeholder='{"Authorization": "Bearer token"}'
              value={node.data.config?.headers || ''}
              onChange={(e) => handleConfigChange('headers', e.target.value)}
            />
          </div>
        </>
      );
    }

    // SELECT Transform
    if (type === 'TRANSFORM' && subtype === 'SELECT') {
      return (
        <>
          {loadingColumns ? (
            <p className="text-sm text-slate-400">Loading columns...</p>
          ) : availableColumns.length > 0 ? (
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Select Columns
              </label>
              <div className="space-y-2 max-h-60 overflow-y-auto border border-slate-700 rounded p-2">
                {availableColumns.map((col) => (
                  <label key={col} className="flex items-center gap-2 p-1 hover:bg-slate-800 rounded cursor-pointer">
                    <input
                      type="checkbox"
                      checked={node.data.config?.columns?.includes(col) || false}
                      onChange={(e) => {
                        const currentCols = node.data.config?.columns || [];
                        const newCols = e.target.checked
                          ? [...currentCols, col]
                          : currentCols.filter((c: string) => c !== col);
                        handleConfigChange('columns', newCols);
                      }}
                      className="rounded"
                    />
                    <span className="text-sm text-slate-300">{col}</span>
                  </label>
                ))}
              </div>
              {node.data.config?.columns?.length > 0 && (
                <p className="text-xs text-slate-400 mt-2">
                  Selected: {node.data.config.columns.join(', ')}
                </p>
              )}
            </div>
          ) : (
            <p className="text-sm text-slate-400">
              Connect a source node with data to see available columns
            </p>
          )}
        </>
      );
    }

    // Filter Transform
    if (type === 'TRANSFORM' && subtype === 'FILTER') {
      return (
        <>
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">
              Column
            </label>
            {availableColumns.length > 0 ? (
              <select
                className="input"
                value={node.data.config?.column || ''}
                onChange={(e) => handleConfigChange('column', e.target.value)}
                aria-label="Filter column"
              >
                <option value="">Select column...</option>
                {availableColumns.map((col) => (
                  <option key={col} value={col}>
                    {col}
                  </option>
                ))}
              </select>
            ) : (
              <Input
                placeholder="Column name"
                value={node.data.config?.column || ''}
                onChange={(e) => handleConfigChange('column', e.target.value)}
              />
            )}
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">
              Operator
            </label>
            <select
              className="input"
              value={node.data.config?.operator || '=='}
              onChange={(e) => handleConfigChange('operator', e.target.value)}
              aria-label="Filter operator"
            >
              <option value="==">Equals (==)</option>
              <option value="!=">Not Equals (!=)</option>
              <option value=">">Greater Than (&gt;)</option>
              <option value="<">Less Than (&lt;)</option>
              <option value=">=">Greater or Equal (&gt;=)</option>
              <option value="<=">Less or Equal (&lt;=)</option>
              <option value="contains">Contains</option>
            </select>
          </div>
          <Input
            label="Value"
            placeholder="18"
            value={node.data.config?.value || ''}
            onChange={(e) => {
              const val = e.target.value;
              // Try to convert to number if it looks numeric
              const numVal = Number(val);
              handleConfigChange('value', !isNaN(numVal) && val !== '' ? numVal : val);
            }}
          />
        </>
      );
    }

    // RENAME Transform
    if (type === 'TRANSFORM' && subtype === 'RENAME') {
      const mapping = node.data.config?.mapping || {};
      const mappingEntries = Object.entries(mapping);
      
      return (
        <>
          {availableColumns.length > 0 ? (
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Column Renames
              </label>
              <div className="space-y-2">
                {mappingEntries.map(([oldName, newName], idx) => (
                  <div key={idx} className="flex gap-2 items-center p-2 bg-slate-800 rounded">
                    <select
                      className="input flex-1 text-sm"
                      value={oldName}
                      onChange={(e) => {
                        const newMapping = { ...mapping };
                        delete newMapping[oldName];
                        newMapping[e.target.value] = newName;
                        handleConfigChange('mapping', newMapping);
                      }}
                      aria-label="Column to rename"
                    >
                      {availableColumns.map((col) => (
                        <option key={col} value={col}>{col}</option>
                      ))}
                    </select>
                    <span className="text-slate-400">→</span>
                    <input
                      type="text"
                      className="input flex-1 text-sm"
                      placeholder="New name"
                      value={newName as string}
                      onChange={(e) => {
                        const newMapping = { ...mapping };
                        newMapping[oldName] = e.target.value;
                        handleConfigChange('mapping', newMapping);
                      }}
                    />
                    <button
                      onClick={() => {
                        const newMapping = { ...mapping };
                        delete newMapping[oldName];
                        handleConfigChange('mapping', newMapping);
                      }}
                      className="text-red-400 hover:text-red-300 text-xs px-2"
                    >
                      ✕
                    </button>
                  </div>
                ))}
                <button
                  onClick={() => {
                    const firstAvailableCol = availableColumns.find(col => !mapping[col]) || availableColumns[0];
                    handleConfigChange('mapping', { ...mapping, [firstAvailableCol]: '' });
                  }}
                  className="w-full p-2 border border-dashed border-slate-600 rounded hover:border-blue-500 text-sm text-slate-400"
                  disabled={availableColumns.length === 0}
                >
                  + Add Rename
                </button>
              </div>
            </div>
          ) : (
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">
                Column Mappings (JSON)
              </label>
              <textarea
                className="input min-h-[100px] font-mono text-xs"
                placeholder='{"old_name": "new_name", "age": "customer_age"}'
                value={node.data.config?.mapping ? JSON.stringify(node.data.config.mapping, null, 2) : ''}
                onChange={(e) => {
                  try {
                    const mapping = JSON.parse(e.target.value);
                    handleConfigChange('mapping', mapping);
                  } catch {
                    // Invalid JSON, store as string for now
                  }
                }}
              />
            </div>
          )}
        </>
      );
    }

    // CAST Transform
    if (type === 'TRANSFORM' && subtype === 'CAST') {
      const casts = node.data.config?.casts || [];
      
      return (
        <>
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Type Casts
            </label>
            {availableColumns.length > 0 ? (
              <div className="space-y-2">
                {casts.map((cast: any, idx: number) => (
                  <div key={idx} className="flex gap-2 items-center p-2 bg-slate-800 rounded">
                    <select
                      className="input flex-1 text-sm"
                      value={cast.column || ''}
                      onChange={(e) => {
                        const newCasts = [...casts];
                        newCasts[idx] = { ...cast, column: e.target.value };
                        handleConfigChange('casts', newCasts);
                      }}
                      aria-label="Cast column"
                    >
                      <option value="">Select column...</option>
                      {availableColumns.map((col) => (
                        <option key={col} value={col}>{col}</option>
                      ))}
                    </select>
                    <select
                      className="input text-sm"
                      value={cast.to || 'string'}
                      onChange={(e) => {
                        const newCasts = [...casts];
                        newCasts[idx] = { ...cast, to: e.target.value };
                        handleConfigChange('casts', newCasts);
                      }}
                      aria-label="Cast to type"
                    >
                      <option value="int">int</option>
                      <option value="float">float</option>
                      <option value="string">string</option>
                      <option value="datetime">datetime</option>
                      <option value="bool">bool</option>
                    </select>
                    <button
                      onClick={() => {
                        const newCasts = casts.filter((_: any, i: number) => i !== idx);
                        handleConfigChange('casts', newCasts);
                      }}
                      className="text-red-400 hover:text-red-300 text-xs px-2"
                    >
                      ✕
                    </button>
                  </div>
                ))}
                <button
                  onClick={() => {
                    handleConfigChange('casts', [...casts, { column: '', to: 'string' }]);
                  }}
                  className="w-full p-2 border border-dashed border-slate-600 rounded hover:border-blue-500 text-sm text-slate-400"
                >
                  + Add Cast
                </button>
              </div>
            ) : (
              <textarea
                className="input min-h-[120px] font-mono text-xs"
                placeholder='[{"column": "age", "to": "int"}, {"column": "date", "to": "datetime"}]'
                value={node.data.config?.casts ? JSON.stringify(node.data.config.casts, null, 2) : ''}
                onChange={(e) => {
                  try {
                    const casts = JSON.parse(e.target.value);
                    handleConfigChange('casts', casts);
                  } catch {
                    // Invalid JSON
                  }
                }}
              />
            )}
            <p className="text-xs text-slate-500 mt-1">Types: int, float, string, datetime, bool</p>
          </div>
        </>
      );
    }

    // AGGREGATE Transform
    if (type === 'TRANSFORM' && subtype === 'AGGREGATE') {
      const groupBy = node.data.config?.group_by || [];
      const aggregations = node.data.config?.aggregations || [];
      
      return (
        <>
          {availableColumns.length > 0 ? (
            <>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Group By Columns
                </label>
                <div className="space-y-1 max-h-40 overflow-y-auto border border-slate-700 rounded p-2">
                  {availableColumns.map((col) => (
                    <label key={col} className="flex items-center gap-2 p-1 hover:bg-slate-800 rounded cursor-pointer">
                      <input
                        type="checkbox"
                        checked={groupBy.includes(col)}
                        onChange={(e) => {
                          const newGroupBy = e.target.checked
                            ? [...groupBy, col]
                            : groupBy.filter((c: string) => c !== col);
                          handleConfigChange('group_by', newGroupBy);
                        }}
                        className="rounded"
                      />
                      <span className="text-sm text-slate-300">{col}</span>
                    </label>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Aggregations
                </label>
                <div className="space-y-2">
                  {aggregations.map((agg: any, idx: number) => (
                    <div key={idx} className="flex gap-2 items-center p-2 bg-slate-800 rounded">
                      <select
                        className="input flex-1 text-sm"
                        value={agg.column || ''}
                        onChange={(e) => {
                          const newAggs = [...aggregations];
                          newAggs[idx] = { ...agg, column: e.target.value };
                          handleConfigChange('aggregations', newAggs);
                        }}
                        aria-label="Aggregation column"
                      >
                        <option value="">Select column...</option>
                        {availableColumns.map((col) => (
                          <option key={col} value={col}>{col}</option>
                        ))}
                      </select>
                      <select
                        className="input text-sm"
                        value={agg.agg || 'sum'}
                        onChange={(e) => {
                          const newAggs = [...aggregations];
                          newAggs[idx] = { ...agg, agg: e.target.value };
                          handleConfigChange('aggregations', newAggs);
                        }}
                        aria-label="Aggregation function"
                      >
                        <option value="sum">sum</option>
                        <option value="mean">mean</option>
                        <option value="count">count</option>
                        <option value="min">min</option>
                        <option value="max">max</option>
                      </select>
                      <button
                        onClick={() => {
                          const newAggs = aggregations.filter((_: any, i: number) => i !== idx);
                          handleConfigChange('aggregations', newAggs);
                        }}
                        className="text-red-400 hover:text-red-300 text-xs px-2"
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                  <button
                    onClick={() => {
                      handleConfigChange('aggregations', [...aggregations, { column: '', agg: 'sum' }]);
                    }}
                    className="w-full p-2 border border-dashed border-slate-600 rounded hover:border-blue-500 text-sm text-slate-400"
                  >
                    + Add Aggregation
                  </button>
                </div>
              </div>
            </>
          ) : (
            <>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">
                  Group By Columns (comma-separated)
                </label>
                <Input
                  placeholder="category, region"
                  value={node.data.config?.group_by?.join(', ') || ''}
                  onChange={(e) => {
                    const value = e.target.value.trim();
                    handleConfigChange('group_by', value ? value.split(',').map(s => s.trim()).filter(s => s) : []);
                  }}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">
                  Aggregations (JSON Array)
                </label>
                <textarea
                  className="input min-h-[100px] font-mono text-xs"
                  placeholder='[{"column": "sales", "agg": "sum"}, {"column": "price", "agg": "mean"}]'
                  value={node.data.config?.aggregations ? JSON.stringify(node.data.config.aggregations, null, 2) : ''}
                  onChange={(e) => {
                    try {
                      const aggs = JSON.parse(e.target.value);
                      handleConfigChange('aggregations', aggs);
                    } catch {
                      // Invalid JSON
                    }
                  }}
                />
                <p className="text-xs text-slate-500 mt-1">Functions: sum, mean, count, min, max</p>
              </div>
            </>
          )}
        </>
      );
    }

    // JOIN Transform
    if (type === 'TRANSFORM' && subtype === 'JOIN') {
      return (
        <>
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">
              Join Type
            </label>
            <select
              className="input"
              value={node.data.config?.join_type || 'inner'}
              onChange={(e) => handleConfigChange('join_type', e.target.value)}
              aria-label="Join type"
            >
              <option value="inner">Inner Join</option>
              <option value="left">Left Join</option>
              <option value="right">Right Join</option>
              <option value="outer">Outer Join</option>
            </select>
          </div>
          <Input
            label="Left Key"
            placeholder="id"
            value={node.data.config?.left_key || ''}
            onChange={(e) => handleConfigChange('left_key', e.target.value)}
          />
          <Input
            label="Right Key"
            placeholder="user_id"
            value={node.data.config?.right_key || ''}
            onChange={(e) => handleConfigChange('right_key', e.target.value)}
          />
        </>
      );
    }

    // SORT Transform
    if (type === 'TRANSFORM' && subtype === 'SORT') {
      const sortColumns = node.data.config?.columns || [];
      
      return (
        <>
          {availableColumns.length > 0 ? (
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Sort By Columns
              </label>
              <div className="space-y-1 max-h-40 overflow-y-auto border border-slate-700 rounded p-2">
                {availableColumns.map((col) => (
                  <label key={col} className="flex items-center gap-2 p-1 hover:bg-slate-800 rounded cursor-pointer">
                    <input
                      type="checkbox"
                      checked={sortColumns.includes(col)}
                      onChange={(e) => {
                        const newCols = e.target.checked
                          ? [...sortColumns, col]
                          : sortColumns.filter((c: string) => c !== col);
                        handleConfigChange('columns', newCols);
                      }}
                      className="rounded"
                    />
                    <span className="text-sm text-slate-300">{col}</span>
                  </label>
                ))}
              </div>
            </div>
          ) : (
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">
                Sort By Columns (comma-separated)
              </label>
              <Input
                placeholder="date, amount"
                value={node.data.config?.columns?.join(', ') || ''}
                onChange={(e) => {
                  const value = e.target.value.trim();
                  handleConfigChange('columns', value ? value.split(',').map(s => s.trim()).filter(s => s) : []);
                }}
              />
            </div>
          )}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">
              Order
            </label>
            <select
              className="input"
              value={node.data.config?.ascending ? 'asc' : 'desc'}
              onChange={(e) => handleConfigChange('ascending', e.target.value === 'asc')}
              aria-label="Sort order"
            >
              <option value="asc">Ascending</option>
              <option value="desc">Descending</option>
            </select>
          </div>
        </>
      );
    }

    // FILL_MISSING Transform
    if (type === 'TRANSFORM' && subtype === 'FILL_MISSING') {
      return (
        <>
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">
              Column
            </label>
            {availableColumns.length > 0 ? (
              <select
                className="input"
                value={node.data.config?.column || ''}
                onChange={(e) => handleConfigChange('column', e.target.value)}
                aria-label="Fill missing column"
              >
                <option value="">Select column...</option>
                {availableColumns.map((col) => (
                  <option key={col} value={col}>
                    {col}
                  </option>
                ))}
              </select>
            ) : (
              <Input
                placeholder="Column name"
                value={node.data.config?.column || ''}
                onChange={(e) => handleConfigChange('column', e.target.value)}
              />
            )}
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">
              Strategy
            </label>
            <select
              className="input"
              value={node.data.config?.strategy || 'constant'}
              onChange={(e) => handleConfigChange('strategy', e.target.value)}
              aria-label="Fill strategy"
            >
              <option value="constant">Constant Value</option>
              <option value="mean">Mean</option>
              <option value="median">Median</option>
              <option value="forward">Forward Fill</option>
              <option value="backward">Backward Fill</option>
            </select>
          </div>
          {node.data.config?.strategy === 'constant' && (
            <Input
              label="Fill Value"
              placeholder="0"
              value={node.data.config?.value || ''}
              onChange={(e) => {
                const val = e.target.value;
                // Try to convert to number if it looks numeric
                const numVal = Number(val);
                handleConfigChange('value', !isNaN(numVal) && val !== '' ? numVal : val);
              }}
            />
          )}
        </>
      );
    }

    // DROP_DUPLICATES Transform
    if (type === 'TRANSFORM' && subtype === 'DROP_DUPLICATES') {
      return (
        <>
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">
              Columns to Check (comma-separated, empty = all)
            </label>
            <Input
              placeholder="email, phone (leave empty for all columns)"
              value={node.data.config?.columns?.join(', ') || ''}
              onChange={(e) => {
                const value = e.target.value.trim();
                handleConfigChange('columns', value ? value.split(',').map(s => s.trim()) : null);
              }}
            />
          </div>
        </>
      );
    }

    // CSV Load
    if (type === 'LOAD' && subtype === 'CSV_LOAD') {
      const defaultName = pipelineName ? `${pipelineName}.csv` : 'output.csv';
      return (
        <>
          <Input
            label="Output File Name (Optional)"
            placeholder={defaultName}
            value={node.data.config?.output_path || ''}
            onChange={(e) => handleConfigChange('output_path', e.target.value)}
          />
          <p className="text-xs text-slate-500 mt-1">Leave empty to use: {defaultName}</p>
        </>
      );
    }

    // Excel Load
    if (type === 'LOAD' && subtype === 'EXCEL_LOAD') {
      const defaultName = pipelineName ? `${pipelineName}.xlsx` : 'output.xlsx';
      return (
        <>
          <Input
            label="Output File Name (Optional)"
            placeholder={defaultName}
            value={node.data.config?.output_path || ''}
            onChange={(e) => handleConfigChange('output_path', e.target.value)}
          />
          <p className="text-xs text-slate-500 mt-1">Leave empty to use: {defaultName}</p>
          <Input
            label="Sheet Name (Optional)"
            placeholder="Sheet1"
            value={node.data.config?.sheet_name || ''}
            onChange={(e) => handleConfigChange('sheet_name', e.target.value)}
          />
        </>
      );
    }

    // JSON Load
    if (type === 'LOAD' && subtype === 'JSON_LOAD') {
      const defaultName = pipelineName ? `${pipelineName}.json` : 'output.json';
      return (
        <>
          <Input
            label="Output File Name (Optional)"
            placeholder={defaultName}
            value={node.data.config?.output_path || ''}
            onChange={(e) => handleConfigChange('output_path', e.target.value)}
          />
          <p className="text-xs text-slate-500 mt-1">Leave empty to use: {defaultName}</p>
        </>
      );
    }

    return <p className="text-sm text-slate-400">No configuration available for this node type.</p>;
  };

  return (
    <div className="w-80 bg-slate-900 border-l border-slate-800 p-4 overflow-y-auto">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-slate-200">Node Configuration</h3>
        <button onClick={onClose} className="text-slate-400 hover:text-slate-200" aria-label="Close configuration panel">
          <X size={18} />
        </button>
      </div>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-1">
            Node Label
          </label>
          <Input
            value={node.data.label || ''}
            onChange={(e) => onUpdate(node.id, { ...node.data, label: e.target.value })}
            placeholder="Enter node name"
          />
        </div>

        <div>
          <label className="block text-sm text-slate-400 mb-1">Type</label>
          <div className="text-sm text-slate-200">{node.data.type}</div>
        </div>

        <div>
          <label className="block text-sm text-slate-400 mb-1">Subtype</label>
          <div className="text-sm text-slate-200">{node.data.subtype}</div>
        </div>

        <div className="border-t border-slate-800 pt-4">
          <h4 className="text-xs font-semibold text-slate-300 mb-3">Configuration</h4>
          <div className="space-y-3">
            {renderConfigFields()}
          </div>
        </div>

        <div className="border-t border-slate-800 pt-4">
          <Button
            onClick={() => onDelete(node.id)}
            className="w-full bg-red-500/10 text-red-400 hover:bg-red-500/20 border border-red-500/20"
          >
            Delete Node
          </Button>
        </div>
      </div>
    </div>
  );
}
