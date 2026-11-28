import { useEffect, useMemo, useState } from 'react'
import {
  LuArrowLeft,
  LuArrowRight,
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
const RANK_LIMIT = 10

function getJalaliDate() {
  const parts = new Intl.DateTimeFormat('en-US-u-ca-persian-nu-latn', {
    timeZone: 'Asia/Tehran',
    year: 'numeric',
    month: 'numeric',
  }).formatToParts(new Date())
  const value = (type) => Number(parts.find((part) => part.type === type)?.value || 0)
  return { year: value('year'), month: value('month') }
}

function readInitialSelection() {
  const date = getJalaliDate()
  const params = new URLSearchParams(window.location.search)
  const year = Number(params.get('year'))
  const month = Number(params.get('month'))
  return {
    year: year >= 1300 && year <= date.year ? year : date.year,
    month: month >= 1 && month <= 12 ? month : date.month,
  }
}

function faNumber(value) {
  return new Intl.NumberFormat('fa-IR').format(value)
}

function FirmLogo({ src, name }) {
  return (
    <div className="prop-ranking-logo">
      {src ? <img src={src} alt={'لوگوی ' + name} loading="lazy" /> : <LuTrophy aria-hidden="true" />}
    </div>
  )
}

function PropFirms() {
  const currentDate = useMemo(getJalaliDate, [])
  const initialSelection = useMemo(readInitialSelection, [])
  const [rankings, setRankings] = useState([])
  const [selectedYear, setSelectedYear] = useState(initialSelection.year)
  const [selectedMonth, setSelectedMonth] = useState(initialSelection.month)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [sharing, setSharing] = useState(false)
  const [displayMode, setDisplayMode] = useState('list')

  useEffect(() => {
    let active = true
    async function loadRankings() {
      setLoading(true)
      setError('')
      try {
        const rows = await supabase.select(
          'monthly_prop_awards',
          '&status=eq.published&order=jalali_year.desc,jalali_month.desc,rank_position.asc',
          'id,jalali_year,jalali_month,rank_position,firm_name_snapshot,firm_logo_snapshot,firm_website_snapshot,description,selection_reason,overall_score,published_at',
        )
        if (active) setRankings(rows || [])
      } catch (loadError) {
        if (active) setError(loadError.message || 'دریافت رتبه‌بندی پراپ‌فرم‌ها انجام نشد.')
      } finally {
        if (active) setLoading(false)
      }
    }
    loadRankings()
    return () => { active = false }
  }, [])

  const rankingsByMonth = useMemo(() => {
    const map = new Map()
    rankings.forEach((item) => {
      const key = item.jalali_year + '-' + item.jalali_month
      if (!map.has(key)) map.set(key, [])
      map.get(key).push(item)
    })
    map.forEach((items) => items.sort((a, b) => Number(a.rank_position || 1) - Number(b.rank_position || 1)))
    return map
  }, [rankings])

  const selectedRankings = rankingsByMonth.get(selectedYear + '-' + selectedMonth) || []
  const earliestYear = rankings.length
    ? Math.min(currentDate.year, ...rankings.map((item) => Number(item.jalali_year)))
    : currentDate.year
  const canGoPrevious = selectedYear > earliestYear
  const canGoNext = selectedYear < currentDate.year
  const isCurrentMonth = selectedYear === currentDate.year && selectedMonth === currentDate.month

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

  async function shareLeaderboard(items, year, month) {
    const url = new URL('/prop-firms', window.location.origin)
    url.searchParams.set('year', String(year))
    url.searchParams.set('month', String(month))
    const title = 'رتبه‌بندی پراپ‌فرم‌ها · ' + MONTHS[month - 1] + ' ' + faNumber(year)
    const orderedNames = items
      .slice()
      .sort((a, b) => Number(a.rank_position || 1) - Number(b.rank_position || 1))
      .map((item) => faNumber(item.rank_position || 1) + '. ' + item.firm_name_snapshot)
    const shareText = orderedNames.length
      ? title + '\n' + orderedNames.join('\n') + '\nچارت مسترز'
      : title + ' | هنوز رتبه‌ای منتشر نشده است'
    setSharing(true)
    try {
      if (navigator.share) {
        await navigator.share({ title, text: shareText, url: url.toString() })
      } else if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(url.toString())
        window.alert('لینک این ماه کپی شد.')
      } else {
        window.prompt('لینک این ماه:', url.toString())
      }
    } catch (shareError) {
      if (shareError?.name !== 'AbortError') window.prompt('لینک این ماه:', url.toString())
    } finally {
      setSharing(false)
    }
  }

  function renderLeaderboard(items, mode) {
    if (!items.length) {
      return (
        <div className="prop-empty-ranking">
          <span className="prop-empty-icon"><LuCalendarDays aria-hidden="true" /></span>
          <div>
            <strong>رتبه‌بندی این ماه هنوز منتشر نشده است</strong>
            <p>پس از ثبت و انتشار فهرست ماهانه توسط مدیریت چارت مسترز، رتبه‌های ۱ تا ۱۰ در این بخش قرار می‌گیرند.</p>
          </div>
        </div>
      )
    }

    const rankedItems = new Map(items.map((item) => [Number(item.rank_position || 1), item]))
    const chartSlots = Array.from({ length: RANK_LIMIT }, (_, index) => ({
      rank: index + 1,
      item: rankedItems.get(index + 1) || null,
    }))

    if (mode === 'chart') {
      return (
        <div className="prop-ranking-chart" dir="rtl">
          <div className="prop-chart-caption">
            <strong>نمودار جایگاه پراپ‌فرم‌ها</strong>
            <span>ستون بلندتر یعنی رتبه بهتر؛ این نمودار امتیاز عملکرد را نمایش نمی‌دهد.</span>
          </div>
          <div className="prop-chart-plot">
            <div className="prop-chart-gridlines" aria-hidden="true">
              <span>۱</span>
              <span>۵</span>
              <span>۱۰</span>
            </div>
            <div className="prop-chart-columns">
              {chartSlots.map(({ rank, item }) => {
                const barHeight = item ? Math.round(((RANK_LIMIT + 1 - rank) / RANK_LIMIT) * 100) : 5
                return (
                  <article
                    className={'prop-chart-column' + (rank === 1 ? ' is-first' : '') + (!item ? ' is-empty' : '')}
                    key={'chart-' + rank}
                  >
                    <div className="prop-chart-company">
                      {item ? (
                        <FirmLogo src={item.firm_logo_snapshot} name={item.firm_name_snapshot} />
                      ) : (
                        <span className="prop-chart-empty-logo" aria-hidden="true">—</span>
                      )}
                      <strong>{item ? item.firm_name_snapshot : 'ثبت نشده'}</strong>
                    </div>
                    <div className="prop-chart-bar-area">
                      <div className="prop-chart-bar" style={{ height: barHeight + '%' }}>
                        <span>{faNumber(rank)}</span>
                      </div>
                    </div>
                    <div className="prop-chart-column-footer">
                      <span>رتبه {faNumber(rank)}</span>
                      {item?.firm_website_snapshot && (
                        <a href={item.firm_website_snapshot} target="_blank" rel="noreferrer" aria-label={'وب‌سایت ' + item.firm_name_snapshot}>
                          <LuExternalLink aria-hidden="true" />
                        </a>
                      )}
                    </div>
                  </article>
                )
              })}
            </div>
          </div>
        </div>
      )
    }

    return (
      <div className="prop-ranking-list">
        {chartSlots.map(({ rank, item }) => {
          if (!item) {
            return (
              <div className="prop-ranking-row is-empty" key={'empty-' + rank}>
                <span className="prop-ranking-number">{faNumber(rank)}</span>
                <div className="prop-ranking-empty-copy">
                  <strong>رتبه {faNumber(rank)}</strong>
                  <span>هنوز ثبت نشده</span>
                </div>
              </div>
            )
          }

          return (
            <article className={'prop-ranking-row' + (rank === 1 ? ' rank-first' : '')} key={item.id}>
              <div className="prop-ranking-number" aria-label={'رتبه ' + faNumber(rank)}>
                {rank === 1 ? <LuTrophy aria-hidden="true" /> : faNumber(rank)}
              </div>
              <div className="prop-ranking-company">
                <FirmLogo src={item.firm_logo_snapshot} name={item.firm_name_snapshot} />
                <div className="prop-ranking-company-copy">
                  <strong>{item.firm_name_snapshot}</strong>
                  <span>{item.description || item.selection_reason || '—'}</span>
                </div>
              </div>
              {item.overall_score !== null && item.overall_score !== undefined ? (
                <div className="prop-ranking-score">
                  <strong>{faNumber(item.overall_score)}</strong>
                  <span>امتیاز از ۱۰۰</span>
                </div>
              ) : (
                <div className="prop-ranking-score score-empty"><span>امتیاز ثبت نشده</span></div>
              )}
              {item.firm_website_snapshot ? (
                <a className="prop-ranking-website" href={item.firm_website_snapshot} target="_blank" rel="noreferrer">
                  وب‌سایت رسمی <LuExternalLink aria-hidden="true" />
                </a>
              ) : (
                <span className="prop-ranking-website is-disabled">وب‌سایت ثبت نشده</span>
              )}
              {item.selection_reason && (
                <p className="prop-ranking-reason"><LuShieldCheck aria-hidden="true" /> {item.selection_reason}</p>
              )}
            </article>
          )
        })}
      </div>
    )
  }

  return (
    <main className="prop-page" dir="rtl">
      <div className="prop-shell">
        <section className="prop-intro">
          <div className="prop-intro-copy">
            <span className="prop-eyebrow"><i /> رتبه‌بندی ماهانه چارت مسترز</span>
            <h1>۱۰ پراپ‌فرم برتر <span>هر ماه</span></h1>
            <p>رتبه‌بندی ماهانه پراپ‌فرم‌های ایرانی؛ از جایگاه اول تا دهم، همراه با امتیاز و توضیحات هر شرکت.</p>
          </div>
          <div className="prop-intro-mark" aria-hidden="true">
            <span className="prop-mark-ring prop-mark-ring-one" />
            <span className="prop-mark-ring prop-mark-ring-two" />
            <LuTrophy />
          </div>
        </section>

        <section className="prop-leaderboard-section" aria-labelledby="prop-leaderboard-title">
          <div className="prop-leaderboard-heading">
            <div>
              <span className="prop-section-kicker">{isCurrentMonth ? 'رتبه‌بندی ماه جاری' : 'آرشیو رتبه‌بندی'}</span>
              <h2 id="prop-leaderboard-title">{MONTHS[selectedMonth - 1]} {faNumber(selectedYear)}</h2>
              <p>جایگاه ۱ تا ۱۰ پراپ‌فرم‌های منتخب این ماه</p>
            </div>
            <div className="prop-leaderboard-actions">
              <div className="prop-view-switcher" role="group" aria-label="نحوه نمایش رتبه‌بندی">
                <button
                  type="button"
                  className={displayMode === 'list' ? 'active' : ''}
                  onClick={() => setDisplayMode('list')}
                  aria-pressed={displayMode === 'list'}
                >
                  فهرست
                </button>
                <button
                  type="button"
                  className={displayMode === 'chart' ? 'active' : ''}
                  onClick={() => setDisplayMode('chart')}
                  aria-pressed={displayMode === 'chart'}
                >
                  نمودار
                </button>
              </div>
              <span className={isCurrentMonth ? 'prop-live-tag' : 'prop-archive-tag'}>
                {isCurrentMonth ? <><i /> ماه جاری</> : 'آرشیو ماهانه'}
              </span>
              <button type="button" className="prop-share-link" onClick={() => shareLeaderboard(selectedRankings, selectedYear, selectedMonth)} disabled={sharing}>
                <LuShare2 aria-hidden="true" /> اشتراک‌گذاری
              </button>
            </div>
          </div>
          {loading ? (
            <div className="prop-loading"><span className="prop-spinner" /> در حال دریافت رتبه‌بندی...</div>
          ) : error ? (
            <div className="prop-inline-error">{error}</div>
          ) : renderLeaderboard(selectedRankings, displayMode)}
        </section>

        <section className="prop-history-section" aria-labelledby="prop-history-title">
          <div className="prop-history-heading">
            <div>
              <span className="prop-section-kicker">آرشیو ماه‌ها</span>
              <h2 id="prop-history-title">رتبه‌بندی ماه‌های گذشته</h2>
              <p>ماه موردنظر را انتخاب کن تا جدول ۱۰ جایگاه آن را ببینی.</p>
            </div>
            <div className="prop-year-switcher" aria-label="انتخاب سال">
              <button type="button" onClick={() => moveYear(-1)} disabled={!canGoPrevious} aria-label="سال قبل"><LuArrowRight /></button>
              <strong>{faNumber(selectedYear)}</strong>
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
                const monthRankings = rankingsByMonth.get(selectedYear + '-' + month) || []
                const isSelected = selectedMonth === month
                const isCurrent = selectedYear === currentDate.year && month === currentDate.month
                return (
                  <button
                    type="button"
                    key={monthName}
                    className={'prop-month-card' + (isSelected ? ' selected' : '') + (monthRankings.length ? ' has-award' : '') + (isCurrent ? ' current' : '')}
                    onClick={() => updateSelection(selectedYear, month)}
                    aria-pressed={isSelected}
                  >
                    <span className="prop-month-top">
                      <span>{monthName}</span>
                      {monthRankings.length ? <LuTrophy aria-label="رتبه‌بندی منتشرشده" /> : <span className="prop-month-empty-dot" />}
                    </span>
                    <span className="prop-month-logo">{monthRankings.length ? faNumber(monthRankings.length) + ' / ۱۰' : <LuCalendarDays aria-hidden="true" />}</span>
                    <strong>{monthRankings.length ? 'فهرست منتشرشده' : 'بدون رتبه‌بندی'}</strong>
                    <small>{monthRankings.length ? faNumber(monthRankings.length) + ' رتبه ثبت شده' : 'هنوز منتشر نشده'}</small>
                  </button>
                )
              })}
            </div>
          )}
          <div className="prop-history-legend">
            <span><i className="awarded" /> دارای رتبه‌بندی منتشرشده</span>
            <span><i className="pending" /> بدون رتبه‌بندی</span>
            <span><i className="selected" /> ماه انتخاب‌شده</span>
          </div>
        </section>

        <aside className="prop-editorial-note">
          <LuShieldCheck aria-hidden="true" />
          <p>این رتبه‌بندی، ارزیابی تحریریه چارت مسترز است. جایگاه‌ها و امتیازها بر اساس اطلاعاتی نمایش داده می‌شوند که مدیریت ثبت و منتشر کرده است؛ رتبه‌بندی به‌تنهایی تضمین‌کننده عملکرد یا اعتبار یک شرکت نیست.</p>
        </aside>
      </div>
    </main>
  )
}

export default PropFirms
