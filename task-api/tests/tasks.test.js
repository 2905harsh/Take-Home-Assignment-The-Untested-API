const request = require('supertest');
const app = require('../src/app');
const taskService = require('../src/services/taskService');

describe('Tasks API', () => {
  beforeEach(() => {
    taskService._reset();
  });

  it('POST /tasks should create task', async () => {
    const res = await request(app)
      .post('/tasks')
      .send({ title: 'API Task', priority: 'high' });
    expect(res.status).toBe(201);
    expect(res.body.title).toBe('API Task');
    expect(res.body.priority).toBe('high');
  });

  it('POST /tasks should validate missing title', async () => {
    const res = await request(app)
      .post('/tasks')
      .send({});
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/title is required/);
  });
  
  it('POST /tasks should validate status', async () => {
    const res = await request(app)
      .post('/tasks')
      .send({ title: 'New', status: 'invalid' });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/status must be one of/);
  });

  it('POST /tasks should validate priority', async () => {
    const res = await request(app)
      .post('/tasks')
      .send({ title: 'New', priority: 'invalid' });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/priority must be one of/);
  });

  it('POST /tasks should validate dueDate', async () => {
    const res = await request(app)
      .post('/tasks')
      .send({ title: 'New', dueDate: 'invalid-date' });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/dueDate must be/);
  });

  it('GET /tasks should return tasks', async () => {
    taskService.create({ title: 'Task 1' });
    const res = await request(app).get('/tasks');
    expect(res.status).toBe(200);
    expect(res.body.length).toBe(1);
  });

  it('GET /tasks?status=todo should filter', async () => {
    taskService.create({ title: 'Task 1', status: 'todo' });
    const res = await request(app).get('/tasks?status=todo');
    expect(res.status).toBe(200);
    expect(res.body.length).toBe(1);
  });

  it('GET /tasks?page=1&limit=10 should paginate', async () => {
    taskService.create({ title: 'Task 1' });
    const res = await request(app).get('/tasks?page=1&limit=10');
    expect(res.status).toBe(200);
    expect(res.body.length).toBe(1);
  });

  it('GET /tasks/stats should get stats', async () => {
    const res = await request(app).get('/tasks/stats');
    expect(res.status).toBe(200);
    expect(res.body.todo).toBeDefined();
  });

  it('PUT /tasks/:id should update', async () => {
    const task = taskService.create({ title: 'Task 1' });
    const res = await request(app)
      .put(`/tasks/${task.id}`)
      .send({ title: 'Updated' });
    expect(res.status).toBe(200);
    expect(res.body.title).toBe('Updated');
  });

  it('PUT /tasks/:id validate update title empty', async () => {
    const task = taskService.create({ title: 'Task 1' });
    const res = await request(app)
      .put(`/tasks/${task.id}`)
      .send({ title: '' });
    expect(res.status).toBe(400);
  });

  it('PUT /tasks/:id validate update priority invalid', async () => {
    const task = taskService.create({ title: 'Task 1' });
    const res = await request(app)
      .put(`/tasks/${task.id}`)
      .send({ priority: 'invalid' });
    expect(res.status).toBe(400);
  });
  
  it('PUT /tasks/:id validate update status invalid', async () => {
    const task = taskService.create({ title: 'Task 1' });
    const res = await request(app)
      .put(`/tasks/${task.id}`)
      .send({ status: 'invalid' });
    expect(res.status).toBe(400);
  });

  it('PUT /tasks/:id validate update dueDate invalid', async () => {
    const task = taskService.create({ title: 'Task 1' });
    const res = await request(app)
      .put(`/tasks/${task.id}`)
      .send({ dueDate: 'invalid' });
    expect(res.status).toBe(400);
  });

  it('PUT /tasks/:id should return 404 for invalid id', async () => {
    const res = await request(app)
      .put('/tasks/invalid-id')
      .send({ title: 'Updated' });
    expect(res.status).toBe(404);
  });

  it('DELETE /tasks/:id should delete', async () => {
    const task = taskService.create({ title: 'Task 1' });
    const res = await request(app).delete(`/tasks/${task.id}`);
    expect(res.status).toBe(204);
  });

  it('DELETE /tasks/:id should return 404', async () => {
    const res = await request(app).delete('/tasks/invalid-id');
    expect(res.status).toBe(404);
  });

  it('PATCH /tasks/:id/complete should complete', async () => {
    const task = taskService.create({ title: 'Task 1' });
    const res = await request(app).patch(`/tasks/${task.id}/complete`);
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('done');
  });

  it('PATCH /tasks/:id/complete should 404', async () => {
    const res = await request(app).patch('/tasks/invalid-id/complete');
    expect(res.status).toBe(404);
  });

  it('PATCH /tasks/:id/assign should assign', async () => {
    const task = taskService.create({ title: 'Task 1' });
    const res = await request(app)
      .patch(`/tasks/${task.id}/assign`)
      .send({ assignee: 'Alice' });
    expect(res.status).toBe(200);
    expect(res.body.assignee).toBe('Alice');
  });

  it('PATCH /tasks/:id/assign should handle 404', async () => {
    const res = await request(app)
      .patch('/tasks/invalid-id/assign')
      .send({ assignee: 'Alice' });
    expect(res.status).toBe(404);
  });

  it('PATCH /tasks/:id/assign should validate missing', async () => {
    const task = taskService.create({ title: 'Task 1' });
    const res = await request(app)
      .patch(`/tasks/${task.id}/assign`)
      .send({});
    expect(res.status).toBe(400);
  });
});
