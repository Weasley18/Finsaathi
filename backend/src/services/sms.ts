// ─── SMS Service (MSG91) ─────────────────────────────────────────
// Sends OTP via MSG91 (recommended for India).
// In development (no MSG91_AUTH_KEY configured), logs to console only.

const MSG91_AUTH_KEY = process.env.MSG91_AUTH_KEY;
const MSG91_TEMPLATE_ID = process.env.MSG91_TEMPLATE_ID;
const MSG91_SENDER_ID = process.env.MSG91_SENDER_ID || 'FINSTH';

export function isSmsConfigured(): boolean {
    return !!MSG91_AUTH_KEY && !MSG91_AUTH_KEY.startsWith('REPLACE');
}

export async function sendOtpSms(phone: string, otp: string): Promise<void> {
    // Strip country code prefix for MSG91 (it expects 10-digit Indian numbers)
    const cleanPhone = phone.replace(/^\+91/, '').replace(/^91/, '');

    if (!isSmsConfigured()) {
        // Development fallback — log to console, never to API response
        console.log(`[SMS-DEV] OTP for ${cleanPhone}: ${otp} (configure MSG91_AUTH_KEY to enable real SMS)`);
        return;
    }

    const payload = {
        template_id: MSG91_TEMPLATE_ID,
        short_url: '0',
        realTimeResponse: '1',
        recipients: [
            {
                mobiles: `91${cleanPhone}`,
                otp,
            },
        ],
    };

    const res = await fetch('https://control.msg91.com/api/v5/flow/', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/JSON',
            authkey: MSG91_AUTH_KEY as string,
        },
        body: JSON.stringify(payload),
    });

    if (!res.ok) {
        const body = await res.text();
        throw new Error(`MSG91 API error ${res.status}: ${body}`);
    }

    const json = await res.json() as any;
    if (json.type !== 'success') {
        throw new Error(`MSG91 delivery failed: ${JSON.stringify(json)}`);
    }
}
