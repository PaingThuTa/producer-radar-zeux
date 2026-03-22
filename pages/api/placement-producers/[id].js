import { prisma } from '@/lib/db';

export default async function handler(req, res) {
  const { id } = req.query;

  if (req.method === 'GET') {
    const producer = await prisma.placementProducer.findUnique({ where: { id } });
    if (!producer) return res.status(404).json({ error: 'Not found' });
    return res.status(200).json(producer);
  }

  if (req.method === 'PUT') {
    const { id: _id, created_date: _cd, ...data } = req.body;
    const producer = await prisma.placementProducer.update({ where: { id }, data });
    return res.status(200).json(producer);
  }

  if (req.method === 'DELETE') {
    await prisma.placementProducer.delete({ where: { id } });
    return res.status(200).json({ success: true });
  }

  res.status(405).end();
}
