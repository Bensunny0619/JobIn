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
    <div className="mt-4 border-t pt-4">
      <h3 className="font-semibold text-gray-700 mb-2">Notes</h3>

      <div className="space-y-2">
        {notes.map((note) => (
          <div
            key={note.id}
            className="p-2 border rounded-md bg-gray-50 flex justify-between items-center"
          >
            <div>
              <p className="text-sm text-gray-800">{note.content}</p>
              {note.reminder_date && (
                <p className="text-xs text-gray-500">
                  Reminder: {note.reminder_date}
                </p>
              )}
            </div>
            <button
              onClick={() => deleteNote(note.id)}
              className="text-xs text-red-500 hover:underline"
            >
              Delete
            </button>
          </div>
        ))}
      </div>

      <div className="mt-3 space-y-2">
        <textarea
          value={newNote}
          onChange={(e) => setNewNote(e.target.value)}
          placeholder="Add a note..."
          className="w-full border rounded p-2 text-sm"
        />
        <input
          type="date"
          value={reminder}
          onChange={(e) => setReminder(e.target.value)}
          className="w-full border rounded p-2 text-sm"
        />
        <button
          onClick={addNote}
          className="bg-blue-600 text-white px-3 py-1 rounded text-sm"
        >
          Add Note
        </button>
      </div>
    </div>
  )
}
