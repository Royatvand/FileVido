import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { PLAYLIST_FILE_MAX_BYTES, playlistFileUrl } from '../lib/playlistFiles'
import { formatFileSize } from '../lib/indicators'

// مدیریت PDFهای همراه یک پلی‌لیست (جزوه، چک‌لیست و ...)
function AdminPlaylistFiles({ playlistId, playlistTitle, onNotice }) {
  const [files, setFiles] = useState([])
  const [state, setState] = useState('loading') // loading | ready | missing
  const [title, setTitle] = useState('')
  const [file, setFile] = useState(null)
  const [saving, setSaving] = useState(false)
  const [inputKey, setInputKey] = useState(0)

  const [reloadKey, setReloadKey] = useState(0)
  const load = useCallback(() => setReloadKey((key) => key + 1), [])

  useEffect(() => {
    let active = true
    supabase.select('playlist_files', `&playlist_id=eq.${playlistId}&order=position.asc,created_at.asc`)
      .then((rows) => { if (active) { setFiles(rows || []); setState('ready') } })
      .catch(() => { if (active) setState('missing') }) // معمولاً یعنی supabase/playlist-files.sql هنوز اجرا نشده
    return () => { active = false }
  }, [playlistId, reloadKey])

  function handleFile(event) {
    const picked = event.target.files?.[0]
    if (!picked) return
    const isPdf = picked.type === 'application/pdf' || picked.name.toLowerCase().endsWith('.pdf')
    if (!isPdf) { onNotice({ type: 'error', text: 'فقط فایل PDF مجاز است.' }); event.target.value = ''; return }
    if (picked.size > PLAYLIST_FILE_MAX_BYTES) { onNotice({ type: 'error', text: 'حجم فایل باید حداکثر ۲۰ مگابایت باشد.' }); event.target.value = ''; return }
    setFile(picked)
    if (!title.trim()) setTitle(picked.name.replace(/\.pdf$/i, ''))
  }

  async function handleAdd(event) {
    event.preventDefault()
    if (!file || !title.trim()) return
    setSaving(true)
    let path = ''
    try {
      onNotice({ type: '', text: 'در حال آپلود PDF...' })
      path = await supabase.uploadPlaylistFile(file)
      await supabase.insert('playlist_files', {
        playlist_id: playlistId,
        title: title.trim(),
        file_path: path,
        file_name: file.name,
        file_size: file.size,
        position: files.length ? Math.max(...files.map((item) => item.position || 0)) + 1 : 0,
      })
      onNotice({ type: 'success', text: 'فایل به دوره اضافه شد.' })
      setTitle(''); setFile(null); setInputKey((key) => key + 1)
      load()
    } catch (error) {
      if (path) await supabase.removePlaylistFile(path) // فایل یتیم باقی نماند
      onNotice({ type: 'error', text: error.message })
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(item) {
    if (!window.confirm(`فایل «${item.title}» حذف شود؟`)) return
    try {
      await supabase.remove('playlist_files', item.id)
      await supabase.removePlaylistFile(item.file_path)
      onNotice({ type: 'success', text: 'فایل حذف شد.' })
      load()
    } catch (error) {
      onNotice({ type: 'error', text: error.message })
    }
  }

  return (
    <section className="admin-panel">
      <div className="admin-panel-heading"><div><h2>فایل‌های PDF دوره: {playlistTitle}</h2><p>جزوه یا چک‌لیست اضافه کن؛ زیر لیست جلسات صفحهٔ ویدیو برای دانلود نمایش داده می‌شود. حداکثر ۲۰ مگابایت برای هر فایل.</p></div></div>
      {state === 'loading' && <div className="admin-empty">در حال بارگذاری...</div>}
      {state === 'missing' && <div className="admin-empty">جدول فایل‌ها پیدا نشد. فایل <code>supabase/playlist-files.sql</code> را در Supabase → SQL Editor اجرا کن.</div>}
      {state === 'ready' && (
        <>
          {files.length === 0 ? <div className="admin-empty">هنوز فایلی برای این دوره آپلود نشده است.</div> : (
            <div className="admin-playlist-lessons">
              {files.map((item) => (
                <div key={item.id}>
                  <span className="admin-playlist-position" aria-hidden="true">PDF</span>
                  <strong>{item.title} <small>({formatFileSize(item.file_size)})</small></strong>
                  <div className="admin-row-actions">
                    <a href={playlistFileUrl(item)} target="_blank" rel="noopener noreferrer">مشاهده</a>
                    <button type="button" className="danger" onClick={() => handleDelete(item)}>حذف</button>
                  </div>
                </div>
              ))}
            </div>
          )}
          <form className="admin-form-grid" onSubmit={handleAdd}>
            <label>عنوان فایل *<input value={title} onChange={(event) => setTitle(event.target.value)} required placeholder="مثلاً جزوهٔ جلسهٔ اول" /></label>
            <label>فایل PDF *<input key={inputKey} type="file" accept="application/pdf,.pdf" onChange={handleFile} required /></label>
            <div className="admin-form-actions full"><button type="submit" className="admin-primary-button" disabled={saving || !file || !title.trim()}>{saving ? 'در حال آپلود...' : 'افزودن فایل'}</button></div>
          </form>
        </>
      )}
    </section>
  )
}

export default AdminPlaylistFiles
