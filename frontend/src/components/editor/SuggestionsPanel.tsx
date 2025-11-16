import { useState, useEffect } from 'react';
import { Lightbulb, Plus, X } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { suggestionsAPI, Suggestion, FileSample } from '@/services/api';

interface SuggestionsPanelProps {
  fileSample: FileSample | null;
  onApplySuggestion?: (suggestion: Suggestion) => void;
  onClose?: () => void;
}

export default function SuggestionsPanel({ fileSample, onApplySuggestion, onClose }: SuggestionsPanelProps) {
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [dismissed, setDismissed] = useState<Set<number>>(new Set());

  useEffect(() => {
    if (fileSample && fileSample.column_stats) {
      loadSuggestions();
    }
  }, [fileSample]);

  const loadSuggestions = async () => {
    if (!fileSample?.column_stats) return;
    
    setLoading(true);
    try {
      const result = await suggestionsAPI.fromSample(fileSample.column_stats);
      setSuggestions(result);
      setDismissed(new Set());
    } catch (error) {
      console.error('Failed to load suggestions:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDismiss = (index: number) => {
    setDismissed(prev => new Set([...prev, index]));
  };

  const handleApply = (suggestion: Suggestion, index: number) => {
    if (onApplySuggestion) {
      onApplySuggestion(suggestion);
    }
    handleDismiss(index);
  };

  const visibleSuggestions = suggestions.filter((_, idx) => !dismissed.has(idx));

  const getSuggestionIcon = (_type: string) => {
    // You can customize icons based on suggestion type
    return <Lightbulb className="h-4 w-4" />;
  };

  const getSuggestionColor = (priority: number) => {
    if (priority >= 8) return 'border-red-200 bg-red-50';
    if (priority >= 5) return 'border-yellow-200 bg-yellow-50';
    return 'border-blue-200 bg-blue-50';
  };

  const getPriorityLabel = (priority: number) => {
    if (priority >= 8) return 'High';
    if (priority >= 5) return 'Medium';
    return 'Low';
  };

  if (!fileSample) {
    return (
      <div className="p-4 text-center text-slate-400">
        <Lightbulb className="h-8 w-8 mx-auto mb-2 text-slate-500" />
        <p className="text-sm">Click "Suggest" to analyze your source data</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <div className="p-4 border-b">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-semibold">AI Suggestions</h3>
          <div className="flex items-center gap-2">
            {suggestions.length > 0 && (
              <span className="text-xs text-gray-500">
                {visibleSuggestions.length} of {suggestions.length}
              </span>
            )}
            {onClose && (
              <button
                onClick={onClose}
                className="p-1 hover:bg-gray-100 rounded transition-colors"
                title="Close suggestions"
                aria-label="Close suggestions"
              >
                <X className="h-4 w-4 text-gray-500" />
              </button>
            )}
          </div>
        </div>
        <p className="text-xs text-gray-600">
          Based on your data, here are recommended transformations
        </p>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        {loading ? (
          <div className="text-center py-8">
            <div className="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
            <p className="mt-2 text-xs text-gray-600">Analyzing data...</p>
          </div>
        ) : visibleSuggestions.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <p className="text-sm">No suggestions available</p>
            {dismissed.size > 0 && (
              <Button
                size="sm"
                onClick={() => setDismissed(new Set())}
                className="mt-4"
              >
                Show Dismissed ({dismissed.size})
              </Button>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {visibleSuggestions.map((suggestion) => {
              const originalIdx = suggestions.indexOf(suggestion);
              return (
                <div
                  key={originalIdx}
                  className={`border rounded-lg p-3 transition-all ${getSuggestionColor(suggestion.priority)}`}
                >
                  <div className="flex items-start gap-2 mb-2">
                    <div className="mt-0.5">
                      {getSuggestionIcon(suggestion.type)}
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-semibold text-gray-700">
                          {suggestion.type.replace(/_/g, ' ')}
                        </span>
                        <span className={`text-xs px-2 py-0.5 rounded ${
                          suggestion.priority >= 8 
                            ? 'bg-red-100 text-red-700'
                            : suggestion.priority >= 5
                            ? 'bg-yellow-100 text-yellow-700'
                            : 'bg-blue-100 text-blue-700'
                        }`}>
                          {getPriorityLabel(suggestion.priority)}
                        </span>
                      </div>
                      
                      {suggestion.column && (
                        <p className="text-xs text-gray-600 mb-1">
                          Column: <span className="font-medium">{suggestion.column}</span>
                        </p>
                      )}
                      
                      <p className="text-sm text-gray-800">
                        {suggestion.suggestion}
                      </p>

                      {suggestion.config && Object.keys(suggestion.config).length > 0 && (
                        <details className="mt-2">
                          <summary className="text-xs text-gray-600 cursor-pointer hover:text-gray-800">
                            View configuration
                          </summary>
                          <pre className="mt-1 text-xs bg-white p-2 rounded border overflow-x-auto">
                            {JSON.stringify(suggestion.config, null, 2)}
                          </pre>
                        </details>
                      )}
                    </div>

                    <button
                      onClick={() => handleDismiss(originalIdx)}
                      className="p-1 hover:bg-white rounded transition-colors"
                      title="Dismiss suggestion"
                      aria-label="Dismiss suggestion"
                    >
                      <X className="h-4 w-4 text-gray-500" />
                    </button>
                  </div>

                  <div className="flex gap-2 mt-3">
                    <Button
                      size="sm"
                      onClick={() => handleApply(suggestion, originalIdx)}
                      className="flex items-center gap-1"
                    >
                      <Plus className="h-3 w-3" />
                      Apply
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
