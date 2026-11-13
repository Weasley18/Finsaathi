// Run: npm test
// Messages are modelled on common Indian bank / UPI SMS formats.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseBankSMS, isNonTransactionSMS } from '../src/services/smsParser';
import { categorizeTransaction, normalizeCategory } from '../src/services/categorizer';

const cases: Array<[string, string, 'INCOME' | 'EXPENSE', number, string, string]> = [
    ['SBI UPI debit (no Rs prefix)', 'Dear UPI user A/C X1234 debited by 250.00 on date 12Nov24 trf to SWIGGY Refno 431712345678. If not u? call 1800111109. -SBI', 'EXPENSE', 250, 'SWIGGY', 'Food'],
    ['HDFC UPI sent', 'Sent Rs.120.00\nFrom HDFC Bank A/C *5678\nTo ZOMATO LTD\nOn 12/11/24\nRef 431712345678\nNot You? Call 18002586161', 'EXPENSE', 120, 'ZOMATO LTD', 'Food'],
    ['HDFC card spend (ISO date)', 'Spent Rs.1499 On HDFC Bank Card 1234 At AMAZON PAY INDIA On 2024-11-12:10:15:22.Not You? To Block+Reissue Call 18002323232', 'EXPENSE', 1499, 'AMAZON PAY INDIA', 'Shopping'],
    ['ICICI debit, merchant credited', 'ICICI Bank Acct XX123 debited for Rs 500.00 on 12-Nov-24; FLIPKART credited. UPI:431712345678. Call 18002662 for dispute.', 'EXPENSE', 500, 'FLIPKART', 'Shopping'],
    ['Axis UPI P2M', 'INR 350.00 debited\nA/c no. XX4321\n12-11-24, 10:15:22\nUPI/P2M/431712345678/BIGBASKET\nNot you? SMS BLOCKUPI Cust ID to 919951860002\nAxis Bank', 'EXPENSE', 350, 'BIGBASKET', 'Groceries'],
    ['Kotak UPI to VPA', 'Sent Rs.200.00 from Kotak Bank AC X9876 to uber@icici on 12-11-24.UPI Ref 431712345678.', 'EXPENSE', 200, 'uber@icici', 'Autorickshaw'],
    ['SBI salary credit', 'Dear Customer, Your A/C XXXXX1234 has a credit by Transfer of Rs 25,000.00 on 01/11/24 by NEFT ACME PVT LTD SALARY. Avl Bal Rs 30,512.50-SBI', 'INCOME', 25000, 'ACME PVT LTD SALARY', 'Salary'],
    ['HDFC NEFT credit', 'Update! INR 25,000.00 deposited in HDFC Bank A/c XX5678 on 01-NOV-24 for NEFT Cr-ACME PVT LTD.Avl bal INR 31,245.00.', 'INCOME', 25000, 'ACME PVT LTD', 'Transfer'],
    ['ATM withdrawal (balance ignored)', 'Rs.2000 withdrawn from A/c XX1234 at ATM on 12-11-24. Avl Bal Rs 8,500.00', 'EXPENSE', 2000, 'ATM', 'Transfer'],
    ['Paytm paid', 'Paid Rs.60 to Chai Point on 12-11-2024 via Paytm UPI', 'EXPENSE', 60, 'Chai Point', 'Food'],
    ['Refund credit', 'Refund of Rs 499.00 credited to your A/C XX1234 from FLIPKART on 12-11-24', 'INCOME', 499, 'FLIPKART', 'Shopping'],
];

for (const [label, sms, type, amount, merchant, category] of cases) {
    test(`parses: ${label}`, () => {
        const p = parseBankSMS(sms);
        assert.ok(p, 'expected a transaction');
        assert.equal(p.type, type);
        assert.equal(p.amount, amount);
        assert.equal(p.merchant, merchant);
        assert.equal(p.category, category);
    });
}

test('parses dates in Indian formats without mixing up day and month', () => {
    const day = (sms: string) => parseBankSMS(sms)!.date.toISOString().slice(0, 10);
    assert.equal(day('Paid Rs.60 to Chai Point on 03-04-2024 via Paytm UPI'), '2024-04-03');
    assert.equal(day('Spent Rs.10 At X On 2024-11-12:10:15:22'), '2024-11-12');
    assert.equal(day('A/C X1 debited by 5.00 on date 12Nov24 trf to Y Refno 1'), '2024-11-12');
});

const ignored: Array<[string, string]> = [
    ['promotion', 'Get Rs.500 cashback on your first credit card spend! Apply now'],
    ['OTP', 'Your OTP for transaction of Rs 1,200.00 at AMAZON is 482913. Do not share it with anyone.'],
    ['bill reminder', 'Your Airtel bill of Rs 599.00 is due on 15-11-24. Pay now to avoid late fee.'],
    ['failed payment', 'Your UPI payment of Rs 450.00 to SWIGGY has failed. Amount if debited will be refunded.'],
    ['collect request', 'ABC has requested Rs 500.00 from you on PhonePe. Pay or decline.'],
];
for (const [label, sms] of ignored) {
    test(`ignores: ${label}`, () => {
        assert.equal(parseBankSMS(sms), null);
        assert.equal(isNonTransactionSMS(sms), true, 'must not be sent to the LLM fallback either');
    });
}

test('categoriser and normaliser share one taxonomy', () => {
    assert.equal(categorizeTransaction('Zerodha SIP'), 'Investment');
    assert.equal(categorizeTransaction('DMart'), 'Groceries');
    assert.equal(categorizeTransaction('Salary ACME PVT LTD'), 'Salary');
    assert.equal(normalizeCategory('Food & Dining'), 'Food');
    assert.equal(normalizeCategory('Healthcare'), 'Health');
    assert.equal(normalizeCategory('telecom & internet'), 'Mobile Recharge');
    assert.equal(normalizeCategory(''), 'Other');
});
