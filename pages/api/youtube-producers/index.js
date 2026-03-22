import { prisma } from '@/lib/db';

function parseSort(sortParam) {
  if (!sortParam) return { created_date: 'desc' };
  const desc = sortParam.startsWith('-');
  const field = desc ? sortParam.slice(1) : sortParam;
  return { [field]: desc ? 'desc' : 'asc' };
}

export default async function handler(req, res) {
  if (req.method === 'GET') {
    const { sort, limit } = req.query;
    const producers = await prisma.youTubeProducer.findMany({
      orderBy: parseSort(sort),
      take: limit ? parseInt(limit) : undefined,
    });
    return res.status(200).json(producers);
  }

  if (req.method === 'POST') {
    const producer = await prisma.youTubeProducer.create({ data: req.body });
    return res.status(201).json(producer);
  }

  res.status(405).end();
}
