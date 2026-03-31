import { useEffect, useRef, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { RealtimeChannel } from '@supabase/supabase-js'

/**
 * Subscribe to Supabase Realtime changes on a table.
 * Calls `onUpdate` whenever an INSERT, UPDATE, or DELETE happens.
 */
export function useRealtimeTable(
  table: string,
  tenantId: string | undefined,
  onUpdate: () => void
) {
  const channelRef = useRef<RealtimeChannel | null>(null)
  const stableOnUpdate = useCallback(onUpdate, [onUpdate])

  useEffect(() => {
    if (!tenantId) return

    const supabase = createClient()
    const channel = supabase
      .channel(`realtime-${table}-${tenantId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table,
          filter: `tenant_id=eq.${tenantId}`,
        },
        () => {
          stableOnUpdate()
        }
      )
      .subscribe()

    channelRef.current = channel

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current)
        channelRef.current = null
      }
    }
  }, [table, tenantId, stableOnUpdate])
}
