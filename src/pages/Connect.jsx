import { useState } from 'react'
import { LuSearch, LuGraduationCap, LuTrendingUp, LuActivity, LuHeart, LuChartNoAxesColumn, LuShieldCheck, LuCopy, LuCheck } from 'react-icons/lu'

const MCP_URL = 'https://chartmasters.top/api/mcp'

const CLIENTS = [
  {
    id: 'claude',
    name: 'Claude',
    steps: [
      ['افزودن کانکتور', 'در Claude به Customize ← Connectors برو و «Add custom connector» را بزن.'],
      ['وارد کردن آدرس', 'آدرس بالا را بچسبان و ادامه بده. در بخش OAuth client گزینه «Register automatically» را انتخاب کن.'],
      ['ورود به حساب', 'با حساب چارت مسترز وارد شو.'],
      ['تأیید دسترسی', 'در صفحه تأیید، «تأیید و اتصال» را بزن. تمام.'],
    ],
  },
  {
    id: 'gemini',
    name: 'Gemini',
    steps: [
      ['ساخت MCP app', 'gemini.google.com/devmode را باز کن و یک custom MCP app جدید بساز.'],
      ['وارد کردن آدرس', 'آدرس بالا را در فیلد سرور بچسبان.'],
      ['تنظیم احراز هویت', 'در تب Authentication گزینه «Dynamic Client Registration» را بزن و ذخیره کن.'],
      ['تأیید دسترسی', 'با حساب چارت مسترز وارد شو و دسترسی را تأیید کن.'],
    ],
  },
  {
    id: 'grok',
    name: 'Grok',
    steps: [
      ['افزودن کانکتور', 'به grok.com/connectors برو و «New Connector ← Custom» را بزن.'],
      ['وارد کردن آدرس', 'آدرس بالا را بچسبان.'],
      ['ورود با OAuth', 'روش ورود OAuth را انتخاب کن و با حساب چارت مسترز وارد شو.'],
      ['تأیید دسترسی', 'دسترسی را در صفحه تأیید قبول کن.'],
    ],
  },
]

const TOOLS = [
  [LuSearch, 'جستجوی ویدیو', 'ویدیوهای منتشرشده را بر اساس موضوع پیدا می‌کند.'],
  [LuGraduationCap, 'دوره‌ها', 'فهرست دوره‌ها و جلسه‌های هر دوره.'],
  [LuTrendingUp, 'اندیکاتورها', 'اندیکاتورهای تریدینگ‌ویو و متاتریدر.'],
  [LuChartNoAxesColumn, 'پیشرفت من', 'چند ویدیو شروع یا کامل کرده‌ای.'],
  [LuActivity, 'فعالیت من', 'نمای ۳۶۵ روزه فعالیت آموزشی تو.'],
  [LuHeart, 'علاقه‌مندی‌ها', 'ویدیوهایی که ذخیره کرده‌ای.'],
]

// الگوی ثابت برای نمونه هیت‌مپ (فقط نمایشی)
const HEAT = Array.from({ length: 7 * 18 }, (_, i) => {
  const h = Math.imul(i + 7, 2654435761) >>> 0
  const r = (h >>> 8) % 100
  const week = Math.floor(i / 7)
  const boost = week > 9 ? 12 : 0
  return r + boost > 92 ? 3 : r + boost > 76 ? 2 : r + boost > 55 ? 1 : 0
})

export default function Connect() {
  const [active, setActive] = useState('claude')
  const [copied, setCopied] = useState(false)
  const client = CLIENTS.find((item) => item.id === active)

  async function copyUrl() {
    try {
      await navigator.clipboard.writeText(MCP_URL)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      setCopied(false)
    }
  }

  return (
    <main className="page-content connect-page">
      <section className="connect-hero">
        <div className="connect-hero-copy">
          <h1>دستیار هوش مصنوعی‌ات،<br />حالا چارت مسترز را می‌شناسد</h1>
          <p>
            Claude، Gemini یا Grok را یک بار وصل کن. از آن به بعد می‌توانی درباره دوره‌ها و ویدیوها سؤال کنی
            و پیشرفت یادگیری خودت را بپرسی.
          </p>
          <div className="connect-url">
            <code dir="ltr">{MCP_URL}</code>
            <button type="button" className="primary-button" onClick={copyUrl}>
              {copied ? <LuCheck aria-hidden="true" /> : <LuCopy aria-hidden="true" />}
              {copied ? 'کپی شد' : 'کپی آدرس'}
            </button>
          </div>
        </div>

        <figure className="connect-chat" aria-label="نمونه گفتگو با دستیار">
          <div className="connect-msg connect-msg--user">این ماه چقدر درس دیدم؟</div>
          <div className="connect-msg connect-msg--bot">
            <p>در ۱۲۶ روز اخیر ۴۱ روز فعال بودی. نمودار فعالیتت:</p>
            <div className="connect-heat" aria-hidden="true">
              {HEAT.map((level, i) => <i key={i} data-level={level} />)}
            </div>
          </div>
          <figcaption>نمونه گفتگو</figcaption>
        </figure>
      </section>

      <section className="connect-setup" aria-labelledby="connect-setup-title">
        <div className="connect-setup-head">
          <h2 id="connect-setup-title">اتصال در چهار قدم</h2>
          <div className="connect-tabs" role="tablist" aria-label="انتخاب دستیار">
            {CLIENTS.map((item) => (
              <button
                key={item.id}
                type="button"
                role="tab"
                aria-selected={active === item.id}
                className={active === item.id ? 'is-active' : ''}
                onClick={() => setActive(item.id)}
              >
                {item.name}
              </button>
            ))}
          </div>
        </div>
        <ol className="connect-timeline" role="tabpanel">
          {client.steps.map(([title, text], index) => (
            <li key={title}>
              <span className="connect-step-num">{index + 1}</span>
              <strong>{title}</strong>
              <p>{text}</p>
            </li>
          ))}
        </ol>
      </section>

      <section className="connect-tools" aria-labelledby="connect-tools-title">
        <h2 id="connect-tools-title">دستیار چه چیزهایی را می‌تواند ببیند؟</h2>
        <ul>
          {TOOLS.map(([Icon, title, text]) => (
            <li key={title}>
              <span className="connect-tool-icon"><Icon aria-hidden="true" /></span>
              <div><strong>{title}</strong><span>{text}</span></div>
            </li>
          ))}
        </ul>
        <p className="connect-note">
          <LuShieldCheck aria-hidden="true" />
          <span>اتصال فقط‌خواندنی است و دستیار چیزی را تغییر نمی‌دهد. اطلاعات شخصی فقط برای حساب خودت و با تأیید خودت خوانده می‌شود. هر زمان بخواهی، اتصال را از تنظیمات همان دستیار قطع کن.</span>
        </p>
      </section>
    </main>
  )
}
