function showToast(message, type = 'info') {
    const toastContainer = document.getElementById('toast-container') || (() => {
        const div = document.createElement('div');
        div.id = 'toast-container';
        div.style.position = 'fixed';
        div.style.top = '1rem';
        div.style.right = '1rem';
        div.style.zIndex = '1060';
        document.body.appendChild(div);
        return div;
    })();

    const toastEl = document.createElement('div');
    toastEl.classList.add('toast', `bg-${type}`, 'text-white');
    toastEl.setAttribute('role', 'alert');
    toastEl.setAttribute('aria-live', 'assertive');
    toastEl.setAttribute('aria-atomic', 'true');
    toastEl.innerHTML = `
        <div class="d-flex">
            <div class="toast-body">
                ${message}
            </div>
            <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast" aria-label="Close"></button>
        </div>
    `;

    toastContainer.appendChild(toastEl);
    const toast = new bootstrap.Toast(toastEl, { delay: 3000 });
    toast.show();

    toastEl.addEventListener('hidden.bs.toast', function () {
        toastEl.remove();
    });
}

let currentUser = null;

const STORAGE_KEY = 'ipt_demo_v1';

function setAuthState(isAuth, user) {
    currentUser = user;
    const body = document.body;
    if (isAuth) {
        body.classList.add('authenticated');
        body.classList.remove('not-authenticated');
        if (user && user.role === 'admin') {
            body.classList.add('is-admin');
        } else {
            body.classList.remove('is-admin');
        }
        // Update username in navbar
        const navbarDropdown = document.getElementById('navbarDropdown');
        if (navbarDropdown && user) {
            navbarDropdown.textContent = user.firstName + ' ' + user.lastName;
        }
    } else {
        body.classList.remove('authenticated');
        body.classList.add('not-authenticated');
        body.classList.remove('is-admin');
        const navbarDropdown = document.getElementById('navbarDropdown');
        if (navbarDropdown) {
            navbarDropdown.textContent = ''; // Clear username
        }
    }
}

function loadFromStorage() {
    const storedData = localStorage.getItem(STORAGE_KEY);
    if (storedData) {
        try {
            window.db = JSON.parse(storedData);
        } catch (e) {
            console.error("Error parsing stored data, seeding new data:", e);
            seedStorage();
        }
    } else {
        seedStorage();
    }
}

function seedStorage() {
    window.db = {
        accounts: [
            {
                firstName: 'Admin',
                lastName: 'User',
                email: 'admin@example.com',
                password: 'Password123!',
                verified: true,
                role: 'admin'
            }
        ],
        departments: [
            { id: 'eng', name: 'Engineering', description: 'Manages all engineering activities' },
            { id: 'hr', name: 'Human Resources', description: 'Handles personnel and employee relations' }
        ],
        employees: [],
        requests: []
    };
    saveToStorage();
}

function saveToStorage() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(window.db));
}

loadFromStorage();

function navigateTo(hash) {
    window.location.hash = hash;
}

function handleRouting() {
    const hash = window.location.hash;
    const pageId = hash === '' || hash === '#/' ? 'home-page' : hash.substring(2) + '-page';

    document.querySelectorAll('.page').forEach(page => {
        page.classList.remove('active');
    });

    const activePage = document.getElementById(pageId);
    if (activePage) {
        activePage.classList.add('active');
        if (pageId === 'verify-email-page') {
            const unverifiedEmail = localStorage.getItem('unverified_email');
            if (unverifiedEmail) {
                document.getElementById('verification-message').textContent = `Verification sent to ${unverifiedEmail}`;
            } else {
                navigateTo('#/');
            }
        } else if (pageId === 'profile-page') {
            renderProfile();
        } else if (pageId === 'accounts-page') {
            renderAccountsList();
    } else if (pageId === 'employees-page') {
        renderEmployeesTable();
    } else if (pageId === 'departments-page') {
            renderDepartmentsList();
        }
    } else {
        // Handle 404 or redirect to home
        navigateTo('#/');
    }

    // Redirect unauthenticated users from protected routes
    const protectedRoutes = ['profile', 'my-requests', 'employees', 'accounts', 'departments'];
    if (!currentUser && protectedRoutes.some(route => hash.includes(route))) {
        navigateTo('#/login');
        return;
    }

    // Block non-admins from admin routes
    const adminRoutes = ['employees', 'accounts', 'departments'];
    if (currentUser && currentUser.role !== 'admin' && adminRoutes.some(route => hash.includes(route))) {
        navigateTo('#/profile'); // Or another appropriate redirect
        return;
    }

}

window.addEventListener('hashchange', handleRouting);

// On page load, set hash to #/ if empty
if (window.location.hash === '') {
    navigateTo('#/');
}

const authToken = localStorage.getItem('auth_token');
if (authToken) {
    const user = window.db.accounts.find(account => account.email === authToken);
    if (user && user.verified) {
        setAuthState(true, user);
    }
}

handleRouting(); // Initial routing on page load

// Registration Form Logic
document.getElementById('register-form').addEventListener('submit', function(event) {
    event.preventDefault();

    const firstName = document.getElementById('register-first-name').value;
    const lastName = document.getElementById('register-last-name').value;
    const email = document.getElementById('register-email').value;
    const password = document.getElementById('register-password').value;

    // Check if email already exists
    const accountExists = window.db.accounts.some(account => account.email === email);
    if (accountExists) {
        showToast('Error: Email already registered.', 'danger');
        return;
    }

    // Save new account
    const newAccount = {
        firstName,
        lastName,
        email,
        password,
        verified: false,
        role: 'user'
    };
    window.db.accounts.push(newAccount);
    saveToStorage();

    localStorage.setItem('unverified_email', email);
    navigateTo('#/verify-email');
});

// Simulate Email Verification Logic
document.getElementById('simulate-verification-btn').addEventListener('click', function() {
    const unverifiedEmail = localStorage.getItem('unverified_email');
    if (unverifiedEmail) {
        const account = window.db.accounts.find(acc => acc.email === unverifiedEmail);
        if (account) {
            account.verified = true;
            saveToStorage();
            localStorage.removeItem('unverified_email');
            showToast('Email successfully verified!', 'success');
            navigateTo('#/login');
        }
    }
});

// Login Form Logic
document.getElementById('login-form').addEventListener('submit', function(event) {
    event.preventDefault();

    const email = document.getElementById('login-email').value;
    const password = document.getElementById('login-password').value;

    const account = window.db.accounts.find(acc => acc.email === email && acc.password === password && acc.verified);

    if (account) {
        localStorage.setItem('auth_token', email);
        setAuthState(true, account);
        navigateTo('#/profile');
    } else {
        showToast('Error: Invalid email, password, or unverified account.', 'danger');
    }
});

// Logout Logic
document.getElementById('logout-link').addEventListener('click', function(event) {
    event.preventDefault();
    localStorage.removeItem('auth_token');
    setAuthState(false, null);
    navigateTo('#/');
});

function renderProfile() {
    if (currentUser) {
        document.getElementById('profile-name').textContent = `${currentUser.firstName} ${currentUser.lastName}`;
        document.getElementById('profile-email').textContent = currentUser.email;
        document.getElementById('profile-role').textContent = currentUser.role;

        document.getElementById('edit-profile-btn').addEventListener('click', function() {
            showToast('Edit Profile functionality not yet implemented.', 'info');
        });
    }
}
function renderEmployeesTable() {
    const employeesList = document.getElementById('employees-list');
    let tableHtml = `
        <table class="table table-striped">
            <thead>
                <tr>
                    <th>ID</th>
                    <th>User (Email)</th>
                    <th>Position</th>
                    <th>Department</th>
                    <th>Hire Date</th>
                    <th>Actions</th>
                </tr>
            </thead>
            <tbody>
    `;

    window.db.employees.forEach(employee => {
        const user = window.db.accounts.find(acc => acc.email === employee.userEmail);
        const department = window.db.departments.find(dept => dept.id === employee.departmentId);
        tableHtml += `
            <tr>
                <td>${employee.id}</td>
                <td>${employee.userEmail}</td>
                <td>${employee.position}</td>
                <td>${department ? department.name : 'N/A'}</td>
                <td>${employee.hireDate}</td>
                <td>
                    <button class="btn btn-sm btn-info edit-employee-btn" data-id="${employee.id}">Edit</button>
                    <button class="btn btn-sm btn-danger delete-employee-btn" data-id="${employee.id}">Delete</button>
                </td>
            </tr>
        `;
    });

    tableHtml += `
            </tbody>
        </table>
    `;
    employeesList.innerHTML = tableHtml;

    employeesList.querySelectorAll('.edit-employee-btn').forEach(button => {
        button.addEventListener('click', function() {
            const employeeId = this.dataset.id;
            const employee = window.db.employees.find(emp => emp.id === employeeId);
            if (employee) {
                document.getElementById('employee-id-field').value = employee.id;
                document.getElementById('employee-id').value = employee.id;
                document.getElementById('employee-id').readOnly = true;
                document.getElementById('employee-user-email').value = employee.userEmail;
                document.getElementById('employee-position').value = employee.position;
                document.getElementById('employee-department').value = employee.departmentId;
                document.getElementById('employee-hire-date').value = employee.hireDate;
                var employeeModal = new bootstrap.Modal(document.getElementById('employeeModal'));
                employeeModal.show();
            }
        });
    });

    employeesList.querySelectorAll('.delete-employee-btn').forEach(button => {
        button.addEventListener('click', function() {
            const employeeId = this.dataset.id;
            if (confirm(`Are you sure you want to delete employee ${employeeId}?`)) {
                window.db.employees = window.db.employees.filter(emp => emp.id !== employeeId);
                saveToStorage();
                renderEmployeesTable();
                showToast('Employee deleted successfully!', 'success');
            }
        });
    });
}

document.getElementById('add-employee-btn').addEventListener('click', function() {
    document.getElementById('employee-form').reset();
    document.getElementById('employee-id-field').value = '';
    document.getElementById('employee-id').readOnly = false;
    // Populate department dropdown
    const departmentSelect = document.getElementById('employee-department');
    departmentSelect.innerHTML = window.db.departments.map(dept => `<option value="${dept.id}">${dept.name}</option>`).join('');
    var employeeModal = new bootstrap.Modal(document.getElementById('employeeModal'));
    employeeModal.show();
});

document.getElementById('employee-form').addEventListener('submit', function(event) {
    event.preventDefault();

    const employeeId = document.getElementById('employee-id-field').value;
    const id = document.getElementById('employee-id').value;
    const userEmail = document.getElementById('employee-user-email').value;
    const position = document.getElementById('employee-position').value;
    const departmentId = document.getElementById('employee-department').value;
    const hireDate = document.getElementById('employee-hire-date').value;

    // Validate user email
    const userExists = window.db.accounts.some(acc => acc.email === userEmail);
    if (!userExists) {
        showToast('Error: User with this email does not exist.', 'danger');
        return;
    }

    if (employeeId) {
        // Edit existing employee
        const employeeIndex = window.db.employees.findIndex(emp => emp.id === employeeId);
        if (employeeIndex !== -1) {
            window.db.employees[employeeIndex].userEmail = userEmail;
            window.db.employees[employeeIndex].position = position;
            window.db.employees[employeeIndex].departmentId = departmentId;
            window.db.employees[employeeIndex].hireDate = hireDate;
            saveToStorage();
            showToast('Employee updated successfully!', 'success');
        }
    } else {
        // Add new employee
        const employeeIdExists = window.db.employees.some(emp => emp.id === id);
        if (employeeIdExists) {
            showToast('Error: Employee with this ID already exists.', 'danger');
            return;
        }
        window.db.employees.push({ id, userEmail, position, departmentId, hireDate });
        saveToStorage();
        showToast('Employee added successfully!', 'success');
    }

    var employeeModal = bootstrap.Modal.getInstance(document.getElementById('employeeModal'));
    employeeModal.hide();
    renderEmployeesTable();
});

function renderDepartmentsList() {
    const departmentsList = document.getElementById('departments-list');
    let tableHtml = `
        <table class="table table-striped">
            <thead>
                <tr>
                    <th>Name</th>
                    <th>Description</th>
                    <th>Actions</th>
                </tr>
            </thead>
            <tbody>
    `;

    window.db.departments.forEach(dept => {
        tableHtml += `
            <tr>
                <td>${dept.name}</td>
                <td>${dept.description}</td>
                <td>
                    <button class="btn btn-sm btn-info edit-department-btn" data-id="${dept.id}">Edit</button>
                    <button class="btn btn-sm btn-danger delete-department-btn" data-id="${dept.id}">Delete</button>
                </td>
            </tr>
        `;
    });

    tableHtml += `
            </tbody>
        </table>
    `;
    departmentsList.innerHTML = tableHtml;

    departmentsList.querySelectorAll('.edit-department-btn').forEach(button => {
        button.addEventListener('click', function() {
            showToast('Edit Department functionality not yet implemented.', 'info');
        });
    });

    departmentsList.querySelectorAll('.delete-department-btn').forEach(button => {
        button.addEventListener('click', function() {
            const id = this.dataset.id;
            if (confirm(`Are you sure you want to delete department ${id}?`)) {
                window.db.departments = window.db.departments.filter(dept => dept.id !== id);
                saveToStorage();
                renderDepartmentsList();
                showToast('Department deleted successfully!', 'success');
            }
        });
    });
}

document.getElementById('add-department-btn').addEventListener('click', function() {
    showToast('Add Department functionality not yet implemented.', 'info');
});

function renderAccountsList() {
    const accountsList = document.getElementById('accounts-list');
    let tableHtml = `
        <table class="table table-striped">
            <thead>
                <tr>
                    <th>Name</th>
                    <th>Email</th>
                    <th>Role</th>
                    <th>Verified</th>
                    <th>Actions</th>
                </tr>
            </thead>
            <tbody>
    `;

    window.db.accounts.forEach(account => {
        tableHtml += `
            <tr>
                <td>${account.firstName} ${account.lastName}</td>
                <td>${account.email}</td>
                <td>${account.role}</td>
                <td>${account.verified ? '✅' : '❌'}</td>
                <td>
                    <button class="btn btn-sm btn-info edit-account-btn" data-email="${account.email}">Edit</button>
                    <button class="btn btn-sm btn-warning reset-password-btn" data-email="${account.email}">Reset PW</button>
                    <button class="btn btn-sm btn-danger delete-account-btn" data-email="${account.email}">Delete</button>
                </td>
            </tr>
        `;
    });

    tableHtml += `
            </tbody>
        </table>
    `;
    accountsList.innerHTML = tableHtml;

    // Add event listeners for edit, reset password, delete buttons
    accountsList.querySelectorAll('.edit-account-btn').forEach(button => {
        button.addEventListener('click', function() {
            const email = this.dataset.email;
            const account = window.db.accounts.find(acc => acc.email === email);
            if (account) {
                document.getElementById('account-id').value = account.email; // Using email as ID for simplicity
                document.getElementById('account-first-name').value = account.firstName;
                document.getElementById('account-last-name').value = account.lastName;
                document.getElementById('account-email').value = account.email;
                document.getElementById('account-role').value = account.role;
                document.getElementById('account-verified').checked = account.verified;
                document.getElementById('account-email').readOnly = true; // Prevent changing email on edit
                document.getElementById('password-help-text').style.display = 'block'; // Show password help text
                var accountModal = new bootstrap.Modal(document.getElementById('accountModal'));
                accountModal.show();
            }
        });
    });

    accountsList.querySelectorAll('.reset-password-btn').forEach(button => {
        button.addEventListener('click', function() {
            const email = this.dataset.email;
            const newPassword = prompt('Enter new password (min 6 characters):');
            if (newPassword && newPassword.length >= 6) {
                const account = window.db.accounts.find(acc => acc.email === email);
                if (account) {
                    account.password = newPassword;
                    saveToStorage();
                    showToast('Password reset successfully!', 'success');
                    renderAccountsList();
                }
            } else if (newPassword !== null) {
                showToast('Password must be at least 6 characters.', 'danger');
            }
        });
    });

    accountsList.querySelectorAll('.delete-account-btn').forEach(button => {
        button.addEventListener('click', function() {
            const email = this.dataset.email;
            if (currentUser && currentUser.email === email) {
                showToast('Error: You cannot delete your own account!', 'danger');
                return;
            }
            if (confirm(`Are you sure you want to delete account ${email}?`)) {
                window.db.accounts = window.db.accounts.filter(acc => acc.email !== email);
                saveToStorage();
                renderAccountsList();
            }
        });
    });
}

// Add Account Button Logic
document.getElementById('add-account-btn').addEventListener('click', function() {
    document.getElementById('account-form').reset();
    document.getElementById('account-id').value = '';
    document.getElementById('account-email').readOnly = false;
    document.getElementById('password-help-text').style.display = 'block';
});

// Account Form Submission Logic
document.getElementById('account-form').addEventListener('submit', function(event) {
    event.preventDefault();

    const accountId = document.getElementById('account-id').value;
    const firstName = document.getElementById('account-first-name').value;
    const lastName = document.getElementById('account-last-name').value;
    const email = document.getElementById('account-email').value;
    const password = document.getElementById('account-password').value;
    const role = document.getElementById('account-role').value;
    const verified = document.getElementById('account-verified').checked;

    if (accountId) {
        // Edit existing account
        const accountIndex = window.db.accounts.findIndex(acc => acc.email === accountId);
        if (accountIndex !== -1) {
            window.db.accounts[accountIndex].firstName = firstName;
            window.db.accounts[accountIndex].lastName = lastName;
            window.db.accounts[accountIndex].role = role;
            window.db.accounts[accountIndex].verified = verified;
            if (password) { // Only update password if provided
                if (password.length < 6) {
                showToast('Password must be at least 6 characters.', 'danger');
                    return;
                }
                window.db.accounts[accountIndex].password = password;
            }
            saveToStorage();
        }
    } else {
        // Add new account
        const accountExists = window.db.accounts.some(acc => acc.email === email);
        if (accountExists) {
            showToast('Error: Account with this email already exists.', 'danger');
            return;
        }
        if (password.length < 6) {
            showToast('Password must be at least 6 characters.', 'danger');
            return;
        }
        window.db.accounts.push({ firstName, lastName, email, password, role, verified });
        saveToStorage();
    }

    var accountModal = bootstrap.Modal.getInstance(document.getElementById('accountModal'));
    accountModal.hide();
    renderAccountsList();
});