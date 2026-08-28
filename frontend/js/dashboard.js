/* =========================================================
   DIGITALBANK — DASHBOARD.JS
   Complete frontend JavaScript
   Compatible with the supplied dashboard.html
========================================================= */

"use strict";

console.log("DigitalBank Dashboard JS loaded.");

/* =========================================================
   API CONFIGURATION
========================================================= */

const API_URL = "http://127.0.0.1:8004";

let currentUser = null;
let currentAccount = null;
let transactions = [];
let beneficiaries = [];
let currentTransactionType = null;
let notificationTimer = null;


/* =========================================================
   DOM HELPER
========================================================= */

function $(id) {
    return document.getElementById(id);
}


/* =========================================================
   SAFE TEXT UPDATE
========================================================= */

function setText(id, value) {
    const element = $(id);

    if (element) {
        element.textContent = value;
    }
}


/* =========================================================
   FORMATTERS
========================================================= */

function formatCurrency(value) {
    const amount = Number(value);

    if (!Number.isFinite(amount)) {
        return "₹0.00";
    }

    return amount.toLocaleString("en-IN", {
        style: "currency",
        currency: "INR",
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    });
}


function formatDate(value) {
    if (!value) {
        return "--";
    }

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
        return String(value);
    }

    return date.toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric"
    });
}


function formatDateTime(value) {
    if (!value) {
        return "--";
    }

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
        return String(value);
    }

    return date.toLocaleString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit"
    });
}


/* =========================================================
   AUTH TOKEN
========================================================= */

function getToken() {
    return (
        localStorage.getItem("access_token") ||
        localStorage.getItem("token") ||
        sessionStorage.getItem("access_token") ||
        sessionStorage.getItem("token") ||
        ""
    );
}


/* =========================================================
   API REQUEST
========================================================= */

async function apiRequest(endpoint, options = {}) {

    const token = getToken();

    const headers = {
        Accept: "application/json",
        ...(options.headers || {})
    };

    if (options.body && !(options.body instanceof FormData)) {
        headers["Content-Type"] = "application/json";
    }

    if (token) {
        headers.Authorization = `Bearer ${token}`;
    }

    const url = endpoint.startsWith("http")
        ? endpoint
        : `${API_URL}${endpoint}`;

    console.log("API Request:", url);

    try {

        const response = await fetch(url, {
            ...options,
            headers
        });

        let data = null;

        const contentType =
            response.headers.get("content-type") || "";

        if (contentType.includes("application/json")) {
            data = await response.json();
        } else {
            const text = await response.text();
            data = text ? text : null;
        }

        console.log(
            "API Response:",
            response.status,
            data
        );

        if (response.status === 401) {
            showNotification(
                "error",
                "Session Expired",
                "Please login again."
            );

            setTimeout(() => {
                localStorage.removeItem("access_token");
                localStorage.removeItem("token");
                sessionStorage.removeItem("access_token");
                sessionStorage.removeItem("token");

                window.location.href = "login.html";
            }, 1200);

            throw new Error("Unauthorized");
        }

        if (!response.ok) {

            let message = "Request failed.";

            if (data) {

                if (typeof data === "string") {
                    message = data;
                } else if (data.detail) {
                    message =
                        typeof data.detail === "string"
                            ? data.detail
                            : JSON.stringify(data.detail);
                } else if (data.message) {
                    message = data.message;
                }
            }

            throw new Error(message);
        }

        return data;

    } catch (error) {

        console.error(
            "API Error:",
            endpoint,
            error
        );

        throw error;
    }
}


/* =========================================================
   NOTIFICATION
========================================================= */

function showNotification(
    type,
    title,
    message
) {

    const notification = $("bankingNotification");
    const notificationTitle = $("notificationTitle");
    const notificationMessage = $("notificationMessage");
    const notificationIcon = $("notificationIcon");

    if (!notification) {
        return;
    }

    if (notificationTitle) {
        notificationTitle.textContent = title || "Notification";
    }

    if (notificationMessage) {
        notificationMessage.textContent =
            message || "";
    }

    if (notificationIcon) {
        notificationIcon.textContent =
            type === "error"
                ? "!"
                : type === "warning"
                    ? "!"
                    : "✓";
    }

    notification.classList.remove(
        "success",
        "error",
        "warning",
        "show"
    );

    notification.classList.add(
        type || "success"
    );

    requestAnimationFrame(() => {
        notification.classList.add("show");
    });

    clearTimeout(notificationTimer);

    notificationTimer = setTimeout(() => {
        notification.classList.remove("show");
    }, 4500);
}


function closeNotification() {

    const notification = $("bankingNotification");

    if (notification) {
        notification.classList.remove("show");
    }
}


/* =========================================================
   LIVE STATUS
========================================================= */

function setLiveStatus(online, text) {

    const dot = $("liveStatusDot");
    const statusText = $("liveStatusText");

    if (dot) {
        dot.classList.toggle("offline", !online);
    }

    if (statusText) {
        statusText.textContent =
            text || (online ? "Connected" : "Offline");
    }
}


function updateLastUpdated() {

    setText(
        "lastUpdated",
        new Date().toLocaleTimeString("en-IN", {
            hour: "2-digit",
            minute: "2-digit",
            second: "2-digit"
        })
    );
}


/* =========================================================
   LOAD PROFILE
========================================================= */

async function loadProfile() {

    try {

        currentUser =
            await apiRequest("/users/me");

        const name =
            currentUser?.full_name ||
            currentUser?.name ||
            "Customer";

        const email =
            currentUser?.email ||
            "--";

        setText(
            "profileName",
            name
        );

        setText(
            "profileEmail",
            email
        );

        setText(
            "accountHolder",
            name
        );

        setText(
            "welcomeMessage",
            `Welcome back, ${name}!`
        );

        return currentUser;

    } catch (error) {

        console.error(
            "Profile loading failed:",
            error
        );

        setText(
            "profileName",
            "Customer"
        );

        setText(
            "profileEmail",
            "--"
        );

        setText(
            "accountHolder",
            "Customer"
        );

        return null;
    }
}


/* =========================================================
   LOAD ACCOUNT
========================================================= */

async function loadAccount() {

    try {

        currentAccount =
            await apiRequest("/accounts/me");

        const accountNumber =
            currentAccount?.account_number ||
            currentAccount?.accountNumber ||
            "--";

        const accountType =
            currentAccount?.account_type ||
            currentAccount?.accountType ||
            "Savings";

        const balance =
            Number(currentAccount?.balance || 0);

        setText(
            "balanceValue",
            formatCurrency(balance)
        );

        setText(
            "accountNumberDisplay",
            accountNumber
        );

        setText(
            "accountNumber",
            accountNumber
        );

        setText(
            "accountType",
            accountType
        );

        setText(
            "accountBalance",
            formatCurrency(balance)
        );

        return currentAccount;

    } catch (error) {

        console.error(
            "Account loading failed:",
            error
        );

        setText(
            "balanceValue",
            "₹0.00"
        );

        setText(
            "accountBalance",
            "₹0.00"
        );

        return null;
    }
}


/* =========================================================
   LOAD TRANSACTIONS
========================================================= */

async function loadTransactions() {

    const container =
        $("transactionsContainer");

    const miniBody =
        $("miniStatementBody");

    try {

        const data =
            await apiRequest(
                "/transactions/history?skip=0&limit=100"
            );

        if (Array.isArray(data)) {
            transactions = data;
        } else if (Array.isArray(data?.transactions)) {
            transactions = data.transactions;
        } else if (Array.isArray(data?.items)) {
            transactions = data.items;
        } else {
            transactions = [];
        }

        renderTransactions();
        renderMiniStatement();
        updateAnalytics();
        updateFinancialHealth();

        return transactions;

    } catch (error) {

        console.error(
            "Transaction loading failed:",
            error
        );

        transactions = [];

        if (container) {
            container.innerHTML = `
                <p class="empty-state">
                    Unable to load transactions.
                </p>
            `;
        }

        if (miniBody) {
            miniBody.innerHTML = `
                <tr>
                    <td colspan="5" class="empty-state">
                        Unable to load transactions.
                    </td>
                </tr>
            `;
        }

        return [];
    }
}


/* =========================================================
   TRANSACTION NORMALIZER
========================================================= */

function normalizeTransaction(transaction) {

    const rawType =
        transaction?.transaction_type ||
        transaction?.type ||
        transaction?.transactionType ||
        transaction?.category ||
        "";

    const type =
        String(rawType)
            .toLowerCase()
            .trim();

    const amount =
        Number(
            transaction?.amount ||
            transaction?.value ||
            0
        );

    const description =
        transaction?.description ||
        transaction?.remarks ||
        transaction?.note ||
        transaction?.purpose ||
        getTransactionLabel(type);

    const date =
        transaction?.created_at ||
        transaction?.createdAt ||
        transaction?.transaction_date ||
        transaction?.date ||
        transaction?.timestamp ||
        null;

    const status =
        transaction?.status ||
        "Completed";

    return {
        ...transaction,
        normalizedType: type,
        normalizedAmount: Number.isFinite(amount)
            ? amount
            : 0,
        normalizedDescription: description,
        normalizedDate: date,
        normalizedStatus: status
    };
}


/* =========================================================
   TYPE HELPERS
========================================================= */

function getTransactionLabel(type) {

    const value =
        String(type || "").toLowerCase();

    if (value.includes("deposit")) {
        return "Cash Deposit";
    }

    if (
        value.includes("withdraw") ||
        value.includes("withdrawal")
    ) {
        return "Cash Withdrawal";
    }

    if (
        value.includes("upi") ||
        value.includes("payment")
    ) {
        return "UPI Payment";
    }

    if (
        value.includes("transfer") ||
        value.includes("send")
    ) {
        return "Account Transfer";
    }

    return "Banking Transaction";
}


function getTransactionClass(type) {

    const value =
        String(type || "").toLowerCase();

    if (value.includes("deposit")) {
        return "deposit";
    }

    if (
        value.includes("withdraw") ||
        value.includes("withdrawal")
    ) {
        return "withdrawal";
    }

    if (
        value.includes("upi") ||
        value.includes("payment")
    ) {
        return "upi";
    }

    if (
        value.includes("transfer") ||
        value.includes("send")
    ) {
        return "transfer";
    }

    return "transfer";
}


/* =========================================================
   RENDER MINI STATEMENT
========================================================= */

function renderMiniStatement() {

    const body =
        $("miniStatementBody");

    if (!body) {
        return;
    }

    const recent =
        transactions
            .map(normalizeTransaction)
            .sort(
                (a, b) =>
                    new Date(b.normalizedDate || 0) -
                    new Date(a.normalizedDate || 0)
            )
            .slice(0, 5);

    if (recent.length === 0) {

        body.innerHTML = `
            <tr>
                <td colspan="5" class="empty-state">
                    No transactions found.
                </td>
            </tr>
        `;

        return;
    }

    body.innerHTML =
        recent.map(transaction => {

            const typeClass =
                getTransactionClass(
                    transaction.normalizedType
                );

            const sign =
                transaction.normalizedType.includes("deposit")
                    ? "+"
                    : "-";

            return `
                <tr>
                    <td>
                        ${escapeHTML(
                            formatDate(
                                transaction.normalizedDate
                            )
                        )}
                    </td>

                    <td>
                        ${escapeHTML(
                            transaction.normalizedDescription
                        )}
                    </td>

                    <td>
                        <span class="transaction-type ${typeClass}">
                            ${escapeHTML(
                                getTransactionLabel(
                                    transaction.normalizedType
                                )
                            )}
                        </span>
                    </td>

                    <td>
                        ${sign}${formatCurrency(
                            transaction.normalizedAmount
                        )}
                    </td>

                    <td>
                        <span class="transaction-status">
                            ${escapeHTML(
                                transaction.normalizedStatus
                            )}
                        </span>
                    </td>
                </tr>
            `;

        }).join("");
}


/* =========================================================
   RENDER TRANSACTIONS
========================================================= */

function renderTransactions() {

    const container =
        $("transactionsContainer");

    if (!container) {
        return;
    }

    const searchInput =
        $("transactionSearch");

    const filterSelect =
        $("transactionFilter");

    const search =
        String(
            searchInput?.value || ""
        )
            .toLowerCase()
            .trim();

    const filter =
        String(
            filterSelect?.value || "all"
        )
            .toLowerCase();

    let filtered =
        transactions
            .map(normalizeTransaction)
            .filter(transaction => {

                const searchable = [
                    transaction.normalizedDescription,
                    transaction.normalizedType,
                    transaction.normalizedStatus,
                    transaction.account_number,
                    transaction.reference_number
                ]
                    .filter(Boolean)
                    .join(" ")
                    .toLowerCase();

                const matchesSearch =
                    !search ||
                    searchable.includes(search);

                let matchesFilter = true;

                if (filter !== "all") {

                    const type =
                        transaction.normalizedType;

                    if (filter === "deposit") {
                        matchesFilter =
                            type.includes("deposit");
                    }

                    else if (filter === "withdrawal") {
                        matchesFilter =
                            type.includes("withdraw") ||
                            type.includes("withdrawal");
                    }

                    else if (filter === "transfer") {
                        matchesFilter =
                            type.includes("transfer") ||
                            type.includes("send");
                    }

                    else if (filter === "upi payment") {
                        matchesFilter =
                            type.includes("upi") ||
                            type.includes("payment");
                    }
                }

                return (
                    matchesSearch &&
                    matchesFilter
                );
            });

    filtered.sort(
        (a, b) =>
            new Date(b.normalizedDate || 0) -
            new Date(a.normalizedDate || 0)
    );

    if (filtered.length === 0) {

        container.innerHTML = `
            <div class="empty-state-block">
                <div class="empty-state-icon">⌕</div>
                <strong>No transactions found.</strong>
                <span>Try another search or filter.</span>
            </div>
        `;

        return;
    }

    container.innerHTML =
        filtered.map(transaction => {

            const typeClass =
                getTransactionClass(
                    transaction.normalizedType
                );

            const isDeposit =
                transaction.normalizedType
                    .includes("deposit");

            const sign =
                isDeposit ? "+" : "-";

            return `
                <div class="transaction-row">

                    <div class="transaction-main">

                        <div class="transaction-icon ${typeClass}">
                            ${getTransactionIcon(
                                transaction.normalizedType
                            )}
                        </div>

                        <div class="transaction-info">

                            <strong>
                                ${escapeHTML(
                                    transaction.normalizedDescription
                                )}
                            </strong>

                            <span>
                                ${escapeHTML(
                                    formatDateTime(
                                        transaction.normalizedDate
                                    )
                                )}
                            </span>

                        </div>

                    </div>

                    <div class="transaction-type">
                        ${escapeHTML(
                            getTransactionLabel(
                                transaction.normalizedType
                            )
                        )}
                    </div>

                    <div class="transaction-amount ${typeClass}">
                        ${sign}${formatCurrency(
                            transaction.normalizedAmount
                        )}
                    </div>

                    <div class="transaction-status">
                        ${escapeHTML(
                            transaction.normalizedStatus
                        )}
                    </div>

                </div>
            `;

        }).join("");
}


function getTransactionIcon(type) {

    const value =
        String(type || "").toLowerCase();

    if (value.includes("deposit")) {
        return "↓";
    }

    if (
        value.includes("withdraw") ||
        value.includes("withdrawal")
    ) {
        return "↑";
    }

    if (
        value.includes("upi") ||
        value.includes("payment")
    ) {
        return "₹";
    }

    return "↔";
}


/* =========================================================
   ANALYTICS
========================================================= */

function updateAnalytics() {

    const normalized =
        transactions.map(normalizeTransaction);

    let depositTotal = 0;
    let withdrawalTotal = 0;
    let transferTotal = 0;
    let upiTotal = 0;

    let depositCount = 0;
    let withdrawalCount = 0;
    let transferCount = 0;
    let upiCount = 0;

    normalized.forEach(transaction => {

        const type =
            transaction.normalizedType;

        const amount =
            transaction.normalizedAmount;

        if (type.includes("deposit")) {

            depositTotal += amount;
            depositCount++;

        } else if (
            type.includes("withdraw") ||
            type.includes("withdrawal")
        ) {

            withdrawalTotal += amount;
            withdrawalCount++;

        } else if (
            type.includes("upi") ||
            type.includes("payment")
        ) {

            upiTotal += amount;
            upiCount++;

        } else if (
            type.includes("transfer") ||
            type.includes("send")
        ) {

            transferTotal += amount;
            transferCount++;
        }
    });

    setText(
        "depositValue",
        formatCurrency(depositTotal)
    );

    setText(
        "withdrawalValue",
        formatCurrency(withdrawalTotal)
    );

    setText(
        "transferValue",
        formatCurrency(
            transferTotal + upiTotal
        )
    );

    setText(
        "chartDepositCount",
        depositCount
    );

    setText(
        "chartWithdrawalCount",
        withdrawalCount
    );

    setText(
        "chartTransferCount",
        transferCount
    );

    setText(
        "chartUPICount",
        upiCount
    );

    const moneyIn =
        depositTotal;

    const moneyOut =
        withdrawalTotal +
        transferTotal +
        upiTotal;

    const netFlow =
        moneyIn - moneyOut;

    setText(
        "chartMoneyIn",
        formatCurrency(moneyIn)
    );

    setText(
        "chartMoneyOut",
        formatCurrency(moneyOut)
    );

    setText(
        "chartNetFlow",
        formatCurrency(netFlow)
    );

    updateBar(
        "chartDepositBar",
        depositCount,
        normalized.length
    );

    updateBar(
        "chartWithdrawalBar",
        withdrawalCount,
        normalized.length
    );

    updateBar(
        "chartTransferBar",
        transferCount,
        normalized.length
    );

    updateBar(
        "chartUPIBar",
        upiCount,
        normalized.length
    );
}


function updateBar(id, count, total) {

    const bar = $(id);

    if (!bar) {
        return;
    }

    const percentage =
        total > 0
            ? Math.max(
                3,
                Math.min(
                    100,
                    (count / total) * 100
                )
            )
            : 0;

    bar.style.width =
        `${percentage}%`;
}


/* =========================================================
   FINANCIAL HEALTH
   Created automatically because the supplied HTML
   does not contain a Financial Health section.
========================================================= */

function createFinancialHealthSection() {

    if ($("financialHealthSection")) {
        return;
    }

    const visualization =
        $("visualizationSection");

    if (!visualization) {
        return;
    }

    const section =
        document.createElement("section");

    section.className =
        "dashboard-card financial-health-card";

    section.id =
        "financialHealthSection";

    section.innerHTML = `

        <div class="card-header">

            <div>

                <p class="section-label">
                    FINANCIAL INSIGHTS
                </p>

                <h2>
                    Financial Health
                </h2>

                <p>
                    Understand your current financial position
                </p>

            </div>

        </div>

        <div
            id="financialHealthContent"
            style="
                display:grid;
                grid-template-columns:repeat(3,minmax(0,1fr));
                gap:16px;
                margin-top:20px;
            "
        >

        </div>

    `;

    visualization.parentNode.insertBefore(
        section,
        visualization.nextSibling
    );
}


function updateFinancialHealth() {

    createFinancialHealthSection();

    const content =
        $("financialHealthContent");

    if (!content) {
        return;
    }

    const balance =
        Number(
            currentAccount?.balance || 0
        );

    const normalized =
        transactions.map(normalizeTransaction);

    let moneyIn = 0;
    let moneyOut = 0;

    normalized.forEach(transaction => {

        const type =
            transaction.normalizedType;

        const amount =
            transaction.normalizedAmount;

        if (type.includes("deposit")) {
            moneyIn += amount;
        }

        else if (
            type.includes("withdraw") ||
            type.includes("withdrawal") ||
            type.includes("transfer") ||
            type.includes("upi") ||
            type.includes("payment") ||
            type.includes("send")
        ) {
            moneyOut += amount;
        }
    });

    const netFlow =
        moneyIn - moneyOut;

    let score = 50;

    if (balance > 0) {
        score += 20;
    }

    if (balance >= moneyOut && moneyOut > 0) {
        score += 10;
    }

    if (netFlow > 0) {
        score += 15;
    }

    if (moneyOut > moneyIn && moneyIn > 0) {
        score -= 15;
    }

    score =
        Math.max(
            0,
            Math.min(100, score)
        );

    let health =
        "Needs Attention";

    if (score >= 80) {
        health = "Excellent";
    } else if (score >= 65) {
        health = "Good";
    } else if (score >= 50) {
        health = "Fair";
    }

    const savingsRatio =
        moneyIn > 0
            ? Math.max(
                0,
                (netFlow / moneyIn) * 100
            )
            : 0;

    const transactionCount =
        normalized.length;

    content.innerHTML = `

        <div style="
            padding:20px;
            border:1px solid #e2e8f0;
            border-radius:14px;
            background:#f8fafc;
        ">

            <span style="
                display:block;
                font-size:12px;
                color:#64748b;
                margin-bottom:8px;
            ">
                Health Score
            </span>

            <strong style="
                display:block;
                font-size:28px;
                margin-bottom:5px;
            ">
                ${score}/100
            </strong>

            <span>
                ${health}
            </span>

        </div>

        <div style="
            padding:20px;
            border:1px solid #e2e8f0;
            border-radius:14px;
            background:#f8fafc;
        ">

            <span style="
                display:block;
                font-size:12px;
                color:#64748b;
                margin-bottom:8px;
            ">
                Net Cash Flow
            </span>

            <strong style="
                display:block;
                font-size:24px;
                margin-bottom:5px;
            ">
                ${formatCurrency(netFlow)}
            </strong>

            <span>
                ${netFlow >= 0
                    ? "Positive cash flow"
                    : "Negative cash flow"}
            </span>

        </div>

        <div style="
            padding:20px;
            border:1px solid #e2e8f0;
            border-radius:14px;
            background:#f8fafc;
        ">

            <span style="
                display:block;
                font-size:12px;
                color:#64748b;
                margin-bottom:8px;
            ">
                Current Position
            </span>

            <strong style="
                display:block;
                font-size:24px;
                margin-bottom:5px;
            ">
                ${formatCurrency(balance)}
            </strong>

            <span>
                ${transactionCount} transaction${transactionCount === 1 ? "" : "s"}
            </span>

        </div>

    `;

    if (window.innerWidth < 800) {
        content.style.gridTemplateColumns =
            "1fr";
    }
}


/* =========================================================
   LOAD BENEFICIARIES
========================================================= */

async function loadBeneficiaries() {

    try {

        const data =
            await apiRequest(
                "/beneficiaries/"
            );

        if (Array.isArray(data)) {
            beneficiaries = data;
        } else if (
            Array.isArray(data?.items)
        ) {
            beneficiaries = data.items;
        } else if (
            Array.isArray(data?.beneficiaries)
        ) {
            beneficiaries =
                data.beneficiaries;
        } else {
            beneficiaries = [];
        }

        renderBeneficiaries();
        populateUPIBeneficiaries();

        return beneficiaries;

    } catch (error) {

        console.error(
            "Beneficiary loading failed:",
            error
        );

        beneficiaries = [];

        renderBeneficiaries();
        populateUPIBeneficiaries();

        return [];
    }
}


/* =========================================================
   RENDER BENEFICIARIES
========================================================= */

function renderBeneficiaries() {

    const list =
        $("beneficiariesList");

    if (!list) {
        return;
    }

    if (beneficiaries.length === 0) {

        list.innerHTML = `
            <div class="empty-state-block">

                <div class="empty-state-icon">
                    👤
                </div>

                <strong>
                    No beneficiaries added yet.
                </strong>

                <span>
                    Add a beneficiary to make UPI payments faster.
                </span>

            </div>
        `;

        return;
    }

    list.innerHTML =
        beneficiaries.map((beneficiary, index) => {

            const name =
                beneficiary?.name ||
                beneficiary?.beneficiary_name ||
                beneficiary?.full_name ||
                `Beneficiary ${index + 1}`;

            const account =
                beneficiary?.account_number ||
                beneficiary?.accountNumber ||
                "--";

            const bank =
                beneficiary?.bank_name ||
                beneficiary?.bankName ||
                "Bank";

            return `

                <div class="beneficiary-item">

                    <div class="beneficiary-icon">
                        👤
                    </div>

                    <div class="beneficiary-info">

                        <strong>
                            ${escapeHTML(name)}
                        </strong>

                        <span>
                            ${escapeHTML(bank)}
                        </span>

                        <small>
                            A/C ${escapeHTML(account)}
                        </small>

                    </div>

                </div>

            `;

        }).join("");
}


/* =========================================================
   POPULATE UPI SELECT
========================================================= */

function populateUPIBeneficiaries() {

    const select =
        $("upiBeneficiary");

    if (!select) {
        return;
    }

    select.innerHTML = `
        <option value="">
            Select beneficiary
        </option>
    `;

    beneficiaries.forEach(
        (beneficiary, index) => {

            const id =
                beneficiary?.id ??
                beneficiary?.beneficiary_id ??
                beneficiary?.account_number ??
                index;

            const name =
                beneficiary?.name ||
                beneficiary?.beneficiary_name ||
                beneficiary?.full_name ||
                `Beneficiary ${index + 1}`;

            const account =
                beneficiary?.account_number ||
                beneficiary?.accountNumber ||
                "";

            const option =
                document.createElement("option");

            option.value =
                String(id);

            option.dataset.account =
                String(account);

            option.textContent =
                account
                    ? `${name} — ${account}`
                    : name;

            select.appendChild(option);
        }
    );
}


/* =========================================================
   BENEFICIARY MODAL
========================================================= */

function openBeneficiaryModal() {

    const modal =
        $("beneficiaryModal");

    if (!modal) {
        return;
    }

    modal.classList.add("active");
    modal.setAttribute(
        "aria-hidden",
        "false"
    );

    const form =
        $("beneficiaryForm");

    if (form) {
        form.reset();
    }

    setText(
        "beneficiaryMessage",
        ""
    );
}


function closeBeneficiaryModal() {

    const modal =
        $("beneficiaryModal");

    if (!modal) {
        return;
    }

    modal.classList.remove("active");
    modal.setAttribute(
        "aria-hidden",
        "true"
    );
}


/* =========================================================
   SAVE BENEFICIARY
========================================================= */

async function saveBeneficiary(event) {

    event.preventDefault();

    const name =
        $("beneficiaryName")?.value.trim();

    const accountNumber =
        $("beneficiaryAccount")?.value.trim();

    const bankName =
        $("beneficiaryBank")?.value.trim();

    const message =
        $("beneficiaryMessage");

    const button =
        $("saveBeneficiaryBtn");

    if (!name || !accountNumber || !bankName) {

        if (message) {
            message.textContent =
                "Please fill all beneficiary fields.";
        }

        return;
    }

    if (button) {
        button.disabled = true;
        button.textContent = "Adding...";
    }

    try {

        await apiRequest(
            "/beneficiaries/",
            {
                method: "POST",
                body: JSON.stringify({
                    name: name,
                    beneficiary_name: name,
                    account_number: accountNumber,
                    bank_name: bankName
                })
            }
        );

        closeBeneficiaryModal();

        showNotification(
            "success",
            "Beneficiary Added",
            "Beneficiary added successfully."
        );

        await loadBeneficiaries();

    } catch (error) {

        if (message) {
            message.textContent =
                error.message ||
                "Unable to add beneficiary.";
        }

        showNotification(
            "error",
            "Beneficiary Error",
            error.message ||
            "Unable to add beneficiary."
        );

    } finally {

        if (button) {
            button.disabled = false;
            button.textContent =
                "Add Beneficiary";
        }
    }
}


/* =========================================================
   TRANSACTION MODAL
========================================================= */

function openTransactionModal(type) {

    const modal =
        $("transactionModal");

    const title =
        $("modalTitle");

    const recipientGroup =
        $("recipientGroup");

    const recipientInput =
        $("recipientAccount");

    const form =
        $("transactionForm");

    const message =
        $("transactionMessage");

    if (!modal) {
        console.error(
            "Transaction modal not found."
        );
        return;
    }

    currentTransactionType =
        String(type || "")
            .toLowerCase();

    if (form) {
        form.reset();
    }

    if (message) {
        message.textContent = "";
    }

    if (currentTransactionType === "deposit") {

        if (title) {
            title.textContent =
                "Deposit Money";
        }

        if (recipientGroup) {
            recipientGroup.style.display =
                "none";
        }

        if (recipientInput) {
            recipientInput.required = false;
        }
    }

    else if (
        currentTransactionType === "withdraw"
    ) {

        if (title) {
            title.textContent =
                "Withdraw Money";
        }

        if (recipientGroup) {
            recipientGroup.style.display =
                "none";
        }

        if (recipientInput) {
            recipientInput.required = false;
        }
    }

    else {

        currentTransactionType =
            "transfer";

        if (title) {
            title.textContent =
                "Transfer Money";
        }

        if (recipientGroup) {
            recipientGroup.style.display =
                "block";
        }

        if (recipientInput) {
            recipientInput.required = true;
        }
    }

    modal.classList.add("active");

    modal.setAttribute(
        "aria-hidden",
        "false"
    );

    setTimeout(() => {

        const amount =
            $("transactionAmount");

        if (amount) {
            amount.focus();
        }

    }, 100);
}


function closeTransactionModal() {

    const modal =
        $("transactionModal");

    if (!modal) {
        return;
    }

    modal.classList.remove("active");

    modal.setAttribute(
        "aria-hidden",
        "true"
    );

    currentTransactionType = null;

    const form =
        $("transactionForm");

    if (form) {
        form.reset();
    }

    setText(
        "transactionMessage",
        ""
    );
}


/* =========================================================
   TRANSACTION API
   FIXED VERSION
========================================================= */

async function submitTransaction(event) {

    event.preventDefault();

    const amountInput =
        $("transactionAmount");

    const recipientInput =
        $("recipientAccount");

    const message =
        $("transactionMessage");

    const button =
        $("confirmTransactionBtn");

    const amount =
        Number(amountInput?.value || 0);

    const receiverAccount =
        recipientInput?.value.trim() || "";


    /* ---------------------------------------------
       VALIDATE AMOUNT
    --------------------------------------------- */

    if (!Number.isFinite(amount) || amount <= 0) {

        if (message) {
            message.textContent =
                "Please enter a valid amount.";
        }

        return;
    }


    /* ---------------------------------------------
       VALIDATE RECEIVER
    --------------------------------------------- */

    if (
        currentTransactionType === "transfer" &&
        !receiverAccount
    ) {

        if (message) {
            message.textContent =
                "Please enter receiver account number.";
        }

        return;
    }


    /* ---------------------------------------------
       BUTTON LOADING STATE
    --------------------------------------------- */

    if (button) {
        button.disabled = true;
        button.textContent = "Processing...";
    }

    if (message) {
        message.textContent = "";
    }


    try {

        /* =============================================
           DEPOSIT
        ============================================= */

        if (
            currentTransactionType === "deposit"
        ) {

            await apiRequest(
                "/transactions/deposit",
                {
                    method: "POST",

                    body: JSON.stringify({
                        amount: amount
                    })
                }
            );
        }


        /* =============================================
           WITHDRAW
        ============================================= */

        else if (
            currentTransactionType === "withdraw"
        ) {

            await apiRequest(
                "/transactions/withdraw",
                {
                    method: "POST",

                    body: JSON.stringify({
                        amount: amount
                    })
                }
            );
        }


        /* =============================================
           TRANSFER
           
           IMPORTANT:
           Backend expects receiver_account_number
           as QUERY PARAMETER, not JSON body.
        ============================================= */

        else if (
            currentTransactionType === "transfer"
        ) {

            const encodedReceiver =
                encodeURIComponent(receiverAccount);

            const endpoint =
                `/transactions/transfer?receiver_account_number=${encodedReceiver}`;

            console.log(
                "Transfer receiver:",
                receiverAccount
            );

            console.log(
                "Transfer endpoint:",
                endpoint
            );


            await apiRequest(
                endpoint,
                {
                    method: "POST",

                    body: JSON.stringify({
                        amount: amount
                    })
                }
            );
        }


        /* ---------------------------------------------
           SUCCESS
        --------------------------------------------- */

        closeTransactionModal();

        showNotification(
            "success",
            "Transaction Successful",
            `${capitalize(currentTransactionType)} completed successfully.`
        );


        /* ---------------------------------------------
           REFRESH DASHBOARD
        --------------------------------------------- */

        await refreshDashboard();


    } catch (error) {

        console.error(
            "Transaction failed:",
            error
        );


        /*
         * Convert FastAPI validation errors
         * into a clean message.
         */

        let errorMessage =
            error.message ||
            "Unable to complete transaction.";


        if (
            errorMessage.includes(
                "receiver_account_number"
            )
        ) {

            errorMessage =
                "Receiver account number is required.";

        }


        if (message) {
            message.textContent =
                errorMessage;
        }


        showNotification(
            "error",
            "Transaction Failed",
            errorMessage
        );


    } finally {

        if (button) {

            button.disabled = false;

            button.textContent =
                "Confirm Transaction";
        }
    }
}

/* =========================================================
   UPI PAYMENT
========================================================= */

async function submitUPIPayment(event) {

    event.preventDefault();

    const beneficiarySelect =
        $("upiBeneficiary");

    const amountInput =
        $("upiAmount");

    const message =
        $("upiMessage");

    const button =
        $("upiPayBtn");

    const beneficiaryId =
        beneficiarySelect?.value || "";

    const selectedOption =
        beneficiarySelect?.selectedOptions?.[0];

    const amount =
        Number(amountInput?.value || 0);

    if (!beneficiaryId) {

        if (message) {
            message.textContent =
                "Please select a beneficiary.";
        }

        return;
    }

    if (!Number.isFinite(amount) || amount <= 0) {

        if (message) {
            message.textContent =
                "Please enter a valid amount.";
        }

        return;
    }

    if (button) {
        button.disabled = true;
        button.textContent =
            "Processing...";
    }

    if (message) {
        message.textContent = "";
    }

    const beneficiary =
        beneficiaries.find(item =>
            String(
                item?.id ??
                item?.beneficiary_id ??
                item?.account_number
            ) ===
            String(beneficiaryId)
        );

    const accountNumber =
        beneficiary?.account_number ||
        beneficiary?.accountNumber ||
        selectedOption?.dataset?.account ||
        "";

    try {

        await apiRequest(
            "/transactions/upi",
            {
                method: "POST",
                body: JSON.stringify({
                    amount: amount,
                    beneficiary_id:
                        beneficiary?.id ??
                        beneficiary?.beneficiary_id ??
                        null,
                    beneficiary_account:
                        accountNumber,
                    receiver_account_number:
                        accountNumber
                })
            }
        );

        if (amountInput) {
            amountInput.value = "";
        }

        if (beneficiarySelect) {
            beneficiarySelect.value = "";
        }

        showNotification(
            "success",
            "UPI Payment Successful",
            "Your UPI payment was completed successfully."
        );

        await refreshDashboard();

    } catch (error) {

        if (message) {
            message.textContent =
                error.message ||
                "UPI payment failed.";
        }

        showNotification(
            "error",
            "UPI Payment Failed",
            error.message ||
            "Unable to complete UPI payment."
        );

    } finally {

        if (button) {
            button.disabled = false;
            button.textContent =
                "Pay with UPI";
        }
    }
}


/* =========================================================
   QUICK ACTIONS
========================================================= */

function setupQuickActions() {

    const depositBtn =
        $("depositBtn");

    const withdrawBtn =
        $("withdrawBtn");

    const transferBtn =
        $("transferBtn");

    const upiQuickBtn =
        $("upiQuickBtn");

    if (depositBtn) {
        depositBtn.addEventListener(
            "click",
            () => openTransactionModal(
                "deposit"
            )
        );
    }

    if (withdrawBtn) {
        withdrawBtn.addEventListener(
            "click",
            () => openTransactionModal(
                "withdraw"
            )
        );
    }

    if (transferBtn) {
        transferBtn.addEventListener(
            "click",
            () => openTransactionModal(
                "transfer"
            )
        );
    }

    if (upiQuickBtn) {
        upiQuickBtn.addEventListener(
            "click",
            () => {

                const section =
                    $("upiPaymentSection");

                if (section) {
                    section.scrollIntoView({
                        behavior: "smooth",
                        block: "center"
                    });
                }

            }
        );
    }
}


/* =========================================================
   MODAL EVENTS
========================================================= */

function setupModalEvents() {

    const closeModalBtn =
        $("closeModalBtn");

    const cancelModalBtn =
        $("cancelModalBtn");

    const transactionModal =
        $("transactionModal");

    if (closeModalBtn) {
        closeModalBtn.addEventListener(
            "click",
            closeTransactionModal
        );
    }

    if (cancelModalBtn) {
        cancelModalBtn.addEventListener(
            "click",
            closeTransactionModal
        );
    }

    if (transactionModal) {

        const overlay =
            transactionModal.querySelector(
                ".modal-overlay"
            );

        if (overlay) {
            overlay.addEventListener(
                "click",
                closeTransactionModal
            );
        }
    }

    const addBeneficiaryBtn =
        $("addBeneficiaryBtn");

    const closeBeneficiary =
        $("closeBeneficiaryModal");

    const cancelBeneficiary =
        $("cancelBeneficiaryBtn");

    const beneficiaryModal =
        $("beneficiaryModal");

    if (addBeneficiaryBtn) {
        addBeneficiaryBtn.addEventListener(
            "click",
            openBeneficiaryModal
        );
    }

    if (closeBeneficiary) {
        closeBeneficiary.addEventListener(
            "click",
            closeBeneficiaryModal
        );
    }

    if (cancelBeneficiary) {
        cancelBeneficiary.addEventListener(
            "click",
            closeBeneficiaryModal
        );
    }

    if (beneficiaryModal) {

        const overlay =
            beneficiaryModal.querySelector(
                ".modal-overlay"
            );

        if (overlay) {
            overlay.addEventListener(
                "click",
                closeBeneficiaryModal
            );
        }
    }
}


/* =========================================================
   FORM EVENTS
========================================================= */

function setupForms() {

    const transactionForm =
        $("transactionForm");

    const beneficiaryForm =
        $("beneficiaryForm");

    const upiForm =
        $("upiPaymentForm");

    if (transactionForm) {

        transactionForm.addEventListener(
            "submit",
            submitTransaction
        );

        console.log(
            "Transaction form ready."
        );
    }

    if (beneficiaryForm) {

        beneficiaryForm.addEventListener(
            "submit",
            saveBeneficiary
        );
    }

    if (upiForm) {

        upiForm.addEventListener(
            "submit",
            submitUPIPayment
        );
    }
}


/* =========================================================
   SEARCH / FILTER
========================================================= */

function setupTransactionControls() {

    const search =
        $("transactionSearch");

    const filter =
        $("transactionFilter");

    if (search) {

        search.addEventListener(
            "input",
            renderTransactions
        );
    }

    if (filter) {

        filter.addEventListener(
            "change",
            renderTransactions
        );
    }
}


/* =========================================================
   REFRESH
========================================================= */

async function refreshDashboard() {

    try {

        setLiveStatus(
            true,
            "Refreshing"
        );

        await Promise.all([
            loadProfile(),
            loadAccount(),
            loadTransactions(),
            loadBeneficiaries()
        ]);

        updateLastUpdated();

        setLiveStatus(
            true,
            "Connected"
        );

    } catch (error) {

        console.error(
            "Dashboard refresh failed:",
            error
        );

        setLiveStatus(
            false,
            "Connection problem"
        );

    }
}


/* =========================================================
   REFRESH BUTTONS
========================================================= */

function setupRefreshButtons() {

    const refreshBtn =
        $("refreshBtn");

    const refreshDataBtn =
        $("refreshDataBtn");

    const refreshMini =
        $("refreshMiniStatement");

    if (refreshBtn) {

        refreshBtn.addEventListener(
            "click",
            async () => {

                await refreshDashboard();

                showNotification(
                    "success",
                    "Dashboard Refreshed",
                    "Latest account data loaded."
                );
            }
        );
    }

    if (refreshDataBtn) {

        refreshDataBtn.addEventListener(
            "click",
            refreshDashboard
        );
    }

    if (refreshMini) {

        refreshMini.addEventListener(
            "click",
            async () => {

                await loadTransactions();
                updateLastUpdated();

            }
        );
    }
}


/* =========================================================
   LOGOUT
========================================================= */

function setupLogout() {

    const logoutBtn =
        $("logoutBtn");

    if (!logoutBtn) {
        return;
    }

    logoutBtn.addEventListener(
        "click",
        () => {

            const confirmed =
                window.confirm(
                    "Are you sure you want to logout?"
                );

            if (!confirmed) {
                return;
            }

            localStorage.removeItem(
                "access_token"
            );

            localStorage.removeItem(
                "token"
            );

            sessionStorage.removeItem(
                "access_token"
            );

            sessionStorage.removeItem(
                "token"
            );

            showNotification(
                "success",
                "Logged Out",
                "You have been securely logged out."
            );

            setTimeout(() => {

                window.location.href =
                    "login.html";

            }, 500);
        }
    );
}


/* =========================================================
   TRANSACTIONS NAVIGATION
========================================================= */

function setupNavigation() {

    const transactionsBtn =
        $("transactionsBtn");

    const dashboardNavBtn =
        $("dashboardNavBtn");

    if (transactionsBtn) {

        transactionsBtn.addEventListener(
            "click",
            () => {

                document
                    .querySelectorAll(
                        ".nav-item"
                    )
                    .forEach(item => {
                        item.classList.remove(
                            "active"
                        );
                    });

                transactionsBtn.classList.add(
                    "active"
                );

                const section =
                    $("transactionsSection");

                if (section) {

                    section.scrollIntoView({
                        behavior: "smooth",
                        block: "start"
                    });
                }
            }
        );
    }

    if (dashboardNavBtn) {

        dashboardNavBtn.addEventListener(
            "click",
            () => {

                document
                    .querySelectorAll(
                        ".nav-item"
                    )
                    .forEach(item => {
                        item.classList.remove(
                            "active"
                        );
                    });

                dashboardNavBtn.classList.add(
                    "active"
                );

                window.scrollTo({
                    top: 0,
                    behavior: "smooth"
                });
            }
        );
    }
}


/* =========================================================
   NOTIFICATION CLOSE
========================================================= */

function setupNotification() {

    const close =
        $("notificationClose");

    if (close) {

        close.addEventListener(
            "click",
            closeNotification
        );
    }
}


/* =========================================================
   KEYBOARD EVENTS
========================================================= */

function setupKeyboardEvents() {

    document.addEventListener(
        "keydown",
        event => {

            if (event.key !== "Escape") {
                return;
            }

            closeTransactionModal();
            closeBeneficiaryModal();
            closeNotification();
        }
    );
}


/* =========================================================
   ONLINE STATUS
========================================================= */

function setupOnlineStatus() {

    const dot =
        $("onlineStatusDot");

    const text =
        $("onlineStatusText");

    function update() {

        const online =
            navigator.onLine;

        if (dot) {
            dot.classList.toggle(
                "offline",
                !online
            );
        }

        if (text) {
            text.textContent =
                online
                    ? "Online"
                    : "Offline";
        }
    }

    window.addEventListener(
        "online",
        update
    );

    window.addEventListener(
        "offline",
        update
    );

    update();
}


/* =========================================================
   ESCAPE HTML
========================================================= */

function escapeHTML(value) {

    if (value === null || value === undefined) {
        return "";
    }

    return String(value)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}


/* =========================================================
   CAPITALIZE
========================================================= */

function capitalize(value) {

    if (!value) {
        return "";
    }

    return (
        String(value)
            .charAt(0)
            .toUpperCase() +
        String(value).slice(1)
    );
}


/* =========================================================
   INITIALIZATION
========================================================= */

async function initializeDashboard() {

    console.log(
        "DigitalBank Dashboard initializing..."
    );

    setupQuickActions();
    setupModalEvents();
    setupForms();
    setupTransactionControls();
    setupRefreshButtons();
    setupLogout();
    setupNavigation();
    setupNotification();
    setupKeyboardEvents();
    setupOnlineStatus();

    createFinancialHealthSection();

    try {

        setLiveStatus(
            true,
            "Connecting"
        );

        await Promise.all([
            loadProfile(),
            loadAccount(),
            loadTransactions(),
            loadBeneficiaries()
        ]);

        updateLastUpdated();

        setLiveStatus(
            true,
            "Connected"
        );

        console.log(
            "DigitalBank Dashboard loaded successfully."
        );

    } catch (error) {

        console.error(
            "Dashboard initialization error:",
            error
        );

        setLiveStatus(
            false,
            "Connection problem"
        );
    }
}


/* =========================================================
   START
========================================================= */

if (
    document.readyState ===
    "loading"
) {

    document.addEventListener(
        "DOMContentLoaded",
        initializeDashboard
    );

} else {

    initializeDashboard();
}
/* =========================================================
   FINANCIAL HEALTH
   Add this code at the VERY END of dashboard.js
========================================================= */

(function () {

    "use strict";

    function getNumberFromElement(id) {

        const element = document.getElementById(id);

        if (!element) {
            return 0;
        }

        const text = element.textContent || "";

        const number = parseFloat(
            text
                .replace(/[₹,\s]/g, "")
                .replace(/[^\d.-]/g, "")
        );

        return Number.isFinite(number) ? number : 0;
    }


    function getTransactionCount() {

        const container =
            document.getElementById("transactionsContainer");

        if (!container) {
            return 0;
        }

        const rows = container.querySelectorAll(
            ".transaction-item, .transaction-row, tr"
        );

        let count = rows.length;

        const loading =
            container.querySelector(".loading");

        if (loading) {
            count = 0;
        }

        return count;
    }


    function calculateFinancialHealth() {

        const scoreElement =
            document.getElementById("financialHealthScore");

        const statusElement =
            document.getElementById("financialHealthStatus");

        const netCashFlowElement =
            document.getElementById("financialNetCashFlow");

        const cashFlowStatusElement =
            document.getElementById("financialCashFlowStatus");

        const positionElement =
            document.getElementById("financialCurrentPosition");

        const transactionCountElement =
            document.getElementById("financialTransactionCount");


        if (
            !scoreElement ||
            !statusElement ||
            !netCashFlowElement ||
            !cashFlowStatusElement ||
            !positionElement ||
            !transactionCountElement
        ) {
            return;
        }


        /* ---------------------------------------------
           READ EXISTING DASHBOARD VALUES
        --------------------------------------------- */

        const balance =
            getNumberFromElement("balanceValue");

        const moneyIn =
            getNumberFromElement("chartMoneyIn");

        const moneyOut =
            getNumberFromElement("chartMoneyOut");

        const netFlow =
            getNumberFromElement("chartNetFlow");


        /* ---------------------------------------------
           TRANSACTION COUNT
        --------------------------------------------- */

        let transactionCount =
            getTransactionCount();


        /*
         * If the transaction list is not available yet,
         * use the existing visualization counts.
         */

        if (transactionCount === 0) {

            const deposits =
                getNumberFromElement("chartDepositCount");

            const withdrawals =
                getNumberFromElement("chartWithdrawalCount");

            const transfers =
                getNumberFromElement("chartTransferCount");

            const upi =
                getNumberFromElement("chartUPICount");

            transactionCount =
                deposits +
                withdrawals +
                transfers +
                upi;
        }


        /* ---------------------------------------------
           CURRENT POSITION
        --------------------------------------------- */

        positionElement.textContent =
            formatCurrency(balance);


        /* ---------------------------------------------
           NET CASH FLOW
        --------------------------------------------- */

        netCashFlowElement.textContent =
            formatCurrency(netFlow);


        if (netFlow > 0) {

            cashFlowStatusElement.textContent =
                "Positive cash flow";

        } else if (netFlow < 0) {

            cashFlowStatusElement.textContent =
                "Negative cash flow";

        } else {

            cashFlowStatusElement.textContent =
                "Balanced cash flow";
        }


        /* ---------------------------------------------
           TRANSACTION COUNT
        --------------------------------------------- */

        transactionCountElement.textContent =
            transactionCount +
            (transactionCount === 1
                ? " transaction"
                : " transactions");


        /* ---------------------------------------------
           HEALTH SCORE
        --------------------------------------------- */

        let score = 50;


        /*
         * Positive cash flow improves the score.
         */

        if (netFlow > 0) {
            score += 20;
        } else if (netFlow < 0) {
            score -= 15;
        }


        /*
         * Healthy balance improves the score.
         */

        if (balance >= 10000) {
            score += 15;
        } else if (balance >= 5000) {
            score += 10;
        } else if (balance >= 1000) {
            score += 5;
        }


        /*
         * Compare money coming in and going out.
         */

        if (moneyIn > 0 && moneyOut > 0) {

            const ratio =
                moneyIn / moneyOut;

            if (ratio >= 2) {
                score += 10;
            } else if (ratio >= 1.25) {
                score += 5;
            } else if (ratio < 1) {
                score -= 10;
            }
        }


        /*
         * Keep score between 0 and 100.
         */

        score =
            Math.max(
                0,
                Math.min(100, Math.round(score))
            );


        scoreElement.textContent =
            score + "/100";


        /* ---------------------------------------------
           SCORE STATUS
        --------------------------------------------- */

        if (score >= 85) {

            statusElement.textContent =
                "Excellent";

        } else if (score >= 70) {

            statusElement.textContent =
                "Good";

        } else if (score >= 50) {

            statusElement.textContent =
                "Fair";

        } else {

            statusElement.textContent =
                "Needs Attention";
        }

    }


    function formatCurrency(value) {

        return "₹" + Number(value || 0).toLocaleString(
            "en-IN",
            {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2
            }
        );
    }


    /* ---------------------------------------------
       INITIAL RUN
    --------------------------------------------- */

    function initializeFinancialHealth() {

        calculateFinancialHealth();

        /*
         * Existing dashboard.js updates the dashboard
         * asynchronously after API responses.
         *
         * This keeps the Financial Health section
         * synchronized without replacing existing
         * dashboard functionality.
         */

        setTimeout(
            calculateFinancialHealth,
            1000
        );

        setTimeout(
            calculateFinancialHealth,
            2500
        );

        setTimeout(
            calculateFinancialHealth,
            5000
        );
    }


    if (document.readyState === "loading") {

        document.addEventListener(
            "DOMContentLoaded",
            initializeFinancialHealth
        );

    } else {

        initializeFinancialHealth();
    }


    /*
     * Recalculate whenever existing dashboard
     * transaction values change.
     */

    window.updateFinancialHealth =
        calculateFinancialHealth;

})();