以下是完整的前后端运行指南：

### 1. 启动后端 (Backend)
后端是一个 FastAPI 服务，入口在 lightrag/api/lightrag_server.py 。

在项目根目录 D:\PyCharm\workspace\lightragv1.4.9.8 下打开一个新的终端，运行：

```
# 1. 确保环境变量配置正确（根目录下已
有 .env 文件）
# 2. 启动服务
python -m lightrag.api.lightrag_server
```
- 默认端口 ：9621
- API 文档地址 ： http://localhost:9621/redoc
### 2. 启动前端 (Frontend)
前端位于 lightrag_webui 目录，是一个 Vite 项目。

在项目根目录下打开 另一个 终端，运行：

```
# 1. 进入前端目录
cd lightrag_webui

# 2. 安装依赖 (如果之前没安装过)
npm install

# 3. 启动开发服务器 (使用无 bun 模式)
npm run dev-no-bun
```
- 默认访问地址 ： http://localhost:5173
- 注意 ： dev-no-bun 命令会直接调用 vite ，它配置了代理（ vite.config.ts ），会将 API 请求转发到 http://localhost:9621 ，所以请确保后端已经启动。