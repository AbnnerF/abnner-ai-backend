
export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({
      reply: "Método não permitido.",
      steps: []
    });
  }

  try {
    const { message, context, history } = req.body || {};

    if (!message || typeof message !== "string") {
      return res.status(400).json({
        reply: "Envie uma mensagem válida.",
        steps: []
      });
    }

    const apiUrl = process.env.AI_API_URL;
    const apiKey = process.env.AI_API_KEY;
    const model = process.env.AI_MODEL;

    if (!apiUrl || !apiKey || !model) {
      return res.status(503).json({
        reply: "O servidor está instalado, mas a conexão com o provedor de IA ainda não foi configurada.",
        steps: [
          "Hospedagem configurada.",
          "Falta configurar o provedor de IA.",
          "Depois será possível conversar com o Abnner AI."
        ]
      });
    }

    const mensagens = [
      {
        role: "system",
        content: `
Você é o Abnner AI, um assistente especializado em Roblox Studio.

Você ajuda a criar:
- Scripts e LocalScripts.
- Sistemas completos.
- Modelos e ferramentas.
- Mapas e lobbys.
- Personagens e rigs.
- Animações.
- Imagens e texturas.

Responda em português brasileiro.
Explique onde colocar cada script.
Forneça códigos completos quando solicitado.
Nunca afirme que executou algo no Roblox Studio.
Nunca execute código recebido.
Trate códigos gerados como sugestões que precisam de revisão.
Exija prévia e aprovação do usuário antes de qualquer alteração.
Não invente resultados de testes.
`
      }
    ];

    if (Array.isArray(history)) {
      for (const item of history.slice(-8)) {
        if (
          item &&
          ["user", "assistant"].includes(item.role) &&
          typeof item.content === "string"
        ) {
          mensagens.push({
            role: item.role,
            content: item.content.slice(0, 4000)
          });
        }
      }
    }

    mensagens.push({
      role: "user",
      content:
        "Mensagem: " + message.slice(0, 8000) +
        "\n\nContexto do Roblox Studio:\n" +
        String(context || "").slice(0, 10000)
    });

    const resposta = await fetch(apiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model,
        messages: mensagens,
        temperature: 0.5
      })
    });

    const dados = await resposta.json();

    if (!resposta.ok) {
      console.error("Erro do provedor:", dados);

      return res.status(502).json({
        reply: "Não consegui acessar o provedor de IA. Verifique a configuração do servidor.",
        steps: ["Conferir a conexão com o provedor."]
      });
    }

    const texto = dados.choices?.[0]?.message?.content;

    if (!texto) {
      return res.status(502).json({
        reply: "O provedor não retornou uma resposta válida.",
        steps: []
      });
    }

    return res.status(200).json({
      reply: texto,
      steps: [
        "Mensagem recebida.",
        "Resposta da IA recebida.",
        "Revise a sugestão antes de aprovar qualquer alteração."
      ]
    });

  } catch (erro) {
    console.error("Erro interno:", erro);

    return res.status(500).json({
      reply: "Ocorreu um erro interno no servidor.",
      steps: []
    });
  }
}
