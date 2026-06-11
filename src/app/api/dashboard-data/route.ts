import { NextResponse } from 'next/server';
import { getHubDashboardData } from '../../data';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const data = await getHubDashboardData();
    return NextResponse.json({
      success: true,
      ...data,
    });
  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}
