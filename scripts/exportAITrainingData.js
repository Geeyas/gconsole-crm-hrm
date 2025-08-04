// scripts/exportAITrainingData.js
// Export AI training data in various formats for different AI platforms

const fs = require('fs').promises;
const path = require('path');

const AI_TRAINING_DIR = path.join(__dirname, '..', 'ai-training-data');
const EXPORT_DIR = path.join(AI_TRAINING_DIR, 'exports');

/**
 * Export data for OpenAI Fine-tuning (JSONL format)
 */
async function exportForOpenAI() {
  console.log('🤖 Exporting data for OpenAI fine-tuning...');
  
  const interactions = await loadAllInteractions();
  const openAIData = [];
  
  for (const interaction of interactions) {
    // Format for OpenAI chat completion fine-tuning
    const chatFormat = {
      messages: [
        {
          role: "system",
          content: "You are an AI assistant for a healthcare workforce management system. Help users with their requests about shifts, qualifications, employees, and system operations."
        },
        {
          role: "user", 
          content: `I want to ${interaction.conversation.user_intent}. Here's my request: ${interaction.description}`
        },
        {
          role: "assistant",
          content: generateAIResponse(interaction)
        }
      ]
    };
    
    openAIData.push(chatFormat);
  }
  
  await ensureExportDir();
  const filepath = path.join(EXPORT_DIR, `openai-training-${Date.now()}.jsonl`);
  
  // Write as JSONL (one JSON object per line)
  const jsonlContent = openAIData.map(item => JSON.stringify(item)).join('\n');
  await fs.writeFile(filepath, jsonlContent);
  
  console.log(`✅ OpenAI training data exported to: ${filepath}`);
  console.log(`📊 Total interactions: ${openAIData.length}`);
  
  return filepath;
}

/**
 * Export data for Hugging Face training
 */
async function exportForHuggingFace() {
  console.log('🤗 Exporting data for Hugging Face...');
  
  const interactions = await loadAllInteractions();
  const hfData = {
    version: "1.0",
    metadata: {
      domain: "healthcare_workforce_management",
      total_interactions: interactions.length,
      date_range: getDateRange(interactions),
      categories: getCategoryCounts(interactions)
    },
    data: interactions.map(interaction => ({
      input: `User Intent: ${interaction.conversation.user_intent}\nRequest: ${interaction.description}`,
      output: generateAIResponse(interaction),
      metadata: {
        success: interaction.conversation.success,
        endpoint_category: interaction.metadata.endpoint_category,
        user_type: interaction.metadata.user_type,
        complexity: interaction.metadata.complexity
      }
    }))
  };
  
  await ensureExportDir();
  const filepath = path.join(EXPORT_DIR, `huggingface-training-${Date.now()}.json`);
  await fs.writeFile(filepath, JSON.stringify(hfData, null, 2));
  
  console.log(`✅ Hugging Face training data exported to: ${filepath}`);
  return filepath;
}

/**
 * Export conversation dataset for chatbot training
 */
async function exportConversationDataset() {
  console.log('💬 Exporting conversation dataset...');
  
  const interactions = await loadAllInteractions();
  const conversations = [];
  
  for (const interaction of interactions) {
    conversations.push({
      id: interaction.id,
      timestamp: interaction.timestamp,
      user_message: `I need help with: ${interaction.conversation.user_intent}`,
      bot_response: generateAIResponse(interaction),
      context: {
        endpoint: interaction.interaction.request.endpoint,
        method: interaction.interaction.request.method,
        user_type: interaction.interaction.request.userType,
        success: interaction.conversation.success
      },
      intent: interaction.conversation.user_intent,
      entities: extractEntities(interaction),
      sentiment: interaction.conversation.success ? 'positive' : 'negative'
    });
  }
  
  await ensureExportDir();
  const filepath = path.join(EXPORT_DIR, `conversation-dataset-${Date.now()}.json`);
  await fs.writeFile(filepath, JSON.stringify({ conversations }, null, 2));
  
  console.log(`✅ Conversation dataset exported to: ${filepath}`);
  return filepath;
}

/**
 * Export analytics and insights
 */
async function exportAnalytics() {
  console.log('📈 Generating analytics...');
  
  const interactions = await loadAllInteractions();
  
  const analytics = {
    overview: {
      total_interactions: interactions.length,
      success_rate: calculateSuccessRate(interactions),
      date_range: getDateRange(interactions),
      most_active_users: getMostActiveUsers(interactions)
    },
    endpoint_analysis: analyzeEndpoints(interactions),
    user_behavior: analyzeUserBehavior(interactions),
    error_patterns: analyzeErrors(interactions),
    temporal_patterns: analyzeTemporalPatterns(interactions),
    business_insights: generateBusinessInsights(interactions)
  };
  
  await ensureExportDir();
  const filepath = path.join(EXPORT_DIR, `analytics-${Date.now()}.json`);
  await fs.writeFile(filepath, JSON.stringify(analytics, null, 2));
  
  console.log(`✅ Analytics exported to: ${filepath}`);
  return filepath;
}

/**
 * Generate appropriate AI response based on interaction
 */
function generateAIResponse(interaction) {
  const { request, response } = interaction.interaction;
  const { success, error_details } = interaction.conversation;
  
  if (success) {
    return generateSuccessResponse(request, response);
  } else {
    return generateErrorResponse(request, response, error_details);
  }
}

function generateSuccessResponse(request, response) {
  const responses = {
    'authentication': "Great! You've been successfully authenticated and can now access the system.",
    'shift_management': "Perfect! Your shift request has been processed successfully.",
    'qualification_management': "Excellent! The qualification information has been updated.",
    'employee_management': "Done! The employee information has been processed.",
    'client_management': "Success! The client information has been handled."
  };
  
  const category = categorizeEndpoint(request.endpoint);
  return responses[category] || "Your request has been processed successfully!";
}

function generateErrorResponse(request, response, errorDetails) {
  const commonErrors = {
    400: "I notice there was an issue with your request. Please check the data you provided and try again.",
    401: "You need to log in first to access this feature.",
    403: "You don't have permission to perform this action. Please contact your administrator.",
    404: "The resource you're looking for doesn't exist.",
    500: "There was a server error. Please try again later or contact support."
  };
  
  const baseResponse = commonErrors[errorDetails?.code] || "Something went wrong with your request.";
  
  if (errorDetails?.message) {
    return `${baseResponse} Error details: ${errorDetails.message}`;
  }
  
  return baseResponse;
}

/**
 * Extract entities from interaction for NLP training
 */
function extractEntities(interaction) {
  const entities = [];
  const { endpoint, body, params } = interaction.interaction.request;
  
  // Extract IDs
  if (params?.id) entities.push({ type: 'ID', value: params.id });
  
  // Extract dates
  if (body?.shiftdate) entities.push({ type: 'DATE', value: body.shiftdate });
  if (body?.starttime) entities.push({ type: 'TIME', value: body.starttime });
  
  // Extract locations
  if (body?.clientlocationid) entities.push({ type: 'LOCATION_ID', value: body.clientlocationid });
  
  // Extract qualifications
  if (body?.qualificationId) entities.push({ type: 'QUALIFICATION_ID', value: body.qualificationId });
  
  return entities;
}

/**
 * Helper functions for analytics
 */
function calculateSuccessRate(interactions) {
  const successful = interactions.filter(i => i.conversation.success).length;
  return ((successful / interactions.length) * 100).toFixed(2) + '%';
}

function getDateRange(interactions) {
  const dates = interactions.map(i => new Date(i.timestamp));
  return {
    start: new Date(Math.min(...dates)).toISOString(),
    end: new Date(Math.max(...dates)).toISOString()
  };
}

function getMostActiveUsers(interactions) {
  const userCounts = {};
  interactions.forEach(i => {
    const userType = i.interaction.request.userType;
    userCounts[userType] = (userCounts[userType] || 0) + 1;
  });
  return userCounts;
}

function analyzeEndpoints(interactions) {
  const endpointStats = {};
  
  interactions.forEach(i => {
    const endpoint = i.interaction.request.endpoint;
    if (!endpointStats[endpoint]) {
      endpointStats[endpoint] = {
        total_calls: 0,
        success_count: 0,
        avg_duration: 0,
        methods: {},
        user_types: {}
      };
    }
    
    const stats = endpointStats[endpoint];
    stats.total_calls++;
    if (i.conversation.success) stats.success_count++;
    
    const method = i.interaction.request.method;
    stats.methods[method] = (stats.methods[method] || 0) + 1;
    
    const userType = i.interaction.request.userType;
    stats.user_types[userType] = (stats.user_types[userType] || 0) + 1;
  });
  
  return endpointStats;
}

function analyzeUserBehavior(interactions) {
  const behavior = {};
  
  interactions.forEach(i => {
    const userType = i.interaction.request.userType;
    if (!behavior[userType]) {
      behavior[userType] = {
        total_interactions: 0,
        success_rate: 0,
        common_endpoints: {},
        avg_complexity: 0
      };
    }
    
    behavior[userType].total_interactions++;
    if (i.conversation.success) behavior[userType].success_rate++;
    
    const endpoint = i.metadata.endpoint_category;
    behavior[userType].common_endpoints[endpoint] = 
      (behavior[userType].common_endpoints[endpoint] || 0) + 1;
  });
  
  return behavior;
}

function analyzeErrors(interactions) {
  const errors = interactions.filter(i => !i.conversation.success);
  const errorPatterns = {};
  
  errors.forEach(error => {
    const code = error.conversation.error_details?.code || 'unknown';
    if (!errorPatterns[code]) {
      errorPatterns[code] = {
        count: 0,
        endpoints: {},
        user_types: {},
        common_messages: {}
      };
    }
    
    errorPatterns[code].count++;
    
    const endpoint = error.interaction.request.endpoint;
    errorPatterns[code].endpoints[endpoint] = 
      (errorPatterns[code].endpoints[endpoint] || 0) + 1;
      
    const userType = error.interaction.request.userType;
    errorPatterns[code].user_types[userType] = 
      (errorPatterns[code].user_types[userType] || 0) + 1;
  });
  
  return errorPatterns;
}

function analyzeTemporalPatterns(interactions) {
  const hourly = {};
  const daily = {};
  
  interactions.forEach(i => {
    const date = new Date(i.timestamp);
    const hour = date.getHours();
    const day = date.toISOString().split('T')[0];
    
    hourly[hour] = (hourly[hour] || 0) + 1;
    daily[day] = (daily[day] || 0) + 1;
  });
  
  return { hourly_usage: hourly, daily_usage: daily };
}

function generateBusinessInsights(interactions) {
  return {
    most_used_features: Object.entries(
      interactions.reduce((acc, i) => {
        const category = i.metadata.endpoint_category;
        acc[category] = (acc[category] || 0) + 1;
        return acc;
      }, {})
    ).sort(([,a], [,b]) => b - a),
    
    user_satisfaction: calculateSuccessRate(interactions),
    
    peak_usage_times: analyzeTemporalPatterns(interactions),
    
    common_workflows: identifyWorkflows(interactions)
  };
}

function identifyWorkflows(interactions) {
  // Group interactions by user and session to identify common workflows
  const workflows = {};
  // This would need more sophisticated session tracking
  return workflows;
}

/**
 * Utility functions
 */
async function loadAllInteractions() {
  const interactions = [];
  
  try {
    // Load from main log file
    const logFile = path.join(AI_TRAINING_DIR, 'api-interactions.jsonl');
    const content = await fs.readFile(logFile, 'utf8');
    
    const lines = content.split('\n').filter(line => line.trim());
    for (const line of lines) {
      try {
        const logEntry = JSON.parse(line);
        if (logEntry.level === 'info' && logEntry.message === 'API_INTERACTION') {
          interactions.push(logEntry.meta);
        }
      } catch (e) {
        // Skip invalid lines
      }
    }
    
    // Also load from individual files
    const individualDir = path.join(AI_TRAINING_DIR, 'individual');
    try {
      const dates = await fs.readdir(individualDir);
      for (const date of dates) {
        const dateDir = path.join(individualDir, date);
        const files = await fs.readdir(dateDir);
        
        for (const file of files) {
          if (file.endsWith('.json')) {
            const filePath = path.join(dateDir, file);
            const content = await fs.readFile(filePath, 'utf8');
            interactions.push(JSON.parse(content));
          }
        }
      }
    } catch (e) {
      // Individual files directory might not exist yet
    }
    
  } catch (error) {
    console.error('Error loading interactions:', error);
  }
  
  return interactions;
}

async function ensureExportDir() {
  await fs.mkdir(EXPORT_DIR, { recursive: true });
}

function categorizeEndpoint(endpoint) {
  if (endpoint.includes('/auth') || endpoint.includes('/login')) return 'authentication';
  if (endpoint.includes('/shift')) return 'shift_management';
  if (endpoint.includes('/qualification')) return 'qualification_management';
  if (endpoint.includes('/people')) return 'employee_management';
  if (endpoint.includes('/client')) return 'client_management';
  return 'general';
}

/**
 * Main export function
 */
async function exportAllFormats() {
  console.log('🚀 Starting AI training data export...');
  
  const exports = {
    openai: await exportForOpenAI(),
    huggingface: await exportForHuggingFace(),
    conversations: await exportConversationDataset(),
    analytics: await exportAnalytics()
  };
  
  console.log('✅ All exports completed!');
  console.log('📁 Export files:', exports);
  
  return exports;
}

// CLI interface
if (require.main === module) {
  const command = process.argv[2];
  
  switch (command) {
    case 'openai':
      exportForOpenAI();
      break;
    case 'huggingface':
      exportForHuggingFace();
      break;
    case 'conversations':
      exportConversationDataset();
      break;
    case 'analytics':
      exportAnalytics();
      break;
    case 'all':
    default:
      exportAllFormats();
      break;
  }
}

module.exports = {
  exportForOpenAI,
  exportForHuggingFace,
  exportConversationDataset,
  exportAnalytics,
  exportAllFormats
};
