import { useEffect, useState } from 'react'

export default function App() {
  const [username, setUsername] = useState('printer')
  const [password, setPassword] = useState('print123456')
  const [token, setToken] = useState(localStorage.getItem('print_token') || '')
  const [role, setRole] = useState(localStorage.getItem('print_role') || '')
  const [view, setView] = useState('jobs')
  const [rows, setRows] = useState([])
  const [stats, setStats] = useState([])
  const [statsAt, setStatsAt] = useState('')
  const [sheet, setSheet] = useState('插页-02')
  const [cyan, setCyan] = useState('0.08')
  const [magenta, setMagenta] = useState('0.02')
  const [error, setError] = useState('')

  async function api(path, options = {}) {
    const res = await fetch(path, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    })
    const data = await res.json().catch(() => ({}))
    if (!res.ok) throw new Error(data.detail || '请求失败')
    return data
  }

  async function load() {
    setRows(await api('/api/jobs'))
  }

  async function loadStats() {
    try {
      setStats(await api('/api/stats/hourly'))
      setStatsAt(new Date().toLocaleTimeString())
      setError('')
    } catch (err) {
      setError(err.message)
    }
  }

  useEffect(() => {
    if (!token || view !== 'jobs') return
    load()
    const timer = setInterval(load, 1000)
    return () => clearInterval(timer)
  }, [token, view])

  useEffect(() => {
    if (token && view === 'stats') loadStats()
  }, [token, view])

  async function enter() {
    const data = await api('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username, password }),
    })
    localStorage.setItem('print_token', data.access_token)
    localStorage.setItem('print_role', data.role)
    setToken(data.access_token)
    setRole(data.role)
  }

  async function send() {
    setError('')
    try {
      await api('/api/jobs', {
        method: 'POST',
        body: JSON.stringify({
          sheet,
          cyan_mm: Number(cyan),
          magenta_mm: Number(magenta),
        }),
      })
    } catch (err) {
      setError(err.message)
    }
  }

  function leave() {
    localStorage.clear()
    setToken('')
    setRole('')
  }

  if (!token) {
    return (
      <main>
        <h1>印刷套准复核台</h1>
        <p>提交后接口只入队。另一进程领走偏差并写结论，页面轮询到结论出现。</p>
        <input value={username} onChange={(e) => setUsername(e.target.value)} />
        <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
        <button onClick={enter}>登录</button>
        <p>printer / print123456 可送复核；checker / check123456 只看</p>
      </main>
    )
  }

  return (
    <main>
      <h1>印刷套准复核台</h1>
      <button onClick={leave}>退出</button>
      <nav>
        <button onClick={() => setView('jobs')} disabled={view === 'jobs'}>复核台</button>
        <button onClick={() => setView('stats')} disabled={view === 'stats'}>时段失败率</button>
      </nav>
      {error && <p>{error}</p>}
      {view === 'jobs' ? (
        <>
          {role === 'writer' && (
            <p>
              <input value={sheet} onChange={(e) => setSheet(e.target.value)} />
              <input value={cyan} onChange={(e) => setCyan(e.target.value)} />
              <input value={magenta} onChange={(e) => setMagenta(e.target.value)} />
              <button onClick={send}>送复核</button>
            </p>
          )}
          <table>
            <thead>
              <tr><th>印张</th><th>青</th><th>品</th><th>状态</th><th>结论</th></tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id}>
                  <td>{row.sheet}</td>
                  <td>{row.cyan_mm}</td>
                  <td>{row.magenta_mm}</td>
                  <td>{row.status}</td>
                  <td>{row.verdict || '等待'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      ) : (
        <section>
          <h2>时段失败率</h2>
          <p>
            失败率 = 套不准笔数 ÷ 投递笔数 × 100%。由服务端按每笔送复核的创建时刻
            （Asia/Shanghai）归入小时聚合；投递笔数含待处理与已结论的印张。
          </p>
          <p>
            <button onClick={loadStats}>刷新</button>
            {statsAt && <span> 更新于 {statsAt}</span>}
          </p>
          <table>
            <thead>
              <tr><th>小时</th><th>投递笔数</th><th>套不准笔数</th><th>失败率</th></tr>
            </thead>
            <tbody>
              {stats.map((s) => (
                <tr key={s.hour}>
                  <td>{s.hour}</td>
                  <td>{s.total}</td>
                  <td>{s.failed}</td>
                  <td>{s.fail_rate}%</td>
                </tr>
              ))}
              {stats.length === 0 && (
                <tr><td colSpan="4">暂无数据</td></tr>
              )}
            </tbody>
          </table>
        </section>
      )}
    </main>
  )
}
