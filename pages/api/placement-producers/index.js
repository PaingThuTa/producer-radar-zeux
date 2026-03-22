import { prisma } from '@/lib/db';

function parseSort(sortParam) {
  if (!sortParam) return { created_date: 'desc' };
  const desc = sortParam.startsWith('-');
  const field = desc ? sortParam.slice(1) : sortParam;
  return { [field]: desc ? 'desc' : 'asc' };
}

export default async function handler(req, res) {
  if (req.method === 'GET') {
    try {
      const { sort, limit } = req.query;
      const producers = await prisma.placementProducer.findMany({
        orderBy: parseSort(sort),
        take: limit ? parseInt(limit) : undefined,
      });
      return res.status(200).json(producers);
    } catch (e) {
      return res.status(500).json({ error: e.message });
    }
  }

  if (req.method === 'POST') {
    try {
      const producer = await prisma.placementProducer.create({ data: req.body });
      return res.status(201).json(producer);
    } catch (e) {
      return res.status(500).json({ error: e.message });
    }
  }

  res.status(405).end();
}
