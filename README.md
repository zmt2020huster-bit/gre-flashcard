# GRE 8000 刷词器

高效 GRE 词汇学习工具，支持多用户 + 云同步。

## 功能

- 📚 内置 7744 个 GRE 核心词汇（含音标 + 中文释义）
- 🔊 英语发音（Web Speech API）
- 🚀 每日分批刷词，四种学习模式（新词优先 / 复习 / 全部复习 / 随机）
- ☁️ 自动云同步（Cloudflare D1），多设备进度一致
- 👥 多用户数据隔离，可邀请朋友一起用
- 📱 移动端适配，手机电脑都能用
- ⌨️ 电脑端键盘快捷键（Space 翻转 / 1·2·3 评分 / S 发音）

## 架构

```
浏览器 (HTML)  ←→  Cloudflare Worker (/api/*)  ←→  D1 (SQLite)
     ↓
Cloudflare Pages (静态托管)
```

| 组件 | 说明 | 目录 |
|------|------|------|
| 前端 | 单 HTML 文件，内嵌词表数据 | `public/` |
| 后端 | Cloudflare Worker，4 个 API 接口 | `worker/` |
| 数据库 | Cloudflare D1 (SQLite) | `worker/schema.sql` |

## 部署

详见 [DEPLOY.md](./DEPLOY.md)

## 数据安全

| 层级 | 机制 | 说明 |
|------|------|------|
| L1 | localStorage | 每次操作即时本地保存 |
| L2 | D1 云数据库 | 3 秒防抖自动同步 |
| L3 | JSON 导出 | 设置页手动导出备份 |

## 技术栈

- 前端：原生 HTML/CSS/JS（零依赖）
- 后端：Cloudflare Workers
- 数据库：Cloudflare D1
- 托管：Cloudflare Pages
- 成本：全部在免费额度内

## License

MIT
