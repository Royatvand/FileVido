import { useEffect, useMemo, useState } from 'react'
import {
  LuArrowLeft,
  LuArrowRight,
  LuAward,
  LuCalendarDays,
  LuExternalLink,
  LuShare2,
  LuShieldCheck,
  LuTrophy,
} from 'react-icons/lu'
import { supabase } from '../lib/supabase'
import '../prop-firms.css'

const MONTHS = [
  'فروردین', 'اردیبهشت', 'خرداد', 'تیر', 'مرداد', 'شهریور',
  'مهر', 'آبان', 'آذر', 'دی', 'بهمن', 'اسفند',
]

const CRITERIA = [
  ['law_transparency', 'شفافیت قوانین'],
  ['support_quality', 'کیفیت پشتیبانی'],
  ['payout_reliability', 'شفافیت پرداخت‌ها'],
  ['user_experience', 'تجربه کاربران'],
]

function getJalaliDate() {
  const parts = new Intl.DateTimeFormat('en-US-u-ca-persian-nu-latn', {
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
  }).formatToParts(new Date())
  const value = (type) => Number(parts.find((part) => part.type === type)?.value || 0)
  return { year: value('year'), month: value('month'), day: value('day') }
}

function readInitialSelection() {
  const date = getJalaliDate()
  const params = new URLSearchParams(window.location.search)
  const year = Number(params.get('year'))
  const month = Number(params.get('month'))
  return {
    year: year >= 1300 && year <= 1600 ? year : date.year,
    month: month >= 1 && month <= 12 ? month : date.month,
  }
}

function formatScore(value) {
  return new Intl.NumberFormat('fa-IR').format(value)
}

function AwardLogo({ src, name, large = false }) {
  return (
    <div className={large ? 'prop-award-logo prop-award-logo-large' : 'prop-award-logo'}>
      {src ? <img src={src} alt={'لوگوی ' + name} loading="lazy" /> : <LuTrophy aria-hidden="true" />}
    </div>
  )
}

function PropFirms() {
  const currentDate = useMemo(getJalaliDate, [])
  const initialSelection = useMemo(readInitialSelection, [])
  const [awards, setAwards] = useState([])
  const [selectedYear, setSelectedYear] = useState(initialSelection.year)
  const [selectedMonth, setSelectedMonth] = useState(initialSelection.month)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [sharing, setSharing] = useState(false)

  useEffect(() => {
    let active = true
    async function loadAwards() {
      setLoading(true)
      setError('')
      try {
        const rows = await supabase.select(
          'monthly_prop_awards',
          '&status=eq.published&order=jalali_year.desc,jalali_month.desc',
          'id,jalali_year,jalali_month,firm_name_snapshot,firm_logo_snapshot,firm_website_snapshot,description,selection_reason,overall_score,criteria_scores,published_at',
        )
        if (active) setAwards(rows || [])
      } catch (loadError) {
        if (active) setError(loadError.message || 'دریافت آرشیو برندگان انجام نشد.')
      } finally {
        if (active) setLoading(false)
      }
    }
    loadAwards()
    return () => { active = false }
  }, [])

  const awardsByMonth = useMemo(() => {
    const map = new Map()
    awards.forEach((award) => map.set(award.jalali_year + '-' + award.jalali_month, award))
    return map
  }, [awards])

  const currentAward = awardsByMonth.get(currentDate.year + '-' + currentDate.month) || null
  const selectedAward = awardsByMonth.get(selectedYear + '-' + selectedMonth) || null
  const earliestYear = awards.length
    ? Math.min(currentDate.year, ...awards.map((award) => award.jalali_year))
    : currentDate.year
  const canGoPrevious = selectedYear > earliestYear
  const canGoNext = selectedYear < currentDate.year

  function updateSelection(year, month) {
    setSelectedYear(year)
    setSelectedMonth(month)
    const url = new URL(window.location.href)
    url.searchParams.set('year', String(year))
    url.searchParams.set('month', String(month))
    window.history.replaceState({}, '', url)
  }

  function moveYear(direction) {
    const nextYear = selectedYear + direction
    if (nextYear < earliestYear || nextYear > currentDate.year) return
    updateSelection(nextYear, selectedMonth)
  }

  async function shareAward(award, year, month) {
    const url = new URL('/prop-firms', window.location.origin)
    url.searchParams.set('year', String(year))
    url.searchParams.set('month', String(month))
    const title = 'بهترین پراپ فرم ' + MONTHS[month - 1] + ' ' + year
    const text = award
      ? title + ': ' + award.firm_name_snapshot + ' | انتخاب چارت مسترز'
      : title + ' | چارت مسترز'
    setSharing(true)
    try {
      if (navigator.share) {
        await navigator.share({ title, text, url: url.toString() })
      } else if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(url.toString())
        window.alert('لینک این ماه کپی شد.')
      } else {
        window.prompt('لینک این ماه:', url.toString())
      }
    } catch (shareError) {
      if (shareError?.name !== 'AbortError') {
        window.prompt('لینک این ماه:', url.toString())
      }
    } finally {
      setSharing(false)
    }
  }

  function renderAwardDetails(award, year, month, isCurrent = false) {
    if (!award) {
      return (
        <div className="prop-empty-award">
          <span className="prop-empty-icon"><LuCalendarDays aria-hidden="true" /></span>
          <div>
            <strong>{isCurrent ? 'برنده این ماه هنوز معرفی نشده است' : 'برای این ماه برنده‌ای ثبت نشده است'}</strong>
            <p>به‌محض انتشار انتخاب چارت مسترز، اطلاعات اینجا نمایش داده می‌شود.</p>
          </div>
        </div>
      )
    }

    const criteria = CRITERIA.filter(([key]) => {
      const score = award.criteria_scores?.[key]
      return score !== null && score !== undefined && score !== ''
    })

    return (
      <div className="prop-award-details">
        <div className="prop-award-details-brand">
          <AwardLogo src={award.firm_logo_snapshot} name={award.firm_name_snapshot} large />
          <div className="prop-award-details-copy">
            <span className="prop-award-kicker">{MONTHS[month - 1]} {formatScore(year)}</span>
            <h3>{award.firm_name_snapshot}</h3>
            <span className="prop-award-caption">انتخاب چارت مسترز</span>
          </div>
          {award.overall_score !== null && award.overall_score !== undefined && (
            <div className="prop-score">
              <strong>{formatScore(award.overall_score)}</strong>
              <span>از ۱۰۰</span>
            </div>
          )}
        </div>

        {award.description && <p className="prop-award-description">{award.description}</p>}
        {award.selection_reason && (
          <div className="prop-reason">
            <span><LuShieldCheck aria-hidden="true" /> دلیل انتخاب</span>
            <p>{award.selection_reason}</p>
          </div>
        )}

        {criteria.length > 0 && (
          <div className="prop-criteria">
            <h4>معیارهای ارزیابی ثبت‌شده</h4>
            <div className="prop-criteria-grid">
              {criteria.map(([key, label]) => (
                <div className="prop-criterion" key={key}>
                  <span>{label}</span>
                  <strong>{formatScore(award.criteria_scores[key])}<small>/۱۰۰</small></strong>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="prop-award-actions">
          {award.firm_website_snapshot && (
            <a href={award.firm_website_snapshot} target="_blank" rel="noreferrer">
              وب‌سایت پراپ فرم <LuExternalLink aria-hidden="true" />
            </a>
          )}
          <button type="button" onClick={() => shareAward(award, year, month)} disabled={sharing}>
            <LuShare2 aria-hidden="true" /> اشتراک‌گذاری این ماه
          </button>
        </div>
      </div>
    )
  }

  return (
    <main className="prop-page" dir="rtl">
      <div className="prop-shell">
        <section className="prop-intro">
          <div className="prop-intro-copy">
            <span className="prop-eyebrow"><i /> انتخاب ماهانه چارت مسترز</span>
            <h1>بهترین پراپ فرم <span>ماه</span></h1>
            <p>مرور انتخاب‌های ماهانه پراپ‌فرم‌های ایرانی؛ همراه با دلیل انتخاب و آرشیو سال‌های گذشته.</p>
          </div>
          <div className="prop-intro-mark" aria-hidden="true">
            <span className="prop-mark-ring prop-mark-ring-one" />
            <span className="prop-mark-ring prop-mark-ring-two" />
            <LuTrophy />
          </div>
        </section>

        <section className="prop-current-section" aria-labelledby="prop-current-title">
          <div className="prop-section-heading">
            <div>
              <span>انتخاب ماه جاری</span>
              <h2 id="prop-current-title">{MONTHS[currentDate.month - 1]} {formatScore(currentDate.year)}</h2>
            </div>
            <span className="prop-live-tag"><i /> آخرین انتخاب</span>
          </div>
          {loading ? (
            <div className="prop-loading"><span className="prop-spinner" /> در حال دریافت اطلاعات...</div>
          ) : error ? (
            <div className="prop-inline-error">{error}</div>
          ) : currentAward ? (
            <div className="prop-current-card">
              <div className="prop-current-glow" />
              <div className="prop-current-brand">
                <AwardLogo src={currentAward.firm_logo_snapshot} name={currentAward.firm_name_snapshot} large />
                <div>
                  <span className="prop-winner-label"><LuAward aria-hidden="true" /> برنده این ماه</span>
                  <h3>{currentAward.firm_name_snapshot}</h3>
                  <p>انتخاب چارت مسترز برای {MONTHS[currentDate.month - 1]} {formatScore(currentDate.year)}</p>
                </div>
              </div>
              <div className="prop-current-side">
                {currentAward.overall_score !== null && currentAward.overall_score !== undefined ? (
                  <div className="prop-current-score"><strong>{formatScore(currentAward.overall_score)}</strong><span>امتیاز از ۱۰۰</span></div>
                ) : (
                  <span className="prop-current-honour"><LuShieldCheck aria-hidden="true" /> انتخاب تحریریه</span>
                )}
                <button type="button" onClick={() => updateSelection(currentDate.year, currentDate.month)}>
                  مشاهده جزئیات <LuArrowLeft aria-hidden="true" />
                </button>
              </div>
            </div>
          ) : (
            <div className="prop-current-empty">
              <span><LuTrophy aria-hidden="true" /></span>
              <div><strong>هنوز برنده این ماه معرفی نشده</strong><p>به‌زودی انتخاب ماه جاری در همین بخش منتشر می‌شود.</p></div>
            </div>
          )}
        </section>

        <section className="prop-history-section" aria-labelledby="prop-history-title">
          <div className="prop-history-heading">
            <div>
              <span className="prop-section-kicker">آرشیو انتخاب‌ها</span>
              <h2 id="prop-history-title">مسیر برندگان ماهانه</h2>
              <p>سال را عوض کن و روی هر ماه بزن تا برنده و جزئیات آن را ببینی.</p>
            </div>
            <div className="prop-year-switcher" aria-label="انتخاب سال">
              <button type="button" onClick={() => moveYear(-1)} disabled={!canGoPrevious} aria-label="سال قبل"><LuArrowRight /></button>
              <strong>{formatScore(selectedYear)}</strong>
              <button type="button" onClick={() => moveYear(1)} disabled={!canGoNext} aria-label="سال بعد"><LuArrowLeft /></button>
            </div>
          </div>

          {loading ? (
            <div className="prop-loading"><span className="prop-spinner" /> در حال بارگذاری آرشیو...</div>
          ) : error ? (
            <div className="prop-inline-error">{error}</div>
          ) : (
            <div className="prop-month-grid">
              {MONTHS.map((monthName, index) => {
                const month = index + 1
                const award = awardsByMonth.get(selectedYear + '-' + month) || null
                const isSelected = selectedMonth === month
                const isCurrent = selectedYear === currentDate.year && month === currentDate.month
                return (
                  <button
                    type="button"
                    key={monthName}
                    className={'prop-month-card' + (isSelected ? ' selected' : '') + (award ? ' has-award' : '') + (isCurrent ? ' current' : '')}
                    onClick={() => updateSelection(selectedYear, month)}
                    aria-pressed={isSelected}
                  >
                    <span className="prop-month-top">
                      <span>{monthName}</span>
                      {award ? <LuTrophy aria-label="برنده منتشرشده" /> : <span className="prop-month-empty-dot" />}
                    </span>
                    <span className="prop-month-logo">
                      {award?.firm_logo_snapshot ? (
                        <img src={award.firm_logo_snapshot} alt="" loading="lazy" />
                      ) : (
                        <LuAward aria-hidden="true" />
                      )}
                    </span>
                    <strong>{award ? award.firm_name_snapshot : 'بدون انتخاب'}</strong>
                    <small>{award ? 'مشاهده برنده' : 'هنوز معرفی نشده'}</small>
                  </button>
                )
              })}
            </div>
          )}

          <div className="prop-history-legend">
            <span><i className="awarded" /> برنده منتشرشده</span>
            <span><i className="pending" /> بدون انتخاب</span>
            <span><i className="selected" /> ماه انتخاب‌شده</span>
          </div>
        </section>

        <section className="prop-details-section" aria-labelledby="prop-details-title">
          <div className="prop-details-heading">
            <div>
              <span className="prop-section-kicker">جزئیات آرشیو</span>
              <h2 id="prop-details-title">{MONTHS[selectedMonth - 1]} {formatScore(selectedYear)}</h2>
            </div>
            <button type="button" className="prop-share-link" onClick={() => shareAward(selectedAward, selectedYear, selectedMonth)} disabled={sharing}>
              <LuShare2 aria-hidden="true" /> اشتراک‌گذاری
            </button>
          </div>
          {loading ? (
            <div className="prop-loading"><span className="prop-spinner" /> در حال دریافت جزئیات...</div>
          ) : error ? (
            <div className="prop-inline-error">{error}</div>
          ) : renderAwardDetails(selectedAward, selectedYear, selectedMonth)}
        </section>

        <aside className="prop-editorial-note">
          <LuShieldCheck aria-hidden="true" />
          <p>این بخش، انتخاب تحریریه چارت مسترز است. معیارها و توضیحات فقط بر اساس اطلاعات ثبت‌شده و منتشرشده نمایش داده می‌شوند؛ معرفی ماهانه به‌تنهایی تضمین‌کننده عملکرد یا اعتبار یک شرکت نیست.</p>
        </aside>
      </div>
    </main>
  )
}

export default PropFirms
