"use client";

import {
  Radar,
  RadarChart as RechartsRadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
} from "recharts";
import type { MotionDnaRadarPoint } from "@/lib/dashboard/motion-dna";

const ROSE_GOLD = "#FDA4AF";

export interface MotionDNAChartProps {
  data: MotionDnaRadarPoint[];
}

export function MotionDNAChart({ data }: MotionDNAChartProps) {
  const chartData = data.map((d) => ({
    subject: d.axis,
    value: d.value,
    fullMark: d.fullMark,
  }));

  return (
    <div className="h-[260px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <RechartsRadarChart
          cx="50%"
          cy="50%"
          outerRadius="70%"
          data={chartData}
          margin={{ top: 16, right: 16, left: 16, bottom: 16 }}
        >
          <PolarGrid
            stroke="rgba(255,255,255,0.2)"
            strokeWidth={0.5}
            gridType="polygon"
          />
          <PolarAngleAxis
            dataKey="subject"
            tick={{ fill: "rgba(255,255,255,0.7)", fontSize: 11 }}
            tickLine={false}
          />
          <PolarRadiusAxis
            angle={90}
            domain={[0, 100]}
            tick={{ fill: "rgba(255,255,255,0.4)", fontSize: 10 }}
            tickCount={4}
            axisLine={false}
          />
          <Radar
            name="Motion DNA"
            dataKey="value"
            stroke={ROSE_GOLD}
            fill={ROSE_GOLD}
            fillOpacity={0.15}
            strokeWidth={2}
          />
        </RechartsRadarChart>
      </ResponsiveContainer>
    </div>
  );
}
