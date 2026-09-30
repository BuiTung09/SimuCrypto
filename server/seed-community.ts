import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('Bắt đầu seed dữ liệu cộng đồng...');

  const passwordHash = await bcrypt.hash('crypto123', 10);

  // 1. Tạo hoặc tìm các User ảo để đăng bài
  const user1 = await prisma.user.upsert({
    where: { email: 'analyst_vip@crypto.com' },
    update: { role: 1 },
    create: {
      email: 'analyst_vip@crypto.com',
      username: 'vip_analyst',
      displayName: 'Nguyễn Minh (Pro Analyst)',
      passwordHash,
      role: 1,
      isActive: true,
    },
  });

  const user2 = await prisma.user.upsert({
    where: { email: 'mentor_viet@crypto.com' },
    update: { role: 1 },
    create: {
      email: 'mentor_viet@crypto.com',
      username: 'mentor_viet',
      displayName: 'Trần Hương (Mentor)',
      passwordHash,
      role: 1,
      isActive: true,
    },
  });

  const user3 = await prisma.user.upsert({
    where: { email: 'admin_root@crypto.com' },
    update: { role: 999 },
    create: {
      email: 'admin_root@crypto.com',
      username: 'admin_root',
      displayName: 'Hệ Thống Admin',
      passwordHash,
      role: 999,
      isActive: true,
    },
  });

  console.log('Đã khởi tạo các tài khoản thành viên thành công!');

  // Làm sạch các bài đăng cũ để hiển thị sạch đẹp
  await prisma.communityPostLike.deleteMany({});
  await prisma.communityComment.deleteMany({});
  await prisma.communityPost.deleteMany({});

  // 2. Chèn các bài đăng chất lượng cao bằng tiếng Việt
  const post1 = await prisma.communityPost.create({
    data: {
      userId: user1.id,
      title: 'Phân tích xu hướng BTC sau cú điều chỉnh sâu - Cơ hội Gom hàng? 📉🚀',
      content: `Thị trường vừa qua đã chứng kiến một cú rũ bỏ (shakeout) mạnh mẽ đưa giá Bitcoin giảm gần 12% từ đỉnh ngắn hạn về quanh vùng hỗ trợ $61,500. Dưới đây là góc nhìn kỹ thuật của mình:\n\n1. Khung Daily (D1): Chỉ báo RSI đã chạm vùng quá bán (oversold) ở mức 30, đây là vùng có lực cầu bắt đáy lịch sử rất mạnh.\n2. Dòng tiền On-chain: Dữ liệu Glassnode cho thấy lượng BTC rút khỏi các sàn giao dịch (Exchange Outflow) tăng vọt. Các ví cá voi tiếp tục tích lũy thêm hơn 15,000 BTC trong 48 giờ qua.\n\nKết luận: Đây là nhịp điều chỉnh lành mạnh trong xu hướng tăng dài hạn. Vùng $61,000 - $62,000 là vùng gom hàng (DCA) cực kỳ lý tưởng cho chu kỳ Halving sắp tới. Chúc anh em giao dịch an toàn!`,
      category: 'Phân tích kỹ thuật',
      imageUrl: '/btc_chart_analysis.png',
    },
  });

  const post2 = await prisma.communityPost.create({
    data: {
      userId: user2.id,
      title: 'Hướng dẫn đa dạng hóa danh mục cho người mới tham gia thị trường 📚',
      content: `Nhiều bạn mới nhắn tin hỏi mình: "Em có 1000$ thì nên mua coin nào và chia tỷ lệ ra sao?". Để sống sót qua các chu kỳ biến động khốc liệt của Crypto, việc phân bổ vốn (Asset Allocation) là yếu tố sống còn. Dưới đây là công thức an toàn mà mình đúc kết sau 6 năm lăn lộn:\n\n1. 50% - Bitcoin (BTC) & Ethereum (ETH): Đây là móng nhà của bạn. Luôn giữ tỷ lệ lớn nhất ở 2 coin top đầu để đảm bảo tính thanh khoản và hạn chế rủi ro giảm giá sâu.\n2. 30% - Nền tảng Layer 1/Layer 2 tiềm năng (SOL, NEAR, OP, ARB): Nhóm này có tốc độ tăng trưởng tốt hơn coin top nhưng biến động mạnh hơn.\n3. 10% - Altcoins vốn hóa nhỏ/Meme coins (WIF, FLOKI, PEPE): Chỉ dùng tối đa 10% vốn để đầu cơ lướs sóng kiếm lợi nhuận đột biến.\n4. 10% - Stablecoin (USDT/USDC): Luôn giữ tiền mặt dự phòng để mua thêm khi thị trường có những cú sập bất ngờ.\n\nĐừng bao giờ ALL-IN vào một đồng coin duy nhất nhé các bạn!`,
      category: 'Kiến thức nền tảng',
      imageUrl: '/portfolio_diversification.png',
    },
  });

  const post3 = await prisma.communityPost.create({
    data: {
      userId: user3.id,
      title: 'Tín hiệu Short ETH ngắn hạn vùng kháng cự $3,650 🚨',
      content: `Cảnh báo tín hiệu giao dịch ngắn hạn cho anh em Trader F0/F1:\n\n- Cặp giao dịch: ETH/USDT (Mô phỏng Futures/Spot)\n- Xu hướng: Short/Bán xuống ngắn hạn\n- Vùng entry gom Short: $3,630 - $3,660\n- Stop Loss (Cắt lỗ): $3,710 (Đóng nến H4 trên cản)\n- Take Profit (Chốt lời): TP1: $3,520 | TP2: $3,450\n\nLý lý: ETH đang hoàn thành mô hình 2 đỉnh (Double Top) trên khung H4 và áp lực bán tại vùng cản tâm lý $3,650 đang tăng lên rõ rệt. Quản lý vốn chặt chẽ và không đi lệnh quá 5% tài khoản nhé!`,
      category: 'Nhóm tín hiệu',
    },
  });

  const post4 = await prisma.communityPost.create({
    data: {
      userId: user1.id,
      title: 'Review sàn giao dịch mô phỏng - Công cụ luyện tập tuyệt vời cho Trader mới',
      content: `Mình vừa dành 2 ngày trải nghiệm tính năng Giao Dịch Giả Lập trên nền tảng này và thực sự bị bất ngờ. Tốc độ khớp lệnh khớp 100% theo giá Binance thời gian thực. Giao diện biểu đồ mượt mà và trực quan.\n\nKhuyên thật lòng các bạn mới tham gia thị trường đừng vội nạp tiền thật vào cúng cho sàn. Hãy dành ít nhất 1-2 tháng luyện tập trade giả lập tại đây để rèn luyện tâm lý giao dịch và thử nghiệm các chiến thuật trước khi xuống tiền thật nhé!`,
      category: 'Feed Tổng hợp',
    },
  });

  console.log('Đã tạo xong các bài đăng cộng đồng mẫu!');

  // 3. Tạo một số bình luận cho các bài viết
  await prisma.communityComment.create({
    data: {
      postId: post1.id,
      userId: user2.id,
      content: 'Bài phân tích rất chi tiết và chất lượng! Mình cũng vừa đặt lệnh DCA thêm ETH vùng này.',
    },
  });

  await prisma.communityComment.create({
    data: {
      postId: post1.id,
      userId: user3.id,
      content: 'Cá voi đang gom ròng rã suốt tuần qua rồi, nhịp rũ này là cơ hội cuối trước khi cất cánh.',
    },
  });

  await prisma.communityComment.create({
    data: {
      postId: post2.id,
      userId: user1.id,
      content: 'Công thức phân bổ vốn chuẩn mực! Rất nhiều người mới cháy tài khoản chỉ vì All-in meme coins.',
    },
  });

  await prisma.communityComment.create({
    data: {
      postId: post3.id,
      userId: user2.id,
      content: 'Đã khớp lệnh Short vùng $3,640. Kèo thơm quá, cảm ơn Admin nhiều!',
    },
  });

  // 4. Tạo một vài lượt thích ban đầu cho bài viết
  await prisma.communityPostLike.create({
    data: {
      postId: post1.id,
      userId: user2.id,
    },
  });

  await prisma.communityPostLike.create({
    data: {
      postId: post1.id,
      userId: user3.id,
    },
  });

  await prisma.communityPostLike.create({
    data: {
      postId: post2.id,
      userId: user1.id,
    },
  });

  // Cập nhật lại likesCount và commentsCount tương ứng
  await prisma.communityPost.update({
    where: { id: post1.id },
    data: { likesCount: 2, commentsCount: 2 },
  });

  await prisma.communityPost.update({
    where: { id: post2.id },
    data: { likesCount: 1, commentsCount: 1 },
  });

  await prisma.communityPost.update({
    where: { id: post3.id },
    data: { likesCount: 0, commentsCount: 1 },
  });

  console.log('Seed dữ liệu cộng đồng hoàn thành 100%!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
