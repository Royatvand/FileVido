import { useCallback, useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabase'

function slugify(value) {
  return value.trim().toLowerCase()
    .replace(/[\u0600-\u06FF\s]+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
}

function AdminPlaylists({ onNotice }) {
  const [playlists, setPlaylists] = useState([])
  const [videos, setVideos] = useState([])
  const [memberships, setMemberships] = useState([])
  const [selectedId, setSelectedId] = useState('')
  const [editingId, setEditingId] = useState(null)
  const [form, setForm] = useState({ title: '', slug: '', description: '', status: 'draft', cover_url: '' })
  const [selectedCover, setSelectedCover] = useState(null)
  const [coverPreview, setCoverPreview] = useState('')
  const [coverRemoved, setCoverRemoved] = useState(false)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      const [playlistRows, videoRows, membershipRows] = await Promise.all([
        supabase.select('playlists', '&order=created_at.desc'),
        supabase.select('videos', '&order=created_at.desc'),
        supabase.select('playlist_videos', '&order=position.asc'),
      ])
      setPlaylists(playlistRows || [])
      setVideos(videoRows || [])
      setMemberships(membershipRows || [])
    } catch (error) {
      onNotice({ type: 'error', text: error.message })
    } finally {
      setLoading(false)
    }
  }, [onNotice])

  useEffect(() => { loadData() }, [loadData])
  useEffect(() => {
    return () => {
      if (coverPreview.startsWith('blob:')) URL.revokeObjectURL(coverPreview)
    }
  }, [coverPreview])

  const selectedVideos = useMemo(() => memberships
    .filter((item) => item.playlist_id === selectedId)
    .sort((a, b) => a.position - b.position)
    .map((item) => ({ ...item, video: videos.find((video) => video.id === item.video_id) }))
    .filter((item) => item.video), [memberships, selectedId, videos])

  function updateField(event) {
    const { name, value } = event.target
    setForm((current) => ({ ...current, [name]: value }))
  }

  function resetForm() {
    setForm({ title: '', slug: '', description: '', status: 'draft', cover_url: '' })
    setSelectedCover(null)
    setCoverPreview('')
    setCoverRemoved(false)
    setEditingId(null)
  }

  function handleCoverChange(event) {
    const file = event.target.files?.[0]
    if (!file) return
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      onNotice({ type: 'error', text: 'فقط تصویر JPG، PNG یا WEBP مجاز است.' })
      return
    }
    if (file.size > 5 * 1024 * 1024) {
      onNotice({ type: 'error', text: 'حجم تصویر باید حداکثر ۵ مگابایت باشد.' })
      return
    }
    setSelectedCover(file)
    setCoverPreview(URL.createObjectURL(file))
    setCoverRemoved(false)
  }

  function removeCover() {
    setSelectedCover(null)
    setCoverPreview('')
    setCoverRemoved(true)
  }

  function editPlaylist(playlist) {
    setForm({ title: playlist.title, slug: playlist.slug, description: playlist.description || '', status: playlist.status, cover_url: playlist.cover_url || '' })
    setSelectedCover(null)
    setCoverPreview(playlist.cover_url || '')
    setCoverRemoved(false)
    setEditingId(playlist.id)
    setSelectedId(playlist.id)
  }

  async function handleSubmit(event) {
    event.preventDefault()
    setSaving(true)
    try {
      let coverUrl = coverRemoved ? '' : form.cover_url
      if (selectedCover) {
        onNotice({ type: '', text: 'در حال آپلود تصویر کاور...' })
        coverUrl = await supabase.uploadVideoCover(selectedCover)
      }
      const payload = {
        title: form.title.trim(),
        slug: form.slug.trim() || slugify(form.title) || 'playlist-' + Date.now(),
        description: form.description.trim(),
        status: form.status,
        updated_at: new Date().toISOString(),
      }
      // ستون cover_url فقط وقتی فرستاده می‌شود که کاوری وجود دارد یا حذف شده؛ تا قبل از اجرای SQL هم ذخیره بقیه فیلدها کار کند
      if (coverUrl || (editingId && coverRemoved)) payload.cover_url = coverUrl
      if (editingId) await supabase.update('playlists', editingId, payload)
      else await supabase.insert('playlists', payload)
      onNotice({ type: 'success', text: editingId ? 'پلی‌لیست به‌روزرسانی شد.' : 'پلی‌لیست ساخته شد.' })
      resetForm()
      await loadData()
    } catch (error) {
      onNotice({ type: 'error', text: error.message })
    } finally {
      setSaving(false)
    }
  }

  async function deletePlaylist(playlist) {
    if (!window.confirm('پلی‌لیست «' + playlist.title + '» حذف شود؟ ویدیوها حذف نمی‌شوند.')) return
    try {
      await supabase.remove('playlists', playlist.id)
      if (selectedId === playlist.id) setSelectedId('')
      if (editingId === playlist.id) resetForm()
      onNotice({ type: 'success', text: 'پلی‌لیست حذف شد؛ ویدیوها مستقل باقی ماندند.' })
      await loadData()
    } catch (error) {
      onNotice({ type: 'error', text: error.message })
    }
  }

  async function moveVideo(index, direction) {
    const targetIndex = index + direction
    if (targetIndex < 0 || targetIndex >= selectedVideos.length) return
    const current = selectedVideos[index]
    const target = selectedVideos[targetIndex]
    try {
      await Promise.all([
        supabase.updateWhere('playlist_videos', 'playlist_id=eq.' + selectedId + '&video_id=eq.' + current.video_id, { position: target.position }),
        supabase.updateWhere('playlist_videos', 'playlist_id=eq.' + selectedId + '&video_id=eq.' + target.video_id, { position: current.position }),
      ])
      await loadData()
    } catch (error) {
      onNotice({ type: 'error', text: error.message })
    }
  }

  if (loading) return <div className="admin-panel"><div className="admin-empty">در حال بارگذاری پلی‌لیست‌ها...</div></div>

  return (
    <div className="admin-playlists-layout">
      <form className="admin-panel" onSubmit={handleSubmit}>
        <div className="admin-panel-heading">
          <div><h2>{editingId ? 'ویرایش پلی‌لیست' : 'ساخت پلی‌لیست جدید'}</h2><p>یک مجموعه آموزشی بساز و هر زمان خواستی ویدیوهای بیشتری به آن اضافه کن.</p></div>
        </div>
        <div className="admin-form-grid">
          <label>عنوان پلی‌لیست *<input name="title" value={form.title} onChange={updateField} required placeholder="مثلاً دوره کامل پرایس اکشن" /></label>
          <label>شناسه صفحه (Slug)<input name="slug" value={form.slug} onChange={updateField} placeholder="در صورت خالی بودن خودکار ساخته می‌شود" /></label>
          <div className="admin-cover-field full">
            <span>تصویر کاور پلی‌لیست</span>
            <label className="admin-cover-picker">
              <input type="file" accept="image/jpeg,image/png,image/webp" onChange={handleCoverChange} />
              <span>＋ انتخاب تصویر از دستگاه</span>
            </label>
            <small>JPG، PNG یا WEBP — حداکثر ۵ مگابایت. این تصویر در صفحه اصلی روی کارت دوره نمایش داده می‌شود.</small>
            {coverPreview && <img className="admin-cover-preview" src={coverPreview} alt="پیش‌نمایش کاور پلی‌لیست" />}
            {coverPreview && <button type="button" className="admin-secondary-button" onClick={removeCover}>حذف کاور</button>}
          </div>
          <label className="full">توضیحات<textarea name="description" rows="3" value={form.description} onChange={updateField} placeholder="توضیح کوتاه درباره این مجموعه..." /></label>
          <label>وضعیت انتشار<select name="status" value={form.status} onChange={updateField}><option value="draft">پیش‌نویس</option><option value="published">انتشار عمومی</option></select></label>
        </div>
        <div className="admin-form-actions">
          {editingId && <button type="button" className="admin-secondary-button" onClick={resetForm}>لغو ویرایش</button>}
          <button type="submit" className="admin-primary-button" disabled={saving}>{saving ? 'در حال ذخیره...' : editingId ? 'ذخیره تغییرات' : 'ساخت پلی‌لیست'}</button>
        </div>
      </form>

      <section className="admin-panel">
        <div className="admin-panel-heading"><div><h2>پلی‌لیست‌های ساخته‌شده</h2><p>برای اضافه‌کردن ویدیو، آن را از فرم افزودن یا ویرایش ویدیو انتخاب کن.</p></div></div>
        {playlists.length === 0 ? <div className="admin-empty">هنوز پلی‌لیستی ساخته نشده است.</div> : (
          <div className="admin-playlist-list">
            {playlists.map((playlist) => {
              const count = memberships.filter((item) => item.playlist_id === playlist.id).length
              return (
                <article key={playlist.id} className={selectedId === playlist.id ? 'selected' : ''}>
                  {playlist.cover_url && <img className="admin-playlist-thumb" src={playlist.cover_url} alt="" />}
                  <div className="admin-playlist-info"><strong>{playlist.title}</strong><small>{count} ویدیو · {playlist.status === 'published' ? 'منتشرشده' : 'پیش‌نویس'}</small></div>
                  <div className="admin-row-actions">
                    <button type="button" onClick={() => setSelectedId(playlist.id)}>ترتیب ویدیوها</button>
                    <button type="button" onClick={() => editPlaylist(playlist)}>ویرایش</button>
                    <button type="button" className="danger" onClick={() => deletePlaylist(playlist)}>حذف</button>
                  </div>
                </article>
              )
            })}
          </div>
        )}
      </section>

      {selectedId && (
        <section className="admin-panel">
          <div className="admin-panel-heading"><div><h2>ترتیب جلسات: {playlists.find((item) => item.id === selectedId)?.title}</h2><p>با فلش‌ها ترتیب نمایش ویدیوها را تغییر بده.</p></div></div>
          {selectedVideos.length === 0 ? <div className="admin-empty">هنوز ویدیویی به این پلی‌لیست اضافه نشده است. هنگام افزودن یا ویرایش ویدیو، این پلی‌لیست را انتخاب کن.</div> : (
            <div className="admin-playlist-lessons">
              {selectedVideos.map((item, index) => (
                <div key={item.video_id}>
                  <span className="admin-playlist-position">{String(index + 1).padStart(2, '0')}</span>
                  <strong>{item.video.title}</strong>
                  <div className="admin-row-actions">
                    <button type="button" disabled={index === 0} onClick={() => moveVideo(index, -1)}>↑</button>
                    <button type="button" disabled={index === selectedVideos.length - 1} onClick={() => moveVideo(index, 1)}>↓</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      )}
    </div>
  )
}

export default AdminPlaylists
