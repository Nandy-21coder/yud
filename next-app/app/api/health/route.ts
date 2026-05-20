import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json(
    { status: 'ok', message: 'API is healthy and running on Vercel!' },
    { status: 200 }
  );
}
