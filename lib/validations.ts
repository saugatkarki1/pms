import { z } from 'zod'

// ─── Worker ────────────────────────────────────────
export const workerSchema = z.object({
  employee_id: z.string().min(1, 'Employee ID is required'),
  first_name: z.string().min(1, 'First name is required'),
  last_name: z.string().min(1, 'Last name is required'),
  email: z.string().email('Invalid email').optional().or(z.literal('')),
  phone: z.string().optional(),
  employment_type: z.enum(['full_time', 'part_time', 'contract', 'freelance', 'intern']),
  department: z.string().optional(),
  position: z.string().optional(),
  salary_per_month: z.string().optional(),
  hire_date: z.string().min(1, 'Hire date is required'),
  bonus: z.string().optional(),
  overtime_pay: z.string().optional(),
  increment: z.string().optional(),
  retroactive_adjustment: z.string().optional(),
})

export type WorkerFormData = z.infer<typeof workerSchema>

// ─── Attendance ────────────────────────────────────
export const attendanceSchema = z.object({
  worker_id: z.string().min(1, 'Please select a worker'),
  attendance_date: z.string().min(1, 'Date is required'),
  status: z.enum(['present', 'absent', 'late', 'on_leave', 'half_day']),
  check_in_time: z.string().optional(),
  check_out_time: z.string().optional(),
  notes: z.string().optional(),
})

export type AttendanceFormData = z.infer<typeof attendanceSchema>

// ─── Payroll ───────────────────────────────────────
export const payrollSchema = z.object({
  worker_id: z.string().min(1, 'Please select a worker'),
  period_start_date: z.string().min(1, 'Start date is required'),
  period_end_date: z.string().min(1, 'End date is required'),
  base_salary: z.string().min(1, 'Base salary is required'),
  overtime_pay: z.string().optional(),
  deductions: z.string().optional(),
  bonus: z.string().optional(),
})

export type PayrollFormData = z.infer<typeof payrollSchema>

// ─── Department ────────────────────────────────────
export const departmentSchema = z.object({
  name: z.string().min(1, 'Department name is required'),
  description: z.string().optional(),
})

export type DepartmentFormData = z.infer<typeof departmentSchema>

// ─── Inventory Item ────────────────────────────────
export const inventoryItemSchema = z.object({
  item_code: z.string().min(1, 'Item code is required'),
  name: z.string().min(1, 'Item name is required'),
  category_id: z.string().optional(),
  description: z.string().optional(),
  quantity_on_hand: z.string().min(1, 'Quantity is required'),
  minimum_quantity: z.string().min(1, 'Minimum quantity is required'),
  unit_price: z.string().optional(),
})

export type InventoryItemFormData = z.infer<typeof inventoryItemSchema>

// ─── Admin Creation ────────────────────────────────
export const createAdminSchema = z.object({
  fullName: z.string().min(1, 'Full name is required'),
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
})

export type CreateAdminFormData = z.infer<typeof createAdminSchema>

// ─── Task ──────────────────────────────────────────
export const taskSchema = z.object({
  title: z.string().min(1, 'Task title is required'),
  description: z.string().optional(),
  assigned_to: z.string().optional(),
  project_id: z.string().optional(),
  status: z.enum(['todo', 'in_progress', 'review', 'completed']),
  priority: z.enum(['low', 'medium', 'high', 'urgent']),
  due_date: z.string().optional(),
})

export type TaskFormData = z.infer<typeof taskSchema>

// ─── Project ───────────────────────────────────────
export const projectSchema = z.object({
  name: z.string().min(1, 'Project name is required'),
  description: z.string().optional(),
  status: z.enum(['active', 'completed', 'archived']),
  start_date: z.string().optional(),
  end_date: z.string().optional(),
})

export type ProjectFormData = z.infer<typeof projectSchema>

// ─── Helper to extract errors ──────────────────────
export function getValidationErrors(error: z.ZodError): Record<string, string> {
  const errors: Record<string, string> = {}
  error.errors.forEach((err) => {
    const path = err.path.join('.')
    if (path && !errors[path]) {
      errors[path] = err.message
    }
  })
  return errors
}
