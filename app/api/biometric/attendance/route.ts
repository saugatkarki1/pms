import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabase = createClient(supabaseUrl, supabaseServiceRoleKey)

export async function POST(request: Request) {
  try {
    const body = await request.json()

    const {
      tenant_id,
      employee_id,
      timestamp,
      event_type, // 'check_in' or 'check_out'
      device_name,
    } = body

    // Validate required fields
    if (!tenant_id || !employee_id || !timestamp || !event_type) {
      return Response.json(
        { error: 'Missing required fields: tenant_id, employee_id, timestamp, event_type' },
        { status: 400 }
      )
    }

    if (!['check_in', 'check_out'].includes(event_type)) {
      return Response.json(
        { error: 'Invalid event_type. Must be "check_in" or "check_out"' },
        { status: 400 }
      )
    }

    // Find the worker by employee_id and tenant_id
    const { data: worker, error: workerError } = await supabase
      .from('workers')
      .select('id')
      .eq('tenant_id', tenant_id)
      .eq('employee_id', employee_id)
      .single()

    if (workerError || !worker) {
      return Response.json(
        { error: `Worker with employee_id ${employee_id} not found in tenant ${tenant_id}` },
        { status: 404 }
      )
    }

    const date = new Date(timestamp).toISOString().split('T')[0]
    const time = new Date(timestamp).toISOString().split('T')[1].substring(0, 5)

    // Check if attendance record exists for today
    const { data: existingAttendance, error: fetchError } = await supabase
      .from('attendance')
      .select('id, status, check_in_time, check_out_time')
      .eq('worker_id', worker.id)
      .eq('attendance_date', date)
      .eq('tenant_id', tenant_id)
      .single()

    if (event_type === 'check_in') {
      if (existingAttendance) {
        // Update existing record with check-in time
        const { error: updateError } = await supabase
          .from('attendance')
          .update({
            check_in_time: time,
            status: 'present',
            biometric_device: device_name,
          })
          .eq('id', existingAttendance.id)

        if (updateError) {
          return Response.json(
            { error: 'Failed to record check-in' },
            { status: 500 }
          )
        }
      } else {
        // Create new attendance record
        const { error: insertError } = await supabase
          .from('attendance')
          .insert([
            {
              tenant_id,
              worker_id: worker.id,
              attendance_date: date,
              check_in_time: time,
              status: 'present',
              biometric_device: device_name,
            },
          ])

        if (insertError) {
          return Response.json(
            { error: 'Failed to record check-in' },
            { status: 500 }
          )
        }
      }
    } else if (event_type === 'check_out') {
      if (existingAttendance) {
        // Update existing record with check-out time
        const { error: updateError } = await supabase
          .from('attendance')
          .update({
            check_out_time: time,
            biometric_device: device_name,
          })
          .eq('id', existingAttendance.id)

        if (updateError) {
          return Response.json(
            { error: 'Failed to record check-out' },
            { status: 500 }
          )
        }
      } else {
        // Create new attendance record with check-out (shouldn't normally happen)
        const { error: insertError } = await supabase
          .from('attendance')
          .insert([
            {
              tenant_id,
              worker_id: worker.id,
              attendance_date: date,
              check_out_time: time,
              status: 'present',
              biometric_device: device_name,
            },
          ])

        if (insertError) {
          return Response.json(
            { error: 'Failed to record check-out' },
            { status: 500 }
          )
        }
      }
    }

    return Response.json({
      success: true,
      message: `${event_type} recorded successfully`,
      worker_id: worker.id,
      timestamp,
    })
  } catch (error) {
    console.error('Biometric API error:', error)
    return Response.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// GET endpoint for health check and documentation
export async function GET() {
  return Response.json({
    status: 'ok',
    message: 'Biometric Attendance API',
    endpoint: '/api/biometric/attendance',
    method: 'POST',
    description: 'Records attendance from biometric devices',
    required_fields: {
      tenant_id: 'UUID of the tenant',
      employee_id: 'Employee ID string',
      timestamp: 'ISO 8601 timestamp of the event',
      event_type: 'check_in or check_out',
    },
    optional_fields: {
      device_name: 'Name or ID of the biometric device',
    },
    example: {
      tenant_id: 'f47ac10b-58cc-4372-a567-0e02b2c3d479',
      employee_id: 'EMP001',
      timestamp: '2024-03-02T09:30:00Z',
      event_type: 'check_in',
      device_name: 'Device-1',
    },
  })
}
