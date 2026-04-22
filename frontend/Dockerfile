# Frontend Dockerfile — Nginx serving static React files
FROM nginx:alpine

# Replace the default nginx config with ours
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copy our static frontend files into the web root
COPY src/ /usr/share/nginx/html/

EXPOSE 80
