const ESTADOS = [
  "AC","AL","AM","AP","BA","CE","DF","ES","GO",
  "MA","MG","MS","MT","PA","PB","PE","PI","PR",
  "RJ","RN","RO","RR","RS","SC","SE","SP","TO",
];

export default function CorretoresPage() {
  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Corretores Credenciados</h1>
        <p className="text-gray-500 text-sm mt-1">
          Conectamos compradores com corretores especializados em imóveis da Caixa em todo o Brasil.
        </p>
      </div>

      {/* Banner para corretores se cadastrarem */}
      <div className="bg-brand-900 text-white rounded-xl shadow p-6 mb-8">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
          <div className="text-4xl">🏅</div>
          <div className="flex-1">
            <h2 className="text-lg font-bold mb-1">É corretor credenciado Caixa?</h2>
            <p className="text-blue-200 text-sm">
              Cadastre-se gratuitamente e apareça para milhares de compradores que buscam imóveis Caixa no seu estado.
              Aumenta sua visibilidade e feche mais negócios.
            </p>
          </div>
          <a
            href="mailto:contato@invistaemleiloes.com.br?subject=Cadastro%20Corretor%20Credenciado&body=Nome:%0AEstado:%0ACRECI:%0ATelefone:%0AEmail:"
            className="shrink-0 bg-white text-brand-900 font-semibold px-5 py-2 rounded-lg text-sm hover:bg-blue-50 transition-colors"
          >
            Quero me cadastrar
          </a>
        </div>
      </div>

      {/* Como funciona */}
      <div className="bg-white rounded-xl shadow p-6 mb-8">
        <h2 className="font-semibold text-gray-700 mb-4">Como funciona</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[
            { icon: "📋", title: "1. Cadastro", desc: "Envie seus dados (nome, CRECI, estado, contato) pelo botão acima." },
            { icon: "✅", title: "2. Validação", desc: "Verificamos seu CRECI e aprovamos seu perfil em até 48h." },
            { icon: "📣", title: "3. Visibilidade", desc: "Seu contato aparece para compradores que buscam imóveis no seu estado." },
          ].map((s) => (
            <div key={s.title} className="text-center p-4 bg-gray-50 rounded-lg">
              <div className="text-3xl mb-2">{s.icon}</div>
              <p className="font-semibold text-gray-700 text-sm mb-1">{s.title}</p>
              <p className="text-xs text-gray-500">{s.desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Benefícios */}
      <div className="bg-white rounded-xl shadow p-6 mb-8">
        <h2 className="font-semibold text-gray-700 mb-4">Benefícios do cadastro</h2>
        <ul className="space-y-2 text-sm text-gray-600">
          {[
            "Apareça nos resultados de busca dos imóveis do seu estado",
            "Receba contatos diretos de compradores qualificados",
            "Destaque seu perfil com especialização em leilões e venda direta",
            "Atualizações diárias de novos imóveis disponíveis na sua região",
            "Cadastro 100% gratuito",
          ].map((b) => (
            <li key={b} className="flex items-start gap-2">
              <span className="text-green-500 mt-0.5">✓</span>
              <span>{b}</span>
            </li>
          ))}
        </ul>
      </div>

      {/* Lista de estados (placeholder para futuro) */}
      <div className="bg-white rounded-xl shadow p-6">
        <h2 className="font-semibold text-gray-700 mb-1">Cobertura nacional</h2>
        <p className="text-sm text-gray-500 mb-4">Buscamos corretores credenciados em todos os estados do Brasil.</p>
        <div className="flex flex-wrap gap-2">
          {ESTADOS.map((uf) => (
            <span key={uf} className="bg-gray-100 text-gray-600 text-xs font-medium px-3 py-1.5 rounded-full">
              {uf}
            </span>
          ))}
        </div>
        <p className="text-xs text-gray-400 mt-4 italic">
          Corretores cadastrados serão listados aqui por estado em breve.
        </p>
      </div>

      {/* Contato */}
      <div className="mt-8 text-center text-sm text-gray-500">
        <p>Dúvidas? Entre em contato pelo e-mail{" "}
          <a href="mailto:contato@invistaemleiloes.com.br" className="text-blue-600 hover:underline">
            contato@invistaemleiloes.com.br
          </a>
        </p>
      </div>
    </div>
  );
}
