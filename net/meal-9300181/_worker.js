export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname === "/api/meal") { 
      return handleMeal(env);
    }

    return env.ASSETS.fetch(request);
  }
};

async function handleMeal(env) {
  const key = env.NEIS_KEY;

  if (!key) {
    return jsonResponse({
      error: "NEIS_KEY가 Cloudflare Secret에 설정되지 않았습니다."
    }, 500);
  }

  const office = "I10";
  const school = "9300181";

  const { year, month, day } = getKoreanDateParts();
  const todayYMD = `${year}${month}${day}`;

  const apiUrl =
    `https://open.neis.go.kr/hub/mealServiceDietInfo` +
    `?KEY=${encodeURIComponent(key)}` +
    `&Type=json` +
    `&pIndex=1` +
    `&pSize=100` +
    `&ATPT_OFCDC_SC_CODE=${office}` +
    `&SD_SCHUL_CODE=${school}` +
    `&MLSV_FROM_YMD=${todayYMD}` +
    `&MLSV_TO_YMD=${todayYMD}`;

  const res = await fetch(apiUrl);

  if (!res.ok) {
    return jsonResponse({
      error: `NEIS API 호출 실패: HTTP ${res.status}`
    }, 502);
  }

  const data = await res.json();
  const rows = data?.mealServiceDietInfo?.[1]?.row || [];

  const breakfast = rows.find(r => r.MMEAL_SC_NM === "조식");
  const lunch = rows.find(r => r.MMEAL_SC_NM === "중식");
  const dinner = rows.find(r => r.MMEAL_SC_NM === "석식");

  const output = {
    date: `${year}년 ${Number(month)}월 ${Number(day)}일`,
    breakfast: breakfast ? cleanMealText(breakfast.DDISH_NM) : "-",
    lunch: lunch ? cleanMealText(lunch.DDISH_NM) : "-",
    dinner: dinner ? cleanMealText(dinner.DDISH_NM) : "-"
  };

  return jsonResponse(output);
}

function getKoreanDateParts() {
  const now = new Date();

  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  });

  const parts = formatter.formatToParts(now);

  return {
    year: parts.find(p => p.type === "year").value,
    month: parts.find(p => p.type === "month").value,
    day: parts.find(p => p.type === "day").value
  };
}

function cleanMealText(text) {
  return String(text || "")
    .replace(/\([^\)]*\)/g, "")
    .replace(/<br\s*\/?>/gi, "<br>");
}

function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "public, max-age=300"
    }
  });
}
