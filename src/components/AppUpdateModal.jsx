import { openExternalUrl, setDismissedVersionCode } from '../lib/appUpdate'

function AppUpdateModal({ update, onDismiss }) {
  if (!update?.latest) return null

  const { latest, installed } = update
  const mandatory = Boolean(latest.isMandatory)

  function handleDownload() {
    if (latest.downloadUrl) openExternalUrl(latest.downloadUrl)
  }

  function handleLater() {
    if (mandatory) return
    setDismissedVersionCode(latest.versionCode)
    onDismiss?.()
  }

  return (
    <div
      className={`app-update-overlay${mandatory ? ' mandatory' : ''}`}
      role="dialog"
      aria-modal="true"
      aria-labelledby="app-update-title"
      dir="rtl"
    >
      <div className="app-update-card">
        <div className="app-update-badge">{mandatory ? 'آپدیت اجباری' : 'نسخه جدید'}</div>
        <h2 id="app-update-title">
          {mandatory ? 'برای ادامه باید اپ را به‌روز کنید' : 'نسخه جدید آماده است'}
        </h2>
        <p className="app-update-versions">
          نسخه نصب‌شده: <strong>{installed?.versionName || '—'}</strong>
          <span className="app-update-sep">·</span>
          نسخه جدید: <strong>{latest.versionName}</strong>
        </p>
        {latest.changelog ? (
          <div className="app-update-changelog">
            <strong>تغییرات این نسخه</strong>
            <p>{latest.changelog}</p>
          </div>
        ) : null}
        {mandatory ? (
          <p className="app-update-lock-note">
            تا زمان نصب نسخه جدید، دسترسی به امکانات اپ موقتاً غیرفعال است.
          </p>
        ) : null}
        <div className="app-update-actions">
          <button type="button" className="app-update-primary" onClick={handleDownload}>
            دانلود و نصب نسخه جدید
          </button>
          {!mandatory && (
            <button type="button" className="app-update-secondary" onClick={handleLater}>
              بعداً
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

export default AppUpdateModal
