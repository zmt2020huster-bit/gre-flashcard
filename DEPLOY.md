# GRE 8000 刷词器 - 部署指南

## 架构概览

```
浏览器 (HTML)  ←→  Cloudflare Worker (/api/*)  ←→  D1 (SQLite)
     ↓
  Cloudflare Pages (静态托管)
```

- **前端**：单个 HTML 文件，部署到 Cloudflare Pages
- **后端**：Cloudflare Worker，提供用户注册 + 进度同步 API
- **数据库**：Cloudflare D1（SQLite），存用户信息和学习进度
- **成本**：全部免费额度内

---

## Step 1：创建 D1 数据库

1. 登录 [Cloudflare Dashboard](https://dash.cloudflare.com)
2. 左侧菜单 → **Workers & Pages** → **D1 SQL Database**
3. 点击 **Create database**
4. 名称填 `gre-flashcard-db`，点击 Create
5. 进入数据库详情页，点击 **Console** 标签
6. 把 `worker/schema.sql` 的内容粘贴进去执行：

```sql
CREATE TABLE IF NOT EXISTS users (
  uid        TEXT PRIMARY KEY,
  nickname   TEXT NOT NULL,
  secret     TEXT NOT NULL UNIQUE,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS progress (
  uid        TEXT PRIMARY KEY,
  data       TEXT NOT NULL DEFAULT '{}',
  updated_at TEXT NOT NULL,
  FOREIGN KEY (uid) REFERENCES users(uid)
);

CREATE INDEX IF NOT EXISTS idx_users_secret ON users(secret);
```

7. **记下数据库的 Database ID**（在数据库详情页顶部可以看到）

---

## Step 2：部署 Worker

1. 左侧菜单 → **Workers & Pages** → **Create**
2. 选择 **Create Worker**
3. 名称填 `gre-flashcard-api`，点击 Deploy
4. 部署成功后点击 **Edit code**
5. 把 `worker/index.js` 的全部内容粘贴替换编辑器中的代码
6. 点击 **Deploy** 保存

### 绑定 D1 数据库

7. 回到 Worker 详情页 → **Settings** → **Bindings**
8. 点击 **Add** → 选择 **D1 Database**
9. Variable name 填 `DB`，选择刚创建的 `gre-flashcard-db`
10. 保存后重新部署（Settings 页面顶部会提示 redeploy）

### 记下 Worker URL

部署成功后会得到一个 URL，格式如：
```
https://gre-flashcard-api.<your-subdomain>.workers.dev
```

---

## Step 3：配置前端 API 地址

编辑 `public/index.html`，找到这一行：

```javascript
const API_BASE = '__API_BASE__';
```

替换为你的 Worker URL：

```javascript
const API_BASE = 'https://gre-flashcard-api.<your-subdomain>.workers.dev';
```

替换后提交到 Git。

---

## Step 4：部署前端到 Cloudflare Pages

### 方式 A：连接 Git 仓库（推荐，自动部署）

1. 左侧菜单 → **Workers & Pages** → **Create**
2. 选择 **Pages** → **Connect to Git**
3. 授权并选择你的 Git 仓库
4. 配置构建：
   - **Framework preset**: None
   - **Build command**: 留空（无需构建）
   - **Build output directory**: `public`
5. 点击 **Save and Deploy**
6. 以后每次 push 代码，Pages 自动更新

### 方式 B：直接上传

1. 左侧菜单 → **Workers & Pages** → **Create**
2. 选择 **Pages** → **Upload assets**
3. 项目名称填 `gre-flashcard`
4. 上传 `public/` 目录下的文件
5. 点击 Deploy

部署成功后得到 URL：
```
https://gre-flashcard.pages.dev
```

---

## Step 5：验证

1. 打开 Pages URL
2. 输入昵称注册
3. 刷几个词
4. 打开设置，确认同步状态显示绿色 ● 已同步
5. 换一个浏览器/手机，用恢复码登录，确认进度已同步

---

## 自定义域名（可选）

如果你有自己的域名：
1. Pages 详情页 → **Custom domains** → **Set up a custom domain**
2. 输入域名，按提示配置 DNS

---

## 文件结构

```
gre-flashcard/
├── public/
│   └── index.html        # 前端（含 7744 词内嵌数据）
├── worker/
│   ├── index.js          # Worker 后端代码
│   ├── schema.sql        # D1 建表语句
│   └── wrangler.toml     # Worker 配置（wrangler CLI 部署时使用）
├── .gitignore
├── README.md
└── DEPLOY.md             # 本文件
```

---

## 数据安全

| 层级 | 机制 | 说明 |
|------|------|------|
| L1 | localStorage | 每次标记自动保存到本地 |
| L2 | D1 云数据库 | 每批操作防抖 3 秒后自动同步 |
| L3 | JSON 导出 | 设置页可手动导出进度文件 |

- 即使断网，localStorage 兜底，联网后自动合并上传
- D1 数据库有 Cloudflare 的自动备份
- 每个用户数据通过 uid 完全隔离

---

## 常见问题

**Q: 手机上怎么访问？**
A: 直接用手机浏览器打开 Pages URL

**Q: 能加到手机主屏幕吗？**
A: Safari → 分享 → 添加到主屏幕；Chrome → 菜单 → 添加到主屏幕

**Q: 换手机了怎么办？**
A: 设置 → 显示恢复密钥 → 复制。新设备选"恢复码登录"粘贴即可

**Q: 免费额度够吗？**
A: 远远够。Worker 每天 10 万请求、D1 每天 500 万读 + 10 万写、Pages 无限带宽
