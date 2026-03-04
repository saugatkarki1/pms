import { createClient as createServerClient } from '@/lib/supabase/server'

export interface PayrollRecord {
  id: string
  tenant_id: string
  worker_id: string
  period_start_date: string
  period_end_date: string
  base_salary: number
  overtime_hours: number
  overtime_rate: number
  deductions: number
  bonuses: number
  net_salary: number
  status: 'pending' | 'approved' | 'paid' | 'cancelled'
  paid_date?: string
  created_at: string
  updated_at: string
}

export async function getPayrollRecords(tenantId: string, filters?: { status?: string; period?: string }) {
  const supabase = await createServerClient()

  let query = supabase
    .from('payroll')
    .select('*, workers(first_name, last_name, employee_id)')
    .eq('tenant_id', tenantId)

  if (filters?.status) {
    query = query.eq('status', filters.status)
  }

  const { data, error } = await query.order('period_start_date', { ascending: false })

  if (error) throw error
  return data || []
}

export async function calculatePayroll(
  workerId: string,
  periodStartDate: string,
  periodEndDate: string,
  baseSalary: number,
  overtimeHours: number = 0,
  overtimeRate: number = 1.5,
  deductions: number = 0,
  bonuses: number = 0
) {
  // Calculate overtime pay
  const overtimePay = overtimeHours * (baseSalary / 160) * overtimeRate // Assuming 160 hours/month standard

  // Calculate gross salary
  const grossSalary = baseSalary + overtimePay + bonuses

  // Calculate net salary
  const netSalary = grossSalary - deductions

  return {
    baseSalary,
    overtimeHours,
    overtimeRate,
    overtimePay,
    grossSalary,
    deductions,
    bonuses,
    netSalary,
  }
}

export async function createPayrollRecord(
  tenantId: string,
  workerId: string,
  periodStartDate: string,
  periodEndDate: string,
  baseSalary: number,
  overtimeHours: number = 0,
  overtimeRate: number = 1.5,
  deductions: number = 0,
  bonuses: number = 0
) {
  const supabase = await createServerClient()

  const calculation = await calculatePayroll(
    workerId,
    periodStartDate,
    periodEndDate,
    baseSalary,
    overtimeHours,
    overtimeRate,
    deductions,
    bonuses
  )

  const { data, error } = await supabase
    .from('payroll')
    .insert([
      {
        tenant_id: tenantId,
        worker_id: workerId,
        period_start_date: periodStartDate,
        period_end_date: periodEndDate,
        base_salary: baseSalary,
        overtime_hours: overtimeHours,
        overtime_rate: overtimeRate,
        deductions,
        bonuses,
        net_salary: calculation.netSalary,
        status: 'pending',
      },
    ])
    .select()
    .single()

  if (error) throw error
  return data as PayrollRecord
}

export async function updatePayrollRecord(
  payrollId: string,
  updates: Partial<Omit<PayrollRecord, 'id' | 'created_at' | 'updated_at'>>
) {
  const supabase = await createServerClient()

  const { data, error } = await supabase
    .from('payroll')
    .update(updates)
    .eq('id', payrollId)
    .select()
    .single()

  if (error) throw error
  return data as PayrollRecord
}

export async function approvePayroll(payrollId: string) {
  return updatePayrollRecord(payrollId, { status: 'approved' })
}

export async function markPayrollAsPaid(payrollId: string) {
  return updatePayrollRecord(payrollId, {
    status: 'paid',
    paid_date: new Date().toISOString(),
  })
}

export async function cancelPayroll(payrollId: string) {
  return updatePayrollRecord(payrollId, { status: 'cancelled' })
}

export async function generatePayrollForPeriod(
  tenantId: string,
  periodStartDate: string,
  periodEndDate: string
) {
  const supabase = await createServerClient()

  // Get all active workers with salary
  const { data: workers, error: workersError } = await supabase
    .from('workers')
    .select('id, salary_per_month')
    .eq('tenant_id', tenantId)
    .eq('is_active', true)
    .gt('salary_per_month', 0)

  if (workersError) throw workersError

  // Check for existing payroll records in this period
  const { data: existing } = await supabase
    .from('payroll')
    .select('id')
    .eq('tenant_id', tenantId)
    .eq('period_start_date', periodStartDate)
    .eq('period_end_date', periodEndDate)

  if (existing && existing.length > 0) {
    throw new Error('Payroll already exists for this period')
  }

  // Create payroll records for each worker
  const payrollRecords = workers?.map((worker) => ({
    tenant_id: tenantId,
    worker_id: worker.id,
    period_start_date: periodStartDate,
    period_end_date: periodEndDate,
    base_salary: worker.salary_per_month || 0,
    overtime_hours: 0,
    overtime_rate: 1.5,
    deductions: 0,
    bonuses: 0,
    net_salary: worker.salary_per_month || 0,
    status: 'pending',
  }))

  if (!payrollRecords || payrollRecords.length === 0) {
    throw new Error('No active workers with salary found')
  }

  const { error: insertError } = await supabase
    .from('payroll')
    .insert(payrollRecords)

  if (insertError) throw insertError

  return payrollRecords
}
