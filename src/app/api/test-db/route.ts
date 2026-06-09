import { NextResponse } from 'next/server';
import { prisma } from '../../../lib/db';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    console.log('API test-db: Executing findMany()...');
    const holders = await prisma.moneyHolder.findMany();
    return NextResponse.json({
      success: true,
      count: holders.length,
      holders
    });
  } catch (error: any) {
    console.error('API test-db ERROR:', error);
    return NextResponse.json({
      success: false,
      message: error.message || 'Database error',
      stack: error.stack,
      env_db_url_exists: !!process.env.DATABASE_URL
    }, { status: 500 });
  }
}
