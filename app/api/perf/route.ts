export async function POST(request: Request) {
  try {
    const payload = await request.json()
    console.info("[perf][api][collect]", payload)
  } catch (e) {
    console.warn("[perf][api][collect][error]", String(e))
  }

  return new Response(null, { status: 204 })
}
