import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  LuActivity,
  LuChartNoAxesCombined,
  LuEye,
  LuGlobe,
  LuMonitor,
  LuRefreshCw,
  LuSmartphone,
  LuTablet,
  LuUsers,
} from 'react-icons/lu'
import { supabase } from '../lib/supabase'
import './AdminAnalytics.css'

const RANGE_OPTIONS = [
  { value: 7, label: '۷ روز' },
  { value: 30, label: '۳۰ روز' },
  { value: 90, label: '۹۰ روز' },
]

const DEVICE_LABELS = {
  desktop: 'کامپیوتر',
  mobile: 'موبایل',
  tablet: 'تبلت',
  unknown: 'نامشخص',
}

function formatNumber(value) {
  return Number(value || 0).toLocaleString('fa-IR')
}

function formatDay(value) {
  const date = new Date(String(value) + 'T12:00:00Z')
  return new Intl.DateTimeFormat('fa-IR', {
    month: 'short',
    day: 'numeric',
    timeZone: 'UTC',
  }).format(date)
}

function getRangeDates(days) {
  const to = new Date()
  to.setUTCHours(0, 0, 0, 0)
  to.setUTCDate(to.getUTCDate() + 1)
  const from = new Date(to)
  from.setUTCDate(from.getUTCDate() - days)
  return { from: from.toISOString(), to: to.toISOString() }
}

function MetricCard({ Icon, label, value, hint, tone = '' }) {
  return (
    <article className={'analytics-metric ' + tone}>
      <span className="analytics-metric-icon"><Icon aria-hidden="true" /></span>
      <div className="analytics-metric-copy">
        <span>{label}</span>
        <strong>{formatNumber(value)}</strong>
        {hint && <small>{hint}</small>}
      </div>
    </article>
  )
}

function BarList({ title, description, items, labelKey, icon: Icon, emptyText }) {
  const max = Math.max(1, ...items.map((item) => Number(item.views || 0)))
  return (
    <section className="admin-panel analytics-list-panel">
      <div className="admin-panel-heading">
        <div><h2>{title}</h2>{description && <p>{description}</p>}</div>
        {Icon && <Icon aria-hidden="true" />}
      </div>
      {items.length === 0 ? <div className="analytics-empty">{emptyText}</div> : (
        <div className="analytics-bar-list">
          {items.map((item) => (
            <div className="analytics-bar-row" key={item[labelKey]}>
              <div className="analytics-bar-meta">
                <span title={item[labelKey]}>{item[labelKey]}</span>
                <strong>{formatNumber(item.views)}</strong>
              </div>
              <div className="analytics-bar-track">
                <span style={{ width: Math.max(3, (Number(item.views || 0) / max) * 100) + '%' }} />
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  )
}

function AdminAnalytics() {
  const [range, setRange] = useState(30)
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState('')

  const loadAnalytics = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true)
    else setLoading(true)
    setError('')
    try {
      const dates = getRangeDates(range)
      const result = await supabase.getSiteAnalytics(dates.from, dates.to)
      setData(result)
    } catch (err) {
      setError(err?.message || 'دریافت آمار سایت انجام نشد.')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [range])

  useEffect(() => { loadAnalytics() }, [loadAnalytics])

  const daily = data?.daily || []
  const chartMax = Math.max(1, ...daily.map((item) => Number(item.views || 0)))
  const totals = data?.summary || {}
  const averageViews = useMemo(() => {
    if (!daily.length) return 0
    return Math.round(daily.reduce((sum, day) => sum + Number(day.views || 0), 0) / daily.length)
  }, [daily])

  return (
    <div className="admin-analytics">
      <div className="analytics-toolbar">
        <div>
          <span className="analytics-eyebrow">CHARTMASTERS / INSIGHTS</span>
          <p>نمای کلی عملکرد و رفتار بازدیدکنندگان سایت</p>
        </div>
        <div className="analytics-toolbar-actions">
          <div className="analytics-range" aria-label="بازه زمانی آمار">
            {RANGE_OPTIONS.map((option) => (
              <button
                key={option.value}
                type="button"
                className={range === option.value ? 'active' : ''}
                aria-pressed={range === option.value}
                onClick={() => setRange(option.value)}
              >
                {option.label}
              </button>
            ))}
          </div>
          <button type="button" className="admin-secondary-button analytics-refresh" onClick={() => loadAnalytics(true)} disabled={loading || refreshing}>
            <LuRefreshCw className={refreshing ? 'is-spinning' : ''} aria-hidden="true" />
            بروزرسانی
          </button>
        </div>
      </div>

      {error && <div className="admin-alert error">{error}</div>}

      {loading ? <div className="admin-panel analytics-loading">در حال دریافت آمار واقعی سایت...</div> : !data ? <div className="admin-panel analytics-loading">آمار هنوز قابل دریافت نیست. خطای بالا را بررسی کنید.</div> : (
        <>
          <div className="analytics-metrics-grid">
            <MetricCard Icon={LuEye} label="بازدید صفحات" value={totals.page_views} hint="تعداد کل صفحات مشاهده‌شده" />
            <MetricCard Icon={LuUsers} label="بازدیدکننده یکتا" value={totals.unique_visitors} hint="شناسه‌های مرورگر در بازه انتخابی" tone="is-green" />
            <MetricCard Icon={LuActivity} label="نشست‌ها" value={totals.sessions} hint="نشست‌های مرورگر در بازه انتخابی" />
            <MetricCard Icon={LuGlobe} label="کاربران ثبت‌نام‌شده" value={totals.registered_users} hint={formatNumber(totals.new_users) + ' ثبت‌نام در این بازه'} />
          </div>

          <div className="analytics-secondary-metrics">
            <div><span>بازدیدکنندگان فعال در ۵ دقیقه اخیر</span><strong>{formatNumber(totals.active_visitors)}</strong></div>
            <div><span>میانگین بازدید روزانه</span><strong>{formatNumber(averageViews)}</strong></div>
          </div>

          <section className="admin-panel analytics-chart-panel">
            <div className="admin-panel-heading">
              <div><h2>روند بازدید روزانه</h2><p>تعداد بازدید صفحات در هر روز</p></div>
              <LuChartNoAxesCombined aria-hidden="true" />
            </div>
            {daily.length === 0 ? <div className="analytics-empty">هنوز داده‌ای برای نمایش وجود ندارد.</div> : (
              <div className="analytics-chart-scroll">
                <div className="analytics-chart" role="img" aria-label="نمودار بازدید روزانه سایت">
                  {daily.map((item) => {
                    const views = Number(item.views || 0)
                    const height = views === 0 ? 2 : Math.max(5, (views / chartMax) * 100)
                    return (
                      <div className="analytics-chart-column" key={item.date} title={formatDay(item.date) + ': ' + formatNumber(views) + ' بازدید'}>
                        <strong>{views > 0 ? formatNumber(views) : ''}</strong>
                        <span className="analytics-chart-bar" style={{ height: height + '%' }} />
                        <small>{formatDay(item.date)}</small>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
          </section>

          <div className="analytics-detail-grid">
            <BarList title="صفحات پربازدید" description="کدام بخش‌های سایت بیشتر دیده شده‌اند؟" items={data?.top_pages || []} labelKey="path" icon={LuEye} emptyText="هنوز بازدیدی ثبت نشده است." />
            <BarList title="منابع ورودی" description="بازدیدکنندگان از چه سایت‌هایی آمده‌اند؟" items={data?.referrers || []} labelKey="source" icon={LuGlobe} emptyText="هنوز منبع ورودی ثبت نشده است." />
          </div>

          <section className="admin-panel analytics-devices-panel">
            <div className="admin-panel-heading"><div><h2>دستگاه بازدیدکنندگان</h2><p>توزیع بازدید بر اساس نوع دستگاه</p></div></div>
            <div className="analytics-device-grid">
              {(data?.devices || []).map((item) => {
                const Icon = item.device === 'mobile' ? LuSmartphone : item.device === 'tablet' ? LuTablet : LuMonitor
                return (
                  <div className="analytics-device-item" key={item.device}>
                    <Icon aria-hidden="true" />
                    <span>{DEVICE_LABELS[item.device] || DEVICE_LABELS.unknown}</span>
                    <strong>{formatNumber(item.views)}</strong>
                  </div>
                )
              })}
              {(data?.devices || []).length === 0 && <div className="analytics-empty">هنوز داده‌ای برای نمایش وجود ندارد.</div>}
            </div>
          </section>

          <p className="analytics-privacy-note">
            آمار بازدید از زمان فعال‌شدن این قابلیت جمع‌آوری می‌شود و بازدیدهای گذشته قابل بازیابی نیستند.
            «بازدیدکننده یکتا» بر اساس شناسه ناشناس مرورگر محاسبه می‌شود و الزاماً معادل یک انسان نیست.
          </p>
        </>
      )}
    </div>
  )
}

export default AdminAnalytics
