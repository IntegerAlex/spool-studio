import { NextResponse } from 'next/server';
import { getCurrentUserProfile } from '@/services/users-service';

export async function GET() {
  const user = await getCurrentUserProfile();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  return NextResponse.json({ data: user });
}
