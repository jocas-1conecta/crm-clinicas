import React, { useEffect, useState } from 'react'
import { buildTenantUrl } from '../../utils/getTenantSlug'

interface SlugRedirectPageProps {
    newSlug: string
}

export const SlugRedirectPage: React.FC<SlugRedirectPageProps> = ({ newSlug }) => {
    const [progress, setProgress] = useState(0)
    const REDIRECT_DELAY = 5000

    useEffect(() => {
        const startTime = Date.now()
        const interval = setInterval(() => {
            const elapsed = Date.now() - startTime
            const pct = Math.min((elapsed / REDIRECT_DELAY) * 100, 100)
            setProgress(pct)

            if (elapsed >= REDIRECT_DELAY) {
                clearInterval(interval)
                window.location.href = buildTenantUrl(newSlug, '/login')
            }
        }, 50)

        return () => clearInterval(interval)
    }, [newSlug])

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 flex flex-col items-center justify-center p-6 relative overflow-hidden">
            {/* Floating orbs background */}
            <div className="absolute inset-0 pointer-events-none">
                <div className="absolute top-1/4 left-1/4 w-72 h-72 bg-indigo-500/10 rounded-full blur-3xl animate-pulse" />
                <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-violet-500/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-cyan-500/5 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '2s' }} />
            </div>

            {/* Content */}
            <div className="relative z-10 flex flex-col items-center text-center max-w-lg">

                {/* Animated SVG */}
                <div className="mb-10">
                    <svg width="120" height="120" viewBox="0 0 120 120" className="drop-shadow-2xl">
                        {/* Outer rotating ring */}
                        <circle cx="60" cy="60" r="54" fill="none" stroke="rgba(99,102,241,0.15)" strokeWidth="2" />
                        <circle cx="60" cy="60" r="54" fill="none" stroke="url(#ringGradient)" strokeWidth="3" strokeLinecap="round" strokeDasharray="80 260">
                            <animateTransform attributeName="transform" type="rotate" from="0 60 60" to="360 60 60" dur="3s" repeatCount="indefinite" />
                        </circle>

                        {/* Inner pulsing circle */}
                        <circle cx="60" cy="60" r="38" fill="rgba(99,102,241,0.08)">
                            <animate attributeName="r" values="36;40;36" dur="2s" repeatCount="indefinite" />
                            <animate attributeName="opacity" values="0.6;1;0.6" dur="2s" repeatCount="indefinite" />
                        </circle>

                        {/* Arrow icon — pointing right then morphing to check */}
                        <g transform="translate(60, 60)">
                            {/* Building/office icon */}
                            <rect x="-12" y="-14" width="24" height="28" rx="3" fill="none" stroke="white" strokeWidth="2" opacity="0.9">
                                <animate attributeName="opacity" values="0.7;1;0.7" dur="2s" repeatCount="indefinite" />
                            </rect>
                            {/* Windows */}
                            <rect x="-7" y="-9" width="5" height="5" rx="1" fill="rgba(165,180,252,0.8)">
                                <animate attributeName="fill" values="rgba(165,180,252,0.5);rgba(165,180,252,1);rgba(165,180,252,0.5)" dur="1.5s" repeatCount="indefinite" />
                            </rect>
                            <rect x="2" y="-9" width="5" height="5" rx="1" fill="rgba(165,180,252,0.8)">
                                <animate attributeName="fill" values="rgba(165,180,252,0.5);rgba(165,180,252,1);rgba(165,180,252,0.5)" dur="1.5s" begin="0.3s" repeatCount="indefinite" />
                            </rect>
                            <rect x="-7" y="0" width="5" height="5" rx="1" fill="rgba(165,180,252,0.8)">
                                <animate attributeName="fill" values="rgba(165,180,252,0.5);rgba(165,180,252,1);rgba(165,180,252,0.5)" dur="1.5s" begin="0.6s" repeatCount="indefinite" />
                            </rect>
                            <rect x="2" y="0" width="5" height="5" rx="1" fill="rgba(165,180,252,0.8)">
                                <animate attributeName="fill" values="rgba(165,180,252,0.5);rgba(165,180,252,1);rgba(165,180,252,0.5)" dur="1.5s" begin="0.9s" repeatCount="indefinite" />
                            </rect>
                            {/* Door */}
                            <rect x="-3" y="7" width="6" height="7" rx="1" fill="rgba(199,210,254,0.6)" />
                        </g>

                        {/* Second outer ring, counter-rotating */}
                        <circle cx="60" cy="60" r="48" fill="none" stroke="url(#ringGradient2)" strokeWidth="1.5" strokeLinecap="round" strokeDasharray="30 270">
                            <animateTransform attributeName="transform" type="rotate" from="360 60 60" to="0 60 60" dur="4s" repeatCount="indefinite" />
                        </circle>

                        <defs>
                            <linearGradient id="ringGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                                <stop offset="0%" stopColor="#818cf8" />
                                <stop offset="100%" stopColor="#6366f1" />
                            </linearGradient>
                            <linearGradient id="ringGradient2" x1="0%" y1="0%" x2="100%" y2="100%">
                                <stop offset="0%" stopColor="#a78bfa" />
                                <stop offset="100%" stopColor="#7c3aed" />
                            </linearGradient>
                        </defs>
                    </svg>
                </div>

                {/* Title */}
                <h1 className="text-3xl md:text-4xl font-bold text-white mb-4 tracking-tight leading-tight">
                    Tu espacio de trabajo <br />se ha actualizado
                </h1>

                {/* Description */}
                <p className="text-indigo-200/80 text-base md:text-lg leading-relaxed mb-3 max-w-md">
                    El administrador de tu empresa ha cambiado la dirección URL del espacio de trabajo.
                </p>

                {/* New URL pill */}
                <div className="bg-white/10 backdrop-blur-md border border-white/10 rounded-xl px-5 py-3 mb-8 inline-flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                    <span className="text-white/90 font-medium text-sm">
                        Nueva dirección: <span className="text-indigo-300 font-bold">{newSlug}.1clc.app</span>
                    </span>
                </div>

                <p className="text-indigo-300/60 text-sm mb-6">
                    En breves momentos te redirigiremos a tu nuevo espacio de trabajo...
                </p>

                {/* Progress bar */}
                <div className="w-64 h-1.5 bg-white/10 rounded-full overflow-hidden">
                    <div
                        className="h-full bg-gradient-to-r from-indigo-500 to-violet-500 rounded-full transition-all duration-100 ease-linear"
                        style={{ width: `${progress}%` }}
                    />
                </div>
            </div>
        </div>
    )
}
