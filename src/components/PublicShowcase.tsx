import React, { useState } from 'react';
import { ArrowUpRight, Bike, CheckCircle2, Cog, Menu, MessageCircle, Wrench, X } from 'lucide-react';
import { api } from '../lib/api';

interface PublicShowcaseProps {
  onNavigate: (path: string) => void;
}

const REQUEST_KINDS = [
  'Orçamento de manutenção',
  'Revisão de bicicleta',
  'Consultar produto',
  'Bicicleta infantil',
] as const;

export function PublicShowcase({ onNavigate }: PublicShowcaseProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [kind, setKind] = useState<string>(REQUEST_KINDS[0]);
  const [model, setModel] = useState('');
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [submittedWhatsAppUrl, setSubmittedWhatsAppUrl] = useState<string | null>(null);
  const [heroImgFailed, setHeroImgFailed] = useState(false);
  const [workshopImgFailed, setWorkshopImgFailed] = useState(false);
  const [tileFailed, setTileFailed] = useState<Record<string, boolean>>({});

  function selectInterestAndScroll(selectedKind: string) {
    setKind(selectedKind);
    setMenuOpen(false);
    const el = document.getElementById('orcamento');
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErrorMsg(null);

    const trimmedName = name.trim();
    const trimmedPhone = phone.trim();
    if (!trimmedName || !trimmedPhone) {
      setErrorMsg('Preencha seu nome e número de WhatsApp para continuar.');
      return;
    }

    setSubmitting(true);
    try {
      await api('/requests', {
        method: 'POST',
        body: JSON.stringify({
          name: trimmedName,
          phone: trimmedPhone,
          kind,
          brand: '',
          model: model.trim(),
          message: message.trim(),
        }),
      });

      const text = encodeURIComponent(
        `Olá! Acabei de enviar uma solicitação pelo site da Vale Bike. Meu nome é ${trimmedName}. ${kind}.${
          model.trim() ? ` Minha bike: ${model.trim()}.` : ''
        } ${message.trim()}`
      );
      setSubmittedWhatsAppUrl(`https://wa.me/5513996059053?text=${text}`);
      setName('');
      setPhone('');
      setModel('');
      setMessage('');
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Não foi possível enviar sua solicitação.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#10110f] text-[#f3f4ef]">
      {/* Top Bar Contract: Zone 1 Brand | Zone 2 4 Nav Links | Zone 3 1 Primary CTA */}
      <header className="fixed top-0 left-0 right-0 z-40 h-20 border-b border-white/15 bg-[#10110f]/85 backdrop-blur-md">
        <div className="mx-auto flex h-full max-w-[1440px] items-center justify-between gap-8 px-6 md:px-12">
          <a
            href="/"
            onClick={(e) => {
              e.preventDefault();
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            className="flex shrink-0 items-center gap-2.5 whitespace-nowrap font-display text-xl font-extrabold tracking-[0.08em] text-[#f3f4ef]"
          >
            <span className="grid h-7 w-7 -skew-x-12 place-items-center border border-[#c5ef3a] font-display text-lg font-extrabold text-[#c5ef3a]">
              V
            </span>
            <span>
              VALE <span className="text-[#c5ef3a]">BIKE</span>
            </span>
          </a>

          <nav className="hidden items-center gap-8 text-sm font-medium text-[#d1d3cd] md:flex">
            <a
              href="#servicos"
              className="whitespace-nowrap shrink-0 transition-colors hover:text-[#c5ef3a] hover:underline hover:underline-offset-4"
            >
              Serviços
            </a>
            <a
              href="#sobre"
              className="whitespace-nowrap shrink-0 transition-colors hover:text-[#c5ef3a] hover:underline hover:underline-offset-4"
            >
              A oficina
            </a>
            <a
              href="#loja"
              className="whitespace-nowrap shrink-0 transition-colors hover:text-[#c5ef3a] hover:underline hover:underline-offset-4"
            >
              Loja
            </a>
            <button
              type="button"
              onClick={() => onNavigate('/gestao')}
              className="whitespace-nowrap shrink-0 cursor-pointer transition-colors hover:text-[#c5ef3a] hover:underline hover:underline-offset-4"
            >
              Gestão
            </button>
          </nav>

          <div className="flex shrink-0 items-center gap-3">
            <a
              href="#orcamento"
              className="hidden h-11 items-center gap-2 whitespace-nowrap shrink-0 bg-[#ff6b25] px-5 text-xs font-bold uppercase tracking-wider text-[#17130f] transition-transform duration-150 hover:-translate-y-0.5 md:inline-flex"
            >
              Pedir orçamento
              <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
            </a>
            <button
              type="button"
              onClick={() => setMenuOpen((prev) => !prev)}
              aria-label={menuOpen ? 'Fechar menu' : 'Abrir menu'}
              className="inline-flex h-11 w-11 items-center justify-center border border-white/20 text-[#f3f4ef] md:hidden"
            >
              {menuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>

        {menuOpen && (
          <div className="border-b border-white/15 bg-[#141612] px-6 py-5 md:hidden">
            <div className="flex flex-col gap-4 text-sm font-medium text-[#f3f4ef]">
              <a href="#servicos" onClick={() => setMenuOpen(false)} className="py-1 hover:text-[#c5ef3a]">
                Serviços
              </a>
              <a href="#sobre" onClick={() => setMenuOpen(false)} className="py-1 hover:text-[#c5ef3a]">
                A oficina
              </a>
              <a href="#loja" onClick={() => setMenuOpen(false)} className="py-1 hover:text-[#c5ef3a]">
                Loja
              </a>
              <button
                type="button"
                onClick={() => {
                  setMenuOpen(false);
                  onNavigate('/gestao');
                }}
                className="py-1 text-left text-[#c5ef3a]"
              >
                Gestão da oficina
              </button>
              <a
                href="#orcamento"
                onClick={() => setMenuOpen(false)}
                className="mt-2 inline-flex h-11 items-center justify-center gap-2 bg-[#ff6b25] px-5 text-xs font-bold uppercase tracking-wider text-[#17130f]"
              >
                Pedir orçamento
                <ArrowUpRight className="h-4 w-4" />
              </a>
            </div>
          </div>
        )}
      </header>

      <main>
        {/* Hero Section */}
        <section className="relative flex min-h-[760px] items-center overflow-hidden bg-[#171916] pt-20">
          {!heroImgFailed ? (
            <img
              src="/src/assets/images/vale_hero_bike_1795048263995.jpg"
              alt="Bicicleta gravel preta em estúdio da Vale Bike"
              referrerPolicy="no-referrer"
              onError={() => setHeroImgFailed(true)}
              className="absolute inset-0 h-full w-full object-cover object-center opacity-80"
            />
          ) : (
            <div className="absolute inset-0 bg-gradient-to-br from-[#1d201a] via-[#10110f] to-[#191c15]" />
          )}

          <div
            className="absolute inset-0 bg-gradient-to-r from-[#10110f]/95 via-[#10110f]/75 to-[#10110f]/20"
            aria-hidden="true"
          />
          <div
            className="absolute inset-0 bg-gradient-to-t from-[#10110f] via-transparent to-[#10110f]/45"
            aria-hidden="true"
          />

          <div className="relative z-10 mx-auto w-full max-w-[1440px] px-6 py-20 md:px-12 lg:px-20">
            <div className="max-w-3xl">
              <p className="mb-5 text-xs font-medium tracking-[0.18em] text-[#c5ef3a] uppercase">
                Oficina · Peças · Bicicletas · Registro, SP
              </p>

              <h1 className="font-display text-[clamp(5.5rem,14vw,12rem)] leading-[0.82] font-extrabold tracking-tight text-[#f3f4ef] [text-wrap:balance]">
                VALE
                <br />
                <span className="text-[#c5ef3a]">BIKE</span>
                <span className="text-[#ff6b25]">.</span>
              </h1>

              <div className="mt-10 flex flex-col items-start gap-8 sm:flex-row sm:items-center sm:gap-14">
                <div>
                  <p className="font-display text-2xl font-semibold tracking-wide text-[#f3f4ef]">
                    Aventura sobre duas rodas.
                  </p>
                  <p className="mt-1 text-sm text-[#c1c3bc]">
                    Seu próximo pedal começa com a bike em dia.
                  </p>
                </div>

                <a
                  href="#orcamento"
                  className="inline-flex h-12 shrink-0 items-center gap-3 whitespace-nowrap bg-[#c5ef3a] px-6 text-xs font-bold uppercase tracking-wider text-[#151810] transition-transform duration-150 hover:-translate-y-0.5"
                >
                  Agendar serviço
                  <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
                </a>
              </div>
            </div>

            <div className="mt-16 flex items-center justify-between border-t border-white/10 pt-6 text-xs tracking-[0.15em] text-[#969b90]">
              <a href="#servicos" className="transition-colors hover:text-[#c5ef3a]">
                Role para explorar serviços
              </a>
              <span className="hidden font-mono tabular-nums sm:inline">24°29&apos; S · 47°50&apos; W</span>
            </div>
          </div>
        </section>

        {/* Ribbon Ticker */}
        <div className="flex h-13 items-center overflow-hidden bg-[#c5ef3a] text-[#151810]">
          <div className="animate-marquee flex min-w-max items-center whitespace-nowrap font-display text-sm font-bold tracking-[0.18em] uppercase">
            <span className="px-6">Manutenção precisa</span>
            <span aria-hidden="true">·</span>
            <span className="px-6">Peças de qualidade</span>
            <span aria-hidden="true">·</span>
            <span className="px-6">Prontos para o próximo pedal</span>
            <span aria-hidden="true">·</span>
            <span className="px-6">Registro, Vale do Ribeira</span>
            <span aria-hidden="true">·</span>
            <span className="px-6">Manutenção precisa</span>
            <span aria-hidden="true">·</span>
            <span className="px-6">Peças de qualidade</span>
            <span aria-hidden="true">·</span>
            <span className="px-6">Prontos para o próximo pedal</span>
            <span aria-hidden="true">·</span>
            <span className="px-6">Registro, Vale do Ribeira</span>
          </div>
        </div>

        {/* Section 01: Services */}
        <section id="servicos" className="mx-auto max-w-[1440px] px-6 py-24 md:px-12 lg:px-20">
          <div className="mb-12 flex flex-col justify-between gap-6 md:flex-row md:items-end">
            <div>
              <p className="mb-3 text-xs font-semibold tracking-[0.16em] text-[#c5ef3a] uppercase">
                01. O que fazemos
              </p>
              <h2 className="font-display text-5xl leading-[0.92] font-bold tracking-tight text-[#f3f4ef] md:text-7xl [text-wrap:balance]">
                Mais pedal.
                <br />
                <span className="text-[#c5ef3a]">Menos preocupação.</span>
              </h2>
            </div>
            <p className="max-w-xs text-sm leading-relaxed text-[#969b90]">
              Cuidado técnico de verdade para você aproveitar cada quilômetro na cidade ou na estrada.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <article className="flex min-h-[280px] flex-col justify-between border border-white/10 bg-[#181a17] p-7 transition-colors hover:border-[#c5ef3a]/50">
              <div>
                <div className="mb-6 flex items-center justify-between text-xs font-mono tabular-nums text-[#969b90]">
                  <span>01</span>
                  <Wrench className="h-5 w-5 text-[#c5ef3a]" aria-hidden="true" />
                </div>
                <h3 className="font-display text-3xl font-semibold text-[#f3f4ef]">
                  Oficina especializada
                </h3>
                <p className="mt-3 text-sm leading-relaxed text-[#969b90]">
                  Revisão completa, regulagem de câmbio e freios, sangria e manutenção para sua bike rodar redonda.
                </p>
              </div>
              <button
                type="button"
                onClick={() => selectInterestAndScroll('Orçamento de manutenção')}
                className="mt-6 inline-flex items-center gap-2 text-left text-xs font-bold tracking-wider text-[#c5ef3a] uppercase hover:underline hover:underline-offset-4"
              >
                Solicitar revisão
                <ArrowUpRight className="h-3.5 w-3.5" aria-hidden="true" />
              </button>
            </article>

            <article className="flex min-h-[280px] flex-col justify-between border border-white/10 bg-[#181a17] p-7 transition-colors hover:border-[#c5ef3a]/50">
              <div>
                <div className="mb-6 flex items-center justify-between text-xs font-mono tabular-nums text-[#969b90]">
                  <span>02</span>
                  <Cog className="h-5 w-5 text-[#c5ef3a]" aria-hidden="true" />
                </div>
                <h3 className="font-display text-3xl font-semibold text-[#f3f4ef]">
                  Peças &amp; acessórios
                </h3>
                <p className="mt-3 text-sm leading-relaxed text-[#969b90]">
                  Componentes, câmaras, pastilhas, correntes e capacetes selecionados para o seu próximo pedal.
                </p>
              </div>
              <button
                type="button"
                onClick={() => selectInterestAndScroll('Consultar produto')}
                className="mt-6 inline-flex items-center gap-2 text-left text-xs font-bold tracking-wider text-[#c5ef3a] uppercase hover:underline hover:underline-offset-4"
              >
                Consultar disponibilidade
                <ArrowUpRight className="h-3.5 w-3.5" aria-hidden="true" />
              </button>
            </article>

            <article className="flex min-h-[280px] flex-col justify-between border border-white/10 bg-[#181a17] p-7 transition-colors hover:border-[#c5ef3a]/50">
              <div>
                <div className="mb-6 flex items-center justify-between text-xs font-mono tabular-nums text-[#969b90]">
                  <span>03</span>
                  <Bike className="h-5 w-5 text-[#c5ef3a]" aria-hidden="true" />
                </div>
                <h3 className="font-display text-3xl font-semibold text-[#f3f4ef]">
                  Bikes para começar
                </h3>
                <p className="mt-3 text-sm leading-relaxed text-[#969b90]">
                  Modelos infantis e bicicletas montadas e ajustadas sob medida para descobrir novos caminhos.
                </p>
              </div>
              <button
                type="button"
                onClick={() => selectInterestAndScroll('Bicicleta infantil')}
                className="mt-6 inline-flex items-center gap-2 text-left text-xs font-bold tracking-wider text-[#c5ef3a] uppercase hover:underline hover:underline-offset-4"
              >
                Encontrar minha bike
                <ArrowUpRight className="h-3.5 w-3.5" aria-hidden="true" />
              </button>
            </article>
          </div>
        </section>

        {/* Section 02: Workshop Feature */}
        <section id="sobre" className="relative overflow-hidden border-y border-white/10 bg-[#141612]">
          <div className="mx-auto grid max-w-[1440px] grid-cols-1 items-stretch lg:grid-cols-2">
            <div className="relative min-h-[360px] lg:min-h-[560px]">
              {!workshopImgFailed ? (
                <img
                  src="/src/assets/images/vale_workshop_bench_1795048264594.jpg"
                  alt="Bancada de oficina especializada da Vale Bike com ferramentas de precisão"
                  referrerPolicy="no-referrer"
                  onError={() => setWorkshopImgFailed(true)}
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center bg-[#181a17]">
                  <Wrench className="h-12 w-12 text-[#c5ef3a]/50" />
                </div>
              )}
              <div
                className="absolute inset-0 bg-gradient-to-t from-[#10110f]/75 via-transparent to-transparent lg:bg-gradient-to-r lg:from-transparent lg:to-[#141612]"
                aria-hidden="true"
              />
            </div>

            <div className="flex flex-col justify-center px-6 py-16 md:px-12 lg:px-16 lg:py-24">
              <p className="mb-4 text-xs font-semibold tracking-[0.16em] text-[#c5ef3a] uppercase">
                02. Feita para o caminho
              </p>
              <h2 className="font-display text-5xl leading-[0.92] font-bold tracking-tight text-[#f3f4ef] md:text-6xl [text-wrap:balance]">
                Uma oficina que entende{' '}
                <span className="text-[#c5ef3a]">de pedal.</span>
              </h2>
              <p className="mt-6 max-w-md text-sm leading-relaxed text-[#c2c5bd]">
                Da primeira bicicleta ao próximo desafio. A Vale Bike cuida da sua companheira de estrada com atenção, transparência no orçamento e paixão por duas rodas.
              </p>

              <div className="mt-8">
                <a
                  href="#orcamento"
                  className="inline-flex h-11 items-center gap-3 whitespace-nowrap border border-white/30 px-6 text-xs font-bold uppercase tracking-wider text-[#f3f4ef] transition-colors hover:border-[#c5ef3a] hover:text-[#c5ef3a]"
                >
                  Converse com a equipe
                  <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
                </a>
              </div>

              <div className="mt-12 border-t border-white/10 pt-6 text-xs tracking-[0.14em] text-[#969b90]">
                <span>Vale do Ribeira</span>
                <span className="mx-2" aria-hidden="true">
                  ·
                </span>
                <strong className="font-semibold text-[#c5ef3a]">Registro, SP</strong>
              </div>
            </div>
          </div>
        </section>

        {/* Section 03: Shop Categories */}
        <section id="loja" className="mx-auto max-w-[1440px] px-6 py-24 md:px-12 lg:px-20">
          <div className="mb-12 flex flex-col justify-between gap-6 md:flex-row md:items-end">
            <div>
              <p className="mb-3 text-xs font-semibold tracking-[0.16em] text-[#c5ef3a] uppercase">
                03. Seu próximo pedal
              </p>
              <h2 className="font-display text-5xl leading-[0.92] font-bold tracking-tight text-[#f3f4ef] md:text-7xl [text-wrap:balance]">
                Equipamento{' '}
                <span className="text-[#c5ef3a]">que acompanha.</span>
              </h2>
            </div>

            <button
              type="button"
              onClick={() => selectInterestAndScroll('Consultar produto')}
              className="inline-flex shrink-0 items-center gap-2 whitespace-nowrap text-xs font-bold tracking-wider text-[#c5ef3a] uppercase hover:underline hover:underline-offset-4"
            >
              Consultar produtos
              <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            {[
              {
                key: 'protection',
                kicker: '01. Proteção',
                title: 'Segurança em primeiro lugar.',
                img: '/src/assets/images/vale_tile_protection_1795048264676.jpg',
                alt: 'Capacete e luvas de ciclismo em superfície escura',
                kind: 'Consultar produto',
              },
              {
                key: 'components',
                kicker: '02. Componentes',
                title: 'Peças para ir mais longe.',
                img: '/src/assets/images/vale_tile_components_1795048266292.jpg',
                alt: 'Cassete, corrente e câmbio traseiro de bicicleta',
                kind: 'Consultar produto',
              },
              {
                key: 'kids',
                kicker: '03. Infantil',
                title: 'Pequenos grandes pedais.',
                img: '/src/assets/images/vale_tile_kidsbike_1795048265779.jpg',
                alt: 'Bicicleta infantil moderna em tons verde lima e grafite',
                kind: 'Bicicleta infantil',
              },
            ].map((tile) => (
              <button
                key={tile.key}
                type="button"
                onClick={() => selectInterestAndScroll(tile.kind)}
                className="group relative flex h-80 flex-col justify-between overflow-hidden border border-white/10 bg-[#181a17] p-6 text-left"
              >
                {!tileFailed[tile.key] ? (
                  <img
                    src={tile.img}
                    alt={tile.alt}
                    referrerPolicy="no-referrer"
                    onError={() => setTileFailed((prev) => ({ ...prev, [tile.key]: true }))}
                    className="absolute inset-0 h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                  />
                ) : (
                  <div className="absolute inset-0 bg-gradient-to-br from-[#20231e] to-[#10110f]" />
                )}
                <div
                  className="absolute inset-0 bg-gradient-to-t from-[#10110f]/95 via-[#10110f]/45 to-[#10110f]/25"
                  aria-hidden="true"
                />
                <span className="relative z-10 text-xs font-semibold tracking-[0.14em] text-[#c5ef3a] uppercase">
                  {tile.kicker}
                </span>
                <strong className="relative z-10 font-display text-3xl leading-none font-bold text-[#f3f4ef]">
                  {tile.title}
                </strong>
              </button>
            ))}
          </div>

          <p className="mt-5 text-xs text-[#969b90]">
            Disponibilidade e tamanhos sob consulta. Nossa equipe ajuda você a encontrar a peça certa.
          </p>
        </section>

        {/* Quote Contrast Band */}
        <section className="bg-[#c5ef3a] px-6 py-16 text-[#13150f] md:px-12 lg:px-20">
          <div className="mx-auto flex max-w-[1440px] flex-col items-start justify-between gap-8 md:flex-row md:items-center">
            <p className="font-display text-4xl leading-[0.94] font-extrabold tracking-tight md:text-6xl [text-wrap:balance]">
              Sua próxima aventura merece uma bike{' '}
              <span className="text-[#455f12]">pronta.</span>
            </p>
            <a
              href="#orcamento"
              className="inline-flex shrink-0 items-center gap-2 border-b-2 border-[#13150f] pb-2 text-xs font-bold tracking-wider uppercase transition-opacity hover:opacity-75"
            >
              Vamos deixar ela em dia
              <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
            </a>
          </div>
        </section>

        {/* Section 04: Quote Request Form */}
        <section
          id="orcamento"
          className="mx-auto grid max-w-[1440px] grid-cols-1 gap-12 px-6 py-24 md:px-12 lg:grid-cols-2 lg:gap-20 lg:px-20"
        >
          <div>
            <p className="mb-4 text-xs font-semibold tracking-[0.16em] text-[#c5ef3a] uppercase">
              04. Vamos conversar
            </p>
            <h2 className="font-display text-5xl leading-[0.94] font-bold tracking-tight text-[#f3f4ef] md:text-6xl [text-wrap:balance]">
              Conta pra gente o que sua bike{' '}
              <span className="text-[#c5ef3a]">precisa.</span>
            </h2>
            <p className="mt-5 max-w-md text-sm leading-relaxed text-[#969b90]">
              Sua solicitação entra direto no painel da oficina Vale Bike para avaliação técnica e retorno rápido.
            </p>

            <div className="mt-10 flex flex-col gap-2 text-xs tracking-[0.12em] text-[#bec1b7]">
              <span>Registro · Vale do Ribeira · SP</span>
              <a
                href="https://instagram.com/valebike.oficial"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-[#c5ef3a] hover:underline hover:underline-offset-4"
              >
                @valebike.oficial
                <ArrowUpRight className="h-3.5 w-3.5" aria-hidden="true" />
              </a>
            </div>
          </div>

          <div className="border border-white/10 bg-[#181a17] p-7 md:p-9">
            {submittedWhatsAppUrl ? (
              <div className="flex flex-col gap-5 py-4">
                <div className="flex items-center gap-3 text-[#c5ef3a]">
                  <CheckCircle2 className="h-6 w-6 shrink-0" aria-hidden="true" />
                  <h3 className="font-display text-3xl font-bold text-[#f3f4ef]">
                    Solicitação registrada!
                  </h3>
                </div>
                <p className="text-sm leading-relaxed text-[#c2c5bd]">
                  Nossa equipe já recebeu os dados da sua bike no painel da oficina. Se preferir, continue a conversa agora pelo WhatsApp.
                </p>
                <div className="flex flex-wrap gap-3 pt-2">
                  <a
                    href={submittedWhatsAppUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex h-11 items-center gap-2 bg-[#c5ef3a] px-5 text-xs font-bold uppercase tracking-wider text-[#151810]"
                  >
                    <MessageCircle className="h-4 w-4" aria-hidden="true" />
                    Abrir WhatsApp da loja
                  </a>
                  <button
                    type="button"
                    onClick={() => setSubmittedWhatsAppUrl(null)}
                    className="inline-flex h-11 items-center border border-white/25 px-5 text-xs font-bold uppercase tracking-wider text-[#f3f4ef] hover:border-[#c5ef3a]"
                  >
                    Enviar outro pedido
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="grid gap-4">
                <label className="grid gap-2 text-xs font-medium text-[#b9bcb4]">
                  Seu nome
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Como podemos te chamar?"
                    className="h-11 border border-[#343730] bg-[#10110f] px-3.5 text-sm text-[#f3f4ef] placeholder-[#696e64] outline-none focus:border-[#c5ef3a]"
                  />
                </label>

                <label className="grid gap-2 text-xs font-medium text-[#b9bcb4]">
                  WhatsApp
                  <input
                    type="tel"
                    required
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="(13) 9 0000-0000"
                    className="h-11 border border-[#343730] bg-[#10110f] px-3.5 text-sm text-[#f3f4ef] placeholder-[#696e64] outline-none focus:border-[#c5ef3a]"
                  />
                </label>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <label className="grid gap-2 text-xs font-medium text-[#b9bcb4]">
                    O que você precisa?
                    <select
                      value={kind}
                      onChange={(e) => setKind(e.target.value)}
                      className="h-11 border border-[#343730] bg-[#10110f] px-3 text-sm text-[#f3f4ef] outline-none focus:border-[#c5ef3a]"
                    >
                      {REQUEST_KINDS.map((option) => (
                        <option key={option} value={option}>
                          {option}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label className="grid gap-2 text-xs font-medium text-[#b9bcb4]">
                    Sua bike
                    <input
                      type="text"
                      value={model}
                      onChange={(e) => setModel(e.target.value)}
                      placeholder="Marca e modelo (se souber)"
                      className="h-11 border border-[#343730] bg-[#10110f] px-3.5 text-sm text-[#f3f4ef] placeholder-[#696e64] outline-none focus:border-[#c5ef3a]"
                    />
                  </label>
                </div>

                <label className="grid gap-2 text-xs font-medium text-[#b9bcb4]">
                  Conte um pouco mais
                  <textarea
                    rows={3}
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="Qual é a necessidade da sua bike?"
                    className="border border-[#343730] bg-[#10110f] p-3.5 text-sm text-[#f3f4ef] placeholder-[#696e64] outline-none focus:border-[#c5ef3a]"
                  />
                </label>

                {errorMsg && (
                  <p role="alert" className="text-xs font-medium text-[#ff6b25]">
                    {errorMsg}
                  </p>
                )}

                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={submitting}
                    className="inline-flex h-12 items-center gap-3 bg-[#c5ef3a] px-6 text-xs font-bold uppercase tracking-wider text-[#151810] transition-transform duration-150 hover:-translate-y-0.5 disabled:opacity-60"
                  >
                    {submitting ? 'Enviando solicitação...' : 'Enviar solicitação'}
                    <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
                  </button>
                </div>

                <p className="text-xs leading-relaxed text-[#858a7f]">
                  Ao enviar, nossa equipe recebe seu pedido imediatamente no painel da oficina.
                </p>
              </form>
            )}
          </div>
        </section>
      </main>

      <footer className="border-t border-[#30332d] bg-[#10110f] px-6 py-8 md:px-12">
        <div className="mx-auto flex max-w-[1440px] flex-wrap items-center justify-between gap-6 text-xs text-[#969b90]">
          <div className="flex items-center gap-6">
            <span className="font-display text-base font-bold tracking-[0.1em] text-[#f3f4ef]">
              VALE <span className="text-[#c5ef3a]">BIKE</span>
            </span>
            <span className="hidden sm:inline">Aventura sobre duas rodas.</span>
          </div>

          <div className="flex items-center gap-6">
            <button
              type="button"
              onClick={() => onNavigate('/gestao')}
              className="inline-flex items-center gap-1.5 font-semibold text-[#c5ef3a] hover:underline hover:underline-offset-4"
            >
              Acesso da equipe
              <ArrowUpRight className="h-3.5 w-3.5" aria-hidden="true" />
            </button>
            <span>© Vale Bike · Registro, SP</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
