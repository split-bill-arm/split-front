// Types for API client and backend responses
export interface ApiResponse<T = unknown> {
  success?: boolean
  data?: T
  message?: string
  error?: string
  // Pagination helpers used by DRF
  count?: number
  next?: string | null
  previous?: string | null
  results?: T[]
}

export interface ApiError {
  message: string
  status?: number
}

export interface ApiResult<T = unknown> {
  data: T | null
  error: ApiError | null
}

export const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || process.env.NEXT_PUBLIC_URL || 'http://localhost:8000/api'

export type { ApiResponse as ApiResponseType }
