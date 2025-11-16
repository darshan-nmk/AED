import { useState, useRef } from 'react';
import { Upload, File, X, Eye } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { fileAPI, UploadedFile } from '@/services/api';

interface FileUploadPanelProps {
  onFileSelect?: (file: UploadedFile) => void;
  onPreview?: (fileId: number) => void;
}

export default function FileUploadPanel({ onFileSelect, onPreview }: FileUploadPanelProps) {
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [uploading, setUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const loadFiles = async () => {
    try {
      const uploadedFiles = await fileAPI.list();
      setFiles(uploadedFiles);
    } catch (error) {
      console.error('Failed to load files:', error);
    }
  };

  useState(() => {
    loadFiles();
  });

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      await handleFiles(e.dataTransfer.files);
    }
  };

  const handleChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      await handleFiles(e.target.files);
    }
  };

  const handleFiles = async (fileList: FileList) => {
    setUploading(true);
    
    try {
      for (let i = 0; i < fileList.length; i++) {
        const file = fileList[i];
        
        // Check file type
        const validTypes = [
          'text/csv',
          'application/vnd.ms-excel',
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          'application/json'
        ];
        
        if (!validTypes.includes(file.type) && 
            !file.name.endsWith('.csv') && 
            !file.name.endsWith('.xlsx') && 
            !file.name.endsWith('.json')) {
          alert(`Unsupported file type: ${file.name}`);
          continue;
        }

        // Upload file
        await fileAPI.upload(file);
      }
      
      // Reload the file list to get the complete file info
      await loadFiles();
    } catch (error: any) {
      alert(`Upload failed: ${error.response?.data?.detail || error.message}`);
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (fileId: number) => {
    try {
      await fileAPI.delete(fileId);
      setFiles(prev => prev.filter(f => f.id !== fileId));
    } catch (error) {
      console.error('Failed to delete file:', error);
      alert('Failed to delete file');
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  return (
    <div className="flex flex-col h-full">
      {/* Upload Area */}
      <div className="p-4 border-b">
        <h3 className="text-sm font-semibold mb-3">Upload Data Files</h3>
        
        <div
          className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
            dragActive 
              ? 'border-blue-500 bg-blue-50' 
              : 'border-gray-300 hover:border-gray-400'
          }`}
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
        >
          <Upload className="mx-auto h-8 w-8 text-gray-400 mb-2" />
          <p className="text-sm text-gray-600 mb-2">
            Drag & drop files here, or click to browse
          </p>
          <p className="text-xs text-gray-500 mb-3">
            Supports CSV, Excel (.xlsx), JSON
          </p>
          
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept=".csv,.xlsx,.json,application/json,text/csv,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
            onChange={handleChange}
            className="hidden"
            aria-label="Upload files"
          />
          
          <Button
            size="sm"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
          >
            {uploading ? 'Uploading...' : 'Choose Files'}
          </Button>
        </div>
      </div>

      {/* File List */}
      <div className="flex-1 overflow-y-auto p-4">
        <h3 className="text-sm font-semibold mb-3">Uploaded Files ({files.length})</h3>
        
        {files.length === 0 ? (
          <p className="text-sm text-gray-500 text-center py-8">
            No files uploaded yet
          </p>
        ) : (
          <div className="space-y-2">
            {files.map(file => (
              <div
                key={file.id}
                className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <File className="h-4 w-4 text-blue-500 flex-shrink-0" />
                
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">
                    {file.original_filename}
                  </p>
                  <p className="text-xs text-gray-500">
                    {formatFileSize(file.file_size)} • {file.file_type}
                  </p>
                </div>

                <div className="flex items-center gap-1 flex-shrink-0">
                  <button
                    onClick={() => onPreview?.(file.id)}
                    className="p-1 hover:bg-gray-200 rounded"
                    title="Preview data"
                  >
                    <Eye className="h-4 w-4 text-gray-600" />
                  </button>
                  
                  <button
                    onClick={() => {
                      if (onFileSelect) {
                        onFileSelect(file);
                      }
                    }}
                    className="px-2 py-1 text-xs bg-blue-500 text-white rounded hover:bg-blue-600"
                  >
                    Use
                  </button>
                  
                  <button
                    onClick={() => handleDelete(file.id)}
                    className="p-1 hover:bg-red-100 rounded"
                    title="Delete file"
                  >
                    <X className="h-4 w-4 text-red-500" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
