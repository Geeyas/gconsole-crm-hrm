# AI Training Data Collection & Export System

This system automatically collects and exports API interaction data from your CRM/HRM system to train custom AI models.

## 🎯 Overview

The AI training system captures:
- **API Interactions**: All API calls with request/response data
- **User Behavior**: User types, intents, and interaction patterns
- **System Performance**: Response times, success rates, error patterns
- **Business Context**: Domain-specific information for healthcare workforce management

## 📁 Data Structure

```
ai-training-data/
├── api-interactions.jsonl          # Main interaction log
├── error-interactions.jsonl        # Error-specific interactions
├── export-log.jsonl               # Export activity log
├── individual/                     # Daily individual interaction files
│   ├── 2025-08-04/
│   │   ├── interaction_001.json
│   │   └── interaction_002.json
│   └── 2025-08-05/
└── exports/                        # Generated export files
    ├── openai-training-{timestamp}.jsonl
    ├── huggingface-training-{timestamp}.json
    ├── conversation-dataset-{timestamp}.json
    └── analytics-{timestamp}.json
```

## 🚀 Getting Started

### 1. Install Dependencies
```bash
npm install node-cron
```

### 2. The AI logger is automatically activated when you start the server
```bash
npm start
```

### 3. Data will be collected automatically as users interact with the API

## 📊 Export Formats

### OpenAI Fine-tuning Format (JSONL)
Perfect for training custom GPT models:
```json
{
  "messages": [
    {"role": "system", "content": "You are an AI assistant for healthcare workforce management..."},
    {"role": "user", "content": "I want to create a new shift request..."},
    {"role": "assistant", "content": "I'll help you create a shift request..."}
  ]
}
```

### Hugging Face Format (JSON)
Optimized for transformer models:
```json
{
  "version": "1.0",
  "metadata": {...},
  "data": [
    {
      "input": "User Intent: create shift request\nRequest: ...",
      "output": "Successfully processed the request...",
      "metadata": {...}
    }
  ]
}
```

### Conversation Dataset
For chatbot and conversational AI training:
```json
{
  "conversations": [
    {
      "user_message": "I need help with shift management",
      "bot_response": "I can help you with creating, viewing, or managing shifts...",
      "context": {...},
      "intent": "shift_management",
      "sentiment": "positive"
    }
  ]
}
```

## 🛠 Manual Export Commands

### Export All Formats
```bash
npm run export-ai-data
```

### Export Specific Formats
```bash
npm run export-ai-openai      # OpenAI fine-tuning format
npm run export-ai-analytics   # Analytics and insights
node scripts/exportAITrainingData.js huggingface   # Hugging Face format
node scripts/exportAITrainingData.js conversations # Conversation dataset
```

## 🕒 Scheduled Exports

The system automatically exports data:
- **Daily**: 2:00 AM Australia/Melbourne timezone
- **Weekly Analytics**: 3:00 AM Sundays

To start the scheduler:
```bash
npm run start-scheduler
```

## 🔐 Admin API Endpoints

### Export Data (Admin/Staff Only)
```bash
# Export all formats
POST /api/admin/export-ai-data/all

# Export for OpenAI
POST /api/admin/export-ai-data/openai

# Export for Hugging Face
POST /api/admin/export-ai-data/huggingface

# Export conversation dataset
POST /api/admin/export-ai-data/conversations

# Export analytics
POST /api/admin/export-ai-data/analytics

# Get statistics
GET /api/admin/ai-data/stats
```

## 📈 Analytics & Insights

The system provides comprehensive analytics:

### Usage Analytics
- Total API interactions
- Success/failure rates
- Most used endpoints
- User behavior patterns

### Business Insights
- Peak usage times
- Most common workflows
- Feature adoption rates
- Error patterns

### Training Metrics
- Data quality scores
- Conversation complexity
- Intent classification accuracy
- Domain coverage

## 🔧 Configuration

### Data Privacy & Security
- Automatic PII redaction
- Sensitive field sanitization
- Configurable data retention
- GDPR compliance features

### Customization
Edit `middleware/aiTrainingLogger.js` to:
- Add custom intent mapping
- Modify data sanitization rules
- Adjust conversation generation
- Configure export formats

## 🤖 Training Your AI

### 1. Collect Data
Let the system run for 2-4 weeks to collect sufficient interaction data.

### 2. Export Training Data
```bash
npm run export-ai-data
```

### 3. Train Your Model
Use the exported data with:
- **OpenAI**: Fine-tune GPT models using the JSONL export
- **Hugging Face**: Train transformer models with the JSON export
- **Custom Models**: Use conversation dataset for chatbot training

### 4. Integration Example
```javascript
// Example: Using trained model to help users
const ai = new YourTrainedModel();

app.post('/api/ai-help', async (req, res) => {
  const userQuery = req.body.query;
  const context = req.body.context;
  
  const response = await ai.generateResponse(userQuery, context);
  
  res.json({
    suggestion: response,
    confidence: response.confidence,
    actions: response.suggestedActions
  });
});
```

## 🎯 Use Cases for Your Trained AI

### 1. Intelligent Help Assistant
- "How do I create a shift for next Monday?"
- "Show me all available nurses for the night shift"
- "What qualifications does John need for this role?"

### 2. Workflow Automation
- Auto-suggest shift assignments based on qualifications
- Predict staffing needs using historical data
- Intelligent error resolution

### 3. Analytics & Insights
- "Which locations have the highest turnover?"
- "What are the busiest times for shift requests?"
- "How can we improve staff satisfaction?"

## 📝 Sample Training Prompts

The system generates training data like:

**User Intent**: "I want to create a shift request for tomorrow morning"
**System Response**: "I'll help you create a shift request. You'll need to specify the location, time, required qualifications, and number of staff needed."

**User Intent**: "Show me my qualifications"
**System Response**: "Here are your current qualifications: Registered Nurse (expires 2025-12-31), CPR Certification (expires 2025-06-15)."

## 🔍 Data Quality

The system ensures high-quality training data through:
- **Automatic validation**: Ensures data completeness
- **Context enrichment**: Adds business domain context
- **Intent classification**: Automatically categorizes user intentions
- **Response quality scoring**: Rates interaction success

## 🚨 Important Notes

1. **Privacy**: All sensitive data is automatically redacted
2. **Storage**: Monitor disk space as data grows over time
3. **Performance**: Minimal impact on API response times
4. **Compliance**: Designed with GDPR and healthcare compliance in mind

## 💡 Tips for Better Training Data

1. **Encourage diverse usage**: Train different user types on various features
2. **Document edge cases**: Capture error scenarios and unusual requests
3. **Regular exports**: Export data weekly to prevent loss
4. **Quality over quantity**: 1000 high-quality interactions > 10,000 poor ones

## 🤝 Contributing

To improve the AI training system:
1. Add new intent categories in `inferUserIntent()`
2. Enhance response generation in `generateAIResponse()`
3. Add new export formats in `exportAITrainingData.js`
4. Improve analytics in the export functions

---

**Ready to build your intelligent healthcare workforce management AI!** 🚀
