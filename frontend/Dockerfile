# ========================================
# CodeForge IDE - Frontend Dockerfile
# Multi-platform support: ARM64 & AMD64
# ========================================

# 使用官方 nginx alpine 镜像（支持多平台）
FROM --platform=$BUILDPLATFORM nginx:1.25-alpine AS builder

# 设置工作目录
WORKDIR /app

# 复制前端源文件
COPY . /app/

# 生产阶段
FROM nginx:1.25-alpine

# 设置标签
LABEL maintainer="CodeForge IDE"
LABEL description="Online Code Editor supporting Python, C, C++"
LABEL version="1.0.0"

# 删除默认配置
RUN rm -rf /usr/share/nginx/html/*
RUN rm /etc/nginx/conf.d/default.conf

# 复制自定义 nginx 配置
COPY nginx.conf /etc/nginx/conf.d/default.conf

# 复制前端静态文件到 nginx 目录
COPY --from=builder /app/ /usr/share/nginx/html/

# 设置文件权限
RUN chmod -R 755 /usr/share/nginx/html

# 健康检查
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost:80/ || exit 1

# 暴露端口
EXPOSE 80

# 启动 nginx
CMD ["nginx", "-g", "daemon off;"]
