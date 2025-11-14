const express = require('express');
const db = require('../database/config');
const aiService = require('../services/aiService');
const emailService = require('../services/emailService');
const cacheService = require('../services/cacheService');
const { authenticateToken } = require('../middleware/auth');
const { validateRequest, schemas } = require('../middleware/validation');

const router = express.Router();

/**
 * POST /api/quiz/generate
 * Generate a new quiz using AI
 */
router.post('/generate', authenticateToken, validateRequest(schemas.generateQuiz), async (req, res) => {
  const client = await db.pool.connect();
  
  try {
    const { subject, gradeLevel, numberOfQuestions, difficulty } = req.body;
    const userId = req.user.id;

    // Get user performance to determine adaptive difficulty
    let adaptiveDifficulty = difficulty;
    if (!difficulty) {
      const perfResult = await client.query(
        'SELECT * FROM user_performance WHERE user_id = $1 AND subject = $2 AND grade_level = $3',
        [userId, subject, gradeLevel]
      );

      if (perfResult.rows.length > 0) {
        adaptiveDifficulty = await aiService.determineAdaptiveDifficulty(perfResult.rows[0]);
      }
    }

    // Generate quiz questions using AI
    const questions = await aiService.generateQuiz({
      subject,
      gradeLevel,
      numberOfQuestions: numberOfQuestions || 10,
      difficulty: adaptiveDifficulty || 'medium'
    });

    await client.query('BEGIN');

    // Create quiz record
    const quizResult = await client.query(
      `INSERT INTO quizzes (user_id, title, subject, grade_level, difficulty_level, total_questions)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
      [
        userId,
        `${subject} Quiz - ${gradeLevel}`,
        subject,
        gradeLevel,
        adaptiveDifficulty || 'medium',
        questions.length
      ]
    );

    const quizId = quizResult.rows[0].id;

    // Insert questions
    const questionIds = [];
    for (const q of questions) {
      const questionResult = await client.query(
        `INSERT INTO questions (quiz_id, question_text, question_type, options, correct_answer, explanation, points, order_number)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING id`,
        [
          quizId,
          q.questionText,
          q.questionType,
          JSON.stringify(q.options),
          q.correctAnswer,
          q.explanation,
          q.points,
          q.orderNumber
        ]
      );
      questionIds.push(questionResult.rows[0].id);
    }

    await client.query('COMMIT');

    // Fetch complete quiz with questions
    const quiz = await client.query(
      `SELECT q.*, 
              json_agg(
                json_build_object(
                  'id', qs.id,
                  'questionText', qs.question_text,
                  'questionType', qs.question_type,
                  'options', qs.options,
                  'points', qs.points,
                  'orderNumber', qs.order_number
                ) ORDER BY qs.order_number
              ) as questions
       FROM quizzes q
       LEFT JOIN questions qs ON qs.quiz_id = q.id
       WHERE q.id = $1
       GROUP BY q.id`,
      [quizId]
    );

    res.status(201).json({
      success: true,
      message: 'Quiz generated successfully',
      quiz: quiz.rows[0]
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Quiz generation error:', error);
    res.status(500).json({ 
      error: 'Failed to generate quiz',
      details: error.message 
    });
  } finally {
    client.release();
  }
});

/**
 * POST /api/quiz/submit
 * Submit quiz answers and get AI evaluation
 */
router.post('/submit', authenticateToken, validateRequest(schemas.submitQuiz), async (req, res) => {
  const client = await db.pool.connect();
  
  try {
    const { quizId, answers, timeTaken } = req.body;
    const userId = req.user.id;

    // Get quiz and questions
    const quizResult = await client.query(
      `SELECT q.*, qs.id as question_id, qs.question_text, qs.options, 
              qs.correct_answer, qs.explanation, qs.points
       FROM quizzes q
       JOIN questions qs ON qs.quiz_id = q.id
       WHERE q.id = $1
       ORDER BY qs.order_number`,
      [quizId]
    );

    if (quizResult.rows.length === 0) {
      return res.status(404).json({ error: 'Quiz not found' });
    }

    const quiz = quizResult.rows[0];
    const questions = quizResult.rows.map(row => ({
      id: row.question_id,
      questionText: row.question_text,
      options: row.options,
      correctAnswer: row.correct_answer,
      explanation: row.explanation,
      points: row.points
    }));

    // Evaluate answers using AI
    const evaluation = await aiService.evaluateAnswers({
      questions,
      userAnswers: answers
    });

    // Get incorrect questions for suggestions
    const incorrectQuestions = evaluation.evaluations
      .filter(e => !e.isCorrect)
      .map((e, idx) => questions[idx]);

    // Generate AI suggestions
    const suggestions = await aiService.generateSuggestions({
      subject: quiz.subject,
      gradeLevel: quiz.grade_level,
      incorrectQuestions,
      score: evaluation.score
    });

    await client.query('BEGIN');

    // Save submission
    const submissionResult = await client.query(
      `INSERT INTO submissions (quiz_id, user_id, answers, score, total_points, feedback, ai_suggestions, time_taken)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING id`,
      [
        quizId,
        userId,
        JSON.stringify(answers),
        evaluation.score,
        evaluation.totalPoints,
        JSON.stringify(evaluation.evaluations),
        suggestions,
        timeTaken
      ]
    );

    // Update user performance
    await client.query(
      `INSERT INTO user_performance (user_id, subject, grade_level, avg_score, total_quizzes, last_difficulty)
       VALUES ($1, $2, $3, $4, 1, $5)
       ON CONFLICT (user_id, subject, grade_level)
       DO UPDATE SET
         avg_score = ((user_performance.avg_score * user_performance.total_quizzes) + $4) / (user_performance.total_quizzes + 1),
         total_quizzes = user_performance.total_quizzes + 1,
         last_difficulty = $5,
         updated_at = CURRENT_TIMESTAMP`,
      [userId, quiz.subject, quiz.grade_level, evaluation.score, quiz.difficulty_level]
    );

    await client.query('COMMIT');

    res.json({
      success: true,
      message: 'Quiz submitted successfully',
      submissionId: submissionResult.rows[0].id,
      score: evaluation.score,
      totalPoints: evaluation.totalPoints,
      feedback: evaluation.evaluations,
      suggestions
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Quiz submission error:', error);
    res.status(500).json({ 
      error: 'Failed to submit quiz',
      details: error.message 
    });
  } finally {
    client.release();
  }
});

/**
 * GET /api/quiz/history
 * Get quiz history with filters
 */
router.get('/history', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { grade, subject, minScore, maxScore, startDate, endDate, page = 1, limit = 20 } = req.query;

    // Create cache key based on filters
    const filters = { grade, subject, minScore, maxScore, startDate, endDate, page, limit };
    
    // Try to get from cache
    const cachedHistory = await cacheService.getCachedQuizHistory(userId, filters);
    if (cachedHistory) {
      return res.json({
        ...cachedHistory,
        cached: true
      });
    }

    let query = `
      SELECT q.id, q.title, q.subject, q.grade_level, q.difficulty_level, 
             q.total_questions, q.created_at,
             s.id as submission_id, s.score, s.submitted_at, s.is_retry
      FROM quizzes q
      LEFT JOIN submissions s ON s.quiz_id = q.id AND s.user_id = $1
      WHERE q.user_id = $1
    `;

    const params = [userId];
    let paramIndex = 2;

    if (grade) {
      query += ` AND q.grade_level = $${paramIndex}`;
      params.push(grade);
      paramIndex++;
    }

    if (subject) {
      query += ` AND q.subject ILIKE $${paramIndex}`;
      params.push(`%${subject}%`);
      paramIndex++;
    }

    if (minScore) {
      query += ` AND s.score >= $${paramIndex}`;
      params.push(parseFloat(minScore));
      paramIndex++;
    }

    if (maxScore) {
      query += ` AND s.score <= $${paramIndex}`;
      params.push(parseFloat(maxScore));
      paramIndex++;
    }

    if (startDate) {
      query += ` AND q.created_at >= $${paramIndex}`;
      params.push(startDate);
      paramIndex++;
    }

    if (endDate) {
      query += ` AND q.created_at <= $${paramIndex}`;
      params.push(endDate);
      paramIndex++;
    }

    query += ` ORDER BY q.created_at DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    params.push(parseInt(limit), (parseInt(page) - 1) * parseInt(limit));

    const result = await db.query(query, params);

    // Get total count
    let countQuery = 'SELECT COUNT(DISTINCT q.id) FROM quizzes q LEFT JOIN submissions s ON s.quiz_id = q.id WHERE q.user_id = $1';
    const countParams = [userId];
    
    const countResult = await db.query(countQuery, countParams);

    const responseData = {
      success: true,
      quizzes: result.rows,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: parseInt(countResult.rows[0].count)
      }
    };

    // Cache the results
    await cacheService.cacheQuizHistory(userId, filters, responseData);

    res.json(responseData);
  } catch (error) {
    console.error('Quiz history error:', error);
    res.status(500).json({ error: 'Failed to fetch quiz history' });
  }
});

/**
 * POST /api/quiz/retry
 * Retry a quiz with new answers
 */
router.post('/retry', authenticateToken, validateRequest(schemas.retryQuiz), async (req, res) => {
  const client = await db.pool.connect();
  
  try {
    const { quizId, answers, timeTaken } = req.body;
    const userId = req.user.id;

    // Get original submission
    const originalSubmission = await client.query(
      'SELECT id FROM submissions WHERE quiz_id = $1 AND user_id = $2 AND is_retry = false ORDER BY submitted_at DESC LIMIT 1',
      [quizId, userId]
    );

    if (originalSubmission.rows.length === 0) {
      return res.status(404).json({ error: 'Original quiz submission not found' });
    }

    // Get quiz and questions
    const quizResult = await client.query(
      `SELECT q.*, qs.id as question_id, qs.question_text, qs.options, 
              qs.correct_answer, qs.explanation, qs.points
       FROM quizzes q
       JOIN questions qs ON qs.quiz_id = q.id
       WHERE q.id = $1
       ORDER BY qs.order_number`,
      [quizId]
    );

    const quiz = quizResult.rows[0];
    const questions = quizResult.rows.map(row => ({
      id: row.question_id,
      questionText: row.question_text,
      options: row.options,
      correctAnswer: row.correct_answer,
      explanation: row.explanation,
      points: row.points
    }));

    // Evaluate new answers
    const evaluation = await aiService.evaluateAnswers({
      questions,
      userAnswers: answers
    });

    const incorrectQuestions = evaluation.evaluations
      .filter(e => !e.isCorrect)
      .map((e, idx) => questions[idx]);

    const suggestions = await aiService.generateSuggestions({
      subject: quiz.subject,
      gradeLevel: quiz.grade_level,
      incorrectQuestions,
      score: evaluation.score
    });

    await client.query('BEGIN');

    // Save retry submission
    const retryResult = await client.query(
      `INSERT INTO submissions (quiz_id, user_id, answers, score, total_points, feedback, ai_suggestions, time_taken, is_retry, original_submission_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, true, $9) RETURNING id`,
      [
        quizId,
        userId,
        JSON.stringify(answers),
        evaluation.score,
        evaluation.totalPoints,
        JSON.stringify(evaluation.evaluations),
        suggestions,
        timeTaken,
        originalSubmission.rows[0].id
      ]
    );

    await client.query('COMMIT');

    res.json({
      success: true,
      message: 'Quiz retry submitted successfully',
      submissionId: retryResult.rows[0].id,
      score: evaluation.score,
      totalPoints: evaluation.totalPoints,
      feedback: evaluation.evaluations,
      suggestions,
      isRetry: true
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Quiz retry error:', error);
    res.status(500).json({ 
      error: 'Failed to retry quiz',
      details: error.message 
    });
  } finally {
    client.release();
  }
});

/**
 * GET /api/quiz/:id
 * Get specific quiz details
 */
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const quizId = req.params.id;
    const userId = req.user.id;

    // Try to get from cache first
    const cachedQuiz = await cacheService.getCachedQuiz(quizId);
    if (cachedQuiz && cachedQuiz.user_id === userId) {
      return res.json({
        success: true,
        quiz: cachedQuiz,
        cached: true
      });
    }

    const result = await db.query(
      `SELECT q.*, 
              json_agg(
                json_build_object(
                  'id', qs.id,
                  'questionText', qs.question_text,
                  'questionType', qs.question_type,
                  'options', qs.options,
                  'points', qs.points,
                  'orderNumber', qs.order_number
                ) ORDER BY qs.order_number
              ) as questions
       FROM quizzes q
       LEFT JOIN questions qs ON qs.quiz_id = q.id
       WHERE q.id = $1 AND q.user_id = $2
       GROUP BY q.id`,
      [quizId, userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Quiz not found' });
    }

    const quizData = result.rows[0];
    
    // Cache the quiz data
    await cacheService.cacheQuiz(quizId, quizData);

    res.json({
      success: true,
      quiz: quizData
    });
  } catch (error) {
    console.error('Get quiz error:', error);
    res.status(500).json({ error: 'Failed to fetch quiz' });
  }
});

/**
 * POST /api/quiz/hint
 * Get AI-generated hint for a question
 */
router.post('/hint', authenticateToken, async (req, res) => {
  try {
    const { questionId } = req.body;

    const result = await db.query(
      'SELECT question_text, options FROM questions WHERE id = $1',
      [questionId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Question not found' });
    }

    const { question_text, options } = result.rows[0];
    const hint = await aiService.generateHint(question_text, options);

    res.json({
      success: true,
      hint
    });
  } catch (error) {
    console.error('Hint generation error:', error);
    res.status(500).json({ error: 'Failed to generate hint' });
  }
});

/**
 * GET /api/quiz/leaderboard
 * Get leaderboard - top scores by grade/subject
 */
router.get('/leaderboard', authenticateToken, async (req, res) => {
  try {
    const { subject, gradeLevel, limit = 10, period = 'all' } = req.query;

    if (!subject || !gradeLevel) {
      return res.status(400).json({ 
        error: 'subject and gradeLevel are required parameters' 
      });
    }

    // Try to get from cache
    const cacheKey = `${subject}:${gradeLevel}:${period}:${limit}`;
    const cachedLeaderboard = await cacheService.getCachedLeaderboard(cacheKey, {});
    if (cachedLeaderboard) {
      return res.json({
        ...cachedLeaderboard,
        cached: true
      });
    }

    // Build date filter based on period
    let dateFilter = '';
    const params = [subject, gradeLevel, parseInt(limit)];
    
    if (period === 'today') {
      dateFilter = "AND DATE(s.submitted_at) = CURRENT_DATE";
    } else if (period === 'week') {
      dateFilter = "AND s.submitted_at >= CURRENT_DATE - INTERVAL '7 days'";
    } else if (period === 'month') {
      dateFilter = "AND s.submitted_at >= CURRENT_DATE - INTERVAL '30 days'";
    }

    // Get top scores with user information
    const query = `
      WITH ranked_scores AS (
        SELECT 
          u.id as user_id,
          u.username,
          q.subject,
          q.grade_level,
          s.score,
          s.submitted_at,
          q.title as quiz_title,
          q.total_questions,
          ROW_NUMBER() OVER (
            PARTITION BY u.id 
            ORDER BY s.score DESC, s.submitted_at DESC
          ) as rank_per_user
        FROM submissions s
        JOIN quizzes q ON q.id = s.quiz_id
        JOIN users u ON u.id = s.user_id
        WHERE q.subject = $1 
          AND q.grade_level = $2
          ${dateFilter}
      )
      SELECT 
        user_id,
        username,
        subject,
        grade_level,
        score,
        submitted_at,
        quiz_title,
        total_questions,
        ROW_NUMBER() OVER (ORDER BY score DESC, submitted_at ASC) as rank
      FROM ranked_scores
      WHERE rank_per_user = 1
      ORDER BY score DESC, submitted_at ASC
      LIMIT $3
    `;

    const result = await db.query(query, params);

    // Get total participants count
    const countQuery = `
      SELECT COUNT(DISTINCT s.user_id) as total_participants
      FROM submissions s
      JOIN quizzes q ON q.id = s.quiz_id
      WHERE q.subject = $1 AND q.grade_level = $2
      ${dateFilter}
    `;
    
    const countResult = await db.query(countQuery, [subject, gradeLevel]);

    // Calculate average score
    const avgQuery = `
      SELECT AVG(s.score) as avg_score
      FROM submissions s
      JOIN quizzes q ON q.id = s.quiz_id
      WHERE q.subject = $1 AND q.grade_level = $2
      ${dateFilter}
    `;
    
    const avgResult = await db.query(avgQuery, [subject, gradeLevel]);

    const responseData = {
      success: true,
      subject,
      gradeLevel,
      period,
      leaderboard: result.rows,
      stats: {
        totalParticipants: parseInt(countResult.rows[0].total_participants),
        averageScore: parseFloat(avgResult.rows[0].avg_score || 0).toFixed(2)
      }
    };

    // Cache the leaderboard
    await cacheService.cacheLeaderboard(cacheKey, responseData, 300);

    res.json(responseData);
  } catch (error) {
    console.error('Leaderboard error:', error);
    res.status(500).json({ 
      error: 'Failed to fetch leaderboard',
      details: error.message 
    });
  }
});

module.exports = router;
