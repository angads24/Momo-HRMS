"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const crypto_1 = require("crypto");
const BASE_URL = process.env.ATTENDANCE_BASE_URL ?? 'http://localhost:3002/api/v1';
const EMPLOYEE_ID = process.env.CONCURRENCY_TEST_EMPLOYEE_ID ?? 'CONCURRENCY-TEST-EMP';
const CONCURRENT_REQUESTS = 10;
async function fireCheckIn() {
    const response = await fetch(`${BASE_URL}/attendance/check-in`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'X-Employee-Id': EMPLOYEE_ID,
        },
        body: JSON.stringify({
            officeId: 'OFFICE-001',
            location: {
                latitude: 18.5204,
                longitude: 73.8567,
                accuracyMeters: 10,
                timestamp: new Date().toISOString(),
            },
            clientEventId: (0, crypto_1.randomUUID)(),
        }),
    });
    const body = await response.json().catch(() => undefined);
    return { status: response.status, body };
}
async function main() {
    console.log(`Firing ${CONCURRENT_REQUESTS} simultaneous check-in requests for employeeId=${EMPLOYEE_ID}...`);
    const results = await Promise.all(Array.from({ length: CONCURRENT_REQUESTS }, () => fireCheckIn()));
    const created = results.filter((r) => r.status === 201);
    const rejected = results.filter((r) => r.status === 409);
    const other = results.filter((r) => r.status !== 201 && r.status !== 409);
    console.log(`\nResults: ${created.length} created, ${rejected.length} rejected, ${other.length} other`);
    if (created.length === 1 && rejected.length === CONCURRENT_REQUESTS - 1 && other.length === 0) {
        console.log('PASS: exactly one check-in succeeded; the lock correctly serialized the rest.');
    }
    else {
        console.error('FAIL: expected exactly 1 success and the rest rejected. Raw results:');
        console.error(JSON.stringify(results, null, 2));
        process.exitCode = 1;
    }
}
main().catch((error) => {
    console.error('Script failed:', error);
    process.exitCode = 1;
});
//# sourceMappingURL=concurrent-checkin-test.js.map