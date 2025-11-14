const Joi = require('joi');

const validateRequest = (schema) => {
  return (req, res, next) => {
    const { error } = schema.validate(req.body, { abortEarly: false });
    
    if (error) {
      const errors = error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message
      }));
      return res.status(400).json({ error: 'Validation failed', errors });
    }
    
    next();
  };
};

// Validation schemas
const schemas = {
  login: Joi.object({
    username: Joi.string().required(),
    password: Joi.string().required()
  }),

  generateQuiz: Joi.object({
    subject: Joi.string().required().min(2).max(100),
    gradeLevel: Joi.string().required(),
    numberOfQuestions: Joi.number().integer().min(1).max(50).default(10),
    difficulty: Joi.string().valid('easy', 'medium', 'hard').default('medium')
  }),

  submitQuiz: Joi.object({
    quizId: Joi.number().integer().required(),
    answers: Joi.array().items(Joi.string()).required(),
    timeTaken: Joi.number().integer().min(0).optional()
  }),

  retryQuiz: Joi.object({
    quizId: Joi.number().integer().required(),
    answers: Joi.array().items(Joi.string()).required(),
    timeTaken: Joi.number().integer().min(0).optional()
  })
};

module.exports = {
  validateRequest,
  schemas
};
