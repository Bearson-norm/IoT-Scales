// Test script untuk validasi parsing decimal numbers
// Jalankan dengan: node test-decimal-parsing.js

console.log('================================');
console.log('Test Decimal Parsing');
console.log('================================\n');

// Function yang diperbaiki
function parseTargetMass(value) {
    let targetMassStr = (value || '0').toString().trim();
    targetMassStr = targetMassStr.replace(',', '.');
    const targetMass = parseFloat(targetMassStr);
    
    if (isNaN(targetMass)) {
        console.warn(`⚠️  Invalid targetMass value: "${value}" (parsed as NaN)`);
        return 0;
    }
    
    return targetMass;
}

// Test cases
const testCases = [
    { input: '0.5', expected: 0.5, description: 'Standard decimal with period' },
    { input: '0,5', expected: 0.5, description: 'Regional format with comma' },
    { input: '  1.25  ', expected: 1.25, description: 'With whitespace' },
    { input: '  100,75  ', expected: 100.75, description: 'Large number with comma and spaces' },
    { input: '0', expected: 0, description: 'Zero value' },
    { input: '', expected: 0, description: 'Empty string' },
    { input: null, expected: 0, description: 'Null value' },
    { input: undefined, expected: 0, description: 'Undefined value' },
    { input: '12.5', expected: 12.5, description: 'Two digit decimal' },
    { input: '999.999', expected: 999.999, description: 'Three digit decimal' },
    { input: 'abc', expected: 0, description: 'Invalid text (should warn)' },
    { input: '12.34.56', expected: 12.34, description: 'Multiple periods (parseFloat stops at 2nd period)' }
];

let passed = 0;
let failed = 0;

console.log('Running tests...\n');

testCases.forEach((test, index) => {
    const result = parseTargetMass(test.input);
    const success = Math.abs(result - test.expected) < 0.0001; // Float comparison with tolerance
    
    if (success) {
        console.log(`✅ Test ${index + 1}: ${test.description}`);
        console.log(`   Input: "${test.input}" → Output: ${result} (Expected: ${test.expected})`);
        passed++;
    } else {
        console.log(`❌ Test ${index + 1}: ${test.description}`);
        console.log(`   Input: "${test.input}" → Output: ${result} (Expected: ${test.expected})`);
        failed++;
    }
    console.log('');
});

console.log('================================');
console.log('Test Results');
console.log('================================');
console.log(`Total: ${testCases.length}`);
console.log(`✅ Passed: ${passed}`);
console.log(`❌ Failed: ${failed}`);
console.log('================================\n');

// Summary
if (failed === 0) {
    console.log('🎉 All tests passed! Decimal parsing is working correctly.');
} else {
    console.log('⚠️  Some tests failed. Please review the implementation.');
}
