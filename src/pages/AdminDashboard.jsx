import { useCallback, useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabase'

const emptyForm = {
  title: '', slug: '', description: '', aparat_id: '', cover_url: '',
  category_id: '', duration: '', level: 'مقدماتی', instructor: '',
  tags: '', is_featured: false, status: 'draft',
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
  const [form, setForm] = useState(emptyForm)
  const [editingId, setEditingId] = useState(null)
  const [search, setSearch] = useState('')
  const [activeTab, setActiveTab] = useState('videos')
  const [newCategory, setNewCategory] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [notice, setNotice] = useState({ type: '', text: '' })

  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      const [videoRows, categoryRows] = await Promise.all([
        supabase.select('videos', '&order=created_at.desc'),
        supabase.select('categories', '&order=name.asc'),
      ])
      setVideos(videoRows || [])
      setCategories(categoryRows || [])
    } catch (error) {
      setNotice({ type: 'error', text: error.message })
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { loadData() }, [loadData])

  const filteredVideos = useMemo(() => {
    const term = search.trim().toLowerCase()
    if (!term) return videos
    return videos.filter((video) => `${video.title} ${video.description}`.toLowerCase().includes(term))
  }, [videos, search])

  function updateField(event) {
    const { name, value, type, checked } = event.target
    setForm((current) => ({ ...current, [name]: type === 'checkbox' ? checked : value }))
  }

  function resetForm() {
    setForm(emptyForm)
    setEditingId(null)
  }

  function startEdit(video) {
    setEditingId(video.id)
    setForm({
      title: video.title || '', slug: video.slug || '', description: video.description || '',
      aparat_id: video.aparat_id || '', cover_url: video.cover_url || '',
      category_id: video.category_id || '', duration: video.duration || '',
      level: video.level || 'مقدماتی', instructor: video.instructor || '',
      tags: (video.tags || []).join(', '), is_featured: Boolean(video.is_featured),
      status: video.status || 'draft',
    })
    setActiveTab('form')
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  async function handleVideoSubmit(event) {
    event.preventDefault()
    setSaving(true)
    setNotice({ type: '', text: '' })
    try {
      const payload = {
        title: form.title.trim(),
        slug: (form.slug.trim() || slugify(form.title) || `video-${Date.now()}`),
        description: form.description.trim(),
        aparat_id: form.aparat_id.trim(),
        cover_url: form.cover_url.trim(),
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
      if (editingId) await supabase.update('videos', editingId, payload)
      else await supabase.insert('videos', payload)
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
        <button className={activeTab === 'form' ? 'active' : ''} onClick={() => { resetForm(); setActiveTab('form') }}>＋ <span>افزودن ویدیو</span></button>
        <button className={activeTab === 'categories' ? 'active' : ''} onClick={() => setActiveTab('categories')}>◫ <span>دسته‌بندی‌ها</span></button>
        <div className="admin-sidebar-bottom">
          <a href="/" target="_blank" rel="noreferrer">مشاهده سایت ↗</a>
          <button onClick={handleLogout}>خروج از حساب <span>↗</span></button>
        </div>
      </aside>

      <section className="admin-workspace">
        <header className="admin-topbar">
          <div><span className="admin-kicker">TRADEFARSI / ADMIN</span><h1>{activeTab === 'videos' ? 'ویدیوها' : activeTab === 'form' ? (editingId ? 'ویرایش ویدیو' : 'افزودن ویدیوی جدید') : 'دسته‌بندی‌ها'}</h1></div>
          <div className="admin-live-status"><i /> اتصال به دیتابیس</div>
        </header>

        {notice.text && <div className={`admin-alert ${notice.type}`}>{notice.text}<button onClick={() => setNotice({ type: '', text: '' })}>×</button></div>}

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
              <label>شناسه یا هش آپارات *<input name="aparat_id" value={form.aparat_id} onChange={updateField} required placeholder="مثلاً gvtvv7m" /></label>
              <label>آدرس تصویر کاور<input name="cover_url" value={form.cover_url} onChange={updateField} placeholder="https://..." /></label>
              <label>دسته‌بندی<select name="category_id" value={form.category_id} onChange={updateField}><option value="">بدون دسته‌بندی</option>{categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}</select></label>
              <label>مدت ویدیو<input name="duration" value={form.duration} onChange={updateField} placeholder="مثلاً 18:45" /></label>
              <label>مدرس<input name="instructor" value={form.instructor} onChange={updateField} placeholder="نام مدرس" /></label>
              <label>سطح آموزش<select name="level" value={form.level} onChange={updateField}><option>مقدماتی</option><option>متوسط</option><option>پیشرفته</option></select></label>
              <label className="full">توضیحات<textarea name="description" rows="5" value={form.description} onChange={updateField} placeholder="توضیحات کامل ویدیو..." /></label>
              <label className="full">تگ‌ها<input name="tags" value={form.tags} onChange={updateField} placeholder="پرایس اکشن، تحلیل تکنیکال، ترید (با کاما جدا کنید)" /></label>
              <label>وضعیت انتشار<select name="status" value={form.status} onChange={updateField}><option value="draft">پیش‌نویس</option><option value="published">انتشار عمومی</option></select></label>
              <label className="admin-checkbox"><input type="checkbox" name="is_featured" checked={form.is_featured} onChange={updateField} /> نمایش به‌عنوان ویدیوی ویژه</label>
            </div>
            <div className="admin-form-actions"><button type="button" className="admin-secondary-button" onClick={() => { resetForm(); setActiveTab('videos') }}>انصراف</button><button type="submit" className="admin-primary-button" disabled={saving}>{saving ? 'در حال ذخیره...' : editingId ? 'ذخیره تغییرات' : 'ثبت ویدیو'}</button></div>
          </form>
        )}

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
