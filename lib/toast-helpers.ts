import { toast } from 'sonner'

export const showToast = {
  success: (message: string) => {
    toast.success(message, {
      duration: 3000,
      position: 'top-right',
    })
  },

  error: (message: string) => {
    toast.error(message, {
      duration: 4000,
      position: 'top-right',
    })
  },

  loading: (message: string) => {
    return toast.loading(message, {
      position: 'top-right',
    })
  },

  promise: <T,>(
    promise: Promise<T>,
    messages: {
      loading: string
      success: string
      error: string
    }
  ) => {
    return toast.promise(promise, messages, {
      position: 'top-right',
    })
  },

  info: (message: string) => {
    toast.info(message, {
      duration: 3000,
      position: 'top-right',
    })
  },

  warning: (message: string) => {
    toast.warning(message, {
      duration: 3000,
      position: 'top-right',
    })
  },
}

export const handleError = (error: unknown, defaultMessage: string = 'An error occurred') => {
  if (error instanceof Error) {
    console.error('[Error]', error.message)
    showToast.error(error.message)
  } else {
    console.error('[Error]', error)
    showToast.error(defaultMessage)
  }
}

export const handleSuccess = (message: string = 'Operation successful') => {
  showToast.success(message)
}
