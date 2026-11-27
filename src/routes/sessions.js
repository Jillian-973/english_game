import { Router } from 'express';

/** Session routes (brief §6). All the logic lives in SessionService. */
export function sessionsRouter(service) {
  const router = Router();

  router.post('/', async (req, res) => {
    res.status(201).json(await service.create(req.body?.name));
  });

  router.get('/:id', async (req, res) => {
    res.json(await service.get(req.params.id));
  });

  router.post('/:id/actions', async (req, res) => {
    res.json(await service.act(req.params.id, req.body));
  });

  router.post('/:id/undo', async (req, res) => {
    res.json(await service.undo(req.params.id));
  });

  router.post('/:id/end', async (req, res) => {
    res.json(await service.end(req.params.id));
  });

  return router;
}
