'use client';

import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer, Tooltip } from 'recharts';

interface ScoreChartProps {
    executionFit: number;
    founderConfidence: number;
    relevance: number;
    metrics?: {
        S?: number;
        D?: number;
        W?: number;
        R?: number;
        O?: number;
        L?: number;
        P?: number;
        G?: number;
    };
}

export function ScoreChart({ executionFit, founderConfidence, relevance, metrics }: ScoreChartProps) {
    const mainData = [
        { subject: 'Relevance', value: relevance, fullMark: 100 },
        { subject: 'Execution Fit', value: executionFit, fullMark: 100 },
        { subject: 'Founder Confidence', value: founderConfidence, fullMark: 100 },
    ];

    const detailedData = metrics ? [
        { subject: 'Skills (S)', value: (metrics.S || 0) * 100, fullMark: 100 },
        { subject: 'Depth (D)', value: (metrics.D || 0) * 100, fullMark: 100 },
        { subject: 'Work Sim (W)', value: (metrics.W || 0) * 100, fullMark: 100 },
        { subject: 'Risk (R)', value: 100 - (metrics.R || 0) * 100, fullMark: 100 },
        { subject: 'Ownership (O)', value: (metrics.O || 0) * 100, fullMark: 100 },
        { subject: 'Longevity (L)', value: (metrics.L || 0) * 100, fullMark: 100 },
        { subject: 'Pressure (P)', value: (metrics.P || 0) * 100, fullMark: 100 },
        { subject: 'Growth (G)', value: (metrics.G || 0) * 100, fullMark: 100 },
    ] : null;

    return (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Main Scores */}
            <div className="bg-gray-900/50 backdrop-blur-xl rounded-2xl border border-gray-800 p-6">
                <h3 className="text-lg font-semibold text-white mb-4">Overall Scores</h3>
                <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                        <RadarChart data={mainData}>
                            <PolarGrid stroke="#374151" />
                            <PolarAngleAxis dataKey="subject" tick={{ fill: '#9CA3AF', fontSize: 12 }} />
                            <PolarRadiusAxis angle={90} domain={[0, 100]} tick={{ fill: '#9CA3AF' }} />
                            <Radar
                                name="Score"
                                dataKey="value"
                                stroke="#8B5CF6"
                                fill="#8B5CF6"
                                fillOpacity={0.4}
                                strokeWidth={2}
                            />
                            <Tooltip
                                contentStyle={{
                                    backgroundColor: '#1F2937',
                                    border: '1px solid #374151',
                                    borderRadius: '8px',
                                    color: '#fff'
                                }}
                            />
                        </RadarChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* Detailed Metrics */}
            {detailedData && (
                <div className="bg-gray-900/50 backdrop-blur-xl rounded-2xl border border-gray-800 p-6">
                    <h3 className="text-lg font-semibold text-white mb-4">Detailed Metrics</h3>
                    <div className="h-64">
                        <ResponsiveContainer width="100%" height="100%">
                            <RadarChart data={detailedData}>
                                <PolarGrid stroke="#374151" />
                                <PolarAngleAxis dataKey="subject" tick={{ fill: '#9CA3AF', fontSize: 10 }} />
                                <PolarRadiusAxis angle={90} domain={[0, 100]} tick={{ fill: '#9CA3AF' }} />
                                <Radar
                                    name="Metric"
                                    dataKey="value"
                                    stroke="#10B981"
                                    fill="#10B981"
                                    fillOpacity={0.4}
                                    strokeWidth={2}
                                />
                                <Tooltip
                                    contentStyle={{
                                        backgroundColor: '#1F2937',
                                        border: '1px solid #374151',
                                        borderRadius: '8px',
                                        color: '#fff'
                                    }}
                                />
                            </RadarChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            )}
        </div>
    );
}
