import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  broadcastFlexMessage,
  broadcastLineMessage,
  buildEventFlexBubble,
} from "@/lib/line";

export async function GET(request: NextRequest) {
  // Verify Vercel Cron secret
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const admin = createAdminClient();

    // Find events with scheduled notifications that are due
    const { data: events, error } = await admin
      .from("events")
      .select("*")
      .not("line_scheduled_at", "is", null)
      .is("line_notified_at", null)
      .eq("is_published", true)
      .lte("line_scheduled_at", new Date().toISOString());

    if (error) {
      console.error("[CRON line-notify] Query error:", error);
      return NextResponse.json(
        { error: "Database query failed" },
        { status: 500 }
      );
    }

    if (!events || events.length === 0) {
      return NextResponse.json({ processed: 0 });
    }

    const baseUrl =
      process.env.NEXT_PUBLIC_BASE_URL ||
      "https://petit-event-maker-am.vercel.app";

    let processed = 0;
    const errors: string[] = [];

    for (const event of events) {
      try {
        // Get LINE account for this event's creator
        const { data: lineAccount } = await admin
          .from("line_accounts")
          .select("channel_access_token, is_active")
          .eq("user_id", event.creator_id!)
          .eq("is_active", true)
          .maybeSingle();

        if (!lineAccount?.channel_access_token) {
          errors.push(
            `Event ${event.id}: No active LINE account for creator`
          );
          continue;
        }

        // Send custom text message first (if provided)
        const customMessage = event.line_schedule_message?.trim();
        if (customMessage) {
          const textResult = await broadcastLineMessage(
            lineAccount.channel_access_token,
            customMessage
          );
          if (!textResult.ok) {
            errors.push(
              `Event ${event.id}: Text message failed: ${textResult.error}`
            );
            continue;
          }
        }

        // Get booking count
        const { count: bookingCount } = await admin
          .from("bookings")
          .select("*", { count: "exact", head: true })
          .eq("event_id", event.id)
          .eq("status", "confirmed");

        // Send Flex Message card
        const bubble = buildEventFlexBubble(
          { ...event, booking_count: bookingCount ?? 0 },
          baseUrl
        );
        const flexResult = await broadcastFlexMessage(
          lineAccount.channel_access_token,
          `🎉 新しいイベント: ${event.title}`,
          bubble
        );

        if (!flexResult.ok) {
          errors.push(
            `Event ${event.id}: Flex message failed: ${flexResult.error}`
          );
          continue;
        }

        // Mark as sent and clear schedule
        await admin
          .from("events")
          .update({
            line_notified_at: new Date().toISOString(),
            line_scheduled_at: null,
            line_schedule_message: null,
          })
          .eq("id", event.id);

        processed++;
      } catch (err) {
        errors.push(
          `Event ${event.id}: ${err instanceof Error ? err.message : "Unknown error"}`
        );
      }
    }

    return NextResponse.json({ processed, total: events.length, errors });
  } catch (err) {
    console.error("[CRON line-notify] Error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
