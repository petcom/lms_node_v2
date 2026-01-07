import { ApiResponse } from '@/utils/ApiResponse';

describe('ApiResponse', () => {
  describe('success', () => {
    it('should create a success response with data', () => {
      const data = { id: 1, name: 'Test' };
      const response = ApiResponse.success(data);

      expect(response).toEqual({
        status: 'success',
        data
      });
    });

    it('should create a success response with message', () => {
      const data = { id: 1 };
      const response = ApiResponse.success(data, 'Operation successful');

      expect(response).toEqual({
        status: 'success',
        message: 'Operation successful',
        data
      });
    });

    it('should handle null data', () => {
      const response = ApiResponse.success(null);

      expect(response).toEqual({
        status: 'success',
        data: null
      });
    });
  });

  describe('created', () => {
    it('should create a 201 response', () => {
      const data = { id: 1, name: 'Created' };
      const response = ApiResponse.created(data);

      expect(response).toEqual({
        status: 'success',
        data
      });
    });

    it('should include message if provided', () => {
      const data = { id: 1 };
      const response = ApiResponse.created(data, 'Resource created');

      expect(response).toEqual({
        status: 'success',
        message: 'Resource created',
        data
      });
    });
  });

  describe('paginated', () => {
    it('should create a paginated response', () => {
      const data = [{ id: 1 }, { id: 2 }];
      const pagination = {
        page: 1,
        limit: 25,
        total: 50,
        totalPages: 2
      };

      const response = ApiResponse.paginated(data, pagination);

      expect(response).toEqual({
        status: 'success',
        data,
        pagination: {
          page: 1,
          limit: 25,
          total: 50,
          totalPages: 2,
          hasNext: true,
          hasPrev: false
        }
      });
    });

    it('should calculate hasNext and hasPrev correctly - first page', () => {
      const response = ApiResponse.paginated([], {
        page: 1,
        limit: 10,
        total: 30,
        totalPages: 3
      });

      expect(response.pagination.hasNext).toBe(true);
      expect(response.pagination.hasPrev).toBe(false);
    });

    it('should calculate hasNext and hasPrev correctly - middle page', () => {
      const response = ApiResponse.paginated([], {
        page: 2,
        limit: 10,
        total: 30,
        totalPages: 3
      });

      expect(response.pagination.hasNext).toBe(true);
      expect(response.pagination.hasPrev).toBe(true);
    });

    it('should calculate hasNext and hasPrev correctly - last page', () => {
      const response = ApiResponse.paginated([], {
        page: 3,
        limit: 10,
        total: 30,
        totalPages: 3
      });

      expect(response.pagination.hasNext).toBe(false);
      expect(response.pagination.hasPrev).toBe(true);
    });
  });

  describe('error', () => {
    it('should create an error response with message', () => {
      const response = ApiResponse.error('Something went wrong');

      expect(response).toEqual({
        status: 'error',
        message: 'Something went wrong'
      });
    });

    it('should include errors array if provided', () => {
      const errors = [
        { field: 'email', message: 'Email is required' },
        { field: 'password', message: 'Password too short' }
      ];

      const response = ApiResponse.error('Validation failed', errors);

      expect(response).toEqual({
        status: 'error',
        message: 'Validation failed',
        errors
      });
    });

    it('should handle empty errors array', () => {
      const response = ApiResponse.error('Error', []);

      expect(response).toEqual({
        status: 'error',
        message: 'Error',
        errors: []
      });
    });
  });
});
