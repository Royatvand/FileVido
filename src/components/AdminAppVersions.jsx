import { useCallback, useEffect, useRef, useState } from 'react'
import { supabase } from '../lib/supabase'

function AdminAppVersions({ onNotice }) {
  const [rows, setRows] = useState([])
  const [changelog, setChangelog] = useState('')
  const [isMandatory, setIsMandatory] = useState(false)
  const [loading, setLoading] = useState(true)
  const [building, setBuilding] = useState(false)
  const [notifyingId, setNotifyingId] = useState(null)
  const [managingReleaseId, setManagingReleaseId] = useState(null)
  const buildFormRef = useRef(null)

  // version_code that existed when a build was started; we poll until a newer one is registered
  const [waitingAfter, setWaitingAfter] = useState(null)

  const loadData = useCallback(async ({ silent = false } = {}) => {
    if (!silent) setLoading(true)
    try {
      const data = await supabase.select('app_versions', '&order=version_code.desc')
      setRows(data || [])
      return data || []
    } catch (error) {
      if (!silent) onNotice?.({ type: 'error', text: error.message })
      return null
    } finally {
      if (!silent) setLoading(false)
    }
  }, [onNotice])

  useEffect(() => { Promise.resolve().then(() => loadData()) }, [loadData])

  const latestPublished = rows.find((row) => row.is_published && row.download_url)
  const latestRolloutPercentage = Number(latestPublished?.rollout_percentage ?? 100)
  const nextRolloutPercentage = [10, 25, 50, 100].find((percentage) => percentage > latestRolloutPercentage)
  const previousPublished = latestPublished
    ? rows.find((row) => row.is_published && !row.is_paused && Number(row.version_code) < Number(latestPublished.version_code))
    : null

  // The APK build runs in GitHub Actions (~3 min) and registers the row afterwards,
  // so refresh the list automatically instead of requiring a manual page reload.
  useEffect(() => {
    if (waitingAfter === null) return undefined
    const startedAt = Date.now()
    const timer = window.setInterval(async () => {
      const data = await loadData({ silent: true })
      const newest = data?.[0]?.version_code || 0
      if (newest > waitingAfter) {
        window.clearInterval(timer)
        setWaitingAfter(null)
        onNotice?.({ type: 'success', text: `نسخه ${data[0].version_name} منتشر و در لیست ثبت شد.` })
      } else if (Date.now() - startedAt > 12 * 60 * 1000) {
        window.clearInterval(timer)
        setWaitingAfter(null)
        onNotice?.({ type: 'error', text: 'نسخه جدید هنوز ثبت نشده. وضعیت اجرای Build را در GitHub Actions بررسی کنید.' })
      }
    }, 15000)
    return () => window.clearInterval(timer)
  }, [waitingAfter, loadData, onNotice])

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
      setWaitingAfter(rows[0]?.version_code || 0)
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

  async function handleReleaseAction(row, action, rolloutPercentage) {
    const messages = {
      increase_rollout: `درصد انتشار نسخه ${row.version_name} افزایش پیدا کند؟ اعلان فقط برای گروه مجاز این مرحله ارسال می‌شود.`,
      pause: `انتشار نسخه ${row.version_name} فوراً متوقف شود؟ کاربران جدید دیگر این نسخه را دریافت نمی‌کنند.`,
      rollback: `نسخه ${row.version_name} متوقف و آخرین نسخه پایدار قبلی برای دستگاه‌های واجد شرایط فعال شود؟`,
      resume: `انتشار نسخه ${row.version_name} با همان درصد قبلی دوباره فعال شود؟`,
    }
    if (!window.confirm(messages[action] || 'این عملیات انجام شود؟')) return

    setManagingReleaseId(row.id)
    try {
      const session = await supabase.getValidSession()
      if (!session?.access_token) throw new Error('نشست مدیر منقضی شده است.')
      const response = await fetch('/api/manage-app-release', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          version_id: row.id,
          action,
          ...(rolloutPercentage ? { rollout_percentage: rolloutPercentage } : {}),
        }),
      })
      const result = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(result.message || 'مدیریت انتشار نسخه ناموفق بود.')
      await loadData({ silent: true })
      const notificationMessage = result.notification?.message
        ? ` ${result.notification.message}`
        : ''
      onNotice?.({ type: 'success', text: `${result.message || 'تنظیمات انتشار ذخیره شد.'}${notificationMessage}` })
    } catch (error) {
      onNotice?.({ type: 'error', text: error.message })
    } finally {
      setManagingReleaseId(null)
    }
  }

  async function handleCopyDownloadLink(url) {
    try {
      if (!navigator.clipboard?.writeText) throw new Error('قابلیت کپی در این مرورگر در دسترس نیست.')
      await navigator.clipboard.writeText(url)
      onNotice?.({ type: 'success', text: 'لینک دانلود APK کپی شد.' })
    } catch (error) {
      onNotice?.({ type: 'error', text: error.message || 'کپی لینک ناموفق بود.' })
    }
  }

  function handlePrepareHotfix(row) {
    setChangelog(`اصلاح فوری مشکلات نسخه ${row.version_name}: `)
    setIsMandatory(true)
    buildFormRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  return (
    <div className="admin-panel admin-app-versions">
      <div className="admin-panel-heading">
        <div>
          <h2>مدیریت نسخه‌های اپ اندروید</h2>
          <p>نسخه جدید را از همین‌جا بساز؛ شماره نسخه، APK و لینک دانلود خودکار تولید و ثبت می‌شوند.</p>
        </div>
      </div>

      <form ref={buildFormRef} className="admin-video-form" onSubmit={handleBuild}>
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
          هر نسخه پس از ساخت ابتدا برای ۱۰٪ دستگاه‌ها فعال می‌شود؛ سپس می‌توانی انتشار را به‌ترتیب به ۲۵٪، ۵۰٪ و ۱۰۰٪ افزایش بدهی.
        </small>
      </form>

      {latestPublished && (
        <section className="admin-app-release-card" aria-label="آخرین نسخه آماده دانلود">
          <div className="admin-app-release-info">
            <span className="admin-app-release-kicker">آخرین نسخه منتشرشده</span>
            <div className="admin-app-release-title">
              <h3 dir="ltr">ChartMasters v{latestPublished.version_name}</h3>
              <span className={`admin-app-release-status${latestPublished.is_paused ? " paused" : ""}`}>{latestPublished.is_paused ? "انتشار متوقف شده" : `در حال انتشار · ${latestRolloutPercentage}٪`}</span>
            </div>
            <p>
              کد نسخه: <b dir="ltr">{latestPublished.version_code}</b>
              <span aria-hidden="true"> · </span>
              {latestPublished.published_at
                ? new Date(latestPublished.published_at).toLocaleDateString('fa-IR')
                : 'تاریخ انتشار ثبت نشده'}
              {latestPublished.is_mandatory ? ' · آپدیت اجباری' : ''}
              {!latestPublished.is_paused ? ` · انتشار ${latestRolloutPercentage}٪` : ''}
            </p>
            {latestPublished.changelog && (
              <div className="admin-app-release-notes">{latestPublished.changelog}</div>
            )}
            <div className="admin-app-release-url" dir="ltr">{latestPublished.download_url}</div>
          </div>
          <div className="admin-app-release-actions">
            <a
              className="admin-app-release-download"
              href={latestPublished.download_url}
              target="_blank"
              rel="noreferrer"
            >
              دانلود فایل APK <span aria-hidden="true">↗</span>
            </a>
            <button
              type="button"
              className="admin-app-release-copy"
              onClick={() => handleCopyDownloadLink(latestPublished.download_url)}
            >
              کپی لینک دانلود
            </button>
          </div>
          <div className="admin-release-control">
            <div className="admin-release-control-heading">
              <div>
                <h4>کنترل انتشار مرحله‌ای</h4>
                <p>هر دستگاه با شناسه ثابت خودش در یک گروه قرار می‌گیرد؛ با افزایش درصد، گروه‌های قبلی هم حفظ می‌شوند.</p>
              </div>
              <span className={`admin-release-state${latestPublished.is_paused ? ' paused' : ''}`}>
                {latestPublished.is_paused ? 'متوقف' : `${latestRolloutPercentage}٪ فعال`}
              </span>
            </div>
            <div className="admin-release-stages" aria-label="مراحل انتشار">
              {[10, 25, 50, 100].map((stage) => (
                <div key={stage} className={stage <= latestRolloutPercentage ? 'completed' : ''}>
                  <span>{stage}٪</span>
                  <i />
                </div>
              ))}
            </div>
            <div className="admin-release-actions">
              {!latestPublished.is_paused && nextRolloutPercentage && (
                <button
                  type="button"
                  className="admin-release-primary"
                  disabled={managingReleaseId === latestPublished.id}
                  onClick={() => handleReleaseAction(latestPublished, 'increase_rollout', nextRolloutPercentage)}
                >
                  {managingReleaseId === latestPublished.id ? 'در حال ذخیره...' : `افزایش انتشار به ${nextRolloutPercentage}٪`}
                </button>
              )}
              {latestPublished.is_paused ? (
                <button
                  type="button"
                  className="admin-release-secondary"
                  disabled={managingReleaseId === latestPublished.id}
                  onClick={() => handleReleaseAction(latestPublished, 'resume')}
                >
                  ادامه انتشار با درصد قبلی
                </button>
              ) : (
                <button
                  type="button"
                  className="admin-release-danger"
                  disabled={managingReleaseId === latestPublished.id}
                  onClick={() => handleReleaseAction(latestPublished, 'pause')}
                >
                  توقف فوری انتشار
                </button>
              )}
              <button
                type="button"
                className="admin-release-secondary"
                disabled={!previousPublished || latestPublished.is_paused || managingReleaseId === latestPublished.id}
                onClick={() => handleReleaseAction(latestPublished, 'rollback')}
              >
                بازگشت امن به نسخه پایدار قبلی
              </button>
              {latestPublished.is_paused && (
                <button type="button" className="admin-release-hotfix" onClick={() => handlePrepareHotfix(latestPublished)}>
                  ساخت نسخه اصلاحی
                </button>
              )}
            </div>
            {!previousPublished && (
              <p className="admin-release-warning">
                نسخه پایدار قبلیِ منتشرشده‌ای برای بازگشت وجود ندارد. در صورت توقف، برای کاربرانی که نسخه مشکل‌دار را نصب کرده‌اند باید نسخه اصلاحی با کد بالاتر بسازی.
              </p>
            )}
            <p className="admin-release-footnote">
              توقف انتشار، نمایش آپدیت و ارسال اعلان‌های بعدی را متوقف می‌کند. اندروید APK نصب‌شده را خودکار به نسخه پایین‌تر برنمی‌گرداند؛ برای دستگاه‌هایی که نسخه جدید را نصب کرده‌اند، راه‌حل امن انتشار اصلاحیه با versionCode بالاتر است.
            </p>
          </div>
        </section>
      )}

      <div className="admin-panel-heading" style={{ marginTop: 28 }}>
        <div><h2>نسخه‌های منتشرشده</h2><p>اطلاعات نسخه از فرایند انتشار دریافت می‌شود.</p></div>
        <button type="button" className="admin-secondary-button" onClick={() => loadData()}>بروزرسانی فهرست</button>
      </div>

      {waitingAfter !== null && <div className="admin-empty" role="status">در حال ساخت APK... (حدود ۳ دقیقه) لیست خودکار به‌روز می‌شود.</div>}
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
                  <td><span className={`admin-status ${row.is_paused ? 'paused' : row.is_published ? 'published' : 'draft'}`}>{row.is_paused ? 'متوقف شده' : row.is_published ? `انتشار ${row.rollout_percentage ?? 100}٪` : 'در انتظار انتشار'}</span></td>
                  <td>{row.is_mandatory ? 'بله' : 'خیر'}</td>
                  <td>{row.published_at ? new Date(row.published_at).toLocaleDateString('fa-IR') : '—'}</td>
                  <td><div className="admin-row-actions">
                    {row.download_url && <a href={row.download_url} target="_blank" rel="noreferrer">دانلود APK</a>}
                    {row.id === latestPublished?.id && row.is_published && !row.is_paused && <button type="button" disabled={notifyingId === row.id} onClick={() => handleNotify(row)}>{notifyingId === row.id ? 'در حال ارسال...' : 'ارسال اعلان به گروه فعال'}</button>}
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
