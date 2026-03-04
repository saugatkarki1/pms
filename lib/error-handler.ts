import { toast } from 'sonner'

export class AppError extends Error {
  constructor(
    public code: string,
    message: string,
    public statusCode: number = 400,
    public details?: Record<string, any>
  ) {
    super(message)
    this.name = 'AppError'
  }
}

export function handleError(error: unknown): { message: string; code: string } {
  if (error instanceof AppError) {
    console.error(`[v0] ${error.code}:`, error.message, error.details)
    return {
      message: error.message,
      code: error.code,
    }
  }

  if (error instanceof Error) {
    console.error('[v0] Error:', error.message, error.stack)
    return {
      message: error.message,
      code: 'UNKNOWN_ERROR',
    }
  }

  console.error('[v0] Unknown error:', error)
  return {
    message: 'An unexpected error occurred',
    code: 'UNEXPECTED_ERROR',
  }
}

export function notifyError(error: unknown, action: string = 'Operation') {
  const { message } = handleError(error)
  toast.error(`${action} failed: ${message}`)
}

export function notifySuccess(message: string) {
  toast.success(message)
}

export async function tryAsync<T>(
  fn: () => Promise<T>,
  errorAction?: string
): Promise<T | null> {
  try {
    return await fn()
  } catch (error) {
    if (errorAction) {
      notifyError(error, errorAction)
    }
    return null
  }
}

// Common error patterns
export const ERROR_CODES = {
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  NOT_FOUND: 'NOT_FOUND',
  UNAUTHORIZED: 'UNAUTHORIZED',
  FORBIDDEN: 'FORBIDDEN',
  CONFLICT: 'CONFLICT',
  INTERNAL_SERVER_ERROR: 'INTERNAL_SERVER_ERROR',
  DATABASE_ERROR: 'DATABASE_ERROR',
  NETWORK_ERROR: 'NETWORK_ERROR',
}
