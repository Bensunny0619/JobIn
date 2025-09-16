import { useEffect, useState } from "react"
import { supabase } from "../lib/supabaseClient"
import toast from "react-hot-toast"

type Notification = {
  id: string
  user_id: string
  message: string
  created_at: string
  read?: boolean
}

export default function Notifications({
  userId,
  onClose,
}: {
  userId: string
  onClose?: () => void
}) {
  const [notifications, setNotifications] = useState<Notification[]>([])

  async function fetchNotifications() {
    const { data, error } = await supabase
      .from("notifications")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })

    if (!error && data) setNotifications(data)
  }

  useEffect(() => {
    if (!userId) return
    fetchNotifications()

    const channel = supabase
      .channel(`notifications:${userId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          if (payload.eventType === "INSERT") {
            const newNotif = payload.new as Notification
            setNotifications((prev) => [newNotif, ...prev])

            // ✅ Show toast for new notifications
            toast(newNotif.message, {
              icon: "🔔",
            })
          } else if (payload.eventType === "UPDATE") {
            setNotifications((prev) =>
              prev.map((n) => (n.id === (payload.new as Notification).id ? (payload.new as Notification) : n))
            )
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [userId])

  async function markAsRead(id: string) {
    const { error } = await supabase.from("notifications").update({ read: true }).eq("id", id)
    if (!error) {
      setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)))
    }
  }

  async function markAllAsRead() {
    const { error } = await supabase
      .from("notifications")
      .update({ read: true })
      .eq("user_id", userId)
      .eq("read", false)

    if (!error) {
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })))
    }
  }

  const unreadCount = notifications.filter((n) => !n.read).length

  return (
    <div className="bg-white border rounded-lg shadow-md p-2 w-72">
      <div className="flex items-center justify-between mb-2">
        <h3 className="font-semibold text-sm">Notifications</h3>
        {unreadCount > 0 && (
          <button onClick={markAllAsRead} className="text-xs text-blue-600 hover:underline">
            Mark all as read
          </button>
        )}
      </div>

      {notifications.length === 0 ? (
        <p className="text-xs text-gray-500">No notifications yet</p>
      ) : (
        <ul className="max-h-56 overflow-y-auto text-sm space-y-1">
          {notifications.map((n) => (
            <li
              key={n.id}
              className={`p-2 rounded ${n.read ? "bg-gray-50 text-gray-500" : "bg-white"} hover:bg-gray-100 cursor-pointer`}
              onClick={() => {
                if (!n.read) markAsRead(n.id)
                if (onClose) onClose()
              }}
            >
              <div className="font-medium">{n.message}</div>
              <div className="text-[10px] text-gray-400">{new Date(n.created_at).toLocaleString()}</div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
