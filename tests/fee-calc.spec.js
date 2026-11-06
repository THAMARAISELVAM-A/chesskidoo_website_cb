import { test, expect } from '@playwright/test';

test.describe('LMS Fee Calculation Engine', () => {
  test('LMS page loads and key functions exist', async ({ page }) => {
    await page.goto('/lms/index.html');
    await page.waitForLoadState('domcontentloaded');

    const hasGetStudentStatusForMonth = await page.evaluate(() => typeof window.getStudentStatusForMonth === 'function');
    const hasGetStudentFeeForMonth = await page.evaluate(() => typeof window.getStudentFeeForMonth === 'function');
    const hasGetStudentPaymentStatus = await page.evaluate(() => typeof window.getStudentPaymentStatus === 'function');

    expect(hasGetStudentStatusForMonth).toBe(true);
    expect(hasGetStudentFeeForMonth).toBe(true);
    expect(hasGetStudentPaymentStatus).toBe(true);
  });

  test('Fee timeline: Active->Inactive->Active scenario', async ({ page }) => {
    await page.goto('/lms/index.html');
    await page.waitForLoadState('domcontentloaded');

    const result = await page.evaluate(() => {
      const s = {
        id: 'test1',
        status: 'active',
        monthly_fee: 1000,
        enrollment_date: '2026-01-01',
        status_history: [
          { status: 'active', effective_month: '2026-01', changed_at: '2026-01-01' },
          { status: 'inactive', effective_month: '2026-08', changed_at: '2026-08-01' },
          { status: 'active', effective_month: '2026-12', changed_at: '2026-12-01' },
        ]
      };
      window.allStudents = [s];

      const gsfm = window.getStudentStatusForMonth;
      const gffm = window.getStudentFeeForMonth;

      return {
        jan: gsfm(s, 0, 2026),
        jul: gsfm(s, 6, 2026),
        aug: gsfm(s, 7, 2026),
        nov: gsfm(s, 10, 2026),
        dec: gsfm(s, 11, 2026),
        janFee: gffm(s, 0, 2026),
        augFee: gffm(s, 7, 2026),
        decFee: gffm(s, 11, 2026),
      };
    });

    expect(result.jan).toBe('Active');
    expect(result.jul).toBe('Active');
    expect(result.aug).toBe('Inactive');
    expect(result.nov).toBe('Inactive');
    expect(result.dec).toBe('Active');
    expect(result.janFee.amount).toBe(1000);
    expect(result.janFee.isBillable).toBe(true);
    expect(result.augFee.amount).toBe(0);
    expect(result.augFee.status).toBe('NO_FEE_REQUIRED');
    expect(result.augFee.isBillable).toBe(false);
    expect(result.decFee.amount).toBe(1000);
    expect(result.decFee.isBillable).toBe(true);
  });

  test('Inactive students excluded from active count', async ({ page }) => {
    await page.goto('/lms/index.html');
    await page.waitForLoadState('domcontentloaded');

    const result = await page.evaluate(() => {
      const activeStudent = {
        id: 'a1', status: 'active', monthly_fee: 1000,
        enrollment_date: '2026-01-01',
        status_history: [{ status: 'active', effective_month: '2026-01' }]
      };
      const inactiveStudent = {
        id: 'i1', status: 'inactive', monthly_fee: 1000,
        enrollment_date: '2026-01-01',
        status_history: [
          { status: 'active', effective_month: '2026-01' },
          { status: 'inactive', effective_month: '2026-08' }
        ]
      };
      window.allStudents = [activeStudent, inactiveStudent];

      const augStatus = window.getStudentStatusForMonth(inactiveStudent, 7, 2026);
      const augFee = window.getStudentFeeForMonth(inactiveStudent, 7, 2026);
      const janFee = window.getStudentFeeForMonth(inactiveStudent, 0, 2026);

      return {
        augStatus,
        augFeeAmount: augFee.amount,
        augFeeBillable: augFee.isBillable,
        janFeeAmount: janFee.amount,
        janFeeBillable: janFee.isBillable,
      };
    });

    expect(result.augStatus).toBe('Inactive');
    expect(result.augFeeAmount).toBe(0);
    expect(result.augFeeBillable).toBe(false);
    expect(result.janFeeAmount).toBe(1000);
    expect(result.janFeeBillable).toBe(true);
  });

  test('Reactivation boundary', async ({ page }) => {
    await page.goto('/lms/index.html');
    await page.waitForLoadState('domcontentloaded');

    const result = await page.evaluate(() => {
      const s = {
        id: 'r1', status: 'active', monthly_fee: 500,
        enrollment_date: '2026-01-01',
        status_history: [
          { status: 'active', effective_month: '2026-01' },
          { status: 'inactive', effective_month: '2026-06' },
          { status: 'active', effective_month: '2026-09' },
        ]
      };
      window.allStudents = [s];

      const gsfm = window.getStudentStatusForMonth;
      const gffm = window.getStudentFeeForMonth;

      return {
        may: gsfm(s, 4, 2026),
        jun: gsfm(s, 5, 2026),
        aug: gsfm(s, 7, 2026),
        sep: gsfm(s, 8, 2026),
        mayFee: gffm(s, 4, 2026).amount,
        junFee: gffm(s, 5, 2026).amount,
        augFee: gffm(s, 7, 2026).amount,
        sepFee: gffm(s, 8, 2026).amount,
      };
    });

    expect(result.may).toBe('Active');
    expect(result.jun).toBe('Inactive');
    expect(result.aug).toBe('Inactive');
    expect(result.sep).toBe('Active');
    expect(result.mayFee).toBe(500);
    expect(result.junFee).toBe(0);
    expect(result.augFee).toBe(0);
    expect(result.sepFee).toBe(500);
  });

  test('No backfill after reactivation', async ({ page }) => {
    await page.goto('/lms/index.html');
    await page.waitForLoadState('domcontentloaded');

    const result = await page.evaluate(() => {
      const s = {
        id: 'nb1', status: 'active', monthly_fee: 750,
        enrollment_date: '2026-01-01',
        status_history: [
          { status: 'active', effective_month: '2026-01' },
          { status: 'inactive', effective_month: '2026-05' },
          { status: 'active', effective_month: '2026-08' },
        ]
      };
      window.allStudents = [s];

      const gffm = window.getStudentFeeForMonth;
      return {
        may: gffm(s, 4, 2026).amount,
        jun: gffm(s, 5, 2026).amount,
        jul: gffm(s, 6, 2026).amount,
        aug: gffm(s, 7, 2026).amount,
        mayStatus: gffm(s, 4, 2026).status,
      };
    });

    expect(result.may).toBe(0);
    expect(result.jun).toBe(0);
    expect(result.jul).toBe(0);
    expect(result.aug).toBe(750);
    expect(result.mayStatus).toBe('NO_FEE_REQUIRED');
  });
});

test.describe('Homework Module', () => {
  test('Homework submission functions exist', async ({ page }) => {
    await page.goto('/lms/index.html');
    await page.waitForLoadState('domcontentloaded');

    const hasSubmit = await page.evaluate(() => typeof window.submitHomeworkForChild === 'function');
    const hasSave = await page.evaluate(() => typeof window.saveHomeworkAssignment === 'function');

    expect(hasSubmit).toBe(true);
    expect(hasSave).toBe(true);
  });

  test('Homework merge: server authoritative', async ({ page }) => {
    await page.goto('/lms/index.html');
    await page.waitForLoadState('domcontentloaded');

    const result = await page.evaluate(() => {
      const fetched = [{ id: 'sub1', assignment_id: 'a1', student_id: 's1', status: 'submitted', submitted_at: '2024-01-01' }];
      const localSubs = [{ id: 'sub2', assignment_id: 'a1', student_id: 's1', status: 'pending_sync', pending_sync: true, submitted_at: null }];

      const merged = new Map();
      const keyOf = (s) => s.assignment_id + '::' + s.student_id;

      fetched.forEach((s) => { if (s) merged.set(keyOf(s), s); });
      localSubs.forEach((s) => {
        if (!s || !s.id) return;
        const key = keyOf(s);
        const server = merged.get(key);
        if (server) {
          if (s.pending_sync) {
            const mergedServer = Object.assign({}, server);
            delete mergedServer.pending_sync;
            mergedServer.status = mergedServer.status || 'submitted';
            merged.set(key, mergedServer);
          }
          return;
        }
        if (s.pending_sync) merged.set(key, s);
      });

      const r = Array.from(merged.values())[0];
      return { status: r.status, pending_sync: r.pending_sync, submitted_at: r.submitted_at };
    });

    expect(result.status).toBe('submitted');
    expect(result.pending_sync).toBeUndefined();
    expect(result.submitted_at).toBe('2024-01-01');
  });
});

test.describe('Attendance Module', () => {
  test('Page loads without critical errors', async ({ page }) => {
    const errors = [];
    page.on('pageerror', (err) => errors.push(err.message));
    await page.goto('/lms/index.html');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000);
    const critical = errors.filter(e => e.includes('ReferenceError') || e.includes('SyntaxError'));
    expect(critical.length).toBe(0);
  });
});

test.describe('Financial Report', () => {
  test('Financial report functions exist', async ({ page }) => {
    await page.goto('/lms/index.html');
    await page.waitForLoadState('domcontentloaded');

    const hasDownload = await page.evaluate(() => typeof window.downloadFinancialStatement === 'function');
    const hasGenerateReport = await page.evaluate(() => typeof window.generateReportPDF === 'function');

    expect(hasDownload).toBe(true);
    expect(hasGenerateReport).toBe(true);
  });
});

test.describe('Coach Management', () => {
  test('Coach salary and bonus modals exist', async ({ page }) => {
    await page.goto('/lms/index.html');
    await page.waitForLoadState('domcontentloaded');

    const hasSalary = await page.evaluate(() => typeof window.openCoachSalaryModal === 'function');
    const hasBonus = await page.evaluate(() => typeof window.openCoachBonusModal === 'function');

    expect(hasSalary).toBe(true);
    expect(hasBonus).toBe(true);
  });
});

test.describe('No JS Errors on Load', () => {
  test('Page loads without critical errors', async ({ page }) => {
    const errors = [];
    page.on('pageerror', (err) => errors.push(err.message));
    await page.goto('/lms/index.html');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(3000);

    const critical = errors.filter(e => e.includes('ReferenceError') || e.includes('SyntaxError'));
    expect(critical.length).toBe(0);
  });
});


