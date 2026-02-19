
import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET() {
    try {
        const { data: rankings, error } = await supabase
            .from('students')
            .select('id, name, classLevel, total_attempted, total_correct')
            .order('total_correct', { ascending: false })
            .limit(10); // Limit to top 10

        if (error) {
            throw error;
        }

        return NextResponse.json({ rankings });
    } catch (error) {
        console.error('Error fetching rankings:', error);
        return NextResponse.json({ error: 'Failed to fetch rankings' }, { status: 500 });
    }
}
