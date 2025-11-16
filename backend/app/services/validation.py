"""
Pipeline Validation Service

Validates pipeline structure, configuration, and data schema before execution.
"""

from typing import Dict, Any, List, Tuple, Set, Optional
import pandas as pd
from app.utils.file_utils import load_csv, load_excel, load_json


class ValidationError(Exception):
    """Custom exception for validation errors"""
    pass


def validate_pipeline(pipeline_json: Dict[str, Any]) -> Tuple[bool, List[str]]:
    """
    Comprehensive pipeline validation.
    
    Returns:
        Tuple of (is_valid, list of error messages)
    """
    errors = []
    nodes = pipeline_json.get('nodes', [])
    edges = pipeline_json.get('edges', [])
    
    if not nodes:
        errors.append("Pipeline must contain at least one node")
        return False, errors
    
    # 1. Check for cycles (DAG validation)
    cycle_errors = detect_cycles(nodes, edges)
    errors.extend(cycle_errors)
    
    # 2. Check for orphan nodes
    orphan_errors = detect_orphan_nodes(nodes, edges)
    errors.extend(orphan_errors)
    
    # 3. Validate node configurations
    config_errors = validate_node_configs(nodes)
    errors.extend(config_errors)
    
    # 4. Validate edge connections
    edge_errors = validate_edges(nodes, edges)
    errors.extend(edge_errors)
    
    # 5. Validate pipeline structure
    structure_errors = validate_pipeline_structure(nodes, edges)
    errors.extend(structure_errors)
    
    return len(errors) == 0, errors


def detect_cycles(nodes: List[Dict], edges: List[Dict]) -> List[str]:
    """
    Detect cycles in the pipeline graph using DFS.
    """
    errors = []
    
    # Build adjacency list
    adjacency = {node['id']: [] for node in nodes}
    for edge in edges:
        from_node = edge.get('from') or edge.get('from_node') or edge.get('source')
        to_node = edge.get('to') or edge.get('to_node') or edge.get('target')
        if from_node and to_node:
            adjacency[from_node].append(to_node)
    
    # DFS to detect cycles
    visited = set()
    rec_stack = set()
    
    def dfs(node_id: str, path: List[str]) -> bool:
        """Returns True if cycle detected"""
        visited.add(node_id)
        rec_stack.add(node_id)
        path.append(node_id)
        
        for neighbor in adjacency.get(node_id, []):
            if neighbor not in visited:
                if dfs(neighbor, path):
                    return True
            elif neighbor in rec_stack:
                # Cycle detected
                cycle_start = path.index(neighbor)
                cycle = ' → '.join(path[cycle_start:] + [neighbor])
                errors.append(f"Cycle detected: {cycle}")
                return True
        
        rec_stack.remove(node_id)
        path.pop()
        return False
    
    for node in nodes:
        if node['id'] not in visited:
            dfs(node['id'], [])
    
    return errors


def detect_orphan_nodes(nodes: List[Dict], edges: List[Dict]) -> List[str]:
    """
    Detect nodes with no connections (orphans).
    LOAD nodes can have only incoming edges.
    SOURCE nodes can have only outgoing edges.
    TRANSFORM nodes must have both incoming and outgoing edges.
    """
    errors = []
    
    # Build connection sets
    nodes_with_incoming = set()
    nodes_with_outgoing = set()
    
    for edge in edges:
        from_node = edge.get('from') or edge.get('from_node') or edge.get('source')
        to_node = edge.get('to') or edge.get('to_node') or edge.get('target')
        if from_node:
            nodes_with_outgoing.add(from_node)
        if to_node:
            nodes_with_incoming.add(to_node)
    
    for node in nodes:
        node_id = node['id']
        node_type = node.get('type')
        
        has_incoming = node_id in nodes_with_incoming
        has_outgoing = node_id in nodes_with_outgoing
        
        if node_type == 'SOURCE':
            if not has_outgoing:
                errors.append(f"Source node '{node_id}' has no outgoing connections")
        elif node_type == 'LOAD':
            if not has_incoming:
                errors.append(f"Load node '{node_id}' has no incoming connections")
        elif node_type == 'TRANSFORM':
            if not has_incoming:
                errors.append(f"Transform node '{node_id}' has no incoming connections")
            if not has_outgoing:
                errors.append(f"Transform node '{node_id}' has no outgoing connections")
        else:
            # Unknown type - check if completely orphaned
            if not has_incoming and not has_outgoing:
                errors.append(f"Node '{node_id}' has no connections")
    
    return errors


def validate_node_configs(nodes: List[Dict]) -> List[str]:
    """
    Validate that each node has required configuration.
    """
    errors = []
    
    for node in nodes:
        node_id = node['id']
        node_type = node.get('type')
        subtype = node.get('subtype')
        config = node.get('config', {})
        
        # Validate based on subtype
        if subtype == 'CSV_SOURCE':
            if not config.get('file_path'):
                errors.append(f"Node '{node_id}': CSV source requires 'file_path'")
        
        elif subtype == 'EXCEL_SOURCE':
            if not config.get('file_path'):
                errors.append(f"Node '{node_id}': Excel source requires 'file_path'")
        
        elif subtype == 'JSON_SOURCE':
            if not config.get('file_path'):
                errors.append(f"Node '{node_id}': JSON source requires 'file_path'")
        
        elif subtype == 'DB_SOURCE':
            if not config.get('connection_string'):
                errors.append(f"Node '{node_id}': Database source requires 'connection_string'")
            if not config.get('table_name') and not config.get('query'):
                errors.append(f"Node '{node_id}': Database source requires 'table_name' or 'query'")
        
        elif subtype == 'FILTER':
            if not config.get('column'):
                errors.append(f"Node '{node_id}': Filter requires 'column'")
            if not config.get('operator'):
                errors.append(f"Node '{node_id}': Filter requires 'operator'")
            if 'value' not in config:
                errors.append(f"Node '{node_id}': Filter requires 'value'")
        
        elif subtype == 'SELECT':
            if not config.get('columns'):
                errors.append(f"Node '{node_id}': Select requires 'columns' list")
        
        elif subtype == 'RENAME':
            if not config.get('mapping'):
                errors.append(f"Node '{node_id}': Rename requires 'mapping' dictionary")
        
        elif subtype == 'CAST':
            if not config.get('column'):
                errors.append(f"Node '{node_id}': Cast requires 'column'")
            if not config.get('dtype'):
                errors.append(f"Node '{node_id}': Cast requires 'dtype'")
        
        elif subtype == 'AGGREGATE':
            if not config.get('group_by'):
                errors.append(f"Node '{node_id}': Aggregate requires 'group_by'")
            if not config.get('aggregations'):
                errors.append(f"Node '{node_id}': Aggregate requires 'aggregations'")
        
        elif subtype == 'JOIN':
            if not config.get('join_type'):
                errors.append(f"Node '{node_id}': Join requires 'join_type'")
            if not config.get('left_on') or not config.get('right_on'):
                errors.append(f"Node '{node_id}': Join requires 'left_on' and 'right_on'")
        
        elif subtype in ['CSV_LOAD', 'EXCEL_LOAD', 'JSON_LOAD']:
            if not config.get('output_path'):
                errors.append(f"Node '{node_id}': Load requires 'output_path'")
        
        elif subtype == 'DB_LOAD':
            if not config.get('connection_string'):
                errors.append(f"Node '{node_id}': Database load requires 'connection_string'")
            if not config.get('table_name'):
                errors.append(f"Node '{node_id}': Database load requires 'table_name'")
    
    return errors


def validate_edges(nodes: List[Dict], edges: List[Dict]) -> List[str]:
    """
    Validate edge connections are valid.
    """
    errors = []
    
    node_ids = {node['id'] for node in nodes}
    
    for idx, edge in enumerate(edges):
        from_node = edge.get('from') or edge.get('from_node') or edge.get('source')
        to_node = edge.get('to') or edge.get('to_node') or edge.get('target')
        
        if not from_node:
            errors.append(f"Edge {idx}: Missing 'from' node")
            continue
        if not to_node:
            errors.append(f"Edge {idx}: Missing 'to' node")
            continue
        
        if from_node not in node_ids:
            errors.append(f"Edge {idx}: 'from' node '{from_node}' does not exist")
        if to_node not in node_ids:
            errors.append(f"Edge {idx}: 'to' node '{to_node}' does not exist")
    
    return errors


def validate_pipeline_structure(nodes: List[Dict], edges: List[Dict]) -> List[str]:
    """
    Validate overall pipeline structure.
    """
    errors = []
    
    # Check for at least one source
    source_nodes = [n for n in nodes if n.get('type') == 'SOURCE']
    if not source_nodes:
        errors.append("Pipeline must have at least one SOURCE node")
    
    # Check for at least one load
    load_nodes = [n for n in nodes if n.get('type') == 'LOAD']
    if not load_nodes:
        errors.append("Pipeline must have at least one LOAD node")
    
    return errors


def validate_schema_compatibility(
    source_node: Dict,
    target_node: Dict,
    source_df: Optional[pd.DataFrame] = None
) -> Tuple[bool, List[str]]:
    """
    Validate that data flowing from source_node to target_node is compatible.
    
    Args:
        source_node: The upstream node
        target_node: The downstream node
        source_df: Optional DataFrame from source node for column checking
    
    Returns:
        Tuple of (is_valid, list of error messages)
    """
    errors = []
    
    if source_df is None:
        # Can't validate schema without data
        return True, []
    
    target_subtype = target_node.get('subtype')
    target_config = target_node.get('config', {})
    
    # Check if target node requires columns that exist
    if target_subtype == 'FILTER':
        column = target_config.get('column')
        if column and column not in source_df.columns:
            errors.append(f"Filter node requires column '{column}' which doesn't exist in input")
    
    elif target_subtype == 'SELECT':
        columns = target_config.get('columns', [])
        missing = [col for col in columns if col not in source_df.columns]
        if missing:
            errors.append(f"Select node requires columns {missing} which don't exist in input")
    
    elif target_subtype == 'RENAME':
        mapping = target_config.get('mapping', {})
        missing = [col for col in mapping.keys() if col not in source_df.columns]
        if missing:
            errors.append(f"Rename node references columns {missing} which don't exist in input")
    
    elif target_subtype == 'CAST':
        column = target_config.get('column')
        if column and column not in source_df.columns:
            errors.append(f"Cast node requires column '{column}' which doesn't exist in input")
    
    elif target_subtype == 'AGGREGATE':
        group_by = target_config.get('group_by', [])
        if isinstance(group_by, str):
            group_by = [group_by]
        missing = [col for col in group_by if col not in source_df.columns]
        if missing:
            errors.append(f"Aggregate node references columns {missing} which don't exist in input")
    
    return len(errors) == 0, errors


def get_sample_schema(node: Dict) -> Optional[pd.DataFrame]:
    """
    Get sample data schema from a source node.
    
    Returns:
        DataFrame with sample data or None if unavailable
    """
    subtype = node.get('subtype')
    config = node.get('config', {})
    
    try:
        if subtype == 'CSV_SOURCE':
            file_path = config.get('file_path')
            if file_path:
                return load_csv(file_path, nrows=5)
        
        elif subtype == 'EXCEL_SOURCE':
            file_path = config.get('file_path')
            if file_path:
                return load_excel(file_path, nrows=5)
        
        elif subtype == 'JSON_SOURCE':
            file_path = config.get('file_path')
            if file_path:
                df = load_json(file_path)
                return df.head(5)
    
    except Exception:
        # If we can't load sample, return None
        pass
    
    return None
