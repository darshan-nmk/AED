/**
 * Frontend Pipeline Validation Utilities
 * 
 * Client-side validation before sending to backend
 */

import { Node, Edge } from 'reactflow';

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

/**
 * Validate pipeline structure on the frontend
 */
export function validatePipeline(nodes: Node[], edges: Edge[]): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Check if pipeline has nodes
  if (nodes.length === 0) {
    errors.push('Pipeline must contain at least one node');
    return { valid: false, errors, warnings };
  }

  // Check for cycles
  const cycleErrors = detectCycles(nodes, edges);
  errors.push(...cycleErrors);

  // Check for orphan nodes
  const orphanErrors = detectOrphanNodes(nodes, edges);
  errors.push(...orphanErrors);

  // Check node configurations
  const configErrors = validateNodeConfigurations(nodes);
  errors.push(...configErrors);

  // Check for at least one source and one load
  const structureErrors = validatePipelineStructure(nodes);
  errors.push(...structureErrors);

  // Add warnings
  if (nodes.length > 50) {
    warnings.push('Large pipeline: Consider breaking into smaller pipelines for better performance');
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Detect cycles in the graph using DFS
 */
function detectCycles(nodes: Node[], edges: Edge[]): string[] {
  const errors: string[] = [];
  
  // Build adjacency list
  const adjacency: Record<string, string[]> = {};
  nodes.forEach(node => {
    adjacency[node.id] = [];
  });

  edges.forEach(edge => {
    if (adjacency[edge.source]) {
      adjacency[edge.source].push(edge.target);
    }
  });

  // DFS to detect cycles
  const visited = new Set<string>();
  const recStack = new Set<string>();

  function dfs(nodeId: string, path: string[]): boolean {
    visited.add(nodeId);
    recStack.add(nodeId);
    path.push(nodeId);

    for (const neighbor of adjacency[nodeId] || []) {
      if (!visited.has(neighbor)) {
        if (dfs(neighbor, path)) {
          return true;
        }
      } else if (recStack.has(neighbor)) {
        // Cycle detected
        const cycleStart = path.indexOf(neighbor);
        const cycle = [...path.slice(cycleStart), neighbor].join(' → ');
        errors.push(`Cycle detected: ${cycle}`);
        return true;
      }
    }

    recStack.delete(nodeId);
    path.pop();
    return false;
  }

  nodes.forEach(node => {
    if (!visited.has(node.id)) {
      dfs(node.id, []);
    }
  });

  return errors;
}

/**
 * Detect orphan nodes (nodes with invalid connections)
 */
function detectOrphanNodes(nodes: Node[], edges: Edge[]): string[] {
  const errors: string[] = [];

  // Build connection sets
  const nodesWithIncoming = new Set<string>();
  const nodesWithOutgoing = new Set<string>();

  edges.forEach(edge => {
    nodesWithOutgoing.add(edge.source);
    nodesWithIncoming.add(edge.target);
  });

  nodes.forEach(node => {
    const hasIncoming = nodesWithIncoming.has(node.id);
    const hasOutgoing = nodesWithOutgoing.has(node.id);
    const nodeType = node.data?.type;

    if (nodeType === 'SOURCE') {
      if (!hasOutgoing) {
        errors.push(`Source node '${node.data?.label || node.id}' has no outgoing connections`);
      }
    } else if (nodeType === 'LOAD') {
      if (!hasIncoming) {
        errors.push(`Load node '${node.data?.label || node.id}' has no incoming connections`);
      }
    } else if (nodeType === 'TRANSFORM') {
      if (!hasIncoming) {
        errors.push(`Transform node '${node.data?.label || node.id}' has no incoming connections`);
      }
      if (!hasOutgoing) {
        errors.push(`Transform node '${node.data?.label || node.id}' has no outgoing connections`);
      }
    } else if (!hasIncoming && !hasOutgoing) {
      errors.push(`Node '${node.data?.label || node.id}' has no connections`);
    }
  });

  return errors;
}

/**
 * Validate node configurations
 */
function validateNodeConfigurations(nodes: Node[]): string[] {
  const errors: string[] = [];

  nodes.forEach(node => {
    const { data } = node;
    const nodeId = data?.label || node.id;
    const subtype = data?.subtype;
    const config = data?.config || {};

    switch (subtype) {
      case 'CSV_SOURCE':
      case 'EXCEL_SOURCE':
      case 'JSON_SOURCE':
        if (!config.file_path) {
          errors.push(`Node '${nodeId}': File source requires 'file_path'`);
        }
        break;

      case 'DB_SOURCE':
        if (!config.connection_string) {
          errors.push(`Node '${nodeId}': Database source requires 'connection_string'`);
        }
        if (!config.table_name && !config.query) {
          errors.push(`Node '${nodeId}': Database source requires 'table_name' or 'query'`);
        }
        break;

      case 'FILTER':
        if (!config.column) {
          errors.push(`Node '${nodeId}': Filter requires 'column'`);
        }
        if (!config.operator) {
          errors.push(`Node '${nodeId}': Filter requires 'operator'`);
        }
        if (config.value === undefined || config.value === null || config.value === '') {
          errors.push(`Node '${nodeId}': Filter requires 'value'`);
        }
        break;

      case 'SELECT':
        if (!config.columns || config.columns.length === 0) {
          errors.push(`Node '${nodeId}': Select requires at least one column`);
        }
        break;

      case 'RENAME':
        if (!config.mapping || Object.keys(config.mapping).length === 0) {
          errors.push(`Node '${nodeId}': Rename requires column mappings`);
        }
        break;

      case 'CAST':
        if (!config.column) {
          errors.push(`Node '${nodeId}': Cast requires 'column'`);
        }
        if (!config.dtype) {
          errors.push(`Node '${nodeId}': Cast requires 'dtype'`);
        }
        break;

      case 'AGGREGATE':
        if (!config.group_by || config.group_by.length === 0) {
          errors.push(`Node '${nodeId}': Aggregate requires 'group_by' columns`);
        }
        if (!config.aggregations || Object.keys(config.aggregations).length === 0) {
          errors.push(`Node '${nodeId}': Aggregate requires aggregation functions`);
        }
        break;

      case 'JOIN':
        if (!config.join_type) {
          errors.push(`Node '${nodeId}': Join requires 'join_type'`);
        }
        if (!config.left_on || !config.right_on) {
          errors.push(`Node '${nodeId}': Join requires 'left_on' and 'right_on' keys`);
        }
        break;

      case 'CSV_LOAD':
      case 'EXCEL_LOAD':
      case 'JSON_LOAD':
        if (!config.output_path) {
          errors.push(`Node '${nodeId}': Load requires 'output_path'`);
        }
        break;

      case 'DB_LOAD':
        if (!config.connection_string) {
          errors.push(`Node '${nodeId}': Database load requires 'connection_string'`);
        }
        if (!config.table_name) {
          errors.push(`Node '${nodeId}': Database load requires 'table_name'`);
        }
        break;
    }
  });

  return errors;
}

/**
 * Validate overall pipeline structure
 */
function validatePipelineStructure(nodes: Node[]): string[] {
  const errors: string[] = [];

  const sourceNodes = nodes.filter(n => n.data?.type === 'SOURCE');
  const loadNodes = nodes.filter(n => n.data?.type === 'LOAD');

  if (sourceNodes.length === 0) {
    errors.push('Pipeline must have at least one SOURCE node');
  }

  if (loadNodes.length === 0) {
    errors.push('Pipeline must have at least one LOAD node');
  }

  return errors;
}
