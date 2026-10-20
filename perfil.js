
document.addEventListener("DOMContentLoaded", async function () {
    const $ = id => document.getElementById(id);
    const esc = t => String(t ?? "").replace(/[&<>"']/g, c => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;"
    }[c]));

    const moeda = n => "R$ " + Number(n || 0).toLocaleString("pt-BR", {
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
    });

    const dataBR = iso => {
        if (!iso) return "";
        const partes = iso.split("-");
        return partes.length === 3 ? partes.reverse().join("/") : iso;
    };

    function aviso(texto) {
        const el = $("aviso");
        el.textContent = texto;
        el.classList.add("visivel");
        setTimeout(() => el.classList.remove("visivel"), 2500);
    }

    let perfil = {
        nome: "",
        email: "",
        bio: "",
        foto_perfil: null,
        tipo: "apoiador",
        criado_em: null
    };

    try {
        const resposta = await fetch("dados_perfil.php", {
            credentials: "same-origin"
        });

        if (resposta.status === 401) {
            window.location.href = "login.html";
            return;
        }

        const dados = await resposta.json();

        if (!resposta.ok) {
            throw new Error(dados.erro || "Não foi possível carregar o perfil.");
        }

        perfil = {
            nome: dados.nome || "",
            email: dados.email || "",
            bio: dados.biografia || "",
            foto_perfil: dados.foto_perfil || null,
            tipo: dados.tipo || "apoiador",
            criado_em: dados.criado_em || null
        };
    } catch (erro) {
        aviso(erro.message || "Erro ao carregar o perfil.");
        return;
    }

    const CHAVE_PAINEL = "eloPainelCriador";

    const ler = (chave, padrao) => {
        try {
            const valor = JSON.parse(localStorage.getItem(chave));
            return valor ?? padrao;
        } catch (e) {
            return padrao;
        }
    };

    const painel = ler(CHAVE_PAINEL, { edicoes: {} });

    const idsProjetos = typeof MEUS_PROJETOS !== "undefined"
        ? MEUS_PROJETOS
        : [];

    const listaProjetos = typeof projetos !== "undefined"
        ? projetos
        : [];

    const criados = idsProjetos
        .map(id => listaProjetos.find(p => p.id === id))
        .filter(Boolean);

    criados.forEach(p => {
        const ed = (painel.edicoes || {})[p.id];

        if (ed) {
            Object.assign(p, ed);

            if (p.meta > 0) {
                p.pct = Math.min(100, Math.round((p.arrecadado / p.meta) * 100));
            }
        }
    });

    const doacoes = typeof todasAsDoacoes === "function"
        ? todasAsDoacoes()
        : [];

    const apoios = doacoes
        .map(d => ({
            ...d,
            projeto: listaProjetos.find(p => p.id === d.id)
        }))
        .filter(d => d.projeto)
        .sort((a, b) => String(b.data || "").localeCompare(String(a.data || "")));

    function renderizarPerfil() {
        $("nomePerfil").textContent = perfil.nome;
        $("emailPerfil").textContent = perfil.email;
        $("bioPerfil").textContent = perfil.bio || "Adicione uma biografia para contar um pouco sobre você.";
        $("fotoPerfil").src = perfil.foto_perfil || "mariane.jpg";

        const tipos = {
            apoiador: "Apoiadora",
            criador: "Criadora",
            administrador: "Administradora"
        };

        $("nomePerfil").textContent = perfil.nome;

        document.querySelector(".selo-tipo").innerHTML =
            '<i class="fa-regular fa-circle-check"></i> ' +
            esc(tipos[perfil.tipo] || "Membro");

        if (perfil.criado_em) {
            const data = new Date(perfil.criado_em.replace(" ", "T"));

            $("membroPerfil").textContent = "Membro desde " +
                data.toLocaleDateString("pt-BR", {
                    month: "long",
                    year: "numeric"
                });
        } else {
            $("membroPerfil").textContent = "";
        }

        document.title = "Meu perfil | " + perfil.nome;
    }

    function renderizarNumeros() {
        const total = apoios.reduce((soma, d) => soma + Number(d.valor || 0), 0);

        $("statCriados").textContent = criados.length;
        $("statApoiados").textContent = new Set(apoios.map(d => d.id)).size;
        $("statTotal").textContent = moeda(total);

        const pessoasImpactadas = 45;
        $("statPessoas").textContent = pessoasImpactadas;
    }

    const linhaCriado = p => {
        const pct = Math.min(100, Math.max(0, Number(p.pct) || 0));

        return `
        <a href="projeto.html?id=${encodeURIComponent(p.id)}" class="item">
            <div class="item-foto" style="background-image:url('${esc(p.img || "")}')"></div>
            <div class="item-meio">
                <strong>${esc(p.titulo)}</strong>
                <small>${esc(p.org)}</small>
                <div class="mini-barra"><div style="width:${pct}%"></div></div>
                <div class="item-valores">
                    <span>${moeda(p.arrecadado)} arrecadados</span>
                    <span>${pct}% da meta</span>
                </div>
            </div>
            <i class="fa-solid fa-chevron-right seta"></i>
        </a>`;
    };

    const linhaApoio = d => {
        const projeto = d.projeto;
        const andamento = Number(projeto.dias) > 0 && Number(projeto.pct) < 100;

        return `
        <a href="projeto.html?id=${encodeURIComponent(projeto.id)}" class="item">
            <div class="item-foto" style="background-image:url('${esc(projeto.img || "")}')"></div>
            <div class="item-meio">
                <strong>${esc(projeto.titulo)}</strong>
                <small>Por ${esc(projeto.autor)}</small>
                <div class="item-valores">
                    <span>${moeda(d.valor)} doados</span>
                    <span>${dataBR(d.data)}</span>
                </div>
            </div>
            <span class="tag-status ${andamento ? "" : "concluido"}">${andamento ? "Em andamento" : "Concluído"}</span>
            <i class="fa-solid fa-chevron-right seta"></i>
        </a>`;
    };

    function renderizarListas() {
        $("resumoCriados").innerHTML = criados.slice(0, 3).map(linhaCriado).join("") ||
            '<p class="vazio">Você ainda não criou nenhum projeto.</p>';

        $("listaCriados").innerHTML = criados.map(linhaCriado).join("") ||
            '<p class="vazio">Você ainda não criou nenhum projeto.</p>';

        $("resumoApoiados").innerHTML = apoios.slice(0, 3).map(linhaApoio).join("") ||
            '<p class="vazio">Você ainda não apoiou nenhum projeto.</p>';

        $("listaApoiados").innerHTML = apoios.map(linhaApoio).join("") ||
            '<p class="vazio">Você ainda não apoiou nenhum projeto.</p>';
    }

    function abrirAba(nome) {
        document.querySelectorAll(".aba").forEach(a => {
            a.classList.toggle("ativo", a.dataset.aba === nome);
        });

        document.querySelectorAll(".aba-painel").forEach(p => {
            p.classList.toggle("ativo", p.id === "aba-" + nome);
        });

        if (nome === "informacoes") {
            preencherFormulario();
        }
    }

    document.querySelectorAll(".aba").forEach(aba => {
        aba.addEventListener("click", () => abrirAba(aba.dataset.aba));
    });

    document.querySelectorAll("[data-ir]").forEach(botao => {
        botao.addEventListener("click", () => abrirAba(botao.dataset.ir));
    });

    function preencherFormulario() {
        $("campoNome").value = perfil.nome;
        $("campoEmail").value = perfil.email;
        $("campoBio").value = perfil.bio;
        $("erroPerfil").hidden = true;
    }

    $("btnEditar").addEventListener("click", () => {
        abrirAba("informacoes");
        document.querySelector(".abas").scrollIntoView({
            behavior: "smooth",
            block: "start"
        });
        $("campoNome").focus();
    });

    $("cancelarPerfil").addEventListener("click", () => abrirAba("geral"));

    $("formPerfil").addEventListener("submit", async e => {
        e.preventDefault();

        const nome = $("campoNome").value.trim();
        const email = $("campoEmail").value.trim();
        const bio = $("campoBio").value.trim();
        const erro = $("erroPerfil");

        let mensagem = "";

        if (!nome) {
            mensagem = "Informe seu nome completo.";
        } else if (nome.length > 100) {
            mensagem = "O nome deve ter até 100 caracteres.";
        } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            mensagem = "Informe um e-mail válido.";
        } else if (email.length > 150) {
            mensagem = "O e-mail deve ter até 150 caracteres.";
        } else if (bio.length > 200) {
            mensagem = "A biografia deve ter até 200 caracteres.";
        }

        if (mensagem) {
            erro.textContent = mensagem;
            erro.hidden = false;
            return;
        }

        const dados = new FormData();
        dados.append("nome", nome);
        dados.append("email", email);
        dados.append("biografia", bio);

        try {
            const resposta = await fetch("atualizar_perfil.php", {
                method: "POST",
                body: dados,
                credentials: "same-origin"
            });

            const resultado = await resposta.json();

            if (resposta.status === 401) {
                window.location.href = "login.html";
                return;
            }

            if (!resposta.ok) {
                throw new Error(resultado.erro || "Não foi possível salvar o perfil.");
            }

            perfil.nome = resultado.usuario.nome;
            perfil.email = resultado.usuario.email;
            perfil.bio = resultado.usuario.biografia || "";
            perfil.foto_perfil = resultado.usuario.foto_perfil || null;

            renderizarPerfil();
            abrirAba("geral");
            aviso(resultado.mensagem || "Perfil atualizado com sucesso!");
        } catch (erroSalvamento) {
            erro.textContent = erroSalvamento.message || "Erro ao salvar o perfil.";
            erro.hidden = false;
        }
    });

    $("btnFoto").addEventListener("click", () => {
        $("arquivoFoto").click();
    });

    $("arquivoFoto").addEventListener("change", async e => {
        const arquivo = e.target.files[0];

        if (!arquivo) return;

        if (arquivo.size > 2 * 1024 * 1024) {
            aviso("Escolha uma imagem de até 2 MB.");
            e.target.value = "";
            return;
        }

        if (!["image/jpeg", "image/png", "image/webp"].includes(arquivo.type)) {
            aviso("Use uma imagem JPG, PNG ou WEBP.");
            e.target.value = "";
            return;
        }

        const dados = new FormData();
        dados.append("nome", perfil.nome);
        dados.append("email", perfil.email);
        dados.append("biografia", perfil.bio);
        dados.append("foto", arquivo);

        try {
            const resposta = await fetch("atualizar_perfil.php", {
                method: "POST",
                body: dados,
                credentials: "same-origin"
            });

            const resultado = await resposta.json();

            if (resposta.status === 401) {
                window.location.href = "login.html";
                return;
            }

            if (!resposta.ok) {
                throw new Error(resultado.erro || "Não foi possível atualizar a foto.");
            }

            perfil.foto_perfil = resultado.usuario.foto_perfil || null;
            $("fotoPerfil").src = perfil.foto_perfil || "mariane.jpg";
            aviso("Foto atualizada!");
        } catch (erroFoto) {
            aviso(erroFoto.message || "Erro ao atualizar a foto.");
        } finally {
            e.target.value = "";
        }
    });

    const modal = $("modal");
    let ultimoFoco = null;

    function abrirModal(titulo, corpoHtml) {
        ultimoFoco = document.activeElement;
        $("modalTitulo").textContent = titulo;
        $("modalCorpo").innerHTML = corpoHtml;
        modal.hidden = false;

        const primeiro = modal.querySelector("input, button.btn-azul, .rede");

        if (primeiro) {
            primeiro.focus();
        }
    }

    function fecharModal() {
        modal.hidden = true;
        $("modalCorpo").innerHTML = "";

        if (ultimoFoco) {
            ultimoFoco.focus();
        }
    }

    modal.addEventListener("click", e => {
        if (e.target.closest("[data-fechar]")) {
            fecharModal();
        }
    });

    document.addEventListener("keydown", e => {
        if (e.key === "Escape" && !modal.hidden) {
            fecharModal();
        }
    });

    $("btnConvidar").addEventListener("click", () => {
        const url = new URL("index.html", window.location.href).href;
        const texto = "Venha apoiar ideias que transformam o futuro no Instituto Elo!";

        abrirModal("Convidar amigos", `
            <p class="modal-texto">Compartilhe a Elo e ajude mais projetos a saírem do papel.</p>
            <div class="link-compartilhar">
                <input type="text" id="linkConvite" value="${esc(url)}" readonly>
                <button type="button" class="btn-azul" id="copiarConvite">Copiar</button>
            </div>
            <div class="redes">
                <a class="rede" target="_blank" rel="noopener" href="https://wa.me/?text=${encodeURIComponent(texto + " " + url)}">
                    <i class="fa-brands fa-whatsapp"></i> WhatsApp</a>
                <a class="rede" target="_blank" rel="noopener" href="https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}">
                    <i class="fa-brands fa-facebook-f"></i> Facebook</a>
                <a class="rede" href="mailto:?subject=${encodeURIComponent("Conheça o Instituto Elo")}&body=${encodeURIComponent(texto + "\n" + url)}">
                    <i class="fa-regular fa-envelope"></i> E-mail</a>
                ${navigator.share ? '<button type="button" class="rede" id="maisOpcoes"><i class="fa-solid fa-share-nodes"></i> Mais opções</button>' : ""}
            </div>`);

        $("copiarConvite").addEventListener("click", async () => {
            try {
                await navigator.clipboard.writeText(url);
            } catch (erroCopia) {
                $("linkConvite").select();
                document.execCommand("copy");
            }

            $("copiarConvite").textContent = "Copiado!";

            setTimeout(() => {
                if ($("copiarConvite")) {
                    $("copiarConvite").textContent = "Copiar";
                }
            }, 2000);
        });

        const mais = $("maisOpcoes");

        if (mais) {
            mais.addEventListener("click", async () => {
                try {
                    await navigator.share({
                        title: "Instituto Elo",
                        text: texto,
                        url
                    });
                } catch (erroCompartilhar) {
                    // O compartilhamento foi cancelado.
                }
            });
        }
    });

    renderizarPerfil();
    renderizarNumeros();
    renderizarListas();

    const abaInicial = window.location.hash.replace("#", "");

    if (["geral", "criados", "apoiados", "informacoes"].includes(abaInicial)) {
        abrirAba(abaInicial);
    }
});
