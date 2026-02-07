# ShineMonitor ESS - Deployment Guide

Complete instructions for deploying the ShineMonitor ESS PWA to various platforms.

## Quick Start (Local Testing)

### Python 3
```bash
cd /path/to/shinemonitor-pwa
python3 -m http.server 8000
# Access: http://localhost:8000
```

### Python 2
```bash
python -m SimpleHTTPServer 8000
```

### Node.js (http-server)
```bash
npm install -g http-server
http-server
# Access: http://localhost:8080
```

### Node.js (Express)
```bash
npm install express
node -e "require('express')().use(require('express').static('.')).listen(8000)"
```

### PHP
```bash
php -S localhost:8000
```

## Production Deployment

### Option 1: nginx (Recommended)

**Installation**
```bash
sudo apt-get update
sudo apt-get install nginx
sudo systemctl start nginx
sudo systemctl enable nginx
```

**Configuration** (`/etc/nginx/sites-available/shinemonitor`)
```nginx
server {
    listen 80;
    listen [::]:80;
    server_name shinemonitor.example.com;

    root /var/www/shinemonitor-pwa;
    index index.html;

    # Gzip compression
    gzip on;
    gzip_types text/plain text/css text/javascript application/json;
    gzip_min_length 256;

    # Cache static assets
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # Service worker - no cache
    location = /sw.js {
        expires -1;
        add_header Cache-Control "public, must-revalidate, proxy-revalidate";
    }

    # Manifest - no cache
    location = /manifest.json {
        expires -1;
        add_header Cache-Control "public, must-revalidate, proxy-revalidate";
    }

    # HTML - no cache
    location = /index.html {
        expires -1;
        add_header Cache-Control "public, must-revalidate, proxy-revalidate";
    }

    # Single Page App - serve index.html for all routes
    location / {
        try_files $uri $uri/ /index.html;
    }

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;
}

# Redirect HTTP to HTTPS
server {
    listen 80;
    listen [::]:80;
    server_name shinemonitor.example.com;
    return 301 https://$server_name$request_uri;
}
```

**Enable and reload**
```bash
sudo ln -s /etc/nginx/sites-available/shinemonitor /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

### Option 2: Apache

**Installation**
```bash
sudo apt-get update
sudo apt-get install apache2
sudo a2enmod rewrite
sudo a2enmod headers
sudo systemctl start apache2
sudo systemctl enable apache2
```

**Configuration** (`/etc/apache2/sites-available/shinemonitor.conf`)
```apache
<VirtualHost *:80>
    ServerName shinemonitor.example.com
    DocumentRoot /var/www/shinemonitor-pwa

    <Directory /var/www/shinemonitor-pwa>
        Options -Indexes +FollowSymLinks
        AllowOverride All
        Require all granted

        # Single Page App routing
        <IfModule mod_rewrite.c>
            RewriteEngine On
            RewriteBase /
            RewriteCond %{REQUEST_FILENAME} !-f
            RewriteCond %{REQUEST_FILENAME} !-d
            RewriteRule ^(.*)$ index.html [L]
        </IfModule>
    </Directory>

    # Gzip compression
    <IfModule mod_deflate.c>
        AddOutputFilterByType DEFLATE text/html text/plain text/xml
        AddOutputFilterByType DEFLATE text/css text/javascript
        AddOutputFilterByType DEFLATE application/javascript application/json
        AddOutputFilterByType DEFLATE image/svg+xml
    </IfModule>

    # Cache control
    <IfModule mod_headers.c>
        # Static assets - cache for 1 year
        <FilesMatch "\.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$">
            Header set Cache-Control "max-age=31536000, public"
        </FilesMatch>

        # Service worker - no cache
        <Files sw.js>
            Header set Cache-Control "max-age=0, no-cache, must-revalidate"
        </Files>

        # Manifest - no cache
        <Files manifest.json>
            Header set Cache-Control "max-age=0, no-cache, must-revalidate"
        </Files>

        # HTML - no cache
        <Files index.html>
            Header set Cache-Control "max-age=0, no-cache, must-revalidate"
        </Files>

        # Security headers
        Header always set X-Frame-Options "SAMEORIGIN"
        Header always set X-Content-Type-Options "nosniff"
        Header always set X-XSS-Protection "1; mode=block"
    </IfModule>

    # Logs
    ErrorLog ${APACHE_LOG_DIR}/shinemonitor-error.log
    CustomLog ${APACHE_LOG_DIR}/shinemonitor-access.log combined
</VirtualHost>

# HTTP to HTTPS redirect
<VirtualHost *:80>
    ServerName shinemonitor.example.com
    Redirect permanent / https://shinemonitor.example.com/
</VirtualHost>
```

**Enable and test**
```bash
sudo a2ensite shinemonitor
sudo apache2ctl configtest
sudo systemctl reload apache2
```

### Option 3: Docker (Recommended for Kubernetes)

**Dockerfile**
```dockerfile
FROM nginx:alpine

# Copy app files
COPY . /usr/share/nginx/html/

# Copy nginx config
COPY nginx.conf /etc/nginx/nginx.conf

# Expose port
EXPOSE 80 443

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD wget --quiet --tries=1 --spider http://localhost/index.html || exit 1
```

**nginx.conf** (for Docker)
```nginx
user nginx;
worker_processes auto;
error_log /var/log/nginx/error.log warn;
pid /var/run/nginx.pid;

events {
    worker_connections 1024;
}

http {
    include /etc/nginx/mime.types;
    default_type application/octet-stream;

    log_format main '$remote_addr - $remote_user [$time_local] "$request" '
                    '$status $body_bytes_sent "$http_referer" '
                    '"$http_user_agent" "$http_x_forwarded_for"';

    access_log /var/log/nginx/access.log main;

    sendfile on;
    tcp_nopush on;
    keepalive_timeout 65;

    gzip on;
    gzip_types text/plain text/css text/javascript application/json
               application/javascript image/svg+xml;

    server {
        listen 80;
        root /usr/share/nginx/html;
        index index.html;

        location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2)$ {
            expires 1y;
            add_header Cache-Control "public, immutable";
        }

        location = /sw.js {
            expires -1;
            add_header Cache-Control "public, must-revalidate";
        }

        location = /manifest.json {
            expires -1;
            add_header Cache-Control "public, must-revalidate";
        }

        location = /index.html {
            expires -1;
            add_header Cache-Control "public, must-revalidate";
        }

        location / {
            try_files $uri $uri/ /index.html;
        }
    }
}
```

**Build and run**
```bash
docker build -t shinemonitor-pwa .
docker run -d -p 80:80 --name shinemonitor shinemonitor-pwa
```

**Docker Compose**
```yaml
version: '3.8'

services:
  shinemonitor:
    build: .
    container_name: shinemonitor-pwa
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./ssl:/etc/nginx/ssl:ro  # If using SSL
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "wget", "--quiet", "--tries=1", "--spider", "http://localhost/"]
      interval: 30s
      timeout: 3s
      retries: 3
      start_period: 5s
```

### Option 4: Node.js (Express)

**server.js**
```javascript
const express = require('express');
const compression = require('compression');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Compression
app.use(compression());

// Static files with cache headers
app.use(express.static(path.join(__dirname), {
    maxAge: 0,
    setHeaders: (res, filePath) => {
        // Cache static assets
        if (/\.(js|css|woff|woff2|ttf|eot|svg|png|jpg|jpeg|gif|ico)$/.test(filePath)) {
            res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
        }
        // Don't cache service worker
        else if (filePath.endsWith('sw.js')) {
            res.setHeader('Cache-Control', 'public, max-age=0, must-revalidate');
        }
        // Don't cache manifest
        else if (filePath.endsWith('manifest.json')) {
            res.setHeader('Cache-Control', 'public, max-age=0, must-revalidate');
        }
        // Don't cache HTML
        else if (filePath.endsWith('.html')) {
            res.setHeader('Cache-Control', 'public, max-age=0, must-revalidate');
        }

        // Security headers
        res.setHeader('X-Frame-Options', 'SAMEORIGIN');
        res.setHeader('X-Content-Type-Options', 'nosniff');
        res.setHeader('X-XSS-Protection', '1; mode=block');
    }
}));

// SPA routing
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Error handling
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).send('Internal server error');
});

app.listen(PORT, () => {
    console.log(`ShineMonitor ESS listening on port ${PORT}`);
    console.log(`Access at http://localhost:${PORT}`);
});
```

**package.json**
```json
{
    "name": "shinemonitor-pwa",
    "version": "3.43.0.1",
    "description": "ShineMonitor ESS Progressive Web App",
    "main": "server.js",
    "scripts": {
        "start": "node server.js",
        "dev": "node server.js",
        "prod": "NODE_ENV=production node server.js"
    },
    "dependencies": {
        "express": "^4.18.2",
        "compression": "^1.7.4"
    }
}
```

**Run**
```bash
npm install
npm start
# Access: http://localhost:3000
```

### Option 5: AWS S3 + CloudFront

**S3 Setup**
```bash
# Create bucket
aws s3 mb s3://shinemonitor-pwa

# Upload files
aws s3 sync . s3://shinemonitor-pwa --exclude ".git/*"

# Set public access
aws s3api put-bucket-policy --bucket shinemonitor-pwa \
    --policy file://bucket-policy.json
```

**bucket-policy.json**
```json
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Sid": "PublicRead",
            "Effect": "Allow",
            "Principal": "*",
            "Action": "s3:GetObject",
            "Resource": "arn:aws:s3:::shinemonitor-pwa/*"
        }
    ]
}
```

**CloudFront Distribution**
- Origin: S3 bucket endpoint
- Default root object: index.html
- Cache behaviors:
  - Static assets (*.js, *.css, *.svg): 1 year
  - sw.js, manifest.json: 0 seconds
  - index.html: 0 seconds
- Enable compression
- Enable HTTPS redirect

## HTTPS Setup

### Let's Encrypt with Certbot (nginx/Apache)

```bash
sudo apt-get install certbot python3-certbot-nginx
sudo certbot certonly --nginx -d shinemonitor.example.com
sudo certbot renew --dry-run  # Test auto-renewal
```

**Auto-renewal**
```bash
sudo systemctl enable certbot.timer
sudo systemctl start certbot.timer
```

### Manual Certificate

```bash
# Generate private key
openssl genrsa -out private.key 2048

# Generate CSR
openssl req -new -key private.key -out request.csr

# Get certificate signed (via CA)
# Then update nginx/Apache to point to certificate
```

## CORS Proxy Setup (For HTTP API Access)

If your PWA is HTTPS but API is HTTP, set up a CORS proxy.

### Simple Node.js Proxy

**cors-proxy.js**
```javascript
const http = require('http');
const https = require('https');
const url = require('url');

const TARGET = 'http://android.shinemonitor.com';

const server = http.createServer((req, res) => {
    // CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        res.writeHead(200);
        res.end();
        return;
    }

    const proxyUrl = TARGET + req.url;
    const parsedUrl = url.parse(proxyUrl);

    const proxyReq = http.request({
        hostname: parsedUrl.hostname,
        port: parsedUrl.port,
        path: parsedUrl.path,
        method: req.method,
        headers: req.headers
    }, (proxyRes) => {
        res.writeHead(proxyRes.statusCode, proxyRes.headers);
        proxyRes.pipe(res);
    });

    proxyReq.on('error', (err) => {
        res.writeHead(500);
        res.end('Proxy error: ' + err.message);
    });

    req.pipe(proxyReq);
});

server.listen(3001, () => {
    console.log('CORS proxy listening on port 3001');
});
```

**Update API URL in settings to**: `http://your-proxy-server:3001/public/`

## Monitoring & Logging

### Access Logs (nginx)
```bash
tail -f /var/log/nginx/access.log
```

### Error Logs (nginx)
```bash
tail -f /var/log/nginx/error.log
```

### Application Monitoring (Browser Console)
```javascript
// Enable debug mode
localStorage.setItem('debug_mode', 'true');
location.reload();
```

## Performance Optimization

### Enable Gzip
Already configured in all examples above.

### CDN Configuration
- Static assets served from CDN
- TTL: 1 year for versioned assets
- Fallback to origin for HTML/manifests

### Service Worker Pre-caching
Service worker automatically caches:
- All JavaScript files
- All CSS files
- Main HTML
- Manifest

### Browser Caching
- Static: 1 year (far future)
- Manifests: No cache
- HTML: No cache
- Service worker: Must-revalidate

## Scaling

### Multiple Servers
Use load balancer (nginx, HAProxy, AWS ELB):
```nginx
upstream shinemonitor {
    server server1.example.com:80;
    server server2.example.com:80;
    server server3.example.com:80;
}

server {
    location / {
        proxy_pass http://shinemonitor;
    }
}
```

### Kubernetes
Use provided Docker image with:
```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
    name: shinemonitor
spec:
    replicas: 3
    template:
        spec:
            containers:
                - name: shinemonitor
                  image: shinemonitor-pwa:latest
                  ports:
                      - containerPort: 80
```

## Troubleshooting

### Files not found (404)
- Check file paths in nginx/Apache config
- Verify SPA routing configuration
- Check if `index.html` exists

### Service Worker not registering
- Must be served over HTTPS (or localhost)
- Check `/sw.js` is accessible
- Browser console shows registration errors

### API calls blocked
- Check CORS headers
- Verify API base URL in settings
- Set up CORS proxy if needed

### Cache issues
- Clear browser cache: Ctrl+Shift+Delete
- Check Cache-Control headers
- Service worker: DevTools → Application → Clear Storage

## Security Checklist

- [ ] HTTPS enabled
- [ ] Security headers set (X-Frame-Options, etc.)
- [ ] CORS properly configured
- [ ] API rate limiting enabled
- [ ] Firewall rules configured
- [ ] Regular certificate renewal automated
- [ ] Logs monitored for suspicious activity
- [ ] Service worker verified

## Maintenance

### Regular Updates
```bash
# Check for security patches
npm audit

# Update dependencies
npm update
```

### Log Rotation (logrotate)
```
/var/log/nginx/*.log {
    daily
    rotate 14
    compress
    delaycompress
    notifempty
    create 0640 www-data adm
    sharedscripts
    postrotate
        systemctl reload nginx > /dev/null 2>&1 || true
    endscript
}
```

## Support

For deployment issues, check:
1. Web server error logs
2. Browser console (F12)
3. Service worker status
4. API connectivity with curl:
   ```bash
   curl "http://android.shinemonitor.com/public/?action=..."
   ```
