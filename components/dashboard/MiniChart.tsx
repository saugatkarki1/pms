'use client'

import {
    ResponsiveContainer,
    LineChart,
    Line,
    XAxis,
    YAxis,
    Tooltip,
    PieChart,
    Pie,
    Cell,
} from 'recharts'

/* ===== Mini Line Chart ===== */
interface MiniLineChartProps {
    data: Array<{ name: string; value: number; value2?: number }>
    color?: string
    color2?: string
    height?: number
    showSecondLine?: boolean
}

export function MiniLineChart({
    data,
    color = '#6366f1',
    color2 = '#22c55e',
    height = 120,
    showSecondLine = false,
}: MiniLineChartProps) {
    return (
        <ResponsiveContainer width="100%" height={height}>
            <LineChart data={data}>
                <XAxis
                    dataKey="name"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 10, fill: 'rgba(255,255,255,0.4)' }}
                />
                <YAxis hide />
                <Tooltip
                    contentStyle={{
                        background: '#1a1a2e',
                        border: '1px solid rgba(255,255,255,0.1)',
                        borderRadius: 12,
                        fontSize: 12,
                        color: '#fff',
                    }}
                />
                <Line
                    type="monotone"
                    dataKey="value"
                    stroke={color}
                    strokeWidth={2.5}
                    dot={false}
                    activeDot={{ r: 4 }}
                />
                {showSecondLine && (
                    <Line
                        type="monotone"
                        dataKey="value2"
                        stroke={color2}
                        strokeWidth={2.5}
                        dot={false}
                        strokeDasharray="5 5"
                        activeDot={{ r: 4 }}
                    />
                )}
            </LineChart>
        </ResponsiveContainer>
    )
}

/* ===== Mini Donut Chart ===== */
interface DonutSegment {
    name: string
    value: number
    color: string
}

interface MiniDonutChartProps {
    data: DonutSegment[]
    size?: number
    innerRadius?: number
    outerRadius?: number
}

export function MiniDonutChart({
    data,
    size = 140,
    innerRadius = 42,
    outerRadius = 62,
}: MiniDonutChartProps) {
    const total = data.reduce((sum, d) => sum + d.value, 0)

    return (
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <ResponsiveContainer width={size} height={size}>
                <PieChart>
                    <Pie
                        data={data}
                        dataKey="value"
                        cx="50%"
                        cy="50%"
                        innerRadius={innerRadius}
                        outerRadius={outerRadius}
                        paddingAngle={3}
                        startAngle={90}
                        endAngle={-270}
                    >
                        {data.map((entry, index) => (
                            <Cell key={index} fill={entry.color} />
                        ))}
                    </Pie>
                    <Tooltip
                        contentStyle={{
                            background: '#fff',
                            border: '1px solid #eee',
                            borderRadius: 10,
                            fontSize: 12,
                        }}
                    />
                </PieChart>
            </ResponsiveContainer>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {data.map((item) => (
                    <div key={item.name} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12 }}>
                        <span
                            style={{
                                width: 8,
                                height: 8,
                                borderRadius: '50%',
                                background: item.color,
                                flexShrink: 0,
                            }}
                        />
                        <span style={{ color: '#6b7280' }}>{item.name}</span>
                        <span style={{ fontWeight: 700, color: '#111827', marginLeft: 'auto' }}>
                            {total > 0 ? Math.round((item.value / total) * 100) : 0}%
                        </span>
                    </div>
                ))}
            </div>
        </div>
    )
}

/* ===== Progress Ring ===== */
interface ProgressRingProps {
    percentage: number
    size?: number
    strokeWidth?: number
    color?: string
    label?: string
}

export function ProgressRing({
    percentage,
    size = 64,
    strokeWidth = 5,
    color = '#6366f1',
    label,
}: ProgressRingProps) {
    const radius = (size - strokeWidth) / 2
    const circumference = 2 * Math.PI * radius
    const offset = circumference - (percentage / 100) * circumference

    return (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
            <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
                <circle
                    cx={size / 2}
                    cy={size / 2}
                    r={radius}
                    fill="none"
                    stroke="#eef0f4"
                    strokeWidth={strokeWidth}
                />
                <circle
                    cx={size / 2}
                    cy={size / 2}
                    r={radius}
                    fill="none"
                    stroke={color}
                    strokeWidth={strokeWidth}
                    strokeLinecap="round"
                    strokeDasharray={circumference}
                    strokeDashoffset={offset}
                    style={{ transition: 'stroke-dashoffset 1s ease' }}
                />
            </svg>
            {label && (
                <span style={{ fontSize: 10, color: '#6b7280', textAlign: 'center' }}>{label}</span>
            )}
        </div>
    )
}
