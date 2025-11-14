const nodemailer = require('nodemailer');

class EmailService {
  constructor() {
    this.transporter = null;
    this.initialize();
  }

  initialize() {
    // Create transporter based on environment
    if (process.env.SMTP_HOST && process.env.SMTP_PORT) {
      // Production SMTP configuration
      this.transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: parseInt(process.env.SMTP_PORT),
        secure: process.env.SMTP_SECURE === 'true', // true for 465, false for other ports
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASSWORD,
        },
      });
    } else {
      // Development - Use ethereal.email for testing
      this.createTestAccount();
    }
  }

  async createTestAccount() {
    try {
      const testAccount = await nodemailer.createTestAccount();
      this.transporter = nodemailer.createTransport({
        host: 'smtp.ethereal.email',
        port: 587,
        secure: false,
        auth: {
          user: testAccount.user,
          pass: testAccount.pass,
        },
      });
      console.log('📧 Email service initialized with test account:', testAccount.user);
    } catch (error) {
      console.error('Failed to create test email account:', error);
    }
  }

  /**
   * Send quiz result email to user
   */
  async sendQuizResultEmail({ userEmail, username, quizTitle, score, totalPoints, suggestions, feedback }) {
    if (!this.transporter) {
      console.warn('Email service not initialized');
      return null;
    }

    const percentage = ((score / totalPoints) * 100).toFixed(2);
    const correctAnswers = feedback.filter(f => f.isCorrect).length;
    const incorrectAnswers = feedback.filter(f => !f.isCorrect).length;

    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
          .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
          .score-box { background: white; padding: 20px; margin: 20px 0; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
          .score-large { font-size: 48px; font-weight: bold; color: #667eea; text-align: center; margin: 10px 0; }
          .stats { display: flex; justify-content: space-around; margin: 20px 0; }
          .stat { text-align: center; }
          .stat-value { font-size: 24px; font-weight: bold; color: #667eea; }
          .stat-label { color: #666; font-size: 14px; }
          .suggestions { background: #e8f4f8; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #667eea; }
          .suggestion-item { margin: 10px 0; padding-left: 20px; position: relative; }
          .suggestion-item:before { content: "💡"; position: absolute; left: 0; }
          .footer { text-align: center; color: #666; margin-top: 20px; font-size: 12px; }
          .performance { color: ${percentage >= 80 ? '#28a745' : percentage >= 60 ? '#ffc107' : '#dc3545'}; font-weight: bold; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🎓 Quiz Results</h1>
            <p>Hi ${username}! Here are your quiz results</p>
          </div>
          <div class="content">
            <h2 style="color: #667eea;">${quizTitle}</h2>
            
            <div class="score-box">
              <div class="score-large performance">${percentage}%</div>
              <p style="text-align: center; color: #666;">Your Score</p>
              
              <div class="stats">
                <div class="stat">
                  <div class="stat-value" style="color: #28a745;">✓ ${correctAnswers}</div>
                  <div class="stat-label">Correct</div>
                </div>
                <div class="stat">
                  <div class="stat-value" style="color: #dc3545;">✗ ${incorrectAnswers}</div>
                  <div class="stat-label">Incorrect</div>
                </div>
                <div class="stat">
                  <div class="stat-value">${totalPoints}</div>
                  <div class="stat-label">Total Questions</div>
                </div>
              </div>
            </div>

            ${percentage >= 80 ? 
              '<p style="color: #28a745; font-weight: bold;">🌟 Excellent work! You have a strong understanding of this topic!</p>' :
              percentage >= 60 ?
              '<p style="color: #ffc107; font-weight: bold;">👍 Good effort! Keep practicing to improve further!</p>' :
              '<p style="color: #dc3545; font-weight: bold;">💪 Keep learning! Review the topics and try again!</p>'
            }

            ${suggestions && suggestions.length > 0 ? `
              <div class="suggestions">
                <h3 style="color: #667eea; margin-top: 0;">📚 Improvement Suggestions</h3>
                ${suggestions.map(s => `<div class="suggestion-item">${s}</div>`).join('')}
              </div>
            ` : ''}

            <div style="background: white; padding: 20px; border-radius: 8px; margin-top: 20px;">
              <h3 style="color: #667eea;">📊 Detailed Feedback</h3>
              ${feedback.slice(0, 5).map((f, idx) => `
                <div style="margin: 15px 0; padding: 10px; background: ${f.isCorrect ? '#d4edda' : '#f8d7da'}; border-radius: 5px;">
                  <strong>Question ${idx + 1}:</strong> ${f.isCorrect ? '✓ Correct' : '✗ Incorrect'}<br>
                  ${!f.isCorrect ? `<small>Correct answer: ${f.correctAnswer}</small>` : ''}
                </div>
              `).join('')}
              ${feedback.length > 5 ? `<p style="color: #666; font-style: italic;">... and ${feedback.length - 5} more questions</p>` : ''}
            </div>

            <div style="text-align: center; margin-top: 30px;">
              <p style="color: #667eea; font-weight: bold;">Keep up the great work! 🚀</p>
            </div>
          </div>
          
          <div class="footer">
            <p>This is an automated email from AI Quiz Application</p>
            <p>© ${new Date().getFullYear()} AI Quiz Application. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    const textContent = `
Quiz Results - ${quizTitle}

Hi ${username}!

Your Score: ${percentage}% (${score}/${totalPoints})
Correct Answers: ${correctAnswers}
Incorrect Answers: ${incorrectAnswers}

${suggestions && suggestions.length > 0 ? `
Improvement Suggestions:
${suggestions.map((s, i) => `${i + 1}. ${s}`).join('\n')}
` : ''}

Keep up the great work!

---
AI Quiz Application
    `;

    try {
      const info = await this.transporter.sendMail({
        from: process.env.SMTP_FROM || '"AI Quiz App" <noreply@quizapp.com>',
        to: userEmail,
        subject: `Quiz Results: ${quizTitle} - ${percentage}% Score`,
        text: textContent,
        html: htmlContent,
      });

      console.log('📧 Email sent successfully:', info.messageId);
      
      // For development, get preview URL
      if (process.env.NODE_ENV !== 'production') {
        const previewUrl = nodemailer.getTestMessageUrl(info);
        if (previewUrl) {
          console.log('📬 Preview URL:', previewUrl);
        }
      }

      return info;
    } catch (error) {
      console.error('Failed to send email:', error);
      throw error;
    }
  }

  /**
   * Send welcome email to new users
   */
  async sendWelcomeEmail({ userEmail, username }) {
    if (!this.transporter) {
      console.warn('Email service not initialized');
      return null;
    }

    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 40px; text-align: center; border-radius: 10px 10px 0 0; }
          .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
          .button { display: inline-block; padding: 12px 30px; background: #667eea; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }
          .features { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; }
          .feature { margin: 15px 0; padding-left: 30px; position: relative; }
          .feature:before { content: "✓"; position: absolute; left: 0; color: #667eea; font-weight: bold; font-size: 20px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🎓 Welcome to AI Quiz App!</h1>
          </div>
          <div class="content">
            <h2>Hello ${username}! 👋</h2>
            <p>We're excited to have you join our AI-powered quiz platform!</p>
            
            <div class="features">
              <h3 style="color: #667eea;">What you can do:</h3>
              <div class="feature">Generate AI-powered quizzes on any subject</div>
              <div class="feature">Get instant feedback and explanations</div>
              <div class="feature">Track your progress over time</div>
              <div class="feature">Retry quizzes to improve your scores</div>
              <div class="feature">Get personalized learning suggestions</div>
            </div>

            <p style="text-align: center;">
              <strong>Ready to start learning?</strong><br>
              Create your first quiz and begin your journey!
            </p>

            <p style="color: #666; font-size: 14px; margin-top: 30px;">
              If you have any questions, feel free to reach out to our support team.
            </p>
          </div>
        </div>
      </body>
      </html>
    `;

    try {
      const info = await this.transporter.sendMail({
        from: process.env.SMTP_FROM || '"AI Quiz App" <noreply@quizapp.com>',
        to: userEmail,
        subject: 'Welcome to AI Quiz Application! 🎓',
        html: htmlContent,
      });

      console.log('📧 Welcome email sent:', info.messageId);
      return info;
    } catch (error) {
      console.error('Failed to send welcome email:', error);
      return null;
    }
  }
}

module.exports = new EmailService();
