/* Slides do hero da home. Será gerenciado pelo painel/PWA depois.
   image: foto do produto (idealmente PNG com fundo transparente ou foto em fundo branco)
   focus: posição do recorte dentro da janela redonda (object-position)
   specs: até 3 números em destaque */
window.HERO_SLIDES = [
  {
    kicker: 'Unidades hidráulicas',
    title: 'Potência hidráulica para o fundo do mar',
    text: 'Unidades diesel e a gasolina, com skid em alumínio e rodas para transporte.',
    image: 'assets/img/produtos/unidadeshidraulicas02.jpg',
    focus: '100% 50%',
    specs: [
      { value: '140', unit: 'bar', label: 'Pressão de trabalho' },
      { value: '36', unit: 'l/min', label: 'Vazão' },
      { value: '17', unit: 'CV', label: 'Motor diesel' }
    ],
    href: 'produtos.html#unidadeshidraulicas',
    cta: 'Ver unidades hidráulicas'
  },
  {
    kicker: 'Câmaras hiperbáricas',
    title: 'Conforto e segurança dentro da câmara',
    text: 'Ar condicionado, iluminação, máscaras de O2 e vigias com certificação ASME/PVHO.',
    image: 'assets/img/produtos/camaras01.jpg',
    focus: '20% 50%',
    specs: [
      { value: '16', unit: 'bar', label: 'Pressão máxima' },
      { value: '8', unit: '°C', label: 'Temperatura mínima' },
      { value: '44', unit: 'kg', label: 'Peso' }
    ],
    href: 'produtos.html#camarashiperbaricas',
    cta: 'Ver câmaras hiperbáricas'
  },
  {
    kicker: 'Unidades hidráulicas de grande porte',
    title: 'Para as operações mais pesadas',
    text: 'Diesel de 59 CV com múltiplos circuitos, skid em aço carbono e filtros completos.',
    image: 'assets/img/produtos/unidadeshidraulicas03.jpg',
    focus: '100% 50%',
    specs: [
      { value: '140', unit: 'bar', label: 'Pressão de trabalho' },
      { value: '148', unit: 'l/min', label: 'Vazão' },
      { value: '59', unit: 'CV', label: 'Motor MWM diesel' }
    ],
    href: 'produtos.html#unidadeshidraulicas',
    cta: 'Ver especificações'
  }
];
