// src/knowledge/data/raw-knowledge.ts

import { RawKnowledge } from './raw-knowledge.types';

export const RAW_KNOWLEDGE: RawKnowledge[] = [

  /* ═══════════════════════════════════════════
     BLOCKCHAIN FUNDAMENTALS
     ═══════════════════════════════════════════ */

  {
    id: 'blockchain-basics-v1',
    title: 'Blockchain là gì?',
    domain: 'blockchain',
    category: 'theory',
    level: 'beginner',
    tags: ['blockchain', 'cơ bản', 'phi tập trung', 'sổ cái'],
    version: 1,
    content: `
Blockchain là một công nghệ sổ cái phân tán (distributed ledger), trong đó dữ liệu được lưu trữ trong các khối (block) liên kết với nhau thành một chuỗi (chain). Mỗi khối chứa một tập hợp các giao dịch và được liên kết với khối trước đó thông qua mã băm (hash).

Đặc điểm quan trọng nhất của blockchain là tính phi tập trung. Không có một tổ chức hay cá nhân nào kiểm soát toàn bộ mạng lưới. Thay vào đó, hàng nghìn máy tính (node) trên toàn thế giới cùng xác minh và lưu trữ dữ liệu. Điều này giúp blockchain trở nên minh bạch, an toàn và chống giả mạo.

Khi một giao dịch mới được tạo ra, nó được phát tán đến tất cả các node trong mạng. Các node sẽ xác minh giao dịch này theo các quy tắc đồng thuận (consensus). Sau khi được xác minh, giao dịch được gộp vào một khối mới và thêm vào chuỗi. Một khi đã được thêm vào blockchain, dữ liệu gần như không thể thay đổi hay xóa.

Blockchain được ứng dụng rộng rãi trong nhiều lĩnh vực: tiền điện tử (cryptocurrency), tài chính phi tập trung (DeFi), NFT, chuỗi cung ứng, bỏ phiếu điện tử, và quản lý danh tính số.

Có hai loại blockchain chính: blockchain công khai (public) như Bitcoin và Ethereum, nơi bất kỳ ai cũng có thể tham gia; và blockchain riêng (private) như Hyperledger, được sử dụng trong doanh nghiệp với quyền truy cập hạn chế.

Cơ chế đồng thuận phổ biến gồm Proof of Work (PoW) - sử dụng sức mạnh tính toán để xác minh giao dịch, và Proof of Stake (PoS) - sử dụng lượng coin đặt cọc để xác minh. PoS tiết kiệm năng lượng hơn PoW rất nhiều.
    `,
  },

  {
    id: 'wallet-types-v1',
    title: 'Các loại ví tiền điện tử',
    domain: 'blockchain',
    category: 'theory',
    level: 'beginner',
    tags: ['ví', 'wallet', 'hot wallet', 'cold wallet', 'bảo mật'],
    version: 1,
    content: `
Ví tiền điện tử (crypto wallet) là công cụ để lưu trữ, gửi và nhận tiền điện tử. Ví không thực sự chứa tiền mà chứa các khóa riêng (private key) cho phép bạn truy cập và quản lý tài sản trên blockchain.

Hot Wallet (Ví nóng) là ví kết nối internet, tiện lợi cho giao dịch hàng ngày. Ví dụ: MetaMask, Trust Wallet, Phantom. Ưu điểm là dễ sử dụng, truy cập nhanh. Nhược điểm là dễ bị hack hơn do luôn kết nối mạng.

Cold Wallet (Ví lạnh) là ví không kết nối internet, an toàn nhất để lưu trữ dài hạn. Ví dụ: Ledger Nano X, Trezor. Ưu điểm là bảo mật cao, chống hack. Nhược điểm là giá cao và không tiện cho giao dịch thường xuyên.

Custodial Wallet là ví do bên thứ ba (sàn giao dịch) quản lý khóa riêng. Ví dụ: ví trên Binance, Coinbase. Tiện lợi nhưng bạn không thực sự kiểm soát tài sản ("Not your keys, not your coins").

Non-Custodial Wallet là ví bạn tự quản lý khóa riêng. Bạn có toàn quyền kiểm soát nhưng phải tự chịu trách nhiệm bảo mật. Nếu mất seed phrase, bạn sẽ mất vĩnh viễn tài sản.

Seed Phrase (cụm từ khôi phục) là 12 hoặc 24 từ tiếng Anh dùng để khôi phục ví. Tuyệt đối không chia sẻ seed phrase với bất kỳ ai. Nên viết ra giấy và cất ở nơi an toàn, không lưu trên điện thoại hay máy tính.
    `,
  },

  /* ═══════════════════════════════════════════
     MAJOR CRYPTOCURRENCIES
     ═══════════════════════════════════════════ */

  {
    id: 'bitcoin-overview-v1',
    title: 'Bitcoin (BTC) - Tổng quan',
    domain: 'blockchain',
    category: 'theory',
    level: 'beginner',
    tags: ['bitcoin', 'btc', 'satoshi', 'halving', 'mining'],
    version: 1,
    content: `
Bitcoin (BTC) là tiền điện tử đầu tiên trên thế giới, được tạo ra năm 2009 bởi một người hoặc nhóm người dưới bút danh Satoshi Nakamoto. Bitcoin ra đời với mục tiêu tạo ra một hệ thống tiền tệ điện tử ngang hàng (peer-to-peer) không cần trung gian.

Bitcoin có tổng cung tối đa là 21 triệu coin, không ai có thể tạo thêm. Tính khan hiếm này là một trong những yếu tố quan trọng tạo nên giá trị của Bitcoin. Bitcoin thường được gọi là "vàng kỹ thuật số" vì đặc tính lưu trữ giá trị tương tự vàng.

Bitcoin sử dụng cơ chế Proof of Work (PoW). Các thợ đào (miner) sử dụng sức mạnh tính toán để giải các bài toán phức tạp, xác minh giao dịch và tạo khối mới. Phần thưởng cho thợ đào giảm một nửa sau mỗi 210.000 khối (khoảng 4 năm), sự kiện này gọi là Bitcoin Halving.

Các đợt halving trước đó diễn ra vào năm 2012, 2016, 2020 và 2024. Sau mỗi đợt halving, nguồn cung mới giảm, tạo áp lực tăng giá.

Bitcoin có thể chia nhỏ đến 8 chữ số thập phân. Đơn vị nhỏ nhất gọi là Satoshi (1 BTC = 100.000.000 Satoshi). Bạn không cần mua nguyên 1 BTC mà có thể mua một phần nhỏ.

Lightning Network là giải pháp Layer 2 của Bitcoin, cho phép giao dịch nhanh hơn và phí thấp hơn bằng cách xử lý giao dịch ngoài chuỗi chính.
    `,
  },

  {
    id: 'ethereum-overview-v1',
    title: 'Ethereum (ETH) - Tổng quan',
    domain: 'blockchain',
    category: 'theory',
    level: 'beginner',
    tags: ['ethereum', 'eth', 'smart contract', 'evm', 'pos'],
    version: 1,
    content: `
Ethereum (ETH) là nền tảng blockchain được tạo bởi Vitalik Buterin, ra mắt năm 2015. Khác với Bitcoin chỉ tập trung vào thanh toán, Ethereum cho phép lập trình và chạy các ứng dụng phi tập trung (dApps) thông qua hợp đồng thông minh (smart contract).

Smart Contract (hợp đồng thông minh) là chương trình tự động thực thi trên blockchain khi các điều kiện được đáp ứng. Ví dụ: một smart contract có thể tự động chuyển tiền khi nhận được hàng, không cần bên trung gian.

Ethereum Virtual Machine (EVM) là môi trường thực thi smart contract trên Ethereum. Nhiều blockchain khác cũng tương thích EVM, giúp các nhà phát triển dễ dàng triển khai ứng dụng trên nhiều nền tảng.

Năm 2022, Ethereum chuyển từ Proof of Work sang Proof of Stake qua sự kiện The Merge. Điều này giảm tiêu thụ năng lượng hơn 99% và cho phép người dùng stake ETH để kiếm lợi nhuận.

Gas Fee là phí giao dịch trên Ethereum, trả bằng ETH. Phí gas thay đổi tùy theo mức độ tắc nghẽn mạng. Khi mạng bận, phí gas cao hơn. EIP-1559 giới thiệu cơ chế đốt (burn) một phần phí gas, giúp ETH trở nên khan hiếm hơn theo thời gian.

Ethereum là nền tảng hàng đầu cho DeFi, NFT, và nhiều ứng dụng Web3. Hệ sinh thái Ethereum có hàng nghìn dự án xây dựng trên đó, với tổng giá trị khóa (TVL) lớn nhất trong toàn bộ thị trường crypto.
    `,
  },

  {
    id: 'altcoins-overview-v1',
    title: 'Các Altcoin phổ biến',
    domain: 'blockchain',
    category: 'theory',
    level: 'beginner',
    tags: ['altcoin', 'solana', 'bnb', 'cardano', 'xrp', 'polygon'],
    version: 1,
    content: `
Altcoin là tất cả các tiền điện tử ngoài Bitcoin. Mỗi altcoin có công nghệ và mục đích riêng.

Solana (SOL) là blockchain hiệu suất cao, xử lý hàng nghìn giao dịch mỗi giây với phí rất thấp. Solana sử dụng cơ chế Proof of History kết hợp Proof of Stake. Solana phổ biến cho meme coin, NFT và DeFi nhờ tốc độ nhanh.

BNB (Build and Build) là token của hệ sinh thái Binance, sàn giao dịch crypto lớn nhất thế giới. BNB Chain (trước là BSC) hỗ trợ smart contract với phí thấp. BNB được dùng để giảm phí giao dịch trên Binance.

Cardano (ADA) là blockchain nghiên cứu học thuật, phát triển bởi Charles Hoskinson (đồng sáng lập Ethereum). Cardano sử dụng cơ chế PoS tên Ouroboros, tập trung vào bảo mật và khả năng mở rộng.

XRP là tiền điện tử của Ripple, tập trung vào thanh toán xuyên biên giới nhanh chóng. XRP được nhiều ngân hàng và tổ chức tài chính sử dụng cho thanh toán quốc tế.

Polygon (MATIC) là giải pháp Layer 2 cho Ethereum, giúp giảm phí gas và tăng tốc độ giao dịch. Nhiều dApp lớn triển khai trên Polygon để tối ưu chi phí.

Avalanche (AVAX) là blockchain nhanh với khả năng tạo subnet riêng. Dogecoin (DOGE) và Shiba Inu (SHIB) là các meme coin phổ biến, ban đầu tạo ra để vui nhưng có cộng đồng lớn.

Stablecoin là loại coin có giá trị neo theo tiền pháp định. USDT (Tether) và USDC là hai stablecoin phổ biến nhất, giá trị luôn khoảng 1 USD. Stablecoin được dùng để tránh biến động giá và làm cầu nối giữa crypto và tiền pháp định.
    `,
  },

  /* ═══════════════════════════════════════════
     TRADING STRATEGIES
     ═══════════════════════════════════════════ */

  {
    id: 'trading-basics-v1',
    title: 'Cơ bản về giao dịch crypto',
    domain: 'trading',
    category: 'strategy',
    level: 'beginner',
    tags: ['giao dịch', 'mua', 'bán', 'lệnh', 'spot', 'futures'],
    version: 1,
    content: `
Giao dịch crypto là hoạt động mua bán tiền điện tử nhằm kiếm lợi nhuận từ biến động giá. Có nhiều hình thức giao dịch khác nhau phù hợp với từng mức độ kinh nghiệm.

Spot Trading (giao dịch giao ngay) là hình thức đơn giản nhất. Bạn mua coin ở giá hiện tại và sở hữu coin thực sự. Bạn có thể giữ (HODL) hoặc bán khi giá tăng. Spot trading phù hợp cho người mới bắt đầu vì rủi ro thấp hơn.

Futures Trading (giao dịch hợp đồng tương lai) cho phép bạn đặt cược vào hướng giá mà không cần sở hữu coin. Bạn có thể Long (đặt cược giá tăng) hoặc Short (đặt cược giá giảm) với đòn bẩy (leverage). Futures rủi ro cao, có thể mất toàn bộ vốn nếu thị trường đi ngược dự đoán.

Các loại lệnh giao dịch cơ bản gồm: Market Order (lệnh thị trường) mua bán ngay ở giá hiện tại. Limit Order (lệnh giới hạn) đặt giá mua bán mong muốn, chỉ khớp khi giá đạt mức đó. Stop Loss là lệnh tự động bán khi giá giảm đến mức nhất định để hạn chế thua lỗ. Take Profit là lệnh tự động bán khi giá tăng đến mức mong muốn để chốt lời.

Dollar Cost Averaging (DCA) là chiến lược mua đều đặn một lượng tiền cố định theo định kỳ (hàng tuần, hàng tháng) bất kể giá cao hay thấp. DCA giúp giảm rủi ro mua đỉnh và phù hợp cho đầu tư dài hạn.

HODL là thuật ngữ trong cộng đồng crypto, nghĩa là giữ coin dài hạn bất chấp biến động ngắn hạn. Nhiều nhà đầu tư Bitcoin áp dụng chiến lược HODL và đã thu được lợi nhuận lớn qua các năm.
    `,
  },

  {
    id: 'technical-analysis-v1',
    title: 'Phân tích kỹ thuật cơ bản',
    domain: 'trading',
    category: 'indicator',
    level: 'intermediate',
    tags: ['phân tích kỹ thuật', 'RSI', 'MACD', 'MA', 'biểu đồ', 'nến'],
    version: 1,
    content: `
Phân tích kỹ thuật (Technical Analysis) là phương pháp dự đoán xu hướng giá dựa trên dữ liệu lịch sử về giá và khối lượng giao dịch. Phân tích kỹ thuật sử dụng biểu đồ và các chỉ báo (indicator) để tìm điểm mua bán.

Biểu đồ nến Nhật (Candlestick) là loại biểu đồ phổ biến nhất. Mỗi cây nến thể hiện giá mở cửa, đóng cửa, cao nhất và thấp nhất trong một khoảng thời gian. Nến xanh (tăng) khi giá đóng cửa cao hơn giá mở cửa, nến đỏ (giảm) khi ngược lại.

Moving Average (MA) là đường trung bình giá trong một khoảng thời gian. MA 50 ngày và MA 200 ngày là hai đường phổ biến. Khi MA ngắn hạn cắt lên MA dài hạn gọi là Golden Cross (tín hiệu tăng). Khi cắt xuống gọi là Death Cross (tín hiệu giảm).

EMA (Exponential Moving Average) là đường trung bình có trọng số, phản ứng nhanh hơn với biến động giá gần đây. EMA 9 và EMA 21 thường dùng cho giao dịch ngắn hạn. Khi EMA 9 cắt lên EMA 21 là tín hiệu mua, cắt xuống là tín hiệu bán.

RSI (Relative Strength Index) dao động từ 0 đến 100. RSI trên 70 cho thấy tài sản đang bị mua quá mức (overbought), có thể giảm giá. RSI dưới 30 cho thấy bị bán quá mức (oversold), có thể tăng giá.

MACD (Moving Average Convergence Divergence) là chỉ báo xu hướng. Khi đường MACD cắt lên đường Signal là tín hiệu mua, cắt xuống là tín hiệu bán. Histogram MACD cho thấy độ mạnh của xu hướng.

Bollinger Bands gồm 3 đường: đường giữa là MA 20 ngày, đường trên và dưới cách đường giữa 2 độ lệch chuẩn. Khi giá chạm đường trên có thể bị quá mua, chạm đường dưới có thể bị quá bán. Khi các dải thu hẹp, thường báo hiệu biến động lớn sắp xảy ra.

Support (hỗ trợ) là mức giá mà tại đó lực mua đủ mạnh để ngăn giá giảm thêm. Resistance (kháng cự) là mức giá mà lực bán đủ mạnh để ngăn giá tăng thêm. Khi giá phá vỡ resistance, nó thường trở thành support mới.
    `,
  },

  {
    id: 'ema-crossover-v1',
    title: 'EMA Crossover Strategy',
    source: 'Internal Research Note',
    author: 'System',
    publishedYear: 2024,
    domain: 'trading',
    category: 'strategy',
    level: 'beginner',
    tags: ['ema', 'trend', 'crossover', 'spot'],
    version: 1,
    content: `
EMA Crossover là chiến lược giao cắt giữa EMA 9 và EMA 21.
Khi EMA 9 cắt lên EMA 21 thì đây là tín hiệu mua (bullish crossover).
Khi EMA 9 cắt xuống EMA 21 thì đây là tín hiệu bán (bearish crossover).
Chiến lược này hoạt động tốt trong thị trường có xu hướng rõ ràng (trending market).
Trong thị trường sideway (đi ngang), EMA Crossover có thể cho nhiều tín hiệu sai.
Nên kết hợp với RSI hoặc khối lượng giao dịch để xác nhận tín hiệu.
    `,
  },

  {
    id: 'risk-management-v1',
    title: 'Quản lý rủi ro trong giao dịch',
    domain: 'trading',
    category: 'risk_management',
    level: 'beginner',
    tags: ['rủi ro', 'stop loss', 'take profit', 'quản lý vốn'],
    version: 1,
    content: `
Quản lý rủi ro là yếu tố quan trọng nhất trong giao dịch crypto, quan trọng hơn cả việc chọn đúng coin. Ngay cả trader giỏi nhất cũng sai khoảng 40-50% lệnh, nhưng họ vẫn có lời nhờ quản lý rủi ro tốt.

Quy tắc 1% đến 2%: Không bao giờ rủi ro quá 1-2% tổng vốn trong một giao dịch. Ví dụ nếu bạn có 10.000 USD, mỗi lệnh chỉ nên chấp nhận thua lỗ tối đa 100-200 USD.

Stop Loss là bắt buộc. Luôn đặt stop loss trước khi vào lệnh. Stop loss giúp bạn giới hạn thua lỗ ở mức chấp nhận được. Không bao giờ di chuyển stop loss xa hơn khi lệnh đang thua.

Tỷ lệ Risk/Reward (R:R) nên tối thiểu 1:2, nghĩa là nếu bạn chấp nhận thua 100 USD thì mục tiêu lời ít nhất 200 USD. Với R:R = 1:2, bạn chỉ cần đúng 40% lệnh là đã có lãi.

Đa dạng hóa danh mục: Không bỏ tất cả vốn vào một coin. Phân bổ vốn vào nhiều loại tài sản khác nhau. Ví dụ: 50% BTC, 30% ETH, 20% altcoin.

Không giao dịch bằng cảm xúc. FOMO (Fear Of Missing Out) khiến bạn mua đuổi giá cao. FUD (Fear, Uncertainty, Doubt) khiến bạn bán tháo khi hoảng loạn. Hãy luôn có kế hoạch giao dịch rõ ràng trước khi vào lệnh.

Không sử dụng đòn bẩy cao khi mới bắt đầu. Đòn bẩy khuếch đại cả lợi nhuận và thua lỗ. Đòn bẩy 10x nghĩa là giá chỉ cần đi ngược 10% là bạn mất toàn bộ vốn.
    `,
  },

  /* ═══════════════════════════════════════════
     DEFI & WEB3
     ═══════════════════════════════════════════ */

  {
    id: 'defi-overview-v1',
    title: 'DeFi - Tài chính phi tập trung',
    domain: 'defi',
    category: 'theory',
    level: 'intermediate',
    tags: ['defi', 'dex', 'yield farming', 'lending', 'liquidity'],
    version: 1,
    content: `
DeFi (Decentralized Finance) là hệ thống tài chính phi tập trung xây dựng trên blockchain. DeFi cho phép người dùng vay, cho vay, giao dịch và kiếm lãi mà không cần ngân hàng hay tổ chức trung gian.

DEX (Decentralized Exchange) là sàn giao dịch phi tập trung. Uniswap, PancakeSwap, Raydium là các DEX phổ biến. Trên DEX, bạn giao dịch trực tiếp từ ví cá nhân thông qua smart contract, không cần gửi tiền lên sàn.

AMM (Automated Market Maker) là cơ chế tạo thanh khoản trên DEX. Thay vì sổ lệnh truyền thống, AMM sử dụng liquidity pool (hồ thanh khoản). Người cung cấp thanh khoản nhận phí giao dịch từ pool.

Yield Farming (canh tác lợi suất) là việc cung cấp thanh khoản hoặc stake token vào các giao thức DeFi để kiếm phần thưởng. APY (Annual Percentage Yield) có thể từ vài phần trăm đến hàng nghìn phần trăm, nhưng APY cao thường đi kèm rủi ro cao.

Lending/Borrowing: Các giao thức như Aave và Compound cho phép bạn cho vay crypto để kiếm lãi, hoặc vay crypto bằng cách thế chấp tài sản khác. Vay DeFi không cần kiểm tra tín dụng nhưng yêu cầu thế chấp vượt mức.

Impermanent Loss (tổn thất tạm thời) xảy ra khi giá token trong liquidity pool thay đổi so với lúc bạn cung cấp thanh khoản. Đây là rủi ro chính khi tham gia yield farming.

TVL (Total Value Locked) là tổng giá trị tài sản bị khóa trong các giao thức DeFi. TVL cao cho thấy giao thức được tin tưởng và sử dụng nhiều.

Staking là việc khóa token để hỗ trợ hoạt động mạng blockchain và nhận phần thưởng. Staking ETH trên Ethereum mang lại khoảng 3-5% APY. Liquid staking (như Lido) cho phép bạn stake mà vẫn có thể sử dụng token đại diện (stETH) trong DeFi.
    `,
  },

  {
    id: 'nft-web3-v1',
    title: 'NFT và Web3',
    domain: 'blockchain',
    category: 'theory',
    level: 'beginner',
    tags: ['nft', 'web3', 'metaverse', 'gamefi'],
    version: 1,
    content: `
NFT (Non-Fungible Token) là token không thể thay thế, đại diện cho quyền sở hữu một tài sản kỹ thuật số duy nhất trên blockchain. Mỗi NFT là độc nhất, khác với Bitcoin hay ETH có thể hoán đổi cho nhau.

NFT được ứng dụng trong nghệ thuật số, âm nhạc, game, bất động sản ảo. Các bộ sưu tập NFT nổi tiếng gồm Bored Ape Yacht Club, CryptoPunks, Azuki. NFT được giao dịch trên các marketplace như OpenSea, Magic Eden, Blur.

Web3 là thế hệ internet tiếp theo dựa trên blockchain, nơi người dùng sở hữu dữ liệu và tài sản số của mình. Web1 là internet chỉ đọc, Web2 là internet đọc-viết (Facebook, Google), Web3 là internet đọc-viết-sở hữu.

GameFi kết hợp game và tài chính, cho phép người chơi kiếm tiền (Play-to-Earn). Axie Infinity là ví dụ nổi tiếng. Tuy nhiên, nhiều dự án GameFi đã thất bại do mô hình kinh tế không bền vững.

Metaverse là vũ trụ ảo nơi người dùng có thể tương tác, làm việc và giải trí. Decentraland và The Sandbox là hai dự án metaverse lớn trên blockchain. Đất ảo trong metaverse được giao dịch dưới dạng NFT.

DAO (Decentralized Autonomous Organization) là tổ chức tự trị phi tập trung, quản trị bằng smart contract. Thành viên nắm giữ governance token để bỏ phiếu cho các quyết định. Ví dụ: MakerDAO quản trị stablecoin DAI.
    `,
  },

  /* ═══════════════════════════════════════════
     SECURITY & PSYCHOLOGY
     ═══════════════════════════════════════════ */

  {
    id: 'crypto-security-v1',
    title: 'Bảo mật tài sản crypto',
    domain: 'blockchain',
    category: 'theory',
    level: 'beginner',
    tags: ['bảo mật', 'scam', 'phishing', 'hack', 'an toàn'],
    version: 1,
    content: `
Bảo mật là ưu tiên hàng đầu khi tham gia thị trường crypto vì giao dịch blockchain không thể đảo ngược. Một khi bạn gửi coin sai địa chỉ hoặc bị hack, gần như không thể lấy lại.

Các hình thức lừa đảo phổ biến gồm: Phishing (giả mạo website, email) dẫn dụ bạn nhập seed phrase. Rug Pull khi nhà phát triển rút toàn bộ thanh khoản sau khi huy động vốn. Pump and Dump khi một nhóm bơm giá coin rồi bán tháo. Airdrop giả yêu cầu kết nối ví để đánh cắp tài sản.

Cách bảo vệ tài sản: Bật xác thực 2 yếu tố (2FA) trên tất cả tài khoản sàn. Sử dụng Google Authenticator thay vì SMS. Không bao giờ chia sẻ seed phrase hoặc private key. Kiểm tra kỹ URL website trước khi kết nối ví. Sử dụng ví phần cứng (Ledger, Trezor) cho số tiền lớn.

Không click vào link lạ trên Discord, Telegram, Twitter. Nhiều nhóm scam giả mạo admin dự án để lừa đảo. Admin thật không bao giờ nhắn tin riêng yêu cầu bạn gửi tiền hay kết nối ví.

Revoke Approval: Khi bạn interact với smart contract trên DeFi, bạn cho phép (approve) contract truy cập token. Hãy thường xuyên kiểm tra và thu hồi (revoke) các approval không cần thiết trên revoke.cash hoặc etherscan.

DYOR (Do Your Own Research): Luôn tự nghiên cứu kỹ trước khi đầu tư vào bất kỳ dự án nào. Kiểm tra team, whitepaper, tokenomics, audit code, cộng đồng. Nếu lợi nhuận nghe quá tốt để là thật, thì có thể nó không phải thật.
    `,
  },

  {
    id: 'trading-psychology-v1',
    title: 'Tâm lý giao dịch',
    domain: 'psychology',
    category: 'theory',
    level: 'intermediate',
    tags: ['tâm lý', 'FOMO', 'FUD', 'kỷ luật', 'cảm xúc'],
    version: 1,
    content: `
Tâm lý giao dịch là yếu tố quyết định thành bại của 80% trader. Kỹ thuật phân tích có thể học được, nhưng kiểm soát cảm xúc mới là thử thách thực sự.

FOMO (Fear Of Missing Out) là nỗi sợ bỏ lỡ cơ hội. Khi thấy coin tăng mạnh, bạn vội vàng mua đuổi ở giá cao. FOMO thường dẫn đến mua đỉnh. Hãy nhớ rằng luôn có cơ hội khác, không cần phải vào lệnh ngay.

FUD (Fear, Uncertainty, Doubt) là sự sợ hãi, không chắc chắn và nghi ngờ. FUD khiến bạn bán hoảng loạn khi giá giảm, dù coin vẫn có nền tảng tốt. Nhiều trader bán tháo ở đáy rồi sau đó giá phục hồi mạnh.

Revenge Trading là giao dịch trả thù sau khi thua lỗ. Bạn muốn "gỡ lại" nên vào lệnh liên tục, tăng khối lượng, bỏ qua phân tích. Kết quả thường là thua lỗ nhiều hơn. Khi thua lỗ, hãy nghỉ ngơi, phân tích sai ở đâu, rồi mới tiếp tục.

Overtrading là giao dịch quá nhiều. Không phải lúc nào cũng cần vào lệnh. Đôi khi đứng ngoài thị trường là quyết định khôn ngoan nhất. Trader giỏi biết chờ đợi setup tốt thay vì giao dịch liên tục.

Kỷ luật giao dịch: Luôn có kế hoạch trước khi vào lệnh. Xác định điểm vào, stop loss, take profit. Tuân thủ kế hoạch, không thay đổi giữa chừng vì cảm xúc. Ghi chép nhật ký giao dịch để rút kinh nghiệm.

Quản lý kỳ vọng: Crypto có thể mang lại lợi nhuận lớn nhưng cũng có thể mất toàn bộ vốn. Không đầu tư tiền bạn không thể chấp nhận mất. Không vay nợ để đầu tư crypto. Lợi nhuận bền vững quan trọng hơn lợi nhuận nhanh.
    `,
  },

  /* ═══════════════════════════════════════════
     MARKET ANALYSIS
     ═══════════════════════════════════════════ */

  {
    id: 'market-cycles-v1',
    title: 'Chu kỳ thị trường crypto',
    domain: 'macro',
    category: 'theory',
    level: 'intermediate',
    tags: ['chu kỳ', 'bull market', 'bear market', 'halving', 'altseason'],
    version: 1,
    content: `
Thị trường crypto vận hành theo chu kỳ, thường liên quan đến chu kỳ halving Bitcoin khoảng 4 năm.

Bull Market (thị trường tăng) là giai đoạn giá tăng mạnh và kéo dài. Đặc điểm: tin tức tích cực liên tục, nhiều người mới tham gia, khối lượng giao dịch tăng, các dự án mới ra mắt liên tục. Bull market thường kéo dài 1-2 năm sau halving.

Bear Market (thị trường giảm) là giai đoạn giá giảm kéo dài, có thể giảm 70-90% từ đỉnh. Đặc điểm: tin tức tiêu cực, nhiều dự án thất bại, khối lượng giao dịch giảm, nhà đầu tư mất niềm tin. Bear market là lúc tốt nhất để tích lũy nếu bạn tin vào tương lai dài hạn.

Accumulation (tích lũy) là giai đoạn giá đi ngang sau bear market. Smart money (tiền thông minh) bắt đầu mua vào trong khi đa số nhà đầu tư nhỏ lẻ còn sợ hãi.

Altseason là giai đoạn các altcoin tăng mạnh hơn Bitcoin. Thường xảy ra khi Bitcoin dominance giảm. Altseason mang lại cơ hội lợi nhuận lớn nhưng cũng rủi ro cao vì nhiều altcoin có thể giảm 95% hoặc hơn trong bear market.

Bitcoin Dominance là tỷ lệ vốn hóa Bitcoin so với toàn thị trường crypto. Khi BTC dominance tăng, tiền chảy về Bitcoin. Khi giảm, tiền chảy sang altcoin.

On-chain Analysis (phân tích on-chain) là phương pháp nghiên cứu dữ liệu trực tiếp từ blockchain để đánh giá thị trường. Các chỉ số quan trọng gồm: số lượng ví hoạt động, dòng tiền vào ra sàn, hành vi của cá voi (whales).
    `,
  },

  {
    id: 'tokenomics-v1',
    title: 'Tokenomics - Kinh tế token',
    domain: 'blockchain',
    category: 'theory',
    level: 'intermediate',
    tags: ['tokenomics', 'cung cầu', 'vesting', 'burn', 'inflation'],
    version: 1,
    content: `
Tokenomics là bộ quy tắc kinh tế quyết định cách một token hoạt động. Hiểu tokenomics giúp bạn đánh giá tiềm năng dài hạn của một dự án.

Total Supply là tổng số token sẽ được tạo ra. Bitcoin có total supply 21 triệu, tạo tính khan hiếm. Một số token có supply vô hạn (inflationary) như Ethereum trước The Merge.

Circulating Supply là số token đang lưu hành trên thị trường. Market Cap bằng giá token nhân circulating supply. Fully Diluted Valuation (FDV) bằng giá nhân total supply.

Token Distribution (phân bổ token): Cần xem team giữ bao nhiêu phần trăm, quỹ phát triển, marketing, cộng đồng, nhà đầu tư sớm. Nếu team và insider giữ quá nhiều (trên 40-50%) thì rủi ro bán tháo cao.

Vesting Schedule là lịch mở khóa token. Token của team và nhà đầu tư thường bị khóa (lock) trong 1-4 năm và mở khóa dần (cliff + linear vesting). Khi đến ngày mở khóa lớn (unlock event), giá token có thể giảm do áp lực bán.

Burn Mechanism (cơ chế đốt) là khi token bị loại bỏ vĩnh viễn khỏi lưu thông, giảm supply và tăng tính khan hiếm. BNB đốt token hàng quý. Ethereum đốt một phần gas fee (EIP-1559).

Utility là giá trị sử dụng thực tế của token. Token có utility rõ ràng (governance, staking, phí giao dịch, truy cập dịch vụ) có giá trị bền vững hơn token chỉ để đầu cơ.
    `,
  },

  /* ═══════════════════════════════════════════
     EXCHANGES & REGULATIONS
     ═══════════════════════════════════════════ */

  {
    id: 'exchanges-guide-v1',
    title: 'Hướng dẫn sử dụng sàn giao dịch',
    domain: 'trading',
    category: 'theory',
    level: 'beginner',
    tags: ['sàn giao dịch', 'binance', 'KYC', 'nạp rút', 'phí'],
    version: 1,
    content: `
Sàn giao dịch (exchange) là nơi bạn mua bán tiền điện tử. Có hai loại sàn: CEX (sàn tập trung) và DEX (sàn phi tập trung).

CEX phổ biến gồm: Binance là sàn lớn nhất thế giới về khối lượng giao dịch. Coinbase phổ biến ở Mỹ, thân thiện người mới. OKX và Bybit cũng là các sàn lớn. Ở Việt Nam, nhiều người dùng Binance, OKX, hoặc Remitano.

KYC (Know Your Customer) là quy trình xác minh danh tính khi đăng ký sàn. Bạn cần cung cấp CMND/CCCD, selfie. KYC giúp tăng hạn mức giao dịch và rút tiền.

Cách nạp tiền vào sàn: Chuyển khoản ngân hàng qua P2P (mua USDT bằng VND từ người bán). Gửi crypto từ ví khác. Nạp qua thẻ tín dụng (phí cao hơn).

P2P Trading (giao dịch ngang hàng): Trên Binance P2P, bạn mua USDT trực tiếp từ người bán bằng cách chuyển khoản ngân hàng. Sàn đóng vai trò trung gian giữ tiền (escrow) để đảm bảo an toàn cho cả hai bên.

Phí giao dịch: Maker fee (người tạo lệnh giới hạn) thường thấp hơn Taker fee (người mua bán ngay). Phí trên Binance khoảng 0.1%. Nắm giữ BNB có thể giảm 25% phí.

Rút tiền: Chọn đúng mạng (network) khi rút. Ví dụ rút USDT có thể qua mạng ERC20, TRC20, BEP20. Mạng TRC20 phí rẻ nhất (khoảng 1 USDT). Gửi nhầm mạng có thể mất tiền vĩnh viễn.

Bảo mật tài khoản sàn: Bật 2FA bằng Google Authenticator. Đặt mật khẩu mạnh, không trùng với tài khoản khác. Thiết lập Anti-phishing code để nhận diện email thật từ sàn. Bật whitelist rút tiền để chỉ rút về địa chỉ đã xác minh.
    `,
  },
];