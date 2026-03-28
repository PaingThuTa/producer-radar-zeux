import { prisma } from '@/lib/db';

export default async function handler(req, res) {
  const { id } = req.query;

  if (req.method === 'GET') {
    const producer = await prisma.placementProducer.findUnique({ where: { id } });
    if (!producer) return res.status(404).json({ error: 'Not found' });
    return res.status(200).json(producer);
  }

  if (req.method === 'PUT') {
    const { id: _id, created_date: _cd, _type: _t, ...data } = req.body;
    try {
      const producer = await prisma.placementProducer.update({ where: { id }, data });
      return res.status(200).json(producer);
    } catch (err) {
      console.error('[PUT /placement-producers/:id]', err.message);
      return res.status(500).json({ error: err.message });
    }
  }

  if (req.method === 'DELETE') {
    await prisma.placementProducer.delete({ where: { id } });
    return res.status(200).json({ success: true });
  }

  res.status(405).end();
}
