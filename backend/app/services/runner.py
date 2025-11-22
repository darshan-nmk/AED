"""
ETL Pipeline Execution Engine

This module contains the core logic for executing ETL pipelines.
It builds a DAG from the pipeline JSON, performs topological sorting,
and executes each node in order.
"""

import pandas as pd
from typing import Dict, Any, List, Tuple
from datetime import datetime
from sqlalchemy.orm import Session
from app.utils.file_utils import (
    load_csv, load_excel, load_json,
    write_csv, write_excel, write_json,
    sanitize_path
)
from app.models.orm_models import RunLog, LogLevel, RunStatus, PipelineRun


def validate_transform_schema(node: Dict[str, Any], df: pd.DataFrame) -> None:
    """
    Validate that the transform node can be applied to the input DataFrame.
    Raises ValueError if validation fails.
    """
    subtype = node['subtype']
    config = node['config']
    node_id = node['id']
    
    if subtype == 'FILTER':
        column = config.get('column')
        if column and column not in df.columns:
            raise ValueError(
                f"Node '{node_id}': FILTER requires column '{column}' which doesn't exist. "
                f"Available columns: {list(df.columns)}"
            )
    
    elif subtype == 'SELECT':
        columns = config.get('columns', [])
        missing = [col for col in columns if col not in df.columns]
        if missing:
            raise ValueError(
                f"Node '{node_id}': SELECT requires columns {missing} which don't exist. "
                f"Available columns: {list(df.columns)}"
            )
    
    elif subtype == 'RENAME':
        mapping = config.get('mapping', {})
        missing = [col for col in mapping.keys() if col not in df.columns]
        if missing:
            raise ValueError(
                f"Node '{node_id}': RENAME references columns {missing} which don't exist. "
                f"Available columns: {list(df.columns)}"
            )
    
    elif subtype == 'CAST':
        column = config.get('column')
        if column and column not in df.columns:
            raise ValueError(
                f"Node '{node_id}': CAST requires column '{column}' which doesn't exist. "
                f"Available columns: {list(df.columns)}"
            )
    
    elif subtype == 'AGGREGATE':
        group_by = config.get('group_by', [])
        if isinstance(group_by, str):
            group_by = [group_by]
        missing = [col for col in group_by if col not in df.columns]
        if missing:
            raise ValueError(
                f"Node '{node_id}': AGGREGATE references group_by columns {missing} which don't exist. "
                f"Available columns: {list(df.columns)}"
            )
        
        # Also check aggregation columns
        aggregations = config.get('aggregations', {})
        agg_cols = list(aggregations.keys())
        missing_agg = [col for col in agg_cols if col not in df.columns]
        if missing_agg:
            raise ValueError(
                f"Node '{node_id}': AGGREGATE references aggregation columns {missing_agg} which don't exist. "
                f"Available columns: {list(df.columns)}"
            )
    
    elif subtype == 'SORT':
        columns = config.get('columns', [])
        if isinstance(columns, str):
            columns = [columns]
        missing = [col for col in columns if col not in df.columns]
        if missing:
            raise ValueError(
                f"Node '{node_id}': SORT requires columns {missing} which don't exist. "
                f"Available columns: {list(df.columns)}"
            )


def topological_sort(nodes: List[Dict], edges: List[Dict]) -> List[str]:
    """
    Perform topological sort on pipeline graph using Kahn's algorithm.
    Returns list of node IDs in execution order.
    """
    # Build adjacency list and in-degree map
    adjacency = {node['id']: [] for node in nodes}
    in_degree = {node['id']: 0 for node in nodes}
    
    for edge in edges:
        from_node = edge.get('from') or edge.get('from_node')
        to_node = edge.get('to') or edge.get('to_node')
        adjacency[from_node].append(to_node)
        in_degree[to_node] += 1
    
    # Find all nodes with no incoming edges
    queue = [node_id for node_id, degree in in_degree.items() if degree == 0]
    sorted_nodes = []
    
    while queue:
        node_id = queue.pop(0)
        sorted_nodes.append(node_id)
        
        # Reduce in-degree for neighbors
        for neighbor in adjacency[node_id]:
            in_degree[neighbor] -= 1
            if in_degree[neighbor] == 0:
                queue.append(neighbor)
    
    # Check for cycles
    if len(sorted_nodes) != len(nodes):
        raise ValueError("Pipeline contains cycles - cannot execute")
    
    return sorted_nodes


def execute_source_node(node: Dict[str, Any], db: Session, run_id: int) -> pd.DataFrame:
    """Execute a SOURCE node and return DataFrame"""
    subtype = node['subtype']
    config = node['config']
    
    df = None
    
    if subtype == 'CSV_SOURCE':
        file_path = config.get('file_path')
        delimiter = config.get('delimiter', ',')
        encoding = config.get('encoding', 'utf-8')
        df = load_csv(file_path, delimiter=delimiter, encoding=encoding)
    
    elif subtype == 'EXCEL_SOURCE':
        file_path = config.get('file_path')
        sheet_name = config.get('sheet_name', 0)
        df = load_excel(file_path, sheet_name=sheet_name)
    
    elif subtype == 'JSON_SOURCE':
        file_path = config.get('file_path')
        df = load_json(file_path)
    
    elif subtype == 'DB_SOURCE':
        # Database source implementation
        from sqlalchemy import create_engine, text
        
        connection_string = config.get('connection_string')
        if not connection_string:
            raise ValueError(f"DB_SOURCE requires 'connection_string'")
        
        # Create engine for querying
        engine = create_engine(connection_string)
        
        # Get data - either from table or custom query
        table_name = config.get('table_name')
        query = config.get('query')
        
        if query:
            # Execute custom query
            df = pd.read_sql(text(query), engine)
        elif table_name:
            # Read entire table
            df = pd.read_sql(f"SELECT * FROM {table_name}", engine)
        else:
            raise ValueError("DB_SOURCE requires either 'table_name' or 'query'")
        
        engine.dispose()
    
    elif subtype == 'API_SOURCE':
        # API source implementation
        import requests
        
        endpoint = config.get('endpoint')
        if not endpoint:
            raise ValueError(f"API_SOURCE requires 'endpoint'")
        
        method = config.get('method', 'GET').upper()
        headers_json = config.get('headers', {})
        params = config.get('params', {})
        
        # Make API request
        response = requests.request(method, endpoint, headers=headers_json, params=params)
        response.raise_for_status()
        
        # Parse JSON response to DataFrame
        data = response.json()
        if isinstance(data, list):
            df = pd.DataFrame(data)
        elif isinstance(data, dict) and 'data' in data:
            df = pd.DataFrame(data['data'])
        else:
            df = pd.DataFrame([data])
    
    else:
        raise ValueError(f"Unknown source subtype: {subtype}")
    
    # Log
    log_node_execution(db, run_id, node['id'], f"Loaded {len(df)} rows", 
                      rows_out=len(df))
    
    return df


def execute_transform_node(node: Dict[str, Any], input_df: pd.DataFrame, 
                           db: Session, run_id: int, 
                           results_context: Dict[str, pd.DataFrame] = None) -> pd.DataFrame:
    """Execute a TRANSFORM node and return transformed DataFrame
    
    Args:
        node: The transform node configuration
        input_df: Primary input DataFrame
        db: Database session
        run_id: Run ID for logging
        results_context: Dictionary of node_id -> DataFrame for multi-input operations
    """
    subtype = node['subtype']
    config = node['config']
    rows_in = len(input_df)
    
    if results_context is None:
        results_context = {}
    
    # Validate that required columns exist before transformation
    validate_transform_schema(node, input_df)
    
    df = input_df.copy()
    
    try:
        if subtype == 'SELECT':
            # Select specific columns
            columns = config.get('columns', [])
            df = df[columns]
            message = f"Selected {len(columns)} columns"
        
        elif subtype == 'FILTER':
            # Filter rows based on condition
            column = config.get('column')
            operator = config.get('operator')
            value = config.get('value')
            
            if operator == '==':
                df = df[df[column] == value]
            elif operator == '!=':
                df = df[df[column] != value]
            elif operator == '>':
                df = df[df[column] > value]
            elif operator == '<':
                df = df[df[column] < value]
            elif operator == '>=':
                df = df[df[column] >= value]
            elif operator == '<=':
                df = df[df[column] <= value]
            elif operator == 'contains':
                df = df[df[column].str.contains(str(value), na=False)]
            else:
                raise ValueError(f"Unknown operator: {operator}")
            
            message = f"Filtered by {column} {operator} {value}"
        
        elif subtype == 'RENAME':
            # Rename columns
            mapping = config.get('mapping', {})
            df = df.rename(columns=mapping)
            message = f"Renamed {len(mapping)} columns"
        
        elif subtype == 'CAST':
            # Cast column types
            casts = config.get('casts', [])
            for cast_config in casts:
                col = cast_config['column']
                to_type = cast_config['to']
                
                if to_type == 'int':
                    df[col] = pd.to_numeric(df[col], errors='coerce').astype('Int64')
                elif to_type == 'float':
                    df[col] = pd.to_numeric(df[col], errors='coerce')
                elif to_type == 'string':
                    df[col] = df[col].astype(str)
                elif to_type == 'datetime':
                    date_format = cast_config.get('format')
                    if date_format:
                        df[col] = pd.to_datetime(df[col], format=date_format, errors='coerce')
                    else:
                        df[col] = pd.to_datetime(df[col], errors='coerce')
                elif to_type == 'bool':
                    df[col] = df[col].astype(bool)
                else:
                    raise ValueError(f"Unknown cast type: {to_type}")
            
            message = f"Cast {len(casts)} columns"
        
        elif subtype == 'AGGREGATE':
            # Group by and aggregate
            group_by = config.get('group_by', [])
            aggregations = config.get('aggregations', [])
            
            if not group_by:
                raise ValueError("AGGREGATE requires at least one 'group_by' column")
            if not aggregations:
                raise ValueError("AGGREGATE requires at least one aggregation")
            
            # Build aggregation dict with proper naming
            agg_dict = {}
            rename_map = {}
            
            for agg in aggregations:
                col = agg['column']
                agg_func = agg['agg']
                output_name = agg.get('as') or agg.get('output_column') or f"{col}_{agg_func}"
                
                if col not in df.columns:
                    raise ValueError(f"Column '{col}' not found in dataframe")
                
                if col not in agg_dict:
                    agg_dict[col] = []
                agg_dict[col].append(agg_func)
                
                # Track rename mapping: (col, agg_func) -> output_name
                rename_map[(col, agg_func)] = output_name
            
            # Perform aggregation
            df = df.groupby(group_by).agg(agg_dict).reset_index()
            
            # Flatten multi-level columns if present
            if isinstance(df.columns, pd.MultiIndex):
                new_cols = []
                for col_tuple in df.columns:
                    if col_tuple[1]:  # Has aggregation function
                        # Use custom name if provided, else default
                        new_name = rename_map.get((col_tuple[0], col_tuple[1]), f"{col_tuple[0]}_{col_tuple[1]}")
                        new_cols.append(new_name)
                    else:
                        new_cols.append(col_tuple[0])
                df.columns = new_cols
            
            # Flatten column names
            df.columns = ['_'.join(col).strip('_') for col in df.columns.values]
            
            message = f"Aggregated by {group_by}"
        
        elif subtype == 'JOIN':
            # JOIN requires two inputs
            join_type = config.get('join_type', 'inner')  # inner, left, right, outer
            left_on = config.get('left_on')
            right_on = config.get('right_on')
            suffixes = config.get('suffixes', ('_left', '_right'))  # Suffix for duplicate columns
            
            if not left_on:
                raise ValueError("JOIN requires 'left_on' column")
            
            if not right_on:
                raise ValueError("JOIN requires 'right_on' column")
            
            # The right_node_id should be passed from the execution context
            # It's the second input node to this JOIN node
            right_node_id = config.get('right_node_id')
            
            if not right_node_id:
                raise ValueError(
                    "JOIN requires 'right_node_id' to specify the second data source. "
                    "This should be automatically set based on the incoming edges."
                )
            
            # Get the right dataframe from results context
            if right_node_id not in results_context:
                raise ValueError(
                    f"JOIN references node '{right_node_id}' which hasn't been executed yet. "
                    f"Ensure the join order is correct in your pipeline."
                )
            
            right_df = results_context[right_node_id]
            
            # Validate columns exist
            if left_on not in df.columns:
                raise ValueError(
                    f"Left join column '{left_on}' not found in left DataFrame. "
                    f"Available columns: {list(df.columns)}"
                )
            
            if right_on not in right_df.columns:
                raise ValueError(
                    f"Right join column '{right_on}' not found in right DataFrame. "
                    f"Available columns: {list(right_df.columns)}"
                )
            
            # Perform the join
            df = df.merge(
                right_df,
                left_on=left_on,
                right_on=right_on,
                how=join_type,
                suffixes=suffixes
            )
            
            message = f"Joined with {right_node_id} on {left_on}={right_on} ({join_type} join)"
        
        elif subtype == 'SORT':
            # Sort by columns
            columns = config.get('columns', [])
            ascending = config.get('ascending', True)
            df = df.sort_values(by=columns, ascending=ascending)
            message = f"Sorted by {columns}"
        
        elif subtype == 'FILL_MISSING':
            # Fill missing values
            column = config.get('column')
            strategy = config.get('strategy', 'constant')
            value = config.get('value', 0)
            
            if strategy == 'constant':
                df[column] = df[column].fillna(value)
            elif strategy == 'mean':
                df[column] = df[column].fillna(df[column].mean())
            elif strategy == 'median':
                df[column] = df[column].fillna(df[column].median())
            elif strategy == 'forward':
                df[column] = df[column].fillna(method='ffill')
            elif strategy == 'backward':
                df[column] = df[column].fillna(method='bfill')
            
            message = f"Filled missing in {column} with {strategy}"
        
        elif subtype == 'DROP_DUPLICATES':
            # Drop duplicate rows
            subset = config.get('columns', None)
            df = df.drop_duplicates(subset=subset)
            message = "Dropped duplicates"
        
        elif subtype == 'NORMALIZE':
            # Normalize/scale numeric columns
            column = config.get('column')
            method = config.get('method', 'min_max')  # 'min_max', 'z_score', 'robust'
            
            if method == 'min_max':
                # Min-Max scaling to [0, 1]
                min_val = df[column].min()
                max_val = df[column].max()
                if max_val != min_val:
                    df[column] = (df[column] - min_val) / (max_val - min_val)
            elif method == 'z_score':
                # Z-score standardization
                mean_val = df[column].mean()
                std_val = df[column].std()
                if std_val != 0:
                    df[column] = (df[column] - mean_val) / std_val
            elif method == 'robust':
                # Robust scaling using median and IQR
                median_val = df[column].median()
                q75 = df[column].quantile(0.75)
                q25 = df[column].quantile(0.25)
                iqr = q75 - q25
                if iqr != 0:
                    df[column] = (df[column] - median_val) / iqr
            
            message = f"Normalized {column} using {method}"
        
        elif subtype == 'STRING_TRANSFORM':
            # String transformations (trim, lowercase, uppercase, etc.)
            column = config.get('column')
            operation = config.get('operation')
            
            if operation == 'trim':
                df[column] = df[column].str.strip()
            elif operation == 'lowercase':
                df[column] = df[column].str.lower()
            elif operation == 'uppercase':
                df[column] = df[column].str.upper()
            elif operation == 'title':
                df[column] = df[column].str.title()
            elif operation == 'remove_spaces':
                df[column] = df[column].str.replace(' ', '', regex=False)
            elif operation == 'clean_phone':
                # Extract only digits from phone numbers
                df[column] = df[column].str.replace(r'[^0-9]', '', regex=True)
            elif operation == 'parse_currency':
                # Remove currency symbols and convert to float
                df[column] = df[column].str.replace(r'[$€£¥₹,]', '', regex=True).astype(float)
            elif operation == 'validate_email':
                # Simple email validation - keep only valid-looking emails
                import re
                email_pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
                df[column] = df[column].apply(
                    lambda x: x if pd.notna(x) and re.match(email_pattern, str(x)) else None
                )
            
            message = f"Applied {operation} to {column}"
        
        elif subtype == 'FILTER_OUTLIERS':
            # Filter outliers using statistical methods
            column = config.get('column')
            method = config.get('method', 'std')  # 'std', 'iqr', 'percentile'
            threshold = config.get('threshold', 3)
            
            if method == 'std':
                # Filter values beyond N standard deviations
                mean_val = df[column].mean()
                std_val = df[column].std()
                df = df[
                    (df[column] >= mean_val - threshold * std_val) & 
                    (df[column] <= mean_val + threshold * std_val)
                ]
            elif method == 'iqr':
                # Filter using Interquartile Range
                q1 = df[column].quantile(0.25)
                q3 = df[column].quantile(0.75)
                iqr = q3 - q1
                lower_bound = q1 - threshold * iqr
                upper_bound = q3 + threshold * iqr
                df = df[(df[column] >= lower_bound) & (df[column] <= upper_bound)]
            elif method == 'percentile':
                # Filter using percentile bounds
                lower = df[column].quantile(threshold / 100)
                upper = df[column].quantile(1 - threshold / 100)
                df = df[(df[column] >= lower) & (df[column] <= upper)]
            
            message = f"Filtered outliers in {column} using {method}"
        
        elif subtype == 'SPLIT_COLUMN':
            # Split column by delimiter
            column = config.get('column')
            delimiter = config.get('delimiter', ',')
            new_columns = config.get('new_columns', [])
            
            split_data = df[column].str.split(delimiter, expand=True)
            for i, new_col in enumerate(new_columns):
                if i < len(split_data.columns):
                    df[new_col] = split_data[i]
            
            message = f"Split {column} into {len(new_columns)} columns"
        
        elif subtype == 'MERGE_COLUMNS':
            # Merge multiple columns into one
            columns = config.get('columns', [])
            new_column = config.get('new_column')
            separator = config.get('separator', ' ')
            
            df[new_column] = df[columns].astype(str).agg(separator.join, axis=1)
            message = f"Merged {len(columns)} columns into {new_column}"
        
        elif subtype == 'EXTRACT_DATE_PARTS':
            # Extract date components (year, month, day, etc.)
            column = config.get('column')
            parts = config.get('parts', ['year', 'month', 'day'])
            
            # Ensure column is datetime
            if not pd.api.types.is_datetime64_any_dtype(df[column]):
                df[column] = pd.to_datetime(df[column], errors='coerce')
            
            if 'year' in parts:
                df[f'{column}_year'] = df[column].dt.year
            if 'month' in parts:
                df[f'{column}_month'] = df[column].dt.month
            if 'day' in parts:
                df[f'{column}_day'] = df[column].dt.day
            if 'dayofweek' in parts:
                df[f'{column}_dayofweek'] = df[column].dt.dayofweek
            if 'quarter' in parts:
                df[f'{column}_quarter'] = df[column].dt.quarter
            if 'hour' in parts:
                df[f'{column}_hour'] = df[column].dt.hour
            
            message = f"Extracted {len(parts)} date parts from {column}"
        
        elif subtype == 'BINNING':
            # Bin continuous values into discrete categories
            column = config.get('column')
            bins = config.get('bins', 5)  # Number of bins or list of bin edges
            labels = config.get('labels', None)
            new_column = config.get('new_column', f'{column}_binned')
            
            df[new_column] = pd.cut(df[column], bins=bins, labels=labels)
            message = f"Binned {column} into {bins} categories"
        
        else:
            raise ValueError(f"Unknown transform subtype: {subtype}")
        
        rows_out = len(df)
        log_node_execution(db, run_id, node['id'], message, 
                          rows_in=rows_in, rows_out=rows_out)
        
        return df
    
    except Exception as e:
        log_node_execution(db, run_id, node['id'], 
                          f"Transform failed: {str(e)}", 
                          level=LogLevel.ERROR,
                          rows_in=rows_in)
        raise


def execute_load_node(node: Dict[str, Any], input_df: pd.DataFrame,
                      db: Session, run_id: int, pipeline_name: str = None) -> str:
    """Execute a LOAD node and return output path"""
    subtype = node['subtype']
    config = node['config']
    rows_in = len(input_df)
    
    output_path = None
    
    # Generate default filename based on pipeline name or run_id
    default_basename = pipeline_name if pipeline_name else f'output_{run_id}'
    
    if subtype == 'CSV_LOAD':
        output_path = config.get('output_path') or f'{default_basename}.csv'
        output_path = write_csv(input_df, output_path)
        message = f"Wrote {rows_in} rows to CSV"
    
    elif subtype == 'EXCEL_LOAD':
        output_path = config.get('output_path')
        if not output_path:
            raise ValueError("EXCEL_LOAD requires 'output_path' to be specified")
        output_path = write_excel(input_df, output_path)
        message = f"Wrote {rows_in} rows to Excel"
    
    elif subtype == 'JSON_LOAD':
        output_path = config.get('output_path') or f'{default_basename}.json'
        output_path = write_json(input_df, output_path)
        message = f"Wrote {rows_in} rows to JSON"
    
    elif subtype == 'DB_LOAD':
        # Database load implementation
        from sqlalchemy import create_engine
        
        connection_string = config.get('connection_string')
        table_name = config.get('table_name')
        
        if not connection_string:
            raise ValueError("DB_LOAD requires 'connection_string'")
        if not table_name:
            raise ValueError("DB_LOAD requires 'table_name'")
        
        # Create engine
        engine = create_engine(connection_string)
        
        # Load mode: 'replace', 'append', or 'fail'
        if_exists = config.get('if_exists', 'replace')
        
        # Write DataFrame to database
        input_df.to_sql(table_name, engine, if_exists=if_exists, index=False)
        
        output_path = f"database://{table_name}"
        message = f"Wrote {rows_in} rows to database table '{table_name}'"
        
        engine.dispose()
    
    elif subtype == 'API_LOAD':
        # API load implementation
        import requests
        import json
        
        endpoint = config.get('endpoint')
        if not endpoint:
            raise ValueError("API_LOAD requires 'endpoint'")
        
        method = config.get('method', 'POST').upper()
        headers_json = config.get('headers', {})
        
        # Convert DataFrame to JSON
        data = input_df.to_dict(orient='records')
        
        # Send to API
        response = requests.request(
            method, 
            endpoint, 
            headers={**headers_json, 'Content-Type': 'application/json'},
            data=json.dumps(data)
        )
        response.raise_for_status()
        
        output_path = f"api://{endpoint}"
        message = f"Sent {rows_in} rows to API endpoint"
    
    else:
        raise ValueError(f"Unknown load subtype: {subtype}")
    
    log_node_execution(db, run_id, node['id'], message, rows_in=rows_in)
    
    return output_path


def log_node_execution(db: Session, run_id: int, node_id: str, message: str,
                      level: LogLevel = LogLevel.INFO,
                      rows_in: int = None, rows_out: int = None):
    """Log node execution to database"""
    log = RunLog(
        run_id=run_id,
        node_id=node_id,
        level=level,
        message=message,
        rows_in=rows_in,
        rows_out=rows_out,
    )
    db.add(log)
    db.commit()


def execute_pipeline(pipeline_json: Dict[str, Any], run_id: int, db: Session, pipeline_name: str = None) -> str:
    """
    Main pipeline execution function.
    
    Args:
        pipeline_json: Pipeline definition with nodes and edges
        run_id: ID of the pipeline run
        db: Database session
        pipeline_name: Name of the pipeline (used for default output filenames)
    
    Returns:
        Path to output file(s)
    """
    nodes = pipeline_json.get('nodes', [])
    edges = pipeline_json.get('edges', [])
    
    # Create node lookup
    node_map = {node['id']: node for node in nodes}
    
    # Topologically sort nodes
    try:
        execution_order = topological_sort(nodes, edges)
    except ValueError as e:
        log_node_execution(db, run_id, None, f"Pipeline validation failed: {str(e)}", 
                          level=LogLevel.ERROR)
        raise
    
    # Store intermediate results
    results = {}
    output_paths = []
    
    # Execute nodes in order
    for node_id in execution_order:
        node = node_map[node_id]
        node_type = node['type']
        
        try:
            if node_type == 'SOURCE':
                df = execute_source_node(node, db, run_id)
                results[node_id] = df
            
            elif node_type == 'TRANSFORM':
                # Get input from predecessor
                incoming_edges = [e for e in edges 
                                if (e.get('to') or e.get('to_node') or e.get('target')) == node_id]
                
                if not incoming_edges:
                    raise ValueError(f"Transform node {node_id} has no input")
                
                # Use first incoming edge as primary input
                from_node = incoming_edges[0].get('from') or incoming_edges[0].get('from_node') or incoming_edges[0].get('source')
                input_df = results[from_node]
                
                # For JOIN nodes, automatically set right_node_id from second incoming edge
                if node.get('subtype') == 'JOIN' and len(incoming_edges) >= 2:
                    right_node = incoming_edges[1].get('from') or incoming_edges[1].get('from_node') or incoming_edges[1].get('source')
                    # Inject right_node_id into config for the JOIN operation
                    if 'config' not in node:
                        node['config'] = {}
                    node['config']['right_node_id'] = right_node
                
                # Pass results context for multi-input operations like JOIN
                df = execute_transform_node(node, input_df, db, run_id, results_context=results)
                results[node_id] = df
            
            elif node_type == 'LOAD':
                # Get input from predecessor
                incoming_edges = [e for e in edges 
                                if (e.get('to') or e.get('to_node') or e.get('target')) == node_id]
                
                if not incoming_edges:
                    raise ValueError(f"Load node {node_id} has no input")
                
                from_node = incoming_edges[0].get('from') or incoming_edges[0].get('from_node') or incoming_edges[0].get('source')
                input_df = results[from_node]
                
                output_path = execute_load_node(node, input_df, db, run_id, pipeline_name)
                output_paths.append(output_path)
            
            else:
                raise ValueError(f"Unknown node type: {node_type}")
        
        except Exception as e:
            # Log error and re-raise
            log_node_execution(db, run_id, node_id, 
                             f"Node execution failed: {str(e)}", 
                             level=LogLevel.ERROR)
            raise
    
    # Return primary output path (last load node)
    return output_paths[-1] if output_paths else None
