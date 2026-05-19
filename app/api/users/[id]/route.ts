import { NextResponse } from 'next/server';
import { getUsers } from '@/services/users-service';

interface RouteContext {
  params: { id: string };
}

export async function GET(_request: Request, context: RouteContext) {
  const users = await getUsers();
  const user = users.find((item) => item.id === context.params.id);

  if (!user) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 });
  }

  return NextResponse.json({ data: user });
}
