import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Save, Play, ArrowLeft, CheckCircle, AlertTriangle, Lightbulb } from 'lucide-react';
import ReactFlow, {
  Node,
  addEdge,
  Background,
  Controls,
  MiniMap,
  Connection,
  useNodesState,
  useEdgesState,
  ReactFlowProvider,
} from 'reactflow';
import 'reactflow/dist/style.css';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { pipelineAPI, Pipeline, FileSample, Suggestion, runAPI, fileAPI } from '@/services/api';
import CustomNode from '@/components/editor/CustomNode';
import NodePalette from '@/components/editor/NodePalette';
import NodeConfigPanel from '@/components/editor/NodeConfigPanel';
import SuggestionsPanel from '@/components/editor/SuggestionsPanel';
import { validatePipeline, ValidationResult } from '@/utils/validation';
import { useToast } from '@/contexts/ToastContext';

const nodeTypes = {
  custom: CustomNode,
};

function EditorPageContent() {
  const { id } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const [_pipeline, setPipeline] = useState<Pipeline | null>(null);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [running, setRunning] = useState(false);
  const [validating, setValidating] = useState(false);
  const [selectedNode, setSelectedNode] = useState<Node | null>(null);
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  
  // New state for features
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [validationResult, setValidationResult] = useState<ValidationResult | null>(null);
  const [currentFileSample, setCurrentFileSample] = useState<FileSample | null>(null);
  const [loadingSample, setLoadingSample] = useState(false);
  
  const isNewPipeline = id === 'new';

  useEffect(() => {
    if (!isNewPipeline) {
      loadPipeline();
    }
  }, [id]);

  const loadPipeline = async () => {
    if (!id || id === 'new') return;
    
    try {
      setLoading(true);
      const data = await pipelineAPI.get(parseInt(id));
      setPipeline(data);
      setName(data.name);
      setDescription(data.description || '');
      
      // Load nodes and edges
      if (data.pipeline_json?.nodes) {
        const flowNodes = data.pipeline_json.nodes.map((node: any) => ({
          id: node.id,
          type: 'custom',
          position: { x: node.position_x || 0, y: node.position_y || 0 },
          data: {
            label: node.id,
            type: node.type,
            subtype: node.subtype,
            config: node.config,
          },
        }));
        setNodes(flowNodes);
      }
      
      if (data.pipeline_json?.edges) {
        const flowEdges = data.pipeline_json.edges.map((edge: any, idx: number) => ({
          id: `edge-${idx}`,
          source: edge.from,
          target: edge.to,
          type: 'smoothstep',
          animated: true,
        }));
        setEdges(flowEdges);
      }
    } catch (err) {
      console.error('Failed to load pipeline', err);
    } finally {
      setLoading(false);
    }
  };

  const onConnect = useCallback(
    (params: Connection) => setEdges((eds) => addEdge({ ...params, animated: true, type: 'smoothstep' }, eds)),
    [setEdges]
  );

  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }, []);

  const onDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();

      const reactFlowBounds = (event.target as HTMLElement).getBoundingClientRect();
      const nodeData = event.dataTransfer.getData('application/reactflow');

      if (!nodeData) return;

      const nodeType = JSON.parse(nodeData);
      const position = {
        x: event.clientX - reactFlowBounds.left - 90,
        y: event.clientY - reactFlowBounds.top - 20,
      };

      const newNode: Node = {
        id: `${nodeType.subtype}_${Date.now()}`,
        type: 'custom',
        position,
        data: {
          label: nodeType.label,
          type: nodeType.type,
          subtype: nodeType.subtype,
          config: {},
        },
      };

      setNodes((nds) => nds.concat(newNode));
    },
    [setNodes]
  );

  const onNodeClick = useCallback((_event: React.MouseEvent, node: Node) => {
    setSelectedNode(node);
  }, []);

  const onPaneClick = useCallback(() => {
    setSelectedNode(null);
  }, []);

  const handleNodeUpdate = (nodeId: string, data: any) => {
    console.log('handleNodeUpdate called for node:', nodeId, 'with data:', data);
    setNodes((nds) =>
      nds.map((node) => {
        if (node.id === nodeId) {
          const updatedNode = { ...node, data };
          console.log('Updated node:', updatedNode);
          return updatedNode;
        }
        return node;
      })
    );
  };

  // Sync selectedNode with nodes array when it changes
  useEffect(() => {
    if (selectedNode) {
      const updatedNode = nodes.find(n => n.id === selectedNode.id);
      if (updatedNode && updatedNode.data !== selectedNode.data) {
        setSelectedNode(updatedNode);
      }
    }
  }, [nodes, selectedNode]);

  const handleNodeDelete = (nodeId: string) => {
    setNodes((nds) => nds.filter((node) => node.id !== nodeId));
    setEdges((eds) => eds.filter((edge) => edge.source !== nodeId && edge.target !== nodeId));
    setSelectedNode(null);
  };

  // Validate pipeline before save/run
  const handleValidate = async () => {
    setValidating(true);
    
    // Client-side validation
    const clientValidation = validatePipeline(nodes, edges);
    setValidationResult(clientValidation);
    
    // If client validation passes and pipeline is saved, also validate on server
    if (clientValidation.valid && !isNewPipeline) {
      try {
        const serverValidation = await pipelineAPI.validate(parseInt(id!));
        
        setValidationResult({
          valid: serverValidation.valid && clientValidation.valid,
          errors: [...clientValidation.errors, ...serverValidation.errors],
          warnings: [...clientValidation.warnings, ...serverValidation.warnings],
        });
      } catch (err) {
        console.error('Server validation failed:', err);
      }
    }
    
    setValidating(false);
  };

  const handleSave = async () => {
    if (!name.trim()) {
      toast.warning('Please enter a pipeline name');
      return;
    }

    // Validate before save
    const validation = validatePipeline(nodes, edges);
    if (!validation.valid) {
      setValidationResult(validation);
      toast.error(`Cannot save: ${validation.errors.join(', ')}`);
      return;
    }

    try {
      setSaving(true);
      
      // Convert nodes and edges to backend format
      const pipelineNodes = nodes.map((node) => ({
        id: node.id,
        type: node.data.type,
        subtype: node.data.subtype,
        config: node.data.config || {},
        position_x: node.position.x,
        position_y: node.position.y,
      }));

      const pipelineEdges = edges.map((edge) => ({
        from: edge.source,
        to: edge.target,
      }));

      if (isNewPipeline) {
        const newPipeline = await pipelineAPI.create({
          name: name.trim(),
          description: description.trim() || undefined,
          nodes: pipelineNodes,
          edges: pipelineEdges,
        });
        toast.success('Pipeline created successfully!');
        navigate(`/pipelines/${newPipeline.id}/editor`);
      } else {
        const updated = await pipelineAPI.update(parseInt(id!), {
          name: name.trim(),
          description: description.trim() || undefined,
          nodes: pipelineNodes,
          edges: pipelineEdges,
        });
        setPipeline(updated);
        setValidationResult(null); // Clear validation after successful save
        toast.success('Pipeline saved successfully!');
      }
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Failed to save pipeline');
    } finally {
      setSaving(false);
    }
  };

  const handleRun = async () => {
    if (isNewPipeline) {
      toast.warning('Please save the pipeline before running');
      return;
    }

    // Validate before run
    const validation = validatePipeline(nodes, edges);
    if (!validation.valid) {
      setValidationResult(validation);
      toast.error(`Cannot run: ${validation.errors.join(', ')}`);
      return;
    }

    try {
      setRunning(true);
      const run = await runAPI.trigger(parseInt(id!), true);
      toast.success(`Pipeline started! Run ID: ${run.id}`);
      navigate(`/runs/${run.id}`);
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Failed to start pipeline');
    } finally {
      setRunning(false);
    }
  };

  // Load file sample from source nodes
  const loadFileSampleFromSources = async () => {
    setLoadingSample(true);
    try {
      // Find source nodes with uploaded files
      const sourceNodes = nodes.filter(
        (node) => node.data.type === 'SOURCE' && node.data.config?.file_path
      );

      if (sourceNodes.length === 0) {
        toast.warning('No source files found. Please upload a file in a source node first.');
        return;
      }

      // Use the first source node
      const sourceNode = sourceNodes[0];
      const fileId = sourceNode.data.config.file_id;
      
      if (!fileId) {
        toast.error('No file ID found in source node. Please re-upload the file.');
        return;
      }

      // Fetch file sample
      const sample = await fileAPI.getSample(fileId);
      setCurrentFileSample(sample);
      setShowSuggestions(true);
    } catch (error: any) {
      console.error('Failed to load file sample:', error);
      toast.error(error.response?.data?.detail || 'Failed to load file sample');
    } finally {
      setLoadingSample(false);
    }
  };

  // Suggestion handlers
  const handleApplySuggestion = (suggestion: Suggestion) => {
    // Create a transform node based on the suggestion
    const newNode: Node = {
      id: `${suggestion.type}_${Date.now()}`,
      type: 'custom',
      position: { x: 300, y: 100 + nodes.length * 20 },
      data: {
        label: suggestion.type.replace(/_/g, ' '),
        type: 'TRANSFORM',
        subtype: suggestion.type,
        config: suggestion.config,
      },
    };
    
    setNodes((nds) => [...nds, newNode]);
    toast.success(`Applied suggestion: ${suggestion.suggestion}`);
  };

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-slate-600 dark:text-slate-400">Loading pipeline...</div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="border-b border-slate-800 bg-slate-900/50 px-6 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate('/pipelines')}
            >
              <ArrowLeft size={16} className="mr-2" />
              Back
            </Button>
            <div className="flex items-center gap-3">
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Pipeline name"
                className="w-64"
              />
              <Input
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Description (optional)"
                className="w-80"
              />
            </div>
          </div>
          <div className="flex items-center gap-2">
            {/* Validation Status */}
            {validationResult && (
              <div className={`flex items-center gap-2 px-3 py-1 rounded text-sm ${
                validationResult.valid 
                  ? 'bg-green-100 text-green-700' 
                  : 'bg-red-100 text-red-700'
              }`}>
                {validationResult.valid ? (
                  <><CheckCircle size={14} /> Valid</>
                ) : (
                  <><AlertTriangle size={14} /> {validationResult.errors.length} errors</>
                )}
              </div>
            )}
            
            {/* Action buttons */}
            <Button
              variant="ghost"
              size="sm"
              onClick={loadFileSampleFromSources}
              disabled={loadingSample}
              title="AI Suggestions"
            >
              <Lightbulb size={16} className="mr-2" />
              {loadingSample ? 'Loading...' : 'Suggest'}
            </Button>
            
            <Button
              variant="ghost"
              size="sm"
              onClick={handleValidate}
              disabled={validating}
            >
              {validating ? 'Validating...' : 'Validate'}
            </Button>
            
            <Button
              variant="ghost"
              size="sm"
              onClick={handleSave}
              disabled={saving}
            >
              <Save size={16} className="mr-2" />
              {saving ? 'Saving...' : 'Save'}
            </Button>
            
            {!isNewPipeline && (
              <Button
                size="sm"
                onClick={handleRun}
                disabled={running}
              >
                <Play size={16} className="mr-2" />
                {running ? 'Running...' : 'Run'}
              </Button>
            )}
          </div>
        </div>
        
        {/* Validation errors display */}
        {validationResult && !validationResult.valid && (
          <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded text-sm">
            <p className="font-semibold text-red-800 mb-1">Validation Errors:</p>
            <ul className="list-disc list-inside text-red-700 space-y-1">
              {validationResult.errors.map((error, idx) => (
                <li key={idx}>{error}</li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* Main Editor */}
      <div className="flex-1 flex overflow-hidden">
        {/* Node Palette */}
        <NodePalette />

        {/* React Flow Canvas */}
        <div className="flex-1 bg-slate-950 relative h-[calc(100vh-140px)]">
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            onDrop={onDrop}
            onDragOver={onDragOver}
            onNodeClick={onNodeClick}
            onPaneClick={onPaneClick}
            nodeTypes={nodeTypes}
            fitView
            className="bg-slate-950"
          >
            <Background className="bg-slate-950" />
            <Controls className="bg-slate-800 border-slate-700" />
            <MiniMap
              className="bg-slate-900 border border-slate-700"
              nodeColor={(node) => {
                switch (node.data.type) {
                  case 'SOURCE':
                    return '#3b82f6';
                  case 'TRANSFORM':
                    return '#22c55e';
                  case 'LOAD':
                    return '#a855f7';
                  default:
                    return '#64748b';
                }
              }}
            />
          </ReactFlow>
        </div>

        {/* Right Sidebar - Suggestions */}
        {showSuggestions && (
          <div className="w-80 border-l border-slate-700 bg-slate-900 flex flex-col">
            <SuggestionsPanel
              fileSample={currentFileSample}
              onApplySuggestion={handleApplySuggestion}
              onClose={() => setShowSuggestions(false)}
            />
          </div>
        )}

        {/* Node Configuration Panel */}
        {selectedNode && !showSuggestions && (
          <NodeConfigPanel
            node={selectedNode}
            nodes={nodes}
            edges={edges}
            pipelineName={name}
            onClose={() => setSelectedNode(null)}
            onUpdate={handleNodeUpdate}
            onDelete={handleNodeDelete}
          />
        )}
      </div>
    </div>
  );
}

export default function EditorPage() {
  return (
    <ReactFlowProvider>
      <EditorPageContent />
    </ReactFlowProvider>
  );
}
