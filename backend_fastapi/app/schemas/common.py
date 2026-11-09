"""Shared schema utilities."""

from typing import Generic, TypeVar, List, Optional
from pydantic import BaseModel

T = TypeVar("T")


class PageResponse(BaseModel, Generic[T]):
    """Paginated response matching DRF PageNumberPagination format."""
    count: int
    next: Optional[str] = None
    previous: Optional[str] = None
    results: List[T]
