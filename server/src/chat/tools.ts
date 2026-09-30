export const GEMINI_TOOLS = [
  {
    functionDeclarations: [
      {
        name: 'get_price',
        description: 'Lấy giá hoặc biến động của một đồng coin cụ thể (ví dụ: BTC, ETH, SOL...)',
        parameters: {
          type: 'object',
          properties: {
            query: {
              type: 'string',
              description: 'Tên hoặc ký hiệu mã coin cần tra cứu giá (ví dụ: BTC, ETH, SOL...)',
            },
          },
          required: ['query'],
        },
      },
    ],
  },
  {
    functionDeclarations: [
      {
        name: 'search_knowledge',
        description: 'Tìm kiếm kiến thức blockchain, thuật ngữ crypto, phân tích tâm lý hoặc hướng dẫn giao dịch từ thư viện hệ thống',
        parameters: {
          type: 'object',
          properties: {
            query: {
              type: 'string',
              description: 'Từ khóa hoặc câu hỏi cần tra cứu kiến thức (ví dụ: FOMO là gì, cách quản lý vốn...)',
            },
          },
          required: ['query'],
        },
      },
    ],
  },
];