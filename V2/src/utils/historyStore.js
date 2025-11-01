// Simple localStorage-based history store to integrate current activity with History.jsx

const STORAGE_KEY = 'production_history';

export function loadHistory() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (_) {
    return [];
  }
}

export function saveHistory(list) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
  } catch (_) {
    // ignore
  }
}

export function upsertHistory(entry) {
  const list = loadHistory();
  const index = list.findIndex(h => h.id === entry.id);
  if (index >= 0) {
    list[index] = { ...list[index], ...entry };
  } else {
    list.unshift(entry);
  }
  saveHistory(list);
  return list;
}

export function updateHistoryByWorkOrder(workOrderNumber, updates) {
  const list = loadHistory();
  const index = list.findIndex(h => h.workOrder === workOrderNumber);
  if (index >= 0) {
    list[index] = { ...list[index], ...updates };
    saveHistory(list);
  }
  return list;
}




