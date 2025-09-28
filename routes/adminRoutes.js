// routes/adminRoutes.js
const express = require('express');
const winston = require('winston');
const router = express.Router();
const { adminStaffEmailValidation, handleValidationErrors } = require('../middleware/validation');
const { authenticate } = require('../middleware/authMiddleware');

// Configure winston logger
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({ filename: 'error.log', level: 'error' }),
    new winston.transports.File({ filename: 'combined.log' })
  ]
});

const {
  exportForOpenAI,
  exportForHuggingFace,
  exportConversationDataset,
  exportAnalytics,
  exportAllFormats
} = require('../scripts/exportAITrainingData');

const crudController = require('../controllers/crudController');

// Middleware to check if user is admin or staff
const requireAdminOrStaff = (req, res, next) => {
  const userType = req.user?.usertype;
  
  // Allow System Admin and Staff users
  if (userType === 'System Admin' || userType === 'Staff - Standard User') {
    return next();
  }
  
  return res.status(403).json({ 
    success: false, 
    error: 'Access denied. Admin or Staff privileges required.' 
  });
};

// Admin/Staff Email endpoint (requires authentication and admin/staff privileges)
router.post('/send-email', 
  authenticate, 
  requireAdminOrStaff, 
  adminStaffEmailValidation, 
  handleValidationErrors, 
  crudController.sendEmail
);

// ==================== AI TRAINING DATA EXPORT ROUTES ====================

// Export all AI training data formats
router.post('/export-ai-data/all', authenticate, requireAdminOrStaff, async (req, res) => {
  try {
    const exports = await exportAllFormats();
    
    res.json({
      success: true,
      message: 'AI training data exported successfully',
      exports: exports,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('AI data export error', { error: error.message });
    res.status(500).json({
      success: false,
      error: 'Failed to export AI training data',
      details: error.message
    });
  }
});

// Export for OpenAI fine-tuning
router.post('/export-ai-data/openai', authenticate, requireAdminOrStaff, async (req, res) => {
  try {
    logger.info('Admin requested OpenAI export', { user: req.user?.email });
    const filepath = await exportForOpenAI();
    
    res.json({
      success: true,
      message: 'OpenAI training data exported successfully',
      filepath: filepath,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('OpenAI export error', { error: error.message });
    res.status(500).json({
      success: false,
      error: 'Failed to export OpenAI training data',
      details: error.message
    });
  }
});

// Export for Hugging Face
router.post('/export-ai-data/huggingface', authenticate, requireAdminOrStaff, async (req, res) => {
  try {
    logger.info('Admin requested Hugging Face export', { user: req.user?.email });
    const filepath = await exportForHuggingFace();
    
    res.json({
      success: true,
      message: 'Hugging Face training data exported successfully',
      filepath: filepath,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('Hugging Face export error', { error: error.message });
    res.status(500).json({
      success: false,
      error: 'Failed to export Hugging Face training data',
      details: error.message
    });
  }
});

// Export conversation dataset
router.post('/export-ai-data/conversations', authenticate, requireAdminOrStaff, async (req, res) => {
  try {
    logger.info('Admin requested conversation dataset export', { user: req.user?.email });
    const filepath = await exportConversationDataset();
    
    res.json({
      success: true,
      message: 'Conversation dataset exported successfully',
      filepath: filepath,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('Conversation export error', { error: error.message });
    res.status(500).json({
      success: false,
      error: 'Failed to export conversation dataset',
      details: error.message
    });
  }
});

// Export analytics and insights
router.post('/export-ai-data/analytics', authenticate, requireAdminOrStaff, async (req, res) => {
  try {
    logger.info('Admin requested analytics export', { user: req.user?.email });
    const filepath = await exportAnalytics();
    
    res.json({
      success: true,
      message: 'Analytics data exported successfully',
      filepath: filepath,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('Analytics export error', { error: error.message });
    res.status(500).json({
      success: false,
      error: 'Failed to export analytics data',
      details: error.message
    });
  }
});

// Get AI training data statistics
router.get('/ai-data/stats', authenticate, requireAdminOrStaff, async (req, res) => {
  try {
    const fs = require('fs').promises;
    const path = require('path');
    
    const AI_TRAINING_DIR = path.join(__dirname, '..', 'ai-training-data');
    const logFile = path.join(AI_TRAINING_DIR, 'api-interactions.jsonl');
    
    let stats = {
      total_interactions: 0,
      file_size: 0,
      last_interaction: null,
      data_collection_active: true
    };
    
    try {
      const fileStats = await fs.stat(logFile);
      stats.file_size = fileStats.size;
      stats.last_interaction = fileStats.mtime;
      
      // Count lines to get interaction count
      const content = await fs.readFile(logFile, 'utf8');
      stats.total_interactions = content.split('\n').filter(line => line.trim()).length;
      
    } catch (fileError) {
      // File might not exist yet
      stats.data_collection_active = false;
    }
    
    res.json({
      success: true,
      stats: stats,
      ai_training_directory: AI_TRAINING_DIR,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    logger.error('AI stats error', { error: error.message });
    res.status(500).json({
      success: false,
      error: 'Failed to get AI training data statistics',
      details: error.message
    });
  }
});

module.exports = router; 