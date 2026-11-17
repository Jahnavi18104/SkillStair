import { useCallback, useEffect, useState } from 'react'

export const getToken = () => localStorage.getItem('ss_token')

export async function api(path, method = 'GET', body) {
  const res = await fetch('/api' + path, {
    method,
    headers: { 'Content-Type': 'application/json', ...(getToken() ? { Authorization: 'Bearer ' + getToken() } : {}) },
    body: body ? JSON.stringify(body) : undefined
  })
  const data = await res.json().catch(() => ({}))
  if (res.status === 401 && getToken()) {
    localStorage.clear()
    window.location.replace('/SkillStair/login')
  }
  if (!res.ok) throw new Error(data.message || 'Something went wrong. Please try again.')
  return data
}

export function useLoad(path) {
  const [data, setData] = useState(null)
  const [error, setError] = useState('')
  const load = useCallback(() => api(path).then(setData).catch(e => setError(e.message)), [path])
  useEffect(() => { load() }, [load])
  return { data, error, reload: load, setData }
}
