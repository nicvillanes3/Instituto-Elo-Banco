
document.addEventListener("DOMContentLoaded", async function () {
    "use strict";

    const $ = id => document.getElementById(id);

    const esc = texto => String(texto ?? "").replace(/[&<>"']/g, caractere => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;"
    }[caractere]));

    const moeda = valor => "R$ " + Number(valor || 0).toLocaleString("pt-BR", {
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
    });

    const dataBR = data => {
        if (!data) return "";

        const valor = String(data);

        // Formato de data recebido do MySQL: YYYY-MM-DD ou YYYY-MM-DD HH:MM:SS
        const partes = valor.substring(0, 10).split("-");

        return partes.length === 3
            ? partes.reverse().join("/")
            : valor;
    };

    function aviso(texto) {
        const elemento = $("aviso");

        if (!elemento) {
            console.log(texto);
            return;
        }

        elemento.textContent = texto;
        elemento.classList.add("visivel");

        setTimeout(() => {
            elemento.classList.remove("visivel");
        }, 2500);
    }

    let perfil = {
        nome: "",
        email: "",
        bio: "",
        foto_perfil: null,
        tipo: "apoiador",
        criado_em: null
    };

    // =====================================================
    // ATIVIDADES DO USUÁRIO
    // =====================================================

    let criados = [];
    let apoios = [];

    let estatisticas = {
        total_projetos: 0,
        total_apoiados: 0,
        total_doado: 0
    };

    // =====================================================
    // ATUALIZAR SESSÃO LOCAL
    // =====================================================

    function atualizarSessaoLocal() {
        try {
            const sessao = JSON.parse(
                localStorage.getItem("eloSessao") || "{}"
            );

            localStorage.setItem("eloSessao", JSON.stringify({
                ...sessao,
                nome: perfil.nome,
                email: perfil.email,
                tipo: perfil.tipo
            }));
        } catch (erro) {
            console.error("Erro ao sincronizar a sessão:", erro);
        }
    }

    // =====================================================
    // EXIBIR PAINEL ADMINISTRATIVO
    // =====================================================

    function atualizarMenuAdmin() {
        const linkAdmin = $("linkAdmin");

        if (!linkAdmin) return;

        linkAdmin.style.display =
            perfil.tipo === "administrador" ? "flex" : "none";
    }

    // =====================================================
    // CARREGAR DADOS DO USUÁRIO
    // =====================================================

    try {
        const resposta = await fetch("dados_perfil.php", {
            method: "GET",
            credentials: "same-origin",
            headers: {
                "Accept": "application/json"
            },
            cache: "no-store"
        });

        console.log("Status de dados_perfil.php:", resposta.status);
        console.log("URL de resposta:", resposta.url);

        if (resposta.status === 401) {
            aviso("Sua sessão do servidor expirou. Entre novamente.");
            console.error("O PHP retornou 401. Verifique a sessão.");
            return;
        }

        const tipoResposta = resposta.headers.get("content-type") || "";

        if (!tipoResposta.includes("application/json")) {
            const conteudo = await resposta.text();

            console.error(
                "A resposta de dados_perfil.php não é JSON:",
                conteudo.slice(0, 500)
            );

            throw new Error(
                "O servidor não retornou JSON. Confira dados_perfil.php."
            );
        }

        const dados = await resposta.json();

        if (!resposta.ok) {
            throw new Error(
                dados.erro || "Não foi possível carregar o perfil."
            );
        }

        if (!dados || !dados.email) {
            throw new Error(
                dados.erro || "O servidor não retornou os dados do usuário."
            );
        }

        perfil = {
            nome: dados.nome || "",
            email: dados.email || "",
            bio: dados.biografia || "",
            foto_perfil: dados.foto_perfil || null,
            tipo: dados.tipo || "apoiador",
            criado_em: dados.criado_em || null
        };

        atualizarSessaoLocal();

    } catch (erro) {
        console.error("Erro ao carregar o perfil:", erro);
        aviso(erro.message || "Erro ao carregar o perfil.");
        return;
    }

    // =====================================================
    // CARREGAR PROJETOS E DOAÇÕES DO BANCO DE DADOS
    // =====================================================

    try {
        const resposta = await fetch("dados_atividade_perfil.php", {
            method: "GET",
            credentials: "same-origin",
            headers: {
                "Accept": "application/json"
            },
            cache: "no-store"
        });

        console.log(
            "Status de dados_atividade_perfil.php:",
            resposta.status
        );

        const tipoResposta = resposta.headers.get("content-type") || "";

        if (!tipoResposta.includes("application/json")) {
            const conteudo = await resposta.text();

            console.error(
                "A resposta de dados_atividade_perfil.php não é JSON:",
                conteudo.slice(0, 500)
            );

            throw new Error(
                "O servidor não retornou JSON ao carregar as atividades."
            );
        }

        const dadosAtividade = await resposta.json();

        if (resposta.status === 401) {
            aviso("Sua sessão expirou. Entre novamente.");
            return;
        }

        if (!resposta.ok) {
            throw new Error(
                dadosAtividade.erro ||
                "Não foi possível carregar suas atividades."
            );
        }

        // Projetos criados pelo usuário
        criados = (dadosAtividade.projetos || []).map(projeto => {
            const meta = Number(projeto.meta_valor || 0);
            const arrecadado = Number(projeto.valor_arrecadado || 0);

            const percentual = meta > 0
                ? Math.min(100, Math.round(arrecadado / meta * 100))
                : 0;

            return {
                ...projeto,
                id: projeto.id,
                titulo: projeto.titulo || "Projeto sem título",
                org: projeto.categoria || "Projeto",
                img: projeto.imagem || "",
                meta: meta,
                arrecadado: arrecadado,
                pct: percentual
            };
        });

        // Doações feitas pelo usuário
        apoios = (dadosAtividade.doacoes || []).map(doacao => {
            const projetoId = doacao.projeto_id;

            return {
                ...doacao,
                id: projetoId,
                valor: Number(doacao.valor || 0),
                data: doacao.data_doacao || "",
                projeto: {
                    id: projetoId,
                    titulo: doacao.projeto_titulo || "Projeto",
                    img: doacao.projeto_imagem || "",
                    autor: "",
                    status: ""
                }
            };
        });

        // Estatísticas calculadas pelo PHP
        estatisticas = {
            total_projetos: Number(
                dadosAtividade.estatisticas?.total_projetos ?? criados.length
            ),
            total_apoiados: Number(
                dadosAtividade.estatisticas?.total_apoiados ?? 0
            ),
            total_doado: Number(
                dadosAtividade.estatisticas?.total_doado ?? 0
            )
        };

    } catch (erro) {
        console.error("Erro ao carregar atividades:", erro);

        // Mantém o perfil disponível, mas informa o problema.
        aviso(
            erro.message ||
            "Não foi possível carregar os projetos e as doações."
        );
    }

    // =====================================================
    // RENDERIZAR PERFIL
    // =====================================================

    function renderizarPerfil() {
        if ($("nomePerfil")) {
            $("nomePerfil").textContent = perfil.nome;
        }

        if ($("emailPerfil")) {
            $("emailPerfil").textContent = perfil.email;
        }

        if ($("bioPerfil")) {
            $("bioPerfil").textContent = perfil.bio ||
                "Adicione uma biografia para contar um pouco sobre você.";
        }

        if ($("fotoPerfil")) {
            $("fotoPerfil").src = perfil.foto_perfil || "mariane.jpg";
        }

        const tipos = {
            apoiador: "Apoiador(a)",
            criador: "Criador(a)",
            administrador: "Administrador(a)"
        };

        const selo = document.querySelector(".selo-tipo");

        if (selo) {
            selo.innerHTML =
                '<i class="fa-regular fa-circle-check"></i> ' +
                esc(tipos[perfil.tipo] || "Membro");
        }

        if ($("membroPerfil")) {
            if (perfil.criado_em) {
                const data = new Date(
                    String(perfil.criado_em).replace(" ", "T")
                );

                $("membroPerfil").textContent = "Membro desde " +
                    data.toLocaleDateString("pt-BR", {
                        month: "long",
                        year: "numeric"
                    });
            } else {
                $("membroPerfil").textContent = "";
            }
        }

        document.title = "Meu perfil | " + perfil.nome;
    }

    // =====================================================
    // NÚMEROS DO PERFIL
    // =====================================================

    function renderizarNumeros() {
        if ($("statCriados")) {
            $("statCriados").textContent =
                estatisticas.total_projetos;
        }

        if ($("statApoiados")) {
            $("statApoiados").textContent =
                estatisticas.total_apoiados;
        }

        if ($("statTotal")) {
            $("statTotal").textContent =
                moeda(estatisticas.total_doado);
        }

        // Não existe uma fonte de dados confirmada para pessoas impactadas.
        // Evita exibir o número fictício que existia anteriormente.
        if ($("statPessoas")) {
            $("statPessoas").textContent = "—";
        }
    }

    // =====================================================
    // CARDS DE PROJETOS
    // =====================================================

    const linhaCriado = projeto => {
        const percentual = Math.min(
            100,
            Math.max(0, Number(projeto.pct) || 0)
        );

        return `
            <a href="projeto.html?id=${encodeURIComponent(projeto.id)}"
               class="item">

                <div class="item-foto"
                     style="background-image:url('${esc(projeto.img)}')">
                </div>

                <div class="item-meio">
                    <strong>${esc(projeto.titulo)}</strong>
                    <small>${esc(projeto.org)}</small>

                    <div class="mini-barra">
                        <div style="width:${percentual}%"></div>
                    </div>

                    <div class="item-valores">
                        <span>${moeda(projeto.arrecadado)} arrecadados</span>
                        <span>${percentual}% da meta</span>
                    </div>
                </div>

                <i class="fa-solid fa-chevron-right seta"></i>
            </a>
        `;
    };

    const linhaApoio = doacao => {
        const projeto = doacao.projeto;

        // O status do projeto não é retornado pelo endpoint de doações.
        // Por isso, não presume que o projeto esteja concluído.
        return `
            <a href="projeto.html?id=${encodeURIComponent(projeto.id)}"
               class="item">

                <div class="item-foto"
                     style="background-image:url('${esc(projeto.img)}')">
                </div>

                <div class="item-meio">
                    <strong>${esc(projeto.titulo)}</strong>
                    <small>Projeto apoiado</small>

                    <div class="item-valores">
                        <span>${moeda(doacao.valor)} doados</span>
                        <span>${dataBR(doacao.data)}</span>
                    </div>
                </div>

                <span class="tag-status">Doação confirmada</span>

                <i class="fa-solid fa-chevron-right seta"></i>
            </a>
        `;
    };

    // =====================================================
    // RENDERIZAR LISTAS
    // =====================================================

    function renderizarListas() {
        if ($("resumoCriados")) {
            $("resumoCriados").innerHTML =
                criados.slice(0, 3).map(linhaCriado).join("") ||
                '<p class="vazio">Você ainda não criou nenhum projeto.</p>';
        }

        if ($("listaCriados")) {
            $("listaCriados").innerHTML =
                criados.map(linhaCriado).join("") ||
                '<p class="vazio">Você ainda não criou nenhum projeto.</p>';
        }

        if ($("resumoApoiados")) {
            $("resumoApoiados").innerHTML =
                apoios.slice(0, 3).map(linhaApoio).join("") ||
                '<p class="vazio">Você ainda não apoiou nenhum projeto.</p>';
        }

        if ($("listaApoiados")) {
            $("listaApoiados").innerHTML =
                apoios.map(linhaApoio).join("") ||
                '<p class="vazio">Você ainda não apoiou nenhum projeto.</p>';
        }
    }

    // =====================================================
    // ABAS
    // =====================================================

    function abrirAba(nome) {
        document.querySelectorAll(".aba").forEach(aba => {
            aba.classList.toggle("ativo", aba.dataset.aba === nome);
        });

        document.querySelectorAll(".aba-painel").forEach(painelAba => {
            painelAba.classList.toggle(
                "ativo",
                painelAba.id === "aba-" + nome
            );
        });

        if (nome === "informacoes") {
            preencherFormulario();
        }
    }

    document.querySelectorAll(".aba").forEach(aba => {
        aba.addEventListener("click", () => {
            abrirAba(aba.dataset.aba);
        });
    });

    document.querySelectorAll("[data-ir]").forEach(botao => {
        botao.addEventListener("click", () => {
            abrirAba(botao.dataset.ir);
        });
    });

    function preencherFormulario() {
        if ($("campoNome")) $("campoNome").value = perfil.nome;
        if ($("campoEmail")) $("campoEmail").value = perfil.email;
        if ($("campoBio")) $("campoBio").value = perfil.bio;
        if ($("erroPerfil")) $("erroPerfil").hidden = true;
    }

    if ($("btnEditar")) {
        $("btnEditar").addEventListener("click", () => {
            abrirAba("informacoes");

            if (document.querySelector(".abas")) {
                document.querySelector(".abas").scrollIntoView({
                    behavior: "smooth",
                    block: "start"
                });
            }

            if ($("campoNome")) $("campoNome").focus();
        });
    }

    if ($("cancelarPerfil")) {
        $("cancelarPerfil").addEventListener("click", () => {
            abrirAba("geral");
        });
    }

    // =====================================================
    // SALVAR DADOS DO PERFIL
    // =====================================================

    if ($("formPerfil")) {
        $("formPerfil").addEventListener("submit", async evento => {
            evento.preventDefault();

            const nome = $("campoNome")?.value.trim() || "";
            const email = $("campoEmail")?.value.trim() || "";
            const bio = $("campoBio")?.value.trim() || "";
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
                if (erro) {
                    erro.textContent = mensagem;
                    erro.hidden = false;
                } else {
                    aviso(mensagem);
                }

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
                    credentials: "same-origin",
                    headers: {
                        "Accept": "application/json"
                    }
                });

                const resultado = await resposta.json();

                if (resposta.status === 401) {
                    aviso("Sua sessão expirou. Entre novamente.");
                    return;
                }

                if (!resposta.ok) {
                    throw new Error(
                        resultado.erro ||
                        resultado.mensagem ||
                        "Não foi possível salvar o perfil."
                    );
                }

                if (!resultado.usuario) {
                    throw new Error(
                        "O servidor não retornou os dados atualizados."
                    );
                }

                perfil.nome = resultado.usuario.nome || nome;
                perfil.email = resultado.usuario.email || email;
                perfil.bio = resultado.usuario.biografia || "";
                perfil.foto_perfil =
                    resultado.usuario.foto_perfil || perfil.foto_perfil;

                atualizarSessaoLocal();
                renderizarPerfil();
                abrirAba("geral");

                aviso(resultado.mensagem || "Perfil atualizado com sucesso!");

            } catch (erroSalvamento) {
                console.error("Erro ao salvar perfil:", erroSalvamento);

                if (erro) {
                    erro.textContent =
                        erroSalvamento.message ||
                        "Erro ao salvar o perfil.";

                    erro.hidden = false;
                } else {
                    aviso(
                        erroSalvamento.message ||
                        "Erro ao salvar o perfil."
                    );
                }
            }
        });
    }

    // =====================================================
    // FOTO DO PERFIL
    // =====================================================

    if ($("btnFoto") && $("arquivoFoto")) {
        $("btnFoto").addEventListener("click", () => {
            $("arquivoFoto").click();
        });

        $("arquivoFoto").addEventListener("change", async evento => {
            const arquivo = evento.target.files[0];

            if (!arquivo) return;

            if (arquivo.size > 2 * 1024 * 1024) {
                aviso("Escolha uma imagem de até 2 MB.");
                evento.target.value = "";
                return;
            }

            if (!["image/jpeg", "image/png", "image/webp"].includes(arquivo.type)) {
                aviso("Use uma imagem JPG, PNG ou WEBP.");
                evento.target.value = "";
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
                    credentials: "same-origin",
                    headers: {
                        "Accept": "application/json"
                    }
                });

                const resultado = await resposta.json();

                if (resposta.status === 401) {
                    aviso("Sua sessão expirou. Entre novamente.");
                    return;
                }

                if (!resposta.ok) {
                    throw new Error(
                        resultado.erro ||
                        resultado.mensagem ||
                        "Não foi possível atualizar a foto."
                    );
                }

                if (!resultado.usuario) {
                    throw new Error(
                        "O servidor não retornou os dados atualizados."
                    );
                }

                perfil.nome = resultado.usuario.nome || perfil.nome;
                perfil.email = resultado.usuario.email || perfil.email;
                perfil.bio = resultado.usuario.biografia || "";
                perfil.foto_perfil =
                    resultado.usuario.foto_perfil || perfil.foto_perfil;

                atualizarSessaoLocal();
                renderizarPerfil();

                aviso("Foto atualizada!");

            } catch (erroFoto) {
                console.error("Erro ao atualizar foto:", erroFoto);
                aviso(erroFoto.message || "Erro ao atualizar a foto.");
            } finally {
                evento.target.value = "";
            }
        });
    }

    // =====================================================
    // MODAL DE CONVITE
    // =====================================================

    const modal = $("modal");
    let ultimoFoco = null;

    function abrirModal(titulo, corpoHtml) {
        if (!modal) {
            aviso("O modal de convite não foi encontrado no HTML.");
            return;
        }

        ultimoFoco = document.activeElement;

        if ($("modalTitulo")) {
            $("modalTitulo").textContent = titulo;
        }

        if ($("modalCorpo")) {
            $("modalCorpo").innerHTML = corpoHtml;
        }

        modal.hidden = false;

        const primeiro = modal.querySelector(
            "input, button.btn-azul, .rede"
        );

        if (primeiro) primeiro.focus();
    }

    function fecharModal() {
        if (!modal) return;

        modal.hidden = true;

        if ($("modalCorpo")) {
            $("modalCorpo").innerHTML = "";
        }

        if (ultimoFoco && typeof ultimoFoco.focus === "function") {
            ultimoFoco.focus();
        }
    }

    if (modal) {
        modal.addEventListener("click", evento => {
            if (evento.target.closest("[data-fechar]")) {
                fecharModal();
            }
        });
    }

    document.addEventListener("keydown", evento => {
        if (evento.key === "Escape" && modal && !modal.hidden) {
            fecharModal();
        }
    });

    if ($("btnConvidar")) {
        $("btnConvidar").addEventListener("click", () => {
            const url = new URL("index.html", window.location.href).href;

            const texto =
                "Venha apoiar ideias que transformam o futuro no Instituto Elo!";

            abrirModal("Convidar amigos", `
                <p class="modal-texto">
                    Compartilhe a Elo e ajude mais projetos a saírem do papel.
                </p>

                <div class="link-compartilhar">
                    <input type="text" id="linkConvite"
                           value="${esc(url)}" readonly>

                    <button type="button" class="btn-azul" id="copiarConvite">
                        Copiar
                    </button>
                </div>

                <div class="redes">
                    <a class="rede" target="_blank" rel="noopener"
                       href="https://wa.me/?text=${encodeURIComponent(texto + " " + url)}">
                        <i class="fa-brands fa-whatsapp"></i> WhatsApp
                    </a>

                    <a class="rede" target="_blank" rel="noopener"
                       href="https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}">
                        <i class="fa-brands fa-facebook-f"></i> Facebook
                    </a>

                    <a class="rede"
                       href="mailto:?subject=${encodeURIComponent("Conheça o Instituto Elo")}&body=${encodeURIComponent(texto + "\n" + url)}">
                        <i class="fa-regular fa-envelope"></i> E-mail
                    </a>

                    ${navigator.share ? `
                        <button type="button" class="rede" id="maisOpcoes">
                            <i class="fa-solid fa-share-nodes"></i> Mais opções
                        </button>
                    ` : ""}
                </div>
            `);

            if ($("copiarConvite")) {
                $("copiarConvite").addEventListener("click", async () => {
                    try {
                        await navigator.clipboard.writeText(url);
                    } catch (erroCopia) {
                        if ($("linkConvite")) {
                            $("linkConvite").select();
                            document.execCommand("copy");
                        }
                    }

                    $("copiarConvite").textContent = "Copiado!";

                    setTimeout(() => {
                        if ($("copiarConvite")) {
                            $("copiarConvite").textContent = "Copiar";
                        }
                    }, 2000);
                });
            }

            if ($("maisOpcoes")) {
                $("maisOpcoes").addEventListener("click", async () => {
                    try {
                        await navigator.share({
                            title: "Instituto Elo",
                            text: texto,
                            url
                        });
                    } catch (erroCompartilhar) {
                        // O usuário pode cancelar o compartilhamento.
                    }
                });
            }
        });
    }

    // =====================================================
    // INICIALIZAÇÃO
    // =====================================================

    renderizarPerfil();
    renderizarNumeros();
    renderizarListas();
    atualizarMenuAdmin();

    const abaInicial = window.location.hash.replace("#", "");

    if (["geral", "criados", "apoiados", "informacoes"].includes(abaInicial)) {
        abrirAba(abaInicial);
    }
});
