// --- 1. SETUP & UTILS ---
const STORAGE_KEY = 'fullstack_sys_v1'; // Slightly renamed key for the new system
let currentUser = null;
window.db = { accounts: [], departments: [], employees: [], requests: [] };

function safeMsg(msg, type='success') {
    const container = document.getElementById('toast-container');
    const el = document.createElement('div');
    el.className = `toast ${type}`;
    el.innerHTML = `<span>${msg}</span>`; // Added span for flex alignment
    container.appendChild(el);
    setTimeout(() => el.classList.add('show'), 10);
    setTimeout(() => { el.classList.remove('show'); setTimeout(() => el.remove(), 300); }, 3000);
}

function openModal(id) { document.getElementById(id).classList.add('open'); }
function closeModal(id) { document.getElementById(id).classList.remove('open'); }

// --- 2. DATA LAYER ---
function loadData() {
    const data = localStorage.getItem(STORAGE_KEY);
    if (data) { try { window.db = JSON.parse(data); } catch(e) {} }
    if (!window.db.accounts || window.db.accounts.length === 0) {
        window.db.accounts = [{ id: 1, fname: 'System', lname: 'Admin', email: 'admin@example.com', pass: '123456', role: 'Admin', verified: true }];
        window.db.departments = [{ id: 1, name: 'Engineering', desc: 'Dev Team' }, { id: 2, name: 'HR', desc: 'Human Resources' }];
        saveData();
    }
}
function saveData() { localStorage.setItem(STORAGE_KEY, JSON.stringify(window.db)); }

// --- 3. AUTH LOGIC ---
function handleRegister(e) {
    e.preventDefault();
    const email = document.getElementById('reg-email').value;
    if (window.db.accounts.find(u => u.email === email)) return safeMsg("Email taken!", "danger");
    window.db.accounts.push({ id: Date.now(), fname: document.getElementById('reg-fname').value, lname: document.getElementById('reg-lname').value, email, pass: document.getElementById('reg-pass').value, role: 'User', verified: false });
    saveData();
    localStorage.setItem('unverified_email', email);
    safeMsg("Account created! Check verify page.");
    navigateTo('#/verify-email');
}

function simulateVerification() {
    const email = localStorage.getItem('unverified_email');
    const user = window.db.accounts.find(u => u.email === email);
    if (user) { user.verified = true; saveData(); safeMsg("Verified! Login now."); navigateTo('#/login'); }
}

function handleLogin(e) {
    e.preventDefault();
    const email = document.getElementById('login-email').value;
    const pass = document.getElementById('login-pass').value;
    const user = window.db.accounts.find(u => u.email === email && u.pass === pass);
    if (!user) return safeMsg("Invalid credentials", "danger");
    if (!user.verified) { localStorage.setItem('unverified_email', email); return navigateTo('#/verify-email'); }
    currentUser = user; localStorage.setItem('auth_token', user.email);
    updateAuthState(); safeMsg(`Welcome, ${user.fname}!`); navigateTo('#/requests');
}

function handleLogout() {
    currentUser = null; localStorage.removeItem('auth_token'); updateAuthState(); safeMsg("Logged out"); navigateTo('#/');
}

// --- 4. ROUTER ---
function updateAuthState() {
    const body = document.body;
    if (currentUser) {
        body.classList.remove('not-authenticated'); body.classList.add('authenticated');
        body.classList.toggle('is-admin', currentUser.role === 'Admin');
        const nameDisplay = document.getElementById('home-user-name');
        if(nameDisplay) nameDisplay.innerText = currentUser.fname;
    } else {
        body.classList.add('not-authenticated'); body.classList.remove('authenticated'); body.classList.remove('is-admin');
    }
}

function navigateTo(hash) { window.location.hash = hash; }

function handleRouting() {
    let hash = window.location.hash || '#/';
    const adminRoutes = ['#/admin-accounts', '#/admin-depts', '#/admin-employees', '#/admin-requests'];
    if (!currentUser && hash.includes('#/admin')) return navigateTo('#/login');
    if (currentUser && currentUser.role !== 'Admin' && adminRoutes.includes(hash)) return navigateTo('#/');

    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    const pageId = {
        '#/': 'home-page', '#/login': 'login-page', '#/register': 'register-page', '#/verify-email': 'verify-email-page',
        '#/profile': 'profile-page', '#/requests': 'requests-page', '#/admin-requests': 'admin-requests-page',
        '#/admin-accounts': 'admin-accounts-page', '#/admin-depts': 'admin-depts-page', '#/admin-employees': 'admin-employees-page'
    }[hash] || 'home-page';

    const pageEl = document.getElementById(pageId);
    if(pageEl) pageEl.classList.add('active');

    if(hash === '#/profile') renderProfile();
    if(hash === '#/requests') renderRequests();
    if(hash === '#/admin-requests') renderAdminRequests();
    if(hash === '#/verify-email') document.getElementById('verify-email-display').innerText = localStorage.getItem('unverified_email') || 'Unknown';
    if(hash.startsWith('#/admin') && hash !== '#/admin-requests') renderAdminData();
}

// --- 5. RENDERERS ---
function renderProfile() {
    if(currentUser) {
        document.getElementById('prof-name').innerText = currentUser.fname + " " + currentUser.lname;
        document.getElementById('prof-email').innerText = currentUser.email;
        document.getElementById('prof-role').innerText = currentUser.role;
    }
}

function renderRequests() {
    const myReqs = window.db.requests.filter(r => r.employeeEmail === currentUser.email);
    document.getElementById('requests-table-body').innerHTML = myReqs.map(r => `
        <tr><td>${r.date}</td><td>${r.type}</td>
        <td>${r.items.map(i=>i.qty+'x '+i.name).join(', ')}</td>
        <td><span class="badge status-${r.status}">${r.status}</span></td></tr>
    `).join('') || '<tr><td colspan="4" class="text-center text-muted">No requests found.</td></tr>';
}

function renderAdminRequests() {
    document.getElementById('admin-req-workflow-table').innerHTML = window.db.requests.map((r, index) => `
        <tr>
            <td>${r.employeeEmail}</td>
            <td>${r.type}</td>
            <td>${r.items.map(i=>i.qty+' '+i.name).join(', ')}</td>
            <td><span class="badge status-${r.status}">${r.status}</span></td>
            <td>
                ${r.status === 'Pending' ? `
                    <button class="btn btn-sm btn-success" onclick="handleRequestAction(${index}, 'Approved')">✔</button>
                    <button class="btn btn-sm btn-danger" onclick="handleRequestAction(${index}, 'Rejected')">✖</button>
                ` : '<span class="text-muted" style="font-size:0.8rem">Closed</span>'}
            </td>
        </tr>
    `).join('') || '<tr><td colspan="5" class="text-center">No pending requests.</td></tr>';
}

function handleRequestAction(index, newStatus) {
    window.db.requests[index].status = newStatus;
    saveData();
    renderAdminRequests();
    safeMsg(`Request ${newStatus}`);
}

function renderAdminData() {
    // Accounts
    document.getElementById('admin-acc-table').innerHTML = window.db.accounts.map(u => `
        <tr><td>${u.fname} ${u.lname}</td><td>${u.email}</td><td>${u.role}</td><td>${u.verified ? '<span class="text-primary">Yes</span>' : 'No'}</td>
        <td><button class="btn btn-sm btn-danger" onclick="deleteAcc(${u.id})">Remove</button></td></tr>
    `).join('');

    // Departments
    document.getElementById('admin-dept-table').innerHTML = window.db.departments.map(d => `
        <tr><td>${d.name}</td><td>${d.desc}</td>
        <td><button class="btn btn-sm btn-outline" onclick="editDept(${d.id})">Edit</button> 
        <button class="btn btn-sm btn-danger" onclick="deleteDept(${d.id})">Del</button></td></tr>
    `).join('');

    // Employees
    document.getElementById('admin-emp-table').innerHTML = window.db.employees.map(e => `
        <tr>
            <td>${e.id}</td>
            <td>${e.email}</td>
            <td>${e.pos}</td>
            <td>${e.dept}</td>
            <td>
                <button class="btn btn-sm btn-warning" onclick="openTransferModal('${e.id}')">Move</button>
                <button class="btn btn-sm btn-danger" onclick="deleteEmp('${e.id}')">Del</button>
            </td>
        </tr>
    `).join('');
}

// --- 6. LOGIC & TRANSFERS ---
function openTransferModal(empId) {
    const emp = window.db.employees.find(e => e.id == empId);
    if(!emp) return;
    document.getElementById('transfer-emp-id').value = emp.id;
    document.getElementById('transfer-emp-name').innerText = emp.email; 
    const currentDept = emp.dept;
    document.getElementById('transfer-dept-select').innerHTML = window.db.departments
        .filter(d => d.name !== currentDept)
        .map(d => `<option value="${d.name}">${d.name}</option>`)
        .join('');
    openModal('transferModal');
}

function submitTransfer() {
    const empId = document.getElementById('transfer-emp-id').value;
    const newDept = document.getElementById('transfer-dept-select').value;
    const empIndex = window.db.employees.findIndex(e => e.id == empId);
    if(empIndex > -1) {
        const oldDept = window.db.employees[empIndex].dept;
        window.db.employees[empIndex].dept = newDept;
        saveData();
        closeModal('transferModal');
        renderAdminData();
        safeMsg(`Transferred to ${newDept}`);
    }
}

// Actions
function openDeptModal() { document.getElementById('dept-id').value = ''; document.getElementById('dept-name').value = ''; document.getElementById('dept-desc').value = ''; openModal('deptModal'); }
function editDept(id) { const d = window.db.departments.find(x => x.id === id); if(d) { document.getElementById('dept-id').value = d.id; document.getElementById('dept-name').value = d.name; document.getElementById('dept-desc').value = d.desc; openModal('deptModal'); } }
function saveAdminDept() {
    const id = document.getElementById('dept-id').value, name = document.getElementById('dept-name').value, desc = document.getElementById('dept-desc').value;
    if(!name) return safeMsg("Name required", "warning");
    if(id) { const idx = window.db.departments.findIndex(d => d.id == id); if(idx > -1) window.db.departments[idx] = { ...window.db.departments[idx], name, desc }; }
    else { window.db.departments.push({ id: Date.now(), name, desc }); }
    saveData(); closeModal('deptModal'); renderAdminData(); safeMsg("Department Saved");
}
function deleteDept(id) { if(confirm("Delete?")) { window.db.departments = window.db.departments.filter(d => d.id !== id); saveData(); renderAdminData(); } }
function deleteAcc(id) { if(confirm("Delete User?")) { window.db.accounts = window.db.accounts.filter(u => u.id !== id); saveData(); renderAdminData(); } }
function deleteEmp(id) { if(confirm("Remove Employee?")) { window.db.employees = window.db.employees.filter(e => e.id != id); saveData(); renderAdminData(); } }

function addRequestItemRow() {
    const div = document.createElement('div'); div.className = 'request-item-row';
    div.innerHTML = `<input placeholder="Item" style="flex:2"><input type="number" placeholder="Qty" style="flex:1"><button onclick="this.parentElement.remove()" class="btn btn-danger btn-sm">×</button>`;
    document.getElementById('req-items-container').appendChild(div);
}
function submitRequest() {
    const rows = document.querySelectorAll('#req-items-container .request-item-row');
    if(rows.length === 0) return safeMsg("Add items first", "warning");
    const items = Array.from(rows).map(r => ({ name: r.querySelectorAll('input')[0].value, qty: r.querySelectorAll('input')[1].value }));
    window.db.requests.push({ date: new Date().toLocaleDateString(), type: document.getElementById('req-type').value, items, status: 'Pending', employeeEmail: currentUser.email });
    saveData(); closeModal('requestModal'); renderRequests(); safeMsg("Request sent!");
    document.getElementById('req-items-container').innerHTML = ''; addRequestItemRow();
}

function openAccountModal() { document.getElementById('acc-id').value = ''; openModal('accountModal'); }
function saveAdminAccount() {
    window.db.accounts.push({ id: Date.now(), fname: document.getElementById('acc-fname').value, lname: document.getElementById('acc-lname').value, email: document.getElementById('acc-email').value, pass: document.getElementById('acc-pass').value, role: document.getElementById('acc-role').value, verified: document.getElementById('acc-verified').checked });
    saveData(); closeModal('accountModal'); renderAdminData();
}
function openEmployeeModal() {
    document.getElementById('emp-user-select').innerHTML = window.db.accounts.map(u => `<option value="${u.email}">${u.email}</option>`).join('');
    document.getElementById('emp-dept-select').innerHTML = window.db.departments.map(d => `<option value="${d.name}">${d.name}</option>`).join('');
    openModal('employeeModal');
}
function saveAdminEmployee() {
    window.db.employees.push({ id: document.getElementById('emp-id').value, email: document.getElementById('emp-user-select').value, pos: document.getElementById('emp-pos').value, dept: document.getElementById('emp-dept-select').value });
    saveData(); closeModal('employeeModal'); renderAdminData();
}

window.addEventListener('load', () => {
    loadData();
    const token = localStorage.getItem('auth_token');
    if(token) { const user = window.db.accounts.find(u => u.email === token); if(user) { currentUser = user; updateAuthState(); } }
    window.addEventListener('hashchange', handleRouting);
    if(!window.location.hash) window.location.hash = '#/';
    handleRouting();
    addRequestItemRow();
});