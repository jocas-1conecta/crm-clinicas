/**
 * Extract the tenant slug from the current subdomain.
 * 
 * clinicademo.1clc.app  → "clinicademo"
 * 1clc.app              → null  (Platform Owner / landing)
 * localhost:5173         → null  (development)
 * 
 * For local development, you can test subdomains by adding to /etc/hosts:
 *   127.0.0.1  clinicademo.localhost
 * Then access: http://clinicademo.localhost:5173
 */

const BASE_DOMAINS = ['1clc.app', 'localhost', '127.0.0.1', 'pages.dev']

export function getTenantSlug(): string | null {
    const hostname = window.location.hostname

    // Development: localhost or IP
    if (hostname === 'localhost' || hostname === '127.0.0.1') return null

    // Check for subdomain.localhost (local testing)
    if (hostname.endsWith('.localhost')) {
        return hostname.split('.')[0]
    }

    // Production: check if it's a subdomain of a known base domain
    for (const base of BASE_DOMAINS) {
        if (hostname === base) return null  // exact match = no tenant
        if (hostname.endsWith(`.${base}`)) {
            const sub = hostname.replace(`.${base}`, '')
            // Ignore 'www' as a tenant
            if (sub === 'www') return null
            return sub
        }
    }

    return null
}

/**
 * Build the full URL for a specific tenant's subdomain.
 * Used for cross-domain redirects (e.g., after login or onboarding).
 * 
 * buildTenantUrl('clinicademo', '/dashboard')
 *   → "https://clinicademo.1clc.app/dashboard"
 */
export function buildTenantUrl(slug: string, path: string = '/'): string {
    const hostname = window.location.hostname

    // Local dev
    if (hostname === 'localhost' || hostname === '127.0.0.1') {
        return `http://${slug}.localhost:${window.location.port}${path}`
    }

    // Production: find the base domain
    for (const base of BASE_DOMAINS) {
        if (hostname === base || hostname.endsWith(`.${base}`)) {
            return `https://${slug}.${base}${path}`
        }
    }

    // Fallback
    return `https://${slug}.1clc.app${path}`
}

/**
 * Build the URL for the main platform (no tenant).
 * Used for Platform Owner access.
 */
export function buildPlatformUrl(path: string = '/'): string {
    const hostname = window.location.hostname

    if (hostname === 'localhost' || hostname === '127.0.0.1') {
        return `http://localhost:${window.location.port}${path}`
    }

    return `https://1clc.app${path}`
}
