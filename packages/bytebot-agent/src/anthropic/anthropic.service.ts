import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Anthropic from '@anthropic-ai/sdk';
import {
  MessageContentBlock,
  MessageContentType,
  TextContentBlock,
  ToolUseContentBlock,
} from '../../../shared/types/messageContent.types';
import { DEFAULT_DISPLAY_SIZE } from '../../../shared/constants';
import { AGENT_SYSTEM_PROMPT, DEFAULT_MODEL } from '../common/constants';
import { Message, MessageRole } from '@prisma/client';

@Injectable()
export class AnthropicService {
  private readonly anthropic: Anthropic;
  private readonly logger = new Logger(AnthropicService.name);

  constructor(private readonly configService: ConfigService) {
    const apiKey = this.configService.get<string>('ANTHROPIC_API_KEY');

    if (!apiKey) {
      this.logger.warn(
        'ANTHROPIC_API_KEY is not set. AnthropicService will not work properly.',
      );
    }

    this.anthropic = new Anthropic({
      apiKey: apiKey || 'dummy-key-for-initialization',
    });
  }

  /**
   * Sends a message to Anthropic Claude and returns the response
   *
   * @param messages Array of message content blocks representing the conversation
   * @param options Additional options for the API call
   * @returns The AI response as an array of message content blocks
   */
  async sendMessage(messages: Message[]): Promise<MessageContentBlock[]> {
    try {
      const model = DEFAULT_MODEL;
      const maxTokens = 8192;
      const system = AGENT_SYSTEM_PROMPT;

      // Convert our message content blocks to Anthropic's expected format
      const anthropicMessages = this.formatMessagesForAnthropic(messages);

      // Make the API call
      const response = await this.anthropic.beta.messages.create({
        model,
        max_tokens: maxTokens,
        system,
        messages: anthropicMessages,
        tools: [
          {
            type: 'computer_20250124',
            name: 'computer',
            display_width_px: DEFAULT_DISPLAY_SIZE.width,
            display_height_px: DEFAULT_DISPLAY_SIZE.height,
            display_number: 1,
          },
        ],
        betas: ['computer-use-2025-01-24'],
      });

      // Convert Anthropic's response to our message content blocks format
      return this.formatAnthropicResponse(response.content);
    } catch (error) {
      this.logger.error(
        `Error sending message to Anthropic: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * Convert our MessageContentBlock format to Anthropic's message format
   */
  private formatMessagesForAnthropic(
    messages: Message[],
  ): Anthropic.MessageParam[] {
    const anthropicMessages: Anthropic.MessageParam[] = [];

    // Process each message content block
    for (const message of messages) {
      const content: Anthropic.ContentBlockParam[] =
        message.content as unknown as Anthropic.ContentBlockParam[];

      anthropicMessages.push({
        role: message.role === MessageRole.USER ? 'user' : 'assistant',
        content: content,
      });
    }

    return anthropicMessages;
  }

  /**
   * Convert Anthropic's response content to our MessageContentBlock format
   */
  private formatAnthropicResponse(
    content: Anthropic.ContentBlock[],
  ): MessageContentBlock[] {
    return content.map((block) => {
      switch (block.type) {
        case 'text':
          return {
            type: MessageContentType.Text,
            text: block.text,
          } as TextContentBlock;

        case 'tool_use':
          return {
            type: MessageContentType.ToolUse,
            tool_name: block.name,
            id: block.id,
            input: block.input as Record<string, unknown>,
          } as ToolUseContentBlock;

        default:
          this.logger.warn(
            `Unknown content block type from Anthropic: ${block.type}`,
          );
          return {
            type: MessageContentType.Text,
            text: JSON.stringify(block),
          } as TextContentBlock;
      }
    });
  }
}
