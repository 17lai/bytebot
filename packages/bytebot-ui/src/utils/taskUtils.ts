import { Message, Task } from "@/types";

/**
 * Fetches messages for a specific task
 * @param taskId The ID of the task to fetch messages for
 * @returns Array of new messages
 */
export async function fetchTaskMessages(taskId: string): Promise<Message[]> {
  try {
    const response = await fetch(
      `/api/tasks/${taskId}/messages`,
      {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: 'include', // Include cookies for auth
      },
    );

    if (!response.ok) {
      throw new Error("Failed to fetch messages");
    }

    const messages = await response.json();
    return messages || [];
  } catch (error) {
    console.error("Error fetching messages:", error);
    return [];
  }
}

/**
 * Fetches a specific task by ID
 * @param taskId The ID of the task to fetch
 * @returns The task data or null if not found
 */
export async function fetchTaskById(taskId: string): Promise<Task | null> {
  try {
    const response = await fetch(
      `/api/tasks/${taskId}`,
      {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: 'include',
      },
    );

    if (!response.ok) {
      throw new Error(`Failed to fetch task with ID ${taskId}`);
    }

    return await response.json();
  } catch (error) {
    console.error(`Error fetching task ${taskId}:`, error);
    return null;
  }
}

/**
 * Sends a message to start a new task or continue an existing one
 * @param message The message content to send
 * @returns The task data or null if there was an error
 */

export async function startTask(message: string): Promise<Task | null> {
  try {
    const response = await fetch(
      `/api/tasks`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ description: message }),
        credentials: 'include',
      },
    );

    if (!response.ok) {
      throw new Error("Failed to start task");
    }

    return await response.json();
  } catch (error) {
    console.error("Error sending message:", error);
    return null;
  }
}

export async function guideTask(
  taskId: string,
  message: string,
): Promise<Task | null> {
  try {
    const response = await fetch(
      `/api/tasks/${taskId}/guide`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ message }),
        credentials: 'include',
      },
    );

    if (!response.ok) {
      throw new Error("Failed to guide task");
    }

    return await response.json();
  } catch (error) {
    console.error("Error guiding task:", error);
    return null;
  }
}

export async function fetchTasks(): Promise<Task[]> {
  try {
    const response = await fetch(
      `/api/tasks`,
      {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: 'include',
      },
    );

    if (!response.ok) {
      throw new Error("Failed to fetch tasks");
    }

    const tasks = await response.json();
    return tasks || [];
  } catch (error) {
    console.error("Error fetching tasks:", error);
    return [];
  }
}

export async function takeOverTask(taskId: string): Promise<Task | null> {
  try {
    const response = await fetch(
      `/api/tasks/${taskId}/takeover`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: 'include',
      },
    );

    if (!response.ok) {
      throw new Error("Failed to take over task");
    }

    return await response.json();
  } catch (error) {
    console.error("Error taking over task:", error);
    return null;
  }
}

export async function resumeTask(taskId: string): Promise<Task | null> {
  try {
    const response = await fetch(
      `/api/tasks/${taskId}/resume`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: 'include',
      },
    );

    if (!response.ok) {
      throw new Error("Failed to resume task");
    }

    return await response.json();
  } catch (error) {
    console.error("Error resuming task:", error);
    return null;
  }
}
