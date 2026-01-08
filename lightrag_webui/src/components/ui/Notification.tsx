/**
 * 通知/Toast组件
 */

import { createPortal } from 'react-dom'
import { CheckCircle, XCircle, AlertCircle, Info, X } from 'lucide-react'
import { useEffect, useState } from 'react'

export type NotificationType = 'success' | 'error' | 'warning' | 'info'

interface NotificationProps {
  type: NotificationType
  message: string
  duration?: number
  onClose?: () => void
}

export function Notification({
  type,
  message,
  duration = 3000,
  onClose
}: NotificationProps) {
  const [visible, setVisible] = useState(true)

  useEffect(() => {
    if (duration > 0) {
      const timer = setTimeout(() => {
        setVisible(false)
        setTimeout(() => onClose?.(), 300)
      }, duration)
      return () => clearTimeout(timer)
    }
  }, [duration, onClose])

  const icons = {
    success: <CheckCircle className="w-5 h-5 text-green-600" />,
    error: <XCircle className="w-5 h-5 text-red-600" />,
    warning: <AlertCircle className="w-5 h-5 text-yellow-600" />,
    info: <Info className="w-5 h-5 text-blue-600" />
  }

  const bgColors = {
    success: 'bg-green-50 border-green-200',
    error: 'bg-red-50 border-red-200',
    warning: 'bg-yellow-50 border-yellow-200',
    info: 'bg-blue-50 border-blue-200'
  }

  return createPortal(
    <div
      className={`fixed top-4 right-4 max-w-md w-full p-4 rounded-lg border shadow-lg transition-all duration-300 ${
        bgColors[type]
      } ${visible ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-full'}`}
    >
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0 mt-0.5">
          {icons[type]}
        </div>
        <div className="flex-1">
          <p className="text-sm font-medium text-gray-900">{message}</p>
        </div>
        <button
          onClick={() => {
            setVisible(false)
            setTimeout(() => onClose?.(), 300)
          }}
          className="flex-shrink-0 p-1 hover:bg-black/5 rounded transition"
        >
          <X className="w-4 h-4 text-gray-600" />
        </button>
      </div>
    </div>,
    document.body
  )
}

// 通知容器组件
interface NotificationContainerProps {
  notifications: Array<{
    id: string
    type: NotificationType
    message: string
  }>
  onClose: (id: string) => void
}

export function NotificationContainer({ notifications, onClose }: NotificationContainerProps) {
  return (
    <>
      {notifications.map(notification => (
        <Notification
          key={notification.id}
          type={notification.type}
          message={notification.message}
          onClose={() => onClose(notification.id)}
        />
      ))}
    </>
  )
}
