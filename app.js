const walletAddressEl = document.getElementById("walletAddress");
const connectWalletButton = document.getElementById("connectWalletButton");
const paymentForm = document.getElementById("paymentForm");
const walletTableBody = document.getElementById("walletTableBody");
const historyTableBody = document.getElementById("historyTableBody");

const previewUnlock = document.getElementById("previewUnlock");
const previewCountdown = document.getElementById("previewCountdown");

const totalWallets = document.getElementById("totalWallets");
const lockedCount = document.getElementById("lockedCount");
const readyCount = document.getElementById("readyCount");
const completedCount = document.getElementById("completedCount");

const FACTORY_ADDRESS =
  "0xD304D1f259eba87CB94E68d821601Df583aCf443";

const FACTORY_ABI = [
  {
    inputs: [
      {
        internalType: "address payable",
        name: "_beneficiary",
        type: "address",
      },
      {
        internalType: "uint256",
        name: "_duration",
        type: "uint256",
      },
    ],
    name: "createScheduledPayment",
    outputs: [],
    stateMutability: "payable",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "_sender",
        type: "address",
      },
    ],
    name: "getWalletsBySender",
    outputs: [
      {
        internalType: "address[]",
        name: "",
        type: "address[]",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
];

const WALLET_ABI = [
  {
    inputs: [],
    name: "beneficiary",
    outputs: [
      {
        internalType: "address payable",
        name: "",
        type: "address",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "unlockTime",
    outputs: [
      {
        internalType: "uint256",
        name: "",
        type: "uint256",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "isWithdrawn",
    outputs: [
      {
        internalType: "bool",
        name: "",
        type: "bool",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "withdraw",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
];

let provider;
let signer;
let factoryContract;
let connectedWallet = "";
let wallets = [];
let transactions = [];

function truncateAddress(address) {
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

function formatDateTime(timestamp) {
  return new Date(timestamp).toLocaleString();
}

function formatCountdown(unlockTime) {
  const now = Date.now();
  const diff = Math.max(0, unlockTime - now);

  const hours = String(Math.floor(diff / 3600000)).padStart(2, "0");
  const minutes = String(
    Math.floor((diff % 3600000) / 60000)
  ).padStart(2, "0");
  const seconds = String(
    Math.floor((diff % 60000) / 1000)
  ).padStart(2, "0");

  return `${hours}:${minutes}:${seconds}`;
}

function getWalletStatus(wallet) {
  if (wallet.isWithdrawn || wallet.balanceEth <= 0) {
    return {
      label: "Completed",
      variant: "completed",
      actionable: false,
    };
  }

  if (Date.now() >= wallet.unlockTime) {
    return {
      label: "Ready to Withdraw",
      variant: "ready",
      actionable: true,
    };
  }

  return {
    label: "Locked",
    variant: "locked",
    actionable: false,
  };
}

async function connectWallet() {
  if (!window.ethereum) {
    alert("Please install MetaMask");
    return;
  }

  provider = new ethers.BrowserProvider(window.ethereum);

  await provider.send("eth_requestAccounts", []);

  signer = await provider.getSigner();

  connectedWallet = await signer.getAddress();

  walletAddressEl.textContent = connectedWallet;

  connectWalletButton.textContent = "Connected";

  connectWalletButton.disabled = true;

  factoryContract = new ethers.Contract(
    FACTORY_ADDRESS,
    FACTORY_ABI,
    signer
  );

  await loadWallets();
}

async function loadWallets() {
  wallets = [];

  const addresses = await factoryContract.getWalletsBySender(
    connectedWallet
  );

  for (const walletAddress of addresses) {
    const walletContract = new ethers.Contract(
      walletAddress,
      WALLET_ABI,
      signer
    );

    const beneficiary = await walletContract.beneficiary();

    const unlockTime =
      Number(await walletContract.unlockTime()) * 1000;

    const isWithdrawn =
      await walletContract.isWithdrawn();

    const balanceWei =
      await provider.getBalance(walletAddress);

    const balanceEth = Number(
      ethers.formatEther(balanceWei)
    );

    wallets.push({
      walletAddress,
      beneficiary,
      unlockTime,
      isWithdrawn,
      balanceEth,
    });
  }

  renderAll();
}

function renderSummary() {
  const statuses = wallets.map(getWalletStatus);

  totalWallets.textContent = wallets.length;

  lockedCount.textContent = statuses.filter(
    (s) => s.variant === "locked"
  ).length;

  readyCount.textContent = statuses.filter(
    (s) => s.variant === "ready"
  ).length;

  completedCount.textContent = statuses.filter(
    (s) => s.variant === "completed"
  ).length;
}

function renderWallets() {
  walletTableBody.innerHTML = "";

  wallets.forEach((wallet, index) => {
    const status = getWalletStatus(wallet);

    const row = document.createElement("tr");

    row.innerHTML = `
      <td><code>${truncateAddress(
        wallet.walletAddress
      )}</code></td>

      <td><code>${truncateAddress(
        wallet.beneficiary
      )}</code></td>

      <td>${wallet.balanceEth.toFixed(4)} ETH</td>

      <td>${formatDateTime(wallet.unlockTime)}</td>

      <td class="countdown">${formatCountdown(wallet.unlockTime)}</td>

      <td>
        <span class="status-pill status-pill--${status.variant}">
          ${status.label}
        </span>
      </td>

      <td>
        <button
          class="button button--table ${
            status.actionable
              ? "button--success"
              : "button--ghost"
          }"
          ${
            !status.actionable ? "disabled" : ""
          }
          data-index="${index}"
        >
          Withdraw
        </button>
      </td>
    `;

    walletTableBody.appendChild(row);
  });
}

function renderHistory() {
  historyTableBody.innerHTML = "";

  transactions.forEach((tx) => {
    const row = document.createElement("tr");

    row.innerHTML = `
      <td>${formatDateTime(tx.time)}</td>
      <td>${tx.type}</td>
      <td>${truncateAddress(tx.wallet)}</td>
      <td>${tx.amount}</td>
      <td><code>${truncateAddress(tx.hash)}</code></td>
    `;

    historyTableBody.appendChild(row);
  });
}

function renderAll() {
  renderSummary();
  renderWallets();
  renderHistory();
}

connectWalletButton.addEventListener(
  "click",
  connectWallet
);

paymentForm.addEventListener(
  "submit",
  async (e) => {
    e.preventDefault();

    try {
      const beneficiary =
        document.getElementById("beneficiary").value;

      const amount =
        document.getElementById("amount").value;
        console.log(amount);

      const duration =
        document.getElementById("duration").value;

      const tx =
        await factoryContract.createScheduledPayment(
          beneficiary,
          duration,
          {
            value: ethers.parseEther(String(amount).trim()),
          }
        );

      transactions.unshift({
        type: "Create",
        wallet: FACTORY_ADDRESS,
        amount: `${amount} ETH`,
        hash: tx.hash,
        time: Date.now(),
      });

      await tx.wait();

      await loadWallets();

      paymentForm.reset();

      alert("Payment created successfully");
    } catch (error) {
      console.error(error);
      console.log(error);
      alert(error.reason || error.shortMessage || error.message || "Transaction failed");
    }
  }
);

walletTableBody.addEventListener(
  "click",
  async (e) => {
    const button = e.target;

    if (!button.dataset.index) return;

    const wallet = wallets[button.dataset.index];

    try {
      const walletContract = new ethers.Contract(
        wallet.walletAddress,
        WALLET_ABI,
        signer
      );

      const tx = await walletContract.withdraw();

      transactions.unshift({
        type: "Withdraw",
        wallet: wallet.walletAddress,
        amount: `${wallet.balanceEth} ETH`,
        hash: tx.hash,
        time: Date.now(),
      });

      await tx.wait();

      await loadWallets();

      alert("Withdraw successful");
    } catch (error) {
      console.error(error);
      alert("Withdraw failed");
    }
  }
);

setInterval(() => {

  const countdownEls =
    document.querySelectorAll(".countdown");

  countdownEls.forEach((el, index) => {

    if (!wallets[index]) return;

    el.textContent =
      formatCountdown(wallets[index].unlockTime);

  });

  renderSummary();

}, 1000);

document
  .getElementById("duration")
  .addEventListener("input", () => {
    const duration =
      Number(
        document.getElementById("duration").value
      ) || 0;

    const unlock =
      Date.now() + duration * 1000;

    previewUnlock.textContent =
      formatDateTime(unlock);

    previewCountdown.textContent =
      formatCountdown(unlock);
  });