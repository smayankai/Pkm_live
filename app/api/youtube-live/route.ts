import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const url = request.nextUrl.searchParams.get("url");

  if (!url) {
    return NextResponse.json(
      {
        error: "Missing YouTube URL",
      },
      { status: 400 }
    );
  }

  try {
    const parsed = new URL(url);

    const hostname = parsed.hostname.toLowerCase();

    if (
      hostname !== "youtube.com" &&
      hostname !== "www.youtube.com" &&
      hostname !== "m.youtube.com"
    ) {
      return NextResponse.json(
        {
          error: "Not a YouTube URL",
        },
        { status: 400 }
      );
    }

    /*
     * We only need to resolve YouTube handle URLs here.
     *
     * Example:
     * https://www.youtube.com/@NuggieTCGP
     */

    const handleMatch = parsed.pathname.match(
      /^\/(@[^/]+)\/?$/
    );

    if (!handleMatch) {
      return NextResponse.json({
        live: false,
        videoId: null,
        channelId: null,
      });
    }

    const handle = handleMatch[1];

    /*
     * Fetch the YouTube channel's LIVE page.
     *
     * Doing this server-side avoids browser iframe/CORS problems.
     */

    const livePageUrl =
      `https://www.youtube.com/${handle}/live`;

    const response = await fetch(livePageUrl, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/131.0.0.0 Safari/537.36",
        Accept:
          "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language":
          "en-US,en;q=0.9",
      },

      /*
       * Don't cache the result for long.
       * A tournament stream can start at any moment.
       */
      cache: "no-store",
    });

    if (!response.ok) {
      return NextResponse.json({
        live: false,
        videoId: null,
        channelId: null,
        error: `YouTube returned ${response.status}`,
      });
    }

    const html = await response.text();

    /*
     * -------------------------------------------------------
     * CHANNEL ID
     * -------------------------------------------------------
     */

    let channelId: string | null = null;

    const channelIdPatterns = [
      /"channelId":"(UC[^"]+)"/,
      /"externalId":"(UC[^"]+)"/,
      /"browseId":"(UC[^"]+)"/,
      /\/channel\/(UC[a-zA-Z0-9_-]{20,})/,
    ];

    for (const pattern of channelIdPatterns) {
      const match = html.match(pattern);

      if (match?.[1]) {
        channelId = match[1];
        break;
      }
    }

    /*
     * -------------------------------------------------------
     * CURRENT LIVE VIDEO
     * -------------------------------------------------------
     *
     * YouTube's channel live page contains video metadata.
     *
     * We look for a videoId associated with a live broadcast.
     */

    let videoId: string | null = null;

    /*
     * First look around explicit isLive markers.
     */

    const liveMarkers = [
      /"isLive":true[^]{0,5000}?"videoId":"([a-zA-Z0-9_-]{11})"/,
      /"videoId":"([a-zA-Z0-9_-]{11})"[^]{0,5000}?"isLive":true/,
      /"isLiveContent":true[^]{0,5000}?"videoId":"([a-zA-Z0-9_-]{11})"/,
      /"videoId":"([a-zA-Z0-9_-]{11})"[^]{0,5000}?"isLiveContent":true/,
    ];

    for (const pattern of liveMarkers) {
      const match = html.match(pattern);

      if (match?.[1]) {
        videoId = match[1];
        break;
      }
    }

    /*
     * Some YouTube page versions expose a liveVideoId directly.
     */

    if (!videoId) {
      const liveVideoPatterns = [
        /"liveVideoId":"([a-zA-Z0-9_-]{11})"/,
        /"currentLiveVideoId":"([a-zA-Z0-9_-]{11})"/,
      ];

      for (const pattern of liveVideoPatterns) {
        const match = html.match(pattern);

        if (match?.[1]) {
          videoId = match[1];
          break;
        }
      }
    }

    /*
     * -------------------------------------------------------
     * RESPONSE
     * -------------------------------------------------------
     */

    return NextResponse.json({
      live: Boolean(videoId),
      videoId,
      channelId,
      channelUrl:
        `https://www.youtube.com/${handle}`,
      livePageUrl,
    });
  } catch (error) {
    console.error(
      "YouTube live resolver error:",
      error
    );

    return NextResponse.json(
      {
        live: false,
        videoId: null,
        channelId: null,
        error: "Failed to resolve YouTube channel",
      },
      { status: 500 }
    );
  }
}