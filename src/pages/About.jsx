import AnimatedText from '../components/animated/AnimatedText'
import Counter from '../components/animated/Counter'

const padTwo = (value) => String(Math.round(value)).padStart(2, '0')

function About() {
  return (
    <main className="page-content about-page">
      <section className="about-hero">
        <span className="eyebrow"><span className="status-dot" /> داستان چارت مسترز</span>
        <h1><AnimatedText text="یادگیری نباید" /><br /><span className="hl"><AnimatedText text="مرز زبانی" offset={2} /></span>{' '}<AnimatedText text="داشته باشد." offset={4} /></h1>
        <p className="about-lead">
          چارت مسترز با یک ایده ساده شکل گرفت: دسترسی به آموزش‌های باکیفیت بازارهای مالی
          نباید به دانستن زبان انگلیسی محدود باشد.
        </p>
      </section>

      <section className="about-story">
        <div className="about-story-copy">
          <span className="section-kicker">چرا چارت مسترز؟</span>
          <h2><AnimatedText text="دانش جهانی،" /><br /><AnimatedText text="به زبان فارسی." offset={2} /></h2>
          <p>
            هر روز محتوای آموزشی ارزشمندی در دنیای بازارهای مالی منتشر می‌شود؛
            اما پیدا کردن، فهمیدن و دنبال کردن این منابع برای همه آسان نیست.
          </p>
          <p>
            ما می‌خواهیم این مسیر را ساده‌تر کنیم؛ با گردآوری و ارائه ویدیوهای
            آموزشی منتخب، همراه با ترجمه فارسی و تجربه‌ای مرتب و قابل استفاده.
          </p>
        </div>
        <div className="about-quote-card">
          <span className="quote-mark">“</span>
          <p>هدف ما فقط ترجمه کلمات نیست؛ می‌خواهیم مسیر یادگیری را قابل‌دسترس‌تر کنیم.</p>
          <span className="quote-caption">CHARTMASTERS — OUR PURPOSE</span>
        </div>
      </section>

      <section className="about-values">
        <div className="values-heading">
          <span className="section-kicker">اصول ما</span>
          <h2><AnimatedText text="چیزی که به آن پایبندیم" /></h2>
        </div>
        <div className="values-grid">
          <article className="value-card">
            <span className="value-number"><Counter targetValue={1} format={padTwo} /></span>
            <h3>یادگیری در دسترس</h3>
            <p>کمک به برداشتن مانع زبان برای علاقه‌مندان یادگیری بازارهای مالی.</p>
          </article>
          <article className="value-card">
            <span className="value-number"><Counter targetValue={2} format={padTwo} delay={150} /></span>
            <h3>کیفیت محتوا</h3>
            <p>توجه به انتخاب منابع آموزشی مفید و ارائه ترجمه‌ای روشن و قابل فهم.</p>
          </article>
          <article className="value-card">
            <span className="value-number"><Counter targetValue={3} format={padTwo} delay={300} /></span>
            <h3>شفافیت</h3>
            <p>تأکید بر آموزش و آگاهی، بدون وعده سود قطعی یا موفقیت یک‌شبه.</p>
          </article>
        </div>
      </section>

      <section className="about-cta">
        <div>
          <span className="section-kicker">قدم بعدی</span>
          <h2><AnimatedText text="آماده‌ای یادگیری رو شروع کنی؟" /></h2>
          <p>به کتابخانه آموزشی چارت مسترز سر بزن و مسیرت رو آغاز کن.</p>
        </div>
        <a className="primary-button" href="/#videos">مشاهده ویدیوها <span>←</span></a>
      </section>

      <p className="about-disclaimer">
        محتوای چارت مسترز با هدف آموزش و افزایش آگاهی ارائه می‌شود و توصیه مالی یا سیگنال معاملاتی نیست.
      </p>
    </main>
  )
}

export default About
