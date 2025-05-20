"use client";

import React, { useEffect, useRef, useState } from "react";
import { Header } from "@/components/layout/Header";
import { VncViewer } from "@/components/vnc/VncViewer";
import { ChatContainer } from "@/components/messages/ChatContainer";
import { ChatInput } from "@/components/messages/ChatInput";
import { useChatSession } from "@/hooks/useChatSession";
import { useParams, useRouter } from "next/navigation";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { TaskStatus } from "@/types";

export default function TaskPage() {
  const params = useParams();
  const router = useRouter();
  const taskId = params.id as string;

  const containerRef = useRef<HTMLDivElement>(null);
  const [containerSize, setContainerSize] = useState({ width: 0, height: 0 });
  const {
    messages,
    taskStatus,
    input,
    setInput,
    isLoading,
    isLoadingSession,
    handleGuideTask,
    currentTaskId,
  } = useChatSession({ initialTaskId: taskId });

  const [isMounted, setIsMounted] = useState(false);

  // Set isMounted to true after component mounts
  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Redirect if task ID doesn't match current task
  useEffect(() => {
    if (currentTaskId && currentTaskId !== taskId) {
      router.push(`/tasks/${currentTaskId}`);
    }
  }, [currentTaskId, taskId, router]);

  // Calculate the container size on mount and window resize
  useEffect(() => {
    if (!isMounted) return;

    const updateSize = () => {
      if (!containerRef.current) return;

      const parentWidth =
        containerRef.current.parentElement?.offsetWidth ||
        containerRef.current.offsetWidth;
      const parentHeight =
        containerRef.current.parentElement?.offsetHeight ||
        containerRef.current.offsetHeight;

      // Calculate the maximum size while maintaining 1280:960 aspect ratio
      let width, height;
      const aspectRatio = 1280 / 960;

      if (parentWidth / parentHeight > aspectRatio) {
        // Width is the limiting factor
        height = parentHeight;
        width = height * aspectRatio;
      } else {
        // Height is the limiting factor
        width = parentWidth;
        height = width / aspectRatio;
      }

      // Cap at maximum dimensions
      width = Math.min(width, 1280);
      height = Math.min(height, 960);

      setContainerSize({ width, height });
    };

    updateSize();
    window.addEventListener("resize", updateSize);
    return () => window.removeEventListener("resize", updateSize);
  }, [isMounted]);

  return (
    <div className="flex h-screen flex-col overflow-hidden">
      <Header />

      <main className="m-2 flex-1 overflow-hidden px-2 py-4">
        <div className="grid h-full grid-cols-7 gap-4">
          {/* Main container */}
          <div className="col-span-4">
            <div className="border-bytebot-bronze-light-5 shadow-bytebot flex aspect-[4/3] w-full flex-col rounded-2xl border">
              <div
                ref={containerRef}
                className="overflow-hidden rounded-[14px]"
              >
                <div
                  style={{
                    width: `${containerSize.width}px`,
                    height: `${containerSize.height}px`,
                    maxWidth: "100%",
                  }}
                >
                  <VncViewer />
                </div>
              </div>
            </div>
          </div>

          {/* Chat Area */}
          <div className="col-span-3 flex h-full flex-col overflow-hidden">
            {/* Messages scrollable area */}
            <div className="flex-1 overflow-y-auto px-4 pt-4 pb-2">
              <ChatContainer
                taskStatus={taskStatus}
                messages={messages}
                isLoadingSession={isLoadingSession}
              />
            </div>
            {/* Fixed chat input */}

            {taskStatus === TaskStatus.NEEDS_HELP && (
              <div className="bg-bytebot-bronze-light-2 border-bytebot-bronze-light-5 shadow-bytebot rounded-2xl border-[0.5px] p-2">
                <ChatInput
                  input={input}
                  isLoading={isLoading}
                  onInputChange={setInput}
                  onSend={handleGuideTask}
                  minLines={1}
                />
                <div className="mt-2">
                  <Select value="sonnet-3.7">
                    <SelectTrigger className="w-auto">
                      <SelectValue placeholder="Select an model" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="sonnet-3.7">Sonnet 3.7</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
