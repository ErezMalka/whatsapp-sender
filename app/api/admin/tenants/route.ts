// app/api/admin/tenants/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase/server';

export async function GET() {
  try {
    const supabase = createServiceRoleClient();
    
    const { data: tenants, error } = await supabase
      .from('tenants')
      .select('*, policies(*)')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('DB error:', error);
      return NextResponse.json({ tenants: [], error: error.message });
    }

    return NextResponse.json({ tenants: tenants || [] });
  } catch (error: any) {
    console.error('Server error:', error);
    return NextResponse.json({ tenants: [], error: 'Server error' });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, plan = 'free' } = body;

    if (!name) {
      return NextResponse.json(
        { error: 'Name required' },
        { status: 400 }
      );
    }

    const supabase = createServiceRoleClient();

    const { data: tenant, error } = await supabase
      .from('tenants')
      .insert({ name, plan, status: 'active' })
      .select()
      .single();

    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    if (tenant) {
      await supabase
        .from('policies')
        .insert({
          tenant_id: tenant.id,
          daily_cap: 1000,
          per_minute_cap: 10
        });
    }

    return NextResponse.json({ success: true, tenant });
  } catch (error: any) {
    return NextResponse.json(
      { error: 'Server error' },
      { status: 500 }
    );
  }
}
``