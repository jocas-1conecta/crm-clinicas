/**
 * Generates a 10-shade color palette from a single hex color and applies
 * them as CSS variables (--clinical-50 through --clinical-900) on :root.
 */

function hexToHSL(hex: string): { h: number; s: number; l: number } {
    const r = parseInt(hex.slice(1, 3), 16) / 255
    const g = parseInt(hex.slice(3, 5), 16) / 255
    const b = parseInt(hex.slice(5, 7), 16) / 255

    const max = Math.max(r, g, b), min = Math.min(r, g, b)
    let h = 0, s = 0
    const l = (max + min) / 2

    if (max !== min) {
        const d = max - min
        s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
        switch (max) {
            case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break
            case g: h = ((b - r) / d + 2) / 6; break
            case b: h = ((r - g) / d + 4) / 6; break
        }
    }

    return { h: Math.round(h * 360), s: Math.round(s * 100), l: Math.round(l * 100) }
}

function hslToHex(h: number, s: number, l: number): string {
    s /= 100
    l /= 100
    const a = s * Math.min(l, 1 - l)
    const f = (n: number) => {
        const k = (n + h / 30) % 12
        const color = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1)
        return Math.round(255 * color).toString(16).padStart(2, '0')
    }
    return `#${f(0)}${f(8)}${f(4)}`
}

// Shade definitions: Tailwind-like lightness progression
const shadeConfig: { shade: number; lightness: number }[] = [
    { shade: 50,  lightness: 96 },
    { shade: 100, lightness: 90 },
    { shade: 200, lightness: 80 },
    { shade: 300, lightness: 65 },
    { shade: 400, lightness: 50 },
    { shade: 500, lightness: 43 },
    { shade: 600, lightness: 35 },
    { shade: 700, lightness: 28 },
    { shade: 800, lightness: 22 },
    { shade: 900, lightness: 18 },
]

export function applyBrandColor(hex: string): void {
    if (!hex || !hex.match(/^#[0-9a-fA-F]{6}$/)) return
    
    const { h, s } = hexToHSL(hex)
    const root = document.documentElement

    shadeConfig.forEach(({ shade, lightness }) => {
        // Reduce saturation for very light/dark shades for a more natural palette
        let adjSat = s
        if (lightness > 85) adjSat = Math.max(20, s * 0.5)
        else if (lightness > 70) adjSat = Math.max(30, s * 0.7)
        
        const color = hslToHex(h, adjSat, lightness)
        root.style.setProperty(`--clinical-${shade}`, color)
    })
}

export function clearBrandColor(): void {
    const root = document.documentElement
    shadeConfig.forEach(({ shade }) => {
        root.style.removeProperty(`--clinical-${shade}`)
    })
}
