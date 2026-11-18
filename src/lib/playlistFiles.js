// فایل‌های PDF همراه پلی‌لیست‌ها
export const PLAYLIST_FILE_MAX_BYTES = 20 * 1024 * 1024

export function playlistFileUrl(file) {
  const base = import.meta.env.VITE_SUPABASE_URL
  if (!base || !file?.file_path) return ''
  return `${base}/storage/v1/object/public/playlist-files/${file.file_path}?download=${encodeURIComponent(file.file_name || 'file.pdf')}`
}
