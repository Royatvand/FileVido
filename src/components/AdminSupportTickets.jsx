import { useCallback, useEffect, useMemo, useState } from 'react'
import { LuLifeBuoy, LuSend, LuExternalLink, LuRefreshCw } from 'react-icons/lu'
import { supabase } from '../lib/supabase'

const STATUS_LABELS = { open: 'در انتظار پاسخ', answered: 'پاسخ داده‌شده', closed: 'بسته‌شده' }

function formatDate(value) {
  if (!value) return '—'
  return new Intl.DateTimeFormat('fa-IR', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value))
}

function safeMeetingUrl(value) {
  if (!value.trim()) return ''
  try {
    const url = new URL(value.trim())
    return ['http:', 'https:'].includes(url.protocol) ? url.toString() : ''
  } catch {
    return ''
  }
}

const CATEGORY_LABELS = {
  general: 'سؤال عمومی',
  chart: 'نمودار و نمادها',
  technical: 'مشکل فنی سایت',
  account: 'حساب کاربری',
  content: 'ویدیو و محتوای آموزشی',
}

function AdminSupportTickets({ onNotice = () => {} }) {
  const [tickets, setTickets] = useState([])
  const [selectedId, setSelectedId] = useState('')
  const [messages, setMessages] = useState([])
  const [reply, setReply] = useState('')
  const [meetingUrl, setMeetingUrl] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const selectedTicket = useMemo(() => tickets.find((item) => item.id === selectedId) || null, [tickets, selectedId])

  const loadTickets = useCallback(async (preferredId = '') => {
    const rows = await supabase.select(
      'support_tickets',
      '&order=updated_at.desc',
      'id,user_id,user_name,user_email,subject,category,status,meeting_url,created_at,updated_at',
    )
    setTickets(rows || [])
    const id = (rows || []).some((item) => item.id === preferredId)
      ? preferredId
      : (rows || []).some((item) => item.id === selectedId)
        ? selectedId
        : rows?.[0]?.id || ''
    setSelectedId(id)
    return rows || []
  }, [selectedId])

  const loadMessages = useCallback(async (ticketId) => {
    if (!ticketId) { setMessages([]); return }
    const rows = await supabase.select(
      'support_ticket_messages',
      '&ticket_id=eq.' + encodeURIComponent(ticketId) + '&order=created_at.asc',
      'id,ticket_id,sender_id,sender_role,message,created_at',
    )
    setMessages(rows || [])
  }, [])

  useEffect(() => {
    let active = true
    async function load() {
      try { await loadTickets() }
      catch (err) { if (active) setError(err.message || 'دریافت تیکت‌ها انجام نشد.') }
      finally { if (active) setLoading(false) }
    }
    load()
    return () => { active = false }
  }, [loadTickets])

  useEffect(() => {
    const refreshTimer = window.setInterval(async () => {
      try {
        const rows = await loadTickets(selectedId)
        if (selectedId && rows.some((item) => item.id === selectedId)) await loadMessages(selectedId)
      } catch { /* refresh is best-effort; use the manual refresh action to retry immediately */ }
    }, 20000)
    return () => window.clearInterval(refreshTimer)
  }, [loadTickets, loadMessages, selectedId])

  useEffect(() => {
    let active = true
    Promise.resolve().then(async () => {
      if (!selectedId) { setMessages([]); return }
      setError('')
      try { await loadMessages(selectedId) }
      catch (err) { if (active) setError(err.message || 'دریافت پیام‌ها انجام نشد.') }
    })
    return () => { active = false }
  }, [selectedId, loadMessages])

  // Sync the meeting-link input only when the ticket changes or the saved value changes,
  // so the 20s refresh never overwrites what the admin is typing.
  const savedMeetingUrl = selectedTicket?.meeting_url || ''
  useEffect(() => {
    Promise.resolve().then(() => setMeetingUrl(savedMeetingUrl))
  }, [selectedId, savedMeetingUrl])

  async function saveMeetingLink() {
    if (!selectedTicket) return
    const value = meetingUrl.trim()
    if (value && !safeMeetingUrl(value)) {
      setError('لینک جلسه باید یک آدرس معتبر با http یا https باشد.')
      return
    }
    setSaving(true)
    setError('')
    try {
      await supabase.update('support_tickets', selectedTicket.id, { meeting_url: value })
      await loadTickets(selectedTicket.id)
      onNotice({ type: 'success', text: value ? 'لینک جلسه برای کاربر ثبت شد.' : 'لینک جلسه حذف شد.' })
    } catch (err) {
      setError(err.message || 'ذخیره لینک انجام نشد.')
    } finally { setSaving(false) }
  }

  async function sendReply(event) {
    event.preventDefault()
    if (!selectedTicket || !reply.trim()) return
    setSaving(true)
    setError('')
    try {
      const session = await supabase.getValidSession()
      if (!session?.access_token || !session?.user?.id) throw new Error('نشست مدیر معتبر نیست؛ دوباره وارد پنل شو.')
      await supabase.insert('support_ticket_messages', {
        ticket_id: selectedTicket.id,
        sender_id: session.user.id,
        sender_role: 'admin',
        message: reply.trim(),
      })
      setReply('')
      await Promise.all([loadTickets(selectedTicket.id), loadMessages(selectedTicket.id)])
      onNotice({ type: 'success', text: 'پاسخ برای کاربر ارسال شد.' })
    } catch (err) {
      setError(err.message || 'ارسال پاسخ انجام نشد.')
    } finally { setSaving(false) }
  }

  async function closeTicket() {
    if (!selectedTicket) return
    setSaving(true)
    setError('')
    try {
      await supabase.update('support_tickets', selectedTicket.id, { status: 'closed' })
      await loadTickets(selectedTicket.id)
      onNotice({ type: 'success', text: 'تیکت بسته شد.' })
    } catch (err) {
      setError(err.message || 'بستن تیکت انجام نشد.')
    } finally { setSaving(false) }
  }

  const openCount = tickets.filter((item) => item.status === 'open').length
  const answeredCount = tickets.filter((item) => item.status === 'answered').length

  return (
    <section className="admin-support">
      <div className="admin-support-stats">
        <article><span>کل تیکت‌ها</span><strong>{tickets.length.toLocaleString('fa-IR')}</strong></article>
        <article><span>نیازمند پاسخ</span><strong>{openCount.toLocaleString('fa-IR')}</strong></article>
        <article><span>پاسخ داده‌شده</span><strong>{answeredCount.toLocaleString('fa-IR')}</strong></article>
      </div>
      {error && <div className="admin-alert error" role="alert">{error}</div>}
      <div className="admin-support-layout">
        <aside className="admin-panel admin-support-list">
          <div className="admin-panel-heading">
            <div><h2>صندوق پشتیبانی</h2><p>درخواست‌های ثبت‌شده کاربران</p></div>
            <button className="admin-secondary-button" type="button" onClick={() => loadTickets(selectedId)} aria-label="بارگذاری دوباره"><LuRefreshCw /></button>
          </div>
          {loading ? <div className="admin-empty">در حال دریافت تیکت‌ها...</div> : tickets.length === 0 ? (
            <div className="admin-empty"><LuLifeBuoy /> هنوز تیکتی ثبت نشده است.</div>
          ) : (
            <div className="admin-support-ticket-list">
              {tickets.map((ticket) => (
                <button type="button" key={ticket.id} onClick={() => setSelectedId(ticket.id)} className={'admin-support-ticket ' + (ticket.id === selectedId ? 'active' : '')}>
                  <span><strong>{ticket.subject}</strong><i className={'support-status ' + ticket.status}>{STATUS_LABELS[ticket.status] || ticket.status}</i></span>
                  <small>{ticket.user_name || ticket.user_email || 'کاربر'} · {formatDate(ticket.updated_at)}</small>
                </button>
              ))}
            </div>
          )}
        </aside>

        <section className="admin-panel admin-support-detail">
          {selectedTicket ? (
            <>
              <header className="admin-panel-heading">
                <div><h2>{selectedTicket.subject}</h2><p>{selectedTicket.user_name || 'کاربر'} · {selectedTicket.user_email} · {formatDate(selectedTicket.created_at)}</p></div>
                <i className={'support-status ' + selectedTicket.status}>{STATUS_LABELS[selectedTicket.status] || selectedTicket.status}</i>
              </header>
              <div className="admin-support-category">موضوع: {CATEGORY_LABELS[selectedTicket.category] || selectedTicket.category}</div>
              <div className="admin-support-messages">
                {messages.map((message) => (
                  <article className={'support-message ' + message.sender_role} key={message.id}>
                    <div className="support-message-meta"><strong>{message.sender_role === 'admin' ? 'پشتیبانی' : (selectedTicket.user_name || 'کاربر')}</strong><time>{formatDate(message.created_at)}</time></div>
                    <p>{message.message}</p>
                  </article>
                ))}
                {!messages.length && <div className="admin-empty">هنوز پیامی وجود ندارد.</div>}
              </div>

              <div className="admin-support-meeting">
                <label>لینک جلسه آنلاین / WorkCall
                  <input type="url" dir="ltr" value={meetingUrl} onChange={(event) => setMeetingUrl(event.target.value)} placeholder="https://..." />
                </label>
                <div className="admin-support-meeting-actions">
                  <button type="button" className="admin-secondary-button" onClick={saveMeetingLink} disabled={saving}>ذخیره لینک جلسه</button>
                  {selectedTicket.meeting_url && <a href={selectedTicket.meeting_url} target="_blank" rel="noopener noreferrer"><LuExternalLink /> باز کردن لینک فعلی</a>}
                </div>
                <small>لینک اتاق تماس را از سرویس تماس مورد استفاده‌ات بساز و اینجا قرار بده؛ لینک بلافاصله در حساب کاربر نمایش داده می‌شود.</small>
              </div>

              <form className="admin-support-reply" onSubmit={sendReply}>
                <label htmlFor="admin-ticket-reply">پاسخ به کاربر</label>
                <textarea id="admin-ticket-reply" rows={4} maxLength={5000} value={reply} onChange={(event) => setReply(event.target.value)} placeholder="پاسخ را بنویس..." required />
                <div>
                  {selectedTicket.status !== 'closed' && <button type="button" className="admin-secondary-button" onClick={closeTicket} disabled={saving}>بستن تیکت</button>}
                  <button type="submit" className="admin-primary-button" disabled={saving || !reply.trim()}><LuSend /> {saving ? 'در حال ارسال...' : 'ارسال پاسخ'}</button>
                </div>
              </form>
            </>
          ) : (
            <div className="admin-empty admin-support-no-selection"><LuLifeBuoy /><strong>یک تیکت را انتخاب کن</strong><span>جزئیات و گفت‌وگوی کاربر اینجا نمایش داده می‌شود.</span></div>
          )}
        </section>
      </div>
    </section>
  )
}

export default AdminSupportTickets
