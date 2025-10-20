import React, { useState, useEffect } from 'react';
import { 
  Pagination, 
  PaginationContent, 
  PaginationItem, 
  PaginationLink, 
  PaginationNext, 
  PaginationPrevious,
  PaginationEllipsis 
} from './ui/pagination';
import { useScrollToTop } from '../hooks/useScrollToTop';

interface PaginatedContentProps<T> {
  items: T[];
  itemsPerPage?: number;
  renderItem: (item: T, index: number) => React.ReactNode;
  className?: string;
  contentId?: string;
}

export default function PaginatedContent<T>({
  items,
  itemsPerPage = 10,
  renderItem,
  className = '',
  contentId = 'paginated-content'
}: PaginatedContentProps<T>) {
  const [currentPage, setCurrentPage] = useState(1);
  const { scrollToTop, scrollToElement } = useScrollToTop();

  const totalPages = Math.ceil(items.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentItems = items.slice(startIndex, endIndex);

  // Reset to page 1 when items change
  useEffect(() => {
    setCurrentPage(1);
  }, [items.length]);

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    
    // Scroll to top of content or to a specific element
    if (contentId) {
      scrollToElement(contentId);
    } else {
      scrollToTop();
    }
  };

  const generatePageNumbers = () => {
    const pages = [];
    const maxVisiblePages = 5;
    
    if (totalPages <= maxVisiblePages) {
      // Show all pages if we have few pages
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      // Show first page, current page area, and last page
      const startPage = Math.max(1, currentPage - 2);
      const endPage = Math.min(totalPages, currentPage + 2);
      
      if (startPage > 1) {
        pages.push(1);
        if (startPage > 2) {
          pages.push('ellipsis-start');
        }
      }
      
      for (let i = startPage; i <= endPage; i++) {
        pages.push(i);
      }
      
      if (endPage < totalPages) {
        if (endPage < totalPages - 1) {
          pages.push('ellipsis-end');
        }
        pages.push(totalPages);
      }
    }
    
    return pages;
  };

  if (items.length === 0) {
    return null;
  }

  return (
    <div className={className}>
      {/* Content Area */}
      <div id={contentId}>
        {currentItems.map((item, index) => renderItem(item, startIndex + index))}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="mt-8">
          <Pagination>
            <PaginationContent>
              {/* Previous Button */}
              <PaginationItem>
                <PaginationPrevious
                  onClick={(e) => {
                    e.preventDefault();
                    if (currentPage > 1) {
                      handlePageChange(currentPage - 1);
                    }
                  }}
                  className={currentPage === 1 ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                />
              </PaginationItem>

              {/* Page Numbers */}
              {generatePageNumbers().map((page, index) => (
                <PaginationItem key={index}>
                  {typeof page === 'string' ? (
                    <PaginationEllipsis />
                  ) : (
                    <PaginationLink
                      onClick={(e) => {
                        e.preventDefault();
                        handlePageChange(page);
                      }}
                      isActive={currentPage === page}
                      className="cursor-pointer"
                    >
                      {page}
                    </PaginationLink>
                  )}
                </PaginationItem>
              ))}

              {/* Next Button */}
              <PaginationItem>
                <PaginationNext
                  onClick={(e) => {
                    e.preventDefault();
                    if (currentPage < totalPages) {
                      handlePageChange(currentPage + 1);
                    }
                  }}
                  className={currentPage === totalPages ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                />
              </PaginationItem>
            </PaginationContent>
          </Pagination>

          {/* Page Info */}
          <div className="text-center mt-4 text-sm text-muted-foreground">
            Showing {startIndex + 1} to {Math.min(endIndex, items.length)} of {items.length} items
          </div>
        </div>
      )}
    </div>
  );
}