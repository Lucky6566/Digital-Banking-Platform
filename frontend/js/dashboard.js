// =========================================================
// DIGITAL BANKING PLATFORM
// dashboard.js
//
// STEP 7.1 — AUTO REFRESH + LAST UPDATED
// STEP 7.2 — BANKING NOTIFICATIONS
// STEP 7.3-A — LIVE STATUS + LAST UPDATED
// STEP 7.3-B — LIVE CONNECTION MONITORING
// STEP 7.3-D — DASHBOARD / TRANSACTIONS NAVIGATION
// =========================================================

console.log("DigitalBank Dashboard JS loaded.");


// =========================================================
// API CONFIGURATION
// =========================================================

const API_URL = "http://127.0.0.1:8004";


// =========================================================
// AUTHENTICATION
// =========================================================

function getToken() {
    return localStorage.getItem("access_token");
}

if (!getToken()) {
    window.location.replace("index.html");
}


// =========================================================
// GLOBAL VARIABLES
// =========================================================

let allTransactions = [];
let currentTransactionType = null;
let currentAccount = null;
let currentSummary = null;

let dashboardLastUpdated = null;

let dashboardRefreshInterval = null;
let dashboardIsRefreshing = false;

let connectionMonitorInterval = null;

let notificationTimeout = null;


// =========================================================
// DOM HELPER
// =========================================================

function getElement(id) {
    return document.getElementById(id);
}


// =========================================================
// MONEY FORMATTER
// =========================================================

function formatMoney(amount) {

    const value = Number(amount);

    if (!Number.isFinite(value)) {
        return "₹0.00";
    }

    return `₹${value.toLocaleString("en-IN", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    })}`;
}


// =========================================================
// ERROR MESSAGE
// =========================================================

function getErrorMessage(data) {

    if (!data) {
        return "Request failed.";
    }

    if (typeof data.detail === "string") {
        return data.detail;
    }

    if (Array.isArray(data.detail)) {

        return data.detail
            .map(item => {

                if (item && item.msg) {
                    return item.msg;
                }

                if (typeof item === "string") {
                    return item;
                }

                return JSON.stringify(item);
            })
            .join(", ");
    }

    if (typeof data.message === "string") {
        return data.message;
    }

    if (typeof data.error === "string") {
        return data.error;
    }

    if (typeof data === "string") {
        return data;
    }

    return "Request failed.";
}


// =========================================================
// API REQUEST
// =========================================================

async function apiRequest(endpoint, options = {}) {

    const currentToken = getToken();

    if (!currentToken) {

        window.location.replace("index.html");

        throw new Error(
            "Authentication token not found."
        );
    }


    const requestOptions = {

        method: options.method || "GET",

        ...options,

        headers: {

            "Authorization":
                `Bearer ${currentToken}`,

            "Content-Type":
                "application/json",

            ...(options.headers || {})
        }
    };


    console.log(
        `${requestOptions.method} ${API_URL}${endpoint}`
    );


    try {

        const response =
            await fetch(
                `${API_URL}${endpoint}`,
                requestOptions
            );


        let data = null;


        const contentType =
            response.headers.get(
                "content-type"
            ) || "";


        if (
            contentType.includes(
                "application/json"
            )
        ) {

            try {

                data =
                    await response.json();

            } catch {

                data = null;
            }

        } else {

            try {

                const text =
                    await response.text();

                data =
                    text || null;

            } catch {

                data = null;
            }
        }


        // =================================================
        // AUTH ERROR
        // =================================================

        if (response.status === 401) {

            console.error(
                "Authentication expired."
            );


            localStorage.removeItem(
                "access_token"
            );


            window.location.replace(
                "index.html"
            );


            throw new Error(
                "Session expired. Please login again."
            );
        }


        // =================================================
        // OTHER API ERRORS
        // =================================================

        if (!response.ok) {

            console.error(
                "API Error:",
                response.status,
                data
            );


            throw new Error(
                getErrorMessage(data) ||
                `Request failed with status ${response.status}.`
            );
        }


        return data;

    } catch (error) {

        console.error(
            "API request error:",
            error
        );

        throw error;
    }
}


// =========================================================
// STEP 7.3-A
// UPDATE LAST UPDATED
// =========================================================

function updateLastUpdated() {

    const element =
        getElement("lastUpdated");

    if (!element) {
        return;
    }


    dashboardLastUpdated =
        new Date();


    element.textContent =
        dashboardLastUpdated.toLocaleTimeString(
            "en-IN",
            {
                hour: "2-digit",
                minute: "2-digit",
                second: "2-digit"
            }
        );
}


// =========================================================
// STEP 7.3-A
// LIVE / OFFLINE STATUS
// =========================================================

function setDashboardLiveStatus(isLive) {

    const statusText =
        getElement("liveStatusText");

    const statusDot =
        document.querySelector(
            ".live-status-dot"
        );


    if (statusText) {

        statusText.textContent =
            isLive ? "Live" : "Offline";
    }


    if (statusDot) {

        statusDot.classList.toggle(
            "offline",
            !isLive
        );
    }
}


// =========================================================
// LOAD PROFILE
// =========================================================

async function loadProfile() {

    try {

        const user =
            await apiRequest(
                "/users/me"
            );


        console.log(
            "Profile loaded:",
            user
        );


        const welcomeMessage =
            getElement(
                "welcomeMessage"
            );


        if (welcomeMessage) {

            welcomeMessage.textContent =
                `Welcome back, ${user.full_name || "User"}!`;
        }


        const profileName =
            getElement(
                "profileName"
            );


        if (profileName) {

            profileName.textContent =
                user.full_name || "User";
        }


        const profileEmail =
            getElement(
                "profileEmail"
            );


        if (profileEmail) {

            profileEmail.textContent =
                user.email || "";
        }


        const userName =
            getElement(
                "userName"
            );


        if (userName) {

            userName.textContent =
                user.full_name || "User";
        }


        const userEmail =
            getElement(
                "userEmail"
            );


        if (userEmail) {

            userEmail.textContent =
                user.email || "";
        }


        return user;

    } catch (error) {

        console.error(
            "Profile loading failed:",
            error
        );

        return null;
    }
}


// =========================================================
// ACCOUNT NUMBER
// =========================================================

function setAccountNumber(accountNumber) {

    const element =
        getElement(
            "accountNumber"
        );


    if (!element) {
        return;
    }


    if (
        accountNumber !== undefined &&
        accountNumber !== null &&
        String(accountNumber).trim() !== ""
    ) {

        element.textContent =
            String(accountNumber);

        element.style.display =
            "block";

        element.style.visibility =
            "visible";

        element.style.opacity =
            "1";


        console.log(
            "Account number displayed:",
            accountNumber
        );
    }
}


// =========================================================
// LOAD ACCOUNT SUMMARY
// =========================================================

async function loadSummary() {

    try {

        const data =
            await apiRequest(
                "/accounts/summary"
            );


        currentSummary =
            data;


        console.log(
            "Account summary:",
            data
        );


        const accountNumber =
            data?.account_number ||
            data?.accountNumber ||
            data?.account?.account_number ||
            data?.account?.accountNumber;


        if (accountNumber) {

            setAccountNumber(
                accountNumber
            );
        }


        const balance =
            getElement("balance");


        if (
            balance &&
            data?.balance !== undefined
        ) {

            balance.textContent =
                formatMoney(
                    data.balance
                );
        }


        const totalDeposits =
            getElement("totalDeposits");


        if (totalDeposits) {

            totalDeposits.textContent =
                formatMoney(
                    data?.total_deposits ?? 0
                );
        }


        const totalWithdrawals =
            getElement("totalWithdrawals");


        if (totalWithdrawals) {

            totalWithdrawals.textContent =
                formatMoney(
                    data?.total_withdrawals ?? 0
                );
        }


        const totalTransfers =
            getElement("totalTransfers");


        if (totalTransfers) {

            totalTransfers.textContent =
                formatMoney(
                    data?.total_transfers ?? 0
                );
        }


        return data;

    } catch (error) {

        console.error(
            "Summary loading failed:",
            error
        );

        return null;
    }
}


// =========================================================
// LOAD ACCOUNT
// =========================================================

async function loadAccount() {

    try {

        const account =
            await apiRequest(
                "/accounts/"
            );


        currentAccount =
            account;


        console.log(
            "Account loaded:",
            account
        );


        const accountNumber =
            account?.account_number ||
            account?.accountNumber;


        if (accountNumber) {

            setAccountNumber(
                accountNumber
            );
        }


        const accountType =
            getElement(
                "accountType"
            );


        if (accountType) {

            accountType.textContent =
                account?.account_type ||
                account?.accountType ||
                "Savings";
        }


        const balance =
            getElement("balance");


        if (
            balance &&
            account?.balance !== undefined
        ) {

            balance.textContent =
                formatMoney(
                    account.balance
                );
        }


        return account;

    } catch (error) {

        console.error(
            "Account loading failed:",
            error
        );


        const accountType =
            getElement(
                "accountType"
            );


        if (accountType) {

            accountType.textContent =
                "Savings";
        }


        return null;
    }
}


// =========================================================
// LOAD TRANSACTIONS
// =========================================================

async function loadTransactions(
    showLoading = true
) {

    const container =
        getElement(
            "transactionsContainer"
        );


    if (
        container &&
        showLoading
    ) {

        container.innerHTML =
            "<p class='loading'>Loading transactions...</p>";
    }


    try {

        const transactions =
            await apiRequest(
                "/transactions/recent"
            );


        allTransactions =
            Array.isArray(
                transactions
            )
                ? transactions
                : [];


        console.log(
            "Transactions loaded:",
            allTransactions
        );


        renderTransactions();

        updateTransactionAnalytics();

        updateTransactionVisualization();

        updateFinancialHealth();


        setDashboardLiveStatus(true);


        return allTransactions;

    } catch (error) {

        console.error(
            "Transactions loading failed:",
            error
        );


        if (container) {

            container.innerHTML =
                "<p class='loading'>Unable to load transactions.</p>";
        }


        setDashboardLiveStatus(false);


        return [];
    }
}


// =========================================================
// RENDER TRANSACTIONS
// =========================================================

function renderTransactions() {

    const container =
        getElement(
            "transactionsContainer"
        );


    if (!container) {
        return;
    }


    const searchValue =
        getElement(
            "transactionSearch"
        )
        ?.value
        ?.trim()
        .toLowerCase() || "";


    const filterValue =
        getElement(
            "transactionFilter"
        )
        ?.value || "all";


    const filteredTransactions =
        allTransactions.filter(
            transaction => {

                const type =
                    String(
                        transaction?.transaction_type || ""
                    );


                const reference =
                    String(
                        transaction?.reference || ""
                    ).toLowerCase();


                const amount =
                    String(
                        transaction?.amount ?? ""
                    );


                const status =
                    String(
                        transaction?.status || ""
                    ).toLowerCase();


                const searchMatch =
                    !searchValue ||
                    type.toLowerCase()
                        .includes(searchValue) ||
                    reference.includes(searchValue) ||
                    amount.includes(searchValue) ||
                    status.includes(searchValue);


                const filterMatch =
                    filterValue === "all" ||
                    type.toLowerCase() ===
                    filterValue.toLowerCase();


                return (
                    searchMatch &&
                    filterMatch
                );
            }
        );


    if (
        filteredTransactions.length ===
        0
    ) {

        container.innerHTML =
            "<p class='loading'>No matching transactions found.</p>";

        return;
    }


    container.innerHTML = "";


    filteredTransactions.forEach(
        transaction => {

            const row =
                document.createElement(
                    "div"
                );


            row.className =
                "transaction-row";


            const transactionType =
                transaction?.transaction_type ||
                "Transaction";


            const createdAt =
                transaction?.created_at
                    ? new Date(
                        transaction.created_at
                    ).toLocaleString("en-IN")
                    : "Date unavailable";


            const reference =
                transaction?.reference ||
                "N/A";


            const status =
                transaction?.status ||
                "Unknown";


            const amount =
                Number(
                    transaction?.amount || 0
                );


            const left =
                document.createElement(
                    "div"
                );


            const title =
                document.createElement(
                    "h3"
                );


            title.textContent =
                transactionType;


            const date =
                document.createElement(
                    "p"
                );


            date.textContent =
                createdAt;


            const ref =
                document.createElement(
                    "p"
                );


            ref.textContent =
                `Reference: ${reference}`;


            left.appendChild(title);
            left.appendChild(date);
            left.appendChild(ref);


            const right =
                document.createElement(
                    "div"
                );


            const amountElement =
                document.createElement(
                    "strong"
                );


            amountElement.textContent =
                formatMoney(amount);


            const statusElement =
                document.createElement(
                    "p"
                );


            statusElement.textContent =
                status;


            const normalizedStatus =
                String(status)
                    .toLowerCase();


            if (
                normalizedStatus === "completed" ||
                normalizedStatus === "success" ||
                normalizedStatus === "successful"
            ) {

                statusElement.classList.add(
                    "transaction-status-success"
                );

            } else if (
                normalizedStatus === "pending" ||
                normalizedStatus === "processing"
            ) {

                statusElement.classList.add(
                    "transaction-status-pending"
                );

            } else if (
                normalizedStatus === "failed" ||
                normalizedStatus === "rejected"
            ) {

                statusElement.classList.add(
                    "transaction-status-failed"
                );
            }


            right.appendChild(
                amountElement
            );

            right.appendChild(
                statusElement
            );


            row.appendChild(left);

            row.appendChild(right);


            container.appendChild(row);
        }
    );
}


// =========================================================
// TRANSACTION ANALYTICS
// =========================================================

function calculateTransactionAnalytics() {

    let deposits = 0;
    let withdrawals = 0;
    let transfers = 0;

    let moneyIn = 0;
    let moneyOut = 0;


    allTransactions.forEach(
        transaction => {

            const type =
                String(
                    transaction?.transaction_type || ""
                ).toLowerCase();


            const amount =
                Number(
                    transaction?.amount || 0
                );


            if (type === "deposit") {

                deposits++;
                moneyIn += amount;

            } else if (
                type === "withdraw" ||
                type === "withdrawal"
            ) {

                withdrawals++;
                moneyOut += amount;

            } else if (type === "transfer") {

                transfers++;
                moneyOut += amount;
            }
        }
    );


    const totalTransactions =
        allTransactions.length;


    const netFlow =
        moneyIn - moneyOut;


    const averageTransaction =
        totalTransactions > 0
            ? (
                moneyIn +
                moneyOut
            ) / totalTransactions
            : 0;


    return {

        totalTransactions,
        deposits,
        withdrawals,
        transfers,
        moneyIn,
        moneyOut,
        netFlow,
        averageTransaction
    };
}


// =========================================================
// UPDATE TRANSACTION ANALYTICS
// =========================================================

function updateTransactionAnalytics() {

    const analytics =
        calculateTransactionAnalytics();


    const elements = {

        analyticsTotalTransactions:
            analytics.totalTransactions,

        analyticsCredits:
            formatMoney(
                analytics.moneyIn
            ),

        analyticsDebits:
            formatMoney(
                analytics.moneyOut
            ),

        analyticsAverage:
            formatMoney(
                analytics.averageTransaction
            ),

        analyticsDeposits:
            analytics.deposits,

        analyticsWithdrawals:
            analytics.withdrawals,

        analyticsTransfers:
            analytics.transfers,

        analyticsMoneyIn:
            formatMoney(
                analytics.moneyIn
            ),

        analyticsMoneyOut:
            formatMoney(
                analytics.moneyOut
            ),

        analyticsNetFlow:
            formatMoney(
                analytics.netFlow
            )
    };


    Object.entries(elements).forEach(
        ([id, value]) => {

            const element =
                getElement(id);


            if (element) {

                element.textContent =
                    value;
            }
        }
    );


    const total =
        analytics.totalTransactions;


    const depositProgress =
        getElement(
            "depositProgress"
        );


    const withdrawalProgress =
        getElement(
            "withdrawalProgress"
        );


    const transferProgress =
        getElement(
            "transferProgress"
        );


    if (total > 0) {

        if (depositProgress) {

            depositProgress.style.width =
                `${analytics.deposits / total * 100}%`;
        }


        if (withdrawalProgress) {

            withdrawalProgress.style.width =
                `${analytics.withdrawals / total * 100}%`;
        }


        if (transferProgress) {

            transferProgress.style.width =
                `${analytics.transfers / total * 100}%`;
        }

    } else {

        if (depositProgress) {
            depositProgress.style.width = "0%";
        }

        if (withdrawalProgress) {
            withdrawalProgress.style.width = "0%";
        }

        if (transferProgress) {
            transferProgress.style.width = "0%";
        }
    }


    return analytics;
}


// =========================================================
// TRANSACTION VISUALIZATION
// =========================================================

function updateTransactionVisualization() {

    const analytics =
        calculateTransactionAnalytics();


    const values = {

        chartDepositCount:
            analytics.deposits,

        chartWithdrawalCount:
            analytics.withdrawals,

        chartTransferCount:
            analytics.transfers,

        chartMoneyIn:
            formatMoney(
                analytics.moneyIn
            ),

        chartMoneyOut:
            formatMoney(
                analytics.moneyOut
            ),

        chartNetFlow:
            formatMoney(
                analytics.netFlow
            )
    };


    Object.entries(values).forEach(
        ([id, value]) => {

            const element =
                getElement(id);


            if (element) {

                element.textContent =
                    value;
            }
        }
    );


    const total =
        analytics.deposits +
        analytics.withdrawals +
        analytics.transfers;


    const depositBar =
        getElement(
            "chartDepositBar"
        );


    const withdrawalBar =
        getElement(
            "chartWithdrawalBar"
        );


    const transferBar =
        getElement(
            "chartTransferBar"
        );


    if (total > 0) {

        if (depositBar) {

            depositBar.style.width =
                `${analytics.deposits / total * 100}%`;
        }


        if (withdrawalBar) {

            withdrawalBar.style.width =
                `${analytics.withdrawals / total * 100}%`;
        }


        if (transferBar) {

            transferBar.style.width =
                `${analytics.transfers / total * 100}%`;
        }

    } else {

        if (depositBar) {
            depositBar.style.width = "0%";
        }

        if (withdrawalBar) {
            withdrawalBar.style.width = "0%";
        }

        if (transferBar) {
            transferBar.style.width = "0%";
        }
    }
}


// =========================================================
// FINANCIAL HEALTH
// =========================================================

function calculateFinancialHealth() {

    const analytics =
        calculateTransactionAnalytics();


    let score = 70;


    if (analytics.netFlow > 0) {
        score += 10;
    }


    if (analytics.deposits > 0) {
        score += 5;
    }


    score =
        Math.max(
            0,
            Math.min(
                100,
                score
            )
        );


    return {

        score,

        deposits:
            analytics.moneyIn,

        withdrawals:
            analytics.moneyOut,

        transfers:
            analytics.transfers,

        netFlow:
            analytics.netFlow,

        totalTransactions:
            analytics.totalTransactions
    };
}


// =========================================================
// UPDATE FINANCIAL HEALTH
// =========================================================

function updateFinancialHealth() {

    const health =
        calculateFinancialHealth();


    const scoreElement =
        getElement(
            "financialHealthScore"
        );


    if (scoreElement) {

        scoreElement.textContent =
            health.score;
    }


    const scoreValue =
        getElement(
            "scoreCircleValue"
        );


    if (scoreValue) {

        scoreValue.textContent =
            health.score;
    }


    let statusText =
        "Stable";


    if (health.score >= 85) {

        statusText =
            "Excellent";

    } else if (health.score >= 70) {

        statusText =
            "Good";

    } else if (health.score >= 50) {

        statusText =
            "Needs Attention";

    } else {

        statusText =
            "Critical";
    }


    const statusElement =
        getElement(
            "financialHealthStatus"
        );


    if (statusElement) {

        statusElement.textContent =
            statusText;
    }


    const message =
        getElement(
            "financialHealthMessage"
        );


    if (message) {

        if (health.score >= 85) {

            message.textContent =
                "Your financial activity looks healthy. Keep maintaining positive cash flow.";

        } else if (health.score >= 70) {

            message.textContent =
                "Your financial position is stable. Continue monitoring your income and expenses.";

        } else {

            message.textContent =
                "Consider reviewing your recent transactions and maintaining a positive cash flow.";
        }
    }


    const depositMetric =
        getElement(
            "healthDepositProgress"
        );


    if (depositMetric) {

        depositMetric.style.width =
            health.deposits > 0
                ? "100%"
                : "0%";
    }


    const withdrawalMetric =
        getElement(
            "healthWithdrawalProgress"
        );


    if (withdrawalMetric) {

        withdrawalMetric.style.width =
            health.withdrawals > 0
                ? "50%"
                : "0%";
    }


    const transferMetric =
        getElement(
            "healthTransferProgress"
        );


    if (transferMetric) {

        transferMetric.style.width =
            health.transfers > 0
                ? "50%"
                : "0%";
    }


    return health;
}


// =========================================================
// STEP 7.2
// BANKING NOTIFICATION
// =========================================================

function showBankingNotification(
    type,
    title,
    message,
    duration = 4500
) {

    const notification =
        getElement(
            "bankingNotification"
        );


    const icon =
        getElement(
            "notificationIcon"
        );


    const notificationTitle =
        getElement(
            "notificationTitle"
        );


    const notificationMessage =
        getElement(
            "notificationMessage"
        );


    if (!notification) {
        return;
    }


    if (notificationTimeout) {

        clearTimeout(
            notificationTimeout
        );

        notificationTimeout =
            null;
    }


    notification.classList.remove(
        "success",
        "error",
        "warning"
    );


    const safeType =
        [
            "success",
            "error",
            "warning"
        ].includes(type)
            ? type
            : "success";


    notification.classList.add(
        safeType
    );


    if (icon) {

        icon.textContent =
            safeType === "success"
                ? "✓"
                : "!";
    }


    if (notificationTitle) {

        notificationTitle.textContent =
            title;
    }


    if (notificationMessage) {

        notificationMessage.textContent =
            message;
    }


    notification.classList.add(
        "show"
    );


    notificationTimeout =
        setTimeout(
            () => {

                notification.classList.remove(
                    "show"
                );

                notificationTimeout =
                    null;

            },
            duration
        );
}


// =========================================================
// HIDE NOTIFICATION
// =========================================================

function hideBankingNotification() {

    const notification =
        getElement(
            "bankingNotification"
        );


    if (notification) {

        notification.classList.remove(
            "show"
        );
    }


    if (notificationTimeout) {

        clearTimeout(
            notificationTimeout
        );

        notificationTimeout =
            null;
    }
}


// =========================================================
// SETUP NOTIFICATIONS
// =========================================================

function setupBankingNotifications() {

    const closeButton =
        getElement(
            "notificationClose"
        );


    if (closeButton) {

        closeButton.onclick =
            hideBankingNotification;
    }


    console.log(
        "Banking notifications initialized."
    );
}


// =========================================================
// OPEN TRANSACTION MODAL
// =========================================================

function openTransactionModal(type) {

    const modal =
        getElement(
            "transactionModal"
        );


    const form =
        getElement(
            "transactionForm"
        );


    const modalTitle =
        getElement(
            "modalTitle"
        );


    const amountInput =
        getElement(
            "transactionAmount"
        );


    const recipientGroup =
        getElement(
            "recipientGroup"
        );


    const recipientAccount =
        getElement(
            "recipientAccount"
        );


    const message =
        getElement(
            "transactionMessage"
        );


    const confirmButton =
        getElement(
            "confirmTransactionBtn"
        );


    if (!modal || !form) {

        console.error(
            "Transaction modal/form not found."
        );

        return;
    }


    if (
        type !== "deposit" &&
        type !== "withdraw" &&
        type !== "transfer"
    ) {

        console.error(
            "Invalid transaction type:",
            type
        );

        return;
    }


    currentTransactionType =
        type;


    form.reset();


    if (message) {
        message.textContent = "";
    }


    if (confirmButton) {

        confirmButton.disabled =
            false;
    }


    if (type === "deposit") {

        if (modalTitle) {
            modalTitle.textContent =
                "Deposit Money";
        }

        if (confirmButton) {
            confirmButton.textContent =
                "Deposit";
        }

        if (recipientGroup) {
            recipientGroup.style.display =
                "none";
        }

        if (recipientAccount) {
            recipientAccount.required =
                false;
        }
    }


    if (type === "withdraw") {

        if (modalTitle) {
            modalTitle.textContent =
                "Withdraw Money";
        }

        if (confirmButton) {
            confirmButton.textContent =
                "Withdraw";
        }

        if (recipientGroup) {
            recipientGroup.style.display =
                "none";
        }

        if (recipientAccount) {
            recipientAccount.required =
                false;
        }
    }


    if (type === "transfer") {

        if (modalTitle) {
            modalTitle.textContent =
                "Transfer Money";
        }

        if (confirmButton) {
            confirmButton.textContent =
                "Transfer";
        }

        if (recipientGroup) {
            recipientGroup.style.display =
                "block";
        }

        if (recipientAccount) {
            recipientAccount.required =
                true;
        }
    }


    modal.classList.add(
        "show"
    );


    if (amountInput) {

        setTimeout(
            () => {
                amountInput.focus();
            },
            100
        );
    }
}


// =========================================================
// CLOSE TRANSACTION MODAL
// =========================================================

function closeTransactionModal() {

    const modal =
        getElement(
            "transactionModal"
        );


    const form =
        getElement(
            "transactionForm"
        );


    const message =
        getElement(
            "transactionMessage"
        );


    const recipientGroup =
        getElement(
            "recipientGroup"
        );


    const recipientAccount =
        getElement(
            "recipientAccount"
        );


    if (modal) {

        modal.classList.remove(
            "show"
        );
    }


    if (form) {
        form.reset();
    }


    if (message) {
        message.textContent = "";
    }


    if (recipientGroup) {

        recipientGroup.style.display =
            "none";
    }


    if (recipientAccount) {

        recipientAccount.required =
            false;
    }


    currentTransactionType =
        null;
}


// =========================================================
// MAKE TRANSACTION
// =========================================================

async function makeTransaction(
    endpoint,
    requestBody,
    transactionName
) {

    const confirmButton =
        getElement(
            "confirmTransactionBtn"
        );


    const message =
        getElement(
            "transactionMessage"
        );


    if (confirmButton) {

        confirmButton.disabled =
            true;

        confirmButton.textContent =
            "Processing...";
    }


    if (message) {

        message.textContent =
            "Processing transaction...";
    }


    try {

        const data =
            await apiRequest(
                endpoint,
                {
                    method: "POST",

                    body:
                        JSON.stringify(
                            requestBody
                        )
                }
            );


        console.log(
            `${transactionName} successful:`,
            data
        );


        if (message) {

            message.textContent =
                `${transactionName} successful!`;
        }


        showBankingNotification(

            "success",

            `${transactionName} Successful`,

            `Your ${transactionName.toLowerCase()} transaction was completed successfully.`
        );


        await refreshDashboardData(
            false
        );


        setTimeout(
            () => {
                closeTransactionModal();
            },
            1000
        );


        return true;

    } catch (error) {

        console.error(
            `${transactionName} failed:`,
            error
        );


        let errorMessage =
            error.message ||
            `${transactionName} failed.`;


        if (
            error.message &&
            error.message
                .toLowerCase()
                .includes(
                    "failed to fetch"
                )
        ) {

            errorMessage =
                "Cannot connect to the banking server. Make sure FastAPI is running on port 8004.";
        }


        if (message) {

            message.textContent =
                errorMessage;
        }


        showBankingNotification(

            "error",

            `${transactionName} Failed`,

            errorMessage
        );


        if (confirmButton) {

            confirmButton.disabled =
                false;

            confirmButton.textContent =
                transactionName;
        }


        return false;
    }
}


// =========================================================
// TRANSACTION FORM
// =========================================================

function setupTransactionForm() {

    const form =
        getElement(
            "transactionForm"
        );


    if (!form) {

        console.warn(
            "transactionForm not found."
        );

        return;
    }


    console.log(
        "Transaction form initialized."
    );


    form.onsubmit =
        async function(event) {

            event.preventDefault();
            event.stopPropagation();


            const amountInput =
                getElement(
                    "transactionAmount"
                );


            const recipientInput =
                getElement(
                    "recipientAccount"
                );


            const message =
                getElement(
                    "transactionMessage"
                );


            const amount =
                Number(
                    amountInput?.value
                );


            if (
                !Number.isFinite(amount) ||
                amount <= 0
            ) {

                if (message) {

                    message.textContent =
                        "Please enter a valid amount greater than ₹0.";
                }


                showBankingNotification(

                    "warning",

                    "Invalid Amount",

                    "Please enter an amount greater than ₹0."
                );


                return;
            }


            if (!currentTransactionType) {

                if (message) {

                    message.textContent =
                        "Please select a transaction type.";
                }

                return;
            }


            if (
                currentTransactionType ===
                "deposit"
            ) {

                await makeTransaction(

                    "/transactions/deposit",

                    {
                        amount: amount
                    },

                    "Deposit"
                );

                return;
            }


            if (
                currentTransactionType ===
                "withdraw"
            ) {

                await makeTransaction(

                    "/transactions/withdraw",

                    {
                        amount: amount
                    },

                    "Withdraw"
                );

                return;
            }


            if (
                currentTransactionType ===
                "transfer"
            ) {

                const receiver =
                    recipientInput
                        ?.value
                        ?.trim() || "";


                if (!receiver) {

                    if (message) {

                        message.textContent =
                            "Please enter the receiver account number.";
                    }


                    showBankingNotification(

                        "warning",

                        "Receiver Required",

                        "Please enter the receiver account number."
                    );


                    return;
                }


                const endpoint =
                    "/transactions/transfer" +
                    "?receiver_account_number=" +
                    encodeURIComponent(
                        receiver
                    );


                await makeTransaction(

                    endpoint,

                    {
                        amount: amount
                    },

                    "Transfer"
                );
            }
        };
}


// =========================================================
// SEARCH
// =========================================================

function setupSearch() {

    const search =
        getElement(
            "transactionSearch"
        );


    if (!search) {
        return;
    }


    search.addEventListener(
        "input",
        renderTransactions
    );
}


// =========================================================
// FILTER
// =========================================================

function setupFilter() {

    const filter =
        getElement(
            "transactionFilter"
        );


    if (!filter) {
        return;
    }


    filter.addEventListener(
        "change",
        renderTransactions
    );
}


// =========================================================
// MODAL EVENTS
// =========================================================

function setupModal() {

    const modal =
        getElement(
            "transactionModal"
        );


    const closeButton =
        getElement(
            "closeModalBtn"
        );


    const cancelButton =
        getElement(
            "cancelModalBtn"
        );


    if (closeButton) {

        closeButton.onclick =
            closeTransactionModal;
    }


    if (cancelButton) {

        cancelButton.onclick =
            closeTransactionModal;
    }


    if (modal) {

        modal.addEventListener(
            "click",
            function(event) {

                if (
                    event.target === modal ||
                    event.target.classList.contains(
                        "modal-overlay"
                    )
                ) {

                    closeTransactionModal();
                }
            }
        );
    }


    document.addEventListener(
        "keydown",
        function(event) {

            if (
                event.key === "Escape"
            ) {

                closeTransactionModal();
            }
        }
    );
}


// =========================================================
// SHOW TRANSACTION HISTORY
// =========================================================

async function showTransactionHistory() {

    const transactionsButton =
        getElement(
            "transactionsBtn"
        );


    const dashboardButton =
        getElement(
            "dashboardNavBtn"
        );


    if (dashboardButton) {
        dashboardButton.classList.remove(
            "active"
        );
    }


    if (transactionsButton) {
        transactionsButton.classList.add(
            "active"
        );
    }


    const title =
        getElement(
            "transactionsTitle"
        );


    if (title) {

        title.textContent =
            "Transaction History";
    }


    const section =
        getElement(
            "transactionsSection"
        );


    if (section) {

        section.scrollIntoView({

            behavior: "smooth",

            block: "start"
        });
    }


    await loadTransactions(false);
}


// =========================================================
// STEP 7.3-D
// RETURN TO DASHBOARD
// =========================================================

function showDashboardHome() {

    console.log(
        "Dashboard button clicked."
    );


    const dashboardButton =
        getElement(
            "dashboardNavBtn"
        );


    const transactionsButton =
        getElement(
            "transactionsBtn"
        );


    if (dashboardButton) {

        dashboardButton.classList.add(
            "active"
        );
    }


    if (transactionsButton) {

        transactionsButton.classList.remove(
            "active"
        );
    }


    const title =
        getElement(
            "transactionsTitle"
        );


    if (title) {

        title.textContent =
            "Recent Transactions";
    }


    window.scrollTo({

        top: 0,

        behavior: "smooth"
    });
}


// =========================================================
// QUICK ACTIONS
// =========================================================

function setupQuickActions() {

    console.log(
        "Setting up Quick Actions..."
    );


    // -----------------------------------------------------
    // DASHBOARD BUTTON
    // -----------------------------------------------------

    const dashboardButton =
        getElement(
            "dashboardNavBtn"
        );


    if (dashboardButton) {

        dashboardButton.onclick =
            function(event) {

                event.preventDefault();
                event.stopPropagation();

                showDashboardHome();
            };
    }


    // -----------------------------------------------------
    // DEPOSIT
    // -----------------------------------------------------

    const depositButton =
        getElement(
            "depositBtn"
        );


    if (depositButton) {

        depositButton.onclick =
            function(event) {

                event.preventDefault();
                event.stopPropagation();

                openTransactionModal(
                    "deposit"
                );
            };
    }


    // -----------------------------------------------------
    // WITHDRAW
    // -----------------------------------------------------

    const withdrawButton =
        getElement(
            "withdrawBtn"
        );


    if (withdrawButton) {

        withdrawButton.onclick =
            function(event) {

                event.preventDefault();
                event.stopPropagation();

                openTransactionModal(
                    "withdraw"
                );
            };
    }


    // -----------------------------------------------------
    // TRANSFER
    // -----------------------------------------------------

    const transferButton =
        getElement(
            "transferBtn"
        );


    if (transferButton) {

        transferButton.onclick =
            function(event) {

                event.preventDefault();
                event.stopPropagation();

                openTransactionModal(
                    "transfer"
                );
            };
    }


    // -----------------------------------------------------
    // TRANSACTIONS
    // -----------------------------------------------------

    const transactionsButton =
        getElement(
            "transactionsBtn"
        );


    if (transactionsButton) {

        transactionsButton.onclick =
            function(event) {

                event.preventDefault();
                event.stopPropagation();

                showTransactionHistory();
            };
    }


    console.log(
        "Quick Actions setup complete."
    );
}


// =========================================================
// REFRESH DASHBOARD DATA
// =========================================================

async function refreshDashboardData(
    showButtonState = false
) {

    if (dashboardIsRefreshing) {

        console.log(
            "Dashboard refresh already running."
        );

        return;
    }


    dashboardIsRefreshing =
        true;


    const refreshButton =
        getElement(
            "refreshBtn"
        );


    const originalText =
        refreshButton
            ? refreshButton.textContent
            : "↻";


    try {

        console.log(
            "Refreshing dashboard data..."
        );


        if (
            refreshButton &&
            showButtonState
        ) {

            refreshButton.disabled =
                true;

            refreshButton.classList.add(
                "refreshing"
            );

            refreshButton.textContent =
                "Refreshing...";
        }


        const results =
            await Promise.allSettled([

                loadProfile(),

                loadSummary(),

                loadAccount(),

                loadTransactions(false)

            ]);


        const successful =
            results.some(
                result =>
                    result.status ===
                    "fulfilled"
            );


        if (successful) {

            setDashboardLiveStatus(
                true
            );

            updateLastUpdated();

        } else {

            setDashboardLiveStatus(
                false
            );
        }


        console.log(
            "Dashboard refresh completed."
        );

    } catch (error) {

        console.error(
            "Dashboard refresh failed:",
            error
        );


        setDashboardLiveStatus(
            false
        );

    } finally {

        dashboardIsRefreshing =
            false;


        if (
            refreshButton &&
            showButtonState
        ) {

            refreshButton.disabled =
                false;

            refreshButton.classList.remove(
                "refreshing"
            );

            refreshButton.textContent =
                originalText;
        }
    }
}


// =========================================================
// REFRESH BUTTONS
// =========================================================

function setupRefresh() {

    const refreshButton =
        getElement(
            "refreshBtn"
        );


    const secondaryRefreshButton =
        getElement(
            "refreshBtnSecondary"
        );


    if (refreshButton) {

        refreshButton.onclick =
            async function(event) {

                event.preventDefault();

                await refreshDashboardData(
                    true
                );
            };
    }


    if (secondaryRefreshButton) {

        secondaryRefreshButton.onclick =
            async function(event) {

                event.preventDefault();

                await refreshDashboardData(
                    false
                );
            };
    }
}


// =========================================================
// STEP 7.1
// AUTO REFRESH
// =========================================================

function setupAutoRefresh() {

    if (dashboardRefreshInterval) {

        clearInterval(
            dashboardRefreshInterval
        );
    }


    dashboardRefreshInterval =
        setInterval(
            async function() {

                console.log(
                    "Automatic dashboard refresh..."
                );


                await refreshDashboardData(
                    false
                );

            },
            30000
        );


    console.log(
        "Auto refresh enabled: every 30 seconds."
    );
}


// =========================================================
// STEP 7.3-B
// CONNECTION CHECK
// =========================================================

async function checkBackendConnection() {

    try {

        const token =
            getToken();


        if (!token) {

            setDashboardLiveStatus(
                false
            );

            return false;
        }


        const response =
            await fetch(
                `${API_URL}/users/me`,
                {
                    method: "GET",

                    headers: {
                        "Authorization":
                            `Bearer ${token}`
                    }
                }
            );


        if (response.ok) {

            setDashboardLiveStatus(
                true
            );

            console.log(
                "🟢 Backend connection: LIVE"
            );

            return true;
        }


        setDashboardLiveStatus(
            false
        );


        console.log(
            "🔴 Backend connection: OFFLINE"
        );


        return false;

    } catch (error) {

        setDashboardLiveStatus(
            false
        );


        console.log(
            "🔴 Backend connection: OFFLINE"
        );


        return false;
    }
}


// =========================================================
// STEP 7.3-B
// CONNECTION MONITOR
// =========================================================

function setupConnectionMonitor() {

    if (connectionMonitorInterval) {

        clearInterval(
            connectionMonitorInterval
        );
    }


    checkBackendConnection();


    connectionMonitorInterval =
        setInterval(
            checkBackendConnection,
            10000
        );


    console.log(
        "Live connection monitoring enabled."
    );
}


// =========================================================
// LOGOUT
// =========================================================

function setupLogout() {

    const logoutButton =
        getElement(
            "logoutBtn"
        );


    if (!logoutButton) {

        console.warn(
            "#logoutBtn not found."
        );

        return;
    }


    logoutButton.onclick =
        function(event) {

            event.preventDefault();
            event.stopPropagation();


            console.log(
                "Logging out..."
            );


            if (dashboardRefreshInterval) {

                clearInterval(
                    dashboardRefreshInterval
                );

                dashboardRefreshInterval =
                    null;
            }


            if (connectionMonitorInterval) {

                clearInterval(
                    connectionMonitorInterval
                );

                connectionMonitorInterval =
                    null;
            }


            localStorage.removeItem(
                "access_token"
            );


            window.location.replace(
                "index.html"
            );
        };
}


// =========================================================
// FINAL ACCOUNT NUMBER CHECK
// =========================================================

function updateFinalAccountNumber() {

    const accountNumber =
        currentAccount?.account_number ||
        currentAccount?.accountNumber ||
        currentSummary?.account_number ||
        currentSummary?.accountNumber ||
        currentSummary?.account?.account_number ||
        currentSummary?.account?.accountNumber;


    if (accountNumber) {

        setAccountNumber(
            accountNumber
        );
    }
}


// =========================================================
// INITIALIZE DASHBOARD
// =========================================================

async function initializeDashboard() {

    console.log(
        "Initializing DigitalBank Dashboard..."
    );


    // -----------------------------------------------------
    // INITIAL STATUS
    // -----------------------------------------------------

    setDashboardLiveStatus(
        true
    );


    // -----------------------------------------------------
    // SETUP UI
    // -----------------------------------------------------

    setupTransactionForm();

    setupSearch();

    setupFilter();

    setupModal();

    setupRefresh();

    setupAutoRefresh();

    setupConnectionMonitor();

    setupBankingNotifications();

    setupLogout();

    setupQuickActions();


    // -----------------------------------------------------
    // LOAD DATA
    // -----------------------------------------------------

    await loadProfile();

    await loadSummary();

    await loadAccount();

    await loadTransactions();


    // -----------------------------------------------------
    // FINAL ACCOUNT NUMBER
    // -----------------------------------------------------

    updateFinalAccountNumber();


    // -----------------------------------------------------
    // LAST UPDATED
    // -----------------------------------------------------

    updateLastUpdated();


    // -----------------------------------------------------
    // FINAL CONNECTION CHECK
    // -----------------------------------------------------

    await checkBackendConnection();


    console.log(
        "Dashboard initialized successfully."
    );
}


// =========================================================
// START DASHBOARD
// =========================================================

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