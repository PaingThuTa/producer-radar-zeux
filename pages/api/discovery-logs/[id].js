import { prisma } from '@/lib/db';

export default async function handler(req, res) {
  const { id } = req.query;

  if (req.method === 'GET') {
    const log = await prisma.discoveryLog.findUnique({ where: { id } });
    if (!log) return res.status(404).json({ error: 'Not found' });
    return res.status(200).json(log);
  }

  if (req.method === 'PUT') {
    const { id: _id, created_date: _cd, ...data } = req.body;
    const log = await prisma.discoveryLog.update({ where: { id }, data });
    return res.status(200).json(log);
  }

  if (req.method === 'DELETE') {
    await prisma.discoveryLog.delete({ where: { id } });
    return res.status(200).json({ success: true });
  }

  res.status(405).end();
}
