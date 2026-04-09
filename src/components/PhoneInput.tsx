import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react'

/* ─────────────────────────────────────────────────────────────
   COUNTRY_CODES — Complete world list with emoji flags
   ───────────────────────────────────────────────────────────── */
export const COUNTRY_CODES = [
    { code: '+93', iso: 'AF', flag: '🇦🇫', name: 'Afganistán' },
    { code: '+355', iso: 'AL', flag: '🇦🇱', name: 'Albania' },
    { code: '+49', iso: 'DE', flag: '🇩🇪', name: 'Alemania' },
    { code: '+376', iso: 'AD', flag: '🇦🇩', name: 'Andorra' },
    { code: '+244', iso: 'AO', flag: '🇦🇴', name: 'Angola' },
    { code: '+1268', iso: 'AG', flag: '🇦🇬', name: 'Antigua y Barbuda' },
    { code: '+966', iso: 'SA', flag: '🇸🇦', name: 'Arabia Saudita' },
    { code: '+213', iso: 'DZ', flag: '🇩🇿', name: 'Argelia' },
    { code: '+54', iso: 'AR', flag: '🇦🇷', name: 'Argentina' },
    { code: '+374', iso: 'AM', flag: '🇦🇲', name: 'Armenia' },
    { code: '+61', iso: 'AU', flag: '🇦🇺', name: 'Australia' },
    { code: '+43', iso: 'AT', flag: '🇦🇹', name: 'Austria' },
    { code: '+994', iso: 'AZ', flag: '🇦🇿', name: 'Azerbaiyán' },
    { code: '+1242', iso: 'BS', flag: '🇧🇸', name: 'Bahamas' },
    { code: '+973', iso: 'BH', flag: '🇧🇭', name: 'Baréin' },
    { code: '+880', iso: 'BD', flag: '🇧🇩', name: 'Bangladés' },
    { code: '+1246', iso: 'BB', flag: '🇧🇧', name: 'Barbados' },
    { code: '+32', iso: 'BE', flag: '🇧🇪', name: 'Bélgica' },
    { code: '+501', iso: 'BZ', flag: '🇧🇿', name: 'Belice' },
    { code: '+229', iso: 'BJ', flag: '🇧🇯', name: 'Benín' },
    { code: '+375', iso: 'BY', flag: '🇧🇾', name: 'Bielorrusia' },
    { code: '+591', iso: 'BO', flag: '🇧🇴', name: 'Bolivia' },
    { code: '+387', iso: 'BA', flag: '🇧🇦', name: 'Bosnia y Herzegovina' },
    { code: '+267', iso: 'BW', flag: '🇧🇼', name: 'Botsuana' },
    { code: '+55', iso: 'BR', flag: '🇧🇷', name: 'Brasil' },
    { code: '+673', iso: 'BN', flag: '🇧🇳', name: 'Brunéi' },
    { code: '+359', iso: 'BG', flag: '🇧🇬', name: 'Bulgaria' },
    { code: '+226', iso: 'BF', flag: '🇧🇫', name: 'Burkina Faso' },
    { code: '+257', iso: 'BI', flag: '🇧🇮', name: 'Burundi' },
    { code: '+975', iso: 'BT', flag: '🇧🇹', name: 'Bután' },
    { code: '+238', iso: 'CV', flag: '🇨🇻', name: 'Cabo Verde' },
    { code: '+855', iso: 'KH', flag: '🇰🇭', name: 'Camboya' },
    { code: '+237', iso: 'CM', flag: '🇨🇲', name: 'Camerún' },
    { code: '+1', iso: 'CA', flag: '🇨🇦', name: 'Canadá' },
    { code: '+236', iso: 'CF', flag: '🇨🇫', name: 'R. Centroafricana' },
    { code: '+235', iso: 'TD', flag: '🇹🇩', name: 'Chad' },
    { code: '+56', iso: 'CL', flag: '🇨🇱', name: 'Chile' },
    { code: '+86', iso: 'CN', flag: '🇨🇳', name: 'China' },
    { code: '+357', iso: 'CY', flag: '🇨🇾', name: 'Chipre' },
    { code: '+57', iso: 'CO', flag: '🇨🇴', name: 'Colombia' },
    { code: '+269', iso: 'KM', flag: '🇰🇲', name: 'Comoras' },
    { code: '+242', iso: 'CG', flag: '🇨🇬', name: 'Congo' },
    { code: '+243', iso: 'CD', flag: '🇨🇩', name: 'R.D. Congo' },
    { code: '+82', iso: 'KR', flag: '🇰🇷', name: 'Corea del Sur' },
    { code: '+850', iso: 'KP', flag: '🇰🇵', name: 'Corea del Norte' },
    { code: '+506', iso: 'CR', flag: '🇨🇷', name: 'Costa Rica' },
    { code: '+225', iso: 'CI', flag: '🇨🇮', name: 'Costa de Marfil' },
    { code: '+385', iso: 'HR', flag: '🇭🇷', name: 'Croacia' },
    { code: '+53', iso: 'CU', flag: '🇨🇺', name: 'Cuba' },
    { code: '+45', iso: 'DK', flag: '🇩🇰', name: 'Dinamarca' },
    { code: '+253', iso: 'DJ', flag: '🇩🇯', name: 'Yibuti' },
    { code: '+1767', iso: 'DM', flag: '🇩🇲', name: 'Dominica' },
    { code: '+593', iso: 'EC', flag: '🇪🇨', name: 'Ecuador' },
    { code: '+20', iso: 'EG', flag: '🇪🇬', name: 'Egipto' },
    { code: '+503', iso: 'SV', flag: '🇸🇻', name: 'El Salvador' },
    { code: '+971', iso: 'AE', flag: '🇦🇪', name: 'Emiratos Árabes' },
    { code: '+291', iso: 'ER', flag: '🇪🇷', name: 'Eritrea' },
    { code: '+421', iso: 'SK', flag: '🇸🇰', name: 'Eslovaquia' },
    { code: '+386', iso: 'SI', flag: '🇸🇮', name: 'Eslovenia' },
    { code: '+34', iso: 'ES', flag: '🇪🇸', name: 'España' },
    { code: '+1', iso: 'US', flag: '🇺🇸', name: 'Estados Unidos' },
    { code: '+372', iso: 'EE', flag: '🇪🇪', name: 'Estonia' },
    { code: '+251', iso: 'ET', flag: '🇪🇹', name: 'Etiopía' },
    { code: '+63', iso: 'PH', flag: '🇵🇭', name: 'Filipinas' },
    { code: '+358', iso: 'FI', flag: '🇫🇮', name: 'Finlandia' },
    { code: '+33', iso: 'FR', flag: '🇫🇷', name: 'Francia' },
    { code: '+241', iso: 'GA', flag: '🇬🇦', name: 'Gabón' },
    { code: '+220', iso: 'GM', flag: '🇬🇲', name: 'Gambia' },
    { code: '+995', iso: 'GE', flag: '🇬🇪', name: 'Georgia' },
    { code: '+233', iso: 'GH', flag: '🇬🇭', name: 'Ghana' },
    { code: '+30', iso: 'GR', flag: '🇬🇷', name: 'Grecia' },
    { code: '+1473', iso: 'GD', flag: '🇬🇩', name: 'Granada' },
    { code: '+502', iso: 'GT', flag: '🇬🇹', name: 'Guatemala' },
    { code: '+224', iso: 'GN', flag: '🇬🇳', name: 'Guinea' },
    { code: '+245', iso: 'GW', flag: '🇬🇼', name: 'Guinea-Bisáu' },
    { code: '+240', iso: 'GQ', flag: '🇬🇶', name: 'Guinea Ecuatorial' },
    { code: '+592', iso: 'GY', flag: '🇬🇾', name: 'Guyana' },
    { code: '+509', iso: 'HT', flag: '🇭🇹', name: 'Haití' },
    { code: '+504', iso: 'HN', flag: '🇭🇳', name: 'Honduras' },
    { code: '+852', iso: 'HK', flag: '🇭🇰', name: 'Hong Kong' },
    { code: '+36', iso: 'HU', flag: '🇭🇺', name: 'Hungría' },
    { code: '+91', iso: 'IN', flag: '🇮🇳', name: 'India' },
    { code: '+62', iso: 'ID', flag: '🇮🇩', name: 'Indonesia' },
    { code: '+964', iso: 'IQ', flag: '🇮🇶', name: 'Irak' },
    { code: '+98', iso: 'IR', flag: '🇮🇷', name: 'Irán' },
    { code: '+353', iso: 'IE', flag: '🇮🇪', name: 'Irlanda' },
    { code: '+354', iso: 'IS', flag: '🇮🇸', name: 'Islandia' },
    { code: '+972', iso: 'IL', flag: '🇮🇱', name: 'Israel' },
    { code: '+39', iso: 'IT', flag: '🇮🇹', name: 'Italia' },
    { code: '+1876', iso: 'JM', flag: '🇯🇲', name: 'Jamaica' },
    { code: '+81', iso: 'JP', flag: '🇯🇵', name: 'Japón' },
    { code: '+962', iso: 'JO', flag: '🇯🇴', name: 'Jordania' },
    { code: '+7', iso: 'KZ', flag: '🇰🇿', name: 'Kazajistán' },
    { code: '+254', iso: 'KE', flag: '🇰🇪', name: 'Kenia' },
    { code: '+996', iso: 'KG', flag: '🇰🇬', name: 'Kirguistán' },
    { code: '+965', iso: 'KW', flag: '🇰🇼', name: 'Kuwait' },
    { code: '+856', iso: 'LA', flag: '🇱🇦', name: 'Laos' },
    { code: '+371', iso: 'LV', flag: '🇱🇻', name: 'Letonia' },
    { code: '+961', iso: 'LB', flag: '🇱🇧', name: 'Líbano' },
    { code: '+266', iso: 'LS', flag: '🇱🇸', name: 'Lesoto' },
    { code: '+231', iso: 'LR', flag: '🇱🇷', name: 'Liberia' },
    { code: '+218', iso: 'LY', flag: '🇱🇾', name: 'Libia' },
    { code: '+423', iso: 'LI', flag: '🇱🇮', name: 'Liechtenstein' },
    { code: '+370', iso: 'LT', flag: '🇱🇹', name: 'Lituania' },
    { code: '+352', iso: 'LU', flag: '🇱🇺', name: 'Luxemburgo' },
    { code: '+389', iso: 'MK', flag: '🇲🇰', name: 'Macedonia del N.' },
    { code: '+261', iso: 'MG', flag: '🇲🇬', name: 'Madagascar' },
    { code: '+60', iso: 'MY', flag: '🇲🇾', name: 'Malasia' },
    { code: '+265', iso: 'MW', flag: '🇲🇼', name: 'Malaui' },
    { code: '+960', iso: 'MV', flag: '🇲🇻', name: 'Maldivas' },
    { code: '+223', iso: 'ML', flag: '🇲🇱', name: 'Malí' },
    { code: '+356', iso: 'MT', flag: '🇲🇹', name: 'Malta' },
    { code: '+212', iso: 'MA', flag: '🇲🇦', name: 'Marruecos' },
    { code: '+230', iso: 'MU', flag: '🇲🇺', name: 'Mauricio' },
    { code: '+222', iso: 'MR', flag: '🇲🇷', name: 'Mauritania' },
    { code: '+52', iso: 'MX', flag: '🇲🇽', name: 'México' },
    { code: '+373', iso: 'MD', flag: '🇲🇩', name: 'Moldavia' },
    { code: '+377', iso: 'MC', flag: '🇲🇨', name: 'Mónaco' },
    { code: '+976', iso: 'MN', flag: '🇲🇳', name: 'Mongolia' },
    { code: '+382', iso: 'ME', flag: '🇲🇪', name: 'Montenegro' },
    { code: '+258', iso: 'MZ', flag: '🇲🇿', name: 'Mozambique' },
    { code: '+95', iso: 'MM', flag: '🇲🇲', name: 'Myanmar' },
    { code: '+264', iso: 'NA', flag: '🇳🇦', name: 'Namibia' },
    { code: '+977', iso: 'NP', flag: '🇳🇵', name: 'Nepal' },
    { code: '+505', iso: 'NI', flag: '🇳🇮', name: 'Nicaragua' },
    { code: '+227', iso: 'NE', flag: '🇳🇪', name: 'Níger' },
    { code: '+234', iso: 'NG', flag: '🇳🇬', name: 'Nigeria' },
    { code: '+47', iso: 'NO', flag: '🇳🇴', name: 'Noruega' },
    { code: '+64', iso: 'NZ', flag: '🇳🇿', name: 'Nueva Zelanda' },
    { code: '+968', iso: 'OM', flag: '🇴🇲', name: 'Omán' },
    { code: '+31', iso: 'NL', flag: '🇳🇱', name: 'Países Bajos' },
    { code: '+92', iso: 'PK', flag: '🇵🇰', name: 'Pakistán' },
    { code: '+507', iso: 'PA', flag: '🇵🇦', name: 'Panamá' },
    { code: '+675', iso: 'PG', flag: '🇵🇬', name: 'Papúa Nueva Guinea' },
    { code: '+595', iso: 'PY', flag: '🇵🇾', name: 'Paraguay' },
    { code: '+51', iso: 'PE', flag: '🇵🇪', name: 'Perú' },
    { code: '+48', iso: 'PL', flag: '🇵🇱', name: 'Polonia' },
    { code: '+351', iso: 'PT', flag: '🇵🇹', name: 'Portugal' },
    { code: '+974', iso: 'QA', flag: '🇶🇦', name: 'Catar' },
    { code: '+44', iso: 'GB', flag: '🇬🇧', name: 'Reino Unido' },
    { code: '+420', iso: 'CZ', flag: '🇨🇿', name: 'Chequia' },
    { code: '+1809', iso: 'DO', flag: '🇩🇴', name: 'Rep. Dominicana' },
    { code: '+40', iso: 'RO', flag: '🇷🇴', name: 'Rumanía' },
    { code: '+7', iso: 'RU', flag: '🇷🇺', name: 'Rusia' },
    { code: '+250', iso: 'RW', flag: '🇷🇼', name: 'Ruanda' },
    { code: '+685', iso: 'WS', flag: '🇼🇸', name: 'Samoa' },
    { code: '+221', iso: 'SN', flag: '🇸🇳', name: 'Senegal' },
    { code: '+381', iso: 'RS', flag: '🇷🇸', name: 'Serbia' },
    { code: '+232', iso: 'SL', flag: '🇸🇱', name: 'Sierra Leona' },
    { code: '+65', iso: 'SG', flag: '🇸🇬', name: 'Singapur' },
    { code: '+963', iso: 'SY', flag: '🇸🇾', name: 'Siria' },
    { code: '+252', iso: 'SO', flag: '🇸🇴', name: 'Somalia' },
    { code: '+94', iso: 'LK', flag: '🇱🇰', name: 'Sri Lanka' },
    { code: '+27', iso: 'ZA', flag: '🇿🇦', name: 'Sudáfrica' },
    { code: '+249', iso: 'SD', flag: '🇸🇩', name: 'Sudán' },
    { code: '+46', iso: 'SE', flag: '🇸🇪', name: 'Suecia' },
    { code: '+41', iso: 'CH', flag: '🇨🇭', name: 'Suiza' },
    { code: '+597', iso: 'SR', flag: '🇸🇷', name: 'Surinam' },
    { code: '+66', iso: 'TH', flag: '🇹🇭', name: 'Tailandia' },
    { code: '+255', iso: 'TZ', flag: '🇹🇿', name: 'Tanzania' },
    { code: '+992', iso: 'TJ', flag: '🇹🇯', name: 'Tayikistán' },
    { code: '+228', iso: 'TG', flag: '🇹🇬', name: 'Togo' },
    { code: '+1868', iso: 'TT', flag: '🇹🇹', name: 'Trinidad y Tobago' },
    { code: '+216', iso: 'TN', flag: '🇹🇳', name: 'Túnez' },
    { code: '+993', iso: 'TM', flag: '🇹🇲', name: 'Turkmenistán' },
    { code: '+90', iso: 'TR', flag: '🇹🇷', name: 'Turquía' },
    { code: '+380', iso: 'UA', flag: '🇺🇦', name: 'Ucrania' },
    { code: '+256', iso: 'UG', flag: '🇺🇬', name: 'Uganda' },
    { code: '+598', iso: 'UY', flag: '🇺🇾', name: 'Uruguay' },
    { code: '+998', iso: 'UZ', flag: '🇺🇿', name: 'Uzbekistán' },
    { code: '+58', iso: 'VE', flag: '🇻🇪', name: 'Venezuela' },
    { code: '+84', iso: 'VN', flag: '🇻🇳', name: 'Vietnam' },
    { code: '+967', iso: 'YE', flag: '🇾🇪', name: 'Yemen' },
    { code: '+260', iso: 'ZM', flag: '🇿🇲', name: 'Zambia' },
    { code: '+263', iso: 'ZW', flag: '🇿🇼', name: 'Zimbabue' },
]

/* ─────────────────────────────────────────────────────────────
   Helpers
   ───────────────────────────────────────────────────────────── */
export function parsePhone(stored: string | null | undefined): { code: string; number: string } {
    if (!stored) return { code: '+57', number: '' }
    const trimmed = stored.trim()
    const match = trimmed.match(/^(\+\d{1,4})\s*(.*)/)
    if (match) return { code: match[1], number: match[2] }
    return { code: '+57', number: trimmed }
}

export function combinePhone(code: string, number: string): string {
    const clean = number.replace(/[^0-9]/g, '')
    return clean ? `${code} ${clean}` : ''
}

/* ─────────────────────────────────────────────────────────────
   LATAM-first sorted list
   ───────────────────────────────────────────────────────────── */
const LATAM_ISO = new Set([
    'CO', 'MX', 'US', 'AR', 'CL', 'PE', 'ES', 'EC', 'PA', 'CR',
    'VE', 'BR', 'GT', 'SV', 'HN', 'NI', 'CU', 'BO', 'PY', 'UY',
    'DO', 'CA',
])

const SORTED_CODES = [
    ...COUNTRY_CODES.filter(c => LATAM_ISO.has(c.iso)),
    ...COUNTRY_CODES.filter(c => !LATAM_ISO.has(c.iso)),
]

/* ─────────────────────────────────────────────────────────────
   Searchable Country Code Dropdown
   ───────────────────────────────────────────────────────────── */
const CountryCodeDropdown: React.FC<{
    value: string
    onChange: (code: string) => void
    size: 'sm' | 'md'
}> = ({ value, onChange, size }) => {
    const [open, setOpen] = useState(false)
    const [search, setSearch] = useState('')
    const containerRef = useRef<HTMLDivElement>(null)
    const searchInputRef = useRef<HTMLInputElement>(null)

    const selectedCountry = COUNTRY_CODES.find(c => c.code === value)

    // Strip accents for search: "peru" matches "Perú"
    const normalize = (s: string) => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()

    // Filter countries by search query
    const filtered = useMemo(() => {
        if (!search.trim()) return SORTED_CODES
        const q = normalize(search.replace('+', ''))
        return SORTED_CODES.filter(c =>
            normalize(c.name).includes(q) ||
            c.code.replace('+', '').includes(q) ||
            c.iso.toLowerCase().includes(q)
        )
    }, [search])

    // Close on outside click
    useEffect(() => {
        if (!open) return
        const handleClick = (e: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
                setOpen(false)
                setSearch('')
            }
        }
        document.addEventListener('mousedown', handleClick)
        return () => document.removeEventListener('mousedown', handleClick)
    }, [open])

    // Focus search input when dropdown opens
    useEffect(() => {
        if (open) setTimeout(() => searchInputRef.current?.focus(), 50)
    }, [open])

    const handleSelect = useCallback((code: string) => {
        onChange(code)
        setOpen(false)
        setSearch('')
    }, [onChange])

    const btnCls = size === 'sm' ? 'py-1.5 text-xs' : 'py-2 text-sm'

    return (
        <div ref={containerRef} className="relative shrink-0">
            {/* Trigger Button */}
            <button
                type="button"
                onClick={() => setOpen(!open)}
                className={`flex items-center gap-1.5 px-2.5 ${btnCls} bg-gray-50 border border-gray-200 rounded-xl hover:border-gray-300 focus:ring-2 focus:ring-clinical-500 outline-none transition-all cursor-pointer w-[110px]`}
            >
                <span className="text-base leading-none">{selectedCountry?.flag || '🌐'}</span>
                <span className="font-medium text-gray-800">{value}</span>
                <svg className={`w-3 h-3 ml-auto text-gray-400 transition-transform ${open ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                </svg>
            </button>

            {/* Dropdown */}
            {open && (
                <div className="absolute top-full left-0 mt-1 w-[260px] bg-white border border-gray-200 rounded-xl shadow-xl z-50 overflow-hidden animate-in fade-in slide-in-from-top-1 duration-150">
                    {/* Search Input */}
                    <div className="p-2 border-b border-gray-100">
                        <input
                            ref={searchInputRef}
                            type="text"
                            placeholder="Buscar país o código..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="w-full px-3 py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-clinical-500 outline-none placeholder:text-gray-400"
                        />
                    </div>

                    {/* List — max 5 visible rows */}
                    <div className="max-h-[200px] overflow-y-auto">
                        {filtered.length === 0 ? (
                            <div className="px-4 py-3 text-xs text-gray-400 text-center">Sin resultados</div>
                        ) : (
                            filtered.map(c => (
                                <button
                                    key={c.iso}
                                    type="button"
                                    onClick={() => handleSelect(c.code)}
                                    className={`w-full flex items-center gap-2.5 px-3 py-2 text-sm hover:bg-clinical-50 transition-colors text-left ${c.code === value ? 'bg-clinical-50/60 font-semibold' : ''}`}
                                >
                                    <span className="text-base leading-none shrink-0">{c.flag}</span>
                                    <span className="text-gray-800 truncate flex-1">{c.name}</span>
                                    <span className="text-gray-400 text-xs font-mono shrink-0">{c.code}</span>
                                </button>
                            ))
                        )}
                    </div>
                </div>
            )}
        </div>
    )
}

/* ─────────────────────────────────────────────────────────────
   PhoneInput Component
   ───────────────────────────────────────────────────────────── */
interface PhoneInputProps {
    value: string           // stored as "+57 3001234567"
    onChange: (combined: string) => void
    onBlur?: (combined: string) => void
    label?: string
    placeholder?: string
    size?: 'sm' | 'md'
    className?: string
    id?: string
}

export const PhoneInput: React.FC<PhoneInputProps> = ({
    value,
    onChange,
    onBlur,
    label,
    placeholder = '3001234567',
    size = 'md',
    className = '',
    id,
}) => {
    const parsed = useMemo(() => parsePhone(value), [value])
    const [code, setCode] = useState(parsed.code)
    const [number, setNumber] = useState(parsed.number)

    useEffect(() => {
        const p = parsePhone(value)
        setCode(p.code)
        setNumber(p.number)
    }, [value])

    const handleCodeChange = (newCode: string) => {
        setCode(newCode)
        const combined = combinePhone(newCode, number)
        onChange(combined)
        onBlur?.(combined)
    }

    const handleNumberChange = (raw: string) => {
        const clean = raw.replace(/[^0-9]/g, '')
        setNumber(clean)
        onChange(combinePhone(code, clean))
    }

    const inputCls = size === 'sm' ? 'px-3 py-1.5 text-sm' : 'px-4 py-2 text-sm'

    return (
        <div className={className}>
            {label && (
                <label htmlFor={id} className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">
                    {label}
                </label>
            )}
            <div className="flex gap-1.5">
                <CountryCodeDropdown value={code} onChange={handleCodeChange} size={size} />
                <input
                    id={id}
                    type="tel"
                    inputMode="numeric"
                    value={number}
                    onChange={(e) => handleNumberChange(e.target.value)}
                    onBlur={() => onBlur?.(combinePhone(code, number))}
                    className={`flex-1 min-w-0 bg-gray-50 border border-gray-200 text-gray-900 rounded-xl focus:ring-2 focus:ring-clinical-500 focus:border-transparent outline-none transition-all ${inputCls}`}
                    placeholder={placeholder}
                />
            </div>
        </div>
    )
}
