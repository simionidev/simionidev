#!/usr/bin/env node
/**
 * Atualiza a seção "Meus Projetos" no README.md com os repositórios do GitHub.
 * Usado pela GitHub Action update-readme-projects.
 */

const fs = require('fs');
const path = require('path');

const README_PATH = path.join(__dirname, '../../README.md');
const USERNAME = process.env.GITHUB_ACTOR || 'simionidev';
const TOKEN = process.env.GITHUB_TOKEN;

const REPO_API = `https://api.github.com/users/${USERNAME}/repos?per_page=100&sort=updated&type=owner`;

async function fetchRepos() {
  const headers = { Accept: 'application/vnd.github.v3+json' };
  if (TOKEN) headers.Authorization = `Bearer ${TOKEN}`;

  const res = await fetch(REPO_API, { headers });
  if (!res.ok) throw new Error(`GitHub API: ${res.status} ${res.statusText}`);
  return res.json();
}

function escapeTableCell(text) {
  if (text == null || text === '') return '-';
  return String(text).replace(/\|/g, '\\|').replace(/\n/g, ' ').trim().slice(0, 80);
}

function buildProjectsSection(repos) {
  // Exclui o repositório do perfil (username/username) e forks, se quiser só projetos próprios
  const filtered = repos.filter(
    (r) => r.name !== USERNAME && !r.fork && !r.private
  );

  if (filtered.length === 0) {
    return '\n*Nenhum repositório público encontrado.*\n';
  }

  const lines = [
    '',
    '| Repositório | Descrição | Linguagem |',
    '| :---------- | :-------- | :-------- |',
    ...filtered.slice(0, 20).map((r) => {
      const name = `[${escapeTableCell(r.name)}](${r.html_url})`;
      const desc = escapeTableCell(r.description);
      const lang = escapeTableCell(r.language);
      return `| ${name} | ${desc} | ${lang} |`;
    }),
    '',
  ];

  if (filtered.length > 20) {
    lines.push(`<sub>*Mostrando os 20 mais recentes. Total: ${filtered.length} repositórios.*</sub>`);
    lines.push('');
  }

  return lines.join('\n');
}

function updateReadme(projectsMarkdown) {
  const readme = fs.readFileSync(README_PATH, 'utf8');
  const startMarker = '<!-- PROJECTS_START -->';
  const endMarker = '<!-- PROJECTS_END -->';

  const startIdx = readme.indexOf(startMarker);
  const endIdx = readme.indexOf(endMarker);

  if (startIdx === -1 || endIdx === -1) {
    throw new Error(`README deve conter os marcadores ${startMarker} e ${endMarker}`);
  }

  const before = readme.slice(0, startIdx + startMarker.length);
  const after = readme.slice(endIdx);
  const newReadme = before + projectsMarkdown + '\n' + after;

  fs.writeFileSync(README_PATH, newReadme, 'utf8');
}

async function main() {
  const repos = await fetchRepos();
  const section = buildProjectsSection(repos);
  updateReadme(section);
  console.log('README atualizado com', repos.length, 'repositórios.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
