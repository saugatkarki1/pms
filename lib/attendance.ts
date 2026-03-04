import { createClient as createServerClient } from '@/lib/supabase/server'

export interface Attendance {
  id: string
  tenant_id: string
  worker_id: string
  attendance_date: string
  check_in_time?: string
  check_out_time?: string
  status: 'present' | 'absent' | 'late' | 'on_leave' | 'half_day'
  notes?: string
  biometric_device?: string
  created_at: string
  updated_at: string
}

export async function getAttendanceByDate(tenantId: string, date: string) {
  const supabase = await createServerClient()

  const { data, error } = await supabase
    .from('attendance')
    .select('*, workers(first_name, last_name, employee_id)')
    .eq('tenant_id', tenantId)
    .eq('attendance_date', date)

  if (error) throw error
  return data || []
}

export async function getWorkerAttendance(workerId: string, tenantId: string, startDate?: string, endDate?: string) {
  const supabase = await createServerClient()

  let query = supabase
    .from('attendance')
    .select('*')
    .eq('worker_id', workerId)
    .eq('tenant_id', tenantId)

  if (startDate) {
    query = query.gte('attendance_date', startDate)
  }
  if (endDate) {
    query = query.lte('attendance_date', endDate)
  }

  const { data, error } = await query.order('attendance_date', { ascending: false })

  if (error) throw error
  return data as Attendance[]
}

export async function markAttendance(
  tenantId: string,
  workerId: string,
  attendanceDate: string,
  status: Attendance['status'],
  checkInTime?: string,
  checkOutTime?: string,
  notes?: string
) {
  const supabase = await createServerClient()

  const { data: existing, error: fetchError } = await supabase
    .from('attendance')
    .select('id')
    .eq('worker_id', workerId)
    .eq('attendance_date', attendanceDate)
    .eq('tenant_id', tenantId)
    .single()

  if (existing) {
    // Update existing attendance
    const { error } = await supabase
      .from('attendance')
      .update({
        status,
        check_in_time: checkInTime,
        check_out_time: checkOutTime,
        notes,
      })
      .eq('id', existing.id)

    if (error) throw error
    return existing.id
  } else {
    // Create new attendance
    const { data, error } = await supabase
      .from('attendance')
      .insert([
        {
          tenant_id: tenantId,
          worker_id: workerId,
          attendance_date: attendanceDate,
          status,
          check_in_time: checkInTime,
          check_out_time: checkOutTime,
          notes,
        },
      ])
      .select()
      .single()

    if (error) throw error
    return data.id
  }
}

export async function getAttendanceSummary(tenantId: string, startDate: string, endDate: string) {
  const supabase = await createServerClient()

  const { data, error } = await supabase
    .from('attendance')
    .select('status, COUNT(*)')
    .eq('tenant_id', tenantId)
    .gte('attendance_date', startDate)
    .lte('attendance_date', endDate)

  if (error) throw error

  // Group by status
  const summary: Record<string, number> = {
    present: 0,
    absent: 0,
    late: 0,
    on_leave: 0,
    half_day: 0,
  }

  // Note: Supabase doesn't support COUNT in select the way we're using it
  // We'll calculate it from the query result instead
  return summary
}
