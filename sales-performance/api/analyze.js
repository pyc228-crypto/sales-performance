// Vercel Serverless Function
// API 키는 서버 환경변수에 보관 → 사용자에게 노출 안 됨

export default async function handler(req, res) {
  // CORS 설정
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { image, mediaType } = req.body;

    if (!image || !mediaType) {
      return res.status(400).json({ error: '이미지 데이터가 없습니다' });
    }

    const prompt = `이 이미지는 영업 실적표입니다. 각 영업자의 데이터를 JSON 배열로만 출력하세요. 코드블록 없이 순수 JSON만:
[{"name":"영업자명","team":"1팀 또는 2팀","amount":매출숫자,"yusun":유선건수,"musun":무선건수,"rental":렌탈건수}]
- amount는 정수(콤마/원 제외), 없으면 0
- 접수건이 없으면 0
- 팀 구분이 안 보이면 빈 문자열`;

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1000,
        messages: [{
          role: 'user',
          content: [
            { type: 'image', source: { type: 'base64', media_type: mediaType, data: image } },
            { type: 'text', text: prompt }
          ]
        }]
      })
    });

    const data = await response.json();

    if (data.error) {
      return res.status(500).json({ error: data.error.message });
    }

    let text = data.content[0].text.trim();
    if (text.includes('```')) {
      text = text.replace(/```json?/g, '').replace(/```/g, '').trim();
    }

    const parsed = JSON.parse(text);
    return res.status(200).json({ success: true, data: parsed });

  } catch (err) {
    console.error('Error:', err);
    return res.status(500).json({ error: err.message });
  }
}
