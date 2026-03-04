import { createClient as createServerClient } from '@/lib/supabase/server'
import { createClient as createBrowserClient } from '@/lib/supabase/client'

export interface Worker {
  id: string
  tenant_id: string
  user_id?: string
  employee_id: string
  first_name: string
  last_name: string
  email?: string
  phone?: string
  date_of_birth?: string
  address?: string
  employment_type: 'full_time' | 'part_time' | 'contract' | 'intern'
  department?: string
  position?: string
  salary_per_month?: number
  hire_date: string
  is_active: boolean
  created_at: string
  updated_at: string
}

export async function getWorkers(tenantId: string) {
  const supabase = await createServerClient()

  const { data, error } = await supabase
    .from('workers')
    .select('*')
    .eq('tenant_id', tenantId)
    .order('first_name')

  if (error) throw error
  return data as Worker[]
}

export async function getWorkerById(workerId: string, tenantId: string) {
  const supabase = await createServerClient()

  const { data, error } = await supabase
    .from('workers')
    .select('*')
    .eq('id', workerId)
    .eq('tenant_id', tenantId)
    .single()

  if (error) throw error
  return data as Worker
}

export async function createWorker(worker: Omit<Worker, 'id' | 'created_at' | 'updated_at'>) {
  const supabase = await createServerClient()

  const { data, error } = await supabase
    .from('workers')
    .insert([worker])
    .select()
    .single()

  if (error) throw error
  return data as Worker
}

export async function updateWorker(workerId: string, updates: Partial<Worker>) {
  const supabase = await createServerClient()

  const { data, error } = await supabase
    .from('workers')
    .update(updates)
    .eq('id', workerId)
    .select()
    .single()

  if (error) throw error
  return data as Worker
}

export async function deleteWorker(workerId: string) {
  const supabase = await createServerClient()

  const { error } = await supabase
    .from('workers')
    .delete()
    .eq('id', workerId)

  if (error) throw error
}

export async function importWorkers(workers: Array<Omit<Worker, 'id' | 'created_at' | 'updated_at'>>) {
  const supabase = await createServerClient()

  const { error } = await supabase
    .from('workers')
    .insert(workers)

  if (error) throw error
}
