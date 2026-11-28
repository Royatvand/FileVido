import { useEffect, useMemo, useState } from 'react'
import { LuBuilding2, LuImagePlus, LuPlus, LuSave, LuTrophy, LuUpload, LuX } from 'react-icons/lu'
import { supabase } from '../lib/supabase'

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

const EMPTY_FIRM = { name: '', website_url: '', description: '', logo_url: '', is_active: true }
const EMPTY_AWARD = {
  prop_firm_id: '',
  jalali_year: '',
  jalali_month: '',
  description: '',
  selection_reason: '',
  overall_score: '',
  criteria_scores: {},
  status: 'draft',
}

function getJalaliDate() {
  const parts = new Intl.DateTimeFormat('en-US-u-ca-persian-nu-latn', {
    timeZone: 'Asia/Tehran',
    year: 'numeric',
    month: 'numeric',
  }).formatToParts(new Date())
  const value = (type) => Number(parts.find((part) => part.type === type)?.value || 0)
  return { year: value('year'), month: value('month') }
}

function faNumber(value) {
  return new Intl.NumberFormat('fa-IR').format(value)
}

function AdminPropFirms({ onNotice }) {
  const currentDate = useMemo(getJalaliDate, [])
  const [tab, setTab] = useState('firms')
  const [firms, setFirms] = useState([])
  const [awards, setAwards] = useState([])
  const [loading, setLoading] = useState(true)
  const [reloadKey, setReloadKey] = useState(0)
  const [firmFormOpen, setFirmFormOpen] = useState(false)
  const [awardFormOpen, setAwardFormOpen] = useState(false)
  const [editingFirmId, setEditingFirmId] = useState(null)
  const [editingAwardId, setEditingAwardId] = useState(null)
  const [firmForm, setFirmForm] = useState(EMPTY_FIRM)
  const [awardForm, setAwardForm] = useState({
    ...EMPTY_AWARD,
    jalali_year: String(currentDate.year),
    jalali_month: String(currentDate.month),
  })
  const [selectedLogo, setSelectedLogo] = useState(null)
  const [logoPreview, setLogoPreview] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    let active = true
    async function load() {
      setLoading(true)
      try {
        const [firmRows, awardRows] = await Promise.all([
          supabase.select('prop_firms', '&order=created_at.desc'),
          supabase.select('monthly_prop_awards', '&order=jalali_year.desc,jalali_month.desc'),
        ])
        if (!active) return
        setFirms(firmRows || [])
        setAwards(awardRows || [])
      } catch (error) {
        if (active) onNotice({ type: 'error', text: 'بارگذاری اطلاعات پراپ فرم‌ها انجام نشد: ' + error.message })
      } finally {
        if (active) setLoading(false)
      }
    }
    load()
    return () => { active = false }
  }, [reloadKey, onNotice])

  useEffect(() => {
    return () => {
      if (logoPreview.startsWith('blob:')) URL.revokeObjectURL(logoPreview)
    }
  }, [logoPreview])

  const activeFirms = useMemo(() => firms.filter((firm) => firm.is_active), [firms])
  const selectedFirm = firms.find((firm) => firm.id === awardForm.prop_firm_id) || null

  function reload() {
    setReloadKey((value) => value + 1)
  }

  function handleLogoChange(event) {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      onNotice({ type: 'error', text: 'فقط تصویر JPG، PNG یا WEBP قابل آپلود است.' })
      return
    }
    if (file.size > 5 * 1024 * 1024) {
      onNotice({ type: 'error', text: 'حجم لوگو باید حداکثر ۵ مگابایت باشد.' })
      return
    }
    setSelectedLogo(file)
    setLogoPreview(URL.createObjectURL(file))
    onNotice({ type: '', text: '' })
  }

  function resetFirmForm() {
    setFirmForm(EMPTY_FIRM)
    setSelectedLogo(null)
    setLogoPreview('')
    setEditingFirmId(null)
    setFirmFormOpen(false)
  }

  function startEditFirm(firm) {
    setTab('firms')
    setEditingFirmId(firm.id)
    setFirmForm({
      name: firm.name || '',
      website_url: firm.website_url || '',
      description: firm.description || '',
      logo_url: firm.logo_url || '',
      is_active: Boolean(firm.is_active),
    })
    setSelectedLogo(null)
    setLogoPreview(firm.logo_url || '')
    setFirmFormOpen(true)
  }

  async function handleFirmSubmit(event) {
    event.preventDefault()
    setSaving(true)
    onNotice({ type: '', text: '' })
    try {
      let logoUrl = firmForm.logo_url.trim()
      if (selectedLogo) {
        onNotice({ type: '', text: 'در حال آپلود لوگو...' })
        logoUrl = await supabase.uploadPropFirmLogo(selectedLogo)
      }
      if (!logoUrl) throw new Error('برای ثبت پراپ فرم، لوگوی آن را انتخاب کن.')
      const website = firmForm.website_url.trim()
      if (website) {
        const parsed = new URL(website)
        if (!['http:', 'https:'].includes(parsed.protocol)) throw new Error('آدرس وب‌سایت باید با http یا https شروع شود.')
      }
      const payload = {
        name: firmForm.name.trim(),
        logo_url: logoUrl,
        website_url: website,
        description: firmForm.description.trim(),
        is_active: Boolean(firmForm.is_active),
        updated_at: new Date().toISOString(),
      }
      if (!payload.name) throw new Error('نام پراپ فرم را وارد کن.')
      if (editingFirmId) await supabase.update('prop_firms', editingFirmId, payload)
      else await supabase.insert('prop_firms', payload)
      onNotice({ type: 'success', text: editingFirmId ? 'اطلاعات پراپ فرم به‌روزرسانی شد.' : 'پراپ فرم جدید ثبت شد.' })
      resetFirmForm()
      reload()
    } catch (error) {
      onNotice({ type: 'error', text: error.message })
    } finally {
      setSaving(false)
    }
  }

  async function toggleFirm(firm) {
    const nextStatus = !firm.is_active
    try {
      await supabase.update('prop_firms', firm.id, { is_active: nextStatus, updated_at: new Date().toISOString() })
      onNotice({ type: 'success', text: nextStatus ? 'پراپ فرم فعال شد.' : 'پراپ فرم غیرفعال شد؛ سوابق ماه‌های قبل حفظ شده‌اند.' })
      reload()
    } catch (error) {
      onNotice({ type: 'error', text: error.message })
    }
  }

  function resetAwardForm() {
    setAwardForm({
      ...EMPTY_AWARD,
      jalali_year: String(currentDate.year),
      jalali_month: String(currentDate.month),
    })
    setEditingAwardId(null)
    setAwardFormOpen(false)
  }

  function startEditAward(award) {
    setTab('awards')
    setEditingAwardId(award.id)
    setAwardForm({
      prop_firm_id: award.prop_firm_id || '',
      jalali_year: String(award.jalali_year),
      jalali_month: String(award.jalali_month),
      description: award.description || '',
      selection_reason: award.selection_reason || '',
      overall_score: award.overall_score === null || award.overall_score === undefined ? '' : String(award.overall_score),
      criteria_scores: award.criteria_scores || {},
      status: award.status || 'draft',
    })
    setAwardFormOpen(true)
  }

  function updateCriterion(key, value) {
    setAwardForm((current) => ({
      ...current,
      criteria_scores: { ...current.criteria_scores, [key]: value },
    }))
  }

  async function handleAwardSubmit(event) {
    event.preventDefault()
    setSaving(true)
    onNotice({ type: '', text: '' })
    try {
      const firm = firms.find((item) => item.id === awardForm.prop_firm_id)
      if (!firm) throw new Error('یک پراپ فرم معتبر انتخاب کن.')
      if (!firm.is_active && !editingAwardId) throw new Error('برای ثبت برنده جدید، پراپ فرم باید فعال باشد.')
      const year = Number(awardForm.jalali_year)
      const month = Number(awardForm.jalali_month)
      if (!Number.isInteger(year) || year < 1300 || year > 1600) throw new Error('سال شمسی معتبر نیست.')
      if (!Number.isInteger(month) || month < 1 || month > 12) throw new Error('ماه شمسی معتبر نیست.')

      const overallScore = awardForm.overall_score === '' ? null : Number(awardForm.overall_score)
      if (overallScore !== null && (!Number.isFinite(overallScore) || overallScore < 0 || overallScore > 100)) {
        throw new Error('امتیاز کلی باید بین صفر تا ۱۰۰ باشد.')
      }
      const criteriaScores = {}
      CRITERIA.forEach(([key]) => {
        const raw = awardForm.criteria_scores[key]
        if (raw !== '' && raw !== null && raw !== undefined) {
          const score = Number(raw)
          if (!Number.isFinite(score) || score < 0 || score > 100) throw new Error('امتیاز هر معیار باید بین صفر تا ۱۰۰ باشد.')
          criteriaScores[key] = score
        }
      })

      const nextStatus = awardForm.status === 'published' ? 'published' : 'draft'
      const currentAward = awards.find((award) => award.id === editingAwardId)
      const payload = {
        prop_firm_id: firm.id,
        jalali_year: year,
        jalali_month: month,
        firm_name_snapshot: firm.name,
        firm_logo_snapshot: firm.logo_url,
        firm_website_snapshot: firm.website_url || '',
        description: awardForm.description.trim(),
        selection_reason: awardForm.selection_reason.trim(),
        overall_score: overallScore,
        criteria_scores: criteriaScores,
        status: nextStatus,
        published_at: nextStatus === 'published' ? (currentAward?.published_at || new Date().toISOString()) : null,
        updated_at: new Date().toISOString(),
      }

      if (editingAwardId) await supabase.update('monthly_prop_awards', editingAwardId, payload)
      else await supabase.insert('monthly_prop_awards', payload)

      onNotice({ type: 'success', text: nextStatus === 'published' ? 'برنده ماه منتشر شد.' : 'پیش‌نویس برنده ذخیره شد.' })
      resetAwardForm()
      reload()
    } catch (error) {
      const duplicate = /monthly_prop_awards_year_month_key|monthly_prop_awards.*unique|duplicate key/i.test(error.message || '')
      onNotice({
        type: 'error',
        text: duplicate ? 'برای این ماه قبلاً یک برنده ثبت شده است؛ همان مورد را ویرایش کن.' : error.message,
      })
    } finally {
      setSaving(false)
    }
  }

  async function deleteAward(award) {
    const label = MONTHS[award.jalali_month - 1] + ' ' + award.jalali_year
    if (!window.confirm('انتخاب ثبت‌شده برای «' + label + '» حذف شود؟')) return
    try {
      await supabase.remove('monthly_prop_awards', award.id)
      onNotice({ type: 'success', text: 'انتخاب ماهانه حذف شد.' })
      reload()
    } catch (error) {
      onNotice({ type: 'error', text: error.message })
    }
  }

  return (
    <div className="prop-admin">
      <div className="prop-admin-heading">
        <div>
          <span className="prop-admin-kicker">مدیریت محتوای سایت</span>
          <h2>پراپ فرم‌های ایرانی</h2>
          <p>شرکت‌ها را ثبت کن و برای هر ماه برنده انتخاب و منتشر کن.</p>
        </div>
        <div className="prop-admin-counts">
          <span><LuBuilding2 /> {faNumber(firms.length)} شرکت</span>
          <span><LuTrophy /> {faNumber(awards.filter((award) => award.status === 'published').length)} برنده منتشرشده</span>
        </div>
      </div>

      <div className="prop-admin-tabs" role="tablist" aria-label="مدیریت پراپ فرم‌ها">
        <button type="button" role="tab" aria-selected={tab === 'firms'} className={tab === 'firms' ? 'active' : ''} onClick={() => { setTab('firms'); resetAwardForm() }}>
          <LuBuilding2 /> مدیریت شرکت‌ها
        </button>
        <button type="button" role="tab" aria-selected={tab === 'awards'} className={tab === 'awards' ? 'active' : ''} onClick={() => { setTab('awards'); resetFirmForm() }}>
          <LuTrophy /> برندگان ماهانه
        </button>
      </div>

      {loading ? (
        <div className="admin-empty">در حال دریافت اطلاعات پراپ فرم‌ها...</div>
      ) : tab === 'firms' ? (
        <div className="prop-admin-content">
          <div className="prop-admin-toolbar">
            <div><strong>شرکت‌های ثبت‌شده</strong><small>غیرفعال‌سازی شرکت، سوابق قبلی آن را حذف نمی‌کند.</small></div>
            <button type="button" className="admin-primary-button compact" onClick={() => { resetFirmForm(); setFirmFormOpen(true) }}><LuPlus /> پراپ فرم جدید</button>
          </div>

          {firmFormOpen && (
            <form className="admin-panel prop-admin-form" onSubmit={handleFirmSubmit}>
              <div className="admin-panel-heading">
                <div><h2>{editingFirmId ? 'ویرایش پراپ فرم' : 'ثبت پراپ فرم جدید'}</h2><p>اطلاعات و لوگوی شرکت را وارد کن.</p></div>
                <button type="button" className="prop-icon-button" onClick={resetFirmForm} aria-label="بستن فرم"><LuX /></button>
              </div>
              <div className="prop-firm-logo-field">
                <div className="prop-firm-logo-preview">
                  {logoPreview ? <img src={logoPreview} alt="پیش‌نمایش لوگو" /> : <LuImagePlus />}
                </div>
                <label className="admin-secondary-button prop-upload-button">
                  <LuUpload /> انتخاب لوگو
                  <input type="file" accept="image/jpeg,image/png,image/webp" onChange={handleLogoChange} />
                </label>
                <small>JPG، PNG یا WEBP · حداکثر ۵ مگابایت</small>
              </div>
              <div className="admin-form-grid">
                <label>نام پراپ فرم *
                  <input value={firmForm.name} onChange={(event) => setFirmForm((form) => ({ ...form, name: event.target.value }))} required maxLength={120} placeholder="نام شرکت" />
                </label>
                <label>وب‌سایت رسمی
                  <input value={firmForm.website_url} onChange={(event) => setFirmForm((form) => ({ ...form, website_url: event.target.value }))} dir="ltr" type="url" placeholder="https://example.com" />
                </label>
                <label className="full">توضیحات
                  <textarea rows={3} value={firmForm.description} onChange={(event) => setFirmForm((form) => ({ ...form, description: event.target.value }))} placeholder="توضیح کوتاه درباره پراپ فرم..." />
                </label>
                <label className="admin-checkbox"><input type="checkbox" checked={firmForm.is_active} onChange={(event) => setFirmForm((form) => ({ ...form, is_active: event.target.checked }))} /> فعال در فهرست انتخاب برنده</label>
              </div>
              <div className="admin-form-actions">
                <button type="button" className="admin-secondary-button" onClick={resetFirmForm}>انصراف</button>
                <button type="submit" className="admin-primary-button" disabled={saving}><LuSave /> {saving ? 'در حال ذخیره...' : editingFirmId ? 'ذخیره تغییرات' : 'ثبت پراپ فرم'}</button>
              </div>
            </form>
          )}

          {firms.length === 0 ? (
            <div className="admin-empty">هنوز پراپ فرمی ثبت نشده است. اولین شرکت را اضافه کن.</div>
          ) : (
            <div className="admin-table-wrap">
              <table className="admin-table">
                <thead><tr><th>پراپ فرم</th><th>وب‌سایت</th><th>وضعیت</th><th>عملیات</th></tr></thead>
                <tbody>
                  {firms.map((firm) => (
                    <tr key={firm.id}>
                      <td><div className="admin-video-cell prop-firm-table-cell"><img src={firm.logo_url} alt="" /><span><strong>{firm.name}</strong><small>{firm.description || 'بدون توضیحات'}</small></span></div></td>
                      <td dir="ltr">{firm.website_url ? <a href={firm.website_url} target="_blank" rel="noreferrer">{firm.website_url}</a> : '—'}</td>
                      <td><span className={'admin-status ' + (firm.is_active ? 'published' : 'draft')}>{firm.is_active ? 'فعال' : 'غیرفعال'}</span></td>
                      <td><div className="admin-row-actions"><button type="button" onClick={() => startEditFirm(firm)}>ویرایش</button><button type="button" onClick={() => toggleFirm(firm)}>{firm.is_active ? 'غیرفعال‌سازی' : 'فعال‌سازی'}</button></div></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      ) : (
        <div className="prop-admin-content">
          <div className="prop-admin-toolbar">
            <div><strong>آرشیو برندگان</strong><small>برای هر ماه فقط یک برنده اصلی ثبت می‌شود.</small></div>
            <button type="button" className="admin-primary-button compact" onClick={() => { resetAwardForm(); setAwardFormOpen(true) }} disabled={activeFirms.length === 0}><LuPlus /> انتخاب برنده ماه</button>
          </div>

          {awardFormOpen && (
            <form className="admin-panel prop-admin-form" onSubmit={handleAwardSubmit}>
              <div className="admin-panel-heading">
                <div><h2>{editingAwardId ? 'ویرایش انتخاب ماهانه' : 'ثبت برنده ماه'}</h2><p>سال، ماه و پراپ فرم منتخب را تعیین کن.</p></div>
                <button type="button" className="prop-icon-button" onClick={resetAwardForm} aria-label="بستن فرم"><LuX /></button>
              </div>
              <div className="admin-form-grid">
                <label>سال شمسی *
                  <input type="number" min="1300" max="1600" value={awardForm.jalali_year} onChange={(event) => setAwardForm((form) => ({ ...form, jalali_year: event.target.value }))} required />
                </label>
                <label>ماه *
                  <select value={awardForm.jalali_month} onChange={(event) => setAwardForm((form) => ({ ...form, jalali_month: event.target.value }))} required>
                    {MONTHS.map((month, index) => <option key={month} value={index + 1}>{month}</option>)}
                  </select>
                </label>
                <label className="full">پراپ فرم برنده *
                  <select value={awardForm.prop_firm_id} onChange={(event) => setAwardForm((form) => ({ ...form, prop_firm_id: event.target.value }))} required>
                    <option value="">انتخاب شرکت</option>
                    {firms.filter((firm) => firm.is_active || firm.id === awardForm.prop_firm_id).map((firm) => <option key={firm.id} value={firm.id}>{firm.name}{firm.is_active ? '' : ' (غیرفعال)'}</option>)}
                  </select>
                </label>
                <label>امتیاز کلی (اختیاری)
                  <input type="number" min="0" max="100" value={awardForm.overall_score} onChange={(event) => setAwardForm((form) => ({ ...form, overall_score: event.target.value }))} placeholder="از ۱۰۰" />
                </label>
                <label>وضعیت انتشار
                  <select value={awardForm.status} onChange={(event) => setAwardForm((form) => ({ ...form, status: event.target.value }))}>
                    <option value="draft">پیش‌نویس</option>
                    <option value="published">انتشار عمومی</option>
                  </select>
                </label>
                <label className="full">توضیح کوتاه
                  <textarea rows={3} value={awardForm.description} onChange={(event) => setAwardForm((form) => ({ ...form, description: event.target.value }))} placeholder="متن کوتاه برای کارت برنده..." />
                </label>
                <label className="full">دلیل انتخاب
                  <textarea rows={4} value={awardForm.selection_reason} onChange={(event) => setAwardForm((form) => ({ ...form, selection_reason: event.target.value }))} placeholder="توضیح بده چرا این پراپ فرم انتخاب شده است..." />
                </label>
              </div>

              <div className="prop-criteria-editor">
                <div><strong>معیارهای ارزیابی</strong><small>ثبت امتیاز برای هر معیار اختیاری است؛ فقط فیلدهای پرشده نمایش داده می‌شوند.</small></div>
                <div className="prop-criteria-editor-grid">
                  {CRITERIA.map(([key, label]) => (
                    <label key={key}>{label}
                      <input type="number" min="0" max="100" value={awardForm.criteria_scores[key] ?? ''} onChange={(event) => updateCriterion(key, event.target.value)} placeholder="۰ تا ۱۰۰" />
                    </label>
                  ))}
                </div>
              </div>

              {selectedFirm && (
                <div className="prop-award-snapshot">
                  <img src={selectedFirm.logo_url} alt="" />
                  <span><strong>{selectedFirm.name}</strong><small>نام و لوگو هنگام انتشار در آرشیو همان ماه ثبت می‌شود.</small></span>
                </div>
              )}

              <div className="admin-form-actions">
                <button type="button" className="admin-secondary-button" onClick={resetAwardForm}>انصراف</button>
                <button type="submit" className="admin-primary-button" disabled={saving || !firms.length}><LuSave /> {saving ? 'در حال ذخیره...' : awardForm.status === 'published' ? 'ذخیره و انتشار' : 'ذخیره پیش‌نویس'}</button>
              </div>
            </form>
          )}

          {awards.length === 0 ? (
            <div className="admin-empty">هنوز برنده‌ای ثبت نشده است. اولین انتخاب ماهانه را انجام بده.</div>
          ) : (
            <div className="admin-table-wrap">
              <table className="admin-table">
                <thead><tr><th>ماه</th><th>برنده</th><th>امتیاز</th><th>وضعیت</th><th>عملیات</th></tr></thead>
                <tbody>
                  {awards.map((award) => (
                    <tr key={award.id}>
                      <td>{MONTHS[award.jalali_month - 1]} {faNumber(award.jalali_year)}</td>
                      <td><div className="admin-video-cell prop-firm-table-cell"><img src={award.firm_logo_snapshot} alt="" /><span><strong>{award.firm_name_snapshot}</strong><small>{award.selection_reason || award.description || '—'}</small></span></div></td>
                      <td>{award.overall_score === null || award.overall_score === undefined ? '—' : faNumber(award.overall_score) + ' / ۱۰۰'}</td>
                      <td><span className={'admin-status ' + (award.status === 'published' ? 'published' : 'draft')}>{award.status === 'published' ? 'منتشرشده' : 'پیش‌نویس'}</span></td>
                      <td><div className="admin-row-actions"><button type="button" onClick={() => startEditAward(award)}>ویرایش</button><button type="button" className="danger" onClick={() => deleteAward(award)}>حذف</button></div></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default AdminPropFirms
