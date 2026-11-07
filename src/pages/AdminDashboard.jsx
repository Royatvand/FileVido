import { useCallback, useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabase'
import AdminBanners from '../components/AdminBanners'
import AdminPlaylists from '../components/AdminPlaylists'
import { extractAparatId } from '../lib/aparat'

const emptyForm = {
  title: '', slug: '', description: '', aparat_id: '', cover_url: '',
  category_id: '', duration: '', level: 'مقدماتی', instructor: '',
  tags: '', is_featured: false, status: 'draft', playlist_ids: [],
}

function slugify(value) {
  return value.trim().toLowerCase()
    .replace(/[\u0600-\u06FF\s]+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
}

function AdminDashboard() {
  const [videos, setVideos] = useState([])
  const [categories, setCategories] = useState([])
  const [playlists, setPlaylists] = useState([])
  const [form, setForm] = useState(emptyForm)
  const [editingId, setEditingId] = useState(null)
  const [selectedCover, setSelectedCover] = useState(null)
  const [coverPreview, setCoverPreview] = useState('')
  const [aparatSource, setAparatSource] = useState('')
  const [search, setSearch] = useState('')
  const [activeTab, setActiveTab] = useState('videos')
  const [newCategory, setNewCategory] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [notice, setNotice] = useState({ type: '', text: '' })

  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      const [videoRows, categoryRows, playlistRows] = await Promise.all([
        supabase.select('videos', '&order=created_at.desc'),
        supabase.select('categories', '&order=name.asc'),
        supabase.select('playlists', '&order=title.asc'),
      ])
      setVideos(videoRows || [])
      setCategories(categoryRows || [])
      setPlaylists(playlistRows || [])
    } catch (error) {
      setNotice({ type: 'error', text: error.message })
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { loadData() }, [loadData])
  useEffect(() => {
    return () => {
      if (coverPreview.startsWith('blob:')) URL.revokeObjectURL(coverPreview)
    }
  }, [coverPreview])

  const filteredVideos = useMemo(() => {
    const term = search.trim().toLowerCase()
    if (!term) return videos
    return videos.filter((video) => `${video.title} ${video.description}`.toLowerCase().includes(term))
  }, [videos, search])

  function updateField(event) {
    const { name, value, type, checked } = event.target
    setForm((current) => ({ ...current, [name]: type === 'checkbox' ? checked : value }))
  }

  function handleCoverChange(event) {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp']
    if (!allowedTypes.includes(file.type)) {
      setNotice({ type: 'error', text: 'فقط تصاویر JPG، PNG یا WEBP قابل آپلود هستند.' })
      return
    }
    if (file.size > 5 * 1024 * 1024) {
      setNotice({ type: 'error', text: 'حجم تصویر باید حداکثر ۵ مگابایت باشد.' })
      return
    }
    setSelectedCover(file)
    setCoverPreview(URL.createObjectURL(file))
    setNotice({ type: '', text: '' })
  }

  function resetForm() {
    setForm(emptyForm)
    setEditingId(null)
    setSelectedCover(null)
    setCoverPreview('')
    setAparatSource('')
  }

  async function startEdit(video) {
    const memberships = await supabase.select('playlist_videos', '&video_id=eq.' + video.id)
    setEditingId(video.id)
    setSelectedCover(null)
    setAparatSource('')
    setCoverPreview(video.cover_url || '')
    setForm({
      title: video.title || '', slug: video.slug || '', description: video.description || '',
      aparat_id: video.aparat_id || '', cover_url: video.cover_url || '',
      category_id: video.category_id || '', duration: video.duration || '',
      level: video.level || 'مقدماتی', instructor: video.instructor || '',
      tags: (video.tags || []).join(', '), is_featured: Boolean(video.is_featured),
      status: video.status || 'draft',
      playlist_ids: (memberships || []).map((item) => item.playlist_id),
    })
    setActiveTab('form')
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const aparatResult = extractAparatId(aparatSource)

  function handleAparatSourceChange(event) {
    const value = event.target.value
    setAparatSource(value)
    const result = extractAparatId(value)
    if (result.id) setForm((current) => ({ ...current, aparat_id: result.id }))
  }

  async function handleVideoSubmit(event) {
    event.preventDefault()
    setSaving(true)
    setNotice({ type: '', text: '' })
    try {
      let coverUrl = form.cover_url.trim()
      if (selectedCover) {
        setNotice({ type: '', text: 'در حال آپلود تصویر کاور...' })
        coverUrl = await supabase.uploadVideoCover(selectedCover)
      }

      const payload = {
        title: form.title.trim(),
        slug: (form.slug.trim() || slugify(form.title) || `video-${Date.now()}`),
        description: form.description.trim(),
        aparat_id: form.aparat_id.trim(),
        cover_url: coverUrl,
        category_id: form.category_id || null,
        duration: form.duration.trim(),
        level: form.level,
        instructor: form.instructor.trim(),
        tags: form.tags.split(',').map((tag) => tag.trim()).filter(Boolean),
        is_featured: form.is_featured,
        status: form.status,
        published_at: form.status === 'published' ? new Date().toISOString() : null,
        updated_at: new Date().toISOString(),
      }
      let videoId = editingId
      if (editingId) await supabase.update('videos', editingId, payload)
      else {
        const insertedRows = await supabase.insert('videos', payload)
        videoId = insertedRows?.[0]?.id
      }
      if (!videoId) throw new Error('شناسه ویدیو دریافت نشد.')
      await supabase.replaceVideoPlaylists(videoId, form.playlist_ids)
      setNotice({ type: 'success', text: editingId ? 'تغییرات ویدیو ذخیره شد.' : 'ویدیو با موفقیت ثبت شد.' })
      resetForm()
      setActiveTab('videos')
      await loadData()
    } catch (error) {
      setNotice({ type: 'error', text: error.message })
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(video) {
    if (!window.confirm(`ویدیوی «${video.title}» حذف شود؟`)) return
    try {
      await supabase.remove('videos', video.id)
      setNotice({ type: 'success', text: 'ویدیو حذف شد.' })
      await loadData()
    } catch (error) {
      setNotice({ type: 'error', text: error.message })
    }
  }

  async function handleCategorySubmit(event) {
    event.preventDefault()
    const name = newCategory.trim()
    if (!name) return
    try {
      await supabase.insert('categories', { name, slug: slugify(name) || `category-${Date.now()}` })
      setNewCategory('')
      setNotice({ type: 'success', text: 'دسته‌بندی اضافه شد.' })
      await loadData()
    } catch (error) {
      setNotice({ type: 'error', text: error.message })
    }
  }

  async function handleLogout() {
    await supabase.signOut()
    window.location.href = '/admin/login'
  }

  return (
    <main className="admin-page" dir="rtl">
      <aside className="admin-sidebar">
        <a className="admin-sidebar-brand" href="/"><span className="admin-brand-mark">T<span>.</span></span><span>Trade<span>Farsi</span><small>مدیریت محتوا</small></span></a>
        <div className="admin-side-label">مدیریت</div>
        <button className={activeTab === 'videos' ? 'active' : ''} onClick={() => { resetForm(); setActiveTab('videos') }}>▤ <span>ویدیوها</span></button>
        <button className={activeTab === 'form' ? 'active' : ''} onClick={() => { resetForm(); setActiveTab('form'); loadData() }}>＋ <span>افزودن ویدیو</span></button>
        <button className={activeTab === 'categories' ? 'active' : ''} onClick={() => setActiveTab('categories')}>◫ <span>دسته‌بندی‌ها</span></button>
        <button className={activeTab === 'playlists' ? 'active' : ''} onClick={() => setActiveTab('playlists')}>▤ <span>پلی‌لیست‌ها</span></button>
        <button className={activeTab === 'banners' ? 'active' : ''} onClick={() => setActiveTab('banners')}>▣ <span>اسلایدر</span></button>
        <div className="admin-sidebar-bottom">
          <a href="/" target="_blank" rel="noreferrer">مشاهده سایت ↗</a>
          <button onClick={handleLogout}>خروج از حساب <span>↗</span></button>
        </div>
      </aside>

      <section className="admin-workspace">
        <header className="admin-topbar">
          <div><span className="admin-kicker">TRADEFARSI / ADMIN</span><h1>{activeTab === 'videos' ? 'ویدیوها' : activeTab === 'form' ? (editingId ? 'ویرایش ویدیو' : 'افزودن ویدیوی جدید') : activeTab === 'banners' ? 'اسلایدر صفحه اصلی' : activeTab === 'playlists' ? 'مدیریت پلی‌لیست‌ها' : 'دسته‌بندی‌ها'}</h1></div>
          <div className="admin-live-status"><i /> اتصال به دیتابیس</div>
        </header>

        {notice.text && <div className={`admin-alert ${notice.type || ''}`}>{notice.text}<button onClick={() => setNotice({ type: '', text: '' })}>×</button></div>}

        {activeTab === 'videos' && (
          <>
            <div className="admin-stats">
              <article><span>کل ویدیوها</span><strong>{videos.length}</strong></article>
              <article><span>منتشرشده</span><strong>{videos.filter((item) => item.status === 'published').length}</strong></article>
              <article><span>پیش‌نویس</span><strong>{videos.filter((item) => item.status === 'draft').length}</strong></article>
              <article><span>دسته‌بندی‌ها</span><strong>{categories.length}</strong></article>
            </div>
            <div className="admin-panel">
              <div className="admin-panel-heading"><div><h2>کتابخانه ویدیوها</h2><p>مدیریت و انتشار محتوای آموزشی</p></div><button className="admin-primary-button compact" onClick={() => { resetForm(); setActiveTab('form') }}>＋ ویدیوی جدید</button></div>
              <div className="admin-search"><span>⌕</span><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="جست‌وجوی عنوان ویدیو..." /></div>
              {loading ? <div className="admin-empty">در حال دریافت اطلاعات...</div> : filteredVideos.length === 0 ? <div className="admin-empty">هنوز ویدیویی ثبت نشده است.</div> : (
                <div className="admin-table-wrap"><table className="admin-table"><thead><tr><th>ویدیو</th><th>دسته‌بندی</th><th>وضعیت</th><th>تاریخ ثبت</th><th>عملیات</th></tr></thead><tbody>
                  {filteredVideos.map((video) => <tr key={video.id}><td><div className="admin-video-cell"><img src={video.cover_url || '/covers/cover-1.svg'} alt="" /><span><strong>{video.title}</strong><small>{video.aparat_id}</small></span></div></td><td>{categories.find((item) => item.id === video.category_id)?.name || '—'}</td><td><span className={`admin-status ${video.status}`}>{video.status === 'published' ? 'منتشرشده' : 'پیش‌نویس'}</span></td><td>{new Date(video.created_at).toLocaleDateString('fa-IR')}</td><td><div className="admin-row-actions"><button onClick={() => startEdit(video)}>ویرایش</button><button className="danger" onClick={() => handleDelete(video)}>حذف</button><a href={`/video/${video.slug}`} target="_blank" rel="noreferrer">مشاهده</a></div></td></tr>)}
                </tbody></table></div>
              )}
            </div>
          </>
        )}

        {activeTab === 'form' && (
          <form className="admin-panel admin-video-form" onSubmit={handleVideoSubmit}>
            <div className="admin-panel-heading"><div><h2>{editingId ? 'ویرایش اطلاعات ویدیو' : 'اطلاعات ویدیوی جدید'}</h2><p>اطلاعات نمایش ویدیو را تکمیل کنید.</p></div></div>
            <div className="admin-form-grid">
              <label>عنوان ویدیو *<input name="title" value={form.title} onChange={updateField} required placeholder="مثلاً آموزش تحلیل تکنیکال" /></label>
              <label>شناسه یکتای صفحه (Slug)<input name="slug" value={form.slug} onChange={updateField} placeholder="اگر خالی باشد خودکار ساخته می‌شود" /></label>
              <label className="full">لینک یا کد ویدیوی آپارات
                <input value={aparatSource} onChange={handleAparatSourceChange} dir="ltr" placeholder="https://www.aparat.com/v/nssb82r  یا  کد iframe آپارات" aria-invalid={Boolean(aparatResult.error)} />
                {aparatResult.error && <small className="admin-field-hint error" role="alert">{aparatResult.error}</small>}
                {aparatResult.id && aparatResult.id === form.aparat_id && <small className="admin-field-hint success">شناسه ویدیو استخراج شد و در فیلد زیر قرار گرفت: {aparatResult.id}</small>}
              </label>
              <label>شناسه یا هش آپارات *<input name="aparat_id" value={form.aparat_id} onChange={updateField} required placeholder="مثلاً gvtvv7m (از لینک بالا خودکار پر می‌شود)" /></label>
              <div className="admin-cover-field">
                <span>تصویر کاور ویدیو</span>
                <label className="admin-cover-picker">
                  <input type="file" accept="image/jpeg,image/png,image/webp" onChange={handleCoverChange} />
                  <span>＋ انتخاب تصویر از دستگاه</span>
                </label>
                <small>JPG، PNG یا WEBP — حداکثر ۵ مگابایت</small>
                {coverPreview && <img className="admin-cover-preview" src={coverPreview} alt="پیش‌نمایش کاور ویدیو" />}
              </div>
              <label>دسته‌بندی<select name="category_id" value={form.category_id} onChange={updateField}><option value="">بدون دسته‌بندی</option>{categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}</select></label>
              <div className="admin-playlist-select full">
                <strong>افزودن به پلی‌لیست</strong>
                <small>یک یا چند مجموعه انتخاب کن؛ بدون انتخاب، ویدیو مستقل می‌ماند.</small>
                {playlists.length === 0 ? <span>هنوز پلی‌لیستی ساخته نشده است.</span> : <div className="admin-playlist-options">
                  {playlists.map((playlist) => <label key={playlist.id}>
                    <input type="checkbox" checked={form.playlist_ids.includes(playlist.id)} onChange={(event) => setForm((current) => ({ ...current, playlist_ids: event.target.checked ? [...current.playlist_ids, playlist.id] : current.playlist_ids.filter((id) => id !== playlist.id) }))} />
                    <span>{playlist.title}</span>
                    <small>{playlist.status === 'published' ? 'منتشرشده' : 'پیش‌نویس'}</small>
                  </label>)}
                </div>}
              </div>
              <label>مدت ویدیو<input name="duration" value={form.duration} onChange={updateField} placeholder="مثلاً 18:45" /></label>
              <label>مدرس<input name="instructor" value={form.instructor} onChange={updateField} placeholder="نام مدرس" /></label>
              <label>سطح آموزش<select name="level" value={form.level} onChange={updateField}><option>مقدماتی</option><option>متوسط</option><option>پیشرفته</option></select></label>
              <label className="full">توضیحات<textarea name="description" rows="5" value={form.description} onChange={updateField} placeholder="توضیحات کامل ویدیو..." /></label>
              <label className="full">تگ‌ها<input name="tags" value={form.tags} onChange={updateField} placeholder="پرایس اکشن، تحلیل تکنیکال، ترید (با کاما جدا کنید)" /></label>
              <label>وضعیت انتشار<select name="status" value={form.status} onChange={updateField}><option value="draft">پیش‌نویس</option><option value="published">انتشار عمومی</option></select></label>
              <label className="admin-checkbox"><input type="checkbox" name="is_featured" checked={form.is_featured} onChange={updateField} /> نمایش به‌عنوان ویدیوی ویژه</label>
            </div>
            <div className="admin-form-actions"><button type="button" className="admin-secondary-button" onClick={() => { resetForm(); setActiveTab('videos') }}>انصراف</button><button type="submit" className="admin-primary-button" disabled={saving}>{saving ? (selectedCover ? 'در حال آپلود و ذخیره...' : 'در حال ذخیره...') : editingId ? 'ذخیره تغییرات' : 'ثبت ویدیو'}</button></div>
          </form>
        )}

        {activeTab === 'playlists' && <AdminPlaylists onNotice={setNotice} />}
        {activeTab === 'banners' && <AdminBanners videos={videos} onNotice={setNotice} />}

        {activeTab === 'categories' && (
          <div className="admin-panel">
            <div className="admin-panel-heading"><div><h2>دسته‌بندی‌های محتوا</h2><p>موضوعات اصلی کتابخانه آموزشی</p></div></div>
            <form className="admin-category-form" onSubmit={handleCategorySubmit}><input value={newCategory} onChange={(event) => setNewCategory(event.target.value)} placeholder="نام دسته‌بندی جدید" required /><button className="admin-primary-button compact" type="submit">افزودن دسته‌بندی</button></form>
            <div className="admin-category-list">{categories.map((category) => <div key={category.id}><span>{category.name}</span><small>{category.slug}</small></div>)}</div>
          </div>
        )}
      </section>
    </main>
  )
}

export default AdminDashboard
