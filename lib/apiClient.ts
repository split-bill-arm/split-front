import { getAuthenticatedFetchOptions, refreshAuthToken } from './auth'
import { ApiResponse, ApiResult, ApiError, API_BASE_URL } from './apiTypes'

type RequestMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'

type RequestOptions = {
  method?: RequestMethod
  body?: unknown
  requireAuth?: boolean
  skipAuthRefresh?: boolean
}

export async function apiClient<T = unknown>(endpoint: string, options: RequestOptions = {}): Promise<ApiResult<T>> {
  const { method = 'GET', body, requireAuth = true, skipAuthRefresh = false } = options

  const makeRequest = async (): Promise<ApiResult<T>> => {
    try {
      const url = `${API_BASE_URL.replace(/\/+$/, '')}/${endpoint.replace(/^\//, '')}`

      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      }

      const requestOptions: RequestInit = {
        method,
        headers,
        credentials: 'include',
      }

      if (body !== undefined) {
        requestOptions.body = JSON.stringify(body)
      }

      const finalOptions = requireAuth ? getAuthenticatedFetchOptions(requestOptions) : requestOptions

      const response = await fetch(url, finalOptions)
      const backendResponse = (await response.json()) as any

      // If backend returned a plain array (not wrapped in { data } or { results }), handle it
      if (Array.isArray(backendResponse)) {
        return { data: (backendResponse as unknown) as T, error: null }
      }
      if (!response.ok) {
        const errorMessage = backendResponse.message || backendResponse.error || `HTTP ${response.status}: ${response.statusText}`

        if (response.status === 401 && requireAuth && !skipAuthRefresh) {
          const newToken = await refreshAuthToken()
          if (newToken) {
            const retryOptions = getAuthenticatedFetchOptions(requestOptions)
            const retryResponse = await fetch(url, retryOptions)
            if (!retryResponse.ok) {
              return { data: null, error: { message: `HTTP ${retryResponse.status}: ${retryResponse.statusText}`, status: retryResponse.status } }
            }

            const retryBackendResponse = (await retryResponse.json()) as ApiResponse<T>
            if (!retryBackendResponse.success) {
              return { data: null, error: { message: retryBackendResponse.error || retryBackendResponse.message || '', status: retryResponse.status } }
            }

            return { data: (retryBackendResponse.data ?? null) as T | null, error: null }
          }

          return { data: null, error: { message: errorMessage, status: response.status } }
        }

        return { data: null, error: { message: errorMessage, status: response.status } }
      }

      if (backendResponse && typeof backendResponse === 'object' && 'success' in backendResponse && backendResponse.success === false) {
        return { data: null, error: { message: backendResponse.error || backendResponse.message || '', status: response.status } }
      }

      return { data: (backendResponse?.data ?? (backendResponse?.results ?? null)) as T | null, error: null }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Network error'
      return { data: null, error: { message } }
    }
  }

  return makeRequest()
}

export type { ApiResult }
