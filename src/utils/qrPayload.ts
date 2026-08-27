/**
 * Utility for parsing and extracting HRMS QR Code payloads.
 * Ensures 100% parity with the working PWA implementation.
 */

export interface QrParseResult {
    isValid: boolean;
    payload: string | null;
    isBranchQr?: boolean;
    error?: string;
}

export interface BranchQrParseResult {
    isValid: boolean;
    branchCode: string | null;
    payload?: string | null;
    signature?: string;
    isPersonalBadge?: boolean;
    error?: string;
}

/**
 * Extracts the base64-encoded employee_login payload from various scanned QR formats:
 * 1. Full URL: https://crm.domain.com/employee/login?payload=<base64>
 * 2. Query string: ?payload=<base64> or payload=<base64>
 * 3. Raw base64 JSON payload string
 */
export function extractEmployeeQrPayload(rawScannedText: string): QrParseResult {
    if (!rawScannedText || typeof rawScannedText !== 'string') {
        return {
            isValid: false,
            payload: null,
            error: 'Empty or invalid QR code data.',
        };
    }

    const trimmed = rawScannedText.trim();

    // 1. Check if the user accidentally scanned a Branch Attendance QR instead of Personal Auth QR
    // Branch QRs typically contain 'branch_code=', 'p=', 's=', or short alphanumeric codes
    if (trimmed.includes('branch_code=') || (trimmed.includes('s=') && !trimmed.includes('payload='))) {
        return {
            isValid: false,
            payload: null,
            isBranchQr: true,
            error: 'This is a Branch Attendance QR Code. Please scan your Personal Employee Badge QR to log in.',
        };
    }

    // 2. Extract from Full URL (e.g. https://domain.com/employee/login?payload=...)
    if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
        try {
            const url = new URL(trimmed);
            const payloadParam = url.searchParams.get('payload');
            if (payloadParam) {
                return { isValid: true, payload: payloadParam };
            }
        } catch {
            // Regex fallback for malformed URLs
            const match = trimmed.match(/[?&]payload=([^&]+)/);
            if (match && match[1]) {
                return { isValid: true, payload: decodeURIComponent(match[1]) };
            }
        }
    }

    // 3. Extract from Query parameter substring
    if (trimmed.includes('payload=')) {
        const afterPayload = trimmed.split('payload=')[1];
        const cleanPayload = afterPayload ? afterPayload.split('&')[0] : null;
        if (cleanPayload) {
            return { isValid: true, payload: decodeURIComponent(cleanPayload) };
        }
    }

    // 4. Raw base64 string (direct payload)
    // Valid base64 strings usually do not contain spaces or URL slashes
    if (trimmed.length > 20 && !trimmed.includes(' ') && !trimmed.includes('/')) {
        return { isValid: true, payload: trimmed };
    }

    // 5. If it looks like base64 despite slashes (standard base64 may contain + / =)
    // Check if it starts with standard base64 for '{"type":' -> 'eyJ0eXBl'
    if (trimmed.startsWith('eyJ')) {
        return { isValid: true, payload: trimmed };
    }

    return {
        isValid: false,
        payload: null,
        error: 'Unrecognized QR code format. Please scan a valid Employee Personal QR badge.',
    };
}

/**
 * Extracts Branch Code & Signature from physical attendance QR formats:
 * 1. Raw Alphanumeric Branch Code: "HQ-MAIN", "PNH-01"
 * 2. URL Format: https://crm.domain.com/attendance/scan?b=HQ-MAIN&s=STATIC
 * 3. Query string: ?p=<signed_payload>&s=<signature> or branch_code=HQ-MAIN&s=STATIC
 */
export function extractBranchQrPayload(rawScannedText: string): BranchQrParseResult {
    if (!rawScannedText || typeof rawScannedText !== 'string') {
        return {
            isValid: false,
            branchCode: null,
            error: 'Empty or invalid QR code data.',
        };
    }

    const trimmed = rawScannedText.trim();

    // 1. Check if user scanned an Employee Personal Badge QR instead of Branch QR
    if (
        trimmed.includes('employee_login') ||
        trimmed.includes('employee/login') ||
        (trimmed.startsWith('eyJ') && trimmed.includes('employee_code'))
    ) {
        return {
            isValid: false,
            branchCode: null,
            isPersonalBadge: true,
            error: 'This is an Employee Identity badge. Please scan the physical Branch QR code to record attendance.',
        };
    }

    // 2. Full URL or Query string (e.g., https://domain.com/attendance/scan?b=HQ-MAIN&s=STATIC)
    if (
        trimmed.includes('://') ||
        trimmed.includes('?') ||
        trimmed.includes('branch_code=') ||
        trimmed.includes('p=') ||
        trimmed.includes('b=')
    ) {
        try {
            const urlString = trimmed.includes('://') ? trimmed : `https://dummy.com?${trimmed}`;
            const url = new URL(urlString);
            const params = new URLSearchParams(url.search);

            const p = params.get('p') || params.get('payload');
            const b = params.get('b') || params.get('branch_code');
            const s = params.get('s') || params.get('signature') || 'STATIC';

            if (p) {
                return {
                    isValid: true,
                    branchCode: b || null,
                    payload: p,
                    signature: s,
                };
            }

            if (b) {
                return {
                    isValid: true,
                    branchCode: b,
                    signature: s,
                };
            }
        } catch {
            // Regex fallback
            const bMatch = trimmed.match(/[?&](?:b|branch_code)=([^&]+)/);
            const pMatch = trimmed.match(/[?&](?:p|payload)=([^&]+)/);
            const sMatch = trimmed.match(/[?&](?:s|signature)=([^&]+)/);
            if (bMatch || pMatch) {
                return {
                    isValid: true,
                    branchCode: bMatch ? decodeURIComponent(bMatch[1]) : null,
                    payload: pMatch ? decodeURIComponent(pMatch[1]) : null,
                    signature: sMatch ? decodeURIComponent(sMatch[1]) : 'STATIC',
                };
            }
        }
    }

    // 3. Raw Ultra-Short Branch Code (Wall QR containing direct code like "HQ-MAIN", "PNH-01")
    if (trimmed.length <= 30 && /^[A-Za-z0-9_-]+$/.test(trimmed)) {
        return {
            isValid: true,
            branchCode: trimmed,
            signature: 'STATIC',
        };
    }

    return {
        isValid: false,
        branchCode: null,
        error: 'Unrecognized QR code format. Please scan a valid physical Branch Attendance QR code.',
    };
}
