export async function POST(request: Request) {
  try {
    const response = await fetch(
      new URL("/api/plan", process.env.PLANNER_API_URL ?? "http://127.0.0.1:8000"),
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: await request.text(),
        cache: "no-store",
      },
    );

    return new Response(response.body, {
      status: response.status,
      headers: {
        "Content-Type": response.headers.get("Content-Type") ?? "application/json",
      },
    });
  } catch (error) {
    const detail = error instanceof Error ? error.message : "Unknown connection error";
    return Response.json(
      { status: "error", message: `Unable to reach the planning API: ${detail}` },
      { status: 502 },
    );
  }
}
