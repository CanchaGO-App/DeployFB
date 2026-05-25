import { useEffect, useState } from 'react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line, PieChart, Pie, Cell, Legend, Area, AreaChart
} from 'recharts'
import { getAdminEstadisticas } from '../api/estadisticas'
import Topbar from '../components/Topbar'
import StatCard from '../components/StatCard'

const PIE_COLORS = ['#f59e0b', 'var(--accent-green)', '#ef4444']

export default function AdminDashboard() {
  const [stats, setStats] = useState(null)
  const [cargando, setCargando] = useState(true)

  useEffect(() => {
    cargarDatos()
  }, [])

  async function cargarDatos() {
    try {
      const data = await getAdminEstadisticas()
      setStats(data)
    } catch (err) {
      console.error('Error:', err)
    } finally {
      setCargando(false)
    }
  }

  if (cargando || !stats) {
    return (
      <>
        <Topbar />
        <div className="page" style={{ paddingTop: 24 }}>
          <div className="stats-grid">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="stat-card">
                <div className="skeleton-avatar skeleton-pulse" />
                <div style={{ flex: 1 }}>
                  <div className="skeleton-pulse" style={{ height: 16, width: '55%', marginBottom: 10 }} />
                  <div className="skeleton-pulse" style={{ height: 30, width: '80%' }} />
                </div>
              </div>
            ))}
          </div>
          <div className="dashboard-grid">
            <div className="card"><div className="skeleton-pulse" style={{ height: 260, width: '100%' }} /></div>
            <div className="card"><div className="skeleton-pulse" style={{ height: 260, width: '100%' }} /></div>
          </div>
        </div>
      </>
    )
  }

  const pieData = [
    { name: 'Confirmadas', value: stats.por_estado.confirmada },
    { name: 'Canceladas', value: stats.por_estado.cancelada },
  ].filter(d => d.value > 0)

  return (
    <>
      <Topbar />
      <div className="page">
        <div className="page-header">
          <h1>🛡️ Panel de Administración</h1>
          <p>Métricas generales de la plataforma CanchaGo</p>
        </div>

        {/* Totales Generales */}
        <h2 className="mb-2">Resumen General</h2>
        <div className="stats-grid">
          <StatCard icon="👥" value={stats.totales.usuarios.toLocaleString()} label="Clientes" color="green" />
          <StatCard icon="🏢" value={stats.totales.duenos.toLocaleString()} label="Dueños Registrados" color="blue" />
          <StatCard icon="🏢" value={(stats.totales.locales || 0).toLocaleString()} label="Locales" color="yellow" />
          <StatCard icon="🏟️" value={stats.totales.canchas.toLocaleString()} label="Canchas" color="purple" />
        </div>

        {/* Nuevos registros */}
        <h2 className="mb-2">Nuevos Clientes</h2>
        <div className="stats-grid">
          <StatCard icon="🆕" value={stats.nuevos_usuarios.hoy} label="Hoy" color="green" />
          <StatCard icon="📆" value={stats.nuevos_usuarios.semana} label="Esta semana" color="blue" />
          <StatCard icon="🗓️" value={stats.nuevos_usuarios.mes} label="Este mes" color="yellow" />
        </div>

        <h2 className="mb-2">Nuevos Dueños</h2>
        <div className="stats-grid">
          <StatCard icon="🏢" value={stats.nuevos_duenos.hoy} label="Hoy" color="green" />
          <StatCard icon="📆" value={stats.nuevos_duenos.semana} label="Esta semana" color="blue" />
          <StatCard icon="🗓️" value={stats.nuevos_duenos.mes} label="Este mes" color="yellow" />
        </div>

        {/* Reservas e Ingresos */}
        <h2 className="mb-2">Actividad de Reservas</h2>
        <div className="stats-grid">
          <StatCard icon="📅" value={stats.reservas_periodo.hoy} label="Reservas hoy" color="green" />
          <StatCard icon="📆" value={stats.reservas_periodo.semana} label="Esta semana" color="blue" />
          <StatCard icon="🗓️" value={stats.reservas_periodo.mes} label="Este mes" color="yellow" />
          <StatCard icon="👤" value={stats.usuarios_activos} label="Usuarios activos (30d)" color="purple" />
        </div>

        <h2 className="mb-2">Ingresos Estimados (Bs.)</h2>
        <div className="stats-grid">
          <StatCard icon="💎" value={stats.ingresos.mes.toLocaleString()} label="Este mes" color="yellow" />
          <StatCard icon="🏆" value={stats.ingresos.ano.toLocaleString()} label="Este año" color="purple" />
        </div>

        {/* Gráficos */}
        <div className="dashboard-grid">
          {/* Crecimiento de usuarios */}
          <div className="card">
            <div className="card-header">
              <h3>📈 Crecimiento de Usuarios</h3>
            </div>
            {stats.crecimiento_usuarios.length > 0 ? (
              <ResponsiveContainer width="100%" height={280}>
                <AreaChart data={stats.crecimiento_usuarios}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border-primary)" />
                  <XAxis
                    dataKey="mes"
                    tick={{ fill: 'var(--text-secondary)', fontSize: 11 }}
                  />
                  <YAxis tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} allowDecimals={false} />
                  <Tooltip
                    contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border-primary)', borderRadius: 8 }}
                    labelStyle={{ color: 'var(--text-pure)' }}
                  />
                  <defs>
                    <linearGradient id="areaGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="var(--accent-green)" stopOpacity={0.4} />
                      <stop offset="100%" stopColor="var(--accent-green)" stopOpacity={0.05} />
                    </linearGradient>
                  </defs>
                  <Area
                    type="monotone"
                    dataKey="total"
                    stroke="var(--accent-green)"
                    strokeWidth={2}
                    fill="url(#areaGradient)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="empty-state"><p>Sin datos suficientes</p></div>
            )}
          </div>

          {/* Reservas últimos 30 días */}
          <div className="card">
            <div className="card-header">
              <h3>📊 Reservas — Últimos 30 días</h3>
            </div>
            {stats.reservas_por_dia.length > 0 ? (
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={stats.reservas_por_dia}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border-primary)" />
                  <XAxis
                    dataKey="fecha"
                    tick={{ fill: 'var(--text-secondary)', fontSize: 11 }}
                    tickFormatter={(v) => v.slice(5)}
                  />
                  <YAxis tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} allowDecimals={false} />
                  <Tooltip
                    contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border-primary)', borderRadius: 8 }}
                    labelStyle={{ color: 'var(--text-pure)' }}
                  />
                  <Bar dataKey="total" fill="url(#adminBarGradient)" radius={[4, 4, 0, 0]} />
                  <defs>
                    <linearGradient id="adminBarGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="var(--accent-blue)" />
                      <stop offset="100%" stopColor="var(--accent-purple)" />
                    </linearGradient>
                  </defs>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="empty-state"><p>Sin datos aún</p></div>
            )}
          </div>
        </div>

        <div className="dashboard-grid">
          {/* Top 5 Canchas */}
          <div className="card">
            <div className="card-header">
              <h3>🏆 Top 5 Canchas Más Reservadas</h3>
            </div>
            {stats.top_canchas.length > 0 ? (
              <div className="table-container">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>Cancha</th>
                      <th>Local</th>
                      <th>Reservas</th>
                    </tr>
                  </thead>
                  <tbody>
                    {stats.top_canchas.map((c, i) => (
                      <tr key={i}>
                        <td>
                          <span style={{
                            background: i === 0 ? '#f59e0b' : i === 1 ? '#9ca3af' : i === 2 ? '#b45309' : 'transparent',
                            color: i < 3 ? '#fff' : 'var(--text-primary)',
                            borderRadius: '50%',
                            width: 24, height: 24,
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '0.75rem',
                            fontWeight: 700
                          }}>
                            {i + 1}
                          </span>
                        </td>
                        <td><strong>{c.nombre}</strong></td>
                        <td>{c.local}</td>
                        <td className="text-success" style={{ fontWeight: 700 }}>{c.total_reservas}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="empty-state"><p>Sin canchas registradas</p></div>
            )}
          </div>

          {/* Distribución por estado */}
          <div className="card">
            <div className="card-header">
              <h3>🎯 Distribución por Estado</h3>
            </div>
            {pieData.length > 0 ? (
              <ResponsiveContainer width="100%" height={280}>
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={95}
                    paddingAngle={5}
                    dataKey="value"
                    label={({ name, value }) => `${name}: ${value}`}
                  >
                    {pieData.map((_, index) => (
                      <Cell key={index} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{ background: '#0a1f33', border: '1px solid #1f8f7a', borderRadius: 8 }}
                  />
                  <Legend wrapperStyle={{ fontSize: 12, color: '#9cb8b0' }} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="empty-state"><p>Sin reservas aún</p></div>
            )}
          </div>
        </div>
      </div>
    </>
  )
}
