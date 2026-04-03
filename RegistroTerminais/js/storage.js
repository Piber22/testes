/* ============================================================
   storage.js — Persistência local (localStorage)
   Guarda validações (fotos/assinaturas) que ainda não foram
   sincronizadas, e metadados de conclusões.
   ============================================================ */

const STORAGE_KEY = 'terminaltasks_completions';

// Objeto em memória: { [rowIndex]: { completedAt, type, photos, signerName, signature } }
let completions = {};

function loadCompletions() {
  try {
    completions = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
  } catch {
    completions = {};
  }
}

function saveCompletions() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(completions));
  } catch (e) {
    console.warn('Não foi possível salvar no localStorage:', e);
  }
}

function getCompletion(rowIndex) {
  return completions[rowIndex] || null;
}

function setCompletion(rowIndex, data) {
  completions[rowIndex] = data;
  saveCompletions();
}

function removeCompletion(rowIndex) {
  delete completions[rowIndex];
  saveCompletions();
}
