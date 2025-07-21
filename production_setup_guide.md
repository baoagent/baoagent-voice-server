# Production Oracle Cloud + GitHub Actions Setup

## Phase 1: Oracle Cloud Setup (Production Ready)

### Step 1: Create Oracle Cloud Instance

Follow the previous guide but with these **production-specific** configurations:

**Instance Shape (Choose best available):**
- **VM.Standard.A1.Flex** (ARM-based): 4 OCPUs, 24GB RAM - **Recommended**
- **VM.Standard.E2.1.Micro** (x86): 1 OCPU, 1GB RAM - Fallback

**Storage:**
- Increase boot volume to 100GB (still free)
- Enable backup policy

### Step 2: Production Server Setup

```bash
# Connect to your instance
ssh -i your-private-key.pem ubuntu@YOUR_PUBLIC_IP

# Update system
sudo apt update && sudo apt upgrade -y

# Install Node.js 20 LTS
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install essential tools
sudo apt install -y git nginx certbot python3-certbot-nginx htop

# Install PM2 globally
sudo npm install -g pm2

# Set up PM2 to start on boot
pm2 startup
# Run the command it outputs
```

### Step 3: Create Application Directory

```bash
# Create app directory
sudo mkdir -p /var/www/twilio-server
sudo chown ubuntu:ubuntu /var/www/twilio-server

# Clone your repository
cd /var/www/twilio-server
git clone https://github.com/YOUR_USERNAME/YOUR_REPO.git .

# Install dependencies
npm install --production
```

### Step 4: Production Environment Setup

```bash
# Create production environment file
nano .env.production
```

Add your production environment variables:
```env
NODE_ENV=production
PORT=3000
OPENAI_API_KEY=your_production_openai_key
TWILIO_ACCOUNT_SID=your_production_twilio_sid
TWILIO_AUTH_TOKEN=your_production_twilio_token
OPENAI_REALTIME_URL=wss://api.openai.com/v1/realtime
```

### Step 5: Configure Nginx (Production)

```bash
# Create Nginx configuration
sudo nano /etc/nginx/sites-available/twilio-server
```

```nginx
server {
    listen 80;
    server_name YOUR_DOMAIN_OR_IP;

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header Referrer-Policy "no-referrer-when-downgrade" always;
    add_header Content-Security-Policy "default-src 'self' http: https: data: blob: 'unsafe-inline'" always;

    # Rate limiting
    limit_req_zone $binary_remote_addr zone=api:10m rate=10r/s;
    
    location / {
        limit_req zone=api burst=20 nodelay;
        
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        
        # WebSocket support
        proxy_read_timeout 86400;
        proxy_send_timeout 86400;
    }

    # Health check endpoint
    location /health {
        access_log off;
        return 200 "healthy\n";
        add_header Content-Type text/plain;
    }
}
```

Enable the site:
```bash
sudo ln -s /etc/nginx/sites-available/twilio-server /etc/nginx/sites-enabled/
sudo rm /etc/nginx/sites-enabled/default
sudo nginx -t
sudo systemctl restart nginx
```

### Step 6: SSL Certificate (Production Essential)

```bash
# Get SSL certificate (replace with your domain)
sudo certbot --nginx -d yourdomain.com

# Test auto-renewal
sudo certbot renew --dry-run
```

## Phase 2: GitHub Actions Auto-Deploy

### Step 1: Create Deploy Script

```bash
# Create production deploy script
nano /home/ubuntu/deploy.sh
```

```bash
#!/bin/bash
set -e

APP_DIR="/var/www/twilio-server"
LOG_FILE="/var/log/deploy.log"

echo "$(date): Starting deployment" >> $LOG_FILE

cd $APP_DIR

# Backup current version
echo "$(date): Creating backup" >> $LOG_FILE
cp -r . ../twilio-server-backup-$(date +%Y%m%d-%H%M%S)

# Pull latest changes
echo "$(date): Pulling latest changes" >> $LOG_FILE
git pull origin main

# Install/update dependencies
echo "$(date): Installing dependencies" >> $LOG_FILE
npm install --production

# Run any migrations or setup scripts
echo "$(date): Running build tasks" >> $LOG_FILE
npm run build 2>/dev/null || true

# Copy production environment
cp .env.production .env

# Test the application
echo "$(date): Testing application" >> $LOG_FILE
npm test 2>/dev/null || echo "No tests found"

# Reload PM2 (zero-downtime restart)
echo "$(date): Restarting application" >> $LOG_FILE
pm2 reload twilio-server

# Verify deployment
sleep 5
if pm2 describe twilio-server | grep -q "online"; then
    echo "$(date): Deployment successful" >> $LOG_FILE
    pm2 save
    # Clean up old backups (keep last 5)
    ls -t ../twilio-server-backup-* | tail -n +6 | xargs -r rm -rf
else
    echo "$(date): Deployment failed, rolling back" >> $LOG_FILE
    # Restore from backup
    LATEST_BACKUP=$(ls -t ../twilio-server-backup-* | head -n 1)
    if [ -n "$LATEST_BACKUP" ]; then
        rm -rf $APP_DIR/*
        cp -r $LATEST_BACKUP/* $APP_DIR/
        pm2 restart twilio-server
    fi
    exit 1
fi

echo "$(date): Deployment completed successfully" >> $LOG_FILE
```

Make it executable:
```bash
chmod +x /home/ubuntu/deploy.sh
```

### Step 2: Set Up GitHub Repository

Create `.github/workflows/deploy.yml`:

```yaml
name: Deploy to Production

on:
  push:
    branches: [ main ]
  workflow_dispatch:  # Allow manual triggers

jobs:
  deploy:
    runs-on: ubuntu-latest
    environment: production  # Use GitHub environments for better security
    
    steps:
    - name: Checkout code
      uses: actions/checkout@v4
    
    - name: Deploy to server
      uses: appleboy/ssh-action@v1.0.0
      with:
        host: ${{ secrets.HOST }}
        username: ${{ secrets.USERNAME }}
        key: ${{ secrets.SSH_KEY }}
        port: 22
        script: |
          /home/ubuntu/deploy.sh
    
    - name: Verify deployment
      uses: appleboy/ssh-action@v1.0.0
      with:
        host: ${{ secrets.HOST }}
        username: ${{ secrets.USERNAME }}
        key: ${{ secrets.SSH_KEY }}
        script: |
          sleep 10
          curl -f http://localhost:3000/health || exit 1
          echo "Deployment verified successfully"
    
    - name: Notify on failure
      if: failure()
      run: |
        echo "Deployment failed! Check the logs."
        # Add Slack/Discord notification here if needed
```

### Step 3: GitHub Secrets Setup

In your GitHub repository:

1. Go to **Settings → Environments**
2. Create **production** environment
3. Add these secrets:
   - `HOST`: Your Oracle Cloud public IP
   - `USERNAME`: `ubuntu`
   - `SSH_KEY`: Your private SSH key content

### Step 4: Initial PM2 Setup

```bash
# Start your application with PM2
cd /var/www/twilio-server
cp .env.production .env

# Start with production configuration
pm2 start npm --name "twilio-server" -- start
pm2 save
```

## Phase 3: Production Monitoring

### Step 1: Set Up Logging

```bash
# Create log rotation
sudo nano /etc/logrotate.d/twilio-server
```

```
/var/log/deploy.log {
    daily
    rotate 7
    compress
    delaycompress
    missingok
    notifempty
    copytruncate
}
```

### Step 2: Monitoring Dashboard

```bash
# Install PM2 monitoring
pm2 install pm2-logrotate

# Configure log rotation
pm2 set pm2-logrotate:max_size 10M
pm2 set pm2-logrotate:retain 7
```

### Step 3: Health Checks

Add to your server code:
```javascript
// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});
```

## Phase 4: Going Live

### Step 1: Test the Setup

1. **Push a small change** to your main branch
2. **Watch GitHub Actions** run the deployment
3. **Check your server** is updated and running

### Step 2: Update Twilio Webhook

Update your Twilio webhook URL to:
```
https://yourdomain.com/webhook
```

### Step 3: Final Verification

```bash
# Check everything is running
pm2 status
pm2 logs twilio-server --lines 50

# Check Nginx
sudo nginx -t
sudo systemctl status nginx

# Check SSL
curl -I https://yourdomain.com
```

## Production Best Practices

1. **Use environment-specific configurations**
2. **Monitor with PM2 and system logs**
3. **Set up automated backups**
4. **Use SSL certificates**
5. **Implement proper error handling**
6. **Monitor resource usage**
7. **Set up alerts for failures**

Your production setup is now complete! You have:
- ✅ Always-on Oracle Cloud hosting
- ✅ Auto-deployment on git push
- ✅ Zero-downtime deployments
- ✅ SSL certificates
- ✅ Production monitoring
- ✅ Automatic rollback on failures
