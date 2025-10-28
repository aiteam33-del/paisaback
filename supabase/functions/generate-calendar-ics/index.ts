import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.74.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    );

    const { reminder_date, reminder_type = 'monthly' } = await req.json();

    console.log('Generating calendar ICS file', { reminder_date, reminder_type });

    // Get current pending expense count
    const { data: { user } } = await supabaseClient.auth.getUser();
    if (!user) {
      throw new Error('User not authenticated');
    }

    const { data: profile } = await supabaseClient
      .from('profiles')
      .select('organization_id')
      .eq('id', user.id)
      .single();

    const { count } = await supabaseClient
      .from('expenses')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'pending');

    // Parse reminder date
    const reminderDate = reminder_date ? new Date(reminder_date) : new Date();
    reminderDate.setHours(9, 0, 0, 0); // Set to 9 AM

    const dtStart = reminderDate.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
    const dtEnd = new Date(reminderDate.getTime() + 30 * 60000).toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
    const dtStamp = new Date().toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';

    // Generate unique UID
    const uid = `paisaback-expense-${reminder_type}-${Date.now()}@paisaback.com`;

    // Build iCalendar format
    let ics = 'BEGIN:VCALENDAR\r\n';
    ics += 'VERSION:2.0\r\n';
    ics += 'PRODID:-//PaisaBack//Expense Reminders//EN\r\n';
    ics += 'CALSCALE:GREGORIAN\r\n';
    ics += 'METHOD:PUBLISH\r\n';
    ics += 'X-WR-CALNAME:PaisaBack Expense Reminders\r\n';
    ics += 'X-WR-TIMEZONE:Asia/Kolkata\r\n';
    ics += 'BEGIN:VEVENT\r\n';
    ics += `UID:${uid}\r\n`;
    ics += `DTSTAMP:${dtStamp}\r\n`;
    ics += `DTSTART:${dtStart}\r\n`;
    ics += `DTEND:${dtEnd}\r\n`;
    ics += 'SUMMARY:Expense Approval Deadline - PaisaBack\r\n';
    ics += `DESCRIPTION:${count || 0} pending expenses need review. Visit PaisaBack dashboard to approve expenses.\\n\\nThis is a ${reminder_type} reminder.\\n\\nLogin at: https://paisaback.lovable.app\r\n`;
    ics += 'LOCATION:PaisaBack Dashboard\r\n';
    ics += 'STATUS:CONFIRMED\r\n';
    ics += 'SEQUENCE:0\r\n';
    ics += 'BEGIN:VALARM\r\n';
    ics += 'TRIGGER:-PT15M\r\n';
    ics += 'ACTION:DISPLAY\r\n';
    ics += 'DESCRIPTION:Reminder: Review pending expenses in PaisaBack\r\n';
    ics += 'END:VALARM\r\n';
    
    // Add recurring rule if monthly or weekly
    if (reminder_type === 'monthly') {
      ics += 'RRULE:FREQ=MONTHLY;BYMONTHDAY=30\r\n';
    } else if (reminder_type === 'weekly') {
      ics += 'RRULE:FREQ=WEEKLY;BYDAY=FR\r\n';
    }
    
    ics += 'END:VEVENT\r\n';
    ics += 'END:VCALENDAR\r\n';

    // Log to tracking table
    if (profile?.organization_id) {
      const fileName = `paisaback-reminders-${new Date().toISOString().split('T')[0]}.ics`;
      await supabaseClient.from('integration_exports').insert({
        user_id: user.id,
        organization_id: profile.organization_id,
        export_type: 'calendar',
        file_name: fileName,
        expense_count: count || 0,
        total_amount: 0,
      });
    }

    console.log('Calendar ICS file generated successfully');

    return new Response(ics, {
      headers: {
        ...corsHeaders,
        'Content-Type': 'text/calendar',
        'Content-Disposition': `attachment; filename="paisaback-reminders-${new Date().toISOString().split('T')[0]}.ics"`,
      },
    });
  } catch (error) {
    console.error('Error generating calendar ICS:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
