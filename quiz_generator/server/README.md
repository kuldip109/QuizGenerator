# AI Quiz Application - Backend API

A comprehensive microservice for an AI-powered Quiz Application with authentication, quiz management, AI-based evaluation, and adaptive difficulty.

## Features

### Required Features ✅
- **Mock Authentication**: Login with any username/password, generates JWT tokens
- **AI Quiz Generation**: Generate quizzes using Groq AI based on subject and grade level
- **AI Answer Evaluation**: Automatic grading and feedback using AI
- **Quiz History**: Retrieve past quizzes with filters (grade, subject, score, date range)
- **Quiz Retry**: Re-attempt quizzes with score re-evaluation
- **Hint Generation**: AI-powered hints for questions
- **Result Suggestions**: Get 2 improvement tips based on performance
- **Adaptive Difficulty**: Difficulty adjusts based on past performance
- **PostgreSQL Database**: Structured data storage with migrations
- **Docker Support**: Containerized deployment with docker-compose

### Bonus Features ✅
- **📧 Email Notifications**: Automated email delivery of quiz results with detailed feedback
- **⚡ Redis Caching**: High-performance caching layer for reduced API latency
- **🏆 Leaderboard API**: Display top scores by subject/grade with period filters

### Technology Stack
- **Backend**: Node.js 18+, Express.js
- **Database**: PostgreSQL 15
- **Cache**: Redis 7 (optional, for performance optimization)
- **Authentication**: JWT (JSON Web Tokens)
- **AI Integration**: Groq SDK (Mixtral-8x7b model)
- **Email**: Nodemailer (for result notifications)
- **Validation**: Joi
- **Security**: Helmet, bcrypt, rate limiting
- **Containerization**: Docker, Docker Compose

## Prerequisites

- Node.js >= 18.0.0
- PostgreSQL >= 15 (or use Docker)
- Redis >= 7 (optional, for caching - or use Docker)
- Groq API Key ([Get it here](https://console.groq.com))
- Docker & Docker Compose (optional, for containerized deployment)
- SMTP Server credentials (optional, for email notifications)

## Installation

### Option 1: Local Development

1. **Clone and navigate to the project**:
   ```bash
   cd quiz_generator/server
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Setup environment variables**:
   ```bash
   cp .env.example .env
   ```
   
   Edit `.env` and add your configurations:
   ```env
   PORT=3001
   NODE_ENV=development
   
   # JWT Configuration
   JWT_SECRET=your_super_secret_jwt_key
   JWT_EXPIRES_IN=24h
   
   # Database
   DB_HOST=localhost
   DB_PORT=5432
   DB_NAME=quiz_db
   DB_USER=postgres
   DB_PASSWORD=postgres
   
   # Groq AI
   GROQ_API_KEY=your_groq_api_key_here
   GROQ_MODEL=mixtral-8x7b-32768
   
   # Redis (Optional - for caching)
   REDIS_HOST=localhost
   REDIS_PORT=6379
   
   # Email (Optional - for notifications)
   # For development, leave empty to use test email
   # For production, configure your SMTP settings
   SMTP_HOST=smtp.gmail.com
   SMTP_PORT=587
   SMTP_USER=your-email@gmail.com
   SMTP_PASSWORD=your-app-password
   ```

4. **Setup PostgreSQL database**:
   ```bash
   # Create database
   createdb quiz_db
   
   # Run migrations
   npm run migrate
   ```

5. **Start the server**:
   ```bash
   npm start
   # or for development with auto-reload
   npm run dev
   ```

### Option 2: Docker Deployment (Recommended)

1. **Create `.env` file** with your Groq API key:
   ```bash
   echo "GROQ_API_KEY=your_groq_api_key_here" > .env
   echo "JWT_SECRET=your_super_secret_jwt_key" >> .env
   ```

2. **Build and start containers**:
   ```bash
   docker-compose up -d
   ```

3. **Check logs**:
   ```bash
   docker-compose logs -f api
   ```

4. **Stop containers**:
   ```bash
   docker-compose down
   ```

## API Endpoints

### Authentication

#### POST `/api/auth/login`
Mock login - accepts any username/password combination.

**Request**:
```json
{
  "username": "testuser",
  "password": "anypassword"
}
```

**Response**:
```json
{
  "success": true,
  "message": "Login successful",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": 1,
    "username": "testuser"
  }
}
```

#### POST `/api/auth/register`
Register a new user (optional - login auto-creates users).

**Request**:
```json
{
  "username": "newuser",
  "password": "password123",
  "email": "user@example.com"
}
```

### Quiz Management

All quiz endpoints require JWT authentication. Include the token in the Authorization header:
```
Authorization: Bearer <your_jwt_token>
```

#### POST `/api/quiz/generate`
Generate a new AI-powered quiz.

**Request**:
```json
{
  "subject": "Mathematics",
  "gradeLevel": "Grade 8",
  "numberOfQuestions": 10,
  "difficulty": "medium"
}
```

**Response**:
```json
{
  "success": true,
  "message": "Quiz generated successfully",
  "quiz": {
    "id": 1,
    "title": "Mathematics Quiz - Grade 8",
    "subject": "Mathematics",
    "grade_level": "Grade 8",
    "difficulty_level": "medium",
    "total_questions": 10,
    "questions": [
      {
        "id": 1,
        "questionText": "What is 2 + 2?",
        "questionType": "multiple_choice",
        "options": ["3", "4", "5", "6"],
        "points": 1,
        "orderNumber": 1
      }
    ]
  }
}
```

#### POST `/api/quiz/submit`
Submit answers for evaluation with AI feedback.

**Request**:
```json
{
  "quizId": 1,
  "answers": ["4", "16", "8", ...],
  "timeTaken": 300
}
```

**Response**:
```json
{
  "success": true,
  "message": "Quiz submitted successfully",
  "submissionId": 1,
  "score": 85.5,
  "totalPoints": 10,
  "feedback": [
    {
      "questionId": 1,
      "userAnswer": "4",
      "correctAnswer": "4",
      "isCorrect": true,
      "explanation": "2 + 2 equals 4"
    }
  ],
  "suggestions": [
    "Review algebraic concepts to strengthen your foundation.",
    "Practice more word problems to improve problem-solving skills."
  ]
}
```

#### GET `/api/quiz/history`
Get quiz history with optional filters.

**Query Parameters**:
- `grade` - Filter by grade level
- `subject` - Filter by subject (partial match)
- `minScore` - Minimum score filter
- `maxScore` - Maximum score filter
- `startDate` - Start date (YYYY-MM-DD)
- `endDate` - End date (YYYY-MM-DD)
- `page` - Page number (default: 1)
- `limit` - Results per page (default: 20)

**Example**:
```
GET /api/quiz/history?subject=Math&minScore=70&page=1&limit=10
```

**Response**:
```json
{
  "success": true,
  "quizzes": [
    {
      "id": 1,
      "title": "Mathematics Quiz - Grade 8",
      "subject": "Mathematics",
      "grade_level": "Grade 8",
      "difficulty_level": "medium",
      "total_questions": 10,
      "created_at": "2024-01-15T10:30:00Z",
      "submission_id": 1,
      "score": 85.5,
      "submitted_at": "2024-01-15T10:45:00Z",
      "is_retry": false
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 25
  }
}
```

#### POST `/api/quiz/retry`
Retry a quiz with new answers.

**Request**:
```json
{
  "quizId": 1,
  "answers": ["4", "16", "9", ...],
  "timeTaken": 280
}
```

**Response**: Same as submit endpoint, with `isRetry: true`.

#### GET `/api/quiz/:id`
Get specific quiz details.

**Response**:
```json
{
  "success": true,
  "quiz": {
    "id": 1,
    "title": "Mathematics Quiz - Grade 8",
    "questions": [...]
  }
}
```

#### POST `/api/quiz/hint`
Get an AI-generated hint for a question.

**Request**:
```json
{
  "questionId": 1
}
```

**Response**:
```json
{
  "success": true,
  "hint": "Think about the basic arithmetic operations and their order."
}
```

#### GET `/api/quiz/leaderboard`
Get top scores leaderboard for a subject and grade.

**Query Parameters**:
- `subject` - Subject filter (required)
- `gradeLevel` - Grade level filter (required)
- `limit` - Number of top scores (default: 10)
- `period` - Time period: 'all', 'today', 'week', 'month' (default: 'all')

**Example**:
```
GET /api/quiz/leaderboard?subject=Mathematics&gradeLevel=Grade 8&limit=10&period=week
```

**Response**:
```json
{
  "success": true,
  "subject": "Mathematics",
  "gradeLevel": "Grade 8",
  "period": "week",
  "leaderboard": [
    {
      "rank": 1,
      "user_id": 5,
      "username": "john_doe",
      "score": 95.5,
      "quiz_title": "Mathematics Quiz - Grade 8",
      "total_questions": 10,
      "submitted_at": "2024-01-15T14:30:00Z"
    }
  ],
  "stats": {
    "totalParticipants": 45,
    "averageScore": "78.50"
  }
}
```

## Bonus Features Implementation

### 📧 Email Notifications

The application automatically sends beautiful HTML email notifications to users after quiz submission:

**Features**:
- Beautiful responsive HTML templates
- Quiz score with percentage and visual indicators
- Correct/incorrect answer statistics
- Personalized improvement suggestions
- Detailed feedback for questions
- Performance-based encouragement messages

**Configuration**:
- **Development**: Uses Ethereal Email (test email service) - no configuration needed
- **Production**: Configure SMTP settings in `.env` file

**Email Service Providers**:
- Gmail (with App Password)
- SendGrid
- Amazon SES
- Any SMTP server

Example configuration for Gmail:
```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=your-app-password
SMTP_FROM="AI Quiz App" <noreply@quizapp.com>
```

### ⚡ Redis Caching Layer

Redis integration provides significant performance improvements:

**Cached Data**:
- Quiz details (10 minutes TTL)
- User performance data (5 minutes TTL)
- Quiz history queries (3 minutes TTL)
- Leaderboard data (5 minutes TTL)

**Benefits**:
- Reduced database load
- Faster API response times
- Automatic cache invalidation on data updates
- Graceful degradation (works without Redis)

**Cache Hit Examples**:
```
💾 Cache HIT: quiz:123
💾 Cache SET: leaderboard:Mathematics:Grade 8 (TTL: 300s)
🗑️  Cache DEL pattern: history:user_1:*
```

**Configuration**:
```env
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=optional_password
# Or use connection URL
REDIS_URL=redis://localhost:6379
```

### 🏆 Leaderboard API

Competitive leaderboard system with advanced features:

**Features**:
- Top scores by subject and grade level
- Time period filters (today, week, month, all-time)
- User rankings with best score per user
- Participation statistics
- Average score calculations
- Cached for performance

**Use Cases**:
- Classroom competitions
- Student motivation
- Progress tracking
- Achievement recognition

## AI Integration Details

### Groq AI Features

1. **Quiz Generation**: Uses Mixtral-8x7b model to generate contextual questions
   - Customizable by subject, grade level, and difficulty
   - Generates multiple-choice questions with explanations
   - JSON-formatted responses for structured data

2. **Answer Evaluation**: AI-powered grading
   - Compares user answers with correct answers
   - Provides detailed explanations for each question

3. **Hint Generation**: Context-aware hints
   - Provides educational guidance without revealing answers
   - Helps students learn through guided thinking

4. **Improvement Suggestions**: Personalized feedback
   - Analyzes incorrect answers to identify weak areas
   - Generates 2 specific, actionable improvement tips

5. **Adaptive Difficulty**: Performance-based adjustment
   - Tracks user performance across subjects and grades
   - Automatically adjusts difficulty for future quizzes
   - Rules: Score ≥85% → Hard, 70-84% → Medium, <70% → Easy

## Database Schema

### Tables

- **users**: User accounts and authentication
- **quizzes**: Quiz metadata (subject, grade, difficulty)
- **questions**: Individual questions with options and answers
- **submissions**: User submissions with scores and feedback
- **user_performance**: Performance tracking for adaptive difficulty

### Indexes
- Optimized queries on user_id, subject, grade_level, score, and dates
- Foreign key relationships for data integrity

## Deployment

### Heroku Deployment

1. **Create Heroku app**:
   ```bash
   heroku create your-quiz-app
   ```

2. **Add PostgreSQL addon**:
   ```bash
   heroku addons:create heroku-postgresql:mini
   ```

3. **Set environment variables**:
   ```bash
   heroku config:set JWT_SECRET=your_secret_key
   heroku config:set GROQ_API_KEY=your_groq_api_key
   heroku config:set NODE_ENV=production
   ```

4. **Deploy**:
   ```bash
   git push heroku main
   ```

5. **Run migrations**:
   ```bash
   heroku run npm run migrate
   ```

### DigitalOcean/AWS Deployment

1. **Build Docker image**:
   ```bash
   docker build -t quiz-api .
   ```

2. **Push to container registry**
3. **Deploy with docker-compose on your server**
4. **Configure environment variables**
5. **Setup reverse proxy (nginx) for HTTPS**

## Testing

The application includes health check and validation:

```bash
# Health check
curl http://localhost:3001/health

# Test login
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"test","password":"test"}'
```

## Security Features

- **Helmet**: Security headers
- **Rate Limiting**: Prevents abuse (100 requests per 15 minutes)
- **JWT Authentication**: Secure token-based auth
- **Password Hashing**: bcrypt for secure password storage
- **CORS**: Cross-origin resource sharing enabled
- **Input Validation**: Joi schema validation on all inputs

## Project Structure

```
server/
├── database/
│   ├── config.js           # PostgreSQL connection pool
│   ├── migrate.js          # Migration runner
│   └── migrations/
│       └── 001_initial_schema.sql
├── middleware/
│   ├── auth.js             # JWT authentication
│   └── validation.js       # Request validation schemas
├── routes/
│   ├── auth.js             # Authentication endpoints
│   └── quiz.js             # Quiz management endpoints
├── services/
│   ├── aiService.js        # Groq AI integration
│   ├── cacheService.js     # Redis caching layer
│   └── emailService.js     # Email notification service
├── .env.example            # Environment template
├── .dockerignore
├── Dockerfile
├── docker-compose.yml
├── package.json
├── server.js               # Main application entry
└── README.md
```

## Environment Variables Reference

| Variable | Description | Default | Required |
|----------|-------------|---------|----------|
| PORT | Server port | 3001 | No |
| NODE_ENV | Environment (development/production) | development | No |
| JWT_SECRET | Secret key for JWT | - | Yes |
| JWT_EXPIRES_IN | Token expiration time | 24h | No |
| DB_HOST | PostgreSQL host | localhost | Yes |
| DB_PORT | PostgreSQL port | 5432 | No |
| DB_NAME | Database name | quiz_db | Yes |
| DB_USER | Database user | postgres | Yes |
| DB_PASSWORD | Database password | - | Yes |
| GROQ_API_KEY | Groq API key | - | Yes |
| GROQ_MODEL | Groq model name | mixtral-8x7b-32768 | No |
| REDIS_HOST | Redis server host | localhost | No |
| REDIS_PORT | Redis server port | 6379 | No |
| REDIS_PASSWORD | Redis password | - | No |
| REDIS_URL | Redis connection URL | - | No |
| SMTP_HOST | SMTP server host | - | No |
| SMTP_PORT | SMTP server port | 587 | No |
| SMTP_SECURE | Use TLS (true/false) | false | No |
| SMTP_USER | SMTP username | - | No |
| SMTP_PASSWORD | SMTP password | - | No |
| SMTP_FROM | Email sender address | noreply@quizapp.com | No |

## Known Issues

- Email notifications require SMTP configuration for production use (works with test emails in development)
- Redis is optional but recommended for production to improve performance
- Leaderboard API requires at least one quiz submission to display data

## License

ISC

## Support

For issues or questions, please open an issue in the repository.

