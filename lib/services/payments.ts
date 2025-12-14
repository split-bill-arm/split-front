import { apiClient } from '@/lib/apiClient'

export async function postPayment(body: unknown) {
  return apiClient('/payments/', { method: 'POST', body, requireAuth: false })
}

export default { postPayment }
