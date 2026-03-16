import { useState, useEffect, useRef, useCallback } from "react";

// ─── Audio ────────────────────────────────────────────────────────────────────
const createAudioCtx = () => {
  try { return new (window.AudioContext || window.webkitAudioContext)(); }
  catch { return null; }
};
const playTone = (ctx, freq, dur, type = "sine", vol = 0.3, delay = 0) => {
  if (!ctx) return;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.connect(gain); gain.connect(ctx.destination);
  osc.type = type;
  osc.frequency.setValueAtTime(freq, ctx.currentTime + delay);
  gain.gain.setValueAtTime(0, ctx.currentTime + delay);
  gain.gain.linearRampToValueAtTime(vol, ctx.currentTime + delay + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + delay + dur);
  osc.start(ctx.currentTime + delay);
  osc.stop(ctx.currentTime + delay + dur + 0.05);
};
const sounds = {
  click:  (ctx) => { playTone(ctx, 520, 0.08, "sine", 0.22); playTone(ctx, 780, 0.07, "sine", 0.15, 0.06); },
  whoosh: (ctx) => { [380, 280, 180].forEach((f, i) => playTone(ctx, f, 0.07, "sine", 0.1, i * 0.05)); },
  finish: (ctx) => { [523, 659, 784, 659, 784, 1047].forEach((f, i) => playTone(ctx, f, 0.14, "sine", 0.28, i * 0.1)); },
  tick:   (ctx) => { playTone(ctx, 880, 0.06, "sine", 0.12); },
};

// ─── Data ─────────────────────────────────────────────────────────────────────
const QUESTIONS = [
  {
    question: "Seu despertador toca às 5h para correr. Qual sua reação?",
    options: [
      { text: "Despertador? Eu acordo antes dele.", raizPoints: 10, comment: "Esse aí já tá aquecendo enquanto o galo tá dormindo! 🐓" },
      { text: "Levanto reclamando, mas levanto.", raizPoints: 7, comment: "O importante é levantar. Reclamar faz parte do aquecimento." },
      { text: "Aperto soneca 3 vezes e corro 5min a menos.", raizPoints: 3, comment: "Soneca é só um treino de velocidade... pra apertar o botão. 😂" },
      { text: "Mudo o treino pra 'descanso ativo' e volto a dormir.", raizPoints: 0, comment: "Descanso ativo é um conceito muito avançado. Respeito. 🛌" },
    ],
  },
  {
    question: "Como é seu tênis de corrida?",
    options: [
      { text: "Destruído. Já passou dos 800km mas a gente se entende.", raizPoints: 10, comment: "Se o tênis pudesse falar, pediria aposentadoria! 👟" },
      { text: "Tenho 2: um de treino e um de prova. Cada um no seu quadrado.", raizPoints: 7, comment: "Organizado! Aposto que tem planilha pros tênis também." },
      { text: "Comprei o mais bonito da loja. Combina com meu outfit.", raizPoints: 3, comment: "Se não tiver foto com o tênis novo, a corrida não conta, né?" },
      { text: "É o mesmo que uso pra ir no mercado.", raizPoints: 0, comment: "Multiuso. Eficiente. Eu respeito a economia circular. ♻️" },
    ],
  },
  {
    question: "O que você come antes de correr?",
    options: [
      { text: "Batata doce com ovo. Às 4:30 da manhã. Todo santo dia.", raizPoints: 10, comment: "Você já chega no treino cheirando a batata doce. Lenda. 🍠" },
      { text: "Uma banana e café preto. Simples e eficiente.", raizPoints: 7, comment: "Clássico! Banana + café: o combo que move o Brasil corredor." },
      { text: "Um açaí completão com granola, banana, leite ninho...", raizPoints: 3, comment: "Isso é café da manhã, não é pré-treino. Mas tá gostoso? Tá." },
      { text: "Nada. Corro de estômago vazio e rezo.", raizPoints: 0, comment: "Jejum intermitente ou esqueceu? Tanto faz, RIP estômago. 💀" },
    ],
  },
  {
    question: "Você posta seus treinos nas redes sociais?",
    options: [
      { text: "Nunca. Quem precisa saber é meu treinador e meu joelho.", raizPoints: 10, comment: "Corredor misterioso. Ninguém te vê treinar, mas no dia da prova... 🥷" },
      { text: "Só quando bato recorde pessoal. Mérito merecido.", raizPoints: 7, comment: "PR merece post sim. Pode comemorar. Vai, posta!" },
      { text: "Todo treino. Se não postou, não correu.", raizPoints: 3, comment: "O Strava tá mais atualizado que seu Instagram. 📊" },
      { text: "Só story com a playlist e o nascer do sol. Pra inspirar.", raizPoints: 0, comment: "O nascer do sol não pediu pra ser coadjuvante do seu story, mas ok. 🌅" },
    ],
  },
  {
    question: "Dia de chuva. O que acontece com seu treino?",
    options: [
      { text: "Chuva? Ótimo. Menos gente na pista.", raizPoints: 10, comment: "Você é aquele maluco que os vizinhos olham pela janela e pensam 'gente...' 🌧️" },
      { text: "Vou, mas xingando o tempo inteiro.", raizPoints: 7, comment: "Xingando mas correndo. Isso é comprometimento com raiva. Válido!" },
      { text: "Troco por esteira na academia. Conta, né?", raizPoints: 3, comment: "Esteira é tipo karaokê: parece a mesma coisa mas não é. 😅" },
      { text: "Treino adiado. Netflix ativada.", raizPoints: 0, comment: "Netflix e sofá é autocuidado. Eu entendo. Eu apoio. 🍿" },
    ],
  },
  {
    question: "Qual sua relação com planilha de treino?",
    options: [
      { text: "Sigo à risca. Meu treinador manda, eu obedeço.", raizPoints: 10, comment: "Soldado da planilha! Se o coach falar 'corre pra parede', você pergunta 'qual pace?' 🫡" },
      { text: "Tenho, mas adapto conforme o humor do dia.", raizPoints: 7, comment: "Flexível. O treino se adapta a você. Ou você se adapta ao sofá. Depende do dia." },
      { text: "Baixei uma do Google. Segui 3 dias. Tá lá.", raizPoints: 3, comment: "3 dias é praticamente uma semana. Quase um mês. Quase um hábito. 😂" },
      { text: "Planilha? Eu corro quando dá vontade.", raizPoints: 0, comment: "Corredor freestyle! Sem regras, sem limites, sem pace definido. Liberdade! 🦅" },
    ],
  },
  {
    question: "O que tem no seu braço durante a corrida?",
    options: [
      { text: "Relógio GPS com cardíaco, cadência, VO2 estimado e previsão do tempo.", raizPoints: 10, comment: "Seu relógio tem mais função que o painel de um avião. ✈️" },
      { text: "Um relógio esportivo básico. Marca distância e pace.", raizPoints: 7, comment: "Simples e funcional. O básico que funciona. Tá aprovado!" },
      { text: "Celular com braçadeira tocando minha playlist.", raizPoints: 3, comment: "Se a música parar, a corrida para. Prioridades. 🎵" },
      { text: "Nada. Corro livre. Às vezes nem sei quanto corri.", raizPoints: 0, comment: "Correr sem saber quanto correu é a forma mais pura de liberdade. Ou amnésia. 🤷" },
    ],
  },
  {
    question: "Como você reage quando alguém te ultrapassa na corrida?",
    options: [
      { text: "Acelero. Ninguém me passa sem que eu tente acompanhar.", raizPoints: 10, comment: "Modo competição ATIVADO. Amigo na corrida? Só depois da linha de chegada. 🔥" },
      { text: "Mantenho meu pace. Cada um na sua corrida.", raizPoints: 7, comment: "Maturidade de corredor. Zen. Iluminado. Ou cansado demais pra reagir." },
      { text: "Penso 'nossa, que forma bonita' e continuo no meu.", raizPoints: 3, comment: "Apreciador de biomecânica alheia. Corredor e analista. 👀" },
      { text: "Nem percebo. Tô focado na minha playlist.", raizPoints: 0, comment: "Na sua bolha musical. Ultrapassaram? Que ultrapassaram? 🎧" },
    ],
  },
  {
    question: "O que acontece depois da corrida?",
    options: [
      { text: "Gelo nos joelhos, foam roller e análise dos splits.", raizPoints: 10, comment: "Você tem mais gelo em casa que um bar. Recuperação é treino! 🧊" },
      { text: "Alongamento rápido e café com os amigos do grupo.", raizPoints: 7, comment: "Café pós-treino com a galera é o verdadeiro troféu. ☕" },
      { text: "Foto na medalha e brunch.", raizPoints: 3, comment: "Brunch pós-corrida queima mais calorias que a própria corrida. Fato científico.* (*não é) 🥂" },
      { text: "Deito no chão e questiono minhas escolhas de vida.", raizPoints: 0, comment: "A fase 'questionar a existência' é o cool down emocional. Todo mundo passa. 😵" },
    ],
  },
  {
    question: "Por que você corre?",
    options: [
      { text: "Porque se eu não correr eu surto. É terapia.", raizPoints: 10, comment: "Corrida é seu psicólogo com tênis. Mais barato e sem fila. 🧠" },
      { text: "Saúde, disciplina, e porque meu médico mandou.", raizPoints: 7, comment: "O médico mandou e você obedeceu. Paciente exemplar! 🩺" },
      { text: "Pra poder comer pizza sem culpa.", raizPoints: 3, comment: "A pizza é a verdadeira linha de chegada. Honestidade brutal. 🍕" },
      { text: "Pra falar que corro. No mais, é sofrimento.", raizPoints: 0, comment: "Pelo menos é honesto! Auto-conhecimento é o primeiro passo. O segundo é correr. Ou não. 😂" },
    ],
  },
];

const RESULTS = [
  { min: 81, emoji: "🪨", level: "Raiz Bruta",         color: "#2ECC71", bg: "rgba(46,204,113,0.12)",  border: "rgba(46,204,113,0.4)",  title: "Raiz Bruta",           humor: "Meu despertador toca 4:30. Meu tênis tá destruído. Minha planilha tem planilha. Dia 29/03 é só mais um dia.",                     mascotMsg: "Você É a corrida. Você VIVE pra correr. Seu sangue é isotônico. Lenda! 🏆" },
  { min: 61, emoji: "🌿", level: "Raiz com Estilo",    color: "#27AE60", bg: "rgba(39,174,96,0.12)",   border: "rgba(39,174,96,0.4)",   title: "Raiz com Estilo",      humor: "Acordo 5h pra correr mas só se o look estiver combinando. Dia 29/03, Parque do Povo, vai ter estilo na pista.",               mascotMsg: "Raiz mas com classe! Você corre de madrugada MAS o tênis combina com a bermuda. 👟✨" },
  { min: 41, emoji: "🥜", level: "Meio a Meio",        color: "#F39C12", bg: "rgba(243,156,18,0.12)",  border: "rgba(243,156,18,0.4)",  title: "Meio Nutella, Meio Raiz", humor: "Corro de vez em quando e posto foto como se fosse todo dia. Equilíbrio é tudo.",                                           mascotMsg: "O equilíbrio perfeito! Corre E posta foto. Treina E come pizza. Você é a dualidade humana. ☯️" },
  { min: 21, emoji: "🥣", level: "Nutella c/ Granola", color: "#E67E22", bg: "rgba(230,126,34,0.12)",  border: "rgba(230,126,34,0.4)",  title: "Nutella com Granola",  humor: "Até comprei tênis de corrida. Ainda tá limpinho. Na 2ª Corrida Sírio-Libanês vou estrear!",                                   mascotMsg: "Quase lá! Falta só trocar o brunch pelo treino. Ou não. Brunch é bom. 🥐" },
  { min: 0,  emoji: "🍫", level: "Nutella Premium",    color: "#E74C3C", bg: "rgba(231,76,60,0.12)",   border: "rgba(231,76,60,0.4)",   title: "Nutella Premium",      humor: "Corro? Só se for atrás do iFood. Mas dia 29/03 eu tô no Parque do Povo, nem que seja pela foto.",                           mascotMsg: "Sem julgamento! Tá mais pra maratonista de Netflix mas todo mundo começa de algum lugar! 🍿" },
];

const THINKING_MSGS = [
  "Hmm, essa é reveladora...",
  "Pensa bem, hein... 🤔",
  "Essa vai te denunciar! 🔍",
  "Sem pressão... o tempo tá correndo ⏱️",
  "Tô te analisando... 👀",
];

const getResult = (score) => RESULTS.find((r) => score >= r.min) || RESULTS[RESULTS.length - 1];
const shuffleArr = (arr) => [...arr].sort(() => Math.random() - 0.5);
const prepareQuestions = () => QUESTIONS.map((q) => ({ ...q, options: shuffleArr(q.options) }));

const TIME_PER_Q = 15;
const TOTAL_Q = 10;
const REGISTRATION_URL = "https://www.ticketsports.com.br/e/2-corrida-sirio-libanes-sao-paulo-74624";

// ─── Logo ─────────────────────────────────────────────────────────────────────
const SirioLogo = () => (
  <svg width="148" height="38" viewBox="0 0 148 38" style={{ display: "block" }}>
    {/* Runner silhouette */}
    <circle cx="11" cy="7" r="4.5" fill="#2ECC71" />
    <path d="M8 12 L6 23 L11 21 L15 27 M8 12 L14 17 L19 12" stroke="#576CBC" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
    {/* Texts */}
    <text x="26" y="13" fontSize="8" fontWeight="900" fill="#FFFFFF" fontFamily="system-ui,sans-serif">2ª CORRIDA</text>
    <text x="26" y="22" fontSize="6.5" fontWeight="700" fill="#87CEEB" fontFamily="system-ui,sans-serif">SÍRIO-LIBANÊS</text>
    {/* Distance badges */}
    <rect x="26" y="26" width="18" height="10" rx="4" fill="#2ECC71" />
    <text x="35" y="33.5" textAnchor="middle" fontSize="6" fill="white" fontWeight="bold" fontFamily="system-ui,sans-serif">3K</text>
    <rect x="46" y="26" width="18" height="10" rx="4" fill="#E67E22" />
    <text x="55" y="33.5" textAnchor="middle" fontSize="6" fill="white" fontWeight="bold" fontFamily="system-ui,sans-serif">5K</text>
    <rect x="66" y="26" width="20" height="10" rx="4" fill="#E74C3C" />
    <text x="76" y="33.5" textAnchor="middle" fontSize="6" fill="white" fontWeight="bold" fontFamily="system-ui,sans-serif">10K</text>
  </svg>
);

// ─── Mascot ───────────────────────────────────────────────────────────────────
// mood: idle | thinking | happy | wrong | celebrate | running
const Mascot = ({ mood = "idle", size = 120 }) => {
  const isRunning = mood === "running";
  const bounce    = mood === "celebrate" || mood === "happy" ? -5 : isRunning ? -4 : 0;
  const armL      = mood === "celebrate" ? -50 : mood === "happy" ? -35 : mood === "wrong" ? 25 : isRunning ? -70 : 18;
  const armR      = mood === "celebrate" ?  50 : mood === "happy" ?  35 : mood === "wrong" ? -25 : isRunning ?  70 : -18;
  const happyEyes = mood === "happy" || mood === "celebrate";

  // Head center: (50, 43), r=24  — sweatband ends at y=39
  const eyeY  = 49;
  const eyeLX = 43, eyeRX = 57;
  // Eyebrows sit between sweatband (y=39) and eyes (y=49) → y=44, subtle
  const browY = mood === "wrong" ? 45 : mood === "thinking" ? 43 : 44;
  const pupilDX = mood === "thinking" ? -1.5 : 0;
  const pupilDY = mood === "thinking" ? -1.5 : 0;

  const mouthPath = mood === "happy" || mood === "celebrate"
    ? "M 40 61 Q 50 71 60 61"
    : "M 42 62 Q 50 67 58 62";

  return (
    <svg
      width={size}
      height={Math.round(size * 1.25)}
      viewBox="0 0 100 125"
      style={{ filter: "drop-shadow(0 8px 20px rgba(0,0,0,0.45))", overflow: "visible" }}
    >
      {/* Ground shadow — fixed */}
      <ellipse cx="50" cy="123" rx="21" ry="4" fill="rgba(0,0,0,0.2)" />

      <g transform={`translate(0, ${bounce})`}>

        {/* ── Shoes & Legs (running = angled, normal = straight) ── */}
        {isRunning ? (
          <>
            {/* Left leg forward */}
            <g transform="rotate(-28, 42, 100)">
              <rect x="37" y="100" width="10" height="15" rx="5" fill="#0B2447" />
              <ellipse cx="42" cy="117" rx="10" ry="4.5" fill="#E0E0E0" />
              <rect x="32" y="111" width="19" height="8" rx="3.5" fill="#576CBC" />
              <rect x="32" y="111" width="19" height="3" rx="1.5" fill="#87CEEB" />
            </g>
            {/* Right leg back */}
            <g transform="rotate(22, 58, 100)">
              <rect x="53" y="100" width="10" height="15" rx="5" fill="#0B2447" />
              <ellipse cx="58" cy="117" rx="10" ry="4.5" fill="#E0E0E0" />
              <rect x="49" y="111" width="19" height="8" rx="3.5" fill="#576CBC" />
              <rect x="49" y="111" width="19" height="3" rx="1.5" fill="#87CEEB" />
            </g>
          </>
        ) : (
          <>
            {/* Left shoe */}
            <ellipse cx="41" cy="119" rx="11" ry="5" fill="#E0E0E0" />
            <rect x="31" y="112" width="20" height="9" rx="4" fill="#576CBC" />
            <rect x="31" y="112" width="20" height="3.5" rx="1.5" fill="#87CEEB" />
            {/* Right shoe */}
            <ellipse cx="59" cy="119" rx="11" ry="5" fill="#E0E0E0" />
            <rect x="49" y="112" width="20" height="9" rx="4" fill="#576CBC" />
            <rect x="49" y="112" width="20" height="3.5" rx="1.5" fill="#87CEEB" />
            {/* Legs */}
            <rect x="37" y="100" width="10" height="15" rx="5" fill="#0B2447" />
            <rect x="53" y="100" width="10" height="15" rx="5" fill="#0B2447" />
          </>
        )}

        {/* ── Shorts ── */}
        <rect x="27" y="87" width="46" height="17" rx="10" fill="#19376D" />

        {/* ── Shirt ── */}
        <rect x="24" y="62" width="52" height="30" rx="14" fill="#576CBC" />

        {/* Race bib */}
        <rect x="37" y="68" width="26" height="18" rx="4" fill="white" />
        <text x="50" y="76" textAnchor="middle" fontSize="6" fill="#0B2447" fontWeight="900" fontFamily="system-ui,sans-serif">2ª</text>
        <text x="50" y="83" textAnchor="middle" fontSize="4.5" fill="#576CBC" fontFamily="system-ui,sans-serif">CORRIDA</text>

        {/* ── Left arm ── pivot at left edge of shirt */}
        <g transform={`rotate(${armL}, 24, 74)`}>
          <rect x="3" y="70" width="23" height="9" rx="4.5" fill="#576CBC" />
          <circle cx="3" cy="74" r="5.5" fill="#FDDBB4" />
        </g>

        {/* ── Right arm ── pivot at right edge of shirt */}
        <g transform={`rotate(${armR}, 76, 74)`}>
          <rect x="74" y="70" width="23" height="9" rx="4.5" fill="#576CBC" />
          <circle cx="97" cy="74" r="5.5" fill="#FDDBB4" />
        </g>

        {/* ── Neck ── */}
        <rect x="43" y="58" width="14" height="8" rx="5" fill="#FDDBB4" />

        {/* ── Head ── */}
        <circle cx="50" cy="43" r="24" fill="#FDDBB4" />

        {/* ── Hair (dark dome visible above sweatband) ── */}
        <ellipse cx="50" cy="27" rx="21" ry="14" fill="#3D1C00" />

        {/* ── Sweatband ── drawn after hair to cover lower part of hair */}
        <rect x="27" y="30" width="46" height="9" rx="4.5" fill="#E67E22" />
        {/* Sweatband shine */}
        <rect x="27" y="30" width="46" height="3" rx="1.5" fill="rgba(255,255,255,0.18)" />

        {/* ── Cheeks ── */}
        <ellipse cx="32" cy="52" rx="6" ry="4" fill="rgba(255,120,100,0.45)" />
        <ellipse cx="68" cy="52" rx="6" ry="4" fill="rgba(255,120,100,0.45)" />

        {/* ── Eyebrows — thin, subtle, well below sweatband ── */}
        <path
          d={`M ${eyeLX - 4} ${browY} Q ${eyeLX} ${browY - 2} ${eyeLX + 4} ${browY}`}
          stroke="#6B3A1A" strokeWidth="1.4" fill="none" strokeLinecap="round"
        />
        <path
          d={`M ${eyeRX - 4} ${browY} Q ${eyeRX} ${browY - 2} ${eyeRX + 4} ${browY}`}
          stroke="#6B3A1A" strokeWidth="1.4" fill="none" strokeLinecap="round"
        />

        {/* ── Eyes ── */}
        <circle cx={eyeLX} cy={eyeY} r="6.5" fill="white" />
        <circle cx={eyeRX} cy={eyeY} r="6.5" fill="white" />

        {happyEyes ? (
          // ^_^ arcs
          <>
            <path d={`M ${eyeLX - 5} ${eyeY + 2} Q ${eyeLX} ${eyeY - 5} ${eyeLX + 5} ${eyeY + 2}`} stroke="#3D1C00" strokeWidth="3" fill="none" strokeLinecap="round" />
            <path d={`M ${eyeRX - 5} ${eyeY + 2} Q ${eyeRX} ${eyeY - 5} ${eyeRX + 5} ${eyeY + 2}`} stroke="#3D1C00" strokeWidth="3" fill="none" strokeLinecap="round" />
          </>
        ) : (
          // Normal pupils
          <>
            <circle cx={eyeLX + pupilDX} cy={eyeY + pupilDY + 1} r="3.8" fill="#1a0a00" />
            <circle cx={eyeRX + pupilDX} cy={eyeY + pupilDY + 1} r="3.8" fill="#1a0a00" />
            <circle cx={eyeLX + pupilDX + 1.5} cy={eyeY + pupilDY - 1} r="1.4" fill="white" />
            <circle cx={eyeRX + pupilDX + 1.5} cy={eyeY + pupilDY - 1} r="1.4" fill="white" />
          </>
        )}

        {/* ── Mouth ── */}
        {mood === "wrong" ? (
          // O mouth
          <ellipse cx="50" cy="61" rx="5" ry="5.5" fill="none" stroke="#3D1C00" strokeWidth="2.2" />
        ) : (
          <path d={mouthPath} stroke="#3D1C00" strokeWidth="2.5" fill="none" strokeLinecap="round" />
        )}

        {/* ── Sweat drop (wrong mood) ── */}
        {mood === "wrong" && (
          <path d="M 71 32 Q 74 38 71 44 Q 68 38 71 32" fill="#87CEEB" opacity="0.9" />
        )}

        {/* ── Thinking bubble ── */}
        {mood === "thinking" && (
          <>
            <circle cx="73" cy="31" r="3"   fill="rgba(255,255,255,0.82)" />
            <circle cx="81" cy="22" r="5"   fill="rgba(255,255,255,0.87)" />
            <circle cx="91" cy="12" r="8"   fill="rgba(255,255,255,0.92)" />
            <text x="91" y="16" textAnchor="middle" fontSize="9" fill="#19376D" fontWeight="bold" fontFamily="system-ui,sans-serif">?</text>
          </>
        )}

        {/* ── Stars for happy/celebrate ── */}
        {(mood === "happy" || mood === "celebrate") && (
          <>
            <text x="4"  y="30" fontSize="13">⭐</text>
            <text x="76" y="24" fontSize="12">✨</text>
            {mood === "celebrate" && <text x="6" y="57" fontSize="11">🌟</text>}
          </>
        )}

      </g>
    </svg>
  );
};

// ─── Confetti ─────────────────────────────────────────────────────────────────
const Confetti = () => {
  const colors = ["#576CBC", "#2ECC71", "#E67E22", "#E74C3C", "#F39C12", "#FFFFFF", "#87CEEB"];
  const pieces = Array.from({ length: 65 }, (_, i) => ({
    id: i,
    color: colors[i % colors.length],
    left: `${Math.random() * 100}%`,
    delay: `${Math.random() * 1.5}s`,
    duration: `${1.8 + Math.random() * 2}s`,
    size: `${6 + Math.random() * 9}px`,
  }));
  return (
    <div style={{ position: "fixed", inset: 0, pointerEvents: "none", overflow: "hidden", zIndex: 50 }}>
      {pieces.map((p) => (
        <div key={p.id} style={{
          position: "absolute", left: p.left, top: "-12px",
          width: p.size, height: p.size,
          backgroundColor: p.color,
          borderRadius: Math.random() > 0.5 ? "50%" : "2px",
          animation: `confettiFall ${p.duration} ${p.delay} ease-in forwards`,
        }} />
      ))}
    </div>
  );
};

// ─── Speech Bubble — in-flow, never escapes its container ────────────────────
const SpeechBubble = ({ text, visible, color = "#19376D" }) => (
  <div style={{
    opacity: visible ? 1 : 0,
    transform: visible ? "scale(1)" : "scale(0.5)",
    transformOrigin: "bottom center",
    transition: "all 0.3s cubic-bezier(0.34,1.56,0.64,1)",
    pointerEvents: "none",
    display: "flex", flexDirection: "column", alignItems: "center",
  }}>
    <div style={{
      background: color,
      color: "#fff", fontWeight: "700", fontSize: "12px",
      padding: "8px 12px", borderRadius: "12px",
      textAlign: "center", lineHeight: 1.4,
      maxWidth: "115px",
      boxShadow: `0 4px 12px ${color}66`,
    }}>
      {text}
    </div>
    {/* Arrow pointing down toward mascot */}
    <div style={{
      width: 0, height: 0,
      borderLeft: "7px solid transparent",
      borderRight: "7px solid transparent",
      borderTop: `7px solid ${color}`,
    }} />
  </div>
);

// ─── Main ─────────────────────────────────────────────────────────────────────
export default function CorridaSirioTrivia() {
  const [gameState,      setGameState]      = useState("start");
  const [currentQ,       setCurrentQ]       = useState(0);
  const [totalRaiz,      setTotalRaiz]      = useState(0);
  const [answers,        setAnswers]        = useState([]);
  const [timeLeft,       setTimeLeft]       = useState(TIME_PER_Q);
  const [mascotMood,     setMascotMood]     = useState("idle");
  const [mascotMsg,      setMascotMsg]      = useState("Bora descobrir a verdade? 👀");
  const [bubbleVisible,  setBubbleVisible]  = useState(true);
  const [isMuted,        setIsMuted]        = useState(false);
  const [selectedIdx,    setSelectedIdx]    = useState(null);
  const [questions,      setQuestions]      = useState([]);
  const [showNext,       setShowNext]       = useState(false);
  const [showConfetti,   setShowConfetti]   = useState(false);
  const [optionsIn,      setOptionsIn]      = useState(true);
  const [qIn,            setQIn]            = useState(true);
  const [mascotBounce,   setMascotBounce]   = useState(false);

  const audioCtxRef   = useRef(null);
  const timerRef      = useRef(null);
  const startTimeRef  = useRef(null);
  const bubbleTimerRef = useRef(null);
  const nextTimerRef  = useRef(null);

  const getCtx = useCallback(() => {
    if (!audioCtxRef.current) audioCtxRef.current = createAudioCtx();
    if (audioCtxRef.current?.state === "suspended") audioCtxRef.current.resume();
    return audioCtxRef.current;
  }, []);

  const play = useCallback((name) => {
    if (isMuted) return;
    const ctx = getCtx();
    if (ctx && sounds[name]) sounds[name](ctx);
  }, [isMuted, getCtx]);

  const showBubble = useCallback((text, color = "#19376D", duration = 3000) => {
    clearTimeout(bubbleTimerRef.current);
    setMascotMsg(text);
    setBubbleVisible(true);
    if (duration > 0) bubbleTimerRef.current = setTimeout(() => setBubbleVisible(false), duration);
  }, []);

  // Idle bob during playing
  useEffect(() => {
    if (gameState !== "playing") return;
    const t = setInterval(() => {
      if (mascotMood === "idle") setMascotBounce((b) => !b);
    }, 2200);
    return () => clearInterval(t);
  }, [gameState, mascotMood]);

  // Start screen: alternate idle ↔ running every few seconds
  useEffect(() => {
    if (gameState !== "start") return;
    const t = setInterval(() => {
      setMascotMood((m) => (m === "idle" ? "running" : "idle"));
    }, 2800);
    return () => { clearInterval(t); };
  }, [gameState]);

  // Timer
  useEffect(() => {
    if (gameState !== "playing") return;
    startTimeRef.current = Date.now();
    const thinkingMsg = THINKING_MSGS[Math.floor(Math.random() * THINKING_MSGS.length)];
    showBubble(thinkingMsg, "#19376D", 0);
    setMascotMood("thinking");

    timerRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timerRef.current);
          handleTimeout();
          return 0;
        }
        if (prev <= 6) play("tick");
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timerRef.current);
  }, [gameState, currentQ]); // eslint-disable-line

  const handleTimeout = useCallback(() => {
    setMascotMood("wrong");
    showBubble("Travou? O tempo não espera, igual no pace da prova! ⏱️", "#E74C3C", 3000);
    setAnswers((prev) => [...prev, { questionIndex: currentQ, selectedIdx: -1, raizPoints: 0, timeSpent: TIME_PER_Q }]);
    setGameState("feedback");
    nextTimerRef.current = setTimeout(() => setShowNext(true), 1500);
  }, [currentQ, showBubble]);

  const handleAnswer = useCallback((idx) => {
    if (gameState !== "playing") return;
    clearInterval(timerRef.current);
    clearTimeout(nextTimerRef.current);

    const q = questions[currentQ];
    const opt = q.options[idx];
    const timeSpent = Math.min(TIME_PER_Q, (Date.now() - (startTimeRef.current || Date.now())) / 1000);

    play("click");
    setSelectedIdx(idx);
    setTotalRaiz((prev) => prev + opt.raizPoints);
    setAnswers((prev) => [...prev, { questionIndex: currentQ, selectedIdx: idx, raizPoints: opt.raizPoints, timeSpent }]);

    // Mascot reaction
    if (opt.raizPoints >= 7) {
      setMascotMood("happy");
      showBubble(opt.comment, "#1a6e36", 3000);
    } else if (opt.raizPoints === 0) {
      setMascotMood("wrong");
      showBubble(opt.comment, "#c0392b", 3000);
    } else {
      setMascotMood("idle");
      showBubble(opt.comment, "#19376D", 3000);
    }

    setGameState("feedback");
    nextTimerRef.current = setTimeout(() => setShowNext(true), 1500);
  }, [gameState, questions, currentQ, play, showBubble]);

  const nextQuestion = useCallback(() => {
    play("whoosh");
    const next = currentQ + 1;
    if (next >= TOTAL_Q) {
      play("finish");
      setShowConfetti(true);
      setTimeout(() => setShowConfetti(false), 5000);
      setMascotMood("celebrate");
      setBubbleVisible(false);
      setGameState("result");
      return;
    }
    setQIn(false);
    setOptionsIn(false);
    setMascotMood("running");  // mascote corre durante a transição
    setTimeout(() => {
      setCurrentQ(next);
      setSelectedIdx(null);
      setTimeLeft(TIME_PER_Q);
      setShowNext(false);
      setMascotMood("idle");
      setGameState("playing");
      setTimeout(() => { setQIn(true); setOptionsIn(true); }, 50);
    }, 280);
  }, [currentQ, play]);

  const startGame = useCallback(() => {
    getCtx();
    setQuestions(prepareQuestions());
    setCurrentQ(0); setTotalRaiz(0); setAnswers([]);
    setTimeLeft(TIME_PER_Q); setSelectedIdx(null);
    setShowNext(false); setMascotMood("idle");
    setQIn(true); setOptionsIn(true);
    showBubble("Bora! Sem julgamento... muito. 😏", "#19376D", 2500);
    setGameState("playing");
  }, [getCtx, showBubble]);

  const q = questions[currentQ];
  const timerPct = (timeLeft / TIME_PER_Q) * 100;
  const timerColor = timeLeft > 8 ? "#2ECC71" : timeLeft > 4 ? "#F39C12" : "#E74C3C";
  const raizPct = Math.round((totalRaiz / 100) * 100);
  const result = getResult(totalRaiz);
  const avgTime = answers.length > 0
    ? (answers.reduce((s, a) => s + a.timeSpent, 0) / answers.length).toFixed(1)
    : 0;

  const btnBg = (idx) => {
    if (gameState !== "feedback" || selectedIdx === null) return "rgba(255,255,255,0.06)";
    if (idx === selectedIdx) return "linear-gradient(135deg,#19376D,#0B2447)";
    return "rgba(255,255,255,0.03)";
  };
  const btnBorder = (idx) => {
    if (gameState !== "feedback" || selectedIdx === null) return "rgba(255,255,255,0.12)";
    if (idx === selectedIdx) return "#576CBC";
    return "rgba(255,255,255,0.06)";
  };

  return (
    <div style={{
      minHeight: "100vh",
      background: "linear-gradient(160deg, #040d1a 0%, #0B2447 50%, #040d1a 100%)",
      display: "flex", alignItems: "center", justifyContent: "center",
      fontFamily: "'Segoe UI',system-ui,-apple-system,sans-serif",
      padding: "20px", position: "relative",
    }}>
      <style>{`
        *{box-sizing:border-box;margin:0;padding:0}
        @keyframes fadeUp{from{opacity:0;transform:translateY(22px)}to{opacity:1;transform:translateY(0)}}
        @keyframes fadeDown{from{opacity:1;transform:translateY(0)}to{opacity:0;transform:translateY(-18px)}}
        @keyframes staggerIn{from{opacity:0;transform:translateX(-16px)}to{opacity:1;transform:translateX(0)}}
        @keyframes glowPulse{0%,100%{box-shadow:0 0 12px rgba(87,108,188,0.4)}50%{box-shadow:0 0 28px rgba(87,108,188,0.85)}}
        @keyframes mascotBob{0%,100%{transform:translateY(0)}50%{transform:translateY(-7px)}}
        @keyframes mascotHappy{0%,100%{transform:translateY(0) scale(1)}35%{transform:translateY(-14px) scale(1.08)}65%{transform:translateY(-7px) scale(1.04)}}
        @keyframes mascotWrong{0%,100%{transform:rotate(0)}20%{transform:rotate(-7deg)}40%{transform:rotate(7deg)}60%{transform:rotate(-5deg)}80%{transform:rotate(5deg)}}
        @keyframes mascotCelebrate{0%,100%{transform:translateY(0) scale(1)}30%{transform:translateY(-18px) scale(1.12)}65%{transform:translateY(-9px) scale(1.06)}}
        @keyframes confettiFall{0%{transform:translateY(0) rotate(0);opacity:1}100%{transform:translateY(110vh) rotate(540deg);opacity:0}}
        @keyframes cardIn{from{opacity:0;transform:translateY(26px) scale(0.9)}to{opacity:1;transform:translateY(0) scale(1)}}
        @keyframes pulse{0%,100%{transform:scale(1)}50%{transform:scale(1.04)}}
        @keyframes timerBlink{0%,100%{opacity:1}50%{opacity:0.45}}
        @keyframes logoFloat{0%,100%{transform:translateY(0)}50%{transform:translateY(-6px)}}
        @keyframes mascotRun{0%{transform:translateY(0) rotate(-4deg)}50%{transform:translateY(-10px) rotate(4deg)}100%{transform:translateY(0) rotate(-4deg)}}
      `}</style>

      {showConfetti && <Confetti />}

      <div style={{ width: "100%", maxWidth: "460px", position: "relative" }}>

        {/* ══ START ══ */}
        {gameState === "start" && (
          <div style={{ textAlign: "center", animation: "fadeUp 0.65s ease" }}>
            {/* Logo */}
            <div style={{ display: "flex", justifyContent: "center", marginBottom: "20px" }}>
              <SirioLogo />
            </div>

            {/* Mascot */}
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", marginBottom: "10px" }}>
              <div style={{ animation: mascotMood === "running" ? "mascotRun 0.38s ease-in-out infinite" : "mascotBob 2.8s ease-in-out infinite" }}>
                <Mascot mood={mascotMood} size={130} />
              </div>
            </div>
            {/* Frase do mascote — inline, sem sobreposição */}
            <div style={{
              background: "rgba(25,55,109,0.7)", border: "1px solid rgba(87,108,188,0.3)",
              borderRadius: "12px", padding: "10px 16px",
              color: "#fff", fontSize: "14px", fontWeight: "600",
              marginBottom: "16px", lineHeight: 1.4,
            }}>
              💬 {mascotMood === "running" ? "Segura que eu tô aquecendo! 🏃" : "Bora descobrir a verdade? 👀"}
            </div>

            <h1 style={{ color: "#fff", fontSize: "22px", fontWeight: "900", lineHeight: 1.5, marginBottom: "16px" }}>
              Você é{"  "}🍫{"  "}<span style={{ color: "#E67E22" }}>Corredor Nutella</span>{"  "}ou{"  "}🌿{"  "}<span style={{ color: "#2ECC71" }}>Corredor Raiz</span>?
            </h1>
            <p style={{ color: "rgba(255,255,255,0.55)", fontSize: "14px", marginBottom: "28px", lineHeight: 1.6 }}>
              10 perguntas. Sem julgamento.<br />Tá, talvez um pouco. 😏
            </p>

            {/* Info cards */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "10px", marginBottom: "28px" }}>
              {[
                { icon: "❓", label: "10", sub: "Perguntas" },
                { icon: "⏱️", label: "15s", sub: "Por questão" },
                { icon: "🏃", label: "5", sub: "Perfis" },
              ].map((c) => (
                <div key={c.label} style={{
                  background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)",
                  borderRadius: "14px", padding: "14px 8px", backdropFilter: "blur(10px)",
                }}>
                  <div style={{ fontSize: "22px", marginBottom: "4px" }}>{c.icon}</div>
                  <div style={{ color: "#576CBC", fontWeight: "900", fontSize: "20px" }}>{c.label}</div>
                  <div style={{ color: "rgba(255,255,255,0.5)", fontSize: "11px" }}>{c.sub}</div>
                </div>
              ))}
            </div>

            <button onClick={startGame} style={{
              width: "100%", padding: "18px",
              background: "linear-gradient(135deg,#19376D,#576CBC)",
              border: "none", borderRadius: "16px", color: "#fff",
              fontSize: "18px", fontWeight: "800", cursor: "pointer",
              letterSpacing: "0.5px", animation: "glowPulse 2s ease-in-out infinite",
              boxShadow: "0 8px 24px rgba(87,108,188,0.4)",
            }}
              onMouseDown={(e) => (e.currentTarget.style.transform = "scale(0.97)")}
              onMouseUp={(e) => (e.currentTarget.style.transform = "scale(1)")}
            >
              🏃 DESCOBRIR AGORA
            </button>

            {/* Event info */}
            <p style={{ color: "rgba(255,255,255,0.3)", fontSize: "11px", marginTop: "16px" }}>
              2ª Corrida Sírio-Libanês · 29/MAR · Parque do Povo, SP
            </p>
          </div>
        )}

        {/* ══ PLAYING / FEEDBACK ══ */}
        {(gameState === "playing" || gameState === "feedback") && q && (
          <div>
            {/* Header row */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px" }}>
              <SirioLogo />
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <div style={{ color: "rgba(255,255,255,0.65)", fontSize: "14px", fontWeight: "700" }}>
                  {currentQ + 1}<span style={{ color: "rgba(255,255,255,0.3)" }}>/{TOTAL_Q}</span>
                </div>
                <button onClick={() => setIsMuted((m) => !m)} style={{
                  background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.15)",
                  borderRadius: "50%", width: "34px", height: "34px", cursor: "pointer",
                  color: "#fff", fontSize: "15px", display: "flex", alignItems: "center", justifyContent: "center",
                }}>
                  {isMuted ? "🔇" : "🔊"}
                </button>
              </div>
            </div>

            {/* Progress bar (questions) */}
            <div style={{ height: "4px", background: "rgba(255,255,255,0.08)", borderRadius: "2px", marginBottom: "8px", overflow: "hidden" }}>
              <div style={{
                height: "100%", borderRadius: "2px",
                width: `${((currentQ + (gameState === "feedback" ? 1 : 0)) / TOTAL_Q) * 100}%`,
                background: "linear-gradient(90deg,#19376D,#576CBC)",
                transition: "width 0.4s ease",
              }} />
            </div>

            {/* Timer bar */}
            <div style={{ height: "7px", background: "rgba(255,255,255,0.08)", borderRadius: "3.5px", marginBottom: "16px", overflow: "hidden" }}>
              <div style={{
                height: "100%", borderRadius: "3.5px",
                width: `${timerPct}%`,
                background: `linear-gradient(90deg,${timerColor},${timerColor}bb)`,
                boxShadow: `0 0 8px ${timerColor}88`,
                transition: "width 1s linear, background 0.3s ease",
              }} />
            </div>

            {/* Mascot + Question side by side */}
            <div style={{ display: "flex", gap: "14px", alignItems: "flex-start", marginBottom: "14px" }}>

              {/* Mascot column — sem bolha aqui */}
              <div style={{ flexShrink: 0, width: "110px", textAlign: "center", display: "flex", flexDirection: "column", alignItems: "center" }}>
                <div style={{
                  animation:
                    mascotMood === "running"   ? "mascotRun 0.38s ease-in-out infinite" :
                    mascotMood === "celebrate" ? "mascotCelebrate 0.7s ease" :
                    mascotMood === "happy"     ? "mascotHappy 0.6s ease" :
                    mascotMood === "wrong"     ? "mascotWrong 0.5s ease" :
                    mascotBounce               ? "mascotBob 1.4s ease-in-out" :
                    "none",
                }}>
                  <Mascot mood={mascotMood} size={110} />
                </div>
                <div style={{
                  color: timerColor, fontWeight: "900", fontSize: "22px",
                  transition: "color 0.3s",
                  animation: timeLeft <= 5 ? "timerBlink 0.7s ease infinite" : "none",
                }}>
                  {timeLeft}s
                </div>
              </div>

              {/* Question card */}
              <div style={{
                flex: 1,
                background: "rgba(255,255,255,0.05)",
                border: "1px solid rgba(255,255,255,0.1)",
                borderRadius: "18px", padding: "18px 16px",
                backdropFilter: "blur(10px)",
                minHeight: "95px", display: "flex", alignItems: "center",
                animation: qIn ? "fadeUp 0.35s ease" : "fadeDown 0.28s ease",
              }}>
                <p style={{ color: "#fff", fontSize: "16px", fontWeight: "700", lineHeight: 1.5 }}>
                  {q.question}
                </p>
              </div>
            </div>

            {/* Comentário do mascote — aparece após resposta, nunca sobrepõe nada */}
            <div style={{
              overflow: "hidden",
              maxHeight: bubbleVisible ? "80px" : "0px",
              opacity: bubbleVisible ? 1 : 0,
              transition: "max-height 0.35s ease, opacity 0.3s ease",
              marginBottom: bubbleVisible ? "10px" : "0px",
            }}>
              <div style={{
                background: "#19376D",
                border: "1px solid rgba(87,108,188,0.4)",
                borderRadius: "12px",
                padding: "10px 14px",
                color: "#fff",
                fontSize: "13px",
                fontWeight: "600",
                lineHeight: 1.4,
                display: "flex",
                alignItems: "center",
                gap: "10px",
              }}>
                <span style={{ fontSize: "20px", flexShrink: 0 }}>
                  {mascotMood === "happy" || mascotMood === "celebrate" ? "😄" : mascotMood === "wrong" ? "😅" : "💬"}
                </span>
                {mascotMsg}
              </div>
            </div>

            {/* Options */}
            <div style={{ display: "flex", flexDirection: "column", gap: "9px" }}>
              {q.options.map((opt, i) => (
                <button key={i}
                  onClick={() => handleAnswer(i)}
                  disabled={gameState === "feedback"}
                  style={{
                    padding: "13px 16px",
                    background: btnBg(i),
                    border: `1.5px solid ${btnBorder(i)}`,
                    borderRadius: "13px", color: gameState === "feedback" && i !== selectedIdx ? "rgba(255,255,255,0.4)" : "#fff",
                    fontSize: "14px", fontWeight: "600", textAlign: "left",
                    cursor: gameState === "playing" ? "pointer" : "default",
                    backdropFilter: "blur(8px)",
                    transition: "all 0.22s ease",
                    animation: optionsIn ? `staggerIn 0.35s ease ${i * 0.07}s both` : "none",
                    display: "flex", alignItems: "center", gap: "12px",
                    transform: gameState === "feedback" && i === selectedIdx ? "scale(1.02)" : "scale(1)",
                    boxShadow: gameState === "feedback" && i === selectedIdx ? "0 0 18px rgba(87,108,188,0.5)" : "none",
                  }}
                  onMouseEnter={(e) => { if (gameState === "playing") { e.currentTarget.style.background = "rgba(87,108,188,0.2)"; e.currentTarget.style.borderColor = "#576CBC"; e.currentTarget.style.transform = "translateX(5px)"; } }}
                  onMouseLeave={(e) => { if (gameState === "playing") { e.currentTarget.style.background = "rgba(255,255,255,0.06)"; e.currentTarget.style.borderColor = "rgba(255,255,255,0.12)"; e.currentTarget.style.transform = "translateX(0)"; } }}
                >
                  <span style={{
                    minWidth: "28px", height: "28px", borderRadius: "50%",
                    background: gameState === "feedback" && i === selectedIdx ? "#576CBC" : "rgba(255,255,255,0.1)",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: "13px", fontWeight: "800", flexShrink: 0, transition: "background 0.2s",
                  }}>
                    {["A", "B", "C", "D"][i]}
                  </span>
                  {opt.text}
                </button>
              ))}
            </div>

            {/* Next button (appears after delay) */}
            {gameState === "feedback" && showNext && (
              <button onClick={nextQuestion} style={{
                marginTop: "14px", width: "100%", padding: "15px",
                background: "linear-gradient(135deg,#19376D,#576CBC)",
                border: "none", borderRadius: "13px", color: "#fff",
                fontSize: "16px", fontWeight: "800", cursor: "pointer",
                animation: "pulse 1.5s ease-in-out infinite, fadeUp 0.3s ease",
                boxShadow: "0 4px 16px rgba(87,108,188,0.35)",
              }}>
                {currentQ + 1 >= TOTAL_Q ? "Ver Resultado →" : "Próxima →"}
              </button>
            )}
          </div>
        )}

        {/* ══ RESULT ══ */}
        {gameState === "result" && (
          <div style={{ textAlign: "center", animation: "fadeUp 0.6s ease", padding: "4px 0 24px" }}>

            {/* Logo */}
            <div style={{ display: "flex", justifyContent: "center", marginBottom: "16px" }}>
              <SirioLogo />
            </div>

            {/* Mascot celebrating */}
            <div style={{ display: "flex", justifyContent: "center", position: "relative", marginBottom: "12px" }}>
              <div style={{ position: "relative", animation: "mascotCelebrate 0.8s ease" }}>
                <Mascot mood="celebrate" size={140} />
              </div>
            </div>

            {/* Result level */}
            <div style={{
              background: result.bg,
              border: `2px solid ${result.border}`,
              borderRadius: "20px", padding: "18px",
              marginBottom: "20px",
              animation: "cardIn 0.5s ease both",
            }}>
              <div style={{ fontSize: "40px", marginBottom: "6px" }}>{result.emoji}</div>
              <div style={{ color: result.color, fontWeight: "900", fontSize: "22px", marginBottom: "4px" }}>{result.level}</div>
              <p style={{ color: "rgba(255,255,255,0.75)", fontSize: "13px", lineHeight: 1.5 }}>
                {result.mascotMsg}
              </p>
            </div>

            {/* Metric cards */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "10px", marginBottom: "16px" }}>
              {[
                { icon: "🌿", label: "RAIZ", value: `${totalRaiz}pts`, color: "#2ECC71", bg: "rgba(46,204,113,0.1)", border: "rgba(46,204,113,0.3)", delay: "0.1s" },
                { icon: "🍫", label: "NUTELLA", value: `${100 - totalRaiz}pts`, color: "#E67E22", bg: "rgba(230,126,34,0.1)", border: "rgba(230,126,34,0.3)", delay: "0.2s" },
                { icon: "⚡", label: "TEMPO MÉD.", value: `${avgTime}s`, color: "#87CEEB", bg: "rgba(135,206,235,0.1)", border: "rgba(135,206,235,0.3)", delay: "0.3s" },
              ].map((c) => (
                <div key={c.label} style={{
                  background: c.bg, border: `1.5px solid ${c.border}`,
                  borderRadius: "14px", padding: "14px 6px",
                  animation: `cardIn 0.5s ease ${c.delay} both`,
                }}>
                  <div style={{ fontSize: "20px", marginBottom: "5px" }}>{c.icon}</div>
                  <div style={{ color: c.color, fontWeight: "900", fontSize: "18px", marginBottom: "3px" }}>{c.value}</div>
                  <div style={{ color: "rgba(255,255,255,0.4)", fontSize: "9px", fontWeight: "700", letterSpacing: "0.5px" }}>{c.label}</div>
                </div>
              ))}
            </div>

            {/* Nutella ←→ Raiz bar */}
            <div style={{
              background: "rgba(255,255,255,0.05)",
              border: "1px solid rgba(255,255,255,0.1)",
              borderRadius: "14px", padding: "14px 16px", marginBottom: "20px",
              animation: "cardIn 0.5s ease 0.4s both",
            }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px" }}>
                <span style={{ color: "#E67E22", fontSize: "13px", fontWeight: "700" }}>🍫 Nutella</span>
                <span style={{ color: "#2ECC71", fontSize: "13px", fontWeight: "700" }}>Raiz 🌿</span>
              </div>
              <div style={{ height: "12px", borderRadius: "6px", background: "linear-gradient(90deg,#E67E22,#F39C12,#2ECC71)", position: "relative" }}>
                {/* Marker */}
                <div style={{
                  position: "absolute", top: "50%", left: `${raizPct}%`,
                  transform: "translate(-50%,-50%)",
                  width: "20px", height: "20px", borderRadius: "50%",
                  background: "#fff", border: "3px solid #0B2447",
                  boxShadow: "0 2px 8px rgba(0,0,0,0.4)",
                  transition: "left 0.6s ease",
                }} />
              </div>
              <div style={{ textAlign: "center", marginTop: "8px", color: "rgba(255,255,255,0.6)", fontSize: "12px" }}>
                {raizPct}% Raiz · {100 - raizPct}% Nutella
              </div>
            </div>

            {/* Humor phrase */}
            <div style={{
              background: "rgba(255,255,255,0.04)", borderRadius: "12px",
              padding: "12px 16px", marginBottom: "20px",
              color: "rgba(255,255,255,0.65)", fontSize: "13px", lineHeight: 1.6, fontStyle: "italic",
              border: "1px solid rgba(255,255,255,0.08)",
              animation: "cardIn 0.5s ease 0.5s both",
            }}>
              "{result.humor}"
            </div>

            {/* CTAs */}
            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>

              {/* Share */}
              <button onClick={() => {
                const text = `🏃 Fiz o Quiz da 2ª Corrida Sírio-Libanês!\n\nEu sou: ${result.emoji} ${result.level}\n\n"${result.humor}"\n\n🌿 ${raizPct}% Raiz · 🍫 ${100 - raizPct}% Nutella\n\nDescubra o seu: ${window.location.href}\n\n🏃 Inscreva-se: 29/MAR • Parque do Povo, SP\n${REGISTRATION_URL}`;
                if (navigator.share) {
                  navigator.share({ title: "Corredor Nutella ou Raiz?", text });
                } else {
                  navigator.clipboard?.writeText(text).then(() => alert("Resultado copiado! Cole onde quiser 📋"));
                }
              }} style={{
                width: "100%", padding: "16px",
                background: "linear-gradient(135deg,#19376D,#576CBC)",
                border: "none", borderRadius: "14px", color: "#fff",
                fontSize: "17px", fontWeight: "800", cursor: "pointer",
                animation: "glowPulse 2s ease-in-out infinite",
                boxShadow: "0 6px 20px rgba(87,108,188,0.4)",
              }}
                onMouseDown={(e) => (e.currentTarget.style.transform = "scale(0.97)")}
                onMouseUp={(e) => (e.currentTarget.style.transform = "scale(1)")}
              >
                📤 Compartilhar Resultado
              </button>

              {/* Registration CTA */}
              <a href={REGISTRATION_URL} target="_blank" rel="noopener noreferrer" style={{
                display: "block", width: "100%", padding: "15px",
                background: "linear-gradient(135deg,#1a6e36,#2ECC71)",
                border: "none", borderRadius: "14px", color: "#fff",
                fontSize: "16px", fontWeight: "800", cursor: "pointer",
                textDecoration: "none", textAlign: "center",
                boxShadow: "0 4px 16px rgba(46,204,113,0.35)",
              }}>
                🏃 Bora provar na pista? Inscreva-se
              </a>
              <p style={{ color: "rgba(255,255,255,0.3)", fontSize: "11px", marginTop: "-4px" }}>
                2ª Corrida Sírio-Libanês · 29/MAR · Parque do Povo, SP
              </p>

              {/* Play again */}
              <button onClick={() => {
                setGameState("start");
                setTotalRaiz(0);
                setAnswers([]);
                setCurrentQ(0);
                setMascotMood("idle");
                showBubble("Bora descobrir a verdade? 👀", "#19376D", 0);
                setBubbleVisible(true);
              }} style={{
                width: "100%", padding: "13px",
                background: "transparent",
                border: "1.5px solid rgba(255,255,255,0.2)",
                borderRadius: "14px", color: "rgba(255,255,255,0.7)",
                fontSize: "15px", fontWeight: "700", cursor: "pointer",
                transition: "all 0.2s",
              }}
                onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(255,255,255,0.07)"; e.currentTarget.style.borderColor = "rgba(255,255,255,0.35)"; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.borderColor = "rgba(255,255,255,0.2)"; }}
              >
                🔄 Jogar de Novo
              </button>
            </div>

            <div style={{ marginTop: "20px", paddingTop: "14px", borderTop: "1px solid rgba(255,255,255,0.07)", color: "rgba(255,255,255,0.2)", fontSize: "10px", letterSpacing: "1.5px" }}>
              2ª CORRIDA SÍRIO-LIBANÊS · 29/MAR · PARQUE DO POVO, SP
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
