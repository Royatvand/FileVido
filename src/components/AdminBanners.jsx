import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabase'

const emptyForm = { title: '', subtitle: '', link_url: '', image_url: '', sort_order: '', is_active: true }

function AdminBanners({ videos, onNotice }) {
  const [banners, setBanners] = useState([])
  const [loading, setLoading] = useState(true)
  const [tableMissing, setTableMissing] = useState(false)
  const [formOpen, setFormOpen] = useState(false)
  const [form, setForm] = useState(emptyForm)
  const [editingId, setEditingId] = useState(null)
  const [selectedFile, setSelectedFile] = useState(null)
  const [saving, setSaving] = useState(false)

  const [reloadKey, setReloadKey] = useState(0)
  const load = () => setReloadKey((key) => key + 1)

  useEffect(() => {
    let active = true
    async function fetchBanners() {
      try {
        const rows = await supabase.select('banners', '&order=sort_order.asc,created_at.desc')
        if (!active) return
        setBanners(rows || [])
        setTableMissing(false)
      } catch (error) {
        if (!active) return
        setTableMissing(true)
        onNotice({ type: 'error', text: `بارگذاری بنرها انجام نشد: ${error.message}` })
      } finally {
        if (active) setLoading(false)
      }
    }
    fetchBanners()
    return () => { active = false }
  }, [reloadKey, onNotice])

  const previewUrl = useMemo(() => (selectedFile ? URL.createObjectURL(selectedFile) : form.image_url), [selectedFile, form.image_url])
  useEffect(() => () => { if (selectedFile) URL.revokeObjectURL(previewUrl) }, [selectedFile, previewUrl])

  const publishedVideos = videos.filter((video) => video.status === 'published')

  function updateField(event) {
    const { name, value, type, checked } = event.target
    setForm((current) => ({ ...current, [name]: type === 'checkbox' ? checked : value }))
  }

  function pickVideo(event) {
    const video = videos.find((item) => item.id === event.target.value)
    if (!video) return
    setForm((current) => ({
      ...current,
      link_url: `/video/${video.slug}`,
      title: current.title || video.title,
      subtitle: current.subtitle || (video.description || '').slice(0, 110),
      image_url: selectedFile ? current.image_url : (current.image_url || video.cover_url || ''),
    }))
  }

  function handleFileChange(event) {
    const file = event.target.files?.[0]
    if (!file) return
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      onNotice({ type: 'error', text: 'فقط تصاویر JPG، PNG یا WEBP قابل آپلود هستند.' })
      return
    }
    if (file.size > 5 * 1024 * 1024) {
      onNotice({ type: 'error', text: 'حجم تصویر باید حداکثر ۵ مگابایت باشد.' })
      return
    }
    setSelectedFile(file)
    onNotice({ type: '', text: '' })
  }

  function closeForm() {
    setFormOpen(false)
    setEditingId(null)
    setForm(emptyForm)
    setSelectedFile(null)
  }

  function startEdit(banner) {
    setEditingId(banner.id)
    setForm({
      title: banner.title || '', subtitle: banner.subtitle || '', link_url: banner.link_url || '',
      image_url: banner.image_url || '', sort_order: String(banner.sort_order ?? ''), is_active: banner.is_active,
    })
    setSelectedFile(null)
    setFormOpen(true)
  }

  async function handleSubmit(event) {
    event.preventDefault()
    setSaving(true)
    onNotice({ type: '', text: '' })
    try {
      let imageUrl = form.image_url
      if (selectedFile) {
        onNotice({ type: '', text: 'در حال آپلود تصویر بنر...' })
        imageUrl = await supabase.uploadVideoCover(selectedFile)
      }
      if (!imageUrl) throw new Error('برای بنر یک تصویر انتخاب کنید یا ویدیویی را برای استفاده از کاورش انتخاب کنید.')

      const nextOrder = banners.length ? Math.max(...banners.map((item) => item.sort_order || 0)) + 1 : 0
      const payload = {
        title: form.title.trim(),
        subtitle: form.subtitle.trim(),
        image_url: imageUrl,
        link_url: form.link_url.trim(),
        sort_order: form.sort_order === '' ? nextOrder : Number(form.sort_order),
        is_active: form.is_active,
        updated_at: new Date().toISOString(),
      }
      if (editingId) await supabase.update('banners', editingId, payload)
      else await supabase.insert('banners', payload)

      onNotice({ type: 'success', text: editingId ? 'تغییرات بنر ذخیره شد.' : 'بنر جدید ثبت شد.' })
      closeForm()
      load()
    } catch (error) {
      onNotice({ type: 'error', text: error.message })
    } finally {
      setSaving(false)
    }
  }

  async function toggleActive(banner) {
    try {
      await supabase.update('banners', banner.id, { is_active: !banner.is_active, updated_at: new Date().toISOString() })
      load()
    } catch (error) {
      onNotice({ type: 'error', text: error.message })
    }
  }

  async function move(position, direction) {
    const target = position + direction
    if (target < 0 || target >= banners.length) return
    const reordered = [...banners]
    ;[reordered[position], reordered[target]] = [reordered[target], reordered[position]]
    try {
      await Promise.all(reordered.map((banner, order) => (
        banner.sort_order === order ? null : supabase.update('banners', banner.id, { sort_order: order })
      )).filter(Boolean))
      load()
    } catch (error) {
      onNotice({ type: 'error', text: error.message })
    }
  }

  async function handleDelete(banner) {
    if (!window.confirm(`بنر «${banner.title}» حذف شود؟`)) return
    try {
      await supabase.remove('banners', banner.id)
      onNotice({ type: 'success', text: 'بنر حذف شد.' })
      load()
    } catch (error) {
      onNotice({ type: 'error', text: error.message })
    }
  }

  if (formOpen) {
    return (
      <form className="admin-panel admin-video-form" onSubmit={handleSubmit}>
        <div className="admin-panel-heading"><div><h2>{editingId ? 'ویرایش بنر' : 'بنر جدید'}</h2><p>بنر در اسلایدر صفحه اصلی نمایش داده می‌شود.</p></div></div>
        <div className="admin-form-grid">
          <label className="full">انتخاب سریع از ویدیوها (اختیاری)
            <select value="" onChange={pickVideo}>
              <option value="">یک ویدیو انتخاب کنید تا لینک، عنوان و کاور پر شود...</option>
              {publishedVideos.map((video) => <option key={video.id} value={video.id}>{video.title}</option>)}
            </select>
          </label>
          <label>عنوان بنر *<input name="title" value={form.title} onChange={updateField} required placeholder="مثلاً ویدیوی جدید: مدیریت ریسک" /></label>
          <label>لینک مقصد<input name="link_url" value={form.link_url} onChange={updateField} dir="ltr" placeholder="/video/slug یا https://..." /></label>
          <label className="full">توضیح کوتاه<input name="subtitle" value={form.subtitle} onChange={updateField} placeholder="یک جملهٔ کوتاه زیر عنوان" /></label>
          <div className="admin-cover-field">
            <span>تصویر بنر *</span>
            <label className="admin-cover-picker">
              <input type="file" accept="image/jpeg,image/png,image/webp" onChange={handleFileChange} />
              <span>＋ انتخاب تصویر از دستگاه</span>
            </label>
            <small>پیشنهادی: ۱۶۰۰×۶۰۰ پیکسل (نسبت ۸ به ۳) — JPG، PNG یا WEBP، حداکثر ۵ مگابایت</small>
            {previewUrl && <img className="admin-cover-preview" src={previewUrl} alt="پیش‌نمایش بنر" />}
          </div>
          <label>ترتیب نمایش<input name="sort_order" type="number" value={form.sort_order} onChange={updateField} placeholder="خالی = انتهای لیست" /></label>
          <label className="admin-checkbox"><input type="checkbox" name="is_active" checked={form.is_active} onChange={updateField} /> نمایش در سایت</label>
        </div>
        <div className="admin-form-actions">
          <button type="button" className="admin-secondary-button" onClick={closeForm}>انصراف</button>
          <button type="submit" className="admin-primary-button" disabled={saving}>{saving ? 'در حال ذخیره...' : editingId ? 'ذخیره تغییرات' : 'ثبت بنر'}</button>
        </div>
      </form>
    )
  }

  return (
    <div className="admin-panel">
      <div className="admin-panel-heading">
        <div><h2>بنرهای اسلایدر</h2><p>بنرهای صفحه اصلی را اضافه، مرتب یا غیرفعال کنید.</p></div>
        {!tableMissing && <button className="admin-primary-button compact" onClick={() => setFormOpen(true)}>＋ بنر جدید</button>}
      </div>

      {loading && <div className="admin-empty">در حال بارگذاری...</div>}
      {!loading && tableMissing && (
        <div className="admin-empty">جدول <code>banners</code> هنوز در Supabase ساخته نشده است. فایل <code>supabase/banners.sql</code> را در SQL Editor اجرا کنید و صفحه را دوباره باز کنید.</div>
      )}
      {!loading && !tableMissing && banners.length === 0 && <div className="admin-empty">هنوز بنری ثبت نشده است. تا بنری نباشد، اسلایدر در سایت نمایش داده نمی‌شود.</div>}

      <div className="admin-banner-list">
        {banners.map((banner, position) => (
          <article key={banner.id} className={`admin-banner-item ${banner.is_active ? '' : 'inactive'}`}>
            <img src={banner.image_url} alt="" />
            <div className="admin-banner-info">
              <strong>{banner.title}</strong>
              <small dir="ltr">{banner.link_url || 'بدون لینک'}</small>
              <span className={`admin-status ${banner.is_active ? 'published' : 'draft'}`}>{banner.is_active ? 'فعال' : 'غیرفعال'}</span>
            </div>
            <div className="admin-row-actions">
              <button onClick={() => move(position, -1)} disabled={position === 0} aria-label="بالا">↑</button>
              <button onClick={() => move(position, 1)} disabled={position === banners.length - 1} aria-label="پایین">↓</button>
              <button onClick={() => toggleActive(banner)}>{banner.is_active ? 'غیرفعال' : 'فعال'}</button>
              <button onClick={() => startEdit(banner)}>ویرایش</button>
              <button className="danger" onClick={() => handleDelete(banner)}>حذف</button>
            </div>
          </article>
        ))}
      </div>
    </div>
  )
}

export default AdminBanners
