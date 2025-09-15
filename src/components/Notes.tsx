import { useEffect, useState } from "react"
import { supabase } from "../lib/supabaseClient"

type Note = {
  id: string
  content: string
  reminder_date: string | null
}

export default function Notes({ applicationId }: { applicationId: string }) {
  const [notes, setNotes] = useState<Note[]>([])
  const [newNote, setNewNote] = useState("")
  const [reminder, setReminder] = useState("")

  async function fetchNotes() {
    const { data, error } = await supabase
      .from("notes")
      .select("*")
      .eq("application_id", applicationId)
      .order("created_at", { ascending: false })

    if (!error && data) setNotes(data)
  }

  async function addNote() {
    if (!newNote.trim()) return

    const { error } = await supabase.from("notes").insert([
      {
        application_id: applicationId,
        content: newNote,
        reminder_date: reminder || null,
        user_id: (await supabase.auth.getUser()).data.user?.id,
      },
    ])

    if (!error) {
      setNewNote("")
      setReminder("")
      fetchNotes()
    }
  }

  async function deleteNote(id: string) {
    await supabase.from("notes").delete().eq("id", id)
    fetchNotes()
  }

  useEffect(() => {
    fetchNotes()
  }, [])

  return (
    <div className="mt-2 text-xs w-full">
  <div className="space-y-2 max-h-20 overflow-y-auto scroll-invisible w-full">
    {notes.map((note) => (
      <div
        key={note.id}
        className="p-2 border rounded-md bg-gray-50 flex justify-between items-start gap-2 w-full"
      >
        <div className="flex-1 min-w-0 break-words">
          <p className="text-gray-800 text-xs">{note.content}</p>
          {note.reminder_date && (
            <p className="text-[11px] text-gray-500 truncate">
              Reminder: {note.reminder_date}
            </p>
          )}
        </div>
        <button
          onClick={() => deleteNote(note.id)}
          className="text-[11px] text-red-500 hover:underline shrink-0"
        >
          ✕
        </button>
      </div>
    ))}
  </div>


      {/* Add note form */}
      <div className="mt-2 space-y-2 w-full">
        <textarea
          value={newNote}
          onChange={(e) => setNewNote(e.target.value)}
          placeholder="Add a note..."
          className="w-full border rounded p-1 text-xs resize-none h-14"
        />
        <input
          type="date"
          value={reminder}
          onChange={(e) => setReminder(e.target.value)}
          className="w-full border rounded p-1 text-xs"
        />
        <button
          onClick={addNote}
          className="bg-blue-600 text-white px-2 py-1.5 rounded text-xs w-full"
        >
          Add Note
        </button>
      </div>
    </div>
  )
}
