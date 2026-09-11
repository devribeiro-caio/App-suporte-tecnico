# Guia de Customização de Sons de Notificação

## Introdução

O sistema de notificação sonora usa a **Web Audio API** para gerar sons sintetizados. Este guia mostra como customizar os sons para suas preferências.

---

## 1. Entendendo os Sons Atuais

### Som de Novo Chamado (Ding-dong)
```javascript
tocarTom(660, 0, 0.2, 0.4);      // Primeira nota: 660Hz, duração 0.2s, volume 0.4
tocarTom(880, 0.15, 0.4, 0.4);   // Segunda nota: 880Hz, começa em 0.15s, duração 0.4s, volume 0.4
```

**Parâmetros**:
- `frequencia`: Hertz (Hz) - quanto maior, mais agudo
- `inicio`: Tempo em segundos para começar
- `duracao`: Duração em segundos
- `volume`: Intensidade (0.0 a 1.0)

### Som de Atualização
```javascript
tocarTom(440, 0, 0.2, 0.1);      // Tom único: 440Hz, duração 0.2s, volume 0.1
```

---

## 2. Referência de Frequências Musicais

| Nota | Frequência (Hz) | Uso |
|------|-----------------|-----|
| C4 (Dó) | 262 | Grave, profundo |
| D4 (Ré) | 294 | Grave |
| E4 (Mi) | 330 | Médio-grave |
| F4 (Fá) | 349 | Médio-grave |
| G4 (Sol) | 392 | Médio |
| A4 (Lá) | 440 | Médio (padrão) |
| B4 (Si) | 494 | Médio-agudo |
| C5 (Dó) | 523 | Agudo |
| D5 (Ré) | 587 | Agudo |
| E5 (Mi) | 659 | Agudo |
| F5 (Fá) | 698 | Agudo |
| G5 (Sol) | 784 | Muito agudo |
| A5 (Lá) | 880 | Muito agudo |
| B5 (Si) | 988 | Muito agudo |

---

## 3. Exemplos de Customização

### Exemplo 1: Som Mais Suave (Menos Agressivo)

**Código Original**:
```javascript
tocarTom(660, 0, 0.2, 0.4);
tocarTom(880, 0.15, 0.4, 0.4);
```

**Versão Suave**:
```javascript
tocarTom(440, 0, 0.3, 0.2);      // Tom mais grave e volume reduzido
tocarTom(550, 0.2, 0.3, 0.2);    // Segunda nota mais próxima
```

### Exemplo 2: Som Mais Agudo e Rápido

**Código Original**:
```javascript
tocarTom(660, 0, 0.2, 0.4);
tocarTom(880, 0.15, 0.4, 0.4);
```

**Versão Aguda e Rápida**:
```javascript
tocarTom(880, 0, 0.1, 0.5);      // Mais agudo e rápido
tocarTom(1100, 0.08, 0.15, 0.5); // Segunda nota ainda mais aguda
```

### Exemplo 3: Som de Aviso (Tipo Alarme)

**Código**:
```javascript
tocarTom(800, 0, 0.1, 0.4);
tocarTom(600, 0.1, 0.1, 0.4);
tocarTom(800, 0.2, 0.1, 0.4);
```

### Exemplo 4: Som Melódico (Tipo Sino)

**Código**:
```javascript
tocarTom(523, 0, 0.3, 0.3);      // C5
tocarTom(659, 0.2, 0.3, 0.3);    // E5
tocarTom(784, 0.4, 0.4, 0.3);    // G5
```

---

## 4. Como Implementar Customização

### Passo 1: Abra o arquivo `frontend/src/pages/Dashboard/DashboardPage.jsx`

### Passo 2: Encontre a função `tocarSomNotificacao()`

```javascript
function tocarSomNotificacao() {
  try {
    const ctx = getAudioContext();
    
    function tocarTom(frequencia, inicio, duracao, volume = 0.3) {
      // ... código ...
    }

    // EDITE AQUI:
    tocarTom(660, 0, 0.2, 0.4);
    tocarTom(880, 0.15, 0.4, 0.4);
  } catch (e) {
    console.warn("[Som] Não foi possível tocar notificação:", e);
  }
}
```

### Passo 3: Substitua pelos valores desejados

### Passo 4: Salve e teste

---

## 5. Tipos de Ondas

A Web Audio API suporta diferentes tipos de ondas:

| Tipo | Descrição | Uso |
|------|-----------|-----|
| `sine` | Onda senoidal suave | Som natural, melódico |
| `square` | Onda quadrada | Som eletrônico, retrô |
| `sawtooth` | Onda dente de serra | Som áspero, sintetizador |
| `triangle` | Onda triangular | Som intermediário |

**Como usar**:
```javascript
osc.type = "sine";      // Padrão
osc.type = "square";    // Mais eletrônico
osc.type = "sawtooth";  // Mais áspero
```

---

## 6. Alternativa: Usar Arquivo de Áudio

Se preferir usar um arquivo de áudio em vez de síntese:

```javascript
function tocarSomNotificacao() {
  try {
    const audio = new Audio('/sounds/notification.mp3');
    audio.volume = 0.5;
    audio.play();
  } catch (e) {
    console.warn("[Som] Não foi possível tocar notificação:", e);
  }
}
```

**Passos**:
1. Coloque o arquivo de áudio em `frontend/public/sounds/notification.mp3`
2. Substitua a função acima
3. Salve e teste

---

## 7. Testando Suas Customizações

### Método 1: Via Console do Navegador

1. Abra DevTools (F12)
2. Vá para a aba "Console"
3. Cole este código:

```javascript
// Copie as funções do seu código
let audioCtx = null;

function getAudioContext() {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  }
  if (audioCtx.state === "suspended") {
    audioCtx.resume();
  }
  return audioCtx;
}

function tocarSomNotificacao() {
  const ctx = getAudioContext();
  
  function tocarTom(frequencia, inicio, duracao, volume = 0.3) {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    
    osc.type = "sine";
    osc.frequency.value = frequencia;
    
    gain.gain.setValueAtTime(0, ctx.currentTime + inicio);
    gain.gain.linearRampToValueAtTime(volume, ctx.currentTime + inicio + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + inicio + duracao);
    
    osc.connect(gain);
    gain.connect(ctx.destination);
    
    osc.start(ctx.currentTime + inicio);
    osc.stop(ctx.currentTime + inicio + duracao);
  }

  // TESTE AQUI:
  tocarTom(660, 0, 0.2, 0.4);
  tocarTom(880, 0.15, 0.4, 0.4);
}

// Chame a função
tocarSomNotificacao();
```

4. Pressione Enter e ouça o som
5. Ajuste os valores e teste novamente

### Método 2: Criar Arquivo de Teste

Crie `frontend/test-sound.html`:

```html
<!DOCTYPE html>
<html>
<head>
  <title>Teste de Som</title>
</head>
<body>
  <h1>Teste de Som de Notificação</h1>
  
  <button onclick="tocarSomNotificacao()">Tocar Som Notificação</button>
  <button onclick="tocarSomAtualizacao()">Tocar Som Atualização</button>
  
  <hr>
  
  <h2>Customizar Som</h2>
  <label>Frequência 1: <input type="number" id="freq1" value="660" min="100" max="2000"></label><br>
  <label>Duração 1: <input type="number" id="dur1" value="0.2" min="0.1" max="1" step="0.1"></label><br>
  <label>Volume 1: <input type="number" id="vol1" value="0.4" min="0" max="1" step="0.1"></label><br>
  <br>
  <label>Frequência 2: <input type="number" id="freq2" value="880" min="100" max="2000"></label><br>
  <label>Duração 2: <input type="number" id="dur2" value="0.4" min="0.1" max="1" step="0.1"></label><br>
  <label>Volume 2: <input type="number" id="vol2" value="0.4" min="0" max="1" step="0.1"></label><br>
  <br>
  <button onclick="tocarCustomizado()">Tocar Som Customizado</button>

  <script>
    let audioCtx = null;

    function getAudioContext() {
      if (!audioCtx) {
        audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      }
      if (audioCtx.state === "suspended") {
        audioCtx.resume();
      }
      return audioCtx;
    }

    function tocarTom(frequencia, inicio, duracao, volume = 0.3) {
      const ctx = getAudioContext();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      
      osc.type = "sine";
      osc.frequency.value = frequencia;
      
      gain.gain.setValueAtTime(0, ctx.currentTime + inicio);
      gain.gain.linearRampToValueAtTime(volume, ctx.currentTime + inicio + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + inicio + duracao);
      
      osc.connect(gain);
      gain.connect(ctx.destination);
      
      osc.start(ctx.currentTime + inicio);
      osc.stop(ctx.currentTime + inicio + duracao);
    }

    function tocarSomNotificacao() {
      tocarTom(660, 0, 0.2, 0.4);
      tocarTom(880, 0.15, 0.4, 0.4);
    }

    function tocarSomAtualizacao() {
      tocarTom(440, 0, 0.2, 0.1);
    }

    function tocarCustomizado() {
      const freq1 = parseFloat(document.getElementById('freq1').value);
      const dur1 = parseFloat(document.getElementById('dur1').value);
      const vol1 = parseFloat(document.getElementById('vol1').value);
      
      const freq2 = parseFloat(document.getElementById('freq2').value);
      const dur2 = parseFloat(document.getElementById('dur2').value);
      const vol2 = parseFloat(document.getElementById('vol2').value);
      
      tocarTom(freq1, 0, dur1, vol1);
      tocarTom(freq2, dur1 + 0.05, dur2, vol2);
    }
  </script>
</body>
</html>
```

Abra este arquivo no navegador e teste diferentes combinações!

---

## 8. Dicas de Design de Som

### Para Notificações Não-Intrusivas:
- Use frequências médias (400-600 Hz)
- Volume baixo (0.1-0.2)
- Duração curta (0.1-0.2s)

### Para Notificações Alertas:
- Use frequências altas (800-1000 Hz)
- Volume médio (0.3-0.5)
- Duração média (0.2-0.4s)

### Para Notificações Melódicas:
- Use 2-3 notas diferentes
- Frequências espaçadas (ex: 440, 550, 660)
- Volume consistente (0.2-0.3)

---

## 9. Troubleshooting

### Som não toca:
- Verifique se o navegador permite áudio
- Clique na página para desbloquear áudio
- Verifique volume do computador

### Som muito alto/baixo:
- Ajuste o parâmetro `volume` (0.0 a 1.0)
- Verifique volume do navegador

### Som distorcido:
- Reduza o volume
- Reduza a duração
- Use onda `sine` em vez de `sawtooth`

---

## 10. Referências

- [Web Audio API - MDN](https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API)
- [OscillatorNode - MDN](https://developer.mozilla.org/en-US/docs/Web/API/OscillatorNode)
- [Tabela de Frequências Musicais](https://en.wikipedia.org/wiki/Scientific_pitch_notation)

---

## Conclusão

Com este guia, você pode:
- ✅ Entender como o sistema de som funciona
- ✅ Customizar os sons para suas preferências
- ✅ Testar diferentes combinações
- ✅ Usar arquivos de áudio se preferir
- ✅ Criar notificações sonoras únicas para seu sistema
