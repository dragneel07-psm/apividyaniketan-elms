#!/usr/bin/env node

const API_BASE = (process.env.E2E_API_URL || 'https://e-learningwebapp-production-1112.up.railway.app').replace(/\/+$/, '');

function nowToken() {
  return `${Date.now()}${Math.floor(Math.random() * 10000)}`;
}

function mapTenantType(planName) {
  const normalized = String(planName || '').toLowerCase();
  if (normalized.includes('enterprise')) return 'enterprise';
  if (normalized.includes('premium')) return 'premium';
  return 'standard';
}

async function requestJson(url, options = {}) {
  const response = await fetch(url, options);
  const text = await response.text();
  let data = {};
  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    data = { raw: text };
  }
  return { ok: response.ok, status: response.status, data };
}

async function ensureSaasAdmin() {
  const existingEmail = process.env.E2E_SAAS_EMAIL;
  const existingPassword = process.env.E2E_SAAS_PASSWORD;
  if (existingEmail && existingPassword) {
    return { email: existingEmail, password: existingPassword, created: false };
  }

  const token = nowToken();
  const email = `e2e_saas_${token}@example.com`;
  const password = process.env.E2E_SAAS_PASSWORD_DEFAULT || 'SaaS!Admin12345';
  const payload = {
    username: `e2e_saas_${token}`,
    email,
    password,
    password_confirm: password,
    first_name: 'E2E',
    last_name: 'SaaS',
  };

  const registration = await requestJson(`${API_BASE}/api/users/register/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  if (!registration.ok) {
    throw new Error(`SaaS admin registration failed (${registration.status}): ${JSON.stringify(registration.data)}`);
  }

  return { email, password, created: true };
}

async function login(email, password, schoolCode = 'public') {
  const loginRes = await requestJson(`${API_BASE}/api/users/login/`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-tenant-id': schoolCode,
    },
    body: JSON.stringify({ email, password }),
  });
  if (!loginRes.ok || !loginRes.data?.access) {
    throw new Error(`Login failed (${loginRes.status}): ${JSON.stringify(loginRes.data)}`);
  }
  return loginRes.data.access;
}

async function getFirstPublicPlan() {
  const plansRes = await requestJson(`${API_BASE}/api/billing/plans/public/`);
  if (!plansRes.ok) {
    throw new Error(`Failed to load public plans (${plansRes.status}): ${JSON.stringify(plansRes.data)}`);
  }
  const plan = Array.isArray(plansRes.data) ? plansRes.data[0] : null;
  if (!plan?.plan_id) {
    throw new Error(`No public plan found: ${JSON.stringify(plansRes.data)}`);
  }
  return plan;
}

async function createTenant(accessToken, plan) {
  const token = nowToken();
  const subdomain = `e2escale${token}`;
  const adminEmail = `e2e_admin_${token}@example.com`;
  const adminPassword = process.env.E2E_TENANT_ADMIN_PASSWORD || 'Admin@12345';
  const type = mapTenantType(plan.name);

  const payload = {
    name: `E2E Scale ${token}`,
    subdomain,
    type,
    plan_id: plan.plan_id,
    admin_email: adminEmail,
    admin_first_name: 'E2E',
    admin_last_name: 'Admin',
    password: adminPassword,
  };

  const createRes = await requestJson(`${API_BASE}/api/core/tenants/`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
      'x-tenant-id': 'public',
    },
    body: JSON.stringify(payload),
  });

  if (!createRes.ok) {
    throw new Error(`Tenant creation failed (${createRes.status}): ${JSON.stringify(createRes.data)}`);
  }

  return {
    tenant: createRes.data,
    subdomain,
    adminEmail,
    adminPassword,
    type,
    planName: plan.name,
  };
}

async function main() {
  const saas = await ensureSaasAdmin();
  const saasToken = await login(saas.email, saas.password, 'public');
  const plan = await getFirstPublicPlan();
  const created = await createTenant(saasToken, plan);

  const output = {
    apiBase: API_BASE,
    saasEmail: saas.email,
    saasCreatedNow: saas.created,
    tenantSubdomain: created.subdomain,
    tenantType: created.type,
    selectedPlan: created.planName,
    tenantAdminEmail: created.adminEmail,
    tenantAdminPassword: created.adminPassword,
    tenant: created.tenant,
  };

  // Machine-readable JSON first.
  console.log(JSON.stringify(output, null, 2));
  // Shell-friendly values for direct test runs.
  console.log(`E2E_ADMIN_EMAIL=${created.adminEmail}`);
  console.log(`E2E_ADMIN_PASSWORD=${created.adminPassword}`);
  console.log(`E2E_ADMIN_SCHOOL_CODE=${created.subdomain}`);
}

main().catch((err) => {
  console.error(err.message || err);
  process.exit(1);
});
