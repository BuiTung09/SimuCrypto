/**
 * VNPay Payment Utility (Refined for Browser Context)
 * Based on vnpay_nodejs demo logically
 */

interface VnPayParams {
    amount: number;
    orderDescription: string;
    orderId: string;
    bankCode?: string;
    language?: string;
}

// Configuration (Should be moved to backend for production)
const vnp_TmnCode = "XFAOCR5M";
const vnp_HashSecret = "4DY11IYGO2S36RG8A0X7HUT6BQ4FYDAS";
const vnp_Url = "https://sandbox.vnpayment.vn/paymentv2/vpcpay.html";
const vnp_ReturnUrl = window.location.origin; // Dynamically set to current origin

/**
 * Generate HMAC-SHA512 hash using Web Crypto API
 */
async function hmacSHA512(key: string, data: string): Promise<string> {
    const encoder = new TextEncoder();
    const cryptoKey = await window.crypto.subtle.importKey(
        'raw',
        encoder.encode(key),
        { name: 'HMAC', hash: 'SHA-512' },
        false,
        ['sign']
    );
    const signature = await window.crypto.subtle.sign(
        'HMAC',
        cryptoKey,
        encoder.encode(data)
    );
    return Array.from(new Uint8Array(signature))
        .map(b => b.toString(16).padStart(2, '0'))
        .join('')
        .toUpperCase();
}

/**
 * Custom sort and encode for VNPay (Matches Node.js demo sortObject)
 */
function sortObject(obj: any) {
    const sorted: any = {};
    const str: string[] = [];
    let key: string;
    for (key in obj) {
        if (Object.prototype.hasOwnProperty.call(obj, key)) {
            str.push(encodeURIComponent(key));
        }
    }
    str.sort();
    for (let i = 0; i < str.length; i++) {
        const sortedKey = str[i];
        sorted[sortedKey] = encodeURIComponent(obj[decodeURIComponent(sortedKey)]).replace(/%20/g, "+");
    }
    return sorted;
}

/**
 * Generate VNPay Payment URL
 */
export async function generateVnPayUrl({ amount, orderDescription, orderId, bankCode, language = 'vn' }: VnPayParams): Promise<string> {
    const date = new Date();
    
    // Force GMT+7 (Vietnam Time)
    const formatter = new Intl.DateTimeFormat('en-GB', {
        timeZone: 'Asia/Ho_Chi_Minh',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
    });
    
    const parts = formatter.formatToParts(date);
    const getPart = (type: string) => parts.find(p => p.type === type)?.value;
    const createDate = `${getPart('year')}${getPart('month')}${getPart('day')}${getPart('hour')}${getPart('minute')}${getPart('second')}`;

    let vnp_Params: any = {};
    vnp_Params['vnp_Version'] = '2.1.0';
    vnp_Params['vnp_Command'] = 'pay';
    vnp_Params['vnp_TmnCode'] = vnp_TmnCode;
    vnp_Params['vnp_Locale'] = language;
    vnp_Params['vnp_CurrCode'] = 'VND';
    vnp_Params['vnp_TxnRef'] = orderId;
    vnp_Params['vnp_OrderInfo'] = orderDescription;
    vnp_Params['vnp_OrderType'] = 'other';
    vnp_Params['vnp_Amount'] = amount * 100;
    vnp_Params['vnp_ReturnUrl'] = vnp_ReturnUrl;
    vnp_Params['vnp_IpAddr'] = '127.0.0.1'; // Browser context placeholder
    vnp_Params['vnp_CreateDate'] = createDate;
    
    if (bankCode) {
        vnp_Params['vnp_BankCode'] = bankCode;
    }

    vnp_Params = sortObject(vnp_Params);

    // Build sign data
    const signData = Object.keys(vnp_Params)
        .map(key => `${key}=${vnp_Params[key]}`)
        .join('&');

    const signed = await hmacSHA512(vnp_HashSecret, signData);
    vnp_Params['vnp_SecureHash'] = signed;

    const queryUrl = Object.keys(vnp_Params)
        .map(key => `${key}=${vnp_Params[key]}`)
        .join('&');

    return `${vnp_Url}?${queryUrl}`;
}

/**
 * Verify VNPay Secure Hash from Callback
 */
export async function verifyVnPayHash(params: Record<string, string>): Promise<boolean> {
    const vnp_Params = { ...params };
    const secureHash = vnp_Params['vnp_SecureHash'];

    delete vnp_Params['vnp_SecureHash'];
    delete vnp_Params['vnp_SecureHashType'];

    const sortedParams = sortObject(vnp_Params);
    
    const signData = Object.keys(sortedParams)
        .map(key => `${key}=${sortedParams[key]}`)
        .join('&');

    const checkHash = await hmacSHA512(vnp_HashSecret, signData);
    
    return secureHash === checkHash;
}
