const SecurityQuestionsService = require('../services/securityQuestions.service');

class SecurityQuestionsController {
  static async getAllQuestions(req, res, next) {
    try {
      const result = await SecurityQuestionsService.getAllQuestions();
      res.status(200).json({ 
        ok: true, 
        ...result 
      });
    } catch (error) {
      next(error);
    }
  }

  static async saveUserAnswers(req, res, next) {
    try {
      const { userId, questionAnswers } = req.body;
      const result = await SecurityQuestionsService.saveUserSecurityAnswers(userId, questionAnswers);
      
      res.status(201).json({ 
        ok: true, 
        ...result 
      });
    } catch (error) {
      next(error);
    }
  }

  static async getUserQuestions(req, res, next) {
    try {
      const { userId } = req.params;
      const result = await SecurityQuestionsService.getUserSecurityQuestions(userId);
      
      res.status(200).json({ 
        ok: true, 
        ...result 
      });
    } catch (error) {
      next(error);
    }
  }

  static async verifyAnswers(req, res, next) {
    try {
      const { userId, questionAnswers } = req.body;
      const result = await SecurityQuestionsService.verifySecurityAnswers(userId, questionAnswers);
      
      res.status(200).json({ 
        ok: true, 
        ...result 
      });
    } catch (error) {
      next(error);
    }
  }

  static async checkUserAnswers(req, res, next) {
    try {
      const { userId } = req.params;
      const result = await SecurityQuestionsService.checkUserHasSecurityAnswers(userId);
      
      res.status(200).json({ 
        ok: true, 
        ...result 
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = SecurityQuestionsController;