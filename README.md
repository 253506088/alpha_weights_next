# 基金宝：前十重仓股估值看板

基于 Next.js 的客户端基金实时估值看板，通过抓取基金前十大重仓股的实时涨跌幅来估算基金当日净值变化。

## 项目简述

### 核心功能
- **实时估值计算**：根据前十大重仓股及其持仓占比，结合股票实时涨跌幅计算基金预估涨跌
- **历史走势图表**：记录盘中估值变化，支持回溯查看
- **净值显示**：展示昨日净值和预估净值
- **响应式设计**：PC 端和移动端独立界面，自动适配

### 数据来源
- **基金持仓**：东方财富网（季报数据）
- **实时股价**：腾讯财经（每分钟更新）
- **昨日净值**：天天基金

### 技术栈
- **框架**: Next.js 16 + React 19
- **样式**: TailwindCSS 4 + 自定义 CSS
- **图表**: ECharts
- **存储**: LocalStorage（纯前端，无需后端）

---

## 所需环境

- **Node.js**: >= 18.x
- **npm** 或 **pnpm** 或 **yarn**

---

## 安装依赖

```bash
# 进入项目目录
cd alpha_weights_next

# 安装依赖
npm install
```

---

## 启动 & 编译

### 开发模式

```bash
npm run dev
```

访问 http://localhost:3000 查看效果。支持热更新。

### 生产编译

```bash
npm run build
```

编译输出到 `.next/` 目录。

### 本地预览生产版本

```bash
npm run build
npm run start
```

---

## 发布到 GitHub Pages

### 1. 配置静态导出

修改 `next.config.ts`：

```typescript
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'export',      // 启用静态导出
  images: { unoptimized: true },  // 禁用图片优化
  basePath: '/你的仓库名',  // 如果部署到 username.github.io/repo-name
  assetPrefix: '/你的仓库名/',
};

export default nextConfig;
```

> 如果部署到 `username.github.io`（用户主页），则不需要 `basePath` 和 `assetPrefix`。

### 2. 构建静态文件

```bash
npm run build
```

构建完成后，静态文件生成在 `out/` 目录。

### 3. 部署到 GitHub Pages

**方法一：手动上传**

1. 将 `out/` 目录的内容提交到 `gh-pages` 分支
2. 在仓库 Settings → Pages → Source 选择 `gh-pages` 分支

**方法二：使用 GitHub Actions（推荐）**

在项目根目录创建 `.github/workflows/deploy.yml`：

```yaml
name: Deploy to GitHub Pages

on:
  push:
    branches: [main]

jobs:
  build-and-deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Build
        run: npm run build
      
      - name: Deploy to GitHub Pages
        uses: peaceiris/actions-gh-pages@v3
        with:
          github_token: ${{ secrets.GITHUB_TOKEN }}
          publish_dir: ./out
```

### 4. 启用 Pages

1. 进入仓库 Settings → Pages
2. Source 选择 `gh-pages` 分支（或 GitHub Actions）
3. 等待部署完成后访问 `https://用户名.github.io/仓库名/`

---

## 使用说明

1. 打开页面，输入 6 位基金代码（如 `000478`），点击添加
2. 卡片每分钟自动更新估值
3. 点击卡片查看盘中走势图和持仓详情
4. 点击"设置"可导出/导入配置

---

## 测试隔日更新

1. 按一下键盘上的 F12 键（或者右键点击页面 -> 检查），打开开发者工具。
2. 点一下 “Console” (或者 “控制台”) 那个标签。
3. 把下面这段代码复制进去，按回车：

```JS
const key = 'alpha_weights_funds';
const funds = JSON.parse(localStorage.getItem(key) || '[]');
funds.forEach(f => f.lastUpdate = new Date().getTime() - 86400000 * 2); 
localStorage.setItem(key, JSON.stringify(funds));
alert('时间已重置！请刷新页面。');
```

## 注意事项

⚠️ 估值仅供参考，实际净值请以基金公司官方公布为准。

因只计算前十大重仓（通常占 50%-70% 仓位），与实际波动会有一定偏差。仓位占比越高，估值越准。

**本程序不构成任何投资建议！**

---

## License

本项目基于 [GPL-3.0](LICENSE) 协议开源。
