import { createClient } from '@supabase/supabase-js'

export async function GET() {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!supabaseUrl || !supabaseServiceKey) {
      return Response.json(
        {
          status: 'error',
          message: 'Missing Supabase configuration',
          details: {
            hasUrl: !!supabaseUrl,
            hasServiceKey: !!supabaseServiceKey,
          },
        },
        { status: 500 }
      )
    }

    // Test database connection
    const supabase = createClient(supabaseUrl, supabaseServiceKey)
    const { data: tableData, error: tableError } = await supabase
      .from('tenants')
      .select('count', { count: 'exact', head: true })

    if (tableError) {
      return Response.json(
        {
          status: 'error',
          message: 'Database connection failed',
          error: tableError.message,
        },
        { status: 503 }
      )
    }

    return Response.json({
      status: 'ok',
      message: 'Workforce Management System API is healthy',
      timestamp: new Date().toISOString(),
      checks: {
        supabase: 'connected',
        database: 'accessible',
        tables: {
          tenants: 'ok',
        },
      },
    })
  } catch (error) {
    console.error('[v0] Health check error:', error)
    return Response.json(
      {
        status: 'error',
        message: 'Health check failed',
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
