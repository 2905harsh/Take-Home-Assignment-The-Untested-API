const taskService = require('../src/services/taskService');

describe('taskService', () => {
  beforeEach(() => {
    taskService._reset();
  });

  it('should create a task', () => {
    const task = taskService.create({ title: 'Test Task' });
    expect(task).toBeDefined();
    expect(task.title).toBe('Test Task');
    expect(task.id).toBeDefined();
    expect(task.status).toBe('todo');
  });

  it('should list tasks', () => {
    taskService.create({ title: 'Task 1' });
    taskService.create({ title: 'Task 2' });
    expect(taskService.getAll().length).toBe(2);
  });

  it('should find by id', () => {
    const task = taskService.create({ title: 'Test Task' });
    const found = taskService.findById(task.id);
    expect(found.id).toBe(task.id);
  });

  it('should return undefined for unexisting user on findById', () => {
    expect(taskService.findById('invalid-id')).toBeUndefined();
  });

  it('should filter by status', () => {
    taskService.create({ title: 'Task 1', status: 'todo' });
    taskService.create({ title: 'Task 2', status: 'done' });
    expect(taskService.getByStatus('todo').length).toBe(1);
    expect(taskService.getByStatus('todo')[0].title).toBe('Task 1');
  });

  it('should paginate correctly', () => {
    taskService.create({ title: 'Task 1' });
    taskService.create({ title: 'Task 2' });
    taskService.create({ title: 'Task 3' });
    const page1 = taskService.getPaginated(1, 2);
    expect(page1.length).toBe(2);
    const page2 = taskService.getPaginated(2, 2);
    expect(page2.length).toBe(1);
    expect(page2[0].title).toBe('Task 3');
  });

  it('should return stats', () => {
    taskService.create({ title: 'Task 1', status: 'todo' });
    const pastDate = new Date();
    pastDate.setDate(pastDate.getDate() - 1);
    taskService.create({ title: 'Task 2', status: 'in_progress', dueDate: pastDate.toISOString() });
    
    // Test the branch where overdue is not hit due to future date
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 1);
    taskService.create({ title: 'Task 3', status: 'in_progress', dueDate: futureDate.toISOString() });

    const stats = taskService.getStats();
    expect(stats.todo).toBe(1);
    expect(stats.in_progress).toBe(2);
    expect(stats.done).toBe(0);
    expect(stats.overdue).toBe(1);
  });

  it('should update a task', () => {
    const task = taskService.create({ title: 'Task 1' });
    const updated = taskService.update(task.id, { title: 'Updated Task' });
    expect(updated.title).toBe('Updated Task');
    expect(taskService.findById(task.id).title).toBe('Updated Task');
  });

  it('should handle non-existent update', () => {
    expect(taskService.update('invalid-id', { title: 'No' })).toBeNull();
  });

  it('should complete task', () => {
    const task = taskService.create({ title: 'Task 1' });
    const completed = taskService.completeTask(task.id);
    expect(completed.status).toBe('done');
    expect(completed.completedAt).toBeDefined();
  });

  it('should handle non-existent completeTask', () => {
    expect(taskService.completeTask('invalid-id')).toBeNull();
  });

  it('should remove a task', () => {
    const task = taskService.create({ title: 'Task 1' });
    const removed = taskService.remove(task.id);
    expect(removed).toBe(true);
    expect(taskService.getAll().length).toBe(0);
  });

  it('should handle remove non-existent', () => {
    expect(taskService.remove('invalid-id')).toBe(false);
  });

  it('should assign a task', () => {
    const task = taskService.create({ title: 'Task 1' });
    const assigned = taskService.assignTask(task.id, 'John Doe');
    expect(assigned.assignee).toBe('John Doe');
  });

  it('should handle assigning non-existent task', () => {
    expect(taskService.assignTask('invalid-id', 'John Doe')).toBeNull();
  });
});
