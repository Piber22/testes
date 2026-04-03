/* ============================================================
   config.js — URLs e constantes globais
   ============================================================ */

const CONFIG = {
  // URL pública do CSV (aba principal)
  csvUrl: 'https://docs.google.com/spreadsheets/d/e/2PACX-1vTq7bjB-D1umtMfPBaj3zvgn0psgfUEa6Vv1TsGTRuiz0WJS7yc7GgnGG2XhjMeOMpkTaEFrSNkPJwE/pub?gid=936349890&single=true&output=csv',

  // URL do Google Apps Script Web App para atualizar a planilha
  // Substitua pela URL gerada ao publicar seu Apps Script
  webAppUrl: 'https://script.google.com/macros/s/AKfycbzw39LceJtxhY3gC4cisrC1JTrY7jkUDUQo2B5ho52PVLAYwQm_OWblsXTbxF7GGj-X/exec',

  // Intervalo de atualização automática (ms)
  autoRefreshInterval: 5 * 60 * 1000, // 5 minutos
};

const WEEKDAYS  = ['domingo','segunda-feira','terça-feira','quarta-feira','quinta-feira','sexta-feira','sábado'];
const MONTHS    = ['janeiro','fevereiro','março','abril','maio','junho','julho','agosto','setembro','outubro','novembro','dezembro'];
