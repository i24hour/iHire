'use client';

import { useEffect, useState } from 'react';

interface ITimeTask {
  id: number;
  title: string;
  description: string;
  createdAt: number;
  elapsedSeconds: number;
  enabled: boolean;
}

export function ITimeTracker() {
  const [tasks, setTasks] = useState<ITimeTask[]>([]);
  const [taskTitle, setTaskTitle] = useState('');
  const [taskDescription, setTaskDescription] = useState('');

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const stored = window.localStorage.getItem('itime-tasks');
      if (stored) {
        const parsed = JSON.parse(stored) as ITimeTask[];
        if (Array.isArray(parsed)) {
          // eslint-disable-next-line react-hooks/set-state-in-effect
          setTasks(parsed);
        }
      }
    } catch (error) {
      console.warn('Failed to load iTime tasks:', error);
    }
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      setTasks((prev) =>
        prev.map((task) =>
          task.enabled
            ? { ...task, elapsedSeconds: task.elapsedSeconds + 1 }
            : task
        )
      );
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      window.localStorage.setItem('itime-tasks', JSON.stringify(tasks));
    } catch (error) {
      console.warn('Failed to save iTime tasks:', error);
    }
  }, [tasks]);

  const handleAddTask = () => {
    if (!taskTitle.trim()) return;

    const newTask: ITimeTask = {
      id: Date.now(),
      title: taskTitle.trim(),
      description: taskDescription.trim(),
      createdAt: Date.now(),
      elapsedSeconds: 0,
      enabled: true,
    };

    setTasks((prev) => [newTask, ...prev]);
    setTaskTitle('');
    setTaskDescription('');
  };

  const toggleTask = (taskId: number) => {
    setTasks((prev) =>
      prev.map((task) =>
        task.id === taskId
          ? { ...task, enabled: !task.enabled }
          : task
      )
    );
  };

  const formatElapsed = (seconds: number) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    const pad = (value: number) => value.toString().padStart(2, '0');
    return `${pad(hrs)}:${pad(mins)}:${pad(secs)}`;
  };

  return (
    <div className="bg-zinc-900/60 border border-zinc-800 rounded-2xl p-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-xl font-semibold text-white">iTime</h2>
          <p className="text-sm text-zinc-500">Add tasks and track time live.</p>
        </div>
        <span className="text-xs text-zinc-500">{tasks.length} tasks</span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <input
          type="text"
          placeholder="Task title"
          value={taskTitle}
          onChange={(event) => setTaskTitle(event.target.value)}
          className="px-4 py-3 bg-black border border-zinc-800 rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:ring-1 focus:ring-purple-500"
        />
        <input
          type="text"
          placeholder="Task description"
          value={taskDescription}
          onChange={(event) => setTaskDescription(event.target.value)}
          className="px-4 py-3 bg-black border border-zinc-800 rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:ring-1 focus:ring-purple-500"
        />
        <button
          onClick={handleAddTask}
          className="px-4 py-3 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition-colors disabled:opacity-50"
          disabled={!taskTitle.trim()}
        >
          Add Task
        </button>
      </div>

      <div className="space-y-3">
        {tasks.length === 0 ? (
          <div className="text-center text-zinc-500 py-6">No tasks yet. Add your first task above.</div>
        ) : (
          tasks.map((task) => (
            <div
              key={task.id}
              className="flex flex-col md:flex-row md:items-center gap-4 bg-black/40 border border-zinc-800 rounded-xl p-4"
            >
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <h3 className="text-white font-medium">{task.title}</h3>
                  <span
                    className={`text-xs px-2 py-0.5 rounded-full ${task.enabled
                      ? 'bg-emerald-500/20 text-emerald-400'
                      : 'bg-zinc-700/40 text-zinc-400'}`}
                  >
                    {task.enabled ? 'Running' : 'Disabled'}
                  </span>
                </div>
                <p className="text-sm text-zinc-500 mt-1">{task.description || 'No description provided.'}</p>
              </div>
              <div className="flex items-center gap-3">
                <div className="text-lg font-semibold text-white tabular-nums">
                  {formatElapsed(task.elapsedSeconds)}
                </div>
                <button
                  onClick={() => toggleTask(task.id)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium border ${task.enabled
                    ? 'border-red-500/50 text-red-400 hover:bg-red-500/10'
                    : 'border-emerald-500/50 text-emerald-400 hover:bg-emerald-500/10'}`}
                >
                  {task.enabled ? 'Disable' : 'Enable'}
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
