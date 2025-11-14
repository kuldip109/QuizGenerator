# 🚀 Quick Start Guide - AI Quiz Application

## ⚡ Fastest Way to Get Started (3 Steps)

### Step 1: Get Your Groq API Key (Free)

1. Visit: https://console.groq.com
2. Sign up/Login
3. Go to API Keys section
4. Create new API key
5. Copy the key (starts with `gsk_`)

### Step 2: Configure Environment

```bash
cd quiz_generator/server

# Add your API key
echo "GROQ_API_KEY=your_gsk_key_here" >> .env
```

### Step 3: Start the Application

**Using Docker (Recommended)**:
```bash
docker-compose up -d
```

**Using Local Setup**:
```bash
./setup.sh
# Then choose option 1 or 2
```

✅ **That's it!** Your API is running at http://localhost:3001

---

## 🧪 Test It Immediately

### 1. Health Check
```bash
curl http://localhost:3001/health
```

Expected: `{"status":"ok",...}`

### 2. Login (Mock - Any Credentials Work)
```bash
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"demo","password":"demo123"}'
```

Copy the `token` from response.

### 3. Generate Your First Quiz
```bash
# Replace YOUR_TOKEN with token from step 2
curl -X POST http://localhost:3001/api/quiz/generate \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "subject": "Science",
    "gradeLevel": "Grade 7",
    "numberOfQuestions": 3,
    "difficulty": "easy"
  }'
```

You'll get 3 AI-generated Science questions! 🎉

---

## 📱 Use Postman for Easy Testing

1. **Open Postman**
2. **Import Collection**:
   - Click "Import"
   - Select `AI_Quiz_API.postman_collection.json`
3. **Set Base URL**:
   - Click on the collection
   - Variables tab
   - Set `base_url` to `http://localhost:3001`
4. **Test**:
   - Run "Login" request (token auto-saved)
   - Run "Generate Quiz" request
   - Explore other endpoints

---

## 🎯 Common Use Cases

### 1. Create Math Quiz for Grade 8
```json
POST /api/quiz/generate
{
  "subject": "Mathematics",
  "gradeLevel": "Grade 8",
  "numberOfQuestions": 10,
  "difficulty": "medium"
}
```

### 2. Submit Answers
```json
POST /api/quiz/submit
{
  "quizId": 1,
  "answers": ["A", "B", "C", "D", "A", "B", "C", "D", "A", "B"],
  "timeTaken": 300
}
```

### 3. Get History (Filter by Subject)
```
GET /api/quiz/history?subject=Math&page=1&limit=10
```

### 4. Get Hint
```json
POST /api/quiz/hint
{
  "questionId": 1
}
```

### 5. Retry Quiz
```json
POST /api/quiz/retry
{
  "quizId": 1,
  "answers": ["D", "C", "B", "A", "D", "C", "B", "A", "D", "C"],
  "timeTaken": 280
}
```

---

## 🐛 Troubleshooting

### "Connection refused" or "Cannot connect"

**Solution**: Make sure the server is running
```bash
# Check if running
docker-compose ps
# or check port
lsof -i :3001
```

### "Database connection failed"

**Solution**: Ensure PostgreSQL is running
```bash
# For Docker
docker-compose logs postgres

# For local
sudo systemctl status postgresql
```

### "Invalid Groq API key"

**Solution**: 
1. Check your `.env` file has the correct key
2. Verify key at https://console.groq.com
3. Restart the server after changing `.env`

### "Migration failed"

**Solution**:
```bash
# For Docker - recreate database
docker-compose down -v
docker-compose up -d

# For local - manual migration
npm run migrate
```

---

## 📚 Next Steps

1. ✅ **Read README.md** - Complete API documentation
2. ✅ **Check DEPLOYMENT.md** - Deploy to cloud (Heroku/AWS/DigitalOcean)
3. ✅ **Review PROJECT_SUMMARY.md** - Full project overview
4. ✅ **Explore Postman Collection** - Test all features

---

## 🎓 API Flow Example

```
1. Login (any credentials)
   → Get JWT token
   
2. Generate Quiz
   → AI creates questions
   → Save to database
   → Return quiz with questions
   
3. Submit Answers
   → AI evaluates answers
   → Calculate score
   → Generate suggestions
   → Save submission
   
4. View History
   → Filter by subject/grade/score/date
   → See all past quizzes
   
5. Retry Quiz
   → Re-attempt with new answers
   → Get new evaluation
   → Compare with original
```

---

## 🔑 Important URLs

- **API Base**: http://localhost:3001
- **Health Check**: http://localhost:3001/health
- **API Info**: http://localhost:3001/
- **Groq Console**: https://console.groq.com

---

## 💡 Pro Tips

1. **Use Postman** - It's much easier than cURL for testing
2. **Check Logs** - `docker-compose logs -f api` shows real-time logs
3. **Start Small** - Generate 3-5 questions first, then increase
4. **Save Tokens** - Postman auto-saves tokens from login
5. **Read Errors** - API returns detailed error messages

---

## 🎉 You're Ready!

Your AI Quiz Application is fully functional with:
- ✅ Mock authentication
- ✅ AI quiz generation
- ✅ Smart evaluation
- ✅ Performance tracking
- ✅ Adaptive difficulty
- ✅ Full API documentation
- ✅ Docker deployment
- ✅ Production ready

**Happy quizzing! 📝**
