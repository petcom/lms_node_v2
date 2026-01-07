import { calculatePagination, getPaginationParams } from '@/utils/pagination';

describe('Pagination Utils', () => {
  describe('calculatePagination', () => {
    it('should calculate pagination for first page', () => {
      const result = calculatePagination(1, 25, 100);

      expect(result).toEqual({
        page: 1,
        limit: 25,
        total: 100,
        totalPages: 4,
        hasNext: true,
        hasPrev: false,
        skip: 0
      });
    });

    it('should calculate pagination for middle page', () => {
      const result = calculatePagination(2, 25, 100);

      expect(result).toEqual({
        page: 2,
        limit: 25,
        total: 100,
        totalPages: 4,
        hasNext: true,
        hasPrev: true,
        skip: 25
      });
    });

    it('should calculate pagination for last page', () => {
      const result = calculatePagination(4, 25, 100);

      expect(result).toEqual({
        page: 4,
        limit: 25,
        total: 100,
        totalPages: 4,
        hasNext: false,
        hasPrev: true,
        skip: 75
      });
    });

    it('should handle single page result', () => {
      const result = calculatePagination(1, 25, 10);

      expect(result).toEqual({
        page: 1,
        limit: 25,
        total: 10,
        totalPages: 1,
        hasNext: false,
        hasPrev: false,
        skip: 0
      });
    });

    it('should handle empty results', () => {
      const result = calculatePagination(1, 25, 0);

      expect(result).toEqual({
        page: 1,
        limit: 25,
        total: 0,
        totalPages: 0,
        hasNext: false,
        hasPrev: false,
        skip: 0
      });
    });

    it('should handle non-even division', () => {
      const result = calculatePagination(1, 25, 78);

      expect(result).toEqual({
        page: 1,
        limit: 25,
        total: 78,
        totalPages: 4, // ceil(78/25) = 4
        hasNext: true,
        hasPrev: false,
        skip: 0
      });
    });

    it('should calculate correct skip value', () => {
      expect(calculatePagination(1, 10, 100).skip).toBe(0);
      expect(calculatePagination(2, 10, 100).skip).toBe(10);
      expect(calculatePagination(3, 10, 100).skip).toBe(20);
      expect(calculatePagination(5, 10, 100).skip).toBe(40);
    });
  });

  describe('getPaginationParams', () => {
    it('should extract pagination from query with defaults', () => {
      const query = {};
      const result = getPaginationParams(query);

      expect(result).toEqual({
        page: 1,
        limit: 25
      });
    });

    it('should parse page and limit from query', () => {
      const query = { page: '3', limit: '50' };
      const result = getPaginationParams(query);

      expect(result).toEqual({
        page: 3,
        limit: 50
      });
    });

    it('should enforce minimum page of 1', () => {
      const query = { page: '0' };
      const result = getPaginationParams(query);

      expect(result.page).toBe(1);
    });

    it('should enforce minimum page for negative values', () => {
      const query = { page: '-5' };
      const result = getPaginationParams(query);

      expect(result.page).toBe(1);
    });

    it('should enforce maximum limit', () => {
      const query = { limit: '500' };
      const result = getPaginationParams(query, 100);

      expect(result.limit).toBe(100);
    });

    it('should enforce minimum limit of 1', () => {
      const query = { limit: '0' };
      const result = getPaginationParams(query);

      expect(result.limit).toBe(1);
    });

    it('should use custom default limit', () => {
      const query = {};
      const result = getPaginationParams(query, 100, 50);

      expect(result.limit).toBe(50);
    });

    it('should handle custom max limit', () => {
      const query = { limit: '150' };
      const result = getPaginationParams(query, 200);

      expect(result.limit).toBe(150);
    });

    it('should handle invalid page number', () => {
      const query = { page: 'abc' };
      const result = getPaginationParams(query);

      expect(result.page).toBe(1);
    });

    it('should handle invalid limit number', () => {
      const query = { limit: 'xyz' };
      const result = getPaginationParams(query);

      expect(result.limit).toBe(25);
    });

    it('should handle decimal page numbers', () => {
      const query = { page: '2.5' };
      const result = getPaginationParams(query);

      expect(result.page).toBe(2);
    });

    it('should handle decimal limit numbers', () => {
      const query = { limit: '10.7' };
      const result = getPaginationParams(query);

      expect(result.limit).toBe(10);
    });
  });
});
