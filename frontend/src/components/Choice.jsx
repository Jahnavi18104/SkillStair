export default function Choice({ options, value, onChange }) {
  return (
    <div className="pills">
      {options.map(o => (
        <button type="button" key={o} className={'pill' + (o === value ? ' active' : '')} onClick={() => onChange(o)}>{o}</button>
      ))}
    </div>
  )
}
