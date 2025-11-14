const Groq = require('groq-sdk');

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY
});

const groqModel = process.env.GROQ_MODEL || 'mixtral-8x7b-32768';

class AIService {
  /**
   * Generate quiz questions using Groq AI
   */
  async generateQuiz({ subject, gradeLevel, numberOfQuestions, difficulty }) {
    const prompt = `Generate ${numberOfQuestions} multiple-choice quiz questions for ${subject} at ${gradeLevel} grade level with ${difficulty} difficulty.

Format each question as JSON with this exact structure:
{
  "question": "question text",
  "options": ["option A", "option B", "option C", "option D"],
  "correctAnswer": "the correct option text",
  "explanation": "brief explanation of the answer"
}

Return ONLY a JSON array of questions, no additional text.`;

    try {
      const completion = await groq.chat.completions.create({
        messages: [
          {
            role: "system",
            content: "You are an expert educator who creates high-quality quiz questions. Always respond with valid JSON only."
          },
          {
            role: "user",
            content: prompt
          }
        ],
        model: groqModel,
        temperature: 0.7,
        max_tokens: 4096,
      });

      const response = completion.choices[0]?.message?.content || '[]';
      
      // Parse and validate JSON
      let questions;
      try {
        questions = JSON.parse(response);
      } catch (e) {
        // Try to extract JSON from markdown code blocks
        const jsonMatch = response.match(/```json\s*([\s\S]*?)\s*```/) || response.match(/```\s*([\s\S]*?)\s*```/);
        if (jsonMatch) {
          questions = JSON.parse(jsonMatch[1]);
        } else {
          throw new Error('Failed to parse AI response as JSON');
        }
      }

      if (!Array.isArray(questions)) {
        throw new Error('AI response is not an array');
      }

      return questions.map((q, index) => ({
        questionText: q.question,
        questionType: 'multiple_choice',
        options: q.options,
        correctAnswer: q.correctAnswer,
        explanation: q.explanation,
        points: 1,
        orderNumber: index + 1
      }));
    } catch (error) {
      console.error('Groq AI Error:', error);
      throw new Error('Failed to generate quiz questions: ' + error.message);
    }
  }

  /**
   * Evaluate user answers using AI
   */
  async evaluateAnswers({ questions, userAnswers }) {
    const evaluations = [];
    let totalScore = 0;
    const maxScore = questions.length;

    for (let i = 0; i < questions.length; i++) {
      const question = questions[i];
      const userAnswer = userAnswers[i];
      const isCorrect = userAnswer === question.correctAnswer;

      if (isCorrect) {
        totalScore += 1;
      }

      evaluations.push({
        questionId: question.id,
        userAnswer,
        correctAnswer: question.correctAnswer,
        isCorrect,
        explanation: question.explanation
      });
    }

    return {
      score: (totalScore / maxScore) * 100,
      totalPoints: maxScore,
      evaluations
    };
  }

  /**
   * Generate hints for a question
   */
  async generateHint(questionText, options) {
    const prompt = `For this quiz question, provide a helpful hint without revealing the answer:

Question: ${questionText}
Options: ${options.join(', ')}

Provide a brief, educational hint (1-2 sentences) that guides the student's thinking without giving away the answer.`;

    try {
      const completion = await groq.chat.completions.create({
        messages: [
          {
            role: "system",
            content: "You are a helpful tutor who provides educational hints."
          },
          {
            role: "user",
            content: prompt
          }
        ],
        model: groqModel,
        temperature: 0.6,
        max_tokens: 200,
      });

      return completion.choices[0]?.message?.content || "Think about the key concepts related to this topic.";
    } catch (error) {
      console.error('Hint generation error:', error);
      return "Review the material and think carefully about each option.";
    }
  }

  /**
   * Generate improvement suggestions based on quiz results
   */
  async generateSuggestions({ subject, gradeLevel, incorrectQuestions, score }) {
    if (incorrectQuestions.length === 0) {
      return [
        "Excellent work! You've mastered this topic.",
        "Try advancing to a higher difficulty level to challenge yourself further."
      ];
    }

    const topicsToReview = incorrectQuestions.map(q => q.questionText).join('\n- ');
    
    const prompt = `A student scored ${score}% on a ${subject} quiz at ${gradeLevel} grade level.

They struggled with these questions:
- ${topicsToReview}

Provide exactly 2 specific, actionable improvement suggestions (each 1-2 sentences) to help them improve.`;

    try {
      const completion = await groq.chat.completions.create({
        messages: [
          {
            role: "system",
            content: "You are an experienced educator providing constructive feedback."
          },
          {
            role: "user",
            content: prompt
          }
        ],
        model: groqModel,
        temperature: 0.7,
        max_tokens: 300,
      });

      const response = completion.choices[0]?.message?.content || '';
      
      // Split response into suggestions
      const suggestions = response
        .split(/\n+/)
        .filter(line => line.trim().length > 10)
        .slice(0, 2)
        .map(s => s.replace(/^\d+\.\s*/, '').trim());

      if (suggestions.length < 2) {
        return [
          "Review the concepts you found challenging and practice similar problems.",
          "Consider seeking additional resources or tutoring for topics where you struggled."
        ];
      }

      return suggestions;
    } catch (error) {
      console.error('Suggestions generation error:', error);
      return [
        "Review the topics you found most challenging.",
        "Practice more problems to strengthen your understanding."
      ];
    }
  }

  /**
   * Determine adaptive difficulty based on user performance
   */
  async determineAdaptiveDifficulty(userPerformance) {
    const avgScore = userPerformance.avg_score || 0;
    const currentDifficulty = userPerformance.last_difficulty || 'medium';

    // Simple adaptive logic
    if (avgScore >= 85 && currentDifficulty !== 'hard') {
      return 'hard';
    } else if (avgScore >= 70 && avgScore < 85) {
      return 'medium';
    } else if (avgScore < 70 && currentDifficulty !== 'easy') {
      return 'easy';
    }

    return currentDifficulty;
  }
}

module.exports = new AIService();
