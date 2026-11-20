import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

function AdminAppVersions({ onNotice }) {
  const [rows, setRows] = useState([])
  const [changelog, setChangelog] = useState('')
  const [isMandatory, setIsMandatory] = useState(false)
  const [loading, setLoading] = useState(true)
  const [building, setBuilding] = useState(false)
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

  useEffect(() => { loadData() }, [loadData])

  async function handleBuild(event) {
    event.preventDefault()
    if (!changelog.trim()) {
      onNotice?.({ type: 'error', text: 'توضیحات تغییرات را وارد کن.' })
      return
    }
    setBuilding(true)
    try {
      const session = await supabase.getValidSession()
      if (!session?.access_token) throw new Error('نشست مدیر منقضی شده؛ دوباره وارد پنل شو.')
      const response = await fetch('/api/start-app-build', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ changelog: changelog.trim(), is_mandatory: isMandatory }),
      })
      const result = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(result.message || 'شروع فرایند ساخت نسخه ناموفق بود.')
      setChangelog('')
      setIsMandatory(false)
      onNotice?.({ type: 'success', text: 'فرایند ساخت APK شروع شد. پس از Build موفق، Release و ثبت نسخه به‌صورت خودکار انجام می‌شود.' })
    } catch (error) {
      onNotice?.({ type: 'error', text: error.message })
    } finally {
      setBuilding(false)
    }
  }

  async function handleNotify(row) {
    setNotifyingId(row.id)
    try {
      const session = await supabase.getValidSession()
      if (!session?.access_token) throw new Error('نشست مدیر منقضی شده است.')
      const response = await fetch('/api/notify-app-update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify(row),
      })
      const result = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(result.message || 'ارسال اعلان ناموفق بود.')
      onNotice?.({ type: 'success', text: result.message || `اعلان برای ${result.sent || 0} دستگاه ارسال شد.` })
    } catch (error) {
      onNotice?.({ type: 'error', text: error.message })
    } finally {
      setNotifyingId(null)
    }
  }

  return (
    <div className="admin-panel admin-app-versions">
      <div className="admin-panel-heading">
        <div>
          <h2>مدیریت نسخه‌های اپ اندروید</h2>
          <p>نسخه جدید را از همین‌جا بساز؛ شماره نسخه، APK و لینک دانلود خودکار تولید و ثبت می‌شوند.</p>
        </div>
      </div>

      <form className="admin-video-form" onSubmit={handleBuild}>
        <div className="admin-form-grid">
          <label className="full">
            توضیحات تغییرات نسخه *
            <textarea
              rows={4}
              value={changelog}
              onChange={(event) => setChangelog(event.target.value)}
              maxLength={5000}
              required
              placeholder="مثلاً: بهبود سرعت، رفع خطای ورود و اضافه شدن قابلیت‌های جدید..."
            />
          </label>
          <label className="admin-checkbox">
            <input type="checkbox" checked={isMandatory} onChange={(event) => setIsMandatory(event.target.checked)} />
            آپدیت اجباری
          </label>
        </div>
        <div className="admin-form-actions">
          <button type="submit" className="admin-primary-button" disabled={building}>
            {building ? 'در حال شروع ساخت...' : 'ساخت و انتشار خودکار نسخه جدید'}
          </button>
        </div>
        <small className="admin-field-hint">
          پس از Build موفق، APK در GitHub Releases قرار می‌گیرد، نسخه در Supabase ثبت و اعلان برای کاربران ارسال می‌شود.
        </small>
      </form>

      <div className="admin-panel-heading" style={{ marginTop: 28 }}>
        <div><h2>نسخه‌های منتشرشده</h2><p>اطلاعات نسخه از فرایند انتشار دریافت می‌شود.</p></div>
        <button type="button" className="admin-secondary-button" onClick={loadData}>بروزرسانی فهرست</button>
      </div>

      {loading ? <div className="admin-empty">در حال دریافت اطلاعات...</div> :
        rows.length === 0 ? <div className="admin-empty">هنوز نسخه‌ای منتشر نشده است.</div> : (
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead><tr><th>نسخه</th><th>وضعیت</th><th>اجباری</th><th>تاریخ انتشار</th><th>عملیات</th></tr></thead>
              <tbody>{rows.map((row) => (
                <tr key={row.id}>
                  <td><strong dir="ltr">{row.version_name}</strong><small style={{ display: 'block' }}>Code: {row.version_code}</small>
                    {row.changelog && <small style={{ display: 'block', color: '#7f8d84' }}>{row.changelog.slice(0, 90)}</small>}
                  </td>
                  <td><span className={`admin-status ${row.is_published ? 'published' : 'draft'}`}>{row.is_published ? 'منتشرشده' : 'در انتظار انتشار'}</span></td>
                  <td>{row.is_mandatory ? 'بله' : 'خیر'}</td>
                  <td>{row.published_at ? new Date(row.published_at).toLocaleDateString('fa-IR') : '—'}</td>
                  <td><div className="admin-row-actions">
                    {row.download_url && <a href={row.download_url} target="_blank" rel="noreferrer">دانلود APK</a>}
                    {row.is_published && <button type="button" disabled={notifyingId === row.id} onClick={() => handleNotify(row)}>{notifyingId === row.id ? 'در حال ارسال...' : 'ارسال دوباره اعلان'}</button>}
                  </div></td>
                </tr>
              ))}</tbody>
            </table>
          </div>
        )}
    </div>
  )
}

export default AdminAppVersions
