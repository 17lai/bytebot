import { Injectable, Logger } from '@nestjs/common';
import { io, Socket } from 'socket.io-client';
import { randomUUID } from 'crypto';
import {
  convertClickMouseActionToToolUseBlock,
  convertDragMouseActionToToolUseBlock,
  convertPressKeysActionToToolUseBlock,
  convertPressMouseActionToToolUseBlock,
  convertScrollActionToToolUseBlock,
  convertTypeKeysActionToToolUseBlock,
  convertTypeTextActionToToolUseBlock,
  MessageContentBlock,
  MessageContentType,
  ScreenshotToolUseBlock,
  ToolResultContentBlock,
} from '@bytebot/shared';
import { Role } from '@prisma/client';
import { MessagesService } from '../messages/messages.service';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class InputCaptureService {
  private readonly logger = new Logger(InputCaptureService.name);
  private socket: Socket | null = null;
  private capturing = false;

  constructor(
    private readonly messagesService: MessagesService,
    private readonly configService: ConfigService,
  ) {}

  isCapturing() {
    return this.capturing;
  }

  start(taskId: string) {
    if (this.socket?.connected && this.capturing) return;

    if (this.socket && !this.socket.connected) {
      this.socket.connect();
      return;
    }

    const baseUrl = this.configService.get<string>('BYTEBOT_DESKTOP_BASE_URL');
    if (!baseUrl) {
      this.logger.warn('BYTEBOT_DESKTOP_BASE_URL missing.');
      return;
    }

    this.socket = io(baseUrl, { transports: ['websocket'] });

    this.socket.on('connect', () => {
      this.logger.log('Input socket connected');
      this.capturing = true;
    });

    this.socket.on('screenshot', async (shot: { image: string }) => {
      if (!this.capturing || !taskId) return;
      const toolUseId = randomUUID();
      const screenshotBlock: ScreenshotToolUseBlock = {
        type: MessageContentType.ToolUse,
        name: 'computer_screenshot',
        id: toolUseId,
        input: {},
      };
      const toolResult: ToolResultContentBlock = {
        type: MessageContentType.ToolResult,
        tool_use_id: toolUseId,
        content: [
          {
            type: MessageContentType.Image,
            source: { data: shot.image, media_type: 'image/png', type: 'base64' },
          },
        ],
      };
      await this.messagesService.create({
        content: [screenshotBlock, toolResult],
        role: Role.USER,
        taskId,
      });
    });

    this.socket.on('input_action', async (action: any) => {
      if (!this.capturing || !taskId) return;
      const toolUseId = randomUUID();
      const blocks: MessageContentBlock[] = [];
      const toolResult: ToolResultContentBlock = {
        type: MessageContentType.ToolResult,
        tool_use_id: toolUseId,
        content: [
          {
            type: MessageContentType.Text,
            text: `Input action '${action.action}' processed.`,
          },
        ],
      };

      switch (action.action) {
        case 'drag_mouse':
          blocks.push(convertDragMouseActionToToolUseBlock(action, toolUseId), toolResult);
          break;
        case 'click_mouse':
          blocks.push(convertClickMouseActionToToolUseBlock(action, toolUseId), toolResult);
          break;
        case 'press_mouse':
          blocks.push(convertPressMouseActionToToolUseBlock(action, toolUseId), toolResult);
          break;
        case 'type_keys':
          blocks.push(convertTypeKeysActionToToolUseBlock(action, toolUseId), toolResult);
          break;
        case 'press_keys':
          blocks.push(convertPressKeysActionToToolUseBlock(action, toolUseId), toolResult);
          break;
        case 'type_text':
          blocks.push(convertTypeTextActionToToolUseBlock(action, toolUseId), toolResult);
          break;
        case 'scroll':
          blocks.push(convertScrollActionToToolUseBlock(action, toolUseId), toolResult);
          break;
        default:
          this.logger.warn(`Unknown action ${action.action}`);
      }

      if (blocks.length) {
        await this.messagesService.create({ content: blocks, role: Role.USER, taskId });
      }
    });

    this.socket.on('disconnect', () => {
      this.logger.log('Input socket disconnected');
      this.capturing = false;
    });
  }

  async stop() {
    if (!this.socket) return;
    if (this.socket.connected) this.socket.disconnect();
    else this.socket.removeAllListeners();
    this.socket = null;
    this.capturing = false;
  }
}
