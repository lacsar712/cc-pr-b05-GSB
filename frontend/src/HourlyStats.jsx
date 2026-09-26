import { useEffect, useState } from 'react'

export default function HourlyStats({ api }) {
  const [rows, setRows] = useState([])
  const [error, setError] = useState('')
  const [updatedAt, setUpdatedAt] = useState('')

  async function load() {
    try {
      setRows(await api('/api/stats/hourly'))
      setError('')
      setUpdatedAt(new Date().toLocaleTimeString())
    } catch (err) {
      setError(err.message)
    }
  }

  useEffect(() => {
    load()
    const timer = setInterval(load, 3000)
    return () => clearInterval(timer)
  }, [])

  return (
    <section>
      <h2>时段失败率</h2>
      <p>
        <button onClick={load}>刷新</button>
        {updatedAt && <span> 最近刷新：{updatedAt}（每 3 秒自动刷新）</span>}
      </p>
      {error && <p>{error}</p>}
      <table>
        <thead>
          <tr><th>小时</th><th>投递笔数</th><th>套不准笔数</th><th>失败率</th></tr>
        </thead>
        <tbody>
          {rows.length === 0 && <tr><td colSpan={4}>暂无投递</td></tr>}
          {rows.map((row) => (
            <tr key={row.hour}>
              <td>{row.hour}</td>
              <td>{row.total}</td>
              <td>{row.failed}</td>
              <td>{(row.failure_rate * 100).toFixed(1)}%</td>
            </tr>
          ))}
        </tbody>
      </table>
      <h3>失败率说明</h3>
      <ul>
        <li>失败率 = 该小时结论为「套不准」的笔数 ÷ 该小时全部投递笔数 × 100%。</li>
        <li>按每笔投递的创建时刻归入对应小时，统计由服务端聚合，页面只展示结果。</li>
        <li>待处理或处理中的笔数计入分母、暂不计入套不准笔数；结论出现后刷新即更新。</li>
      </ul>
    </section>
  )
}
