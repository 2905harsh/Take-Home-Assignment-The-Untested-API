const request = require('supertest');
const app = require('../src/app');
const taskService = require('../src/services/taskService');

// wipe the store before every test so nothing leaks between them
beforeEach(() => {
  taskService._reset();
});

// helper so we don't repeat the same POST boilerplate everywhere
const createTask = (overrides = {}) =>
  request(app).post('/tasks').send({ title: 'Test task', ...overrides });



// taskService unit tests
// these test the service functions directly, not via HTTP

describe('taskService.create()', () => {
  it('returns a task with the correct default shape', () => {
    const task = taskService.create({ title: 'Buy milk' });
    expect(task).toMatchObject({
      title: 'Buy milk',
      description: '',
      status: 'todo',
      priority: 'medium',
      dueDate: null,
      assignee: null,
      completedAt: null,
    });
    expect(typeof task.id).toBe('string');
    expect(typeof task.createdAt).toBe('string');
  });

  it('saves the task so it shows up in getAll()', () => {
    taskService.create({ title: 'Persist me' });
    expect(taskService.getAll()).toHaveLength(1);
  });

  it('respects custom values passed in', () => {
    const task = taskService.create({
      title: 'Custom',
      status: 'in_progress',
      priority: 'high',
      description: 'some work',
      dueDate: '2025-12-31T00:00:00.000Z',
    });
    expect(task.status).toBe('in_progress');
    expect(task.priority).toBe('high');
    expect(task.description).toBe('some work');
  });

  it('gives each task a unique id', () => {
    const a = taskService.create({ title: 'A' });
    const b = taskService.create({ title: 'B' });
    expect(a.id).not.toBe(b.id);
  });
});


describe('taskService.getAll()', () => {
  it('returns empty array when store is empty', () => {
    expect(taskService.getAll()).toEqual([]);
  });

  it('returns all tasks that have been created', () => {
    taskService.create({ title: 'A' });
    taskService.create({ title: 'B' });
    expect(taskService.getAll()).toHaveLength(2);
  });

  it('returns a copy — mutating it does not affect the store', () => {
    taskService.create({ title: 'Safe' });
    const tasks = taskService.getAll();
    tasks.pop();
    expect(taskService.getAll()).toHaveLength(1);
  });
});


describe('taskService.getByStatus()', () => {
  it('returns only tasks that match the exact status', () => {
    taskService.create({ title: 'Todo task', status: 'todo' });
    taskService.create({ title: 'Done task', status: 'done' });

    const result = taskService.getByStatus('todo');
    expect(result).toHaveLength(1);
    expect(result[0].title).toBe('Todo task');
  });

  it('does not match partial strings — "do" should not return todo or done tasks', () => {
    // this test catches Bug #1
    // original code used .includes() so "do" matched both "todo" and "done"
    taskService.create({ title: 'Todo task', status: 'todo' });
    taskService.create({ title: 'Done task', status: 'done' });
    expect(taskService.getByStatus('do')).toHaveLength(0);
  });

  it('returns empty array when no tasks match', () => {
    taskService.create({ title: 'A', status: 'todo' });
    expect(taskService.getByStatus('done')).toHaveLength(0);
  });

  it('returns multiple tasks when more than one match', () => {
    taskService.create({ title: 'A', status: 'todo' });
    taskService.create({ title: 'B', status: 'todo' });
    taskService.create({ title: 'C', status: 'done' });
    expect(taskService.getByStatus('todo')).toHaveLength(2);
  });
});


describe('taskService.getPaginated()', () => {
  beforeEach(() => {
    for (let i = 1; i <= 5; i++) {
      taskService.create({ title: `Task ${i}` });
    }
  });

  it('page 1 returns the first set of results', () => {
    // this test catches Bug #2
    // original code was page * limit so page=1 skipped the first 3 tasks
    const result = taskService.getPaginated(1, 3);
    expect(result).toHaveLength(3);
    expect(result[0].title).toBe('Task 1');
    expect(result[2].title).toBe('Task 3');
  });

  it('page 2 returns the next set', () => {
    const result = taskService.getPaginated(2, 3);
    expect(result).toHaveLength(2);
    expect(result[0].title).toBe('Task 4');
    expect(result[1].title).toBe('Task 5');
  });

  it('returns empty array for a page beyond total tasks', () => {
    expect(taskService.getPaginated(10, 10)).toHaveLength(0);
  });
});


describe('taskService.getStats()', () => {
  it('returns all zeros when no tasks exist', () => {
    expect(taskService.getStats()).toEqual({
      todo: 0,
      in_progress: 0,
      done: 0,
      overdue: 0,
    });
  });

  it('counts each status correctly', () => {
    taskService.create({ title: 'A', status: 'todo' });
    taskService.create({ title: 'B', status: 'todo' });
    taskService.create({ title: 'C', status: 'done' });
    const stats = taskService.getStats();
    expect(stats.todo).toBe(2);
    expect(stats.done).toBe(1);
    expect(stats.in_progress).toBe(0);
  });

  it('counts non-done past-due tasks as overdue', () => {
    taskService.create({ title: 'Overdue', status: 'todo', dueDate: '2000-01-01T00:00:00.000Z' });
    taskService.create({ title: 'Future', status: 'todo', dueDate: '2099-01-01T00:00:00.000Z' });
    // done tasks should not count as overdue even if past due
    taskService.create({ title: 'Done old', status: 'done', dueDate: '2000-01-01T00:00:00.000Z' });
    expect(taskService.getStats().overdue).toBe(1);
  });

  it('tasks with no dueDate are never counted as overdue', () => {
    taskService.create({ title: 'No date' });
    expect(taskService.getStats().overdue).toBe(0);
  });
});


describe('taskService.update()', () => {
  it('updates fields and returns the updated task', () => {
    const task = taskService.create({ title: 'Original' });
    const updated = taskService.update(task.id, { title: 'Updated', priority: 'high' });
    expect(updated.title).toBe('Updated');
    expect(updated.priority).toBe('high');
  });

  it('returns null for unknown id', () => {
    expect(taskService.update('bad-id', { title: 'x' })).toBeNull();
  });

  it('does not wipe fields that were not included in the update', () => {
    const task = taskService.create({ title: 'Keep desc', description: 'important' });
    taskService.update(task.id, { title: 'New title' });
    expect(taskService.findById(task.id).description).toBe('important');
  });
});


describe('taskService.remove()', () => {
  it('removes the task and returns true', () => {
    const task = taskService.create({ title: 'Delete me' });
    expect(taskService.remove(task.id)).toBe(true);
    expect(taskService.findById(task.id)).toBeUndefined();
  });

  it('returns false for unknown id', () => {
    expect(taskService.remove('does-not-exist')).toBe(false);
  });
});


describe('taskService.completeTask()', () => {
  it('sets status to done and records completedAt', () => {
    const task = taskService.create({ title: 'Finish me' });
    const done = taskService.completeTask(task.id);
    expect(done.status).toBe('done');
    expect(typeof done.completedAt).toBe('string');
  });

  it('returns null for unknown id', () => {
    expect(taskService.completeTask('nope')).toBeNull();
  });

  it('does not change priority when completing a task', () => {
    // this test catches Bug #3
    // original had priority: 'medium' hardcoded so high priority tasks got silently downgraded
    const task = taskService.create({ title: 'Urgent', priority: 'high' });
    const done = taskService.completeTask(task.id);
    expect(done.priority).toBe('high');
  });

  it('low priority tasks also keep their priority after completion', () => {
    const task = taskService.create({ title: 'Low pri', priority: 'low' });
    const done = taskService.completeTask(task.id);
    expect(done.priority).toBe('low');
  });
});


describe('taskService.assignTask()', () => {
  it('assigns a user to a task', () => {
    const task = taskService.create({ title: 'Assign me' });
    const updated = taskService.assignTask(task.id, 'Alice');
    expect(updated.assignee).toBe('Alice');
  });

  it('returns null for unknown id', () => {
    expect(taskService.assignTask('fake-id', 'Alice')).toBeNull();
  });

  it('can reassign to a different person', () => {
    const task = taskService.create({ title: 'Task' });
    taskService.assignTask(task.id, 'Alice');
    const updated = taskService.assignTask(task.id, 'Bob');
    expect(updated.assignee).toBe('Bob');
  });

  it('can unassign by passing null', () => {
    const task = taskService.create({ title: 'Task' });
    taskService.assignTask(task.id, 'Alice');
    const updated = taskService.assignTask(task.id, null);
    expect(updated.assignee).toBeNull();
  });
});


// ─────────────────────────────────────────────────────────
// API route integration tests
// these test the full HTTP layer end to end
// ─────────────────────────────────────────────────────────

describe('GET /tasks', () => {
  it('returns 200 and empty array when nothing exists', async () => {
    const res = await request(app).get('/tasks');
    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });

  it('returns all tasks', async () => {
    await createTask({ title: 'A' });
    await createTask({ title: 'B' });
    const res = await request(app).get('/tasks');
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(2);
  });

  it('filters by status', async () => {
    await createTask({ title: 'Todo', status: 'todo' });
    await createTask({ title: 'Done', status: 'done' });
    const res = await request(app).get('/tasks?status=todo');
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
    expect(res.body[0].status).toBe('todo');
  });

  it('partial status filter returns nothing — not a substring match', async () => {
    await createTask({ title: 'Todo', status: 'todo' });
    await createTask({ title: 'Done', status: 'done' });
    const res = await request(app).get('/tasks?status=do');
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(0);
  });

  it('page 1 returns the first batch correctly', async () => {
    for (let i = 1; i <= 5; i++) await createTask({ title: `Task ${i}` });
    const res = await request(app).get('/tasks?page=1&limit=3');
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(3);
    expect(res.body[0].title).toBe('Task 1');
  });

  it('page 2 returns the next batch', async () => {
    for (let i = 1; i <= 5; i++) await createTask({ title: `Task ${i}` });
    const res = await request(app).get('/tasks?page=2&limit=3');
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(2);
    expect(res.body[0].title).toBe('Task 4');
  });
});


describe('GET /tasks/stats', () => {
  it('returns zeroed counts when empty', async () => {
    const res = await request(app).get('/tasks/stats');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ todo: 0, in_progress: 0, done: 0, overdue: 0 });
  });

  it('counts tasks by status correctly', async () => {
    await createTask({ title: 'A', status: 'todo' });
    await createTask({ title: 'B', status: 'done' });
    const res = await request(app).get('/tasks/stats');
    expect(res.body.todo).toBe(1);
    expect(res.body.done).toBe(1);
  });

  it('includes overdue tasks in the count', async () => {
    await createTask({ title: 'Old task', dueDate: '2000-01-01T00:00:00.000Z' });
    const res = await request(app).get('/tasks/stats');
    expect(res.body.overdue).toBe(1);
  });
});


describe('POST /tasks', () => {
  it('creates a task and returns 201', async () => {
    const res = await createTask({ title: 'New task' });
    expect(res.status).toBe(201);
    expect(res.body.title).toBe('New task');
    expect(typeof res.body.id).toBe('string');
  });

  it('new tasks have assignee set to null by default', async () => {
    const res = await createTask();
    expect(res.body.assignee).toBeNull();
  });

  it('applies default values for status and priority', async () => {
    const res = await createTask();
    expect(res.body.status).toBe('todo');
    expect(res.body.priority).toBe('medium');
    expect(res.body.completedAt).toBeNull();
  });

  it('returns 400 when title is missing', async () => {
    const res = await request(app).post('/tasks').send({ priority: 'high' });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/title is required/);
  });

  it('returns 400 when title is an empty string', async () => {
    const res = await createTask({ title: '   ' });
    expect(res.status).toBe(400);
  });

  it('returns 400 for an invalid status', async () => {
    const res = await createTask({ title: 'Bad', status: 'flying' });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/status must be one of/);
  });

  it('returns 400 for an invalid priority', async () => {
    const res = await createTask({ title: 'Bad', priority: 'urgent' });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/priority must be one of/);
  });

  it('returns 400 for an invalid dueDate', async () => {
    const res = await createTask({ title: 'Bad', dueDate: 'not-a-date' });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/dueDate must be/);
  });
});


describe('PUT /tasks/:id', () => {
  it('updates a task and returns the new version', async () => {
    const { body: task } = await createTask({ title: 'Old title' });
    const res = await request(app)
      .put(`/tasks/${task.id}`)
      .send({ title: 'New title', priority: 'high' });
    expect(res.status).toBe(200);
    expect(res.body.title).toBe('New title');
    expect(res.body.priority).toBe('high');
  });

  it('returns 404 for an id that does not exist', async () => {
    const res = await request(app).put('/tasks/fake-id').send({ title: 'x' });
    expect(res.status).toBe(404);
  });

  it('returns 400 when title is set to an empty string', async () => {
    const { body: task } = await createTask();
    const res = await request(app).put(`/tasks/${task.id}`).send({ title: '' });
    expect(res.status).toBe(400);
  });

  it('returns 400 for invalid status', async () => {
    const { body: task } = await createTask();
    const res = await request(app).put(`/tasks/${task.id}`).send({ status: 'broken' });
    expect(res.status).toBe(400);
  });

  it('returns 400 for invalid priority', async () => {
    const { body: task } = await createTask();
    const res = await request(app).put(`/tasks/${task.id}`).send({ priority: 'asap' });
    expect(res.status).toBe(400);
  });

  it('does not wipe fields not included in the update', async () => {
    const { body: task } = await createTask({ title: 'Keep desc', priority: 'high' });
    await request(app).put(`/tasks/${task.id}`).send({ title: 'New title' });
    const { body: tasks } = await request(app).get('/tasks');
    const updated = tasks.find((t) => t.id === task.id);
    expect(updated.priority).toBe('high');
  });
});


describe('DELETE /tasks/:id', () => {
  it('deletes the task and returns 204', async () => {
    const { body: task } = await createTask();
    const res = await request(app).delete(`/tasks/${task.id}`);
    expect(res.status).toBe(204);
  });

  it('returns 404 for unknown id', async () => {
    const res = await request(app).delete('/tasks/ghost-id');
    expect(res.status).toBe(404);
  });

  it('deleted task no longer appears in GET /tasks', async () => {
    const { body: task } = await createTask();
    await request(app).delete(`/tasks/${task.id}`);
    const { body: tasks } = await request(app).get('/tasks');
    expect(tasks.find((t) => t.id === task.id)).toBeUndefined();
  });
});


describe('PATCH /tasks/:id/complete', () => {
  it('marks a task as done and stamps completedAt', async () => {
    const { body: task } = await createTask();
    const res = await request(app).patch(`/tasks/${task.id}/complete`);
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('done');
    expect(res.body.completedAt).not.toBeNull();
  });

  it('returns 404 for unknown id', async () => {
    const res = await request(app).patch('/tasks/unknown/complete');
    expect(res.status).toBe(404);
  });

  it('does not change the priority when completing a task', async () => {
    const { body: task } = await createTask({ title: 'Urgent', priority: 'high' });
    const res = await request(app).patch(`/tasks/${task.id}/complete`);
    expect(res.body.priority).toBe('high');
  });

  it('completing an already completed task still returns 200', async () => {
    const { body: task } = await createTask();
    await request(app).patch(`/tasks/${task.id}/complete`);
    const res = await request(app).patch(`/tasks/${task.id}/complete`);
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('done');
  });
});


describe('PATCH /tasks/:id/assign', () => {
  it('assigns a task to a person and returns 200', async () => {
    const { body: task } = await createTask();
    const res = await request(app)
      .patch(`/tasks/${task.id}/assign`)
      .send({ assignee: 'Alice' });
    expect(res.status).toBe(200);
    expect(res.body.assignee).toBe('Alice');
  });

  it('returns 404 for unknown task id', async () => {
    const res = await request(app)
      .patch('/tasks/fake-id/assign')
      .send({ assignee: 'Bob' });
    expect(res.status).toBe(404);
  });

  it('returns 400 when assignee field is missing entirely', async () => {
    const { body: task } = await createTask();
    const res = await request(app)
      .patch(`/tasks/${task.id}/assign`)
      .send({});
    expect(res.status).toBe(400);
  });

  it('returns 400 when assignee is an empty string', async () => {
    const { body: task } = await createTask();
    const res = await request(app)
      .patch(`/tasks/${task.id}/assign`)
      .send({ assignee: '   ' });
    expect(res.status).toBe(400);
  });

  it('returns 400 when assignee is a number', async () => {
    const { body: task } = await createTask();
    const res = await request(app)
      .patch(`/tasks/${task.id}/assign`)
      .send({ assignee: 42 });
    expect(res.status).toBe(400);
  });

  it('can reassign a task to a different person', async () => {
    const { body: task } = await createTask();
    await request(app).patch(`/tasks/${task.id}/assign`).send({ assignee: 'Alice' });
    const res = await request(app)
      .patch(`/tasks/${task.id}/assign`)
      .send({ assignee: 'Bob' });
    expect(res.status).toBe(200);
    expect(res.body.assignee).toBe('Bob');
  });

  it('can unassign a task by passing null', async () => {
    const { body: task } = await createTask();
    await request(app).patch(`/tasks/${task.id}/assign`).send({ assignee: 'Alice' });
    const res = await request(app)
      .patch(`/tasks/${task.id}/assign`)
      .send({ assignee: null });
    expect(res.status).toBe(200);
    expect(res.body.assignee).toBeNull();
  });

  it('trims whitespace from the assignee name before saving', async () => {
    const { body: task } = await createTask();
    const res = await request(app)
      .patch(`/tasks/${task.id}/assign`)
      .send({ assignee: '  Alice  ' });
    expect(res.status).toBe(200);
    expect(res.body.assignee).toBe('Alice');
  });
});