import { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { fileAPI, FileSample } from '@/services/api';

interface DataPreviewModalProps {
  fileId: number | null;
  fileName?: string;
  onClose: () => void;
}

export default function DataPreviewModal({ fileId, fileName, onClose }: DataPreviewModalProps) {
  const [sample, setSample] = useState<FileSample | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (fileId) {
      loadSample();
    }
  }, [fileId]);

  const loadSample = async () => {
    if (!fileId) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const data = await fileAPI.getSample(fileId.toString(), 10);
      setSample(data);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to load preview');
    } finally {
      setLoading(false);
    }
  };

  if (!fileId) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-6xl w-full max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <div>
            <h2 className="text-lg font-semibold">Data Preview</h2>
            <p className="text-sm text-gray-600">{fileName || `File ${fileId}`}</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            title="Close preview"
            aria-label="Close preview"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto p-4">
          {loading && (
            <div className="text-center py-12">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              <p className="mt-2 text-sm text-gray-600">Loading preview...</p>
            </div>
          )}

          {error && (
            <div className="text-center py-12">
              <p className="text-red-600">{error}</p>
              <Button onClick={loadSample} className="mt-4" size="sm">
                Retry
              </Button>
            </div>
          )}

          {sample && (
            <div className="space-y-6">
              {/* Stats */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-blue-50 rounded-lg p-3">
                  <p className="text-xs text-blue-600 font-medium">Total Rows</p>
                  <p className="text-2xl font-bold text-blue-900">
                    {sample.total_rows.toLocaleString()}
                  </p>
                </div>
                <div className="bg-green-50 rounded-lg p-3">
                  <p className="text-xs text-green-600 font-medium">Columns</p>
                  <p className="text-2xl font-bold text-green-900">
                    {sample.columns.length}
                  </p>
                </div>
                <div className="bg-purple-50 rounded-lg p-3">
                  <p className="text-xs text-purple-600 font-medium">Preview Rows</p>
                  <p className="text-2xl font-bold text-purple-900">
                    {sample.sample_data.length}
                  </p>
                </div>
                <div className="bg-orange-50 rounded-lg p-3">
                  <p className="text-xs text-orange-600 font-medium">Format</p>
                  <p className="text-2xl font-bold text-orange-900">
                    {sample.filename.split('.').pop()?.toUpperCase()}
                  </p>
                </div>
              </div>

              {/* Column Stats */}
              {sample.column_stats && Object.keys(sample.column_stats).length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold mb-3">Column Statistics</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    {Object.entries(sample.column_stats).map(([column, stats]: [string, any]) => (
                      <div key={column} className="border rounded-lg p-3 bg-gray-50">
                        <p className="font-medium text-sm mb-2">{column}</p>
                        <div className="text-xs space-y-1 text-gray-600">
                          {stats.dtype && (
                            <p><span className="font-medium">Type:</span> {stats.dtype}</p>
                          )}
                          {stats.null_count !== undefined && (
                            <p><span className="font-medium">Nulls:</span> {stats.null_count}</p>
                          )}
                          {stats.unique_count !== undefined && (
                            <p><span className="font-medium">Unique:</span> {stats.unique_count}</p>
                          )}
                          {stats.min !== undefined && (
                            <p><span className="font-medium">Min:</span> {stats.min}</p>
                          )}
                          {stats.max !== undefined && (
                            <p><span className="font-medium">Max:</span> {stats.max}</p>
                          )}
                          {stats.mean !== undefined && (
                            <p><span className="font-medium">Mean:</span> {stats.mean.toFixed(2)}</p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Sample Data Table */}
              <div>
                <h3 className="text-sm font-semibold mb-3">Sample Data (First 10 Rows)</h3>
                <div className="overflow-x-auto border rounded-lg">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        {sample.columns.map(column => (
                          <th
                            key={column}
                            className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap"
                          >
                            {column}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {sample.sample_data.map((row, idx) => (
                        <tr key={idx} className="hover:bg-gray-50">
                          {sample.columns.map(column => (
                            <td
                              key={column}
                              className="px-4 py-3 text-sm text-gray-900 whitespace-nowrap"
                            >
                              {row[column] !== null && row[column] !== undefined
                                ? String(row[column])
                                : <span className="text-gray-400 italic">null</span>
                              }
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 p-4 border-t">
          <Button onClick={onClose} variant="secondary">
            Close
          </Button>
        </div>
      </div>
    </div>
  );
}
