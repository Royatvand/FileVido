import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import IndicatorSlider from './IndicatorSlider'

const CARD_COLUMNS = 'id,title,slug,description,platform,version,cover_url,file_size,download_count,created_at'

// اسلایدر «تازه‌ترین اندیکاتورها» در صفحهٔ اصلی؛ اگر موردی نباشد یا خطا بدهد چیزی نمایش نمی‌دهد
function HomeIndicators() {
  const [items, setItems] = useState([])

  useEffect(() => {
    let active = true
    supabase.select('indicators', '&status=eq.published&order=created_at.desc&limit=12', CARD_COLUMNS)
      .then((rows) => { if (active) setItems(rows || []) })
      .catch(() => { if (active) setItems([]) })
    return () => { active = false }
  }, [])

  return (
    <IndicatorSlider
      items={items}
      kicker="دانلود رایگان"
      title="تازه‌ترین اندیکاتورها"
      label="تازه‌ترین اندیکاتورها"
      action={<a className="secondary-button indicator-slider-all" href="/indicators">همهٔ اندیکاتورها</a>}
    />
  )
}

export default HomeIndicators
