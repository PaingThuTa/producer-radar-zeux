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
    const logs = await prisma.discoveryLog.findMany({
      orderBy: parseSort(sort),
      take: limit ? parseInt(limit) : undefined,
    });
    return res.status(200).json(logs);
  }

  if (req.method === 'POST') {
    const log = await prisma.discoveryLog.create({ data: req.body });
    return res.status(201).json(log);
  }

  res.status(405).end();
}
