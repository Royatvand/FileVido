import { useState } from 'react'

const MCP_URL = 'https://chartmasters.top/api/mcp'

const CLIENTS = [
  {
    id: 'claude',
    name: 'Claude',
    steps: [
      'در Claude به بخش Customize ← Connectors برو و «Add custom connector» را بزن.',
      'آدرس بالا را وارد کن و ادامه بده.',
      'در بخش OAuth client گزینه «Register automatically» را انتخاب کن.',
      'با حساب چارت مسترز وارد شو و در صفحه تأیید، «تأیید و اتصال» را بزن.',
    ],
  },
  {
    id: 'gemini',
    name: 'Gemini',
    steps: [
      'صفحه Gemini Developer Mode را باز کن (gemini.google.com/devmode) و یک MCP app جدید بساز.',
      'آدرس بالا را وارد کن.',
      'در تب Authentication گزینه «Dynamic Client Registration» را انتخاب کن و ذخیره کن.',
      'با حساب چارت مسترز وارد شو و دسترسی را تأیید کن.',
    ],
  },
  {
    id: 'grok',
    name: 'Grok',
    steps: [
      'به grok.com/connectors برو و «New Connector ← Custom» را بزن.',
      'آدرس بالا را وارد کن.',
      'ورود با OAuth را انتخاب کن و با حساب چارت مسترز وارد شو.',
      'دسترسی را در صفحه تأیید قبول کن.',
    ],
  },
]

const TOOLS = [
  ['جستجوی ویدیوها', 'ویدیوهای منتشرشده را بر اساس موضوع پیدا می‌کند.'],
  ['دوره‌ها', 'فهرست دوره‌ها و جلسه‌های هر دوره.'],
  ['اندیکاتورها', 'اندیکاتورهای تریدینگ‌ویو و متاتریدر.'],
  ['پیشرفت من', 'چند ویدیو شروع یا کامل کرده‌ای.'],
  ['فعالیت من', 'نمای ۳۶۵ روزه فعالیت آموزشی تو.'],
  ['علاقه‌مندی‌های من', 'ویدیوهایی که ذخیره کرده‌ای.'],
]

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
        <h1>چارت مسترز را به دستیار هوش مصنوعی‌ات وصل کن</h1>
        <p>
          بعد از اتصال می‌توانی از Claude، Gemini یا Grok بپرسی «دوره‌های پرایس اکشن چیست؟» یا «این هفته چقدر درس دیدم؟»
          و جواب را از اطلاعات واقعی خودت بگیری.
        </p>
      </section>

      <section className="connect-url" aria-label="آدرس اتصال">
        <span>آدرس اتصال</span>
        <div className="connect-url-row">
          <code dir="ltr">{MCP_URL}</code>
          <button type="button" className="primary-button" onClick={copyUrl}>
            {copied ? 'کپی شد' : 'کپی آدرس'}
          </button>
        </div>
      </section>

      <section className="connect-steps">
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
        <ol className="connect-step-list" role="tabpanel">
          {client.steps.map((step) => <li key={step}>{step}</li>)}
        </ol>
      </section>

      <section className="connect-tools">
        <h2>چه چیزهایی در دسترس است؟</h2>
        <ul>
          {TOOLS.map(([title, text]) => (
            <li key={title}><strong>{title}</strong><span>{text}</span></li>
          ))}
        </ul>
        <p className="connect-note">
          اتصال فقط‌خواندنی است: دستیار نمی‌تواند چیزی در حساب تو تغییر دهد. اطلاعات شخصی فقط با تأیید خودت و فقط برای حساب خودت خوانده می‌شود،
          و هر زمان بخواهی می‌توانی اتصال را از تنظیمات همان دستیار قطع کنی.
        </p>
      </section>
    </main>
  )
}
