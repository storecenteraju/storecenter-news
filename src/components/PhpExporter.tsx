import React, { useState } from 'react';
import { Download, FileText, Check, Copy, FolderPlus, Server, Database, ShieldAlert } from 'lucide-react';

interface PhpFile {
  name: string;
  path: string;
  type: 'php' | 'sql' | 'text';
  content: string;
}

export default function PhpExporter() {
  const [selectedFile, setSelectedFile] = useState<number>(0);
  const [copied, setCopied] = useState(false);

  const phpFiles: PhpFile[] = [
    {
      name: "banco.sql",
      path: "banco.sql",
      type: "sql",
      content: `-- Banco de Dados para Store Center Portal de Notícias
-- Compatível com MySQL 5.7+ e MySQL 8.0+ em qualquer hospedagem cPanel comum

CREATE DATABASE IF NOT EXISTS \`store_center_db\` DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE \`store_center_db\`;

-- 1. TABELA DE CATEGORIAS
CREATE TABLE IF NOT EXISTS \`categorias\` (
  \`id\` int(11) NOT NULL AUTO_INCREMENT,
  \`nome\` varchar(100) NOT NULL,
  \`slug\` varchar(100) NOT NULL,
  PRIMARY KEY (\`id\`),
  UNIQUE KEY \`slug\` (\`slug\`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

INSERT INTO \`categorias\` (\`id\`, \`nome\`, \`slug\`) VALUES
(1, 'Economia', 'economia'),
(2, 'Política', 'politica'),
(3, 'Negócios', 'negocios'),
(4, 'Tecnologia', 'tecnologia'),
(5, 'Geopolítica', 'geopolitica'),
(6, 'Nacional', 'nacional'),
(7, 'Esporte', 'esporte'),
(8, 'Saúde', 'saude'),
(9, 'Entretenimento', 'entretenimento');

-- 2. TABELA DE POSTS
CREATE TABLE IF NOT EXISTS \`posts\` (
  \`id\` int(11) NOT NULL AUTO_INCREMENT,
  \`titulo\` varchar(255) NOT NULL,
  \`subtitulo\` varchar(255) DEFAULT NULL,
  \`slug\` varchar(255) NOT NULL,
  \`conteudo\` text NOT NULL,
  \`categoria_id\` int(11) NOT NULL,
  \`autor\` varchar(100) NOT NULL DEFAULT 'Redação Store Center',
  \`data_publicacao\` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  \`data_agendada\` datetime DEFAULT NULL,
  \`status\` enum('publicado','rascunho','agendado') NOT NULL DEFAULT 'publicado',
  \`imagem_url\` varchar(255) DEFAULT NULL,
  \`seo_titulo\` varchar(150) DEFAULT NULL,
  \`seo_descricao\` varchar(255) DEFAULT NULL,
  \`palavra_chave\` varchar(100) DEFAULT NULL,
  \`tags\` varchar(255) DEFAULT NULL,
  \`visualizacoes\` int(11) NOT NULL DEFAULT '0',
  PRIMARY KEY (\`id\`),
  UNIQUE KEY \`slug\` (\`slug\`),
  KEY \`categoria_id\` (\`categoria_id\`),
  CONSTRAINT \`fk_posts_categorias\` FOREIGN KEY (\`categoria_id\`) REFERENCES \`categorias\` (\`id\`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 3. TABELA DE ANÚNCIOS ADSENSE
CREATE TABLE IF NOT EXISTS \`anuncios\` (
  \`id\` int(11) NOT NULL AUTO_INCREMENT,
  \`posicao\` varchar(50) NOT NULL, -- 'topo', 'meio', 'final', 'lateral', 'rodape'
  \`codigo\` text NOT NULL,
  \`ativo\` tinyint(1) NOT NULL DEFAULT '1',
  PRIMARY KEY (\`id\`),
  UNIQUE KEY \`posicao\` (\`posicao\`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

INSERT INTO \`anuncios\` (\`posicao\`, \`codigo\`, \`ativo\`) VALUES
('topo', '<!-- AdSense Topo (728x90) -->\\n<div style=\"background:#f3f4f6;padding:20px;text-align:center;border:1px dashed #ccc;margin:15px 0;\">Espaço de Anúncio AdSense Topo</div>', 1),
('meio', '<!-- AdSense Meio Artigo (Automático) -->\\n<div style=\"background:#f3f4f6;padding:20px;text-align:center;border:1px dashed #ccc;margin:15px 0;\">Espaço de Anúncio Meio do Artigo</div>', 1),
('final', '<!-- AdSense Final Artigo -->\\n<div style=\"background:#f3f4f6;padding:20px;text-align:center;border:1px dashed #ccc;margin:15px 0;\">Espaço de Anúncio Final do Artigo</div>', 1),
('lateral', '<!-- AdSense Sidebar Banner (300x600) -->\\n<div style=\"background:#f3f4f6;padding:50px 20px;text-align:center;border:1px dashed #ccc;height:400px;margin-bottom:20px;\">Anúncio Lateral AdSense 300x600</div>', 1),
('rodape', '<!-- AdSense Rodapé -->\\n<div style=\"background:#f3f4f6;padding:15px;text-align:center;border:1px dashed #ccc;margin-top:20px;\">Anúncio Rodapé Google AdSense</div>', 1);

-- 4. TABELA DE CONFIGURAÇÕES SITE
CREATE TABLE IF NOT EXISTS \`configuracoes\` (
  \`id\` int(11) NOT NULL AUTO_INCREMENT,
  \`chave\` varchar(100) NOT NULL,
  \`valor\` text DEFAULT NULL,
  PRIMARY KEY (\`id\`),
  UNIQUE KEY \`chave\` (\`chave\`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

INSERT INTO \`configuracoes\` (\`chave\`, \`valor\`) VALUES
('site_nome', 'Store Center'),
('site_descricao', 'Portal moderno e rápido de notícias corporativas, tecnologia, economia e mercado no Brasil.'),
('rodape_texto', '© 2026 Store Center Portal de Notícias. Todos os direitos reservados. Design limpo e focado na leitura.'),
('email_contato', 'contato@storecenter.com.br'),
('google_analytics', 'UA-XXXXXXXX-Y');

-- 5. TABELA DE USUÁRIOS ADMINISTRADORES COORDENADOS
CREATE TABLE IF NOT EXISTS \`usuarios\` (
  \`id\` int(11) NOT NULL AUTO_INCREMENT,
  \`nome\` varchar(100) NOT NULL,
  \`usuario\` varchar(50) NOT NULL,
  \`senha\` varchar(255) NOT NULL, -- senha criptografada em PHP password_hash()
  PRIMARY KEY (\`id\`),
  UNIQUE KEY \`usuario\` (\`usuario\`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Usuário padrão: admin | Senha: admin123 (Criptografado com bcrypt)
INSERT INTO \`usuarios\` (\`id\`, \`nome\`, \`usuario\`, \`senha\`) VALUES
(1, 'Administrador Store Center', 'admin', '$2y$10$tZ2zJgZ4Oas/G1K5Yd6xDe1Gf2R0x86qOnYcAnvXzG94Z4b9wM93i');

-- 6. TABELA DE RSS FEEDS AUTOCADASTRADOS
CREATE TABLE IF NOT EXISTS \`feeds_rss\` (
  \`id\` int(11) NOT NULL AUTO_INCREMENT,
  \`nome\` varchar(150) NOT NULL,
  \`url\` varchar(255) NOT NULL,
  \`categoria_id\` int(11) NOT NULL,
  \`ativo\` tinyint(1) NOT NULL DEFAULT '1',
  PRIMARY KEY (\`id\`),
  KEY \`categoria_id\` (\`categoria_id\`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

INSERT INTO \`feeds_rss\` (\`nome\`, \`url\`, \`categoria_id\`) VALUES
('G1 - Economia', 'https://g1.globo.com/dynamo/economia/rss2.xml', 1),
('CNN Brasil - Economia', 'https://www.cnnbrasil.com.br/business/feed/', 1),
('G1 - Tecnologia', 'https://g1.globo.com/dynamo/tecnologia-e-games/rss2.xml', 4);
`
    },
    {
      name: "conexao.php",
      path: "includes/conexao.php",
      type: "php",
      content: `<?php
// Configurações de Conexão com o Banco de Dados no cPanel
// Substitua pelas credenciais criadas no Assistente de Banco de Dados MySQL do cPanel

$db_host = 'localhost';
$db_name = 'store_center_db'; // nome do banco criado
$db_user = 'root';            // usuário criado
$db_pass = '';                // senha criada

try {
    $db = new PDO(\"mysql:host=$db_host;dbname=$db_name;charset=utf8mb4\", $db_user, $db_pass, [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        PDO::ATTR_EMULATE_PREPARES => false,
    ]);
} catch (PDOException $e) {
    die(\"Erro ao conectar ao banco de dados: \" . $e->getMessage());
}

// Inicializa configurações do site
function obterConfiguracao($chave, $padrao = '') {
    global $db;
    try {
        $stmt = $db->prepare(\"SELECT valor FROM configuracoes WHERE chave = ? LIMIT 1\");
        $stmt->execute([$chave]);
        $row = $stmt->fetch();
        return $row ? $row['valor'] : $padrao;
    } catch (Exception $e) {
        return $padrao;
    }
}

// Obter anúncios do banco
function obterAnuncio($posicao) {
    global $db;
    try {
        $stmt = $db->prepare(\"SELECT codigo, ativo FROM anuncios WHERE posicao = ? LIMIT 1\");
        $stmt->execute([$posicao]);
        $row = $stmt->fetch();
        if ($row && $row['ativo'] == 1) {
            return $row['codigo'];
        }
    } catch (Exception $e) {}
    return '';
}
?>`
    },
    {
      name: "header.php",
      path: "includes/header.php",
      type: "php",
      content: `<?php
require_once __DIR__ . '/conexao.php';
$site_nome = obterConfiguracao('site_nome', 'Store Center');
$site_descr = obterConfiguracao('site_descricao', 'Portal de Notícias profissional');

// Carrega categorias comuns
$stmt_cats = $db->query(\"SELECT * FROM categorias ORDER BY nome ASC\");
$todas_categorias = $stmt_cats->fetchAll();
?>
<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title><?php echo isset($seo_titulo) ? htmlspecialchars($seo_titulo) : htmlspecialchars($site_nome . \" - Economia, Política e Inovação\"); ?></title>
    <meta name="description" content="<?php echo isset($seo_descricao) ? htmlspecialchars($seo_descricao) : htmlspecialchars($site_descr); ?>">
    <!-- Google Fonts -->
    <link href=\"https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=Space+Grotesk:wght@500;700&display=swap\" rel=\"stylesheet\">
    <!-- Tailwind CSS Oficial via CDN -->
    <script src=\"https://cdn.tailwindcss.com\"></script>
    <script>
        tailwind.config = {
            theme: {
                extend: {
                    colors: {
                        primary: '#0F52BA', // Azul Real
                        secondary: '#16a34a', // Verde
                    },
                    fontFamily: {
                        sans: ['Inter', 'sans-serif'],
                        display: ['Space Grotesk', 'sans-serif'],
                    }
                }
            }
        }
    </script>
    <style>
        body { font-family: 'Inter', sans-serif; }
        .font-display { font-family: 'Space Grotesk', sans-serif; }
    </style>
</head>
<body class=\"bg-slate-50 text-slate-900 flex flex-col min-h-screen\">

    <!-- TOPO DE ANÚNCIO -->
    <?php $adv_top = obterAnuncio('topo'); if (!empty($adv_top)): ?>
        <div class=\"container mx-auto px-4 max-w-7xl mt-4\">
            <?php echo $adv_top; ?>
        </div>
    <?php endif; ?>

    <!-- CABEÇALHO -->
    <header class=\"bg-white border-b border-slate-200 mt-4\">
        <div class=\"container mx-auto px-4 py-6 max-w-7xl flex flex-col md:flex-row items-center justify-between gap-4\">
            <a href=\"index.php\" class=\"flex items-center gap-3\">
                <!-- Logo Visual Azul Real e Branco -->
                <div class=\"bg-primary text-white p-2.5 rounded shadow-sm text-2xl font-bold font-display uppercase tracking-wider\">
                    S<span class=\"text-secondary\">C</span>
                </div>
                <div>
                    <span class=\"text-2xl font-extrabold font-display tracking-tight text-slate-900 uppercase\">STORE <span class=\"text-primary\">CENTER</span></span>
                    <p class=\"text-xs text-slate-500 font-medium tracking-widest uppercase\">Portal de Notícias & Inovação</p>
                </div>
            </a>
            
            <div class=\"text-right text-xs text-slate-500 font-medium\">
                <p>Brasília, <?php echo date('d/m/Y'); ?> | Conectado</p>
                <a href=\"admin/login.php\" class=\"text-primary hover:text-blue-700 transition-colors ml-2 font-semibold hover:underline\">Área Administrativa</a>
            </div>
        </div>

        <!-- MENU DE CATEGORIAS -->
        <nav class=\"bg-slate-900 text-white scrollbar-hide overflow-x-auto\">
            <div class=\"container mx-auto px-4 max-w-7xl flex space-x-1\">
                <a href=\"index.php\" class=\"px-4 py-3 text-sm font-medium hover:bg-slate-800 transition-colors uppercase select-none tracking-wide flex-shrink-0\">Home</a>
                <?php foreach($todas_categorias as $cat): ?>
                    <a href=\"categoria.php?slug=<?php echo $cat['slug']; ?>\" class=\"px-4 py-3 text-sm font-medium hover:bg-slate-800 hover:text-secondary transition-colors uppercase select-none tracking-wide flex-shrink-0\">
                        <?php echo htmlspecialchars($cat['nome']); ?>
                    </a>
                <?php endforeach; ?>
            </div>
        </nav>
    </header>
`
    },
    {
      name: "footer.php",
      path: "includes/footer.php",
      type: "php",
      content: `<?php
$site_nome = obterConfiguracao('site_nome', 'Store Center');
$site_descr = obterConfiguracao('site_descricao', 'Portal brasileiro de notícias de mercado.');
$footer_text = obterConfiguracao('rodape_texto', '© 2026 Store Center. Todos os direitos reservados.');
?>
    <!-- FOOTER AD -->
    <?php $adv_foot = obterAnuncio('rodape'); if (!empty($adv_foot)): ?>
        <div class=\"container mx-auto px-4 max-w-7xl my-6\">
            <?php echo $adv_foot; ?>
        </div>
    <?php endif; ?>

    <footer class=\"bg-slate-900 text-slate-400 py-12 mt-auto border-t border-slate-800\">
        <div class=\"container mx-auto px-4 max-w-7xl grid grid-cols-1 md:grid-cols-3 gap-8\">
            <div>
                <div class=\"flex items-center gap-2 mb-4\">
                    <div class=\"bg-primary text-white p-1 rounded font-bold uppercase tracking-wide\">SC</div>
                    <span class=\"text-xl font-bold font-display text-white tracking-widest\">STORE CENTER</span>
                </div>
                <p class=\"text-sm text-slate-400 mb-4\"><?php echo htmlspecialchars($site_descr); ?></p>
            </div>
            
            <div>
                <h4 class=\"text-white font-semibold font-display mb-4 uppercase text-sm tracking-wide\">Institucional</h4>
                <ul class=\"space-y-2 text-sm\">
                    <li><a href=\"#\" class=\"hover:text-white transition-colors\">Sobre Nós</a></li>
                    <li><a href=\"#\" class=\"hover:text-white transition-colors\">Política de Privacidade</a></li>
                    <li><a href=\"#\" class=\"hover:text-white transition-colors\">Anuncie Conosco</a></li>
                    <li><a href=\"sitemap.php\" class=\"text-secondary hover:text-white transition-colors font-semibold\">Sitemap XML</a></li>
                </ul>
            </div>
            
            <div>
                <h4 class=\"text-white font-semibold font-display mb-4 uppercase text-sm tracking-wide\">Fale Conosco</h4>
                <p class=\"text-sm mb-2\">Dúvidas, pautas ou sugestões comerciais:</p>
                <p class=\"text-white text-sm font-semibold\"><?php echo htmlspecialchars(obterConfiguracao('email_contato', 'redacao@storecenter.com.br')); ?></p>
            </div>
        </div>

        <div class=\"container mx-auto px-4 max-w-7xl mt-8 pt-8 border-t border-slate-800 text-center text-xs\">
            <p><?php echo htmlspecialchars($footer_text); ?></p>
        </div>
    </footer>
</body>
</html>`
    },
    {
      name: "sidebar.php",
      path: "includes/sidebar.php",
      type: "php",
      content: `<?php
// Busca posts mais vistos para a barra lateral
$stmt_laterais = $db->query(\"SELECT p.*, c.nome as cat_nome, c.slug as cat_slug 
  FROM posts p 
  JOIN categorias c ON p.categoria_id = c.id 
  WHERE p.status = 'publicado' 
  ORDER BY p.visualizacoes DESC LIMIT 5\");
$posts_populares = $stmt_laterais->fetchAll();
?>
<aside class=\"space-y-8\">
    <!-- ANÚNCIO LATERAL -->
    <?php $adv_side = obterAnuncio('lateral'); if (!empty($adv_side)): ?>
        <div class=\"bg-white p-4 border border-slate-200 rounded shadow-sm\">
            <p class=\"text-[10px] text-slate-400 uppercase tracking-widest text-center mb-2\">Publicidade</p>
            <?php echo $adv_side; ?>
        </div>
    <?php endif; ?>

    <!-- MAIS LIDAS -->
    <div class=\"bg-white p-6 border border-slate-200 rounded shadow-sm\">
        <h3 class=\"text-lg font-bold font-display text-slate-900 border-l-4 border-primary pl-3 mb-4 uppercase tracking-tight\">As Mais Lidas</h3>
        <div class=\"space-y-4\">
            <?php $rank = 1; foreach($posts_populares as $pop): ?>
                <div class=\"flex gap-3\">
                    <div class=\"text-3xl font-extrabold font-display text-slate-200 w-8 flex-shrink-0 text-right\">
                        <?php echo $rank++; ?>
                    </div>
                    <div>
                        <a href=\"categoria.php?slug=<?php echo $pop['cat_slug']; ?>\" class=\"text-[10px] font-bold text-primary uppercase tracking-wider mb-0.5 block\">
                            <?php echo htmlspecialchars($pop['cat_nome']); ?>
                        </a>
                        <a href=\"post.php?slug=<?php echo $pop['slug']; ?>\" class=\"text-sm font-semibold text-slate-800 hover:text-primary transition-colors hover:underline line-clamp-2\">
                            <?php echo htmlspecialchars($pop['titulo']); ?>
                        </a>
                    </div>
                </div>
            <?php endforeach; ?>
        </div>
    </div>
</aside>`
    },
    {
      name: "index.php",
      path: "index.php",
      type: "php",
      content: `<?php
require_once 'includes/conexao.php';

// Busca post em destaque principal
$stmt_destaque = $db->query(\"SELECT p.*, c.nome as cat_nome, c.slug as cat_slug 
  FROM posts p 
  JOIN categorias c ON p.categoria_id = c.id 
  WHERE p.status = 'publicado' 
  ORDER BY p.data_publicacao DESC LIMIT 1\");
$destaque = $stmt_destaque->fetch();

$destaque_id = $destaque ? $destaque['id'] : 0;

// Busca posts mais recentes (excluindo o destaque)
if ($destaque_id > 0) {
    $stmt_recentes = $db->prepare(\"SELECT p.*, c.nome as cat_nome, c.slug as cat_slug 
      FROM posts p 
      JOIN categorias c ON p.categoria_id = c.id 
      WHERE p.status = 'publicado' AND p.id != ? 
      ORDER BY p.data_publicacao DESC LIMIT 6\");
    $stmt_recentes->execute([$destaque_id]);
} else {
    $stmt_recentes = $db->prepare(\"SELECT p.*, c.nome as cat_nome, c.slug as cat_slug 
      FROM posts p 
      JOIN categorias c ON p.categoria_id = c.id 
      WHERE p.status = 'publicado' 
      ORDER BY p.data_publicacao DESC LIMIT 6\");
    $stmt_recentes->execute([]);
}
$recentes = $stmt_recentes->fetchAll();

include 'includes/header.php';
?>

<main class=\"container mx-auto px-4 max-w-7xl py-8 flex-grow\">
    <div class=\"grid grid-cols-1 lg:grid-cols-4 gap-8\">
        
        <!-- COLUNA PRINCIPAL DE NOTÍCIAS -->
        <div class=\"lg:col-span-3 space-y-12\">
            
            <!-- DESTAQUE PRINCIPAL -->
            <?php if ($destaque): ?>
                <section class=\"bg-white border border-slate-200 rounded overflow-hidden shadow-sm flex flex-col md:flex-row\">
                    <div class=\"md:w-3/5 h-64 md:h-96 relative\">
                        <img src=\"<?php echo htmlspecialchars($destaque['imagem_url'] ? $destaque['imagem_url'] : 'assets/image_placeholder.jpg'); ?>\" alt=\"\" class=\"w-full h-full object-cover\">
                        <span class=\"absolute top-4 left-4 bg-primary text-white text-xs font-bold font-display px-3 py-1.5 uppercase tracking-wide rounded-sm\">
                            <?php echo htmlspecialchars($destaque['cat_nome']); ?>
                        </span>
                    </div>
                    <div class=\"md:w-2/5 p-6 md:p-8 flex flex-col justify-center\">
                        <span class=\"text-[11px] font-bold text-slate-400 uppercase tracking-widest block mb-2\">
                            Por <?php echo htmlspecialchars($destaque['autor']); ?> — <?php echo date('d M, Y', strtotime($destaque['data_publicacao'])); ?>
                        </span>
                        <h2 class=\"text-2xl md:text-3xl font-bold font-display text-slate-900 leading-tight mb-4 hover:text-primary transition-colors\">
                            <a href=\"post.php?slug=<?php echo $destaque['slug']; ?>\"><?php echo htmlspecialchars($destaque['titulo']); ?></a>
                        </h2>
                        <p class=\"text-slate-600 text-sm line-clamp-3 mb-6\">
                            <?php echo htmlspecialchars($destaque['subtitulo']); ?>
                        </p>
                        <a href=\"post.php?slug=<?php echo $destaque['slug']; ?>\" class=\"self-start text-xs font-bold text-primary hover:text-blue-700 transition-colors uppercase tracking-wider border-b-2 border-primary pb-1\">
                            Ler Artigo Completo &rarr;
                        </a>
                    </div>
                </section>
            <?php endif; ?>

            <!-- POSTS RECENTES -->
            <section class=\"space-y-6\">
                <h3 class=\"text-xl font-bold font-display text-slate-900 border-l-4 border-primary pl-3 uppercase tracking-tight\">Notícias Recentes</h3>
                
                <div class=\"grid grid-cols-1 md:grid-cols-2 gap-6\">
                    <?php foreach($recentes as $post): ?>
                        <div class=\"bg-white border border-slate-200 rounded overflow-hidden shadow-sm flex flex-col\">
                            <div class=\"h-48 relative overflow-hidden\">
                                <img src=\"<?php echo htmlspecialchars($post['imagem_url'] ? $post['imagem_url'] : 'assets/image_placeholder.jpg'); ?>\" alt=\"\" class=\"w-full h-full object-cover hover:scale-105 transition-transform duration-300\">
                                <a href=\"categoria.php?slug=<?php echo $post['cat_slug']; ?>\" class=\"absolute top-3 left-3 bg-slate-900 text-white text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-sm\">
                                    <?php echo htmlspecialchars($post['cat_nome']); ?>
                                </a>
                            </div>
                            <div class=\"p-5 flex-grow flex flex-col justify-between\">
                                <div>
                                    <span class=\"text-[10px] font-bold text-slate-400 block mb-2\">
                                        <?php echo date('d/m/Y \à\s H:i', strtotime($post['data_publicacao'])); ?>
                                    </span>
                                    <h4 class=\"text-base font-bold font-display text-slate-900 leading-snug mb-2 hover:text-primary transition-colors line-clamp-2\">
                                        <a href=\"post.php?slug=<?php echo $post['slug']; ?>\"><?php echo htmlspecialchars($post['titulo']); ?></a>
                                    </h4>
                                    <p class=\"text-slate-600 text-xs line-clamp-2 mb-4\">
                                        <?php echo htmlspecialchars($post['subtitulo']); ?>
                                    </p>
                                </div>
                                <a href=\"post.php?slug=<?php echo $post['slug']; ?>\" class=\"text-xs font-bold text-primary hover:text-blue-700 transition-colors uppercase tracking-wider flex items-center gap-1 mt-2\">
                                    Ler mais <span class=\"text-md\">&rarr;</span>
                                </a>
                            </div>
                        </div>
                    <?php endforeach; ?>
                </div>
            </section>

        </div>

        <!-- BARRA LATERAL (ADs + MAIS LIDAS) -->
        <div class=\"lg:col-span-1\">
            <?include 'includes/sidebar.php';?>
        </div>

    </div>
</main>

<?php include 'includes/footer.php'; ?>`
    },
    {
      name: "post.php",
      path: "post.php",
      type: "php",
      content: `<?php
require_once 'includes/conexao.php';

$slug = isset($_GET['slug']) ? $_GET['slug'] : '';

// Busca o artigo completo no BD
$stmt = $db->prepare(\"SELECT p.*, c.nome as cat_nome, c.slug as cat_slug 
  FROM posts p 
  JOIN categorias c ON p.categoria_id = c.id 
  WHERE p.slug = ? AND p.status = 'publicado' LIMIT 1\");
$stmt->execute([$slug]);
$post = $stmt->fetch();

if (!$post) {
    header(\"HTTP/1.1 404 Not Found\");
    die(\"Notícia não encontrada no Store Center ou está aguardando agendamento comercial.\");
}

// Incrementa contador de visualizações
$stmt_view = $db->prepare(\"UPDATE posts SET visualizacoes = visualizacoes + 1 WHERE id = ?\");
$stmt_view->execute([$post['id']]);

// Define variáveis de SEO para o cabeçalho
$seo_titulo = $post['seo_titulo'] ? $post['seo_titulo'] : $post['titulo'] . \" | Store Center\";
$seo_descricao = $post['seo_descricao'] ? $post['seo_descricao'] : $post['subtitulo'];

// Busca posts relacionados (mesma categoria, excluindo o atual)
$stmt_rel = $db->prepare(\"SELECT p.*, c.nome as cat_nome, c.slug as cat_slug 
  FROM posts p 
  JOIN categorias c ON p.categoria_id = c.id 
  WHERE p.status = 'publicado' AND p.categoria_id = ? AND p.id != ? 
  ORDER BY p.data_publicacao DESC LIMIT 3\");
$stmt_rel->execute([$post['categoria_id'], $post['id']]);
$relacionados = $stmt_rel->fetchAll();

include 'includes/header.php';
?>

<main class=\"container mx-auto px-4 max-w-7xl py-8 flex-grow\">
    <!-- BREADCRUMB -->
    <div class=\"text-xs text-slate-500 mb-6 flex items-center gap-2\">
        <a href=\"index.php\" class=\"hover:underline\">Home</a>
        <span>&bull;</span>
        <a href=\"categoria.php?slug=<?php echo $post['cat_slug']; ?>\" class=\"hover:underline uppercase font-bold text-primary\"><?php echo htmlspecialchars($post['cat_nome']); ?></a>
        <span>&bull;</span>
        <span class=\"text-slate-400 line-clamp-1\"><?php echo htmlspecialchars($post['titulo']); ?></span>
    </div>

    <div class=\"grid grid-cols-1 lg:grid-cols-4 gap-8\">
        
        <!-- ARTIGO COMPLETO -->
        <article class=\"lg:col-span-3 bg-white border border-slate-200 rounded p-6 md:p-8 shadow-sm\">
            <header class=\"mb-6\">
                <a href=\"categoria.php?slug=<?php echo $post['cat_slug']; ?>\" class=\"bg-primary text-white text-[10px] font-bold uppercase tracking-widest px-3 py-1.5 rounded-sm inline-block mb-3\">
                    <?php echo htmlspecialchars($post['cat_nome']); ?>
                </a>
                
                <h1 class=\"text-2xl md:text-4xl font-extrabold font-display text-slate-900 tracking-tight leading-tight mb-3\">
                    <?php echo htmlspecialchars($post['titulo']); ?>
                </h1>
                
                <?php if ($post['subtitulo']): ?>
                    <p class=\"text-slate-600 text-base md:text-lg mb-4 font-normal leading-relaxed\">
                        <?php echo htmlspecialchars($post['subtitulo']); ?>
                    </p>
                <?php endif; ?>

                <div class=\"border-t border-b border-slate-100 py-3 flex flex-wrap items-center justify-between text-xs text-slate-500 gap-2\">
                    <div>
                        Escrito por <strong class=\"text-slate-700\"><?php echo htmlspecialchars($post['autor']); ?></strong>
                    </div>
                    <div>
                        Publicado em: <strong><?php echo date('d/m/Y \à\s H:i', strtotime($post['data_publicacao'])); ?></strong>
                    </div>
                </div>
            </header>

            <!-- IMAGEM DESTACADA -->
            <div class=\"rounded overflow-hidden mb-6 h-64 md:h-120\">
                <img src=\"<?php echo htmlspecialchars($post['imagem_url'] ? $post['imagem_url'] : 'assets/image_placeholder.jpg'); ?>\" alt=\"\" class=\"w-full h-full object-cover\">
            </div>

            <!-- ANÚNCIO MEIO ARTIGO -->
            <?php $adv_mid = obterAnuncio('meio'); if (!empty($adv_mid)): ?>
                <div class=\"my-6\">
                    <?php echo $adv_mid; ?>
                </div>
            <?php endif; ?>

            <!-- CONTEÚDO -->
            <div class=\"prose prose-slate max-w-none text-slate-800 leading-relaxed text-base space-y-6\">
                <?php echo nl2br(htmlspecialchars($post['conteudo'])); ?>
            </div>

            <!-- TAGS -->
            <?php if (!empty($post['tags'])): ?>
                <div class=\"mt-8 pt-6 border-t border-slate-100 flex flex-wrap items-center gap-2\">
                    <span class=\"text-xs text-slate-400 font-bold uppercase mr-1\">Tags:</span>
                    <?php 
                    $tagsArray = explode(',', $post['tags']);
                    foreach($tagsArray as $tg): $tg = trim($tg); if(!empty($tg)):
                    ?>
                        <span class=\"bg-slate-100 text-slate-600 px-2.5 py-1 text-xs font-semibold rounded hover:bg-slate-200 transition-colors uppercase\">
                            #<?php echo htmlspecialchars($tg); ?>
                        </span>
                    <?php endif; endforeach; ?>
                </div>
            <?php endif; ?>

            <!-- ANÚNCIO FINAL ARTIGO -->
            <?php $adv_bottom = obterAnuncio('final'); if (!empty($adv_bottom)): ?>
                <div class=\"mt-8 bg-slate-50 p-4 border border-dashed border-slate-200 rounded text-center\">
                    <?php echo $adv_bottom; ?>
                </div>
            <?php endif; ?>

            <!-- POSTS RELACIONADOS DA MESMA CATEGORIA -->
            <div class=\"mt-12\">
                <h3 class=\"text-lg font-bold font-display text-slate-900 border-l-4 border-primary pl-3 uppercase mb-6\">Notícias Relacionadas</h3>
                <div class=\"grid grid-cols-1 md:grid-cols-3 gap-6\">
                    <?php foreach($relacionados as $rel): ?>
                        <div class=\"bg-white border border-slate-100 rounded overflow-hidden shadow-sm flex flex-col\">
                            <div class=\"h-32 relative overflow-hidden\">
                                <img src=\"<?php echo htmlspecialchars($rel['imagem_url'] ? $rel['imagem_url'] : 'assets/image_placeholder.jpg'); ?>\" alt=\"\" class=\"w-full h-full object-cover\">
                            </div>
                            <div class=\"p-4 flex-grow flex flex-col justify-between\">
                                <h4 class=\"text-xs font-bold text-slate-800 hover:text-primary transition-colors line-clamp-2 leading-snug mb-2\">
                                    <a href=\"post.php?slug=<?php echo $rel['slug']; ?>\"><?php echo htmlspecialchars($rel['titulo']); ?></a>
                                </h4>
                                <span class=\"text-[9px] text-slate-400\">
                                    <?php echo date('d/m/Y', strtotime($rel['data_publicacao'])); ?>
                                </span>
                            </div>
                        </div>
                    <?php endforeach; ?>
                </div>
            </div>

        </article>

        <!-- BARRA LATERAL -->
        <div class=\"lg:col-span-1\">
            <?php include 'includes/sidebar.php'; ?>
        </div>

    </div>
</main>

<?php include 'includes/footer.php'; ?>`
    },
    {
      name: "categoria.php",
      path: "categoria.php",
      type: "php",
      content: `<?php
require_once 'includes/conexao.php';

$slug = isset($_GET['slug']) ? $_GET['slug'] : '';

// Busca a categoria pelo slug
$stmt_cat = $db->prepare(\"SELECT * FROM categorias WHERE slug = ? LIMIT 1\");
$stmt_cat->execute([$slug]);
$categoria = $stmt_cat->fetch();

if (!$categoria) {
    header(\"HTTP/1.1 404 Not Found\");
    die(\"Categoria não encontrada neste portal.\");
}

// Busca os posts desta categoria
$stmt_posts = $db->prepare(\"SELECT p.*, c.nome as cat_nome, c.slug as cat_slug 
  FROM posts p 
  JOIN categorias c ON p.categoria_id = c.id 
  WHERE p.categoria_id = ? AND p.status = 'publicado' 
  ORDER BY p.data_publicacao DESC\");
$stmt_posts->execute([$categoria['id']]);
$posts = $stmt_posts->fetchAll();

$seo_titulo = \"Postagens sobre \" . $categoria['nome'] . \" | Store Center\";

include 'includes/header.php';
?>

<main class=\"container mx-auto px-4 max-w-7xl py-8 flex-grow\">
    <div class=\"mb-8\">
        <span class=\"text-xs text-slate-400 font-bold uppercase tracking-widest\">Categoria Oficial</span>
        <h1 class=\"text-3xl md:text-4xl font-extrabold font-display text-slate-900 border-b-2 border-primary pb-2 uppercase tracking-tight\">
            <?php echo htmlspecialchars($categoria['nome']); ?>
        </h1>
        <p class=\"text-sm text-slate-500 mt-2\">Confira nossa cobertura completa e notícias atualizadas continuamente sobre <?php echo htmlspecialchars($categoria['nome']); ?> no Brasil e no mundo.</p>
    </div>

    <div class=\"grid grid-cols-1 lg:grid-cols-4 gap-8\">
        
        <!-- GRID DE ARTIGOS -->
        <div class=\"lg:col-span-3\">
            <?php if (empty($posts)): ?>
                <div class=\"bg-white p-12 border border-slate-200 rounded shadow-sm text-center\">
                    <p class=\"text-slate-500 font-medium\">Não existem notícias publicadas nesta categoria até o momento.</p>
                    <a href=\"index.php\" class=\"inline-block mt-4 text-xs font-bold text-primary uppercase border border-primary px-4 py-2 hover:bg-primary hover:text-white transition-all\">Voltar para Home</a>
                </div>
            <?php else: ?>
                <div class=\"grid grid-cols-1 md:grid-cols-2 gap-6\">
                    <?php foreach($posts as $post): ?>
                        <div class=\"bg-white border border-slate-200 rounded overflow-hidden shadow-sm flex flex-col\">
                            <div class=\"h-48 relative overflow-hidden bg-slate-100\">
                                <img src=\"<?php echo htmlspecialchars($post['imagem_url'] ? $post['imagem_url'] : 'assets/image_placeholder.jpg'); ?>\" alt=\"\" class=\"w-full h-full object-cover hover:scale-105 transition-transform duration-300\">
                            </div>
                            <div class=\"p-5 flex-grow flex flex-col justify-between\">
                                <div>
                                    <span class=\"text-[10px] font-bold text-slate-400 block mb-2\">Autoria: <?php echo htmlspecialchars($post['autor']); ?> &bull; <?php echo date('d/m/Y', strtotime($post['data_publicacao'])); ?></span>
                                    <h3 class=\"text-base font-bold font-display text-slate-900 leading-snug hover:text-primary transition-colors line-clamp-2 mb-2\">
                                        <a href=\"post.php?slug=<?php echo $post['slug']; ?>\"><?php echo htmlspecialchars($post['titulo']); ?></a>
                                    </h3>
                                    <p class=\"text-slate-600 text-xs line-clamp-2 mb-4\">
                                        <?php echo htmlspecialchars($post['subtitulo']); ?>
                                    </p>
                                </div>
                                <a href=\"post.php?slug=<?php echo $post['slug']; ?>\" class=\"text-xs font-bold text-primary hover:text-blue-700 transition-colors uppercase tracking-wider mt-2\">Ler matéria completa &rarr;</a>
                            </div>
                        </div>
                    <?php endforeach; ?>
                </div>
            <?php endif; ?>
        </div>

        <!-- BARRA LATERAL -->
        <div class=\"lg:col-span-1\">
            <?php include 'includes/sidebar.php'; ?>
        </div>

    </div>
</main>

<?php include 'includes/footer.php'; ?>`
    },
    {
      name: "robots.txt",
      path: "robots.txt",
      type: "text",
      content: `User-agent: *
Allow: /
Disallow: /admin/

Sitemap: http://storecenter.com.br/sitemap.xml`
    },
    {
      name: "sitemap.php",
      path: "sitemap.php",
      type: "php",
      content: `<?php
require_once 'includes/conexao.php';

header(\"Content-Type: application/xml; charset=utf-8\");

// URL base do portal. Altere de acordo com o seu domínio hospedado.
$site_url = 'http://storecenter.com.br';

echo '<?xml version=\"1.0\" encoding=\"UTF-8\"?>' . PHP_EOL;
echo '<urlset xmlns=\"http://www.sitemaps.org/schemas/sitemap/0.9\">' . PHP_EOL;

// 1. Home
echo '<url>' . PHP_EOL;
echo '<loc>' . $site_url . '/index.php</loc>' . PHP_EOL;
echo '<changefreq>always</changefreq>' . PHP_EOL;
echo '<priority>1.0</priority>' . PHP_EOL;
echo '</url>' . PHP_EOL;

// 2. Páginas de Categorias
$stmt_cats = $db->query(\"SELECT slug FROM categorias\");
while($cat = $stmt_cats->fetch()) {
    echo '<url>' . PHP_EOL;
    echo '<loc>' . $site_url . '/categoria.php?slug=' . $cat['slug'] . '</loc>' . PHP_EOL;
    echo '<changefreq>daily</changefreq>' . PHP_EOL;
    echo '<priority>0.8</priority>' . PHP_EOL;
    echo '</url>' . PHP_EOL;
}

// 3. Páginas de Posts Publicados
$stmt_posts = $db->query(\"SELECT slug, data_publicacao FROM posts WHERE status = 'publicado'\");
while($post = $stmt_posts->fetch()) {
    echo '<url>' . PHP_EOL;
    echo '<loc>' . $site_url . '/post.php?slug=' . $post['slug'] . '</loc>' . PHP_EOL;
    echo '<lastmod>' . date('Y-m-d', strtotime($post['data_publicacao'])) . '</lastmod>' . PHP_EOL;
    echo '<changefreq>weekly</changefreq>' . PHP_EOL;
    echo '<priority>0.6</priority>' . PHP_EOL;
    echo '</url>' . PHP_EOL;
}

echo '</urlset>' . PHP_EOL;
?>`
    }
  ];

  const handleDownloadFile = (file: PhpFile) => {
    const blob = new Blob([file.content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = file.name;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleCopyCode = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadAll = () => {
    // Generates a simple text layout with index mapping and downloads all files sequentially
    phpFiles.forEach(file => {
      handleDownloadFile(file);
    });
  };

  return (
    <div id="php-exporter-panel" className="bg-slate-900 text-slate-100 rounded-xl p-6 border border-slate-800 shadow-2xl">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-5 mb-6">
        <div>
          <span className="bg-blue-900/45 text-blue-300 border border-blue-800 text-xs font-bold uppercase tracking-widest px-3 py-1 rounded inline-block mb-2">Exportador PHP Oficial</span>
          <h2 className="text-2xl font-bold font-display tracking-tight text-white flex items-center gap-2">
            <Server className="text-blue-500 w-6 h-6" /> Hospedagem cPanel & Banco SQL
          </h2>
          <p className="text-xs text-slate-400 mt-1">Gere todos os arquivos de um sistema de notícias dinâmico e carregue diretamente no gerenciador do cPanel.</p>
        </div>

        <button 
          onClick={handleDownloadAll}
          className="flex items-center justify-center gap-2 bg-gradient-to-r from-blue-600 to-emerald-600 hover:from-blue-700 hover:to-emerald-700 text-white text-xs font-bold uppercase tracking-wider px-5 py-3 rounded-lg shadow-lg hover:shadow-xl transition-all cursor-pointer select-none"
        >
          <Download className="w-4 h-4" /> Descarregar Todos os Arquivos
        </button>
      </div>

      <div className="bg-amber-950/20 border border-amber-900/50 rounded-lg p-4 mb-6 flex gap-3 text-slate-400 text-xs leading-relaxed">
        <ShieldAlert className="text-amber-500 w-6 h-6 flex-shrink-0" />
        <div>
          <strong className="text-amber-300 block mb-0.5">Seguro e Otimizado para cPanel / HostGator / Locaweb:</strong>
          Este sistema foi programado puramente em PHP moderno estruturado com PDO (evitando SQL Injection), com controle integrado de anúncios para o Google AdSense, meta-tags prontas para SEO (com slugs amigáveis), sitemap.xml automatizado via script e robots.txt correto. Não exige WordPress, oferecendo carregamento instantâneo.
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div className="lg:col-span-1 space-y-1">
          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest px-3 mb-2">Estrutura de Pasta</p>
          
          <div className="space-y-1 max-h-[380px] overflow-y-auto pr-2">
            <div className="p-2 border border-blue-950 bg-blue-950/20 rounded flex items-center gap-2 text-[11px] font-bold text-blue-300">
              <Database className="w-3.5 h-3.5" /> / Banco de Dados
            </div>
            <button 
              onClick={() => setSelectedFile(0)}
              className={`w-full text-left p-2.5 rounded text-xs font-semibold flex items-center gap-2 transition-colors ${selectedFile === 0 ? 'bg-blue-600 text-white' : 'hover:bg-slate-800 text-slate-400'}`}
            >
              <FileText className="w-3.5 h-3.5" /> banco.sql
            </button>

            <div className="p-2 pt-4 border-b border-slate-800 text-[11px] font-bold text-slate-500 flex items-center gap-1.5 uppercase">
              <FolderPlus className="w-3.5 h-3.5" /> includes /
            </div>
            {phpFiles.slice(1, 5).map((file, idx) => (
              <button 
                key={file.name}
                onClick={() => setSelectedFile(idx + 1)}
                className={`w-full text-left p-2.5 rounded text-xs font-semibold flex items-center gap-2 transition-colors ${selectedFile === idx + 1 ? 'bg-blue-600 text-white' : 'hover:bg-slate-800 text-slate-400'}`}
              >
                <FileText className="w-3.5 h-3.5" /> {file.name}
              </button>
            ))}

            <div className="p-2 pt-4 border-b border-slate-800 text-[11px] font-bold text-slate-500 flex items-center gap-1.5 uppercase">
              <FolderPlus className="w-3.5 h-3.5" /> raiz /
            </div>
            {phpFiles.slice(5).map((file, idx) => {
              const fileIndex = idx + 5;
              return (
                <button 
                  key={file.name}
                  onClick={() => setSelectedFile(fileIndex)}
                  className={`w-full text-left p-2.5 rounded text-xs font-semibold flex items-center gap-2 transition-colors ${selectedFile === fileIndex ? 'bg-blue-600 text-white' : 'hover:bg-slate-800 text-slate-400'}`}
                >
                  <FileText className="w-3.5 h-3.5" /> {file.name}
                </button>
              );
            })}
          </div>
        </div>

        <div className="lg:col-span-3">
          <div className="bg-slate-950 border border-slate-800 rounded-lg overflow-hidden flex flex-col h-[400px]">
            <div className="flex items-center justify-between px-4 py-2 bg-slate-900 border-b border-slate-800 text-xs">
              <span className="font-mono text-slate-400">caminho: <code className="text-blue-400">{phpFiles[selectedFile].path}</code></span>
              <div className="flex items-center gap-2">
                <button 
                  onClick={() => handleCopyCode(phpFiles[selectedFile].content)}
                  className="flex items-center gap-1 text-[11px] text-slate-300 hover:text-white bg-slate-800 px-2.5 py-1 rounded transition-colors cursor-pointer select-none"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5" />}
                  {copied ? 'Copiado!' : 'Copiar Código'}
                </button>
                <button 
                  onClick={() => handleDownloadFile(phpFiles[selectedFile])}
                  className="flex items-center gap-1 text-[11px] text-blue-300 hover:text-white bg-blue-950 border border-blue-900 px-2.5 py-1 rounded transition-all cursor-pointer select-none"
                >
                  <Download className="w-3.5 h-3.5" /> Baixar .php/sql
                </button>
              </div>
            </div>
            
            <div className="p-4 overflow-auto font-mono text-xs leading-relaxed text-slate-300 whitespace-pre scrollbar-thin">
              {phpFiles[selectedFile].content}
            </div>
          </div>
        </div>
      </div>

      <div className="mt-8 pt-6 border-t border-slate-800 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 text-xs text-slate-400">
        <div className="bg-slate-950/40 p-4 rounded-lg border border-slate-800">
          <h4 className="text-sm font-bold font-display text-white mb-2 flex items-center gap-1.5 uppercase">
            <span className="w-2 h-2 rounded-full bg-blue-500"></span> 1. Criar o Banco MySQL
          </h4>
          Acesse o painel cPanel, clique em <strong>Banco de Dados MySQL</strong>, crie um banco e importe o arquivo <code className="text-blue-300 bg-slate-900 px-1 rounded">banco.sql</code> na aba SQL de seu phpMyAdmin.
        </div>
        
        <div className="bg-slate-950/40 p-4 rounded-lg border border-slate-800">
          <h4 className="text-sm font-bold font-display text-white mb-2 flex items-center gap-1.5 uppercase">
            <span className="w-2 h-2 rounded-full bg-emerald-500"></span> 2. Ajustar Conexão
          </h4>
          Edite o arquivo <code className="text-blue-300 bg-slate-900 px-1 rounded">includes/conexao.php</code> colocando o host, o nome do banco, o usuário e a senha definida no seu banco de dados no cPanel.
        </div>

        <div className="bg-slate-950/40 p-4 rounded-lg border border-slate-800">
          <h4 className="text-sm font-bold font-display text-white mb-2 flex items-center gap-1.5 uppercase">
            <span className="w-2 h-2 rounded-full bg-green-500"></span> 3. Pronto para hospedar!
          </h4>
          Envie todos os arquivos dinâmicos no diretório <code className="text-blue-300 bg-slate-900 px-1 rounded">public_html</code> pelo gerenciador de arquivos do cPanel ou via FTP-clinf. Seu site estará live instantaneamente!
        </div>
      </div>
    </div>
  );
}
