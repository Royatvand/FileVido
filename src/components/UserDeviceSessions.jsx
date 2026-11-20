import { useCallback, useEffect, useState } from 'react'
import {
  LuClock3,
  LuLaptop,
  LuLogOut,
  LuMonitor,
  LuRefreshCw,
  LuShieldCheck,
  LuSmartphone,
  LuTablet,
} from 'react-icons/lu'
import { userAuth } from '../lib/supabase'

function formatLastSeen(value) {
  if (!value) return 'زمان نامشخص'
  return new Intl.DateTimeFormat('fa-IR', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value))
}

function DeviceIcon({ type }) {
  if (type === 'mobile') return <LuSmartphone />
  if (type === 'tablet') return <LuTablet />
  return <LuMonitor />
}

function UserDeviceSessions() {
  const [devices, setDevices] = useState([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [signingOut, setSigningOut] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  const loadDevices = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true)
    else setLoading(true)
    setError('')
    try {
      await userAuth.registerCurrentDevice()
      const result = await userAuth.getDeviceSessions()
      setDevices(result)
    } catch (err) {
      setError(err.message || 'دریافت دستگاه‌های متصل انجام نشد.')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  useEffect(() => {
    Promise.resolve().then(loadDevices)
    const heartbeat = window.setInterval(() => {
      userAuth.touchCurrentDevice().catch(() => {})
    }, 5 * 60 * 1000)
    return () => window.clearInterval(heartbeat)
  }, [loadDevices])

  async function handleSignOutOthers() {
    const confirmed = window.confirm('از تمام دستگاه‌های دیگر خارج شوی؟ دستگاه فعلی متصل می‌ماند.')
    if (!confirmed) return

    setSigningOut(true)
    setError('')
    setNotice('')
    try {
      await userAuth.signOutOtherDevices()
      setNotice('نشست دستگاه‌های دیگر با موفقیت لغو شد.')
      await loadDevices(true)
    } catch (err) {
      setError(err.message || 'خروج از دستگاه‌های دیگر انجام نشد.')
    } finally {
      setSigningOut(false)
    }
  }

  return (
    <section className="user-device-panel" aria-labelledby="user-device-title">
      <div className="user-device-heading">
        <div className="user-device-heading-icon"><LuShieldCheck /></div>
        <div>
          <span className="user-dashboard-section-kicker">SECURITY & SESSIONS</span>
          <h3 id="user-device-title">دستگاه‌های متصل</h3>
          <p>مرورگرها و دستگاه‌هایی که با حساب تو وارد شده‌اند.</p>
        </div>
        <button
          className="user-device-refresh"
          type="button"
          onClick={() => loadDevices(true)}
          disabled={refreshing || loading}
          aria-label="به‌روزرسانی فهرست دستگاه‌ها"
          title="به‌روزرسانی"
        >
          <LuRefreshCw className={refreshing ? 'is-spinning' : ''} />
        </button>
      </div>

      {error && <div className="user-dashboard-error" role="alert">{error}</div>}
      {notice && <div className="user-dashboard-notice" role="status">{notice}</div>}

      {loading ? (
        <div className="user-device-loading"><span className="user-dashboard-spinner" /></div>
      ) : devices.length ? (
        <div className="user-device-list">
          {devices.map((device) => (
            <article className={'user-device-item ' + (device.is_current ? 'is-current' : '')} key={device.id}>
              <span className="user-device-icon"><DeviceIcon type={device.device_type} /></span>
              <div className="user-device-copy">
                <div className="user-device-name-row">
                  <strong>{device.device_label}</strong>
                  {device.is_current && <span className="user-device-current-badge">این دستگاه</span>}
                </div>
                <span>{device.operating_system} · {device.browser}</span>
                <small><LuClock3 /> آخرین فعالیت: {formatLastSeen(device.last_seen_at)}</small>
              </div>
              <span className="user-device-kind">
                {device.device_type === 'mobile' ? 'موبایل' : device.device_type === 'tablet' ? 'تبلت' : 'کامپیوتر'}
              </span>
            </article>
          ))}
        </div>
      ) : (
        <div className="user-device-empty">هنوز دستگاهی برای این حساب ثبت نشده است.</div>
      )}

      <div className="user-device-footer">
        <p><LuLaptop /> برای امنیت بیشتر، فقط از دستگاه‌هایی وارد شو که به آن‌ها اعتماد داری.</p>
        <button
          type="button"
          className="user-device-signout-others"
          onClick={handleSignOutOthers}
          disabled={signingOut || loading}
        >
          <LuLogOut />
          {signingOut ? 'در حال خروج...' : 'خروج از سایر دستگاه‌ها'}
        </button>
      </div>
      <small className="user-device-disclaimer">
        اطلاعات دستگاه از مرورگر دریافت می‌شود و ممکن است دقیقاً مدل سخت‌افزار را مشخص نکند. نشست‌های قدیمی ممکن است تا اولین بازدید در فهرست دیده نشوند؛ خروج از سایر دستگاه‌ها همه نشست‌های دیگر را لغو می‌کند.
      </small>
    </section>
  )
}

export default UserDeviceSessions
