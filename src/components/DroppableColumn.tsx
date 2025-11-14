import { useDroppable } from "@dnd-kit/core"
import React from "react"

export default function DroppableColumn({
  id,
  children,
  data,
}: {
  id: string
  children: React.ReactNode
  data?: any
}) {
  const { setNodeRef, isOver } = useDroppable({ id, data })

  return (
    <div
      ref={setNodeRef}
      className={`rounded-xl p-4 w-full sm:w-72 flex-shrink-0 transition-colors ${
        isOver ? "bg-blue-100" : "bg-gray-100"
      }`}
    >
      {children}
    </div>
  )
}
