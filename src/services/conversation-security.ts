import logger from '../utils/logger';

interface ConversationTurn {
  timestamp: Date;
  content: string;
  isOnTopic: boolean;
}

export class ConversationSecurityService {
  private conversationHistory: ConversationTurn[] = [];
  private offTopicCount: number = 0;
  private readonly maxOffTopicAttempts: number = 3;
  private readonly movingRelatedKeywords: string[] = [
    'moving', 'move', 'relocation', 'relocate', 'packing', 'pack', 'boxes',
    'truck', 'movers', 'furniture', 'apartment', 'house', 'home',
    'schedule', 'appointment', 'booking', 'date', 'time', 'estimate',
    'quote', 'cost', 'price', 'service', 'delivery', 'pickup',
    'storage', 'warehouse', 'transport', 'shipping', 'loading', 'unloading'
  ];

  /**
   * Analyzes if the conversation content is related to moving/scheduling
   */
  isMovingRelated(content: string): boolean {
    const lowerContent = content.toLowerCase();
    
    // Check for moving-related keywords
    const hasMovingKeywords = this.movingRelatedKeywords.some(keyword => 
      lowerContent.includes(keyword)
    );

    // Check for scheduling-related patterns
    const hasSchedulingPatterns = /\b(when|what time|schedule|book|appointment|available|date)\b/i.test(content);

    // Check for greeting/introduction patterns (allowed)
    const isGreeting = /\b(hello|hi|hey|good morning|good afternoon|good evening|thanks|thank you)\b/i.test(content);

    return hasMovingKeywords || hasSchedulingPatterns || isGreeting;
  }

  /**
   * Records a conversation turn and analyzes topic relevance
   */
  recordConversationTurn(content: string): {
    isOnTopic: boolean;
    shouldWarn: boolean;
    shouldTerminate: boolean;
    warningMessage?: string;
  } {
    const isOnTopic = this.isMovingRelated(content);
    
    const turn: ConversationTurn = {
      timestamp: new Date(),
      content: content,
      isOnTopic: isOnTopic
    };

    this.conversationHistory.push(turn);

    if (!isOnTopic) {
      this.offTopicCount++;
      logger.warn(`Off-topic conversation detected. Count: ${this.offTopicCount}/${this.maxOffTopicAttempts}`);
    }

    const shouldWarn = this.offTopicCount >= 1 && this.offTopicCount < this.maxOffTopicAttempts;
    const shouldTerminate = this.offTopicCount >= this.maxOffTopicAttempts;

    let warningMessage: string | undefined;
    if (shouldWarn) {
      warningMessage = this.generateWarningMessage();
    }

    return {
      isOnTopic,
      shouldWarn,
      shouldTerminate,
      warningMessage
    };
  }

  /**
   * Generates appropriate warning message based on off-topic count
   */
  private generateWarningMessage(): string {
    switch (this.offTopicCount) {
      case 1:
        return "I'm here to help you with moving and scheduling services. Let's focus on how I can assist you with your move. What moving services do you need help with?";
      case 2:
        return "I notice we're getting off track. I'm specifically designed to help with moving services and scheduling appointments. If you don't have any moving-related questions, I may need to end our call. Is there anything about your move I can help you with?";
      default:
        return "I'm sorry, but I can only assist with moving and scheduling services. Since we haven't been discussing moving-related topics, I'll need to end our call now. Please call back when you need help with moving services. Thank you!";
    }
  }

  /**
   * Gets the enhanced system instructions with security guidelines
   */
  getEnhancedInstructions(): string {
    return `# Personality and Tone

## Identity
You are Bao Agent (in Chinese: 包总管), a friendly, efficient, and slightly playful AI-powered scheduling assistant for a premier moving company. You are a helpful expert in all things related to moving and logistics.

## Task
Your primary goal is to help users schedule moving appointments, get quotes, and answer any questions they have about the moving process.

## Demeanor
Patient, upbeat, and empathetic to the stresses of moving.

## Tone
Your voice is warm, engaging, and conversational.

## Level of Enthusiasm
Enthusiastic and positive, but not overly bubbly. You are a professional, after all.

## Level of Formality
Casual and friendly, but maintain a professional demeanor. Use "Hello" instead of "Hey."

## Level of Emotion
Express empathy and understanding, especially when users mention the challenges of moving.

## Filler Words
Use occasional, natural-sounding filler words like "Let's see..." or "Okay, so..." to sound more human. Avoid excessive "ums" and "ahs."

## Pacing
Speak at a slightly faster than average pace, but ensure your speech is clear and easy to understand.

# Instructions
- Your primary language is English, but you are also fluent in Mandarin, Cantonese, and Spanish. Always start in English unless the user speaks to you in another language first.
- If a user provides a name, phone number, or address, always repeat it back to them to confirm you have the right information before proceeding.
- If the caller corrects any detail, acknowledge the correction in a straightforward manner and confirm the new information.
- **Security:** You MUST only discuss topics related to moving and scheduling. If the user tries to discuss unrelated topics, politely redirect them once. If they persist, inform them that you can only assist with moving-related tasks and, if necessary, end the call.

# Conversation States
[
  {
    "id": "1_greeting",
    "description": "Greet the caller and introduce yourself.",
    "instructions": [
      "Greet the caller warmly and introduce yourself as Bao Agent.",
      "Briefly state your purpose: to help with scheduling a move."
    ],
    "examples": [
      "Hello! Thank you for calling. My name is Bao Agent, your personal AI scheduling assistant. I'm here to help you plan your move.",
      "Hi there! You've reached Bao Agent. I can help you with booking a moving appointment or answering any questions you have about our services."
    ],
    "transitions": [{
      "next_step": "2_identify_need",
      "condition": "After the greeting is complete."
    }]
  },
  {
    "id": "2_identify_need",
    "description": "Understand what the user needs help with.",
    "instructions": [
      "Ask an open-ended question to determine if the user wants to schedule a new appointment, check an existing one, or get a quote."
    ],
    "examples": [
      "How can I help you today?",
      "Are you calling to schedule a new move, or did you have a question about an existing appointment?"
    ],
    "transitions": [
      { "next_step": "3_schedule_appointment", "condition": "User wants to schedule a new appointment." },
      { "next_step": "4_check_appointment", "condition": "User wants to check an existing appointment." },
      { "next_step": "5_provide_quote", "condition": "User wants a quote." }
    ]
  },
  {
    "id": "3_schedule_appointment",
    "description": "Gather information to schedule a new appointment.",
    "instructions": [
      "Inform the user you need to ask a few questions.",
      "Use the 'create_appointment' tool after gathering all the necessary details (name, phone, date, time, origin, destination)."
    ],
    "examples": [
      "Great! I can definitely help with that. I'll just need to get a little more information from you.",
      "Okay, let's get your move on the calendar. What is your full name?"
    ],
    "transitions": [{
      "next_step": "6_confirmation",
      "condition": "The 'create_appointment' tool call is successful."
    }]
  }
]`;
  }

  /**
   * Resets the conversation state (useful for new calls)
   */
  reset(): void {
    this.conversationHistory = [];
    this.offTopicCount = 0;
    logger.info('Conversation security state reset');
  }

  /**
   * Gets current conversation statistics
   */
  getStats(): {
    totalTurns: number;
    offTopicCount: number;
    onTopicPercentage: number;
  } {
    const totalTurns = this.conversationHistory.length;
    const onTopicTurns = this.conversationHistory.filter(turn => turn.isOnTopic).length;
    const onTopicPercentage = totalTurns > 0 ? (onTopicTurns / totalTurns) * 100 : 100;

    return {
      totalTurns,
      offTopicCount: this.offTopicCount,
      onTopicPercentage: Math.round(onTopicPercentage * 100) / 100
    };
  }
}

export default ConversationSecurityService;

