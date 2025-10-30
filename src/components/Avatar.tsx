import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import { User as UserIcon } from 'lucide-react'

type Props = {
  url: string | null
  size?: number
  onUpload: (event: React.ChangeEvent<HTMLInputElement>) => void
  uploading: boolean
}

export default function Avatar({ url, size = 128, onUpload, uploading }: Props) {
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null)

  useEffect(() => {
    if (url) {
      // Create a temporary signed URL to display the private image
      supabase.storage
        .from('avatars')
        .createSignedUrl(url, 3600) // URL is valid for 1 hour
        .then(({ data, error }) => {
          if (error) {
            console.error('Error creating signed URL for avatar:', error)
          } else {
            setAvatarUrl(data.signedUrl)
          }
        })
    }
  }, [url])

  return (
    <div className="flex flex-col items-center gap-4">
      {avatarUrl ? (
        <img
          src={avatarUrl}
          alt="Avatar"
          className="rounded-full object-cover"
          style={{ height: size, width: size }}
        />
      ) : (
        <div
          className="bg-gray-200 rounded-full flex items-center justify-center"
          style={{ height: size, width: size }}
        >
          <UserIcon className="h-1/2 w-1/2 text-gray-500" />
        </div>
      )}
      <div>
        <label
          htmlFor="avatar-upload"
          className="cursor-pointer bg-gray-200 text-gray-700 px-4 py-2 rounded-md text-sm font-medium hover:bg-gray-300 transition"
        >
          {uploading ? 'Uploading...' : 'Upload Photo'}
        </label>
        <input
          type="file"
          id="avatar-upload"
          className="hidden"
          onChange={onUpload}
          disabled={uploading}
          accept="image/*"
        />
      </div>
    </div>
  )
}