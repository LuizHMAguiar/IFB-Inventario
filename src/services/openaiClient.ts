export async function interpretText(text: string) {
  const OPENAI_API_KEY = import.meta.env.VITE_OPENAI_API_KEY;
  if (!OPENAI_API_KEY) throw new Error('Faltando chave VITE_OPENAI_API_KEY');

  const systemPrompt = `Você é um assistente que extrai informações de comandos de voz para preencher um formulário.
Responda APENAS com um JSON válido com as chaves:
{id:"", state:"", observations:"", recommendations:""}`;

  const body = {
    model: "gpt-4o-mini",
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: text }
    ],
    temperature: 0
  };

  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${OPENAI_API_KEY}`
    },
    body: JSON.stringify(body)
  });

  if (!res.ok) throw new Error(await res.text());

  const data = await res.json();
  const content = data.choices?.[0]?.message?.content ?? "";
  const jsonMatch = content.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error("Resposta inesperada da IA");

  return JSON.parse(jsonMatch[0]);
}
