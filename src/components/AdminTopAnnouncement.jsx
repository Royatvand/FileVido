import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

const emptyForm = { message: '', image_url: '', link_url: '', is_active: false }
const isSafeLink = (url = '') => url.startsWith('/') && !url.startsWith('//') || /^https?:\/\//i.test(url)

function AdminTopAnnouncement({ onNotice }) {
  const [form, setForm] = useState(emptyForm)
  const [selectedFile, setSelectedFile] = useState(null)
  const [previewUrl, setPreviewUrl] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [hasRecord, setHasRecord] = useState(false)

  useEffect(() => {
    let active = true
    async function load() {
      try {
        const rows = await supabase.select('site_announcement', '&id=eq.true')
        if (!active) return
        const row = rows?.[0]
        if (row) {
          setHasRecord(true)
          setForm({ message: row.message || '', image_url: row.image_url || '', link_url: row.link_url || '', is_active: Boolean(row.is_active) })
          setPreviewUrl(row.image_url || '')
        }
      } catch (error) {
        if (active) onNotice({ type: 'error', text: `بارگذاری نوار تبلیغاتی انجام نشد: ${error.message}` })
      } finally {
        if (active) setLoading(false)
      }
    }
    load()
    return () => { active = false }
  }, [onNotice])

  useEffect(() => () => {
    if (previewUrl.startsWith('blob:')) URL.revokeObjectURL(previewUrl)
  }, [previewUrl])

  function updateField(event) {
    const { name, value, type, checked } = event.target
    setForm((current) => ({ ...current, [name]: type === 'checkbox' ? checked : value }))
  }

  function handleFileChange(event) {
    const file = event.target.files?.[0]
    event.target.value = ''
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
    setPreviewUrl(URL.createObjectURL(file))
  }

  async function handleSubmit(event) {
    event.preventDefault()
    if (!form.message.trim()) {
      onNotice({ type: 'error', text: 'متن نوار تبلیغاتی را وارد کن.' })
      return
    }
    if (form.link_url.trim() && !isSafeLink(form.link_url.trim())) {
      onNotice({ type: 'error', text: 'لینک باید یک آدرس داخلی سایت یا لینک معتبر با http/https باشد.' })
      return
    }
    setSaving(true)
    onNotice({ type: '', text: '' })
    try {
      let imageUrl = form.image_url.trim()
      if (selectedFile) {
        onNotice({ type: '', text: 'در حال آپلود تصویر...' })
        imageUrl = await supabase.uploadVideoCover(selectedFile)
      }
      const payload = {
        message: form.message.trim(),
        image_url: imageUrl,
        link_url: form.link_url.trim(),
        is_active: form.is_active,
        updated_at: new Date().toISOString(),
      }
      if (hasRecord) await supabase.update('site_announcement', true, payload)
      else await supabase.insert('site_announcement', { id: true, ...payload })
      setHasRecord(true)
      setForm((current) => ({ ...current, image_url: imageUrl }))
      setSelectedFile(null)
      setPreviewUrl(imageUrl)
      onNotice({ type: 'success', text: 'تنظیمات نوار تبلیغاتی ذخیره شد.' })
    } catch (error) {
      onNotice({ type: 'error', text: error.message })
    } finally {
      setSaving(false)
    }
  }

  return (
    <form className="admin-panel admin-video-form" onSubmit={handleSubmit}>
      <div className="admin-panel-heading"><div><h2>تنظیمات نوار تبلیغاتی</h2><p>این نوار بالای منوی سایت و در تمام صفحات عمومی نمایش داده می‌شود.</p></div></div>
      {loading ? <div className="admin-empty">در حال بارگذاری تنظیمات...</div> : (
        <>
          <p className="admin-announcement-hint">یک نوار تبلیغاتی فعال در سایت نمایش داده می‌شود. برای مخفی‌کردن آن، گزینه نمایش در سایت را غیرفعال کن.</p>
          <div className={`admin-announcement-preview ${form.is_active ? '' : 'inactive'} ${form.link_url ? 'has-link' : ''}`}>
            <span className="admin-announcement-label">CHARTMASTERS</span>
            {previewUrl && <img src={previewUrl} alt="" />}
            <span className="admin-announcement-text">{form.message || 'پیش‌نمایش متن نوار تبلیغاتی'}</span>
            {form.link_url && <span className="admin-announcement-cta">مشاهده آموزش ←</span>}
          </div>
          <div className="admin-form-grid">
            <label className="full">متن نوار تبلیغاتی *<input name="message" value={form.message} onChange={updateField} maxLength={180} required placeholder="مثلاً آموزش جدید منتشر شد؛ همین حالا ببین" /></label>
            <label className="full">لینک مقصد<input name="link_url" value={form.link_url} onChange={updateField} dir="ltr" placeholder="/videos یا https://t.me/..." /></label>
            <div className="admin-cover-field full">
              <span>تصویر کوچک (اختیاری)</span>
              <label className="admin-cover-picker"><input type="file" accept="image/jpeg,image/png,image/webp" onChange={handleFileChange} /><span>＋ انتخاب تصویر از دستگاه</span></label>
              <small>JPG، PNG یا WEBP — حداکثر ۵ مگابایت</small>
              {previewUrl && <img className="admin-cover-preview" src={previewUrl} alt="پیش‌نمایش تصویر نوار" />}
            </div>
            <label className="admin-checkbox"><input type="checkbox" name="is_active" checked={form.is_active} onChange={updateField} /> نمایش نوار در سایت</label>
          </div>
          <div className="admin-form-actions"><button type="submit" className="admin-primary-button" disabled={saving}>{saving ? 'در حال ذخیره...' : 'ذخیره تنظیمات'}</button></div>
        </>
      )}
    </form>
  )
}

export default AdminTopAnnouncement
