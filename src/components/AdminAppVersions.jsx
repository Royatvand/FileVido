import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

const emptyForm = {
  version_code: '',
  version_name: '',
  changelog: '',
  download_url: '',
  is_mandatory: false,
  is_published: false,
}

function AdminAppVersions({ onNotice }) {
  const [rows, setRows] = useState([])
  const [form, setForm] = useState(emptyForm)
  const [editingId, setEditingId] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [notifyingId, setNotifyingId] = useState(null)

  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      const data = await supabase.select('app_versions', '&order=version_code.desc')
      setRows(data || [])
    } catch (error) {
      onNotice?.({ type: 'error', text: error.message })
    } finally {
      setLoading(false)
    }
  }, [onNotice])

  useEffect(() => {
    loadData()
  }, [loadData])

  function updateField(event) {
    const { name, value, type, checked } = event.target
    setForm((current) => ({
      ...current,
      [name]: type === 'checkbox' ? checked : value,
    }))
  }

  function resetForm() {
    setForm(emptyForm)
    setEditingId(null)
  }

  function startEdit(row) {
    setEditingId(row.id)
    setForm({
      version_code: String(row.version_code ?? ''),
      version_name: row.version_name || '',
      changelog: row.changelog || '',
      download_url: row.download_url || '',
      is_mandatory: Boolean(row.is_mandatory),
      is_published: Boolean(row.is_published),
    })
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  async function maybeNotifyUsers(versionId, versionPayload) {
    const session = supabase.getSession()
    if (!session?.access_token) return

    setNotifyingId(versionId)
    try {
      const response = await fetch('/api/notify-app-update', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          version_id: versionId,
          version_name: versionPayload.version_name,
          version_code: versionPayload.version_code,
          changelog: versionPayload.changelog,
          download_url: versionPayload.download_url,
          is_mandatory: versionPayload.is_mandatory,
        }),
      })
      const result = await response.json().catch(() => ({}))
      if (response.status === 501 || result?.status === 'not_configured') {
        onNotice?.({
          type: 'error',
          text:
            result?.message ||
            'زیرساخت اعلان آماده است، اما کلیدهای Firebase هنوز تنظیم نشده‌اند. به README مراجعه کنید.',
        })
        return
      }
      if (!response.ok) {
        throw new Error(result?.message || 'ارسال اعلان با خطا مواجه شد.')
      }
      onNotice?.({
        type: 'success',
        text: result?.message || `اعلان برای ${result?.sent || 0} دستگاه ارسال شد.`,
      })
    } catch (error) {
      onNotice?.({ type: 'error', text: error.message })
    } finally {
      setNotifyingId(null)
    }
  }

  async function handleSubmit(event) {
    event.preventDefault()
    setSaving(true)
    try {
      const versionCode = Number(form.version_code)
      if (!Number.isInteger(versionCode) || versionCode < 1) {
        throw new Error('شماره نسخه (versionCode) باید عدد صحیح مثبت باشد.')
      }
      const versionName = form.version_name.trim()
      const downloadUrl = form.download_url.trim()
      if (!versionName) throw new Error('نام نسخه را وارد کنید.')
      if (!downloadUrl) throw new Error('لینک دانلود نسخه جدید را وارد کنید.')
      if (!/^https?:\/\//i.test(downloadUrl)) {
        throw new Error('لینک دانلود باید با http یا https شروع شود.')
      }

      const wasPublished = editingId
        ? Boolean(rows.find((item) => item.id === editingId)?.is_published)
        : false
      const willPublish = Boolean(form.is_published)

      const payload = {
        version_code: versionCode,
        version_name: versionName,
        changelog: form.changelog.trim(),
        download_url: downloadUrl,
        is_mandatory: Boolean(form.is_mandatory),
        is_published: willPublish,
        published_at: willPublish
          ? (wasPublished
            ? rows.find((item) => item.id === editingId)?.published_at || new Date().toISOString()
            : new Date().toISOString())
          : null,
        updated_at: new Date().toISOString(),
      }

      let savedId = editingId
      if (editingId) {
        await supabase.update('app_versions', editingId, payload)
      } else {
        const inserted = await supabase.insert('app_versions', payload)
        savedId = inserted?.[0]?.id
      }

      onNotice?.({
        type: 'success',
        text: editingId ? 'نسخه با موفقیت به‌روزرسانی شد.' : 'نسخه جدید ثبت شد.',
      })

      if (willPublish && !wasPublished && savedId) {
        await maybeNotifyUsers(savedId, payload)
      }

      resetForm()
      await loadData()
    } catch (error) {
      const duplicate = /app_versions_version_code|duplicate key/i.test(error.message || '')
      onNotice?.({
        type: 'error',
        text: duplicate
          ? 'این versionCode قبلاً ثبت شده است. مقدار دیگری انتخاب کنید.'
          : error.message,
      })
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(row) {
    if (!window.confirm(`نسخه «${row.version_name}» (${row.version_code}) حذف شود؟`)) return
    try {
      await supabase.remove('app_versions', row.id)
      onNotice?.({ type: 'success', text: 'نسخه حذف شد.' })
      if (editingId === row.id) resetForm()
      await loadData()
    } catch (error) {
      onNotice?.({ type: 'error', text: error.message })
    }
  }

  async function handleNotify(row) {
    if (!row.is_published) {
      onNotice?.({ type: 'error', text: 'فقط نسخه‌های منتشرشده می‌توانند اعلان بفرستند.' })
      return
    }
    await maybeNotifyUsers(row.id, row)
  }

  return (
    <div className="admin-panel admin-app-versions">
      <div className="admin-panel-heading">
        <div>
          <h2>مدیریت نسخه‌های اپ اندروید</h2>
          <p>
            APK را از طریق GitHub Releases یا CI/CD منتشر کنید و اینجا فقط شماره نسخه، توضیحات و لینک دانلود را ثبت کنید.
          </p>
        </div>
      </div>

      <form className="admin-video-form" onSubmit={handleSubmit}>
        <div className="admin-form-grid">
          <label>
            شماره نسخه (versionCode) *
            <input
              name="version_code"
              type="number"
              min="1"
              step="1"
              value={form.version_code}
              onChange={updateField}
              required
              placeholder="مثلاً 2 — باید با versionCode در build.gradle یکی باشد"
              dir="ltr"
            />
          </label>
          <label>
            نام نسخه (versionName) *
            <input
              name="version_name"
              value={form.version_name}
              onChange={updateField}
              required
              placeholder="مثلاً 1.1.0"
              dir="ltr"
            />
          </label>
          <label className="full">
            لینک دانلود APK *
            <input
              name="download_url"
              value={form.download_url}
              onChange={updateField}
              required
              placeholder="https://github.com/.../releases/download/..."
              dir="ltr"
            />
            <small className="admin-field-hint">فایل APK از پنل آپلود نمی‌شود؛ لینک GitHub Release یا منبع امن دیگر را وارد کنید.</small>
          </label>
          <label className="full">
            توضیحات تغییرات
            <textarea
              name="changelog"
              rows={4}
              value={form.changelog}
              onChange={updateField}
              placeholder="خلاصه تغییرات این نسخه برای نمایش به کاربر..."
            />
          </label>
          <label className="admin-checkbox">
            <input type="checkbox" name="is_mandatory" checked={form.is_mandatory} onChange={updateField} />
            آپدیت اجباری (تا نصب نسخه جدید، اپ مسدود می‌شود)
          </label>
          <label className="admin-checkbox">
            <input type="checkbox" name="is_published" checked={form.is_published} onChange={updateField} />
            انتشار عمومی (برای کاربران اندروید قابل مشاهده شود)
          </label>
        </div>
        <div className="admin-form-actions">
          {editingId && (
            <button type="button" className="admin-secondary-button" onClick={resetForm}>
              انصراف از ویرایش
            </button>
          )}
          <button type="submit" className="admin-primary-button" disabled={saving}>
            {saving ? 'در حال ذخیره...' : editingId ? 'ذخیره تغییرات' : 'ثبت نسخه'}
          </button>
        </div>
      </form>

      <div className="admin-panel-heading" style={{ marginTop: 28 }}>
        <div>
          <h2>نسخه‌های ثبت‌شده</h2>
          <p>مرتب‌شده بر اساس versionCode</p>
        </div>
      </div>

      {loading ? (
        <div className="admin-empty">در حال دریافت اطلاعات...</div>
      ) : rows.length === 0 ? (
        <div className="admin-empty">هنوز نسخه‌ای ثبت نشده است.</div>
      ) : (
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>versionCode</th>
                <th>نام نسخه</th>
                <th>وضعیت</th>
                <th>اجباری</th>
                <th>تاریخ انتشار</th>
                <th>عملیات</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id}>
                  <td dir="ltr">{row.version_code}</td>
                  <td>
                    <strong>{row.version_name}</strong>
                    {row.changelog ? (
                      <small style={{ display: 'block', color: '#7f8d84' }}>
                        {row.changelog.slice(0, 80)}{row.changelog.length > 80 ? '…' : ''}
                      </small>
                    ) : null}
                  </td>
                  <td>
                    <span className={`admin-status ${row.is_published ? 'published' : 'draft'}`}>
                      {row.is_published ? 'منتشرشده' : 'پیش‌نویس'}
                    </span>
                  </td>
                  <td>{row.is_mandatory ? 'بله' : 'خیر'}</td>
                  <td>
                    {row.published_at
                      ? new Date(row.published_at).toLocaleDateString('fa-IR')
                      : '—'}
                  </td>
                  <td>
                    <div className="admin-row-actions">
                      <button type="button" onClick={() => startEdit(row)}>ویرایش</button>
                      {row.is_published && (
                        <button
                          type="button"
                          disabled={notifyingId === row.id}
                          onClick={() => handleNotify(row)}
                        >
                          {notifyingId === row.id ? 'در حال ارسال...' : 'ارسال اعلان'}
                        </button>
                      )}
                      <button type="button" className="danger" onClick={() => handleDelete(row)}>حذف</button>
                      <a href={row.download_url} target="_blank" rel="noreferrer">دانلود</a>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

export default AdminAppVersions
