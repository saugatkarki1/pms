import { toast } from 'sonner'

/** Show a success toast */
export function showSuccess(message: string) {
  toast.success(message, { duration: 3000 })
}

/** Show an error toast */
export function showError(message: string) {
  toast.error(message, { duration: 5000 })
}

/** Show a loading toast — returns dismiss function */
export function showLoading(message: string) {
  return toast.loading(message)
}

/** Dismiss a specific toast by id */
export function dismissToast(id: string | number) {
  toast.dismiss(id)
}

/** Extract a user-friendly error message from Supabase errors */
export function getErrorMessage(error: unknown): string {
  if (!error) return 'An unknown error occurred'
  if (typeof error === 'string') return error
  if (error instanceof Error) return error.message
  if (typeof error === 'object') {
    const e = error as Record<string, unknown>
    return (e.message as string) || (e.error as string) || JSON.stringify(error)
  }
  return String(error)
}
