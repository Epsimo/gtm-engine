const saveButton = document.getElementById('save') as HTMLButtonElement;
const apiKeyInput = document.getElementById('apiKey') as HTMLInputElement;
const baseUrlInput = document.getElementById('baseUrl') as HTMLInputElement;
const statusDiv = document.getElementById('status') as HTMLDivElement;

function saveOptions() {
  const apiKey = apiKeyInput.value;
  const baseUrl = baseUrlInput.value;

  chrome.storage.local.set(
    { lgpApiKey: apiKey, lgpBaseUrl: baseUrl },
    () => {
      statusDiv.textContent = 'Settings saved.';
      setTimeout(() => {
        statusDiv.textContent = '';
      }, 750);
    }
  );
}

function restoreOptions() {
  chrome.storage.local.get(
    { lgpApiKey: '', lgpBaseUrl: 'https://api.leadgenius.app' },
    (items) => {
      apiKeyInput.value = (items.lgpApiKey as string) || '';
      baseUrlInput.value = (items.lgpBaseUrl as string) || 'https://api.leadgenius.app';
    }
  );
}

document.addEventListener('DOMContentLoaded', restoreOptions);
saveButton.addEventListener('click', saveOptions);
