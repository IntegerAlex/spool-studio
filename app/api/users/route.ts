import { NextResponse } from 'next/server';
import { getUsers } from '@/services/users-service';

export async function GET() {
  const users = await getUsers();
  return NextResponse.json({ data: users });
}
