import {
  Injectable,
  NotFoundException,
  Logger,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateTaskDto } from './dto/create-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';
import { Task, Message, Role, Prisma, TaskStatus } from '@prisma/client';
import { GuideTaskDto } from './dto/guide-task.dto';

@Injectable()
export class TasksService {
  private readonly logger = new Logger(TasksService.name);

  constructor(readonly prisma: PrismaService) {
    this.logger.log('TasksService initialized');
  }

  async create(createTaskDto: CreateTaskDto): Promise<Task> {
    this.logger.log(
      `Creating new task with description: ${createTaskDto.description}`,
    );

    const task = await this.prisma.$transaction(async (prisma) => {
      // Create the task first
      this.logger.debug('Creating task record in database');
      const task = await prisma.task.create({
        data: {
          description: createTaskDto.description,
        },
      });
      this.logger.log(`Task created successfully with ID: ${task.id}`);

      // Create the initial system message
      this.logger.debug(`Creating initial message for task ID: ${task.id}`);
      await prisma.message.create({
        data: {
          content: [
            {
              type: 'text',
              text: createTaskDto.description,
            },
          ] as Prisma.InputJsonValue,
          role: Role.USER,
          taskId: task.id,
        },
      });
      this.logger.debug(`Initial message created for task ID: ${task.id}`);

      return task;
    });

    return task;
  }

  async findNextTask(): Promise<Task | null> {
    const task = await this.prisma.task.findFirst({
      where: {
        status: {
          in: [
            'NEEDS_HELP',
            'RUNNING',
            'PENDING',
            // TODO: Add IN_PROGRESS once the agent can handle it
          ],
        },
      },
      orderBy: [
        { executedAt: 'asc' }, 
        { createdAt: 'asc' }
      ],
    });

    if (task) {
      this.logger.log(
        `Found existing task with ID: ${task.id}, and status ${task.status}. Resuming.`,
      );
    }

    return task;
  }

  async findAll(): Promise<Task[]> {
    this.logger.log('Retrieving all tasks');

    const tasks = await this.prisma.task.findMany({
      orderBy: {
        createdAt: 'desc',
      },
    });

    this.logger.debug(`Retrieved ${tasks.length} tasks`);

    return tasks;
  }

  async findById(id: string): Promise<Task & { messages: Message[] }> {
    this.logger.log(`Retrieving task by ID: ${id}`);

    try {
      const task = await this.prisma.task.findUnique({
        where: { id },
        include: {
          messages: {
            orderBy: {
              createdAt: 'asc',
            },
          },
        },
      });

      if (!task) {
        this.logger.warn(`Task with ID: ${id} not found`);
        throw new NotFoundException(`Task with ID ${id} not found`);
      }

      this.logger.debug(`Retrieved task with ID: ${id}`);
      return task;
    } catch (error: any) {
      this.logger.error(`Error retrieving task ID: ${id} - ${error.message}`);
      this.logger.error(error.stack);
      throw error;
    }
  }

  async update(id: string, updateTaskDto: UpdateTaskDto): Promise<Task> {
    this.logger.log(`Updating task with ID: ${id}`);
    this.logger.debug(`Update data: ${JSON.stringify(updateTaskDto)}`);

    const existingTask = await this.findById(id);

    if (!existingTask) {
      this.logger.warn(`Task with ID: ${id} not found for update`);
      throw new NotFoundException(`Task with ID ${id} not found`);
    }

    const updatedTask = await this.prisma.task.update({
      where: { id },
      data: updateTaskDto,
    });

    this.logger.log(`Successfully updated task ID: ${id}`);
    this.logger.debug(`Updated task: ${JSON.stringify(updatedTask)}`);

    return updatedTask;
  }

  async delete(id: string): Promise<Task> {
    this.logger.log(`Deleting task with ID: ${id}`);

    const deletedTask = await this.prisma.task.delete({
      where: { id },
    });

    this.logger.log(`Successfully deleted task ID: ${id}`);

    return deletedTask;
  }

  async guideTask(taskId: string, guideTaskDto: GuideTaskDto) {
    let task = await this.findById(taskId);
    if (!task) {
      this.logger.warn(`Task with ID: ${taskId} not found for guiding`);
      throw new NotFoundException(`Task with ID ${taskId} not found`);
    }

    if (task.status != TaskStatus.NEEDS_HELP) {
      this.logger.warn(
        `Task with ID: ${taskId} is not in NEEDS_HELP status for guiding`,
      );
      throw new BadRequestException(
        `Task with ID ${taskId} is not in NEEDS_HELP status for guiding`,
      );
    }

    await this.prisma.message.create({
      data: {
        content: [{ type: 'text', text: guideTaskDto.message }],
        role: Role.USER,
        taskId,
      },
    });

    await this.update(taskId, {
      status: TaskStatus.RUNNING,
    });

    return task;
  }
}
