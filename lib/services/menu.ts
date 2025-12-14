import { apiClient } from '@/lib/apiClient'
import type { MenuItem } from '@/lib/types'

export async function getMenuItems(): Promise<MenuItem[] | null> {
  const res = await apiClient<MenuItem[]>('/menu-items/', { method: 'GET', requireAuth: false })
  return (res.data as MenuItem[] | null) ?? null
}

export default { getMenuItems }
