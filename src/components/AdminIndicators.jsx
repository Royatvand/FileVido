import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { INDICATOR_EXTENSIONS, INDICATOR_MAX_BYTES, INDICATOR_PLATFORMS, formatFileSize, getIndicatorExtension, indicatorImageUrl } from '../lib/indicators'
import PlatformIcon from './PlatformIcon'

const emptyForm = { title: '', slug: '', description: '', content: '', platform: 'tradingview', version: '1.0', cover_url: '', status: 'draft' }

function slugify(value) {
  return value.trim().toLowerCase()
    .replace(/[؀-ۿ\s]+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
}

function AdminIndicators({ onNotice }) {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [tableMissing, setTableMissing] = useState(false)
  const [loadError, setLoadError] = useState('')
  const [formOpen, setFormOpen] = useState(false)
  const [form, setForm] = useState(emptyForm)
  const [editing, setEditing] = useState(null)
  const [selectedFile, setSelectedFile] = useState(null)
  const [selectedCover, setSelectedCover] = useState(null)
  const [galleryItems, setGalleryItems] = useState([])
  const [removedGalleryItems, setRemovedGalleryItems] = useState([])
  const [galleryLoading, setGalleryLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [reloadKey, setReloadKey] = useState(0)
  const load = () => {
    setLoading(true)
    setLoadError('')
    setReloadKey((key) => key + 1)
  }

  useEffect(() => {
    let active = true
    supabase.select('indicators', '&order=created_at.desc')
      .then((rows) => { if (active) { setItems(rows || []); setTableMissing(false) } })
      .catch((error) => {
        if (!active) return
        const message = error.message || 'خطای نامشخص در بارگذاری اندیکاتورها'
        const missing = /PGRST205|42P01|could not find the table|relation .* does not exist/i.test(message)
        setTableMissing(missing)
        setLoadError(missing ? '' : message)
        onNotice({ type: 'error', text: `بارگذاری اندیکاتورها انجام نشد: ${message}` })
      })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [reloadKey, onNotice])

  function updateField(event) {
    const { name, value } = event.target
    setForm((current) => ({ ...current, [name]: value }))
  }

  function handleFile(event) {
    const file = event.target.files?.[0]
    if (!file) return
    if (!INDICATOR_EXTENSIONS.includes(getIndicatorExtension(file.name))) {
      onNotice({ type: 'error', text: `فرمت فایل مجاز نیست. فرمت‌های مجاز: ${INDICATOR_EXTENSIONS.join('، ')}` })
      event.target.value = ''
      return
    }
    if (file.size > INDICATOR_MAX_BYTES) {
      onNotice({ type: 'error', text: 'حجم فایل باید حداکثر ۱۰ مگابایت باشد.' })
      event.target.value = ''
      return
    }
    setSelectedFile(file)
    event.target.value = ''
    onNotice({ type: '', text: '' })
  }

  function handleCover(event) {
    const file = event.target.files?.[0]
    if (!file) return
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      onNotice({ type: 'error', text: 'فقط تصویر JPG، PNG یا WEBP مجاز است.' })
      event.target.value = ''
      return
    }
    if (file.size > 5 * 1024 * 1024) {
      onNotice({ type: 'error', text: 'حجم تصویر باید حداکثر ۵ مگابایت باشد.' })
      event.target.value = ''
      return
    }
    setSelectedCover(file)
    event.target.value = ''
  }

  function handleGalleryFiles(event) {
    const files = Array.from(event.target.files || [])
    const additions = []
    for (const file of files) {
      if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
        onNotice({ type: 'error', text: `فرمت تصویر «${file.name}» مجاز نیست؛ فقط JPG، PNG و WEBP.` })
        continue
      }
      if (file.size > 5 * 1024 * 1024) {
        onNotice({ type: 'error', text: `حجم تصویر «${file.name}» بیشتر از ۵ مگابایت است.` })
        continue
      }
      additions.push({ localId: crypto.randomUUID(), file, previewUrl: URL.createObjectURL(file), caption: '' })
    }
    if (additions.length) setGalleryItems((current) => [...current, ...additions])
    event.target.value = ''
  }

  function updateGalleryCaption(localId, caption) {
    setGalleryItems((current) => current.map((image) => (image.id || image.localId) === localId ? { ...image, caption } : image))
  }

  function moveGalleryItem(index, direction) {
    setGalleryItems((current) => {
      const nextIndex = index + direction
      if (nextIndex < 0 || nextIndex >= current.length) return current
      const next = [...current]
      ;[next[index], next[nextIndex]] = [next[nextIndex], next[index]]
      return next
    })
  }

  function removeGalleryItem(image) {
    if (image.id) setRemovedGalleryItems((current) => [...current, image])
    else if (image.previewUrl) URL.revokeObjectURL(image.previewUrl)
    setGalleryItems((current) => current.filter((item) => (item.id || item.localId) !== (image.id || image.localId)))
  }

  function closeForm() {
    galleryItems.filter((image) => image.file && image.previewUrl).forEach((image) => URL.revokeObjectURL(image.previewUrl))
    setFormOpen(false)
    setEditing(null)
    setForm(emptyForm)
    setSelectedFile(null)
    setSelectedCover(null)
    setGalleryItems([])
    setRemovedGalleryItems([])
    setGalleryLoading(false)
  }

  async function startEdit(item) {
    setEditing(item)
    setForm({
      title: item.title, slug: item.slug, description: item.description || '', content: item.content || '',
      platform: item.platform, version: item.version || '1.0', cover_url: item.cover_url || '', status: item.status,
    })
    setSelectedFile(null)
    setSelectedCover(null)
    setGalleryItems([])
    setRemovedGalleryItems([])
    setGalleryLoading(true)
    setFormOpen(true)
    try {
      const images = await supabase.select('indicator_images', `&indicator_id=eq.${encodeURIComponent(item.id)}&order=position.asc,created_at.asc`)
      setGalleryItems((images || []).map((image) => ({ ...image, previewUrl: indicatorImageUrl(image.file_path) })))
    } catch (error) {
      onNotice({ type: 'error', text: `بارگذاری تصاویر گالری انجام نشد: ${error.message}` })
    } finally {
      setGalleryLoading(false)
    }
  }

  async function handleSubmit(event) {
    event.preventDefault()
    if (!form.title.trim()) {
      onNotice({ type: 'error', text: 'عنوان اندیکاتور را وارد کن.' })
      return
    }
    if (!editing && !selectedFile) {
      onNotice({ type: 'error', text: 'برای اندیکاتور جدید باید یک فایل انتخاب کنی.' })
      return
    }
    setSaving(true)
    let uploadedPath = ''
    let savedIndicator = editing
    const uploadedGalleryPaths = []
    const insertedGalleryRows = []
    try {
      const payload = {
        title: form.title.trim(),
        slug: form.slug.trim() || slugify(form.title) || `indicator-${Date.now().toString(36)}`,
        description: form.description.trim(),
        content: form.content.trim(),
        platform: form.platform,
        version: form.version.trim() || '1.0',
        status: form.status,
        updated_at: new Date().toISOString(),
      }
      if (selectedCover) {
        onNotice({ type: '', text: 'در حال آپلود تصویر...' })
        payload.cover_url = await supabase.uploadVideoCover(selectedCover)
      }
      if (selectedFile) {
        onNotice({ type: '', text: 'در حال آپلود فایل...' })
        uploadedPath = await supabase.uploadIndicatorFile(selectedFile)
        payload.file_path = uploadedPath
        payload.file_name = selectedFile.name
        payload.file_size = selectedFile.size
      }
      const previousFilePath = editing?.file_path
      if (editing) {
        await supabase.update('indicators', editing.id, payload)
        savedIndicator = { ...editing, ...payload }
      } else {
        const inserted = await supabase.insert('indicators', payload)
        savedIndicator = inserted?.[0]
        if (!savedIndicator?.id) throw new Error('اندیکاتور ذخیره شد اما شناسه آن دریافت نشد؛ صفحه را تازه‌سازی و وضعیت را بررسی کن.')
        setEditing(savedIndicator)
      }
      const newIndicatorFilePath = uploadedPath
      uploadedPath = ''

      // ابتدا تغییرات گالری ذخیره می‌شوند؛ سپس تصاویر حذف‌شده از Storage پاک می‌شوند.
      const existingItems = galleryItems.filter((image) => image.id)
      for (let index = 0; index < existingItems.length; index += 1) {
        const image = existingItems[index]
        await supabase.update('indicator_images', image.id, { caption: (image.caption || '').trim(), position: index })
      }

      const newItems = galleryItems.filter((image) => image.file)
      const newRows = []
      for (let index = 0; index < newItems.length; index += 1) {
        const image = newItems[index]
        const filePath = await supabase.uploadIndicatorImage(image.file)
        uploadedGalleryPaths.push(filePath)
        newRows.push({ indicator_id: savedIndicator.id, file_path: filePath, caption: (image.caption || '').trim(), position: galleryItems.indexOf(image) })
      }
      if (newRows.length) {
        const insertedImages = await supabase.insert('indicator_images', newRows)
        insertedGalleryRows.push(...(insertedImages || []))
      }

      for (const image of removedGalleryItems) {
        await supabase.remove('indicator_images', image.id)
        await supabase.removeIndicatorImageFile(image.file_path)
      }
      uploadedGalleryPaths.length = 0
      insertedGalleryRows.length = 0

      // فایل قبلی فقط بعد از ذخیرهٔ موفق اطلاعات جدید پاک می‌شود.
      if (editing && newIndicatorFilePath && previousFilePath) await supabase.removeIndicatorFile(previousFilePath)
      onNotice({ type: 'success', text: editing ? 'تغییرات ذخیره شد.' : 'اندیکاتور جدید ثبت شد.' })
      closeForm()
      load()
    } catch (error) {
      // فایل‌هایی که هنوز در جدول ثبت نشده‌اند، در صورت شکست پاک می‌شوند.
      if (uploadedPath) await supabase.removeIndicatorFile(uploadedPath)
      for (const image of insertedGalleryRows) {
        if (image.id) await supabase.remove('indicator_images', image.id).catch(() => {})
      }
      for (const path of uploadedGalleryPaths) await supabase.removeIndicatorImageFile(path).catch(() => {})
      if (savedIndicator?.id) setEditing(savedIndicator)
      const duplicate = /indicators_slug_key|duplicate key/i.test(error.message || '')
      onNotice({ type: 'error', text: duplicate ? 'این شناسه صفحه (Slug) قبلاً استفاده شده است. فیلد Slug را خالی بگذار یا مقدار دیگری وارد کن.' : error.message })
    } finally {
      setSaving(false)
    }
  }

  async function toggleStatus(item) {
    try {
      await supabase.update('indicators', item.id, { status: item.status === 'published' ? 'draft' : 'published', updated_at: new Date().toISOString() })
      load()
    } catch (error) {
      onNotice({ type: 'error', text: error.message })
    }
  }

  async function handleDelete(item) {
    if (!window.confirm(`«${item.title}» و فایلش حذف شود؟`)) return
    try {
      await supabase.remove('indicators', item.id)
      await supabase.removeIndicatorFile(item.file_path)
      onNotice({ type: 'success', text: 'اندیکاتور حذف شد.' })
      load()
    } catch (error) {
      onNotice({ type: 'error', text: error.message })
    }
  }

  if (formOpen) {
    return (
      <form className="admin-panel admin-video-form" onSubmit={handleSubmit}>
        <div className="admin-panel-heading"><div><h2>{editing ? 'ویرایش اندیکاتور' : 'اندیکاتور جدید'}</h2><p>فایل برای دانلود در صفحهٔ /indicators نمایش داده می‌شود.</p></div></div>
        <div className="admin-form-grid">
          <label>عنوان *<input name="title" value={form.title} onChange={updateField} required placeholder="مثلاً اندیکاتور حمایت و مقاومت خودکار" /></label>
          <label>شناسه صفحه (Slug)<input name="slug" value={form.slug} onChange={updateField} dir="ltr" placeholder="خالی = خودکار" /></label>
          <label>پلتفرم *
            <select name="platform" value={form.platform} onChange={updateField}>
              {Object.entries(INDICATOR_PLATFORMS).map(([key, value]) => <option key={key} value={key}>{value.label}</option>)}
            </select>
          </label>
          <label>نسخه<input name="version" value={form.version} onChange={updateField} dir="ltr" placeholder="1.0" /></label>
          <label className="full">توضیح کوتاه (روی کارت نمایش داده می‌شود)<input name="description" value={form.description} onChange={updateField} maxLength={200} /></label>
          <label className="full">توضیحات کامل و نحوهٔ استفاده<textarea name="content" value={form.content} onChange={updateField} rows={8} placeholder="کاربرد، تنظیمات و نکات استفاده. متن ساده؛ HTML نمایش داده نمی‌شود." /></label>
          <div className="admin-cover-field">
            <span>فایل اسکریپت {editing ? '(خالی = همان فایل فعلی)' : '*'}</span>
            <label className="admin-cover-picker">
              <input type="file" accept={INDICATOR_EXTENSIONS.map((ext) => `.${ext}`).join(',')} onChange={handleFile} />
              <span>＋ انتخاب فایل</span>
            </label>
            <small>فرمت‌های مجاز: {INDICATOR_EXTENSIONS.join('، ')} — حداکثر ۱۰ مگابایت</small>
            {selectedFile && <small>انتخاب‌شده: {selectedFile.name} ({formatFileSize(selectedFile.size)})</small>}
            {!selectedFile && editing?.file_name && <small>فایل فعلی: {editing.file_name} ({formatFileSize(editing.file_size)})</small>}
          </div>
          <div className="admin-cover-field">
            <span>تصویر اصلی (کاور) — اختیاری</span>
            <label className="admin-cover-picker">
              <input type="file" accept="image/jpeg,image/png,image/webp" onChange={handleCover} />
              <span>＋ انتخاب تصویر</span>
            </label>
            {selectedCover && <small>انتخاب‌شده: {selectedCover.name}</small>}
            {!selectedCover && form.cover_url && <img className="admin-cover-preview" src={form.cover_url} alt="تصویر فعلی" />}
          </div>
          <div className="admin-gallery-field full">
            <div className="admin-gallery-heading">
              <div><strong>تصاویر نحوهٔ عملکرد اندیکاتور</strong><small>چند تصویر از چارت، سیگنال‌ها یا تنظیمات اضافه کن. هر تصویر حداکثر ۵ مگابایت.</small></div>
              <label className="admin-cover-picker">
                <input type="file" accept="image/jpeg,image/png,image/webp" multiple onChange={handleGalleryFiles} />
                <span>＋ افزودن تصاویر</span>
              </label>
            </div>
            {galleryLoading && <small>در حال بارگذاری تصاویر فعلی...</small>}
            {galleryItems.length > 0 && <div className="admin-gallery-grid">
              {galleryItems.map((image, index) => (
                <article className="admin-gallery-item" key={image.id || image.localId}>
                  <img src={image.previewUrl} alt={image.caption || 'پیش‌نمایش تصویر گالری'} />
                  <input value={image.caption || ''} onChange={(event) => updateGalleryCaption(image.id || image.localId, event.target.value)} maxLength={160} placeholder="توضیح کوتاه تصویر (اختیاری)" aria-label="توضیح تصویر" />
                  <div className="admin-gallery-actions">
                    <button type="button" onClick={() => moveGalleryItem(index, -1)} disabled={index === 0} aria-label="انتقال تصویر به بالا">↑</button>
                    <button type="button" onClick={() => moveGalleryItem(index, 1)} disabled={index === galleryItems.length - 1} aria-label="انتقال تصویر به پایین">↓</button>
                    <button type="button" className="danger" onClick={() => removeGalleryItem(image)}>حذف</button>
                  </div>
                </article>
              ))}
            </div>}
            {!galleryLoading && galleryItems.length === 0 && <p className="admin-gallery-empty">هنوز تصویری برای گالری انتخاب نشده است.</p>}
          </div>
          <label>وضعیت
            <select name="status" value={form.status} onChange={updateField}>
              <option value="draft">پیش‌نویس</option>
              <option value="published">منتشرشده</option>
            </select>
          </label>
        </div>
        <div className="admin-form-actions">
          <button type="button" className="admin-secondary-button" onClick={closeForm}>انصراف</button>
          <button type="submit" className="admin-primary-button" disabled={saving}>{saving ? 'در حال ذخیره...' : editing ? 'ذخیره تغییرات' : 'ثبت اندیکاتور'}</button>
        </div>
      </form>
    )
  }

  return (
    <div className="admin-panel">
      <div className="admin-panel-heading">
        <div><h2>اندیکاتورها و اسکریپت‌ها</h2><p>فایل‌های قابل دانلود را اضافه، منتشر یا حذف کن.</p></div>
        {!tableMissing && <button className="admin-primary-button compact" onClick={() => setFormOpen(true)}>＋ اندیکاتور جدید</button>}
      </div>
      {loading && <div className="admin-empty">در حال بارگذاری...</div>}
      {!loading && tableMissing && <div className="admin-empty">جدول <code>indicators</code> هنوز در Supabase ساخته نشده است. فایل <code>supabase/indicators.sql</code> را در SQL Editor اجرا کن و صفحه را دوباره باز کن.</div>}
      {!loading && loadError && <div className="admin-empty">بارگذاری اندیکاتورها ناموفق بود: {loadError}<div style={{ marginTop: 12 }}><button className="admin-secondary-button" type="button" onClick={load}>تلاش دوباره</button></div></div>}
      {!loading && !tableMissing && items.length === 0 && <div className="admin-empty">هنوز اندیکاتوری ثبت نشده است.</div>}
      {items.length > 0 && (
        <div className="admin-table-wrap"><table className="admin-table"><thead><tr><th>عنوان</th><th>پلتفرم</th><th>وضعیت</th><th>دانلود</th><th>عملیات</th></tr></thead><tbody>
          {items.map((item) => (
            <tr key={item.id}>
              <td><strong>{item.title}</strong><br /><small dir="ltr">/indicator/{item.slug}</small></td>
              <td><span className="admin-indicator-platform"><PlatformIcon platform={item.platform} />{(INDICATOR_PLATFORMS[item.platform] || INDICATOR_PLATFORMS.other).label}</span></td>
              <td><span className={`admin-status ${item.status}`}>{item.status === 'published' ? 'منتشرشده' : 'پیش‌نویس'}</span></td>
              <td>{item.download_count}</td>
              <td><div className="admin-row-actions">
                <button onClick={() => toggleStatus(item)}>{item.status === 'published' ? 'پیش‌نویس' : 'انتشار'}</button>
                <button onClick={() => startEdit(item)}>ویرایش</button>
                <button className="danger" onClick={() => handleDelete(item)}>حذف</button>
              </div></td>
            </tr>
          ))}
        </tbody></table></div>
      )}
    </div>
  )
}

export default AdminIndicators
