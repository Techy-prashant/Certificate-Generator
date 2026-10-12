import test from 'node:test';
import assert from 'node:assert/strict';

test('Validation Utils: email validation detects valid and malformed addresses', () => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  assert.equal(emailRegex.test('admin@college.edu'), true);
  assert.equal(emailRegex.test('student.fest@namdapha.ac.in'), true);
  assert.equal(emailRegex.test('plainaddress'), false);
  assert.equal(emailRegex.test('user@domain'), false);
  assert.equal(emailRegex.test('@nodomain.com'), false);
});

test('Validation Utils: verification code validates exact 6 digit numeric requirement', () => {
  const codeRegex = /^\d{6}$/;
  assert.equal(codeRegex.test('664816'), true);
  assert.equal(codeRegex.test('001234'), true);
  assert.equal(codeRegex.test('12345'), false); // too short
  assert.equal(codeRegex.test('1234567'), false); // too long
  assert.equal(codeRegex.test('66481a'), false); // alpha
});

test('Validation Utils: filename sanitizer strips illegal filesystem characters', () => {
  const sanitize = (name) => name.replace(/[<>:"/\\|?*\x00-\x1F]/g, '_').replace(/\s+/g, '_');
  assert.equal(sanitize('Tech Debate: Finalist [2026]'), 'Tech_Debate__Finalist_[2026]');
});
