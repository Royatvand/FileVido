import { useCallback, useEffect, useMemo, useState } from 'react'
import { LuLifeBuoy, LuPlus, LuSend, LuMessageCircle, LuExternalLink } from 'react-icons/lu'
import { userAuth, userSupport } from '../lib/supabase'
import UserDashboardSidebar from '../components/UserDashboardSidebar'

const CATEGORIES = [
  { value: 'general', label: 'سؤال عمومی' },
  { value: 'chart', label: 'نمودار و نمادها' },
  { value: 'technical', label: 'مشکل فنی سایت' },
  { value: 'account', label: 'حساب کاربری' },
  { value: 'content', label: 'ویدیو و محتوای آموزشی' },
]

const STATUS_LABELS = {
  open: 'در انتظار پاسخ',
  answered: 'پاسخ داده‌شده',
  closed: 'بسته‌شده',
}

function formatDate(value) {
  if (!value) return '—'
  return new Intl.DateTimeFormat('fa-IR', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value))
}

function UserSupportTickets() {
  const [user, setUser] = useState(null)
  const [tickets, setTickets] = useState([])
  const [selectedId, setSelectedId] = useState('')
  const [messages, setMessages] = useState([])
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [showNewTicket, setShowNewTicket] = useState(false)
  const [subject, setSubject] = useState('')
  const [category, setCategory] = useState('general')
  const [initialMessage, setInitialMessage] = useState('')
  const [reply, setReply] = useState('')
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  const selectedTicket = useMemo(
    () => tickets.find((ticket) => ticket.id === selectedId) || null,
    [tickets, selectedId],
  )

  const loadTickets = useCallback(async (preferredId = '') => {
    const rows = await userSupport.listTickets()
    setTickets(rows || [])
    const nextId = (rows || []).some((ticket) => ticket.id === preferredId)
      ? preferredId
      : (rows || []).some((ticket) => ticket.id === selectedId)
        ? selectedId
        : rows?.[0]?.id || ''
    setSelectedId(nextId)
    return rows || []
  }, [selectedId])

  useEffect(() => {
    let active = true
    async function load() {
      try {
        const session = await userAuth.getValidSession()
        if (!session?.user) {
          window.location.replace('/login?next=' + encodeURIComponent('/dashboard/support'))
          return
        }
        const currentUser = await userAuth.fetchCurrentUser().catch(() => session.user)
        if (!active) return
        setUser(currentUser || session.user)
        await loadTickets()
      } catch (err) {
        if (active) setError(err.message || 'دریافت تیکت‌ها انجام نشد.')
      } finally {
        if (active) setLoading(false)
      }
    }
    load()
    return () => { active = false }
  }, [loadTickets])

  useEffect(() => {
    const refreshTimer = window.setInterval(async () => {
      try {
        const rows = await userSupport.listTickets()
        setTickets(rows || [])
        if (selectedId) setMessages(await userSupport.listMessages(selectedId))
      } catch { /* refresh is best-effort; the next poll or user action can retry */ }
    }, 20000)
    return () => window.clearInterval(refreshTimer)
  }, [selectedId])

  useEffect(() => {
    let active = true
    async function loadMessages() {
      if (!selectedId) {
        setMessages([])
        return
      }
      try {
        const rows = await userSupport.listMessages(selectedId)
        if (active) setMessages(rows || [])
      } catch (err) {
        if (active) setError(err.message || 'دریافت پیام‌های تیکت انجام نشد.')
      }
    }
    loadMessages()
    return () => { active = false }
  }, [selectedId])

  async function createTicket(event) {
    event.preventDefault()
    if (subject.trim().length < 3 || initialMessage.trim().length < 5) {
      setError('عنوان حداقل ۳ و توضیحات حداقل ۵ نویسه باشد.')
      return
    }
    setSending(true)
    setError('')
    setNotice('')
    try {
      const ticket = await userSupport.createTicket({
        subject: subject.trim(),
        category,
        message: initialMessage.trim(),
      })
      setSubject('')
      setInitialMessage('')
      setCategory('general')
      setShowNewTicket(false)
      await loadTickets(ticket.id)
      setNotice('تیکت با موفقیت ثبت شد. پاسخ پشتیبانی در همین صفحه نمایش داده می‌شود.')
    } catch (err) {
      setError(err.message || 'ثبت تیکت انجام نشد.')
    } finally {
      setSending(false)
    }
  }

  async function sendReply(event) {
    event.preventDefault()
    if (!reply.trim() || !selectedTicket || selectedTicket.status === 'closed') return
    setSending(true)
    setError('')
    setNotice('')
    try {
      await userSupport.reply(selectedTicket.id, reply.trim())
      setReply('')
      await Promise.all([loadTickets(selectedTicket.id), userSupport.listMessages(selectedTicket.id).then(setMessages)])
      setNotice('پیام شما ارسال شد.')
    } catch (err) {
      setError(err.message || 'ارسال پیام انجام نشد.')
    } finally {
      setSending(false)
    }
  }

  async function signOut() {
    await userAuth.signOut()
    window.location.replace('/')
  }

  const displayName = user?.user_metadata?.full_name || user?.user_metadata?.name || user?.email?.split('@')[0] || 'کاربر'

  if (loading) return <div className="user-dashboard-loading" role="status"><span className="user-dashboard-spinner" aria-hidden="true" /></div>
  if (!user) return <div className="user-dashboard-loading" role="alert">{error || 'در حال انتقال به صفحه ورود...'}</div>

  return (
    <section className="user-dashboard support-dashboard" dir="rtl">
      <div className="user-dashboard-layout">
        <UserDashboardSidebar active="support" onSignOut={signOut} />
        <div className="user-dashboard-main">
          <header className="user-dashboard-topbar">
            <div><h1>تیکت‌های پشتیبانی</h1></div>
            <div className="user-dashboard-top-user">
              <div className="user-dashboard-avatar user-dashboard-avatar-fallback">{displayName.slice(0, 1)}</div>
              <div><strong>{displayName}</strong><span>{user.email}</span></div>
            </div>
          </header>

          <section className="user-dashboard-section-intro">
            <h2>ارتباط مستقیم با تیم پشتیبانی</h2>
            <p>سؤال یا مشکلت را ثبت کن؛ پاسخ‌ها و لینک جلسه آنلاین در همین گفت‌وگو قرار می‌گیرد.</p>
          </section>

          {error && <div className="user-dashboard-error" role="alert">{error}</div>}
          {notice && <div className="user-dashboard-notice" role="status">{notice}</div>}

          <div className="support-layout">
            <aside className="support-ticket-list-panel">
              <div className="support-panel-heading">
                <div><strong>درخواست‌های من</strong><small>{tickets.length.toLocaleString('fa-IR')} تیکت</small></div>
                <button className="support-new-button" type="button" onClick={() => setShowNewTicket((value) => !value)}><LuPlus /> تیکت جدید</button>
              </div>

              {showNewTicket && (
                <form className="support-new-form" onSubmit={createTicket}>
                  <label>عنوان درخواست<input value={subject} onChange={(event) => setSubject(event.target.value)} maxLength={140} required placeholder="مثلاً مشکل انتخاب نماد در نمودار" /></label>
                  <label>موضوع<select value={category} onChange={(event) => setCategory(event.target.value)}>{CATEGORIES.map((item) => <option value={item.value} key={item.value}>{item.label}</option>)}</select></label>
                  <label>توضیحات<textarea value={initialMessage} onChange={(event) => setInitialMessage(event.target.value)} rows={5} maxLength={5000} required placeholder="مشکل یا سؤال را کامل توضیح بده..." /></label>
                  <button type="submit" disabled={sending}>{sending ? 'در حال ثبت...' : 'ثبت تیکت'}</button>
                </form>
              )}

              {tickets.length === 0 ? (
                <div className="support-empty-list"><LuLifeBuoy /><strong>هنوز تیکتی ثبت نکرده‌ای</strong><span>برای شروع، روی «تیکت جدید» بزن.</span></div>
              ) : (
                <div className="support-ticket-items">
                  {tickets.map((ticket) => (
                    <button type="button" key={ticket.id} onClick={() => setSelectedId(ticket.id)} className={'support-ticket-item ' + (ticket.id === selectedId ? 'active' : '')}>
                      <span className="support-ticket-item-top"><strong>{ticket.subject}</strong><i className={'support-status ' + ticket.status}>{STATUS_LABELS[ticket.status] || ticket.status}</i></span>
                      <small>{formatDate(ticket.updated_at || ticket.created_at)}</small>
                    </button>
                  ))}
                </div>
              )}
            </aside>

            <section className="support-conversation-panel">
              {selectedTicket ? (
                <>
                  <header className="support-conversation-heading">
                    <div><span className="support-kicker">تیکت پشتیبانی</span><h3>{selectedTicket.subject}</h3><small>ثبت‌شده در {formatDate(selectedTicket.created_at)}</small></div>
                    <i className={'support-status ' + selectedTicket.status}>{STATUS_LABELS[selectedTicket.status] || selectedTicket.status}</i>
                  </header>

                  {selectedTicket.meeting_url && (
                    <a className="support-meeting-link" href={selectedTicket.meeting_url} target="_blank" rel="noopener noreferrer">
                      <LuExternalLink /><span><strong>لینک جلسه آنلاین شما</strong><small>برای ورود به تماس روی این لینک بزن.</small></span><b>ورود به جلسه ←</b>
                    </a>
                  )}

                  <div className="support-messages" aria-live="polite">
                    {messages.map((message) => (
                      <article className={'support-message ' + message.sender_role} key={message.id}>
                        <div className="support-message-meta"><strong>{message.sender_role === 'admin' ? 'پشتیبانی چارت مسترز' : 'شما'}</strong><time>{formatDate(message.created_at)}</time></div>
                        <p>{message.message}</p>
                      </article>
                    ))}
                    {messages.length === 0 && <div className="support-empty-list"><LuMessageCircle /><span>پیامی در این تیکت وجود ندارد.</span></div>}
                  </div>

                  {selectedTicket.status === 'closed' ? (
                    <div className="support-closed-note">این تیکت بسته شده است. برای درخواست جدید، تیکت تازه ثبت کن.</div>
                  ) : (
                    <form className="support-reply-form" onSubmit={sendReply}>
                      <textarea value={reply} onChange={(event) => setReply(event.target.value)} rows={3} maxLength={5000} required placeholder="پیام خودت را بنویس..." />
                      <button type="submit" disabled={sending || !reply.trim()}><LuSend /> {sending ? 'در حال ارسال...' : 'ارسال پیام'}</button>
                    </form>
                  )}
                </>
              ) : (
                <div className="support-conversation-empty"><LuLifeBuoy /><strong>یک تیکت را انتخاب کن</strong><span>یا با ثبت تیکت جدید گفت‌وگو را شروع کن.</span></div>
              )}
            </section>
          </div>
        </div>
      </div>
    </section>
  )
}

export default UserSupportTickets
