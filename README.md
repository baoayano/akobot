# AkoBot - Economy Discord Bot

AkoBot là một Discord bot kinh tế xây dựng bằng Discord.js v14 và TypeScript, cung cấp hệ thống quản lý tiền tệ (xu và hồng ngọc) cho cộng đồng server. 
Bot hỗ trợ song song slash command và prefix command với prefix cố định là `ako`, kèm theo hệ thống ghi nhật ký giao dịch tự động và user registration flow.

## Cài đặt

1. Cài dependency:

```bash
npm install
```

2. Tạo file `.env` từ `.env.example` và điền thông tin bot.

3. Build nếu muốn chạy production:

```bash
npm run build
```

4. Đăng ký slash command:

```bash
npm run deploy
```

5. Chạy bot:

```bash
npm run dev
```

## Cấu trúc

- `src/index.ts`: entrypoint khởi động bot
- `src/handlers/loadCommands.ts`: loader command
- `src/handlers/loadEvents.ts`: loader event
- `src/commands`: nơi đặt slash command
- `src/events`: nơi đặt event handler
- `scripts/deploy-commands.ts`: đăng ký slash command lên Discord

## Tính năng chính

- **Hệ thống tiền tệ**: Xu (cash) và hồng ngọc (ruby) cho mỗi user
- **Ghi nhật ký giao dịch**: Tự động theo dõi tất cả giao dịch give/receive/withdraw
- **User registration**: Yêu cầu đăng ký trước khi sử dụng bot (tích hợp button interaction)
- **Slash & Prefix commands**: Hỗ trợ `/command` và `ako command`
- **MongoDB integration**: Lưu trữ dữ liệu người dùng và lịch sử giao dịch

## Các lệnh khả dụng

Xem [src/commands/utility/help.ts](src/commands/utility/help.ts) để xem toàn bộ danh sách lệnh hiện tại.

### Lệnh tài chính
- `/cash` hoặc `akocash` - Hiển thị số xu hiện có
- `/ruby` hoặc `akoruby` - Hiển thị số hồng ngọc hiện có
- `/give` hoặc `akogive` - Chuyển xu cho người khác
- `/daily` hoặc `akodaily` - Nhận phần thưởng hàng ngày

### Lệnh tiện ích
- `/help` hoặc `akohelp` - Hiển thị danh sách lệnh
- `/ping` hoặc `akoping` - Kiểm tra độ trễ bot
- `/level` hoặc `akolevel` - Xem cấp độ của bạn

## Thêm command mới

Tạo một file `.ts` trong `src/commands` và export object có `data` và `execute`.
Command đó sẽ tự chạy được ở cả hai dạng: `/ten-lenh` và `ako ten-lenh` theo tên command.

Ví dụ:

```typescript
import { SlashCommandBuilder } from 'discord.js';
import type { BotClient, CommandContext } from '../../types.js';

export default {
  data: new SlashCommandBuilder()
    .setName('test')
    .setDescription('Command thử nghiệm'),
  async execute(context: CommandContext, _client: BotClient) {
    await context.reply('OK');
  },
};
```

## Biến môi trường

- `DISCORD_TOKEN`: Token bot Discord (từ Developer Portal)
- `CLIENT_ID`: Application Client ID
- `GUILD_ID`: Guild ID để deploy nhanh trong server test
- `MONGO_URI`: Connection string MongoDB (ví dụ: `mongodb://localhost:27017/akobot`)

**Lưu ý**: Để prefix command hoạt động, bot cần bật privileged intent `Message Content Intent` trong Discord Developer Portal.

## Cấu trúc dự án

```
src/
├── index.ts                 # Entry point
├── config.ts                # Cấu hình (token, prefix, v.v...)
├── types.ts                 # TypeScript interfaces
├── commands/
│   ├── economy/             # Lệnh tài chính
│   │   ├── cash.ts
│   │   ├── give.ts
│   │   └── ...
│   └── utility/             # Lệnh tiện ích
│       ├── help.ts
│       ├── ping.ts
│       └── ...
├── events/
│   ├── ready.ts
│   ├── interactionCreate.ts
│   ├── messageCreate.ts
│   ├── registration.ts
│   ├── buttonHandler.ts
│   └── buttons/
│       └── registrationButtons.ts
├── handlers/
│   ├── loadCommands.ts
│   └── loadEvents.ts
├── schemas/
│   ├── users.ts             # User model (cash, ruby, level, rank, exp)
│   └── transactions.ts      # Transaction log model
└── utils/
    ├── emoji.ts             # Utility hàm emoji
    ├── embed.ts             # Utility hàm EmbedBuilder
    ├── number.ts            # Utility format số
    ├── user.ts              # User database queries
    ├── mongoose.ts          # MongoDB connection
    └── transactions.ts      # Transaction helpers
```
