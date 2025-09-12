const SecurityQuestionsModel = require('../model/securityQuestions.model');
const UserSecurityAnswersModel = require('../model/userSecurityAnswers.model');
const { BadRequestError, UnauthorizedError } = require('../utils/errors');

class SecurityQuestionsService {
  static async getAllQuestions() {
    try {
      const questions = await SecurityQuestionsModel.getAll();
      return {
        questions: questions.map(q => ({
          id: q.did,
          text: q.dquestiontext,
          createdAt: q.tcreatedat
        }))
      };
    } catch (error) {
      throw new BadRequestError(error.message);
    }
  }

  static async saveUserSecurityAnswers(userId, questionAnswers) {
    // Validate input
    if (!userId) {
      throw new BadRequestError('User ID is required');
    }

    if (!Array.isArray(questionAnswers) || questionAnswers.length === 0) {
      throw new BadRequestError('Question answers array is required and cannot be empty');
    }

    // Enforce minimum of 3 security questions
    if (questionAnswers.length < 3) {
      throw new BadRequestError('At least 3 security questions are required');
    }

    // Enforce maximum of 5 security questions
    if (questionAnswers.length > 5) {
      throw new BadRequestError('Maximum of 5 security questions allowed');
    }

    // Validate each question-answer pair
    for (const qa of questionAnswers) {
      if (!qa.questionId || !qa.answer) {
        throw new BadRequestError('Each question must have questionId and answer');
      }
      
      if (qa.answer.trim().length < 1) {
        throw new BadRequestError('Answer cannot be empty');
      }

      if (qa.answer.length > 100) {
        throw new BadRequestError('Answer cannot exceed 100 characters');
      }

      // Verify question exists
      const question = await SecurityQuestionsModel.getById(qa.questionId);
      if (!question) {
        throw new BadRequestError(`Invalid question ID: ${qa.questionId}`);
      }
    }

    // Check for duplicate questions
    const questionIds = questionAnswers.map(qa => qa.questionId);
    const uniqueQuestionIds = [...new Set(questionIds)];
    if (questionIds.length !== uniqueQuestionIds.length) {
      throw new BadRequestError('Duplicate security questions are not allowed');
    }

    try {
      const result = await UserSecurityAnswersModel.saveUserAnswers(userId, questionAnswers);
      return result;
    } catch (error) {
      throw new BadRequestError(error.message);
    }
  }

  static async getUserSecurityQuestions(userId) {
    if (!userId) {
      throw new BadRequestError('User ID is required');
    }

    try {
      const questions = await UserSecurityAnswersModel.getUserSecurityQuestions(userId);
      return {
        questions: questions.map(q => ({
          id: q.did,
          questionId: q.dsecurityquestionid,
          questionText: q.dquestiontext,
          createdAt: q.tcreatedat
        }))
      };
    } catch (error) {
      throw new BadRequestError(error.message);
    }
  }

  static async verifySecurityAnswers(userId, questionAnswers) {
    if (!userId) {
      throw new BadRequestError('User ID is required');
    }

    if (!Array.isArray(questionAnswers) || questionAnswers.length === 0) {
      throw new BadRequestError('Question answers array is required');
    }

    try {
      const isValid = await UserSecurityAnswersModel.verifyAllSecurityAnswers(userId, questionAnswers);
      
      if (!isValid) {
        throw new UnauthorizedError('One or more security answers are incorrect');
      }

      return { verified: true, message: 'Security answers verified successfully' };
    } catch (error) {
      if (error instanceof UnauthorizedError) {
        throw error;
      }
      throw new BadRequestError(error.message);
    }
  }

  static async checkUserHasSecurityAnswers(userId) {
    if (!userId) {
      throw new BadRequestError('User ID is required');
    }

    try {
      const hasAnswers = await UserSecurityAnswersModel.hasSecurityAnswers(userId);
      return { hasAnswers };
    } catch (error) {
      throw new BadRequestError(error.message);
    }
  }
}

module.exports = SecurityQuestionsService;