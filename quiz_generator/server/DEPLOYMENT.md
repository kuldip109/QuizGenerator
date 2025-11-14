# Deployment Guide - AI Quiz Application

## Quick Start with Docker (Recommended)

### Prerequisites
- Docker and Docker Compose installed
- Groq API key ([Get it free here](https://console.groq.com))

### Steps

1. **Navigate to server directory**:
   ```bash
   cd quiz_generator/server
   ```

2. **Set your Groq API key**:
   ```bash
   # Edit .env file and add your Groq API key
   echo "GROQ_API_KEY=your_groq_api_key_here" >> .env
   echo "JWT_SECRET=your_super_secret_jwt_key_12345" >> .env
   ```

3. **Start the application**:
   ```bash
   docker-compose up -d
   ```

4. **Verify it's running**:
   ```bash
   curl http://localhost:3001/health
   ```

5. **View logs**:
   ```bash
   docker-compose logs -f api
   ```

6. **Stop the application**:
   ```bash
   docker-compose down
   ```

---

## Local Development Setup (Without Docker)

### Prerequisites
- Node.js 18+
- PostgreSQL 15+
- Groq API key

### Steps

1. **Install PostgreSQL** (if not already installed):
   ```bash
   # macOS
   brew install postgresql@15
   brew services start postgresql@15
   
   # Ubuntu/Debian
   sudo apt-get install postgresql-15
   sudo systemctl start postgresql
   
   # Windows
   # Download from https://www.postgresql.org/download/windows/
   ```

2. **Create database**:
   ```bash
   # Connect to PostgreSQL
   psql postgres
   
   # Create database
   CREATE DATABASE quiz_db;
   
   # Create user (optional)
   CREATE USER quiz_user WITH PASSWORD 'your_password';
   GRANT ALL PRIVILEGES ON DATABASE quiz_db TO quiz_user;
   
   # Exit
   \q
   ```

3. **Install dependencies**:
   ```bash
   cd quiz_generator/server
   npm install
   ```

4. **Configure environment**:
   ```bash
   # Copy example and edit
   cp .env.example .env
   
   # Edit .env and add:
   # - Your Groq API key
   # - Database credentials
   # - JWT secret
   ```

5. **Run database migrations**:
   ```bash
   npm run migrate
   ```

6. **Start the server**:
   ```bash
   # Development mode (auto-reload)
   npm run dev
   
   # Production mode
   npm start
   ```

7. **Test the API**:
   ```bash
   # Health check
   curl http://localhost:3001/health
   
   # Login
   curl -X POST http://localhost:3001/api/auth/login \
     -H "Content-Type: application/json" \
     -d '{"username":"testuser","password":"test123"}'
   ```

---

## Cloud Deployment Options

### Option 1: Heroku Deployment

#### Prerequisites
- Heroku CLI installed
- Heroku account

#### Steps

1. **Login to Heroku**:
   ```bash
   heroku login
   ```

2. **Create Heroku app**:
   ```bash
   cd quiz_generator/server
   heroku create your-quiz-app-name
   ```

3. **Add PostgreSQL addon**:
   ```bash
   heroku addons:create heroku-postgresql:mini
   ```

4. **Set environment variables**:
   ```bash
   heroku config:set JWT_SECRET=your_super_secret_jwt_key
   heroku config:set GROQ_API_KEY=your_groq_api_key
   heroku config:set NODE_ENV=production
   heroku config:set GROQ_MODEL=mixtral-8x7b-32768
   ```

5. **Deploy**:
   ```bash
   # Initialize git if not already
   git init
   git add .
   git commit -m "Initial commit"
   
   # Deploy to Heroku
   git push heroku main
   ```

6. **Run migrations**:
   ```bash
   heroku run npm run migrate
   ```

7. **Open your app**:
   ```bash
   heroku open
   ```

8. **View logs**:
   ```bash
   heroku logs --tail
   ```

9. **Get your API URL**:
   ```bash
   heroku info
   # Your URL will be: https://your-quiz-app-name.herokuapp.com
   ```

---

### Option 2: DigitalOcean App Platform

#### Prerequisites
- DigitalOcean account
- doctl CLI (optional)

#### Steps

1. **Create App Platform project**:
   - Go to DigitalOcean console
   - Click "Create" → "Apps"
   - Connect your GitHub repository

2. **Configure build settings**:
   ```yaml
   # In App Spec or UI:
   name: quiz-api
   region: nyc
   services:
   - name: api
     build_command: npm install
     run_command: npm start
     environment_slug: node-js
     http_port: 3001
   ```

3. **Add PostgreSQL database**:
   - In App Platform, add "Database" component
   - Select PostgreSQL 15
   - Connect to your app

4. **Set environment variables**:
   ```
   JWT_SECRET=your_secret_key
   GROQ_API_KEY=your_groq_api_key
   NODE_ENV=production
   GROQ_MODEL=mixtral-8x7b-32768
   ```

5. **Deploy**:
   - Click "Deploy"
   - Wait for build to complete

6. **Run migrations**:
   - Use Console tab in App Platform
   - Run: `npm run migrate`

---

### Option 3: AWS EC2 with Docker

#### Prerequisites
- AWS account
- EC2 instance with Docker installed

#### Steps

1. **Launch EC2 instance**:
   ```bash
   # t2.micro or t2.small is sufficient
   # Ubuntu 22.04 LTS recommended
   # Open ports: 22 (SSH), 80 (HTTP), 443 (HTTPS), 3001 (API)
   ```

2. **Install Docker on EC2**:
   ```bash
   # SSH into instance
   ssh -i your-key.pem ubuntu@your-ec2-ip
   
   # Install Docker
   sudo apt-get update
   sudo apt-get install -y docker.io docker-compose
   sudo systemctl start docker
   sudo usermod -aG docker ubuntu
   ```

3. **Transfer files to EC2**:
   ```bash
   # From local machine
   scp -i your-key.pem -r quiz_generator/server ubuntu@your-ec2-ip:~/
   ```

4. **Configure environment**:
   ```bash
   # On EC2
   cd ~/server
   nano .env
   # Add your Groq API key and other configs
   ```

5. **Run with Docker Compose**:
   ```bash
   docker-compose up -d
   ```

6. **Setup reverse proxy (optional)**:
   ```bash
   # Install nginx
   sudo apt-get install -y nginx
   
   # Configure nginx
   sudo nano /etc/nginx/sites-available/quiz-api
   ```
   
   Nginx config:
   ```nginx
   server {
       listen 80;
       server_name your-domain.com;
       
       location / {
           proxy_pass http://localhost:3001;
           proxy_http_version 1.1;
           proxy_set_header Upgrade $http_upgrade;
           proxy_set_header Connection 'upgrade';
           proxy_set_header Host $host;
           proxy_cache_bypass $http_upgrade;
       }
   }
   ```

7. **Enable and start nginx**:
   ```bash
   sudo ln -s /etc/nginx/sites-available/quiz-api /etc/nginx/sites-enabled/
   sudo nginx -t
   sudo systemctl restart nginx
   ```

---

## Environment Variables Reference

| Variable | Description | Example | Required |
|----------|-------------|---------|----------|
| PORT | Server port | 3001 | No |
| NODE_ENV | Environment | production | No |
| JWT_SECRET | Secret for JWT | my_secret_key_123 | Yes |
| JWT_EXPIRES_IN | Token expiration | 24h | No |
| DB_HOST | Database host | localhost | Yes |
| DB_PORT | Database port | 5432 | No |
| DB_NAME | Database name | quiz_db | Yes |
| DB_USER | Database user | postgres | Yes |
| DB_PASSWORD | Database password | your_password | Yes |
| GROQ_API_KEY | Groq API key | gsk_xxx | Yes |
| GROQ_MODEL | AI model | mixtral-8x7b-32768 | No |

---

## Testing Your Deployment

### 1. Import Postman Collection

1. Open Postman
2. Click "Import"
3. Select `AI_Quiz_API.postman_collection.json`
4. Update the `base_url` variable to your deployed URL

### 2. Test Endpoints

```bash
# Replace YOUR_URL with your deployed URL

# 1. Health check
curl https://YOUR_URL/health

# 2. Login
curl -X POST https://YOUR_URL/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"testuser","password":"test123"}'

# 3. Generate quiz (use token from step 2)
curl -X POST https://YOUR_URL/api/quiz/generate \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "subject": "Mathematics",
    "gradeLevel": "Grade 8",
    "numberOfQuestions": 5,
    "difficulty": "medium"
  }'
```

---

## Troubleshooting

### Database Connection Issues

```bash
# Check PostgreSQL is running
docker-compose ps
# or
sudo systemctl status postgresql

# Check database exists
psql -U postgres -l

# Test connection
psql -U postgres -d quiz_db -c "SELECT 1;"
```

### Migration Issues

```bash
# Drop and recreate database
docker-compose down -v
docker-compose up -d

# Manual migration
npm run migrate
```

### API Not Responding

```bash
# Check logs
docker-compose logs -f api
# or
pm2 logs
# or
heroku logs --tail

# Check port
netstat -tulpn | grep 3001
```

### Groq API Issues

- Verify API key is correct
- Check API quota/limits
- Test API key: `curl -H "Authorization: Bearer YOUR_KEY" https://api.groq.com/openai/v1/models`

---

## Production Checklist

- [ ] Change JWT_SECRET to a strong random value
- [ ] Set NODE_ENV=production
- [ ] Configure database with strong password
- [ ] Enable HTTPS (use Let's Encrypt)
- [ ] Set up monitoring (e.g., PM2, New Relic)
- [ ] Configure backups for database
- [ ] Set up logging (e.g., Winston, Loggly)
- [ ] Configure CORS for specific origins
- [ ] Set up rate limiting
- [ ] Review security headers (Helmet configured)
- [ ] Set up CI/CD pipeline
- [ ] Configure domain name
- [ ] Test all API endpoints
- [ ] Monitor API performance

---

## Submission Checklist

✅ **What to Submit**:

1. **API URL**: Your deployed application URL (e.g., `https://your-app.herokuapp.com`)
2. **Postman Collection**: `AI_Quiz_API.postman_collection.json` (already included)
3. **README.md**: Complete documentation (already included)
4. **Source Code**: All files in `quiz_generator/server/` directory
5. **Environment Setup**: `.env.example` file with instructions

✅ **Verification**:
- API is accessible via the provided URL
- Health check endpoint returns 200 OK
- Authentication works (login endpoint)
- Quiz generation works with Groq AI
- All CRUD operations function correctly
- Postman collection can test all endpoints

---

## Support & Resources

- **Groq API Docs**: https://console.groq.com/docs
- **PostgreSQL Docs**: https://www.postgresql.org/docs/
- **Express.js Docs**: https://expressjs.com/
- **Docker Docs**: https://docs.docker.com/
- **Heroku Docs**: https://devcenter.heroku.com/

For issues, check the logs and refer to the troubleshooting section above.
