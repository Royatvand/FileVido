function countBy(list, predicate) {
  return list.reduce((sum, item) => sum + (predicate(item) ? 1 : 0), 0)
}

function AdminOverview({ videos, categories, playlists, onOpen }) {
  const published = countBy(videos, (video) => video.status === 'published')
  const drafts = countBy(videos, (video) => video.status !== 'published')
  const featured = countBy(videos, (video) => video.is_featured)
  const missingCover = videos.filter((video) => !video.cover_url)
  const missingDescription = videos.filter((video) => !String(video.description || '').trim())
  const orphanCategories = categories.filter((category) => !videos.some((video) => video.category_id === category.id))
  const publishRate = videos.length ? Math.round((published / videos.length) * 100) : 0

  const checks = [
    { ok: missingCover.length === 0, label: missingCover.length ? `${missingCover.length} ویدیو کاور ندارد` : 'همه ویدیوها کاور دارند' },
    { ok: missingDescription.length === 0, label: missingDescription.length ? `${missingDescription.length} ویدیو توضیحات ندارد` : 'توضیحات ویدیوها کامل است' },
    { ok: drafts === 0, label: drafts ? `${drafts} پیش‌نویس منتظر انتشار است` : 'پیش‌نویس باز نداری' },
    { ok: orphanCategories.length === 0, label: orphanCategories.length ? `${orphanCategories.length} دسته بدون ویدیو است` : 'هر دسته حداقل یک ویدیو دارد' },
  ]

  return (
    <div className="admin-overview">
      <div className="admin-stats admin-stats-wide">
        <article><span>کل ویدیوها</span><strong>{videos.length.toLocaleString('fa-IR')}</strong><small>در کتابخانه</small></article>
        <article><span>منتشرشده</span><strong>{published.toLocaleString('fa-IR')}</strong><small>{publishRate.toLocaleString('fa-IR')}٪ از محتوا</small></article>
        <article><span>پیش‌نویس</span><strong>{drafts.toLocaleString('fa-IR')}</strong><small>هنوز عمومی نیست</small></article>
        <article><span>ویژه</span><strong>{featured.toLocaleString('fa-IR')}</strong><small>علامت‌خورده برای صفحه اصلی</small></article>
        <article><span>دسته‌ها</span><strong>{categories.length.toLocaleString('fa-IR')}</strong><small>موضوع کتابخانه</small></article>
        <article><span>پلی‌لیست</span><strong>{playlists.length.toLocaleString('fa-IR')}</strong><small>دوره و مجموعه</small></article>
      </div>

      <div className="admin-overview-grid">
        <section className="admin-panel">
          <div className="admin-panel-heading"><div><h2>سلامت محتوا</h2><p>قبل از انتشار، این‌ها را یک‌بار چک کن.</p></div></div>
          <ul className="admin-health-list">
            {checks.map((check) => (
              <li key={check.label} className={check.ok ? 'is-ok' : 'is-warn'}>
                <i aria-hidden="true" />
                <span>{check.label}</span>
              </li>
            ))}
          </ul>
        </section>

        <section className="admin-panel">
          <div className="admin-panel-heading"><div><h2>میانبرها</h2><p>کارهای پرتکرار، بدون گشتن بین تب‌ها.</p></div></div>
          <div className="admin-shortcut-grid">
            <button type="button" onClick={() => onOpen('form')}>＋ ویدیوی تازه</button>
            <button type="button" onClick={() => onOpen('videos')}>▤ کتابخانه ویدیو</button>
            <button type="button" onClick={() => onOpen('banners')}>▣ اسلایدر خانه</button>
            <button type="button" onClick={() => onOpen('playlists')}>☰ پلی‌لیست‌ها</button>
            <button type="button" onClick={() => onOpen('indicators')}>ƒ اندیکاتورها</button>
            <button type="button" onClick={() => onOpen('app-versions')}>↑ نسخه اپ</button>
          </div>
        </section>
      </div>

      <section className="admin-panel">
        <div className="admin-panel-heading"><div><h2>آخرین ویدیوها</h2><p>شش مورد اخیر؛ برای ویرایش به کتابخانه برو.</p></div><button type="button" className="admin-secondary-button" onClick={() => onOpen('videos')}>مشاهده همه</button></div>
        {videos.length === 0 ? <div className="admin-empty">هنوز ویدیویی ثبت نشده است.</div> : (
          <div className="admin-recent-list">
            {videos.slice(0, 6).map((video) => (
              <article key={video.id}>
                <img src={video.cover_url || '/covers/cover-1.svg'} alt="" />
                <div>
                  <strong>{video.title}</strong>
                  <small>{video.status === 'published' ? 'منتشرشده' : 'پیش‌نویس'} · {video.created_at ? new Date(video.created_at).toLocaleDateString('fa-IR') : '—'}</small>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}

export default AdminOverview
