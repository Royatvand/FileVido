import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { pickSimilarIndicators } from '../lib/indicators'
import IndicatorSlider from './IndicatorSlider'

const CARD_COLUMNS = 'id,title,slug,description,platform,version,cover_url,file_size,download_count,created_at'

// «اندیکاتورهای مشابه» به‌شکل اسلایدر؛ بالای فوتر صفحهٔ هر اندیکاتور
function SimilarIndicators({ current }) {
  const [items, setItems] = useState([])

  useEffect(() => {
    let active = true
    supabase.select('indicators', '&status=eq.published&order=created_at.desc&limit=40', CARD_COLUMNS)
      .then((rows) => { if (active) setItems(pickSimilarIndicators(current, rows || [])) })
      .catch(() => { if (active) setItems([]) }) // بخش «مشابه» اختیاری است؛ خطا صفحه را خراب نمی‌کند
    return () => { active = false }
  }, [current])

  return <IndicatorSlider items={items} kicker="پیشنهاد برای تو" title="اندیکاتورهای مشابه" label="اندیکاتورهای مشابه" />
}

export default SimilarIndicators
