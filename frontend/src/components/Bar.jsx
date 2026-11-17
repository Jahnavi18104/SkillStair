export default function Bar({ value, tone }) {
  const v = Math.max(0, Math.min(100, value || 0))
  return <div className={'bar ' + (tone || '')}><i style={{ width: v + '%' }} /></div>
}
export const toneFor = s => (s >= 75 ? 'green' : s >= 60 ? '' : 'amber')
