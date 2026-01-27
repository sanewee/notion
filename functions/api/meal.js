// /functions/api/meal.js
export async function onRequest(context) {
  const { request, env } = context;

  const url = new URL(request.url);
  const from = url.searchParams.get("from");
  const to = url.searchParams.get("to");
  const office = url.searchParams.get("office");
  const school = url.searchParams.get("school");

  if (!from || !to || !office || !school) {
    return new Response("Missing parameters", { status: 400 });
  }

  const key = env.NEIS_KEY; // Pages 프로젝트에 환경변수/시크릿로 설정

  const apiURL =
    `https://open.neis.go.kr/hub/mealServiceDietInfo?` +
    `KEY=${key}&Type=json&pIndex=1&pSize=100` +
    `&ATPT_OFCDC_SC_CODE=${office}&SD_SCHUL_CODE=${school}` +
    `&MLSV_FROM_YMD=${from}&MLSV_TO_YMD=${to}`;

  try {
    const upstream = await fetch(apiURL);
    const body = await upstream.text();

    // 같은 도메인에서 호출할 거라 CORS 없어도 되지만,
    // 필요 시 최소 헤더만 유지(동일 Origin 반사)
    const origin = request.headers.get("Origin") || "";
    return new Response(body, {
      status: upstream.status,
      headers: {
        "Content-Type": "application/json",
        ...(origin ? { "Access-Control-Allow-Origin": origin, "Vary": "Origin" } : {}),
      },
    });
  } catch (e) {
    return new Response("Error fetching data", { status: 500 });
  }
}
