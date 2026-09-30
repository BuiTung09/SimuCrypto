const express = require('express');
const cors = require('cors');
const axios = require('axios');
const crypto = require('crypto'); // Dùng để băm MD5
const app = express();

app.use(cors());
app.use(express.json());

/**
 * Cấu hình MB Bank lấy từ Github thedtvn/mbbank
 */
const MB_CONSTANTS = {
  AUTH_HEADER: 'Basic RU1CUkVUQUlMV0VCOlNEMjM0ZGZnMzQlI0BGR0AzNHNmc2RmNDU4NDNm',
  FPR: 'c7a1beebb9400375bb187daa33de9659',
  USER_AGENT: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36'
};

// Lưu thông tin phiên đăng nhập (sessionId)
let currentSession = {
  sessionId: 'd865af29-33e5-46c3-89a3-bc276b731f90',
  deviceId: 'gugzsobp-mbib-0000-0000-2026051618295485'
};

/**
 * Hàm băm MD5 (MB Bank yêu cầu mật khẩu phải băm MD5)
 */
function md5(text) {
  return crypto.createHash('md5').update(text).digest('hex');
}

/**
 * Hàm giả lập mã hóa WASM (Trong thực tế bạn sẽ gọi hàm từ main.wasm)
 * Repository thedtvn/mbbank dùng main.wasm để encrypt toàn bộ JSON payload.
 */
async function wasmEncrypt(payload) {
  // Logic: payload -> JSON string -> WASM Encrypt -> Base64/Hex
  // Tạm thời trả về payload gốc để bạn thấy cấu trúc. 
  // Bạn cần thư viện 'wasmtime-js' hoặc tương tự để chạy main.wasm thực tế.
  return payload;
}

/**
 * API Đăng nhập MB Bank (Logic từ Github)
 */
app.post('/api/mb-login', async (req, res) => {
  const { username, password, captcha } = req.body;

  const payload = {
    userId: username,
    password: md5(password),
    captcha: captcha,
    sessionId: "",
    refNo: `${username}-${new Date().getTime()}`,
    deviceIdCommon: currentSession.deviceId,
    ibAuthen2faString: MB_CONSTANTS.FPR
  };

  try {
    // MB Bank yêu cầu dữ liệu phải được mã hóa trước khi gửi
    const encryptedData = await wasmEncrypt(payload);

    const response = await axios.post(
      'https://online.mbbank.com.vn/api/retail_web/internetbanking/v2.0/doLogin',
      {
        ...payload,
        dataEnc: encryptedData
      },
      {
        headers: {
          'Authorization': MB_CONSTANTS.AUTH_HEADER,
          'User-Agent': MB_CONSTANTS.USER_AGENT,
          'Content-Type': 'application/json'
        }
      }
    );

    if (response.data.result.ok) {
      currentSession.sessionId = response.data.sessionId;
      res.json({ success: true, sessionId: response.data.sessionId });
    } else {
      res.json({ success: false, message: response.data.result.message });
    }
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * API Lấy lịch sử giao dịch (Logic từ Github)
 */
app.get('/api/check-payment', async (req, res) => {
  const { memo, amount } = req.query;
  console.log(`[CHECK PAYMENT] Request received - Memo: "${memo}", Amount: ${amount}`);

  if (!currentSession.sessionId) {
    console.log(`[CHECK PAYMENT] WARNING: No active MB Bank session. Please login first.`);
    return res.json({ success: false, message: 'Chưa đăng nhập MB Bank' });
  }

  const today = new Date();
  const dd = String(today.getDate()).padStart(2, '0');
  const mm = String(today.getMonth() + 1).padStart(2, '0');
  const yyyy = today.getFullYear();
  const currentDate = `${dd}/${mm}/${yyyy}`;

  const payload = {
    accountNo: "0397461826",
    fromDate: currentDate,
    toDate: currentDate,
    sessionId: currentSession.sessionId,
    deviceIdCommon: currentSession.deviceId,
    refNo: `CHECK-${new Date().getTime()}`
  };

  try {
    const encryptedData = await wasmEncrypt(payload);

    const response = await axios.post(
      'https://online.mbbank.com.vn/api/retail-transactionms/transactionms/get-account-transaction-history',
      payload,
      {
        headers: {
          'Authorization': MB_CONSTANTS.AUTH_HEADER,
          'User-Agent': MB_CONSTANTS.USER_AGENT,
          'Content-Type': 'application/json',
          'X-Request-Id': payload.refNo,
          'Deviceid': payload.deviceIdCommon,
          'Refno': payload.refNo
        }
      }
    );

    console.log(`[CHECK PAYMENT] MB Bank API Response:`, JSON.stringify(response.data));

    const history = response.data.transactionHistoryList || [];
    const found = history.find(t => t.description.includes(memo) && t.creditAmount >= parseInt(amount));

    if (found) {
      console.log(`[CHECK PAYMENT] SUCCESS: Found matching transaction!`, found);
      res.json({ success: true, data: found });
    } else {
      console.log(`[CHECK PAYMENT] PENDING: No matching transaction found yet. History count: ${history.length}`);
      res.json({ success: false });
    }
  } catch (error) {
    console.error(`[CHECK PAYMENT] ERROR:`, error.message);
    if (error.response) {
      console.error(`[CHECK PAYMENT] MB Bank HTTP Error Data:`, JSON.stringify(error.response.data));
    }
    res.status(500).json({ success: false, message: error.message, errorDetails: error.response?.data });
  }
});

const PORT = 5001;
app.listen(PORT, () => console.log(`MB Bank API Server running on port ${PORT}`));
