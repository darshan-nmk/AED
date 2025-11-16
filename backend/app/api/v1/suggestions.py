"""
Auto-suggestion endpoints
"""
from typing import List, Dict, Any
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.models.orm_models import User
from app.models.pydantic_schemas import (
    SuggestionRequest, SuggestionResponse, Suggestion, SuggestionType
)
from app.utils.security import get_current_active_user

router = APIRouter()


def generate_suggestions(column_stats: Dict[str, Dict[str, Any]]) -> List[Suggestion]:
    """
    Generate intelligent rule-based suggestions from column statistics.
    
    Enhanced Rules:
    1. High null percentage (>40%) → suggest fill or drop
    2. Medium null percentage (10-40%) → suggest fill only
    3. String column with date-like patterns → suggest parse date
    4. Numeric column with business keywords → suggest aggregation
    5. String columns that look numeric → suggest type casting
    6. High cardinality with 'id' → potential join key
    7. Low cardinality categorical → suggest one-hot encoding
    8. Text columns → suggest string operations (trim, lowercase, uppercase)
    9. Outliers in numeric columns → suggest filtering
    10. Duplicate detection → suggest drop duplicates
    11. Standardization → suggest normalization/scaling
    12. Email/Phone patterns → suggest validation/extraction
    13. Currency patterns → suggest parsing
    14. Mixed case text → suggest case normalization
    15. Leading/trailing spaces → suggest trimming
    """
    suggestions = []
    all_columns = list(column_stats.keys())
    
    for col_name, stats in column_stats.items():
        null_percent = stats.get('null_percent', 0)
        dtype = stats.get('dtype', 'object')
        unique_count = stats.get('unique_count', 0)
        total_rows = stats.get('total_rows', 0)
        sample_values = stats.get('sample_values', [])
        
        # Rule 1: High null percentage (>40%)
        if null_percent > 40:
            suggestions.append(Suggestion(
                type=SuggestionType.FILL_MISSING,
                column=col_name,
                suggestion=f"Fill missing values in '{col_name}' ({null_percent:.1f}% null) - use median/mode",
                config={
                    "column": col_name,
                    "strategy": "median" if ('int' in dtype or 'float' in dtype) else "mode",
                },
                priority=1,
            ))
            
            suggestions.append(Suggestion(
                type=SuggestionType.DROP_COLUMN,
                column=col_name,
                suggestion=f"Drop '{col_name}' - very high null percentage ({null_percent:.1f}%)",
                config={"column": col_name},
                priority=2,
            ))
        
        # Rule 2: Medium null percentage (10-40%)
        elif null_percent > 10:
            suggestions.append(Suggestion(
                type=SuggestionType.FILL_MISSING,
                column=col_name,
                suggestion=f"Fill {null_percent:.1f}% missing values in '{col_name}'",
                config={
                    "column": col_name,
                    "strategy": "mean" if ('int' in dtype or 'float' in dtype) else "mode",
                },
                priority=2,
            ))
        
        # Rule 3: Date-like column names
        date_keywords = ['date', 'time', 'dt', 'timestamp', 'created', 'updated', 'modified', 'at', 'on']
        if any(keyword in col_name.lower() for keyword in date_keywords) and 'object' in dtype:
            suggestions.append(Suggestion(
                type=SuggestionType.PARSE_DATE,
                column=col_name,
                suggestion=f"Convert '{col_name}' to datetime - detected date pattern",
                config={
                    "column": col_name,
                    "to": "datetime",
                    "format": None,  # Auto-detect
                },
                priority=1,
            ))
        
        # Rule 4: Numeric columns with business keywords suggest aggregation
        numeric_keywords = ['price', 'amount', 'total', 'sum', 'cost', 'revenue', 'sales', 
                          'qty', 'quantity', 'count', 'value', 'balance', 'profit', 'loss']
        if any(keyword in col_name.lower() for keyword in numeric_keywords) and ('int' in dtype or 'float' in dtype):
            suggestions.append(Suggestion(
                type=SuggestionType.AGGREGATE,
                column=col_name,
                suggestion=f"Aggregate '{col_name}' by groups (sum/average for analysis)",
                config={
                    "column": col_name,
                    "agg": "sum",
                },
                priority=3,
            ))
        
        # Rule 5: Type casting for numeric-looking strings
        if 'object' in dtype and len(sample_values) > 0:
            # Check if samples look numeric
            numeric_count = 0
            for val in sample_values:
                if val is not None and val != '':
                    try:
                        float(str(val).replace(',', '').replace('$', '').strip())
                        numeric_count += 1
                    except (ValueError, TypeError):
                        pass
            
            if numeric_count >= len(sample_values) * 0.8 and numeric_count > 0:
                suggestions.append(Suggestion(
                    type=SuggestionType.CAST_TYPE,
                    column=col_name,
                    suggestion=f"Convert '{col_name}' to numeric - detected numeric strings",
                    config={
                        "column": col_name,
                        "to": "float",
                    },
                    priority=1,
                ))
        
        # Rule 6: Potential join keys (unique or near-unique columns with 'id')
        if total_rows > 0:
            uniqueness_ratio = unique_count / total_rows
            if uniqueness_ratio > 0.95 and any(kw in col_name.lower() for kw in ['id', 'key', 'code']):
                suggestions.append(Suggestion(
                    type=SuggestionType.JOIN,
                    column=col_name,
                    suggestion=f"'{col_name}' is a potential join key ({uniqueness_ratio*100:.1f}% unique)",
                    config={
                        "column": col_name,
                    },
                    priority=3,
                ))
        
        # Rule 7: Low cardinality categorical columns (good for one-hot encoding)
        if total_rows > 0 and 'object' in dtype:
            uniqueness_ratio = unique_count / total_rows
            if uniqueness_ratio < 0.1 and unique_count > 1 and unique_count < 20:
                suggestions.append(Suggestion(
                    type=SuggestionType.CAST_TYPE,
                    column=col_name,
                    suggestion=f"One-hot encode '{col_name}' - categorical with {unique_count} categories",
                    config={
                        "column": col_name,
                        "to": "category",
                        "operation": "one_hot",
                    },
                    priority=2,
                ))
        
        # Rule 8: Text operations for string columns
        if 'object' in dtype and total_rows > 0:
            # Check if values contain spaces (likely text)
            text_count = sum(1 for val in sample_values if val and isinstance(val, str) and ' ' in val)
            if text_count > len(sample_values) * 0.5:
                suggestions.append(Suggestion(
                    type=SuggestionType.CAST_TYPE,
                    column=col_name,
                    suggestion=f"Clean '{col_name}' - remove extra spaces/trim whitespace",
                    config={
                        "column": col_name,
                        "operation": "trim",
                    },
                    priority=3,
                ))
        
        # Rule 9: Outlier detection in numeric columns
        if ('int' in dtype or 'float' in dtype) and stats.get('mean') is not None:
            mean_val = stats.get('mean', 0)
            std_val = stats.get('std', 0)
            min_val = stats.get('min', 0)
            max_val = stats.get('max', 0)
            
            # Better outlier check using standard deviation
            if mean_val > 0 and std_val > 0:
                # Values beyond 3 standard deviations
                if max_val > mean_val + (3 * std_val) or min_val < mean_val - (3 * std_val):
                    suggestions.append(Suggestion(
                        type=SuggestionType.FILTER,
                        column=col_name,
                        suggestion=f"Filter outliers in '{col_name}' - values beyond 3 standard deviations",
                        config={
                            "column": col_name,
                            "operation": "filter_outliers",
                            "method": "std",
                            "threshold": 3,
                        },
                        priority=2,
                    ))
            elif mean_val > 0 and max_val > mean_val * 5:
                suggestions.append(Suggestion(
                    type=SuggestionType.FILTER,
                    column=col_name,
                    suggestion=f"Filter outliers in '{col_name}' - max value is {max_val:.1f} (5x higher than mean)",
                    config={
                        "column": col_name,
                        "operation": "filter",
                        "operator": "<=",
                        "value": mean_val * 3,
                    },
                    priority=2,
                ))
        
        # Rule 10: Duplicate value detection
        if total_rows > 0 and unique_count < total_rows * 0.95:
            duplicate_ratio = 1 - (unique_count / total_rows)
            if duplicate_ratio > 0.1:  # More than 10% duplicates
                suggestions.append(Suggestion(
                    type=SuggestionType.DROP_DUPLICATES,
                    column=col_name,
                    suggestion=f"'{col_name}' has {duplicate_ratio*100:.1f}% duplicate values - consider deduplication",
                    config={
                        "subset": [col_name],
                        "keep": "first",
                    },
                    priority=2,
                ))
        
        # Rule 11: Normalization for numeric columns with wide ranges
        if ('int' in dtype or 'float' in dtype) and stats.get('mean') is not None:
            min_val = stats.get('min', 0)
            max_val = stats.get('max', 0)
            if max_val - min_val > 1000:  # Wide range
                suggestions.append(Suggestion(
                    type=SuggestionType.CAST_TYPE,
                    column=col_name,
                    suggestion=f"Normalize '{col_name}' - wide range [{min_val:.1f} to {max_val:.1f}] for better ML performance",
                    config={
                        "column": col_name,
                        "operation": "normalize",
                        "method": "min_max",
                    },
                    priority=3,
                ))
        
        # Rule 12: Email pattern detection
        if 'object' in dtype and any(kw in col_name.lower() for kw in ['email', 'mail', 'e-mail']):
            # Check if samples contain @ symbol
            email_count = sum(1 for val in sample_values if val and isinstance(val, str) and '@' in val)
            if email_count > len(sample_values) * 0.5:
                suggestions.append(Suggestion(
                    type=SuggestionType.CAST_TYPE,
                    column=col_name,
                    suggestion=f"Validate and clean email addresses in '{col_name}'",
                    config={
                        "column": col_name,
                        "operation": "validate_email",
                    },
                    priority=2,
                ))
        
        # Rule 13: Phone number pattern detection
        if 'object' in dtype and any(kw in col_name.lower() for kw in ['phone', 'mobile', 'tel', 'contact']):
            # Check for digit-heavy strings
            phone_count = sum(1 for val in sample_values if val and isinstance(val, str) and 
                            sum(c.isdigit() for c in str(val)) > 7)
            if phone_count > len(sample_values) * 0.5:
                suggestions.append(Suggestion(
                    type=SuggestionType.CAST_TYPE,
                    column=col_name,
                    suggestion=f"Standardize phone numbers in '{col_name}' - extract digits only",
                    config={
                        "column": col_name,
                        "operation": "clean_phone",
                    },
                    priority=2,
                ))
        
        # Rule 14: Currency pattern detection
        if 'object' in dtype and len(sample_values) > 0:
            currency_count = sum(1 for val in sample_values if val and isinstance(val, str) and 
                               any(c in str(val) for c in ['$', '€', '£', '¥', '₹']))
            if currency_count > len(sample_values) * 0.5:
                suggestions.append(Suggestion(
                    type=SuggestionType.CAST_TYPE,
                    column=col_name,
                    suggestion=f"Parse currency values in '{col_name}' - convert to numeric",
                    config={
                        "column": col_name,
                        "to": "float",
                        "operation": "parse_currency",
                    },
                    priority=1,
                ))
        
        # Rule 15: Mixed case text normalization
        if 'object' in dtype and len(sample_values) > 0:
            mixed_case = sum(1 for val in sample_values if val and isinstance(val, str) and 
                           val != val.lower() and val != val.upper())
            if mixed_case > len(sample_values) * 0.7:
                suggestions.append(Suggestion(
                    type=SuggestionType.CAST_TYPE,
                    column=col_name,
                    suggestion=f"Standardize text case in '{col_name}' - convert to lowercase",
                    config={
                        "column": col_name,
                        "operation": "lowercase",
                    },
                    priority=3,
                ))
    
    # Global suggestions (across all columns)
    
    # Suggest dropping all rows with any null values if overall null rate is low
    total_nulls = sum(stats.get('null_percent', 0) * stats.get('total_rows', 0) / 100 
                      for stats in column_stats.values())
    total_cells = sum(stats.get('total_rows', 0) * len(column_stats) for stats in column_stats.values())
    
    if total_cells > 0 and (total_nulls / total_cells) < 0.05:  # Less than 5% nulls overall
        suggestions.append(Suggestion(
            type=SuggestionType.DROP_COLUMN,
            column=None,
            suggestion="Drop all rows with any missing values - overall null rate is very low (<5%)",
            config={
                "operation": "dropna",
                "how": "any",
            },
            priority=3,
        ))
    
    # Suggest removing duplicate rows if potential duplicates exist
    if len(all_columns) > 0:
        suggestions.append(Suggestion(
            type=SuggestionType.DROP_DUPLICATES,
            column=None,
            suggestion="Remove duplicate rows across all columns",
            config={
                "subset": None,  # All columns
                "keep": "first",
            },
            priority=3,
        ))
    
    # Suggest sorting by date column if one exists
    date_columns = [col for col, stats in column_stats.items() 
                   if any(kw in col.lower() for kw in ['date', 'time', 'created', 'updated'])]
    if date_columns:
        suggestions.append(Suggestion(
            type=SuggestionType.AGGREGATE,
            column=date_columns[0],
            suggestion=f"Sort data by '{date_columns[0]}' for chronological analysis",
            config={
                "operation": "sort",
                "columns": [date_columns[0]],
                "ascending": True,
            },
            priority=3,
        ))
    
    # Sort by priority (lower number = higher priority)
    suggestions.sort(key=lambda x: x.priority)
    
    # Limit to top 15 most relevant suggestions to avoid overwhelming users
    return suggestions[:15]


@router.post("/from-sample", response_model=SuggestionResponse)
async def get_suggestions_from_sample(
    request: SuggestionRequest,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    """
    Generate transformation suggestions based on column statistics.
    
    Analyzes column data types, null percentages, and patterns to suggest
    appropriate transformations like:
    - Filling missing values
    - Parsing dates
    - Type casting
    - Aggregations
    - Potential joins
    
    This uses rule-based logic (can be extended with ML in the future).
    """
    suggestions = generate_suggestions(request.column_stats)
    
    return SuggestionResponse(suggestions=suggestions)
