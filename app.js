const walletAddressEl = document.getElementById("walletAddress");
const connectWalletButton = document.getElementById("connectWalletButton");
const paymentForm = document.getElementById("paymentForm");
const walletTableBody = document.getElementById("walletTableBody");
const historyTableBody = document.getElementById("historyTableBody");
const previewStatus = document.getElementById("previewStatus");
const previewUnlock = document.getElementById("previewUnlock");
const previewCountdown = document.getElementById("previewCountdown");
const totalWallets = document.getElementById("totalWallets");
const lockedCount = document.getElementById("lockedCount");
const readyCount = document.getElementById("readyCount");
const completedCount = document.getElementById("completedCount");

const sampleWalletAddress = "0x9A73...21B5";

let connectedWallet = "";
let wallets = [
  {
    id: crypto.randomUUID(),
    walletAddress: "0x5C9e...f66D",
    beneficiary: "0x742d...f44e",
    balanceEth: 0.65,
    unlockTime: Date.now() + 4 * 60 * 1000,
    isWithdrawn: false,
  },
  {
    id: crypto.randomUUID(),
    walletAddress: "0xA4D2...11c0",
    beneficiary: "0x0F4b...c8E1",
    balanceEth: 1.2,
    unlockTime: Date.now() - 45 * 1000,
    isWithdrawn: false,
  },
  {
    id: crypto.randomUUID(),
    walletAddress: "0xD9bc...9a7F",
    beneficiary: "0x89b1...12Df",
    balanceEth: 0,
    unlockTime: Date.now() - 90 * 1000,
    isWithdrawn: true,
  },
];

let transactions = [
  {
    id: crypto.randomUUID(),
    createdAt: Date.now() - 8 * 60 * 1000,
    type: "Create",
    walletAddress: "0x5C9e...f66D",
    amountEth: 0.65,
    txHash: "0xcaf1...de44",
  },
  {
    id: crypto.randomUUID(),
    createdAt: Date.now() - 3 * 60 * 1000,
    type: "Withdraw",
    walletAddress: "0xD9bc...9a7F",
    amountEth: 0.8,
    txHash: "0x83e1...91bc",
  },
];

function truncateAddress(value) {
  if (value.length <= 14) return value;
  return `${value.slice(0, 6)}...${value.slice(-4)}`;
}

function formatDateTime(timestamp) {
  return new Intl.DateTimeFormat("en-GB", {
    dateStyle: "short",
    timeStyle: "medium",
  }).format(new Date(timestamp));
}

function formatCountdown(timestamp) {
  const diff = Math.max(0, timestamp - Date.now());
  const totalSeconds = Math.floor(diff / 1000);
  const hours = String(Math.floor(totalSeconds / 3600)).padStart(2, "0");
  const minutes = String(Math.floor((totalSeconds % 3600) / 60)).padStart(2, "0");
  const seconds = String(totalSeconds % 60).padStart(2, "0");
  return `${hours}:${minutes}:${seconds}`;
}

function getWalletStatus(wallet) {
  if (wallet.isWithdrawn || wallet.balanceEth <= 0) {
    return { label: "Completed", variant: "completed", actionable: false };
  }

  if (Date.now() >= wallet.unlockTime) {
    return { label: "Ready to Withdraw", variant: "ready", actionable: true };
  }

  return { label: "Locked", variant: "locked", actionable: false };
}

function syncPreview() {
  const duration = Number(document.getElementById("duration").value || 0);
  const unlockTime = Date.now() + duration * 1000;
  previewStatus.textContent = duration > 0 ? "Locked" : "Locked";
  previewUnlock.textContent = duration > 0 ? formatDateTime(unlockTime) : "--/--/---- --:--:--";
  previewCountdown.textContent = duration > 0 ? formatCountdown(unlockTime) : "00:00:00";
}

function renderSummary() {
  const statuses = wallets.map(getWalletStatus);
  totalWallets.textContent = String(wallets.length);
  lockedCount.textContent = String(statuses.filter((item) => item.variant === "locked").length);
  readyCount.textContent = String(statuses.filter((item) => item.variant === "ready").length);
  completedCount.textContent = String(statuses.filter((item) => item.variant === "completed").length);
}

function renderWalletTable() {
  walletTableBody.innerHTML = "";

  if (!wallets.length) {
    const emptyRow = document.getElementById("emptyStateTemplate").content.cloneNode(true);
    walletTableBody.appendChild(emptyRow);
    return;
  }

  wallets.forEach((wallet) => {
    const status = getWalletStatus(wallet);
    const row = document.createElement("tr");

    row.innerHTML = `
      <td><code>${wallet.walletAddress}</code></td>
      <td><code>${wallet.beneficiary}</code></td>
      <td>${wallet.balanceEth.toFixed(3)} ETH</td>
      <td>${formatDateTime(wallet.unlockTime)}</td>
      <td>${status.variant === "completed" ? "--:--:--" : formatCountdown(wallet.unlockTime)}</td>
      <td><span class="status-pill status-pill--${status.variant}">${status.label}</span></td>
      <td>
        <button class="button button--table ${status.actionable ? "button--success" : "button--ghost"}" ${
          status.actionable ? "" : "disabled"
        } data-wallet-id="${wallet.id}">
          ${status.actionable ? "Withdraw" : status.label === "Completed" ? "Completed" : "Locked"}
        </button>
      </td>
    `;

    walletTableBody.appendChild(row);
  });
}

function renderHistory() {
  historyTableBody.innerHTML = "";

  if (!transactions.length) {
    const row = document.createElement("tr");
    row.innerHTML = '<td colspan="5" class="empty-state">No transactions yet.</td>';
    historyTableBody.appendChild(row);
    return;
  }

  transactions
    .slice()
    .sort((a, b) => b.createdAt - a.createdAt)
    .forEach((entry) => {
      const row = document.createElement("tr");
      row.innerHTML = `
        <td>${formatDateTime(entry.createdAt)}</td>
        <td>${entry.type}</td>
        <td><code>${entry.walletAddress}</code></td>
        <td>${entry.amountEth.toFixed(3)} ETH</td>
        <td><code>${entry.txHash}</code></td>
      `;
      historyTableBody.appendChild(row);
    });
}

function renderAll() {
  renderSummary();
  renderWalletTable();
  renderHistory();
}

connectWalletButton.addEventListener("click", () => {
  connectedWallet = "0x1A92f7381B9F03921564A437210bB9396471050C";
  walletAddressEl.textContent = connectedWallet;
  connectWalletButton.textContent = "Connected";
  connectWalletButton.disabled = true;
});

paymentForm.addEventListener("input", syncPreview);

paymentForm.addEventListener("reset", () => {
  setTimeout(syncPreview, 0);
});

paymentForm.addEventListener("submit", (event) => {
  event.preventDefault();

  const formData = new FormData(paymentForm);
  const beneficiary = String(formData.get("beneficiary")).trim();
  const amountEth = Number(formData.get("amount"));
  const durationSeconds = Number(formData.get("duration"));

  const unlockTime = Date.now() + durationSeconds * 1000;
  const newWallet = {
    id: crypto.randomUUID(),
    walletAddress: sampleWalletAddress.replace("...", Math.random().toString(16).slice(2, 5)),
    beneficiary: truncateAddress(beneficiary),
    balanceEth: amountEth,
    unlockTime,
    isWithdrawn: false,
  };

  wallets.unshift(newWallet);
  transactions.unshift({
    id: crypto.randomUUID(),
    createdAt: Date.now(),
    type: "Create",
    walletAddress: newWallet.walletAddress,
    amountEth,
    txHash: `0x${crypto.randomUUID().replaceAll("-", "").slice(0, 12)}...demo`,
  });

  paymentForm.reset();
  syncPreview();
  renderAll();
});

walletTableBody.addEventListener("click", (event) => {
  const target = event.target;
  if (!(target instanceof HTMLButtonElement)) return;

  const walletId = target.dataset.walletId;
  if (!walletId) return;

  const wallet = wallets.find((item) => item.id === walletId);
  if (!wallet) return;

  const status = getWalletStatus(wallet);
  if (!status.actionable) return;

  wallet.isWithdrawn = true;
  const withdrawnAmount = wallet.balanceEth;
  wallet.balanceEth = 0;

  transactions.unshift({
    id: crypto.randomUUID(),
    createdAt: Date.now(),
    type: "Withdraw",
    walletAddress: wallet.walletAddress,
    amountEth: withdrawnAmount,
    txHash: `0x${crypto.randomUUID().replaceAll("-", "").slice(0, 12)}...done`,
  });

  renderAll();
});

setInterval(() => {
  syncPreview();
  renderWalletTable();
  renderSummary();
}, 1000);

syncPreview();
renderAll();
