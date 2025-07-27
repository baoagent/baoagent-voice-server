import ConversationSecurityService from '../../src/services/conversation-security';

describe('ConversationSecurityService', () => {
  let service: ConversationSecurityService;

  beforeEach(() => {
    service = new ConversationSecurityService();
  });

  describe('isMovingRelated', () => {
    it('should return true for moving-related content', () => {
      expect(service.isMovingRelated('I need help with moving my furniture')).toBe(true);
      expect(service.isMovingRelated('Can I schedule an appointment?')).toBe(true);
      expect(service.isMovingRelated('What time are you available?')).toBe(true);
      expect(service.isMovingRelated('Hello, I need a quote for packing')).toBe(true);
    });

    it('should return false for non-moving-related content', () => {
      expect(service.isMovingRelated('What is the weather like today?')).toBe(false);
      expect(service.isMovingRelated('Tell me about your favorite movies')).toBe(false);
      expect(service.isMovingRelated('How do I cook pasta?')).toBe(false);
    });

    it('should return true for greetings', () => {
      expect(service.isMovingRelated('Hello')).toBe(true);
      expect(service.isMovingRelated('Good morning')).toBe(true);
      expect(service.isMovingRelated('Thank you')).toBe(true);
    });
  });

  describe('recordConversationTurn', () => {
    it('should not warn on first on-topic conversation', () => {
      const result = service.recordConversationTurn('I need help moving');
      expect(result.isOnTopic).toBe(true);
      expect(result.shouldWarn).toBe(false);
      expect(result.shouldTerminate).toBe(false);
    });

    it('should warn after first off-topic conversation', () => {
      const result = service.recordConversationTurn('What is the weather?');
      expect(result.isOnTopic).toBe(false);
      expect(result.shouldWarn).toBe(true);
      expect(result.shouldTerminate).toBe(false);
      expect(result.warningMessage).toContain('moving and scheduling services');
    });

    it('should escalate warnings with multiple off-topic attempts', () => {
      // First off-topic
      let result = service.recordConversationTurn('What is the weather?');
      expect(result.shouldWarn).toBe(true);
      expect(result.shouldTerminate).toBe(false);

      // Second off-topic
      result = service.recordConversationTurn('Tell me about movies');
      expect(result.shouldWarn).toBe(true);
      expect(result.shouldTerminate).toBe(false);
      expect(result.warningMessage).toContain('getting off track');

      // Third off-topic - should terminate
      result = service.recordConversationTurn('How do I cook?');
      expect(result.shouldWarn).toBe(false);
      expect(result.shouldTerminate).toBe(true);
    });

    it('should reset properly', () => {
      // Generate off-topic conversations
      service.recordConversationTurn('What is the weather?');
      service.recordConversationTurn('Tell me about movies');
      
      // Reset
      service.reset();
      
      // Should start fresh
      const result = service.recordConversationTurn('What is the weather?');
      expect(result.shouldWarn).toBe(true);
      expect(result.shouldTerminate).toBe(false);
    });
  });

  describe('getStats', () => {
    it('should return correct statistics', () => {
      service.recordConversationTurn('I need help moving'); // on-topic
      service.recordConversationTurn('What is the weather?'); // off-topic
      service.recordConversationTurn('Can I schedule an appointment?'); // on-topic

      const stats = service.getStats();
      expect(stats.totalTurns).toBe(3);
      expect(stats.offTopicCount).toBe(1);
      expect(stats.onTopicPercentage).toBe(66.67);
    });

    it('should handle empty conversation', () => {
      const stats = service.getStats();
      expect(stats.totalTurns).toBe(0);
      expect(stats.offTopicCount).toBe(0);
      expect(stats.onTopicPercentage).toBe(100);
    });
  });
});

